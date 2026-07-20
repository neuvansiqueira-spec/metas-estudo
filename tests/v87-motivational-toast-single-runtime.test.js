const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const script = read("script.js");
const spectrum = read("question-accuracy-spectrum.js");
const style = read("style.css");

test("a mensagem motivacional possui um único controlador", () => {
  assert.match(script, /function showTimerMotivationalToast/);
  assert.match(script, /TIMER_MOTIVATIONAL_TOAST_DURATION_MS = 30000/);
  assert.match(script, /MetasQuestionAccuracySpectrum\?\.playMotivationalChime\?\.\(milestone\)/);
  assert.doesNotMatch(spectrum, /showAlignedTimerMotivation|installAlignedTimerMotivation/);
  assert.doesNotMatch(spectrum, /Object\.assign\(toast\.style/);
  assert.doesNotMatch(spectrum, /setInterval\(check, 500\)/);
});

test("o aviso móvel permanece acima do cronômetro sem bloquear controles", () => {
  assert.match(style, /\.timer-motivational-toast[\s\S]*z-index: 2700/);
  assert.match(style, /\.timer-motivational-toast[\s\S]*pointer-events: none/);
});

test("V87 renova o cache e mantém a publicação em paridade", () => {
  const version = "20260720-identidade-metas-concursos-v90";
  assert.equal(JSON.parse(read("package.json")).version, version);
  assert.match(read("index.html"), new RegExp(version));
  assert.match(read("service-worker.js"), new RegExp(`CURRENT_VERSION = "${version}"`));
  assert.match(read("service-worker.js"), /"20260720-cronometro-mobile-v86"/);
  for (const file of ["script.js", "question-accuracy-spectrum.js", "style.css", "service-worker.js"]) {
    assert.equal(read(file), read(path.join("docs", file)), file);
  }
});
