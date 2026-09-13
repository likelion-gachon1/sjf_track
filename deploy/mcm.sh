#!/usr/bin/env bash
# ============================================================
# 운영 헬퍼 — 긴 docker compose 명령을 외우지 않기 위한 래퍼
#
#   bash ~/mcm/sjf_track/deploy/mcm.sh <명령>
#
#   up        기동 (변경분 빌드)
#   down      정지
#   restart   재시작 (빌드 없음)
#   deploy    git pull + 재빌드 + 기동  ← 코드 수정 후 배포는 이것
#   logs      전체 로그 따라가기 (logs backend / logs frontend 도 가능)
#   ps        컨테이너 상태
#   health    프론트/백엔드 응답 확인
#   backup    업로드 이미지 + DB 덤프를 ~/mcm/backups 에 저장
#
# 편의를 위해 alias 를 걸어두면 편합니다:
#   echo "alias mcm='bash ~/mcm/sjf_track/deploy/mcm.sh'" >> ~/.bashrc && source ~/.bashrc
# ============================================================
set -euo pipefail

ROOT="$HOME/mcm"
ENV_FILE="$ROOT/.env"
COMPOSE="$ROOT/sjf_track/deploy/docker-compose.prod.yml"
DC=(docker compose -f "$COMPOSE" --env-file "$ENV_FILE")

# shellcheck disable=SC1090
set -a; source "$ENV_FILE"; set +a

CMD="${1:-help}"; shift || true

case "$CMD" in
  up)      "${DC[@]}" up -d --build ;;
  down)    "${DC[@]}" down ;;
  restart) "${DC[@]}" restart ;;

  deploy)
    echo "==> git pull"
    (cd "$ROOT/sjf_track" && git pull --ff-only)
    (cd "$ROOT/sjf_BE"    && git pull --ff-only)
    echo "==> 재빌드 & 기동"
    # NEXT_PUBLIC_* 가 빌드 타임 주입이므로 항상 --build 입니다.
    "${DC[@]}" up -d --build
    echo "==> 안 쓰는 이미지 정리 (부트 볼륨 확보)"
    docker image prune -f >/dev/null
    "${DC[@]}" ps
    ;;

  logs)    "${DC[@]}" logs -f --tail=200 "$@" ;;
  ps)      "${DC[@]}" ps ;;

  health)
    BASE="${PUBLIC_BASE_URL:-http://localhost}"
    echo "대상: $BASE"
    curl -fsS "$BASE/api/health" && echo "  <- 백엔드 OK" || echo "  ❌ 백엔드 실패"
    curl -fsS -o /dev/null -w "프론트 HTTP %{http_code}\n" "$BASE/" || echo "  ❌ 프론트 실패"
    ;;

  backup)
    STAMP=$(date +%Y%m%d-%H%M%S)
    DEST="$ROOT/backups"
    mkdir -p "$DEST"
    echo "==> DB 덤프"
    "${DC[@]}" exec -T db pg_dump -U "${POSTGRES_USER:-mcm}" "${POSTGRES_DB:-mcm}" \
      | gzip > "$DEST/db-$STAMP.sql.gz"
    echo "==> 업로드 이미지"
    docker run --rm -v mcm_backend-uploads:/data -v "$DEST":/backup alpine \
      tar czf "/backup/uploads-$STAMP.tar.gz" -C /data .
    # 30일 지난 백업 정리 (부트 볼륨이 차는 것을 방지)
    find "$DEST" -type f -mtime +30 -delete
    ls -lh "$DEST" | tail -5
    echo "✅ 백업 완료: $DEST"
    ;;

  *)
    sed -n '2,20p' "$0"
    ;;
esac
