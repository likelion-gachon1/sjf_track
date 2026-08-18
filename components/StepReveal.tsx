"use client";

import { useEffect } from "react";
import { COPY, WORLDS } from "@/config/portal.config";
import { findProductChoice } from "@/config/products.config";
import { track } from "@/lib/analytics";
import { usePortalFlow } from "@/lib/FlowContext";
import { usePortalRuntime } from "@/lib/PortalRuntime";

// 06 WORLD REVEAL
// 목업: 비행기 창문 배경(/ui/bg1.jpg) 위에 "Your MCM world is…" + 도착 도시명.
// 조합 실사 배경은 이 화면이 아니라 07 촬영 화면에서 인물 뒤로 합성됩니다.
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

  return (
    <div
      className="relative flex h-full min-h-screen flex-col items-center justify-center overflow-hidden bg-cover bg-center px-8 text-center"
      style={{
        // 리빌은 조합 배경이 아니라 비행기 창문(bg1)을 씁니다. 없으면 노을 폴백.
        backgroundImage:
          "url(/ui/bg1.jpg), linear-gradient(180deg, #cfe0ea 0%, #f4e2c4 46%, #e9b878 74%, #b9793f 100%)",
      }}
    >
      <p className="text-xl text-ink/70">{COPY.revealEyebrow}</p>

      <h2 className="mt-3 font-sans text-7xl font-bold tracking-tight text-ink">
        {world.displayName}
      </h2>

      <button
        type="button"
        onClick={() => {
          dispatch({ type: "ENTER_PORTAL" });
          track({ name: "portal_entered", worldId: world.id });
        }}
        className="mt-24 rounded-full bg-white/75 px-12 py-3.5 text-sm tracking-widest text-ink backdrop-blur-sm transition-colors hover:bg-white/90"
        // 제품 컬러웨이가 포인트 컬러로 들어갑니다 (07 합성 화면에는 적용하지 않습니다).
        style={{ boxShadow: `inset 0 0 0 1.5px ${choice?.colorway.hex ?? "transparent"}` }}
      >
        {COPY.revealCta}
      </button>
    </div>
  );
}
