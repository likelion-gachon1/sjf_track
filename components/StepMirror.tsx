"use client";

import { COPY, WORLDS } from "@/config/portal.config";
import { track } from "@/lib/analytics";
import { usePortalFlow } from "@/lib/FlowContext";
import { usePortalRuntime } from "@/lib/PortalRuntime";
import MirrorStage from "./MirrorStage";

// 07 EXPERIENCE
// 몰입이 최우선인 화면입니다. 추가 UI는 우상단 음소거 토글 하나뿐입니다
// (World 썸네일 없음 — 와이어프레임 확정).
export default function StepMirror() {
  const { state, dispatch } = usePortalFlow();
  const runtime = usePortalRuntime();

  const world = state.selectedWorldId ? WORLDS[state.selectedWorldId] : null;
  if (!world) return null;

  const handleCapture = (dataUrl: string) => {
    dispatch({ type: "CAPTURE", dataUrl });
    track({ name: "photo_captured", worldId: world.id });
  };

  const handleMuteToggle = () => {
    const nextMuted = !state.bgmMuted;
    dispatch({ type: "TOGGLE_BGM_MUTE" });
    runtime.setBgmMuted(nextMuted);
    track({ name: "bgm_muted", muted: nextMuted });
  };

  return (
    <div className="relative h-screen w-full overflow-hidden bg-black">
      <MirrorStage world={world} onCapture={handleCapture} />

      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between px-8 py-7">
        <p className="text-xs tracking-widest2 text-white [text-shadow:0_1px_6px_rgba(0,0,0,0.55)]">
          {COPY.brandName} — {world.displayName}
        </p>

        <button
          type="button"
          onClick={handleMuteToggle}
          aria-label={state.bgmMuted ? COPY.bgmMutedLabel : COPY.bgmOnLabel}
          aria-pressed={state.bgmMuted}
          className="pointer-events-auto rounded-full p-2 text-white transition-colors hover:bg-white/15 [filter:drop-shadow(0_1px_4px_rgba(0,0,0,0.55))]"
        >
          {state.bgmMuted ? <SpeakerMutedIcon /> : <SpeakerOnIcon />}
        </button>
      </div>
    </div>
  );
}

const SPEAKER_BODY = "M4 10v4h3l4 3.5V6.5L7 10H4z";

function SpeakerOnIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d={SPEAKER_BODY} />
      <path d="M14.5 9.2a4 4 0 0 1 0 5.6" />
      <path d="M16.8 6.8a7.2 7.2 0 0 1 0 10.4" />
    </svg>
  );
}

function SpeakerMutedIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d={SPEAKER_BODY} />
      <path d="M14.5 10l5 4M19.5 10l-5 4" />
    </svg>
  );
}
