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
    throw new Error(`세션 업로드 실패: ${res.status}`);
  }
  return (await res.json()) as SessionResponse;
}

/** GET /api/v1/sessions/{id} — 모바일 결과 페이지에서 사용. */
export async function fetchSession(sessionId: string): Promise<SessionResponse> {
  const res = await fetch(`${API_BASE}/api/v1/sessions/${sessionId}`);
  if (!res.ok) {
    throw new Error(`세션 조회 실패: ${res.status}`);
  }
  return (await res.json()) as SessionResponse;
}
