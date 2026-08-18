"use client";

import { useEffect } from "react";
import { debugMappingTable } from "@/config/portal.config";
import { PortalFlowProvider, usePortalFlow } from "@/lib/FlowContext";
import { PortalRuntimeProvider } from "@/lib/PortalRuntime";
import FadeStep from "./FadeStep";
import RippleProvider from "./RippleTransition";
import StepHandoff from "./StepHandoff";
import StepIntro from "./StepIntro";
import StepJourney from "./StepJourney";
import StepMirror from "./StepMirror";
import StepMoment from "./StepMoment";
import StepMood from "./StepMood";
import StepOpening from "./StepOpening";
import StepProduct from "./StepProduct";
import StepReveal from "./StepReveal";

function PortalScreens() {
  const { state } = usePortalFlow();

  return (
    // 05는 ripple 이 전환을 담당하므로 fadeIn 을 끕니다 (두 연출이 겹치지 않게).
    <FadeStep key={state.step} disabled={state.step === "opening"}>
      {state.step === "intro" && <StepIntro />}
      {state.step === "product" && <StepProduct />}
      {state.step === "journey" && <StepJourney />}
      {state.step === "mood" && <StepMood />}
      {state.step === "opening" && <StepOpening />}
      {state.step === "reveal" && <StepReveal />}
      {state.step === "experience" && <StepMirror />}
      {state.step === "moment" && <StepMoment />}
      {state.step === "handoff" && <StepHandoff />}
    </FadeStep>
  );
}

export default function PortalApp() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    // 회의용 확인 자료: 콘솔에서 console.table(window.__portalMappingTable())
    window.__portalMappingTable = debugMappingTable;
    return () => {
      delete window.__portalMappingTable;
    };
  }, []);

  return (
    <div id="portal-root">
      <PortalRuntimeProvider>
        <PortalFlowProvider>
          <RippleProvider>
            <PortalScreens />
          </RippleProvider>
        </PortalFlowProvider>
      </PortalRuntimeProvider>
    </div>
  );
}
