const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const rootDir = path.resolve(__dirname, "..");
const rootScript = path.join(rootDir, "contest-countdown-v151.js");
const docsScript = path.join(rootDir, "docs", "contest-countdown-v151.js");
const rootLoader = path.join(rootDir, "analytics-single-arrow-v150.js");
const docsLoader = path.join(rootDir, "docs", "analytics-single-arrow-v150.js");
const api = require(rootScript);
const read = (file) => fs.readFileSync(file, "utf8");

test("arquivos alterados possuem sintaxe JavaScript válida", () => {
  [rootScript, docsScript, rootLoader, docsLoader].forEach((file) => execFileSync(process.execPath, ["--check", file]));
});

test("raiz e docs permanecem byte a byte iguais", () => {
  assert.equal(read(rootScript), read(docsScript));
  assert.equal(read(rootLoader), read(docsLoader));
});

test("v151 está incorporada uma única vez ao bundle atual", () => {
  const bundle = read(path.join(rootDir, "app-v169.js"));
  assert.equal((bundle.match(/Aldus source: contest-countdown-v151\.js/g) || []).length, 1);
  assert.doesNotMatch(read(rootLoader), /contest-countdown-v151\.js|createElement\(["']script/);
});

test("valida datas reais e horário opcional", () => {
  assert.equal(api.validDateText("2026-10-13"), true);
  assert.equal(api.validDateText("2026-02-30"), false);
  assert.equal(api.validTimeText("13:00"), true);
  assert.equal(api.validTimeText("25:00"), false);
  assert.equal(api.validTimeText(""), true);
});

test("data sem horário permanece ativa até o fim do dia", () => {
  const date = api.targetDate({ date: "2026-10-13", time: "" });
  assert.equal(date.getFullYear(), 2026);
  assert.equal(date.getMonth(), 9);
  assert.equal(date.getDate(), 13);
  assert.equal(date.getHours(), 23);
  assert.equal(date.getMinutes(), 59);
});

test("contagem nunca produz valores negativos", () => {
  const now = new Date(2026, 6, 25, 12, 0, 0);
  const target = new Date(2026, 6, 27, 14, 30, 5);
  assert.deepEqual(api.remainingParts(target, now), {
    milliseconds: 181805000,
    days: 2,
    hours: 2,
    minutes: 30,
    seconds: 5
  });
  assert.equal(api.remainingParts(new Date(2026, 6, 20), now).milliseconds, 0);
});

test("normaliza texto e rejeita registros incompletos", () => {
  const item = api.normalizeRecord({
    id: "a",
    contest: "  PCPR\nDelegado ",
    phase: "Prova objetiva",
    date: "2026-10-13",
    time: "13:00",
    kind: "estimated",
    pinned: true
  });
  assert.equal(item.contest, "PCPR Delegado");
  assert.equal(item.kind, "estimated");
  assert.equal(item.pinned, true);
  assert.equal(api.normalizeRecord({ id: "a", contest: "", phase: "X", date: "2026-10-13" }), null);
});

test("módulo não realiza chamadas de rede nem altera rotinas centrais", () => {
  const source = read(rootScript);
  for (const forbidden of ["fetch(", "XMLHttpRequest", "WebSocket", "saveData(", "syncIntegral", "indexedDB"]) {
    assert.equal(source.includes(forbidden), false, `não deve conter ${forbidden}`);
  }
  assert.match(source, /aldus\.contestCountdown\.v151/);
  assert.match(source, /textContent/);
  assert.doesNotMatch(source, /app-version|aldusReleaseVersion/);
});
