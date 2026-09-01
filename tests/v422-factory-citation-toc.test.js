const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const runtimePath = 'factory-summary-toc-v381.js';
const source = fs.readFileSync(runtimePath, 'utf8');
const api = require(`../${runtimePath}`);

const YEAR_MARKER = '## ANO DA DECISÃO — REGRA OBRIGATÓRIA DA JURISPRUDÊNCIA';
const CITATION_MARKER = '## CITAÇÃO JURISPRUDENCIAL — FORMATO OBRIGATÓRIO';
const SUMMARY_V382 = '## SUMÁRIO DIDÁTICO OBRIGATÓRIO DO DOCUMENTO — V382';
const SUMMARY_V422 = '## SUMÁRIO DIDÁTICO OBRIGATÓRIO DO DOCUMENTO — V422';

function legacyPrompt(label = 'PROMPT SALVO') {
  return `${label}\n\n${SUMMARY_V382}\n\nSUMÁRIO LEGADO\n\n${YEAR_MARKER}\n\nUSE O CAMPO:\n📍 **ANO DA DECISÃO: 2026**\n\n## SOMBREAMENTO BEGE DOS RÓTULOS — PADRÃO OBRIGATÓRIO DO MODELO\n\nBEGE LEGADO`;
}

function createHarness() {
  const types = ['resumoAula', 'lei', 'jurisprudencia', 'peca', 'resumoAulaJurisprudencia', 'leiJurisprudencia', 'consolidacao'];
  const defaults = Object.fromEntries(types.map((type) => [type, legacyPrompt(`DEFAULT ${type}`)]));
  const saved = Object.fromEntries(types.map((type) => [type, legacyPrompt(`STATE ${type}`)]));
  let saves = 0;
  const context = {
    console,
    Date,
    defaultFactoryPromptLibrary: defaults,
    state: { factoryPromptLibrary: saved, migrations: {} },
    saveData() { saves += 1; },
    factoryPromptBase(type) { return saved[type] || ''; },
    module: { exports: {} },
    exports: {}
  };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(source, context, { filename: runtimePath });
  return { context, api: context.module.exports, getSaves: () => saves };
}

test('V422 contém a seção de citação e define itálico do parêntese ao parêntese com ponto final fora', () => {
  const prompt = api.withJurisprudenceCitation('PROMPT BASE');
  assert.match(prompt, /## CITAÇÃO JURISPRUDENCIAL — FORMATO OBRIGATÓRIO/);
  assert.match(prompt, /O ITÁLICO COMEÇA NO PARÊNTESE DE ABERTURA E TERMINA NO PARÊNTESE DE FECHAMENTO/);
  assert.match(prompt, /O PONTO FINAL DA FRASE FICA FORA DO ITÁLICO, DEPOIS DO PARÊNTESE DE FECHAMENTO/);
  assert.match(prompt, /\*\(\[TRIBUNAL\], \[CLASSE E NÚMERO DO PROCESSO\], \[INFORMATIVO, QUANDO HOUVER\], \[ANO\]\)\*\./);
});

test('V422 remove o campo separado de ano do prompt resultante', () => {
  const result = api.withJurisprudenceCitation(`${YEAR_MARKER}\n\n📍 **ANO DA DECISÃO: 2026**`);
  assert.doesNotMatch(result, /📍 \*\*ANO DA DECISÃO:/);
  assert.doesNotMatch(result, /## ANO DA DECISÃO — REGRA OBRIGATÓRIA DA JURISPRUDÊNCIA/);
  assert.match(result, /## CITAÇÃO JURISPRUDENCIAL — FORMATO OBRIGATÓRIO/);
});

test('V422 aplica a migração duas vezes sem alterar a biblioteca na segunda execução', () => {
  const { context, api: runtimeApi, getSaves } = createHarness();
  const first = runtimeApi.install();
  assert.equal(first.installed, true);
  const afterFirst = JSON.stringify(context.state.factoryPromptLibrary);
  const savesAfterFirst = getSaves();
  const second = runtimeApi.install();
  const afterSecond = JSON.stringify(context.state.factoryPromptLibrary);
  assert.equal(second.installed, true);
  assert.equal(afterSecond, afterFirst);
  assert.equal(getSaves(), savesAfterFirst);
  assert.ok(context.state.migrations.factorySummaryTocV422);
  assert.ok(context.state.migrations.factoryJurisprudenceCitationV422);
});

test('V422 migra biblioteca já salva: sai ANO DA DECISÃO e entra uma única citação', () => {
  const { context, api: runtimeApi } = createHarness();
  runtimeApi.install();
  const prompt = context.state.factoryPromptLibrary.jurisprudencia;
  assert.doesNotMatch(prompt, /📍 \*\*ANO DA DECISÃO:/);
  assert.doesNotMatch(prompt, new RegExp(YEAR_MARKER));
  assert.equal((prompt.match(new RegExp(CITATION_MARKER, 'g')) || []).length, 1);
});

test('V422 renova V382 para V422 na biblioteca persistida', () => {
  const { context, api: runtimeApi } = createHarness();
  runtimeApi.install();
  for (const type of runtimeApi.targetTypes) {
    const prompt = context.state.factoryPromptLibrary[type];
    assert.doesNotMatch(prompt, new RegExp(SUMMARY_V382));
    assert.equal((prompt.match(new RegExp(SUMMARY_V422, 'g')) || []).length, 1, type);
  }
});

test('V422 inclui lei e leiJurisprudencia nos tipos-alvo do sumário', () => {
  assert.ok(api.targetTypes.includes('lei'));
  assert.ok(api.targetTypes.includes('leiJurisprudencia'));
  assert.equal(api.targetTypes.length, 6);
});

test('V422 descreve toda entrada do sumário como hiperlink obrigatório', () => {
  const prompt = api.withSummary('BASE');
  assert.match(prompt, /TODA ENTRADA DO SUMÁRIO[^\n]+DEVE SER UM HIPERLINK INTERNO/);
  assert.match(prompt, /NÃO DEIXE ENTRADAS SEM VÍNCULO NAVEGÁVEL/);
  assert.match(prompt, /NO SUMÁRIO AUTOMÁTICO, HABILITE OS HIPERLINKS DO CAMPO TOC/);
  assert.match(prompt, /NO FALLBACK MANUAL, CRIE INDICADORES\/ÂNCORAS/);
});

test('V422 preserva byte a byte a seção de sombreamento bege existente', () => {
  assert.match(source, /TOM EXATO DO SOMBREAMENTO: BEGE #EEECE1 \(RGB 238, 236, 225\)/);
  assert.match(source, /O SOMBREAMENTO DEVE SER DE CARACTERE\/RUN, E NÃO DO PARÁGRAFO INTEIRO/);
  assert.match(source, /<w:shd w:val="clear" w:fill="EEECE1"\/>/);
});
