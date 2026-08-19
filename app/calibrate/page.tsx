"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ChromaKeyTuner, {
  pickKeyColorFromClick,
  useChromaKeyTuning,
} from "@/components/ChromaKeyTuner";
import {
  CAMERA_CONFIG,
  JOURNEY_QUESTION,
  MOOD_QUESTION,
  WORLDS,
  applyComboBackground,
  resolveWorld,
} from "@/config/portal.config";
import { computeStageSize } from "@/lib/composite";
import { PortalRuntimeProvider, usePortalRuntime } from "@/lib/PortalRuntime";
import type { ColorwayKey, JourneyKey, MoodKey } from "@/lib/types";
import { useCamera } from "@/lib/useCamera";
import { useChromaKey } from "@/lib/useChromaKey";

// =============================================================================
// /calibrate — 그린 스크린 크로마키 보정 전용 화면 (부스 플로우와 무관)
// -----------------------------------------------------------------------------
// 01→07 여섯 화면을 걸치지 않고 바로 열어서 **천 앞에서 값을 잡기 위한** 페이지입니다.
// 07 과 같은 훅(useChromaKey)·같은 합성 경로(drawCompositeFrame)를 쓰므로, 여기서 맞춘
// 그림이 실제 촬영 화면과 같습니다.
//
// 여기서 나온 값은 화면에 남지 않습니다 — 패널의 "설정 코드 복사"로 뽑아
// config/portal.config.ts 에 붙여넣는 것이 이 페이지의 산출물입니다.
// =============================================================================

const COLORWAYS: ColorwayKey[] = ["pink", "beige"];

export default function CalibratePage() {
  return (
    <PortalRuntimeProvider>
      <CalibrateStage />
    </PortalRuntimeProvider>
  );
}

