const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const rootScript = fs.readFileSync("factory-drive-bridge-v631.js", "utf8");
const docsScript = fs.readFileSync("docs/factory-drive-bridge-v631.js", "utf8");
const rootHtml = fs.readFileSync("index.html", "utf8");
const docsHtml = fs.readFileSync("docs/index.html", "utf8");

test("V631 mantém raiz e docs espelhados", () => {
  assert.equal(rootScript, docsScript);
  assert.equal(rootHtml, docsHtml);
});

test("V631 é carregado depois do bridge V630", () => {
  const oldPos = rootHtml.indexOf("factory-drive-bridge-v630.js");
  const newPos = rootHtml.indexOf("factory-drive-bridge-v631.js");
  assert.ok(oldPos >= 0);
  assert.ok(newPos > oldPos);
});

test("V631 atua somente no prompt Resumo/Aula", () => {
  assert.match(rootScript, /info\.type !== "resumoAula"/);
  assert.match(rootScript, /PACOTE LOCAL PARA RESUMO\/AULA — GOOGLE DRIVE/);
  assert.match(rootScript, /data-factory-prompt-copy/);
  assert.match(rootScript, /sessionStorage\.setItem/);
});

test("V631 preserva a qualidade e não transforma 10 candidatos em limite absoluto", () => {
  assert.match(rootScript, /NÃO é limite absoluto/);
  assert.match(rootScript, /Não sacrifique profundidade, completude, fidelidade documental ou qualidade/);
  assert.match(rootScript, /Respeite a classificação final da TRIAGEM/);
});

test("V631 mantém o prompt original quando não encontra a pré-triagem", () => {
  assert.match(rootScript, /Pré-triagem local não encontrada nesta sessão\. Prompt original mantido\./);
});