const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const source = fs.readFileSync("question-accuracy-spectrum.js", "utf8");
const script = fs.readFileSync("script.js", "utf8");

test("aviso sonoro é ativado por padrão e pode ser desativado", () => {
  assert.match(source, /metasEstudoMotivationalSoundEnabled/);
  assert.match(source, /stored === null \|\| stored === undefined \? true/);
  assert.match(source, /timerPreferences\.motivationalSound = normalized/);
  assert.match(source, /data-timer-pref=\"motivationalSound\"|dataset\.timerPref = \"motivationalSound\"/);
});

test("toque é curto, suave e gerado sem arquivo externo", () => {
  assert.match(source, /createOscillator\(\)/);
  assert.match(source, /createGain\(\)/);
  assert.match(source, /oscillator\.type = \"sine\"/);
  assert.match(source, /\.08/);
  assert.match(source, /659\.25/);
  assert.match(source, /frequency: 880/);
  assert.doesNotMatch(source, /new Audio\(|\.mp3|\.wav|\.ogg/);
});

test("cada mensagem chama o som e 100% usa conclusão especial", () => {
  assert.match(script, /MetasQuestionAccuracySpectrum\?\.playMotivationalChime\?\.\(milestone\)/);
  assert.match(source, /Number\(milestone\) >= 100/);
  assert.match(source, /987\.77/);
  assert.match(script, /TIMER_MOTIVATIONAL_TOAST_DURATION_MS = 30000/);
});

test("raiz e versão publicada permanecem idênticas", () => {
  assert.equal(
    fs.readFileSync("question-accuracy-spectrum.js", "utf8"),
    fs.readFileSync("docs/question-accuracy-spectrum.js", "utf8")
  );
});
