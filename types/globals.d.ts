// 개발 확인용으로 window 에 노출하는 값들의 타입 선언.
//   console.table(window.__portalMappingTable())   → 조합별 World 매핑 전수 확인
//   window.__portalEvents                           → 기록된 KPI 이벤트 목록
import type { MappingTableRow } from "@/config/portal.config";
import type { PortalEventRecord } from "@/lib/analytics";

declare global {
  interface Window {
    __portalMappingTable?: () => MappingTableRow[];
    __portalEvents?: PortalEventRecord[];
  }
}
