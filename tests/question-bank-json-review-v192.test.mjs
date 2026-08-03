import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const review = fs.readFileSync(new URL("../question-bank-json-review-v192.js", import.meta.url), "utf8");
const bundle = fs.readFileSync(new URL("../app.bundle.js", import.meta.url), "utf8");

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

test("bundle carrega a revisão antes do importador V191", () => {
  assert.match(bundle, /question-bank-json-review-v192\.js/);
  assert.match(bundle, /question-bank-json-import-v191\.js/);
  assert.ok(bundle.indexOf('question-bank-json-review-v192.js */') < bundle.indexOf('question-bank-json-import-v191.js */'));
});

test("revisão mantém falha segura", () => {
  assert.match(review, /20260730-revisao-visivel-json-qconcursos-v192/);
  assert.match(review, /catch \(error\)/);
  assert.match(review, /Erro ao importar: \$\{error\.message\}/);
  assert.match(review, /finally \{\s*target\.value = "";/);
});
