#!/usr/bin/env node
// =============================================================================
// MCM PORTAL — 이미지 일괄 생성 스크립트 (통합본)
// -----------------------------------------------------------------------------
// OpenAI 이미지 모델(gpt-image-2)로 앱에 필요한 모든 이미지를 생성해 public/ 아래
// 알맞은 경로로 저장합니다. World 배경뿐 아니라 화면별 UI 이미지(비행기 창문 등)도
// 여기서 함께 만듭니다. 이 파일 하나면 됩니다(기존 generate-worlds.mjs 대체).
//
// 사용법 (프로젝트 루트에서):
//   export OPENAI_API_KEY="sk-..."
//   node scripts/generate-images.mjs                 # 전체 생성
//   node scripts/generate-images.mjs intro-window    # 특정 이미지 1개만
//   node scripts/generate-images.mjs newyork_attitude seoul_neon
//
// 특징
//   - 의존성 없음(내장 fetch). npm install 불필요.
//   - 결과가 별로면 그 key 만 인자로 넘겨 다시 돌리면 같은 파일을 덮어씁니다.
//   - 각 이미지는 "인물 없음 + 텍스트 없음" 을 프롬프트에 명시했습니다.
// =============================================================================

import { writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = join(__dirname, "..", "public");

const MODEL = "gpt-image-2";
const LANDSCAPE = "1792x1024"; // 풀스크린 배경용 (가로)
const QUALITY = "high";

// 모든 이미지 공통 규칙.
const BASE = [
  "Ultra-realistic cinematic photograph, luxury fashion campaign mood, editorial quality.",
  "IMPORTANT: absolutely NO people, NO human figures, NO silhouettes.",
  "No text, no watermark, no logos, no borders, no UI elements.",
].join(" ");

// 배경(합성용) 공통 규칙 — 사람이 앞에 합성되므로 아래-가운데를 비웁니다.
const BG = [
  BASE,
  "First-person point of view from a scenic vantage point (rooftop terrace / overlook) looking out at the city.",
  "Keep the lower-center foreground open and uncluttered — a person will be composited here later.",
].join(" ");

// ── 생성할 이미지 목록 ────────────────────────────────────────────────────────
// key: 인자로 지정할 이름 / out: public 아래 저장 경로 / size / prompt
const JOBS = {
  // ── 06/07 World 배경 (활성 4개) ──
  newyork_attitude: {
    out: "worlds/newyork_attitude.webp",
    size: LANDSCAPE,
    prompt:
      "New York City at night from a Manhattan rooftop terrace. Near-black sky, dense steel-and-glass skyscrapers with cool bluish tones, and a warm red-amber streetlamp glow across the lower part. Bold, moody, deep contrast. " +
      BG,
  },
  paris_dawn: {
    out: "worlds/paris_dawn.webp",
    size: LANDSCAPE,
    prompt:
      "Paris at foggy early daytime from a Haussmann rooftop overlook. Bright high-key: cool pale-blue misty sky, soft haze over cream stone rooftops, the Eiffel Tower faint in the distance. Dreamy, elegant, low contrast, luminous. " +
      BG,
  },
  milano_terrace: {
    out: "worlds/milano_terrace.webp",
    size: LANDSCAPE,
    prompt:
      "Milan at golden hour from an elegant open-air terrace with warm terracotta floor tiles. Amber glowing sky fading to burnt-orange, Italian rooftops and the Duomo silhouette in the warm distance. Relaxed, sun-drenched Mediterranean warmth. " +
      BG,
  },
  seoul_neon: {
    out: "worlds/seoul_neon.webp",
    size: LANDSCAPE,
    prompt:
      "Seoul at night from a rooftop over a buzzing district. Deep near-black purple sky transitioning through violet to vivid magenta-and-pink neon glow. Korean skyline with glowing signage and light trails, energetic, electric. Purple/magenta palette (not steel-blue). " +
      BG,
  },

  // ── 01 START 배경 ──
  "intro-window": {
    out: "ui/intro-window.webp",
    size: LANDSCAPE,
    prompt:
      "View through a rounded airplane cabin window, the window frame softly visible around the edges, looking out at a vast sea of golden sunset clouds with soft blue sky above. Warm, dreamy, hopeful travel mood, gentle sunlight flare. Vintage warm film tones. " +
      BASE,
  },
};

async function generateOne(key) {
  const job = JOBS[key];
  if (!job) {
    console.warn(`  ⚠️  알 수 없는 key: ${key} (건너뜀)`);
    return false;
  }

  process.stdout.write(`  • ${key} 생성 중... `);

  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      prompt: job.prompt,
      size: job.size,
      quality: QUALITY,
      output_format: "webp",
      n: 1,
    }),
  });

  if (!res.ok) {
    console.log("실패");
    console.error(`    ↳ HTTP ${res.status}: ${await res.text()}`);
    return false;
  }

  const data = await res.json();
  const b64 = data?.data?.[0]?.b64_json;
  if (!b64) {
    console.log("실패");
    console.error("    ↳ 이미지 데이터 없음:", JSON.stringify(data).slice(0, 300));
    return false;
  }

  const outPath = join(PUBLIC_DIR, job.out);
  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(outPath, Buffer.from(b64, "base64"));
  console.log(`완료 → public/${job.out}`);
  return true;
}

async function main() {
  if (!process.env.OPENAI_API_KEY) {
    console.error("❌ OPENAI_API_KEY 환경변수가 없습니다. 먼저 설정하세요:");
    console.error('   export OPENAI_API_KEY="sk-..."');
    process.exit(1);
  }

  const args = process.argv.slice(2);
  const keys = args.length > 0 ? args : Object.keys(JOBS);

  console.log(`\nMCM PORTAL 이미지 생성 — 모델 ${MODEL}`);
  console.log(`대상: ${keys.join(", ")}\n`);

  let ok = 0;
  for (const key of keys) {
    try {
      if (await generateOne(key)) ok += 1;
    } catch (err) {
      console.log("에러");
      console.error(`    ↳ ${err?.message ?? err}`);
    }
  }

  console.log(`\n끝났습니다. 성공 ${ok}/${keys.length}개.`);
  console.log("npm run dev 로 확인해 보세요.\n");
}

main();
