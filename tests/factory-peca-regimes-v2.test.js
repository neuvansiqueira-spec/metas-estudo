const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const script = fs.readFileSync('script.js', 'utf8');
const docsScript = fs.readFileSync('docs/script.js', 'utf8');

function extractTemplateConst(source, name) {
  const startToken = `const ${name} = \``;
  const start = source.indexOf(startToken);
  assert.notEqual(start, -1, `constante ${name} não encontrada`);
  const contentStart = start + startToken.length;
  const end = source.indexOf('`;', contentStart);
  assert.notEqual(end, -1, `fim da constante ${name} não encontrado`);
  return source.slice(contentStart, end);
}

function extractFunction(source, name) {
  const start = source.indexOf(`function ${name}`);
  assert.notEqual(start, -1, `função ${name} não encontrada`);
  const bodyStart = source.indexOf('{', start);
  let depth = 0;
  for (let index = bodyStart; index < source.length; index += 1) {
    if (source[index] === '{') depth += 1;
    if (source[index] === '}') depth -= 1;
    if (depth === 0) return source.slice(start, index + 1);
  }
  throw new Error(`fim da função ${name} não encontrado`);
}

function migrationHarness() {
  const previousPrompt = extractTemplateConst(script, 'FACTORY_PECA_PREVIOUS_PROMPT');
  const pecaPrompt = extractTemplateConst(script, 'FACTORY_PECA_PROMPT');
  const pecaFn = extractFunction(script, 'migrateStateFactoryPromptLibraryPecaRegimesEspeciaisV2');
  return new Function(`
    const FACTORY_PECA_PREVIOUS_PROMPT = ${JSON.stringify(previousPrompt)};
    const FACTORY_PECA_PROMPT = ${JSON.stringify(pecaPrompt)};
    const FACTORY_PECA_REGIMES_ESPECIAIS_MIGRATION_ID = "factoryPecaRegimesEspeciaisV2";
    const FACTORY_LIBRARY_FALLBACK = "[PROMPT COMPLETO AINDA NÃO CADASTRADO NA BIBLIOTECA DA FÁBRICA]";
    const OLD_LEI_RECORTE_PROMPT = ["old"].join(" ");
    const NEW_LEI_RECORTE_PROMPT = "new";
    function cloneData(value) { return JSON.parse(JSON.stringify(value)); }
    const defaultFactoryPromptLibrary = { triagem: "", resumoAula: "resumo", lei: "", jurisprudencia: "", peca: FACTORY_PECA_PROMPT, consolidacao: "" };
    function migrateFactoryPromptLibraryLeiRecorte(library = {}) { return { ...library }; }
    ${pecaFn}
    return { migrateStateFactoryPromptLibraryPecaRegimesEspeciaisV2, FACTORY_PECA_PREVIOUS_PROMPT, FACTORY_PECA_PROMPT, FACTORY_PECA_REGIMES_ESPECIAIS_MIGRATION_ID, FACTORY_LIBRARY_FALLBACK };
  `)();
}

