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
  moodGuide: "상의가 가이드 안에 오도록 서주세요. 인식되면 자동으로 분석해요.",
  moodDetectionRetry: "옷 인식 다시 시도하기",
  moodDetectionLoading: "옷을 인식할 준비를 하고 있어요...",
  moodDetecting: "가이드 안에서 옷을 찾고 있어요...",
  moodDetected: "옷이 감지됐어요. 잠시 그대로 있어주세요.",
  moodDetectionUnavailable: "옷을 인식하지 못했어요. 다시 시도해주세요.",
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
export const WORLDS: Record<WorldId, WorldDef> = {
  paris_dawn: {
    id: "paris_dawn",
    displayName: "PARIS",
    name: "파리의 새벽",
    tagline: "안개 낀 새벽빛, 첫 만남의 설렘",
    timeOfDay: "day",
    sceneType: "culture",
    textOn: "dark",
  },

  newyork_attitude: {
    id: "newyork_attitude",
    displayName: "NEW YORK",
    name: "뉴욕 애티튜드",
    tagline: "도시의 밤, 강렬하게 존재하는 나",
    timeOfDay: "night",
    sceneType: "street",
    textOn: "light",
  },

  milano_terrace: {
    id: "milano_terrace",
    displayName: "MILANO",
    name: "밀라노 테라스",
    tagline: "나른한 오후 햇살, 우아한 여유",
    timeOfDay: "golden",
    sceneType: "leisure",
    textOn: "dark",
  },

  seoul_neon: {
    id: "seoul_neon",
    displayName: "SEOUL",
    name: "서울 네온",
    tagline: "빠르게 뛰는 심장, 도시의 빛",
    timeOfDay: "night",
    sceneType: "culture",
    textOn: "light",
  },
};

/**
 * 사용할 World 목록. 이 배열만 바꾸면 결과 분포가 바뀌고(resolveWorld 가 속성 매칭이라),
 * 배열 순서는 동점 시 우선순위라 앞쪽 World 가 더 자주 나옵니다.
 */
export const ACTIVE_WORLD_IDS: WorldId[] = [
  "newyork_attitude",
  "paris_dawn",
  "milano_terrace",
  "seoul_neon",
];

// --- 4. World 결정 규칙 ---
// 조합별 하드코딩 테이블 대신 속성 매칭 점수로 고릅니다. 값은 우선순위 배열입니다.
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

/** 1순위 축이 맞을 때 / 2순위 축이 맞을 때의 가점 (시간대 축 > 공간 축). */
const TIME_PRIMARY = 4;
const TIME_SECONDARY = 2;
const SCENE_PRIMARY = 2;
const SCENE_SECONDARY = 1;
const COLORWAY_MATCH = 1;

function timeScore(value: TimeOfDay, priority: TimeOfDay[]): number {
  if (value === priority[0]) return TIME_PRIMARY;
  if (value === priority[1]) return TIME_SECONDARY;
  return 0;
}

function sceneScore(value: SceneType, priority: SceneType[]): number {
  if (value === priority[0]) return SCENE_PRIMARY;
  if (value === priority[1]) return SCENE_SECONDARY;
  return 0;
}

/** 베이지는 밝은 World(textOn: dark), 핑크는 어두운 World(textOn: light)와 어울립니다. */
function colorwayScore(colorway: ColorwayKey, world: WorldDef): number {
  if (colorway === "beige" && world.textOn === "dark") return COLORWAY_MATCH;
  if (colorway === "pink" && world.textOn === "light") return COLORWAY_MATCH;
  return 0;
}

export function scoreWorld(
  colorway: ColorwayKey,
  mood: MoodKey,
  journey: JourneyKey,
  world: WorldDef
): number {
  return (
    timeScore(world.timeOfDay, MOOD_TO_TIME[mood]) +
    sceneScore(world.sceneType, JOURNEY_TO_SCENE[journey]) +
    colorwayScore(colorway, world)
  );
}

/** 최고점 World. 동점이면 ACTIVE_WORLD_IDS 순서상 앞선 것(`>` 비교라 교체 안 함). */
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



// --- 6. 카메라 설정 (07 화면) ---
// mirror 는 합성된 인물 레이어에만 적용됩니다 — 배경은 반전되지 않습니다.
export const CAMERA_CONFIG = {
  width: 1280,
  height: 720,
  mirror: true,
} as const;

// --- 6-1. AI 무드 분석 설정 (04 화면) ---
// 임계값은 모두 **로컬 폴백** 전용입니다 (AI 응답이 성공하면 쓰이지 않습니다).
// 밝기는 BT.601 luminance, 채도는 순색도(delta/max) 기준 — HSL 을 쓰면 비비드 색의 L 이
// 눌리고 베이지의 S 가 부풀려져 판정이 뒤집힙니다.
export const MOOD_ANALYSIS_CONFIG = {
  captureWidth: 768,
  jpegQuality: 0.8,
  /** 로컬 폴백이 색을 재는 상반신 박스 (0~1 비율). 가이드 프레임 오버레이와 같은 값. */
  sampleRegion: { x: 0.3, y: 0.45, w: 0.4, h: 0.45 },
  /** 이 아래로 어두우면 자신감(bold). */
  boldMaxLum: 0.3,
  /** 웜톤 어스톤(베이지·카키)을 여유로 붙잡는 순색도 상한 — 밝기 판정보다 먼저 걸립니다. */
  earthMaxChroma: 0.7,
  /**
   * 설렘(light)은 파스텔(밝고 옅음) **또는** 비비드(순색도 높음) 둘 중 하나만 만족하면
   * 됩니다. AND 로 묶으면 둘 다 빠지고, 문턱을 낮추면 소프트 그레이·데님이 딸려옵니다.
   */
  pastelMinLum: 0.75,
  pastelMinChroma: 0.15,
  vividMinChroma: 0.6,
  /** 서버 라우트의 TIMEOUT_MS(app/api/analyze-mood/route.ts)와 항상 같이 맞추세요. */
  timeoutMs: 12_000,
} as const;

