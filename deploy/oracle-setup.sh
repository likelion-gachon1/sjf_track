#!/usr/bin/env bash
# ============================================================
# Oracle Cloud Always Free VM 최초 세팅 (Ubuntu 22.04 / 24.04)
#
# SSH 로 ubuntu 계정 접속 후:
#   bash oracle-setup.sh
#
# 하는 일:
#   1) swap 확보         — 빌드 중 OOM 방지
#   2) Docker 설치
#   3) iptables 80/443 개방 — OCI Ubuntu 이미지의 기본 차단 해제 (★필수)
#   4) 소스 클론         — ~/mcm/{sjf_track,sjf_BE}
#   5) .env 템플릿 배치
#
# 이 스크립트는 여러 번 실행해도 안전합니다(idempotent).
# ============================================================
set -euo pipefail

REPO_FRONT="${REPO_FRONT:-https://github.com/likelion-gachon1/sjf_track.git}"
REPO_BACK="${REPO_BACK:-https://github.com/likelion-gachon1/sjf_BE.git}"
ROOT="$HOME/mcm"

echo "==> 1. swap 확보"
# ARM 24GB 면 사실상 불필요하지만, AMD Micro(1GB)로 떨어졌을 때 빌드가 죽지 않게 합니다.
if ! swapon --show | grep -q swapfile; then
  sudo fallocate -l 4G /swapfile
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile >/dev/null
  sudo swapon /swapfile
  grep -q '/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab >/dev/null
  echo "   4GB swap 생성 완료"
else
  echo "   이미 swap 이 있습니다 — 건너뜁니다"
fi

echo "==> 2. Docker 설치"
if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sudo sh
  sudo usermod -aG docker "$USER"
  echo "   ⚠️ docker 그룹 반영을 위해 이 스크립트가 끝나면 한 번 재접속(exit 후 다시 ssh)하세요."
else
  echo "   이미 설치돼 있습니다 — 건너뜁니다"
fi
sudo docker compose version >/dev/null 2>&1 || sudo apt-get install -y docker-compose-plugin

echo "==> 3. iptables 80/443 개방 (OCI Ubuntu 이미지 필수 작업)"
# OCI 콘솔의 Security List 를 열어도 인스턴스 내부 iptables 가 막고 있습니다.
# 이 단계를 빼먹으면 "ping 은 되는데 접속이 안 되는" 증상이 납니다.
sudo apt-get update -y >/dev/null
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y iptables-persistent netfilter-persistent >/dev/null
for PORT in 80 443; do
  if ! sudo iptables -C INPUT -p tcp --dport "$PORT" -j ACCEPT 2>/dev/null; then
    # REJECT/DROP 규칙보다 반드시 앞에 끼워 넣어야 합니다. 위치를 6번으로
    # 고정하면 이미지마다 기본 규칙 개수가 달라 REJECT 뒤에 들어가버릴 수
    # 있어(=차단 유지), 매번 REJECT/DROP 의 실제 줄 번호를 찾아 그 앞에 넣습니다.
    REJECT_LINE=$(sudo iptables -L INPUT --line-numbers -n | awk '/REJECT|DROP/{print $1; exit}')
    if [ -n "$REJECT_LINE" ]; then
      sudo iptables -I INPUT "$REJECT_LINE" -m state --state NEW -p tcp --dport "$PORT" -j ACCEPT
    else
      sudo iptables -A INPUT -m state --state NEW -p tcp --dport "$PORT" -j ACCEPT
    fi
    echo "   $PORT/tcp 개방"
  else
    echo "   $PORT/tcp 이미 열림"
  fi
done
sudo netfilter-persistent save >/dev/null
echo "   ℹ️ OCI 콘솔의 VCN > Security List 인그레스 규칙(80, 443)도 반드시 함께 열어야 합니다."

echo "==> 4. 소스 클론"
mkdir -p "$ROOT" && cd "$ROOT"
[ -d sjf_BE ]    && (cd sjf_BE && git pull --ff-only)    || git clone "$REPO_BACK"
[ -d sjf_track ] && (cd sjf_track && git pull --ff-only) || git clone "$REPO_FRONT"

echo "==> 5. .env 준비"
if [ ! -f "$ROOT/.env" ]; then
  cp "$ROOT/sjf_track/deploy/env.production.example" "$ROOT/.env"
  chmod 600 "$ROOT/.env"
  echo "   $ROOT/.env 생성됨 — 값을 채우세요"
else
  echo "   $ROOT/.env 가 이미 있습니다 — 덮어쓰지 않습니다"
fi

cat <<EOF

======================================================
✅ 서버 기본 세팅 완료

다음 순서로 진행하세요:

  1) (docker 설치가 이번이 처음이면) 재접속
       exit  후  ssh ubuntu@<공인IP>

  2) 환경변수 채우기
       nano ~/mcm/.env
       # OPENAI_API_KEY / POSTGRES_PASSWORD / DUCK_DOMAIN / DUCK_TOKEN

  3) HTTPS 배포
       bash ~/mcm/sjf_track/deploy/oracle-https.sh
======================================================
EOF
