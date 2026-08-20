# MCM PORTAL

부스 화면 **9개 + QR로 이어지는 모바일 2개**로 구성된 체험입니다. "인물·제품은 그대로,
주변 공간만 바뀌는" 것이 핵심이라, 촬영 화면에서 **그린 스크린 크로마키**로 인물을 분리해
World 배경 위에 실시간 합성합니다(그린 스크린을 못 쓰면 MediaPipe 세그멘테이션으로 폴백).
AI는 **의상을 보고 무드를 판정**하거나 **여권 카피를 쓰는** 데 씁니다.

## 실행

```bash
npm install
```

### MediaPipe 에셋 복사 (필수 — 한 번만)

`@mediapipe/selfie_segmentation` 은 기본적으로 jsdelivr CDN에서 wasm/모델을 받아옵니다.
**매장 네트워크가 불안정하면 미러 화면이 통째로 뜨지 않습니다.** 그래서 에셋을
`public/` 아래에 자가 호스팅합니다. `npm install` 후(또는 이 패키지를 업데이트한 뒤)
아래 명령을 한 번 실행하세요.

PowerShell:

```powershell
$src = "node_modules\@mediapipe\selfie_segmentation"
$dest = "public\mediapipe\selfie_segmentation"
New-Item -ItemType Directory -Force -Path $dest | Out-Null
Get-ChildItem $src -File |
  Where-Object { $_.Name -notin @("package.json", "index.d.ts", "README.md") } |
  Copy-Item -Destination $dest
```

bash:

```bash
mkdir -p public/mediapipe/selfie_segmentation
cp node_modules/@mediapipe/selfie_segmentation/*.{wasm,js,binarypb,tflite,data} \
   public/mediapipe/selfie_segmentation/
```

경로는 `SEGMENTATION_CONFIG.assetBasePath` 와 일치해야 합니다.
DevTools Network 탭에서 `jsdelivr`/`cdn` 요청이 **0건**이면 정상입니다.

### 폰트 (SUIT)

모든 화면의 글자는 **SUIT** 하나로 통일돼 있습니다. 웹폰트 CDN 을 쓰지 않고
`public/font/` 의 파일을 자가 호스팅하므로, 부스 네트워크가 끊겨도 서체가 깨지지
않습니다(MediaPipe 에셋과 같은 이유).

| 위치 | 역할 |
|---|---|
| `public/font/SUIT-Regular.ttf` | 본문 기본 굵기 (400) |
| `public/font/SUIT-Bold.ttf` | 강조·제목 (700) |
| `public/font/SUIT-ExtraBold.ttf` | 대형 타이틀 (800) |
| `app/layout.tsx` | `next/font/local` 로 3종 로드 → CSS 변수 `--font-suit` 노출 |
| `tailwind.config.ts` | `font-sans` / `font-serif` 둘 다 `var(--font-suit)` 로 지정 |

`font-serif` 도 같은 서체를 가리키므로, 기존 `font-serif` 클래스를 쓰던 제목들
(`StepIntro` · `StepReveal` · `StepHandoff` 등)을 하나씩 고치지 않아도 함께 적용됩니다.

굵기는 Tailwind 클래스로 고릅니다.

| 클래스 | 실제 파일 |
|---|---|
| (없음) · `font-normal` · `font-medium` | Regular |
| `font-semibold` · `font-bold` | Bold |
| `font-extrabold` | ExtraBold |

### 부스 화면 크기 (확대 배율)

부스는 큰 가로 디스플레이를 멀찍이 서서 보기 때문에 기본 16px 로는 글자와 버튼이
작습니다. `app/globals.css` 의 **한 줄**이 전체 배율을 정합니다.

```css
html:has(#portal-root)      { font-size: 22px; }   /* 16px = 확대 없음, 22px = +37.5% (현재) */
html:has(#portal-root) body { font-weight: 600; }  /* 본문 굵기 — 400 으로 되돌리면 원래대로 */
```

Tailwind 의 글자 크기·간격·너비가 전부 `rem` 이라 **이 값 하나로 글자와 컴포넌트가
같은 비율로 함께 커집니다.**

### 글자 색

본문은 `text-ink/60` ~ `text-ink/90` 범위를 씁니다. 부스는 조명이 밝고 멀리서 보기 때문에
50% 이하로 내리면 흐려서 안 읽힙니다.

| 왜 이렇게 했나 | 이유 |
|---|---|
| `html` 에 거는 이유 | `rem` 은 언제나 `html` 기준입니다. `#portal-root` 에 `font-size` 를 줘도 Tailwind 클래스는 꿈쩍하지 않습니다 |
| `:has(#portal-root)` 로 한정하는 이유 | 폰 화면(`/m/...`)은 피그마 시안대로 `w-[402px]` 같은 **px 고정값과 rem 이 섞여** 있어, 함께 키우면 레이아웃이 깨집니다 |
| 폴백 | `:has()` 를 모르는 브라우저는 규칙을 통째로 무시해 16px 로 남습니다 (= 확대 전 크기, 안전) |

### BGM 음원

**World 별이 아니라 체험 전체가 한 곡을 공유합니다.** 06 리빌에서 재생을 시작해
08 QR 에서 멈추고, 07 화면의 토글로 음소거할 수 있습니다.

