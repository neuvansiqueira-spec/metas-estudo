const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const read = (file) => fs.readFileSync(file, 'utf8');
const canonical = read('factory-resumo-aula-canonical-v327.js');
const integrated = read('factory-resumo-aula-jurisprudencia-v380.js');
const review = read('factory-final-review-v384.js');
const heading = '## AUTOSSUFICIÊNCIA DO CONTEÚDO E RESOLUÇÃO DE REMISSÕES';
const baseLine = read('script.js').split('\n').find(line => line.startsWith('const FACTORY_RESUMO_AULA_PROMPT_SEGMENT = '));
const base = JSON.parse(baseLine.trim().slice('const FACTORY_RESUMO_AULA_PROMPT_SEGMENT = '.length, -1));
const customTail = '\n\n## PREFERÊNCIAS PESSOAIS\nMANTER BEGE #EEECE1 E CITAÇÕES EM ITÁLICO.';
const oldIntegrated = base + '\n\nMÓDULO INTEGRADO — RESUMO/AULA + JURISPRUDÊNCIA\nFONTE JURISPRUDENCIAL EXCLUSIVA: PASTA SENTINELA.' + customTail;

function harness(order = ['canonical', 'integrated', 'review']) {
  const context = vm.createContext({ console });
  vm.runInContext(`
    const FACTORY_RESUMO_AULA_PROMPT = ${JSON.stringify(base)};
    const FACTORY_DOCX_EMOJI_FONT_INSTRUCTIONS = 'PRESERVAR EMOJIS';
    const FACTORY_PROMPT_TYPES = [{key:'resumoAula'}, {key:'consolidacao'}];
    const defaultFactoryPromptLibrary = {resumoAula: FACTORY_RESUMO_AULA_PROMPT};
    let state = {
      migrations: {},
      factoryPromptLibrary: {
        resumoAula: ${JSON.stringify(base + customTail)},
        resumoAulaJurisprudencia: ${JSON.stringify(oldIntegrated)},
        consolidacao: 'REVISÃO PERSONALIZADA' + ${JSON.stringify(customTail)},
        lei: 'LEI INTACTA', triagem: 'TRIAGEM INTACTA', peca: 'PEÇA INTACTA',
        padronizacaoFinal: 'CONTEÚDO BLOQUEADO', fusaoFinal: 'PRESERVAR ANOTAÇÕES'
      },
      studyLog: [{minutes: 40}], disciplines: ['SENTINELA']
    };
    let saves = 0;
    function saveData() { saves++; }
    function normalizeFactoryPromptLibrary(library) { return {...library}; }
    function factoryPromptBase(type) { return state.factoryPromptLibrary[type] || ''; }
    function factoryRouterText(type) { return 'CONTEXTO DO TEMA\\nMÓDULO: ' + type; }
  `, context);
  for (const name of order) {
    vm.runInContext({canonical, integrated, review}[name], context);
    if (name === 'integrated') vm.runInContext('__aldusFactoryResumoAulaJurisprudenciaV380.install()', context);
    if (name === 'review') vm.runInContext('__aldusFactoryFinalReviewV384.install()', context);
  }
  return context;
}

function generate(context, type) {
  return vm.runInContext(`factoryPromptBase(${JSON.stringify(type)})`, context);
}

