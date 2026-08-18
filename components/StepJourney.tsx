"use client";

import { useState } from "react";
import { COPY, JOURNEY_QUESTION, comboBackgroundImage } from "@/config/portal.config";
import { track } from "@/lib/analytics";
import { usePortalFlow } from "@/lib/FlowContext";
import type { JourneyKey, QuestionOption } from "@/lib/types";
import { useHoverRipple } from "@/lib/useHoverRipple";
import { useRipple } from "@/lib/useRipple";
import StepFrame from "./StepFrame";

// 04 TRAVEL STYLE (03 / 03) — 목업: 조합 실사 사진(variant 1) 카드 3장.
// 이미 고른 (컬러웨이 × 무드) 기준으로 각 여정의 미리보기 배경을 보여줍니다.
// 선택과 동시에 05로 이동합니다.
export default function StepJourney() {
  const { state, dispatch } = usePortalFlow();
  const { trigger, isTransitioning } = useRipple();

  return (
    <StepFrame
      stepNumber={3}
      heading={COPY.journeyHeading}
      footnote={COPY.journeyFootnote}
    >
      <div className="flex justify-center gap-8">
        {JOURNEY_QUESTION.options.map((option) => (
          <JourneyCard
            key={option.key}
            option={option}
            // 카드 미리보기는 variant 1 을 씁니다 (촬영 배경은 variant 2).
            image={comboBackgroundImage(
              state.colorwayKey,
              { mood: state.answers.mood, journey: option.key },
              1
            )}
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

function JourneyCard({
  option,
  image,
  disabled,
  onSelect,
}: {
  option: QuestionOption<JourneyKey>;
  image?: string;
  disabled: boolean;
  onSelect: (e: React.MouseEvent) => void;
}) {
  const { handlers, layer } = useHoverRipple(disabled);
  const [broken, setBroken] = useState(false);
  const showPhoto = Boolean(image) && !broken;
  const label = option.label.replace(/\n/g, " ");

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onSelect}
      {...handlers}
      className="group relative h-96 w-64 overflow-hidden rounded-2xl border border-ink/10 bg-[#eceae5] shadow-[0_18px_50px_-28px_rgba(0,0,0,0.5)] transition-transform hover:-translate-y-1 disabled:cursor-default disabled:hover:translate-y-0"
    >
      {layer}

      {showPhoto && image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={image}
          alt={label}
          onError={() => setBroken(true)}
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}

      {/* 하단 가독성용 그라데이션 + 라벨 */}
      <span className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/45 to-transparent" />
      <span className="absolute inset-x-0 bottom-6 text-center text-base font-medium tracking-wide text-white [text-shadow:0_1px_6px_rgba(0,0,0,0.55)]">
        {label}
      </span>
    </button>
  );
}