경로는 `BGM_CONFIG.src` 한 곳에서만 정합니다 (현재 `/bgm/Golden%20Hour%20Lounge.mp3`).

**파일이 없어도 앱은 정상 동작합니다** — 콘솔 경고만 남고 무음으로 진행되며 음소거
토글도 그대로 눌립니다.

### 환경 변수 (`.env.local`)

백엔드 주소는 `.env.local` 한 곳에서만 정합니다 (`.gitignore` 의 `.env*.local` 규칙으로
git 에는 올라가지 않으니 각자 만들어야 합니다).

```bash
NEXT_PUBLIC_API_BASE=http://localhost:8080     # sjf_BE 주소
NEXT_PUBLIC_PORTAL_HOST=http://localhost:3000  # 업로드 실패 시 임시 QR 의 host
```

로컬에서 FE(3000)·BE(8080)를 같이 띄우는 동안에는 위 값 그대로 두면 됩니다.

### 개발 서버

```bash
npm run dev
```

`http://localhost:3000` 접속. 부스의 큰 가로 화면 기준 레이아웃이라 브라우저 창을 넓게
띄워서 보는 걸 권장합니다.

**카메라 권한은 4번 화면(MOOD)에서** 요청합니다. 무드 분석에 카메라가 필요해서
자연스럽게 그 자리에서 받고, 그 스트림을 05 프리로드와 07 합성이 그대로 재사용합니다
(권한 팝업은 체험당 한 번만 뜹니다).

## 플로우 (부스 9화면 + 모바일 2화면)

부스 화면은 **08 QR 에서 끝납니다.** 사진 저장은 QR 로 넘어간
**방문객 폰**에서 이어지고, 부스는 "처음으로"로 다음 고객을 맞습니다.

```
[부스]  01 START → 02 PRODUCT → 03 TRAVEL STYLE → 04 MOOD(AI 분석) → 05 OPENING
        → 06 REVEAL → 07 EXPERIENCE(촬영) → 09 MOMENT → 08 QR → 처음으로

[폰]    QR 스캔 → /m/{sessionId}        사진 확인 · 저장
                → /m/{sessionId}/shop   오늘 함께한 MCM (체험 제품 안내)
```

`#` 는 와이어프레임 번호라 **09 MOMENT 가 08 QR 보다 앞**에 옵니다
(촬영 사진을 먼저 크게 확인하고 QR 로 넘어가는 순서).

| # | 화면 | 파일 |
|---|---|---|
| 01 | START — 촬영·AI 분석 동의 + 시작 | `components/StepIntro.tsx` |
| 02 | PRODUCT (01/03) — 제품 컬러웨이 선택 | `components/StepProduct.tsx` |
| 03 | TRAVEL STYLE (02/03) — 여행 스타일 선택 | `components/StepJourney.tsx` |
| 04 | MOOD (03/03) — **카메라 촬영 → AI 무드 분석** | `components/StepMood.tsx` |
| 05 | PORTAL OPENING — 연출 + 프리로드(카메라·MediaPipe·배경) | `components/StepOpening.tsx` |
| 06 | WORLD REVEAL — 결과 World 공개, BGM 페이드인 | `components/StepReveal.tsx` |
| 07 | EXPERIENCE — 실시간 합성 + 촬영 | `components/StepMirror.tsx` + `MirrorStage.tsx` |
| 09 | YOUR MCM MOMENT — 촬영 사진 확인 + 서버 업로드 | `components/StepMoment.tsx` |
| 08 | QR HANDOFF — QR + 사진 저장 + **처음으로**(부스 마지막) | `components/StepHandoff.tsx` |

QR 로 이어지는 모바일 화면은 아래 두 개입니다.

| 경로 | 화면 | 파일 |
|---|---|---|
| `/m/{sessionId}` | 촬영 사진 확인 · 저장 → "다음" | `app/m/[sessionId]/page.tsx` |
| `/m/{sessionId}/shop` | 오늘 함께한 MCM — 체험한 제품 안내 · 제품 자세히 보기 | `app/m/[sessionId]/shop/page.tsx` |

모바일 화면은 부스의 `FlowContext` 에 접근할 수 없으므로, 어떤 제품을 골랐는지는
`GET /api/v1/sessions/{id}` 응답의 `productId` / `colorwayKey` 로 알아냅니다.

상태는 `lib/FlowContext.tsx` 의 `useReducer` 로 관리되며 라우팅 없이 한 페이지에서
전환됩니다. 화면 전환 책임은 리듀서에 있고, 각 전환은 예상한 단계에서만 일어나므로
같은 액션이 두 번 들어와도 단계가 건너뛰어지지 않습니다.

## 설정 구조

거의 모든 카피/데이터는 [`config/portal.config.ts`](config/portal.config.ts) 하나에 모여 있습니다.

