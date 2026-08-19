"use client";

import { useState } from "react";
import { COPY, RIPPLE_CONFIG } from "@/config/portal.config";
import { PRODUCT_CHOICES } from "@/config/products.config";
import { track } from "@/lib/analytics";
import { usePortalFlow } from "@/lib/FlowContext";
import type { Colorway, Product } from "@/lib/types";
import { useHoverRipple } from "@/lib/useHoverRipple";
import { useRipple } from "@/lib/useRipple";
import StepFrame from "./StepFrame";

// 02 PRODUCT (01 / 03) — 동일 제품의 두 컬러웨이를 카드 2장으로 보여줍니다.
export default function StepProduct() {
  const { dispatch } = usePortalFlow();
  const { trigger, isTransitioning } = useRipple();

  return (
    <StepFrame stepNumber={1} heading={COPY.productHeading} subline={COPY.productSubline}>
      <div className="flex justify-center gap-10">
        {PRODUCT_CHOICES.map(({ product, colorway }) => (
          <ProductCard
            key={`${product.id}-${colorway.key}`}
            product={product}
            colorway={colorway}
            disabled={isTransitioning}
            onSelect={(event) =>
              trigger(event, () => {
                dispatch({
                  type: "SELECT_PRODUCT",
                  productId: product.id,
                  colorwayKey: colorway.key,
                });
                track({
                  name: "product_selected",
                  productId: product.id,
                  colorwayKey: colorway.key,
                });
              })
            }
          />
        ))}
      </div>
    </StepFrame>
  );
}

interface ProductCardProps {
  product: Product;
  colorway: Colorway;
  disabled: boolean;
  onSelect: (event: React.MouseEvent) => void;
}

function ProductCard({ product, colorway, disabled, onSelect }: ProductCardProps) {
  // 사진 파일이 아직 없거나 경로가 틀렸을 때 깨진 이미지 아이콘이 뜨지 않도록,
  // 로드 실패 시 백팩 실루엣으로 폴백합니다.
  const [imageBroken, setImageBroken] = useState(false);
  const showPhoto = Boolean(colorway.image) && !imageBroken;
  // 물결은 그 카드의 제품 색으로 퍼집니다 — 어느 색을 고르는 중인지 손에 잡히게.
  const { handlers, layer } = useHoverRipple(disabled, {
    color: colorway.hex,
    opacity: RIPPLE_CONFIG.hoverProductOpacity,
  });

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onSelect}
      {...handlers}
      className="relative w-80 overflow-hidden rounded-2xl border border-ink/12 bg-white p-5 pb-8 text-center transition-all hover:-translate-y-0.5 hover:border-ink/35 hover:shadow-lg disabled:cursor-default disabled:hover:translate-y-0 disabled:hover:shadow-none"
    >
      {layer}
      {/* 물결 레이어(absolute) 위에 그려지도록 콘텐츠를 relative 로 감쌉니다. */}
      <span className="relative block">
        {/* 제품 컷은 흰 배경이라 카드보다 살짝 어두운 중립 배경 위에 올립니다. */}
        <span className="flex h-72 w-full items-center justify-center overflow-hidden rounded-xl bg-[#f4f2ef]">
          {showPhoto && colorway.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={colorway.image}
              alt={[product.name, product.line].filter(Boolean).join(" ") + ` — ${colorway.label}`}
              onError={() => setImageBroken(true)}
              className="h-full w-full object-contain p-3"
            />
          ) : (
            <BackpackSilhouette hex={colorway.hex} />
          )}
        </span>

        {/* 자간은 바로 아래 제품명(한글)과 같은 기본값으로 둡니다.
            tracking-widest2(0.35em)는 text-xs 급의 작은 영문 eyebrow 라벨용이라,
            이 크기(text-base)에 쓰면 "S o f t   P i n k" 처럼 글자가 흩어집니다. */}
        <span className="mt-7 block text-base text-ink">{colorway.label}</span>
        <span className="mt-3 block text-xs leading-relaxed text-ink/80">
          {product.name}
          {product.line && (
            <>
              <br />
              {product.line}
            </>
          )}
        </span>
      </span>
    </button>
  );
}

/**
 * 제품 사진이 없을 때의 플레이스홀더.
 * 단색 박스는 "무슨 제품인지" 전달이 안 되므로 백팩 실루엣을 컬러웨이 색으로 칠합니다.
 * 어두운 컬러웨이에서는 외곽선을 밝게 뒤집어 형태가 보이게 합니다.
 */
function BackpackSilhouette({ hex }: { hex: string }) {
  const dark = isDarkHex(hex);
  const line = dark ? "rgba(255,255,255,0.55)" : "rgba(10,10,10,0.45)";
  const stud = dark ? "rgba(255,255,255,0.75)" : "rgba(10,10,10,0.35)";

  return (
    <svg viewBox="0 0 120 140" aria-hidden className="h-[13.125rem] w-[11.25rem]">
      <g fill="none" stroke={line} strokeWidth="1.6" strokeLinejoin="round">
        {/* 손잡이 */}
        <path d="M51 17c1-9 17-9 18 0" strokeLinecap="round" />
        {/* 본체 */}
        <path
          d="M21 60c0-27 17-43 39-43s39 16 39 43v54c0 7-5 12-12 12H33c-7 0-12-5-12-12z"
          fill={hex}
        />
        {/* 상단 지퍼 */}
        <path d="M25 62c11-9 23-13 35-13s24 4 35 13" />
        {/* 전면 포켓 + 지퍼 */}
        <path d="M35 78h50v34H35z" fill={dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)"} />
        <path d="M39 88h42" strokeLinecap="round" />
      </g>
      {/* 사이드 스터드 */}
      <g fill={stud}>
        <rect x="15" y="74" width="6" height="6" rx="1" />
        <rect x="15" y="83" width="6" height="6" rx="1" />
        <rect x="99" y="74" width="6" height="6" rx="1" />
        <rect x="99" y="83" width="6" height="6" rx="1" />
      </g>
    </svg>
  );
}

/** 실루엣 외곽선 색을 뒤집을지 판단하는 용도의 간단한 명도 계산. */
function isDarkHex(hex: string): boolean {
  const n = Number.parseInt(hex.replace("#", ""), 16);
  if (Number.isNaN(n)) return false;
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 < 0.45;
}
