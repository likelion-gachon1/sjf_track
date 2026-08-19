// =============================================================================
// POST /api/passport — MCM TRAVEL PASSPORT 의 AI 멘트 생성 (서버 전용)
// -----------------------------------------------------------------------------
// ⚠️ OpenAI 키는 **서버에서만** 읽습니다 (process.env.OPENAI_API_KEY).
//    절대 NEXT_PUBLIC_ 접두사를 붙이지 마세요 — 붙이면 브라우저 번들에 키가 노출됩니다.
//    클라이언트(StepMoment)는 이 라우트를 fetch 할 뿐, 키를 알지 못합니다.
//
// 반환: { travelType, reason }
//   travelType : 영문 대문자 2단어 여행자 아키타입 (예: "CULTURE NOMAD")
//   reason     : 한국어 카피 한 줄 (예: "코냑이 스며든 단단한 걸음")
//
// 키가 없거나 OpenAI 호출이 실패하면 5xx 로 응답합니다. 클라이언트는 이때
// lib/passport.ts 의 폴백 문구로 자동 대체하므로 부스 화면은 절대 죽지 않습니다.
// =============================================================================

import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
// gpt-5.6-terra. 제약(길이·어미) 있는 한국어 창작이라 분류용 Luna 보다 상위 티어가
// 값을 합니다 — 같은 프롬프트 6표본 비교에서 아래 제약 준수율이 갈렸습니다:
//   gpt-4o-mini   4/6 (19,15,15,18, 11, 13) — 재료를 버리고 하한이 깨짐
//   gpt-5.6-terra 6/6 (17,19,17,20,19,19)
// 체험당 1회 호출 + 짧은 프롬프트라 단가 차이는 무시할 수준입니다.
//
// ⚠️ gpt-5.6 계열이 거부하는 파라미터 2종 (둘 다 400 실측):
//    - max_tokens  → max_completion_tokens 로 이름이 바뀜
//    - temperature → 기본값 1 만 허용. 예전 0.9 로 억제하던 환각은 프롬프트로 막습니다.
const MODEL = "gpt-5.6-terra";
const REASONING_EFFORT = "low";

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
    "reason: 한국어 광고 카피 한 줄. 담백하고 세련되게. 시간대(밤/노을 등)는 직접 언급하지 마세요.",
    // ⚠️ 이 문단이 "블랙 시크에 코냑의 대담한 여정" 류의 나열을 막는 부분입니다.
    //    이전 프롬프트는 "재료를 골라 엮으라"고 했는데, 모델은 '엮다'를 슬롯 이어붙이기로
    //    읽어 [착장색]에 [제품색]의 [무드] 여정 골격을 매번 재생산했습니다.
    "**재료를 나열하지 마세요.** 주어진 값 중 하나만 축으로 잡고, 그것이 만들어 내는 태도·감각·움직임을 말하세요. 나머지는 버립니다.",
    "특히 '[착장색]에 [제품색]의 [형용사] 여정' 처럼 조사로 이어 붙인 골격은 금지입니다.",
    "'여정 · 여행 · 트래블 · 패스포트 · 이동' 같은 단어는 쓰지 마세요. 여권에 찍히는 문구라 이미 전제된 말이고, 글자 수만 먹습니다.",
    // 착장 정보가 함께 오면 "오늘 입고 온 옷"을 카피의 재료로 씁니다. 같은 제품·같은
    // 도시라도 손님마다 다른 문장이 나오게 하는 부분입니다.
    "고객의 오늘 착장 정보가 주어지면 그 옷의 색·톤을 카피의 축으로 삼아도 좋습니다.",
    // ⚠️ 지우지 마세요. 착장이 "아이보리"인데 "네이비에 스민…" 처럼 입력에 없는 색을
    //    지어낸 사례가 있었습니다(7회 중 1회). temperature 로는 못 막습니다(위 참고).
    "카피에 쓸 수 있는 색은 **위에 주어진 제품 컬러와 착장 컬러뿐**입니다. 주어지지 않은 색 이름을 새로 지어내지 마세요.",
    // ⚠️ 색 화이트리스트의 부작용 차단. 위 규칙만 있으면 "주어진 색은 다 써도 안전하다"로
    //    읽혀 제품색과 착장색을 한 문장에 같이 넣습니다 — 그 순간 나열이 됩니다.
    "색 이름은 **한 문장에 최대 하나**입니다. 제품 컬러와 착장 컬러를 같이 넣지 마세요. 색을 아예 안 써도 됩니다.",
    "단, 외모·체형·나이·성별은 절대 언급하지 말고, '사진'이나 '분석' 같은 시스템 용어도 쓰지 마세요. 옷을 평가하거나 지적하지 말고 긍정적으로만 쓰세요.",
    // ⚠️ 길이·어미 규칙은 마지막에 둡니다. 재료(제품·착장·도시)가 늘어나면 모델이 셋을
    //    다 욱여넣어 24자를 넘기고 문장을 끝맺어 버리므로, 가장 마지막에 다시 못박습니다.
    // ⚠️ 하한을 지우면 모델이 "강렬한 블랙의 시크함"(11자)처럼 앙상하게 끊습니다.
    //    상한만큼 하한도 같이 못박아야 카피 밀도가 유지됩니다.
    "reason 의 길이는 **공백 포함 14~24자**입니다. 14자보다 짧으면 밋밋하고 24자를 넘으면 카드에서 두 줄로 밀립니다. 세 재료를 다 넣으려 하지 말고, 그 안에 들어갈 만큼만 골라 쓰세요 — 넘칠 것 같으면 도시를 빼세요.",
    "reason 은 문장이 아니라 카피입니다. 마침표를 붙이지 말고, '~습니다 / ~해요 / ~합니다' 같은 종결어미로 끝내지 마세요. 명사나 연결형으로 끊어 주세요.",
    // ⚠️ 규칙만으로는 톤이 잡히지 않습니다. 나쁜 예는 **실제로 나왔던 출력**이라
    //    그대로 두세요 — 추상적인 금지보다 이쪽이 훨씬 잘 먹힙니다.
    "좋은 예: '코냑이 스며든 단단한 걸음' / '블랙 위에 얹은 조용한 확신' / '한 발 앞서 도착하는 감각'",
    "나쁜 예: '블랙 시크에 코냑의 대담한 여정' (재료 나열 + 색 두 개 + '여정'), '대담한 컬러와 자유로운 이동성' (누구에게나 해당되는 말)",
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
        reasoning_effort: REASONING_EFFORT,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        response_format: { type: "json_object" },
        // 추론 토큰도 이 예산을 함께 쓰므로 카피 길이(40토큰 남짓)보다 넉넉히 잡습니다.
        // 모자라면 응답이 빈 채로 끊겨 폴백 문구로 떨어집니다.
        max_completion_tokens: 1200,
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
