"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CAMERA_CONFIG, COPY } from "@/config/portal.config";
import { captureFrame, computeStageSize } from "@/lib/composite";
import type { WorldDef } from "@/lib/types";
import { useCamera } from "@/lib/useCamera";
import { useSegmentation } from "@/lib/useSegmentation";

// 07 EXPERIENCE 의 전체화면 캔버스.
//
// <video> 는 프레임 소스로만 쓰고(화면 밖 hidden), 실제 표시는 canvas 가 담당합니다.
// 캔버스가 **배경까지 전부** 그리므로 촬영 결과 = 화면이 구조적으로 보장됩니다
// (lib/composite.ts 주석 참고). 부모의 CSS 배경에 의존하지 않습니다.
//
// 캔버스 백킹스토어는 화면 비율에 맞추고(여백 없는 전체화면) 배경·인물을 cover 로
// 채웁니다. 폭은 SEGMENTATION_CONFIG.maxCanvasWidth 로 제한해 프레임률을 지킵니다.
interface MirrorStageProps {
  world: WorldDef;
  onCapture: (dataUrl: string) => void;
}

const IS_DEV = process.env.NODE_ENV === "development";

export default function MirrorStage({ world, onCapture }: MirrorStageProps) {
  const { videoRef, status, errorMessage, devices, selectedDeviceId, selectDevice, retry } =
    useCamera();
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState(() =>
    computeStageSize(CAMERA_CONFIG.width, CAMERA_CONFIG.height)
  );
  const [segRetryToken, setSegRetryToken] = useState(0);

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

  const { status: segStatus } = useSegmentation({
    videoRef,
    canvasRef,
    world,
    size,
    enabled: status === "ready",
    retryToken: segRetryToken,
  });

  const handleShutter = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    onCapture(captureFrame(canvas));
  }, [onCapture]);

  const cameraFailed = status === "error";
  const segmentationFailed = segStatus === "error";
  const waitingForCamera = status === "idle" || status === "requesting";
  // 05에서 이미 워밍업했으므로 실제로는 거의 보이지 않아야 정상입니다.
  const waitingForSegmentation = status === "ready" && segStatus === "loading";
  const ready = status === "ready" && segStatus === "running";

  return (
    <div ref={containerRef} className="relative h-screen w-full overflow-hidden">
      <video ref={videoRef} className="hidden" muted playsInline autoPlay />

      <canvas ref={canvasRef} width={size.width} height={size.height} className="block h-full w-full" />

      {(waitingForCamera || waitingForSegmentation) && (
        <Overlay>
          <span className="h-8 w-8 animate-spin rounded-full border-2 border-white/25 border-t-white/90" />
          <p className="text-sm">
            {waitingForCamera ? COPY.cameraLoading : COPY.segmentationLoading}
          </p>
        </Overlay>
      )}

      {(cameraFailed || segmentationFailed) && (
        <Overlay>
          <p className="max-w-md text-sm">
            {cameraFailed ? errorMessage : COPY.segmentationError}
          </p>
          <button
            type="button"
            onClick={() => {
              if (cameraFailed) retry();
              if (segmentationFailed) setSegRetryToken((t) => t + 1);
            }}
            className="rounded-full border border-white/40 px-6 py-2 text-xs tracking-widest hover:bg-white/10"
          >
            {COPY.cameraRetryButton}
          </button>
        </Overlay>
      )}

      <div className="absolute inset-x-0 bottom-12 flex flex-col items-center gap-4">
        <span className="text-xs tracking-widest2 text-white [text-shadow:0_1px_6px_rgba(0,0,0,0.5)]">
          {COPY.captureButton}
        </span>
        <button
          type="button"
          disabled={!ready}
          onClick={handleShutter}
          aria-label={COPY.captureButton}
          className={[
            "h-16 w-16 rounded-full border-[3px] border-white shadow-lg transition-transform",
            ready ? "bg-white/95 hover:scale-105 active:scale-95" : "bg-white/40",
          ].join(" ")}
        />
      </div>

      {/* 개발 편의 기능 — 부스에서는 노출하지 않습니다. */}
      {IS_DEV && status === "ready" && devices.length > 1 && (
        <label className="absolute bottom-4 right-4 flex items-center gap-2 rounded-full bg-black/50 px-3 py-1.5 text-xs text-white backdrop-blur">
          <span className="sr-only">{COPY.cameraDeviceLabel}</span>
          <select
            value={selectedDeviceId ?? ""}
            onChange={(e) => selectDevice(e.target.value)}
            className="bg-transparent text-xs outline-none [&>option]:text-ink"
          >
            {devices.map((d, i) => (
              <option key={d.deviceId} value={d.deviceId}>
                {d.label || `${COPY.cameraDeviceLabel} ${i + 1}`}
              </option>
            ))}
          </select>
        </label>
      )}
    </div>
  );
}

// 투명 배경 위 흰 글씨는 밝은 World 에서 읽히지 않으므로 오버레이는 어둡게 깔아둡니다.
function Overlay({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/60 px-8 text-center text-white/90 backdrop-blur">
      {children}
    </div>
  );
}