function CalibrateStage() {
  const { preloadWorldImage } = usePortalRuntime();
  const { videoRef, status, errorMessage, devices, selectedDeviceId, selectDevice, retry } =
    useCamera();
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tuning = useChromaKeyTuning();

  const [colorway, setColorway] = useState<ColorwayKey>("pink");
  const [mood, setMood] = useState<MoodKey>("calm");
  const [journey, setJourney] = useState<JourneyKey>("explore");
  const [size, setSize] = useState(() =>
    computeStageSize(CAMERA_CONFIG.width, CAMERA_CONFIG.height)
  );
  const [retryToken, setRetryToken] = useState(0);

  // 07 과 완전히 같은 방식으로 배경을 고릅니다 (variant 2 = 촬영 합성용).
  const world = useMemo(
    () => applyComboBackground(WORLDS[resolveWorld(colorway, mood, journey)], colorway, { mood, journey }),
    [colorway, mood, journey]
  );

  // 배경은 캐시에 들어와 있어야 그려집니다 (없으면 World gradient 로 폴백).
  useEffect(() => {
    void preloadWorldImage(world);
  }, [preloadWorldImage, world]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      const rect = el.getBoundingClientRect();
      const next = computeStageSize(rect.width, rect.height);
      setSize((prev) =>
        prev.width === next.width && prev.height === next.height ? prev : next
      );
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const { status: chromaStatus } = useChromaKey({
    videoRef,
    canvasRef,
    world,
    size,
    enabled: status === "ready",
    retryToken,
    params: tuning.params,
    backgroundOverride: tuning.alphaView ? "#ff00ff" : undefined,
    // 이 페이지에는 세그멘테이션 폴백이 없습니다 — 실패하면 그대로 알려야 합니다.
  });

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!tuning.picking) return;
      const picked = pickKeyColorFromClick(e, videoRef.current);
      if (picked) {
        tuning.update({ keyColor: picked });
        tuning.setPicking(false);
      }
    },
    [tuning, videoRef]
  );

  const failed = status === "error" || chromaStatus === "error";

  return (
    <div ref={containerRef} className="relative h-screen w-full overflow-hidden bg-black">
      <video ref={videoRef} className="hidden" muted playsInline autoPlay />

      <canvas
        ref={canvasRef}
        width={size.width}
        height={size.height}
        onClick={handleCanvasClick}
        className={[
          "block h-full w-full",
          tuning.picking ? "cursor-crosshair" : "",
        ].join(" ")}
      />

      {failed && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/70 px-8 text-center text-white/90">
          <p className="max-w-md text-sm">
            {status === "error"
              ? errorMessage
              : "WebGL 을 시작하지 못했습니다. 이 PC 에서는 크로마키를 쓸 수 없습니다 (부스 화면은 세그멘테이션으로 폴백합니다)."}
          </p>
          <button
            type="button"
            onClick={() => {
              if (status === "error") retry();
              setRetryToken((t) => t + 1);
            }}
            className="rounded-full border border-white/40 px-6 py-2 text-xs tracking-widest hover:bg-white/10"
          >
            다시 시도
          </button>
        </div>
      )}

      {/* 배경 조합 선택 — 07 에서 실제로 깔릴 배경 위에서 값을 맞추기 위함입니다. */}
      <div className="absolute inset-x-0 top-0 flex flex-wrap items-center gap-3 bg-black/60 px-5 py-3 text-xs text-white backdrop-blur">
        <span className="font-semibold tracking-widest">CHROMA KEY 보정</span>

        <Select
          label="컬러웨이"
          value={colorway}
          onChange={(v) => setColorway(v as ColorwayKey)}
          options={COLORWAYS.map((k) => ({ value: k, label: k.toUpperCase() }))}
        />
        <Select
          label="무드"
          value={mood}
          onChange={(v) => setMood(v as MoodKey)}
          options={MOOD_QUESTION.options.map((o) => ({ value: o.key, label: o.label }))}
        />
        <Select
          label="여행"
          value={journey}
          onChange={(v) => setJourney(v as JourneyKey)}
          options={JOURNEY_QUESTION.options.map((o) => ({
            value: o.key,
            label: o.label.replace(/\n/g, " "),
          }))}
        />

        {devices.length > 1 && (
          <Select
            label="카메라"
            value={selectedDeviceId ?? ""}
            onChange={selectDevice}
            options={devices.map((d, i) => ({
              value: d.deviceId,
              label: d.label || `카메라 ${i + 1}`,
            }))}
          />
        )}

        <span className="ml-auto text-white/45">{world.displayName}</span>

        {/*
          부스 화면을 원하는 분리 방식으로 바로 엽니다. 이 페이지 자체는 크로마키
          전용이라(세그멘테이션으로 바꾸면 볼 것이 없습니다) 모드 전환은 여기서
          하지 않고 07 화면으로 넘겨줍니다. 07 에서는 Shift+M 로 다시 뒤집습니다.
        */}
        <span className="flex items-center gap-2 border-l border-white/20 pl-3">
          <span className="text-white/50">부스 화면 열기</span>
          <ModeLink href="/?matting=chromakey" label="그린 스크린" />
          <ModeLink href="/?matting=segmentation" label="세그멘테이션" />
        </span>
      </div>

      <div className="absolute left-6 top-24">
        <ChromaKeyTuner tuning={tuning} />
      </div>

      <p className="absolute inset-x-0 bottom-4 text-center text-[11px] text-white/55 [text-shadow:0_1px_4px_rgba(0,0,0,0.8)]">
        보정 전용 페이지입니다. 확정된 값은 <code className="font-mono">config/portal.config.ts</code> 에
        붙여넣어야 부스 실행에 반영됩니다 (이 화면의 값은 저장되지 않습니다).
      </p>
    </div>
  );
}

function ModeLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="rounded border border-white/25 px-2 py-1 text-xs text-white/80 hover:bg-white/10"
    >
      {label}
    </Link>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="flex items-center gap-1.5">
      <span className="text-white/50">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded border border-white/25 bg-black/50 px-2 py-1 text-xs outline-none [&>option]:text-black"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
