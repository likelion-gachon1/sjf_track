// MCM PORTAL — 편집용 설정 파일.
// 카피, World 목록, 질문/선택지, 파라미터 등을 이 파일에 모아뒀습니다.
// 제품 데이터만 config/products.config.ts 에 분리돼 있습니다.

import { PRODUCTS } from "@/config/products.config";
import type {
  Answers,
  ColorwayKey,
  JourneyKey,
  MattingMode,
  MoodKey,
  QuestionDef,
  SceneType,
  TimeOfDay,
  WorldDef,
  WorldId,
} from "@/lib/types";

// --- 1. 브랜드 카피 ---
export const COPY = {
  brandName: "MCM PORTAL",
  wordmark: "MCM",

  // 01 START
  introTagline: "MCM과 함께\n새로운 World로 떠나보세요.",
  introSubline: "당신의 선택으로 시작되는\nMCM EXPERIENCE",
  // ⚠️ 04 무드 분석은 촬영한 프레임을 AI(OpenAI)로 **전송**합니다. 저장은 하지 않지만
  //    외부 전송이 일어나므로 동의 문구에 반드시 남겨두세요.
  consentLabel: "체험을 위한 촬영·AI 스타일 분석 및 일시 보관에 동의합니다.",
  startButton: "시작하기",

  // 02 PRODUCT
  productHeading: "어떤 MCM과 함께 할까요?",
  productSubline: "원하는 제품을 선택해주세요.",

  // 03 TRAVEL STYLE
  journeyHeading: "여행지에서 가장 하고 싶은 건?",
  journeySubline: "원하는 여행 스타일을 선택해주세요.",
  journeyFootnote: "선택과 동시에 다음 단계로 이동합니다.",

  // 04 MOOD — 카메라로 의상을 찍어 AI가 무드를 판정하는 화면
  moodHeading: "오늘의 스타일을 보여주세요.",
  moodSubline: "AI가 의상의 색과 톤을 읽어 어울리는 무드를 찾아드려요.",
  moodGuide: "상의가 가이드 영역 안에 오도록 서주세요.",
  moodScanButton: "AI 무드 분석 시작",
  moodAnalyzing: "분석하고 있어요...",
  /** 카메라를 끝내 못 켰을 때 — 손님을 세워두지 않고 폴백 결과로 진행하는 출구. */
  moodCameraSkip: "이대로 진행하기",

  // 05 PORTAL OPENING 의 문구는 단계별 지속 시간과 한 몸이라 이 표가 아니라
  // 아래 OPENING_STAGES 에 있습니다.

  // 06 WORLD REVEAL
  revealEyebrow: "Your MCM world is…",
  revealCta: "PORTAL 입장하기",

  // 07 EXPERIENCE
  captureButton: "촬영하기",
  bgmOnLabel: "배경음악 켜짐",
  bgmMutedLabel: "배경음악 음소거",

  // 09 YOUR MCM MOMENT (촬영 사진 확인)
  momentEyebrow: "YOUR MCM MOMENT",
  momentCaption: "당신의 MCM 순간이 완성되었습니다.",
  momentNext: "다음",

  // 09 MCM TRAVEL PASSPORT (촬영 사진 옆 여권 — 여행 유형/추천 이유는 AI 실시간 생성)
  passportTitle: "MCM TRAVEL PASSPORT",
  passportDeparture: "출발지",
  passportArrival: "도착지",
  passportShotAt: "촬영 일시",
  passportCompanion: "동행 제품",
  passportReasonLabel: "추천 이유",
  passportLoading: "여권 발급 중...",
  passportConcierge: "AI CONCIERGE",

  // 업로드 상태 (09 화면) — 실패해도 흐름은 막지 않고 재시도만 제공합니다.
  uploadInProgress: "사진을 저장하는 중...",
  uploadRetry: "다시 시도",
  uploadTimeout: "서버 응답이 늦어요. 연결을 확인해 주세요.",
  uploadOffline: "네트워크에 연결되지 않았어요.",
  uploadTooLarge: "사진 용량이 너무 커요.",
  uploadServerError: "저장에 실패했어요. 잠시 후 다시 시도해 주세요.",

  // QR HANDOFF
  handoffHeading: "체험이 완료되었습니다.",
  handoffCaption: "촬영한 사진을 저장하려면\nQR을 스캔해 주세요.",
  downloadButton: "사진 저장하기",
  restartButton: "처음으로",
  /** `{expiry}` 자리에 만료 시각이 들어갑니다. */
  handoffExpiry: "이 QR은 {expiry}까지 유효합니다.",

  // 카메라 / 합성 상태 문구
  cameraLoading: "카메라 준비 중...",
  cameraPermissionDenied: "카메라 접근이 필요합니다. 브라우저 권한을 확인해주세요.",
  cameraNotFound: "연결된 카메라를 찾을 수 없습니다.",
  cameraInUse: "카메라를 사용할 수 없습니다. 다른 프로그램이 사용 중인지 확인해주세요.",
  cameraUnsupported: "이 브라우저는 카메라를 지원하지 않습니다.",
  cameraGenericError: "카메라를 시작하지 못했습니다.",
  cameraRetryButton: "다시 시도",
  cameraDeviceLabel: "카메라 선택",
  segmentationLoading: "World를 준비하고 있습니다...",
  segmentationError: "World를 준비하지 못했습니다. 다시 시도해주세요.",
} as const;

