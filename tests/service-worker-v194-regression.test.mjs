import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const worker = fs.readFileSync(new URL("../service-worker-v169.js", import.meta.url), "utf8");
const publicWorker = fs.readFileSync(new URL("../docs/service-worker-v169.js", import.meta.url), "utf8");

test("V194 não referencia marcador com capitalização incorreta", () => {
  assert.doesNotMatch(worker, /qBEventsMarker/);
  assert.match(worker, /qbEventsMarker/);
});

test("marcador do módulo de captura V188 permanece canônico", () => {
  assert.match(worker, /qconcursos-capture-bank-v188\.js/);
  assert.doesNotMatch(worker, /qconcursos-capture-bankv188\.js/);
});

test("painel de revisão executa antes do importador direto", () => {
  const importBlock = worker.indexOf('question-bank-json-import-v191.js */`');
  const reviewBlock = worker.indexOf('question-bank-json-review-v192.js */`');
  assert.ok(importBlock >= 0 && reviewBlock > importBlock, "a revisão deve ser injetada depois no worker para aparecer antes no código final");
});

test("worker valida os módulos obrigatórios e publica a recuperação V194", () => {
  assert.match(worker, /requiredMarkers/);
  assert.match(worker, /20260730-restaura-carregamento-json-v169/);
  assert.match(worker, /\[Aldus V194\]/);
});

test("worker público é idêntico ao worker da raiz", () => {
  assert.equal(publicWorker, worker);
});
