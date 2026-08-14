"use client";

import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { COPY, WORLDS } from "@/config/portal.config";
import { findProductChoice } from "@/config/products.config";
import { track } from "@/lib/analytics";
import { usePortalFlow } from "@/lib/FlowContext";
import { usePortalRuntime } from "@/lib/PortalRuntime";

// QR HANDOFF — 체험 완료 화면.
// 사진 저장 / 관심 제품 저장은 모바일에서 이어받습니다. 갤러리 섹션은 렌더링하지
// 않습니다 (와이어프레임에 없음). savedMoments 상태는 그대로 유지됩니다.
export default function StepHandoff() {
  const { state, dispatch } = usePortalFlow();
  const runtime = usePortalRuntime();
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  const world = state.selectedWorldId ? WORLDS[state.selectedWorldId] : null;
  const choice = findProductChoice(state.productId, state.colorwayKey);
  const pointColor = choice?.colorway.hex ?? "#0a0a0a";

  // ⚠️ 임시 URL — /m/{sessionId} 모바일 라우트는 아직 구현되지 않았습니다(다음 단계).
  //    운영 도메인이 정해지면 NEXT_PUBLIC_PORTAL_HOST 로 주입합니다.
  const handoffUrl = useMemo(() => {
    const host =
      process.env.NEXT_PUBLIC_PORTAL_HOST ??
      (typeof window !== "undefined" ? window.location.origin : "");
    return `${host}/m/${state.sessionId}`;
  }, [state.sessionId]);

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
    // 체험이 끝났으니 BGM 은 페이드아웃합니다.
    runtime.stopBgm();
    track({ name: "qr_displayed", sessionId: state.sessionId });
  }, [runtime, state.sessionId]);

  function handleRestart() {
    runtime.releaseAll();
    dispatch({ type: "RESET" });
    track({ name: "session_reset" });
  }

  const fileName = `mcm-portal-${world?.id ?? "world"}-${state.capturedAt ?? Date.now()}.jpg`;

  return (
    <div className="flex h-full min-h-screen flex-col items-center justify-center bg-paper px-8 py-16 text-center">
      <CheckIcon color={pointColor} />

      <h2 className="mt-8 font-serif text-3xl">{COPY.handoffHeading}</h2>

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
            className="rounded-full bg-ink px-8 py-3 text-sm tracking-widest text-white transition-colors hover:bg-ink/85"
          >
            {COPY.downloadButton}
          </a>
        )}

        <button
          type="button"
          onClick={handleRestart}
          className="rounded-full border border-ink/25 px-8 py-3 text-sm tracking-widest text-ink/70 transition-colors hover:border-ink/50 hover:text-ink"
        >
          {COPY.restartButton}
        </button>
      </div>
    </div>
  );
}

function CheckIcon({ color }: { color: string }) {
  return (
    <svg width="56" height="56" viewBox="0 0 56 56" fill="none" aria-hidden>
      <circle cx="28" cy="28" r="26" stroke={color} strokeWidth="1.5" />
      <path
        d="M18 28.5l7 7 13-14"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
