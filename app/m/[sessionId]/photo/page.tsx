"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { fetchSession, formatExpiresAt, type SessionResponse } from "@/lib/api";
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
