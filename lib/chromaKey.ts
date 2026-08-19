// 그린 스크린 크로마키 — WebGL 단일 패스 렌더러.
// CbCr 색 거리 기반(RGB가 아님). 프레임 루프는 lib/useChromaKey.ts 가 맡습니다.

import { coverRect } from "@/lib/composite";

export interface ChromaKeyParams {
  /** 그린 스크린 원단 색 "#rrggbb". 부스 조명 아래 실측값이어야 합니다. */
  keyColor: string;
  /**
   * 배경으로 간주할 **CbCr 거리 상한** (0~1).
   *
   * ⚠️ 이 값의 눈금을 감으로 잡지 마세요. 무채색(회색·흰색·검정)은 키 컬러에서
   *    약 0.33, 살색은 약 0.42 떨어져 있습니다. 0.3 을 넘기면 사람까지 지워집니다.
   *    실용 범위는 **0.05 ~ 0.30**. /calibrate 에서 실측하세요.
   */
  similarity: number;
  /** 경계가 알파 0→1 로 넘어가는 폭 (CbCr 거리 단위). 세그멘테이션의 featherPx 역할. */
  smoothness: number;
  /**
   * 매트를 안쪽으로 깎는 정도 (0~1). 0 = 끔.
   *
   * 카메라는 색(CbCr)을 밝기보다 낮은 해상도로 담기 때문에(크로마 서브샘플링) 실루엣
   * 경계에 **반투명한** 띠가 생깁니다. 머리카락·움직임 블러에서 이 띠가 넓어지면
   * 초록빛이 비쳐 보이므로 매트를 살짝 깎아 잘라냅니다.
   *
   * ⚠️ **몸 윤곽의 초록 테두리에는 효과가 없습니다.** 그건 알파 1(완전 불투명)인
   *    픽셀에 초록빛이 실제로 얹힌 것이라 매트를 아무리 깎아도 남습니다 — `spill` 담당.
   */
  edgeShrink: number;
  /**
   * 인물에 반사된 초록빛(스필) 제거 강도 (0~1).
   *
   * **몸 윤곽의 초록 테두리를 없애는 유일한 노브입니다.** 스크린에서 튄 초록빛은
   * 인물 몸에 실제로 얹힌 색이라 알파로는 지워지지 않고, 색 자체를 눌러야 사라집니다.
   *
   * 이 값은 **인물 내부**에 적용되는 최소치이고, 반투명한 경계 픽셀에는 알파에 비례해
   * 최대 1.0 까지 자동으로 세게 걸립니다.
   */
  spill: number;
}

export interface ChromaKeyRenderer {
  /** 비디오 프레임을 알파 포함 인물 레이어로 캔버스에 그립니다 (cover 크롭). */
  render(video: HTMLVideoElement, width: number, height: number): void;
  setParams(params: ChromaKeyParams): void;
  dispose(): void;
}

// -----------------------------------------------------------------------------
// 색 변환 — 셰이더와 **같은 수식**을 JS 로도 노출합니다.
// 04 무드 분석의 그린 가드(lib/moodAnalysis.ts)가 이 함수들을 재사용하므로,
// 한쪽만 고치면 화면과 판정이 어긋납니다. 고칠 때는 아래 GLSL 도 함께 고치세요.
// -----------------------------------------------------------------------------

