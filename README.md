# MCM PORTAL — Step 3 프로토타입

와이어프레임 확정안대로 플로우를 **8화면**으로 재구성하고, 미러 화면에 **MediaPipe
실시간 세그멘테이션 합성**을 붙였습니다. "인물·제품은 그대로, 주변 공간만 바뀌는"
경험이 이번 단계의 핵심입니다.

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

선언에 없는 굵기(500·600)는 브라우저 폰트 매칭 규칙에 따라 가장 가까운 파일로
떨어지므로 시스템 폰트로 폴백하지 않습니다. 파일을 **교체할 때는 파일명을 그대로
유지**하세요. 파일을 빼면 해당 굵기가 다른 파일로 대체되니, `app/layout.tsx` 의
`src` 배열도 함께 정리해야 합니다.

⚠️ `tailwind.config.ts` 를 고친 뒤에는 **dev 서버를 재시작**해야 반영됩니다
(Next 가 컴파일된 설정을 캐시해서, 새로고침만으로는 예전 폰트가 계속 나옵니다).

### BGM 음원 (선택)

`public/bgm/{worldId}.mp3` 규약으로 넣어주세요 (예: `public/bgm/newyork_attitude.mp3`).
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

⚠️ **폰으로 QR 을 스캔해 테스트할 때만** `NEXT_PUBLIC_API_BASE` 를 PC 의 LAN IP
(예: `http://192.168.0.15:8080`)로 바꾸세요. `localhost` 는 QR 을 연 **폰 자신**을
가리키므로 접속되지 않습니다. 이때 백엔드의 `FRONTEND_BASE_URL`·`PUBLIC_API_BASE_URL`·
`ALLOWED_ORIGINS` 도 같은 IP 로 맞춰야 QR 주소와 이미지 주소가 함께 살아납니다
(BE 담당자와 값을 조율하세요). 폰과 PC 는 같은 Wi-Fi 에 있어야 합니다.

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

부스 화면은 **08 QR 에서 끝납니다.** 사진 저장과 관심 제품 저장은 QR 로 넘어간
**방문객 폰**에서 이어지고, 부스는 "처음으로"로 다음 고객을 맞습니다.

```
[부스]  01 START → 02 PRODUCT → 03 TRAVEL STYLE → 04 MOOD(AI 분석) → 05 OPENING
        → 06 REVEAL → 07 EXPERIENCE(촬영) → 09 MOMENT → 08 QR → 처음으로

[폰]    QR 스캔 → /m/{sessionId}        사진 확인 · 저장
                → /m/{sessionId}/shop   TODAY'S MCM · SAVED ITEMS
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
| `/m/{sessionId}/shop` | TODAY'S MCM · SAVED ITEMS · 관심 제품 저장 | `app/m/[sessionId]/shop/page.tsx` |

모바일 화면은 부스의 `FlowContext` 에 접근할 수 없으므로, 어떤 제품을 골랐는지는
`GET /api/v1/sessions/{id}` 응답의 `productId` / `colorwayKey` 로 알아냅니다.

> ⚠️ **관심 제품 저장은 아직 서버에 남지 않습니다.** 저장용 API 가 없어 폰 안에서만
> 유지되고(새로고침하면 풀립니다) `product_interest_saved` 이벤트만 남습니다.
> SAVED ITEMS 도 `config/products.config.ts` 의 `SAVED_ITEMS` 샘플 고정값입니다.

상태는 `lib/FlowContext.tsx` 의 `useReducer` 로 관리되며 라우팅 없이 한 페이지에서
전환됩니다. 화면 전환 책임은 리듀서에 있고, 각 전환은 예상한 단계에서만 일어나므로
같은 액션이 두 번 들어와도 단계가 건너뛰어지지 않습니다.

## 우리가 수정할 파일

거의 모든 카피/데이터는 [`config/portal.config.ts`](config/portal.config.ts) 하나에 모여 있습니다.

- `COPY` — 화면에 보이는 모든 문구 (`\n` 은 줄바꿈으로 렌더링됩니다)
- `JOURNEY_QUESTION` — 03 화면의 질문과 선택지
- `MOOD_QUESTION` — 무드 3종의 **라벨 표** (버튼이 아닙니다 — 무드는 04에서 AI가 판정)
- `JOURNEY_CARD_MOOD` — 03 카드 미리보기 컷에 쓸 대표 무드
- `MOOD_ANALYSIS_CONFIG` — 04 무드 분석 파라미터 (캡처 크기·샘플 영역·폴백 임계값)
- `WORLDS` — World 목록 (표기명, 내부 축, gradient, 배경 이미지, BGM 경로)
- `ACTIVE_WORLD_IDS` — **이번 체험에서 실제로 쓰는 World 목록 (임시값, 회의 확정 대기)**
- `MOOD_TO_TIME` / `JOURNEY_TO_SCENE` — 선택값 → 내부 축 우선순위
- `CAMERA_CONFIG` / `SEGMENTATION_CONFIG` / `RIPPLE_CONFIG` / `BGM_CONFIG` — 파라미터
- `WORLD_ALTERNATES` — "다른 세계도 보기" 안건용 (현재 화면에서는 미사용)

제품 데이터는 [`config/products.config.ts`](config/products.config.ts) 에 있습니다
(`PRODUCTS`). `colorway.hex` 는 02 카드 외에 06 CTA 테두리, 09 MOMENT 사진 테두리,
08 QR 화면 포인트 색으로도 쓰입니다(07 합성 화면에는 적용하지 않습니다).

### 제품 사진 넣기

```
public/products/{productId}-{colorwayKey}.png
  → public/products/stark_backpack_visetos-pink.png
  → public/products/stark_backpack_visetos-black.png
```

흰 배경 정면 컷(정사각형에 가까운 비율)을 넣어주세요. 카드가 밝은 중립 배경
(`#f4f2ef`) 위에 `object-contain` 으로 올리므로 흰 제품도 묻히지 않습니다.
경로를 바꾸려면 `PRODUCTS[].colorways[].image` 를 수정하면 됩니다.

**파일이 없거나 경로가 틀려도 화면은 깨지지 않습니다** — 로드 실패 시 02 카드가
`colorway.hex` 색의 백팩 실루엣(인라인 SVG)으로 자동 폴백합니다.

## World는 어떻게 결정되나

사용자는 장소나 시간대를 직접 고르지 않습니다. 선택값이 **내부 축**으로 번역되고,
World 속성과의 매칭 점수로 결정됩니다 (조합별 하드코딩 테이블 없음).

- 분위기 → `timeOfDay` (`day` / `golden` / `night`)
- 여행 스타일 → `sceneType` (`street` / `culture` / `leisure`)
- 1순위 축 일치 **+3**, 2순위 **+1**, 컬러웨이 톤 일치 **+1**
- 동점이면 `ACTIVE_WORLD_IDS` 배열 순서상 앞선 World. **난수를 쓰지 않으므로 같은
  선택은 항상 같은 결과**가 나옵니다

⚠️ 시간대·공간 성격 축은 **문구로 노출하지 않습니다**. 라벨이나 문구에 "밤/노을" 같은
표현을 넣지 마세요. 대신 **배경 색으로만** 느껴지게 합니다.

