"use client";

import { createContext, useContext, useMemo, useReducer } from "react";
import type {
  Answers,
  ColorwayKey,
  JourneyKey,
  MoodAnalysis,
  StepId,
  WorldId,
} from "@/lib/types";

interface FlowState {
  step: StepId;
  consent: boolean;
  /** 01 START 에서 발급. QR 링크(/m/{sessionId})와 이벤트 로그에 쓰입니다. */
  sessionId: string;
  productId: string | null;
  colorwayKey: ColorwayKey | null;
  answers: Answers;
  /** 05 OPENING 분석 결과 전문. `answers.mood` 는 여기서 키만 복사한 값입니다. */
  moodAnalysis: MoodAnalysis | null;
  /** 옷 감지 직후 캡처. 분석은 opening에서 실행하고 완료 즉시 비웁니다. */
  moodFrame: string | null;
  selectedWorldId: WorldId | null;
  capturedAt: number | null;
  /** 촬영 결과 JPEG dataURL (서버 업로드 없이 메모리에만 보관). */
  capturedImage: string | null;
  /** 사용자가 09 화면에서 최종 사진으로 확정했는지 여부. */
  photoConfirmed: boolean;
  uploadState: "idle" | "uploading" | "done" | "failed";
  uploadError: string | null;
  /** 백엔드 업로드 후 받은 공유 URL (QR 에 사용). 실패 시 null. */
  shareUrl: string | null;
  /** 세션 만료 시각(ISO). 08 화면의 QR 유효기간 안내에 씁니다. 실패 시 null. */
  expiresAt: string | null;
  /** 07 음소거 토글 상태. */
  bgmMuted: boolean;
}

const initialState: FlowState = {
  step: "intro",
  consent: false,
  sessionId: "",
  productId: null,
  colorwayKey: null,
  answers: { mood: null, journey: null },
  moodAnalysis: null,
  moodFrame: null,
  selectedWorldId: null,
  capturedAt: null,
  capturedImage: null,
  photoConfirmed: false,
  uploadState: "idle",
  uploadError: null,
  shareUrl: null,
  expiresAt: null,
  bgmMuted: false,
};

type FlowAction =
  | { type: "SET_CONSENT"; value: boolean }
  | { type: "START"; sessionId: string }
  | { type: "SELECT_PRODUCT"; productId: string; colorwayKey: ColorwayKey }
  | { type: "ANSWER_JOURNEY"; value: JourneyKey }
  | { type: "START_MOOD_ANALYSIS"; frame: string | null }
  | { type: "ANALYZE_MOOD"; result: MoodAnalysis; sessionId: string }
  | { type: "RESOLVE_WORLD"; worldId: WorldId }
  | { type: "ENTER_PORTAL" }
  | { type: "CAPTURE"; dataUrl: string }
  | { type: "RETAKE" }
  | { type: "CONFIRM_CAPTURE" }
  | { type: "UPLOAD_STARTED"; sessionId: string }
  | { type: "UPLOAD_SUCCEEDED"; sessionId: string; url: string; expiresAt: string }
  | { type: "UPLOAD_FAILED"; sessionId: string; message: string }
  | { type: "SHOW_QR" }
  | { type: "FINISH_WITHOUT_QR" }
  | { type: "TOGGLE_BGM_MUTE" }
  | { type: "CHANGE_WORLD"; worldId: WorldId }
  | { type: "RESET" };

