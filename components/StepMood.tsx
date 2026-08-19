"use client";

import { useCallback, useRef, useState } from "react";
import { COPY, MOOD_ANALYSIS_CONFIG } from "@/config/portal.config";
import { track } from "@/lib/analytics";
import { usePortalFlow } from "@/lib/FlowContext";
import {
  captureAnalysisFrame,
  neutralMoodAnalysis,
  requestMoodAnalysis,
} from "@/lib/moodAnalysis";
import { useCamera } from "@/lib/useCamera";
import StepFrame from "./StepFrame";

// 04 MOOD (03 / 03) — 무드를 고르는 화면이 아니라 **AI가 판정하는** 화면입니다.
//
//   guide     : 라이브 프리뷰 + 상의 가이드 프레임 + [AI 무드 분석 시작]
//   analyzing : 05 와 같은 톤의 전체화면 로딩 → 판정이 끝나면 바로 05 로 넘어감
//
// 판정 결과는 화면에 보여주지 않습니다. state.moodAnalysis 에 담겨 World 매칭과
// 09 여권 카피에만 쓰입니다.
//
// 카메라는 PortalRuntime 이 소유하는 스트림을 useCamera 로 빌려 씁니다. 여기서
// 먼저 확보해두면 05 프리로드와 07 촬영이 같은 스트림을 재사용하므로, 권한 팝업은
// 이 화면에서 한 번만 뜨고 07 진입은 오히려 빨라집니다.
type Phase = "guide" | "analyzing";

/**
 * 판정이 이보다 빨리 끝나도 이 화면은 최소 이만큼 떠 있습니다 — 로컬 폴백은
 * 즉시 끝나서 이게 없으면 화면이 깜빡이고 지나갑니다.
 * (05 는 같은 역할을 OPENING_STAGES 합계가 합니다.)
 */
const ANALYZING_MIN_VISIBLE_MS = 2200;

export default function StepMood() {
  const { dispatch } = usePortalFlow();
  const { videoRef, status, errorMessage, retry } = useCamera();

  const [phase, setPhase] = useState<Phase>("guide");
  // 분석은 한 번만 — 버튼 연타로 요청이 겹치지 않게 막습니다.
  const runningRef = useRef(false);

  const runAnalysis = useCallback(async () => {
    if (runningRef.current) return;
    runningRef.current = true;
    setPhase("analyzing");

    const video = videoRef.current;
    const frame = video ? captureAnalysisFrame(video) : null;

    const minVisible = new Promise<void>((resolve) =>
      window.setTimeout(resolve, ANALYZING_MIN_VISIBLE_MS)
    );
    // 프레임을 못 잡았으면(카메라 실패·첫 프레임 전) 서버를 부르지 않고 바로 중립값으로.
    const [analysis] = await Promise.all([
      frame ? requestMoodAnalysis(frame) : neutralMoodAnalysis(),
      minVisible,
    ]);

    track({ name: "mood_analyzed", value: analysis.mood, source: analysis.source });
    dispatch({ type: "ANALYZE_MOOD", result: analysis });
  }, [dispatch, videoRef]);

  if (phase === "analyzing") return <AnalyzingScreen />;

  const cameraFailed = status === "error";
  const waiting = status === "idle" || status === "requesting";

  return (
    <StepFrame stepNumber={3} heading={COPY.moodHeading} subline={COPY.moodSubline}>
      {/* ⚠️ 크기를 키우지 마세요. 루트 폰트가 22px(부스 확대 배율)이라 rem 이
          그대로 곱해집니다 — 26rem/36rem 이면 572×792px 이 돼 1080p 에서도
          미리보기+버튼이 한 화면에 안 들어가고 스크롤이 생깁니다. */}
      <div className="relative h-[20rem] w-[28rem] overflow-hidden rounded-2xl border border-ink/10 bg-ink/90 shadow-[0_18px_50px_-28px_rgba(0,0,0,0.5)]">
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

      <p className="mt-4 text-sm text-ink/80">{COPY.moodGuide}</p>

      <button
        type="button"
        disabled={status !== "ready"}
        onClick={() => void runAnalysis()}
        className="mt-6 rounded-full bg-ink px-12 py-3 text-sm tracking-widest2 text-paper transition-opacity hover:opacity-85 disabled:opacity-30"
      >
        {COPY.moodScanButton}
      </button>

      {/* 카메라를 끝내 못 켰을 때의 출구 — 손님을 세워두지 않고 폴백으로 진행합니다. */}
      {cameraFailed && (
        <button
          type="button"
          onClick={() => void runAnalysis()}
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
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/60 px-8 text-center text-white backdrop-blur">
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
        viewBox="0 0 132 132"
        className="h-[8.25rem] w-[8.25rem] animate-spin"
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

      <p className="whitespace-pre-line text-lg leading-relaxed text-ink/90">
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
