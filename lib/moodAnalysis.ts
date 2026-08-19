// AI 무드 분석 — 카메라 프레임 → 무드(설렘 / 여유 / 자신감)
// 실패 시 로컬 색 분석 폴백으로 자동 대체 — throw 하지 않습니다.

import { MATTING_CONFIG, MOOD_ANALYSIS_CONFIG } from "@/config/portal.config";
import { cbCrDistanceToKey, keyColorToCbCr } from "@/lib/chromaKey";
import { resolveMattingMode } from "@/lib/matting";
import type { MoodAnalysis, MoodKey, MoodLevel } from "@/lib/types";

// -----------------------------------------------------------------------------
// 1. 프레임 캡처
// -----------------------------------------------------------------------------

/** <video> 현재 프레임을 분석용 JPEG dataURL 로 캡처. 첫 프레임 전이면 null. */
export function captureAnalysisFrame(video: HTMLVideoElement): string | null {
  const sourceWidth = video.videoWidth;
  const sourceHeight = video.videoHeight;
  if (!sourceWidth || !sourceHeight) return null;

  const scale = Math.min(1, MOOD_ANALYSIS_CONFIG.captureWidth / sourceWidth);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(sourceWidth * scale));
  canvas.height = Math.max(1, Math.round(sourceHeight * scale));

  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", MOOD_ANALYSIS_CONFIG.jpegQuality);
}

// -----------------------------------------------------------------------------
// 2. 로컬 폴백 — 캔버스 픽셀만으로 판정 (네트워크·난수 없음)
// -----------------------------------------------------------------------------

/**
 * 0~255 RGB → 판정에 쓸 세 값.
 * 밝기: BT.601 체감 밝기(HSL L은 고채도에서 0.5로 눌림).
 * 채도: delta/max 순색도(HSL S는 밝은 저채도에서 부풀려짐).
 */
function rgbToTone(r: number, g: number, b: number): { h: number; chroma: number; lum: number } {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;

  // ITU-R BT.601 가중치 — 초록이 가장 밝게, 파랑이 가장 어둡게 느껴지는 걸 반영합니다.
  const lum = 0.299 * rn + 0.587 * gn + 0.114 * bn;
  const chroma = max === 0 ? 0 : delta / max;

  if (delta === 0) return { h: 0, chroma: 0, lum };

  let h: number;
  if (max === rn) h = ((gn - bn) / delta) % 6;
  else if (max === gn) h = (bn - rn) / delta + 2;
  else h = (rn - gn) / delta + 4;

  h *= 60;
  if (h < 0) h += 360;
  return { h, chroma, lum };
}

function toHex(r: number, g: number, b: number): string {
  const part = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0");
  return `#${part(r)}${part(g)}${part(b)}`;
}

/** 색 이름은 결과 카드에 한 단어로만 보이므로 대략적인 색상환 구간으로 충분합니다. */
function colorName(h: number, chroma: number, lum: number): string {
  if (lum >= 0.9) return "화이트";
  if (lum <= 0.1) return "블랙";
  if (chroma < 0.1) return lum > 0.5 ? "라이트 그레이" : "차콜";
  if (h < 15 || h >= 345) return "레드";
  if (h < 45) return lum > 0.5 ? "베이지" : "브라운";
  if (h < 70) return chroma > 0.7 ? "옐로우" : "카키";
  if (h < 160) return lum < 0.4 ? "올리브" : "그린";
  if (h < 200) return "민트";
  if (h < 250) return lum < 0.35 ? "네이비" : "블루";
  if (h < 290) return "퍼플";
  return "핑크";
}

function levelFromLum(lum: number): MoodLevel {
  if (lum >= MOOD_ANALYSIS_CONFIG.pastelMinLum) return "HIGH";
  if (lum <= MOOD_ANALYSIS_CONFIG.boldMaxLum) return "LOW";
  return "MEDIUM";
}

function levelFromChroma(chroma: number): MoodLevel {
  if (chroma >= MOOD_ANALYSIS_CONFIG.vividMinChroma) return "HIGH";
  if (chroma <= MOOD_ANALYSIS_CONFIG.pastelMinChroma) return "LOW";
  return "MEDIUM";
}

/** 웜톤 어스톤(베이지·아이보리·브라운·카키·올리브)이 모이는 색상환 구간. */
const EARTH_HUE_MIN = 20;
const EARTH_HUE_MAX = 70;

/**
 * 색 → 무드. 판정 순서: ① 어두움→자신감, ② 웜톤 어스톤→여유, ③ 파스텔|비비드→설렘, ④ 나머지→여유
 */