test('prompt PEÇA V2 centraliza regimes especiais, prioriza regime antes de comparação e preserva ajuste anterior', () => {
  const prompt = extractTemplateConst(script, 'FACTORY_PECA_PROMPT');
  assert.match(prompt, /## CENTRALIZAÇÃO OBRIGATÓRIA DOS REGIMES ESPECIAIS/);
  assert.match(prompt, /▶️📚 REGIME ESPECIAL: \[NOME DO REGIME\]/);
  assert.match(prompt, /A comparação com outra medida não pode substituir o desenvolvimento do regime especial principal/);
  assert.ok(prompt.indexOf('regimes legais especiais diretamente aplicáveis') < prompt.indexOf('distinções em relação a outras peças ou medidas'));
  assert.match(prompt, /O regime especial deve ser desenvolvido integralmente apenas uma vez/);
  assert.match(prompt, /Não repita em três ou quatro locais a mesma explicação/);
  assert.match(prompt, /## LACUNAS DAS FONTES APROVADAS/);
  assert.equal((prompt.match(/## LACUNAS DAS FONTES APROVADAS/g) || []).length, 2, 'título aparece como regra e como formato do bloco final');
  assert.match(prompt, /Não utilize formulações amplas ou disjuntivas/);
  assert.match(prompt, /Cabe se o delito estiver no rol ou for hediondo ou equiparado/);
  assert.match(prompt, /Verificar o enquadramento jurídico do delito conforme as hipóteses expressamente desenvolvidas/);
  assert.match(prompt, /É PERMITIDO USAR, DE FORMA COMPLEMENTAR/);
  assert.match(prompt, /Não criar automaticamente uma nova aula ou meta de estudo/);
  assert.match(prompt, /GERE UM ARQUIVO \.DOCX EDITÁVEL EXCLUSIVO DO MÓDULO PEÇA/);
});

test('roteador da triagem registra vínculos temáticos com peças sem criar nova categoria estrutural', () => {
  assert.match(script, /## VÍNCULOS TEMÁTICOS COM AS PEÇAS/);
  assert.match(script, /Classifique cada fonte por RESUMO\/AULA, LEI, JURISPRUDÊNCIA, PEÇA e ATUALIZAÇÃO\/COMPLEMENTO/);
  assert.match(script, /fontes complementares diretamente relacionadas/);
  assert.match(script, /classificação original de cada fonte complementar/);
  assert.match(script, /SUFICIENTE PARA INCLUSÃO/);
  assert.match(script, /PARCIALMENTE SUFICIENTE/);
  assert.match(script, /INSUFICIENTE/);
  assert.match(script, /SEM FONTE RELACIONADA IDENTIFICADA/);
  assert.match(script, /não desenvolva conteúdo jurídico e não invente vínculos/);
});

test('migração PEÇA V2 é idempotente, preserva personalizados e altera somente factoryPromptLibrary.peca', () => {
  const { migrateStateFactoryPromptLibraryPecaRegimesEspeciaisV2, FACTORY_PECA_PREVIOUS_PROMPT, FACTORY_PECA_PROMPT, FACTORY_PECA_REGIMES_ESPECIAIS_MIGRATION_ID, FACTORY_LIBRARY_FALLBACK } = migrationHarness();
  const state = {
    migrations: { outra: 'ok' },
    factoryPromptLibrary: { triagem: 'triagem', resumoAula: 'resumo', lei: 'lei', jurisprudencia: 'juris', peca: FACTORY_PECA_PREVIOUS_PROMPT, consolidacao: 'consolida' },
    sync: { enabled: true }, backup: { enabled: true }, timerSession: { id: 't1' }, materials: [{ id: 'm1' }]
  };
  const beforeOther = JSON.stringify({ ...state, factoryPromptLibrary: { ...state.factoryPromptLibrary, peca: undefined }, migrations: undefined });
  assert.equal(migrateStateFactoryPromptLibraryPecaRegimesEspeciaisV2(state), true);
  assert.equal(state.factoryPromptLibrary.peca, FACTORY_PECA_PROMPT);
  assert.ok(state.migrations[FACTORY_PECA_REGIMES_ESPECIAIS_MIGRATION_ID]);
  assert.equal(JSON.stringify({ ...state, factoryPromptLibrary: { ...state.factoryPromptLibrary, peca: undefined }, migrations: undefined }), beforeOther);
  const snapshot = JSON.stringify(state);
  assert.equal(migrateStateFactoryPromptLibraryPecaRegimesEspeciaisV2(state), false);
  assert.equal(JSON.stringify(state), snapshot);

  const custom = { factoryPromptLibrary: { triagem: 'a', resumoAula: 'b', lei: 'c', jurisprudencia: 'd', peca: 'PROMPT PERSONALIZADO', consolidacao: 'e' }, migrations: {} };
  assert.equal(migrateStateFactoryPromptLibraryPecaRegimesEspeciaisV2(custom), false);
  assert.equal(custom.factoryPromptLibrary.peca, 'PROMPT PERSONALIZADO');
  assert.ok(custom.migrations[FACTORY_PECA_REGIMES_ESPECIAIS_MIGRATION_ID]);

  const empty = { factoryPromptLibrary: { peca: '' }, migrations: {} };
  assert.equal(migrateStateFactoryPromptLibraryPecaRegimesEspeciaisV2(empty), true);
  assert.equal(empty.factoryPromptLibrary.peca, FACTORY_PECA_PROMPT);
  const fallback = { factoryPromptLibrary: { peca: FACTORY_LIBRARY_FALLBACK }, migrations: {} };
  assert.equal(migrateStateFactoryPromptLibraryPecaRegimesEspeciaisV2(fallback), true);
  assert.equal(fallback.factoryPromptLibrary.peca, FACTORY_PECA_PROMPT);
});

test('paridade e ausência de alterações em áreas proibidas no ajuste PEÇA V2', () => {
  assert.equal(script, docsScript);
  assert.doesNotMatch(script, /function saveTimerPreferences[\s\S]*factoryPecaRegimesEspeciaisV2/);
  assert.doesNotMatch(script, /function autoSyncAfterSave[\s\S]*factoryPecaRegimesEspeciaisV2/);
  assert.doesNotMatch(script, /function salvarCadernoErros[\s\S]*factoryPecaRegimesEspeciaisV2/);
  assert.match(script, /const TIMER_PREFS_STORAGE_KEY = "metasEstudoTimerPreferences"/);
  assert.match(script, /const GOOGLE_SYNC_FILE_NAME = "metas-estudo-sync\.json"/);
  assert.match(script, /const defaultFactoryPromptLibrary = \{ triagem: "", resumoAula: FACTORY_RESUMO_AULA_PROMPT, lei: "", jurisprudencia: "", peca: FACTORY_PECA_PROMPT, consolidacao: "" \}/);
});
