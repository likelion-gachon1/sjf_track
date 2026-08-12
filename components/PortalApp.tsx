"use client";

import { PortalFlowProvider, usePortalFlow } from "@/lib/FlowContext";
import FadeStep from "./FadeStep";
import StepGuided from "./StepGuided";
import StepIntro from "./StepIntro";
import StepMirror from "./StepMirror";
import StepResult from "./StepResult";
import StepWorldResult from "./StepWorldResult";

function PortalScreens() {
  const { state } = usePortalFlow();

  return (
    <FadeStep key={state.step}>
      {state.step === "intro" && <StepIntro />}
      {state.step === "guided" && <StepGuided />}
      {state.step === "worldResult" && <StepWorldResult />}
      {state.step === "mirror" && <StepMirror />}
      {state.step === "result" && <StepResult />}
    </FadeStep>
  );
}

export default function PortalApp() {
  return (
    <div id="portal-root">
      <PortalFlowProvider>
        <PortalScreens />
      </PortalFlowProvider>
    </div>
  );
}
