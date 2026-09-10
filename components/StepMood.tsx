"use client";

import { useCallback, useRef, useState } from "react";
import { COPY, MOOD_ANALYSIS_CONFIG } from "@/config/portal.config";
import { usePortalFlow } from "@/lib/FlowContext";
import { useCamera } from "@/lib/useCamera";
import { useClothingDetection } from "@/lib/useClothingDetection";
import StepFrame from "./StepFrame";

// 04: 의류 감지와 캡처만 담당합니다. 실제 무드 분석은 05 OPENING에서 실행합니다.

export default function StepMood() {
  const { dispatch } = usePortalFlow();
  const { videoRef, status, errorMessage, retry } = useCamera();

  const [retryToken, setRetryToken] = useState(0);
  const runningRef = useRef(false);
  const startOpening = useCallback((frame: string | null) => {
    if (runningRef.current) return;
    runningRef.current = true;
    dispatch({ type: "START_MOOD_ANALYSIS", frame });
  }, [dispatch]);
  const detection = useClothingDetection(videoRef, status === "ready", startOpening, retryToken);

  const cameraFailed = status === "error";
  const waiting = status === "idle" || status === "requesting";

  return (
    <StepFrame stepNumber={3} heading={COPY.moodHeading} subline={COPY.moodSubline}>
      <div className="relative h-[20rem] w-[28rem] overflow-hidden rounded-2xl border border-ink/10 bg-ink/90 shadow-[0_18px_50px_-28px_rgba(0,0,0,0.5)]">
        <video
          ref={videoRef}
          muted
          playsInline
          autoPlay
          // 셀피처럼 보이도록 프리뷰만 좌우 반전합니다 (분석은 원본 프레임으로).
          className="h-full w-full -scale-x-100 object-cover"
        />

        {status === "ready" && <GuideFrame detected={detection.status === "holding"} />}

        {waiting && (
          <Overlay>
            <span className="h-8 w-8 animate-spin rounded-full border-2 border-white/25 border-t-white/90" />
            <p className="text-sm">{COPY.cameraLoading}</p>
          </Overlay>
        )}

        {cameraFailed && (
          <Overlay>
            <p className="max-w-sm text-sm">{errorMessage}</p>
            <button
              type="button"
              onClick={retry}
              className="rounded-full border border-white/40 px-6 py-2 text-xs tracking-widest hover:bg-white/10"
            >
              {COPY.cameraRetryButton}
            </button>
          </Overlay>
        )}
      </div>

      <p className="mt-4 text-sm text-ink/80">{COPY.moodGuide}</p>

      <div className="mt-6 flex min-h-12 flex-col items-center gap-3" role="status" aria-live="polite">
        <p className="text-sm text-ink/80">
          {cameraFailed ? COPY.moodDetectionUnavailable :
            waiting || detection.status === "loading" ? COPY.moodDetectionLoading :
            detection.status === "error" ? COPY.moodDetectionUnavailable :
            detection.status === "holding" ? COPY.moodDetected : COPY.moodDetecting}
        </p>
        {status === "ready" && detection.status === "holding" && (
          <div className="h-1 w-48 overflow-hidden rounded-full bg-ink/10" aria-hidden="true">
            <div className="h-full bg-ink transition-all duration-200" style={{ width: `${detection.progress * 100}%` }} />
          </div>
        )}
      </div>

      {status === "ready" && detection.status === "error" && (
        <button
          type="button"
          onClick={() => setRetryToken((value) => value + 1)}
          className="mt-2 text-xs text-ink/70 underline underline-offset-4 hover:text-ink/90"
        >
          {COPY.moodDetectionRetry}
        </button>
      )}

      {/* 카메라를 끝내 못 켰을 때의 출구 — 손님을 세워두지 않고 폴백으로 진행합니다. */}
      {cameraFailed && (
        <button
          type="button"
          onClick={() => startOpening(null)}
          className="mt-2 text-xs text-ink/70 underline underline-offset-4 hover:text-ink/90"
        >
          {COPY.moodCameraSkip}
        </button>
      )}
    </StepFrame>
  );
}

// 상의가 와야 할 자리를 표시합니다. MOOD_ANALYSIS_CONFIG.sampleRegion 을 그대로
// 쓰므로, 폴백이 실제로 색을 재는 영역과 화면 안내가 어긋나지 않습니다.
function GuideFrame({ detected }: { detected: boolean }) {
  const { x, y, w, h } = MOOD_ANALYSIS_CONFIG.sampleRegion;
  return (
    <div
      className={`pointer-events-none absolute rounded-xl border-2 transition-colors ${detected ? "border-emerald-300" : "border-dashed border-white/55"}`}
      style={{
        left: `${x * 100}%`,
        top: `${y * 100}%`,
        width: `${w * 100}%`,
        height: `${h * 100}%`,
      }}
    />
  );
}

function Overlay({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/60 px-8 text-center text-white backdrop-blur">
      {children}
    </div>
  );
}
