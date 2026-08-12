"use client";

import {
  COLOR_QUESTION,
  COPY,
  MOOD_QUESTION,
  WORLDS,
  getAlternateWorlds,
  getWorldMapping,
} from "@/config/portal.config";
import { usePortalFlow } from "@/lib/FlowContext";
import GradientCard from "./GradientCard";

export default function StepWorldResult() {
  const { state, dispatch } = usePortalFlow();
  const { mood, color } = state.answers;

  if (!mood || !color) {
    // 답변이 없는 상태로 이 화면에 진입한 경우(개발 중 새로고침 등)를 대비한 방어 코드.
    return null;
  }

  const mapping = getWorldMapping(mood, color);
  const primaryWorld = WORLDS[mapping.worldId];
  const [altA, altB] = getAlternateWorlds(mapping.worldId);

  const moodLabel = MOOD_QUESTION.options.find((o) => o.key === mood)?.label;
  const colorLabel = COLOR_QUESTION.options.find((o) => o.key === color)?.label;

  function selectWorld(worldId: typeof mapping.worldId) {
    dispatch({ type: "SELECT_WORLD", worldId });
  }

  return (
    <div className="flex h-full min-h-screen flex-col items-center justify-center bg-paper px-8 py-16 text-center">
      <p className="text-xs uppercase tracking-widest2 text-ink/40">
        {moodLabel} · {colorLabel}
      </p>
      <h2 className="mt-4 font-serif text-4xl">{COPY.resultHeading}</h2>

      <div className="mt-12 w-full max-w-3xl">
        <GradientCard world={primaryWorld} size="lg" onClick={() => selectWorld(primaryWorld.id)}>
          <p className="mt-4 max-w-md text-sm opacity-90">{mapping.reason}</p>
          <span className="mt-6 inline-block w-fit rounded-full bg-white/90 px-6 py-2 text-xs uppercase tracking-widest text-ink">
            {COPY.resultPrimaryCta}
          </span>
        </GradientCard>
      </div>

      <p className="mt-10 text-xs uppercase tracking-widest2 text-ink/40">
        {COPY.resultAltLabel}
      </p>
      <div className="mt-4 grid w-full max-w-3xl grid-cols-2 gap-6">
        <GradientCard world={altA} size="sm" onClick={() => selectWorld(altA.id)} />
        <GradientCard world={altB} size="sm" onClick={() => selectWorld(altB.id)} />
      </div>
    </div>
  );
}
