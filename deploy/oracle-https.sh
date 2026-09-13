#!/usr/bin/env bash
# ============================================================
# DuckDNS + Let's Encrypt 로 고정 HTTPS 배포
#
#   bash ~/mcm/sjf_track/deploy/oracle-https.sh
#
# ~/mcm/.env 의 DUCK_DOMAIN / DUCK_TOKEN 을 읽습니다.
# (카메라 getUserMedia 는 HTTPS 에서만 동작하므로 이 단계는 선택이 아닙니다.)
#
# 하는 일:
#   1) DuckDNS 에 현재 공인 IP 등록 + 5분 주기 갱신 cron
#   2) PUBLIC_BASE_URL 을 .env 에 확정
#   3) 컨테이너 빌드 & 기동
#   4) nginx 리버스 프록시 설치
#   5) 인증서 발급 + 자동 갱신 확인
# ============================================================
set -euo pipefail

ROOT="$HOME/mcm"
ENV_FILE="$ROOT/.env"
COMPOSE="$ROOT/sjf_track/deploy/docker-compose.prod.yml"

[ -f "$ENV_FILE" ] || { echo "❌ $ENV_FILE 이 없습니다. 먼저 oracle-setup.sh 를 실행하세요."; exit 1; }
# shellcheck disable=SC1090
set -a; source "$ENV_FILE"; set +a

if [ -z "${DUCK_DOMAIN:-}" ] || [ -z "${DUCK_TOKEN:-}" ] || [[ "$DUCK_TOKEN" == xxxx* ]]; then
  echo "❌ $ENV_FILE 의 DUCK_DOMAIN / DUCK_TOKEN 을 채우세요."
  exit 1
fi
if [ -z "${OPENAI_API_KEY:-}" ] || [[ "$OPENAI_API_KEY" == sk-proj-xxx* ]]; then
  echo "❌ $ENV_FILE 의 OPENAI_API_KEY 를 채우세요. (무드 분석/여권 카피가 죽습니다)"
  exit 1
fi

FQDN="${DUCK_DOMAIN}.duckdns.org"
echo "==> 대상 도메인: https://$FQDN"

echo "==> 1. DuckDNS IP 등록"
RESP=$(curl -fsSL "https://www.duckdns.org/update?domains=${DUCK_DOMAIN}&token=${DUCK_TOKEN}&ip=" || true)
echo "   duckdns 응답: $RESP"
[ "$RESP" = "OK" ] || { echo "❌ DuckDNS 갱신 실패. 도메인/토큰을 확인하세요."; exit 1; }

# OCI 임시(ephemeral) 공인 IP 는 인스턴스를 중지/시작하면 바뀝니다.
# cron 으로 5분마다 갱신해 두면 IP 가 바뀌어도 도메인이 알아서 따라옵니다.
echo "==> 1-2. DuckDNS 자동 갱신 cron 등록"
mkdir -p "$HOME/duckdns"
cat > "$HOME/duckdns/duck.sh" <<EOF
#!/usr/bin/env bash
curl -fsS "https://www.duckdns.org/update?domains=${DUCK_DOMAIN}&token=${DUCK_TOKEN}&ip=" \
  -o "$HOME/duckdns/duck.log" 2>&1
EOF
chmod 700 "$HOME/duckdns/duck.sh"
# 괄호+파이프로 한 줄에 합치면 환경에 따라 set -e/pipefail 과 얽혀 조용히
# 중단되는 경우가 있어, 임시 파일을 거치는 방식으로 안전하게 등록합니다.
CRON_TMP="$(mktemp)"
crontab -l 2>/dev/null | grep -v 'duckdns/duck.sh' > "$CRON_TMP" || true
echo "*/5 * * * * $HOME/duckdns/duck.sh >/dev/null 2>&1" >> "$CRON_TMP"
crontab "$CRON_TMP"
rm -f "$CRON_TMP"
echo "   5분 주기 갱신 등록 완료"

echo "==> 2. PUBLIC_BASE_URL 확정"
if grep -q '^PUBLIC_BASE_URL=' "$ENV_FILE"; then
  sed -i "s|^PUBLIC_BASE_URL=.*|PUBLIC_BASE_URL=https://$FQDN|" "$ENV_FILE"
else
  echo "PUBLIC_BASE_URL=https://$FQDN" >> "$ENV_FILE"
fi
echo "   PUBLIC_BASE_URL=https://$FQDN"

echo "==> 3. 컨테이너 빌드 & 기동 (ARM 4코어 기준 5~10분)"
# NEXT_PUBLIC_* 가 빌드 타임에 박히므로 도메인이 바뀌면 반드시 --build 입니다.
docker compose -f "$COMPOSE" --env-file "$ENV_FILE" up -d --build

echo "==> 4. nginx 설치 및 설정"
export DEBIAN_FRONTEND=noninteractive
sudo apt-get update -y >/dev/null
sudo apt-get install -y nginx certbot python3-certbot-nginx >/dev/null
sudo sed "s|__FQDN__|$FQDN|g" "$ROOT/sjf_track/deploy/nginx/mcm.conf.template" \
  | sudo tee /etc/nginx/sites-available/mcm >/dev/null
sudo ln -sf /etc/nginx/sites-available/mcm /etc/nginx/sites-enabled/mcm
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx

echo "==> 5. Let's Encrypt 인증서 발급"
# 이미 발급돼 있으면 certbot 이 알아서 기존 인증서를 재사용합니다.
sudo certbot --nginx -d "$FQDN" \
  --non-interactive --agree-tos \
  -m "admin@$FQDN" \
  --redirect
echo "   자동 갱신 타이머:"
systemctl list-timers 2>/dev/null | grep -i certbot || echo "   (certbot 타이머 확인 필요)"

echo "==> 6. 헬스체크"
sleep 5
curl -fsS "https://$FQDN/api/health" && echo "  <- 백엔드 OK" || echo "  ⚠️ 백엔드 응답 없음 (docker compose logs backend 확인)"
curl -fsS -o /dev/null -w "   프론트 HTTP %{http_code}\n" "https://$FQDN/" || echo "  ⚠️ 프론트 응답 없음"

cat <<EOF

======================================================
✅ HTTPS 배포 완료

  🔒 서비스 주소 (부스 화면 / QR):
     https://$FQDN

  🔌 헬스체크:
     https://$FQDN/api/health

  이 주소는 고정입니다. 재부팅해도, 공인 IP 가 바뀌어도
  cron 이 DuckDNS 를 따라 갱신합니다.
======================================================
EOF
