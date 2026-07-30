import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const review = fs.readFileSync("/mnt/data/question-bank-json-review-v192.js", "utf8");
const worker = fs.readFileSync("/mnt/data/service-worker-v169.js", "utf8");

test("V192 usa painel visível e não confirmação nativa", () => {
  assert.match(review, /aldusQbJsonReviewV192/);
  assert.match(review, /REVISAR ANTES DE SALVAR/);
  assert.match(review, /Confirmar importação/);
  assert.doesNotMatch(review, /\bconfirm\s*\(/);
});

test("V192 intercepta o input JSON sem depender do objeto elements", () => {
  assert.match(review, /target\.id !== "qbFile"/);
  assert.match(review, /document\.addEventListener\("change", handleJsonChange, true\)/);
  assert.match(review, /stopImmediatePropagation/);
});

test("worker carrega a revisão antes do importador V191", () => {
  assert.match(worker, /question-bank-json-review-v192\.js/);
  assert.match(worker, /question-bank-json-import-v191\.js/);
  assert.ok(worker.indexOf('question-bank-json-review-v192.js */') < worker.indexOf('question-bank-json-import-v191.js */'));
});

test("worker renova cache e mantém falha segura", () => {
  assert.match(worker, /20260730-revisao-visivel-json-qconcursos-v169/);
  assert.match(worker, /o aplicativo original será mantido/);
  assert.match(worker, /Promise\.allSettled/);
});
