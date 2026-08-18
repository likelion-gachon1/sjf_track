"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { RIPPLE_CONFIG } from "@/config/portal.config";

/**
 * "step"  — 02→03, 03→04. 퍼지면서 사라지고, 애니메이션이 끝나면 전환합니다.
 * "final" — 04→05. 화면을 완전히 덮은 상태를 유지한 채 전환한 뒤 걷힙니다
 *           (ripple 색이 05 배경과 같아 이음매 없이 이어집니다).
 */
export type RippleMode = "step" | "final";

/** trigger 에 필요한 최소 정보 — React.MouseEvent 를 그대로 넘길 수 있습니다. */
export interface RippleOrigin {
  clientX: number;
  clientY: number;
}

export interface RippleController {
  /** 클릭 지점에서 원을 퍼뜨리고, 규정된 타이밍에 onCommit 을 실행합니다. */
  trigger: (origin: RippleOrigin, mode: RippleMode, onCommit: () => void) => void;
  /** 전환 진행 중 — 선택지 버튼을 비활성화해 중복 클릭을 막으세요. */
  isTransitioning: boolean;
}

export const RippleContext = createContext<RippleController | null>(null);

export function useRipple(): RippleController {
  const ctx = useContext(RippleContext);
  if (!ctx) {
    throw new Error("useRipple must be used within a RippleProvider");
  }
  return ctx;
}

/** 클릭점에서 뷰포트 네 모서리까지 거리의 최댓값 = 화면을 덮는 최소 반지름. */
export function coveringRadius(x: number, y: number, width: number, height: number): number {
  return Math.max(
    Math.hypot(x, y),
    Math.hypot(width - x, y),
    Math.hypot(x, height - y),
    Math.hypot(width - x, height - y)
  );
}

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * 연출(리플·물결·궤도 회전)을 재생해도 되는지.
 * 부스 PC 의 OS 설정 하나로 연출이 통째로 사라지지 않도록
 * `RIPPLE_CONFIG.respectReducedMotion` 으로 덮어쓸 수 있습니다.
 */
export function motionAllowed(): boolean {
  if (!RIPPLE_CONFIG.respectReducedMotion) return true;
  return !prefersReducedMotion();
}

/**
 * 렌더 중에 matchMedia 를 읽으면 서버/클라이언트 결과가 달라 하이드레이션 경고가
 * 납니다. 마운트 이후에 판정해 CSS 클래스 분기에 쓰세요.
 */
export function useMotionAllowed(): boolean {
  const [allowed, setAllowed] = useState(false);
  useEffect(() => setAllowed(motionAllowed()), []);
  return allowed;
}
