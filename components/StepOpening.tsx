"use client";

import { useEffect } from "react";
import {
  COPY,
  WORLDS,
  applyComboBackground,
  buildWorldReason,
  resolveWorld,
} from "@/config/portal.config";
import { track } from "@/lib/analytics";
import { usePortalFlow } from "@/lib/FlowContext";
import { usePortalRuntime } from "@/lib/PortalRuntime";

// 05 PORTAL OPENING
// 연출 화면이자 프리로드 구간입니다. 여기서 카메라 권한 팝업을 띄워두기 때문에
// 07 진입 시 몰입이 끊기지 않습니다.
//
// 최소 표시 시간 — 프리로드가 빨리 끝나도 이 시간만큼은 연출을 보여줍니다.
const MIN_VISIBLE_MS = 1800;

export default function StepOpening() {
  const { state, dispatch } = usePortalFlow();
  const runtime = usePortalRuntime();
  const { mood, journey } = state.answers;
  const colorwayKey = state.colorwayKey;

  useEffect(() => {
    if (!mood || !journey || !colorwayKey) {
      // 정상 플로우에서는 도달할 수 없습니다 (개발 중 HMR/새로고침 대비).
      console.warn("[portal] 선택값이 없어 처음 화면으로 되돌립니다.");
      dispatch({ type: "RESET" });
      return;
    }

    let cancelled = false;
    const worldId = resolveWorld(colorwayKey, mood, journey);
    // 07에서 쓸 배경을 여기서 미리 받아둡니다 — 조합 배경까지 반영해야 같은 파일을
    // 프리로드하게 되고, 07 진입 시 다시 받느라 첫 프레임이 비는 일이 없습니다.
    const world = applyComboBackground(WORLDS[worldId], colorwayKey, { mood, journey });

    // 개별 실패는 진행을 막지 않습니다 — 카메라 실패는 07의 에러 UI가,
    // 이미지 실패는 gradient 폴백이 처리합니다.
    const preloads = Promise.allSettled([
      runtime.getSegmenter(),
      runtime.preloadWorldImage(world),
      runtime.acquireCamera(),
    ]);
    const minVisible = new Promise((resolve) => window.setTimeout(resolve, MIN_VISIBLE_MS));

    void Promise.all([preloads, minVisible]).then(() => {
      if (cancelled) return;

      track({ name: "world_resolved", worldId, mood, journey });
      // reason 문장은 데이터로만 준비합니다. 노출 위치가 정해지기 전까지 화면에
      // 렌더링하지 않고, 매핑 검증용으로 콘솔에만 남깁니다.
      console.info("[portal] world reason:", buildWorldReason(mood, journey, world));

      dispatch({ type: "RESOLVE_WORLD", worldId });
    });

    return () => {
      cancelled = true;
    };
  }, [colorwayKey, dispatch, journey, mood, runtime]);

  return (
    <div className="flex h-full min-h-screen flex-col items-center justify-center gap-10 bg-paper px-8 text-center">
      <svg
        width="132"
        height="132"
        viewBox="0 0 132 132"
        className="animate-spin"
        style={{ animationDuration: "7s" }}
        aria-hidden
      >
        <circle
          cx="66"
          cy="66"
          r="58"
          fill="none"
          stroke="#0a0a0a"
          strokeOpacity="0.22"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray="2 12"
        />
      </svg>

      <p className="whitespace-pre-line text-lg leading-relaxed text-ink/70">
        {COPY.openingMessage}
      </p>

      <div className="flex gap-2.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-1.5 w-1.5 animate-pulse rounded-full bg-ink/30"
            style={{ animationDelay: `${i * 220}ms`, animationDuration: "1.4s" }}
          />
        ))}
      </div>
    </div>
  );
}
