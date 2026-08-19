"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { findProductChoice } from "@/config/products.config";
import { fetchSession, formatExpiresAt, type SessionResponse } from "@/lib/api";
import { passportFromSession } from "@/lib/passport";
import { describeSessionError, type SessionErrorView } from "@/lib/sessionError";

// 촬영한 사진 확인 페이지 (/m/{sessionId}/photo).
// Figma node 124:902 디자인 기반.
export default function MobilePhotoPage({
  params,
}: {
  params: { sessionId: string };
}) {
  const [data, setData] = useState<SessionResponse | null>(null);
  const [error, setError] = useState<SessionErrorView | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchSession(params.sessionId)
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((err: unknown) => {
        console.warn("[portal] 세션 조회 실패:", err);
        if (!cancelled) setError(describeSessionError(err));
      });
    return () => {
      cancelled = true;
    };
  }, [params.sessionId]);

  return (
    <main
      className="relative mx-auto flex min-h-screen w-full max-w-[402px] flex-col px-5 bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: "url('/ui/qr.jpg')" }}
    >
      {/* 헤더 — 뒤로가기 + MCM Portal */}
      <header className="relative flex h-[104px] items-center justify-center">
        <Link
          href={`/m/${params.sessionId}`}
          className="absolute left-0 flex items-center justify-center"
          aria-label="뒤로가기"
        >
          <BackArrowIcon />
        </Link>
        <div className="flex items-center gap-6">
          <div className="relative h-10 w-10 shrink-0">
            <Image
              src="/ui/MCM_logo.png"
              alt="MCM"
              width={40}
              height={40}
              className="object-contain"
            />
          </div>
          <p className="text-center text-[22px] font-semibold uppercase text-[#242424]">
            MCM Portal
          </p>
        </div>
      </header>

      {/* 본문 — 흰색 카드로 배경과 구분 */}
      <div className="flex flex-1 flex-col items-center justify-center py-5">
        <div className="w-full rounded-3xl bg-white/95 px-5 py-8 shadow-sm backdrop-blur-sm">
        {error && (
          <div className="text-center">
            <p className="text-[15px] font-semibold text-[#c0392b]">{error.title}</p>
            <p className="mt-2 text-[13px] leading-relaxed text-[#6b6b6b]">
              {error.detail}
            </p>
          </div>
        )}

        {!error && !data && (
          <p className="text-center text-[14px] text-[#6b6b6b]">
            사진을 불러오는 중…
          </p>
        )}

        {data && (
          <>
            {/* AI 추천 문구 */}
            <p className="mb-5 text-center text-[19px] font-extrabold text-[#242424]">
              YOUR MCM MOMENT
            </p>

            {/* MCM TRAVEL PASSPORT — 부스 09 화면과 같은 카피를 사진 위에 둡니다 */}
            <MobilePassport session={data} />

            {/* 촬영 사진 */}
            <div className="w-full py-5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={data.imageUrl}
                alt="촬영된 순간"
                className="aspect-[4/3] w-full rounded-2xl object-cover"
              />
            </div>

            {/* 사진 저장하기 버튼 */}
            <a
              href={data.downloadUrl}
              className="flex h-[52px] w-full items-center justify-center rounded-2xl bg-[rgba(220,220,220,0.3)] text-center text-[15px] font-semibold uppercase text-[#242424]"
            >
              사진 저장하기
            </a>

            {/* 만료 안내 */}
            {formatExpiresAt(data.expiresAt) && (
              <p className="mt-4 text-center text-[12px] text-[#8a8a8a]">
                {formatExpiresAt(data.expiresAt)}까지 볼 수 있어요.
              </p>
            )}
          </>
        )}
        </div>
      </div>
    </main>
  );
}

// -----------------------------------------------------------------------------
// MCM TRAVEL PASSPORT (모바일) — 부스 09 화면(components/StepMoment.tsx)의 축소판.
//
// 카피는 세션 값에서 그 자리에서 조립합니다(AI 재호출 없음 — passportFromSession 주석 참고).
// 세션에 없는 조합이면 null 이라 카드만 빠지고 사진·저장 버튼은 그대로 남습니다.
// -----------------------------------------------------------------------------
function MobilePassport({ session }: { session: SessionResponse }) {
  const passport = passportFromSession(session);
  if (!passport) return null;

  const pointColor =
    findProductChoice(session.productId, session.colorwayKey)?.colorway.hex ?? "#b08d57";

  return (
    <section className="w-full rounded-2xl border border-[#b08d57]/40 bg-[#fbf9f4] p-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between border-b border-[#b08d57]/30 pb-3">
        <div>
          <p className="text-[9px] tracking-[0.2em] text-[#b08d57]">MCM</p>
          <h3 className="mt-0.5 text-[13px] font-semibold tracking-wide text-[#242424]">
            MCM TRAVEL PASSPORT
          </h3>
        </div>
        <Image src="/ui/MCM_logo.png" alt="MCM" width={28} height={28} className="object-contain" />
      </div>

      {/* 출발지 → 도착지 */}
      <div className="mt-4 flex items-end justify-between gap-2">
        <PassportField label="출발지" value={passport.departure} />
        <span aria-hidden className="pb-1 text-[13px] text-[#b08d57]">
          ✈
        </span>
        <PassportField label="도착지" value={passport.arrival} align="right" />
      </div>

      {/* 여행 유형 / 동행 제품 */}
      <div className="mt-4 space-y-2">
        <PassportRow label="여행 유형" value={passport.travelType} />
        <PassportRow label="동행 제품" value={passport.companion} />
      </div>

      {/* 추천 이유 */}
      <div
        className="mt-4 rounded-xl border border-dashed bg-[#b08d57]/5 px-3 py-3"
        style={{ borderColor: `${pointColor}55` }}
      >
        <p className="text-[9px] tracking-[0.2em] text-[#b08d57]">✦ AI CONCIERGE</p>
        <p className="mt-1.5 text-[14px] leading-snug text-[#242424]">{passport.reason}</p>
      </div>
    </section>
  );
}

function PassportField({
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
      <p className="text-[9px] tracking-[0.2em] text-[#6b6b6b]">{label}</p>
      <p className="mt-0.5 text-[17px] font-semibold tracking-wide text-[#242424]">{value}</p>
    </div>
  );
}

function PassportRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <p className="shrink-0 text-[9px] tracking-[0.2em] text-[#6b6b6b]">{label}</p>
      <p className="text-right text-[12px] font-semibold tracking-wide text-[#242424]">
        {value}
      </p>
    </div>
  );
}

function BackArrowIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="rotate-180"
    >
      <path
        d="M9.5 6.5L15.5 12L9.5 17.5"
        stroke="#242424"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
