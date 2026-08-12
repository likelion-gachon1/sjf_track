"use client";

import { COPY, WORLDS, getAlternateWorlds, getWorldMapping } from "@/config/portal.config";
import { usePortalFlow } from "@/lib/FlowContext";
import type { WorldDef } from "@/lib/types";
import GradientCard from "./GradientCard";
import MirrorStage from "./MirrorStage";

export default function StepMirror() {
  const { state, dispatch } = usePortalFlow();
  const { mood, color } = state.answers;

  if (!state.selectedWorldId || !mood || !color) {
    return null;
  }

  const currentWorld = WORLDS[state.selectedWorldId];
  const mapping = getWorldMapping(mood, color);
  const primaryWorld = WORLDS[mapping.worldId];
  const [altA, altB] = getAlternateWorlds(mapping.worldId);
  const choices: WorldDef[] = [primaryWorld, altA, altB];

  return (
    <div
      className="relative flex h-full min-h-screen flex-col items-center justify-between px-8 py-12"
      style={{ backgroundImage: currentWorld.gradient }}
    >
      <p
        className={[
          "text-xs uppercase tracking-widest2",
          currentWorld.textOn === "light" ? "text-white/70" : "text-ink/50",
        ].join(" ")}
      >
        {currentWorld.name}
      </p>

      <div className="flex flex-col items-center gap-3">
        <MirrorStage />
        <p
          className={[
            "max-w-md text-center text-xs",
            currentWorld.textOn === "light" ? "text-white/60" : "text-ink/40",
          ].join(" ")}
        >
          {COPY.mirrorHint}
        </p>
      </div>

      <div className="flex w-full max-w-3xl flex-col items-center gap-4">
        <p
          className={[
            "text-xs uppercase tracking-widest2",
            currentWorld.textOn === "light" ? "text-white/60" : "text-ink/40",
          ].join(" ")}
        >
          {COPY.mirrorThumbLabel}
        </p>
        <div className="flex gap-4">
          {choices.map((world) => (
            <GradientCard
              key={world.id}
              world={world}
              size="xs"
              selected={world.id === currentWorld.id}
              onClick={() => dispatch({ type: "CHANGE_WORLD", worldId: world.id })}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={() => dispatch({ type: "CAPTURE" })}
          className="mt-4 rounded-full bg-ink px-14 py-4 text-sm uppercase tracking-widest text-white transition-colors hover:bg-ink/85"
        >
          {COPY.captureButton}
        </button>
      </div>
    </div>
  );
}
