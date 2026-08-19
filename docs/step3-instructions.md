# MCM PORTAL — Step 3 작업 지침 (와이어프레임 화면 재구성 + MediaPipe 실시간 합성)

## Context

현재 저장소는 Step 2까지 구현된 상태입니다. 5단계 플로우(인트로 → 취향 질문 2개 → World 결과 → 미러 → 결과)에
웹캠 raw 영상만 표시되고, 배경 합성·제품 데이터·QR은 없습니다.

기획/디자인 파트의 와이어프레임이 플로우를 **8화면**으로 확정했고, 이후 1차 피드백이 반영된
「PORTAL 선택 플로우 수정안」이 나왔습니다. 선택 플로우(제품 → 분위기 → 여행 스타일 → PORTAL이 World 제안)는
와이어프레임과 동일하게 확정됐고, 수정안에서 새로 들어온 요구는 네 가지입니다.

1. **"예측되지 않지만 납득되는" World 결정** — 결과가 랜덤처럼 느껴져선 안 되고, 선택이 반영됐다고 납득돼야 함
2. **시간대·공간 성격 축 도입** — 사용자는 장소·시간대를 직접 고르지 않고, 무드/여행 스타일이 내부 축으로 작동
3. **World별 BGM 자동 재생**
4. **선택 시 Ripple 전환 인터랙션**

이번 작업의 목표:

- **와이어프레임대로 화면을 재구성**한다 (01 START ~ 07 EXPERIENCE + QR HANDOFF)
- **MediaPipe 실시간 세그멘테이션 합성**을 붙여 "인물·제품은 그대로, 주변 공간만 바뀌는" 핵심 경험을 완성한다
- 위 수정안 4개 요구를 반영한다

### 이번 작업에서 제외 (범위 밖 — 건드리지 말 것)

| 항목 | 사유 |
|---|---|
| 대화형 AI 음성 컨시어지 (Agora/LLM) | 마감 일정상 제외. 취향 입력은 버튼 선택으로 확정 |
| 06 리빌 화면의 "왜 이 World인지" 문구 노출 | 와이어프레임 06에 자리가 없음. **`reason` 문장은 데이터로만 생성해두고 화면에는 렌더링하지 말 것.** 노출 위치는 회의 후 결정 |
| 미러 화면의 "다른 세계도 보기" 썸네일 | 회의 안건. 화면에서 렌더링하지 않되 **관련 상태/설정 코드는 삭제하지 말고 남길 것** |
| 서버 라우트 / DB / 모바일 `/m/[sessionId]` 4화면 | 다음 단계. QR은 임시 URL을 인코딩하는 목업까지만 |
| 캡처 이미지 서버 업로드 | 메모리 보관 + 브라우저 다운로드로 처리 |
| World 개수·목록 최종 확정 | 회의 안건. 아래 임시값으로 넣되 **설정 파일만 고치면 바뀌도록** 구성 |
| World 실사 배경 이미지 | 추후 LLM으로 제작. 지금은 이미지 슬롯만 만들고 gradient 폴백 |
| BGM 오디오 에셋 | 음원 미확보. 재생 로직·UI는 구현하되 파일이 없어도 조용히 동작해야 함 |

> **이전 지침에서 번복된 항목**: 07 화면의 스피커 아이콘은 "회의 전까지 넣지 말 것"이었으나,
> BGM 실제 재생이 이번 범위에 포함되면서 **음소거 토글로 구현합니다.**

---

## 1. 플로우 및 상태 재정의

### 1-1. `lib/types.ts`

```ts
export type StepId =
  | "intro"      // 01 START
  | "product"    // 02 PRODUCT       (01/03)
  | "journey"    // 03 TRAVEL STYLE  (02/03)
  | "mood"       // 04 MOOD          (03/03) — AI 무드 분석으로 대체됨(1-4 참고)
  | "opening"    // 05 PORTAL OPENING (프리로드 구간)
  | "reveal"     // 06 WORLD REVEAL
  | "experience" // 07 EXPERIENCE
  | "moment"     // 09 YOUR MCM MOMENT (촬영 사진 확인) — 이후 단계에서 추가됨
  | "handoff";   // 08 QR HANDOFF
```

- `MoodKey` 를 `"light" | "calm" | "bold"` 로 **교체** (기존 4종 폐기)
- `JourneyKey = "explore" | "culture" | "relax"` **신설**
- `ColorKey` **삭제**, 대신 `ColorwayKey = "pink" | "beige"` 신설
- **World 결정 축 신설** (수정안 3절 "각 선택값의 역할" 표를 데이터로 구현)
  ```ts
  export type TimeOfDay = "day" | "golden" | "night";   // 분위기가 반영되는 축
  export type SceneType = "street" | "culture" | "leisure"; // 여행 스타일이 반영되는 축
  ```
- `Answers` → `{ mood: MoodKey | null; journey: JourneyKey | null }`
- `QuestionDef["id"]` 유니온을 `"mood" | "journey"` 로 변경
- `Product` / `Colorway` 인터페이스 신설
  ```ts
  export interface Colorway {
    key: ColorwayKey;
    label: string;        // "PINK"
    hex: string;          // 이미지 없을 때 플레이스홀더 + World 포인트 컬러
    image?: string;       // /products/*.png (없으면 hex 플레이스홀더)
    storeUrl?: string;
  }
  export interface Product {
    id: string;
    name: string;         // "Stark Backpack"
    line: string;         // "in Visetos"
    colorways: Colorway[];
  }
  ```