- `COPY` — 화면에 보이는 모든 문구 (`\n` 은 줄바꿈으로 렌더링됩니다)
- `JOURNEY_QUESTION` — 03 화면의 질문과 선택지
- `MOOD_QUESTION` — 무드 3종의 **라벨 표** (버튼이 아닙니다 — 무드는 04에서 AI가 판정)
- `journeyCardImage()` — 03 카드 미리보기 사진 경로 (`public/place/`, 컬러웨이·무드 축 없이 통합 이미지 3장)
- `MOOD_ANALYSIS_CONFIG` — 04 무드 분석 파라미터 (캡처 크기·샘플 영역·폴백 임계값)
- `OPENING_STAGES` — 05 로딩 화면의 단계별 문구 + 지속 시간 (이 구간 길이의 유일한 노브)
- `WORLDS` — World 목록 (표기명, 내부 축, gradient, 배경 이미지, BGM 경로)
- `ACTIVE_WORLD_IDS` — **이번 체험에서 실제로 쓰는 World 목록 (4종으로 확정)**
- `MOOD_TO_TIME` / `JOURNEY_TO_SCENE` — 선택값 → 내부 축 우선순위
- `MATTING_CONFIG` — 인물 분리 방식 + 크로마키 파라미터
- `CAMERA_CONFIG` / `SEGMENTATION_CONFIG` / `RIPPLE_CONFIG` / `BGM_CONFIG` / `UPLOAD_CONFIG` — 파라미터

제품 데이터는 [`config/products.config.ts`](config/products.config.ts) 에 있습니다
(`PRODUCTS`). `colorway.hex` 는 02 카드 외에 06 CTA 테두리, 09 MOMENT 사진 테두리,
08 QR 화면 포인트 색으로도 쓰입니다(07 합성 화면에는 적용하지 않습니다).

## World는 어떻게 결정되나

사용자는 장소나 시간대를 직접 고르지 않습니다. 3가지 입력값을 내부 축으로 번역하고,
각 World의 속성과 **비대칭 가중치 점수 매칭**으로 결정합니다. 하드코딩 룩업 테이블 없이
속성 기반으로 동작하므로, World를 추가하거나 빼도 알고리즘 수정이 필요 없습니다.

### 입력 → 내부 축 번역

| 단계 | 입력 | 내부 축 |
|---|---|---|
| 02 제품 선택 | 컬러웨이 (`pink` / `beige`) | 밝기 톤 보정 |
| 04 AI 무드 분석 | 의상 무드 (`light` / `calm` / `bold`) | `timeOfDay` 우선순위 |
| 03 여행 스타일 | 여행 (`explore` / `culture` / `relax`) | `sceneType` 우선순위 |

**무드 → 시간대 우선순위:**

| 무드 | 1순위 | 2순위 | 직관 |
|---|---|---|---|
| `light` (설렘) | day | golden | 밝고 화사한 시간대 |
| `calm` (여유) | golden | day | 따뜻한 노을~낮 |
| `bold` (자신감) | night | golden | 어둡고 강렬한 밤 |

**여행 → 공간 유형 우선순위:**

| 여행 | 1순위 | 2순위 | 직관 |
|---|---|---|---|
| `explore` (도시 곳곳) | street | culture | 거리 탐험 |
| `culture` (쇼핑·문화) | culture | street | 문화·쇼핑 공간 |
| `relax` (여유롭게) | leisure | culture | 여유로운 장소 |

### 4개 World 속성

| World | 도시명 | `timeOfDay` | `sceneType` | `textOn` |
|---|---|---|---|---|
| `paris_dawn` | PARIS | day | culture | dark |
| `milano_terrace` | MILANO | golden | leisure | dark |
| `newyork_attitude` | NEW YORK | night | street | light |
| `seoul_neon` | SEOUL | night | culture | light |

### 비대칭 점수 계산

각 World에 대해 세 축의 점수를 합산하고, 최고점 World가 선택됩니다.

```
총점 = timeOfDay점수 + sceneType점수 + colorway보정
```

**시간대 축** (무드가 결정하는 "분위기"이므로 가중치가 높음):

| 조건 | 점수 |
|---|---|
| World의 timeOfDay = 무드의 1순위 | **+4** |
| World의 timeOfDay = 무드의 2순위 | **+2** |

**공간 축** (여행 스타일이 결정하는 "장소 성격"):

| 조건 | 점수 |
|---|---|
| World의 sceneType = 여행의 1순위 | **+2** |
| World의 sceneType = 여행의 2순위 | **+1** |

**컬러웨이 톤 보정** (제품 색과 World 분위기의 조화):

| 조건 | 점수 |
|---|---|
| `pink` + 어두운 World (`textOn: "light"`) | **+1** |
| `beige` + 밝은 World (`textOn: "dark"`) | **+1** |

최대 가능 점수 = 4 + 2 + 1 = **7점**. 동점이면 `ACTIVE_WORLD_IDS` 배열 순서상 앞선
World가 선택됩니다. 난수를 쓰지 않으므로 **같은 선택은 항상 같은 결과**가 나옵니다.

### 왜 비대칭인가

시간대(무드) 축의 가중치를 공간(여행) 축보다 높게 설정한 이유는, 무드가 체험의 **전체
톤**을 결정하기 때문입니다. "자신감" 무드의 손님이 밤 World로 가는 것이, "쇼핑문화"를
골랐다고 해서 낮 World로 바뀌는 것보다 체험의 일관성이 높습니다. 공간 축은 같은
시간대 안에서 도시를 **세분화하는** 역할을 합니다.

### 예시

**`beige` + `bold`(자신감) + `explore`(도시 곳곳)**

