const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

function loadSpectrumApi(file) {
  const source = fs.readFileSync(file, "utf8");
  const context = { console, setTimeout, clearTimeout, setInterval };
  vm.runInNewContext(source, context);
  return { api: context.MetasQuestionAccuracySpectrum, source };
}

test("cálculo e matiz variam continuamente conforme o percentual", () => {
  const { api } = loadSpectrumApi("question-accuracy-spectrum.js");
  assert.ok(api);
  assert.equal(api.questionAccuracyFromValues(50, 20), 40);
  assert.equal(api.questionAccuracyFromValues(0, 20), 0);
  assert.equal(api.clampAccuracyPercent(-1), 0);
  assert.equal(api.clampAccuracyPercent(101), 100);
  const samples = [0, 25, 50, 75, 100].map(api.accuracySpectrumHue);
  assert.deepEqual(samples, [0, 30, 60, 90, 120]);
  for (let percent = 1; percent <= 100; percent += 1) {
    assert.ok(api.accuracySpectrumHue(percent) > api.accuracySpectrumHue(percent - 1));
  }
});

test("visual usa espectro contínuo em uma régua compacta", () => {
  const { source } = loadSpectrumApi("question-accuracy-spectrum.js");
  assert.match(source, /linear-gradient\(90deg,/);
  assert.match(source, /#dc2626 0%/);
  assert.match(source, /#facc15 50%/);
  assert.match(source, /#0ea5e9 100%/);
  assert.match(source, /height: 9px/);
  assert.match(source, /position: absolute/);
  assert.match(source, /transition: left \.25s ease/);
  assert.match(source, /role="progressbar"/);
});

test("não transforma nem colore o quadro inteiro", () => {
  const { source } = loadSpectrumApi("question-accuracy-spectrum.js");
  const boxRule = source.match(/#questionCalculated\.question-calculated-spectrum \{([\s\S]*?)\n      \}/)?.[1] || "";
  assert.doesNotMatch(boxRule, /display:\s*grid/);
  assert.doesNotMatch(boxRule, /background:/);
  assert.doesNotMatch(boxRule, /border:/);
  assert.match(boxRule, /padding-bottom: 36px/);
});

test("arquivo publicado em docs permanece idêntico", () => {
  assert.equal(
    fs.readFileSync("question-accuracy-spectrum.js", "utf8"),
    fs.readFileSync("docs/question-accuracy-spectrum.js", "utf8")
  );
});
