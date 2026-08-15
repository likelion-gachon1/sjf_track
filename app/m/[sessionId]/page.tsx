"use client";

import { useEffect, useState } from "react";
import { fetchSession, type SessionResponse } from "@/lib/api";

// QR 을 스캔하면 열리는 모바일 결과 페이지 (/m/{sessionId}).
// 백엔드에 사진을 다시 물어봐서 화면에 띄우고, 저장할 수 있게 합니다.
export default function MobileResultPage({
  params,
}: {
  params: { sessionId: string };
}) {
  const [data, setData] = useState<SessionResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchSession(params.sessionId)
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch(() => {
        if (!cancelled) {
          setError("결과를 불러오지 못했어요. 링크가 만료되었을 수 있어요 (24시간).");
        }
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
          "-apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', sans-serif",
        textAlign: "center",
      }}
    >
      <h1 style={{ fontSize: 20, margin: 0 }}>YOUR MCM MOMENT</h1>

      {error && <p style={{ color: "#c0392b", fontSize: 14 }}>{error}</p>}

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
              background: "#1a1a1a",
              color: "#fff",
              textDecoration: "none",
              fontSize: 14,
              letterSpacing: "0.05em",
            }}
          >
            사진 저장하기
          </a>
        </>
      )}
    </main>
  );
}
