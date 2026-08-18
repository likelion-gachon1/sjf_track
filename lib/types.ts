// Shared types for the MCM PORTAL flow.
// Editable content that USES these types lives in /config/portal.config.ts and
// /config/products.config.ts — this file only defines the shapes, it shouldn't
// need to change often.

/**
 * 04 MOOD 화면의 결과값. 내부적으로 TimeOfDay 축으로 번역됩니다.
 * ⚠️ 사용자가 직접 고르지 않고 **카메라로 찍은 의상을 AI가 분석해** 정합니다
 *    (lib/moodAnalysis.ts). 키 이름과 라벨은 수동 선택 시절 그대로 유지합니다 —
 *    배경 파일명 토큰(sul/calm/confidence)과 월드 매핑이 이 값을 쓰기 때문입니다.
 */
export type MoodKey = "light" | "calm" | "bold";

/** 03 TRAVEL STYLE 화면의 선택지. 내부적으로 SceneType 축으로 번역됩니다. */
export type JourneyKey = "explore" | "culture" | "relax";

/** 명도·채도의 3단계 표기. AI 응답과 로컬 폴백이 같은 척도를 씁니다. */
export type MoodLevel = "HIGH" | "MEDIUM" | "LOW";

/**
 * 04 MOOD 화면에서 도출된 무드 분석 결과.
 *
 * `source` 는 이 결과가 실제 AI(OpenAI Vision) 응답인지, 네트워크·키 문제로 내려간
 * 로컬 색 분석 폴백인지를 구분합니다 (여권 PassportData.source 와 같은 규약).
 */
export interface MoodAnalysis {
  mood: MoodKey;
  /** 의상에서 뽑은 대표 색 — 결과 화면의 컬러 칩에 씁니다. */
  dominantColor: { name: string; hex: string };
  brightnessLevel: MoodLevel;
  saturationLevel: MoodLevel;
  /** 왜 이 무드인지 한 줄 설명 (한국어). */
  description: string;
  source: "ai" | "local";
}

/** 02 PRODUCT 화면에서 고르는 컬러웨이. */
export type ColorwayKey = "pink" | "beige";

// -----------------------------------------------------------------------------
// World 결정 축
// 사용자는 장소나 시간대를 직접 고르지 않습니다. 분위기(MoodKey)가 timeOfDay,
// 여행 스타일(JourneyKey)이 sceneType 으로 매핑되어 World가 결정됩니다.
// ⚠️ 이 두 축은 내부 축이므로 화면에 드러내지 마세요.
// -----------------------------------------------------------------------------
export type TimeOfDay = "day" | "golden" | "night";
export type SceneType = "street" | "culture" | "leisure";

export type WorldId =
  | "paris_dawn"
  | "seoul_neon"
  | "milano_terrace"
  | "newyork_attitude";

export type StepId =
  | "intro" // 01 START
  | "product" // 02 PRODUCT       (01/03)
  | "journey" // 03 TRAVEL STYLE  (02/03)
  | "mood" // 04 MOOD             (03/03) — 카메라 촬영 + AI 무드 분석
  | "opening" // 05 PORTAL OPENING (프리로드 구간)
  | "reveal" // 06 WORLD REVEAL
  | "experience" // 07 EXPERIENCE
  | "moment" // 09 YOUR MCM MOMENT (촬영 사진 확인)
  | "handoff"; // 08 QR HANDOFF — 부스의 마지막 화면
// 관심 제품 화면(TODAY'S MCM / SAVED ITEMS)은 부스가 아니라 QR 로 넘어간 폰에서
// 열립니다 — app/m/[sessionId]/shop/page.tsx

/**
 * 인물을 배경에서 분리하는 방식.
 *
 * - `"segmentation"` — MediaPipe SelfieSegmentation (**현재 동작 방식**).
 *   배경에 아무 제약이 없는 대신, 프레임마다 마스크를 새로 추정하므로 인물이
 *   움직이면 경계가 미세하게 흔들리고 그 틈으로 실제 배경이 살짝 비칩니다.
 * - `"chromakey"` — 그린 스크린 + 색상 키잉 (**부스 제작 시 적용 예정**).
 *   색이라는 고정 기준으로 자르기 때문에 움직여도 경계가 흔들리지 않습니다.
 *
 * ⚠️ `"chromakey"` 는 아직 구현되지 않았습니다. `MATTING_CONFIG` 주석과
 *    README "다음 단계: 그린 스크린 크로마키" 를 참고하세요.
 */
