import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const source = fs.readFileSync(new URL("../question-bank-json-completion-v196.js", import.meta.url), "utf8");

test("V196 observa o botão de confirmação e mostra resultado final", () => {
  assert.match(source, /data-json-review-confirm/);
  assert.match(source, /Importação concluída/);
  assert.match(source, /data-json-completion-close/);
  assert.match(source, /document\.addEventListener\("click", observeConfirmation, true\)/);
});

test("V196 explica reimportação sem alterações e sem duplicidade", () => {
  const context = { globalThis: null, document: { addEventListener() {} } };
  context.globalThis = context;
  vm.runInNewContext(source, context);
  const api = context.AldusQuestionBankJsonCompletionV196;
  const message = api.completionMessage({
    stats: { "Questões válidas": 14, Novas: 0, Atualizadas: 0, "Sem alteração": 14 },
    note: "O desempenho deste mesmo arquivo já existe e não será duplicado."
  }, "");
  assert.match(message, /14 questão/);
  assert.match(message, /nada foi duplicado/);
});

test("V196 mantém paridade entre raiz e docs", () => {
  const docs = fs.readFileSync(new URL("../docs/question-bank-json-completion-v196.js", import.meta.url), "utf8");
  assert.equal(source, docs);
});