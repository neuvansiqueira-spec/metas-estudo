import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const read = (file) => fs.readFileSync(file, "utf8");

function item(str, x, y) {
  return { str, transform: [1, 0, 0, 1, x, y] };
}

function parserApi() {
  const context = { globalThis: {} };
  context.globalThis = context;
  vm.runInNewContext(read("qconcursos-pdf-import-v181.js"), context);
  return context.AldusQconcursosPdfImport;
}

test("parser local identifica múltipla escolha, C/E, metadados e gabarito", () => {
  const page = [
    item("Ano:", 37, 745), item("2026", 57, 745), item("Banca:", 85, 745), item("Banca Exemplo", 113, 745),
    item("Órgão:", 191, 745), item("Órgão Exemplo", 219, 745), item("Prova:", 300, 745), item("Banca Exemplo - 2026 - Órgão Exemplo - Cargo", 340, 745),
    item("1", 53, 760), item("Q1001", 83, 760), item("Disciplina Exemplo", 130, 760), item(">", 260, 760), item("Assunto Exemplo", 270, 760),
    item("Enunciado sintético de múltipla escolha.", 37, 720),
    item("A", 41, 680), item("Opção sintética A.", 61, 680),
    item("B", 41, 650), item("Opção sintética B.", 61, 650),
    item("C", 41, 620), item("Opção sintética C.", 61, 620),
    item("D", 41, 590), item("Opção sintética D.", 61, 590),
    item("E", 41, 560), item("Opção sintética E.", 61, 560),
    item("2", 53, 400), item("Q1002", 83, 400), item("Disciplina Exemplo", 130, 400), item(">", 260, 400), item("Outro assunto", 270, 400),
    item("Ano:", 37, 385), item("2025", 57, 385), item("Banca:", 85, 385), item("Outra Banca", 113, 385),
    item("Órgão:", 191, 385), item("Outro Órgão", 219, 385), item("Prova:", 300, 385), item("Outra Banca - 2025 - Outro Órgão - Cargo", 340, 385),
    item("Enunciado sintético de certo ou errado.", 37, 350),
    item("Certo", 41, 300), item("Errado", 41, 270),
    item("Respostas", 60, 150),
    item("1:", 61, 130), item("B", 72, 130),
    item("2:", 93, 130), item("C", 104, 130)
  ];

  const questions = parserApi().parsePages([page]);
  assert.equal(questions.length, 2);
  assert.deepEqual(Array.from(questions, (question) => question.id), ["Q1001", "Q1002"]);
  assert.equal(questions[0].tipo, "Múltipla escolha");
  assert.equal(Object.keys(questions[0].alternativas).length, 5);
  assert.equal(questions[0].gabarito, "B");
  assert.equal(questions[1].tipo, "Certo/Errado");
  assert.equal(questions[1].gabarito, "C");
  assert.equal(questions[0].qcDisciplina, "Disciplina Exemplo");
  assert.equal(questions[0].qcAssunto, "Assunto Exemplo");
  assert.equal(questions[0].banca, "Banca Exemplo");
});

test("interface oferece prévia, vínculo análogo e deduplicação sem remover JSON manual", () => {
  const html = read("index.html");
  const script = read("script.js");
  const build = read("build-bundles.mjs");
  const worker = read("service-worker.js");

  for (const id of [
    "qbPdfFile", "qbPdfImportPreview", "qbPdfImportStats", "qbPdfSyllabusItem",
    "qbPdfMappingType", "qbPdfPreviewList", "qbPdfImportConfirm", "qbFile"
  ]) assert.match(html, new RegExp(`id="${id}"`));

  assert.match(html, /Disciplina ou assunto análogo/);
  assert.match(script, /function qbPdfExistingIds/);
  assert.match(script, /filter\(\(question\)=>!existing\.has\(canonical\(question\.id\)\)\)/);
  assert.match(script, /const QB_MARK_BLANK = "__blank__"/);
  assert.match(script, /function qbIsMultipleChoice/);
  assert.match(script, /Object\.keys\(q\?\.alternativas \|\| \{\}\)/);
  assert.match(script, /if \(qbIsMultipleChoice\(q\)\) return keys\.length \? keys : \["A","B","C","D","E"\]/);
  assert.match(build, /qconcursos-pdf-import-v181\.js/);
  assert.match(build, /question-bank-pdf-import-v181\.css/);
  assert.match(worker, /vendor\/pdf\.worker\.mjs/);
});