// --- 7. 세그멘테이션(인물 분리) 설정 — 크로마키 폴백용 ---
export const SEGMENTATION_CONFIG = {
  /** 0=general, 1=landscape(가로 화면용, 더 빠름) */
  modelSelection: 1,
  featherPx: 2,
  /** 경계를 안쪽으로 깎는 밝기 배율. 1=끔. 너무 낮추면 사람 윤곽이 얇아집니다. (0.8~0.95) */
  maskErode: 0.85,
  /** 반투명 경계 띠를 사람/배경으로 밀어내는 세기(%). 100=끔. (300~500) */
  maskContrast: 400,
  /** CDN 대신 자가 호스팅 — 매장 네트워크가 불안정해도 화면이 떠야 합니다. */
  assetBasePath: "/mediapipe/selfie_segmentation",
  /** 합성 캔버스 최대 폭(px). 촬영 결과 해상도도 이 값을 따릅니다. */
  maxCanvasWidth: 1600,
} as const;

// --- 7-1. 인물 분리 방식 ---
// 세그멘테이션은 프레임마다 마스크를 새로 추정해 경계가 흔들리고 가방 스트랩이 잘리는
// 구조적 한계가 있어, 색을 고정 기준으로 쓰는 크로마키가 기본입니다.
//
// ⚠️ chromakey 는 그린 스크린이 없으면 화면이 통째로 지워집니다. 천이 없는 개발 PC 에서는
//    `?matting=segmentation` 을 붙이세요. WebGL 을 못 얻으면 자동으로 내려갑니다.
export const MATTING_CONFIG = {
  mode: "chromakey" as MattingMode,
  /** 부스 조명을 잡은 뒤 `/calibrate` 에서 실측한 값으로 교체하세요. */
  chromaKey: {
    keyColor: "#00b140",
    /**
     * 배경으로 간주할 CbCr 거리 상한. 무채색은 약 0.33, 살색은 약 0.42 떨어져 있어
     * **0.3 을 넘기면 사람까지 지워집니다.** 실용 범위 0.05~0.30.
     */
    similarity: 0.18,
    /** 경계가 알파 0→1 로 넘어가는 폭(같은 거리 단위). */
    smoothness: 0.08,
    /** 반투명 경계 픽셀을 깎습니다. 올리면 머리카락이 얇아집니다 (0~0.3). */
    edgeShrink: 0.1,
    /**
     * 스필 제거 강도. **몸 윤곽에 초록 테두리가 보이면 이 값을 올리는 게 유일한
     * 해결책입니다.** 단 카키·올리브 의상은 눈에 띄게 탁해지므로 그럴 땐 0.6 정도로.
     */
    spill: 1.0,
  },
} as const;

// --- 8. Ripple 전환 설정 (02→03, 03→04) ---
// 나머지 화면 전환은 FadeStep 크로스페이드입니다.
export const RIPPLE_CONFIG = {
  stepMs: 1800,
  color: "#faf8f5",

  /** 03 카드 선택 연출. 지속 시간은 stepMs 를 써서 화면 전환과 같이 움직입니다. */
  journeySelectZoomScale: 1.15,
  journeySelectDimOpacity: 0.25,

  /**
   * 선택지 hover 물결. 커서를 따라 퍼지게 하면 시작점이 튀어 글자가 읽기 힘들어지므로
   * 버튼 정중앙 고정입니다. hoverRepeatMs 간격으로 계속 번집니다 (0 이면 1회).
   */
  hoverMs: 3000,
  hoverRepeatMs: 1800,
  hoverColor: "#b08d57",
  hoverOpacity: 0.26,

  /** 02 제품 카드는 컬러웨이 색을 쓰는데 파스텔이라 기본 불투명도로는 안 보입니다. */
  hoverProductOpacity: 0.5,

  /** 물결이 흐려지는 곡선. ease-in 이 가장 진하고 linear · ease-out 순으로 옅어집니다. */
  hoverFadeEasing: "ease-in",

  /**
   * false 고정 — true 면 부스 PC 의 Windows "애니메이션 효과"가 꺼져 있을 때 연출이
   * 전부 사라집니다. 그건 부스 세팅한 사람의 설정이지 방문객의 것이 아닙니다.
   */
  respectReducedMotion: false,
} as const;

// --- 9. 촬영 결과 업로드 설정 ---
export const UPLOAD_CONFIG = {
  timeoutMs: 10000,
  /** 헬스체크는 프리로드를 붙잡지 않도록 더 짧게. */
  healthTimeoutMs: 3000,
  /** 백엔드 multipart 제한과 같은 값을 유지하세요. */
  maxBytes: 10 * 1024 * 1024,
  /** 용량 초과 시 위에서부터 차례로 재인코딩 — 품질 먼저, 그다음 해상도. */
  shrinkAttempts: [
    { scale: 1, quality: 0.8 },
    { scale: 1, quality: 0.65 },
    { scale: 0.75, quality: 0.7 },
    { scale: 0.6, quality: 0.6 },
  ],
} as const;

// --- 10. BGM 설정 ---
// 체험 전체가 한 곡을 공유합니다. 06 리빌에서 시작해 08 QR 에서 멈추고,
// 파일이 없으면 콘솔 경고만 남기고 무음으로 정상 동작합니다.
export const BGM_CONFIG = {
  src: "/bgm/Golden%20Hour%20Lounge.mp3",
  volume: 0.5,
  fadeInMs: 1200,
  fadeOutMs: 600,
} as const;
