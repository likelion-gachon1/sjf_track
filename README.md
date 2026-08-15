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

### BGM 음원 (선택)

`public/bgm/{worldId}.mp3` 규약으로 넣어주세요 (예: `public/bgm/newyork_attitude.mp3`).
**파일이 없어도 앱은 정상 동작합니다** — 콘솔 경고만 남고 무음으로 진행되며 음소거
토글도 그대로 눌립니다.

### 개발 서버

```bash
npm run dev
```

`http://localhost:3000` 접속. 부스의 큰 가로 화면 기준 레이아웃이라 브라우저 창을 넓게
띄워서 보는 걸 권장합니다.

**카메라 권한은 5번 화면(PORTAL OPENING)에서** 요청합니다. 7번 합성 화면 진입 시
팝업이 뜨면 몰입이 깨지기 때문에 미리 확보합니다.

## 플로우 (8화면)

| # | 화면 | 파일 |
|---|---|---|
| 01 | START — 촬영 동의 + 시작 | `components/StepIntro.tsx` |
| 02 | PRODUCT (01/03) — 제품 컬러웨이 선택 | `components/StepProduct.tsx` |
| 03 | MOOD (02/03) — 분위기 선택 | `components/StepMood.tsx` |
| 04 | TRAVEL STYLE (03/03) — 여행 스타일 선택 | `components/StepJourney.tsx` |
| 05 | PORTAL OPENING — 연출 + 프리로드(카메라·MediaPipe·배경) | `components/StepOpening.tsx` |
| 06 | WORLD REVEAL — 결과 World 공개, BGM 페이드인 | `components/StepReveal.tsx` |
| 07 | EXPERIENCE — 실시간 합성 + 촬영 | `components/StepMirror.tsx` + `MirrorStage.tsx` |
| — | QR HANDOFF — QR + 사진 저장 | `components/StepHandoff.tsx` |

상태는 `lib/FlowContext.tsx` 의 `useReducer` 로 관리되며 라우팅 없이 한 페이지에서
전환됩니다. 화면 전환 책임은 리듀서에 있고, 각 전환은 예상한 단계에서만 일어나므로
같은 액션이 두 번 들어와도 단계가 건너뛰어지지 않습니다.

## 우리가 수정할 파일

거의 모든 카피/데이터는 [`config/portal.config.ts`](config/portal.config.ts) 하나에 모여 있습니다.

- `COPY` — 화면에 보이는 모든 문구 (`\n` 은 줄바꿈으로 렌더링됩니다)
- `MOOD_QUESTION` / `JOURNEY_QUESTION` — 03·04 화면의 질문과 선택지
- `WORLDS` — World 목록 (표기명, 내부 축, gradient, 배경 이미지, BGM 경로)
- `ACTIVE_WORLD_IDS` — **이번 체험에서 실제로 쓰는 World 목록 (임시값, 회의 확정 대기)**
- `MOOD_TO_TIME` / `JOURNEY_TO_SCENE` — 선택값 → 내부 축 우선순위
- `CAMERA_CONFIG` / `SEGMENTATION_CONFIG` / `RIPPLE_CONFIG` / `BGM_CONFIG` — 파라미터
- `WORLD_ALTERNATES` — "다른 세계도 보기" 안건용 (현재 화면에서는 미사용)

제품 데이터는 [`config/products.config.ts`](config/products.config.ts) 에 있습니다
(`PRODUCTS`). `colorway.hex` 는 02 카드 외에 06 CTA 테두리와 QR 화면 포인트 색으로도
쓰입니다(07 합성 화면에는 적용하지 않습니다).

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

> `reason` 문장("차분하고 분위기 있게 · 쇼핑·문화 즐기기 — NEW YORK, 해 질 무렵")은
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

## KPI 이벤트

`lib/analytics.ts` 의 `track()` 이 단계별로 호출됩니다. 아직 전송은 하지 않고
`console.info("[portal] ...")` + `window.__portalEvents` 버퍼에만 남깁니다.
와이어프레임 KPI 4종 중 QR 노출·사진 저장은 이미 호출 지점이 있고, 관심 제품 저장·제품
상세 확인은 모바일 화면에서 붙일 예정입니다(타입만 정의됨).

## 다음 단계 / 알려진 한계

- **모바일 4화면 + 서버 라우트·DB 미구현.** QR은 `/m/{sessionId}` 를 인코딩하지만
  해당 라우트는 아직 없습니다 (임시). 운영 도메인은 `NEXT_PUBLIC_PORTAL_HOST` 로 주입.
- **인물 경계가 움직임에 따라 살짝 흔들려 배경이 비칩니다.** 프레임마다 마스크를 새로
  추정하는 방식의 구조적 한계이며, 부스 제작 시 **그린 스크린 크로마키로 교체 예정**
  입니다(위 "다음 단계: 그린 스크린 크로마키"). 그때까지 촬영은 어깨에 멘 구도 +
  움직임을 줄인 포즈가 가장 안정적입니다.
- SelfieSegmentation은 **인물 전용 모델**이라 손에 든 가방·가는 스트랩은 배경으로
  잘릴 수 있습니다. 이 역시 크로마키 전환으로 함께 해결됩니다.
- World 배경은 아직 gradient입니다. 실사 배경이 없어도 시간대는 구분되도록
  팔레트를 잡아뒀지만(아래 참고), **도시 고유의 장소감**은 실사 배경
  (`WORLDS[].backgroundImage`)이 들어와야 살아납니다.
- BGM 음원 미확보 — 재생 경로만 검증 가능합니다.
- 대화형 AI 음성 컨시어지는 이번 범위에서 제외됐습니다 (취향 입력은 버튼 선택).

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

### 3. World·UI 실사 배경 AI 생성 파이프라인

`WORLDS[].backgroundImage` 자리에 넣을 실사 배경을 OpenAI 이미지 모델(`gpt-image-2`)로
일괄 생성하는 스크립트를 추가했습니다.

- **`scripts/generate-images.mjs`** — 의존성 없이(내장 fetch) 실행. World 배경 + UI 이미지를
  한 번에 생성해 `public/` 아래 알맞은 경로(`worlds/`, `ui/`)로 저장합니다.

  ```bash
  export OPENAI_API_KEY="sk-..."
  node scripts/generate-images.mjs                 # 전체 생성
  node scripts/generate-images.mjs intro-window    # 특정 이미지 1개만
  ```

  각 프롬프트에 "인물·텍스트 없음 + (배경은) 아래-가운데 비우기 + 시간대 팔레트"를
  명시해 07 합성 배경으로 바로 쓸 수 있게 했습니다.
- `config/portal.config.ts` 의 활성 4개 World(`newyork_attitude`, `paris_dawn`,
  `milano_terrace`, `seoul_neon`)에 `backgroundImage: "/worlds/{id}.webp"` 경로를 켰습니다.
  파일이 없으면 기존대로 gradient 로 폴백하므로 지금 켜둬도 안전합니다.

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
| `scripts/generate-images.mjs` | **신규** — 배경/UI 이미지 일괄 생성(gpt-image-2) |
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
