"use client";

import { COPY, JOURNEY_QUESTION } from "@/config/portal.config";
import { track } from "@/lib/analytics";
import { usePortalFlow } from "@/lib/FlowContext";
import type { JourneyKey, QuestionOption } from "@/lib/types";
import { useHoverRipple } from "@/lib/useHoverRipple";
import { useRipple } from "@/lib/useRipple";
import StepFrame from "./StepFrame";

// 04 TRAVEL STYLE (03 / 03)
// 선택과 동시에 05로 이동합니다. ripple 이 화면을 완전히 덮은 뒤 전환합니다.
export default function StepJourney() {
  const { dispatch } = usePortalFlow();
  const { trigger, isTransitioning } = useRipple();

  return (
    <StepFrame
      stepNumber={3}
      heading={COPY.journeyHeading}
      subline={COPY.journeySubline}
      footnote={COPY.journeyFootnote}
    >
      <div className="flex justify-center gap-8">
        {JOURNEY_QUESTION.options.map((option) => (
          <JourneyOption
            key={option.key}
            option={option}
            disabled={isTransitioning}
            onSelect={(e) =>
              trigger(e, "final", () => {
                dispatch({ type: "ANSWER_JOURNEY", value: option.key });
                track({ name: "journey_selected", value: option.key });
              })
            }
          />
        ))}
      </div>
    </StepFrame>
  );
}

// 선택지 한 칸. 호버하면 커서 지점에서 물결이 퍼집니다.
function JourneyOption({
  option,
  disabled,
  onSelect,
}: {
  option: QuestionOption<JourneyKey>;
  disabled: boolean;
  onSelect: (e: React.MouseEvent) => void;
}) {
  const { handlers, layer } = useHoverRipple(disabled);

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onSelect}
      {...handlers}
      className="relative flex h-52 w-56 items-center justify-center overflow-hidden rounded-xl border border-ink/15 transition-colors hover:border-accent hover:bg-accent/5 disabled:cursor-default"
    >
      {layer}
      {/* 물결 레이어(absolute) 위에 그려지도록 콘텐츠를 relative 로 감쌉니다. */}
      <span className="relative flex flex-col items-center gap-6">
        <JourneyIcon journey={option.key} />
        <span className="whitespace-pre-line text-sm leading-relaxed text-ink/80">
          {option.label}
        </span>
      </span>
    </button>
  );
}

// 표지판 / 쇼핑백 / 선베드 — 와이어프레임 04 기준, 인라인 SVG.
function JourneyIcon({ journey }: { journey: JourneyKey }) {
  const common = {
    width: 40,
    height: 40,
    viewBox: "0 0 32 32",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    className: "text-ink/70",
  };

  if (journey === "explore") {
    return (
      <svg {...common}>
        <path d="M16 5v22" />
        <path d="M7 8h14l3 3-3 3H7z" />
        <path d="M25 17H11l-3 3 3 3h14z" />
      </svg>
    );
  }

  if (journey === "culture") {
    return (
      <svg {...common}>
        <path d="M7 11h18l-1.5 15h-15z" />
        <path d="M12 11V8a4 4 0 0 1 8 0v3" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <path d="M4 22h24" />
      <path d="M6 22l3-6h9l-1.5 6" />
      <path d="M17 16l7-5" />
      <path d="M24 11l2 2" />
      <path d="M9 22v3M23 22v3" />
    </svg>
  );
}
