"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef } from "react";
import { BGM_CONFIG, CAMERA_CONFIG, SEGMENTATION_CONFIG } from "@/config/portal.config";
import type { WorldDef } from "@/lib/types";
import type { SelfieSegmentation } from "@mediapipe/selfie_segmentation";

// =============================================================================
// PortalRuntime — 프리로드 자원과 오디오의 보관소
// -----------------------------------------------------------------------------
// 05에서 확보한 카메라 스트림·MediaPipe 인스턴스를 07까지, 06에서 시작한 BGM을
// QR 화면까지 살려 보내려면 컴포넌트 생명주기 밖에 보관할 곳이 필요합니다.
// PortalApp 레벨에 이 컨텍스트를 하나 두고, 화면들은 여기서 꺼내 씁니다.
// =============================================================================

/**
 * 오디오 언락용 무음 WAV (45바이트). src 가 없는 <audio> 는 play() 가 거부되므로
 * 언락 시점에는 이 무음 소스를 물려둡니다.
 */
const SILENT_WAV =
  "data:audio/wav;base64,UklGRiUAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQEAAACA";

type SegmenterCtor = new (config?: {
  locateFile?: (path: string, prefix?: string) => string;
}) => SelfieSegmentation;

interface SegmentationModuleLike {
  SelfieSegmentation?: unknown;
  default?: { SelfieSegmentation?: unknown };
}

/**
 * @mediapipe/selfie_segmentation 은 ES export 대신 Closure 스타일로
 * `this || self` 에 클래스를 붙입니다.
 *
 * ⚠️ Next(webpack 5)에서 이 모듈은 exports 미사용으로 컴파일되어 top-level `this` 가
 *    globalThis 가 됩니다. 즉 **모듈 네임스페이스는 비어 있고 클래스는 window 에**
 *    붙습니다. `const { SelfieSegmentation } = await import(...)` 로 바꾸면 undefined 가
 *    나오니, 아래 폴백 체인을 지워도 되는 코드로 오해하지 마세요.
 *    (타입 선언은 named export 를 주장하므로 컴파일은 통과합니다.)
 */
function resolveSegmenterCtor(mod: unknown): SegmenterCtor {
  const ns = mod as SegmentationModuleLike;
  const fromGlobal =
    typeof window === "undefined"
      ? undefined
      : (window as unknown as SegmentationModuleLike).SelfieSegmentation;
  const candidate = ns.SelfieSegmentation ?? ns.default?.SelfieSegmentation ?? fromGlobal;

  if (typeof candidate !== "function") {
    throw new Error(
      "SelfieSegmentation 생성자를 찾지 못했습니다 (@mediapipe/selfie_segmentation)."
    );
  }
  return candidate as SegmenterCtor;
}

async function createSegmenter(): Promise<SelfieSegmentation> {
  // 이 모듈은 로드 시 전역을 만지므로 정적 import 하지 않고, 클라이언트에서만
  // 동적으로 불러옵니다.
  const mod = await import("@mediapipe/selfie_segmentation");
  const Ctor = resolveSegmenterCtor(mod);

  const segmenter = new Ctor({
    // wasm/모델을 CDN이 아니라 자가 호스팅 경로에서 받습니다 (매장 네트워크 대비).
    locateFile: (file) => `${SEGMENTATION_CONFIG.assetBasePath}/${file}`,
  });
  segmenter.setOptions({
    modelSelection: SEGMENTATION_CONFIG.modelSelection,
    // 반전은 합성 단계에서 한 번만 적용하므로 여기서는 끕니다.
    selfieMode: false,
  });
  // 결과 리스너는 소비자(useSegmentation)가 나중에 교체합니다.
  segmenter.onResults(() => {});
  await segmenter.initialize();

  // 더미 프레임 1회로 워밍업 — 07 첫 프레임에서 멈칫하지 않게 합니다.
  const warmup = document.createElement("canvas");
  warmup.width = 32;
  warmup.height = 32;
  const warmupCtx = warmup.getContext("2d");
  if (warmupCtx) {
    warmupCtx.fillStyle = "#000000";
    warmupCtx.fillRect(0, 0, warmup.width, warmup.height);
    await segmenter.send({ image: warmup });
  }

  return segmenter;
}

