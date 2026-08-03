import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const reader = fs.readFileSync(new URL("../qconcursos-capture-segmented-v188.js", import.meta.url), "utf8");
const bank = fs.readFileSync(new URL("../qconcursos-capture-bank-v188.js", import.meta.url), "utf8");
const reprocess = fs.readFileSync(new URL("../qconcursos-capture-reprocess-v188.js", import.meta.url), "utf8");
const bundle = fs.readFileSync(new URL("../app.bundle.js", import.meta.url), "utf8");

test("bundle carrega parser, cadastro e releitura na ordem correta", () => {
  const parserPosition = bundle.indexOf("segmentacao-cartoes-qconcursos-v188");
  const bankPosition = bundle.indexOf("/* Aldus runtime source: qconcursos-capture-bank-v188.js */");
  const reprocessPosition = bundle.indexOf("/* Aldus runtime source: qconcursos-capture-reprocess-v188.js */");
  assert.ok(parserPosition >= 0);
  assert.ok(bankPosition > parserPosition);
  assert.ok(reprocessPosition > bankPosition);
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
