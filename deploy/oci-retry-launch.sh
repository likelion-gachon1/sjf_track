#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# A1.Flex "Out of host capacity" 재시도 런처
#
# OCI Cloud Shell 에서 돌리는 걸 권장합니다 (콘솔 우상단 >_ 아이콘).
# Cloud Shell 은 무료이고 OCI CLI 인증이 이미 끝나 있어 설정이 필요 없습니다.
#
#   1) 아래 CONFIG 를 채운다 (빈 값은 스크립트가 자동 탐색을 시도합니다)
#   2) bash oci-retry-launch.sh
#   3) 잡힐 때까지 두고, 성공하면 공인 IP 를 출력하고 종료합니다
#
# 브라우저 탭을 닫아도 Cloud Shell 세션은 일정 시간 유지되지만 영구하지는
# 않습니다. 길게 돌릴 거면 tmux 안에서 실행하세요:  tmux new -s launch
# ---------------------------------------------------------------------------
set -uo pipefail

# ----- CONFIG --------------------------------------------------------------
DISPLAY_NAME="${DISPLAY_NAME:-mcm}"
OCPUS="${OCPUS:-4}"
MEMORY_GB="${MEMORY_GB:-24}"
BOOT_GB="${BOOT_GB:-50}"
INTERVAL="${INTERVAL:-60}"          # 재시도 간격(초). 60 미만으로 낮추지 마세요
SSH_PUBKEY_FILE="${SSH_PUBKEY_FILE:-$HOME/.ssh/id_rsa.pub}"

COMPARTMENT_ID="${COMPARTMENT_ID:-}"  # 비우면 테넌시 root 사용
SUBNET_ID="${SUBNET_ID:-}"            # 비우면 public subnet 자동 탐색
IMAGE_ID="${IMAGE_ID:-}"              # 비우면 Ubuntu 24.04 aarch64 자동 탐색
# ---------------------------------------------------------------------------

command -v oci >/dev/null || { echo "❌ oci CLI 가 없습니다. Cloud Shell 에서 실행하세요."; exit 1; }

if [ ! -f "$SSH_PUBKEY_FILE" ]; then
  echo "❌ 공개키가 없습니다: $SSH_PUBKEY_FILE"
  echo "   인스턴스 생성 때 받은 .key 의 공개키를 올리거나, 새로 만드세요:"
  echo "     ssh-keygen -t rsa -b 4096 -f ~/.ssh/id_rsa -N ''"
  exit 1
fi

echo "==> 파라미터 확인"

if [ -z "$COMPARTMENT_ID" ]; then
  COMPARTMENT_ID=$(oci iam compartment list --include-root --all \
    --query "data[?\"compartment-id\"==null].id | [0]" --raw-output 2>/dev/null)
  [ -n "$COMPARTMENT_ID" ] || { echo "❌ 테넌시 OCID 탐색 실패. COMPARTMENT_ID 를 직접 지정하세요."; exit 1; }
fi
echo "   compartment : $COMPARTMENT_ID"

if [ -z "$SUBNET_ID" ]; then
  # prohibit-public-ip-on-vnic=false 인 서브넷 = public subnet
  SUBNET_ID=$(oci network subnet list -c "$COMPARTMENT_ID" --all \
    --query "data[?\"prohibit-public-ip-on-vnic\"==\`false\`].id | [0]" --raw-output 2>/dev/null)
  [ -n "$SUBNET_ID" ] || { echo "❌ public subnet 을 못 찾았습니다. VCN Wizard 로 먼저 만드세요."; exit 1; }
fi
echo "   subnet      : $SUBNET_ID"

if [ -z "$IMAGE_ID" ]; then
  IMAGE_ID=$(oci compute image list -c "$COMPARTMENT_ID" \
    --operating-system "Canonical Ubuntu" --operating-system-version "24.04" \
    --shape VM.Standard.A1.Flex --sort-by TIMECREATED \
    --query "data[0].id" --raw-output 2>/dev/null)
  [ -n "$IMAGE_ID" ] || { echo "❌ Ubuntu 24.04 ARM 이미지를 못 찾았습니다."; exit 1; }
fi
echo "   image       : $IMAGE_ID"

# 리전의 모든 AD 를 순회합니다. 단일 AD 리전이면 한 개만 돕니다.
mapfile -t ADS < <(oci iam availability-domain list --query "data[].name" --raw-output \
  | tr -d '[]" ' | tr ',' '\n' | grep -v '^$')
[ "${#ADS[@]}" -gt 0 ] || { echo "❌ availability domain 목록을 못 가져왔습니다."; exit 1; }
echo "   AD          : ${ADS[*]}"
echo "   shape       : VM.Standard.A1.Flex ${OCPUS} OCPU / ${MEMORY_GB} GB / boot ${BOOT_GB} GB"
echo

SSH_KEY=$(cat "$SSH_PUBKEY_FILE")
METADATA=$(printf '{"ssh_authorized_keys":"%s"}' "$SSH_KEY")
SHAPE_CONFIG=$(printf '{"ocpus":%s,"memoryInGBs":%s}' "$OCPUS" "$MEMORY_GB")

attempt=0
while true; do
  for AD in "${ADS[@]}"; do
    attempt=$((attempt + 1))
    printf '[%s] 시도 #%d (%s) ... ' "$(date '+%H:%M:%S')" "$attempt" "$AD"

    OUT=$(oci compute instance launch \
      --availability-domain "$AD" \
      --compartment-id "$COMPARTMENT_ID" \
      --shape VM.Standard.A1.Flex \
      --shape-config "$SHAPE_CONFIG" \
      --image-id "$IMAGE_ID" \
      --subnet-id "$SUBNET_ID" \
      --assign-public-ip true \
      --boot-volume-size-in-gbs "$BOOT_GB" \
      --display-name "$DISPLAY_NAME" \
      --metadata "$METADATA" \
      --wait-for-state RUNNING \
      2>&1)
    RC=$?

    if [ $RC -eq 0 ]; then
      echo "성공 ✅"
      INSTANCE_ID=$(echo "$OUT" | grep -o '"id": "ocid1.instance[^"]*"' | head -1 | cut -d'"' -f4)
      echo
      echo "==> 인스턴스: $INSTANCE_ID"
      IP=$(oci compute instance list-vnics --instance-id "$INSTANCE_ID" \
        --query "data[0].\"public-ip\"" --raw-output 2>/dev/null)
      echo "==> 공인 IP : $IP"
      echo
      echo "다음 단계:"
      echo "  1) Security List 에 80/443 Ingress 추가 (docs/deploy-oracle.md 2장)"
      echo "  2) ssh -i <개인키> ubuntu@$IP"
      exit 0
    fi

    if echo "$OUT" | grep -qi 'out of capacity\|out of host capacity'; then
      echo "용량 없음"
    else
      # 용량 외의 에러는 재시도해도 의미가 없습니다. 바로 멈춥니다.
      echo "실패 ❌"
      echo
      echo "$OUT"
      exit 1
    fi
  done
  sleep "$INTERVAL"
done
