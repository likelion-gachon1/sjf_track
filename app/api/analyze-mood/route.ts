// =============================================================================
// POST /api/analyze-mood — 의상 사진 → 무드 판정 (서버 전용)
// -----------------------------------------------------------------------------
// ⚠️ OpenAI 키는 **서버에서만** 읽습니다 (process.env.OPENAI_API_KEY).
//    절대 NEXT_PUBLIC_ 접두사를 붙이지 마세요 — 붙이면 브라우저 번들에 키가 노출됩니다.
//    클라이언트(StepMood)는 이 라우트를 fetch 할 뿐, 키를 알지 못합니다.
//
// 입력: { imageBase64 }  — 04 화면에서 캡처한 프레임(dataURL 또는 순수 base64)
// 반환: { mood, dominantColor, brightnessLevel, saturationLevel, description }
//       mood 는 **내부 키(light | calm | bold)** 로 변환해서 돌려줍니다.
//
// ⚠️ 이 라우트는 이미지를 **생성하지 않습니다.** Free Tier 키로는 이미지 생성
//    (gpt-image / DALL·E)을 쓸 수 없어서, AI는 "보고 판정하는" 용도로만 씁니다.
//    Vision 입력은 일반 chat.completions 호출이라 제약 없이 동작합니다.
//
// 실패하면 5xx 로 응답합니다. 클라이언트는 이때 lib/moodAnalysis.ts 의 로컬 색
// 분석 폴백으로 자동 대체하므로 부스 화면은 절대 죽지 않습니다.
// =============================================================================

import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
// gpt-5.6-luna: OpenAI가 "cost-sensitive, high-volume, latency-sensitive workloads"
// 용도로 설계한 모델 — 정확히 이 라우트(부스에서 매 손님마다 호출되는 3분류 작업)의
// 요구사항입니다. reasoning_effort: "none" 으로 내부 추론을 꺼서 응답을 빠르게
// 받습니다(분류/추출 작업엔 추론이 오히려 지연만 늘림 — OpenAI 가이드 권장사항).
// gpt-4o-mini 대비 RPD(일일 요청) 상한이 계정 대시보드에 따로 안 잡혀 있어
// 부스 운영 중 한도 소진 위험도 줄어듭니다.
const MODEL = "gpt-5.6-luna";
const REASONING_EFFORT = "none";
const TIMEOUT_MS = 12_000;

interface AnalyzeMoodRequestBody {
  imageBase64?: string;
}

/**
 * AI 분류 토큰 → 내부 무드 키.
 *
 * ⚠️ 토큰 이름에 "CALM" 을 쓰지 마세요. 내부 키 `calm` 은 **여유(RELAXATION)** 라서
 *    스펙 문서의 CALM(차분/다크톤)과 이름이 겹쳐 정반대로 매핑되는 지뢰가 됩니다.
 *    세 번째 무드는 화면 라벨이 "자신감"이므로 CONFIDENCE 로 통일합니다.
 */
const MOOD_TOKEN_TO_KEY: Record<string, "light" | "calm" | "bold"> = {
  EXCITEMENT: "light",
  RELAXATION: "calm",
  CONFIDENCE: "bold",
};