// 화면 전환 책임은 리듀서가 갖습니다. 각 전환은 "예상한 step 에서만" 일어나므로
// (개발 모드 StrictMode 이중 dispatch, ripple 전환 중 중복 클릭 등으로) 같은 액션이
// 두 번 들어와도 step 이 건너뛰어지지 않습니다.
export function flowReducer(state: FlowState, action: FlowAction): FlowState {
  switch (action.type) {
    case "SET_CONSENT":
      return { ...state, consent: action.value };

    case "START":
      if (state.step !== "intro" || !state.consent) return state;
      return { ...state, step: "product", sessionId: action.sessionId };

    case "SELECT_PRODUCT":
      if (state.step !== "product") return state;
      return {
        ...state,
        productId: action.productId,
        colorwayKey: action.colorwayKey,
        step: "journey",
      };

    case "ANSWER_JOURNEY":
      // 선택과 동시에 다음 단계(04 무드 분석)로 이동합니다.
      if (state.step !== "journey") return state;
      return {
        ...state,
        answers: { ...state.answers, journey: action.value },
        step: "mood",
      };

    case "START_MOOD_ANALYSIS":
      if (state.step !== "mood") return state;
      return { ...state, moodFrame: action.frame, moodAnalysis: null, step: "opening" };

    case "ANALYZE_MOOD":
      if (state.step !== "opening" || state.sessionId !== action.sessionId || state.moodAnalysis) return state;
      return {
        ...state,
        answers: { ...state.answers, mood: action.result.mood },
        moodAnalysis: action.result,
        moodFrame: null,
      };

    case "RESOLVE_WORLD":
      // 05 프리로드가 끝나면 dispatch 됩니다.
      if (state.step !== "opening" || !state.moodAnalysis) return state;
      return { ...state, selectedWorldId: action.worldId, step: "reveal" };

    case "ENTER_PORTAL":
      if (state.step !== "reveal") return state;
      return { ...state, step: "experience" };

    case "CAPTURE": {
      if (state.step !== "experience" || !state.selectedWorldId) return state;
      return {
        ...state,
        capturedAt: Date.now(),
        capturedImage: action.dataUrl,
        photoConfirmed: false,
        uploadState: "idle",
        uploadError: null,
        shareUrl: null,
        expiresAt: null,
        step: "moment",
      };
    }

    case "RETAKE":
      if (state.step !== "moment" || state.photoConfirmed) return state;
      return {
        ...state,
        step: "experience",
        capturedAt: null,
        capturedImage: null,
        uploadState: "idle",
        uploadError: null,
      };

    case "CONFIRM_CAPTURE":
      if (state.step !== "moment" || !state.capturedImage || state.photoConfirmed) return state;
      return { ...state, photoConfirmed: true };

    case "UPLOAD_STARTED":
      if (state.sessionId !== action.sessionId || !state.photoConfirmed) return state;
      return { ...state, uploadState: "uploading", uploadError: null };

    case "UPLOAD_SUCCEEDED":
      if (state.sessionId !== action.sessionId || !state.photoConfirmed) return state;
      return {
        ...state,
        uploadState: "done",
        uploadError: null,
        shareUrl: action.url,
        expiresAt: action.expiresAt,
      };

    case "UPLOAD_FAILED":
      if (state.sessionId !== action.sessionId || !state.photoConfirmed) return state;
      // 같은 세션의 중복 요청이 뒤늦게 실패해도 이미 확보한 유효 URL을 덮지 않습니다.
      if (state.uploadState === "done" && state.shareUrl) return state;
      return { ...state, uploadState: "failed", uploadError: action.message };

    case "SHOW_QR":
      // 09 사진 확인 → 08 QR
      if (state.step !== "moment" || state.uploadState !== "done" || !state.shareUrl) return state;
      return { ...state, step: "handoff" };

    case "FINISH_WITHOUT_QR":
      if (state.step !== "moment" || state.uploadState !== "failed") return state;
      return { ...state, step: "handoff" };

    case "TOGGLE_BGM_MUTE":
      return { ...state, bgmMuted: !state.bgmMuted };

    case "CHANGE_WORLD":
      // 미러 화면의 "다른 세계도 보기" 안건이 확정되면 되살립니다. 현재 사용처 없음.
      return { ...state, selectedWorldId: action.worldId };

    case "RESET":
      return initialState;

    default:
      return state;
  }
}

interface FlowContextValue {
  state: FlowState;
  dispatch: React.Dispatch<FlowAction>;
}

const FlowContext = createContext<FlowContextValue | null>(null);

export function PortalFlowProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(flowReducer, initialState);
  const value = useMemo(() => ({ state, dispatch }), [state]);
  return <FlowContext.Provider value={value}>{children}</FlowContext.Provider>;
}

export function usePortalFlow() {
  const ctx = useContext(FlowContext);
  if (!ctx) {
    throw new Error("usePortalFlow must be used within a PortalFlowProvider");
  }
  return ctx;
}

/**
 * 세션 ID 발급. randomUUID 는 secure context 전용이라 http 부스 PC 용 폴백을 둡니다.
 *
 * ⚠️ 리듀서가 아니라 START 클릭 핸들러에서 호출하세요 (리듀서를 순수하게 유지).
 * ⚠️ 백엔드가 UUID 로 검증하므로 폴백도 **반드시 UUID 형식**이어야 합니다 — 형식이
 *    다르면 업로드가 400 으로 조용히 실패합니다.
 */
export function createSessionId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return createUuidV4();
}

/** RFC 4122 v4 UUID 직접 조립. getRandomValues 는 http 에서도 쓸 수 있어 우선 사용합니다. */
function createUuidV4(): string {
  const bytes = new Uint8Array(16);
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i += 1) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }

  // v4 규격: 7번째 바이트 상위 4비트 = 0100, 9번째 바이트 상위 2비트 = 10
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20),
  ].join("-");
}