### 실사 배경은 조합 단위로 붙습니다

World 는 위 매칭 점수로 고르지만, **실사 배경은 (컬러웨이 × 무드 × 여행 스타일) 조합에
직접 매핑**됩니다. `config/portal.config.ts` 의 `comboBackgroundImage()` 가 파일명 토큰으로
경로를 조립하고, 파일이 없으면 World 의 gradient 목업으로 폴백합니다.

| 무드 키 | 04 화면 라벨 | 파일명 표기 |
|---|---|---|
| `light` | 설렘 (새로운 순간을 기대하는) | `sul` |
| `calm` | 여유 (천천히 즐기고 싶은) | `calm` |
| `bold` | 자신감 (나답게 뽐내고 싶은) | `confidence` |

| 여행 키 | 03 화면 라벨 | 파일명 표기 |
|---|---|---|
| `explore` | 도시 곳곳 둘러보기 | `city` |
| `culture` | 쇼핑·문화 즐기기 | `shop` |
| `relax` | 여유롭게 쉬기 | `relax` |

**핑크·베이지 × 무드 3 × 여정 3 = 18조합** 전량에 배경이 있고, 조합마다 두 컷
(**variant 1 = 03 선택 카드용, variant 2 = 07 촬영 배경용**)이 있어 총 36장입니다.

```
/worlds/{색}/{색}_{무드토큰}_{여정토큰}{버전}.png
예) /worlds/pink/pink_confidence_shop2.png
```

자세한 규약은 아래 "조합별 실사 배경 18조합" 절을 보세요.

⚠️ `WORLDS[].backgroundImage` 에 **없는 파일 경로를 적지 마세요.** 06 리빌은 CSS
`url()` 로 배경을 깔기 때문에, 파일이 404 나면 gradient 로 폴백되지 않고 배경이 아예
비어버립니다(캔버스 합성만 gradient 로 폴백됩니다).

### 시간대 팔레트 규약

실사 배경이 없는 동안에도 시간대가 눈에 보이도록, 활성 World의 gradient는 위가 하늘,
아래가 지면인 **수직(180deg)** 방향으로 잡혀 있습니다.

| timeOfDay | 팔레트 | 평균 명도 | textOn |
|---|---|---|---|
| `day` (PARIS) | 차가운 하늘빛 → 밝은 석조 지면 | 0.80 | dark |
| `golden` (MILANO) | 앰버 하늘 → 테라코타 지면 | 0.50 | dark |
| `night` (NEW YORK) | 검은 하늘 → 강철빛 → 붉은 가로등 글로우 | 0.02 | light |
| `night` (SEOUL) | 검은 하늘 → 보라 → 마젠타 네온 | 0.03 | light |

같은 `night` 두 World는 **색상**으로 구분합니다(강철빛 218° / 보라 258°).
글자 대비는 네 World 모두 WCAG AA(4.5:1) 이상입니다.

⚠️ `textOn` 은 `resolveWorld` 의 컬러웨이 보정에도 쓰입니다. 색을 바꾸면서 `textOn` 까지
바꾸면 매핑 결과가 달라지니, 그럴 때는 위 매핑 표를 다시 확인하세요.
`gradient`(CSS)와 `gradientStops`(07 캔버스)는 **같은 값으로 함께** 고쳐야 합니다.

### 매핑 전수 확인 (회의 자료)

개발 모드에서 브라우저 콘솔에:

```js
console.table(window.__portalMappingTable())
```

18조합(컬러웨이 2 × 무드 3 × 여행 3)의 결과 World와 `reason` 문장이 표로 나옵니다.
`ACTIVE_WORLD_IDS` 를 바꾸면 이 표가 바로 달라집니다.

> `reason` 문장("여유 · 쇼핑·문화 즐기기 — NEW YORK, 해 질 무렵")은
> 데이터로만 생성해두고 **화면에는 렌더링하지 않습니다.** 노출 위치는 회의 후 결정.

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
  CSS 등 다른 곳에 반전을 중복으로 걸지 마세요.
- 캔버스 해상도는 화면 비율을 따르고 `SEGMENTATION_CONFIG.maxCanvasWidth` 로 상한을
  둡니다. 촬영 결과 해상도도 이 값을 따릅니다.
- 가장자리가 딱딱하면 `SEGMENTATION_CONFIG.featherPx` 를 올려보세요 (0 = 비활성).

## 다음 단계: 그린 스크린 크로마키

### 왜 바꾸는가

현재 방식(MediaPipe SelfieSegmentation)은 **인물이 움직일 때 경계가 미세하게 흔들리고
그 틈으로 실제 배경이 살짝 비칩니다.** 프레임마다 마스크를 새로 추정하기 때문에 생기는
구조적 한계라 `featherPx` 로는 완화만 되고 원인이 남습니다.

부스를 제작할 때 뒤에 **그린 스크린**을 세우고 색상 키잉으로 바꾸면, 색이라는 고정 기준으로
자르기 때문에 매 프레임 같은 판정이 나와 경계가 흔들리지 않습니다. 가방 스트랩처럼 가는
부분이 잘려나가는 문제(인물 전용 모델의 한계)도 같이 해결됩니다.

### 지금 준비된 것

```ts
// config/portal.config.ts
MATTING_CONFIG = {
  mode: "segmentation",          // ← "chromakey" 로 전환할 스위치
  chromaKey: { keyColor, similarity, smoothness, spill },
}
```

`mode` 를 `"chromakey"` 로 바꿔도 **아직은 세그멘테이션으로 동작하고 콘솔 경고만 남습니다**
(부스에서 화면이 죽는 것이 최악이므로 의도적인 폴백). 파라미터는 OBS 크로마키와 같은
의미이므로 부스에서 조명을 잡은 뒤 실측값으로 채우면 됩니다.

### 교체 범위 — 인물 레이어 한 겹뿐

`drawPersonLayer()` 가 "인물 레이어를 만드는" 유일한 지점이고, 그 뒤의 배경 합성·좌우 반전·
촬영은 인물 레이어가 **어떻게** 만들어졌는지 모릅니다. 덕분에 아래 세 곳만 바뀝니다.

| 파일 | 할 일 |
|---|---|
| `lib/composite.ts` | `drawChromaKeyPersonLayer(personCtx, videoFrame, w, h)` 추가 — `keyColor` 와의 색 거리로 알파를 계산. `drawCompositeFrame` / `captureFrame` 은 **그대로 재사용** |
| `lib/useChromaKey.ts` (신규) | `useSegmentation` 자리를 대신하는 프레임 루프. MediaPipe 가 필요 없으므로 `<video>` 를 매 프레임 바로 처리 |
| `components/MirrorStage.tsx` | `MATTING_CONFIG.mode` 로 두 훅 중 하나를 선택 |

`PortalRuntime.getSegmenter()` 프리로드와 05 화면의 MediaPipe 워밍업은 크로마키에서는
불필요해집니다(로딩이 그만큼 빨라집니다). `acquireCamera()` 프리로드는 그대로 유지하세요.

구현은 픽셀 루프(`getImageData`/`putImageData`)로 시작해도 되지만, 1600px 폭에서 60fps를
노리면 **WebGL 셰이더**가 안전합니다. 색 거리는 RGB보다 **YCbCr 의 CbCr 평면**에서 재는 편이
조명 편차에 강합니다(OBS 방식과 동일).

