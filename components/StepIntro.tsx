"use client";

import { COPY } from "@/config/portal.config";
import { usePortalFlow } from "@/lib/FlowContext";

export default function StepIntro() {
  const { state, dispatch } = usePortalFlow();

  return (
    <div className="flex h-full min-h-screen flex-col items-center justify-center bg-ink px-8 text-center text-white">
      <p className="mb-6 text-xs uppercase tracking-widest2 text-white/50">
        MCM Flagship Store Experience
      </p>
      <h1 className="font-serif text-7xl">{COPY.brandName}</h1>
      <p className="mt-8 max-w-xl text-lg leading-relaxed text-white/80">
        {COPY.introTagline}
      </p>
      <p className="mt-2 text-base text-white/50">{COPY.introSubline}</p>

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
        onClick={() => dispatch({ type: "START" })}
        className={[
          "mt-8 rounded-full border px-12 py-3 text-sm uppercase tracking-widest transition-colors",
          state.consent
            ? "border-accent bg-accent text-ink hover:bg-accent/90"
            : "cursor-not-allowed border-white/20 text-white/30",
        ].join(" ")}
      >
        {COPY.startButton}
      </button>
    </div>
  );
}
