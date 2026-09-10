"use client";

import { useEffect, useState } from "react";
import { MOOD_ANALYSIS_CONFIG } from "@/config/portal.config";
import { createClothingGate } from "@/lib/clothingDetection";
import { drawMoodFrame } from "@/lib/moodAnalysis";

export function useClothingDetection(
  videoRef: React.RefObject<HTMLVideoElement>, enabled: boolean,
  onDetected: (frame: string) => void, retryToken = 0,
) {
  const [status, setStatus] = useState<"loading" | "searching" | "holding" | "error">("loading");
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    let disposed = false;
    let stopped = false;
    let modelReady = false;
    let timer: ReturnType<typeof setTimeout>;
    let watchdog: ReturnType<typeof setTimeout>;
    let worker: Worker | undefined;
    let lastVideoTime = -1;
    let capturedFrame: string | null = null;
    const gate = createClothingGate();
    // 감지와 분석에 동일한 프레임을 사용합니다. 모델 입력만 512x512로 리사이즈합니다.
    const preview = document.createElement("canvas");
    preview.width = 700;
    preview.height = 500;
    const input = document.createElement("canvas");
    input.width = input.height = 512;
    const ctx = preview.getContext("2d");
    const inputCtx = input.getContext("2d", { willReadFrequently: true });
    setStatus("loading");
    setProgress(0);
    const fail = () => {
      if (disposed) return;
      stopped = true;
      clearTimeout(timer);
      clearTimeout(watchdog);
      worker?.terminate();
      setStatus("error");
      setProgress(0);
    };
    const reset = () => {
      if (stopped) return;
      gate(0);
      setProgress(0);
      if (modelReady) setStatus("searching");
    };
    const sample = () => {
      if (disposed || stopped) return;
      const video = videoRef.current;
      if (!video || video.readyState < 2 || video.paused || document.hidden || video.currentTime === lastVideoTime) {
        reset();
        timer = setTimeout(sample, 350);
        return;
      }
      lastVideoTime = video.currentTime;
      try {
        if (!ctx || !inputCtx) throw new Error("Canvas unavailable");
        drawMoodFrame(ctx, video, preview.width, preview.height);
        capturedFrame = preview.toDataURL("image/jpeg", MOOD_ANALYSIS_CONFIG.jpegQuality);
        inputCtx.drawImage(preview, 0, 0, 512, 512);
        const pixels = inputCtx.getImageData(0, 0, 512, 512).data;
        watchdog = setTimeout(fail, 30000);
        worker!.postMessage({ type: "detect", pixels, region: MOOD_ANALYSIS_CONFIG.sampleRegion }, [pixels.buffer]);
      } catch { fail(); }
    };
    try {
      worker = new Worker(new URL("./clothing.worker.ts", import.meta.url));
      watchdog = setTimeout(fail, 60000);
      worker.onerror = fail;
      worker.onmessage = ({ data }) => {
        if (disposed || stopped) return;
        clearTimeout(watchdog);
        if (data.type === "error") { fail(); return; }
        if (data.type === "ready") { modelReady = true; setStatus("searching"); sample(); return; }
        if (data.type !== "result") return;
        const video = videoRef.current;
        const valid = !document.hidden && video && !video.paused && video.readyState >= 2 && video.currentTime > lastVideoTime;
        const amount = gate(valid ? data.coverage : 0);
        setProgress(amount);
        setStatus(amount > 0 ? "holding" : "searching");
        if (amount === 1 && capturedFrame) {
          stopped = true;
          worker?.terminate();
          onDetected(capturedFrame);
        } else timer = setTimeout(sample, 350);
      };
      worker.postMessage({ type: "init", origin: window.location.origin });
    } catch { fail(); }
    const visibility = () => { if (document.hidden) reset(); };
    document.addEventListener("visibilitychange", visibility);
    return () => {
      disposed = true;
      clearTimeout(timer);
      clearTimeout(watchdog);
      document.removeEventListener("visibilitychange", visibility);
      worker?.terminate();
    };
  }, [enabled, onDetected, retryToken, videoRef]);
  return { status, progress };
}