| World | time 점수 | scene 점수 | colorway | 합계 |
|---|---|---|---|---|
| NEW YORK (night, street, light) | 4 | 2 | 0 | **6** |
| SEOUL (night, culture, light) | 4 | 1 | 0 | 5 |
| MILANO (golden, leisure, dark) | 2 | 0 | 1 | 3 |
| PARIS (day, culture, dark) | 0 | 1 | 1 | 2 |

→ 결과: **NEW YORK** (6점)

### 실사 배경은 조합 단위로 붙습니다

World(도시명)는 위 점수로 결정되지만, **07 촬영 배경 사진**은 `colorway × mood × journey`
조합에 직접 매핑됩니다. `comboBackgroundImage()` 가 파일명 토큰으로 경로를 조립합니다.

| 무드 키 | 파일명 토큰 | 여행 키 | 파일명 토큰 |
|---|---|---|---|
| `light` | `sul` | `explore` | `city` |
| `calm` | `calm` | `culture` | `shop` |
| `bold` | `confidence` | `relax` | `relax` |

```
/worlds/{색}/{색}_{무드토큰}_{여정토큰}2.png
예) /worlds/pink/pink_confidence_shop2.png
```

**핑크·베이지 × 무드 3 × 여정 3 = 18조합** 전량에 배경 사진이 있습니다.

## 합성 동작 방식

- `lib/PortalRuntime.tsx` 가 카메라 스트림·MediaPipe 인스턴스·배경 이미지·BGM 오디오를
  컴포넌트 생명주기 밖에 보관합니다. 05에서 확보한 자원을 07이 그대로 재사용하고,
  `처음으로`(RESET) 에서 `releaseAll()` 로 한 번에 정리합니다.
- `lib/composite.ts` 가 **배경까지 캔버스에 직접 그립니다.** CSS 배경 + 캔버스 조합은
  촬영 시 배경을 다시 그려야 해서 "화면과 저장된 사진이 다른" 문제가 생깁니다.
  촬영은 화면에 보이는 캔버스를 그대로 `toDataURL` 합니다.
- `lib/useSegmentation.ts` 가 마스크 → 인물 레이어 → 합성 순서로 매 프레임을 그립니다.
  `copy`/`source-in` 은 오프스크린 캔버스에서만 수행하고(메인에서 하면 배경이 지워짐),
  **좌우 반전은 합성된 인물 레이어에만 한 번** 적용합니다(배경은 반전되지 않습니다).
- 캔버스 해상도는 화면 비율을 따르고 `SEGMENTATION_CONFIG.maxCanvasWidth` 로 상한을
  둡니다. 촬영 결과 해상도도 이 값을 따릅니다.

## 그린 스크린 크로마키 (현재 기본 방식)

### 왜 바꿨는가

세그멘테이션(MediaPipe SelfieSegmentation)은 **인물이 움직일 때 경계가 미세하게 흔들리고
그 틈으로 실제 배경이 살짝 비칩니다.** 프레임마다 마스크를 새로 추정하기 때문에 생기는
구조적 한계라 `featherPx` 로는 완화만 되고 원인이 남습니다.

그린 스크린 + 색상 키잉은 **색이라는 고정 기준**으로 자르기 때문에 매 프레임 같은 판정이
나와 경계가 흔들리지 않습니다. 가방 스트랩처럼 가는 부분이 잘려나가는 문제(인물 전용
모델의 한계)도 함께 해결됩니다.

### 구성

| 파일 | 역할 |
|---|---|
| `lib/chromaKey.ts` | WebGL 단일 패스 셰이더 — CbCr 거리 → 알파, 스필 제거, cover 크롭, 아이드로퍼 |
| `lib/useChromaKey.ts` | 프레임 루프. `requestVideoFrameCallback` 이 있으면 **카메라가 새 프레임을 낼 때만** 그립니다 |
| `lib/matting.ts` | 모드 결정(config · `?matting=` · 세션 토글) · 보정값 보관 · config 코드 조각 생성 |
| `components/ChromaKeyTuner.tsx` | 보정 패널 (`/calibrate` 와 07 `?tune=1` 이 공유) |
| `app/calibrate/page.tsx` | 보정 전용 화면 |
| `components/MirrorStage.tsx` | 두 방식 중 선택 + WebGL 실패 시 자동 폴백 |

**배경 합성·좌우 반전·촬영(`drawCompositeFrame` / `captureFrame`)은 두 방식이 그대로
공유합니다** — 인물 레이어를 만드는 한 겹만 갈아끼웠습니다. 덕분에 "화면 = 저장된 사진"
보장도 그대로 유지됩니다.

색 거리는 RGB 가 아니라 **YCbCr 의 CbCr 평면**에서 잽니다(OBS 와 동일). RGB 거리는 밝기
차이까지 함께 재기 때문에, 스크린에 그림자가 지면 같은 원단인데도 거리가 벌어져 그 부분이
안 지워집니다.

크로마키 모드에서는 05 프리로드가 **MediaPipe 를 건너뜁니다**(로딩이 그만큼 빨라집니다).
`acquireCamera()` 프리로드는 그대로입니다.

### 부스 세팅 순서

1. **조명을 먼저 잡습니다.** 소프트웨어로 고칠 수 있는 건 조명 다음입니다 — 스크린에
   그림자나 핫스팟이 있으면 어떤 값을 넣어도 그 부분이 남습니다.
