"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { RIPPLE_CONFIG } from "@/config/portal.config";
import { coveringRadius, motionAllowed } from "@/lib/useRipple";

// =============================================================================
// 선택지 호버 물결
// -----------------------------------------------------------------------------
// 화면 전환용 ripple(RippleTransition.tsx)과는 별개입니다. 이쪽은
//   - 버튼 **안에서만**, **정중앙에서** 퍼지고 (부모에 relative + overflow-hidden 필요)
//   - 클릭을 가로채지 않으며 (pointer-events: none)
//   - 마우스를 올려둔 동안 hoverRepeatMs 간격으로 반복돼 물결처럼 보입니다.
// transform/opacity 만 애니메이션하므로 레이아웃 리플로우가 없습니다.
// =============================================================================

interface HoverRipple {
  id: number;
  /** 버튼 전체를 덮는 지름 (px). 중앙에서 퍼지므로 대각선 길이입니다. */
  size: number;
}

export interface HoverRippleBinding {
  /** 선택지 버튼에 그대로 펼쳐 넣으세요. */
  handlers: {
    onMouseEnter: (e: React.MouseEvent<HTMLElement>) => void;
    onMouseMove: (e: React.MouseEvent<HTMLElement>) => void;
    onMouseLeave: () => void;
  };
  /** 버튼의 마지막 자식으로 넣으세요 (다른 내용 위에 깔립니다). */
  layer: React.ReactNode;
}

export function useHoverRipple(disabled = false): HoverRippleBinding {
  const [ripples, setRipples] = useState<HoverRipple[]>([]);

  const idRef = useRef(0);
  // 물결은 항상 버튼 중앙에서 퍼지므로 커서 좌표는 쓰지 않고 크기만 재둡니다.
  const sizeRef = useRef({ w: 0, h: 0 });
  const timersRef = useRef<number[]>([]);
  const repeatRef = useRef<number | null>(null);
  /** 호버 세션이 진행 중인지 (hoverRepeatMs 가 0 이어도 중복 시작을 막습니다). */
  const activeRef = useRef(false);

  const clearAll = useCallback(() => {
    timersRef.current.forEach((id) => window.clearTimeout(id));
    timersRef.current = [];
    if (repeatRef.current !== null) {
      window.clearInterval(repeatRef.current);
      repeatRef.current = null;
    }
    activeRef.current = false;
  }, []);

  // 언마운트 시 타이머를 정리하지 않으면 사라진 컴포넌트에 setState 가 걸립니다.
  useEffect(() => clearAll, [clearAll]);

  const spawn = useCallback(() => {
    const { w, h } = sizeRef.current;
    if (w === 0 || h === 0) return;

    const id = ++idRef.current;
    // 중앙에서 네 모서리까지 거리 × 2 = 대각선. 버튼을 빈틈없이 덮습니다.
    const size = coveringRadius(w / 2, h / 2, w, h) * 2;
    setRipples((prev) => [...prev, { id, size }]);

    const timer = window.setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== id));
    }, RIPPLE_CONFIG.hoverMs);
    timersRef.current.push(timer);
  }, []);

  const track = useCallback((e: React.MouseEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    sizeRef.current = { w: rect.width, h: rect.height };
  }, []);

  /** 호버 세션 시작 — 이미 진행 중이면 아무것도 하지 않습니다. */
  const start = useCallback(() => {
    if (activeRef.current) return;
    activeRef.current = true;
    spawn();

    if (RIPPLE_CONFIG.hoverRepeatMs > 0) {
      repeatRef.current = window.setInterval(spawn, RIPPLE_CONFIG.hoverRepeatMs);
    }
  }, [spawn]);

  const onMouseEnter = useCallback(
    (e: React.MouseEvent<HTMLElement>) => {
      if (disabled || !motionAllowed()) return;
      track(e);
      start();
    },
    [disabled, start, track]
  );

  // ⚠️ mousemove 에서도 시작합니다. 화면이 바뀔 때 커서가 이미 버튼 위에 있으면
  //    mouseenter 가 오지 않아(부스에서 같은 자리를 연달아 누르면 흔합니다)
  //    움직이기 전까지 물결이 뜨지 않기 때문입니다.
  const onMouseMove = useCallback(
    (e: React.MouseEvent<HTMLElement>) => {
      // 이미 물결이 돌고 있으면 할 일이 없습니다. 매 프레임 getBoundingClientRect 를
      // 호출하지 않도록 여기서 바로 빠져나갑니다.
      if (activeRef.current || disabled || !motionAllowed()) return;
      track(e);
      start();
    },
    [disabled, start, track]
  );

  const onMouseLeave = useCallback(() => {
    activeRef.current = false;
    if (repeatRef.current !== null) {
      window.clearInterval(repeatRef.current);
      repeatRef.current = null;
    }
    // 이미 퍼지는 중인 물결은 자기 수명대로 끝나게 둡니다(뚝 끊기면 어색합니다).
  }, []);

  const layer = (
    <span
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]"
    >
      {ripples.map((r) => (
        <span
          key={r.id}
          className="hover-ripple absolute rounded-full"
          style={{
            // 중앙 고정 — 키프레임의 translate(-50%, -50%) 가 정확히 가운데로 맞춥니다.
            left: "50%",
            top: "50%",
            width: r.size,
            height: r.size,
            background: RIPPLE_CONFIG.hoverColor,
            animation: `hover-ripple ${RIPPLE_CONFIG.hoverMs}ms ease-out forwards`,
            ["--hover-ripple-opacity" as string]: String(RIPPLE_CONFIG.hoverOpacity),
            willChange: "transform, opacity",
          }}
        />
      ))}
    </span>
  );

  return { handlers: { onMouseEnter, onMouseMove, onMouseLeave }, layer };
}