/** "#rrggbb" → [r, g, b] (0~255). 형식이 틀리면 null. */
export function hexToRgb(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgbToHex(r: number, g: number, b: number): string {
  const part = (v: number) =>
    Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0");
  return "#" + part(r) + part(g) + part(b);
}

/** RGB(0~255) → CbCr (각 -0.5 ~ 0.5). BT.601. */
export function rgbToCbCr(r: number, g: number, b: number): [number, number] {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  return [
    -0.168736 * rn - 0.331264 * gn + 0.5 * bn,
    0.5 * rn - 0.418688 * gn - 0.081312 * bn,
  ];
}

/** 키 컬러를 CbCr 로. 형식이 틀리면 순수 그린으로 폴백합니다(화면이 죽지 않도록). */
export function keyColorToCbCr(keyColor: string): [number, number] {
  const rgb = hexToRgb(keyColor) ?? [0, 177, 64];
  return rgbToCbCr(rgb[0], rgb[1], rgb[2]);
}

/** 픽셀이 키 컬러에서 얼마나 떨어졌는지 (0 = 키 컬러 그 자체). */
export function cbCrDistanceToKey(
  r: number,
  g: number,
  b: number,
  key: [number, number]
): number {
  const [cb, cr] = rgbToCbCr(r, g, b);
  return Math.hypot(cb - key[0], cr - key[1]);
}

// -----------------------------------------------------------------------------
// 셰이더
// -----------------------------------------------------------------------------

// cover 크롭은 프래그먼트가 아니라 여기서 UV 로 처리합니다.
// u_uvScale / u_uvOffset 은 coverRect() 결과에서 나오므로 세그멘테이션 경로의
// drawCover 와 프레이밍이 **정확히 같습니다** (두 경로를 오갈 때 화각이 안 튑니다).
const VERTEX_SRC = `
attribute vec2 a_pos;
uniform vec2 u_uvScale;
uniform vec2 u_uvOffset;
varying vec2 v_uv;
void main() {
  vec2 unit = a_pos * 0.5 + 0.5;
  v_uv = unit * u_uvScale + u_uvOffset;
  gl_Position = vec4(a_pos, 0.0, 1.0);
}
`;

const FRAGMENT_SRC = `
precision mediump float;
uniform sampler2D u_frame;
uniform vec2 u_key;
uniform float u_similarity;
uniform float u_smoothness;
uniform float u_edgeShrink;
uniform float u_spill;
varying vec2 v_uv;

vec2 toCbCr(vec3 c) {
  return vec2(
    -0.168736 * c.r - 0.331264 * c.g + 0.5 * c.b,
     0.5 * c.r - 0.418688 * c.g - 0.081312 * c.b
  );
}

void main() {
  vec3 rgb = texture2D(u_frame, v_uv).rgb;

  // 키 컬러와의 CbCr 거리 → 알파. 가까우면 0(배경), 멀면 1(인물).
  float d = distance(toCbCr(rgb), u_key);
  float alpha = smoothstep(u_similarity, u_similarity + max(u_smoothness, 0.0001), d);

  // ① 매트 깎기 — 반투명 띠(머리카락·움직임 블러)를 안쪽으로 밀어냅니다.
  //    알파 1(인물 내부)은 1 그대로 남습니다.
  alpha = clamp((alpha - u_edgeShrink) / max(1.0 - u_edgeShrink, 0.0001), 0.0, 1.0);

  // ② 스필 제거 — 초록이 r/b 평균보다 튀는 픽셀만 끌어내립니다.
  //    min() 덕분에 초록기가 없는 픽셀(g <= desat)은 이 식이 아무것도 하지 않으므로
  //    피부나 소품의 색이 상하지 않습니다.
  //
  //    ⚠️ **몸 윤곽의 초록 테두리는 여기서 사라집니다.** 스크린에서 튄 초록빛은 알파 1인
  //    픽셀에 실제로 얹혀 있어서 ①로는 못 지웁니다. 그래서 u_spill 은 1.0 이 기본값입니다.
  //    반투명한 경계는 알파로 가중해 더 세게 눌러 잔여 초록기를 마저 없앱니다.
  float amount = mix(1.0, u_spill, alpha);
  float desat = (rgb.r + rgb.b) * 0.5;
  rgb.g = mix(rgb.g, min(rgb.g, desat), amount);

  // 비프리멀티플라이드 — 컨텍스트를 premultipliedAlpha: false 로 만들었기 때문입니다.
  gl_FragColor = vec4(rgb, alpha);
}
`;

function compile(gl: WebGLRenderingContext, type: number, src: string): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, src);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.warn("[portal] 크로마키 셰이더 컴파일 실패:", gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

/**
 * 크로마키 렌더러를 만듭니다.
 *
 * ⚠️ 실패하면 **throw 하지 않고 null** 을 돌려줍니다. 호출자(useChromaKey)가
 *    세그멘테이션으로 조용히 내려가야 하기 때문입니다 — 부스에서 화면이 죽는 것이 최악.
 */
export function createChromaKeyRenderer(
  canvas: HTMLCanvasElement,
  initialParams: ChromaKeyParams
): ChromaKeyRenderer | null {
  // premultipliedAlpha: false — 셰이더가 뱉는 (원본 RGB, 계산된 알파) 조합이
  //   2D 캔버스 drawImage 에서 그대로 합성되게 합니다. true 면 색이 알파만큼 어두워집니다.
  // preserveDrawingBuffer: true — 렌더 직후 drawImage 가 버퍼를 확실히 읽게 합니다.
  const attrs: WebGLContextAttributes = {
    alpha: true,
    premultipliedAlpha: false,
    preserveDrawingBuffer: true,
    antialias: false,
    depth: false,
    stencil: false,
  };

  const gl = (canvas.getContext("webgl2", attrs) ??
    canvas.getContext("webgl", attrs)) as WebGLRenderingContext | null;
  if (!gl) {
    console.warn("[portal] WebGL 컨텍스트를 얻지 못했습니다 — 크로마키를 쓸 수 없습니다.");
    return null;
  }

  const vs = compile(gl, gl.VERTEX_SHADER, VERTEX_SRC);
  const fs = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT_SRC);
  const program = gl.createProgram();
  if (!vs || !fs || !program) return null;

  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.warn("[portal] 크로마키 프로그램 링크 실패:", gl.getProgramInfoLog(program));
    return null;
  }
  gl.useProgram(program);

  // 전체화면 삼각형 2개.
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
    gl.STATIC_DRAW
  );
  const aPos = gl.getAttribLocation(program, "a_pos");
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  const uFrame = gl.getUniformLocation(program, "u_frame");
  const uKey = gl.getUniformLocation(program, "u_key");
  const uSimilarity = gl.getUniformLocation(program, "u_similarity");
  const uSmoothness = gl.getUniformLocation(program, "u_smoothness");
  const uEdgeShrink = gl.getUniformLocation(program, "u_edgeShrink");
  const uSpill = gl.getUniformLocation(program, "u_spill");
  const uUvScale = gl.getUniformLocation(program, "u_uvScale");
  const uUvOffset = gl.getUniformLocation(program, "u_uvOffset");

  const texture = gl.createTexture();
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.uniform1i(uFrame, 0);

  // WebGL 텍스처 원점은 좌하단입니다. 이걸 켜지 않으면 인물이 위아래로 뒤집힙니다.
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

  let disposed = false;

  const applyParams = (params: ChromaKeyParams) => {
    const key = keyColorToCbCr(params.keyColor);
    gl.uniform2f(uKey, key[0], key[1]);
    gl.uniform1f(uSimilarity, params.similarity);
    gl.uniform1f(uSmoothness, params.smoothness);
    gl.uniform1f(uEdgeShrink, params.edgeShrink);
    gl.uniform1f(uSpill, params.spill);
  };
  applyParams(initialParams);

  return {
    setParams(params: ChromaKeyParams) {
      if (disposed) return;
      gl.useProgram(program);
      applyParams(params);
    },

    render(video: HTMLVideoElement, width: number, height: number) {
      if (disposed) return;
      const srcW = video.videoWidth;
      const srcH = video.videoHeight;
      if (!srcW || !srcH || width <= 0 || height <= 0) return;

      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      gl.viewport(0, 0, width, height);

      // 세그멘테이션 경로와 같은 cover 계산을 씁니다.
      // rect 는 가운데 정렬이라 y 가 대칭이므로, FLIP_Y 를 켠 상태에서도 그대로 맞습니다.
      const rect = coverRect(srcW, srcH, width, height);
      gl.uniform2f(uUvScale, width / rect.width, height / rect.height);
      gl.uniform2f(uUvOffset, -rect.x / rect.width, -rect.y / rect.height);

      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);

      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    },

    dispose() {
      if (disposed) return;
      disposed = true;
      gl.deleteTexture(texture);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      // 07 을 드나들 때마다 컨텍스트가 쌓이지 않도록 즉시 반납합니다
      // (브라우저별 동시 WebGL 컨텍스트 상한이 있습니다).
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    },
  };
}

