"use client";

import { useEffect, useRef, useState } from "react";
import {
  OPENING_STAGES,
  OPENING_TOTAL_MS,
  WORLDS,
  applyComboBackground,
  buildWorldReason,
  resolveWorld,
} from "@/config/portal.config";
import { track } from "@/lib/analytics";
import { checkHealth } from "@/lib/api";
import { usePortalFlow } from "@/lib/FlowContext";
import { resolveMattingMode } from "@/lib/matting";
import { usePortalRuntime } from "@/lib/PortalRuntime";
import { neutralMoodAnalysis, requestMoodAnalysis } from "@/lib/moodAnalysis";
import type { MoodAnalysis } from "@/lib/types";

// 05 PORTAL OPENING
// 첫 안내에서 실제 무드 분석을 실행하고, 완료 후 World를 준비합니다.
// OPENING_STAGES의 시간은 각 문구의 최소 표시 시간입니다.

export default function StepOpening() {
  const { state, dispatch } = usePortalFlow();
  const runtime = usePortalRuntime();
  const [stageIndex, setStageIndex] = useState(0);
  // StrictMode 효과 재실행에서도 동일한 분석 요청을 재사용합니다.
  const requestRef = useRef<Promise<MoodAnalysis> | null>(null);
  const inputRef = useRef({
    frame: state.moodFrame, sessionId: state.sessionId,
    journey: state.answers.journey, colorwayKey: state.colorwayKey,
  });

  useEffect(() => {
    const { frame, sessionId, journey, colorwayKey } = inputRef.current;
    if (!journey || !colorwayKey) {
      dispatch({ type: "RESET" });
      return;
    }
    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const wait = (ms: number) => new Promise<void>((resolve) => {
      timers.push(setTimeout(resolve, ms));
    });
    if (!requestRef.current) {
      requestRef.current = frame ? requestMoodAnalysis(frame) : Promise.resolve(neutralMoodAnalysis());
    }
    void (async () => {
      // 실제 분석이 끝날 때까지 첫 문구를 유지합니다.
      const [analysis] = await Promise.all([requestRef.current!, wait(OPENING_STAGES[0].ms)]);
      if (cancelled) return;
      track({ name: "mood_analyzed", value: analysis.mood, source: analysis.source });
      dispatch({ type: "ANALYZE_MOOD", result: analysis, sessionId });
      const mood = analysis.mood;
      const worldId = resolveWorld(colorwayKey, mood, journey);
      const world = applyComboBackground(WORLDS[worldId], colorwayKey, { mood, journey });
      let elapsed = 0;
      OPENING_STAGES.forEach((stage, index) => {
        if (index === 0) return;
        if (index === 1) setStageIndex(index);
        else timers.push(setTimeout(() => setStageIndex(index), elapsed));
        elapsed += stage.ms;
      });
      void checkHealth().then((ok) => {
        if (!cancelled && !ok) track({ name: "backend_unreachable" });
      });
      await Promise.all([
        Promise.allSettled([
          ...(resolveMattingMode() === "segmentation" ? [runtime.getSegmenter()] : []),
          runtime.preloadWorldImage(world), runtime.acquireCamera(),
        ]),
        wait(OPENING_TOTAL_MS - OPENING_STAGES[0].ms),
      ]);
      if (cancelled) return;
      track({ name: "world_resolved", worldId, mood, journey });
      console.info("[portal] world reason:", buildWorldReason(mood, journey, world));
      dispatch({ type: "RESOLVE_WORLD", worldId });
    })();
    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
  }, [dispatch, runtime]);

  return (
    <div
      className="flex h-full min-h-screen flex-col items-center justify-center gap-10 bg-cover bg-center px-8 text-center"
      style={{
        // 05 로딩 화면 배경(load). 종이빛 베일을 얹어 어두운 스피너·문구가 읽히게 하고,
        // 파일이 없으면 기존 종이색(paper)으로 폴백합니다.
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

      {/* key 로 단계마다 fadeIn 을 다시 재생시킵니다 (제자리에서 툭 바뀌면 어색). */}
      <p
        key={stageIndex}
        className="animate-fadeIn whitespace-pre-line text-lg leading-relaxed text-ink/90"
      >
        {OPENING_STAGES[stageIndex].message}
      </p>

      {/* 진행 점 — 지나온 단계는 채우고 현재 단계만 깜빡입니다. 10초쯤 머무는
          화면이라 "어디까지 왔는지" 가 보여야 멈춘 걸로 오해하지 않습니다. */}
      <div className="flex gap-2.5" aria-hidden>
        {OPENING_STAGES.map((_, i) => (
          <span
            key={i}
            className={[
              "h-1.5 w-1.5 rounded-full transition-colors duration-500",
              i < stageIndex ? "bg-ink/45" : i === stageIndex ? "animate-pulse bg-ink/45" : "bg-ink/15",
            ].join(" ")}
            style={i === stageIndex ? { animationDuration: "1.4s" } : undefined}
          />
        ))}
      </div>
    </div>
  );
}
