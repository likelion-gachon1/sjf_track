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
 */
export function createSessionId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