### 부스 쪽 요구사항 (촬영 환경)

- 그린 스크린은 **무광**(주름·광택 금지). 도색이면 크로마 그린 계열.
- 스크린 전용 조명 2개로 **균일하게** 깔 것 — 그림자가 지면 그 부분이 배경으로 안 지워집니다.
- 인물과 스크린 사이 **1m 이상** 거리 확보 → 초록빛 반사(스필)가 줄어 `spill` 값을 낮게 쓸 수 있습니다.
- 안내문에 **초록색 의상 주의**를 넣어주세요 (옷이 함께 지워집니다).
- 조명을 잡은 뒤 실제 화면을 캡처해 `keyColor` 를 실측값으로 교체하세요.

## 세션 ID · 서버 오류 처리

촬영 결과를 서버에 저장하고 QR 로 잇는 흐름에서, **부스에서만 조용히 실패하는** 두 지점을
아래 규약으로 막아뒀습니다.

### sessionId 는 반드시 UUID 형식

`createSessionId()`(`lib/FlowContext.tsx`)가 01 START 에서 발급합니다. 백엔드가 이 값을
UUID 로 검증하므로 **폴백도 UUID 형식이어야 합니다.**

`crypto.randomUUID` 는 secure context(https/localhost) 전용이라 부스 PC 가 http 로 접속하면
쓸 수 없습니다. 그래서 http 에서도 동작하는 `crypto.getRandomValues` 로 RFC 4122 v4 UUID 를
직접 조립하고, 그마저 없으면 `Math.random` 으로 내려가되 **형식은 그대로 유지**합니다.

⚠️ 이 폴백의 출력 형식을 바꾸지 마세요. `${Date.now()}-${random}` 같은 값은 개발 PC
(localhost)에서는 멀쩡히 동작하다가 **부스(http)에서만 업로드가 400 으로 실패**합니다.
화면에는 오류가 안 뜨고 QR 만 안 되는 형태라 원인을 찾기 어렵습니다.

### 업로드는 막히지 않게 — 타임아웃 · 용량 가드 · 재시도

부스 WiFi 가 끊기거나 서버가 죽어도 **방문객을 세워두면 안 되므로**, 업로드 실패는
흐름을 막지 않고 09 화면에서 재시도만 제공합니다("다음"은 항상 눌립니다).

| 장치 | 값 (`UPLOAD_CONFIG`) | 이유 |
|---|---|---|
| 요청 타임아웃 | `timeoutMs: 10000` | 응답이 안 오면 "저장 중"에서 멈춘 것처럼 보입니다 |
| 헬스체크 타임아웃 | `healthTimeoutMs: 3000` | 05 프리로드를 붙잡지 않도록 짧게 |
| 용량 상한 | `maxBytes: 10MB` | **백엔드 multipart 제한과 같은 값을 유지하세요** |
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
와이어프레임 KPI 4종 중 QR 노출·사진 저장·관심 제품 저장(SHOP 화면)까지는 호출 지점이
있고, **제품 상세 확인(`product_detail_viewed`)만 타입 정의뿐**입니다.

## 다음 단계 / 알려진 한계

- **관심 제품 저장이 서버에 남지 않습니다.** 모바일 화면은 붙었지만 저장용 API 가 없어
  폰 안에서만 유지되고, 제품 상세 화면(`product_detail_viewed`)은 아직 없습니다.
- **업로드에 끝내 실패하면 QR 이 무효합니다.** 재시도해도 안 되면 앱은 임시 QR 로 계속
  진행되는데, 그 QR 은 서버에 없는 세션을 가리켜 폰에서 "사진을 찾을 수 없어요"(404)가
  뜹니다. 사진 자체는 08 화면의 "사진 저장하기"로 로컬 저장이 가능합니다.
- **인물 경계가 움직임에 따라 살짝 흔들려 배경이 비칩니다.** 프레임마다 마스크를 새로
  추정하는 방식의 구조적 한계이며, 부스 제작 시 **그린 스크린 크로마키로 교체 예정**
  입니다(위 "다음 단계: 그린 스크린 크로마키"). 그때까지 촬영은 어깨에 멘 구도 +
  움직임을 줄인 포즈가 가장 안정적입니다.
- SelfieSegmentation은 **인물 전용 모델**이라 손에 든 가방·가는 스트랩은 배경으로
  잘릴 수 있습니다. 이 역시 크로마키 전환으로 함께 해결됩니다.
- **실사 배경은 18조합 중 6조합만 준비됐습니다** (PINK × 설렘·여유 × 여행 3종).
  나머지 12조합(자신감 전체 + BLACK 전체)은 gradient 목업으로 나갑니다 — 시간대는
  팔레트로 구분되지만 **도시 고유의 장소감**은 실사 배경이 들어와야 살아납니다.
- BGM 음원 미확보 — 재생 경로만 검증 가능합니다.

---

## 변경 이력 — Step 3 이후 추가 작업

프로토타입(피그마 확정안)에 맞춰 아래 작업을 추가했습니다. 요약하면 **(1) 촬영 이후
플로우를 3화면 늘리고, (2) 누끼(인물 분리) 품질을 소프트웨어로 개선하고, (3) World·UI
실사 배경을 AI로 생성하는 파이프라인을 붙이고, (4) 시작 화면을 목업 톤으로 리디자인**했습니다.

### 1. 촬영 이후 플로우 확장 (촬영 → 사진 확인 → QR → 관심 제품)

기존에는 `07 EXPERIENCE → QR HANDOFF` 로 바로 끝났습니다. 목업대로 촬영한 사진을
크게 확인하고 관심 제품까지 이어지도록 **세 화면**을 추가/재구성했습니다.

```
07 EXPERIENCE(촬영)
  → 09 YOUR MCM MOMENT (촬영 사진 크게 보기)      components/StepMoment.tsx  [신규]
  → 08 QR HANDOFF     (QR + 사진 저장)            components/StepHandoff.tsx [재정리]
  → SHOP              (TODAY'S MCM + SAVED ITEMS)  components/StepShop.tsx    [신규]
  → 처음으로(RESET)
```

- **StepMoment (09)** — `state.capturedImage` 를 화면 가득 보여주고 "다음"으로 넘어갑니다.
- **StepHandoff (08)** — 사진은 앞 화면에서 이미 크게 봤으므로 QR 중심으로 정리하고,
  "다음" 버튼으로 SHOP 으로 넘어갑니다. (기존 QR 생성·`stopBgm`·`qr_displayed` 로직 유지)
- **StepShop** — 왼쪽 **TODAY'S MCM**(선택 제품 + 가격 + `관심 제품 저장하기 ♥`),
  오른쪽 **SAVED ITEMS**(관심 목록). "처음으로" 로 다음 고객을 위해 초기화합니다.

상태 전환은 기존 규약(리듀서가 예상 단계에서만 전환)을 그대로 따릅니다.
`lib/FlowContext.tsx` 에 액션 `SHOW_QR`(moment→handoff), `SHOW_SHOP`(handoff→shop) 을
추가했고, `CAPTURE` 의 목적지를 `handoff` → `moment` 로 바꿨습니다.