- `WorldDef` 확장 — **World는 (도시 × 시간대 × 공간 성격) 으로 정의됩니다**
  ```ts
  export interface WorldDef {
    id: WorldId;
    displayName: string;      // 06 리빌의 대문자 표기 — "NEW YORK"
    name: string;             // 한글 표기 — "뉴욕 애티튜드"
    tagline: string;
    timeOfDay: TimeOfDay;     // 신설
    sceneType: SceneType;     // 신설
    gradient: string;
    backgroundImage?: string; // /worlds/*.webp — 없으면 gradient 폴백
    bgm?: string;             // /bgm/{worldId}.mp3 — 없으면 무음
    textOn: "light" | "dark";
  }
  ```

  > ⚠️ **이후 변경됨:** `bgm` 필드는 삭제되고 `BGM_CONFIG.src` 하나로 체험 전체가 한 곡을
  > 공유하는 방식으로 바뀌었습니다. `gradientAngle?: number` / `gradientStops: GradientStop[]`
  > (07 캔버스 합성용)도 추가됐습니다. 현재 정의는 `lib/types.ts` 의 `WorldDef` 를 보세요.
- `SavedMoment` 에 `imageDataUrl: string` 추가

### 1-2. `lib/FlowContext.tsx`

`FlowState` 를 다음으로 확장:

```ts
{
  step: StepId;
  consent: boolean;
  sessionId: string;                 // crypto.randomUUID(), START 시 발급
  productId: string | null;
  colorwayKey: ColorwayKey | null;
  answers: { mood, journey };
  selectedWorldId: WorldId | null;
  capturedAt: number | null;
  capturedImage: string | null;      // dataURL (JPEG)
  bgmMuted: boolean;                 // 07 음소거 토글
  productInterestSaved: boolean;
  savedMoments: SavedMoment[];
}
```

액션 재정의 — **화면 전환 책임을 리듀서가 갖는 현재 방식을 유지**합니다:

| 액션 | 전환 |
|---|---|
| `SET_CONSENT` | — |
| `START` | consent 없으면 무시, `intro → product`, `sessionId` 발급 |
| `SELECT_PRODUCT { productId, colorwayKey }` | `product → journey` |
| `ANSWER_JOURNEY { value }` | `journey → mood` (수정안: 선택과 동시에 이동) |
| `ANSWER_MOOD { value }` | `mood → journey` — **이후 폐기.** 04 무드는 버튼 선택이 아니라 AI 판정으로 바뀌어 `ANALYZE_MOOD { result }` (`mood → opening`)로 대체됨 |
| `RESOLVE_WORLD { worldId }` | `opening → reveal`. 05 프리로드 완료 시 dispatch |
| `ENTER_PORTAL` | `reveal → experience` |
| `CAPTURE { dataUrl }` | `experience → moment` — **이후 변경.** 09 MOMENT(사진 확인) 화면이 추가되며 `handoff` 대신 `moment` 로 전환 |
| `SHOW_QR` | `moment → handoff` — 이후 추가된 액션 |
| `TOGGLE_BGM_MUTE` | — |
| `SAVE_PRODUCT_INTEREST` | — **이후 폐기.** 관심 제품 저장은 모바일(`/m/{sessionId}/shop`)로 이동해 부스 리듀서 액션이 아니게 됨 |
| `SET_SESSION_SHARE { url, expiresAt }` | — 이후 추가된 액션. 백엔드 업로드 응답(`shareUrl`/`expiresAt`)을 저장 |
| `RESET` | `savedMoments` 만 유지하고 나머지 초기화 (현재 동작 유지) |

`CHANGE_WORLD` 액션은 **삭제하지 말고 그대로 남길 것** (회의 결과에 따라 되살림). 사용처가 없어도 됩니다.

> ⚠️ **이후 변경됨:** 위 표는 이번 작업(Step 3) 시점 기준입니다. 현재 액션·전환 로직은
> `lib/FlowContext.tsx` 의 `flowReducer` 를 보세요 (`moodAnalysis`/`shareUrl`/`expiresAt` 필드,
> `ANALYZE_MOOD`/`SHOW_QR`/`SET_SESSION_SHARE` 액션이 이후 추가됐습니다).

---

## 2. 설정 파일

### 2-1. `config/products.config.ts` (신규)

와이어프레임 02는 **동일 제품의 두 컬러웨이**를 카드 2장으로 보여줍니다.

```ts
export const PRODUCTS: Product[] = [
  {
    id: "stark_backpack_visetos",
    name: "Stark Backpack",
    line: "in Visetos",
    colorways: [
      { key: "pink",  label: "PINK",  hex: "#e3c9d3" },
      { key: "beige", label: "BEIGE", hex: "#c9b79c" },
    ],
  },
];

// 02 화면이 렌더링할 (제품 × 컬러웨이) 평탄화 목록
export const PRODUCT_CHOICES = PRODUCTS.flatMap((p) =>
  p.colorways.map((c) => ({ product: p, colorway: c }))
);
```

`image`가 없으면 `hex` 기반 단색 플레이스홀더 박스를 그리세요 (제품 사진 에셋은 아직 없음).

> ⚠️ **이후 변경됨:** 두 번째 컬러웨이 키는 `black` 이 아니라 `beige` 로 확정됐습니다
> (컬러웨이 톤 보정 로직도 `beige`+어두운 World 기준입니다 — 2-3절 참고). 실제 제품 데이터는
> 이름·가격·`storeUrl` 이 채워진 상태로 `config/products.config.ts` 에 있습니다.

**제품의 포인트 컬러 역할** — 수정안 3절에 따라 `colorway.hex` 를 02 카드 외에
**06 리빌의 CTA 버튼 테두리**와 **QR 화면의 포인트 색**에 사용하세요.
07 합성 화면에는 적용하지 마세요 (합성 품질에 영향).

### 2-2. `config/portal.config.ts`

**COPY 전면 교체** — 와이어프레임/수정안 문구를 그대로 사용:

