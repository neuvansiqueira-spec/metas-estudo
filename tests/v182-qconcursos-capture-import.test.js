import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const read = (file) => fs.readFileSync(file, "utf8");

function captureApi() {
  const context = { globalThis: {} };
  context.globalThis = context;
  vm.runInNewContext(read("qconcursos-capture-import-v182.js"), context);
  return context.AldusQconcursosCaptureImport;
}

test("leitura visual sintética identifica cinco marcações sem depender de OCR", () => {
  const width = 162;
  const height = 6729;
  const data = new Uint8ClampedArray(width * height * 4);
  data.fill(255);

  const drawCircleBand = (startY, filled) => {
    for (let y = startY; y < startY + 22; y += 1) {
      for (let x = 25; x < 25 + (filled ? 22 : 3); x += 1) {
        const offset = (y * width + x) * 4;
        data[offset] = 245;
        data[offset + 1] = 125;
        data[offset + 2] = 35;
      }
    }
  };

  const selected = [4, 0, 2, 2, 2];
  [500, 1300, 2100, 2900, 3700].forEach((base, questionIndex) => {
    for (let optionIndex = 0; optionIndex < 5; optionIndex += 1) {
      drawCircleBand(base + optionIndex * 50, optionIndex === selected[questionIndex]);
    }
  });

  const results = captureApi().analyzeImageData({ data, width, height }, 1896, 8205);
  assert.deepEqual(Array.from(results, (result) => result.marked), ["E", "A", "C", "C", "C"]);
  assert.ok(results.every((result) => result.confidence === "alta"));
});

test("OCR sintético identifica acertos, erros, gabaritos e resumo visível", () => {
  const text = `
    Questão sintética sobre princípio alfa.
    Parabéns! Você acertou!
    Questão sintética sobre princípio beta.
    Incorreta. Gabarito oficial da banca: D
    Questão sintética sobre princípio gama.
    Incorreta. Gabarito oficial da banca: A
    Resumo relacionado
    Síntese explicativa curta para revisão.
    Ano: 2026
    Questão sintética sobre princípio delta.
    Parabéns! Você acertou!
    Questão sintética sobre princípio épsilon.
    Parabéns! Você acertou!
  `;
  const api = captureApi();
  const parsed = api.parseOcrText(text);
  const questions = ["alfa", "beta", "gama", "delta", "épsilon"].map((subject, index) => ({
    id: `Q${index + 1}`,
    disciplina: "Disciplina sintética",
    assunto: subject,
    enunciado: `Questão sintética sobre princípio ${subject}.`,
    gabarito: ["E", "D", "A", "C", "C"][index]
  }));
  const visual = ["E", "A", "C", "C", "C"].map((marked) => ({ marked, confidence: "alta" }));
  const matches = api.matchResults(parsed, visual, questions);

  assert.equal(parsed.length, 5);
  assert.deepEqual(Array.from(parsed, (result) => result.status), ["certo", "errado", "errado", "certo", "certo"]);
  assert.deepEqual(Array.from(parsed, (result) => result.officialKey), ["", "D", "A", "", ""]);
  assert.match(parsed[2].comment, /Síntese explicativa curta/);
  assert.deepEqual(Array.from(matches, (result) => result.questionId), ["Q1", "Q2", "Q3", "Q4", "Q5"]);
  assert.deepEqual(Array.from(matches, (result) => result.marked), ["E", "A", "C", "C", "C"]);
});

test("interface exige prévia, preserva importações existentes e carrega OCR apenas sob demanda", () => {
  const html = read("index.html");
  const script = read("script.js");
  const build = read("build-bundles.mjs");
  const capture = read("qconcursos-capture-import-v182.js");

  for (const id of [
    "qbCaptureFile", "qbCaptureDate", "qbCaptureStatus", "qbCaptureProgress",
    "qbCapturePreview", "qbCaptureStats", "qbCapturePreviewList",
    "qbCaptureConfirm", "qbCaptureCancel", "qbPdfFile", "qbFile"
  ]) assert.match(html, new RegExp(`id="${id}"`));

  assert.match(html, /Nada será salvo antes da confirmação/);
  assert.match(html, /Envie o PNG diretamente, sem compactar/);
  assert.match(script, /sourceFingerprint/);
  assert.match(script, /Esta captura já foi registrada anteriormente/);
  assert.match(script, /origin: "qconcursos-captura"/);
  assert.match(script, /qbSaveNotebookItems\(enriched\.filter/);
  assert.match(script, /comentarioQc/);
  assert.match(build, /qconcursos-capture-import-v182\.js/);
  assert.match(build, /question-bank-capture-import-v182\.css/);
  assert.doesNotMatch(html, /tesseract\.min\.js/);
  assert.match(capture, /cdn\.jsdelivr\.net\/npm\/tesseract\.js@7/);
});
