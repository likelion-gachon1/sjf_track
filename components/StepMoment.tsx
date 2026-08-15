"use client";

import { COPY } from "@/config/portal.config";
import { findProductChoice } from "@/config/products.config";
import { usePortalFlow } from "@/lib/FlowContext";

// 09 YOUR MCM MOMENT
// 촬영 직후, 찍은 사진을 크게 보여주는 화면. "다음"으로 08 QR 로 넘어갑니다.
export default function StepMoment() {
  const { state, dispatch } = usePortalFlow();
  const choice = findProductChoice(state.productId, state.colorwayKey);
  const pointColor = choice?.colorway.hex ?? "#0a0a0a";

  return (
    <div className="flex h-full min-h-screen flex-col items-center justify-center bg-paper px-8 py-12 text-center">
      <p className="text-xs tracking-widest2 text-ink/45">{COPY.momentEyebrow}</p>

      <div
        className="mt-5 overflow-hidden rounded-2xl border bg-white shadow-[0_24px_70px_-30px_rgba(0,0,0,0.55)]"
        style={{ borderColor: pointColor }}
      >
        {state.capturedImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={state.capturedImage}
            alt="촬영된 순간"
            className="block max-h-[64vh] w-auto max-w-[80vw] object-contain"
          />
        ) : (
          <div className="flex h-[46vh] w-[70vw] max-w-3xl items-center justify-center text-sm text-ink/30">
            사진을 불러오는 중...
          </div>
        )}
      </div>

      <p className="mt-6 text-sm text-ink/60">{COPY.momentCaption}</p>

      <button
        type="button"
        onClick={() => dispatch({ type: "SHOW_QR" })}
        className="mt-8 flex items-center gap-4 rounded-full bg-ink px-12 py-3.5 text-sm tracking-widest text-white transition-colors hover:bg-ink/85"
      >
        {COPY.momentNext}
        <ArrowRight />
      </button>
    </div>
  );
}

function ArrowRight() {
  return (
    <svg width="28" height="8" viewBox="0 0 28 8" fill="none" aria-hidden>
      <path d="M0 4h26M22 1l4 3-4 3" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}