interface PortalRuntimeValue {
  /** 이미 확보된 스트림이 있으면 그대로 반환합니다 (중복 getUserMedia 방지). */
  acquireCamera: (deviceId?: string) => Promise<MediaStream>;
  /** 생성 + 에셋 로드 + 워밍업까지 끝낸 인스턴스. 호출이 겹쳐도 하나만 만듭니다. */
  getSegmenter: () => Promise<SelfieSegmentation>;
  /** decode() 까지 끝낸 배경 이미지. 실패하면 null (gradient 폴백). */
  preloadWorldImage: (world: WorldDef) => Promise<HTMLImageElement | null>;
  /** 캐시된 배경 이미지 즉시 조회 (RAF 루프에서 await 없이 쓰기 위함). */
  getWorldImage: (world: WorldDef) => HTMLImageElement | null;
  /** ⚠️ 01 START 클릭 핸들러에서 **동기적으로** 호출해야 합니다. */
  unlockAudio: () => void;
  playBgm: (src?: string) => void;
  stopBgm: (immediate?: boolean) => void;
  setBgmMuted: (muted: boolean) => void;
  /** 스트림 stop + segmenter close + BGM 정지. RESET 시 호출. */
  releaseAll: () => void;
}

const PortalRuntimeContext = createContext<PortalRuntimeValue | null>(null);