2. 브라우저에서 **`/calibrate`** 를 엽니다 (부스 플로우를 거치지 않는 전용 화면).
3. **"화면에서 색 찍기"** 를 켜고, 인물이 설 자리 뒤 스크린 가운데를 클릭합니다.
4. **"알파 보기"** 를 켭니다. 배경이 마젠타로 바뀌어 남은 초록 테두리와 인물에 뚫린
   구멍이 바로 보입니다.
   - `similarity` 를 올려 초록이 사라지는 지점, 내려 인물이 파이기 시작하는 지점을 찾아
     **그 사이**로 둡니다.
   - `smoothness` 로 가장자리를 정리합니다.
   - **몸 윤곽에 초록 테두리가 보이면 `spill` 을 올립니다** (아래 참고).
5. 팔을 크게 흔들어 **경계가 흔들리지 않는지**, 가방을 들어 **스트랩이 살아있는지**
   확인합니다. (세그멘테이션 대비 핵심 개선점이라 여기서 검수하세요)
6. **"설정 코드 복사"** → `config/portal.config.ts` 의 `MATTING_CONFIG.chromaKey` 블록에
   덮어쓰고 저장합니다.

### 스위치

| URL | 효과 |
|---|---|
| (없음) | `MATTING_CONFIG.mode` 를 따릅니다 — 현재 `"chromakey"` |
| `?matting=segmentation` | **그린 스크린이 없는 개발 PC 용.** 예전 세그멘테이션 방식으로 |
| `?matting=chromakey` | config 가 segmentation 이어도 크로마키로 |
| `?tune=1` | 07 촬영 화면에 보정 패널을 띄웁니다 (부스 운영 중에는 나오지 않습니다) |

**실행 중 전환 — 07 촬영 화면에서 `Shift+M`.** 그린 스크린을 세운 날과 아닌 날을 오갈 때
URL 을 다시 칠 필요 없이 즉시 뒤집습니다. 바뀐 모드 이름이 1.8초간 화면 위에 뜹니다.
`/calibrate` 상단의 **"부스 화면 열기"** 링크도 원하는 모드로 07 을 띄웁니다.

우선순위는 **`Shift+M` 토글 > `?matting=` > `MATTING_CONFIG.mode`** 입니다.

`/calibrate` 는 프로덕션 빌드에서도 열립니다(부스 PC 가 `npm run build && start` 로 돌 수
있으므로). 플로우 어디에서도 링크하지 않는 비공개 경로입니다.

### 몸 윤곽의 초록 테두리 — `spill` 이 유일한 해결책

가장 자주 나오는 증상입니다. **매트(알파) 문제가 아닙니다.** 스크린에서 튄 초록빛이
인물의 몸에 실제로 얹힌 것이라, 경계를 아무리 깎아도(`edgeShrink`) 그 픽셀은 알파 1 이라
그대로 남습니다. 실측으로도 `edgeShrink` 를 0 → 0.45 로 올리는 동안 초록기가 **전혀**
줄지 않았고, `spill` 만 값에 비례해 줄어 1.0 에서 0 이 됐습니다.

| spill | 남은 초록기 |
|---|---|
| 0.25 (초기값) | 20 |
| 0.4 | 16 |
| 0.6 | 11 |
| 0.8 | 6 |
| **1.0** | **0** |

그래서 기본값이 `1.0` 입니다. `min(g, (r+b)/2)` 가드 덕분에 초록기가 없는 색은 건드리지
않습니다 — 실측 변화량이 피부 0~2, 핑크 0, 베이지 6, 흰색·검정·데님·빨강 0 입니다.

### 폴백 — 화면은 절대 죽지 않습니다

WebGL 컨텍스트를 얻지 못하면 콘솔에 경고를 남기고 **세그멘테이션으로 자동 전환**합니다.
그래서 `public/mediapipe/` 에셋과 `useSegmentation` 은 그대로 남겨두었습니다.

### 04 무드 분석의 그린 가드

**그린 스크린을 세우면서 새로 생기는 문제입니다.** 로컬 폴백은
`MOOD_ANALYSIS_CONFIG.sampleRegion`(프레임 가운데 아래)의 평균색을 보는데, 손님이 조금만
옆으로 서거나 뒤로 물러나면 이 박스에 스크린이 들어옵니다. 초록은 순색도가 1.0 에 가깝고
밝기도 높아 **의상과 무관하게 전부 "설렘"으로 쏠립니다.**

그래서 크로마키 모드에서는 평균을 낼 때 키 컬러에 가까운 픽셀을 건너뜁니다
(`lib/moodAnalysis.ts` 의 `greenGuard`). 남은 표본이 20% 미만이면 가드를 풀고 전체 평균으로
되돌아가므로 **판정이 실패하는 경우는 없습니다.** AI 라우트 쪽에도 "배경색은 무시하라"는
지시를 한 줄 넣어두었습니다.

### 부스 쪽 요구사항 (촬영 환경)

- 그린 스크린은 **무광**(주름·광택 금지). 도색이면 크로마 그린 계열.
- 스크린 전용 조명 2개로 **균일하게** 깔 것 — 그림자가 지면 그 부분이 배경으로 안 지워집니다.
- 인물과 스크린 사이 **1m 이상** 거리 확보 → 초록빛 반사(스필)가 줄어 `spill` 값을 낮게 쓸 수 있습니다.
- 안내문에 **초록색 의상 주의**를 넣어주세요 (옷이 함께 지워집니다).

