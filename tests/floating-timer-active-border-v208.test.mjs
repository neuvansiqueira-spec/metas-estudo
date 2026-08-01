import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const moduleSource = fs.readFileSync(new URL("../floating-timer-active-border-v208.js", import.meta.url), "utf8");
const publicModuleSource = fs.readFileSync(new URL("../docs/floating-timer-active-border-v208.js", import.meta.url), "utf8");
const runtimeSource = fs.readFileSync(new URL("../runtime-entry-v200.js", import.meta.url), "utf8");
const publicRuntimeSource = fs.readFileSync(new URL("../docs/runtime-entry-v200.js", import.meta.url), "utf8");
const workerSource = fs.readFileSync(new URL("../service-worker-v169.js", import.meta.url), "utf8");
const publicWorkerSource = fs.readFileSync(new URL("../docs/service-worker-v169.js", import.meta.url), "utf8");

test("contorno dourado aparece somente no cronômetro visível e não concluído", () => {
  assert.match(moduleSource, /#floatingTimer\.floating-timer:not\(\[hidden\]\):not\(\.timer-finished\)/);
  assert.match(moduleSource, /rgba\(199, 154, 59, \.78\)/);
  assert.match(moduleSource, /border-right-color/);
  assert.match(moduleSource, /border-bottom-color/);
  assert.match(moduleSource, /border-left-color/);
});

test("preserva topo existente e estado vermelho de conclusão", () => {
  assert.doesNotMatch(moduleSource, /border-top-color/);
  assert.match(moduleSource, /:not\(\.timer-finished\)/);
  assert.doesNotMatch(moduleSource, /\.timer-finished\s*\{/);
});

test("alteração é exclusivamente visual e idempotente", () => {
  assert.match(moduleSource, /floatingTimerActiveBorderV208Style/);
  assert.match(moduleSource, /document\.getElementById\(STYLE_ID\)/);
  assert.doesNotMatch(moduleSource, /localStorage|indexedDB|saveData|state\.|fetch\(/);
});

test("raiz, docs, runtime e service worker publicam a V208", () => {
  assert.equal(moduleSource, publicModuleSource);
  assert.equal(runtimeSource, publicRuntimeSource);
  assert.equal(workerSource, publicWorkerSource);
  assert.match(runtimeSource, /20260731-borda-ativa-cronometro-v169/);
  assert.match(runtimeSource, /floating-timer-active-border-v208\.js/);
  assert.match(runtimeSource, /ALDUS_V208_TIMER_BORDER_MARKER/);
  assert.match(workerSource, /20260731-borda-ativa-cronometro-v208/);
});