"use client";

import { createContext, useContext, useMemo, useReducer } from "react";
import type { Answers, ColorKey, MoodKey, SavedMoment, StepId, WorldId } from "@/lib/types";

interface FlowState {
  step: StepId;
  consent: boolean;
  answers: Answers;
  selectedWorldId: WorldId | null;
  capturedAt: number | null;
  productInterestSaved: boolean;
  savedMoments: SavedMoment[];
}

const initialState: FlowState = {
  step: "intro",
  consent: false,
  answers: { mood: null, color: null },
  selectedWorldId: null,
  capturedAt: null,
  productInterestSaved: false,
  savedMoments: [],
};

type FlowAction =
  | { type: "SET_CONSENT"; value: boolean }
  | { type: "START" }
  | { type: "ANSWER_MOOD"; value: MoodKey }
  | { type: "ANSWER_COLOR"; value: ColorKey }
  | { type: "SELECT_WORLD"; worldId: WorldId }
  | { type: "CHANGE_WORLD"; worldId: WorldId }
  | { type: "CAPTURE" }
  | { type: "SAVE_MOMENT" }
  | { type: "SAVE_PRODUCT_INTEREST" }
  | { type: "RESET" };

function flowReducer(state: FlowState, action: FlowAction): FlowState {
  switch (action.type) {
    case "SET_CONSENT":
      return { ...state, consent: action.value };
    case "START":
      if (!state.consent) return state;
      return { ...state, step: "guided" };
    case "ANSWER_MOOD":
      return { ...state, answers: { ...state.answers, mood: action.value } };
    case "ANSWER_COLOR":
      return {
        ...state,
        answers: { ...state.answers, color: action.value },
        step: "worldResult",
      };
    case "SELECT_WORLD":
      return { ...state, selectedWorldId: action.worldId, step: "mirror" };
    case "CHANGE_WORLD":
      return { ...state, selectedWorldId: action.worldId };
    case "CAPTURE":
      return { ...state, capturedAt: Date.now(), step: "result" };
    case "SAVE_MOMENT": {
      if (!state.selectedWorldId) return state;
      const moment: SavedMoment = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        worldId: state.selectedWorldId,
        savedAt: state.capturedAt ?? Date.now(),
        productInterest: state.productInterestSaved,
      };
      return { ...state, savedMoments: [...state.savedMoments, moment] };
    }
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
