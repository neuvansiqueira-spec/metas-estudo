const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const script = fs.readFileSync('script.js', 'utf8');
const docsScript = fs.readFileSync('docs/script.js', 'utf8');
const runtimePatch = fs.readFileSync('factory-lei-prompt-v119.js', 'utf8');
const docsRuntimePatch = fs.readFileSync('docs/factory-lei-prompt-v119.js', 'utf8');
const runtimePatchV120 = fs.readFileSync('factory-lei-prompt-v120.js', 'utf8');
const docsRuntimePatchV120 = fs.readFileSync('docs/factory-lei-prompt-v120.js', 'utf8');
const runtimePatchV121 = fs.readFileSync('factory-lei-prompt-v121.js', 'utf8');
const docsRuntimePatchV121 = fs.readFileSync('docs/factory-lei-prompt-v121.js', 'utf8');
const currentRuntimePatch = fs.readFileSync('factory-lei-prompt-v123.js', 'utf8');

function extractTemplateConst(source, name) {
  const marker = `const ${name} = \``;
  const start = source.indexOf(marker);
  assert.notEqual(start, -1, `constante ${name} não encontrada`);
  const valueStart = start + marker.length;
  const end = source.indexOf('`;', valueStart);
  assert.notEqual(end, -1, `fim da constante ${name} não encontrado`);
  return source.slice(valueStart, end);
}

function extractFunction(source, name) {
  const start = source.indexOf(`\nfunction ${name}`) + 1;
  assert.notEqual(start, 0, `função ${name} não encontrada`);
  const signatureEnd = source.indexOf(') {', start);
  const bodyStart = source.indexOf('{', signatureEnd);
  let depth = 0;
  for (let index = bodyStart; index < source.length; index += 1) {
    if (source[index] === '{') depth += 1;
    if (source[index] === '}') depth -= 1;
    if (depth === 0) return source.slice(start, index + 1);
  }
  throw new Error(`fim da função ${name} não encontrado`);
}

function migrationHarness() {
  const migrateRecorte = extractFunction(script, 'migrateFactoryPromptLibraryLeiRecorte');
  const migrateLei = extractFunction(script, 'migrateStateFactoryPromptLibraryLeiDidatica');
  const prompt = extractTemplateConst(script, 'FACTORY_LEI_PROMPT');
  return new Function(`
    const FACTORY_LEI_DIDACTIC_MIGRATION_ID = "factoryLeiDidaticaAntiTranscricaoV1";
    const FACTORY_LIBRARY_FALLBACK = "[PROMPT COMPLETO AINDA NÃO CADASTRADO NA BIBLIOTECA DA FÁBRICA]";
    const FACTORY_LEI_PROMPT = ${JSON.stringify(prompt)};
    const OLD_LEI_RECORTE_PROMPT = "RECORTE ANTIGO";
    const NEW_LEI_RECORTE_PROMPT = "RECORTE NOVO";
    const defaultFactoryPromptLibrary = { triagem: "", resumoAula: "", lei: FACTORY_LEI_PROMPT, jurisprudencia: "", peca: "", consolidacao: "" };
    const cloneData = (value) => JSON.parse(JSON.stringify(value));
    let state = {};
    ${migrateRecorte}
    ${migrateLei}
    return { migrateStateFactoryPromptLibraryLeiDidatica, FACTORY_LEI_PROMPT, FACTORY_LIBRARY_FALLBACK };
  `)();
}

test('prompt oficial Lei vigente transforma a norma em mapa didático sem transcrição mecânica', () => {
  const prompt = extractTemplateConst(currentRuntimePatch, 'PROMPT');
  assert.match(prompt, /CADA ARTIGO COMO UNIDADE CENTRAL OBRIGATÓRIA/);
  assert.match(prompt, /MÉTODO DE TOPIFICAÇÃO DE CADA ARTIGO/);
  assert.match(prompt, /BARREIRA CONTRA TRANSCRIÇÃO/);
  assert.match(prompt, /QUEM É O DESTINATÁRIO/);
  assert.match(prompt, /O QUE PODE, DEVE OU NÃO PODE SER FEITO/);
  assert.match(prompt, /PRAZO, TERMO INICIAL, TERMO FINAL OU PERIODICIDADE/);
  assert.match(prompt, /EXCEÇÃO, RESSALVA, VEDAÇÃO OU REGIME ESPECIAL/);
  assert.match(prompt, /SANÇÃO, MULTA, LIMITE, CAUSA DE AUMENTO OU DIMINUIÇÃO/);
  assert.match(prompt, /COPIAR O ARTIGO INTEGRALMENTE/);
  assert.match(prompt, /TROCAR APENAS SINÔNIMOS MANTENDO A MESMA SINTAXE DA LEI/);
  assert.match(prompt, /PONTO DE PROVA/);
  assert.match(prompt, /RESUMO_TOPIFICADO_LEI_\[NÚMERO\]_\[FILTRO\]\.docx/);
});

