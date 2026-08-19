"use client";

import { useEffect, useState } from "react";
import {
  OPENING_STAGES,
  OPENING_TOTAL_MS,
  WORLDS,
  applyComboBackground,
  buildWorldReason,
  resolveWorld,
} from "@/config/portal.config";
import { track } from "@/lib/analytics";
import { checkHealth } from "@/lib/api";
import { usePortalFlow } from "@/lib/FlowContext";
import { resolveMattingMode } from "@/lib/matting";
import { usePortalRuntime } from "@/lib/PortalRuntime";

// 05 PORTAL OPENING
// 연출 화면이자 프리로드 구간입니다. 여기서 카메라 권한 팝업을 띄워두기 때문에
// 07 진입 시 몰입이 끊기지 않습니다.
//
// 화면 길이·문구는 전부 OPENING_STAGES(config)가 정하고 여기서는 재생만 합니다 —
// 길이를 바꾸려면 config 만 고치세요.

export default function StepOpening() {
  const { state, dispatch } = usePortalFlow();
  const runtime = usePortalRuntime();
  const { mood, journey } = state.answers;
  const colorwayKey = state.colorwayKey;
  const [stageIndex, setStageIndex] = useState(0);

  // 각 단계의 시작 시각에 맞춰 문구를 넘깁니다(누적 합 기준으로 한 번에 예약).
  useEffect(() => {
    const timers: number[] = [];
    let elapsed = 0;
    OPENING_STAGES.forEach((stage, i) => {
      if (i === 0) return; // 0번은 처음부터 떠 있으므로 예약이 필요 없습니다.
      elapsed += OPENING_STAGES[i - 1].ms;
      timers.push(window.setTimeout(() => setStageIndex(i), elapsed));
    });
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, []);

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
    // 헬스체크는 체험을 막지 않습니다 — 서버가 죽었어도 촬영까지는 정상 진행하고,
    // 스태프가 업로드 실패 전에 미리 알아차리도록 경고만 남깁니다.
    void checkHealth().then((ok) => {
      if (cancelled || ok) return;
      console.warn("[portal] 백엔드에 연결할 수 없습니다 — 촬영 후 업로드가 실패할 수 있습니다");
      track({ name: "backend_unreachable" });
    });

    // 크로마키는 MediaPipe 가 필요 없으므로 이 구간을 건너뜁니다(로딩이 그만큼 빨라집니다).
    // 07 에서 WebGL 실패로 세그멘테이션으로 내려가면 그때 처음 로드하게 되어 잠깐
    // 로딩 문구가 보일 수 있는데, 그건 폴백 경로라 감수합니다.
    const preloads = Promise.allSettled([
      ...(resolveMattingMode() === "segmentation" ? [runtime.getSegmenter()] : []),
      runtime.preloadWorldImage(world),
      runtime.acquireCamera(),
    ]);
    // 단계 문구를 다 보여주기 전에 화면이 넘어가면 마지막 단계가 잘려 보입니다.
    const minVisible = new Promise((resolve) => window.setTimeout(resolve, OPENING_TOTAL_MS));

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
    <div
      className="flex h-full min-h-screen flex-col items-center justify-center gap-10 bg-cover bg-center px-8 text-center"
      style={{
        // 05 로딩 화면 배경(load). 종이빛 베일을 얹어 어두운 스피너·문구가 읽히게 하고,
        // 파일이 없으면 기존 종이색(paper)으로 폴백합니다.
        backgroundImage:
          "linear-gradient(rgba(250,248,245,0.35), rgba(250,248,245,0.35)), url(/ui/load.jpg), linear-gradient(#faf8f5, #faf8f5)",
      }}
    >
      <svg
        viewBox="0 0 132 132"
        className="h-[8.25rem] w-[8.25rem] animate-spin"
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

      {/* key 로 단계마다 fadeIn 을 다시 재생시킵니다 (제자리에서 툭 바뀌면 어색). */}
      <p
        key={stageIndex}
        className="animate-fadeIn whitespace-pre-line text-lg leading-relaxed text-ink/90"
      >
        {OPENING_STAGES[stageIndex].message}
      </p>

      {/* 진행 점 — 지나온 단계는 채우고 현재 단계만 깜빡입니다. 10초쯤 머무는
          화면이라 "어디까지 왔는지" 가 보여야 멈춘 걸로 오해하지 않습니다. */}
      <div className="flex gap-2.5" aria-hidden>
        {OPENING_STAGES.map((_, i) => (
          <span
            key={i}
            className={[
              "h-1.5 w-1.5 rounded-full transition-colors duration-500",
              i < stageIndex ? "bg-ink/45" : i === stageIndex ? "animate-pulse bg-ink/45" : "bg-ink/15",
            ].join(" ")}
            style={i === stageIndex ? { animationDuration: "1.4s" } : undefined}
          />
        ))}
      </div>
    </div>
  );
}
