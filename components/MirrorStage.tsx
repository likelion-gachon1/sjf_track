"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import ChromaKeyTuner, {
  pickKeyColorFromClick,
  useChromaKeyTuning,
} from "@/components/ChromaKeyTuner";
import { CAMERA_CONFIG, COPY } from "@/config/portal.config";
import { captureFrame, computeStageSize } from "@/lib/composite";
import { isTuningEnabled, setSessionMattingMode, useMattingMode } from "@/lib/matting";
import type { WorldDef } from "@/lib/types";
import { useCamera } from "@/lib/useCamera";
import { useChromaKey } from "@/lib/useChromaKey";
import { useSegmentation } from "@/lib/useSegmentation";

// 07 EXPERIENCE 의 전체화면 캔버스.
//
// <video> 는 프레임 소스로만 쓰고(화면 밖 hidden), 실제 표시는 canvas 가 담당합니다.
// 캔버스가 **배경까지 전부** 그리므로 촬영 결과 = 화면이 구조적으로 보장됩니다
// (lib/composite.ts 주석 참고). 부모의 CSS 배경에 의존하지 않습니다.
//
// 캔버스 백킹스토어는 화면 비율에 맞추고(여백 없는 전체화면) 배경·인물을 cover 로
// 채웁니다. 폭은 SEGMENTATION_CONFIG.maxCanvasWidth 로 제한해 프레임률을 지킵니다.
//
// 인물을 자르는 방식은 두 가지이고 여기서 고릅니다 — 기본은 그린 스크린 크로마키,
// 폴백은 MediaPipe 세그멘테이션. **훅은 조건부로 호출할 수 없으므로 둘 다 부르고
// `enabled` 로만 가릅니다.** (쓰지 않는 쪽은 idle 로 빠져 아무 일도 하지 않습니다)
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
  const [mattingRetryToken, setMattingRetryToken] = useState(0);

  // ?matting= 과 ?tune=1 은 window 를 읽으므로 mount 이후에 반영합니다
  // (서버 렌더와 첫 클라이언트 렌더를 같게 유지).
  const mode = useMattingMode();
  const [tuningOn, setTuningOn] = useState(false);
  useEffect(() => {
    setTuningOn(isTuningEnabled());
  }, []);

  // Shift+M — 그린 스크린 유무에 따라 즉시 뒤집는 스태프용 단축키.
  // 손님에게는 보이지 않는 기능이라 UI 를 두지 않고, 눌렀을 때만 잠깐 알려줍니다.
  // 세션 한정이므로 새로고침하면 config 기본값으로 돌아갑니다 (lib/matting.ts).
  const [modeToast, setModeToast] = useState<string | null>(null);
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code !== "KeyM" || !e.shiftKey || e.ctrlKey || e.altKey || e.metaKey) return;
      e.preventDefault();
      const next = mode === "chromakey" ? "segmentation" : "chromakey";
      setSessionMattingMode(next);
      setModeToast(next === "chromakey" ? "그린 스크린 (크로마키)" : "세그멘테이션");
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mode]);

  useEffect(() => {
    if (!modeToast) return;
    const t = window.setTimeout(() => setModeToast(null), 1800);
    return () => window.clearTimeout(t);
  }, [modeToast]);

  const tuning = useChromaKeyTuning();

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
    enabled: status === "ready" && mode === "segmentation",
    retryToken: mattingRetryToken,
  });

  // WebGL 을 못 얻는 PC 에서도 부스 화면은 살아 있어야 합니다.
  // 세션 스위치를 그대로 쓰므로, 폴백 이후 05 프리로드·무드분석도 같은 모드로 맞춰집니다.
  const handleChromaUnsupported = useCallback(() => {
    console.warn("[portal] 크로마키를 쓸 수 없어 세그멘테이션으로 전환합니다.");
    setSessionMattingMode("segmentation");
  }, []);

  const { status: chromaStatus } = useChromaKey({
    videoRef,
    canvasRef,
    world,
    size,
    enabled: status === "ready" && mode === "chromakey",
    retryToken: mattingRetryToken,
    params: tuningOn ? tuning.params : undefined,
    backgroundOverride: tuningOn && tuning.alphaView ? "#ff00ff" : undefined,
    onUnsupported: handleChromaUnsupported,
  });

  const mattingStatus = mode === "chromakey" ? chromaStatus : segStatus;

  const handleShutter = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    onCapture(captureFrame(canvas));
  }, [onCapture]);

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!tuningOn || !tuning.picking) return;
      const picked = pickKeyColorFromClick(e, videoRef.current);
      if (picked) {
        tuning.update({ keyColor: picked });
        tuning.setPicking(false);
      }
    },
    [tuningOn, tuning, videoRef]
  );

  const cameraFailed = status === "error";
  const mattingFailed = mattingStatus === "error";
  const waitingForCamera = status === "idle" || status === "requesting";
  // 05에서 이미 워밍업했으므로 실제로는 거의 보이지 않아야 정상입니다.
  const waitingForMatting = status === "ready" && mattingStatus === "loading";
  const ready = status === "ready" && mattingStatus === "running";

  return (
    <div ref={containerRef} className="relative h-screen w-full overflow-hidden">
      <video ref={videoRef} className="hidden" muted playsInline autoPlay />

      <canvas
        ref={canvasRef}
        width={size.width}
        height={size.height}
        onClick={handleCanvasClick}
        className={[
          "block h-full w-full",
          tuningOn && tuning.picking ? "cursor-crosshair" : "",
        ].join(" ")}
      />

      {(waitingForCamera || waitingForMatting) && (
        <Overlay>
          <span className="h-8 w-8 animate-spin rounded-full border-2 border-white/25 border-t-white/90" />
          <p className="text-sm">
            {waitingForCamera ? COPY.cameraLoading : COPY.segmentationLoading}
          </p>
        </Overlay>
      )}

      {(cameraFailed || mattingFailed) && (
        <Overlay>
          <p className="max-w-md text-sm">
            {cameraFailed ? errorMessage : COPY.segmentationError}
          </p>
          <button
            type="button"
            onClick={() => {
              if (cameraFailed) retry();
              if (mattingFailed) setMattingRetryToken((t) => t + 1);
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
            "h-16 w-16 rounded-full border-[0.1875rem] border-white shadow-lg transition-transform",
            ready ? "bg-white/95 hover:scale-105 active:scale-95" : "bg-white/40",
          ].join(" ")}
        />
      </div>

      {/* Shift+M 확인용 — 1.8초 뒤 사라집니다. */}
      {modeToast && (
        <div className="pointer-events-none absolute left-1/2 top-8 -translate-x-1/2 rounded-full bg-black/70 px-5 py-2 text-xs tracking-widest text-white backdrop-blur">
          {modeToast}
        </div>
      )}

      {/* 보정 패널 — ?tune=1 일 때만. 부스 운영 중에는 나오지 않습니다. */}
      {tuningOn && mode === "chromakey" && (
        <div className="absolute left-6 top-1/2 -translate-y-1/2">
          <ChromaKeyTuner tuning={tuning} />
        </div>
      )}

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
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/60 px-8 text-center text-white backdrop-blur">
      {children}
    </div>
  );
}