- `introTagline`: `"MCM과 함께\n새로운 World로 떠나보세요."`
- `introSubline`: `"당신의 선택으로 시작되는 MCM EXPERIENCE"`
- `consentLabel`: `"촬영 이미지 활용에 동의합니다."`
- `startButton`: `"시작하기"`
- `productHeading`: `"어떤 MCM과 함께 떠날까요?"` / `productSubline`: `"원하는 제품을 선택해주세요."`
- `moodHeading`: `"이번 여행은 어떤 느낌이었으면 좋겠나요?"` / `moodSubline`: `"원하는 분위기를 선택해주세요."`
  (⚠️ 이후 04 무드는 버튼 선택이 아니라 AI 촬영 판정으로 바뀌면서 문구도
  `"오늘의 스타일을 보여주세요."` 로 교체됐습니다 — `config/portal.config.ts` 의 `COPY` 참고)
- `journeyHeading`: `"여행지에서 가장 하고 싶은 건?"` / `journeySubline`: `"원하는 여행 스타일을 선택해주세요."`
- `journeyFootnote`: `"선택과 동시에 다음 단계로 이동합니다."`
- `openingMessage`: `"당신에게 어울리는\nWorld를 찾고 있습니다."`
- `revealEyebrow`: `"YOUR MCM WORLD"` / `revealCta`: `"PORTAL 입장하기"`
- `captureButton`: `"촬영하기"`
- `handoffHeading`: `"체험이 완료되었습니다."`
- `handoffCaption`: `"촬영한 사진을 저장하거나\n관심 제품을 저장하려면\nQR을 스캔해 주세요."`
- `downloadButton`: `"사진 저장하기"` / `restartButton`: `"처음으로"`
- 기존 카메라 관련 문구(`camera*`)는 전부 유지, `segmentationLoading: "World를 준비하고 있습니다..."` 추가

**질문 정의 교체** (`COLOR_QUESTION` 삭제):

```ts
export const MOOD_QUESTION: QuestionDef<MoodKey> = {
  id: "mood",
  prompt: COPY.moodHeading,
  options: [
    { key: "light", label: "가볍고\n생기 있게" },
    { key: "calm",  label: "차분하고\n분위기 있게" },
    { key: "bold",  label: "강렬하고\n화려하게" },
  ],
};

export const JOURNEY_QUESTION: QuestionDef<JourneyKey> = {
  id: "journey",
  prompt: COPY.journeyHeading,
  options: [
    { key: "explore", label: "도시 곳곳\n둘러보기" },
    { key: "culture", label: "쇼핑·문화\n즐기기" },
    { key: "relax",   label: "여유롭게\n쉬기" },
  ],
};
```

> ⚠️ **이후 변경됨:** `MOOD_QUESTION` 은 더 이상 버튼으로 렌더링되지 않습니다 — 무드는
> 04에서 AI가 촬영 의상을 보고 판정합니다. `key`(`light`/`calm`/`bold`)는 그대로 쓰이지만
> `label` 은 결과 화면·여권 카피 라벨용으로 `"EXCITEMENT"`/`"RELAXATION"`/`"CONFIDENCE"` 로
> 바뀌었습니다. `JOURNEY_QUESTION` 은 그대로 버튼 선택입니다. 현재 값은
> `config/portal.config.ts` 참고.

**World 정의** — 기존 8개에 `displayName` / `timeOfDay` / `sceneType` / `bgm` 을 채우고,
활성 목록만 분리합니다 (회의 후 이 배열만 교체):

```ts
// ⚠️ 임시값 — 회의에서 확정 예정
export const ACTIVE_WORLD_IDS: WorldId[] = [
  "newyork_attitude", "paris_dawn", "milano_terrace", "seoul_neon",
];
```

축 배정(임시):

| id | displayName | timeOfDay | sceneType |
|---|---|---|---|
| `newyork_attitude` | NEW YORK | night | street |
| `paris_dawn` | PARIS | day | culture |
| `milano_terrace` | MILANO | golden | leisure |
| `seoul_neon` | SEOUL | night | culture |

`backgroundImage` 는 전부 미지정(gradient 폴백), `bgm` 은 `/bgm/{id}.mp3` 로 채워둡니다(파일은 없어도 됨).

> ⚠️ **이후 변경됨:** `monaco_night` / `tokyo_mirage` / `ibiza_sunset` / `santorini_breeze`
> 4개는 회의에서 채택되지 않아 **`WorldId` 타입에서 삭제됐습니다** — 현재 `WorldId` 는
> 위 4개뿐입니다. 위 4개의 축 배정(timeOfDay/sceneType)은 지금도 그대로 유효합니다.
> `bgm` 필드는 폐기되고 `BGM_CONFIG.src` 한 곡 공유 방식으로, `backgroundImage` 는 조합별
> 실사 배경(`comboBackgroundImage()`)이 채워졌습니다. 현재 값은 `config/portal.config.ts` 의
> `WORLDS` 참고.

### 2-3. World 결정 로직 — **하드코딩 테이블을 쓰지 마세요**

수정안의 핵심 요구는 *"예측되지 않지만 납득되는"* 결과입니다. 조합 18개를 손으로 배정하면
회의에서 World 목록이 바뀔 때마다 테이블을 다시 짜야 하고, 배정 근거도 남지 않습니다.
**속성 매칭 기반의 결정적(deterministic) 함수**로 구현하세요.

```ts
// 1:1 고정이 아니라 "우선순위 배열" — 수정안에서 명시한 요구
export const MOOD_TO_TIME: Record<MoodKey, TimeOfDay[]> = {
  light: ["day", "golden"],
  calm:  ["golden", "day"],
  bold:  ["night", "golden"],
};

export const JOURNEY_TO_SCENE: Record<JourneyKey, SceneType[]> = {
  explore: ["street", "culture"],
  culture: ["culture", "street"],
  relax:   ["leisure", "culture"],
};
```

