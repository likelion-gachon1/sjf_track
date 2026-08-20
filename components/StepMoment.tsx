"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { COPY, WORLDS } from "@/config/portal.config";
import { findProductChoice } from "@/config/products.config";
import { usePortalFlow } from "@/lib/FlowContext";
import { ApiError, TimeoutError, uploadSession } from "@/lib/api";
import { PASSPORT_DEPARTURE, requestPassport, type PassportData } from "@/lib/passport";

type UploadState = "uploading" | "done" | "failed";

/** 실패 원인별 안내 — 방문객이 뭘 해야 할지 알 수 있게 나눕니다. */
function describeUploadError(err: unknown): string {
  if (err instanceof TimeoutError) return COPY.uploadTimeout;
  if (err instanceof ApiError) {
    return err.status === 413 ? COPY.uploadTooLarge : COPY.uploadServerError;
  }
  return COPY.uploadOffline;
}

// 09 YOUR MCM MOMENT
// 촬영 직후, 찍은 사진을 크게 보여주고 그 옆에 MCM TRAVEL PASSPORT 를 발급합니다.
// 여권의 "여행 유형 / 추천 이유" 두 줄은 서버 라우트(/api/passport)를 통해 실시간
// AI 로 생성되고, 실패하면 폴백 문구로 자동 대체됩니다. "다음"으로 08 QR 로 넘어갑니다.
export default function StepMoment() {
  const { state, dispatch } = usePortalFlow();

  const [uploadState, setUploadState] = useState<UploadState>("uploading");
  const [failMessage, setFailMessage] = useState("");

  // 촬영 직후, 합성 사진 + 선택값을 백엔드로 업로드하고 공유 URL 을 받아둡니다.
  // 실패해도 "다음"은 계속 눌립니다 — 부스에서 손님을 세워두면 안 되기 때문에,
  // 업로드는 재시도할 수 있게만 해두고 흐름 자체는 막지 않습니다.
  const runUpload = useCallback(async () => {
    if (!state.capturedImage || !state.sessionId || state.capturedAt == null) return;

    setUploadState("uploading");
    try {
      const res = await uploadSession(
        {
          sessionId: state.sessionId,
          consent: state.consent,
          productId: state.productId,
          colorwayKey: state.colorwayKey,
          mood: state.answers.mood,
          journey: state.answers.journey,
          worldId: state.selectedWorldId,
          capturedAt: state.capturedAt,
        },
        state.capturedImage
      );
      dispatch({ type: "SET_SESSION_SHARE", url: res.shareUrl, expiresAt: res.expiresAt });
      setUploadState("done");
    } catch (err: unknown) {
      console.warn("[portal] 세션 업로드 실패:", err);
      setFailMessage(describeUploadError(err));
      setUploadState("failed");
    }
  }, [dispatch, state]);

  const choice = findProductChoice(state.productId, state.colorwayKey);
  const world = state.selectedWorldId ? WORLDS[state.selectedWorldId] : null;
  const pointColor = choice?.colorway.hex ?? "#0a0a0a";

  // MCM TRAVEL PASSPORT 발급 — 마운트 시 한 번, AI 멘트를 요청해 화면에 표시합니다.
  const [passport, setPassport] = useState<PassportData | null>(null);

  // StrictMode 이중 마운트로 두 번 올라가지 않게 ref 로 최초 1회만 실행합니다.
  const startedRef = useRef(false);
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    if (choice && world && state.answers.mood && state.answers.journey) {
      void requestPassport({
        colorwayKey: choice.colorway.key,
        colorwayLabel: choice.colorway.label,
        productName: choice.product.name,
        worldDisplayName: world.displayName,
        worldName: world.name,
        mood: state.answers.mood,
        journey: state.answers.journey,
        // 04에서 AI가 읽어낸 실제 착장 — 카피가 오늘 입고 온 옷을 반영하게 합니다.
        outfitColorName: state.moodAnalysis?.dominantColor.name,
        outfitDescription: state.moodAnalysis?.description,
      }).then(setPassport);
    }

    void runUpload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex h-full min-h-screen flex-col items-center justify-center bg-paper px-8 py-10 text-center">
      <p className="text-xs tracking-widest2 text-ink/75">{COPY.momentEyebrow}</p>

      <div className="mt-6 flex flex-col items-center gap-8 lg:flex-row lg:items-center lg:gap-10">
        {/* 촬영 사진 */}
        <div
          className="overflow-hidden rounded-2xl border bg-white shadow-[0_24px_70px_-30px_rgba(0,0,0,0.55)]"
          style={{ borderColor: pointColor }}
        >
          {state.capturedImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={state.capturedImage}
              alt="촬영된 순간"
              className="block max-h-[62vh] w-auto max-w-[46vw] object-contain"
            />
          ) : (
            <div className="flex h-[46vh] w-[46vw] max-w-2xl items-center justify-center text-sm text-ink/60">
              사진을 불러오는 중...
            </div>
          )}
        </div>

        {/* MCM TRAVEL PASSPORT */}
        <Passport
          passport={passport}
          pointColor={pointColor}
          shotAt={state.capturedAt != null ? formatShotAt(state.capturedAt) : "—"}
        />
      </div>

      <p className="mt-6 text-sm text-ink/85">{COPY.momentCaption}</p>

      {/* 업로드 상태 — 실패해도 "다음"은 막지 않고 재시도만 제공합니다. */}
      <div className="mt-3 flex min-h-[2rem] items-center gap-3 text-xs">
        {uploadState === "uploading" && (
          <span className="text-ink/70">{COPY.uploadInProgress}</span>
        )}
        {uploadState === "failed" && (
          <>
            <span className="text-[#c0392b]">{failMessage}</span>
            <button
              type="button"
              onClick={() => void runUpload()}
              className="rounded-full border border-ink/25 px-4 py-1.5 tracking-widest text-ink/90 transition-colors hover:border-ink/50 hover:text-ink"
            >
              {COPY.uploadRetry}
            </button>
          </>
        )}
      </div>

      <button
        type="button"
        onClick={() => dispatch({ type: "SHOW_QR" })}
        className="mt-3 flex items-center gap-4 rounded-full bg-ink px-12 py-3.5 text-sm tracking-widest text-white transition-colors hover:bg-ink/85"
      >
        {COPY.momentNext}
        <ArrowRight />
      </button>
    </div>
  );
}

