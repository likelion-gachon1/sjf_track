// 인물 분리 방식 결정 + 크로마키 보정값 보관.
// 1) 모드 결정(config → ?matting= → 세션 토글)  2) 보정 패널 표시  3) 임시 값(localStorage)
// ⚠️ localStorage 값은 보정 모드(/calibrate, ?tune=1)에서만 읽습니다.
//    평상시 부스 실행은 config 상수만 씁니다.

import { useSyncExternalStore } from "react";
import { MATTING_CONFIG } from "@/config/portal.config";
import type { ChromaKeyParams } from "@/lib/chromaKey";
import { hexToRgb } from "@/lib/chromaKey";
import type { MattingMode } from "@/lib/types";

const STORAGE_KEY = "portal.chromaKey.tuning";

/** config 에 박혀 있는 값 (부스 실행의 유일한 기준). */
export function defaultChromaKey(): ChromaKeyParams {
  return { ...MATTING_CONFIG.chromaKey };
}

function readQuery(name: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return new URLSearchParams(window.location.search).get(name);
  } catch {
    return null;
  }
}

// -----------------------------------------------------------------------------
// 세션 한정 모드 전환
// -----------------------------------------------------------------------------
// 그린 스크린을 세운 날과 아닌 날을 오가려고, 07 화면에서 즉시 뒤집을 수 있는
// 스위치를 둡니다. **메모리에만 둡니다 — 새로고침하면 사라집니다.**
// localStorage 를 쓰지 않는 이유는 이 파일 맨 위 주석과 같습니다: 어제 누른 토글이
// 오늘 조용히 살아나 "왜 오늘만 다르지"가 되는 실패 모드를 만들지 않기 위함입니다.
// 부스 상시 운영값은 언제나 config/portal.config.ts 의 MATTING_CONFIG.mode 입니다.

let sessionMode: MattingMode | null = null;
const modeListeners = new Set<() => void>();

/** 세션 토글. `null` 을 넣으면 config/URL 기준으로 되돌아갑니다. */
export function setSessionMattingMode(mode: MattingMode | null): void {
  if (sessionMode === mode) return;
  sessionMode = mode;
  modeListeners.forEach((listener) => listener());
}

function subscribeMattingMode(listener: () => void): () => void {
  modeListeners.add(listener);
  return () => {
    modeListeners.delete(listener);
  };
}

/**
 * 이번 실행에서 쓸 분리 방식. 우선순위는 **세션 토글 > URL > config** 입니다.
 * (토글이 URL 을 이겨야 `?matting=segmentation` 으로 들어온 뒤에도 되돌릴 수 있습니다)
 *
 * `?matting=segmentation` — 그린 스크린이 없는 개발 PC 에서 예전 방식으로 보기
 * `?matting=chromakey`    — config 가 segmentation 인 상태에서 크로마키만 시연하기
 *
 * ⚠️ SSR 에서는 window 가 없어 config 값이 나옵니다. 호출자는 이 값을 렌더 결과에
 *    바로 반영하지 말고 mount 이후(useEffect 또는 useMattingMode)에 적용해
 *    하이드레이션을 맞추세요.
 */
export function resolveMattingMode(): MattingMode {
  if (sessionMode) return sessionMode;
  const q = readQuery("matting");
  if (q === "segmentation" || q === "chromakey") return q;
  return MATTING_CONFIG.mode;
}

/**
 * 현재 모드를 구독합니다. 하이드레이션 시점에는 config 값을 쓰고(서버와 동일),
 * mount 이후 URL·세션 토글이 반영됩니다.
 */
export function useMattingMode(): MattingMode {
  return useSyncExternalStore(
    subscribeMattingMode,
    resolveMattingMode,
    () => MATTING_CONFIG.mode
  );
}

/** 보정 패널(07 화면 오버레이)을 띄울지. `/calibrate` 는 이것과 무관하게 항상 띄웁니다. */
export function isTuningEnabled(): boolean {
  const q = readQuery("tune");
  return q === "1" || q === "true";
}

function clamp(v: unknown, min: number, max: number, fallback: number): number {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

/** 알 수 없는 값이 섞여 들어와도 렌더러가 죽지 않도록 전 필드를 검사합니다. */
export function sanitizeChromaKey(raw: unknown): ChromaKeyParams {
  const base = defaultChromaKey();
  if (!raw || typeof raw !== "object") return base;
  const o = raw as Partial<Record<keyof ChromaKeyParams, unknown>>;
  const keyColor = typeof o.keyColor === "string" && hexToRgb(o.keyColor) ? o.keyColor : base.keyColor;
  return {
    keyColor,
    similarity: clamp(o.similarity, 0, 1, base.similarity),
    smoothness: clamp(o.smoothness, 0, 1, base.smoothness),
    edgeShrink: clamp(o.edgeShrink, 0, 1, base.edgeShrink),
    spill: clamp(o.spill, 0, 1, base.spill),
  };
}

/** 보정 중인 값. **보정 모드가 아니면 무조건 config 값**을 돌려줍니다. */
export function readTunedChromaKey(): ChromaKeyParams {
  if (typeof window === "undefined") return defaultChromaKey();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultChromaKey();
    return sanitizeChromaKey(JSON.parse(raw));
  } catch {
    return defaultChromaKey();
  }
}

export function writeTunedChromaKey(params: ChromaKeyParams): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(params));
  } catch {
    // 시크릿 모드 등에서 실패해도 화면 조정 자체는 계속 됩니다.
  }
}

export function clearTunedChromaKey(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // 무시 — 다음 새로고침에 config 값으로 돌아갑니다.
  }
}

const round3 = (n: number) => Math.round(n * 1000) / 1000;

/** config/portal.config.ts 의 MATTING_CONFIG 안에 그대로 붙여넣을 코드 조각. */
export function formatChromaKeySnippet(params: ChromaKeyParams): string {
  return [
    "  chromaKey: {",
    `    keyColor: "${params.keyColor}",`,
    `    similarity: ${round3(params.similarity)},`,
    `    smoothness: ${round3(params.smoothness)},`,
    `    edgeShrink: ${round3(params.edgeShrink)},`,
    `    spill: ${round3(params.spill)},`,
    "  },",
  ].join("\n");
}
