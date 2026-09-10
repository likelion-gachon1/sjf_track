// Integration smoke test: provide a local 512x512 scikit-image astronaut.png fixture.
// NODE_PATH must include Playwright when it is not installed in this project.
const { chromium } = require("playwright");
const fs = require("node:fs");
const assert = require("node:assert/strict");

(async () => {
  const fixture = "data:image/png;base64," + fs.readFileSync(process.argv[2]).toString("base64");
  const browser = await chromium.launch({ headless: true, channel: "chrome" });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.addInitScript(({ fixture }) => {
      window.testCameraMode = "face";
      window.testCoverage = [];
      const NativeWorker = window.Worker;
      window.Worker = class extends NativeWorker {
        constructor(...args) {
          super(...args);
          this.addEventListener("message", ({ data }) => window.testCoverage.push(data));
        }
      };
      navigator.mediaDevices.getUserMedia = async () => {
        const image = new Image(); image.src = fixture; await image.decode();
        const canvas = document.createElement("canvas"); canvas.width = 700; canvas.height = 500;
        const ctx = canvas.getContext("2d");
        const draw = () => {
          if (window.testCameraMode === "face") ctx.drawImage(image, 177, 65, 105, 110, 0, 0, 700, 500);
          else if (window.testCameraMode === "blank") { ctx.fillStyle = "#b0b0b0"; ctx.fillRect(0, 0, 700, 500); }
          else ctx.drawImage(image, 0, 0, 370, 512, 0, 0, 700, 500);
        };
        draw(); setInterval(draw, 50);
        return canvas.captureStream(20);
      };
      navigator.mediaDevices.enumerateDevices = async () => [];
    }, { fixture });
    let requests = 0;
    let finishAnalysis;
    const pending = new Promise((resolve) => { finishAnalysis = resolve; });
    await page.route("**/api/analyze-mood", async (route) => {
      requests++;
      await pending;
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({
        mood: "calm", description: "차분한 의상", dominantColor: { name: "화이트", hex: "#ffffff" },
      }) });
    });
    await page.goto(process.env.TEST_BASE_URL || "http://localhost:3100");
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "여행 시작하기" }).click();
    await page.getByRole("button", { name: /Soft Pink/ }).click();
    await page.getByText("여행지에서 가장 하고 싶은 건?").waitFor();
    await page.getByRole("button").first().click();
    await page.getByText("오늘의 스타일을 보여주세요.").waitFor();
    await page.waitForFunction(() => window.testCoverage.filter((x) => x.type === "result").length >= 4 || window.testCoverage.some((x) => x.type === "error"), null, { timeout: 90000 });
    const face = await page.evaluate(() => window.testCoverage);
    console.log("Face fixture:", face);
    assert.ok(!face.some((x) => x.type === "error"));
    assert.equal(requests, 0, "Face must not trigger analysis");
    await page.evaluate(() => { window.testCameraMode = "clothing"; });
    await page.waitForFunction(() => document.body.innerText.includes("AI가 고객님의 무드를"), null, { timeout: 90000 });
    console.log("Clothing fixture:", await page.evaluate(() => window.testCoverage));
    assert.equal(requests, 1);
    assert.equal(await page.locator("video").count(), 0);
    await page.waitForTimeout(4000);
    assert.ok((await page.locator("body").innerText()).includes("AI가 고객님의 무드를"), "Keep analysis stage while API is pending");
    assert.ok(!(await page.locator("body").innerText()).includes("고객님의 World로"));
    finishAnalysis();
    await page.getByText(/고객님의 World로/).waitFor();
    assert.equal(requests, 1);
    assert.deepEqual(errors, []);
    console.log("PASS: face rejected, clothing auto-started once, pending analysis displayed only in opening.");
  } finally { await browser.close(); }
})().catch((error) => { console.error(error); process.exitCode = 1; });