`resolveWorld(colorway, mood, journey): WorldId` 를 구현하되, 아래 규칙을 그대로 따르세요.

1. `ACTIVE_WORLD_IDS` 의 World 각각에 점수를 매긴다
   - `timeOfDay` 가 `MOOD_TO_TIME[mood][0]` 이면 **+3**, `[1]` 이면 **+1**, 아니면 0
   - `sceneType` 이 `JOURNEY_TO_SCENE[journey][0]` 이면 **+3**, `[1]` 이면 **+1**, 아니면 0
   - 컬러웨이 보정: `beige` + `textOn === "light"`(어두운 World) 이면 **+1**,
     `pink` + `textOn === "dark"`(밝은 World) 이면 **+1**
2. 최고점을 반환한다
3. **동점이면 `ACTIVE_WORLD_IDS` 배열 순서상 앞선 것** — 난수를 쓰지 말 것.
   같은 선택은 항상 같은 결과가 나와야 합니다 ("랜덤처럼 느껴져선 안 된다"는 요구의 기술적 조건)

`reason` 문장 생성기도 함께 만드세요. **화면에는 렌더링하지 않습니다** (범위 밖 — 데이터만 준비).

```ts
export const TIME_LABEL: Record<TimeOfDay, string> = {
  day: "한낮", golden: "해 질 무렵", night: "밤",
};
export function buildWorldReason(mood, journey, world): string;
```

템플릿 예: `"차분하고 분위기 있게 · 쇼핑·문화 즐기기 — NEW YORK, 해 질 무렵"`
한국어 조사(이/가, 을/를)는 라벨에 따라 틀어지므로 **조사 없는 나열형 템플릿**을 쓰세요.

**회의용 확인 유틸**을 함께 만드세요. 18조합(제품 2 × 무드 3 × 여행 3)의 결과를 전수 출력합니다.

```ts
export function debugMappingTable(): Array<{
  colorway: ColorwayKey; mood: MoodKey; journey: JourneyKey;
  worldId: WorldId; displayName: string; reason: string;
}>;
```

개발 모드에서 `window.__portalMappingTable = debugMappingTable` 로 노출해
콘솔에서 `console.table(window.__portalMappingTable())` 로 확인할 수 있게 하세요.
**회의에서 매핑이 납득 가능한지 검토할 자료로 씁니다.**

기존 `WORLD_MAPPING` / `getWorldMapping()` 은 **삭제**하고 `resolveWorld()` 로 대체합니다.
`WORLD_ALTERNATES` / `getAlternateWorlds()` 는 **삭제하지 말 것** (회의 대기).

### 2-4. 나머지 설정

```ts
export const SEGMENTATION_CONFIG = {
  modelSelection: 1,          // landscape 모델
  featherPx: 2,               // 마스크 가장자리 blur (0이면 비활성)
  assetBasePath: "/mediapipe/selfie_segmentation",
} as const;

export const RIPPLE_CONFIG = {
  stepMs: 420,        // 02→03, 03→04 중간 전환
  finalMs: 700,       // 04→05 화면 전체를 덮는 전환
  color: "#faf8f5",   // 05 배경(paper)과 동일해야 자연스럽게 이어짐
} as const;

export const BGM_CONFIG = {
  volume: 0.5,
  fadeInMs: 1200,
  fadeOutMs: 600,
} as const;
```

`CAMERA_CONFIG` 는 그대로 유지합니다 (`mirror: true` 포함).

> ⚠️ **이후 변경됨:** `RIPPLE_CONFIG.finalMs` 는 삭제됐습니다 — 03(TRAVEL STYLE)이 04(MOOD, AI
> 촬영 화면)로 바뀌며 "화면을 덮는 최종 전환"이 없어졌고, ripple 은 이제 02→03·03→04
> 두 곳 모두 `stepMs`(현재 1800ms) 하나만 씁니다. `BGM_CONFIG` 에는 `src`(공유 음원 경로)가
> 추가됐습니다. 현재 값은 `config/portal.config.ts` 참고.

---

## 3. MediaPipe 합성 — 이번 작업의 핵심

### 3-1. 패키지 설치 및 **에셋 자가 호스팅** (필수)

```bash
npm install @mediapipe/selfie_segmentation qrcode && npm install -D @types/qrcode
```

`@mediapipe/selfie_segmentation` 은 기본적으로 jsdelivr CDN에서 wasm/모델을 받아옵니다.
**매장 네트워크가 불안정하면 미러 화면이 통째로 뜨지 않습니다.**

- `node_modules/@mediapipe/selfie_segmentation/` 안의 에셋 파일 전체를
  `public/mediapipe/selfie_segmentation/` 으로 복사할 것
  (`*.wasm`, `*_wasm_bin.js`, `*.binarypb`, `*.tflite` 등 — `package.json`/`*.d.ts` 제외)
- 인스턴스 생성 시 `locateFile: (file) => \`${SEGMENTATION_CONFIG.assetBasePath}/${file}\``
- 복사를 자동화할 필요는 없습니다. 다만 `README.md` 에 이 절차를 문서화할 것

TypeScript: 패키지가 제공하는 타입을 우선 사용하고, 타입이 없거나 부족하면
`types/mediapipe.d.ts` 에 최소 선언을 추가하세요. **`any` 사용 금지.**

```ts
interface SegmentationResults {
  image: CanvasImageSource;
  segmentationMask: CanvasImageSource;
}
```

### 3-2. `lib/composite.ts` (신규) — 배경 그리기를 한 곳에 모을 것

