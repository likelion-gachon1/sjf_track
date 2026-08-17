"use client";

import { useEffect, useState } from "react";
import { COPY } from "@/config/portal.config";
import { findProductChoice, SAVED_ITEMS } from "@/config/products.config";
import { track } from "@/lib/analytics";
import { fetchSession, type SessionResponse } from "@/lib/api";
import { describeSessionError, type SessionErrorView } from "@/lib/sessionError";
import type { SavedItem } from "@/lib/types";

// QR → /m/{sessionId} (사진 확인) → **여기** (TODAY'S MCM / SAVED ITEMS)
//
// 부스 화면이 아니라 방문객 폰에서 열립니다. 부스의 FlowContext 에 접근할 수 없으므로
// 어떤 제품을 골랐는지는 세션 조회 응답(productId / colorwayKey)으로 알아냅니다.
export default function MobileShopPage({
  params,
}: {
  params: { sessionId: string };
}) {
  const [data, setData] = useState<SessionResponse | null>(null);
  const [error, setError] = useState<SessionErrorView | null>(null);
  const [saved, setSaved] = useState(false);

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
  const pointColor = colorway?.hex ?? "#0a0a0a";

  function handleSave() {
    if (saved || !product || !colorway) return;
    // ⚠️ 저장 API 가 아직 없어 이 폰 안에서만 유지됩니다(새로고침하면 풀립니다).
    setSaved(true);
    track({
      name: "product_interest_saved",
      productId: product.id,
      colorwayKey: colorway.key,
    });
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col gap-6 bg-paper px-5 py-8">
      {error && (
        <div className="mt-16 text-center">
          <p className="text-base font-semibold text-[#c0392b]">{error.title}</p>
          <p className="mt-2 text-sm leading-relaxed text-ink/55">{error.detail}</p>
        </div>
      )}

      {!error && !data && (
        <p className="mt-16 text-center text-sm text-ink/45">불러오는 중…</p>
      )}

      {data && (
        <>
          {/* TODAY'S MCM — 체험에서 고른 제품 */}
          <section className="rounded-2xl border border-ink/10 bg-white p-6">
            <p className="text-xs tracking-widest2 text-ink/45">{COPY.todaysHeading}</p>

            <div className="mt-5 flex items-center gap-5">
              <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#f4f2ef]">
                {colorway?.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={colorway.image} alt="" className="h-full w-full object-contain p-2" />
                ) : (
                  <Swatch hex={pointColor} />
                )}
              </div>

              <div className="min-w-0">
                <p className="font-serif text-lg text-ink">{product?.name ?? "MCM"}</p>
                {colorway?.label && <p className="mt-1 text-sm text-ink/55">{colorway.label}</p>}
                {product?.price != null && (
                  <p className="mt-3 text-base text-ink">
                    ₩ {product.price.toLocaleString("ko-KR")}
                  </p>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={handleSave}
              className={[
                "mt-6 flex w-full items-center justify-center gap-2 rounded-full px-6 py-3.5 text-sm tracking-widest transition-colors",
                saved ? "bg-ink/60 text-white" : "bg-ink text-white",
              ].join(" ")}
            >
              <Heart filled={saved} />
              {saved ? COPY.savedInterestButton : COPY.saveInterestButton}
            </button>
          </section>

          {/* SAVED ITEMS — 관심 목록 (샘플 데이터) */}
          <section className="rounded-2xl border border-ink/10 bg-white p-6">
            <p className="text-xs tracking-widest2 text-ink/45">{COPY.savedHeading}</p>

            <div className="mt-5 grid grid-cols-3 gap-3">
              {SAVED_ITEMS.map((item) => (
                <SavedCard key={item.id} item={item} />
              ))}
            </div>
          </section>

          <a
            href={`/m/${params.sessionId}`}
            className="mt-2 self-center rounded-full border border-ink/25 px-8 py-3 text-sm tracking-widest text-ink/70"
          >
            사진 다시 보기
          </a>
        </>
      )}
    </main>
  );
}

function SavedCard({ item }: { item: SavedItem }) {
  const [broken, setBroken] = useState(false);
  const showPhoto = Boolean(item.image) && !broken;

  return (
    <div className="flex flex-col items-center text-center">
      <div className="flex h-20 w-full items-center justify-center overflow-hidden rounded-xl bg-[#f4f2ef]">
        {showPhoto && item.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.image}
            alt={`${item.name} ${item.line}`}
            onError={() => setBroken(true)}
            className="h-full w-full object-contain p-2"
          />
        ) : (
          <Swatch hex={item.hex} small />
        )}
      </div>
      <p className="mt-2 text-[11px] leading-tight text-ink/80">{item.name}</p>
      <p className="text-[10px] text-ink/45">{item.line}</p>
    </div>
  );
}

// 제품 사진이 없을 때의 단색 백 실루엣 플레이스홀더.
function Swatch({ hex, small = false }: { hex: string; small?: boolean }) {
  const size = small ? 34 : 56;
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden>
      <path
        d="M12 20c0-8 5-13 12-13s12 5 12 13v16c0 3-2 5-5 5H17c-3 0-5-2-5-5z"
        fill={hex}
        opacity="0.85"
      />
      <path d="M18 8c1-4 11-4 12 0" fill="none" stroke={hex} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function Heart({ filled }: { filled: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
      <path
        d="M12 20s-7-4.35-9.5-8.5C1 8.5 2.5 5.5 5.5 5.5c2 0 3.2 1.2 4 2.3.8-1.1 2-2.3 4-2.3 3 0 4.5 3 3 6-2.5 4.15-9.5 8.5-9.5 8.5z"
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}
