// =============================================================================
// MCM TRAVEL PASSPORT — 여권 데이터 조립 + AI 멘트 요청
// -----------------------------------------------------------------------------
// 09 YOUR MCM MOMENT 화면에서 보여줄 "여권" 데이터를 만듭니다.
//
//   출발지  : MUNICH  — MCM 창립 도시(고정). Travel/Mobility DNA 의 출발점입니다.
//   도착지  : 매칭된 World 의 displayName (SEOUL, NEW YORK ...)
//   동행 제품 : 컬러웨이 + 제품명 ("PINK STARK BACKPACK")
//   여행 유형 : mood × journey 로 만든 여행자 아키타입 라벨  ← AI 생성 (폴백 있음)
//   추천 이유 : 선택 전체를 엮은 카피 한 줄                  ← AI 생성 (폴백 있음)
//
// "실제 AI 연결"은 travelType / reason 두 줄뿐입니다. 나머지 세 줄은 이미 앱에 있는
// 값을 배치만 합니다. AI 파트는 서버 라우트(/api/passport)가 OpenAI 로 생성하고,
// 네트워크 실패·키 미설정·오프라인이면 아래 폴백으로 자동 대체돼 부스가 죽지 않습니다.
// =============================================================================

import type { ColorwayKey, JourneyKey, MoodKey } from "@/lib/types";

/** MCM 창립 도시. 모든 여행의 출발지로 고정합니다. */
export const PASSPORT_DEPARTURE = "MUNICH";

/** 여권 발급에 필요한 입력값 (09 화면의 상태에서 조립). */
export interface PassportInput {
  colorwayKey: ColorwayKey;
  /** "PINK" 처럼 대문자 라벨 */
  colorwayLabel: string;
  /** "Stark Backpack" */
  productName: string;
  /** 도착 도시 대문자 표기 — "SEOUL" */
  worldDisplayName: string;
  /** 도착 도시 한글/무드 표기 — "서울 네온" (AI 프롬프트 힌트용) */
  worldName: string;
  mood: MoodKey;
  journey: JourneyKey;
}

export interface PassportData {
  departure: string; // MUNICH
  arrival: string; // world.displayName
  travelType: string; // "CULTURE NOMAD"
  companion: string; // "PINK STARK BACKPACK"
  reason: string; // "대담한 컬러와 자유로운 이동성"
  /** 이 멘트가 실시간 AI 로 생성됐는지, 폴백 문구인지. */
  source: "ai" | "fallback";
}

/** "PINK" + "Stark Backpack" → "PINK STARK BACKPACK" */
export function buildCompanion(colorwayLabel: string, productName: string): string {
  return `${colorwayLabel} ${productName}`.toUpperCase();
}

// -----------------------------------------------------------------------------
// 폴백(오프라인/실패 시) — 결정적으로 계산합니다. 난수 없음.
// -----------------------------------------------------------------------------

/** 여행 유형 폴백: 분위기 × 여행 스타일 → 여행자 아키타입(영문 대문자). */
const FALLBACK_TRAVEL_TYPE: Record<MoodKey, Record<JourneyKey, string>> = {
  light: { explore: "FREE EXPLORER", culture: "BRIGHT WANDERER", relax: "EASY DRIFTER" },
  calm: { explore: "QUIET NOMAD", culture: "CULTURE NOMAD", relax: "SLOW TRAVELER" },
  bold: { explore: "URBAN VOYAGER", culture: "BOLD CURATOR", relax: "NIGHT DRIFTER" },
};

/** 추천 이유 폴백: 컬러웨이 성격 + MCM 의 이동성 DNA 를 엮습니다. */
const FALLBACK_COLORWAY_PHRASE: Record<ColorwayKey, string> = {
  pink: "대담한 컬러",
  beige: "절제된 실루엣",
};

export function fallbackTravelType(mood: MoodKey, journey: JourneyKey): string {
  return FALLBACK_TRAVEL_TYPE[mood][journey];
}

export function fallbackReason(colorway: ColorwayKey): string {
  return `${FALLBACK_COLORWAY_PHRASE[colorway]}와 자유로운 이동성`;
}

/** AI 없이 즉시 만들 수 있는 완전한 여권(폴백). AI 응답이 오면 두 줄만 덮어씁니다. */
export function buildFallbackPassport(input: PassportInput): PassportData {
  return {
    departure: PASSPORT_DEPARTURE,
    arrival: input.worldDisplayName,
    travelType: fallbackTravelType(input.mood, input.journey),
    companion: buildCompanion(input.colorwayLabel, input.productName),
    reason: fallbackReason(input.colorwayKey),
    source: "fallback",
  };
}

// -----------------------------------------------------------------------------
// 클라이언트에서 호출 — 서버 라우트에 AI 멘트를 요청하고, 실패하면 폴백을 씁니다.
// -----------------------------------------------------------------------------

/**
 * 여권 발급. departure/arrival/companion 은 로컬에서 즉시 조립하고,
 * travelType/reason 만 /api/passport 로 요청합니다. 어떤 실패에도 폴백으로 귀결됩니다.
 */
export async function requestPassport(input: PassportInput): Promise<PassportData> {
  const base = buildFallbackPassport(input);

  try {
    const res = await fetch("/api/passport", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!res.ok) throw new Error(`passport api ${res.status}`);

    const ai = (await res.json()) as { travelType?: string; reason?: string };
    if (ai?.travelType && ai?.reason) {
      return {
        ...base,
        travelType: ai.travelType.trim(),
        reason: ai.reason.trim(),
        source: "ai",
      };
    }
    // AI 응답이 비었으면 폴백 유지.
    return base;
  } catch (err) {
    console.warn("[portal] 여권 AI 멘트 실패 — 폴백 문구로 진행:", err);
    return base;
  }
}
