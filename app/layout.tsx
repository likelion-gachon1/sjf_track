import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="ko">
      <body className="font-sans text-ink bg-paper">{children}</body>
    </html>
  );
}
