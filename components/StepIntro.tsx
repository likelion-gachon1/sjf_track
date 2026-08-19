"use client";

import { useState } from "react";
import { COPY } from "@/config/portal.config";
import { setAnalyticsSessionId, track } from "@/lib/analytics";
import { createSessionId, usePortalFlow } from "@/lib/FlowContext";
import { usePortalRuntime } from "@/lib/PortalRuntime";

// 01 START
// 목업: 비행기 창문 배경(/ui/bg1.jpg) 위에 카드 없이 바로 MCM 엠블럼 → MCM PORTAL →
// "Where will MCM take you?" → 동의 체크 → 여행 시작하기. 배경 파일이 없으면 노을
// 그라데이션으로 폴백합니다.
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
    <div
      className="relative flex h-full min-h-screen flex-col items-center justify-center overflow-hidden bg-cover bg-center px-8 text-center"
      style={{
        // 비행기 창문 배경(bg1). 파일이 없으면 따뜻한 노을 그라데이션으로 폴백합니다.
        backgroundImage:
          "url(/ui/bg1.jpg), linear-gradient(180deg, #cfe0ea 0%, #f4e2c4 46%, #e9b878 74%, #b9793f 100%)",
      }}
    >
      <Emblem />

      <h1 className="mt-6 font-sans text-6xl font-extrabold tracking-tight text-ink">
        MCM PORTAL
      </h1>

      <p className="mt-6 text-xl text-ink/90">Where will MCM take you?</p>

      <label className="mt-24 flex cursor-pointer items-center gap-3 text-sm text-ink/90">
        <input
          type="checkbox"
          checked={state.consent}
          onChange={(e) => dispatch({ type: "SET_CONSENT", value: e.target.checked })}
          className="h-4 w-4 accent-ink"
        />
        {COPY.consentLabel}
      </label>

      <button
        type="button"
        disabled={!state.consent}
        onClick={handleStart}
        className={[
          "mt-6 rounded-full px-12 py-3.5 text-sm tracking-widest backdrop-blur-sm transition-colors",
          state.consent
            ? "bg-white/75 text-ink hover:bg-white/90"
            : "cursor-not-allowed bg-white/40 text-ink/70",
        ].join(" ")}
      >
        여행 시작하기
      </button>
    </div>
  );
}

// MCM 엠블럼. /ui/MCM_logo.png (검정 날개 마크, 투명 배경) 를 씁니다.
// 로드에 실패하면(파일 누락 등) 기존 SVG 플레이스홀더로 자동 폴백합니다.
function Emblem() {
  const [broken, setBroken] = useState(false);

  if (broken) {
    return (
      <svg viewBox="0 0 52 52" fill="none" aria-hidden className="h-[3.75rem] w-[3.75rem]">
        <circle cx="26" cy="26" r="24" stroke="#0a0a0a" strokeWidth="1.2" />
        <path
          d="M26 12l4 9 9 1-6.5 6 1.7 9-8.2-4.6L17.5 47l1.7-9L12.7 22l9-1z"
          fill="#0a0a0a"
          opacity="0.9"
          transform="scale(0.7) translate(11 6)"
        />
        <path d="M14 26h24" stroke="#0a0a0a" strokeWidth="0.8" opacity="0.5" />
      </svg>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/ui/MCM_logo.png"
      alt="MCM"
      onError={() => setBroken(true)}
      className="h-16 w-auto object-contain"
    />
  );
}
