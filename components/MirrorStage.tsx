"use client";

import { useEffect, useRef } from "react";
import { CAMERA_CONFIG, COPY } from "@/config/portal.config";
import { useCamera } from "@/lib/useCamera";

// 다음 스텝(배경 합성)을 대비해 <video>는 화면 밖에 숨기고, 실제로 보여주는
// 건 매 프레임 video를 그려 넣는 <canvas>입니다. 나중에 여기 draw() 안에서
// 세그멘테이션/크로마키를 적용하면 됩니다.
export default function MirrorStage() {
  const { videoRef, status, errorMessage, devices, selectedDeviceId, selectDevice, retry } =
    useCamera();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (status !== "ready") return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!video || !canvas || !ctx) return;

    function draw() {
      if (video.readyState >= video.HAVE_CURRENT_DATA) {
        ctx.save();
        if (CAMERA_CONFIG.mirror) {
          ctx.translate(canvas.width, 0);
          ctx.scale(-1, 1);
        }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        ctx.restore();
      }
      rafRef.current = requestAnimationFrame(draw);
    }

    rafRef.current = requestAnimationFrame(draw);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [status, videoRef]);

  return (
    <div
      className="relative mx-auto w-[min(90vw,720px)] overflow-hidden rounded-2xl bg-ink shadow-xl"
      style={{ aspectRatio: `${CAMERA_CONFIG.width} / ${CAMERA_CONFIG.height}` }}
    >
      {/* 실제 표시는 canvas가 담당하고, video는 프레임 소스로만 씁니다. */}
      <video ref={videoRef} className="hidden" muted playsInline autoPlay />

      {status === "ready" && (
        <canvas
          ref={canvasRef}
          width={CAMERA_CONFIG.width}
          height={CAMERA_CONFIG.height}
          className="h-full w-full"
        />
      )}

      {(status === "idle" || status === "requesting") && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center text-white/80">
          <span className="h-8 w-8 animate-spin rounded-full border-2 border-white/25 border-t-white/90" />
          <p className="text-sm">{COPY.cameraLoading}</p>
        </div>
      )}

      {status === "error" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-8 text-center text-white/90">
          <p className="text-sm">{errorMessage}</p>
          <button
            type="button"
            onClick={retry}
            className="rounded-full border border-white/40 px-6 py-2 text-xs uppercase tracking-widest hover:bg-white/10"
          >
            {COPY.cameraRetryButton}
          </button>
        </div>
      )}

      {status === "ready" && devices.length > 1 && (
        <label className="absolute bottom-3 right-3 flex items-center gap-2 rounded-full bg-black/50 px-3 py-1.5 text-xs text-white backdrop-blur">
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
