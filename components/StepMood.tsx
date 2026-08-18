"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { COPY, MOOD_ANALYSIS_CONFIG, moodLabel } from "@/config/portal.config";
import { track } from "@/lib/analytics";
import { usePortalFlow } from "@/lib/FlowContext";
import {
  captureAnalysisFrame,
  neutralMoodAnalysis,
  requestMoodAnalysis,
} from "@/lib/moodAnalysis";
import type { MoodAnalysis } from "@/lib/types";
import { useCamera } from "@/lib/useCamera";
import { useRipple, type RippleOrigin } from "@/lib/useRipple";
import StepFrame from "./StepFrame";

// 04 MOOD (03 / 03) — 무드를 고르는 화면이 아니라 **AI가 판정하는** 화면입니다.
//
//   guide     : 라이브 프리뷰 + 상의 가이드 프레임 + [AI 무드 분석 시작]
//   analyzing : 05 와 같은 톤의 전체화면 로딩
//   result    : 컬러 칩 + 무드 + 한 줄 코멘트 → [다음] 또는 자동 이동으로 05 진입
//
// 카메라는 PortalRuntime 이 소유하는 스트림을 useCamera 로 빌려 씁니다. 여기서
// 먼저 확보해두면 05 프리로드와 07 촬영이 같은 스트림을 재사용하므로, 권한 팝업은
// 이 화면에서 한 번만 뜨고 07 진입은 오히려 빨라집니다.
type Phase = "guide" | "analyzing" | "result";

export default function StepMood() {
  const { dispatch } = usePortalFlow();
  const { trigger, isTransitioning } = useRipple();
  const { videoRef, status, errorMessage, retry } = useCamera();

  const [phase, setPhase] = useState<Phase>("guide");
  const [result, setResult] = useState<MoodAnalysis | null>(null);
  // 분석은 한 번만 — 버튼 연타로 요청이 겹치지 않게 막습니다.
  const runningRef = useRef(false);

  const runAnalysis = useCallback(async () => {
    if (runningRef.current) return;
    runningRef.current = true;
    setPhase("analyzing");

    const video = videoRef.current;
    const frame = video ? captureAnalysisFrame(video) : null;

    // 프레임을 못 잡았으면(카메라 실패·첫 프레임 전) 서버를 부르지 않고 바로 중립값으로.
    const analysis: MoodAnalysis = frame
      ? await requestMoodAnalysis(frame)
      : neutralMoodAnalysis();

    setResult(analysis);
    setPhase("result");
    runningRef.current = false;
  }, [videoRef]);

  if (phase === "analyzing") return <AnalyzingScreen />;

  if (phase === "result" && result) {
    return (
      <ResultScreen
        result={result}
        disabled={isTransitioning}
        onAdvance={(origin) =>
          trigger(origin, "final", () => {
            dispatch({ type: "ANALYZE_MOOD", result });
            track({ name: "mood_analyzed", value: result.mood, source: result.source });
          })
        }
      />
    );
  }

  const cameraFailed = status === "error";
  const waiting = status === "idle" || status === "requesting";

  return (
    <StepFrame stepNumber={3} heading={COPY.moodHeading} subline={COPY.moodSubline}>
      <div className="relative h-[26rem] w-[36rem] overflow-hidden rounded-2xl border border-ink/10 bg-ink/90 shadow-[0_18px_50px_-28px_rgba(0,0,0,0.5)]">
        <video
          ref={videoRef}
          muted
          playsInline
          autoPlay
          // 셀피처럼 보이도록 프리뷰만 좌우 반전합니다 (분석은 원본 프레임으로).
          className="h-full w-full -scale-x-100 object-cover"
        />

        {status === "ready" && <GuideFrame />}

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

      <p className="mt-6 text-sm text-ink/50">{COPY.moodGuide}</p>

      <button
        type="button"
        disabled={status !== "ready"}
        onClick={() => void runAnalysis()}
        className="mt-8 rounded-full bg-ink px-12 py-4 text-sm tracking-widest2 text-paper transition-opacity hover:opacity-85 disabled:opacity-30"
      >
        {COPY.moodScanButton}
      </button>

      {/* 카메라를 끝내 못 켰을 때의 출구 — 손님을 세워두지 않고 폴백으로 진행합니다. */}
      {cameraFailed && (
        <button
          type="button"
          onClick={() => void runAnalysis()}
          className="mt-4 text-xs text-ink/40 underline underline-offset-4 hover:text-ink/70"
        >
          {COPY.moodCameraSkip}
        </button>
      )}
    </StepFrame>
  );
}

// 상의가 와야 할 자리를 표시합니다. MOOD_ANALYSIS_CONFIG.sampleRegion 을 그대로
// 쓰므로, 폴백이 실제로 색을 재는 영역과 화면 안내가 어긋나지 않습니다.
function GuideFrame() {
  const { x, y, w, h } = MOOD_ANALYSIS_CONFIG.sampleRegion;
  return (
    <div
      className="pointer-events-none absolute rounded-xl border-2 border-dashed border-white/55"
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
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/60 px-8 text-center text-white/90 backdrop-blur">
      {children}
    </div>
  );
}

