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

// 23/09/2026: dois Words saíram fora do padrão visual. O prompt combinado tinha congelado na versão
// de quando foi criado — só era gravado se ainda não existisse — e não recebia as correções do RESUMO/AULA.
function montarContexto(promptSalvo) {
  const vm = require('node:vm');
  const ctx = {
    console,
    setTimeout: (fn) => { fn(); return 0; },
    location: { hash: '' },
    document: {
      readyState: 'complete', addEventListener() {}, getElementById: () => null,
      createElement: () => ({ setAttribute() {}, appendChild() {}, style: {} }),
      head: { appendChild() {} }, querySelector: () => null
    },
    state: {
      factoryPromptLibrary: {
        resumoAula: 'TRANSFORME AS FONTES CLASSIFICADAS COMO RESUMO/AULA\n\n### VALORES FIXOS DO WORD\n\nFONTE ARIAL, TAMANHO 11.',
        resumoAulaJurisprudencia: promptSalvo
      },
      migrations: { factoryResumoAulaJurisprudenciaV380: '2026-08-24T00:00:00.000Z' }
    },
    defaultFactoryPromptLibrary: { resumoAula: 'base', resumoAulaJurisprudencia: 'base' },
    FACTORY_PROMPT_TYPES: [{ key: 'resumoAula', label: 'Gerar prompt Resumo/Aula' }],
    factoryRouterText: () => '',
    addEventListener() {}
  };
  ctx.window = ctx; ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext(runtime, ctx);
  ctx.__aldusFactoryResumoAulaJurisprudenciaV380.install();
  return ctx;
}

test('V380 refaz o prompt combinado quando o RESUMO/AULA é corrigido, guardando o anterior', () => {
  const antigo = 'PROMPT ANTIGO SEM OS VALORES FIXOS\n\nQUADRO FINAL DE JURISPRUDÊNCIA';
  const ctx = montarContexto(antigo);
  const atual = ctx.state.factoryPromptLibrary.resumoAulaJurisprudencia;
  assert.notEqual(atual, antigo, 'o prompt congelado tem de ser refeito');
  assert.match(atual, /VALORES FIXOS DO WORD/, 'a correção do RESUMO/AULA precisa chegar ao combinado');
  assert.match(atual, /QUADRO FINAL DE JURISPRUDÊNCIA/, 'a camada de jurisprudência continua');
  assert.equal(ctx.state.factoryPromptLibraryBackups.resumoAulaJurisprudenciaBeforeValoresFixos20260923, antigo);
});

test('V380 não toca em prompt que não foi montado por ele', () => {
  const dele = 'PROMPT ESCRITO POR MIM, SEM A SEÇÃO DO MÓDULO.';
  const ctx = montarContexto(dele);
  assert.equal(ctx.state.factoryPromptLibrary.resumoAulaJurisprudencia, dele);
  assert.equal(ctx.state.factoryPromptLibraryBackups, undefined);
});
