// =============================================================================
// MCM PORTAL — 제품 설정
// -----------------------------------------------------------------------------
// 02 PRODUCT 화면은 "동일 제품의 두 컬러웨이"를 카드 2장으로 보여줍니다.
//
// 제품 사진 파일명 규약:  public/products/{productId}-{colorwayKey}.png
//   예) public/products/stark_backpack_visetos-pink.png
// 흰 배경 정면 컷(정사각형에 가까운 비율)을 넣어주세요. 카드가 밝은 중립 배경 위에
// object-contain 으로 배치하므로 흰 제품도 묻히지 않습니다.
//
// ⚠️ 파일이 아직 없거나 경로가 틀려도 화면은 깨지지 않습니다 — 로드에 실패하면
//    02 카드가 colorway.hex 색의 백팩 실루엣(SVG)으로 자동 폴백합니다.
// =============================================================================

import type { Product, SavedItem } from "@/lib/types";

export const PRODUCTS: Product[] = [
  {
    id: "stark_backpack_visetos",
    name: "Stark Backpack",
    line: "in Visetos",
    price: 1290000,
    colorways: [
      {
        key: "pink",
        label: "PINK",
        hex: "#e8b9c4",
        image: "/products/stark_backpack_visetos-pink.png",
      },
      {
        key: "black",
        label: "BLACK",
        hex: "#1c1c1c",
        image: "/products/stark_backpack_visetos-black.png",
      },
    ],
  },
];

/**
 * SAVED ITEMS(관심 제품) 샘플 — 마지막 화면에 노출됩니다.
 * ⚠️ 프로토타입용 예시 데이터. 실제 위시리스트 연동 시 이 배열을 교체하세요.
 * 이미지 파일(public/products/*.png)이 없으면 hex 색 플레이스홀더로 폴백합니다.
 */
export const SAVED_ITEMS: SavedItem[] = [
  { id: "aren_crossbody", name: "Aren Crossbody", line: "Black", hex: "#1c1c1c" },
  { id: "himmel_shopper", name: "Himmel Shopper", line: "Visetos", hex: "#b08d57" },
  { id: "arena_boston", name: "Arena Boston Bag", line: "Powder Pink", hex: "#e8b9c4" },
];

/** 02 화면이 렌더링할 (제품 × 컬러웨이) 평탄화 목록. */
export const PRODUCT_CHOICES = PRODUCTS.flatMap((p) =>
  p.colorways.map((c) => ({ product: p, colorway: c }))
);

/**
 * 선택된 (제품, 컬러웨이) 조회.
 *
 * colorway.hex 는 **02 카드 / 06 리빌 CTA 테두리 / QR 화면 포인트 색**에만 씁니다.
 * 07 합성 화면에는 적용하지 마세요 (합성 품질에 영향).
 */
export function findProductChoice(productId: string | null, colorwayKey: string | null) {
  if (!productId || !colorwayKey) return null;
  return (
    PRODUCT_CHOICES.find(
      (c) => c.product.id === productId && c.colorway.key === colorwayKey
    ) ?? null
  );
}
