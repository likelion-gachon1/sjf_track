"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { COPY } from "@/config/portal.config";
import { usePortalRuntime } from "@/lib/PortalRuntime";

export type CameraStatus = "idle" | "requesting" | "ready" | "error";

interface UseCameraResult {
  videoRef: React.RefObject<HTMLVideoElement>;
  status: CameraStatus;
  errorMessage: string | null;
  devices: MediaDeviceInfo[];
  selectedDeviceId: string | null;
  selectDevice: (deviceId: string) => void;
  retry: () => void;
}

// 스트림 자체는 PortalRuntime 이 보관합니다(05에서 미리 확보 → 07에서 재사용).
// 이 훅은 <video> 연결, 에러 분류, 기기 목록만 담당합니다.
// ⚠️ 언마운트 시 스트림을 stop 하지 않습니다. 05→07 이동 중에 끊기면 07 진입이
//    다시 느려지고 권한 팝업 타이밍도 깨집니다. 종료는 releaseAll() 한 곳에서만.
export function useCamera(): UseCameraResult {
  const { acquireCamera } = usePortalRuntime();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState<CameraStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function start() {
      setStatus("requesting");
      setErrorMessage(null);

      if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        setStatus("error");
        setErrorMessage(COPY.cameraUnsupported);
        return;
      }

      try {
        const stream = await acquireCamera(selectedDeviceId ?? undefined);
        if (cancelled) return;

        const video = videoRef.current;
        if (video) {
          if (video.srcObject !== stream) {
            video.srcObject = stream;
          }
          // 재생이 거부되더라도(예: 다른 load 요청으로 중단) 프레임 루프가
          // readyState 를 보고 기다리므로 여기서 실패로 처리하지 않습니다.
          await video.play().catch(() => {});
        }
        if (cancelled) return;
        setStatus("ready");

        // 카메라 라벨은 권한 허용 후에만 채워지므로 스트림 획득 이후에 조회합니다.
        const list = await navigator.mediaDevices.enumerateDevices();
        if (!cancelled) {
          setDevices(list.filter((d) => d.kind === "videoinput"));
        }
      } catch (err) {
        if (cancelled) return;
        setStatus("error");
        setErrorMessage(toErrorMessage(err));
      }
    }

    start();

    return () => {
      cancelled = true;
    };
  }, [acquireCamera, selectedDeviceId, retryToken]);

  const retry = useCallback(() => setRetryToken((t) => t + 1), []);
  const selectDevice = useCallback((deviceId: string) => setSelectedDeviceId(deviceId), []);

  return { videoRef, status, errorMessage, devices, selectedDeviceId, selectDevice, retry };
}

function toErrorMessage(err: unknown): string {
  if (err instanceof DOMException) {
    if (
      err.name === "NotAllowedError" ||
      err.name === "PermissionDeniedError" ||
      err.name === "SecurityError"
    ) {
      return COPY.cameraPermissionDenied;
    }
    if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
      return COPY.cameraNotFound;
    }
    if (err.name === "NotReadableError" || err.name === "TrackStartError") {
      return COPY.cameraInUse;
    }
    if (err.name === "NotSupportedError") {
      return COPY.cameraUnsupported;
    }
  }
  return COPY.cameraGenericError;
}