function assertPolicy(prompt) {
  assert.equal(prompt.split(heading).length - 1, 1);
  assert.doesNotMatch(prompt, /PREFIRA LINHAS COM ATÉ 22 PALAVRAS/);
  assert.doesNotMatch(prompt, /NÃO PESQUISE, ATUALIZE, CORRIJA OU COMPLETE O CONTEÚDO\./);
  assert.match(prompt, /APAGAR A EXPRESSÃO VAGA NÃO CORRIGE A OMISSÃO/);
  assert.match(prompt, /CUMULATIVOS OU ALTERNATIVOS/);
  assert.match(prompt, /QUEM COMUNICA, A QUEM E EM QUE MOMENTO/);
  assert.match(prompt, /NÃO TROQUE “SERÁ\/DEVE” POR “PODE”/);
  assert.match(prompt, /NÃO COMPLETE POR MEMÓRIA/);
  assert.match(prompt, /O DADO EXATO QUE FALTA/);
  // V635 (21/09): densidade + completude, sem repetição. As cláusulas de 11/09 que
  // autorizavam perda de conteúdo não podem voltar.
  assert.match(prompt, /PADRÃO OBRIGATÓRIO: DENSIDADE \+ COMPLETUDE, SEM REPETIÇÃO — NÃO BREVIDADE/);
  assert.match(prompt, /NÃO SÃO CONTEÚDO ACESSÓRIO E NÃO PODEM SER OMITIDOS PARA ENCURTAR O RESUMO/);
  assert.match(prompt, /SE A CONFERÊNCIA REVELAR LACUNA, ACRESCENTE O CONTEÚDO FALTANTE, AINDA QUE ISSO AUMENTE O RESUMO/);
  for (const clausula of [
    /PRECISÃO E CONCISÃO/,
    /MENOR REDAÇÃO SUFICIENTE/,
    /DETALHES ACESSÓRIOS PODEM SER OMITIDOS/,
    /A MERA SINGULARIDADE DE UM DETALHE NÃO JUSTIFICA SUA INCLUSÃO/,
    /NÃO TENTE RESPONDER A TODA PERGUNTA POSSÍVEL/,
    /NÃO AUTORIZA AUMENTAR O ESCOPO, O DETALHAMENTO OU O TAMANHO/,
    /NÃO ACRESCENTE CONTEXTUALIZAÇÕES, DESDOBRAMENTOS/,
    /NÃO DESENVOLVA CADA ELEMENTO COMO UMA EXPLICAÇÃO AUTÔNOMA/,
    /EXPLICITE SOMENTE OS ELEMENTOS INDISPENSÁVEIS/,
    /APENAS AS INFORMAÇÕES ESSENCIAIS/,
    /PRESERVANDO A SÍNTESE/,
    /GRAU DE SÍNTESE/
  ]) {
    assert.doesNotMatch(prompt, clausula);
  }
}

test('prompts reais, salvos e personalizados recebem a política nos três modos', () => {
  for (const order of [['canonical', 'integrated', 'review'], ['integrated', 'review', 'canonical']]) {
    const context = harness(order);
    for (const type of ['resumoAula', 'resumoAulaJurisprudencia', 'consolidacao']) {
      const prompt = generate(context, type);
      assertPolicy(prompt);
      assert.ok(prompt.includes(customTail));
    }
    assert.match(generate(context, 'resumoAulaJurisprudencia'), /PASTA SENTINELA/);
    assert.equal(generate(context, 'lei'), 'LEI INTACTA');
    assert.equal(generate(context, 'triagem'), 'TRIAGEM INTACTA');
    assert.equal(generate(context, 'peca'), 'PEÇA INTACTA');
    assert.equal(generate(context, 'padronizacaoFinal'), 'CONTEÚDO BLOQUEADO');
    assert.equal(generate(context, 'fusaoFinal'), 'PRESERVAR ANOTAÇÕES');
    assert.equal(vm.runInContext('state.studyLog[0].minutes', context), 40);
    assert.equal(vm.runInContext('state.disciplines[0]', context), 'SENTINELA');
  }
});

test('guarda a primeira cópia anterior e não a substitui em reexecuções', () => {
  const context = harness();
  const key = 'state.factoryPromptLibraryBackups.resumoAulaJurisprudenciaBeforeAutossuficiencia20260910';
  assert.equal(vm.runInContext(key, context), oldIntegrated);
  vm.runInContext(canonical, context);
  generate(context, 'resumoAulaJurisprudencia');
  assert.equal(vm.runInContext(key, context), oldIntegrated);
  assertPolicy(generate(context, 'resumoAula'));
});

test('biblioteca importada e cópia antiga reintroduzida não escapam da geração', () => {
  const context = harness();
  const imported = vm.runInContext(`normalizeFactoryPromptLibrary({resumoAulaJurisprudencia:${JSON.stringify(oldIntegrated)},consolidacao:'REVISÃO IMPORTADA',lei:'LEI IMPORTADA'})`, context);
  assertPolicy(imported.resumoAulaJurisprudencia);
  assertPolicy(imported.consolidacao);
  assert.equal(imported.lei, 'LEI IMPORTADA');
  vm.runInContext(`state.factoryPromptLibrary.resumoAulaJurisprudencia=${JSON.stringify(oldIntegrated)}`, context);
  assertPolicy(generate(context, 'resumoAulaJurisprudencia'));
  vm.runInContext(`state.factoryPromptLibrary.consolidacao='REVISÃO REIMPORTADA'`, context);
  assertPolicy(generate(context, 'consolidacao'));
});

