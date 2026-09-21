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

// V635 (21/09): Planalto obrigatório e verificável no LEI e no LEI + JURISPRUDÊNCIA,
// sem alterar a TRIAGEM nem os demais tipos.
const vm = require('node:vm');

function harnessV635() {
  const context = vm.createContext({ console });
  vm.runInContext(`
    const FACTORY_PROMPT_TYPES = [{ key: 'triagem' }, { key: 'lei' }];
    const defaultFactoryPromptLibrary = {};
    const FACTORY_DOCX_EMOJI_FONT_INSTRUCTIONS = 'EMOJIS';
    let state = { migrations: {}, factoryPromptLibrary: {} };
    const LEI_BASE = 'TRANSFORME A LEI EM RESUMO TOPIFICADO.\\n\\nFONTE: use somente o texto oficial vigente do Planalto.\\n\\nTOPO DO DOCUMENTO:\\n📘 LEI Nº [NÚMERO/ANO]\\n📍 [NOME DA LEI / ASSUNTO]\\n📍 FONTE: PLANALTO\\n\\nORGANIZAÇÃO: artigo por artigo.';
    const COMMON = 'Disciplina: X\\nTema: Y\\nPASTA DAS FONTES NO GOOGLE DRIVE:\\nhttps://drive.google.com/drive/folders/pasta\\nFontes a usar: conforme a triagem e as fontes classificadas para este módulo.\\nFontes a não usar: fontes de outros módulos, conteúdo externo não fornecido e materiais não aprovados na triagem.\\nRegras específicas do tema/módulo: nenhuma.';
    function factoryRouterText(type) {
      if (type === 'triagem') return 'ROTEADOR DA TRIAGEM INTACTO\\nFontes a não usar: conteúdo externo, arquivos de outras pastas.';
      if (type === 'lei') return COMMON + '\\n\\nMÓDULO: LEI.\\nUse as fontes classificadas como LEI na triagem para identificar o diploma e o recorte. Confira o conteúdo normativo exclusivamente no texto oficial vigente do Planalto.\\n\\nENTREGA OBRIGATÓRIA DESTA ETAPA:\\n- gerar somente o Word do módulo LEI;';
      return COMMON + '\\n\\nMÓDULO: ' + type;
    }
    function factoryPromptBase(type) {
      if (type === 'lei') return LEI_BASE;
      if (type === 'triagem') return 'TRIAGEM INTACTA';
      return '';
    }
  `, context);
  vm.runInContext(fs.readFileSync('factory-lei-jurisprudencia-v383.js', 'utf8'), context);
  const result = vm.runInContext('__aldusFactoryLeiJurisprudenciaV383.install()', context);
  assert.equal(result.installed, true);
  return context;
}

test('V635: roteador do LEI exige o Planalto e resolve o conflito com conteúdo externo', () => {
  const context = harnessV635();
  for (const type of ['lei', 'leiJurisprudencia']) {
    const router = vm.runInContext(`factoryRouterText(${JSON.stringify(type)}, {})`, context);
    assert.equal(router.split('REGRA OBRIGATÓRIA DO MÓDULO LEI — FONTE NORMATIVA OFICIAL (PLANALTO)').length - 1, 1, type);
    assert.match(router, /EXCEÇÃO OFICIAL E OBRIGATÓRIA DESTE MÓDULO: a consulta ao site oficial do Planalto é exigida/);
    assert.match(router, /Fontes a usar: para o TEXTO NORMATIVO, obrigatoriamente o texto oficial vigente no site do Planalto/);
    assert.match(router, /FLUXO OBRIGATÓRIO:/);
    assert.match(router, /📍 FONTE OFICIAL: \[URL exata da página do Planalto efetivamente consultada\]/);
    assert.match(router, /📅 CONSULTA AO PLANALTO: \[data da consulta, DD\/MM\/AAAA\]/);
    assert.match(router, /prevalece o Planalto na redação da norma/);
    assert.match(router, /⚠️ TEXTO OFICIAL NÃO CONFIRMADO NO PLANALTO/);
    assert.match(router, /PDF, apostila ou resumo do Drive nunca é fonte oficial da redação da lei/);
    assert.doesNotMatch(router, /Confira o conteúdo normativo exclusivamente/);
    assert.ok(router.indexOf('REGRA OBRIGATÓRIA DO MÓDULO LEI') < router.indexOf('ENTREGA OBRIGATÓRIA DESTA ETAPA'), type);
  }
});

test('V635: prompt-base do LEI troca a linha fixa "FONTE: PLANALTO" por URL e data da consulta', () => {
  const context = harnessV635();
  for (const type of ['lei', 'leiJurisprudencia']) {
    const base = vm.runInContext(`factoryPromptBase(${JSON.stringify(type)})`, context);
    assert.doesNotMatch(base, /^📍 FONTE: PLANALTO\s*$/m, type);
    assert.match(base, /📍 FONTE OFICIAL: \[URL EXATA DA PÁGINA DO PLANALTO EFETIVAMENTE CONSULTADA\]/, type);
    assert.match(base, /📅 CONSULTA AO PLANALTO: \[DATA DA CONSULTA — DD\/MM\/AAAA\]/, type);
  }
});

test('V635: TRIAGEM e demais tipos passam intactos e a correção é idempotente', () => {
  const context = harnessV635();
  assert.equal(vm.runInContext("factoryRouterText('triagem', {})", context), 'ROTEADOR DA TRIAGEM INTACTO\nFontes a não usar: conteúdo externo, arquivos de outras pastas.');
  assert.equal(vm.runInContext("factoryPromptBase('triagem')", context), 'TRIAGEM INTACTA');
  assert.doesNotMatch(vm.runInContext("factoryRouterText('resumoAula', {})", context), /PLANALTO/);
  const once = vm.runInContext("factoryRouterText('lei', {})", context);
  assert.equal(vm.runInContext(`__aldusFactoryLeiJurisprudenciaV383.withPlanaltoRouter(${JSON.stringify(once)})`, context), once);
  const base = vm.runInContext("factoryPromptBase('lei')", context);
  assert.equal(vm.runInContext(`__aldusFactoryLeiJurisprudenciaV383.withPlanaltoBase(${JSON.stringify(base)})`, context), base);
});

test('V635: o módulo não grava dados do usuário', () => {
  const context = harnessV635();
  vm.runInContext("factoryRouterText('lei', {}); factoryPromptBase('lei'); factoryPromptBase('leiJurisprudencia');", context);
  assert.equal(vm.runInContext('state.factoryPromptLibrary.lei', context), undefined);
});
