const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const destination = path.join(root, "public", "onnx");
fs.mkdirSync(destination, { recursive: true });
for (const file of ["ort.wasm.min.mjs", "ort-wasm-simd-threaded.wasm", "ort-wasm-simd-threaded.mjs"]) {
  fs.copyFileSync(path.join(root, "node_modules", "onnxruntime-web", "dist", file), path.join(destination, file));
}
