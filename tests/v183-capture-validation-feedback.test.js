import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const read = (file) => fs.readFileSync(file, "utf8");
const between = (source, startName, endName) => source.slice(
  source.indexOf(`function ${startName}(`),
  source.indexOf(`function ${endName}(`)
);

test("validação da captura aparece junto ao botão e direciona ao campo inconsistente", () => {
  const html = read("index.html");
  const script = read("script.js");
  const css = read("question-bank-capture-import-v182.css");

  assert.match(html, /id="qbCaptureValidation"[^>]*role="alert"[^>]*aria-live="assertive"/);
  assert.ok(html.indexOf('id="qbCaptureValidation"') < html.indexOf('id="qbCaptureConfirm"'));
  assert.match(script, /function qbShowCaptureValidation/);
  assert.match(script, /row\?\.classList\.add\("has-validation-error"\)/);
  assert.match(script, /scrollIntoView\?\.\(\{ behavior: "smooth", block: "center" \}\)/);
  assert.match(script, /focus\?\.\(\{ preventScroll: true \}\)/);
  assert.match(script, /resultado está como certo, mas resposta e gabarito são diferentes/);
  assert.match(script, /resultado está como errado, mas resposta e gabarito são iguais/);
  assert.doesNotMatch(script, /elements\.qbCaptureStatus\.textContent = validation;/);
  assert.match(css, /\.qb-capture-row\.has-validation-error/);
  assert.match(css, /\.qb-capture-validation\[hidden\]/);
});

test("alterar um campo remove o destaque antigo e preserva nova validação no próximo envio", () => {
  const script = read("script.js");
  assert.match(script, /qbCapturePreviewList\?\.addEventListener\("input", qbClearCaptureValidation\)/);
  assert.match(script, /qbCapturePreviewList\?\.addEventListener\("change", qbClearCaptureValidation\)/);
  assert.match(script, /const validationIssue = qbValidateCaptureRows\(rows\)/);
  assert.match(script, /qbShowCaptureValidation\(validationIssue\)/);
});

test("inconsistência certo com resposta diferente do gabarito é executada e aponta o campo", () => {
  const source = read("script.js");
  const context = {
    QB_MARK_BLANK: "__blank__",
    qbChoiceKeys: () => ["C", "E"]
  };
  vm.runInNewContext(between(source, "qbValidateCaptureRows", "qbClearCaptureValidation"), context);

  const inconsistent = context.qbValidateCaptureRows([{
    displayIndex: 5,
    question: { id: "Q5" },
    questionId: "Q5",
    marked: "C",
    officialKey: "E",
    status: "certo"
  }]);
  assert.match(inconsistent.message, /questão 5/);
  assert.equal(inconsistent.field, "[data-qb-capture-key]");

  const consistent = context.qbValidateCaptureRows([{
    displayIndex: 5,
    question: { id: "Q5" },
    questionId: "Q5",
    marked: "C",
    officialKey: "C",
    status: "certo"
  }]);
  assert.equal(consistent, null);
});

test("retorno visual destaca a linha, rola e focaliza o campo indicado", () => {
  const source = read("script.js");
  const effects = { added: false, scrolled: false, focused: false };
  const field = {
    scrollIntoView() { effects.scrolled = true; },
    focus() { effects.focused = true; }
  };
  const rowElement = {
    classList: {
      add() { effects.added = true; },
      remove() { effects.added = false; }
    },
    querySelector() { return field; }
  };
  const context = {
    elements: {
      qbCapturePreviewList: { querySelectorAll: () => [] },
      qbCaptureValidation: { hidden: true, textContent: "", focus() {} },
      qbCaptureStatus: { textContent: "" }
    },
    requestAnimationFrame(callback) { callback(); },
    setTimeout(callback) { callback(); }
  };
  vm.runInNewContext(between(source, "qbClearCaptureValidation", "qbCaptureCreatedAt"), context);
  context.qbShowCaptureValidation({
    message: "Corrija a questão 5.",
    row: { rowElement },
    field: "[data-qb-capture-key]"
  });

  assert.equal(context.elements.qbCaptureValidation.hidden, false);
  assert.equal(context.elements.qbCaptureValidation.textContent, "Corrija a questão 5.");
  assert.equal(context.elements.qbCaptureStatus.textContent, "Corrija a questão 5.");
  assert.equal(effects.added, true);
  assert.equal(effects.scrolled, true);
  assert.equal(effects.focused, true);
});