test('construção integrada preserva todas as seções mesmo com base sem cabeçalhos', () => {
  const context = harness();
  const prompt = vm.runInContext(`__aldusFactoryResumoAulaJurisprudenciaV380.buildPrompt('AULA PERSONALIZADA SEM CABEÇALHOS')`, context);
  const twice = vm.runInContext(`__aldusFactoryResumoAulaCanonicalV327.patchContentPrompt(${JSON.stringify(prompt)})`, context);
  assert.equal(twice, prompt);
  assertPolicy(prompt);
  assert.match(prompt, /1ECc_otgQKwH7WfPdQr8CtD0kB07pz9Xe/);
  assert.match(prompt, /NÃO use internet, memória do modelo/);
  assert.match(prompt, /QUADRO FINAL DE JURISPRUDÊNCIA/);
  assert.match(prompt, /PRESERVAR EMOJIS/);
});

test('prompt próprio sem assinatura não é substituído por todo o modelo padrão', () => {
  const context = harness();
  vm.runInContext(`state.factoryPromptLibrary.resumoAula='MINHA AULA PERSONALIZADA EM FONTE 14'`, context);
  const prompt = generate(context, 'resumoAula');
  assertPolicy(prompt);
  assert.match(prompt, /^MINHA AULA PERSONALIZADA EM FONTE 14/);
  assert.doesNotMatch(prompt, /ARIAL 11/);
});

test('política preserva vazios e placeholders em vez de simular prompt completo', () => {
  const context = harness();
  for (const text of ['', '[PROMPT COMPLETO AINDA NÃO CADASTRADO NA BIBLIOTECA DA FÁBRICA]']) {
    assert.equal(vm.runInContext(`__aldusFactoryResumoAulaCanonicalV327.patchContentPrompt(${JSON.stringify(text)})`, context), text);
  }
});

test('migra a política anterior sem acumular seções nem perder preferências e backups', () => {
  const context = harness();
  const oldPolicy = base + '\nRECUPERE INTEGRALMENTE AS INFORMAÇÕES PERTINENTES NAS FONTES AUTORIZADAS.\n\n' + heading + '\nPOLÍTICA ANTERIOR DO USUÁRIO\nFIM DAS REGRAS DE AUTOSSUFICIÊNCIA.' + customTail;
  const firstBackup = vm.runInContext('state.factoryPromptLibraryBackups.resumoAulaBeforeAutossuficiencia20260910', context);
  vm.runInContext(`
    state.factoryPromptLibrary.resumoAula = ${JSON.stringify(oldPolicy)};
    delete state.factoryPromptLibraryBackups.resumoAulaBeforePrecisaoConcisao20260911;
  `, context);
  const migrated = generate(context, 'resumoAula');
  assertPolicy(migrated);
  assert.doesNotMatch(migrated, /POLÍTICA ANTERIOR DO USUÁRIO/);
  assert.match(migrated, /APLICAÇÃO TRANSVERSAL A TODAS AS DISCIPLINAS/);
  assert.ok(migrated.endsWith(customTail));
  assert.equal(vm.runInContext('state.factoryPromptLibraryBackups.resumoAulaBeforePrecisaoConcisao20260911', context), oldPolicy);
  assert.equal(vm.runInContext('state.factoryPromptLibraryBackups.resumoAulaBeforeAutossuficiencia20260910', context), firstBackup);
  assert.equal(generate(context, 'resumoAula'), migrated);
  vm.runInContext(canonical, context);
  assert.equal(vm.runInContext('state.factoryPromptLibraryBackups.resumoAulaBeforePrecisaoConcisao20260911', context), oldPolicy);
});

