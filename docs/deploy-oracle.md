# MCM PORTAL — Oracle Cloud 무료 서버 배포 가이드

> 대상 ▸ Oracle Cloud Infrastructure(OCI) **Always Free** 등급 · 요금 0원
> 결과 ▸ `https://<도메인>.duckdns.org` 고정 주소 · 카메라 동작 · 재부팅 후에도 유지

---

## 0. 최종 구성

```
                 [부스 화면 / 방문객 휴대폰]
                            |
                        443 (HTTPS)
                            |
                   ┌────────▼────────┐
                   │  nginx (호스트)  │  ← Let's Encrypt 인증서
                   └───┬─────────┬───┘
                /api/  │         │  /  +  /api/analyze-mood
                       │         │      +  /api/passport
         ┌─────────────▼─┐   ┌───▼──────────────┐
         │ backend :8080 │   │ frontend :3000   │
         │ Spring Boot   │   │ Next.js (+OpenAI)│
         └───────┬───────┘   └──────────────────┘
                 │
         ┌───────▼────────┐   ┌──────────────────┐
         │   db :5432     │   │ volume: uploads  │
         │   Postgres 16  │   │ (촬영 이미지)     │
         └────────────────┘   └──────────────────┘
```

- 외부에 열린 포트는 **80/443 뿐**입니다. 3000·8080·5432 는 `127.0.0.1` 바인딩이라 인터넷에서 접근 불가.
- 프론트와 백엔드가 **같은 도메인**을 쓰므로 CORS·mixed content 문제가 구조적으로 없습니다.
- `/api/**` 는 백엔드로 가지만 `/api/analyze-mood` 와 `/api/passport` 는 **프론트의 Next.js
  라우트**라 예외적으로 :3000 으로 넘깁니다 (`mcm.conf.template` 의 정규식 location).
- DB 는 **Postgres 16** 컨테이너입니다.

### 필요한 파일 (모두 이 레포에 포함)

| 파일 | 역할 |
|---|---|
| `deploy/oracle-setup.sh` | VM 최초 세팅 (swap·Docker·iptables·클론) |
| `deploy/oracle-https.sh` | DuckDNS + 빌드 + nginx + 인증서 |
| `deploy/docker-compose.prod.yml` | 프론트 + 백엔드 + Postgres |
| `deploy/nginx/mcm.conf.template` | 리버스 프록시 설정 |
| `deploy/env.production.example` | 환경변수 템플릿 |
| `deploy/mcm.sh` | 운영 헬퍼 (배포·로그·백업) |

---

## 1. 인스턴스 생성