export function PortalRuntimeProvider({ children }: { children: React.ReactNode }) {
  // --- 카메라 -------------------------------------------------------------
  const streamRef = useRef<MediaStream | null>(null);
  const streamPromiseRef = useRef<Promise<MediaStream> | null>(null);
  const streamDeviceIdRef = useRef<string | null>(null);

  // --- 세그멘테이션 -------------------------------------------------------
  const segmenterRef = useRef<SelfieSegmentation | null>(null);
  const segmenterPromiseRef = useRef<Promise<SelfieSegmentation> | null>(null);

  // --- 배경 이미지 --------------------------------------------------------
  const imageCacheRef = useRef<Map<string, HTMLImageElement>>(new Map());

  // --- 오디오 -------------------------------------------------------------
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioSrcRef = useRef<string | null>(null);
  const mutedRef = useRef(false);
  const fadeRafRef = useRef<number | null>(null);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    streamPromiseRef.current = null;
    streamDeviceIdRef.current = null;
  }, []);

  const acquireCamera = useCallback(
    (deviceId?: string): Promise<MediaStream> => {
      const wanted = deviceId ?? null;
      const sameDevice = streamDeviceIdRef.current === wanted;

      // 살아 있는 같은 기기의 스트림이면 재사용합니다.
      const existing = streamRef.current;
      if (
        existing &&
        sameDevice &&
        existing.getVideoTracks().some((t) => t.readyState === "live")
      ) {
        return Promise.resolve(existing);
      }
      // 요청이 겹치면(StrictMode 이중 마운트 등) 같은 Promise 를 돌려줍니다.
      if (streamPromiseRef.current && sameDevice) {
        return streamPromiseRef.current;
      }

      // 다른 기기를 원하면 기존 스트림을 먼저 정리합니다.
      stopStream();

      if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        return Promise.reject(new DOMException("getUserMedia unsupported", "NotSupportedError"));
      }

      streamDeviceIdRef.current = wanted;
      const promise = navigator.mediaDevices
        .getUserMedia({
          audio: false,
          video: {
            width: { ideal: CAMERA_CONFIG.width },
            height: { ideal: CAMERA_CONFIG.height },
            ...(wanted ? { deviceId: { exact: wanted } } : {}),
          },
        })
        .then((stream) => {
          streamRef.current = stream;
          return stream;
        })
        .catch((err: unknown) => {
          streamPromiseRef.current = null;
          streamDeviceIdRef.current = null;
          throw err;
        });

      streamPromiseRef.current = promise;
      return promise;
    },
    [stopStream]
  );

  const getSegmenter = useCallback((): Promise<SelfieSegmentation> => {
    if (segmenterPromiseRef.current) return segmenterPromiseRef.current;

    const promise = createSegmenter()
      .then((segmenter) => {
        segmenterRef.current = segmenter;
        return segmenter;
      })
      .catch((err: unknown) => {
        // 실패하면 다음 시도에서 다시 만들 수 있게 캐시를 비웁니다.
        segmenterPromiseRef.current = null;
        throw err;
      });

    segmenterPromiseRef.current = promise;
    return promise;
  }, []);

  const preloadWorldImage = useCallback(
    async (world: WorldDef): Promise<HTMLImageElement | null> => {
      const src = world.backgroundImage;
      if (!src) return null;

      const cached = imageCacheRef.current.get(src);
      if (cached) return cached;

      try {
        const image = new Image();
        image.decoding = "async";
        image.src = src;
        await image.decode();
        imageCacheRef.current.set(src, image);
        return image;
      } catch {
        console.warn(`[portal] World 배경 이미지 로드 실패 (gradient 로 폴백): ${src}`);
        return null;
      }
    },
    []
  );

  const getWorldImage = useCallback((world: WorldDef): HTMLImageElement | null => {
    if (!world.backgroundImage) return null;
    return imageCacheRef.current.get(world.backgroundImage) ?? null;
  }, []);

  // --- 오디오 헬퍼 --------------------------------------------------------
  const cancelFade = useCallback(() => {
    if (fadeRafRef.current !== null) {
      cancelAnimationFrame(fadeRafRef.current);
      fadeRafRef.current = null;
    }
  }, []);

  const fadeVolumeTo = useCallback(
    (target: number, durationMs: number, onDone?: () => void) => {
      const audio = audioRef.current;
      if (!audio) return;

      cancelFade();
      const clamped = Math.min(1, Math.max(0, target));
      const from = audio.volume;

      if (durationMs <= 0 || Math.abs(clamped - from) < 0.001) {
        audio.volume = clamped;
        onDone?.();
        return;
      }

      const startedAt = performance.now();
      const tick = (now: number) => {
        const t = Math.min(1, (now - startedAt) / durationMs);
        audio.volume = Math.min(1, Math.max(0, from + (clamped - from) * t));
        if (t < 1) {
          fadeRafRef.current = requestAnimationFrame(tick);
        } else {
          fadeRafRef.current = null;
          onDone?.();
        }
      };
      fadeRafRef.current = requestAnimationFrame(tick);
    },
    [cancelFade]
  );

  const ensureAudio = useCallback((): HTMLAudioElement => {
    if (!audioRef.current) {
      const audio = new Audio();
      audio.loop = true;
      audio.volume = 0;
      audio.preload = "auto";
      audioRef.current = audio;
    }
    return audioRef.current;
  }, []);

  const unlockAudio = useCallback(() => {
    // 브라우저는 사용자 제스처 없이 시작된 재생을 차단합니다. START 클릭의 제스처
    // 컨텍스트에서 무음 소스로 한 번 재생해두면 이후 프로그래매틱 재생이 허용됩니다.
    // ⚠️ await 뒤나 setTimeout 안에서 호출하면 제스처 컨텍스트를 잃습니다.
    const audio = ensureAudio();
    if (!audio.src) {
      audio.src = SILENT_WAV;
      audioSrcRef.current = null;
    }
    audio.volume = 0;
    void audio
      .play()
      .then(() => {
        audio.pause();
        audio.currentTime = 0;
      })
      .catch(() => {
        // 실패해도 조용히 넘어갑니다 (06에서 재생이 안 되면 무음으로 진행).
      });
  }, [ensureAudio]);

  const playBgm = useCallback(
    (src?: string) => {
      if (!src) {
        console.warn("[portal] 이 World 에는 bgm 이 지정되지 않았습니다 (무음으로 진행).");
        return;
      }

      const audio = ensureAudio();

      const start = () => {
        audioSrcRef.current = src;
        audio.src = src;
        audio.loop = true;
        audio.volume = 0;
        audio.muted = mutedRef.current;
        void audio
          .play()
          .then(() => fadeVolumeTo(BGM_CONFIG.volume, BGM_CONFIG.fadeInMs))
          .catch((err: unknown) => {
            // 음원 파일이 없거나(404) 자동재생이 막혀도 앱은 그대로 동작해야 합니다.
            console.warn("[portal] BGM 재생 실패 — 무음으로 계속합니다:", err);
          });
      };

      if (audioSrcRef.current === src && !audio.paused) return;

      if (audioSrcRef.current && audioSrcRef.current !== src) {
        // 음원 교체 시 이전 트랙을 페이드아웃한 뒤 바꿉니다.
        fadeVolumeTo(0, BGM_CONFIG.fadeOutMs, start);
      } else {
        start();
      }
    },
    [ensureAudio, fadeVolumeTo]
  );

  const stopBgm = useCallback(
    (immediate = false) => {
      const audio = audioRef.current;
      if (!audio) return;

      if (immediate || audio.paused) {
        cancelFade();
        audio.pause();
        audio.volume = 0;
        return;
      }
      fadeVolumeTo(0, BGM_CONFIG.fadeOutMs, () => audio.pause());
    },
    [cancelFade, fadeVolumeTo]
  );

  const setBgmMuted = useCallback((muted: boolean) => {
    mutedRef.current = muted;
    if (audioRef.current) {
      audioRef.current.muted = muted;
    }
  }, []);

  const releaseAll = useCallback(() => {
    stopStream();
    stopBgm(true);
    audioSrcRef.current = null;
    // 다음 고객이 음소거 상태를 물려받지 않도록 초기화합니다
    // (FlowState.bgmMuted 도 RESET 으로 false 가 되므로 UI와 어긋나면 안 됩니다).
    mutedRef.current = false;
    if (audioRef.current) audioRef.current.muted = false;

    // 세그멘테이션 인스턴스는 이 런타임이 소유합니다. 화면(useSegmentation)은
    // 언마운트 시 루프만 멈추고 close 하지 않으므로, 여기서 한 번만 닫습니다.
    const segmenter = segmenterRef.current;
    segmenterRef.current = null;
    segmenterPromiseRef.current = null;
    if (segmenter) {
      void Promise.resolve()
        .then(() => segmenter.close())
        .catch(() => {
          // 이미 닫혔거나 in-flight 프레임이 있었던 경우 — 무시합니다.
        });
    }
  }, [stopBgm, stopStream]);

  // 페이지를 떠날 때(탭 닫기, HMR 등) 카메라와 오디오를 확실히 정리합니다.
  useEffect(() => releaseAll, [releaseAll]);

  const value = useMemo<PortalRuntimeValue>(
    () => ({
      acquireCamera,
      getSegmenter,
      preloadWorldImage,
      getWorldImage,
      unlockAudio,
      playBgm,
      stopBgm,
      setBgmMuted,
      releaseAll,
    }),
    [
      acquireCamera,
      getSegmenter,
      preloadWorldImage,
      getWorldImage,
      unlockAudio,
      playBgm,
      stopBgm,
      setBgmMuted,
      releaseAll,
    ]
  );

  return (
    <PortalRuntimeContext.Provider value={value}>{children}</PortalRuntimeContext.Provider>
  );
}

export function usePortalRuntime(): PortalRuntimeValue {
  const ctx = useContext(PortalRuntimeContext);
  if (!ctx) {
    throw new Error("usePortalRuntime must be used within a PortalRuntimeProvider");
  }
  return ctx;
}
