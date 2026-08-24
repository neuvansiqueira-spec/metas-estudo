const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const runtime = fs.readFileSync('factory-lei-jurisprudencia-v383.js', 'utf8');
const docsRuntime = fs.readFileSync('docs/factory-lei-jurisprudencia-v383.js', 'utf8');
const security = fs.readFileSync('security-observability-v318.js', 'utf8');
const docsSecurity = fs.readFileSync('docs/security-observability-v318.js', 'utf8');

test('V383 cria o tipo independente Lei + Jurisprudência', () => {
  assert.match(runtime, /const TYPE_KEY = "leiJurisprudencia"/);
  assert.match(runtime, /Gerar prompt Lei \+ Jurisprudência/);
  assert.match(runtime, /MÓDULO INTEGRADO — LEI \+ JURISPRUDÊNCIA/);
  assert.match(runtime, /LEI permanece como estrutura-mãe/);
  assert.match(runtime, /CADA ARTIGO CONTINUA SENDO A UNIDADE CENTRAL OBRIGATÓRIA/);
});

test('V383 remove conflitos do prompt Lei sem transformar o produto em dois módulos', () => {
  assert.match(runtime, /PRODUZA SOMENTE O MÓDULO INTEGRADO LEI \+ JURISPRUDÊNCIA/);
  assert.match(runtime, /A JURISPRUDÊNCIA É ADMITIDA EXCLUSIVAMENTE COMO CAMADA INTEGRADA/);
  assert.match(runtime, /NÃO GERE UM MÓDULO DE JURISPRUDÊNCIA SEPARADO/);
  assert.match(runtime, /NÃO CONSOLIDE COM RESUMO\/AULA OU PEÇA E NÃO GERE UM SEGUNDO MÓDULO AUTÔNOMO DE JURISPRUDÊNCIA/);
  assert.match(runtime, /RESUMO_TOPIFICADO_LEI_JURISPRUDENCIA_/);
});

test('V383 integra jurisprudência junto do dispositivo legal e cria quadro final sem duplicação', () => {
  assert.match(runtime, /JUNTO DO ARTIGO, PARÁGRAFO, INCISO OU BLOCO NORMATIVO/);
  assert.match(runtime, /DEPOIS da topificação normativa do dispositivo e ANTES do PONTO DE PROVA/);
  assert.match(runtime, /⚖️ \*\*JURISPRUDÊNCIA — TESE:\*\*/);
  assert.match(runtime, /♦️ \*\*⚖️ QUADRO FINAL DE JURISPRUDÊNCIA\*\*/);
  assert.match(runtime, /NÃO reproduza integralmente os blocos jurisprudenciais anteriores/);
});

test('V383 protege a categoria PEÇA e não converte tema prático em Lei + Jurisprudência', () => {
  assert.match(runtime, /ESTE MODO NÃO É PEÇA/);
  assert.match(runtime, /Se o tema estiver classificado na organização da Fábrica como PEÇA, interrompa este modo/);
  assert.match(runtime, /A mera existência de artigos de lei relacionados ao assunto NÃO autoriza converter um tema de PEÇA/);
  assert.match(runtime, /se o tema pertencer à categoria PEÇA, não o converta em LEI \+ JURISPRUDÊNCIA/);
});

test('V383 usa a cobertura jurisprudencial forte e exclusiva', () => {
  assert.match(runtime, /1ECc_otgQKwH7WfPdQr8CtD0kB07pz9Xe/);
  assert.match(runtime, /JULGADOS STF RESUMIDOS/);
  assert.match(runtime, /JULGADOS STJ RESUMIDOS/);
  assert.match(runtime, /percorra recursivamente a pasta jurisprudencial e suas subpastas/);
  assert.match(runtime, /sinônimos, siglas, abreviações e variações terminológicas/);
  assert.match(runtime, /sem quantidade máxima arbitrária/);
  assert.match(runtime, /NÃO use internet, memória do modelo/);
  assert.match(runtime, /não invente número de processo, súmula, tema, repetitivo, informativo/);
});

test('V383 inclui sumário didático coerente com a arquitetura da Lei', () => {
  assert.match(runtime, /SUMÁRIO DIDÁTICO DO LEI \+ JURISPRUDÊNCIA/);
  assert.match(runtime, /🔷 \*\*TÍTULO \[NÚMERO\] — \[NOME\]\*\*/);
  assert.match(runtime, /♦️ \*\*CAPÍTULO \[NÚMERO\] — \[NOME\]\*\*/);
  assert.match(runtime, /▶️ \*\*SEÇÃO \[NÚMERO\] — \[NOME\]\*\*/);
  assert.match(runtime, /✅ \*\*ART\. \[NÚMERO\]: \[SÍNTESE FUNCIONAL\]\.\*\*/);
  assert.match(runtime, /NÃO crie entrada independente para cada linha ⚖️ JURISPRUDÊNCIA/);
  assert.match(runtime, /NUNCA justifique os parágrafos do sumário/);
  assert.match(runtime, /líder pontilhado/);
  assert.match(runtime, /hiperlinks internos/);
});

test('V383 preserva performance e é carregada isoladamente', () => {
  for (const forbidden of [
    'MutationObserver',
    'setInterval(',
    'getComputedStyle(',
    'requestAnimationFrame(',
    'indexedDB',
    'localStorage',
    'saveData('
  ]) {
    assert.equal(runtime.includes(forbidden), false, `não deve conter ${forbidden}`);
  }

  assert.match(runtime, /=== "fabrica-resumos"/);
  assert.match(security, /function installFactoryLeiJurisprudenciaV383\(\)/);
  assert.match(security, /factory-lei-jurisprudencia-v383\.js\?v=20260824-factory-lei-jurisprudencia-v383/);
  assert.match(security, /installFactoryLeiJurisprudenciaV383\(\);/);
  assert.equal(runtime, docsRuntime, 'runtime V383 deve permanecer idêntico entre raiz e docs');
  assert.equal(security, docsSecurity, 'loader deve permanecer idêntico entre raiz e docs');
});