export type MattingMode = "segmentation" | "chromakey";

/** 캔버스에서 CSS gradient 를 그대로 재현하기 위한 스톱. */
export interface GradientStop {
  /** 0~1 */
  offset: number;
  color: string;
}

export interface Colorway {
  key: ColorwayKey;
  /** 카드에 표기되는 라벨 — "PINK" */
  label: string;
  /** 제품 이미지가 없을 때의 플레이스홀더 색이자 World 포인트 컬러. */
  hex: string;
  /** /products/*.png (없으면 hex 플레이스홀더) */
  image?: string;
  storeUrl?: string;
}

export interface Product {
  id: string;
  /** "Stark Backpack" */
  name: string;
  /** "in Visetos" */
  line: string;
  /** 원화 정가 — TODAY'S MCM 카드에 표기. 없으면 가격을 숨깁니다. */
  price?: number;
  colorways: Colorway[];
}

/**
 * SAVED ITEMS(관심 제품) 목록에 보여줄 샘플 아이템.
 * ⚠️ 프로토타입용 예시 데이터입니다 — 실제 위시리스트 연동 전까지 고정 노출됩니다.
 */
export interface SavedItem {
  id: string;
  /** "Aren Crossbody" */
  name: string;
  /** "Black" 처럼 카드 하단 보조 표기 */
  line: string;
  /** 이미지 없을 때의 플레이스홀더 색. */
  hex: string;
  /** /products/*.png (없으면 hex 플레이스홀더) */
  image?: string;
}

export interface WorldDef {
  id: WorldId;
  /** 06 리빌 화면의 대문자 표기 — "NEW YORK" */
  displayName: string;
  /** 한글 표기 — "뉴욕 애티튜드" */
  name: string;
  /** Short line shown under the world name on cards/thumbnails. */
  tagline: string;
  /** 분위기가 반영되는 내부 축 (화면 비노출). */
  timeOfDay: TimeOfDay;
  /** 여행 스타일이 반영되는 내부 축 (화면 비노출). */
  sceneType: SceneType;
  /** CSS gradient string, applied directly via style={{ backgroundImage }}. */
  gradient: string;
  /**
   * 07 캔버스 합성용. CSS 문자열을 파싱하는 대신 같은 값을 여기에 적어둡니다
   * (lib/composite.ts 가 createLinearGradient 로 재현). gradient 와 함께 고쳐주세요.
   */
  gradientStops: GradientStop[];
  /** gradient 의 각도(deg, CSS 기준). 생략하면 135. */
  gradientAngle?: number;
  /** /worlds/*.webp — 없으면 gradient 폴백 */
  backgroundImage?: string;
  /** /bgm/{worldId}.mp3 — 파일이 없어도 앱은 무음으로 정상 동작합니다. */
  bgm?: string;
  /** Which text color reads best on top of this gradient. */
  textOn: "light" | "dark";
}

export interface QuestionOption<K extends string> {
  key: K;
  label: string;
  /** 라벨 아래 작게 붙는 보조 설명. 없으면 라벨만 렌더링합니다. */
  description?: string;
}

export interface QuestionDef<K extends string> {
  id: "mood" | "journey";
  prompt: string;
  options: QuestionOption<K>[];
}

export interface SavedMoment {
  id: string;
  worldId: WorldId;
  savedAt: number;
  // 관심 제품 저장 여부는 부스가 알 수 없습니다 — 저장은 QR 로 넘어간 폰에서 일어납니다.
  /** 촬영 결과 JPEG dataURL (서버 업로드 없이 메모리에만 보관). */
  imageDataUrl: string;
}

export interface Answers {
  mood: MoodKey | null;
  journey: JourneyKey | null;
}