function classify(h: number, chroma: number, lum: number): MoodKey {
  const cfg = MOOD_ANALYSIS_CONFIG;

  if (lum <= cfg.boldMaxLum) return "bold";

  const isEarthTone = h >= EARTH_HUE_MIN && h <= EARTH_HUE_MAX && chroma < cfg.earthMaxChroma;
  if (isEarthTone) return "calm";

  // 순색도 하한을 함께 걸어 순백·무채색(화이트·그레이)이 "화사함"으로 새지 않게 합니다.
  const isPastel = lum >= cfg.pastelMinLum && chroma >= cfg.pastelMinChroma;
  const isVivid = chroma >= cfg.vividMinChroma;
  if (isPastel || isVivid) return "light";

  return "calm";
}

const LOCAL_DESCRIPTION: Record<MoodKey, (color: string) => string> = {
  light: (color) => `화사한 ${color} 톤에서 밝고 설레는 에너지가 느껴집니다.`,
  calm: (color) => `부드러운 ${color} 톤에서 편안하고 여유로운 무드가 느껴집니다.`,
  bold: (color) => `깊은 ${color} 톤에서 단단하고 당당한 자신감이 느껴집니다.`,
};

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("분석용 프레임을 다시 읽지 못했습니다"));
    img.src = dataUrl;
  });
}

/**
 * 크로마키 모드에서 그린 스크린 픽셀을 걸러내기 위한 키 색상.
 * 크로마키 모드가 아니면 null(가드 끔).
 */
function greenGuard(): { key: [number, number]; threshold: number } | null {
  if (resolveMattingMode() !== "chromakey") return null;
  const { keyColor, similarity, smoothness } = MATTING_CONFIG.chromaKey;
  return { key: keyColorToCbCr(keyColor), threshold: similarity + smoothness };
}

function averageColor(
  pixels: Uint8ClampedArray,
  stride: number,
  guard: { key: [number, number]; threshold: number } | null
): { r: number; g: number; b: number; count: number } {
  let rSum = 0;
  let gSum = 0;
  let bSum = 0;
  let count = 0;
  for (let i = 0; i < pixels.length; i += stride) {
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];
    if (guard && cbCrDistanceToKey(r, g, b, guard.key) < guard.threshold) continue;
    rSum += r;
    gSum += g;
    bSum += b;
    count += 1;
  }
  if (count === 0) return { r: 0, g: 0, b: 0, count: 0 };
  return { r: rSum / count, g: gSum / count, b: bSum / count, count };
}

/**
 * 캔버스 픽셀만으로 무드를 판정합니다 (AI 실패 시 폴백).
 *
 * 프레임 전체가 아니라 `MOOD_ANALYSIS_CONFIG.sampleRegion` 영역 — 화면 가운데
 * 아래쪽, 즉 상의가 오는 자리 — 만 봅니다. 얼굴·머리카락·뒷배경이 섞이면 평균이
 * 흐려지기 때문입니다. 같은 사진은 항상 같은 결과가 나옵니다(난수 없음).
 *
 * 크로마키 모드에서는 그 위에 **그린 스크린 가드**가 한 겹 더 붙습니다(greenGuard).
 */
export async function analyzeMoodLocally(dataUrl: string): Promise<MoodAnalysis> {
  const img = await loadImage(dataUrl);
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;

  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return neutralMoodAnalysis();
  ctx.drawImage(img, 0, 0);

  const region = MOOD_ANALYSIS_CONFIG.sampleRegion;
  const sx = Math.round(canvas.width * region.x);
  const sy = Math.round(canvas.height * region.y);
  const sw = Math.max(1, Math.round(canvas.width * region.w));
  const sh = Math.max(1, Math.round(canvas.height * region.h));

  let pixels: Uint8ClampedArray;
  try {
    pixels = ctx.getImageData(sx, sy, sw, sh).data;
  } catch {
    // 캔버스가 오염된 경우(교차 출처 프레임 등) — 중립값으로 진행합니다.
    return neutralMoodAnalysis();
  }

  // 4픽셀 간격으로 샘플링 — 정확도는 그대로면서 큰 프레임에서도 즉시 끝납니다.
  const stride = 4 * 4;

  // 1차: 그린 스크린 픽셀을 뺀 평균.
  let avg = averageColor(pixels, stride, greenGuard());
  // 남은 표본이 너무 적으면(손님이 프레임 밖이거나 초록 옷을 입은 경우) 가드를 풀고
  // 예전처럼 전체 평균을 씁니다 — 판정이 이상해질지언정 **실패하지는 않습니다.**
  if (avg.count < Math.ceil(pixels.length / stride / 5)) {
    avg = averageColor(pixels, stride, null);
  }
  if (avg.count === 0) return neutralMoodAnalysis();

  const { r, g, b } = avg;
  const { h, chroma, lum } = rgbToTone(r, g, b);

  const mood = classify(h, chroma, lum);
  const name = colorName(h, chroma, lum);

  return {
    mood,
    dominantColor: { name, hex: toHex(r, g, b) },
    brightnessLevel: levelFromLum(lum),
    saturationLevel: levelFromChroma(chroma),
    description: LOCAL_DESCRIPTION[mood](name),
    source: "local",
  };
}