// 05 PORTAL OPENING 과 같은 연출 톤을 씁니다 — 분석 대기와 프리로드 대기가
// 시각적으로 이어지도록.
function AnalyzingScreen() {
  return (
    <div
      className="flex h-full min-h-screen flex-col items-center justify-center gap-10 bg-cover bg-center px-8 text-center"
      style={{
        backgroundImage:
          "linear-gradient(rgba(250,248,245,0.35), rgba(250,248,245,0.35)), url(/ui/load.jpg), linear-gradient(#faf8f5, #faf8f5)",
      }}
    >
      <svg
        width="132"
        height="132"
        viewBox="0 0 132 132"
        className="animate-spin"
        style={{ animationDuration: "7s" }}
        aria-hidden
      >
        <circle
          cx="66"
          cy="66"
          r="58"
          fill="none"
          stroke="#0a0a0a"
          strokeOpacity="0.22"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray="2 12"
        />
      </svg>

      <p className="whitespace-pre-line text-lg leading-relaxed text-ink/70">
        {COPY.moodAnalyzing}
      </p>

      <div className="flex gap-2.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-1.5 w-1.5 animate-pulse rounded-full bg-ink/30"
            style={{ animationDelay: `${i * 220}ms`, animationDuration: "1.4s" }}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * 결과 카드. 손님이 [다음]을 눌러 넘기거나, 누르지 않으면
 * `MOOD_ANALYSIS_CONFIG.resultAutoAdvanceMs` 후 자동으로 넘어갑니다.
 *
 * 두 경로 모두 같은 `onAdvance` 를 타므로 05 로 넘어가는 연출(ripple "final")이
 * 동일합니다. 자동 이동에는 클릭 좌표가 없어서 [다음] 버튼의 중심을 물결 시작점으로
 * 삼습니다 — 손님이 직접 누른 것과 같은 자리에서 퍼집니다.
 */
function ResultScreen({
  result,
  disabled,
  onAdvance,
}: {
  result: MoodAnalysis;
  disabled: boolean;
  onAdvance: (origin: RippleOrigin) => void;
}) {
  const nextRef = useRef<HTMLButtonElement>(null);
  // 클릭과 타이머가 겹쳐도 전환은 한 번만 — 리듀서 가드와 별개로 연출이 두 번
  // 시작되지 않게 여기서도 막습니다.
  const advancedRef = useRef(false);

  const advance = useCallback(() => {
    if (advancedRef.current) return;
    advancedRef.current = true;

    const rect = nextRef.current?.getBoundingClientRect();
    onAdvance(
      rect
        ? { clientX: rect.left + rect.width / 2, clientY: rect.top + rect.height / 2 }
        : { clientX: window.innerWidth / 2, clientY: window.innerHeight / 2 }
    );
  }, [onAdvance]);

  useEffect(() => {
    const timer = window.setTimeout(advance, MOOD_ANALYSIS_CONFIG.resultAutoAdvanceMs);
    return () => window.clearTimeout(timer);
  }, [advance]);

  return (
    <div
      className="flex h-full min-h-screen flex-col items-center justify-center bg-cover bg-center px-12 text-center"
      style={{
        backgroundImage:
          "linear-gradient(rgba(250,248,245,0.4), rgba(250,248,245,0.4)), url(/ui/qr.jpg), linear-gradient(#faf8f5, #faf8f5)",
      }}
    >
      <p className="text-xs tracking-widest2 text-ink/45">{COPY.moodResultEyebrow}</p>

      <div className="mt-8 flex w-full max-w-xl flex-col items-center rounded-2xl border border-ink/10 bg-paper/80 px-12 py-12 shadow-[0_24px_70px_-40px_rgba(0,0,0,0.5)] backdrop-blur-sm">
        {/* 추출된 메인 컬러 칩 */}
        <span
          className="h-16 w-16 rounded-full border border-ink/10 shadow-inner"
          style={{ backgroundColor: result.dominantColor.hex }}
          aria-hidden
        />
        <p className="mt-3 text-[0.65rem] tracking-widest2 text-ink/40">
          {COPY.moodColorLabel}
        </p>
        <p className="mt-1 text-sm text-ink/60">{result.dominantColor.name}</p>

        <h2 className="mt-8 font-sans text-5xl font-extrabold tracking-wide text-ink">
          {moodLabel(result.mood)}
        </h2>

        <p className="mt-6 max-w-md text-sm leading-relaxed text-ink/60">
          {result.description}
        </p>
      </div>

      <button
        ref={nextRef}
        type="button"
        disabled={disabled}
        onClick={advance}
        className="mt-12 rounded-full bg-ink px-14 py-4 text-sm tracking-widest2 text-paper transition-opacity hover:opacity-85 disabled:opacity-30"
      >
        {COPY.moodNext}
      </button>

      {/* 자동 이동까지 남은 시간 — 줄어드는 바로 보여줍니다. */}
      <div className="mt-5 h-px w-40 overflow-hidden bg-ink/10">
        <span
          className="block h-full w-full origin-left bg-ink/45"
          style={{
            animation: `mood-countdown ${MOOD_ANALYSIS_CONFIG.resultAutoAdvanceMs}ms linear forwards`,
          }}
          aria-hidden
        />
      </div>
      <p className="mt-3 text-xs text-ink/35">{COPY.moodAutoAdvanceHint}</p>
    </div>
  );
}
