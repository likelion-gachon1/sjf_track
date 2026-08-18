// =============================================================================
// POST /api/passport — MCM TRAVEL PASSPORT 의 AI 멘트 생성 (서버 전용)
// -----------------------------------------------------------------------------
// ⚠️ OpenAI 키는 **서버에서만** 읽습니다 (process.env.OPENAI_API_KEY).
//    절대 NEXT_PUBLIC_ 접두사를 붙이지 마세요 — 붙이면 브라우저 번들에 키가 노출됩니다.
//    클라이언트(StepMoment)는 이 라우트를 fetch 할 뿐, 키를 알지 못합니다.
//
// 반환: { travelType, reason }
//   travelType : 영문 대문자 2단어 여행자 아키타입 (예: "CULTURE NOMAD")
//   reason     : 한국어 카피 한 줄 (예: "대담한 컬러와 자유로운 이동성")
//
// 키가 없거나 OpenAI 호출이 실패하면 5xx 로 응답합니다. 클라이언트는 이때
// lib/passport.ts 의 폴백 문구로 자동 대체하므로 부스 화면은 절대 죽지 않습니다.
// =============================================================================

import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
// gpt-4o-mini 유지. gpt-4.1-mini로 시도했을 때 튜닝된 14~24자 길이 제약을 2/2
// 표본에서 상당한 마진(27자, 31자)으로 넘겨 되돌렸습니다 — 이 프롬프트는 4o-mini
// 기준으로 맞춰져 있습니다. 이 라우트는 체험 완료 시(09 화면) 1회만 호출되어
// 호출량이 적으므로, RPD 상한(Tier 1 기준 10,000/일)에 걸릴 위험도 낮습니다.
const MODEL = "gpt-4o-mini";

interface PassportRequestBody {
  colorwayLabel?: string;
  productName?: string;
  worldDisplayName?: string;
  worldName?: string;
  mood?: string;
  journey?: string;
  /** 04 무드 분석이 읽어낸 실제 착장 (선택) — 있으면 카피에 반영합니다. */
  outfitColorName?: string;
  outfitDescription?: string;
}

const MOOD_KO: Record<string, string> = {
  light: "가볍고 생기 있는",
  calm: "차분하고 분위기 있는",
  bold: "강렬하고 화려한",
};

const JOURNEY_KO: Record<string, string> = {
  explore: "도시 곳곳을 둘러보는",
  culture: "쇼핑과 문화를 즐기는",
  relax: "여유롭게 쉬는",
};

/**
 * 카피 다듬기 — 프롬프트로 못 막은 것만 결정적으로 정리합니다.
 *
 * 길이는 **자르지 않습니다.** 한국어를 글자 수로 자르면 단어 중간이 끊겨 오히려
 * 이상해지므로, 길이는 프롬프트에 맡기고 여기서는 카피 톤을 깨는 문장부호만 뗍니다
 * (여권 카드에 찍히는 한 줄이라 마침표가 붙으면 도장 느낌이 사라집니다).
 */
function normalizeReason(raw: unknown): string {
  return String(raw)
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[.。]+$/, "")
    .trim();
}