// -----------------------------------------------------------------------------
// 아이드로퍼 — /calibrate 와 07 튜닝 패널에서 "화면에서 색 찍기"에 씁니다.
// -----------------------------------------------------------------------------

let scratchCanvas: HTMLCanvasElement | null = null;

/**
 * 비디오 **원본 프레임**의 한 점 색을 "#rrggbb" 로 읽습니다.
 * (합성된 화면이 아니라 원본을 읽어야 합니다 — 합성 결과에는 이미 스필 제거가 들어가 있어
 *  그 색을 다시 키 컬러로 쓰면 값이 조금씩 밀립니다.)
 *
 * 한 픽셀만 읽으면 센서 노이즈에 값이 튀므로 주변 patch 를 평균냅니다.
 *
 * @param u 0~1 (가로), v 0~1 (세로, 위가 0)
 */
export function pickColorFromVideo(
  video: HTMLVideoElement,
  u: number,
  v: number,
  patch = 11
): string | null {
  const srcW = video.videoWidth;
  const srcH = video.videoHeight;
  if (!srcW || !srcH) return null;

  if (!scratchCanvas) {
    scratchCanvas = document.createElement("canvas");
    scratchCanvas.width = 1;
    scratchCanvas.height = 1;
  }
  const ctx = scratchCanvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;

  const half = patch / 2;
  const sx = Math.max(0, Math.min(srcW - patch, u * srcW - half));
  const sy = Math.max(0, Math.min(srcH - patch, v * srcH - half));

  // patch 크기를 1x1 로 줄여 그리면 브라우저 스무딩이 평균을 내줍니다.
  ctx.imageSmoothingEnabled = true;
  ctx.clearRect(0, 0, 1, 1);
  try {
    ctx.drawImage(video, sx, sy, patch, patch, 0, 0, 1, 1);
  } catch {
    return null;
  }
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
  return rgbToHex(r, g, b);
}