> ⚠️ **SAVED ITEMS 는 현재 샘플 데이터**입니다(`config/products.config.ts` 의 `SAVED_ITEMS`).
> 실제 위시리스트 연동 전까지 고정 노출되며, 제품 사진이 없으면 색 플레이스홀더로 폴백합니다.
> TODAY'S MCM 가격도 `PRODUCTS[].price` 예시값(₩1,290,000)이니 실제 값으로 교체하세요.

### 2. 누끼(세그멘테이션) 가장자리 개선

"경계가 흔들리고 그 틈으로 배경이 비치는" 문제를 소프트웨어로 완화했습니다(근본 해결책인
그린 스크린 크로마키 계획은 그대로 유효합니다). `lib/composite.ts` 의 `drawPersonLayer` 가
마스크를 깔 때 **blur(부드럽게) + brightness(경계 안쪽으로 깎기) + contrast(반투명 띠 제거)**
를 조합하도록 바꿨고, 값은 `config/portal.config.ts` 의 `SEGMENTATION_CONFIG` 에서 조절합니다.

```ts
// SEGMENTATION_CONFIG 에 추가된 노브
maskErode: 0.85,   // 경계를 안쪽으로 깎는 정도(밝기 배율). 1=끔. 낮출수록 뒷배경 테두리 제거 (권장 0.8~0.95)
maskContrast: 400, // 반투명 경계 띠를 사람/배경으로 미는 세기(%). 100=끔. 높을수록 배경 비침 제거 (권장 300~500)
```

배경이 여전히 비치면 `maskContrast` 를, 사람 윤곽이 너무 얇아지면 `maskErode` 를 조정하세요.
움직임 떨림이 크면 `SEGMENTATION_CONFIG.modelSelection` 을 `1`(landscape) → `0`(general) 로
바꿔 비교해볼 수 있습니다.

### 3. ~~World·UI 실사 배경 AI 생성 파이프라인~~ (폐기)

> 이미지 생성 스크립트(`scripts/generate-images.mjs`, `generate-worlds.mjs`)는 **삭제되었습니다.**
> 제공된 OpenAI 키가 Free Tier 라 이미지 생성(`gpt-image` / DALL·E) 호출을 쓸 수 없고,
> 실제 배경은 촬영본 36장(`public/worlds/`)으로 대체됐기 때문입니다.
> AI는 이미지를 만드는 대신 **보고 판정하는** 용도로 옮겨갔습니다 — 아래 "AI 무드 분석" 참고.

### 4. 01 START 화면 리디자인

`components/StepIntro.tsx` 를 목업 톤(빈티지 여행/여권)에 맞춰 다시 만들었습니다. 비행기
창문 배경(`/ui/intro-window.webp`, 없으면 노을 그라데이션 폴백) 위에 종이빛 카드 + 골드
엠블럼 + 우표 스탬프 + `PORTAL 시작하기` 버튼. 오디오 언락(`unlockAudio`)은 클릭 핸들러
안에서 동기 호출하는 기존 규약을 그대로 유지했습니다.

### 변경/추가 파일 요약

| 파일 | 변경 |
|---|---|
| `components/StepMoment.tsx` | **신규** — 09 YOUR MCM MOMENT (촬영 사진 확인) |
| `components/StepShop.tsx` | **신규** — TODAY'S MCM + SAVED ITEMS |
| `CLAUDE.md` | **신규** — 로컬 Claude Code용 프로젝트 가이드 |
| `components/StepIntro.tsx` | 시작 화면 빈티지 리디자인 |
| `components/StepHandoff.tsx` | QR 중심 재정리 + SHOP 으로 넘어가는 "다음" |
| `components/PortalApp.tsx` | `moment` / `shop` 스텝 렌더 연결 |
| `lib/FlowContext.tsx` | `SHOW_QR` / `SHOW_SHOP` 액션, `CAPTURE`→`moment` |
| `lib/composite.ts` | `drawPersonLayer` 마스크 가장자리 정리(`buildMaskFilter`) |
| `lib/types.ts` | `StepId` 에 `moment`·`shop`, `Product.price`, `SavedItem` 타입 |
| `config/portal.config.ts` | 활성 World `backgroundImage` 켜기, 누끼 노브, 새 화면 COPY |
| `config/products.config.ts` | `price` 추가, `SAVED_ITEMS` 샘플 추가 |

> 참고: README 상단의 "플로우 (8화면)" 표는 촬영 이후 흐름이 위와 같이 늘어나면서
> 최신이 아닙니다. 실제 순서는 `07 EXPERIENCE → 09 MOMENT → 08 QR → SHOP` 입니다.

---

## 백엔드 연동 (촬영 결과 저장 · QR)

백엔드(`sjf_BE`)의 `docs/API_SPEC.md` 규격에 맞춰 촬영 결과를 서버에 저장하고,
QR로 이어지는 모바일 결과 페이지를 연결했습니다. 백엔드 서버가 꺼져 있어도
업로드 실패 시 임시 QR로 폴백하므로 앱은 그대로 동작합니다.

- 촬영 직후(`09 MOMENT` 진입) 합성 JPEG + 선택값을 `POST /api/v1/sessions` 로 전송
- 응답으로 받은 `shareUrl` 로 QR 생성 (기존 임시 URL 대체)
- QR을 스캔하면 열리는 `/m/{sessionId}` 모바일 결과 페이지에서
  `GET /api/v1/sessions/{sessionId}` 로 사진 조회·저장

### 변경/추가 파일

| 파일 | 변경 |
|---|---|
| `lib/api.ts` | **신규** — `uploadSession` / `fetchSession`, dataURL→Blob 변환, API 주소 관리 |
| `app/m/[sessionId]/page.tsx` | **신규** — QR로 열리는 모바일 결과 페이지 |
| `components/StepMoment.tsx` | 촬영 직후 서버 업로드 후 `shareUrl` 저장 |
| `components/StepHandoff.tsx` | 받은 `shareUrl` 로 QR 생성(없으면 임시 URL 폴백) |
| `lib/FlowContext.tsx` | `shareUrl` 상태 + `SET_SHARE_URL` 액션 추가 |
| `.env.local` | `NEXT_PUBLIC_API_BASE` (백엔드 주소, git 제외) |

> 로컬 테스트 시 백엔드 `ALLOWED_ORIGINS` 에 `http://localhost:3000` 허용 필요.
> 폰/배포 테스트는 백엔드 `FRONTEND_BASE_URL`·`PUBLIC_API_BASE_URL` 을 실제 IP/도메인으로 변경.


---

## 8/18 수정 내용

이 날 작업은 다섯 갈래입니다. **(1) 조합별 실사 배경을 18조합 전량으로 확장하고 카드용·
촬영용 버전을 나눴고, (2) 컬러웨이를 black → beige 로 바꾸고, (3) 09 MOMENT 에 실시간 AI
여권(MCM TRAVEL PASSPORT)을 붙였으며, (4) 피그마 목업에 맞춰 시작·리빌·선택·로딩 화면을
다시 디자인**했습니다. 마지막으로 기존 타입 에러도 정리했습니다.

### 1. 조합별 실사 배경 18조합 + 버전 분리 (카드=1 · 촬영=2)

