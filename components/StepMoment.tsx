"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { COPY } from "@/config/portal.config";
import { findProductChoice } from "@/config/products.config";
import { usePortalFlow } from "@/lib/FlowContext";
import { ApiError, TimeoutError, uploadSession } from "@/lib/api";

type UploadState = "uploading" | "done" | "failed";

/** 실패 원인별 안내 — 방문객이 뭘 해야 할지 알 수 있게 나눕니다. */
function describeUploadError(err: unknown): string {
  if (err instanceof TimeoutError) return COPY.uploadTimeout;
  if (err instanceof ApiError) {
    return err.status === 413 ? COPY.uploadTooLarge : COPY.uploadServerError;
  }
  return COPY.uploadOffline;
}

// 09 YOUR MCM MOMENT
// 촬영 직후, 찍은 사진을 크게 보여주는 화면. "다음"으로 08 QR 로 넘어갑니다.
export default function StepMoment() {
  const { state, dispatch } = usePortalFlow();

  const [uploadState, setUploadState] = useState<UploadState>("uploading");
  const [failMessage, setFailMessage] = useState("");

  // 촬영 직후, 합성 사진 + 선택값을 백엔드로 업로드하고 공유 URL 을 받아둡니다.
  // 실패해도 "다음"은 계속 눌립니다 — 부스에서 손님을 세워두면 안 되기 때문에,
  // 업로드는 재시도할 수 있게만 해두고 흐름 자체는 막지 않습니다.
  const runUpload = useCallback(async () => {
    if (!state.capturedImage || !state.sessionId || state.capturedAt == null) return;

    setUploadState("uploading");
    try {
      const res = await uploadSession(
        {
          sessionId: state.sessionId,
          consent: state.consent,
          productId: state.productId,
          colorwayKey: state.colorwayKey,
          mood: state.answers.mood,
          journey: state.answers.journey,
          worldId: state.selectedWorldId,
          capturedAt: state.capturedAt,
        },
        state.capturedImage
      );
      dispatch({ type: "SET_SESSION_SHARE", url: res.shareUrl, expiresAt: res.expiresAt });
      setUploadState("done");
    } catch (err: unknown) {
      console.warn("[portal] 세션 업로드 실패:", err);
      setFailMessage(describeUploadError(err));
      setUploadState("failed");
    }
  }, [dispatch, state]);

  // StrictMode 이중 마운트로 두 번 올라가지 않게 ref 로 최초 1회만 실행합니다.
  const startedRef = useRef(false);
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    void runUpload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const choice = findProductChoice(state.productId, state.colorwayKey);
  const pointColor = choice?.colorway.hex ?? "#0a0a0a";

  return (
    <div className="flex h-full min-h-screen flex-col items-center justify-center bg-paper px-8 py-12 text-center">
      <p className="text-xs tracking-widest2 text-ink/45">{COPY.momentEyebrow}</p>

      <div
        className="mt-5 overflow-hidden rounded-2xl border bg-white shadow-[0_24px_70px_-30px_rgba(0,0,0,0.55)]"
        style={{ borderColor: pointColor }}
      >
        {state.capturedImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={state.capturedImage}
            alt="촬영된 순간"
            className="block max-h-[64vh] w-auto max-w-[80vw] object-contain"
          />
        ) : (
          <div className="flex h-[46vh] w-[70vw] max-w-3xl items-center justify-center text-sm text-ink/30">
            사진을 불러오는 중...
          </div>
        )}
      </div>

      <p className="mt-6 text-sm text-ink/60">{COPY.momentCaption}</p>

      {/* 업로드 상태 — 실패해도 "다음"은 막지 않고 재시도만 제공합니다. */}
      <div className="mt-4 flex min-h-[2.25rem] items-center gap-3 text-xs">
        {uploadState === "uploading" && (
          <span className="text-ink/40">{COPY.uploadInProgress}</span>
        )}
        {uploadState === "failed" && (
          <>
            <span className="text-[#c0392b]">{failMessage}</span>
            <button
              type="button"
              onClick={() => void runUpload()}
              className="rounded-full border border-ink/25 px-4 py-1.5 tracking-widest text-ink/70 transition-colors hover:border-ink/50 hover:text-ink"
            >
              {COPY.uploadRetry}
            </button>
          </>
        )}
      </div>

      <button
        type="button"
        onClick={() => dispatch({ type: "SHOW_QR" })}
        className="mt-4 flex items-center gap-4 rounded-full bg-ink px-12 py-3.5 text-sm tracking-widest text-white transition-colors hover:bg-ink/85"
      >
        {COPY.momentNext}
        <ArrowRight />
      </button>
    </div>
  );
}

function ArrowRight() {
  return (
    <svg width="28" height="8" viewBox="0 0 28 8" fill="none" aria-hidden>
      <path d="M0 4h26M22 1l4 3-4 3" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}
