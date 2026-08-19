"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RIPPLE_CONFIG } from "@/config/portal.config";
import {
  RippleContext,
  coveringRadius,
  motionAllowed,
  type RippleController,
  type RippleOrigin,
} from "@/lib/useRipple";

// =============================================================================
// 선택 시 Ripple 전환 — 02→03, 03→04 에서만 씁니다.
// -----------------------------------------------------------------------------
// 클릭 지점에서 원이 퍼지며 사라지고, 애니메이션이 끝나는 시점에 onCommit 을
// 실행해 다음 화면으로 넘깁니다.
//
// transform/opacity 만 애니메이션하므로 컴포지터에서 처리되고 레이아웃 리플로우가
// 없습니다. left/top/width/height 는 절대 애니메이션하지 마세요.
// =============================================================================

interface ActiveRipple {
  id: number;
  x: number;
  y: number;
  radius: number;
  /** 다음 프레임에 true 로 바뀌며 트랜지션을 발생시킵니다. */
  expanded: boolean;
}

export default function RippleProvider({ children }: { children: React.ReactNode }) {
  const [ripple, setRipple] = useState<ActiveRipple | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // 상태 업데이트는 비동기라 중복 클릭을 막기엔 늦습니다 — 동기 가드를 따로 둡니다.
  const busyRef = useRef(false);
  const idRef = useRef(0);
  const timersRef = useRef<number[]>([]);
  const rafRef = useRef<number | null>(null);

  const clearScheduled = useCallback(() => {
    timersRef.current.forEach((id) => window.clearTimeout(id));
    timersRef.current = [];
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  useEffect(() => clearScheduled, [clearScheduled]);

  const trigger = useCallback((origin: RippleOrigin, onCommit: () => void) => {
    if (busyRef.current) return;

    // 연출을 재생하지 않는 설정에서는 생략하고 즉시 전환합니다.
    if (!motionAllowed()) {
      onCommit();
      return;
    }

    busyRef.current = true;
    setIsTransitioning(true);

    const id = ++idRef.current;
    const x = origin.clientX;
    const y = origin.clientY;
    const radius = coveringRadius(x, y, window.innerWidth, window.innerHeight);
    setRipple({ id, x, y, radius, expanded: false });

    // 초기 스타일과 목표 스타일이 같은 프레임에 적용되면 트랜지션이 생략되므로
    // 한 프레임 건너뛴 뒤 확장 상태로 바꿉니다.
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        setRipple((prev) => (prev && prev.id === id ? { ...prev, expanded: true } : prev));
      });
    });

    const commitTimer = window.setTimeout(() => {
      onCommit();
      // 확장이 끝나면 이미 opacity 0 이므로 바로 제거합니다.
      setRipple(null);
      busyRef.current = false;
      setIsTransitioning(false);
    }, RIPPLE_CONFIG.stepMs);

    timersRef.current.push(commitTimer);
  }, []);

  const controller = useMemo<RippleController>(
    () => ({ trigger, isTransitioning }),
    [trigger, isTransitioning]
  );

  return (
    <RippleContext.Provider value={controller}>
      {children}
      {ripple && (
        <div
          aria-hidden
          style={{
            position: "fixed",
            left: ripple.x,
            top: ripple.y,
            width: ripple.radius * 2,
            height: ripple.radius * 2,
            borderRadius: "9999px",
            background: RIPPLE_CONFIG.color,
            transform: `translate(-50%, -50%) scale(${ripple.expanded ? 1 : 0})`,
            opacity: ripple.expanded ? 0 : 1,
            transition: `transform ${RIPPLE_CONFIG.stepMs}ms ease-out, opacity ${RIPPLE_CONFIG.stepMs}ms ease-out`,
            willChange: "transform, opacity",
            pointerEvents: "none",
            zIndex: 50,
          }}
        />
      )}
    </RippleContext.Provider>
  );
}