export async function POST(req: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    // 키 미설정 — 클라이언트가 폴백을 쓰도록 신호만 보냅니다.
    return NextResponse.json({ error: "no-api-key" }, { status: 503 });
  }

  let body: PassportRequestBody;
  try {
    body = (await req.json()) as PassportRequestBody;
  } catch {
    return NextResponse.json({ error: "bad-request" }, { status: 400 });
  }

  const moodKo = MOOD_KO[body.mood ?? ""] ?? "";
  const journeyKo = JOURNEY_KO[body.journey ?? ""] ?? "";

  const system = [
    "당신은 럭셔리 여행 가방 브랜드 MCM 의 카피라이터입니다.",
    "MCM 은 독일 뮌헨(MUNICH)에서 시작된 브랜드로, Travel/Mobility(여행·이동성) DNA 를 핵심 정체성으로 합니다.",
    "고객이 실제 MCM 제품을 들고 상상의 도시로 '여행'하는 경험의 여권(TRAVEL PASSPORT)에 찍을 문구를 만듭니다.",
    "반드시 JSON 객체만 반환하세요. 형식: {\"travelType\": string, \"reason\": string}",
    "travelType: 여행자 아키타입을 나타내는 영어 대문자 2단어 (예: CULTURE NOMAD, URBAN VOYAGER, NIGHT DRIFTER). 도시명·브랜드명은 넣지 마세요.",
    "reason: 제품 컬러 · 착장 · 도착 도시의 무드에서 재료를 골라 엮은 한국어 광고 카피 한 줄. 담백하고 세련되게. 시간대(밤/노을 등)는 직접 언급하지 마세요.",
    // 착장 정보가 함께 오면 "오늘 입고 온 옷"을 카피의 재료로 씁니다. 같은 제품·같은
    // 도시라도 손님마다 다른 문장이 나오게 하는 부분입니다.
    "고객의 오늘 착장 정보가 주어지면 그 옷의 색·톤을 카피에 살려, 옷과 가방이 어울리는 지점을 짚어 주세요.",
    "단, 외모·체형·나이·성별은 절대 언급하지 말고, '사진'이나 '분석' 같은 시스템 용어도 쓰지 마세요. 옷을 평가하거나 지적하지 말고 긍정적으로만 쓰세요.",
    // ⚠️ 길이·어미 규칙은 마지막에 둡니다. 재료(제품·착장·도시)가 늘어나면 모델이 셋을
    //    다 욱여넣어 24자를 넘기고 문장을 끝맺어 버리므로, 가장 마지막에 다시 못박습니다.
    // ⚠️ 하한을 지우면 모델이 "강렬한 블랙의 시크함"(11자)처럼 앙상하게 끊습니다.
    //    상한만큼 하한도 같이 못박아야 카피 밀도가 유지됩니다.
    "reason 의 길이는 **공백 포함 14~24자**입니다. 14자보다 짧으면 밋밋하고 24자를 넘으면 카드에서 두 줄로 밀립니다. 세 재료를 다 넣으려 하지 말고, 그 안에 들어갈 만큼만 골라 쓰세요 — 넘칠 것 같으면 도시를 빼세요.",
    "reason 은 문장이 아니라 카피입니다. 마침표를 붙이지 말고, '~습니다 / ~해요 / ~합니다' 같은 종결어미로 끝내지 마세요. 명사나 연결형으로 끊어 주세요.",
  ].join("\n");

  const user = [
    `동행 제품: ${body.colorwayLabel ?? ""} ${body.productName ?? ""}`.trim(),
    `도착 도시: ${body.worldDisplayName ?? ""} (${body.worldName ?? ""})`,
    `여행자의 분위기: ${moodKo}`,
    `여행 방식: ${journeyKo}`,
    // 값이 없으면 줄 자체를 넣지 않습니다 (빈 라벨이 프롬프트에 남지 않도록).
    ...(body.outfitColorName ? [`고객의 오늘 착장 메인 컬러: ${body.outfitColorName}`] : []),
    ...(body.outfitDescription ? [`착장에서 느껴지는 무드: ${body.outfitDescription}`] : []),
    "이 여행에 어울리는 travelType 과 reason 을 JSON 으로 만들어 주세요.",
  ].join("\n");

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12_000);

    const res = await fetch(OPENAI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        response_format: { type: "json_object" },
        temperature: 0.9,
        max_tokens: 120,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      const detail = await res.text();
      console.warn("[portal] OpenAI 응답 오류:", res.status, detail.slice(0, 200));
      return NextResponse.json({ error: "openai-error" }, { status: 502 });
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = data.choices?.[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(content) as { travelType?: string; reason?: string };

    if (!parsed.travelType || !parsed.reason) {
      return NextResponse.json({ error: "empty-completion" }, { status: 502 });
    }

    return NextResponse.json({
      travelType: String(parsed.travelType).toUpperCase().trim(),
      reason: normalizeReason(parsed.reason),
    });
  } catch (err) {
    console.warn("[portal] 여권 생성 실패:", err);
    return NextResponse.json({ error: "generation-failed" }, { status: 500 });
  }
}
