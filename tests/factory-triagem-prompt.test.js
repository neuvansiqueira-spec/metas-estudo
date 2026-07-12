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
  const triagemPrompt = extractTemplateConst(script, 'FACTORY_TRIAGEM_PROMPT');
  const fn = extractFunction(script, 'migrateStateFactoryPromptLibraryTriagemMetodologiaGeral');
  return new Function(`
    const FACTORY_TRIAGEM_PROMPT = ${JSON.stringify(triagemPrompt)};
    const FACTORY_TRIAGEM_METHODOLOGY_MIGRATION_ID = "factoryTriagemMetodologiaGeralV1";
    const FACTORY_LIBRARY_FALLBACK = "[PROMPT COMPLETO AINDA NÃO CADASTRADO NA BIBLIOTECA DA FÁBRICA]";
    function cloneData(value) { return JSON.parse(JSON.stringify(value)); }
    const defaultFactoryPromptLibrary = { triagem: FACTORY_TRIAGEM_PROMPT, resumoAula: "resumo", lei: "lei", jurisprudencia: "jur", peca: "peca", consolidacao: "con" };
    function migrateFactoryPromptLibraryLeiRecorte(library = {}) { return { ...library }; }
    ${fn}
    return { migrateStateFactoryPromptLibraryTriagemMetodologiaGeral, FACTORY_TRIAGEM_PROMPT, FACTORY_TRIAGEM_METHODOLOGY_MIGRATION_ID, FACTORY_LIBRARY_FALLBACK };
  `)();
}