> 캔버스를 투명하게 두고 CSS가 배경을 깔면, 캡처 시 배경을 JS로 다시 그려야 해서
> **배경 그리는 코드가 두 벌이 됩니다.** cover 스케일·크롭이 조금만 어긋나도
> "화면에서 본 것과 저장된 사진이 다른" 문제가 나고, 실사 이미지로 바뀌면 거의 확실히 틀어집니다.
> → **캔버스가 배경까지 전부 그리도록** 하고, 캡처는 그 캔버스를 그대로 `toDataURL` 합니다.
> 오프스크린 병합 로직 자체가 사라지고, 화면 = 캡처 결과가 구조적으로 보장됩니다.

내보낼 함수:

- `drawWorldBackground(ctx, world, width, height)`
  - `world.backgroundImage` 가 있고 로드 성공이면 **cover 방식**으로 그림
  - 없거나 실패하면 `world.gradient` 를 `createLinearGradient` 로 재현
    (CSS 문자열 파싱이 번거로우면 `WorldDef` 에 `gradientStops: {offset, color}[]` 를 추가해
    정확히 재현할 것 — 파싱보다 이 편이 안전합니다)
- `drawPersonLayer(personCtx, results, width, height)` — 아래 3-3 참조
- `captureFrame(canvas): string` — `canvas.toDataURL("image/jpeg", 0.9)`

### 3-3. `lib/useSegmentation.ts` (신규)

`SelfieSegmentation` 인스턴스 생성/워밍업/해제를 캡슐화합니다.
**05 화면에서 미리 만들고 07에서 재사용**해야 하므로, 인스턴스는 `PortalRuntime`(4절)이 보관합니다.

프레임 처리 순서 — **`copy`/`source-in` 은 반드시 별도 오프스크린 캔버스에서 수행**하세요.
메인 캔버스에서 `copy` 를 쓰면 방금 그린 배경이 지워집니다.

```
onResults(results):
  1. person 오프스크린 캔버스(화면과 동일 해상도)를 준비
  2. personCtx.globalCompositeOperation = "copy"
     personCtx.filter = `blur(${featherPx}px)`      // 가장자리 페더
     personCtx.drawImage(results.segmentationMask, 0, 0, w, h)
     personCtx.filter = "none"
  3. personCtx.globalCompositeOperation = "source-in"
     personCtx.drawImage(results.image, 0, 0, w, h)
  4. 메인 캔버스:
     ctx.clearRect(0, 0, w, h)
     drawWorldBackground(ctx, world, w, h)          // 배경 — 반전하지 않음
     ctx.save()
     if (CAMERA_CONFIG.mirror) { ctx.translate(w, 0); ctx.scale(-1, 1); }
     ctx.drawImage(personCanvas, 0, 0, w, h)        // 인물만 좌우 반전
     ctx.restore()
```

**좌우 반전 주의** — 현재 `MirrorStage.tsx:27-30` 은 video 를 그릴 때 반전합니다.
합성으로 바꾸면 **마스크와 원본 두 장이 같은 변환을 받아야** 하고, 한쪽만 반전되면
인물이 통째로 사라집니다. 위 순서대로 **인물 레이어를 합성한 뒤 한 번만** 반전하면
이 문제가 원천적으로 없어지고, 배경(도시 풍경·간판)은 뒤집히지 않습니다.
반전을 다른 곳(CSS 등)에 중복으로 걸지 마세요.

RAF 루프와 정리:

```
if (video.currentTime !== lastTimeRef.current) {
  lastTimeRef.current = video.currentTime;
  await segmenter.send({ image: video });
}
rafRef.current = requestAnimationFrame(loop);
```

- 언마운트 시 `cancelAnimationFrame` 호출
- `disposedRef` 플래그를 먼저 세워 in-flight `send()` 를 막은 뒤 `segmenter.close()` 호출
  (닫힌 인스턴스에 send 하면 예외가 납니다)
- 개발 모드 StrictMode 이중 마운트에 대비해 ref 가드로 중복 생성을 막을 것

---

## 4. `lib/PortalRuntime.tsx` (신규) — 프리로드·오디오의 보관소

05에서 확보한 카메라 스트림·MediaPipe 인스턴스를 07까지, 06에서 시작한 BGM을 QR까지 살려 보내려면
컴포넌트 생명주기 밖에 보관할 곳이 필요합니다. `PortalApp` 레벨에 컨텍스트를 하나 둡니다.

제공할 API:

- `acquireCamera(): Promise<MediaStream>` — 이미 있으면 그대로 반환 (중복 `getUserMedia` 방지)
- `getSegmenter(): Promise<SelfieSegmentation>` — 생성 + 에셋 로드 + 더미 프레임 1회로 워밍업
- `preloadWorldImage(world): Promise<HTMLImageElement | null>` — `decode()` 까지, 실패 시 null
- `unlockAudio(): void` — 5절 참조. **01 START 클릭 핸들러에서 호출**
- `playBgm(src: string): void` / `stopBgm(): void` / `setBgmMuted(muted: boolean): void`
- `releaseAll()` — 스트림 stop + segmenter close + BGM 정지. `RESET` 시 호출

기존 `lib/useCamera.ts` 는 **삭제하지 말고**, 자체적으로 `getUserMedia` 를 호출하는 대신
`PortalRuntime.acquireCamera()` 를 사용하도록 리팩터링하세요. 에러 분류 로직
(`toErrorMessage`, `useCamera.ts:99-116`)과 기기 목록 조회는 그대로 재사용합니다.

---

## 5. BGM (신규)

### 5-1. 자동재생 차단을 먼저 해결해야 합니다

브라우저는 **사용자 제스처 없이 시작된 오디오 재생을 차단**합니다. 06 리빌에서 그냥 `play()` 하면
`NotAllowedError` 로 실패합니다. 우리 플로우에는 01 START 버튼 클릭이 있으므로, **그 제스처 컨텍스트에서
오디오를 한 번 언락**해두면 이후 프로그래매틱 재생이 허용됩니다.