`/img` 촬영본(핑크·베이지 × 무드 3 × 여정 3 = 18조합, 각 2버전)을 `public/worlds/` 아래로
옮기고, 조합 배경 경로를 정적 표(map) 대신 **파일명 토큰으로 만드는 함수**
`comboBackgroundImage()` 로 바꿨습니다. 이제 자신감(bold)·베이지까지 18조합 전부 실사
배경이 나갑니다.

```
public/worlds/{색}/{색}_{무드토큰}_{여정토큰}{버전}.png
  예) public/worlds/pink/pink_sul_city1.png       (04 나라 선택 카드)
      public/worlds/pink/pink_sul_city2.png       (07 촬영 합성 배경)
```

파일명 토큰은 내부 키와 아래처럼 대응합니다.

| 무드 키 | 라벨 | 토큰 |  | 여정 키 | 라벨 | 토큰 |
|---|---|---|---|---|---|---|
| `light` | 설렘 | `sul` |  | `explore` | 도시 곳곳 둘러보기 | `city` |
| `calm` | 여유 | `calm` |  | `culture` | 쇼핑·문화 즐기기 | `shop` |
| `bold` | 자신감 | `confidence` |  | `relax` | 여유롭게 쉬기 | `relax` |

**버전 규약**: 같은 조합이라도 화면에 따라 다른 컷을 씁니다.

- `variant 1` — 04 나라 선택 화면의 **미리보기 카드**
- `variant 2` — 07 촬영 화면의 **인물 뒤 합성 배경**

`comboBackgroundImage(colorway, answers, variant)` 로 뽑고, 촬영/프리로드가 쓰는
`applyComboBackground(...)` 는 기본이 `variant 2` 입니다. 파일이 없는 조합은 gradient 로
폴백합니다.

### 2. 컬러웨이 black → beige 전환

새 배경 세트가 `pink` / `beige` 기준이라 두 번째 컬러웨이를 `beige` 로 바꿨습니다.
`ColorwayKey`(`lib/types.ts`), 제품 정의(`config/products.config.ts`),
`colorwayScore`(`config/portal.config.ts`)를 함께 수정했고, **베이지 가방 사진**
(`public/products/stark_backpack_visetos-beige.png`)도 넣었습니다. 사진이 없으면 베이지색
실루엣(SVG)으로 폴백합니다.

### 3. 피그마 목업 반영 — 시작·리빌·선택·로딩 화면

목업 확정안에 맞춰 화면 겉모습을 다시 잡았습니다. 정적 배경 3장은 `public/ui/` 에
있습니다(`bg1.jpg` 시작·리빌, `load.jpg` 로딩, `qr.jpg` 선택). 파일이 없으면 각각
그라데이션으로 폴백합니다.

- **01 시작(`StepIntro`)** — 종이 카드·스탬프를 걷어내고 비행기 창문(bg1) 위에 바로
  `MCM PORTAL` + `Where will MCM take you?` + 동의 체크 + `여행 시작하기`. 오디오 언락은
  기존대로 클릭 핸들러 안에서 동기 호출합니다.
- **06 리빌(`StepReveal`)** — 조합 배경 대신 **비행기 창문(bg1)** 위에
  `Your MCM world is…` + 도착 도시명을 띄웁니다. 조합 실사 배경은 이 화면이 아니라 07
  촬영 화면에서 인물 뒤로 합성됩니다.
- **02·03·04 선택(`StepFrame`)** — 우상단 `01 / 03` 표기를 **가운데 진행 점(dot)** 으로
  바꾸고, 공통 배경(qr)의 종이 베일을 옅게 낮췄습니다.
- **나라 선택(`StepJourney`)** — SVG 아이콘 카드를 **조합 실사 사진 카드(variant 1)** 로
  교체했습니다. (이 화면이 무드보다 앞으로 오면서, 미리보기 컷은 `JOURNEY_CARD_MOOD`
  대표 무드로 고정됩니다 — 아래 "AI 무드 분석" 참고.)
- **05 로딩(`StepOpening`)** — 배경(load) 베일을 낮추고 문구를
  "고객님에게 어울리는 장소를 찾고 있어요." 로 맞췄습니다.

> ⚠️ 06 리빌의 **도시 이름**은 여전히 점수 매칭(`resolveWorld`)을 따릅니다. 일부 조합은
> 도시 라벨과 촬영 배경의 무드가 어긋날 수 있고, 18조합에 도시를 직접 고정하려면 별도
> 매핑표가 필요합니다.

### 4. 09 MOMENT — MCM TRAVEL PASSPORT (실시간 AI 멘트)

촬영 사진 옆에 **여권 카드**를 발급합니다. 출발지(MUNICH 고정)·도착지(매칭 World)·동행
제품은 상태값으로 조립하고, **여행 유형과 추천 이유 두 줄만 실시간 AI 로 생성**합니다.

- AI 호출은 브라우저가 아니라 서버 라우트 **`app/api/passport/route.ts`** 를 거칩니다.
  키(`OPENAI_API_KEY`)는 서버에서만 읽혀 화면·네트워크 탭에 노출되지 않습니다.
- 키가 없거나 실패하면 `lib/passport.ts` 의 결정적 폴백 문구로 자동 대체됩니다(무중단).

```
# .env.local (git 제외 — 서버 전용, NEXT_PUBLIC_ 붙이지 말 것)
OPENAI_API_KEY=sk-...
```

#### OpenAI API 키 로컬 설정

Owner에게 전달받은 OpenAI API 키 전체 값을 프로젝트 루트의 `.env.local`에 입력합니다.
OpenAI 콘솔에서 지정한 키의 표시용 이름과 관계없이, 환경변수 이름은 정확히
`OPENAI_API_KEY`로 사용해야 합니다.

```env
OPENAI_API_KEY=sk-proj-복사한_전체_키
```

키 앞뒤에 공백·따옴표를 넣지 말고, `NEXT_PUBLIC_OPENAI_API_KEY`처럼 브라우저에 노출될 수
있는 이름을 사용하지 마세요. 키는 생성 직후에만 전체 값을 확인할 수 있으므로 안전한 곳에
보관해야 하며, `.env.local`은 커밋하지 않습니다.

키를 넣은 뒤에는 `npm run dev`를 재시작해야 반영됩니다(없으면 폴백으로 진행).

#### `401 Incorrect API key provided`가 발생할 때

`.env.local`에 키가 있어도 Windows 사용자/프로세스 환경변수에 같은 이름의
`OPENAI_API_KEY`가 이미 설정되어 있으면, 실행 중인 서버가 오래된 키를 사용할 수 있습니다.
프로젝트 폴더에서 개발 서버를 중지한 뒤 아래처럼 현재 PowerShell 세션의 값을 지우고
재실행합니다.

```powershell
cd C:\sfj\sjf_track
Remove-Item Env:OPENAI_API_KEY -ErrorAction SilentlyContinue
npm run dev
```

매번 지우지 않으려면 사용자 환경변수를 한 번 삭제한 뒤 PowerShell과 VS Code를 다시 엽니다.

```powershell
[Environment]::SetEnvironmentVariable("OPENAI_API_KEY", $null, "User")
```

macOS/Linux에서는 현재 셸의 환경변수를 다음처럼 지웁니다.

