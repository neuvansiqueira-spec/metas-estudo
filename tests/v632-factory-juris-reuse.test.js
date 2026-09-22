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
  assert.match(rootScript, /if \(type === TARGET_TYPE\) append\(id\)/);
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

// V636: pacote jurisprudencial do índice local (bridge /jurisprudencia), fora do top-10.
const vm = require("node:vm");
function carregaV632() {
  const ctx = vm.createContext({ console, CSS: { escape: (x) => x }, queueMicrotask, setTimeout, clearTimeout });
  ctx.window = ctx;
  ctx.document = { readyState: "complete", addEventListener() {}, querySelector() { return null; } };
  vm.runInContext(rootScript, ctx);
  return vm.runInContext("window.__ALDUS_FACTORY_JURIS_REUSE_V632__", ctx);
}

test("V636: pacote vale para os três prompts com jurisprudência e usa o endpoint próprio", () => {
  const api = carregaV632();
  assert.deepEqual([...api.pacoteTypes], ["resumoAulaJurisprudencia", "leiJurisprudencia", "jurisprudencia"]);
  assert.match(rootScript, /\/jurisprudencia`/);
  assert.doesNotMatch(rootScript, /fetch\([^)]*\/search/);
  assert.match(rootScript, /if \(!id \|\| !PACOTE_TYPES\.includes\(type\)\) return;/);
});

test("V636: pacote lista todos os pertinentes, manda examinar todos e não vira teto", () => {
  const api = carregaV632();
  const item = (n) => ({ tribunal: "STJ", informativo: String(600 + n), nome: `STJ - 2017 - Informativo ${600 + n}.pdf`, link: `https://x/${n}`,
    por_expressao: { desaforamento: 3 }, sinais: { precedente: "hc 374.713" }, trechos: ["t".repeat(400), "u".repeat(400)] });
  const texto = api.buildJurisPackage({ analisados: 970, expressoes_do_tema: ["desaforamento"], pertinentes: 2, itens: [item(5), item(68)] });
  assert.match(texto, /PACOTE JURISPRUDENCIAL DO ÍNDICE LOCAL — PASTA EXCLUSIVA STF\/STJ/);
  assert.match(texto, /examine TODOS os informativos listados/);
  assert.match(texto, /O pacote NÃO é teto/);
  assert.match(texto, /1\. STJ — Informativo 605/);
  assert.match(texto, /2\. STJ — Informativo 668/);
  assert.match(texto, /Evidência: desaforamento 3 · sinais: hc 374\.713/);
  assert.match(texto, /FIM DO PACOTE JURISPRUDENCIAL DO ÍNDICE LOCAL$/);
});

test("V636: sem julgado no índice, o pacote não inventa e manda buscar por instituto", () => {
  const api = carregaV632();
  const texto = api.buildJurisPackage({ analisados: 970, expressoes_do_tema: ["classificacoes das constituicoes"], pertinentes: 0, itens: [] });
  assert.match(texto, /NÃO prova ausência de jurisprudência/);
  assert.doesNotMatch(texto, /Informativo \d/);
});

test("V636: acima do limite técnico, os itens restantes continuam listados (sem trechos)", () => {
  const api = carregaV632();
  const itens = Array.from({ length: 120 }, (_, i) => ({ tribunal: "STF", informativo: String(800 + i), nome: `STF - Informativo ${800 + i}.pdf`,
    link: `https://x/${i}`, por_expressao: { "tribunal do juri": 2 }, sinais: {}, trechos: ["a".repeat(420), "b".repeat(420)] }));
  const texto = api.buildJurisPackage({ analisados: 970, expressoes_do_tema: ["tribunal do juri"], pertinentes: 120, itens });
  assert.match(texto, /Demais \d+ informativo\(s\) pertinente\(s\), listados sem trechos/);
  assert.match(texto, /120\. STF — Informativo 919/);
  assert.ok(texto.length < 60000, `bloco com ${texto.length} caracteres`);
});
