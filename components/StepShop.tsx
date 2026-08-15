"use client";

import { useState } from "react";
import { COPY } from "@/config/portal.config";
import { findProductChoice, SAVED_ITEMS } from "@/config/products.config";
import { track } from "@/lib/analytics";
import { usePortalFlow } from "@/lib/FlowContext";
import { usePortalRuntime } from "@/lib/PortalRuntime";
import type { SavedItem } from "@/lib/types";

// 마지막 화면 — TODAY'S MCM(선택한 제품 + 가격 + 관심 저장) / SAVED ITEMS(관심 목록).
// "처음으로"로 다음 고객을 위해 초기화합니다.
export default function StepShop() {
  const { state, dispatch } = usePortalFlow();
  const runtime = usePortalRuntime();

  const choice = findProductChoice(state.productId, state.colorwayKey);
  const product = choice?.product ?? null;
  const colorway = choice?.colorway ?? null;
  const pointColor = colorway?.hex ?? "#0a0a0a";
  const saved = state.productInterestSaved;

  function handleSave() {
    if (saved) return;
    dispatch({ type: "SAVE_PRODUCT_INTEREST" });
    if (product && colorway) {
      track({
        name: "product_interest_saved",
        productId: product.id,
        colorwayKey: colorway.key,
      });
    }
  }

  function handleRestart() {
    runtime.releaseAll();
    dispatch({ type: "RESET" });
    track({ name: "session_reset" });
  }

  return (
    <div className="flex h-full min-h-screen flex-col items-center justify-center gap-10 bg-paper px-10 py-12">
      <div className="grid w-full max-w-5xl grid-cols-2 gap-8">
        {/* TODAY'S MCM — 선택한 제품 */}
        <section className="rounded-2xl border border-ink/10 bg-white p-8 text-left">
          <p className="text-xs tracking-widest2 text-ink/45">{COPY.todaysHeading}</p>

          <div className="mt-7 flex items-center gap-6">
            <div className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#f4f2ef]">
              {colorway?.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={colorway.image} alt="" className="h-full w-full object-contain p-2" />
              ) : (
                <Swatch hex={pointColor} />
              )}
            </div>

            <div>
              <p className="font-serif text-xl text-ink">{product?.name ?? "MCM"}</p>
              {colorway?.label && (
                <p className="mt-1 text-sm text-ink/55">{colorway.label}</p>
              )}
              {product?.price != null && (
                <p className="mt-4 text-lg text-ink">
                  ₩ {product.price.toLocaleString("ko-KR")}
                </p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={handleSave}
            className={[
              "mt-8 flex w-full items-center justify-center gap-2 rounded-full px-6 py-3.5 text-sm tracking-widest transition-colors",
              saved ? "bg-ink/60 text-white" : "bg-ink text-white hover:bg-ink/85",
            ].join(" ")}
          >
            <Heart filled={saved} />
            {saved ? COPY.savedInterestButton : COPY.saveInterestButton}
          </button>
        </section>

        {/* SAVED ITEMS — 관심 제품 목록 (샘플) */}
        <section className="rounded-2xl border border-ink/10 bg-white p-8 text-left">
          <p className="text-xs tracking-widest2 text-ink/45">{COPY.savedHeading}</p>

          <div className="mt-7 grid grid-cols-3 gap-4">
            {SAVED_ITEMS.map((item) => (
              <SavedCard key={item.id} item={item} />
            ))}
          </div>
        </section>
      </div>

      <button
        type="button"
        onClick={handleRestart}
        className="rounded-full border border-ink/25 px-10 py-3 text-sm tracking-widest text-ink/70 transition-colors hover:border-ink/50 hover:text-ink"
      >
        {COPY.restartButton}
      </button>
    </div>
  );
}

function SavedCard({ item }: { item: SavedItem }) {
  const [broken, setBroken] = useState(false);
  const showPhoto = Boolean(item.image) && !broken;

  return (
    <div className="flex flex-col items-center text-center">
      <div className="flex h-24 w-full items-center justify-center overflow-hidden rounded-xl bg-[#f4f2ef]">
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
      <p className="mt-3 text-xs text-ink/80">{item.name}</p>
      <p className="text-[11px] text-ink/45">{item.line}</p>
    </div>
  );
}

// 제품 사진이 없을 때의 단색 백 실루엣 플레이스홀더.
function Swatch({ hex, small = false }: { hex: string; small?: boolean }) {
  const size = small ? 40 : 64;
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
