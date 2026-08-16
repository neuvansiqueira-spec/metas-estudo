import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = (file) => fs.readFileSync(file, "utf8");

test("V346 mantém bloqueio geral, mas libera cronômetro e simulado por fila protegida", () => {
  const guard = read("storage-concurrency-v345.js");
  assert.match(guard, /20260816-multitab-timer-simulado-v346/);
  assert.match(guard, /aldus:module-request:v346:/);
  assert.match(guard, /commitTimerState/);
  assert.match(guard, /commitSimulationState/);
  assert.match(guard, /processPendingRequests/);
  assert.match(guard, /saveDataSingleWriterV345/);
  assert.doesNotMatch(guard, /O estudo não foi salvo nesta aba porque outra aba/);
});

test("V346 soma uma sessão nova do cronômetro no escritor sem regressão de meta", () => {
  const guard = read("storage-concurrency-v345.js");
  assert.match(guard, /const studyAdded = !study/);
  assert.match(guard, /goal\[field\] \+= minutes/);
  assert.match(guard, /goal\.actualMinutes = goal\.studyActualMinutes \+ goal\.questionActualMinutes/);
  assert.match(guard, /mergeGoalNonRegression/);
});

test("V346 sincroniza o estado antes de uma aba secundária virar gravadora", () => {
  const guard = read("storage-concurrency-v345.js");
  assert.match(guard, /prepareWriterHandoff/);
  assert.match(guard, /loadStateFromIndexedDB/);
  assert.match(guard, /replaceStateInPlace/);
  assert.match(guard, /writerReady/);
});

test("V346 integra o simulado por commit durável e mantém respostas locais independentes", () => {
  const integration = read("simulado-integracao-v314.js");
  const interactive = read("simulado-interativo-v313.js");
  assert.match(integration, /commitSimulationState/);
  assert.match(integration, /await concurrency\.commitSimulationState/);
  assert.match(integration, /if \(!result\?\.durable\)/);
  assert.match(interactive, /aldusSimuladosInterativosV313/);
  assert.match(interactive, /localStorage\.setItem\(STORAGE_KEY/);
});

test("V346 usa cache-bust novo sem trocar o bundle canônico V345", () => {
  const core = read("bootstrap-integrity-loader-v345-core.js");
  const worker = read("service-worker.js");
  assert.match(core, /storage-concurrency-v345\.js\?v=20260816-multitab-timer-simulado-v346/);
  assert.match(core, /simulado-integracao-v314\.js\?v=20260816-multitab-timer-simulado-v346/);
  assert.match(worker, /bootstrap-performance-v342-multitab-v346/);
  assert.match(worker, /storage-concurrency-v345\.js\?v=20260816-multitab-timer-simulado-v346/);
  assert.match(worker, /app-\$\{RELEASE_SUFFIX\}\.js/);
});

test("V346 mantém paridade raiz/docs nos arquivos alterados", () => {
  for (const file of [
    "storage-concurrency-v345.js",
    "simulado-integracao-v314.js",
    "bootstrap-integrity-loader-v345-core.js",
    "service-worker.js"
  ]) {
    assert.equal(read(file), read(`docs/${file}`), `${file} deve ser idêntico em docs`);
  }
});