`PortalRuntime.unlockAudio()` 구현:

1. `HTMLAudioElement` 를 하나 만들어 ref 에 보관 (`loop = true`, `volume = 0`)
2. START 클릭 시 `audio.play()` → 성공하면 즉시 `audio.pause()` 
3. 실패해도 조용히 넘어감 (`.catch(() => {})`)

**이 호출은 01 START의 클릭 핸들러 안에서 동기적으로 일어나야 합니다.**
`await` 뒤나 `setTimeout` 안에서 호출하면 제스처 컨텍스트를 잃어 다시 차단됩니다.

### 5-2. 재생 시나리오

| 시점 | 동작 |
|---|---|
| 01 START 클릭 | `unlockAudio()` |
| 06 진입 | `playBgm(world.bgm)` — 볼륨 0 → `BGM_CONFIG.volume` 로 `fadeInMs` 동안 페이드인 |
| 07 | 계속 재생. 음소거 토글로 on/off |
| QR 화면 진입 | `fadeOutMs` 동안 페이드아웃 후 정지 |
| `RESET` | 즉시 정지 |

- 음원 교체 시 이전 트랙을 페이드아웃 후 교체
- **에셋이 없어도 앱이 멈추면 안 됩니다.** `world.bgm` 이 없거나 404면 `console.warn` 만 남기고
  UI는 정상 동작해야 합니다 (음소거 토글도 눌리되 아무 일도 안 일어남)
- 파일명 규약: `public/bgm/{worldId}.mp3`. `README.md` 에 규약을 문서화하고,
  `public/bgm/.gitkeep` 을 만들어 디렉터리를 커밋하세요

### 5-3. 음소거 토글 (07 우상단)

- 인라인 SVG 스피커 아이콘 2종(on / muted)을 직접 그릴 것 — 아이콘 패키지 추가 금지
- 클릭 시 `TOGGLE_BGM_MUTE` dispatch + `runtime.setBgmMuted()`
- 07 화면의 유일한 추가 UI입니다. 그 외에는 와이어프레임대로 최소 구성을 유지하세요

---

## 6. Ripple 전환 (신규)

### 6-1. 구현 가능성

**어렵지 않습니다.** `transform` 과 `opacity` 만 애니메이션하면 브라우저 컴포지터에서 처리되어
레이아웃 리플로우가 없고, 부스 PC에서도 60fps가 무난합니다. 필요한 계산은 클릭 좌표와
"화면을 덮는 최소 반지름" 하나뿐입니다.

### 6-2. `components/RippleTransition.tsx` + `lib/useRipple.ts` (신규)

```
1. 선택지 버튼의 onClick 에서 e.clientX / e.clientY 를 캡처
2. 목표 반지름 R = 클릭점에서 뷰포트 네 모서리까지 거리의 최댓값
     R = max(√(x²+y²), √((W-x)²+y²), √(x²+(H-y)²), √((W-x)²+(H-y)²))
3. position: fixed 오버레이에 원형 div 를 렌더
     left: x, top: y, width/height: 2R
     transform: translate(-50%, -50%) scale(0)
     background: RIPPLE_CONFIG.color
     will-change: transform, opacity
     pointer-events: none  (단, 전환 중 하위 클릭은 6-4 참조)
4. 다음 프레임에 scale(1) 로 트랜지션
```

- `left/top/width/height` 는 **애니메이션하지 말 것.** `scale` 만 움직여야 컴포지터에 올라갑니다
- `requestAnimationFrame` 한 번 건너뛴 뒤 클래스를 붙여야 트랜지션이 실제로 발생합니다
  (초기 스타일과 목표 스타일이 같은 프레임에 적용되면 애니메이션이 생략됨)

### 6-3. 단계별 동작

| 전환 | 동작 |
|---|---|
| 02 → 03, 03 → 04 | ripple이 `stepMs` 동안 퍼지며 opacity가 1 → 0. 애니메이션 종료 시 dispatch |
| **04 → 05** | ripple이 `finalMs` 동안 퍼져 **화면을 완전히 덮은 상태(opacity 1)를 유지**한 채 dispatch → 05가 ripple 뒤에서 마운트됨. 그 후 ripple을 페이드아웃 |

마지막 전환의 ripple 색을 `RIPPLE_CONFIG.color`(= paper `#faf8f5`, 05 배경과 동일)로 두면
ripple이 걷힐 때 05 로딩 화면으로 **이음매 없이** 이어집니다. 수정안의
"Ripple이 화면 전체를 덮으며 PORTAL Opening 화면으로 자연스럽게 전환" 요구가 이 방식으로 충족됩니다.

### 6-4. 주의사항

- **`FadeStep` 과 겹치지 않게 할 것.** 현재 `PortalApp` 은 모든 step을 `FadeStep`(fadeIn)으로 감쌉니다.
  ripple로 전환되는 05에 fadeIn이 같이 걸리면 화면이 두 번 움직입니다.
  `FadeStep` 에 `disabled?: boolean` prop을 추가해 05에서는 끄세요
- **전환 중 중복 클릭 차단** — ripple 진행 중에는 선택지 버튼을 `disabled` 또는
  `pointer-events: none` 으로 막으세요. 두 번 클릭하면 step이 건너뛰어집니다
- **`prefers-reduced-motion: reduce`** 인 경우 ripple을 생략하고 즉시 dispatch 하세요
- 02(PRODUCT) 선택에도 동일하게 적용합니다 — 세 선택 화면 모두 같은 훅을 씁니다

---

## 7. 화면 구현

기존 파일 처리:

