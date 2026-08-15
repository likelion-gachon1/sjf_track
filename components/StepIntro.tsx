"use client";

import { COPY } from "@/config/portal.config";
import { setAnalyticsSessionId, track } from "@/lib/analytics";
import { createSessionId, usePortalFlow } from "@/lib/FlowContext";
import { usePortalRuntime } from "@/lib/PortalRuntime";

// 01 START
// 목업 기준: 비행기 창문 밖 노을 배경 위에 MCM 엠블럼 → 타이틀 → 서브라인 →
// 동의 체크 → 시작 버튼. 배경 이미지(/ui/intro-window.webp)가 없으면 따뜻한
// 노을 그라데이션으로 폴백합니다(앱이 깨지지 않도록).
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
        // 실사 배경이 준비되면 사용, 없으면 따뜻한 노을 그라데이션으로 폴백.
        backgroundImage:
          "linear-gradient(180deg, rgba(20,14,8,0.28) 0%, rgba(20,14,8,0.05) 30%, rgba(20,14,8,0.10) 100%), url(/ui/intro-window.webp), linear-gradient(180deg, #cfe0ea 0%, #f4e2c4 46%, #e9b878 74%, #b9793f 100%)",
      }}
    >
      {/* 빈티지 스탬프 — 좌상/우하 코너 장식 (에셋 없이 CSS 로 목업) */}
      <Stamp className="left-8 top-8 -rotate-12" label="MCM · AVANTURE" />
      <Stamp className="bottom-8 right-8 rotate-6" label="PORTAL · 2026" />

      {/* 가독성용 종이빛 카드 배경 */}
      <div className="relative flex flex-col items-center rounded-3xl bg-paper/70 px-16 py-14 backdrop-blur-sm shadow-[0_20px_60px_-30px_rgba(0,0,0,0.5)]">
        <Emblem />

        <h1 className="mt-6 font-serif text-6xl tracking-wide text-ink">
          {COPY.brandName}
        </h1>

        <p className="mt-5 text-base leading-relaxed text-ink/70">
          MCM과 함께, 새로운 세계로.
        </p>

        <label className="mt-10 flex cursor-pointer items-center gap-3 text-sm text-ink/60">
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
            "mt-8 flex items-center gap-4 rounded-full px-12 py-4 text-sm tracking-widest transition-colors",
            state.consent
              ? "bg-ink text-white hover:bg-ink/85"
              : "cursor-not-allowed bg-ink/20 text-white/50",
          ].join(" ")}
        >
          PORTAL 시작하기
          <ArrowRight />
        </button>
      </div>
    </div>
  );
}

// MCM 을 상징하는 골드 엠블럼 자리 (실제 로고 에셋으로 교체 가능).
function Emblem() {
  return (
    <svg width="52" height="52" viewBox="0 0 52 52" fill="none" aria-hidden>
      <circle cx="26" cy="26" r="24" stroke="#b08d57" strokeWidth="1.2" />
      <path
        d="M26 12l4 9 9 1-6.5 6 1.7 9-8.2-4.6L17.5 47l1.7-9L12.7 22l9-1z"
        fill="#b08d57"
        opacity="0.9"
        transform="scale(0.7) translate(11 6)"
      />
      <path d="M14 26h24" stroke="#b08d57" strokeWidth="0.8" opacity="0.5" />
    </svg>
  );
}

function Stamp({ className, label }: { className?: string; label: string }) {
  return (
    <div
      className={[
        "pointer-events-none absolute flex h-24 w-24 items-center justify-center rounded-full border-2 border-accent/40 text-[9px] font-medium uppercase tracking-widest text-accent/50",
        className ?? "",
      ].join(" ")}
    >
      <span className="max-w-[70%] text-center leading-tight">{label}</span>
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
