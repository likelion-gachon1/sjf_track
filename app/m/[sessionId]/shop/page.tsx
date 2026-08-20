"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { fetchSession, type SessionResponse } from "@/lib/api";
import { findProductChoice } from "@/config/products.config";
import { describeSessionError, type SessionErrorView } from "@/lib/sessionError";

// 체험한 제품 보러가기 페이지 (/m/{sessionId}/shop).
// Figma node 124:1007 디자인 기반.
export default function MobileShopPage({
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

  const choice = findProductChoice(data?.productId ?? null, data?.colorwayKey ?? null);
  const product = choice?.product ?? null;
  const colorway = choice?.colorway ?? null;

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
          <p className="text-center text-[14px] text-[#6b6b6b]">불러오는 중…</p>
        )}

        {data && (
          <>
            {/* 서브 타이틀 */}
            <p className="text-center text-[19px] font-extrabold text-[#242424]">
              오늘 함께한 MCM
            </p>

            {/* 제품 정보 카드 */}
            <div className="flex w-full items-center gap-4 py-5">
              {/* 제품 이미지 — 비율 유지하며 축소 */}
              <div className="aspect-[164/179] w-2/5 shrink-0 overflow-hidden rounded-2xl bg-[#f4f2ef]">
                {colorway?.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={colorway.image}
                    alt={`${product?.name ?? ""} ${colorway.label}`}
                    className="h-full w-full object-contain p-3"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-[#d9d9d9]" />
                )}
              </div>

              {/* 제품 텍스트 정보 — 말줄임 대신 줄바꿈 허용 */}
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <p className="text-[15px] font-semibold leading-snug text-[#242424]">
                  {product?.name ?? "Ottomar 비세토스 위켄더"}
                </p>
                <p className="text-[15px] font-semibold text-[#242424]">
                  ₩ {(product?.price ?? 1750000).toLocaleString("ko-KR")}
                </p>
                <p className="text-[14px] text-[#242424]">
                  <span className="font-normal">색상</span>
                  <span className="font-semibold">
                    : {colorway?.label ?? ""}
                  </span>
                </p>
              </div>
            </div>

            {/* CTA 버튼들 */}
            <div className="flex w-full flex-col gap-[10px]">
              <a
                href={colorway?.storeUrl ?? "https://kr.mcmworldwide.com"}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-[52px] w-full items-center justify-center rounded-2xl bg-[rgba(220,220,220,0.3)] text-center text-[15px] font-semibold uppercase text-[#242424]"
              >
                제품 자세히 보기
              </a>
            </div>
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
