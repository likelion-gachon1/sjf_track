// =============================================================================
// 백엔드 연동 — 촬영 결과 업로드 & 결과 조회
// -----------------------------------------------------------------------------
// 백엔드 주소는 여기 한 곳(NEXT_PUBLIC_API_BASE)에서만 정합니다.
// 로컬에서는 localhost:8080, 배포(가비아) 시에는 .env 만 바꾸면 됩니다.
// =============================================================================

import { UPLOAD_CONFIG } from "@/config/portal.config";
import type { Answers, ColorwayKey, WorldId } from "@/lib/types";

export const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8080";

/** POST /api/v1/sessions 로 보내는 metadata (백엔드 필드명과 1:1). */
export interface SessionMetadata {
  sessionId: string;
  consent: boolean;
  productId: string | null;
  colorwayKey: ColorwayKey | null;
  mood: Answers["mood"];
  journey: Answers["journey"];
  worldId: WorldId | null;
  capturedAt: number;
}

/** 백엔드가 돌려주는 응답. */
export interface SessionResponse {
  sessionId: string;
  productId: string;
  colorwayKey: string;
  mood: string;
  journey: string;
  worldId: string;
  capturedAt: number;
  shareUrl: string;
  imageUrl: string;
  downloadUrl: string;
  expiresAt: string;
}

/** 백엔드 공통 오류 응답 (API_SPEC "5. 오류 응답"). */
export interface ApiErrorBody {
  status: number;
  error: string;
  message: string;
  timestamp: string;
}

/**
 * 서버가 응답은 했지만 실패한 경우(4xx/5xx).
 * 화면에서 404(없음)·410(만료)·500(서버 오류)을 갈라 쓸 수 있도록 상태 코드를 들고 다닙니다.
 * 네트워크 자체가 끊긴 경우는 fetch 가 TypeError 를 던지므로 `instanceof ApiError` 로 구분됩니다.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly body: ApiErrorBody | null;

  constructor(status: number, body: ApiErrorBody | null) {
    super(body?.message ?? `요청 실패 (${status})`);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

/**
 * 요청이 제한 시간 안에 끝나지 않은 경우.
 * 부스 WiFi 가 끊기면 fetch 가 영영 안 끝나 "저장 중"에서 멈춘 것처럼 보이므로,
 * 서버 오류(ApiError)와 구분해 "연결 확인" 안내를 띄울 수 있게 따로 둡니다.
 */
export class TimeoutError extends Error {
  constructor(ms: number) {
    super(`요청이 ${ms}ms 안에 끝나지 않았습니다`);
    this.name = "TimeoutError";
  }
}

/** 제한 시간을 건 fetch. 시간 초과면 TimeoutError 를 던집니다. */
async function fetchWithTimeout(
  input: string,
  init: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (err) {
    // abort 로 끊긴 경우만 타임아웃으로 바꿔 올립니다(진짜 네트워크 오류는 그대로).
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new TimeoutError(timeoutMs);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/** 오류 응답 본문을 최대한 읽어옵니다 (JSON 이 아니면 null). */
async function readErrorBody(res: Response): Promise<ApiErrorBody | null> {
  try {
    return (await res.json()) as ApiErrorBody;
  } catch {
    return null;
  }
}

/** dataURL(JPEG) 문자열을 업로드 가능한 Blob 으로 변환합니다. */
function dataUrlToBlob(dataUrl: string): Blob {
  const [head, body] = dataUrl.split(",");
  const mime = head.match(/data:(.*?);base64/)?.[1] ?? "image/jpeg";
  const bin = atob(body);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("촬영 이미지를 다시 읽지 못했습니다"));
    img.src = src;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
}

/**
 * 백엔드 10MB 제한에 걸리지 않도록 필요할 때만 다시 인코딩합니다.
 * 실사 배경이 들어가면서 JPEG 이 커졌기 때문에, 그냥 올리면 413 으로 조용히 실패할
 * 수 있습니다. 대부분은 첫 검사에서 통과해 재인코딩 비용이 들지 않습니다.
 */
export async function encodeWithinLimit(imageDataUrl: string): Promise<Blob> {
  let blob = dataUrlToBlob(imageDataUrl);
  if (blob.size <= UPLOAD_CONFIG.maxBytes) return blob;

  console.warn(
    `[portal] 촬영 이미지가 ${(blob.size / 1024 / 1024).toFixed(1)}MB 라 줄여서 올립니다`
  );

  const img = await loadImage(imageDataUrl);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return blob; // 재인코딩 불가 — 원본으로 시도하고 실패는 화면에서 안내

  for (const { scale, quality } of UPLOAD_CONFIG.shrinkAttempts) {
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    const next = await canvasToBlob(canvas, quality);
    if (!next) continue;
    blob = next;
    if (blob.size <= UPLOAD_CONFIG.maxBytes) return blob;
  }

  // 끝까지 못 줄였으면 가장 작은 결과로 시도합니다 (413 이면 화면에서 안내됩니다).
  return blob;
}

/** 촬영 결과(합성 JPEG) + 선택값을 서버에 저장하고 공유 정보를 받습니다. */
export async function uploadSession(
  metadata: SessionMetadata,
  imageDataUrl: string
): Promise<SessionResponse> {
  const form = new FormData();
  form.append(
    "metadata",
    new Blob([JSON.stringify(metadata)], { type: "application/json" })
  );
  form.append("image", await encodeWithinLimit(imageDataUrl), `${metadata.sessionId}.jpg`);

  const res = await fetchWithTimeout(
    `${API_BASE}/api/v1/sessions`,
    { method: "POST", body: form },
    UPLOAD_CONFIG.timeoutMs
  );
  if (!res.ok) {
    throw new ApiError(res.status, await readErrorBody(res));
  }
  return (await res.json()) as SessionResponse;
}

/**
 * GET /api/health — 05 프리로드에서 서버가 살아 있는지 미리 확인합니다.
 * 실패해도 체험을 막지 않고, 스태프가 콘솔·이벤트로 먼저 알아차리게 하는 용도입니다.
 */
export async function checkHealth(): Promise<boolean> {
  try {
    const res = await fetchWithTimeout(
      `${API_BASE}/api/health`,
      { method: "GET" },
      UPLOAD_CONFIG.healthTimeoutMs
    );
    return res.ok;
  } catch {
    return false;
  }
}

/** `expiresAt`(ISO) → "8월 18일 12:57" 같은 안내용 문자열. */
export function formatExpiresAt(iso: string): string | null {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("ko-KR", {
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

/** GET /api/v1/sessions/{id} — 모바일 결과 페이지에서 사용. */
export async function fetchSession(sessionId: string): Promise<SessionResponse> {
  const res = await fetchWithTimeout(
    `${API_BASE}/api/v1/sessions/${sessionId}`,
    { method: "GET" },
    UPLOAD_CONFIG.timeoutMs
  );
  if (!res.ok) {
    throw new ApiError(res.status, await readErrorBody(res));
  }
  return (await res.json()) as SessionResponse;
}
