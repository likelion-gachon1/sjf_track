"use client";

import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { COPY, WORLDS } from "@/config/portal.config";
import { findProductChoice } from "@/config/products.config";
import { track } from "@/lib/analytics";
import { usePortalFlow } from "@/lib/FlowContext";
import { usePortalRuntime } from "@/lib/PortalRuntime";

// 08 QR HANDOFF — 사진/관심 제품을 모바일에서 이어받도록 QR 을 보여줍니다.
// 촬영 사진은 앞 화면(09 MOMENT)에서 이미 크게 보여줬습니다. "다음"으로 마지막
// 화면(TODAY'S MCM / SAVED ITEMS)으로 넘어갑니다.
export default function StepHandoff() {
  const { state, dispatch } = usePortalFlow();
  const runtime = usePortalRuntime();
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  const world = state.selectedWorldId ? WORLDS[state.selectedWorldId] : null;
  const choice = findProductChoice(state.productId, state.colorwayKey);
  const pointColor = choice?.colorway.hex ?? "#0a0a0a";

  // ⚠️ 임시 URL — /m/{sessionId} 모바일 라우트는 아직 구현되지 않았습니다(다음 단계).
  const handoffUrl = useMemo(() => {
    // 백엔드에서 받은 공유 URL 이 있으면 그것을 쓰고, 없으면(업로드 실패 등) 임시 URL 로 폴백합니다.
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
          <span className="text-xs tracking-widest2 text-ink/30">QR</span>
        )}
      </div>

      <p className="mt-8 whitespace-pre-line text-sm leading-relaxed text-ink/60">
        {COPY.handoffCaption}
      </p>

      <div className="mt-12 flex items-center gap-4">
        {state.capturedImage && (
          <a
            href={state.capturedImage}
            download={fileName}
            onClick={() => track({ name: "photo_download_clicked" })}
            className="rounded-full border border-ink/25 px-8 py-3 text-sm tracking-widest text-ink/70 transition-colors hover:border-ink/50 hover:text-ink"
          >
            {COPY.downloadButton}
          </a>
        )}

        <button
          type="button"
          onClick={() => dispatch({ type: "SHOW_SHOP" })}
          className="flex items-center gap-3 rounded-full bg-ink px-10 py-3 text-sm tracking-widest text-white transition-colors hover:bg-ink/85"
        >
          {COPY.handoffNext}
          <ArrowRight />
        </button>
      </div>
    </div>
  );
}

function ArrowRight() {
  return (
    <svg width="28" height="8" viewBox="0 0 28 8" fill="none" aria-hidden>
      <path d="M0 4h26M22 1l4 3-4 3" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}