| 파일 | 처리 |
|---|---|
| `components/StepIntro.tsx` | 문구/레이아웃 수정 + `unlockAudio()` 호출 추가 |
| `components/StepGuided.tsx` | **삭제** → `StepMood` + `StepJourney` 로 대체 |
| `components/StepWorldResult.tsx` | **삭제** → `StepReveal` 로 대체 |
| `components/StepMirror.tsx` | 07 EXPERIENCE 로 전면 개편 |
| `components/StepResult.tsx` | **삭제** → `StepHandoff` 로 대체 |
| `components/MirrorStage.tsx` | 합성 파이프라인 탑재 + 전체화면화 |
| `components/GradientCard.tsx` | `backgroundImage` 가 있으면 우선 사용하도록 확장 (없으면 gradient) |
| `components/PortalApp.tsx` | 8개 step 라우팅, `PortalRuntimeProvider` 로 감쌈, `FadeStep` 예외 처리 |
| `components/FadeStep.tsx` | `disabled` prop 추가 |

**아이콘은 전부 인라인 SVG로 작성하세요. 아이콘 패키지를 새로 추가하지 마세요.**

### 01 START — `StepIntro.tsx`
현재 구조 유지. 상·하단에 작은 `MCM` 워드마크, 문구를 COPY로 교체, `시작하기 →` 버튼.
동의 체크 전에는 버튼 비활성 (현재 동작 유지).
**클릭 핸들러에서 `runtime.unlockAudio()` 를 동기적으로 호출** (5-1 참조).

### 02 PRODUCT — `StepProduct.tsx` (신규)
- 우상단 `01 / 03`
- 헤딩 + 서브라인, 카드 2장 가로 배치
- 카드: 제품 이미지 영역(`image` 없으면 `colorway.hex` 단색 박스) + `PINK` + `Stark Backpack in Visetos`
- 클릭 → ripple(`stepMs`) → `SELECT_PRODUCT`

### 03 MOOD — `StepMood.tsx` (신규)
- 우상단 `02 / 03`
- 상단에 추상 비주얼: **CSS radial-gradient + blur 로 목업** (에셋 없음)
- 하단 3버튼 (인라인 SVG 아이콘 + 2줄 라벨)
- 클릭 → ripple(`stepMs`) → `ANSWER_MOOD`
- **낮/노을/밤을 화면에 드러내지 마세요.** 시간대는 내부 축일 뿐입니다 (수정안 명시)

### 04 TRAVEL STYLE — `StepJourney.tsx` (신규)
- 우상단 `03 / 03`
- 3개 카드 (표지판 / 쇼핑백 / 선베드 아이콘 + 2줄 라벨)
- 하단에 `journeyFootnote`
- 클릭 → **ripple(`finalMs`, 화면 전체를 덮음)** → `ANSWER_JOURNEY`

### 05 PORTAL OPENING — `StepOpening.tsx` (신규) ★
연출 화면이자 **프리로드 구간**입니다. 마운트 시 아래 3개를 **병렬로** 실행:

1. `runtime.getSegmenter()` — MediaPipe 로드 + 워밍업
2. `runtime.preloadWorldImage(world)` — 배경 이미지 decode
3. `runtime.acquireCamera()` — **여기서 카메라 권한 팝업을 띄움** (07 진입 시 팝업이 뜨면 몰입이 깨짐)

동시에 `resolveWorld(colorwayKey, mood, journey)` 로 World를 결정합니다.
`Promise.allSettled([...preloads])` 와 **최소 표시 시간 1800ms** 를 `Promise.all` 로 묶고,
완료되면 `RESOLVE_WORLD` 를 dispatch 합니다.
**개별 실패는 진행을 막지 않습니다** — 카메라 실패는 07의 에러 UI가, 이미지 실패는 gradient 폴백이 처리합니다.

UI: 흰 배경, 점선 원형 로더(CSS 애니메이션), `openingMessage`, 점 3개.
`FadeStep` 은 비활성화 (ripple이 전환을 담당).

### 06 WORLD REVEAL — `StepReveal.tsx` (신규)
- 배경 풀블리드 (프리로드된 이미지, 없으면 gradient)
- 중앙: `YOUR MCM WORLD` (작게) / `world.displayName` (크게, serif)
- 하단: `PORTAL 입장하기 →` — 테두리에 `colorway.hex` 포인트
- 진입 시 `runtime.playBgm(world.bgm)` (페이드인)
- **이유 문구·대안 World 카드 없음** (와이어프레임 확정 / 범위 밖)

### 07 EXPERIENCE — `StepMirror.tsx` + `MirrorStage.tsx`
- `MirrorStage` 를 **전체화면 캔버스**로. 부모의 CSS 배경에 의존하지 않습니다(3-2 참조)
- `bg-ink` 를 캔버스 래퍼에서 제거하되, **로딩/에러 오버레이에는 `bg-black/60 backdrop-blur` 를 유지**하세요.
  투명 배경 위 흰 글씨는 밝은 World에서 읽히지 않습니다
- `isSegmenting` 상태 추가. 05에서 이미 워밍업했으므로 실제로는 거의 보이지 않아야 정상입니다
- 좌상단: `MCM PORTAL — {world.displayName}` 작은 흰 텍스트
- 우상단: **음소거 토글** (5-3)
- 하단 중앙: 원형 촬영 버튼 + `촬영하기` 라벨
- **그 외 UI 없음** — World 썸네일 없음
- 촬영: `captureFrame(canvas)` → `CAPTURE { dataUrl }`
- 카메라 다중 기기 선택 드롭다운(`MirrorStage.tsx:84-99`)은 **개발 편의상 유지**하되,
  `process.env.NODE_ENV === "development"` 일 때만 렌더링

### QR HANDOFF — `StepHandoff.tsx` (신규)
- 체크 아이콘(인라인 SVG) + `handoffHeading`
- QR: `qrcode` 로 dataURL 생성. 인코딩 대상은
  `${process.env.NEXT_PUBLIC_PORTAL_HOST ?? window.location.origin}/m/${state.sessionId}`
  → **임시 URL입니다. 해당 라우트는 아직 없습니다** (주석으로 명시)
