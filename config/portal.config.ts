// =============================================================================
// MCM PORTAL — 편집용 설정 파일
// -----------------------------------------------------------------------------
// 팀에서 수정할 만한 값(카피, World 목록, 질문/선택지, 매핑 규칙)은 전부 이
// 파일에 모아뒀습니다. 컴포넌트 코드는 건드릴 필요 없이 아래 상수만 바꾸면
// 화면에 바로 반영됩니다.
// =============================================================================

import type {
  ColorKey,
  MoodKey,
  QuestionDef,
  WorldDef,
  WorldId,
  WorldMappingEntry,
} from "@/lib/types";

// -----------------------------------------------------------------------------
// 1. 브랜드 카피 — 인트로 화면 및 공용 문구
// -----------------------------------------------------------------------------
export const COPY = {
  brandName: "MCM PORTAL",
  introTagline: "거울은 지금의 나를 비추지만, PORTAL은 되고 싶은 나를 보여줍니다.",
  introSubline: "당신을 위한 브랜드 세계로 들어가 보세요.",
  consentLabel: "촬영된 이미지가 MCM PORTAL 경험 제공을 위해 사용되는 것에 동의합니다 (초상권 동의)",
  startButton: "시작하기",

  guidedGreeting: "안녕하세요, 오늘 당신에게 어울리는 세계를 찾아드릴게요.",
  guidedSubline: "두 가지 질문에 답하면 당신만의 World를 추천해 드립니다.",

  resultHeading: "당신을 위한 세계를 찾았습니다",
  resultPrimaryCta: "이 세계로 들어가기",
  resultAltLabel: "다른 세계도 살펴보세요",

  mirrorPlaceholder: "여기에 당신이 나타납니다",
  mirrorHint: "웹캠 합성은 다음 단계에서 연결됩니다",
  mirrorThumbLabel: "다른 세계로 바꿔보기",
  captureButton: "캡처",

  resultSaveHeading: "당신의 순간이 도착했습니다",
  saveMomentButton: "이 순간 저장하기",
  saveMomentDone: "저장 완료",
  saveProductButton: "관심 제품 저장하기",
  saveProductDone: "관심 제품으로 저장됨",
  galleryHeading: "오늘의 PORTAL 갤러리",
  gallerySubline: "이 부스에서 저장된 순간들이에요",
  qrLabel: "QR",
  qrCaption: "매장 스태프에게 문의해 주세요 (연동 예정)",
  restartButton: "처음으로",
} as const;

// -----------------------------------------------------------------------------
// 2. 취향 입력 질문 — Step 2 "Guided" 화면의 버튼형 질문 2개
// -----------------------------------------------------------------------------
export const MOOD_QUESTION: QuestionDef<MoodKey> = {
  id: "mood",
  prompt: "오늘 어떤 순간이 되고 싶나요?",
  options: [
    { key: "excitement", label: "설렘" },
    { key: "confidence", label: "당당함" },
    { key: "ease", label: "여유" },
    { key: "dreamy", label: "몽환" },
  ],
};

export const COLOR_QUESTION: QuestionDef<ColorKey> = {
  id: "color",
  prompt: "함께할 제품의 색은?",
  options: [
    { key: "pink", label: "핑크" },
    { key: "black", label: "블랙" },
    { key: "beige", label: "베이지" },
    { key: "vivid", label: "비비드" },
  ],
};

export const QUESTIONS = [MOOD_QUESTION, COLOR_QUESTION];

// -----------------------------------------------------------------------------
// 3. World 목록 — 실제 이미지가 없으므로 CSS 그라데이션으로 표현합니다.
//    gradient 값은 CSS linear-gradient 문법을 그대로 사용합니다.
//    textOn: 카드 위에 올라갈 글자색을 "light"(흰 글자) / "dark"(검정 글자) 중
//    어떤 걸로 쓸지 지정합니다.
// -----------------------------------------------------------------------------
export const WORLDS: Record<WorldId, WorldDef> = {
  paris_dawn: {
    id: "paris_dawn",
    name: "파리의 새벽",
    tagline: "안개 낀 새벽빛, 첫 만남의 설렘",
    gradient: "linear-gradient(135deg, #f6d9e3 0%, #fbeadd 50%, #ffffff 100%)",
    textOn: "dark",
  },
  santorini_breeze: {
    id: "santorini_breeze",
    name: "산토리니 브리즈",
    tagline: "하얀 벽과 바람이 만드는 여유",
    gradient: "linear-gradient(135deg, #d9e8ef 0%, #eef2ea 50%, #f7f3ea 100%)",
    textOn: "dark",
  },
  monaco_night: {
    id: "monaco_night",
    name: "모나코의 밤",
    tagline: "블랙과 골드, 압도하는 존재감",
    gradient: "linear-gradient(135deg, #0b0b0d 0%, #23201a 55%, #8a7245 100%)",
    textOn: "light",
  },
  newyork_attitude: {
    id: "newyork_attitude",
    name: "뉴욕 애티튜드",
    tagline: "도시의 밤, 강렬하게 존재하는 나",
    gradient: "linear-gradient(135deg, #1c1c1e 0%, #3a3a3c 50%, #b91c1c 100%)",
    textOn: "light",
  },
  tokyo_mirage: {
    id: "tokyo_mirage",
    name: "도쿄 미라주",
    tagline: "현실과 환상 사이, 몽환의 도시",
    gradient: "linear-gradient(135deg, #0f0f14 0%, #3b2a5e 50%, #7c5cbf 100%)",
    textOn: "light",
  },
  milano_terrace: {
    id: "milano_terrace",
    name: "밀라노 테라스",
    tagline: "나른한 오후 햇살, 우아한 여유",
    gradient: "linear-gradient(135deg, #e9dcc9 0%, #d8c3a5 50%, #f5ede1 100%)",
    textOn: "dark",
  },
  seoul_neon: {
    id: "seoul_neon",
    name: "서울 네온",
    tagline: "빠르게 뛰는 심장, 도시의 빛",
    gradient: "linear-gradient(135deg, #1a0b2e 0%, #5b21b6 45%, #ec4899 100%)",
    textOn: "light",
  },
  ibiza_sunset: {
    id: "ibiza_sunset",
    name: "이비자 선셋",
    tagline: "노을 아래 자유로운 리듬",
    gradient: "linear-gradient(135deg, #ff9a56 0%, #ff6f91 50%, #6a3093 100%)",
    textOn: "light",
  },
};