```bash
unset OPENAI_API_KEY
npm run dev
```

그래도 401이 계속되면 Owner에게 키가 유효한지, 키를 만든 Project와 현재 사용 중인 Project가
같은지 확인을 요청합니다. 키가 노출되었거나 분실된 경우에는 Owner가 기존 키를 폐기하고
새 키를 전달해야 합니다.

#### ⚠️ Free Tier 일일 요청 한도 (RPD 50) — ✅ Tier 1 상향으로 해결

> **해결됨 (8/19).** 결제 수단을 등록해 Tier 1로 올렸습니다 — `gpt-4o-mini` 의 RPD가
> 50 → **10,000** 으로 늘었습니다. 아래는 문제가 있었던 당시 기록이자, 왜 라우트별로
> 다른 모델을 쓰게 됐는지("8. AI 모델 선택" 절)의 배경입니다.

현재 키는 처음 **Free Tier** 였어서 `gpt-4o-mini` 의 **일일 요청이 50건**으로 묶여 있었습니다.
초과하면 429 `rate_limit_exceeded` 가 떨어지고 약 30분 뒤에 풀립니다.

```
Rate limit reached for gpt-4o-mini ... on requests per day (RPD): Limit 50, Used 50
```

부스는 체험 1회당 AI를 **2번** 부릅니다.

| 호출 | 용도 | 실패 시 |
|---|---|---|
| `/api/analyze-mood` | 카메라 의상 무드 판정 (핵심) | 로컬 색 분석 폴백 |
| `/api/passport` | 여권 카피 생성 | 결정적 폴백 문구 |

Free Tier 그대로였다면 **하루 최대 25명**이면 한도가 끝나고 그 뒤 방문객은 전부 폴백으로
돌아갈 뻔했습니다. 두 라우트 모두 폴백이 있어 화면이 죽지는 않지만, AI 체험이라는 기획
의도가 사라지는 문제였습니다.

> 이미지 생성이 막힌 것과는 **별개의 제약**이었습니다. 그건 모델 접근 권한 문제,
> 이건 요청 수 문제라 Tier 를 올리자 둘 다 함께 풀렸습니다.

Tier 1 이후에도 계정 대시보드를 다시 확인해 보니 **`gpt-4o-mini` 만 유일하게 일일 한도가
명시돼** 있고 다른 모델들은 RPM 만 있었습니다. 이 발견이 "8. AI 모델 선택" 절에서
`analyze-mood` 라우트를 다른 모델로 옮긴 계기입니다.

폴백이 실제로 얼마나 도는지는 `window.__portalEvents` 의
`mood_analyzed { source: "ai" | "local" }` 비율로 부스 운영 중에 바로 확인할 수 있습니다.

### 5. 빌드 타입 에러 정리

`lib/composite.ts` 의 `buildMaskFilter()` 에서 `SEGMENTATION_CONFIG` 값이 `as const` 로
리터럴 타입이 되어 "값이 1/100 이면 끔" 가드가 막히던 문제를, 세 값을 `number` 로 받아
해소했습니다(런타임 동작 동일). `npx tsc --noEmit` 통과합니다.

### 변경/추가 파일 요약

| 파일 | 변경 |
|---|---|
| `lib/passport.ts` | **신규** — 여권 데이터 조립 + 폴백 + `/api/passport` 호출 |
| `app/api/passport/route.ts` | **신규** — OpenAI 서버 라우트(키 서버 전용) |
| `components/StepMoment.tsx` | 사진 옆 여권 카드 추가(기존 업로드 로직 유지) |
| `components/StepIntro.tsx` | 시작 화면 목업 리디자인(bg1, 카드 제거, 문구·버튼) |
| `components/StepReveal.tsx` | 리빌 배경 bg1 + `Your MCM world is…` + 도시명 |
| `components/StepFrame.tsx` | 진행 표시 → 가운데 점, 선택 배경(qr) 베일 완화 |
| `components/StepJourney.tsx` | 나라 선택 → 조합 실사 사진 카드(variant 1) |
| `components/StepOpening.tsx` | 로딩 배경(load) + 문구 |
| `config/portal.config.ts` | `comboBackgroundImage`/`applyComboBackground` variant 지원 · 여권/화면 COPY · `colorwayScore` beige |
| `config/products.config.ts` | 컬러웨이 `black` → `beige` |
| `lib/types.ts` | `ColorwayKey` 를 `pink` / `beige` 로 |
| `lib/composite.ts` | `buildMaskFilter` 타입 에러 수정 |
| `public/worlds/{pink,beige}/*` | 조합별 실사 배경(각 18장, 버전 1·2) |
| `public/ui/{bg1,load,qr}.jpg` | 시작·로딩·선택 정적 배경 |
| `public/products/*-beige.png` | 베이지 가방 사진 |

> `public/worlds/` 의 png 는 용량이 큽니다(36장 ≈ 100MB). git 에 넣을 때는 필요한 버전만
> add 하거나 git-lfs 를 검토하세요. `.env.local` 은 `.gitignore` 대상이라 커밋에 안 들어갑니다.

### 남은 작업 (에셋·결정 대기)

- ~~**제품 사진**~~ — 실제 제품 사진(Ottomar 비세토스 위켄더)으로 교체 완료. "9. 제품
  사진·설명 교체" 절 참고.
- **03 활동 카드 미리보기 컷** — 무드가 뒤로 가면서 카드 사진은 `JOURNEY_CARD_MOOD`
  (기본 `calm`) 한 무드로 고정됩니다. 활동 전용 컷 3장을 따로 준비할지 회의 필요.
- **무드 판정 임계값 튜닝** — 부스 조명이 정해지면 `MOOD_ANALYSIS_CONFIG` 의 폴백 임계값과
  샘플 영역을 현장에서 한 번 맞춰야 합니다.

---

## 8/19 수정 내용 — AI 무드 분석 전환 + 플로우 순서 변경

제공된 OpenAI 키가 **Free Tier 라 이미지 생성(gpt-image / DALL·E)을 쓸 수 없습니다.**
그래서 "World 배경을 AI로 생성한다"는 방안을 폐기하고(배경은 이미 촬영본 36장으로 대체됨),
AI를 **"보고 판정하는"** 쪽 — 카메라로 의상을 읽어 무드를 정하는 쪽 — 으로 옮겼습니다.
Vision 입력은 일반 `chat.completions` 호출이라 Free Tier 에서도 제약 없이 동작합니다.

```
전:  제품 → 무드(수동 선택) → 활동 → 로딩 → 리빌 → 촬영 → 사진확인 → QR
후:  제품 → 활동 → 무드(AI 카메라 분석) → 로딩 → 리빌 → 촬영 → 사진확인 → QR
```

World 결정 규칙(`resolveWorld`)·조합 배경 파일명 규약·합성 파이프라인·백엔드 연동은
**전부 그대로**입니다. AI가 정한 무드가 기존 `MoodKey` 로 그대로 들어가기 때문에,
백엔드로 올라가는 `SessionMetadata` 도 바뀌지 않았습니다.

### 1. AI 무드 분석 (04 MOOD)

