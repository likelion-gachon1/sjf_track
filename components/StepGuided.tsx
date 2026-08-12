"use client";

import { useState } from "react";
import { COLOR_QUESTION, COPY, MOOD_QUESTION } from "@/config/portal.config";
import { usePortalFlow } from "@/lib/FlowContext";
import type { ColorKey, MoodKey } from "@/lib/types";

export default function StepGuided() {
  const { dispatch } = usePortalFlow();
  const [questionIndex, setQuestionIndex] = useState<0 | 1>(0);

  function handleMoodPick(value: MoodKey) {
    dispatch({ type: "ANSWER_MOOD", value });
    setQuestionIndex(1);
  }

  function handleColorPick(value: ColorKey) {
    dispatch({ type: "ANSWER_COLOR", value });
  }

  const question = questionIndex === 0 ? MOOD_QUESTION : COLOR_QUESTION;

  return (
    <div className="flex h-full min-h-screen flex-col items-center justify-center bg-paper px-8 text-center">
      <p className="text-xs uppercase tracking-widest2 text-ink/40">
        {questionIndex + 1} / 2
      </p>
      <p className="mt-6 max-w-lg text-base text-ink/60">{COPY.guidedGreeting}</p>
      <h2 className="mt-4 font-serif text-4xl">{question.prompt}</h2>

      <div className="mt-12 grid grid-cols-4 gap-4">
        {question.options.map((option) => (
          <button
            key={option.key}
            type="button"
            onClick={() =>
              questionIndex === 0
                ? handleMoodPick(option.key as MoodKey)
                : handleColorPick(option.key as ColorKey)
            }
            className="w-40 rounded-xl border border-ink/15 px-6 py-8 font-serif text-xl transition-colors hover:border-accent hover:bg-accent/5"
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