// --- 1-1. 05 PORTAL OPENING 단계별 문구 + 지속 시간 ---
// ms 합계 = 화면의 최소 표시 시간. 단계를 더하거나 빼면 진행 점이 자동 조정됩니다.
export const OPENING_STAGES = [
  { ms: 3_000, message: "AI가 고객님의 무드를\n분석하고 있어요" },
  { ms: 3_000, message: "고객님의 World로\n데려다 드릴게요" },
] as const;

/** OPENING_STAGES 를 다 보여주는 데 걸리는 시간 = 05 화면의 최소 표시 시간. */
export const OPENING_TOTAL_MS = OPENING_STAGES.reduce((sum, s) => sum + s.ms, 0);

// --- 2. 취향 입력 ---

/** 무드 3종. AI가 판정 — 버튼 렌더링 없음. key 는 바꾸지 마세요. */
export const MOOD_QUESTION: QuestionDef<MoodKey> = {
  id: "mood",
  prompt: COPY.moodHeading,
  options: [
    { key: "light", label: "EXCITEMENT", description: "새로운 순간을 기대하는 설렘" },
    { key: "calm", label: "RELAXATION", description: "천천히 즐기고 싶은 여유" },
    { key: "bold", label: "CONFIDENCE", description: "나답게 뽐내고 싶은 자신감" },
  ],
};

export const JOURNEY_QUESTION: QuestionDef<JourneyKey> = {
  id: "journey",
  prompt: COPY.journeyHeading,
  options: [
    { key: "explore", label: "도시 곳곳\n둘러보기" },
    { key: "culture", label: "쇼핑·문화\n즐기기" },
    { key: "relax", label: "여유롭게\n쉬기" },
  ],
};

/** 무드 키 → 표기 라벨 ("light" → "EXCITEMENT"). 매핑 검증 로그에 씁니다. */
export function moodLabel(mood: MoodKey): string {
  return MOOD_QUESTION.options.find((o) => o.key === mood)?.label ?? "";
}

