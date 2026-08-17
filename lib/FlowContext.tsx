"use client";

import { createContext, useContext, useMemo, useReducer } from "react";
import type {
  Answers,
  ColorwayKey,
  JourneyKey,
  MoodKey,
  SavedMoment,
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
  selectedWorldId: WorldId | null;
  capturedAt: number | null;
  /** 촬영 결과 JPEG dataURL (서버 업로드 없이 메모리에만 보관). */
  capturedImage: string | null;
  /** 백엔드 업로드 후 받은 공유 URL (QR 에 사용). 실패 시 null. */
  shareUrl: string | null;
  /** 07 음소거 토글 상태. */
  bgmMuted: boolean;
  productInterestSaved: boolean;
  savedMoments: SavedMoment[];
}

const initialState: FlowState = {
  step: "intro",
  consent: false,
  sessionId: "",
  productId: null,
  colorwayKey: null,
  answers: { mood: null, journey: null },
  selectedWorldId: null,
  capturedAt: null,
  capturedImage: null,
  shareUrl: null,
  bgmMuted: false,
  productInterestSaved: false,
  savedMoments: [],
};

type FlowAction =
  | { type: "SET_CONSENT"; value: boolean }
  | { type: "START"; sessionId: string }
  | { type: "SELECT_PRODUCT"; productId: string; colorwayKey: ColorwayKey }
  | { type: "ANSWER_MOOD"; value: MoodKey }
  | { type: "ANSWER_JOURNEY"; value: JourneyKey }
  | { type: "RESOLVE_WORLD"; worldId: WorldId }
  | { type: "ENTER_PORTAL" }
  | { type: "CAPTURE"; dataUrl: string }
  | { type: "SHOW_QR" }
  | { type: "SHOW_SHOP" }
  | { type: "TOGGLE_BGM_MUTE" }
  | { type: "CHANGE_WORLD"; worldId: WorldId }
  | { type: "SAVE_PRODUCT_INTEREST" }
  | { type: "SET_SHARE_URL"; url: string }
  | { type: "RESET" };

// 화면 전환 책임은 리듀서가 갖습니다. 각 전환은 "예상한 step 에서만" 일어나므로
// (개발 모드 StrictMode 이중 dispatch, ripple 전환 중 중복 클릭 등으로) 같은 액션이
// 두 번 들어와도 step 이 건너뛰어지지 않습니다.
function flowReducer(state: FlowState, action: FlowAction): FlowState {
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
        step: "mood",
      };

    case "ANSWER_MOOD":
      if (state.step !== "mood") return state;
      return {
        ...state,
        answers: { ...state.answers, mood: action.value },
        step: "journey",
      };

    case "ANSWER_JOURNEY":
      // 수정안: 선택과 동시에 다음 단계(05 프리로드)로 이동합니다.
      if (state.step !== "journey") return state;
      return {
        ...state,
        answers: { ...state.answers, journey: action.value },
        step: "opening",
      };

    case "RESOLVE_WORLD":
      // 05 프리로드가 끝나면 dispatch 됩니다.
      if (state.step !== "opening") return state;
      return { ...state, selectedWorldId: action.worldId, step: "reveal" };

    case "ENTER_PORTAL":
      if (state.step !== "reveal") return state;
      return { ...state, step: "experience" };

    case "CAPTURE": {
      if (state.step !== "experience" || !state.selectedWorldId) return state;
      const capturedAt = Date.now();
      const moment: SavedMoment = {
        id: `${capturedAt}-${Math.random().toString(36).slice(2, 8)}`,
        worldId: state.selectedWorldId,
        savedAt: capturedAt,
        productInterest: state.productInterestSaved,
        imageDataUrl: action.dataUrl,
      };
      return {
        ...state,
        capturedAt,
        capturedImage: action.dataUrl,
        savedMoments: [...state.savedMoments, moment],
        step: "moment",
      };
    }

    case "SHOW_QR":
      // 09 사진 확인 → 08 QR
      if (state.step !== "moment") return state;
      return { ...state, step: "handoff" };

    case "SHOW_SHOP":
      // 08 QR → TODAY'S MCM / SAVED ITEMS
      if (state.step !== "handoff") return state;
      return { ...state, step: "shop" };

    case "TOGGLE_BGM_MUTE":
      return { ...state, bgmMuted: !state.bgmMuted };

    case "CHANGE_WORLD":
      // 미러 화면의 "다른 세계도 보기" 안건이 확정되면 되살립니다. 현재 사용처 없음.
      return { ...state, selectedWorldId: action.worldId };

    case "SAVE_PRODUCT_INTEREST":
      return { ...state, productInterestSaved: true };

    case "SET_SHARE_URL":
      return { ...state, shareUrl: action.url };

    case "RESET":
      // 갤러리(savedMoments)는 부스 운영 중 계속 쌓이도록 유지하고,
      // 개인 답변/동의/선택 World만 다음 고객을 위해 초기화합니다.
      return {
        ...initialState,
        savedMoments: state.savedMoments,
      };

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
 * 세션 ID 발급. crypto.randomUUID 는 secure context(https/localhost) 전용이라
 * 부스 PC가 http 로 접속하는 경우를 위해 폴백을 둡니다.
 * ⚠️ 리듀서가 아니라 START 클릭 핸들러에서 호출하세요 (리듀서를 순수하게 유지).
 * ⚠️ 백엔드가 sessionId 를 UUID 로 검증하므로 폴백도 반드시 UUID 형식이어야 합니다
 *    (형식이 다르면 업로드가 400 으로 조용히 실패합니다).
 */
export function createSessionId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return createUuidV4();
}

/**
 * RFC 4122 v4 UUID 를 직접 조립합니다.
 * `crypto.getRandomValues` 는 randomUUID 와 달리 http 에서도 쓸 수 있어 우선 사용하고,
 * 그마저 없으면 Math.random 으로 내려갑니다(형식은 동일하게 유지).
 */
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
