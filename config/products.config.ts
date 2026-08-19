// 제품 설정 (02 PRODUCT 화면)
// 파일이 없거나 경로가 틀려도 화면은 깨지지 않습니다 — 로드 실패 시 SVG 폴백.

import type { Product } from "@/lib/types";

export const PRODUCTS: Product[] = [
  {
    id: "stark_backpack_visetos",
    name: "Ottomar 비세토스 위켄더",
    line: "",
    price: 1750000,
    colorways: [
      {
        key: "pink",
        label: "Soft Pink",
        hex: "#e8b9c4",
        image: "/products/Ottomar_Weeke_der_in_Visetos-pink.webp",
        storeUrl:
          "https://kr.mcmworldwide.com/ko_KR/%ED%8A%B8%EB%9E%98%EB%B8%94/%EB%9F%AC%EA%B8%B0%EC%A7%80-%EB%B0%B1/ottomar-%EB%B9%84%EC%84%B8%ED%86%A0%EC%8A%A4-%EC%9C%84%EC%BC%84%EB%8D%94/MMVGATT01PZ001.html",
      },
      {
        key: "beige",
        label: "Cognac",
        hex: "#c9b79c",
        image: "/products/Ottomar_Weeke_der_in_Visetos-beige.webp",
        storeUrl:
          "https://kr.mcmworldwide.com/ko_KR/%ED%8A%B8%EB%9E%98%EB%B8%94/%EB%9F%AC%EA%B8%B0%EC%A7%80-%EB%B0%B1/ottomar-%EB%B9%84%EC%84%B8%ED%86%A0%EC%8A%A4-%EC%9C%84%EC%BC%84%EB%8D%94/MMVGATT01CO001.html",
      },
    ],
  },
];

/** 02 화면이 렌더링할 (제품 × 컬러웨이) 평탄화 목록. */
export const PRODUCT_CHOICES = PRODUCTS.flatMap((p) =>
  p.colorways.map((c) => ({ product: p, colorway: c }))
);

/** 선택된 (제품, 컬러웨이) 조회. */
export function findProductChoice(productId: string | null, colorwayKey: string | null) {
  if (!productId || !colorwayKey) return null;
  return (
    PRODUCT_CHOICES.find(
      (c) => c.product.id === productId && c.colorway.key === colorwayKey
    ) ?? null
  );
}
