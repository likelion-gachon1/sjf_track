const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const test = require("node:test");
const ts = require("typescript");

function load(file) {
  const { outputText } = ts.transpileModule(fs.readFileSync(path.join(__dirname, "..", file), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX },
  });
  const exports = {};
  vm.runInNewContext(outputText, { exports, require: () => ({ createContext: () => ({}) }) });
  return exports;
}
const {
  clothingCoverage, clothingInput, clothingMetrics,
  createClothingGate, evaluateClothingFraming,
} = load("lib/clothingDetection.ts");
const dims = [1, 18, 10, 10];
const whole = { x: 0, y: 0, w: 1, h: 1 };
function logits(label, score = 10) {
  const values = new Float32Array(1800);
  values.fill(score, label * 100, (label + 1) * 100);
  return values;
}

test("face, hair, bare skin, background and accessories never count as clothing", () => {
  for (const label of [0, 1, 2, 3, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17]) {
    assert.equal(clothingCoverage(logits(label), dims, whole), 0);
  }
});
test("actual garment classes qualify, uncertain predictions do not", () => {
  for (const label of [4, 5, 6, 7]) assert.equal(clothingCoverage(logits(label), dims, whole), 1);
  assert.equal(clothingCoverage(logits(4, 0.1), dims, whole), 0);
  assert.throws(() => clothingCoverage(new Float32Array(2), dims, whole));
});
test("clothing outside guide cannot start analysis", () => {
  const values = logits(11);
  for (let i = 0; i < 50; i++) { values[11 * 100 + i] = 0; values[4 * 100 + i] = 10; }
  assert.equal(clothingCoverage(values, dims, { x: 0, y: 0.5, w: 1, h: 0.5 }), 0);
});
test("three consecutive clothing frames are required, loss resets immediately", () => {
  const gate = createClothingGate();
  assert.ok(gate(0.7) < 1);
  assert.ok(gate(0.7) < 1);
  assert.equal(gate(0), 0);
  assert.ok(gate(0.7) < 1);
  assert.ok(gate(0.7) < 1);
  assert.equal(gate(0.7), 1);
});
test("input follows model RGB/CHW normalization", () => {
  const output = clothingInput(new Uint8ClampedArray([255, 0, 128, 255]));
  for (const [i, expected] of [(1 - 0.485) / 0.229, -0.456 / 0.224, (128 / 255 - 0.406) / 0.225].entries()) {
    assert.ok(Math.abs(output[i] - expected) < 1e-6);
  }
});

test("framing distinguishes absent, distance, alignment and ready states", () => {
  const cfg = {
    minGuideCoverage: 0.4, minAreaRatio: 0.08, maxAreaRatio: 0.5,
    centerToleranceX: 0.12, centerToleranceY: 0.16,
  };
  const region = { x: 0.3, y: 0.3, w: 0.4, h: 0.5 };
  const metric = (bounds, coverage = 0.5) => ({
    coverage, bounds,
    center: bounds ? { x: bounds.x + bounds.w / 2, y: bounds.y + bounds.h / 2 } : null,
    confidenceQualifiedPixels: bounds ? 10 : 0,
  });
  assert.equal(evaluateClothingFraming(metric(null, 0), region, cfg), "no-garment");
  assert.equal(evaluateClothingFraming(metric({ x: 0.45, y: 0.45, w: 0.1, h: 0.2 }), region, cfg), "too-small");
  assert.equal(evaluateClothingFraming(metric({ x: 0.1, y: 0.1, w: 0.8, h: 0.8 }), region, cfg), "too-large");
  assert.equal(evaluateClothingFraming(metric({ x: 0.05, y: 0.35, w: 0.3, h: 0.4 }), region, cfg), "off-center");
  assert.equal(evaluateClothingFraming(metric({ x: 0.35, y: 0.35, w: 0.3, h: 0.4 }), region, cfg), "ready");
});

