"use client";

import { useEffect, useState } from "react";
import { ApiError, fetchSession, type SessionResponse } from "@/lib/api";

interface ErrorView {
  title: string;
  detail: string;
}

/**
 * 실패 원인을 화면 문구로 옮깁니다.
 * 부스 스태프가 폰 화면만 보고 "만료된 링크인지 / 서버가 죽었는지 / 폰이 인터넷이 안 되는지"를
 * 바로 구분할 수 있어야 해서 상태 코드별로 문구를 나눕니다.
 */
function describeError(err: unknown): ErrorView {
  if (err instanceof ApiError) {
    switch (err.status) {
      case 404:
        return {
          title: "사진을 찾을 수 없어요",
          detail: "링크가 잘못되었거나 사진이 저장되지 않았어요. 부스 직원에게 문의해 주세요.",
        };
      case 410:
        return {
          title: "링크가 만료되었어요",
          detail: "촬영 후 24시간이 지나면 사진이 자동으로 삭제돼요.",
        };
      default:
        return {
          title: "사진을 불러오지 못했어요",
          detail: `잠시 후 새로고침해 주세요. (오류 ${err.status})`,
        };
    }
  }

  // fetch 자체가 실패한 경우 — 폰의 네트워크 문제이거나 서버에 닿지 못한 상태입니다.
  return {
    title: "연결에 실패했어요",
    detail: "네트워크 상태를 확인한 뒤 새로고침해 주세요.",
  };
}

// QR 을 스캔하면 열리는 모바일 결과 페이지 (/m/{sessionId}).
// 백엔드에 사진을 다시 물어봐서 화면에 띄우고, 저장할 수 있게 합니다.
export default function MobileResultPage({
  params,
}: {
  params: { sessionId: string };
}) {
  const [data, setData] = useState<SessionResponse | null>(null);
  const [error, setError] = useState<ErrorView | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchSession(params.sessionId)
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((err: unknown) => {
        // 원본 오류는 콘솔에 남겨 스태프가 원격으로 원인을 확인할 수 있게 합니다.
        console.warn("[portal] 세션 조회 실패:", err);
        if (!cancelled) setError(describeError(err));
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
