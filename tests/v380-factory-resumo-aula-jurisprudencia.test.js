const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const runtime = fs.readFileSync('factory-resumo-aula-jurisprudencia-v380.js', 'utf8');
const docsRuntime = fs.readFileSync('docs/factory-resumo-aula-jurisprudencia-v380.js', 'utf8');
const security = fs.readFileSync('security-observability-v318.js', 'utf8');
const docsSecurity = fs.readFileSync('docs/security-observability-v318.js', 'utf8');

test('V380 cria um tipo independente de prompt Resumo/Aula + Jurisprudência', () => {
  assert.match(runtime, /resumoAulaJurisprudencia/);
  assert.match(runtime, /Gerar prompt Resumo\/Aula \+ Jurisprudência/);
  assert.match(runtime, /MÓDULO INTEGRADO — RESUMO\/AULA \+ JURISPRUDÊNCIA/);
  assert.match(runtime, /ESTE MODO NÃO É PEÇA/);
  assert.doesNotMatch(runtime, /FACTORY_MODULES/);
});

test('V380 mantém a aula como estrutura e integra jurisprudência no ponto material correto', () => {
  assert.match(runtime, /mantendo a arquitetura, a profundidade, a hierarquia e a identidade visual do MÓDULO RESUMO\/AULA/);
  assert.match(runtime, /prioritariamente JUNTO DO ASSUNTO MATERIAL AO QUAL PERTENCE/);
  assert.match(runtime, /⚖️ \*\*JURISPRUDÊNCIA — TESE:\*\*/);
  assert.match(runtime, /♦️ \*\*⚖️ QUADRO FINAL DE JURISPRUDÊNCIA\*\*/);
  assert.match(runtime, /NÃO reproduza integralmente os blocos jurisprudenciais anteriores/);
  assert.match(runtime, /faixa azul-clara permanece EXCLUSIVA dos cabeçalhos ▶️📚/);
});

test('V380 reaproveita a cobertura jurisprudencial forte sem usar fontes externas', () => {
  assert.match(runtime, /1ECc_otgQKwH7WfPdQr8CtD0kB07pz9Xe/);
  assert.match(runtime, /JULGADOS STF RESUMIDOS/);
  assert.match(runtime, /JULGADOS STJ RESUMIDOS/);
  assert.match(runtime, /percorra recursivamente a pasta jurisprudencial e suas subpastas/);
  assert.match(runtime, /pesquise sinônimos, abreviações, variações terminológicas/);
  assert.match(runtime, /inclua todos os entendimentos materialmente relevantes, sem estabelecer quantidade máxima arbitrária/);
  assert.match(runtime, /NÃO use internet, memória do modelo/);
  assert.match(runtime, /não invente número de processo, súmula, tema, repetitivo, informativo/);
});

test('V380 evita custo contínuo e só redesenha a Fábrica quando ela está aberta', () => {
  assert.doesNotMatch(runtime, /MutationObserver/);
  assert.doesNotMatch(runtime, /setInterval\s*\(/);
  assert.doesNotMatch(runtime, /getComputedStyle\s*\(/);
  assert.doesNotMatch(runtime, /requestAnimationFrame\s*\(/);
  assert.doesNotMatch(runtime, /saveData\s*\(/);
  assert.match(runtime, /=== "fabrica-resumos"/);
  assert.match(runtime, /addEventListener\("load", installWhenApplicationIsReady, \{ once: true \}\)/);
});

test('V380 é carregada isoladamente pelo observability sem alterar o bundle principal', () => {
  assert.match(security, /function installFactoryResumoAulaJurisprudenciaV380\(\)/);
  assert.match(security, /factory-resumo-aula-jurisprudencia-v380\.js\?v=20260824-factory-resumo-aula-jurisprudencia-v380/);
  assert.match(security, /script\.async = false/);
  assert.equal(runtime, docsRuntime, 'runtime V380 deve permanecer idêntico entre raiz e docs');
  assert.equal(security, docsSecurity, 'security-observability deve permanecer idêntico entre raiz e docs');
});