## 세션 ID · 서버 오류 처리

촬영 결과를 서버에 저장하고 QR 로 잇는 흐름에서, **부스에서만 조용히 실패하는** 두 지점을
아래 규약으로 막아뒀습니다.

### sessionId 는 반드시 UUID 형식

`createSessionId()`(`lib/FlowContext.tsx`)가 01 START 에서 발급합니다. 백엔드가 이 값을
UUID 로 검증하므로 **폴백도 UUID 형식이어야 합니다.**

`crypto.randomUUID` 는 secure context(https/localhost) 전용이라 부스 PC 가 http 로 접속하면
쓸 수 없습니다. 그래서 http 에서도 동작하는 `crypto.getRandomValues` 로 RFC 4122 v4 UUID 를
직접 조립하고, 그마저 없으면 `Math.random` 으로 내려가되 **형식은 그대로 유지**합니다.

### 업로드는 막히지 않게 — 타임아웃 · 용량 가드 · 재시도

부스 WiFi 가 끊기거나 서버가 죽어도 **방문객을 세워두면 안 되므로**, 업로드 실패는
흐름을 막지 않고 09 화면에서 재시도만 제공합니다("다음"은 항상 눌립니다).

| 장치 | 값 (`UPLOAD_CONFIG`) | 이유 |
|---|---|---|
| 요청 타임아웃 | `timeoutMs: 10000` | 응답이 안 오면 "저장 중"에서 멈춘 것처럼 보입니다 |
| 헬스체크 타임아웃 | `healthTimeoutMs: 3000` | 05 프리로드를 붙잡지 않도록 짧게 |
| 용량 상한 | `maxBytes: 10MB` | 백엔드 multipart 제한과 동일 |
| 재인코딩 | `shrinkAttempts` | 품질을 먼저 낮추고, 그래도 넘으면 해상도를 줄입니다 |

실사 배경이 들어가면서 JPEG 이 커졌기 때문에 용량 가드가 필요합니다. 대부분은 첫
검사에서 통과해 재인코딩 비용이 들지 않고, 넘칠 때만 순서대로 다시 인코딩합니다.

실패 원인은 화면 문구로 갈립니다 — 타임아웃(`TimeoutError`) / 413(용량) / 그 외 서버
오류(`ApiError`) / 네트워크 단절.

### 서버 다운은 05에서 미리 감지

05 프리로드에서 `GET /api/health` 를 함께 호출합니다. **체험을 막지는 않고**
(서버가 죽어도 촬영까지는 정상 진행) 콘솔 경고와 `backend_unreachable` 이벤트만
남겨, 스태프가 업로드 실패 전에 알아차리도록 합니다.

### 오류는 상태 코드별로 다르게 안내

`lib/api.ts` 의 `ApiError` 가 상태 코드와 백엔드 오류 본문(`API_SPEC` 5번 형식)을 화면까지
전달합니다. 네트워크가 끊긴 경우는 `fetch` 가 `TypeError` 를 던지므로 `instanceof ApiError`
로 자연스럽게 갈립니다. 모바일 결과 페이지(`/m/{sessionId}`)는 이걸 받아 나눠 보여줍니다.

| 상황 | 화면 문구 |
|---|---|
| 네트워크 단절 (서버에 닿지 못함) | 연결에 실패했어요 |
| 404 | 사진을 찾을 수 없어요 |
| 410 | 링크가 만료되었어요 (촬영 후 24시간 경과) |
| 그 외 (500 등) | 사진을 불러오지 못했어요 + 오류 코드 |

원본 오류는 `console.warn("[portal] 세션 조회 실패:", err)` 로 남습니다. 스태프가 폰 화면
문구로 1차 판단하고, 필요하면 콘솔에서 백엔드 메시지까지 확인하는 구조입니다.

## KPI 이벤트

`lib/analytics.ts` 의 `track()` 이 단계별로 호출됩니다. 아직 전송은 하지 않고
`console.info("[portal] ...")` + `window.__portalEvents` 버퍼에만 남깁니다.
QR 노출(`qr_displayed`)·사진 저장(`photo_download_clicked`)만 호출 지점이 있고,
**모바일 SHOP 화면의 제품 상세 확인(`product_detail_viewed`)은 타입 정의뿐**입니다.
지금은 MCM 스토어로 나가는 외부 링크라 `app/m/**` 에서는 `track()` 을 호출하지 않습니다.

## 알려진 한계

- 업로드에 끝내 실패하면 QR이 무효합니다 (임시 QR은 서버에 없는 세션을 가리킴). 08 화면의 "사진 저장하기"로 로컬 저장은 가능합니다.
- 세그멘테이션 폴백(그린 스크린 미사용 시)에서는 경계 흔들림과 가방 스트랩 잘림 현상이 있습니다.

---

## AI 기능 — 무드 분석 · 여권 카피

AI는 이미지를 **생성하지 않습니다.** 배경은 이미 찍어둔 실사 18장(`public/worlds/`)이고,
AI는 **보고 판정하거나 문장을 쓰는** 두 곳에만 쓰입니다. 두 라우트 모두 실패해도 폴백이
있어 화면이 멈추지 않습니다.