// -----------------------------------------------------------------------------
// 여권 카드 — 빈티지 여권/스탬프 톤. 골드(accent) 포인트 + 세리프 헤더.
// AI 멘트가 오기 전에는 "발급 중..." 상태를 보여줍니다.
// -----------------------------------------------------------------------------
/** 촬영 시각(타임스탬프)을 여권 표기용 "YYYY.MM.DD  HH:mm" 으로 포맷합니다. */
function formatShotAt(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}  ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function Passport({
  passport,
  pointColor,
  shotAt,
}: {
  passport: PassportData | null;
  pointColor: string;
  shotAt: string;
}) {
  return (
    <div className="flex w-[23.75rem] max-w-[86vw] flex-col rounded-2xl border border-accent/40 bg-[#fbf9f4] p-7 text-left shadow-[0_24px_70px_-34px_rgba(0,0,0,0.5)]">
      {/* 헤더 */}
      <div className="flex items-center justify-between border-b border-accent/30 pb-4">
        <div>
          <p className="font-serif text-[0.6875rem] tracking-widest2 text-accent">MCM</p>
          <h3 className="mt-1 font-serif text-lg tracking-wide text-ink">
            {COPY.passportTitle}
          </h3>
        </div>
        <Emblem />
      </div>

      {/* 출발지 → 도착지 */}
      <div className="mt-5 flex items-end justify-between">
        <Field label={COPY.passportDeparture} value={PASSPORT_DEPARTURE} />
        <PlaneArrow />
        <Field label={COPY.passportArrival} value={passport?.arrival ?? "—"} align="right" />
      </div>

      {/* 촬영 일시 / 동행 제품 */}
      <div className="mt-6 space-y-4">
        <Row label={COPY.passportShotAt} value={shotAt} />
        <Row label={COPY.passportCompanion} value={passport?.companion ?? null} />
      </div>

      {/* 추천 이유 — AI CONCIERGE */}
      <div
        className="mt-6 rounded-xl border border-dashed bg-accent/5 px-4 py-4"
        style={{ borderColor: `${pointColor}55` }}
      >
        <p className="text-[0.625rem] tracking-widest2 text-accent">
          ✦ {COPY.passportConcierge}
        </p>
        <p className="mt-2 min-h-[1.5em] font-serif text-base leading-snug text-ink">
          {passport ? (
            <span className="animate-fadeIn">{passport.reason}</span>
          ) : (
            <span className="text-ink/65">{COPY.passportLoading}</span>
          )}
        </p>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  align = "left",
}: {
  label: string;
  value: string;
  align?: "left" | "right";
}) {
  return (
    <div className={align === "right" ? "text-right" : "text-left"}>
      <p className="text-[0.625rem] tracking-widest2 text-ink/70">{label}</p>
      <p className="mt-1 font-serif text-2xl tracking-wide text-ink">{value}</p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <p className="text-[0.625rem] tracking-widest2 text-ink/70">{label}</p>
      {value ? (
        <p className="animate-fadeIn text-right text-sm font-semibold tracking-wide text-ink">
          {value}
        </p>
      ) : (
        <span className="h-3 w-24 animate-pulse rounded bg-ink/10" />
      )}
    </div>
  );
}

// 여권 헤더 우측 엠블럼. /ui/MCM_logo.png (검정 날개 마크) 를 씁니다.
// 로드에 실패하면 기존 금색 SVG 배지로 자동 폴백합니다.
function Emblem() {
  const [broken, setBroken] = useState(false);

  if (broken) {
    return (
      <svg viewBox="0 0 34 34" fill="none" aria-hidden className="h-[2.125rem] w-[2.125rem]">
        <circle cx="17" cy="17" r="15.5" stroke="#b08d57" strokeWidth="1" />
        <circle cx="17" cy="17" r="11" stroke="#b08d57" strokeWidth="0.5" opacity="0.6" />
        <path
          d="M17 7l2.6 6.3 6.8.5-5.2 4.4 1.7 6.6L17 27.7l-5.7-2.4 1.7-6.6-5.2-4.4 6.8-.5z"
          fill="#b08d57"
          opacity="0.85"
        />
      </svg>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/ui/MCM_logo.png"
      alt="MCM"
      onError={() => setBroken(true)}
      className="h-9 w-auto object-contain"
    />
  );
}

function PlaneArrow() {
  return (
    <svg
      viewBox="0 0 46 16"
      fill="none"
      aria-hidden
      className="mb-1 h-4 w-[2.875rem] text-accent"
    >
      <path d="M0 8h34" stroke="currentColor" strokeWidth="0.75" strokeDasharray="2 2" />
      <path d="M30 3c3 2 7 4 12 5-5 1-9 3-12 5l1.5-5z" fill="currentColor" opacity="0.9" />
    </svg>
  );
}

function ArrowRight() {
  return (
    <svg viewBox="0 0 28 8" fill="none" aria-hidden className="h-2 w-7">
      <path d="M0 4h26M22 1l4 3-4 3" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}
