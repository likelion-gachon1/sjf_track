"use client";

import { createContext, useContext } from "react";
import { RIPPLE_CONFIG } from "@/config/portal.config";

/** trigger 에 필요한 최소 정보 — React.MouseEvent 를 그대로 넘길 수 있습니다. */
export interface RippleOrigin {
  clientX: number;
  clientY: number;
}

export interface RippleController {
  /**
   * 클릭 지점에서 원을 퍼뜨리며 사라지고, 애니메이션이 끝나면 onCommit 을 실행합니다.
   * 02→03, 03→04 전환에 씁니다.
   */
  trigger: (origin: RippleOrigin, onCommit: () => void) => void;
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

function prefersReducedMotion(): boolean {
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
