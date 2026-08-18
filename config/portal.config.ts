// =============================================================================
// MCM PORTAL — 편집용 설정 파일
// -----------------------------------------------------------------------------
// 팀에서 수정할 만한 값(카피, World 목록, 질문/선택지, World 결정 규칙, 카메라·
// 합성·전환·BGM 파라미터)은 전부 이 파일에 모아뒀습니다. 컴포넌트 코드는 건드릴
// 필요 없이 아래 상수만 바꾸면 화면에 바로 반영됩니다.
// 제품(02 화면) 데이터만 config/products.config.ts 로 분리돼 있습니다.
// =============================================================================

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

// -----------------------------------------------------------------------------
// 1. 브랜드 카피 — 화면에 보이는 모든 문구
//    "\n" 은 화면에서 줄바꿈으로 렌더링됩니다.
// -----------------------------------------------------------------------------
export const COPY = {
  brandName: "MCM PORTAL",
  wordmark: "MCM",

  // 01 START
  introTagline: "MCM과 함께\n새로운 World로 떠나보세요.",
  introSubline: "당신의 선택으로 시작되는\nMCM EXPERIENCE",
  consentLabel: "체험을 위한 촬영 및 일시 보관에 동의합니다.",
  startButton: "시작하기",

  // 02 PRODUCT
  productHeading: "어떤 MCM과 함께 할까요?",
  productSubline: "원하는 제품을 선택해주세요.",

  // 03 MOOD
  moodHeading: "이번 여행은 어떤 느낌이었으면 좋겠나요?",
  moodSubline: "원하는 분위기를 선택해주세요.",

  // 04 TRAVEL STYLE
  journeyHeading: "여행지에서 가장 하고 싶은 건?",
  journeySubline: "원하는 여행 스타일을 선택해주세요.",
  journeyFootnote: "선택과 동시에 다음 단계로 이동합니다.",

  // 05 PORTAL OPENING
  openingMessage: "고객님에게 어울리는\n장소를 찾고 있어요.",

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
  passportType: "여행 유형",
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
  handoffCaption: "촬영한 사진을 저장하거나\n관심 제품을 저장하려면\nQR을 스캔해 주세요.",
  downloadButton: "사진 저장하기",
  restartButton: "처음으로",
  /** `{expiry}` 자리에 만료 시각이 들어갑니다. */
  handoffExpiry: "이 QR은 {expiry}까지 유효합니다.",

  // TODAY'S MCM / SAVED ITEMS — 부스가 아니라 QR 로 넘어간 폰에서 쓰입니다.
  todaysHeading: "TODAY'S MCM",
  savedHeading: "SAVED ITEMS",
  saveInterestButton: "관심 제품 저장하기",
  savedInterestButton: "관심 제품에 저장되었습니다!",

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

// -----------------------------------------------------------------------------
// 2. 취향 입력 질문 — 03 MOOD / 04 TRAVEL STYLE 화면의 버튼형 질문
//    라벨의 "\n" 은 2줄 표기용 줄바꿈입니다.
//    ⚠️ 무드는 내부적으로 시간대(TimeOfDay), 여행 스타일은 공간 성격(SceneType)
//       축으로 번역됩니다. 낮/노을/밤 같은 축 이름을 라벨에 넣지 마세요.
// -----------------------------------------------------------------------------
export const MOOD_QUESTION: QuestionDef<MoodKey> = {
  id: "mood",
  prompt: COPY.moodHeading,
  // ⚠️ key 는 바꾸지 마세요 — COMBO_BACKGROUNDS 의 배경 매핑이 이 값을 씁니다.
  //    (light = 설렘, calm = 여유, bold = 자신감)
  options: [
    { key: "light", label: "설렘", description: "새로운 순간을 기대하는" },
    { key: "calm", label: "여유", description: "천천히 즐기고 싶은" },
    { key: "bold", label: "자신감", description: "나답게 뽐내고 싶은" },
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

export const QUESTIONS = [MOOD_QUESTION, JOURNEY_QUESTION];

// -----------------------------------------------------------------------------
// 3. World 목록 — World는 (도시 × 시간대 × 공간 성격) 으로 정의됩니다.
//
//    displayName : 06 리빌 화면의 대문자 표기
//    timeOfDay   : 분위기(무드)가 반영되는 내부 축 — 화면에 노출하지 않습니다
//    sceneType   : 여행 스타일이 반영되는 내부 축 — 화면에 노출하지 않습니다
//    gradient    : CSS 배경용 문자열
//    gradientStops: 07 캔버스 합성용 (gradient 와 같은 값을 유지해 주세요)
//    backgroundImage: World 공통 실사 배경. 비어 있으면 gradient 로 폴백합니다.
//                     ⚠️ 실사 배경은 현재 World 단위가 아니라 **조합 단위**로 붙습니다.
//                     아래 COMBO_BACKGROUNDS 를 쓰세요 (없는 파일 경로를 여기 적으면
//                     gradient 폴백이 막혀 배경이 빈 화면으로 나옵니다).
//    bgm         : "/bgm/{id}.mp3" — 파일이 없어도 앱은 무음으로 정상 동작합니다
//
//    ── 시간대 팔레트 규약 ──────────────────────────────────────────────────
//    실사 배경이 없는 동안에도 timeOfDay 축이 눈에 보이도록, ACTIVE_WORLD_IDS 의
//    World는 아래 규약을 따릅니다(180deg = 위 하늘 → 아래 지면).
//
//      day    : 전체적으로 밝게. 위는 차가운 하늘빛, 아래는 밝은 지면.  textOn: dark
//      golden : 중간 밝기 + 강한 warm(앰버·테라코타). 위가 밝고 아래가 깊어짐. textOn: dark
//      night  : 전체적으로 어둡게. 위는 거의 검정, 아래에 도시 광원만 은은하게. textOn: light
//
//    같은 night 안에서는 **색상(hue)** 으로 구분합니다 (NEW YORK = 강철빛+붉은 글로우,
//    SEOUL = 보라+마젠타 네온). 새 World를 활성화할 때 이 규약에 맞춰 잡아주세요.
//    ⚠️ textOn 은 resolveWorld 의 컬러웨이 보정에 쓰이므로 색을 바꿀 때 함께 바꾸면
//       매핑 결과가 달라집니다 (바꿀 때는 매핑 표를 다시 확인하세요).
// -----------------------------------------------------------------------------
export const WORLDS: Record<WorldId, WorldDef> = {
  paris_dawn: {
    id: "paris_dawn",
    displayName: "PARIS",
    name: "파리의 새벽",
    tagline: "안개 낀 새벽빛, 첫 만남의 설렘",
    timeOfDay: "day",
    sceneType: "culture",
    // 한낮 — 차가운 하늘빛에서 밝은 석조 지면까지. 전체 고명도(안개 낀 대낮).
    gradient:
      "linear-gradient(180deg, #c9dcef 0%, #e4ecf3 40%, #f4efe6 72%, #e6d9c8 100%)",
    gradientAngle: 180,
    gradientStops: [
      { offset: 0, color: "#c9dcef" },
      { offset: 0.4, color: "#e4ecf3" },
      { offset: 0.72, color: "#f4efe6" },
      { offset: 1, color: "#e6d9c8" },
    ],
    bgm: "/bgm/paris_dawn.mp3",
    textOn: "dark",
  },
  santorini_breeze: {
    id: "santorini_breeze",
    displayName: "SANTORINI",
    name: "산토리니 브리즈",
    tagline: "하얀 벽과 바람이 만드는 여유",
    timeOfDay: "day",
    sceneType: "leisure",
    gradient: "linear-gradient(135deg, #d9e8ef 0%, #eef2ea 50%, #f7f3ea 100%)",
    gradientStops: [
      { offset: 0, color: "#d9e8ef" },
      { offset: 0.5, color: "#eef2ea" },
      { offset: 1, color: "#f7f3ea" },
    ],
    bgm: "/bgm/santorini_breeze.mp3",
    textOn: "dark",
  },
  monaco_night: {
    id: "monaco_night",
    displayName: "MONACO",
    name: "모나코의 밤",
    tagline: "블랙과 골드, 압도하는 존재감",
    timeOfDay: "night",
    sceneType: "leisure",
    gradient: "linear-gradient(135deg, #0b0b0d 0%, #23201a 55%, #8a7245 100%)",
    gradientStops: [
      { offset: 0, color: "#0b0b0d" },
      { offset: 0.55, color: "#23201a" },
      { offset: 1, color: "#8a7245" },
    ],
    bgm: "/bgm/monaco_night.mp3",
    textOn: "light",
  },
  newyork_attitude: {
    id: "newyork_attitude",
    displayName: "NEW YORK",
    name: "뉴욕 애티튜드",
    tagline: "도시의 밤, 강렬하게 존재하는 나",
    timeOfDay: "night",
    sceneType: "street",
    // 밤 — 검은 하늘 → 강철빛 건물 → 아래쪽에 붉은 가로등 글로우(뉴욕 시그니처).
    gradient:
      "linear-gradient(180deg, #090c12 0%, #182130 42%, #33262a 74%, #7d2a23 100%)",
    gradientAngle: 180,
    gradientStops: [
      { offset: 0, color: "#090c12" },
      { offset: 0.42, color: "#182130" },
      { offset: 0.74, color: "#33262a" },
      { offset: 1, color: "#7d2a23" },
    ],
    bgm: "/bgm/newyork_attitude.mp3",
    textOn: "light",
  },
  tokyo_mirage: {
    id: "tokyo_mirage",
    displayName: "TOKYO",
    name: "도쿄 미라주",
    tagline: "현실과 환상 사이, 몽환의 도시",
    timeOfDay: "night",
    sceneType: "street",
    gradient: "linear-gradient(135deg, #0f0f14 0%, #3b2a5e 50%, #7c5cbf 100%)",
    gradientStops: [
      { offset: 0, color: "#0f0f14" },
      { offset: 0.5, color: "#3b2a5e" },
      { offset: 1, color: "#7c5cbf" },
    ],
    bgm: "/bgm/tokyo_mirage.mp3",
    textOn: "light",
  },
  milano_terrace: {
    id: "milano_terrace",
    displayName: "MILANO",
    name: "밀라노 테라스",
    tagline: "나른한 오후 햇살, 우아한 여유",
    timeOfDay: "golden",
    sceneType: "leisure",
    // 해 질 무렵 — 앰버 하늘에서 테라코타 지면까지. 밝지만 확실히 warm.
    gradient:
      "linear-gradient(180deg, #ffd79b 0%, #f8bd76 34%, #e79f61 68%, #c67a50 100%)",
    gradientAngle: 180,
    gradientStops: [
      { offset: 0, color: "#ffd79b" },
      { offset: 0.34, color: "#f8bd76" },
      { offset: 0.68, color: "#e79f61" },
      { offset: 1, color: "#c67a50" },
    ],
    bgm: "/bgm/milano_terrace.mp3",
    textOn: "dark",
  },
  seoul_neon: {
    id: "seoul_neon",
    displayName: "SEOUL",
    name: "서울 네온",
    tagline: "빠르게 뛰는 심장, 도시의 빛",
    timeOfDay: "night",
    sceneType: "culture",
    // 밤 — 같은 night 인 NEW YORK 과 색상으로 구분합니다(보라 → 마젠타 네온).
    gradient:
      "linear-gradient(180deg, #0a0615 0%, #221345 44%, #55206f 76%, #9d2a68 100%)",
    gradientAngle: 180,
    gradientStops: [
      { offset: 0, color: "#0a0615" },
      { offset: 0.44, color: "#221345" },
      { offset: 0.76, color: "#55206f" },
      { offset: 1, color: "#9d2a68" },
    ],
    bgm: "/bgm/seoul_neon.mp3",
    textOn: "light",
  },
  ibiza_sunset: {
    id: "ibiza_sunset",
    displayName: "IBIZA",
    name: "이비자 선셋",
    tagline: "노을 아래 자유로운 리듬",
    timeOfDay: "golden",
    sceneType: "leisure",
    gradient: "linear-gradient(135deg, #ff9a56 0%, #ff6f91 50%, #6a3093 100%)",
    gradientStops: [
      { offset: 0, color: "#ff9a56" },
      { offset: 0.5, color: "#ff6f91" },
      { offset: 1, color: "#6a3093" },
    ],
    bgm: "/bgm/ibiza_sunset.mp3",
    textOn: "light",
  },
};

/**
 * 이번 체험에서 실제로 사용할 World 목록.
 *
 * ⚠️ 임시값 — 회의에서 확정 예정입니다. **이 배열만 바꾸면** 결과 분포가 바뀝니다
 * (resolveWorld 가 하드코딩 테이블이 아니라 속성 매칭으로 동작하기 때문).
 * 배열 순서는 동점 시 우선순위로도 쓰이므로, 앞쪽에 둘 World가 더 자주 나옵니다.
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

/**
 * "왜 이 World인지" 문장을 만듭니다.
 *
 * ⚠️ 지금은 화면에 렌더링하지 않습니다(노출 위치 회의 후 결정). 로그/검증용으로만
 * 사용하세요. 한국어 조사(이/가, 을/를)가 라벨에 따라 틀어지므로 조사 없는
 * 나열형 템플릿을 씁니다.
 * 예) "여유 · 쇼핑·문화 즐기기 — NEW YORK, 해 질 무렵"
 */
export function buildWorldReason(
  mood: MoodKey,
  journey: JourneyKey,
  world: WorldDef
): string {
  const moodLabel = MOOD_QUESTION.options.find((o) => o.key === mood)?.label ?? "";
  const journeyLabel =
    JOURNEY_QUESTION.options.find((o) => o.key === journey)?.label ?? "";

  return `${flatLabel(moodLabel)} · ${flatLabel(journeyLabel)} — ${world.displayName}, ${
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

// -----------------------------------------------------------------------------
// 조합 전용 실사 배경 — (컬러웨이 × 무드 × 여행 스타일) → 배경 이미지
//
//    World 자체는 위 4번 규칙(속성 매칭)으로 고르지만, **실사 배경은 촬영본이 준비된
//    조합 단위**로 붙습니다. 여기 등록된 조합만 실사 배경이 나가고, 나머지 조합은
//    World 의 gradient(목업)가 그대로 쓰입니다.
//
//    무드 키 ↔ 03 MOOD 화면 라벨 (파일명 표기)
//      light = 설렘  (새로운 순간을 기대하는)  → sul
//      calm  = 여유  (천천히 즐기고 싶은)      → calm
//      bold  = 자신감(나답게 뽐내고 싶은)      → confidence
//
//    여행 스타일 키 ↔ 04 화면 라벨 (파일명 표기)
//      explore = 도시 곳곳 둘러보기 → city
//      culture = 쇼핑·문화 즐기기   → shop
//      relax   = 여유롭게 쉬기      → relax
//
//    18조합(핑크·베이지 × 무드 3 × 여정 3)은 comboBackgroundImage() 가 파일명 토큰으로
//    경로를 만듭니다. 각 조합은 버전 1·2 두 장(1=선택 카드, 2=촬영 배경)이 있으며,
//    파일은 public/worlds/{색}/ 아래에 있습니다.
// -----------------------------------------------------------------------------

/**
 * `${컬러웨이}|${무드}|${여행}` → public 아래 배경 이미지 경로.
 *
 * 파일명 규약: /worlds/{색}/{색}_{무드}_{여정}{버전}.png
 *   무드 : light→sul(설렘) · calm→calm(여유) · bold→confidence(자신감)
 *   여정 : explore→city · culture→shop · relax→relax
 *   버전 : 조합마다 1·2 두 장이 있고, 기본은 1을 씁니다(2로 바꾸려면 끝 숫자만 변경).
 *
 * 18조합(핑크·베이지 × 무드 3 × 여정 3) 전량 등록. 파일이 없으면 gradient 로 폴백합니다.
 */
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

/**
 * 조합에 맞는 실사 배경 경로.
 *
 * variant 1 = 04 나라 선택 카드용, variant 2 = 07 촬영 합성 배경용
 * (같은 조합이라도 카드와 촬영 배경에 다른 컷을 씁니다). 기본값은 카드용 1.
 * 선택값이 하나라도 없으면 undefined 를 돌려줘 gradient 로 폴백합니다.
 *
 * 파일 규약: /worlds/{색}/{색}_{무드토큰}_{여정토큰}{버전}.png
 */
export function comboBackgroundImage(
  colorway: ColorwayKey | null,
  answers: Answers,
  variant: 1 | 2 = 1
): string | undefined {
  const { mood, journey } = answers;
  if (!colorway || !mood || !journey) return undefined;
  return `/worlds/${colorway}/${colorway}_${MOOD_IMG_TOKEN[mood]}_${JOURNEY_IMG_TOKEN[journey]}${variant}.png`;
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
// 5. 대안 World — 미러 화면의 "다른 세계도 보기" 안건이 확정되면 되살립니다.
//    현재 화면에서는 렌더링하지 않지만 설정은 남겨둡니다.
// -----------------------------------------------------------------------------
export const WORLD_ALTERNATES: Record<WorldId, [WorldId, WorldId]> = {
  paris_dawn: ["santorini_breeze", "tokyo_mirage"],
  santorini_breeze: ["paris_dawn", "milano_terrace"],
  monaco_night: ["newyork_attitude", "tokyo_mirage"],
  newyork_attitude: ["monaco_night", "seoul_neon"],
  tokyo_mirage: ["monaco_night", "seoul_neon"],
  milano_terrace: ["santorini_breeze", "ibiza_sunset"],
  seoul_neon: ["ibiza_sunset", "newyork_attitude"],
  ibiza_sunset: ["seoul_neon", "milano_terrace"],
};

export function getAlternateWorlds(worldId: WorldId): [WorldDef, WorldDef] {
  const [a, b] = WORLD_ALTERNATES[worldId];
  return [WORLDS[a], WORLDS[b]];
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
// 7-1. 인물 분리 방식 — 지금은 세그멘테이션, 부스 제작 시 그린 스크린 크로마키
//
// 실측된 현상: 인물이 움직이면 경계가 미세하게 흔들리고 그 틈으로 **실제 배경이
// 살짝 비칩니다.** SelfieSegmentation 이 프레임마다 마스크를 새로 추정하기 때문에
// 생기는 구조적 한계라, featherPx 로 완화만 되고 원인은 남습니다.
//
// → 부스를 제작할 때 뒤에 **그린 스크린**을 세우고 색상 키잉으로 교체할 예정입니다.
//   색이라는 고정 기준으로 자르면 매 프레임 같은 판정이 나와 경계가 흔들리지 않습니다.
//
// ⚠️ mode: "chromakey" 는 **아직 구현되지 않았습니다.** 값을 바꿔도 지금은
//    세그멘테이션으로 계속 동작하고 콘솔 경고만 남습니다(부스에서 화면이 죽는 것이
//    최악이므로 의도적으로 폴백). 구현할 때 손볼 파일과 순서는
//    README "다음 단계: 그린 스크린 크로마키" 에 정리해뒀습니다.
// -----------------------------------------------------------------------------
export const MATTING_CONFIG = {
  mode: "segmentation" as MattingMode,
  /** mode: "chromakey" 로 전환할 때 쓸 값들 (OBS 크로마키와 같은 의미). */
  chromaKey: {
    /** 그린 스크린 원단 색. 부스 조명 아래서 실측한 값으로 교체하세요. */
    keyColor: "#00b140",
    /** 배경으로 간주할 색 거리 (0~1). 높이면 더 많이 지웁니다. */
    similarity: 0.4,
    /** 경계 부드러움 (0~1). 세그멘테이션의 featherPx 와 같은 역할. */
    smoothness: 0.08,
    /** 인물에 반사된 초록빛(스필) 제거 강도 (0~1). */
    spill: 0.1,
  },
} as const;

// -----------------------------------------------------------------------------
// 8. Ripple 전환 설정
//    stepMs: 02→03, 03→04 중간 전환 (퍼지면서 사라짐)
//    finalMs: 04→05 화면 전체를 덮는 전환
//    color: 05 배경(paper)과 동일해야 이음매 없이 이어집니다
// -----------------------------------------------------------------------------
export const RIPPLE_CONFIG = {
  stepMs: 420,
  finalMs: 700,
  color: "#faf8f5",

  /**
   * 선택지에 마우스를 올렸을 때 **버튼 정중앙에서** 퍼지는 물결.
   * 전환용 ripple 과 달리 버튼 안에서만 퍼지고 클릭을 막지 않습니다.
   * hoverRepeatMs 간격으로 계속 번져 물결처럼 보이게 합니다 (0 이면 1회만).
   *
   * ⚠️ 커서를 따라 퍼지게 하면 마우스를 움직일 때마다 시작점이 튀어 글자가 읽기
   *    힘들어집니다. 중앙 고정 + 느린 속도가 카피 가독성에 유리합니다.
   */
  hoverMs: 1800,
  hoverRepeatMs: 1100,
  hoverColor: "#b08d57",
  hoverOpacity: 0.26,

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
// 9. BGM 설정 — 음원은 public/bgm/{worldId}.mp3 규약으로 넣어주세요.
//    파일이 없으면 콘솔 경고만 남기고 무음으로 동작합니다.
// -----------------------------------------------------------------------------
// -----------------------------------------------------------------------------
// 10. 촬영 결과 업로드 설정
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
export const BGM_CONFIG = {
  volume: 0.5,
  fadeInMs: 1200,
  fadeOutMs: 600,
} as const;
