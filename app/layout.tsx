import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

// 전 화면 공통 서체 — public/font 의 SUIT 3종을 자가 호스팅합니다.
// 부스 네트워크가 끊겨도 떠야 하므로 웹폰트 CDN 을 쓰지 않습니다.
//
// 굵기별로 파일을 따로 선언하므로 CSS font-weight 가 실제 서체로 이어집니다.
//   400(기본) → Regular / 700(font-bold) → Bold / 800(font-extrabold) → ExtraBold
// 선언에 없는 굵기(500·600 등)는 브라우저가 가장 가까운 파일로 매칭하므로
// (500→Regular, 600→Bold) 시스템 폰트로 폴백하지 않습니다.
const suit = localFont({
  src: [
    { path: "../public/font/SUIT-Regular.ttf", weight: "400", style: "normal" },
    { path: "../public/font/SUIT-Bold.ttf", weight: "700", style: "normal" },
    { path: "../public/font/SUIT-ExtraBold.ttf", weight: "800", style: "normal" },
  ],
  display: "swap",
  variable: "--font-suit",
});

export const metadata: Metadata = {
  title: "MCM PORTAL",
  description: "MCM PORTAL — 되고 싶은 나를 브랜드 세계 안에서 만나는 미러 경험",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" className={suit.variable}>
      <body className="font-sans text-ink bg-paper">{children}</body>
    </html>
  );
}