// --- 3. World 목록 ---
// ⚠️ gradient 와 gradientStops 는 같은 값으로 유지. textOn 을 바꾸면 매핑 결과가 달라집니다.
export const WORLDS: Record<WorldId, WorldDef> = {
  paris_dawn: {
    id: "paris_dawn",
    displayName: "PARIS",
    name: "파리의 새벽",
    tagline: "안개 낀 새벽빛, 첫 만남의 설렘",
    timeOfDay: "day",
    sceneType: "culture",
    gradient:
      "linear-gradient(180deg, #c9dcef 0%, #e4ecf3 40%, #f4efe6 72%, #e6d9c8 100%)",
    gradientAngle: 180,
    gradientStops: [
      { offset: 0, color: "#c9dcef" },
      { offset: 0.4, color: "#e4ecf3" },
      { offset: 0.72, color: "#f4efe6" },
      { offset: 1, color: "#e6d9c8" },
    ],
    textOn: "dark",
  },

  newyork_attitude: {
    id: "newyork_attitude",
    displayName: "NEW YORK",
    name: "뉴욕 애티튜드",
    tagline: "도시의 밤, 강렬하게 존재하는 나",
    timeOfDay: "night",
    sceneType: "street",
    gradient:
      "linear-gradient(180deg, #090c12 0%, #182130 42%, #33262a 74%, #7d2a23 100%)",
    gradientAngle: 180,
    gradientStops: [
      { offset: 0, color: "#090c12" },
      { offset: 0.42, color: "#182130" },
      { offset: 0.74, color: "#33262a" },
      { offset: 1, color: "#7d2a23" },
    ],
    textOn: "light",
  },

  milano_terrace: {
    id: "milano_terrace",
    displayName: "MILANO",
    name: "밀라노 테라스",
    tagline: "나른한 오후 햇살, 우아한 여유",
    timeOfDay: "golden",
    sceneType: "leisure",
    gradient:
      "linear-gradient(180deg, #ffd79b 0%, #f8bd76 34%, #e79f61 68%, #c67a50 100%)",
    gradientAngle: 180,
    gradientStops: [
      { offset: 0, color: "#ffd79b" },
      { offset: 0.34, color: "#f8bd76" },
      { offset: 0.68, color: "#e79f61" },
      { offset: 1, color: "#c67a50" },
    ],
    textOn: "dark",
  },
  seoul_neon: {
    id: "seoul_neon",
    displayName: "SEOUL",
    name: "서울 네온",
    tagline: "빠르게 뛰는 심장, 도시의 빛",
    timeOfDay: "night",
    sceneType: "culture",
    gradient:
      "linear-gradient(180deg, #0a0615 0%, #221345 44%, #55206f 76%, #9d2a68 100%)",
    gradientAngle: 180,
    gradientStops: [
      { offset: 0, color: "#0a0615" },
      { offset: 0.44, color: "#221345" },
      { offset: 0.76, color: "#55206f" },
      { offset: 1, color: "#9d2a68" },
    ],
    textOn: "light",
  },

};

/**
 * 이번 체험에서 실제로 사용할 World 목록 — 4종으로 확정.
 *
 * **이 배열만 바꾸면** 결과 분포가 바뀝니다 (resolveWorld 가 하드코딩 테이블이 아니라
 * 속성 매칭으로 동작하기 때문). 배열 순서는 동점 시 우선순위로도 쓰이므로, 앞쪽에 둘
 * World가 더 자주 나옵니다.
 */
export const ACTIVE_WORLD_IDS: WorldId[] = [
  "newyork_attitude",
  "paris_dawn",
  "milano_terrace",
  "seoul_neon",
];

// -----------------------------------------------------------------------------
// 4. World 결정 규칙
//
//    "예측되지 않지만 납득되는" 결과를 위해 조합별 하드코딩 테이블을 쓰지 않고,
//    선택값을 내부 축으로 번역해 **속성 매칭 점수**로 World를 고릅니다.
//    같은 선택은 항상 같은 결과가 나옵니다 (난수 없음).
//
//    1:1 고정이 아니라 우선순위 배열입니다. [0]번이 1순위, [1]번이 2순위.
// -----------------------------------------------------------------------------
export const MOOD_TO_TIME: Record<MoodKey, TimeOfDay[]> = {
  light: ["day", "golden"],
  calm: ["golden", "day"],
  bold: ["night", "golden"],
};

export const JOURNEY_TO_SCENE: Record<JourneyKey, SceneType[]> = {
  explore: ["street", "culture"],
  culture: ["culture", "street"],
  relax: ["leisure", "culture"],
};

/** 1순위 축이 맞을 때 / 2순위 축이 맞을 때 / 컬러웨이 톤이 맞을 때의 가점. */
const PRIMARY_MATCH = 3;
const SECONDARY_MATCH = 1;
const COLORWAY_MATCH = 1;

function axisScore<T extends string>(value: T, priority: T[]): number {
  if (value === priority[0]) return PRIMARY_MATCH;
  if (value === priority[1]) return SECONDARY_MATCH;
  return 0;
}

/** 베이지는 어두운 World(textOn: light), 핑크는 밝은 World(textOn: dark)와 어울립니다. */
function colorwayScore(colorway: ColorwayKey, world: WorldDef): number {
  if (colorway === "beige" && world.textOn === "light") return COLORWAY_MATCH;
  if (colorway === "pink" && world.textOn === "dark") return COLORWAY_MATCH;
  return 0;
}