test('prompt oficial de TRIAGEM contém a metodologia geral e está sincronizado com docs', () => {
  const prompt = extractTemplateConst(script, 'FACTORY_TRIAGEM_PROMPT');
  assert.equal(extractTemplateConst(docsScript, 'FACTORY_TRIAGEM_PROMPT'), prompt);
  [
    'Examine cada arquivo individualmente segundo sua função real no projeto',
    'conteúdo teórico',
    'legislação',
    'jurisprudência',
    'estrutura prática de peça',
    'técnica geral de elaboração de peças',
    'peça específica integral',
    'peça específica parcial',
    'material duplicado',
    'Classificação principal: RESUMO/AULA. Função secundária: apoio para estruturação da PEÇA.',
    'sem classificar apenas pelo nome do arquivo'
  ].forEach((required) => assert.ok(prompt.includes(required), `faltou: ${required}`));
  assert.match(script, /defaultFactoryPromptLibrary = \{ triagem: FACTORY_TRIAGEM_PROMPT/);
  assert.match(docsScript, /defaultFactoryPromptLibrary = \{ triagem: FACTORY_TRIAGEM_PROMPT/);
});

test('TRIAGEM exige suficiência separada por módulo e os quatro estados', () => {
  const prompt = extractTemplateConst(script, 'FACTORY_TRIAGEM_PROMPT');
  assert.ok(prompt.includes('## SUFICIÊNCIA SEPARADA POR MÓDULO'));
  ['RESUMO/AULA', 'LEI', 'JURISPRUDÊNCIA', 'PEÇA', 'ATUALIZAÇÃO/COMPLEMENTO'].forEach((module) => assert.ok(prompt.includes(module)));
  ['SUFICIENTES', 'PARCIALMENTE SUFICIENTES', 'INSUFICIENTES', 'INEXISTENTES'].forEach((state) => assert.ok(prompt.includes(state)));
  assert.ok(prompt.includes('Não apresente uma única conclusão global que esconda diferenças entre módulos'));
  assert.ok(prompt.includes('sem reduzir a triagem a uma conclusão binária global'));
});

test('TRIAGEM distingue regras de RESUMO/AULA, PEÇA e lacunas concretas sem direcionamento nominal', () => {
  const prompt = extractTemplateConst(script, 'FACTORY_TRIAGEM_PROMPT');
  assert.ok(prompt.includes('informações estejam distribuídas entre vários arquivos'));
  assert.ok(prompt.includes('A existência de resumo anteriormente produzido não prova automaticamente suficiência'));
  assert.ok(prompt.includes('A avaliação do módulo PEÇA não depende exclusivamente da existência de um único modelo integral pronto'));
  assert.ok(prompt.includes('peça específica e integral'));
  assert.ok(prompt.includes('peça específica parcial'));
  assert.ok(prompt.includes('técnica geral de peças'));
  assert.ok(prompt.includes('peça de outro tema com possível apoio estrutural'));
  assert.ok(prompt.includes('ausência de pedidos'));
  assert.ok(prompt.includes('ausência de fundamentação'));
  assert.ok(prompt.includes('ausência de encerramento'));
  assert.doesNotMatch(prompt, /pris[aã]o tempor[aá]ria/i);
});

test('TRIAGEM preserva vínculos temáticos e proíbe geração de módulos finais', () => {
  const prompt = extractTemplateConst(script, 'FACTORY_TRIAGEM_PROMPT');
  assert.ok(prompt.includes('## VÍNCULOS TEMÁTICOS COM AS PEÇAS'));
  assert.ok(prompt.includes('Preserve a classificação original da fonte complementar'));
  assert.ok(prompt.includes('SUFICIENTE PARA INCLUSÃO'));
  assert.ok(prompt.includes('PARCIALMENTE SUFICIENTE'));
  assert.ok(prompt.includes('INSUFICIENTE'));
  assert.ok(prompt.includes('SEM FONTE RELACIONADA IDENTIFICADA'));
  ['pesquisar externamente', 'complementar por conhecimento próprio', 'gerar resumo', 'gerar lei topificada', 'gerar jurisprudência', 'gerar peça', 'gerar Word ou PDF'].forEach((required) => assert.ok(prompt.includes(required), `faltou: ${required}`));
});

test('migração TRIAGEM atualiza apenas vazio ou fallback, é idempotente e preserva personalização genuína', () => {
  const { migrateStateFactoryPromptLibraryTriagemMetodologiaGeral, FACTORY_TRIAGEM_PROMPT, FACTORY_TRIAGEM_METHODOLOGY_MIGRATION_ID, FACTORY_LIBRARY_FALLBACK } = migrationHarness();
  const state = { migrations: { outra: 'ok' }, factoryPromptLibrary: { triagem: '', resumoAula: 'custom resumo', lei: 'custom lei', jurisprudencia: 'custom jur', peca: 'custom peca', consolidacao: 'custom con' }, factoryItems: [{ id: '1' }], materials: [{ id: 'm' }] };
  assert.equal(migrateStateFactoryPromptLibraryTriagemMetodologiaGeral(state), true);
  assert.equal(state.factoryPromptLibrary.triagem, FACTORY_TRIAGEM_PROMPT);
  assert.equal(state.factoryPromptLibrary.resumoAula, 'custom resumo');
  assert.deepEqual(state.factoryItems, [{ id: '1' }]);
  assert.deepEqual(state.materials, [{ id: 'm' }]);
  assert.ok(state.migrations[FACTORY_TRIAGEM_METHODOLOGY_MIGRATION_ID]);
  const afterFirst = JSON.stringify(state);
  assert.equal(migrateStateFactoryPromptLibraryTriagemMetodologiaGeral(state), false);
  assert.equal(JSON.stringify(state), afterFirst);

  const personalized = { migrations: {}, factoryPromptLibrary: { triagem: 'prompt personalizado real', resumoAula: 'r' } };
  assert.equal(migrateStateFactoryPromptLibraryTriagemMetodologiaGeral(personalized), false);
  assert.equal(personalized.factoryPromptLibrary.triagem, 'prompt personalizado real');

  const fallback = { migrations: {}, factoryPromptLibrary: { triagem: FACTORY_LIBRARY_FALLBACK } };
  assert.equal(migrateStateFactoryPromptLibraryTriagemMetodologiaGeral(fallback), true);
  assert.equal(fallback.factoryPromptLibrary.triagem, FACTORY_TRIAGEM_PROMPT);
});

test('prompts dos demais módulos permanecem referenciados e script mantém paridade com docs', () => {
  assert.equal(script, docsScript);
  ['resumoAula: FACTORY_RESUMO_AULA_PROMPT', 'lei: ""', 'jurisprudencia: ""', 'peca: FACTORY_PECA_PROMPT', 'consolidacao: ""'].forEach((snippet) => assert.ok(script.includes(snippet), `faltou: ${snippet}`));
});