```
카메라 프리뷰(가이드 프레임)
  → [AI 무드 분석 시작] → 현재 프레임 캡처(768px JPEG)
  → POST /api/analyze-mood  (서버가 OpenAI Vision 호출)
  → 결과 카드(컬러 칩 + 무드 + 한 줄 코멘트) → [다음] → 05 프리로드
```

| 파일 | 역할 |
|---|---|
| `components/StepMood.tsx` | 3단계 화면 — `guide` → `analyzing` → `result` |
| `lib/moodAnalysis.ts` | 프레임 캡처, 서버 호출, **로컬 색 분석 폴백** |
| `app/api/analyze-mood/route.ts` | 서버 전용 OpenAI Vision 호출 (`detail: "low"`) — 현재 모델은 "8. AI 모델 선택" 절 참고 |
| `MOOD_ANALYSIS_CONFIG` | 캡처 크기 · 샘플 영역 · 폴백 임계값 |

무드 3종은 **기존 키와 라벨을 그대로** 씁니다 (배경 파일명·World 매핑이 이 값을 쓰므로).

| 무드 | 내부 키 | AI 토큰 | 파일명 토큰 | 의상 특성 |
|---|---|---|---|---|
| 설렘 | `light` | `EXCITEMENT` | `sul` | 고명도·고채도, 비비드·파스텔, 포인트 컬러 |
| 여유 | `calm` | `RELAXATION` | `calm` | 중명도 내추럴, 베이지·아이보리·카키, 코지한 룩 |
| 자신감 | `bold` | `CONFIDENCE` | `confidence` | 저명도 모노톤, 블랙·딥네이비·차콜, 미니멀 시크 |

> ⚠️ AI 토큰에 **`CALM` 을 쓰지 마세요.** 내부 키 `calm` 은 *여유*(RELAXATION)라서
> 이름이 겹치면 정반대로 매핑됩니다. 세 번째 무드는 화면 라벨이 "자신감"이므로
> `CONFIDENCE` 로 통일했고, 라우트는 이 세 토큰 외의 값이 오면 502를 돌려 폴백에 맡깁니다.

### 2. 실패하면 — 로컬 색 분석 폴백

키 미설정(503)·요청 한도(429)·오프라인·타임아웃 등 **어떤 실패에도 화면이 멈추지 않습니다.**
`analyzeMoodLocally()` 가 캡처 프레임의 상반신 영역 픽셀을 직접 읽어 평균 명도·채도로
같은 3종을 판정하고 그대로 진행합니다(난수 없음 — 같은 사진이면 항상 같은 결과).
여권(`lib/passport.ts`)이 쓰는 "실패해도 폴백으로 진행" 규약과 동일합니다.

부스 조명에 맞춰 `MOOD_ANALYSIS_CONFIG` 로 조정하세요.

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

### 3. 카메라 확보 시점이 05 → 04 로 앞당겨짐

무드 분석에 카메라가 필요하므로 권한 팝업이 04에서 뜹니다. 스트림은 여전히
`PortalRuntime` 이 소유하고 `acquireCamera()` 가 중복 호출을 dedupe 하므로,
**05 프리로드와 07 합성이 같은 스트림을 재사용**합니다(팝업은 체험당 한 번).

### 4. 활동 선택(03) — 화면은 그대로, 순서만 이동

카드 3장·라벨·리플 연출은 손대지 않았습니다. 다만 이 시점엔 무드가 아직 없어 조합 사진을
만들 수 없으므로, 미리보기 컷은 `JOURNEY_CARD_MOOD`(기본 `calm`)의 variant 1 으로 고정합니다.
실제 촬영 배경(variant 2)은 AI가 정한 무드를 그대로 따르므로 영향 없습니다.

### 5. 개인정보

분석용 프레임은 **저장하지 않습니다.** 판정을 위해 OpenAI 로 한 번 전송되고 메모리에서
버려지며, 백엔드(`/api/v1/sessions`)로 올라가는 사진은 07에서 찍은 합성 결과뿐입니다.
외부 전송이 일어나므로 01 START 동의 문구(`COPY.consentLabel`)에 "AI 스타일 분석"을
명시해 두었습니다 — 문구를 손볼 때 이 부분을 빼지 마세요.

### 6. 04 결과 화면 — 자동 진행 타이머

무드 분석 결과 카드는 `MOOD_ANALYSIS_CONFIG.resultAutoAdvanceMs`(기본 **6초**) 안에 [다음]을
누르면 그 클릭으로, 누르지 않으면 타이머로 05 프리로드에 자동 진입합니다. 손님이 결과만 보고
그냥 자리를 떠도 다음 손님을 위해 화면이 멈춰 있지 않게 하는 안전장치입니다.

두 경로 모두 같은 ripple(`"final"`) 전환을 타 연출이 동일합니다 — 자동 진행은 클릭 좌표가
없어 [다음] 버튼 중심에서 물결이 퍼지도록 만들었습니다.

| 파일 | 역할 |
|---|---|
| `components/StepMood.tsx` (`ResultScreen`) | 타이머 · 카운트다운 바 · 중복 전환 방지(`advancedRef`) |
| `app/globals.css` (`@keyframes mood-countdown`) | 카운트다운 바 애니메이션 — 길이는 인라인 `animation-duration` 으로 config 값과 동기화 |
| `MOOD_ANALYSIS_CONFIG.resultAutoAdvanceMs` | 자동 진행까지의 시간(ms). 코멘트를 길게 바꾸면 함께 늘리세요 |

### 7. 여권 카피에 오늘 착장 정보 연결

09 화면의 MCM TRAVEL PASSPORT 가 "여행 유형 / 추천 이유" 를 지을 때, 04에서 AI가 읽은
**오늘 입고 온 옷의 색·무드**(`state.moodAnalysis`)를 재료로 함께 넘깁니다. 같은 제품·같은
도시라도 손님마다 다른 문장이 나옵니다.

> 착장 O: "시크한 블랙과 부드러운 핑크의 조화" · 착장 X: "부드러운 핑크가 우아한 아침을 완성해"
> — 착장 없이는 제품·도시 조합에서만 나올 수 있는 일반적인 문장이었습니다.

| 파일 | 변경 |
|---|---|
| `lib/passport.ts` | `PassportInput` 에 `outfitColorName?` / `outfitDescription?` 추가 (선택값) |
| `app/api/passport/route.ts` | 프롬프트에 착장 재료 반영 지시 추가 + 길이(14~24자)·톤(마침표·종결어미 금지) 규칙 강화 + `normalizeReason()` 으로 마침표 후처리 |
| `components/StepMoment.tsx` | `state.moodAnalysis?.dominantColor.name` / `.description` 을 요청에 실어 보냄 |

값이 없으면(구버전 세션 등) 해당 줄 자체를 프롬프트에서 빼 빈 라벨이 남지 않습니다. 폴백 문구
(`buildFallbackPassport`)에는 반영하지 않습니다 — 폴백은 네트워크 없이 결정적으로 계산돼야 합니다.

### 8. AI 모델 선택 — 라우트별로 다른 모델을 씁니다

Tier 1로 올라간 뒤 계정 대시보드에 열린 모델 목록을 확인해 보니 **`gpt-4o-mini` 만 유일하게
일일 요청 한도(RPD)가 명시돼** 있고 나머지는 RPM 만 있었습니다(위 "Free Tier 일일 요청 한도"
절 참고). 이를 기준으로 두 라우트를 각각 다시 골랐습니다.

