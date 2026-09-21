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
  assert.match(rootScript, /REGRA DE REAPROVEITAMENTO E COMPLEMENTAÇÃO JURISPRUDENCIAL — A TRIAGEM É PONTO DE PARTIDA, NÃO TETO/);
});

test("V635: a V632 não declara prevalência nem dispensa a busca da V380", () => {
  for (const removido of [
    /PREVALECE sobre qualquer instrução anterior/,
    /Não refaça inventário geral de STF\/STJ/,
    /BUSCA COMPLEMENTAR SOMENTE SE HOUVER LACUNA CONCRETA/,
    /encerre a busca assim que a lacuna estiver resolvida/,
    /Abra somente as fontes jurisprudenciais já aprovadas na TRIAGEM/,
    /Não faça inventário recursivo completo por padrão/,
    /nova varredura ampla foi desativada/
  ]) {
    assert.doesNotMatch(rootScript, removido);
  }
  assert.match(rootScript, /não substitui, não reduz e não prevalece sobre a metodologia de busca do módulo integrado/);
});

test("V635: triagem é ponto de partida e a complementação é obrigatória", () => {
  assert.match(rootScript, /1\. REUTILIZE TUDO O QUE JÁ FOI ENCONTRADO/);
  assert.match(rootScript, /2\. VERIFIQUE A COBERTURA JURISPRUDENCIAL MATERIAL DO TEMA/);
  assert.match(rootScript, /3\. CONSULTE O ÍNDICE DA PASTA JURISPRUDENCIAL/);
  assert.match(rootScript, /4\. IDENTIFIQUE A JURISPRUDÊNCIA PERTINENTE AINDA AUSENTE/);
  assert.match(rootScript, /5\. COMPLEMENTE OBRIGATORIAMENTE QUANDO HOUVER LACUNA/);
  assert.match(rootScript, /significa somente cobertura material suficiente de TODOS os institutos e subtemas/);
  assert.match(rootScript, /Haver alguma jurisprudência no pacote ou na TRIAGEM não torna a cobertura suficiente/);
  assert.match(rootScript, /só declare ausência de jurisprudência diretamente relevante depois da varredura recursiva completa/);
});

test("V635: reaproveitamento sem releitura repetida e sem perda de qualidade", () => {
  assert.match(rootScript, /Não reabra nem releia arquivo já examinado nesta conversa/);
  assert.match(rootScript, /A otimização elimina repetição de busca e de leitura, não conteúdo jurídico/);
  assert.match(rootScript, /Não omita tese relevante, requisito, condição, exceção, distinção, divergência ou evolução/);
});
