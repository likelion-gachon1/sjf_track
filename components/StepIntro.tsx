"use client";

import { COPY } from "@/config/portal.config";
import { setAnalyticsSessionId, track } from "@/lib/analytics";
import { createSessionId, usePortalFlow } from "@/lib/FlowContext";
import { usePortalRuntime } from "@/lib/PortalRuntime";

// 01 START
export default function StepIntro() {
  const { state, dispatch } = usePortalFlow();
  const runtime = usePortalRuntime();

  function handleStart() {
    if (!state.consent) return;

    // ⚠️ 오디오 언락은 이 클릭의 제스처 컨텍스트 안에서 **동기적으로** 일어나야 합니다.
    //    await 뒤나 setTimeout 안에서 호출하면 컨텍스트를 잃어 06 BGM 이 차단됩니다.
    runtime.unlockAudio();

    const sessionId = createSessionId();
    setAnalyticsSessionId(sessionId);
    dispatch({ type: "START", sessionId });
    track({ name: "experience_started" });
  }

  return (
    <div className="relative flex h-full min-h-screen flex-col items-center justify-center bg-ink px-8 text-center text-white">
      <span className="absolute right-10 top-10 text-xs tracking-widest2 text-white/60">
        {COPY.wordmark}
      </span>

      <h1 className="font-serif text-7xl tracking-wide">{COPY.brandName}</h1>

      <p className="mt-10 whitespace-pre-line text-lg leading-relaxed text-white/85">
        {COPY.introTagline}
      </p>
      <p className="mt-6 whitespace-pre-line text-sm leading-relaxed text-white/45">
        {COPY.introSubline}
      </p>

      <label className="mt-14 flex cursor-pointer items-center gap-3 text-sm text-white/70">
        <input
          type="checkbox"
          checked={state.consent}
          onChange={(e) => dispatch({ type: "SET_CONSENT", value: e.target.checked })}
          className="h-4 w-4 accent-accent"
        />
        {COPY.consentLabel}
      </label>

      <button
        type="button"
        disabled={!state.consent}
        onClick={handleStart}
        className={[
          "mt-8 flex items-center gap-4 rounded-full border px-12 py-3.5 text-sm tracking-widest transition-colors",
          state.consent
            ? "border-white/70 text-white hover:bg-white/10"
            : "cursor-not-allowed border-white/20 text-white/30",
        ].join(" ")}
      >
        {COPY.startButton}
        <ArrowRight />
      </button>

      <span className="absolute bottom-10 text-xs tracking-widest2 text-white/40">
        {COPY.wordmark}
      </span>
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