export function scoreWorld(
  colorway: ColorwayKey,
  mood: MoodKey,
  journey: JourneyKey,
  world: WorldDef
): number {
  return (
    axisScore(world.timeOfDay, MOOD_TO_TIME[mood]) +
    axisScore(world.sceneType, JOURNEY_TO_SCENE[journey]) +
    colorwayScore(colorway, world)
  );
}

/**
 * (컬러웨이, 분위기, 여행 스타일) → World.
 *
 * 최고점 World를 반환하고, **동점이면 ACTIVE_WORLD_IDS 배열 순서상 앞선 것**을
 * 고릅니다(`>` 비교라 뒤에 오는 동점자는 교체하지 않음). 난수를 쓰지 않으므로
 * 같은 선택은 항상 같은 World가 나옵니다.
 */
export function resolveWorld(
  colorway: ColorwayKey,
  mood: MoodKey,
  journey: JourneyKey
): WorldId {
  let bestId: WorldId = ACTIVE_WORLD_IDS[0];
  let bestScore = -1;

  for (const id of ACTIVE_WORLD_IDS) {
    const score = scoreWorld(colorway, mood, journey, WORLDS[id]);
    if (score > bestScore) {
      bestScore = score;
      bestId = id;
    }
  }

  return bestId;
}

export const TIME_LABEL: Record<TimeOfDay, string> = {
  day: "한낮",
  golden: "해 질 무렵",
  night: "밤",
};

function flatLabel(label: string): string {
  return label.replace(/\n/g, " ");
}

/** "왜 이 World인지" 문장 (로그/검증용, 화면 미노출). */
export function buildWorldReason(
  mood: MoodKey,
  journey: JourneyKey,
  world: WorldDef
): string {
  const journeyLabel =
    JOURNEY_QUESTION.options.find((o) => o.key === journey)?.label ?? "";

  return `${flatLabel(moodLabel(mood))} · ${flatLabel(journeyLabel)} — ${world.displayName}, ${
    TIME_LABEL[world.timeOfDay]
  }`;
}

export interface MappingTableRow {
  colorway: ColorwayKey;
  mood: MoodKey;
  journey: JourneyKey;
  worldId: WorldId;
  displayName: string;
  reason: string;
}

/**
 * 회의용 확인 유틸 — 전체 조합(컬러웨이 × 무드 × 여행 스타일)의 결과를 전수 출력합니다.
 * 개발 모드에서 브라우저 콘솔에 다음과 같이 확인할 수 있습니다.
 *
 *   console.table(window.__portalMappingTable())
 */
export function debugMappingTable(): MappingTableRow[] {
  const colorways = PRODUCTS.flatMap((p) => p.colorways.map((c) => c.key));
  const uniqueColorways = Array.from(new Set(colorways));
  const rows: MappingTableRow[] = [];

  for (const colorway of uniqueColorways) {
    for (const mood of MOOD_QUESTION.options) {
      for (const journey of JOURNEY_QUESTION.options) {
        const worldId = resolveWorld(colorway, mood.key, journey.key);
        const world = WORLDS[worldId];
        rows.push({
          colorway,
          mood: mood.key,
          journey: journey.key,
          worldId,
          displayName: world.displayName,
          reason: buildWorldReason(mood.key, journey.key, world),
        });
      }
    }
  }

  return rows;
}

// --- 조합 전용 실사 배경 ---
// comboBackgroundImage() → public/worlds/{색}/  (07 촬영 합성)
// journeyCardImage()     → public/place/         (03 카드 미리보기, 컬러웨이 통합)

// 내부 키 → 파일명 토큰.
const MOOD_IMG_TOKEN: Record<MoodKey, string> = {
  light: "sul",
  calm: "calm",
  bold: "confidence",
};

const JOURNEY_IMG_TOKEN: Record<JourneyKey, string> = {
  explore: "city",
  culture: "shop",
  relax: "relax",
};

/** 07 촬영 합성 배경 경로 — /worlds/{색}/{색}_{무드}_{여정}2.png */
export function comboBackgroundImage(
  colorway: ColorwayKey | null,
  answers: Answers,
  variant: 1 | 2 = 2
): string | undefined {
  const { mood, journey } = answers;
  if (!colorway || !mood || !journey) return undefined;
  return `/worlds/${colorway}/${colorway}_${MOOD_IMG_TOKEN[mood]}_${JOURNEY_IMG_TOKEN[journey]}${variant}.png`;
}

