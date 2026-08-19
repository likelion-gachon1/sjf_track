"use client";

import { useEffect, useRef, useState } from "react";
import { drawCompositeFrame, drawPersonLayer } from "@/lib/composite";
import { usePortalRuntime } from "@/lib/PortalRuntime";
import type { MattingStatus, WorldDef } from "@/lib/types";
import type { Results, SelfieSegmentation } from "@mediapipe/selfie_segmentation";

/** @deprecated 이름만 남긴 별칭 — 새 코드는 `MattingStatus` 를 쓰세요. */
export type SegmentationStatus = MattingStatus;

interface UseSegmentationParams {
  videoRef: React.RefObject<HTMLVideoElement>;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  /** 합성할 World (배경). */
  world: WorldDef;
  /** 캔버스 백킹스토어 크기 = 촬영 결과 해상도. */
  size: { width: number; height: number };
  /** 카메라가 준비된 뒤에만 true. */
  enabled: boolean;
  /** 초기화 실패 후 "다시 시도"용 — 값이 바뀌면 인스턴스를 다시 요청합니다. */
  retryToken?: number;
}

/**
 * MediaPipe 실시간 세그멘테이션 합성 루프. — `MATTING_CONFIG.mode === "segmentation"`
 *
 * 인스턴스는 PortalRuntime 이 소유합니다(05에서 미리 만들고 07에서 재사용).
 * 이 훅은 프레임 루프와 결과 리스너만 관리하고 close() 는 하지 않습니다 —
 * 닫는 책임은 releaseAll() 한 곳에 있습니다.
 *
 * ⚠️ 이 방식은 프레임마다 마스크를 새로 추정하므로 인물이 움직이면 경계가 흔들리고
 *    그 틈으로 실제 배경이 살짝 비칩니다. 기본 방식은 이제 그린 스크린 크로마키
 *    (`useChromaKey`)이고, 이 훅은 **그린 스크린을 쓸 수 없을 때의 폴백**입니다
 *    (천이 없는 개발 PC, WebGL 초기화 실패). README "그린 스크린 크로마키" 참고.
 */
export function useSegmentation({
  videoRef,
  canvasRef,
  world,
  size,
  enabled,
  retryToken = 0,
}: UseSegmentationParams): { status: SegmentationStatus } {
  const { getSegmenter, getWorldImage } = usePortalRuntime();
  const [status, setStatus] = useState<SegmentationStatus>("idle");

  // 루프를 재시작하지 않고 최신 값을 읽기 위한 ref (리사이즈/World 변경 대응).
  const worldRef = useRef(world);
  worldRef.current = world;
  const sizeRef = useRef(size);
  sizeRef.current = size;

  useEffect(() => {
    if (!enabled) {
      setStatus("idle");
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!video || !canvas || !ctx) return;

    // 인물 레이어용 오프스크린 캔버스 — copy/source-in 은 여기서만 수행합니다.
    const personCanvas = document.createElement("canvas");
    const personCtx = personCanvas.getContext("2d");
    if (!personCtx) {
      setStatus("error");
      return;
    }

    // disposed 를 먼저 세워야 in-flight send() 의 결과 콜백을 안전하게 버릴 수 있습니다.
    let disposed = false;
    let raf: number | null = null;
    let segmenter: SelfieSegmentation | null = null;
    let lastVideoTime = -1;
    let firstFrameDrawn = false;

    setStatus("loading");

    // 아래 두 함수는 화살표 함수로 둡니다 — 위 가드로 좁혀진 video/ctx 타입이
    // 함수 선언(호이스팅) 안에서는 유지되지 않기 때문입니다.
    const handleResults = (results: Results) => {
      if (disposed) return;

      const { width, height } = sizeRef.current;
      if (personCanvas.width !== width || personCanvas.height !== height) {
        personCanvas.width = width;
        personCanvas.height = height;
      }

      drawPersonLayer(personCtx, results, width, height);
      drawCompositeFrame({
        ctx,
        personCanvas,
        world: worldRef.current,
        backgroundImage: getWorldImage(worldRef.current),
        width,
        height,
      });

      if (!firstFrameDrawn) {
        firstFrameDrawn = true;
        setStatus("running");
      }
    };

    const loop = async (): Promise<void> => {
      if (disposed) return;

      if (
        segmenter &&
        video.readyState >= video.HAVE_CURRENT_DATA &&
        video.currentTime !== lastVideoTime
      ) {
        lastVideoTime = video.currentTime;
        try {
          await segmenter.send({ image: video });
        } catch (err: unknown) {
          if (!disposed) console.warn("[portal] 프레임 처리 실패:", err);
        }
      }

      if (!disposed) {
        raf = requestAnimationFrame(() => void loop());
      }
    };

    getSegmenter()
      .then((instance) => {
        if (disposed) return;
        segmenter = instance;
        instance.onResults(handleResults);
        raf = requestAnimationFrame(() => void loop());
      })
      .catch((err: unknown) => {
        if (disposed) return;
        console.error("[portal] 세그멘테이션 초기화 실패:", err);
        setStatus("error");
      });

    return () => {
      disposed = true;
      if (raf !== null) cancelAnimationFrame(raf);
      // 인스턴스는 재사용하므로 리스너만 떼어냅니다 (close 는 releaseAll 담당).
      segmenter?.onResults(() => {});
    };
  }, [enabled, retryToken, getSegmenter, getWorldImage, videoRef, canvasRef]);

  return { status };
}
