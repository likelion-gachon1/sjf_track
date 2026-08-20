"use client";

import { useState } from "react";
import { COPY, JOURNEY_QUESTION, RIPPLE_CONFIG, journeyCardImage } from "@/config/portal.config";
import { track } from "@/lib/analytics";
import { usePortalFlow } from "@/lib/FlowContext";
import type { JourneyKey, QuestionOption } from "@/lib/types";
import { useHoverRipple } from "@/lib/useHoverRipple";
import { useRipple } from "@/lib/useRipple";
import StepFrame from "./StepFrame";

// 03 TRAVEL STYLE (02 / 03) — public/place/ 통합 실사 사진 카드 3장 (컬러웨이 무관).
// 선택과 동시에 04 무드 분석으로 이동합니다.
export default function StepJourney() {
  const { state, dispatch } = usePortalFlow();
  const { trigger, isTransitioning } = useRipple();
  // 고른 카드만 확대하고 나머지를 옅게 하려면, ripple 이 커밋되기 전까지
  // 선택을 이 화면이 들고 있어야 합니다.
  const [selectedKey, setSelectedKey] = useState<JourneyKey | null>(null);

  return (
    <StepFrame
      stepNumber={2}
      heading={COPY.journeyHeading}
      footnote={COPY.journeyFootnote}
    >
      <div className="flex justify-center gap-8">
        {JOURNEY_QUESTION.options.map((option) => (
          <JourneyCard
            key={option.key}
            option={option}
            image={journeyCardImage(option.key)}
            disabled={isTransitioning}
            isSelected={selectedKey === option.key}
            isDimmed={selectedKey !== null && selectedKey !== option.key}
            onSelect={(e) => {
              // 동기적으로 먼저 찍어야 클릭한 그 프레임부터 확대가 시작됩니다.
              setSelectedKey(option.key);
              trigger(e, () => {
                dispatch({ type: "ANSWER_JOURNEY", value: option.key });
                track({ name: "journey_selected", value: option.key });
              });
            }}
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
  isSelected,
  isDimmed,
  onSelect,
}: {
  option: QuestionOption<JourneyKey>;
  image?: string;
  disabled: boolean;
  /** 이 카드가 방금 선택됨 — 사진이 확대되고 카드가 앞으로 나옵니다. */
  isSelected: boolean;
  /** 다른 카드가 선택돼 이 카드는 옅어질 차례. */
  isDimmed: boolean;
  onSelect: (e: React.MouseEvent) => void;
}) {
  const { handlers, layer } = useHoverRipple(disabled);
  const [broken, setBroken] = useState(false);
  const showPhoto = Boolean(image) && !broken;
  const label = option.label.replace(/\n/g, " ");
  // config 값이라 Tailwind 클래스로는 못 씁니다(JIT 가 동적 문자열을 못 읽음).
  // 화면 전환과 같은 박자로 끝나도록 stepMs 를 그대로 씁니다.
  const transitionDuration = `${RIPPLE_CONFIG.stepMs}ms`;

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onSelect}
      {...handlers}
      style={{
        transitionDuration,
        opacity: isDimmed ? RIPPLE_CONFIG.journeySelectDimOpacity : 1,
        transform: isSelected ? `scale(${RIPPLE_CONFIG.journeySelectZoomScale})` : undefined,
      }}
      className={[
        "group relative h-96 w-64 overflow-hidden rounded-2xl border border-ink/10 bg-[#eceae5] shadow-[0_18px_50px_-28px_rgba(0,0,0,0.5)] transition-[transform,opacity] disabled:cursor-default",
        isSelected ? "z-10" : "hover:-translate-y-1 disabled:hover:translate-y-0",
      ].join(" ")}
    >
      {layer}

      {showPhoto && image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={image}
          alt={label}
          onError={() => setBroken(true)}
          style={{
            transitionDuration,
            // 카드 확대 위에 사진만 절반 배율로 한 겹 더 — 시차(parallax)가 생겨
            // "사진 속으로 들어가는" 느낌이 납니다.
            transform: isSelected
              ? `scale(${1 + (RIPPLE_CONFIG.journeySelectZoomScale - 1) / 2})`
              : undefined,
          }}
          className="absolute inset-0 h-full w-full object-cover transition-transform"
        />
      )}

      {/* 하단 가독성용 그라데이션 + 라벨 */}
      <span className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/45 to-transparent" />
      <span className="absolute inset-x-0 bottom-6 text-center text-base font-semibold tracking-wide text-white [text-shadow:0_1px_6px_rgba(0,0,0,0.55)]">
        {label}
      </span>
    </button>
  );
}
