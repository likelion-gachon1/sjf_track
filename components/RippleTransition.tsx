"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RIPPLE_CONFIG } from "@/config/portal.config";
import {
  RippleContext,
  coveringRadius,
  motionAllowed,
  type RippleController,
  type RippleMode,
  type RippleOrigin,
} from "@/lib/useRipple";

// =============================================================================
// 선택 시 Ripple 전환
// -----------------------------------------------------------------------------
// 오버레이는 **PortalApp 레벨**에 마운트합니다. 04→05 전환은 ripple 이 화면을 덮은
// 상태에서 step 을 바꿔야 하는데, 오버레이가 선택 화면 안에 있으면 dispatch 되는
// 순간 화면과 함께 언마운트돼 덮개가 사라집니다.
//
// transform/opacity 만 애니메이션하므로 컴포지터에서 처리되고 레이아웃 리플로우가
// 없습니다. left/top/width/height 는 절대 애니메이션하지 마세요.
// =============================================================================

/** final 모드에서 05가 마운트된 뒤 ripple 을 걷어내는 시간 (step 전환과 같은 호흡). */
const FINAL_FADE_OUT_MS = RIPPLE_CONFIG.stepMs;

interface ActiveRipple {
  id: number;
  x: number;
  y: number;
  radius: number;
  mode: RippleMode;
  /** 다음 프레임에 true 로 바뀌며 트랜지션을 발생시킵니다. */
  expanded: boolean;
  /** final 모드에서 전환 완료 후 걷히는 중. */
  fading: boolean;
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

  const trigger = useCallback(
    (origin: RippleOrigin, mode: RippleMode, onCommit: () => void) => {
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
      setRipple({ id, x, y, radius, mode, expanded: false, fading: false });

      // 초기 스타일과 목표 스타일이 같은 프레임에 적용되면 트랜지션이 생략되므로
      // 한 프레임 건너뛴 뒤 확장 상태로 바꿉니다.
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = requestAnimationFrame(() => {
          rafRef.current = null;
          setRipple((prev) => (prev && prev.id === id ? { ...prev, expanded: true } : prev));
        });
      });

      const duration = mode === "final" ? RIPPLE_CONFIG.finalMs : RIPPLE_CONFIG.stepMs;

      const commitTimer = window.setTimeout(() => {
        onCommit();

        if (mode === "final") {
          // 다음 화면이 ripple 뒤에서 마운트된 다음 걷어냅니다.
          setRipple((prev) => (prev && prev.id === id ? { ...prev, fading: true } : prev));
          const clearTimer = window.setTimeout(() => {
            setRipple(null);
            busyRef.current = false;
            setIsTransitioning(false);
          }, FINAL_FADE_OUT_MS);
          timersRef.current.push(clearTimer);
        } else {
          // step 모드는 이미 opacity 0 이므로 바로 제거합니다.
          setRipple(null);
          busyRef.current = false;
          setIsTransitioning(false);
        }
      }, duration);

      timersRef.current.push(commitTimer);
    },
    []
  );

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
            opacity: ripple.mode === "step" ? (ripple.expanded ? 0 : 1) : ripple.fading ? 0 : 1,
            transition:
              ripple.mode === "step"
                ? `transform ${RIPPLE_CONFIG.stepMs}ms ease-out, opacity ${RIPPLE_CONFIG.stepMs}ms ease-out`
                : `transform ${RIPPLE_CONFIG.finalMs}ms ease-out, opacity ${FINAL_FADE_OUT_MS}ms ease-out`,
            willChange: "transform, opacity",
            pointerEvents: "none",
            zIndex: 50,
          }}
        />
      )}
    </RippleContext.Provider>
  );
}
