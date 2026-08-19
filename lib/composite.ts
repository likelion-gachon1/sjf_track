// 07 EXPERIENCE 합성 — 캔버스가 배경까지 직접 그리고, 촬영은 toDataURL.
// 화면 = 촬영 결과가 구조적으로 보장됩니다.

import { CAMERA_CONFIG, SEGMENTATION_CONFIG } from "@/config/portal.config";
import type { WorldDef } from "@/lib/types";
import type { Results } from "@mediapipe/selfie_segmentation";

type DrawableSource = HTMLCanvasElement | HTMLImageElement | ImageBitmap | HTMLVideoElement;

interface Size {
  width: number;
  height: number;
}

interface Rect extends Size {
  x: number;
  y: number;
}

function sourceSize(source: DrawableSource): Size {
  if ("naturalWidth" in source) {
    return { width: source.naturalWidth, height: source.naturalHeight };
  }
  if ("videoWidth" in source) {
    return { width: source.videoWidth, height: source.videoHeight };
  }
  return { width: source.width, height: source.height };
}

/**
 * object-fit: cover 와 동일한 배치 계산. 대상 영역을 꽉 채우도록 확대하고
 * 넘치는 부분은 캔버스 경계에서 잘립니다(가운데 정렬).
 *
 * 결과는 종횡비에만 의존하므로, 종횡비가 같은 소스(마스크와 원본 프레임)는
 * 각각 계산해도 항상 같은 사각형이 나와 정렬이 어긋나지 않습니다.
 */
export function coverRect(srcW: number, srcH: number, dstW: number, dstH: number): Rect {
  if (srcW <= 0 || srcH <= 0) return { x: 0, y: 0, width: dstW, height: dstH };
  const scale = Math.max(dstW / srcW, dstH / srcH);
  const width = srcW * scale;
  const height = srcH * scale;
  return { x: (dstW - width) / 2, y: (dstH - height) / 2, width, height };
}

function drawCover(
  ctx: CanvasRenderingContext2D,
  source: DrawableSource,
  dstW: number,
  dstH: number
): void {
  const { width: srcW, height: srcH } = sourceSize(source);
  const rect = coverRect(srcW, srcH, dstW, dstH);
  ctx.drawImage(source, rect.x, rect.y, rect.width, rect.height);
}

/**
 * CSS linear-gradient 의 그라데이션 선을 캔버스 좌표로 환산합니다.
 * (CSS 규격: 선 길이 = |w·sin(a)| + |h·cos(a)|, 0deg = 위쪽, 시계방향)
 */
function cssGradientLine(
  angleDeg: number,
  width: number,
  height: number
): [number, number, number, number] {
  const rad = (angleDeg * Math.PI) / 180;
  const dx = Math.sin(rad);
  const dy = -Math.cos(rad);
  const length = Math.abs(width * dx) + Math.abs(height * dy);
  const cx = width / 2;
  const cy = height / 2;
  return [
    cx - (dx * length) / 2,
    cy - (dy * length) / 2,
    cx + (dx * length) / 2,
    cy + (dy * length) / 2,
  ];
}

/**
 * World 배경을 캔버스에 그립니다. 실사 이미지가 준비돼 있으면 cover 로,
 * 없으면 gradientStops 로 CSS gradient 를 그대로 재현합니다.
 * (CSS 문자열을 파싱하지 않는 이유: 파싱 실패가 곧 "화면과 사진이 다름"이 되므로)
 */
export function drawWorldBackground(
  ctx: CanvasRenderingContext2D,
  world: WorldDef,
  width: number,
  height: number,
  image?: HTMLImageElement | null
): void {
  if (image && image.naturalWidth > 0) {
    drawCover(ctx, image, width, height);
    return;
  }

  const [x0, y0, x1, y1] = cssGradientLine(world.gradientAngle ?? 135, width, height);
  const gradient = ctx.createLinearGradient(x0, y0, x1, y1);
  for (const stop of world.gradientStops) {
    gradient.addColorStop(Math.min(1, Math.max(0, stop.offset)), stop.color);
  }
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
}

/**
 * 인물만 남은 레이어를 오프스크린 캔버스에 만듭니다. — **세그멘테이션 방식**
 *
 * copy / source-in 은 **반드시 오프스크린에서** 수행해야 합니다. 메인 캔버스에서
 * copy 를 쓰면 방금 그린 배경이 지워집니다.
 *
 * ── 인물 레이어는 두 방식 중 하나로 만들어집니다 ────────────────────────────
 * 이 함수가 세그멘테이션 쪽 진입점이고, 크로마키 쪽은 lib/chromaKey.ts 의
 * WebGL 렌더러가 같은 자리를 맡습니다. 그 뒤의 배경 합성(drawCompositeFrame)·
 * 좌우 반전·촬영(captureFrame) 은 인물 레이어가 **어떻게** 만들어졌는지 알지
 * 못하므로, 두 방식은 아래 파이프라인을 그대로 공유합니다.
 */
