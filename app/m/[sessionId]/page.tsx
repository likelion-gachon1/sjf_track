"use client";

import { useEffect, useState } from "react";
import { fetchSession, type SessionResponse } from "@/lib/api";
import { describeSessionError, type SessionErrorView } from "@/lib/sessionError";

// QR 을 스캔하면 열리는 모바일 결과 페이지 (/m/{sessionId}).
// 백엔드에 사진을 다시 물어봐서 화면에 띄우고, 저장할 수 있게 합니다.
export default function MobileResultPage({
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
        // 원본 오류는 콘솔에 남겨 스태프가 원격으로 원인을 확인할 수 있게 합니다.
        console.warn("[portal] 세션 조회 실패:", err);
        if (!cancelled) setError(describeSessionError(err));
      });
    return () => {
      cancelled = true;
    };
  }, [params.sessionId]);

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 20,
        padding: 24,
        background: "#f7f5f1",
        color: "#1a1a1a",
        fontFamily:
          "var(--font-suit), -apple-system, BlinkMacSystemFont, sans-serif",
        textAlign: "center",
      }}
    >
      <h1 style={{ fontSize: 20, margin: 0 }}>YOUR MCM MOMENT</h1>

      {error && (
        <div style={{ maxWidth: 340 }}>
          <p style={{ color: "#c0392b", fontSize: 15, fontWeight: 600, margin: "0 0 8px" }}>
            {error.title}
          </p>
          <p style={{ color: "#6b6b6b", fontSize: 13, lineHeight: 1.6, margin: 0 }}>
            {error.detail}
          </p>
        </div>
      )}

      {!error && !data && (
        <p style={{ color: "#6b6b6b", fontSize: 14 }}>사진을 불러오는 중…</p>
      )}

      {data && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={data.imageUrl}
            alt="촬영된 순간"
            style={{
              width: "100%",
              maxWidth: 420,
              borderRadius: 16,
              boxShadow: "0 20px 60px -30px rgba(0,0,0,0.5)",
            }}
          />
          <a
            href={data.downloadUrl}
            style={{
              marginTop: 8,
              padding: "12px 28px",
              borderRadius: 999,
              border: "1px solid rgba(26,26,26,0.25)",
              color: "#1a1a1a",
              textDecoration: "none",
              fontSize: 14,
              letterSpacing: "0.05em",
            }}
          >
            사진 저장하기
          </a>

          {/* 관심 제품 화면으로 — 부스가 아니라 이 폰에서 이어집니다. */}
          <a
            href={`/m/${params.sessionId}/shop`}
            style={{
              padding: "12px 32px",
              borderRadius: 999,
              background: "#1a1a1a",
              color: "#fff",
              textDecoration: "none",
              fontSize: 14,
              letterSpacing: "0.05em",
            }}
          >
            다음 →
          </a>
        </>
      )}
    </main>
  );
}
