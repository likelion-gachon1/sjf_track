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
const MODEL = "gpt-4o-mini";

interface PassportRequestBody {
  colorwayLabel?: string;
  productName?: string;
  worldDisplayName?: string;
  worldName?: string;
  mood?: string;
  journey?: string;
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
    "reason: 제품의 컬러/실루엣과 도착 도시의 무드를 엮은 한국어 광고 카피 한 줄. 12~24자, 마침표 없이, 담백하고 세련되게. 시간대(밤/노을 등)는 직접 언급하지 마세요.",
  ].join("\n");

  const user = [
    `동행 제품: ${body.colorwayLabel ?? ""} ${body.productName ?? ""}`.trim(),
    `도착 도시: ${body.worldDisplayName ?? ""} (${body.worldName ?? ""})`,
    `여행자의 분위기: ${moodKo}`,
    `여행 방식: ${journeyKo}`,
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
      reason: String(parsed.reason).trim(),
    });
  } catch (err) {
    console.warn("[portal] 여권 생성 실패:", err);
    return NextResponse.json({ error: "generation-failed" }, { status: 500 });
  }
}
