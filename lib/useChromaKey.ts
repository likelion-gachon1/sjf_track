"use client";

import { useEffect, useRef, useState } from "react";
import { createChromaKeyRenderer, type ChromaKeyParams } from "@/lib/chromaKey";
import { drawCompositeFrame } from "@/lib/composite";
import { defaultChromaKey } from "@/lib/matting";
import { usePortalRuntime } from "@/lib/PortalRuntime";
import type { MattingStatus, WorldDef } from "@/lib/types";

interface UseChromaKeyParams {
  videoRef: React.RefObject<HTMLVideoElement>;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  /** 합성할 World (배경). */
  world: WorldDef;
  /** 캔버스 백킹스토어 크기 = 촬영 결과 해상도. */
  size: { width: number; height: number };
  /** 카메라가 준비되고, 이 방식이 선택됐을 때만 true. */
  enabled: boolean;
  /** 실패 후 "다시 시도"용 — 값이 바뀌면 렌더러를 다시 만듭니다. */
  retryToken?: number;
  /** 보정 패널용 실시간 값. 없으면 config 상수를 씁니다. */
  params?: ChromaKeyParams;
  /** "알파 보기" — World 배경 대신 이 단색을 깝니다 (보정 전용). */
  backgroundOverride?: string;
  /**
   * WebGL 을 얻지 못했을 때 호출됩니다. 호출자가 세그멘테이션으로 내려가라는 신호이며,
   * 넘기지 않으면 status 가 "error" 가 됩니다(폴백이 없는 /calibrate 용).
   */
  onUnsupported?: () => void;
}

/**
 * 그린 스크린 크로마키 합성 루프. — `MATTING_CONFIG.mode === "chromakey"`
 *
 * useSegmentation 과 **시그니처·반환값을 맞춰 두었습니다.** MirrorStage 가 두 훅을
 * 나란히 호출하고 enabled 로만 고르기 때문입니다 (훅은 조건부로 부를 수 없습니다).
 *
 * MediaPipe 가 필요 없으므로 PortalRuntime 이 소유할 자원이 없고, 렌더러는 이 훅이
 * 만들고 이 훅이 정리합니다(세그멘테이션 인스턴스와 다른 점).
 */
export function useChromaKey({
  videoRef,
  canvasRef,
  world,
  size,
  enabled,
  retryToken = 0,
  params,
  backgroundOverride,
  onUnsupported,
}: UseChromaKeyParams): { status: MattingStatus } {
  const { getWorldImage } = usePortalRuntime();
  const [status, setStatus] = useState<MattingStatus>("idle");

  // 루프를 재시작하지 않고 최신 값을 읽기 위한 ref (리사이즈·World 변경·슬라이더 조작).
  const worldRef = useRef(world);
  worldRef.current = world;
  const sizeRef = useRef(size);
  sizeRef.current = size;
  const paramsRef = useRef<ChromaKeyParams>(params ?? defaultChromaKey());
  paramsRef.current = params ?? defaultChromaKey();
  const overrideRef = useRef(backgroundOverride);
  overrideRef.current = backgroundOverride;
  const onUnsupportedRef = useRef(onUnsupported);
  onUnsupportedRef.current = onUnsupported;

  useEffect(() => {
    if (!enabled) {
      setStatus("idle");
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!video || !canvas || !ctx) return;

    // 인물 레이어용 오프스크린 캔버스 — 여기에만 WebGL 이 붙습니다.
    // 화면에 보이는 캔버스는 그대로 2D 이므로 촬영(toDataURL) 경로가 바뀌지 않습니다.
    const personCanvas = document.createElement("canvas");
    personCanvas.width = Math.max(1, sizeRef.current.width);
    personCanvas.height = Math.max(1, sizeRef.current.height);

    const renderer = createChromaKeyRenderer(personCanvas, paramsRef.current);
    if (!renderer) {
      if (onUnsupportedRef.current) {
        // 화면을 죽이지 않고 세그멘테이션으로 넘깁니다.
        onUnsupportedRef.current();
        setStatus("idle");
      } else {
        setStatus("error");
      }
      return;
    }

    let disposed = false;
    let raf: number | null = null;
    let rvfc: number | null = null;
    let firstFrameDrawn = false;
    let lastVideoTime = -1;

    setStatus("loading");

    const drawOnce = () => {
      if (disposed || video.readyState < video.HAVE_CURRENT_DATA) return;

      const { width, height } = sizeRef.current;
      // 슬라이더를 움직이는 동안에도 즉시 반영되도록 매 프레임 유니폼을 갱신합니다
      // (uniform 업데이트는 비용이 사실상 없습니다).
      renderer.setParams(paramsRef.current);
      renderer.render(video, width, height);

      drawCompositeFrame({
        ctx,
        personCanvas,
        world: worldRef.current,
        backgroundImage: getWorldImage(worldRef.current),
        width,
        height,
        backgroundOverride: overrideRef.current,
      });

      if (!firstFrameDrawn) {
        firstFrameDrawn = true;
        setStatus("running");
      }
    };

    // requestVideoFrameCallback 이 있으면 **카메라가 새 프레임을 낼 때만** 그립니다
    // (rAF 로 도는 것보다 중복 렌더가 없습니다). 없는 브라우저는 아래 rAF 폴백으로.
    if (typeof video.requestVideoFrameCallback === "function") {
      const tick = () => {
        if (disposed) return;
        drawOnce();
        rvfc = video.requestVideoFrameCallback(tick);
      };
      rvfc = video.requestVideoFrameCallback(tick);
    } else {
      // 폴백 — 같은 프레임을 두 번 그리지 않도록 currentTime 으로 걸러냅니다
      // (useSegmentation 의 루프와 같은 규약).
      const tick = () => {
        if (disposed) return;
        if (video.currentTime !== lastVideoTime) {
          lastVideoTime = video.currentTime;
          drawOnce();
        }
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }

    return () => {
      disposed = true;
      if (raf !== null) cancelAnimationFrame(raf);
      if (rvfc !== null) video.cancelVideoFrameCallback?.(rvfc);
      // 07 을 드나들 때마다 WebGL 컨텍스트가 쌓이면 브라우저 상한에 걸립니다.
      renderer.dispose();
    };
  }, [enabled, retryToken, getWorldImage, videoRef, canvasRef]);

  return { status };
}
