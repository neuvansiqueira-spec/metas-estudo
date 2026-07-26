const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const { assertCurrentReleaseContract } = require("./current-release-contract.js");

const read = (file) => fs.readFileSync(file, "utf8");
const script = read("script.js");
const factoryPrompt = read("factory-lei-prompt-v123.js");

test("v153 inicializa constantes e bloqueia qualquer salvamento provisório", () => {
  const statuses = script.indexOf("const FACTORY_STATUSES");
  const guard = script.indexOf("if (!bootstrapStateReady)");
  const bootstrapActivation = script.indexOf("bootstrapStateReady = true", guard);
  assert.ok(statuses >= 0);
  assert.ok(guard > statuses);
  assert.ok(bootstrapActivation > guard);
  assert.doesNotMatch(script.slice(0, guard), /if \(shouldSaveAfterFactoryPromptMigrations\) saveData\(\)/);
  assert.doesNotThrow(() => new vm.Script(read("app.bundle.js")));
});

test("v153 impede a frase motivacional de bloquear o dashboard quando o storage falha", () => {
  const start = script.indexOf("function pickMotivationalPhrase");
  const end = script.indexOf("function renderMotivationalPhrase", start);
  const body = script.slice(start, end);
  assert.match(body, /try\s*\{[\s\S]*localStorage\.getItem/);
  assert.match(body, /try\s*\{[\s\S]*localStorage\.setItem/);
  assert.match(body, /return phrase/);
});

test("somente o bootstrap principal registra service worker", () => {
  assert.equal((script.match(/navigator\.serviceWorker\.register\(/g) || []).length, 1);
  assert.doesNotMatch(factoryPrompt, /serviceWorker\.register/);
  assert.match(script, /service-worker-v153\.js/);
});

test("migrações auxiliares aguardam o estado autoritativo do bootstrap", () => {
  assert.match(factoryPrompt, /aldus:bootstrap-ready/);
  assert.match(read("factory-final-review-v128.js"), /aldus:bootstrap-ready/);
  assert.match(script, /applyPcprPcma2026Migration\(state\)[\s\S]*bootstrapStateReady = true/);
  assert.match(read("sync-integral-deletions.js"), /window\.addEventListener\("aldus:bootstrap-ready", arm/);
  assert.match(script, /window\.dispatchEvent\(new CustomEvent\("aldus:bootstrap-ready"\)\);\s*saveData\(\);/);
});

test("v153 mantém versão, bundles, worker e espelhos de publicação coerentes", () => {
  assertCurrentReleaseContract();
});
