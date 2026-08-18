"use client";

import { COPY, MOOD_QUESTION } from "@/config/portal.config";
import { track } from "@/lib/analytics";
import { usePortalFlow } from "@/lib/FlowContext";
import type { MoodKey, QuestionOption } from "@/lib/types";
import { useHoverRipple } from "@/lib/useHoverRipple";
import { useMotionAllowed, useRipple } from "@/lib/useRipple";
import StepFrame from "./StepFrame";

// 03 MOOD (02 / 03)
// ⚠️ 분위기는 내부적으로 시간대(낮/노을/밤) 축에 반영되지만, 그 축을 화면에
//    드러내지 않습니다. 아이콘도 "빛의 세기"만 다르게 표현합니다.
export default function StepMood() {
  const { dispatch } = usePortalFlow();
  const { trigger, isTransitioning } = useRipple();

  return (
    <StepFrame stepNumber={2} heading={COPY.moodHeading} subline={COPY.moodSubline}>
      {/* 추상 비주얼 — 와이어프레임 03 의 궤도 그래픽. 인라인 SVG (에셋 불필요). */}
      <div className="mb-12 flex h-48 w-full max-w-2xl items-center justify-center">
        <OrbitVisual />
      </div>

      <div className="flex justify-center gap-6">
        {MOOD_QUESTION.options.map((option) => (
          <MoodOption
            key={option.key}
            option={option}
            disabled={isTransitioning}
            onSelect={(e) =>
              trigger(e, "step", () => {
                dispatch({ type: "ANSWER_MOOD", value: option.key });
                track({ name: "mood_selected", value: option.key });
              })
            }
          />
        ))}
      </div>
    </StepFrame>
  );
}

// 선택지 한 칸. 호버하면 커서 지점에서 물결이 퍼집니다.
function MoodOption({
  option,
  disabled,
  onSelect,
}: {
  option: QuestionOption<MoodKey>;
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
      className="relative flex h-40 w-48 items-center justify-center overflow-hidden rounded-xl border border-ink/15 transition-colors hover:border-accent hover:bg-accent/5 disabled:cursor-default"
    >
      {layer}
      {/* 물결 레이어(absolute) 위에 그려지도록 콘텐츠를 relative 로 감쌉니다. */}
      <span className="relative flex flex-col items-center gap-3">
        <MoodIcon mood={option.key} />
        <span className="text-base tracking-wide text-ink">{option.label}</span>
        {option.description && (
          <span className="text-xs leading-relaxed text-ink/50">{option.description}</span>
        )}
      </span>
    </button>
  );
}

// 겹쳐 도는 타원 궤도 + 중심 글로우. 시간대 축을 드러내지 않는 추상 비주얼입니다.
// 회전은 아주 느리게(60초 1바퀴) 돌고, 접근성 설정에서 모션을 줄이면 멈춥니다.
const ORBITS = [
  { rx: 172, ry: 52, angle: 0, opacity: 0.3 },
  { rx: 154, ry: 64, angle: 27, opacity: 0.24 },
  { rx: 134, ry: 72, angle: -33, opacity: 0.18 },
  { rx: 102, ry: 46, angle: 64, opacity: 0.13 },
];

// 궤도 위에 흩어진 입자. [x, y, r]
const PARTICLES = [
  [408, 96, 2.4],
  [78, 108, 1.8],
  [246, 32, 1.6],
  [190, 168, 2],
  [330, 148, 1.5],
];

function OrbitVisual() {
  // Tailwind 의 motion-safe: 는 OS 설정만 보므로, config 로 덮어쓸 수 있게 JS 로 판정합니다.
  const spin = useMotionAllowed();

  return (
    <svg viewBox="0 0 480 200" className="h-full w-full" aria-hidden>
      <defs>
        <radialGradient id="mood-core">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
          <stop offset="40%" stopColor="#b08d57" stopOpacity="0.26" />
          <stop offset="100%" stopColor="#b08d57" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* 중심 글로우 */}
      <ellipse cx="240" cy="100" rx="132" ry="86" fill="url(#mood-core)" />
      <circle cx="240" cy="100" r="17" fill="#ffffff" fillOpacity="0.9" />
      <circle cx="240" cy="100" r="17" fill="none" stroke="#b08d57" strokeOpacity="0.35" />

      <g
        className={spin ? "animate-spin" : undefined}
        style={{
          animationDuration: "60s",
          // 입자가 비대칭이라 fill-box(바운딩박스 중심)로 잡으면 궤도가 흔들립니다.
          // view-box 기준으로 글로우 중심(240,100)에 회전축을 고정합니다.
          transformBox: "view-box",
          transformOrigin: "240px 100px",
        }}
      >
        {ORBITS.map((o) => (
          <ellipse
            key={o.angle}
            cx="240"
            cy="100"
            rx={o.rx}
            ry={o.ry}
            fill="none"
            stroke="#0a0a0a"
            strokeOpacity={o.opacity}
            strokeWidth="0.9"
            transform={`rotate(${o.angle} 240 100)`}
          />
        ))}
        {PARTICLES.map(([cx, cy, r]) => (
          <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} fill="#b08d57" fillOpacity="0.5" />
        ))}
      </g>
    </svg>
  );
}

// 빛의 세기만 다른 3종 (설렘 → 여유 → 자신감). 아이콘 패키지 없이 인라인 SVG.
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