// ⚠️ relax 의 파일명이 무드 토큰과 같은 "calm" 이지만 여기선 여정을 가리킵니다.
const JOURNEY_PLACE_TOKEN: Record<JourneyKey, string> = {
  explore: "city",
  culture: "shop",
  relax: "calm",
};

/** 03 활동 선택 카드 미리보기 경로 — /place/{여정토큰}.png (컬러웨이 무관, 통합 이미지) */
export function journeyCardImage(journey: JourneyKey): string {
  return `/place/${JOURNEY_PLACE_TOKEN[journey]}.png`;
}

/**
 * 화면에 실제로 쓸 World. 조합 전용 배경이 있으면 `backgroundImage` 를 덮어씁니다.
 *
 * ⚠️ 07 촬영 합성과 05 프리로드가 이 함수를 쓰며 **variant 2**(기본값)를 씁니다.
 *    06 리빌 화면은 이 함수를 쓰지 않고 비행기 창문 배경(/ui/bg1.jpg)을 씁니다.
 */
export function applyComboBackground(
  world: WorldDef,
  colorway: ColorwayKey | null,
  answers: Answers,
  variant: 1 | 2 = 2
): WorldDef {
  const image = comboBackgroundImage(colorway, answers, variant);
  return image ? { ...world, backgroundImage: image } : world;
}



// -----------------------------------------------------------------------------
// 6. 카메라 설정 — 07 화면에서 웹캠을 켤 때 쓰는 값.
//    width/height: 요청 해상도 (부스 PC 성능에 맞춰 낮추면 더 부드럽게 동작).
//    mirror: 좌우 반전 여부. 셀피처럼 보이도록 기본 true 권장.
//            (반전은 합성된 인물 레이어에만 한 번 적용됩니다 — 배경은 반전 안 됨)
// -----------------------------------------------------------------------------
export const CAMERA_CONFIG = {
  width: 1280,
  height: 720,
  mirror: true,
} as const;

// -----------------------------------------------------------------------------
// 6-1. AI 무드 분석 설정 — 04 화면에서 의상을 찍어 무드를 판정할 때 쓰는 값.
//
//    captureWidth : OpenAI 로 보낼 이미지의 가로 폭. 카메라 원본(1280)을 그대로
//                   보내면 전송량·토큰만 커지므로 줄여서 보냅니다.
//    sampleRegion : **로컬 폴백**이 색을 재는 상반신 박스(프레임 대비 비율).
//                   얼굴·머리카락·뒷배경이 섞이면 판정이 흐려지므로 가운데 아래쪽만 봅니다.
//                   가이드 프레임 오버레이도 같은 값을 써서 화면과 계산이 어긋나지 않습니다.
//    임계값       : 로컬 폴백의 분류 기준. 부스 조명이 어두워 전부 "자신감"으로 나오면
//                   boldMaxLum 을 낮추고, 조명이 세서 전부 "설렘"으로 나오면
//                   lightMinLum 을 올리세요. (AI 응답이 성공하면 이 값들은 쓰이지 않습니다)
//
//    ⚠️ 밝기는 HSL 의 L 이 아니라 **눈이 느끼는 밝기(BT.601 luminance)**, 채도는 HSL 의 S 가
//       아니라 **순색도(chroma = delta/max)** 기준입니다. HSL 을 쓰면 비비드 색의 L 이 0.5 로
//       눌리고 베이지의 S 가 부풀려져 판정이 뒤집힙니다 (lib/moodAnalysis.ts 주석 참고).
// -----------------------------------------------------------------------------
export const MOOD_ANALYSIS_CONFIG = {
  captureWidth: 768,
  jpegQuality: 0.8,
  /** x/y/w/h — 0~1 비율. 기본값은 화면 가운데 아래쪽(상의가 오는 자리). */
  sampleRegion: { x: 0.3, y: 0.45, w: 0.4, h: 0.45 },
  /** 이 아래로 어두우면 자신감(bold). */
  boldMaxLum: 0.3,
  /**
   * 웜톤 어스톤(베이지·아이보리·카키·올리브)을 여유(calm)로 붙잡는 순색도 상한.
   * 베이지는 밝지만 여유여야 하므로 밝기 판정보다 먼저 걸러집니다. 이 값을 넘는
   * 같은 색상대(비비드 옐로우·오렌지)는 어스톤이 아니라 포인트 컬러로 봅니다.
   */
  earthMaxChroma: 0.7,
  /**
   * 설렘(light)은 두 갈래입니다 — 둘 중 **하나만** 만족해도 설렘입니다.
   *   ① 화사한 파스텔 : 아주 밝고(pastelMinLum) 색기가 조금이라도 있는(pastelMinChroma)
   *   ② 비비드 포인트 : 밝기와 무관하게 순색도가 높은(vividMinChroma)
   * 둘을 AND 로 묶으면 파스텔(밝지만 순색도 낮음)과 비비드 블루(순색도 높지만 파랑이라
   * 어둡게 느껴짐)가 둘 다 빠집니다. 반대로 OR 를 헐겁게 잡으면 소프트 그레이(밝기만
   * 높음)와 데님(순색도만 어중간)이 딸려 들어오므로, 두 문턱을 각각 높게 잡았습니다.
   */
  pastelMinLum: 0.75,
  pastelMinChroma: 0.15,
  vividMinChroma: 0.6,
  /**
   * 서버 라우트 응답을 기다리는 시간. 넘으면 로컬 폴백으로 내려갑니다.
   * 서버 쪽 TIMEOUT_MS(app/api/analyze-mood/route.ts)와 항상 같이 맞추세요 —
   * 이 값이 더 짧으면 서버가 응답하기도 전에 폴백으로 떨어집니다.
   */
  timeoutMs: 12_000,
} as const;

