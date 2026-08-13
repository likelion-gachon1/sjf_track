"use client";

import { COPY, MOOD_QUESTION } from "@/config/portal.config";
import { track } from "@/lib/analytics";
import { usePortalFlow } from "@/lib/FlowContext";
import type { MoodKey } from "@/lib/types";
import { useRipple } from "@/lib/useRipple";
import StepFrame from "./StepFrame";

// 03 MOOD (02 / 03)
// ⚠️ 분위기는 내부적으로 시간대(낮/노을/밤) 축에 반영되지만, 그 축을 화면에
//    드러내지 않습니다. 아이콘도 "빛의 세기"만 다르게 표현합니다.
export default function StepMood() {
  const { dispatch } = usePortalFlow();
  const { trigger, isTransitioning } = useRipple();

  return (
    <StepFrame stepNumber={2} heading={COPY.moodHeading} subline={COPY.moodSubline}>
      {/* 추상 비주얼 — 에셋이 없어 CSS radial-gradient + blur 로 목업했습니다. */}
      <div className="relative mb-14 h-48 w-full max-w-2xl overflow-hidden">
        <div
          className="absolute inset-0 blur-2xl"
          style={{
            backgroundImage: [
              "radial-gradient(38% 60% at 50% 50%, rgba(255,255,255,0.95), rgba(255,255,255,0) 70%)",
              "radial-gradient(30% 45% at 38% 45%, rgba(176,141,87,0.28), rgba(176,141,87,0) 72%)",
              "radial-gradient(34% 50% at 62% 55%, rgba(120,130,180,0.22), rgba(120,130,180,0) 72%)",
              "radial-gradient(60% 80% at 50% 50%, rgba(10,10,10,0.10), rgba(10,10,10,0) 70%)",
            ].join(", "),
          }}
        />
        <div
          className="absolute inset-0 opacity-70 blur-xl"
          style={{
            backgroundImage:
              "repeating-radial-gradient(circle at 50% 50%, rgba(10,10,10,0.08) 0 1px, rgba(10,10,10,0) 1px 14px)",
          }}
        />
      </div>

      <div className="flex justify-center gap-6">
        {MOOD_QUESTION.options.map((option) => (
          <button
            key={option.key}
            type="button"
            disabled={isTransitioning}
            onClick={(e) =>
              trigger(e, "step", () => {
                dispatch({ type: "ANSWER_MOOD", value: option.key });
                track({ name: "mood_selected", value: option.key });
              })
            }
            className="flex h-36 w-44 flex-col items-center justify-center gap-4 rounded-xl border border-ink/15 transition-colors hover:border-accent hover:bg-accent/5 disabled:cursor-default"
          >
            <MoodIcon mood={option.key} />
            <span className="whitespace-pre-line text-sm leading-relaxed text-ink/80">
              {option.label}
            </span>
          </button>
        ))}
      </div>
    </StepFrame>
  );
}

// 빛의 세기만 다른 3종 (가볍게 → 차분하게 → 강렬하게). 아이콘 패키지 없이 인라인 SVG.
function MoodIcon({ mood }: { mood: MoodKey }) {
  const rays =
    mood === "light"
      ? { count: 4, length: 3.5, width: 0.9 }
      : mood === "calm"
        ? { count: 8, length: 2.5, width: 0.8 }
        : { count: 12, length: 5, width: 1.2 };

  const lines = Array.from({ length: rays.count }, (_, i) => {
    const angle = (i * 360) / rays.count;
    const rad = (angle * Math.PI) / 180;
    const inner = 7;
    const outer = inner + rays.length;
    return (
      <line
        key={angle}
        x1={12 + Math.cos(rad) * inner}
        y1={12 + Math.sin(rad) * inner}
        x2={12 + Math.cos(rad) * outer}
        y2={12 + Math.sin(rad) * outer}
        strokeWidth={rays.width}
      />
    );
  });

  return (
    <svg width="34" height="34" viewBox="0 0 24 24" aria-hidden>
      <g stroke="currentColor" strokeLinecap="round" className="text-ink/70">
        <circle cx="12" cy="12" r="4.2" fill="none" strokeWidth={mood === "bold" ? 1.4 : 1} />
        {lines}
      </g>
    </svg>
  );
}
