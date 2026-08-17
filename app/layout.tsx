import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

// 전 화면 공통 서체 — public/font/SUIT-Bold.ttf 자가 호스팅.
// 부스 네트워크가 끊겨도 떠야 하므로 웹폰트 CDN 을 쓰지 않습니다.
//
// ⚠️ weight 를 "700" 으로 좁히면 font-weight 가 400 인 글자가 이 파일에 매칭되지 않아
//    시스템 폰트로 폴백합니다. 파일은 Bold 한 종류뿐이지만 100~900 범위로 선언해
//    어떤 굵기를 쓰더라도 항상 SUIT-Bold 가 나오게 합니다.
const suit = localFont({
  src: "../public/font/SUIT-Bold.ttf",
  weight: "100 900",
  style: "normal",
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
