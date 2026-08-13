"use client";

import { useEffect } from "react";
import { COPY, WORLDS } from "@/config/portal.config";
import { findProductChoice } from "@/config/products.config";
import { track } from "@/lib/analytics";
import { usePortalFlow } from "@/lib/FlowContext";
import { usePortalRuntime } from "@/lib/PortalRuntime";

// 06 WORLD REVEAL
// 결과 World를 처음으로, 강하게 공개하는 화면입니다.
// 와이어프레임 확정: 이유 문구 / 대안 World 카드는 넣지 않습니다.
export default function StepReveal() {
  const { state, dispatch } = usePortalFlow();
  const runtime = usePortalRuntime();

  const world = state.selectedWorldId ? WORLDS[state.selectedWorldId] : null;
  const choice = findProductChoice(state.productId, state.colorwayKey);

  useEffect(() => {
    if (!world) return;
    // 01 START 에서 언락해둔 오디오로 재생 → 볼륨 0에서 페이드인.
    runtime.playBgm(world.bgm);
  }, [runtime, world]);

  if (!world) return null;

  const onLight = world.textOn === "light";

  return (
    <div
      className="relative flex h-full min-h-screen flex-col items-center justify-center bg-cover bg-center px-8 text-center"
      style={{
        backgroundImage: world.backgroundImage
          ? `url(${world.backgroundImage})`
          : world.gradient,
      }}
    >
      <p
        className={[
          "text-xs tracking-widest2",
          onLight ? "text-white/70" : "text-ink/50",
        ].join(" ")}
      >
        {COPY.revealEyebrow}
      </p>

      <h2
        className={[
          "mt-5 font-serif text-7xl tracking-wide",
          onLight ? "text-white" : "text-ink",
        ].join(" ")}
      >
        {world.displayName}
      </h2>

      <button
        type="button"
        onClick={() => {
          dispatch({ type: "ENTER_PORTAL" });
          track({ name: "portal_entered", worldId: world.id });
        }}
        className="mt-16 flex items-center gap-4 rounded-full border-2 bg-white/90 px-12 py-3.5 text-sm tracking-widest text-ink transition-colors hover:bg-white"
        // 제품 컬러웨이가 포인트 컬러로 들어갑니다 (07 합성 화면에는 적용하지 않습니다).
        style={{ borderColor: choice?.colorway.hex ?? "transparent" }}
      >
        {COPY.revealCta}
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