### 04 MOOD — 카메라로 의상을 읽어 무드 판정

```
카메라 프리뷰(가이드 프레임)
  → [AI 무드 분석 시작] → 현재 프레임 캡처(768px JPEG)
  → POST /api/analyze-mood  (서버가 OpenAI Vision 호출)
  → 결과를 화면에 보여주지 않고 바로 05 로 넘어감
```

판정 결과는 카드로 노출하지 않습니다. `state.moodAnalysis` 에 담겨 World 매칭과
09 여권 카피에만 쓰입니다.

| 파일 | 역할 |
|---|---|
| `components/StepMood.tsx` | 가이드 화면 하나 — 분석 중엔 버튼만 로딩 상태로 전환 |
| `lib/moodAnalysis.ts` | 프레임 캡처, 서버 호출, **로컬 색 분석 폴백** |
| `app/api/analyze-mood/route.ts` | 서버 전용 OpenAI Vision 호출 (`detail: "low"`) |
| `MOOD_ANALYSIS_CONFIG` | 캡처 크기 · 샘플 영역 · 폴백 임계값 |

| 무드 | 내부 키 | AI 토큰 | 파일명 토큰 | 의상 특성 |
|---|---|---|---|---|
| 설렘 | `light` | `EXCITEMENT` | `sul` | 고명도·고채도, 비비드·파스텔, 포인트 컬러 |
| 여유 | `calm` | `RELAXATION` | `calm` | 중명도 내추럴, 베이지·아이보리·카키, 코지한 룩 |
| 자신감 | `bold` | `CONFIDENCE` | `confidence` | 저명도 모노톤, 블랙·딥네이비·차콜, 미니멀 시크 |

### 실패하면 — 로컬 색 분석 폴백

키 미설정(503)·요청 한도(429)·오프라인·타임아웃 등 **어떤 실패에도 화면이 멈추지 않습니다.**
`analyzeMoodLocally()` 가 캡처 프레임의 상반신 영역 픽셀을 직접 읽어 평균 명도·채도로
같은 3종을 판정하고 그대로 진행합니다(난수 없음 — 같은 사진이면 항상 같은 결과).

```ts
sampleRegion: { x: 0.3, y: 0.45, w: 0.4, h: 0.45 },  // 색을 재는 상반신 박스(화면 가이드와 동일)
boldMaxLum: 0.3,        // 이 아래로 어두우면 자신감
earthMaxChroma: 0.7,    // 웜톤 어스톤(베이지·카키)은 밝아도 여유로 붙잡음
pastelMinLum: 0.75, pastelMinChroma: 0.15,  // 화사한 파스텔 → 설렘
vividMinChroma: 0.6,                        // 채도 높은 포인트 컬러 → 설렘
```

판정 순서는 **① 어두움 → 자신감, ② 웜톤 어스톤 → 여유, ③ 파스텔 *또는* 비비드 → 설렘,
④ 나머지 → 여유** 입니다. 순서와 OR 조합에 이유가 있습니다.

- ②가 ③보다 먼저인 이유: 베이지·아이보리는 **밝지만** 여유여야 합니다. 밝기를 보는 ③이
  먼저 걸리면 베이지가 설렘으로 샙니다.
- ③이 AND 가 아니라 OR 인 이유: 파스텔은 밝지만 채도가 낮고, 비비드 블루는 채도가 높지만
  파랑이라 어둡게 느껴집니다. AND 로 묶으면 둘 다 빠집니다.
- 명도를 HSL 의 `L` 로 재지 않는 이유: 채도가 높을수록 `L` 이 0.5 로 눌려, 비비드 옐로우가
  "밝은 옷"인데도 고명도 판정을 통과하지 못합니다. 대신 BT.601 체감 밝기를 씁니다.
- 채도를 HSL 의 `S` 로 재지 않는 이유: 밝은 저채도 색에서 부풀려집니다. 베이지의 HSL `S` 는
  0.36 이나 돼 화사한 포인트 컬러로 오인됩니다. 대신 순색도(`delta/max`)를 씁니다.

폴백이 실제로 얼마나 도는지는 `window.__portalEvents` 의
`mood_analyzed { source: "ai" | "local" }` 로 확인합니다.

### 04~05 구간의 체감 시간

이 구간에서 실제로 걸리는 일은 무드 판정(API 호출) 하나뿐입니다. World 매칭
(`resolveWorld`)도 배경 선택(`comboBackgroundImage`)도 로컬 계산이라 즉시 끝나서,
그냥 두면 "AI가 제대로 본 게 맞나" 싶을 만큼 순식간에 지나갑니다.

**체감 시간은 오직 05 의 "최소 표시 시간" 으로 조절합니다.** 04 에는 전용 대기 화면이
없습니다 — 가이드 화면에 머문 채 버튼만 로딩 상태(`COPY.moodAnalyzing`)로 바뀌고, 분석이
끝나면 바로 05 로 넘어갑니다.

- **05 opening** — `OPENING_STAGES`(`portal.config.ts`, 합계 **6,000ms**). 문구와 지속
  시간을 한 표로 묶어 뒀습니다. 화면의 진행 점은 항목 수에 맞춰 자동으로 늘어나므로,
  단계를 더하거나 빼도 컴포넌트는 안 고쳐도 됩니다.

