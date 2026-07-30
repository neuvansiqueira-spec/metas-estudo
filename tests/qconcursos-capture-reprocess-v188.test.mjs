import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const reader = fs.readFileSync(new URL("../qconcursos-capture-segmented-v188.js", import.meta.url), "utf8");
const bank = fs.readFileSync(new URL("../qconcursos-capture-bank-v188.js", import.meta.url), "utf8");
const reprocess = fs.readFileSync(new URL("../qconcursos-capture-reprocess-v188.js", import.meta.url), "utf8");
const worker = fs.readFileSync(new URL("../service-worker-v169.js", import.meta.url), "utf8");

test("worker carrega parser, cadastro e releitura na ordem correta", () => {
  assert.match(worker, /qconcursos-capture-segmented-v188\.js/);
  assert.match(worker, /qconcursos-capture-bank-v188\.js/);
  assert.match(worker, /qconcursos-capture-reprocess-v188\.js/);
  assert.ok(worker.indexOf("captureBankSource") < worker.indexOf("captureReprocessSource}`"));
});

test("módulos expõem versões V188 coerentes", () => {
  assert.match(reader, /segmentacao-cartoes-qconcursos-v188/);
  assert.match(bank, /cadastro-segmentado-captura-v188/);
  assert.match(reprocess, /reprocessamento-corretivo-captura-v188/);
  assert.match(reprocess, /cadastro-segmentado-captura-v188/);
});

test("releitura preserva sessão e remove a sessão gerada", () => {
  assert.match(reprocess, /previousItems/);
  assert.match(reprocess, /Object\.assign\(priorSession, generatedSession/);
  assert.match(reprocess, /filter\(\(session\) => session !== generatedSession\)/);
  assert.match(reprocess, /sem duplicar o desempenho/);
});