function currentPromptContext(lei = '') {
  const context = {
    console,
    Date,
    defaultFactoryPromptLibrary: { lei: '' },
    state: { migrations: {}, factoryPromptLibrary: { lei } },
    saveData() {},
    factoryPromptBase() { return ''; },
    normalizeFactoryPromptLibrary(library = {}) { return { ...library }; },
    factoryRouterText() { return 'Contexto\nStatus anterior: Não iniciado'; },
    window: { addEventListener() {} },
    navigator: {}
  };
  vm.createContext(context);
  vm.runInContext(currentRuntimePatch, context);
  return context;
}

test('migração vigente instala o prompt oficial quando Lei está vazio ou com fallback', () => {
  for (const current of ['', '[PROMPT COMPLETO AINDA NÃO CADASTRADO NA BIBLIOTECA DA FÁBRICA]']) {
    const context = currentPromptContext(current);
    assert.match(context.state.factoryPromptLibrary.lei, /COR PRETA PURA #000000/);
    assert.ok(context.state.migrations.factoryLeiNegritoRealWordV1);
  }
});

test('migração vigente preserva prompt Lei personalizado do usuário', () => {
  const custom = 'MEU PROMPT LEI PERSONALIZADO';
  const context = currentPromptContext(custom);
  assert.equal(context.state.factoryPromptLibrary.lei, custom);
  assert.equal(context.state.factoryPromptLibraryBackups.leiBeforeV123, custom);
  assert.ok(context.state.migrations.factoryLeiNegritoRealWordV1);
});

test('prompt Lei vigente usa padrão oficial como proteção e não recebe status administrativo', () => {
  const context = currentPromptContext('');
  assert.match(context.factoryPromptBase('lei'), /COR PRETA PURA #000000/);
  assert.doesNotMatch(context.factoryRouterText('lei'), /Status anterior/);
  assert.match(currentRuntimePatch, /normalizeFactoryPromptLibrary/);
});

test('fonte e publicação permanecem sincronizadas', () => {
  assert.equal(script, docsScript);
  assert.equal(runtimePatch, docsRuntimePatch);
  assert.equal(runtimePatchV120, docsRuntimePatchV120);
  assert.equal(runtimePatchV121, docsRuntimePatchV121);
});

function runtimePatchContext(lei = '') {
  const context = {
    console,
    Date,
    defaultFactoryPromptLibrary: { lei: '' },
    state: { migrations: {}, factoryPromptLibrary: { lei } },
    saves: 0,
    saveData() { this.saves += 1; },
    factoryPromptBase(type) { return type === 'lei' ? '[PROMPT COMPLETO AINDA NÃO CADASTRADO NA BIBLIOTECA DA FÁBRICA]' : 'OUTRO'; },
    normalizeFactoryPromptLibrary(library = {}) { return { ...library }; },
    factoryRouterText() { return 'Contexto\nStatus anterior: Não iniciado\nMÓDULO: LEI.'; },
    window: { addEventListener() {}, setTimeout() {} },
    navigator: {}
  };
  vm.createContext(context);
  vm.runInContext(runtimePatch, context);
  return context;
}

test('atualização pública v119 instala o prompt e remove o status do comando Lei', () => {
  const context = runtimePatchContext('');
  assert.match(context.state.factoryPromptLibrary.lei, /BARREIRA CONTRA TRANSCRIÇÃO/);
  assert.match(context.factoryPromptBase('lei'), /MÉTODO OBRIGATÓRIO DE TRANSFORMAÇÃO/);
  assert.doesNotMatch(context.factoryRouterText('lei'), /Status anterior/);
  assert.equal(context.factoryPromptBase('triagem'), 'OUTRO');
  assert.ok(context.state.migrations.factoryLeiDidaticaAntiTranscricaoV1);
});

test('atualização pública v119 preserva prompt Lei personalizado', () => {
  const context = runtimePatchContext('PROMPT PERSONALIZADO DO USUÁRIO');
  assert.equal(context.state.factoryPromptLibrary.lei, 'PROMPT PERSONALIZADO DO USUÁRIO');
  assert.equal(context.factoryPromptBase('lei'), 'PROMPT PERSONALIZADO DO USUÁRIO');
});

function runtimePatchContextV120(lei = '') {
  const context = {
    console,
    Date,
    defaultFactoryPromptLibrary: { lei: '' },
    state: { migrations: {}, factoryPromptLibrary: { lei } },
    saves: 0,
    saveData() { this.saves += 1; },
    factoryPromptBase(type) { return type === 'lei' ? '[PROMPT COMPLETO AINDA NÃO CADASTRADO NA BIBLIOTECA DA FÁBRICA]' : 'OUTRO'; },
    normalizeFactoryPromptLibrary(library = {}) { return { ...library }; },
    factoryRouterText() { return 'Contexto\nStatus anterior: Não iniciado\nMÓDULO: LEI.'; },
    window: { addEventListener() {}, setTimeout() {} },
    navigator: {}
  };
  vm.createContext(context);
  vm.runInContext(runtimePatchV120, context);
  return context;
}

test('v120 funde o modelo topificado por artigo com proteção jurídica', () => {
  const prompt = extractTemplateConst(runtimePatchV120, 'PROMPT');
  assert.match(prompt, /CADA ARTIGO COMO UNIDADE CENTRAL OBRIGATÓRIA/);
  assert.match(prompt, /PALAVRAS-NÚCLEO FLEXÍVEIS/);
  assert.match(prompt, /NÃO FORCE TODOS OS ARTIGOS/);
  assert.match(prompt, /ATUALIZAÇÃO NORMATIVA OBRIGATÓRIA/);
  assert.match(prompt, /TEXTO OFICIAL DO PLANALTO/);
  assert.match(prompt, /NÃO PESQUISE AUTOMATICAMENTE DECRETOS, PORTARIAS, RESOLUÇÕES/);
  assert.match(prompt, /USE FAIXA AZUL-CLARA DISCRETA NO CABEÇALHO DE CADA ARTIGO/);
  assert.match(prompt, /NÃO USE TABELAS/);
  assert.match(prompt, /RESUMO_TOPIFICADO_LEI_\[NÚMERO\]_\[FILTRO\]\.docx/);
});

test('v120 substitui exatamente o prompt oficial v119 e remove status administrativo', () => {
  const previousOfficial = extractTemplateConst(runtimePatch, 'PROMPT');
  const context = runtimePatchContextV120(previousOfficial);
  assert.match(context.state.factoryPromptLibrary.lei, /ARQUITETURA OBRIGATÓRIA/);
  assert.match(context.factoryPromptBase('lei'), /MÉTODO DE TOPIFICAÇÃO DE CADA ARTIGO/);
  assert.doesNotMatch(context.factoryRouterText('lei'), /Status anterior/);
  assert.ok(context.state.migrations.factoryLeiModeloTopificadoV2);
});

test('v120 preserva prompt Lei realmente personalizado', () => {
  const custom = 'PROMPT LEI PERSONALIZADO PELO USUÁRIO';
  const context = runtimePatchContextV120(custom);
  assert.equal(context.state.factoryPromptLibrary.lei, custom);
  assert.equal(context.factoryPromptBase('lei'), custom);
});

function runtimePatchContextV121(lei = '') {
  const context = {
    console,
    Date,
    defaultFactoryPromptLibrary: { lei: '' },
    state: { migrations: {}, factoryPromptLibrary: { lei } },
    saves: 0,
    saveData() { this.saves += 1; },
    factoryPromptBase(type) { return type === 'lei' ? '[PROMPT COMPLETO AINDA NÃO CADASTRADO NA BIBLIOTECA DA FÁBRICA]' : 'OUTRO'; },
    normalizeFactoryPromptLibrary(library = {}) { return { ...library }; },
    factoryRouterText() { return 'Contexto\nStatus anterior: Não iniciado\nMÓDULO: LEI.'; },
    window: { addEventListener() {}, setTimeout() {} },
    navigator: {}
  };
  vm.createContext(context);
  vm.runInContext(runtimePatchV121, context);
  return context;
}

test('v121 instala o modelo fundido sobre o prompt já salvo e guarda cópia recuperável', () => {
  const oldCustom = 'PROMPT ANTIGO QUE ESTAVA SALVO NO NAVEGADOR';
  const context = runtimePatchContextV121(oldCustom);
  assert.match(context.state.factoryPromptLibrary.lei, /CADA ARTIGO COMO UNIDADE CENTRAL OBRIGATÓRIA/);
  assert.equal(context.state.factoryPromptLibraryBackups.leiBeforeV121, oldCustom);
  assert.ok(context.state.migrations.factoryLeiModeloTopificadoInstaladoV3);
});

test('v121 faz a substituição uma única vez e preserva edições posteriores', () => {
  const context = runtimePatchContextV121('PROMPT ANTIGO');
  context.state.factoryPromptLibrary.lei = 'EDIÇÃO POSTERIOR DO USUÁRIO';
  vm.runInContext(runtimePatchV121, context);
  assert.equal(context.state.factoryPromptLibrary.lei, 'EDIÇÃO POSTERIOR DO USUÁRIO');
  assert.equal(context.factoryPromptBase('lei'), 'EDIÇÃO POSTERIOR DO USUÁRIO');
});
