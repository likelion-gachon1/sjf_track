// MCM PORTAL 공용 타입. 이 타입을 쓰는 편집용 데이터는 /config 아래에 있습니다.

/**
 * 04 MOOD 결과값. 사용자가 고르지 않고 AI 가 의상을 보고 정합니다.
 * 키 이름은 배경 파일명 토큰·월드 매핑이 쓰므로 바꾸지 마세요.
 */
export type MoodKey = "light" | "calm" | "bold";

/** 03 TRAVEL STYLE 화면의 선택지. 내부적으로 SceneType 축으로 번역됩니다. */
export type JourneyKey = "explore" | "culture" | "relax";

/** 명도·채도의 3단계 표기. AI 응답과 로컬 폴백이 같은 척도를 씁니다. */
export type MoodLevel = "HIGH" | "MEDIUM" | "LOW";

/** 04 MOOD 분석 결과. `source` 는 AI 응답인지 로컬 폴백인지 구분합니다. */
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

// World 결정 축 — 사용자는 장소·시간대를 직접 고르지 않고, MoodKey 가 timeOfDay 로
// JourneyKey 가 sceneType 으로 번역되어 World 가 결정됩니다.
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

/**
 * 인물을 배경에서 분리하는 방식.
 *
 * - `"chromakey"` — 그린 스크린 + 색상 키잉. **현재 기본값.** 경계가 흔들리지 않고
 *   가방 스트랩도 살아나지만 **그린 스크린이 반드시 있어야** 합니다.
 * - `"segmentation"` — MediaPipe SelfieSegmentation. 배경 제약이 없는 대신 경계가
 *   흔들리고 가는 물체가 잘립니다. 그린 스크린이 없을 때의 폴백.
 *
 * 실행 중 전환은 `?matting=`, 키 컬러 실측은 `/calibrate`.
 */
export type MattingMode = "segmentation" | "chromakey";

/**
 * 07 인물 분리 루프의 상태. 두 방식(useSegmentation / useChromaKey)이 같은 값을
 * 돌려주므로 MirrorStage 가 어느 쪽이 돌고 있는지 몰라도 UI 를 그릴 수 있습니다.
 */
export type MattingStatus = "idle" | "loading" | "running" | "error";

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
  /** /worlds/*.png — 실사 배경 사진 경로 */
  backgroundImage?: string;
  /** 밝은 World(dark) vs 어두운 World(light). 컬러웨이 톤 보정에 사용. */
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
  /** 촬영 결과 JPEG dataURL (서버 업로드 없이 메모리에만 보관). */
  imageDataUrl: string;
}

export interface Answers {
  mood: MoodKey | null;
  journey: JourneyKey | null;
}
