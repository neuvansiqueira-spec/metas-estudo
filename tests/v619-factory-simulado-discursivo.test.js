const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const rootPath = path.join(__dirname, "..", "factory-simulado-discursivo-v619.js");
const docsPath = path.join(__dirname, "..", "docs", "factory-simulado-discursivo-v619.js");
const loaderPath = path.join(__dirname, "..", "security-observability-v318.js");
const docsLoaderPath = path.join(__dirname, "..", "docs", "security-observability-v318.js");

const rootSource = fs.readFileSync(rootPath, "utf8");
const api = require(rootPath);
const date = new Date(2026, 8, 13);

test("V619 gera o modelo PC-MA 2026 com as fórmulas do edital da Cebraspe", () => {
  const prompt = api.buildPrompt({ banca: "CEBRASPE", modelo: "pcma26" }, date);
  assert.match(prompt, /PADRÃO CEBRASPE/);
  assert.match(prompt, /4 questões discursivas, até 15 linhas, 5,00 pontos cada/);
  assert.match(prompt, /peça prático-profissional, até 60 linhas, 20,00 pontos/);
  assert.match(prompt, /NQ = NC − NE ÷ TL/);
  assert.match(prompt, /NPP = NC − 4 × NE ÷ TL/);
  assert.match(prompt, /NPD ≥ 20,00/);
  assert.match(prompt, /QUESITOS AVALIADOS/);
  assert.match(prompt, /Data de referência: 13\/09\/2026/);
});

test("V619 gera o modelo PC-DF 2026 com multiplicadores próprios", () => {
  const prompt = api.buildPrompt({ banca: "CEBRASPE", modelo: "pcdf26" }, date);
  assert.match(prompt, /NQ = NC − 2 × NE ÷ TL/);
  assert.match(prompt, /NPP = NC − 6 × NE ÷ TL/);
  assert.match(prompt, /NPD ≥ 36,00/);
});

test("V619 gera o modelo PC-PR 2026 com espelho FGV e sorteio restrito às cautelares do edital", () => {
  const prompt = api.buildPrompt({ banca: "FGV", modelo: "pcpr26" }, date);
  assert.match(prompt, /PADRÃO FGV/);
  assert.match(prompt, /4 questões discursivas, até 20 linhas, 15 pontos cada/);
  assert.match(prompt, /peça prática-profissional, até 60 linhas, 40 pontos/);
  assert.match(prompt, /ESPELHO DE CORREÇÃO/);
  assert.match(prompt, /a FGV NÃO nomeia a peça/);
  assert.match(prompt, /extensão inferior ao mínimo ou superior ao máximo de linhas/);
  assert.match(prompt, /Escolha somente entre as medidas previstas no edital deste modelo/);
  assert.doesNotMatch(prompt, /NPP = NC/);
  const model = api.normalizeOptions({ banca: "FGV", modelo: "pcpr26" }).model;
  assert.deepEqual(api.pecasSorteio(model), ["preventiva", "temporaria", "busca", "interceptacao", "captacaoAmbiental", "quebraSigilo"]);
});

test("V619 oferece todas as peças, representações e administrativas, para escolha", () => {
  assert.deepEqual(api.pecaGrupos.map((grupo) => grupo.rotulo), ["Representações ao Judiciário", "Peças administrativas e procedimentais"]);
  for (const key of ["preventiva", "temporaria", "captacaoAmbiental", "infiltracao", "medidasProtetivas", "insanidadeMental", "portariaIp", "despachoApf", "relatorioFinal", "indiciamento", "tco", "fianca", "atoInfracional", "portariaPad"]) {
    assert.ok(api.pecas[key], key);
  }
  assert.ok(Object.keys(api.pecas).length >= 30);
});

test("V619 aceita qualquer peça e avisa quando ela está fora do edital do modelo", () => {
  assert.equal(api.normalizeOptions({ banca: "FGV", modelo: "pcpr26", peca: "relatorioFinal" }).peca, "relatorioFinal");
  const fora = api.buildPrompt({ banca: "FGV", modelo: "pcpr26", peca: "relatorioFinal" }, date);
  assert.match(fora, /Relatório final de inquérito policial/);
  assert.match(fora, /não está no rol do edital do modelo PC-PR 2026/);
  const dentro = api.buildPrompt({ banca: "FGV", modelo: "pcpr26", peca: "temporaria" }, date);
  assert.doesNotMatch(dentro, /não está no rol do edital/);
  assert.equal(api.normalizeOptions({ peca: "inexistente" }).peca, "sorteio");
});

