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
const { clothingCoverage, clothingInput, createClothingGate } = load("lib/clothingDetection.ts");
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