export async function POST(req: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    // 키 미설정 — 클라이언트가 로컬 폴백을 쓰도록 신호만 보냅니다.
    return NextResponse.json({ error: "no-api-key" }, { status: 503 });
  }

  let body: AnalyzeMoodRequestBody;
  try {
    body = (await req.json()) as AnalyzeMoodRequestBody;
  } catch {
    return NextResponse.json({ error: "bad-request" }, { status: 400 });
  }

  const image = body.imageBase64;
  if (!image) {
    return NextResponse.json({ error: "image-required" }, { status: 400 });
  }
  const imageUrl = image.startsWith("data:") ? image : `data:image/jpeg;base64,${image}`;

  const system = [
    "당신은 럭셔리 여행 가방 브랜드 MCM 의 스타일 분석 AI 입니다.",
    "사진 속 인물이 입은 **의상의 색(명도·채도·톤)** 을 보고 무드를 판정합니다.",
    "얼굴·외모·나이·성별·인종은 판단하지 말고, 오직 의상의 색감과 스타일만 보세요.",
    "반드시 JSON 객체만 반환하세요. 형식:",
    '{"mood": "EXCITEMENT"|"RELAXATION"|"CONFIDENCE", "dominantColor": {"name": string, "hex": string}, "brightnessLevel": "HIGH"|"MEDIUM"|"LOW", "saturationLevel": "HIGH"|"MEDIUM"|"LOW", "description": string}',
    "",
    "무드 분류 기준 (셋 중 정확히 하나):",
    "- EXCITEMENT : 고명도·고채도. 비비드, 화사한 파스텔, 포인트 컬러. 활기차고 생동감 있는 룩.",
    "- RELAXATION : 중명도·내추럴 채도. 베이지·아이보리·카키·올리브·소프트 그레이, 웜톤 어스톤, 편안한 니트.",
    "- CONFIDENCE : 저명도·모노톤. 블랙·딥네이비·차콜·다크브라운, 미니멀하고 시크한 룩.",
    "",
    "dominantColor.name 은 한국어 한 단어(예: 아이보리, 차콜, 핑크), hex 는 #RRGGBB 6자리.",
    "description 은 한국어 한 문장(35자 이내). 의상 색을 언급하며 왜 그 무드인지 설명하고, 사람의 외모는 언급하지 마세요.",
  ].join("\n");

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

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
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "이 사진 속 의상의 명도·채도·색감을 분석해 무드를 판정해 주세요.",
              },
              // detail: "low" — 색만 보면 되므로 저해상도로 충분합니다(토큰·지연 절약).
              { type: "image_url", image_url: { url: imageUrl, detail: "low" } },
            ],
          },
        ],
        response_format: { type: "json_object" },
        temperature: 0.4,
        // ⚠️ gpt-5.6 계열은 `max_tokens` 를 거부합니다(400 invalid_request_error) —
        //    `max_completion_tokens` 로 이름이 바뀌었습니다. gpt-4o-mini 시절 코드를
        //    그대로 옮기면서 놓치기 쉬운 지점입니다.
        max_completion_tokens: 200,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      const detail = await res.text();
      console.warn("[portal] OpenAI 무드 분석 응답 오류:", res.status, detail.slice(0, 200));
      return NextResponse.json({ error: "openai-error" }, { status: 502 });
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = data.choices?.[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(content) as {
      mood?: string;
      dominantColor?: { name?: string; hex?: string };
      brightnessLevel?: string;
      saturationLevel?: string;
      description?: string;
    };

    const mood = MOOD_TOKEN_TO_KEY[String(parsed.mood ?? "").toUpperCase().trim()];
    if (!mood || !parsed.description) {
      // 정의되지 않은 토큰이 오면 억지로 매핑하지 않고 폴백에 맡깁니다.
      console.warn("[portal] 무드 분석 응답을 해석하지 못했습니다:", content.slice(0, 200));
      return NextResponse.json({ error: "empty-completion" }, { status: 502 });
    }

    return NextResponse.json({
      mood,
      dominantColor: {
        name: String(parsed.dominantColor?.name ?? "").trim(),
        hex: String(parsed.dominantColor?.hex ?? "").trim(),
      },
      brightnessLevel: String(parsed.brightnessLevel ?? "").toUpperCase().trim(),
      saturationLevel: String(parsed.saturationLevel ?? "").toUpperCase().trim(),
      description: String(parsed.description).trim(),
    });
  } catch (err) {
    console.warn("[portal] 무드 분석 실패:", err);
    return NextResponse.json({ error: "analysis-failed" }, { status: 500 });
  }
}