// -----------------------------------------------------------------------------
// 7. 세그멘테이션(인물 분리) 설정
//    modelSelection: 0=general, 1=landscape(가로 화면용, 더 빠름)
//    featherPx: 마스크 가장자리 blur 강도. 0이면 비활성(칼로 자른 느낌).
//    assetBasePath: wasm/모델 파일 위치. CDN 대신 자가 호스팅 경로를 씁니다
//                   (매장 네트워크가 불안정해도 화면이 떠야 하므로).
//    maxCanvasWidth: 합성 캔버스 최대 폭(px). 화면이 더 넓으면 이 값으로 줄여
//                    프레임률을 지킵니다. 촬영 결과 해상도도 이 값을 따릅니다.
// -----------------------------------------------------------------------------
export const SEGMENTATION_CONFIG = {
  modelSelection: 1,
  featherPx: 2,
  // ── 누끼(마스크 가장자리) 품질 개선 노브 ──────────────────────────────────
  //   실측 현상: 경계의 반투명 띠로 실제 뒷배경이 살짝 비치고, 움직이면 흔들립니다.
  //   아래 두 값이 그 띠를 정리합니다. (lib/composite.ts buildMaskFilter 에서 사용)
  //   maskErode   : 경계를 안쪽으로 깎는 정도(밝기 배율). 1=끔. 낮출수록 더 깎아
  //                 뒷배경 테두리를 제거하지만, 너무 낮추면 사람 윤곽이 얇아집니다. (권장 0.8~0.95)
  //   maskContrast: 반투명 경계 띠를 사람/배경으로 밀어내는 세기(%). 100=끔.
  //                 높일수록 배경 비침이 확실히 사라집니다. (권장 300~500)
  maskErode: 0.85,
  maskContrast: 400,
  assetBasePath: "/mediapipe/selfie_segmentation",
  maxCanvasWidth: 1600,
} as const;

