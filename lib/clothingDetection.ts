// ATR 18개 라벨 중 실제 의류만 허용합니다. 얼굴(11), 머리카락(2), 팔/다리(12~15) 제외.
const GARMENT_LABELS = new Set([4, 5, 6, 7]); // Upper-clothes, Skirt, Pants, Dress

export function clothingCoverage(
  logits: Float32Array, dims: readonly number[],
  region: { x: number; y: number; w: number; h: number },
): number {
  const [batch, classes, height, width] = dims;
  if (batch !== 1 || classes !== 18 || logits.length !== classes * height * width) {
    throw new Error("Unexpected clothing model output");
  }
  const plane = width * height;
  let garments = 0;
  let total = 0;
  for (let y = Math.floor(region.y * height); y < Math.ceil((region.y + region.h) * height); y++) {
    for (let x = Math.floor(region.x * width); x < Math.ceil((region.x + region.w) * width); x++) {
      const i = y * width + x;
      let label = 0;
      let best = -Infinity;
      for (let c = 0; c < classes; c++) {
        const score = logits[c * plane + i];
        if (score > best) { best = score; label = c; }
      }
      total++;
      if (!GARMENT_LABELS.has(label)) continue;
      let sum = 0;
      for (let c = 0; c < classes; c++) sum += Math.exp(logits[c * plane + i] - best);
      if (1 / sum >= 0.7) garments++;
    }
  }
  return total ? garments / total : 0;
}

/** 3개의 새로운 프레임 모두에서 가이드의 45% 이상이 의류일 때만 시작. */
export function createClothingGate() {
  let hits = 0;
  return (coverage: number): number => {
    hits = coverage >= 0.45 ? hits + 1 : 0;
    return Math.min(1, hits / 3);
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
