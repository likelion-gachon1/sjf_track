"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CAMERA_CONFIG, COPY } from "@/config/portal.config";

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

// 미러 화면이 마운트된 동안에만 카메라를 켜고, 언마운트되면(다른 단계로 이동,
// 브라우저 뒤로가기 등) 아래 effect의 cleanup에서 스트림을 확실히 stop() 합니다.
export function useCamera(): UseCameraResult {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [status, setStatus] = useState<CameraStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [retryToken, setRetryToken] = useState(0);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function start() {
      stopStream();
      setStatus("requesting");
      setErrorMessage(null);

      if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        setStatus("error");
        setErrorMessage(COPY.cameraUnsupported);
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            width: { ideal: CAMERA_CONFIG.width },
            height: { ideal: CAMERA_CONFIG.height },
            ...(selectedDeviceId ? { deviceId: { exact: selectedDeviceId } } : {}),
          },
        });

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
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
      stopStream();
    };
  }, [selectedDeviceId, retryToken, stopStream]);

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
  }
  return COPY.cameraGenericError;
}
