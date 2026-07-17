const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

function loadRuntime(progressText = "10% do tempo decorrido", timerText = "00:07:20") {
  const elements = new Map([
    ["timerProgressText", { textContent: progressText }],
    ["timerTime", { textContent: timerText }],
    ["floatingTimer", { hidden: false }],
    ["timerMode", { value: "free" }],
    ["timerDiscipline", { textContent: "DIREITO PENAL" }],
    ["timerSubject", { textContent: "Teoria Geral do Crime" }],
    ["timerKind", { textContent: "Estudo" }]
  ]);

  const document = {
    visibilityState: "visible",
    head: { appendChild() {} },
    body: { appendChild() {} },
    getElementById(id) { return elements.get(id) || null; },
    querySelector(selector) {
      if (selector.includes("motivationalMessages")) return { checked: true };
      return null;
    },
    createElement() {
      return {
        style: {},
        dataset: {},
        classList: { add() {}, remove() {} },
        setAttribute() {},
        appendChild() {},
        querySelector() { return null; }
      };
    },
    addEventListener() {}
  };

  const context = {
    console,
    document,
    globalThis: null,
    setTimeout() { return 1; },
    clearTimeout() {},
    setInterval() { return 1; },
    MutationObserver: class { observe() {} }
  };
  context.globalThis = context;
  vm.runInNewContext(fs.readFileSync("question-accuracy-spectrum.js", "utf8"), context);
  return context.MetasQuestionAccuracySpectrum;
}

test("usa o percentual mostrado na tela como marco motivacional", () => {
  const runtime = loadRuntime("10% do tempo decorrido", "00:07:20");
  assert.equal(runtime.timerDisplayedPercent(), 10);
  assert.equal(runtime.timerElapsedSeconds(), 440);
});

test("aceita percentual com vírgula", () => {
  const runtime = loadRuntime("25,0% do tempo decorrido", "00:18:45");
  assert.equal(runtime.timerDisplayedPercent(), 25);
});

test("mantém raiz e cópia publicada idênticas", () => {
  assert.equal(
    fs.readFileSync("question-accuracy-spectrum.js", "utf8"),
    fs.readFileSync("docs/question-accuracy-spectrum.js", "utf8")
  );
});