test("V619 respeita composição, peça escolhida e tema", () => {
  const somentePeca = api.buildPrompt({ banca: "CEBRASPE", composicao: "peca", peca: "temporaria", tema: "Lei Maria da Penha" }, date);
  assert.match(somentePeca, /Composição: somente 1 peça prático-profissional/);
  assert.match(somentePeca, /Representação por prisão temporária/);
  assert.match(somentePeca, /Tema: Lei Maria da Penha/);
  assert.doesNotMatch(somentePeca, /- Questões:/);
  assert.doesNotMatch(somentePeca, /folhas de questão/);
  const somenteQuestoes = api.buildPrompt({ banca: "FGV", modelo: "pcpi25", composicao: "questoes" }, date);
  assert.match(somenteQuestoes, /não haverá peça neste simulado/);
  assert.doesNotMatch(somenteQuestoes, /- Peça: situação-problema/);
  assert.doesNotMatch(somenteQuestoes, /a PEÇA com/);
});

test("V619 pede o PDF das folhas de resposta com o timbre do Aldus no formato da banca", () => {
  const cebraspe = api.buildPrompt({ banca: "CEBRASPE", modelo: "pcma26" }, date);
  assert.match(cebraspe, /ARQUIVO PDF DAS FOLHAS DE RESPOSTA/);
  assert.match(cebraspe, /CADERNO DE TEXTOS DEFINITIVOS/);
  assert.match(cebraspe, /ALDUS META/);
  assert.match(cebraspe, /#0A2C66/);
  assert.match(cebraspe, /linhas numeradas de 1 a 15/);
  assert.match(cebraspe, /a PEÇA com 60 linhas numeradas em sequência contínua, em 2 página\(s\) de até 30 linhas \(linhas 1–30, 31–60\)/);
  assert.match(cebraspe, /ALDUS_Folhas_de_Resposta_CEBRASPE_PCMA26_13-09-2026\.pdf/);
  const fgv = api.buildPrompt({ banca: "FGV", modelo: "pcpi25" }, date);
  assert.match(fgv, /FOLHA DE TEXTOS DEFINITIVOS/);
  assert.match(fgv, /mínimo de 20 linhas/);
  assert.match(fgv, /em 4 página\(s\)/);
});

test("V619 exige leitura conferível, padrão fixado antes da nota e prova inédita", () => {
  for (const banca of ["CEBRASPE", "FGV"]) {
    const prompt = api.buildPrompt({ banca }, date);
    assert.match(prompt, /\[ilegível\]/);
    assert.match(prompt, /peça nova foto dessa página antes de corrigir/);
    assert.match(prompt, /Não ajuste o padrão ao que eu escrevi/);
    assert.match(prompt, /não reproduza nem adapte de perto questões reais/);
    assert.match(prompt, /Critério único de correção/);
  }
});

test("V619 não usa instruções que o ChatGPT já recusou", () => {
  for (const banca of ["CEBRASPE", "FGV"]) {
    const prompt = api.buildPrompt({ banca }, date);
    for (const forbidden of [/palavra por palavra/i, /literal/i, /canvas/i, /\bHTML\b/]) {
      assert.doesNotMatch(prompt, forbidden);
    }
  }
});

test("V619 mantém paridade raiz/docs e o loader publica o módulo", () => {
  assert.equal(rootSource, fs.readFileSync(docsPath, "utf8"));
  const loaderSource = fs.readFileSync(loaderPath, "utf8");
  assert.equal(loaderSource, fs.readFileSync(docsLoaderPath, "utf8"));
  assert.match(loaderSource, /installFactorySimuladoDiscursivoV619\(\);/);
  assert.match(loaderSource, new RegExp(`factory-simulado-discursivo-v619\\.js\\?v=${api.version}`));
});

test("V619 não adiciona hot paths nem persistência", () => {
  for (const forbidden of [
    "MutationObserver(",
    "setInterval(",
    "setTimeout(",
    "getComputedStyle(",
    "requestAnimationFrame(",
    "indexedDB.",
    "localStorage.",
    "saveData(",
    "autoSyncAfterSave("
  ]) {
    assert.equal(rootSource.includes(forbidden), false, `token proibido: ${forbidden}`);
  }
});
