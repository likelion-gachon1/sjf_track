import { ApiError } from "@/lib/api";

// =============================================================================
// 모바일 결과 페이지의 실패 안내 문구
// -----------------------------------------------------------------------------
// 부스 스태프가 방문객 폰 화면만 보고 "만료된 링크인지 / 서버가 죽었는지 / 폰이
// 인터넷이 안 되는지"를 바로 구분할 수 있어야 해서 상태 코드별로 문구를 나눕니다.
// /m/{sessionId} 와 /m/{sessionId}/shop 이 같은 문구를 씁니다.
// =============================================================================

export interface SessionErrorView {
  title: string;
  detail: string;
}

export function describeSessionError(err: unknown): SessionErrorView {
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
