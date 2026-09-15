// ATR 18개 라벨 중 실제 의류만 허용합니다. 얼굴(11), 머리카락(2), 팔/다리(12~15) 제외.
const GARMENT_LABELS = new Set([4, 5, 6, 7]); // Upper-clothes, Skirt, Pants, Dress

export interface NormalizedBounds {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface ClothingMetrics {
  coverage: number;
  bounds: NormalizedBounds | null;
  center: { x: number; y: number } | null;
  confidenceQualifiedPixels: number;
}

export type ClothingFraming = "no-garment" | "off-center" | "too-small" | "too-large" | "ready";

interface FramingConfig {
  minGuideCoverage: number;
  minAreaRatio: number;
  maxAreaRatio: number;
  centerToleranceX: number;
  centerToleranceY: number;
}

export function clothingMetrics(
  logits: Float32Array, dims: readonly number[],
  region: { x: number; y: number; w: number; h: number },
  confidence = 0.7,
): ClothingMetrics {
  const [batch, classes, height, width] = dims;
  if (batch !== 1 || classes !== 18 || logits.length !== classes * height * width) {
    throw new Error("Unexpected clothing model output");
  }
  const plane = width * height;
  let guideGarments = 0;
  let guideTotal = 0;
  let qualified = 0;
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  const guideLeft = Math.floor(region.x * width);
  const guideTop = Math.floor(region.y * height);
  const guideRight = Math.ceil((region.x + region.w) * width);
  const guideBottom = Math.ceil((region.y + region.h) * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      let label = 0;
      let best = -Infinity;
      for (let c = 0; c < classes; c++) {
        const score = logits[c * plane + i];
        if (score > best) { best = score; label = c; }
      }
      if (!GARMENT_LABELS.has(label)) continue;
      let sum = 0;
      for (let c = 0; c < classes; c++) sum += Math.exp(logits[c * plane + i] - best);
      if (1 / sum < confidence) continue;
      qualified++;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
      if (x >= guideLeft && x < guideRight && y >= guideTop && y < guideBottom) guideGarments++;
    }
  }
  guideTotal = Math.max(0, guideRight - guideLeft) * Math.max(0, guideBottom - guideTop);
  if (!qualified) {
    return { coverage: 0, bounds: null, center: null, confidenceQualifiedPixels: 0 };
  }
  const bounds = {
    x: minX / width,
    y: minY / height,
    w: (maxX - minX + 1) / width,
    h: (maxY - minY + 1) / height,
  };
  return {
    coverage: guideTotal ? guideGarments / guideTotal : 0,
    bounds,
    center: { x: bounds.x + bounds.w / 2, y: bounds.y + bounds.h / 2 },
    confidenceQualifiedPixels: qualified,
  };
}

/** 이전 호출부와 테스트 호환용 비율 계산. */
export function clothingCoverage(
  logits: Float32Array, dims: readonly number[],
  region: { x: number; y: number; w: number; h: number }, confidence = 0.7,
): number {
  return clothingMetrics(logits, dims, region, confidence).coverage;
}

export function evaluateClothingFraming(
  metrics: ClothingMetrics,
  region: { x: number; y: number; w: number; h: number },
  config: FramingConfig,
): ClothingFraming {
  if (!metrics.bounds || !metrics.center || metrics.confidenceQualifiedPixels === 0) return "no-garment";
  const area = metrics.bounds.w * metrics.bounds.h;
  if (area < config.minAreaRatio) return "too-small";
  if (area > config.maxAreaRatio) return "too-large";
  const targetX = region.x + region.w / 2;
  const targetY = region.y + region.h / 2;
  if (
    Math.abs(metrics.center.x - targetX) > config.centerToleranceX ||
    Math.abs(metrics.center.y - targetY) > config.centerToleranceY ||
    metrics.coverage < config.minGuideCoverage
  ) return "off-center";
  return "ready";
}

/** 3개의 새로운 프레임 모두에서 가이드의 45% 이상이 의류일 때만 시작. */
export function createClothingGate(requiredFrames = 3) {
  let hits = 0;
  return (accepted: boolean): number => {
    hits = accepted ? hits + 1 : 0;
    return Math.min(1, hits / Math.max(1, requiredFrames));
  };
}

/** 공개 모델의 preprocessor_config.json: RGB, ImageNet 정규화, CHW. */
export function clothingInput(pixels: Uint8ClampedArray): Float32Array {
  const count = pixels.length / 4;
  const tensor = new Float32Array(count * 3);
  const mean = [0.485, 0.456, 0.406];
  const std = [0.229, 0.224, 0.225];
  for (let c = 0; c < 3; c++) {
    for (let i = 0; i < count; i++) tensor[c * count + i] = (pixels[i * 4 + c] / 255 - mean[c]) / std[c];
  }
  return tensor;
}