// -----------------------------------------------------------------------------
// 7-1. 인물 분리 방식 — 기본은 그린 스크린 크로마키, 세그멘테이션은 폴백
//
// 세그멘테이션의 한계: 인물이 움직이면 경계가 미세하게 흔들리고 그 틈으로 **실제
// 배경이 살짝 비칩니다.** SelfieSegmentation 이 프레임마다 마스크를 새로 추정하기
// 때문에 생기는 구조적 한계라, featherPx 로 완화만 되고 원인은 남습니다.
// 인물 전용 모델이라 손에 든 가방·가는 스트랩도 배경으로 잘려나갑니다.
//
// → 그린 스크린 + 색상 키잉은 **색이라는 고정 기준**으로 자르므로 매 프레임 같은
//   판정이 나와 경계가 흔들리지 않고, 스트랩도 살아납니다. (lib/chromaKey.ts)
//
// ⚠️ chromakey 는 **그린 스크린이 없으면 화면이 통째로 지워집니다.** 천이 없는
//    개발 PC 에서는 URL 에 `?matting=segmentation` 을 붙여 예전 방식으로 보세요.
//    WebGL 을 못 얻는 환경에서는 자동으로 세그멘테이션으로 내려갑니다
//    (부스에서 화면이 죽는 것이 최악이므로 — components/MirrorStage.tsx).
// -----------------------------------------------------------------------------
export const MATTING_CONFIG = {
  mode: "chromakey" as MattingMode,
  /**
   * 크로마키 파라미터. **부스 조명을 잡은 뒤 `/calibrate` 에서 실측한 값으로
   * 교체하세요.** 아래는 실측 전 자리표시자입니다.
   */
  chromaKey: {
    /** 그린 스크린 원단 색. 크로마 그린 표준값이며, 실측값으로 바꿔야 합니다. */
    keyColor: "#00b140",
    /**
     * 배경으로 간주할 **CbCr 색 거리 상한** (0~1). 높이면 더 많이 지웁니다.
     *
     * ⚠️ 눈금 감각을 잡아두세요 — 무채색(흰색·회색·검정)은 키 컬러에서 약 0.33,
     *    살색은 약 0.42 떨어져 있습니다. **0.3 을 넘기면 사람까지 지워집니다.**
     *    실용 범위는 0.05~0.30.
     */
    similarity: 0.18,
    /** 경계가 알파 0→1 로 넘어가는 폭(같은 거리 단위). featherPx 와 같은 역할. */
    smoothness: 0.08,
    /**
     * 매트를 안쪽으로 깎는 정도 (0~1). 0 = 끔.
     *
     * **반투명한** 경계 픽셀(머리카락, 움직임 블러)을 잘라냅니다. 몸 윤곽의 초록
     * 테두리에는 효과가 없습니다 — 그건 불투명한 픽셀이라 아래 spill 담당입니다.
     * 올리면 머리카락이 얇아지므로 필요할 때만 조금씩 (권장 0~0.3).
     */
    edgeShrink: 0.1,
    /**
     * 인물에 반사된 초록빛(스필) 제거 강도 (0~1).
     * **몸 윤곽에 초록 테두리가 보이면 이 값을 올리세요 — 그게 유일한 해결 노브입니다.**
     *
     * 스크린에서 튄 초록빛은 인물 몸에 실제로 얹힌 색이라 매트(알파)로는 지워지지
     * 않습니다. 1.0 = 초록기를 r/b 평균까지 완전히 눌러 테두리를 없앱니다.
     *
     * ⚠️ `min(g, (r+b)/2)` 가드 덕분에 초록기가 없는 색은 손대지 않습니다 — 실측 결과
     *    피부 0~2, 핑크 0, 베이지 6, 흰색·검정·데님·빨강 0 만큼만 변합니다. 대신
     *    **카키·올리브 의상은 눈에 띄게 탁해지므로**(약 30) 그럴 땐 0.6 정도로 낮추세요.
     */
    spill: 1.0,
  },
} as const;

