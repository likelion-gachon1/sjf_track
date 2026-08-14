// =============================================================================
// KPI 이벤트 훅
// -----------------------------------------------------------------------------
// 와이어프레임에 명시된 KPI 4종(QR 스캔율 / 사진 저장 / 관심 제품 저장 / 제품 상세
// 확인)을 나중에 측정할 수 있도록, 지금은 **타입 안전한 호출 지점만** 심어둡니다.
// 전송은 하지 않고 콘솔 + 메모리 버퍼로만 남깁니다.
//
//   개발 확인:  window.__portalEvents
// =============================================================================

import type { ColorwayKey, JourneyKey, MoodKey, WorldId } from "@/lib/types";

export type PortalEvent =
  | { name: "experience_started" }
  | { name: "product_selected"; productId: string; colorwayKey: ColorwayKey }
  | { name: "mood_selected"; value: MoodKey }
  | { name: "journey_selected"; value: JourneyKey }
  | { name: "world_resolved"; worldId: WorldId; mood: MoodKey; journey: JourneyKey }
  | { name: "portal_entered"; worldId: WorldId }
  | { name: "photo_captured"; worldId: WorldId }
  | { name: "bgm_muted"; muted: boolean }
  | { name: "qr_displayed"; sessionId: string } // KPI: QR 스캔율 분모
  | { name: "photo_download_clicked" } // KPI: 사진 저장
  // 아래 2종은 모바일(/m/{sessionId}) 화면에서 호출할 예정 — 지금은 타입만 정의
  | { name: "product_interest_saved"; productId: string; colorwayKey: ColorwayKey }
  | { name: "product_detail_viewed"; productId: string }
  | { name: "session_reset" };

export type PortalEventRecord = PortalEvent & {
  sessionId: string;
  timestamp: number;
};

/** 버퍼가 무한히 커지지 않도록 최근 N개만 남깁니다 (부스는 하루 종일 켜져 있음). */
const MAX_BUFFERED_EVENTS = 500;

const buffer: PortalEventRecord[] = [];
let currentSessionId = "";

/** 01 START 에서 세션이 발급되면 호출하세요. 이후 모든 이벤트에 자동 부착됩니다. */
export function setAnalyticsSessionId(sessionId: string): void {
  currentSessionId = sessionId;
}

export function track(event: PortalEvent): void {
  const record = {
    ...event,
    sessionId: currentSessionId,
    timestamp: Date.now(),
  } as PortalEventRecord;

  buffer.push(record);
  if (buffer.length > MAX_BUFFERED_EVENTS) buffer.shift();

  console.info("[portal]", event.name, record);

  if (typeof window !== "undefined") {
    // 같은 배열 참조를 넘겨두므로 이후 push 가 콘솔에서도 그대로 보입니다.
    window.__portalEvents = buffer;
  }
}

export function getTrackedEvents(): readonly PortalEventRecord[] {
  return buffer;
}