- `handoffCaption`
- `사진 저장하기` 버튼 — `capturedImage` 를 `<a download>` 로 다운로드
- `처음으로` 버튼 — `RESET` + `runtime.releaseAll()`
- 진입 시 BGM 페이드아웃
- 갤러리 섹션은 **렌더링하지 않습니다** (와이어프레임에 없음). `savedMoments` 상태는 유지하세요

---

## 8. `lib/analytics.ts` (신규) — KPI 이벤트 훅

와이어프레임에 명시된 KPI 4종(QR 스캔율 / 사진 저장 / 관심 제품 저장 / 제품 상세 확인)을
나중에 측정할 수 있도록, 지금 **타입 안전한 이벤트 훅만** 심어둡니다.
전송은 하지 않고 `console.info` + 메모리 버퍼로 충분합니다.

```ts
export type PortalEvent =
  | { name: "experience_started" }
  | { name: "product_selected"; productId: string; colorwayKey: ColorwayKey }
  | { name: "mood_selected"; value: MoodKey }
  | { name: "journey_selected"; value: JourneyKey }
  | { name: "world_resolved"; worldId: WorldId; mood: MoodKey; journey: JourneyKey }
  | { name: "portal_entered"; worldId: WorldId }
  | { name: "photo_captured"; worldId: WorldId }
  | { name: "bgm_muted"; muted: boolean }
  | { name: "qr_displayed"; sessionId: string }        // KPI: QR 스캔율 분모
  | { name: "photo_download_clicked" }                  // KPI: 사진 저장
  | { name: "session_reset" };

export function track(event: PortalEvent): void;
```

- 내부에서 `sessionId` 와 `timestamp` 를 자동 부착
- `console.info("[portal]", ...)` + `window.__portalEvents` 배열에 push (개발 확인용)
- `world_resolved` 에 mood/journey를 함께 실어두면 **어떤 조합이 어떤 World로 갔는지 로그로 검증**할 수 있습니다
- 모바일 쪽 KPI(관심 제품 저장 / 제품 상세 확인)는 이벤트 타입만 정의해두고 호출은 다음 단계

---

## 9. 검증

```bash
npm run dev
```

`http://localhost:3000` 을 넓은 창으로 열고 아래를 순서대로 확인하세요.

1. **플로우 관통** — 01 → 02 → 03 → 04 → 05 → 06 → 07 → QR 이 끊기지 않고 진행되는가.
   02~04 우상단 진행 표시가 `01/03`, `02/03`, `03/03` 로 나오는가
2. **Ripple** — 클릭한 **지점에서** 원이 퍼지는가(화면 중앙 고정이 아님).
   04 선택 시 ripple이 화면을 완전히 덮은 뒤 05가 나타나는가.
   전환 중 두 번 클릭해도 step이 건너뛰어지지 않는가.
   OS 설정에서 "동작 줄이기"를 켜면 ripple이 생략되는가
3. **매핑 납득성** — 콘솔에서 `console.table(window.__portalMappingTable())` 을 실행해
   18조합 결과가 **납득 가능하고 한 World로 쏠리지 않는지** 확인.
   같은 선택을 반복했을 때 **항상 같은 World**가 나오는가 (난수 사용 여부 검증)
4. **권한 타이밍** — 카메라 권한 팝업이 **05에서** 뜨는가. 07 진입 시 지연 없이 바로 영상이 보이는가
5. **BGM** — 06 진입 시 재생이 시도되는가. 콘솔에 `NotAllowedError`(자동재생 차단)가 **없는지**.
   음원 파일이 없는 상태에서도 화면이 정상 동작하는가. 07 음소거 토글이 먹는가.
   QR 진입 시 페이드아웃되는가
6. **합성 품질** — 07에서 인물이 분리되고 뒤에 World 배경이 보이는가.
   가장자리가 칼로 자른 듯하지 않고 부드러운가 (`featherPx` 조절해 확인)
7. **반전 검증** — 인물은 셀피처럼 좌우 반전, **배경은 반전되지 않았는가**
8. **캡처 일치 (가장 중요)** — 촬영 후 다운로드한 JPG가 촬영 직전 화면과 **완전히 동일한가**.
   배경 위치·크롭·반전이 하나라도 어긋나면 3-2/3-3 구현이 잘못된 것입니다
9. **CDN 요청 0건** — DevTools Network 탭에서 `jsdelivr`/`cdn` 요청이 없고
   mediapipe 에셋이 전부 `localhost` 에서 오는가
10. **스트림 정리** — `처음으로` 를 눌렀을 때 카메라 LED가 꺼지고 BGM이 멈추는가. 재시작 시 정상 동작하는가
11. **이벤트 로그** — 콘솔에 `[portal]` 접두어 이벤트가 단계별로 찍히는가
12. **타입 검사**

```bash
npx tsc --noEmit
```

### 알려진 한계 (오늘 고치지 않음)

- SelfieSegmentation은 **인물 전용 모델**이라 손에 든 가방·가는 스트랩은 배경으로 잘릴 수 있습니다.
  어깨에 멘 구도가 훨씬 안정적입니다. 실제 제품으로 촬영 테스트가 필요하며,
  결과에 따라 크로마키 백업안을 별도로 검토합니다
- World 배경이 아직 gradient라 합성 결과가 실사만큼 설득력 있지 않고,
  `timeOfDay`(한낮/해 질 무렵/밤) 축이 시각적으로 드러나지 않습니다.
  실사 배경이 들어오기 전까지는 매핑 로그로만 검증하세요
- BGM 음원이 없어 재생 경로만 검증 가능합니다
- QR 링크는 임시입니다 (모바일 라우트 미구현)