/**
 * 색을 읽을 수단이 아예 없을 때의 최후 결과 — 가운데 값인 "여유"로 진행합니다.
 * (카메라를 못 켠 경우, 캔버스가 오염된 경우, 픽셀 샘플이 0개인 경우)
 */
export function neutralMoodAnalysis(): MoodAnalysis {
  return {
    mood: "calm",
    dominantColor: { name: "뉴트럴", hex: "#c9c2b6" },
    brightnessLevel: "MEDIUM",
    saturationLevel: "MEDIUM",
    description: "차분하고 편안한 톤의 여유로운 무드로 안내해 드릴게요.",
    source: "local",
  };
}

// -----------------------------------------------------------------------------
// 3. 서버 라우트 호출 (+ 자동 폴백)
// -----------------------------------------------------------------------------

/** /api/analyze-mood 가 돌려주는 형태 — 내부 키(light/calm/bold)로 변환된 상태입니다. */
interface MoodApiResponse {
  mood?: MoodKey;
  dominantColor?: { name?: string; hex?: string };
  brightnessLevel?: MoodLevel;
  saturationLevel?: MoodLevel;
  description?: string;
}

const VALID_MOODS: MoodKey[] = ["light", "calm", "bold"];
const VALID_LEVELS: MoodLevel[] = ["HIGH", "MEDIUM", "LOW"];

/**
 * 무드 판정. 서버 라우트(OpenAI Vision)를 먼저 시도하고, 키 미설정·요청 한도·
 * 오프라인·타임아웃 등 **어떤 실패에도 로컬 색 분석 결과로 대체**합니다.
 * 호출 측에서 try/catch 할 필요가 없습니다.
 */
export async function requestMoodAnalysis(dataUrl: string): Promise<MoodAnalysis> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), MOOD_ANALYSIS_CONFIG.timeoutMs);

  try {
    const res = await fetch("/api/analyze-mood", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageBase64: dataUrl }),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`analyze-mood api ${res.status}`);

    const ai = (await res.json()) as MoodApiResponse;
    if (!ai.mood || !VALID_MOODS.includes(ai.mood) || !ai.description) {
      throw new Error("analyze-mood 응답이 비었습니다");
    }

    return {
      mood: ai.mood,
      dominantColor: {
        name: ai.dominantColor?.name?.trim() || "뉴트럴",
        hex: normalizeHex(ai.dominantColor?.hex) ?? "#c9c2b6",
      },
      brightnessLevel: VALID_LEVELS.includes(ai.brightnessLevel as MoodLevel)
        ? (ai.brightnessLevel as MoodLevel)
        : "MEDIUM",
      saturationLevel: VALID_LEVELS.includes(ai.saturationLevel as MoodLevel)
        ? (ai.saturationLevel as MoodLevel)
        : "MEDIUM",
      description: ai.description.trim(),
      source: "ai",
    };
  } catch (err) {
    console.warn("[portal] AI 무드 분석 실패 — 로컬 색 분석으로 진행:", err);
    try {
      return await analyzeMoodLocally(dataUrl);
    } catch (localErr) {
      console.warn("[portal] 로컬 무드 분석도 실패 — 기본값으로 진행:", localErr);
      return neutralMoodAnalysis();
    }
  } finally {
    clearTimeout(timer);
  }
}

/** AI가 "#fff" 나 "ff8ab3" 처럼 흘려 쓰는 경우가 있어 6자리 HEX 로 맞춥니다. */
function normalizeHex(value?: string): string | null {
  if (!value) return null;
  const raw = value.trim().replace(/^#/, "");
  if (/^[0-9a-fA-F]{3}$/.test(raw)) {
    return `#${raw[0]}${raw[0]}${raw[1]}${raw[1]}${raw[2]}${raw[2]}`;
  }
  if (/^[0-9a-fA-F]{6}$/.test(raw)) return `#${raw}`;
  return null;
}
