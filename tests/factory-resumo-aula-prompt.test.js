const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const script = fs.readFileSync('script.js', 'utf8');
const docsScript = fs.readFileSync('docs/script.js', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');
const docsHtml = fs.readFileSync('docs/index.html', 'utf8');
const sw = fs.readFileSync('service-worker.js', 'utf8');
const docsSw = fs.readFileSync('docs/service-worker.js', 'utf8');
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));

function extractStringConst(source, name) {
  const line = source.split('\n').find((candidate) => candidate.startsWith(`const ${name} = `));
  assert.ok(line, `constante ${name} não encontrada`);
  const literal = line.slice(`const ${name} = `.length, -1);
  return JSON.parse(literal);
}

function officialPrompt(source = script) {
  const segment = extractStringConst(source, 'FACTORY_RESUMO_AULA_PROMPT_SEGMENT');
  return `${segment}${segment}`;
}

function migrationHarness() {
  const segment = extractStringConst(script, 'FACTORY_RESUMO_AULA_PROMPT_SEGMENT');
  const leiFn = script.match(/function migrateFactoryPromptLibraryLeiRecorte\(library = \{\}\) \{[\s\S]*?\n\}/)[0];
  const resumoFn = script.match(/function migrateStateFactoryPromptLibraryResumoAulaDidatica\(targetState = state\) \{[\s\S]*?\n\}/)[0];
  return new Function(`
    const FACTORY_RESUMO_AULA_PROMPT_SEGMENT = ${JSON.stringify(segment)};
    const FACTORY_RESUMO_AULA_PROMPT = FACTORY_RESUMO_AULA_PROMPT_SEGMENT + FACTORY_RESUMO_AULA_PROMPT_SEGMENT;
    const FACTORY_RESUMO_AULA_MIGRATION_ID = "resumoAulaDidaticaProfundidadeV2";
    const OLD_LEI_RECORTE_PROMPT = [
      "RECORTE: se houver edital/programa/recorte, trabalhe somente os artigos e temas indicados.",
      "Se não houver, trabalhe a lei",
      "amplamente, priorizando todos os artigos juridicamente relevantes."
    ].join(" ");
    const NEW_LEI_RECORTE_PROMPT = "RECORTE: trabalhe somente os artigos e temas expressamente indicados. Se o recorte não estiver cadastrado ou estiver impreciso, interrompa a geração e solicite confirmação. Somente trabalhe a lei integralmente quando houver autorização expressa do usuário.";
    function cloneData(value) { return JSON.parse(JSON.stringify(value)); }
    const defaultFactoryPromptLibrary = { triagem: "", resumoAula: FACTORY_RESUMO_AULA_PROMPT, lei: "", jurisprudencia: "", peca: "", consolidacao: "" };
    ${leiFn}
    ${resumoFn}
    return { migrateStateFactoryPromptLibraryResumoAulaDidatica, FACTORY_RESUMO_AULA_PROMPT, FACTORY_RESUMO_AULA_MIGRATION_ID };
  `)();
}

test('constante oficial RESUMO/AULA contém integralmente o prompt fornecido', () => {
  const segment = extractStringConst(script, 'FACTORY_RESUMO_AULA_PROMPT_SEGMENT');
  const prompt = officialPrompt();
  assert.equal(prompt, `${segment}${segment}`);
  assert.equal(officialPrompt(docsScript), prompt);
  assert.match(script, /resumoAula: FACTORY_RESUMO_AULA_PROMPT/);
  assert.match(docsScript, /resumoAula: FACTORY_RESUMO_AULA_PROMPT/);
  assert.ok(prompt.startsWith('TRANSFORME AS FONTES CLASSIFICADAS COMO RESUMO/AULA'));
  assert.ok(prompt.includes('SALVO PEDIDO EXPRESSO.TRANSFORME AS FONTES CLASSIFICADAS COMO RESUMO/AULA'));
  assert.ok(prompt.endsWith('NÃO ENTREGUE APENAS O CONTEÚDO NO CHAT, SALVO PEDIDO EXPRESSO.'));
});

