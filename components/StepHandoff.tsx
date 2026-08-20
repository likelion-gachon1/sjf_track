"use client";

import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { COPY, WORLDS } from "@/config/portal.config";
import { findProductChoice } from "@/config/products.config";
import { formatExpiresAt } from "@/lib/api";
import { track } from "@/lib/analytics";
import { usePortalFlow } from "@/lib/FlowContext";
import { usePortalRuntime } from "@/lib/PortalRuntime";

// 08 QR HANDOFF — 사진을 모바일에서 이어받도록 QR 을 보여줍니다.
// 촬영 사진은 앞 화면(09 MOMENT)에서 이미 크게 보여줬습니다. "다음"으로 마지막
// 화면(TODAY'S MCM)으로 넘어갑니다.
export default function StepHandoff() {
  const { state, dispatch } = usePortalFlow();
  const runtime = usePortalRuntime();
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  const world = state.selectedWorldId ? WORLDS[state.selectedWorldId] : null;
  const choice = findProductChoice(state.productId, state.colorwayKey);
  const pointColor = choice?.colorway.hex ?? "#0a0a0a";

  const handoffUrl = useMemo(() => {
    if (state.shareUrl) return state.shareUrl;
    const host =
      process.env.NEXT_PUBLIC_PORTAL_HOST ??
      (typeof window !== "undefined" ? window.location.origin : "");
    return `${host}/m/${state.sessionId}`;
  }, [state.shareUrl, state.sessionId]);

  useEffect(() => {
    let cancelled = false;

    QRCode.toDataURL(handoffUrl, {
      width: 480,
      margin: 1,
      color: { dark: "#0a0a0a", light: "#ffffff" },
    })
      .then((url) => {
        if (!cancelled) setQrDataUrl(url);
      })
      .catch((err: unknown) => {
        console.warn("[portal] QR 생성 실패:", err);
      });

    return () => {
      cancelled = true;
    };
  }, [handoffUrl]);

  useEffect(() => {
    // 체험이 끝나가니 BGM 은 페이드아웃합니다.
    runtime.stopBgm();
    track({ name: "qr_displayed", sessionId: state.sessionId });
  }, [runtime, state.sessionId]);

  const fileName = `mcm-portal-${world?.id ?? "world"}-${state.capturedAt ?? Date.now()}.jpg`;
  const expiryLabel = state.expiresAt ? formatExpiresAt(state.expiresAt) : null;

  function handleRestart() {
    // 카메라·MediaPipe·배경·BGM 을 한 번에 정리하고 다음 고객을 위해 초기화합니다.
    runtime.releaseAll();
    dispatch({ type: "RESET" });
    track({ name: "session_reset" });
  }

  return (
    <div className="flex h-full min-h-screen flex-col items-center justify-center bg-paper px-8 py-16 text-center">
      <h2 className="font-serif text-3xl">{COPY.handoffHeading}</h2>

      <div
        className="mt-10 flex h-52 w-52 items-center justify-center rounded-xl border bg-white p-3"
        style={{ borderColor: pointColor }}
      >
        {qrDataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={qrDataUrl} alt="QR" className="h-full w-full" />
        ) : (
          <span className="text-xs tracking-widest2 text-ink/60">QR</span>
        )}
      </div>

      <p className="mt-8 whitespace-pre-line text-sm leading-relaxed text-ink/85">
        {COPY.handoffCaption}
      </p>

      {/* 만료 안내 — 업로드가 성공했을 때만 실제 시각을 알 수 있습니다. */}
      {expiryLabel && (
        <p className="mt-3 text-xs text-ink/70">
          {COPY.handoffExpiry.replace("{expiry}", expiryLabel)}
        </p>
      )}

      <div className="mt-12 flex items-center gap-4">
        {state.capturedImage && (
          <a
            href={state.capturedImage}
            download={fileName}
            onClick={() => track({ name: "photo_download_clicked" })}
            className="rounded-full border border-ink/25 px-8 py-3 text-sm tracking-widest text-ink/90 transition-colors hover:border-ink/50 hover:text-ink"
          >
            {COPY.downloadButton}
          </a>
        )}

        {/* 부스의 마지막 화면입니다. 사진 저장은 QR 로 넘어간 폰에서 이어집니다
            (/m/{sessionId}/photo) — 부스 화면은 다음 고객을 위해 비워둬야 합니다. */}
        <button
          type="button"
          onClick={handleRestart}
          className="flex items-center gap-3 rounded-full bg-ink px-10 py-3 text-sm tracking-widest text-white transition-colors hover:bg-ink/85"
        >
          {COPY.restartButton}
        </button>
      </div>
    </div>
  );
}
