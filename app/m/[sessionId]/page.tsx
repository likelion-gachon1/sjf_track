"use client";

import Image from "next/image";
import Link from "next/link";

// QR 을 스캔하면 열리는 모바일 랜딩 페이지 (/m/{sessionId}).
// 촬영한 사진 보러가기 / 체험한 제품 보러가기 두 가지 링크를 제공합니다.
export default function MobileLandingPage({
  params,
}: {
  params: { sessionId: string };
}) {
  return (
    <main
      className="relative mx-auto flex min-h-screen w-full max-w-[402px] flex-col px-5 bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: "url('/ui/qr.jpg')" }}
    >
      {/* 헤더 — MCM 로고 + Portal 텍스트 */}
      <header className="flex h-[108px] items-center justify-center gap-6">
        <div className="relative h-10 w-10 shrink-0">
          <Image
            src="/ui/MCM_logo.png"
            alt="MCM"
            width={40}
            height={40}
            className="object-contain"
          />
        </div>
        <p className="text-center text-[22px] font-semibold uppercase tracking-normal text-[#242424]">
          MCM Portal
        </p>
      </header>

      {/* CTA 버튼들 */}
      <div className="flex flex-col gap-4 py-5">
        <Link
          href={`/m/${params.sessionId}/photo`}
          className="flex items-center justify-between rounded-2xl bg-[rgba(220,220,220,0.2)] px-6 py-6"
        >
          <span className="text-[15px] font-semibold uppercase text-[#242424]">
            촬영한 사진 보러가기
          </span>
          <ArrowIcon />
        </Link>

        <Link
          href={`/m/${params.sessionId}/shop`}
          className="flex items-center justify-between rounded-2xl bg-[rgba(220,220,220,0.2)] px-6 py-6"
        >
          <span className="text-[15px] font-semibold uppercase text-[#242424]">
            체험한 제품 보러가기
          </span>
          <ArrowIcon />
        </Link>
      </div>
    </main>
  );
}

function ArrowIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="shrink-0"
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
