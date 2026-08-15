#!/usr/bin/env node
// =============================================================================
// MCM PORTAL — World 배경 이미지 생성 스크립트
// -----------------------------------------------------------------------------
// OpenAI 이미지 모델(gpt-image-2)로 각 World 배경을 생성해
// public/worlds/{id}.webp 로 저장합니다.
//
// 사용법:
//   1) 프로젝트 루트에서 OpenAI API 키를 환경변수로 지정
//        export OPENAI_API_KEY="sk-..."
//   2) 실행
//        node scripts/generate-worlds.mjs            # 활성 4개 전부
//        node scripts/generate-worlds.mjs newyork_attitude   # 특정 World만
//
// 특징
//   - 의존성 없음(내장 fetch 사용). npm install 불필요.
//   - 결과가 마음에 안 들면 해당 World id 만 인자로 넘겨 다시 돌리면 됩니다
//     (같은 파일을 덮어씀).
//   - 배경은 07 화면에서 "사람이 앞에 합성되는" 용도라, 프롬프트에
//     인물 없음 + 가운데~아래 전경 비우기 + 시간대 팔레트를 명시했습니다.
// =============================================================================

import { writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "..", "public", "worlds");

const MODEL = "gpt-image-2";
// 키오스크는 풀스크린(가로)입니다. 16:9 에 가깝고 gpt-image-2 제약(16의 배수,
// 종횡비 1:3~3:1, 최대 3840x2160)을 만족하는 값. cover 로 크롭되므로 정확한
// 비율보다 "가로로 넓게" 가 중요합니다.
const SIZE = "1792x1024";
const QUALITY = "high";

// 모든 World 공통 스타일 — 합성용 배경이 지켜야 할 규칙.
const BASE_STYLE = [
  "Ultra-realistic cinematic travel photograph, shot on a full-frame camera, 35mm lens.",
  "First-person point of view standing at a scenic vantage point (rooftop terrace / overlook / open plaza) looking out at the city.",
  "IMPORTANT: absolutely NO people, NO human figures, NO silhouettes anywhere in the frame.",
  "Keep the lower-center foreground open, uncluttered and relatively simple — this is where a person will be composited in later.",
  "Depth of field with the skyline slightly soft in the distance. High-end, editorial, luxury fashion campaign mood.",
  "No text, no watermark, no logos, no borders.",
].join(" ");

// 각 World 의 장소·시간대·팔레트는 config/portal.config.ts 규약을 그대로 옮긴 것.
const WORLDS = {
  newyork_attitude: {
    displayName: "NEW YORK",
    prompt:
      "New York City at night, seen from a Manhattan rooftop terrace. Dark near-black sky at the top, dense steel-and-glass skyscrapers with cool bluish tones in the middle, and a warm red-amber streetlamp glow washing across the lower part of the scene (the signature NYC night look). Empire State direction, dramatic and bold, moody deep contrast.",
  },
  paris_dawn: {
    displayName: "PARIS",
    prompt:
      "Paris at foggy early daytime, seen from a Haussmann rooftop overlook. Overall bright and high-key: cool pale-blue misty sky above, soft light haze over cream Parisian stone rooftops and zinc roofs, the Eiffel Tower faint in the distance. Gentle, dreamy, elegant morning light, low contrast, airy and luminous.",
  },
  milano_terrace: {
    displayName: "MILANO",
    prompt:
      "Milan at golden hour, seen from an elegant open-air terrace with warm terracotta floor tiles. Amber glowing sky at the top fading to deep warm terracotta and burnt-orange tones lower down, Italian rooftops and the Duomo silhouette in the warm distance. Relaxed, sophisticated, sun-drenched late-afternoon Mediterranean warmth.",
  },
  seoul_neon: {
    displayName: "SEOUL",
    prompt:
      "Seoul at night, seen from a rooftop over a buzzing city district. Deep near-black purple sky at the top, transitioning through violet to vivid magenta-and-pink neon glow lower down. Korean city skyline with glowing signage and light trails, energetic and electric, fast-paced night-life mood. Distinct from a steel-blue look — this is a purple/magenta neon palette.",
  },
};

async function generateOne(id) {
  const world = WORLDS[id];
  if (!world) {
    console.warn(`  ⚠️  알 수 없는 World id: ${id} (건너뜀)`);
    return false;
  }

  const prompt = `${world.prompt}\n\n${BASE_STYLE}`;
  process.stdout.write(`  • ${id} (${world.displayName}) 생성 중... `);

  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      prompt,
      size: SIZE,
      quality: QUALITY,
      output_format: "webp",
      n: 1,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.log("실패");
    console.error(`    ↳ HTTP ${res.status}: ${text}`);
    return false;
  }

  const data = await res.json();
  const b64 = data?.data?.[0]?.b64_json;
  if (!b64) {
    console.log("실패");
    console.error("    ↳ 응답에 이미지 데이터가 없습니다:", JSON.stringify(data).slice(0, 300));
    return false;
  }

  const outPath = join(OUT_DIR, `${id}.webp`);
  await writeFile(outPath, Buffer.from(b64, "base64"));
  console.log(`완료 → public/worlds/${id}.webp`);
  return true;
}

async function main() {
  if (!process.env.OPENAI_API_KEY) {
    console.error("❌ OPENAI_API_KEY 환경변수가 없습니다. 먼저 설정하세요:");
    console.error('   export OPENAI_API_KEY="sk-..."');
    process.exit(1);
  }

  await mkdir(OUT_DIR, { recursive: true });

  const args = process.argv.slice(2);
  const ids = args.length > 0 ? args : Object.keys(WORLDS);

  console.log(`\nMCM PORTAL 배경 생성 — 모델 ${MODEL}, 사이즈 ${SIZE}`);
  console.log(`대상: ${ids.join(", ")}\n`);

  let ok = 0;
  for (const id of ids) {
    try {
      if (await generateOne(id)) ok += 1;
    } catch (err) {
      console.log("에러");
      console.error(`    ↳ ${err?.message ?? err}`);
    }
  }

  console.log(`\n끝났습니다. 성공 ${ok}/${ids.length}개.`);
  console.log("이제 npm run dev 로 확인해 보세요. 배경이 그라데이션 대신 실사로 뜹니다.\n");
}

main();