// -----------------------------------------------------------------------------
// 8. Ripple 전환 설정 — 02→03, 03→04 전환에만 씁니다 (퍼지면서 사라짐).
//    나머지 화면 전환은 FadeStep 크로스페이드입니다.
//    color 는 전환 중 배경과 크게 다르지 않아야 튀지 않습니다.
// -----------------------------------------------------------------------------
export const RIPPLE_CONFIG = {
  // 02→03, 03→04 전환 속도. 더 늦추려면 이 값만 올리세요.
  stepMs: 1800,
  color: "#faf8f5",

  /**
   * 03 카드 선택 시 고른 사진이 확대되고 나머지 두 장은 옅어집니다.
   * 지속 시간은 stepMs 를 그대로 써서 화면 전환과 항상 같이 움직입니다.
   */
  journeySelectZoomScale: 1.15,
  journeySelectDimOpacity: 0.25,

  /**
   * 선택지에 마우스를 올렸을 때 **버튼 정중앙에서** 퍼지는 물결.
   * 전환용 ripple 과 달리 버튼 안에서만 퍼지고 클릭을 막지 않습니다.
   * hoverRepeatMs 간격으로 계속 번져 물결처럼 보이게 합니다 (0 이면 1회만).
   *
   * ⚠️ 커서를 따라 퍼지게 하면 마우스를 움직일 때마다 시작점이 튀어 글자가 읽기
   *    힘들어집니다. 중앙 고정 + 느린 속도가 카피 가독성에 유리합니다.
   */
  hoverMs: 3000,
  hoverRepeatMs: 1800,
  hoverColor: "#b08d57",
  hoverOpacity: 0.26,

  /**
   * 02 제품 카드는 물결 색으로 그 카드의 컬러웨이 색(colorway.hex)을 씁니다.
   * 파스텔 톤이라 기본 hoverOpacity(0.26)로는 흰 카드 위에서 거의 안 보입니다.
   */
  hoverProductOpacity: 0.5,

  /**
   * 물결이 흐려지는 곡선 (퍼지는 곡선 ease-out 과 분리돼 있습니다).
   * ease-in 이 가장 진하고, linear · ease-out 순으로 옅어집니다.
   * 더 진하게 하려면 cubic-bezier(0.8, 0, 0.9, 1) 처럼 뒤로 미세요.
   */
  hoverFadeEasing: "ease-in",

  /**
   * OS 의 "동작 줄이기(prefers-reduced-motion)" 설정을 따를지.
   *
   * ⚠️ true 로 두면 부스 PC 의 Windows "애니메이션 효과"가 꺼져 있을 때 **리플·물결·
   *    궤도 회전이 전부 사라집니다**(설정 › 접근성 › 시각 효과 › 애니메이션 효과).
   *    이 설정은 부스를 세팅한 사람의 취향이지 방문객의 것이 아니고, 연출 자체가
   *    이 체험의 핵심이라 기본값을 false(항상 재생)로 둡니다.
   *    일반 웹으로 배포한다면 true 로 되돌리세요.
   */
  respectReducedMotion: false,
} as const;

// -----------------------------------------------------------------------------
// 9. 촬영 결과 업로드 설정
//
//    부스 WiFi 가 불안정할 수 있으므로 요청에 타임아웃을 걸고, 백엔드의 10MB 제한
//    (multipart max-file-size)에 걸려 413 이 나지 않도록 미리 줄여서 보냅니다.
// -----------------------------------------------------------------------------
export const UPLOAD_CONFIG = {
  /** 응답이 이 시간 안에 안 오면 실패로 간주합니다(무한 대기 방지). */
  timeoutMs: 10000,
  /** 헬스체크는 프리로드를 붙잡지 않도록 더 짧게. */
  healthTimeoutMs: 3000,
  /** 백엔드 multipart 제한과 같은 값을 유지하세요. */
  maxBytes: 10 * 1024 * 1024,
  /**
   * 용량 초과 시 위에서부터 차례로 다시 인코딩합니다.
   * 품질을 먼저 낮추고, 그래도 안 되면 해상도를 줄입니다.
   */
  shrinkAttempts: [
    { scale: 1, quality: 0.8 },
    { scale: 1, quality: 0.65 },
    { scale: 0.75, quality: 0.7 },
    { scale: 0.6, quality: 0.6 },
  ],
} as const;

// -----------------------------------------------------------------------------
// 10. BGM 설정 — World 별이 아니라 **체험 전체가 한 곡**을 공유합니다.
//     06 리빌에서 재생을 시작해 08 QR 에서 멈춥니다.
//     파일이 없으면 콘솔 경고만 남기고 무음으로 정상 동작합니다.
// -----------------------------------------------------------------------------
export const BGM_CONFIG = {
  /**
   * ⚠️ 파일명에 공백이 있어 %20 으로 인코딩해 뒀습니다. 곡을 바꿀 때도 공백은
   *    인코딩하거나, 아예 공백 없는 이름으로 저장하세요.
   */
  src: "/bgm/Golden%20Hour%20Lounge.mp3",
  volume: 0.5,
  fadeInMs: 1200,
  fadeOutMs: 600,
} as const;