1. [cloud.oracle.com](https://cloud.oracle.com) 가입 — 카드 등록이 필요하지만 Always Free 범위에서는 청구되지 않습니다.
2. **홈 리전은 `Japan Central (Osaka)`** 로 선택하세요. 가입 후에는 변경할 수 없습니다.

   > 신규 가입 드롭다운에는 한국 리전(Seoul·Chuncheon)이 나오지 않습니다. 결제수단을 등록해도 목록은 같습니다 — OCI 는 가입 폼이 하나뿐이고, 유료(PAYG) 전환 후 서울을 추가 구독할 수는 있지만 **Always Free 리소스는 홈 리전에서만 제공되므로 그렇게 띄운 인스턴스는 전액 과금됩니다.**
   >
   > 선택 가능한 리전 중 오사카가 무난합니다. 한국에서 왕복 ~30ms 로 도쿄와 비슷하면서, 도쿄는 OCI 최대 리전이라 무료 ARM 물량이 훨씬 자주 고갈됩니다.
3. Compute ▸ Instances ▸ **Create instance**

| 항목 | 값 | 비고 |
|---|---|---|
| Image | **Canonical Ubuntu 24.04** | Minimal·aarch64 접미사 붙은 것 말고 일반판. 아래 주의 참고 |
| Shape | **VM.Standard.A1.Flex** / **4 OCPU · 24 GB** | ARM. "Always Free eligible" 배지 확인 |
| Boot volume | 50 GB / **VPU 10** | VPU 를 올리면 과금됩니다. Always Free 총 200GB |
| Security | **Shielded instance 끄기** | 생성 후 변경 불가. 부트 레벨 위협은 이 서버와 무관 |
| SSH keys | **Save private key** 눌러 `.key` 파일 저장 | 이걸 잃으면 접속 불가 |
| Networking | VCN Wizard 로 만든 **public subnet**, **Assign public IPv4 address 체크** | 아래 주의 참고 |

> **이미지 선택** — `Minimal` 은 기본 유틸리티가 빠져 있어 손이 더 갑니다. `26.04` 는 `get.docker.com` 이 쓰는 Docker apt 저장소에 채널이 아직 없을 수 있으니 피하세요. 일반 `Canonical Ubuntu 24.04` 는 shape 에 맞는 아키텍처 빌드가 자동 선택되므로 `aarch64` 항목을 따로 고를 필요가 없습니다.

> **VCN 은 먼저 따로 만드세요** — 인스턴스 생성 폼에서 VCN 을 같이 만들면 `Automatically assign public IPv4 address` 토글이 회색으로 잠긴 채 풀리지 않는 콘솔 버그가 있습니다. 라디오를 아무리 맞춰도 안 됩니다.
>
> Networking ▸ Virtual Cloud Networks ▸ **Actions ▸ Start VCN Wizard** ▸ `Create VCN with Internet Connectivity` (IPv6 는 체크 안 함). 그 다음 인스턴스 생성 화면에서 `Select existing` 으로 방금 만든 VCN 과 이름에 `public` 이 들어간 서브넷을 고르면 토글이 정상 활성화됩니다. Internet Gateway 와 라우팅도 한 번에 잡혀서 "공인 IP 는 있는데 접속이 안 되는" 문제도 예방됩니다.

> **"Out of host capacity" 가 뜨면** — 무료 계정은 A1 용량 풀에서 우선순위가 가장 낮아 자주 막힙니다. 대응 순서:
> 1. 2 OCPU / 12 GB, 1 OCPU / 6 GB 로 낮춰 재시도
> 2. 시간대를 바꿔 재시도 (한국 시간 새벽에 잘 잡힙니다)
> 3. **PAYG 로 업그레이드** — 가장 확실합니다. Billing & Cost Management ▸ Upgrade and Payment Method. 전환해도 **Always Free 한도(A1 총 4 OCPU/24GB, 블록스토리지 200GB, 아웃바운드 월 10TB) 안에서는 계속 무료**이고, 일반 용량 풀을 쓰게 되어 이 에러가 거의 사라집니다.
> 4. 그래도 안 되면 **VM.Standard.E2.1.Micro** (AMD 1 OCPU / 1 GB) — 항상 잡히지만 **서버에서 직접 빌드하면 메모리가 모자랍니다.** 11장의 "저사양 대응" 을 보세요.

> **PAYG 로 전환했다면 예산 알림을 먼저 걸어두세요.** Billing & Cost Management ▸ Budgets ▸ Create Budget ▸ 스코프 root / **Monthly** / 금액 **$1** / Actual Spend / **50%** + 수신 메일. Always Free 범위만 쓰면 알림이 올 일이 없고, 오면 뭔가 한도를 넘긴 것입니다.
>
> 단 **Budgets 는 알림일 뿐 지출을 차단하지 않습니다.** 하드 리밋이 필요하면 Governance ▸ Quota Policies 로 프로비저닝 자체를 막아야 합니다. 과금 경로가 ①인스턴스 추가 생성으로 A1 코어 4 초과 ②배지 없는 shape 선택 ③볼륨 200GB·VPU 10 초과 셋뿐이고 모두 콘솔에서 명시적으로 누르는 행동이라, 이 규모에서는 알림 + 배지 확인으로 충분합니다.

생성 후 **Public IP address** 를 메모합니다.

---

## 2. 방화벽 — 반드시 두 겹 다 엽니다 ★

OCI 에서 가장 많이 막히는 지점입니다. **콘솔에서 열어도 서버 내부에서 또 막혀 있습니다.**

**(1) 콘솔 쪽 — Security List**

Instance 상세 ▸ Virtual Cloud Network ▸ Security Lists ▸ Default Security List ▸ **Add Ingress Rules**

| Source CIDR | IP Protocol | Destination Port |
|---|---|---|
| `0.0.0.0/0` | TCP | `80` |
| `0.0.0.0/0` | TCP | `443` |

**(2) 서버 쪽 — iptables**

Ubuntu 이미지에는 80/443 을 막는 기본 규칙이 들어 있습니다. 3장의 `oracle-setup.sh` 가 자동으로 처리하니 따로 하실 건 없지만, **증상을 알아두세요**: 핑은 되는데 브라우저만 무한 로딩이면 이쪽입니다.

---

## 3. 서버 최초 세팅

```bash
chmod 400 <다운로드한키>.key
ssh -i <다운로드한키>.key ubuntu@<공인IP>
```

접속되면:

```bash
curl -fsSL https://raw.githubusercontent.com/likelion-gachon1/sjf_track/main/deploy/oracle-setup.sh -o setup.sh && bash setup.sh
```

swap 확보 → Docker 설치 → **iptables 80/443 개방** → 두 레포 클론(`~/mcm/`) → `.env` 템플릿 배치까지 진행됩니다.

> Docker 설치가 처음이면 그룹 권한 반영을 위해 **한 번 재접속**하세요 (`exit` 후 다시 `ssh`).

---

## 4. 환경변수

```bash
nano ~/mcm/.env
```

| 키 | 설명 |
|---|---|
| `OPENAI_API_KEY` | **필수.** 비면 무드 판정·여권 카피가 실패합니다 |
| `POSTGRES_PASSWORD` | 아무 긴 문자열 (`openssl rand -base64 24`) |
| `DUCK_DOMAIN` / `DUCK_TOKEN` | [duckdns.org](https://www.duckdns.org) 로그인 후 도메인 생성, 상단 token 복사 |
| `PUBLIC_BASE_URL` | 다음 단계에서 자동으로 채워집니다 — 손대지 않아도 됩니다 |

```bash
chmod 600 ~/mcm/.env
```

> **이 파일은 절대 커밋하지 마세요.** `.gitignore` 에 `.env*.local` / `.env.production` 이 잡혀 있지만, 서버의 `~/mcm/.env` 는 애초에 레포 밖입니다.

---

## 5. HTTPS 배포

```bash
bash ~/mcm/sjf_track/deploy/oracle-https.sh
```

한 번에 아래를 처리합니다.

1. DuckDNS 에 공인 IP 등록 + **5분 주기 갱신 cron** (IP 가 바뀌어도 도메인이 따라옵니다)
2. `PUBLIC_BASE_URL` 확정
3. 컨테이너 빌드 & 기동 — ARM 4코어 기준 **5~10분**
4. nginx 리버스 프록시 설치
5. Let's Encrypt 인증서 발급 + 80→443 리다이렉트
6. 헬스체크

끝나면 `https://<도메인>.duckdns.org` 로 접속됩니다.

---

## 6. 시연 전 점검 체크리스트

부스 나가기 전에 **현장 네트워크에서** 한 번씩 확인하세요.

- [ ] `https://<도메인>.duckdns.org` — 자물쇠 아이콘 정상
- [ ] `https://<도메인>.duckdns.org/api/health` — 응답 옴
- [ ] 미러 화면에서 **카메라 권한 팝업**이 뜨고 영상이 나옴 (HTTP 면 안 뜹니다)
- [ ] DevTools ▸ Network 에서 **`jsdelivr`/`cdn` 요청 0건** — MediaPipe 자가 호스팅 확인
- [ ] 그린 스크린 합성 정상
- [ ] 촬영 → 결과 화면 → **QR 스캔** → 휴대폰에서 사진 열림
- [ ] 무드 판정(`/api/analyze-mood`)이 실제로 동작 — 실패하면 OPENAI_API_KEY 확인
- [ ] 부스 노트북을 **전원·절전 해제** 설정

로그를 옆에 띄워두면 문제를 바로 잡습니다:

```bash
bash ~/mcm/sjf_track/deploy/mcm.sh logs
```

---

## 7. 운영 명령

alias 를 걸어두면 편합니다.

```bash
echo "alias mcm='bash ~/mcm/sjf_track/deploy/mcm.sh'" >> ~/.bashrc && source ~/.bashrc
```

| 명령 | 설명 |
|---|---|
| `mcm deploy` | git pull + 재빌드 + 기동 — **코드 수정 후 배포는 이것** |
| `mcm logs` / `mcm logs backend` | 로그 따라가기 |
| `mcm ps` | 컨테이너 상태 |
| `mcm health` | 프론트/백엔드 응답 확인 |
| `mcm backup` | DB 덤프 + 업로드 이미지를 `~/mcm/backups` 에 저장 |
| `mcm restart` / `mcm down` | 재시작 / 정지 |

> **`NEXT_PUBLIC_*` 는 빌드 타임에 코드로 박힙니다.** 도메인이나 API 주소를 바꾸면 재시작이 아니라 **재빌드**(`mcm deploy`)가 필요합니다.

---

## 8. 백업

촬영 이미지는 Docker 볼륨(`mcm_backend-uploads`)에, 세션은 Postgres 에 있습니다. 인스턴스가 사라지면 둘 다 사라집니다.

**주간 자동 백업:**

```bash
(crontab -l 2>/dev/null; echo "0 4 * * 1 bash ~/mcm/sjf_track/deploy/mcm.sh backup >> ~/mcm/backup.log 2>&1") | crontab -
```

**부트 볼륨 스냅샷 (권장):** 콘솔 ▸ Block Storage ▸ Boot Volumes ▸ 해당 볼륨 ▸ **Backups** ▸ Create Backup. 정책을 주기(Weekly)로 걸어두면 인스턴스를 잃어도 볼륨에서 복원됩니다.

---

## 9. 인증서 · 도메인 갱신

- **인증서**: certbot 이 systemd 타이머로 자동 갱신합니다. 확인은 `systemctl list-timers | grep certbot`, 수동 점검은 `sudo certbot renew --dry-run`.
- **도메인**: 5분 주기 cron 이 DuckDNS 를 갱신합니다. 로그는 `cat ~/duckdns/duck.log` (`OK` 면 정상).

---

## 10. 포트폴리오 상시 운영 — 유휴 회수 대응 ★

Always Free 계정의 인스턴스는 **일정 기간 사용률이 낮으면 유휴로 판정돼 회수될 수 있습니다.** 기준은 재부팅 여부가 아니라 CPU·네트워크·메모리 **사용률**이라, 방문자가 거의 없는 포트폴리오 링크는 그냥 두면 회수 대상에 들어갑니다. 재시작으로는 피할 수 없습니다.

**권장 대응 — 종량제(Pay As You Go)로 계정 업그레이드**

콘솔 우상단 ▸ 계정 메뉴 ▸ **Upgrade to Pay As You Go**. 업그레이드해도 Always Free 리소스는 계속 무료이고, **유휴 회수 대상에서 제외**됩니다. 한도를 넘기지만 않으면 청구는 발생하지 않습니다.

> 과금이 걱정되면 Billing ▸ **Budgets** 에서 1달러 예산 + 알림을 걸어두세요. 한도를 넘는 리소스를 실수로 만들면 메일이 옵니다.
>
> 회수·무료 등급 정책은 Oracle 이 바꿀 수 있으니, 중요한 시연 전에는 콘솔 공지를 한 번 확인하세요.

**업그레이드하지 않을 경우의 보험**

- 8장의 부트 볼륨 백업을 반드시 걸어둘 것 (인스턴스가 회수돼도 복원 가능)
- `~/mcm/.env` 사본을 로컬 안전한 곳에 보관 (키가 여기에만 있습니다)
- 이 문서대로면 재구축은 **3~5장, 약 20분**이면 끝납니다

---

## 11. 트러블슈팅

| 증상 | 원인 | 조치 |
|---|---|---|
| 핑은 되는데 브라우저 무한 로딩 | **iptables** 미개방 | `sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT` 후 `sudo netfilter-persistent save`. Security List 도 확인 (2장) |
| certbot 발급 실패 | DuckDNS IP 미반영 / 80 차단 | `dig +short <도메인>.duckdns.org` 로 IP 일치 확인 후 재실행 |
| 카메라 권한 팝업이 안 뜸 | HTTP 접속 | `https://` 로 접속. 주소창 자물쇠 확인 |
| 사진 업로드 413 | nginx 본문 크기 | `mcm.conf.template` 의 `client_max_body_size` (기본 50M) |
| 무드 판정만 실패 | `OPENAI_API_KEY` 누락/만료 | `mcm logs frontend` 에서 401/429 확인 |
| `/api/analyze-mood` 404 | nginx 가 프론트 라우트를 백엔드로 넘김 | `/etc/nginx/sites-available/mcm` 에 `location ~ ^/api/(analyze-mood\|passport)` 블록이 `location /api/` **앞**에 있는지 확인 |
| QR 링크가 `localhost` | `PUBLIC_BASE_URL` 미반영 | `.env` 확인 후 **`mcm deploy`로 재빌드** (재시작으론 안 됩니다) |
| `docker: permission denied` | docker 그룹 미반영 | 재접속(`exit` 후 ssh) |
| 빌드 중 멈춤/OOM | 메모리 부족 | 아래 "저사양 대응" |
| 디스크 가득 참 | 이미지 누적 | `docker image prune -af && docker builder prune -af` |

### 저사양 대응 (E2.1.Micro · 1GB 로 떨어진 경우)

서버에서 직접 빌드하면 Next.js 빌드가 메모리 부족으로 죽습니다. 두 가지 방법:

1. **swap 을 8GB 로** — `oracle-setup.sh` 의 `fallocate -l 4G` 를 `8G` 로 바꿔 실행. 느리지만 통과합니다.
2. **이미지를 밖에서 빌드** — GitHub Actions 나 로컬에서 `linux/arm64`(또는 `amd64`) 이미지를 빌드해 GHCR 에 올리고, 서버에서는 `docker compose pull` 만. 권장 방식이지만 설정이 한 단계 더 듭니다.