test('prompt RESUMO/AULA contém os blocos e controles obrigatórios', () => {
  const prompt = officialPrompt();
  [
    '## PADRÃO OBRIGATÓRIO DE PROFUNDIDADE DIDÁTICA',
    '## ORDEM DIDÁTICA DE DESENVOLVIMENTO',
    '## CONTROLE DE DENSIDADE E AGRUPAMENTO',
    '## MODELO DE REFERÊNCIA',
    '## REVISÃO INTERNA EM DUAS PASSAGENS',
    '## CONTROLE FINAL DE FIDELIDADE, AMBIGUIDADE E COBERTURA',
    'USE APENAS AS FONTES CLASSIFICADAS COMO RESUMO/AULA NA TRIAGEM.',
    'NÃO PESQUISE, ATUALIZE, CORRIJA OU COMPLETE O CONTEÚDO.',
    'NÃO COPIE CONTEÚDO JURÍDICO DOS MODELOS E NÃO OS TRATE COMO FONTE DO TEMA.',
    'NÃO INSERIR PCDF, BANCA, CONCURSO, PROFESSORA, CURSO OU TURMA.',
    'SUBSTITUIR QUALQUER REFERÊNCIA ESPECÍFICA DE PROVA POR “📌 PROVA”.',
    'MAPA HIERÁRQUICO DE PALAVRAS-CHAVE'
  ].forEach((required) => assert.ok(prompt.includes(required), `faltou: ${required}`));
});

test('migração RESUMO/AULA altera somente factoryPromptLibrary.resumoAula e preserva os demais dados', () => {
  const { migrateStateFactoryPromptLibraryResumoAulaDidatica, FACTORY_RESUMO_AULA_PROMPT, FACTORY_RESUMO_AULA_MIGRATION_ID } = migrationHarness();
  const state = {
    migrations: { outra: 'ok' },
    factoryPromptLibrary: {
      triagem: 'triagem atual',
      resumoAula: 'prompt antigo',
      lei: 'lei atual',
      jurisprudencia: 'juris atual',
      peca: 'peça atual',
      consolidacao: 'consolidação atual'
    },
    subjects: [{ name: 'Direito Penal' }],
    settings: { tema: 'escuro' }
  };
  const beforeOther = JSON.stringify({
    triagem: state.factoryPromptLibrary.triagem,
    lei: state.factoryPromptLibrary.lei,
    jurisprudencia: state.factoryPromptLibrary.jurisprudencia,
    peca: state.factoryPromptLibrary.peca,
    consolidacao: state.factoryPromptLibrary.consolidacao,
    subjects: state.subjects,
    settings: state.settings
  });
  assert.equal(migrateStateFactoryPromptLibraryResumoAulaDidatica(state), true);
  assert.equal(state.factoryPromptLibrary.resumoAula, FACTORY_RESUMO_AULA_PROMPT);
  assert.ok(state.migrations[FACTORY_RESUMO_AULA_MIGRATION_ID]);
  assert.equal(JSON.stringify({
    triagem: state.factoryPromptLibrary.triagem,
    lei: state.factoryPromptLibrary.lei,
    jurisprudencia: state.factoryPromptLibrary.jurisprudencia,
    peca: state.factoryPromptLibrary.peca,
    consolidacao: state.factoryPromptLibrary.consolidacao,
    subjects: state.subjects,
    settings: state.settings
  }), beforeOther);
});

test('migração RESUMO/AULA é idempotente e inicializa estruturas ausentes', () => {
  const { migrateStateFactoryPromptLibraryResumoAulaDidatica, FACTORY_RESUMO_AULA_PROMPT, FACTORY_RESUMO_AULA_MIGRATION_ID } = migrationHarness();
  const emptyState = { unrelated: ['preservado'] };
  assert.equal(migrateStateFactoryPromptLibraryResumoAulaDidatica(emptyState), true);
  assert.equal(emptyState.factoryPromptLibrary.resumoAula, FACTORY_RESUMO_AULA_PROMPT);
  assert.ok(emptyState.migrations[FACTORY_RESUMO_AULA_MIGRATION_ID]);
  const snapshot = JSON.stringify(emptyState);
  assert.equal(migrateStateFactoryPromptLibraryResumoAulaDidatica(emptyState), false);
  assert.equal(JSON.stringify(emptyState), snapshot);
});

test('script publicado, docs e cache carregam a nova versão sem divergência', () => {
  assert.equal(script, docsScript);
  assert.equal(sw, docsSw);
  assert.equal(html.includes(`script.js?v=${packageJson.version}`), true);
  assert.equal(docsHtml.includes(`script.js?v=${packageJson.version}`), true);
  assert.equal(sw.includes(`metas-estudo-${packageJson.version}`), true);
  assert.equal(docsSw.includes(`metas-estudo-${packageJson.version}`), true);
});