/**
 * 세그멘테이션 마스크 가장자리 정리용 CSS filter 문자열.
 * SEGMENTATION_CONFIG 값으로 blur(부드럽게) + brightness(안쪽 깎기) + contrast(배경 비침 제거)를 조합합니다.
 */
function buildMaskFilter(): string {
  // number 로 넓혀 받습니다: config 값이 `as const` 로 리터럴 타입이라, 아래의
  // "값이 1/100 이면 끔(off)" 가드가 리터럴 비교로 막히는 것을 피합니다(런타임 동작 동일).
  const featherPx: number = SEGMENTATION_CONFIG.featherPx;
  const maskErode: number = SEGMENTATION_CONFIG.maskErode;
  const maskContrast: number = SEGMENTATION_CONFIG.maskContrast;
  const parts: string[] = [];
  if (featherPx > 0) parts.push(`blur(${featherPx}px)`);
  if (maskErode !== 1) parts.push(`brightness(${maskErode})`);
  if (maskContrast !== 100) parts.push(`contrast(${maskContrast}%)`);
  return parts.length > 0 ? parts.join(" ") : "none";
}

export function drawPersonLayer(
  personCtx: CanvasRenderingContext2D,
  results: Results,
  width: number,
  height: number
): void {
  // 1) 마스크를 알파 채널로 깔기.
  //    blur           = 경계를 부드럽게(계단현상 완화)
  //    brightness(<1) = 경계를 안쪽으로 살짝 깎아 뒷배경 테두리 제거 (erode)
  //    contrast(높게) = 반투명 회색 띠를 사람/배경 둘 중 하나로 확실히 밀어
  //                     "가장자리로 배경이 비치는" 현상 제거
  //    → 값은 config/portal.config.ts 의 SEGMENTATION_CONFIG 에서 조절합니다.
  personCtx.globalCompositeOperation = "copy";
  personCtx.filter = buildMaskFilter();
  drawCover(personCtx, results.segmentationMask, width, height);
  personCtx.filter = "none";

  // 2) 그 알파 안쪽에만 원본 프레임을 채우기
  personCtx.globalCompositeOperation = "source-in";
  drawCover(personCtx, results.image, width, height);

  // 다음 프레임을 위해 기본값으로 되돌립니다.
  personCtx.globalCompositeOperation = "source-over";
}

/**
 * 한 프레임 합성: 배경(반전 없음) → 인물 레이어(좌우 반전 1회).
 *
 * 반전을 인물 레이어에만 한 번 적용하므로 마스크/원본이 어긋날 일이 없고
 * 배경(도시 풍경·간판)은 뒤집히지 않습니다. CSS 등 다른 곳에 반전을 중복으로
 * 걸지 마세요.
 */
export function drawCompositeFrame(params: {
  ctx: CanvasRenderingContext2D;
  personCanvas: HTMLCanvasElement;
  world: WorldDef;
  backgroundImage?: HTMLImageElement | null;
  width: number;
  height: number;
  /**
   * 크로마키 보정의 **"알파 보기"** 전용 — World 배경 대신 이 단색으로 채웁니다.
   * 마젠타 같은 원색을 깔면 남은 초록 테두리와 인물에 뚫린 구멍이 즉시 드러납니다.
   * 부스 실행 경로에서는 항상 undefined 입니다.
   */
  backgroundOverride?: string;
}): void {
  const { ctx, personCanvas, world, backgroundImage, width, height, backgroundOverride } =
    params;

  ctx.clearRect(0, 0, width, height);
  if (backgroundOverride) {
    ctx.fillStyle = backgroundOverride;
    ctx.fillRect(0, 0, width, height);
  } else {
    drawWorldBackground(ctx, world, width, height, backgroundImage);
  }

  ctx.save();
  if (CAMERA_CONFIG.mirror) {
    ctx.translate(width, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(personCanvas, 0, 0, width, height);
  ctx.restore();
}

/** 촬영 — 화면에 보이는 캔버스를 그대로 저장합니다 (오프스크린 재합성 없음). */
export function captureFrame(canvas: HTMLCanvasElement): string {
  return canvas.toDataURL("image/jpeg", 0.9);
}

/**
 * 표시 영역(CSS 픽셀) → 캔버스 백킹스토어 크기.
 * 화면 비율을 그대로 유지하되(여백 없는 전체화면) 프레임률을 지키기 위해
 * maxCanvasWidth 로 상한을 둡니다. 촬영 결과 해상도도 이 크기를 따릅니다.
 */
export function computeStageSize(cssWidth: number, cssHeight: number): Size {
  const safeWidth = Math.max(1, cssWidth);
  const safeHeight = Math.max(1, cssHeight);
  const scale = Math.min(1, SEGMENTATION_CONFIG.maxCanvasWidth / safeWidth);
  return {
    width: Math.max(1, Math.round(safeWidth * scale)),
    height: Math.max(1, Math.round(safeHeight * scale)),
  };
}