| 라우트 | 모델 | 이유 |
|---|---|---|
| `/api/analyze-mood` | **`gpt-5.6-luna`**, `reasoning_effort: "none"` | OpenAI가 "cost-sensitive, high-volume, latency-sensitive workloads" 용도로 설계한 모델 — 정확히 이 라우트(체험당 반드시 호출되는 3분류 작업)에 맞습니다. `none` 으로 내부 추론을 꺼서 응답이 빠릅니다(실측 1.8~3.1초, `reasoning_tokens: 0` 확인). RPD 상한 없음 |
| `/api/passport` | **`gpt-4o-mini`** (유지) | `gpt-4.1-mini` 로 교체해 봤으나 튜닝된 14~24자 길이 제약을 표본 2/2에서 상당한 마진(27자, 31자)으로 초과해 되돌렸습니다. 체험 완료 시 1회만 호출돼 호출량이 적어 RPD 위험이 낮습니다 |

> ⚠️ **`gpt-5.6-luna` 계열은 `max_tokens` 를 거부합니다** (`400 invalid_request_error:
> unsupported_parameter`). `max_completion_tokens` 로 이름이 바뀌었습니다 — `gpt-4o-mini`
> 시절 코드를 그대로 옮기면서 놓치기 쉬운 지점이라 `analyze-mood` 라우트에서 이미 고쳤습니다.
> 앞으로 모델을 또 바꿀 때는 이 파라미터부터 확인하세요.

**⚠️ 실행 전 확인 사항**

- `gpt-5.6-luna` 는 신규 모델이라 **일부 프로젝트/리전에서는 접근이 막혀 있을 수 있습니다.**
  접근이 없으면 `analyze-mood` 가 502 로 떨어지고 클라이언트가 조용히 로컬 색 분석 폴백으로
  넘어갑니다 — 화면은 안 죽지만 **AI 분석이 매번 로컬로만 돌게 됩니다.** 부스 오픈 전에
  실제 옷으로 한 번 테스트해서 `window.__portalEvents` 에 `mood_analyzed { source: "ai" }` 가
  찍히는지 확인하세요.
- 두 라우트가 서로 다른 모델을 쓰므로, 키를 발급한 OpenAI 프로젝트가 **`gpt-5.6-luna` 와
  `gpt-4o-mini` 둘 다** 접근 가능한지 확인이 필요합니다.
- `.env.local` 의 `OPENAI_API_KEY` 는 그대로 두면 됩니다 — 모델 이름은 라우트 코드의 상수라
  서버 재시작 없이 다음 요청부터 바로 적용됩니다(Next dev 서버가 route.ts 변경을 자동 반영).

### 9. 제품 사진·설명 교체 — Ottomar 비세토스 위켄더

위 "남은 작업"에 있던 목업 불일치 문제(핑크·베이지 사진이 실제 제품과 다름)가 해결됐습니다.
실제 제품 사진 2장을 받아 교체했습니다.

| 컬러웨이 | 사진 | 카드 표기 |
|---|---|---|
| pink | `public/products/Ottomar_Weeke_der_in_Visetos-pink.webp` | Soft Pink |
| beige | `public/products/Ottomar_Weeke_der_in_Visetos-beige.webp` | cognac |

`Product.name` 을 "Ottomar 비세토스 위켄더" 로, `Product.line` 은 빈 문자열로 바꿨습니다(이름에
이미 "비세토스"가 들어가 중복되므로). `components/StepProduct.tsx` 는 `line` 이 없으면 카드
하단의 `<br/>` 을 건너뛰도록 손봤습니다(빈 줄이 남지 않게). 기존
`stark_backpack_visetos-{pink,beige}.png` 는 코드·문서 어디에도 참조가 없어 삭제했습니다.

### 10. MCM 로고 실제 에셋 적용

01 START 의 엠블럼과 09 여권 헤더의 배지, 둘 다 검정 SVG 플레이스홀더였는데 실제 로고
(`public/ui/MCM_logo.png`, 투명 배경 검정 날개 마크)로 교체했습니다. 로드에 실패하면(파일
누락 등) 기존 SVG 로 자동 폴백합니다(다른 이미지 자산과 같은 패턴).

| 파일 | 위치 |
|---|---|
| `components/StepIntro.tsx` (`Emblem`) | 01 START, "MCM PORTAL" 제목 위 |
| `components/StepMoment.tsx` (`Emblem`) | 09 여권 카드 헤더 우측 |

### 변경/추가 파일 요약

| 파일 | 변경 |
|---|---|
| `lib/moodAnalysis.ts` | **신규** — 프레임 캡처 · 로컬 색 분석 폴백 · 서버 호출 |
| `app/api/analyze-mood/route.ts` | **신규** — 서버 전용 OpenAI Vision 무드 판정 (`gpt-5.6-luna`) |
| `components/StepMood.tsx` | 수동 선택 3버튼 → 카메라 촬영 + AI 분석 3단계 화면 + 결과 자동 진행 타이머 |
| `components/StepJourney.tsx` | 진행 점 03→02, 리플 `final`→`step`, 카드 컷 무드 고정 |
| `components/PortalApp.tsx` | 렌더 순서 journey → mood |
| `lib/FlowContext.tsx` | 전환 순서 변경, `ANSWER_MOOD` → `ANALYZE_MOOD`, `moodAnalysis` 상태 |
| `lib/types.ts` | `MoodAnalysis` / `MoodLevel` 타입, `StepId` 주석 재정렬 |
| `lib/analytics.ts` | `mood_selected` → `mood_analyzed { value, source }` |
| `lib/passport.ts` | `PassportInput` 에 `outfitColorName?` / `outfitDescription?` 추가 |
| `app/api/passport/route.ts` | 착장 반영 프롬프트 + 길이·톤 규칙 강화 + `normalizeReason()` (모델은 `gpt-4o-mini` 유지) |
| `components/StepMoment.tsx` | 여권 요청에 착장 정보 전달 + 로고 실사 적용 |
| `components/StepIntro.tsx` | 로고 실사 적용 |
| `components/StepProduct.tsx` | `product.line` 빈 값 처리(카드 하단 빈 줄 방지) |
| `config/products.config.ts` | 제품명·컬러웨이 라벨·사진 경로를 Ottomar 실사로 교체 |
| `app/globals.css` | `@keyframes mood-countdown` (결과 화면 자동 진행 바) |
| `config/portal.config.ts` | `MOOD_ANALYSIS_CONFIG`(+`resultAutoAdvanceMs`) · `JOURNEY_CARD_MOOD` · `moodLabel()` · 무드 화면 COPY · 동의 문구 |
| `public/products/Ottomar_Weeke_der_in_Visetos-{pink,beige}.webp` | **신규** — 실제 제품 사진 |
| `public/ui/MCM_logo.png` | **신규** — 실제 MCM 로고 |
| `public/products/stark_backpack_visetos-{pink,beige}.png` | **삭제** — 신규 사진으로 대체, 참조 없음 |
| `scripts/generate-images.mjs` | **삭제** — Free Tier 로 이미지 생성 불가 |
| `scripts/generate-worlds.mjs` | **삭제** — 위와 동일 |
