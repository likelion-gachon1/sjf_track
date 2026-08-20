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
// 전용 "분석 중" 전체화면은 없습니다 — 05 OPENING 의 첫 단계가 같은 문구를
// 보여주므로, 여기서는 가이드 화면에 머무른 채 버튼만 로딩 상태로 바꾸고
// 분석이 끝나면 바로 05 로 넘어갑니다.
//
// 판정 결과는 화면에 보여주지 않습니다. state.moodAnalysis 에 담겨 World 매칭과
// 09 여권 카피에만 쓰입니다.
//
// 카메라는 PortalRuntime 이 소유하는 스트림을 useCamera 로 빌려 씁니다. 여기서
// 먼저 확보해두면 05 프리로드와 07 촬영이 같은 스트림을 재사용하므로, 권한 팝업은
// 이 화면에서 한 번만 뜨고 07 진입은 오히려 빨라집니다.

export default function StepMood() {
  const { dispatch } = usePortalFlow();
  const { videoRef, status, errorMessage, retry } = useCamera();

  const [analyzing, setAnalyzing] = useState(false);
  // 분석은 한 번만 — 버튼 연타로 요청이 겹치지 않게 막습니다.
  const runningRef = useRef(false);

  const runAnalysis = useCallback(async () => {
    if (runningRef.current) return;
    runningRef.current = true;
    setAnalyzing(true);

    const video = videoRef.current;
    const frame = video ? captureAnalysisFrame(video) : null;

    // 프레임을 못 잡았으면(카메라 실패·첫 프레임 전) 서버를 부르지 않고 바로 중립값으로.
    const analysis = frame ? await requestMoodAnalysis(frame) : await neutralMoodAnalysis();

    track({ name: "mood_analyzed", value: analysis.mood, source: analysis.source });
    dispatch({ type: "ANALYZE_MOOD", result: analysis });
  }, [dispatch, videoRef]);

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
        disabled={status !== "ready" || analyzing}
        onClick={() => void runAnalysis()}
        className="mt-6 rounded-full bg-ink px-12 py-3 text-sm tracking-widest2 text-paper transition-opacity hover:opacity-85 disabled:opacity-30"
      >
        {analyzing ? COPY.moodAnalyzing : COPY.moodScanButton}
      </button>

      {/* 카메라를 끝내 못 켰을 때의 출구 — 손님을 세워두지 않고 폴백으로 진행합니다. */}
      {cameraFailed && !analyzing && (
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