test("metrics include full-frame bounds while coverage remains guide-local", () => {
  const values = logits(11);
  for (let y = 2; y < 8; y++) for (let x = 3; x < 7; x++) {
    const i = y * 10 + x;
    values[11 * 100 + i] = 0;
    values[4 * 100 + i] = 10;
  }
  const metrics = clothingMetrics(values, dims, { x: 0.3, y: 0.2, w: 0.4, h: 0.6 });
  assert.equal(metrics.confidenceQualifiedPixels, 24);
  assert.ok(metrics.coverage > 0.9);
  assert.equal(metrics.bounds.x, 0.3);
  assert.equal(metrics.bounds.y, 0.2);
  assert.equal(metrics.bounds.w, 0.4);
  assert.equal(metrics.bounds.h, 0.6);
});

const { flowReducer } = load("lib/FlowContext.tsx");
const state = { step: "mood", sessionId: "current", moodAnalysis: null, moodFrame: null, answers: { mood: null, journey: "explore" } };
const result = { mood: "calm", source: "local" };
test("clothing capture opens analysis screen immediately, before a mood result", () => {
  const opening = flowReducer(state, { type: "START_MOOD_ANALYSIS", frame: "captured" });
  assert.equal(opening.step, "opening");
  assert.equal(opening.moodFrame, "captured");
  assert.equal(opening.moodAnalysis, null);
  assert.equal(flowReducer(opening, { type: "START_MOOD_ANALYSIS", frame: "duplicate" }), opening);
  assert.equal(flowReducer(opening, { type: "RESOLVE_WORLD", worldId: "paris_dawn" }), opening);
});
test("analysis results stay in opening, release frame and reject stale/duplicate responses", () => {
  const opening = flowReducer(state, { type: "START_MOOD_ANALYSIS", frame: "captured" });
  assert.equal(flowReducer(opening, { type: "ANALYZE_MOOD", result, sessionId: "old" }), opening);
  const analyzed = flowReducer(opening, { type: "ANALYZE_MOOD", result, sessionId: "current" });
  assert.equal(analyzed.step, "opening");
  assert.equal(analyzed.moodFrame, null);
  assert.equal(analyzed.answers.mood, "calm");
  assert.equal(flowReducer(analyzed, { type: "ANALYZE_MOOD", result, sessionId: "current" }), analyzed);
  assert.equal(flowReducer(analyzed, { type: "RESOLVE_WORLD", worldId: "paris_dawn" }).step, "reveal");
});

test("retake clears the current photo without accumulating customer images", () => {
  const captured = flowReducer({ ...state, step: "experience", selectedWorldId: "paris_dawn" }, { type: "CAPTURE", dataUrl: "photo-a" });
  assert.equal(captured.capturedImage, "photo-a");
  assert.equal("savedMoments" in captured, false);
  const retaken = flowReducer(captured, { type: "RETAKE" });
  assert.equal(retaken.step, "experience");
  assert.equal(retaken.capturedImage, null);
});

test("late upload responses cannot cross session boundaries", () => {
  const confirmed = { ...state, step: "moment", sessionId: "new", photoConfirmed: true, uploadState: "uploading", shareUrl: null, expiresAt: null };
  assert.equal(flowReducer(confirmed, { type: "SHOW_QR" }), confirmed);
  assert.equal(flowReducer(confirmed, { type: "RETAKE" }), confirmed);
  const stale = flowReducer(confirmed, { type: "UPLOAD_SUCCEEDED", sessionId: "old", url: "old-url", expiresAt: "old-expiry" });
  assert.equal(stale, confirmed);
  const current = flowReducer(confirmed, { type: "UPLOAD_SUCCEEDED", sessionId: "new", url: "new-url", expiresAt: "new-expiry" });
  assert.equal(current.shareUrl, "new-url");
  assert.equal(flowReducer(current, { type: "SHOW_QR" }).step, "handoff");
});