```
3.0s  AI가 고객님의 무드를 분석하고 있어요  ●○
3.0s  고객님의 World로 데려다 드릴게요      ●●
```

### 09 여권 카피에 오늘 착장 반영

09 화면의 MCM TRAVEL PASSPORT 가 "여행 유형 / 추천 이유" 를 지을 때, 04에서 AI가 읽은
**오늘 입고 온 옷의 색·무드**(`state.moodAnalysis`)를 재료로 함께 넘깁니다. 같은 제품·같은
도시라도 손님마다 다른 문장이 나옵니다.

| 파일 | 역할 |
|---|---|
| `lib/passport.ts` | `PassportInput` 의 `outfitColorName?` / `outfitDescription?` (선택값) |
| `app/api/passport/route.ts` | 착장 반영 + 길이(14~24자)·톤(마침표·종결어미 금지) 규칙 + `normalizeReason()` |
| `components/StepMoment.tsx` | `moodAnalysis` 의 색·설명을 요청에 실어 보냄 |

값이 없으면 해당 줄 자체를 프롬프트에서 빼 빈 라벨이 남지 않습니다. 폴백 문구
(`buildFallbackPassport`)에는 반영하지 않습니다 — 폴백은 네트워크 없이 결정적으로 계산돼야 합니다.

### 라우트별 모델 선택

GPT-5.6 은 **Sol(플래그십) > Terra(중급) > Luna(저비용·저지연)** 3단 구성입니다. 두 라우트가
하는 일이 달라 티어도 다르게 골랐습니다.

| 라우트 | 모델 | 이유 |
|---|---|---|
| `/api/analyze-mood` | **`gpt-5.6-luna`**, `reasoning_effort: "none"` | "단순 분류/라우팅" 이 Luna 의 설계 목적 — 의상 색을 보고 3분류하는 이 라우트에 맞습니다. 실측 1.8~3.1초, `reasoning_tokens: 0`. RPD 상한 없음 |
| `/api/passport` | **`gpt-5.6-terra`**, `reasoning_effort: "low"` | 제약(14~24자·어미) 있는 한국어 창작이라 상위 티어가 값을 합니다. 같은 프롬프트 6표본 비교에서 **4o-mini 4/6 → Terra 6/6** 준수. 체험당 1회 호출이라 단가 차이는 무시할 수준 |

### 개인정보

분석용 프레임은 **저장하지 않습니다.** 판정을 위해 OpenAI 로 한 번 전송되고 메모리에서
버려지며, 백엔드(`/api/v1/sessions`)로 올라가는 사진은 07에서 찍은 합성 결과뿐입니다.
외부 전송이 일어나므로 01 START 동의 문구(`COPY.consentLabel`)에 "AI 스타일 분석"을
명시해 두었습니다.

---

## 백엔드 연동 (촬영 결과 저장 · QR)

백엔드(`sjf_BE`)의 `docs/API_SPEC.md` 규격에 맞춰 촬영 결과를 서버에 저장하고,
QR로 이어지는 모바일 결과 페이지를 연결합니다. 백엔드가 꺼져 있어도 업로드 실패 시
임시 QR로 폴백하므로 앱은 그대로 동작합니다.

- 촬영 직후(`09 MOMENT` 진입) 합성 JPEG + 선택값을 `POST /api/v1/sessions` 로 전송
- 응답으로 받은 `shareUrl` 로 QR 생성 (실패 시 임시 URL 폴백)
- QR을 스캔하면 열리는 `/m/{sessionId}` 에서 `GET /api/v1/sessions/{sessionId}` 로 사진 조회·저장

| 파일 | 역할 |
|---|---|
| `lib/api.ts` | `uploadSession` / `fetchSession` / `checkHealth`, dataURL→Blob 변환, API 주소 관리 |
| `app/m/[sessionId]/` | QR로 열리는 모바일 페이지 (랜딩 · `photo` · `shop`) |
| `components/StepMoment.tsx` | 촬영 직후 서버 업로드 후 `shareUrl` 저장 |
| `components/StepHandoff.tsx` | 받은 `shareUrl` 로 QR 생성 |

### 여권 카피(`travelType` / `reason`) — 부스 전용, 저장·반환 없음

MCM TRAVEL PASSPORT 의 "여행 유형 / 추천 이유" 두 줄은 **부스 09 화면에서만** 보여줍니다.
`/api/passport` 가 그 자리에서 즉석으로 만들어 `components/StepMoment.tsx` 의 `Passport`
컴포넌트에 표시할 뿐, 백엔드로 전송하지도 세션에 저장하지도 않습니다.

- 모바일 "촬영한 사진 보러가기" 페이지(`/m/{sessionId}/photo`)에는 **여권 카드가 없습니다.**
  촬영 사진과 "사진 저장하기" 버튼만 보여줍니다.
- `POST /api/v1/sessions` metadata 와 `GET /api/v1/sessions/{id}` 응답에는 `travelType`/
  `reason` 필드가 없습니다(백엔드 `PortalSession` 엔티티에도 해당 컬럼이 없습니다).
- 부스 화면을 벗어나면 그 문장을 다시 볼 방법이 없다는 뜻입니다 — 의도된 동작입니다.
