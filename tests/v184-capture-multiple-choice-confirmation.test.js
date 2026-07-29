import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const read = (file) => fs.readFileSync(file, "utf8");
const between = (source, startName, endName) => source.slice(
  source.indexOf(`function ${startName}(`),
  source.indexOf(`function ${endName}(`)
);

test("leitor preserva a evidência visual de múltipla escolha A–E", () => {
  const context = {};
  vm.runInNewContext(read("qconcursos-capture-import-v182.js"), context);
  const importer = context.AldusQconcursosCaptureImport;
  const [match] = importer.matchResults(
    [{
      index: 0,
      status: "errado",
      correct: false,
      officialKey: "D",
      segment: "prerrogativa administração pública invalidar atos administrativos ilegítimos",
      comment: ""
    }],
    [{ optionCount: 5, marked: "A", confidence: "alta" }],
    [{
      id: "Q2388736",
      enunciado: "A prerrogativa da administração pública de invalidar atos administrativos ilegítimos",
      disciplina: "Direito Administrativo",
      assunto: "Princípios",
      banca: "CEBRASPE",
      ano: 2024,
      tipo: "Certo/Errado",
      alternativas: {}
    }]
  );

  assert.equal(match.questionId, "Q2388736");
  assert.equal(match.optionCount, 5);
  assert.equal(match.detectedType, "multipla");
  assert.equal(match.marked, "A");
  assert.equal(match.officialKey, "D");
  assert.equal(match.status, "errado");
});

test("prévia sugere A–E pela captura sem alterar resposta, gabarito ou resultado", () => {
  const source = read("script.js");
  const context = {
    qbIsMultipleChoice: (question) => question?.tipo === "Múltipla escolha",
    qbCaptureImportDraft: null,
    qbQuestionById: () => null
  };
  vm.runInNewContext(between(source, "qbCaptureStoredType", "qbRenderCapturePreview"), context);

  const question = { tipo: "Certo/Errado", alternativas: {} };
  const match = { optionCount: 5, marked: "A", officialKey: "D", status: "errado" };
  assert.equal(context.qbCaptureSuggestedType(question, match), "multipla");
  assert.match(context.qbCaptureTypeNote(question, "multipla", match), /somente o tipo técnico/);
  assert.equal(match.marked, "A");
  assert.equal(match.officialKey, "D");
  assert.equal(match.status, "errado");
});

test("validação aceita FGV A–E confirmada e preserva Cebraspe C/E", () => {
  const source = read("script.js");
  const context = { QB_MARK_BLANK: "__blank__" };
  vm.runInNewContext(between(source, "qbCaptureChoiceKeys", "qbClearCaptureValidation"), context);

  const fgv = context.qbValidateCaptureRows([{
    displayIndex: 2,
    question: { id: "Q2388736" },
    questionId: "Q2388736",
    questionType: "multipla",
    marked: "A",
    officialKey: "D",
    status: "errado"
  }]);
  assert.equal(fgv, null);

  const cebraspe = context.qbValidateCaptureRows([{
    displayIndex: 1,
    question: { id: "QC-CE-1" },
    questionId: "QC-CE-1",
    questionType: "ce",
    marked: "C",
    officialKey: "E",
    status: "errado"
  }]);
  assert.equal(cebraspe, null);

  const wrongType = context.qbValidateCaptureRows([{
    displayIndex: 2,
    question: { id: "Q2388736" },
    questionId: "Q2388736",
    questionType: "ce",
    marked: "A",
    officialKey: "D",
    status: "errado"
  }]);
  assert.match(wrongType.message, /não corresponde ao tipo/);
  assert.equal(wrongType.field, "[data-qb-capture-marked]");
});

test("confirmação persiste somente a classificação técnica e mantém controles visíveis", () => {
  const script = read("script.js");
  const css = read("question-bank-capture-import-v182.css");
  const capture = read("qconcursos-capture-import-v182.js");

  assert.match(script, /data-qb-capture-type/);
  assert.match(script, /Tipo confirmado/);
  assert.match(script, /bankQuestion\.tipo = item\.tipo/);
  assert.match(script, /tipoConfirmadoPor = "captura-qconcursos"/);
  assert.doesNotMatch(script, /bankQuestion\.marcado\s*=/);
  assert.doesNotMatch(script, /bankQuestion\.status\s*=/);
  assert.match(capture, /detectedType/);
  assert.match(css, /\.qb-capture-type-note/);
});
