const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const rootScript = fs.readFileSync("factory-juris-reuse-v632.js", "utf8");
const docsScript = fs.readFileSync("docs/factory-juris-reuse-v632.js", "utf8");
const rootHtml = fs.readFileSync("index.html", "utf8");
const docsHtml = fs.readFileSync("docs/index.html", "utf8");

test("V632 mantém integração espelhada entre raiz e docs", () => {
  assert.equal(rootScript, docsScript);
  assert.equal(rootHtml, docsHtml);
});

test("V632 carrega depois dos bridges V630 e V631", () => {
  const v630 = rootHtml.indexOf("factory-drive-bridge-v630.js");
  const v631 = rootHtml.indexOf("factory-drive-bridge-v631.js");
  const v632 = rootHtml.indexOf("factory-juris-reuse-v632.js");
  assert.ok(v630 >= 0);
  assert.ok(v631 > v630);
  assert.ok(v632 > v631);
});

test("V632 atua somente no Resumo/Aula + Jurisprudência", () => {
  assert.match(rootScript, /const TARGET_TYPE = "resumoAulaJurisprudencia"/);
  assert.match(rootScript, /type !== TARGET_TYPE/);
  assert.match(rootScript, /REGRA ESPECIAL DE DESEMPENHO — REAPROVEITAMENTO DA TRIAGEM JURISPRUDENCIAL/);
});

test("V632 substitui a varredura completa por reuso e busca complementar dirigida", () => {
  assert.match(rootScript, /PREVALECE sobre qualquer instrução anterior/);
  assert.match(rootScript, /Não refaça inventário geral de STF\/STJ/);
  assert.match(rootScript, /BUSCA COMPLEMENTAR SOMENTE SE HOUVER LACUNA CONCRETA/);
  assert.match(rootScript, /encerre a busca assim que a lacuna estiver resolvida/);
});

test("V632 preserva qualidade jurídica", () => {
  assert.match(rootScript, /A otimização elimina repetição de busca, não conteúdo jurídico/);
  assert.match(rootScript, /Não omita tese relevante, requisito, condição, exceção, distinção ou evolução/);
});