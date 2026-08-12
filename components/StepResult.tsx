"use client";

import { COPY, WORLDS } from "@/config/portal.config";
import { formatTime } from "@/lib/format";
import { usePortalFlow } from "@/lib/FlowContext";
import GradientCard from "./GradientCard";

export default function StepResult() {
  const { state, dispatch } = usePortalFlow();

  if (!state.selectedWorldId) {
    return null;
  }

  const world = WORLDS[state.selectedWorldId];
  const capturedAt = state.capturedAt ?? Date.now();
  const alreadySaved = state.savedMoments.some(
    (m) => m.worldId === world.id && m.savedAt === capturedAt
  );

  return (
    <div className="flex h-full min-h-screen flex-col items-center bg-paper px-8 py-16 text-center">
      <h2 className="font-serif text-4xl">{COPY.resultSaveHeading}</h2>

      <div className="mt-10 w-full max-w-xl">
        <GradientCard world={world} size="lg">
          <div className="mt-4 flex items-center justify-between text-xs opacity-80">
            <span className="font-serif tracking-widest">{COPY.brandName}</span>
            <span>{formatTime(capturedAt)}</span>
          </div>
        </GradientCard>
      </div>

      <div className="mt-8 flex gap-4">
        <button
          type="button"
          disabled={alreadySaved}
          onClick={() => dispatch({ type: "SAVE_MOMENT" })}
          className={[
            "rounded-full px-8 py-3 text-sm uppercase tracking-widest transition-colors",
            alreadySaved
              ? "cursor-default bg-ink/10 text-ink/40"
              : "bg-ink text-white hover:bg-ink/85",
          ].join(" ")}
        >
          {alreadySaved ? COPY.saveMomentDone : COPY.saveMomentButton}
        </button>
        <button
          type="button"
          disabled={state.productInterestSaved}
          onClick={() => dispatch({ type: "SAVE_PRODUCT_INTEREST" })}
          className={[
            "rounded-full border px-8 py-3 text-sm uppercase tracking-widest transition-colors",
            state.productInterestSaved
              ? "cursor-default border-ink/10 text-ink/40"
              : "border-accent text-accent hover:bg-accent/5",
          ].join(" ")}
        >
          {state.productInterestSaved ? COPY.saveProductDone : COPY.saveProductButton}
        </button>
      </div>

      {state.savedMoments.length > 0 && (
        <div className="mt-16 w-full max-w-3xl">
          <p className="font-serif text-xl">{COPY.galleryHeading}</p>
          <p className="mt-1 text-xs text-ink/40">{COPY.gallerySubline}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-4">
            {state.savedMoments.map((moment) => (
              <div key={moment.id} className="flex flex-col items-center gap-2">
                <GradientCard world={WORLDS[moment.worldId]} size="xs" />
                <span className="text-[11px] text-ink/40">{formatTime(moment.savedAt)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-16 flex h-32 w-32 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-ink/25 text-ink/40">
        <span className="font-serif text-lg">{COPY.qrLabel}</span>
      </div>
      <p className="mt-2 max-w-xs text-xs text-ink/40">{COPY.qrCaption}</p>

      <button
        type="button"
        onClick={() => dispatch({ type: "RESET" })}
        className="mt-14 text-xs uppercase tracking-widest2 text-ink/40 underline underline-offset-4 hover:text-ink"
      >
        {COPY.restartButton}
      </button>
    </div>
  );
}