test('V635 converte o prompt salvo com a política de concisão de 11/09 e guarda o anterior', () => {
  const concisao1109 = base
    + '\nNÃO ACRESCENTE CONTEÚDO EXTERNO NEM ATUALIZE POR MEMÓRIA. RECUPERE NAS FONTES AUTORIZADAS APENAS AS INFORMAÇÕES ESSENCIAIS À COMPREENSÃO DO RECORTE RESUMIDO, PRESERVANDO A SÍNTESE E A FORMATAÇÃO.\n\n'
    + heading + '\n\nAPLICAÇÃO TRANSVERSAL A TODAS AS DISCIPLINAS — PRECISÃO E CONCISÃO\n\n'
    + 'PRESERVAÇÃO OBRIGATÓRIA DA ESSÊNCIA DO RESUMO. COMPLETE SOMENTE A LACUNA ESSENCIAL, COM A MENOR REDAÇÃO SUFICIENTE PARA PRESERVAR SENTIDO E PRECISÃO. '
    + 'DETALHES ACESSÓRIOS PODEM SER OMITIDOS PELA SÍNTESE MESMO QUE SEJAM ÚNICOS. NÃO TENTE RESPONDER A TODA PERGUNTA POSSÍVEL SOBRE O TEMA.\n\n'
    + 'FIM DAS REGRAS DE AUTOSSUFICIÊNCIA.' + customTail;
  for (const type of ['resumoAula', 'resumoAulaJurisprudencia', 'consolidacao']) {
    const context = harness();
    vm.runInContext(`
      state.factoryPromptLibrary[${JSON.stringify(type)}] = ${JSON.stringify(concisao1109)};
      delete state.factoryPromptLibraryBackups[${JSON.stringify(type + 'BeforeDensidadeCompletude20260921')}];
    `, context);
    const migrated = generate(context, type);
    assertPolicy(migrated);
    assert.match(migrated, /RECUPERE INTEGRALMENTE NAS FONTES AUTORIZADAS AS INFORMAÇÕES PERTINENTES AO RECORTE/);
    assert.equal(migrated.split(heading).length - 1, 1);
    assert.ok(migrated.endsWith(customTail));
    if (type === 'resumoAula') {
      assert.equal(vm.runInContext(`state.factoryPromptLibraryBackups[${JSON.stringify(type + 'BeforeDensidadeCompletude20260921')}]`, context), concisao1109);
    }
    assert.equal(generate(context, type), migrated, 'a conversão é idempotente');
  }
});

test('aplica a mesma política transversal sem substituir o conteúdo de disciplinas diferentes', () => {
  const context = harness();
  for (const subject of ['MATEMÁTICA — PROPORÇÕES E UNIDADES', 'INFORMÁTICA — PROTOCOLOS E VERSÕES', 'DIREITO — REGRAS E EXCEÇÕES']) {
    const customized = `MINHA AULA: ${subject}\nFONTES: APENAS A PASTA DO TEMA.` + customTail;
    vm.runInContext(`state.factoryPromptLibrary.resumoAula = ${JSON.stringify(customized)}`, context);
    const prompt = generate(context, 'resumoAula');
    assert.ok(prompt.startsWith(`MINHA AULA: ${subject}\nFONTES: APENAS A PASTA DO TEMA.`));
    assert.ok(prompt.endsWith(customTail));
    assertPolicy(prompt);
    assert.match(prompt, /NÃO FORCE CATEGORIAS JURÍDICAS NEM JURISPRUDÊNCIA/);
    assert.match(prompt, /UNIDADES, BASES DE CÁLCULO, SIGNIFICADO DAS VARIÁVEIS/);
    assert.equal(generate(context, 'resumoAula'), prompt);
  }
});

test('os três caminhos de geração mantêm precisão, deduplicação e a exceção de retomada local', () => {
  for (const order of [['canonical', 'integrated', 'review'], ['integrated', 'review', 'canonical']]) {
    const context = harness(order);
    for (const type of ['resumoAula', 'resumoAulaJurisprudencia', 'consolidacao']) {
      const prompt = generate(context, type);
      assert.match(prompt, /MANTENHA CADA PRAZO, PERCENTUAL, LIMITE OU RESULTADO LIGADO À SUA HIPÓTESE/);
      assert.match(prompt, /COMPARE O SENTIDO, NÃO APENAS AS PALAVRAS/);
      assert.match(prompt, /É PERMITIDO RETOMAR UMA INFORMAÇÃO QUANDO ELA FOR NECESSÁRIA/);
      assert.match(prompt, /NÃO CONFUNDA CONTRADIÇÃO, DIFERENÇA DE HIPÓTESE OU COMPLEMENTO COM DUPLICAÇÃO/);
      assert.match(prompt, /COMPARE TESE POR TESE/);
      assert.match(prompt, /CORRIJA AS FALHAS IDENTIFICADAS; NÃO SE LIMITE A DECLARAR QUE REVISOU/);
    }
  }
});
