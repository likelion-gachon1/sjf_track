// =============================================================================
// 백엔드 연동 — 촬영 결과 업로드 & 결과 조회
// -----------------------------------------------------------------------------
// 백엔드 주소는 여기 한 곳(NEXT_PUBLIC_API_BASE)에서만 정합니다.
// 로컬에서는 localhost:8080, 배포(가비아) 시에는 .env 만 바꾸면 됩니다.
// =============================================================================

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
  form.append("image", dataUrlToBlob(imageDataUrl), `${metadata.sessionId}.jpg`);

  const res = await fetch(`${API_BASE}/api/v1/sessions`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) {
    throw new ApiError(res.status, await readErrorBody(res));
  }
  return (await res.json()) as SessionResponse;
}

/** GET /api/v1/sessions/{id} — 모바일 결과 페이지에서 사용. */
export async function fetchSession(sessionId: string): Promise<SessionResponse> {
  const res = await fetch(`${API_BASE}/api/v1/sessions/${sessionId}`);
  if (!res.ok) {
    throw new ApiError(res.status, await readErrorBody(res));
  }
  return (await res.json()) as SessionResponse;
}