// -----------------------------------------------------------------------------
// 4. 매핑 규칙 — (오늘의 순간, 제품 색) 답변 조합 → 대표 World + 추천 이유
//    키 형식: `${moodKey}_${colorKey}`
//    16개 조합을 전부 채워야 결과 화면이 항상 정상 동작합니다.
// -----------------------------------------------------------------------------
export const WORLD_MAPPING: Record<string, WorldMappingEntry> = {
  dreamy_pink: { worldId: "paris_dawn", reason: "핑크 + 몽환 → 안개 낀 파리의 새벽, 꿈결 같은 첫 걸음" },
  excitement_pink: { worldId: "paris_dawn", reason: "핑크 + 설렘 → 부드러운 톤의 파리, 두근거리는 순간" },
  ease_pink: { worldId: "santorini_breeze", reason: "핑크 + 여유 → 산토리니의 노을 아래 편안한 산책" },
  confidence_pink: { worldId: "santorini_breeze", reason: "핑크 + 당당함 → 산토리니의 햇살, 나를 드러내는 순간" },

  confidence_black: { worldId: "monaco_night", reason: "블랙 + 당당함 → 모나코의 밤, 시선을 압도하는 존재감" },
  excitement_black: { worldId: "newyork_attitude", reason: "블랙 + 설렘 → 뉴욕의 심장, 짜릿한 도시의 밤" },
  dreamy_black: { worldId: "tokyo_mirage", reason: "블랙 + 몽환 → 도쿄의 미라주, 현실과 환상 사이" },
  ease_black: { worldId: "monaco_night", reason: "블랙 + 여유 → 모나코의 밤, 우아하게 머무는 시간" },

  ease_beige: { worldId: "milano_terrace", reason: "베이지 + 여유 → 밀라노 테라스의 오후, 나른한 햇살" },
  confidence_beige: { worldId: "milano_terrace", reason: "베이지 + 당당함 → 밀라노 테라스, 자신감 있는 우아함" },
  dreamy_beige: { worldId: "santorini_breeze", reason: "베이지 + 몽환 → 산토리니의 안개, 부드럽게 흐려지는 경계" },
  excitement_beige: { worldId: "milano_terrace", reason: "베이지 + 설렘 → 밀라노의 아침, 새로운 여정의 시작" },

  excitement_vivid: { worldId: "seoul_neon", reason: "비비드 + 설렘 → 서울의 네온, 심장이 빠르게 뛰는 밤" },
  confidence_vivid: { worldId: "newyork_attitude", reason: "비비드 + 당당함 → 뉴욕의 애티튜드, 강렬하게 존재하는 나" },
  ease_vivid: { worldId: "ibiza_sunset", reason: "비비드 + 여유 → 이비자의 노을, 자유로운 리듬" },
  dreamy_vivid: { worldId: "seoul_neon", reason: "비비드 + 몽환 → 서울의 네온 안개, 몽환적인 도시의 빛" },
};

// -----------------------------------------------------------------------------
// 5. 대안 World — 결과 화면에서 대표 World와 함께 보여줄 2개.
//    자기 자신을 제외한 다른 World 2개를 지정해 주세요.
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

// -----------------------------------------------------------------------------
// 헬퍼 — 컴포넌트에서 바로 쓰는 조회 함수들. 이 아래는 보통 수정할 필요 없음.
// -----------------------------------------------------------------------------
export function getWorldMapping(mood: MoodKey, color: ColorKey): WorldMappingEntry {
  const key = `${mood}_${color}`;
  const entry = WORLD_MAPPING[key];
  if (!entry) {
    // 매핑 누락 시 안전하게 첫 번째 World로 대체합니다 (개발 중 방어 코드).
    const fallbackId = Object.keys(WORLDS)[0] as WorldId;
    return { worldId: fallbackId, reason: "당신만의 세계를 찾았습니다" };
  }
  return entry;
}

export function getAlternateWorlds(worldId: WorldId): [WorldDef, WorldDef] {
  const [a, b] = WORLD_ALTERNATES[worldId];
  return [WORLDS[a], WORLDS[b]];
}
