import type * as Ort from "onnxruntime-web/wasm";
import { clothingInput, clothingMetrics } from "./clothingDetection";

let ort: typeof Ort;
let session: Ort.InferenceSession | null = null;
type Input = { type: "init"; origin: string } | {
  type: "detect"; pixels: Uint8ClampedArray;
  region: { x: number; y: number; w: number; h: number };
  confidence: number;
};

self.onmessage = async ({ data }: MessageEvent<Input>) => {
  try {
    if (data.type === "init") {
      // 런타임의 import.meta를 Next 14의 asset minifier가 재해석하지 않도록 정적 파일로 로드.
      ort = await import(/* webpackIgnore: true */ `${data.origin}/onnx/ort.wasm.min.mjs`);
      ort.env.wasm.wasmPaths = `${data.origin}/onnx/`;
      ort.env.wasm.numThreads = 1;
      ort.env.wasm.proxy = false;
      session = await ort.InferenceSession.create(`${data.origin}/models/clothing/model.onnx`, {
        executionProviders: ["wasm"], graphOptimizationLevel: "all",
      });
      self.postMessage({ type: "ready" });
    } else {
      if (!session) throw new Error("Clothing model is not ready");
      const input = new ort.Tensor("float32", clothingInput(data.pixels), [1, 3, 512, 512]);
      let outputs: Ort.InferenceSession.ReturnType | undefined;
      try {
        outputs = await session.run({ pixel_values: input });
        const logits = outputs.logits;
        const metrics = clothingMetrics(logits.data as Float32Array, logits.dims, data.region, data.confidence);
        self.postMessage({ type: "result", metrics });
      } finally {
        input.dispose();
        if (outputs) Object.values(outputs).forEach((tensor) => tensor.dispose());
      }
    }
  } catch (error) {
    self.postMessage({ type: "error", message: String(error) });
  }
};
