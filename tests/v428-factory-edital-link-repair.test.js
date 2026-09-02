const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const modulePath = path.join(root, 'factory-edital-link-repair-v428.js');
const api = require(modulePath);
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const MODULE_WORK = { resumoAula: { status: 'Aprovado', wordLink: '', pdfLink: 'https://drive/x' } };

function factoryItem(overrides = {}) {
  const disciplina = overrides.disciplina ?? 'MEDICINA LEGAL';
  const tema = overrides.tema ?? 'Balística forense';
  return {
    id: overrides.id ?? `id-${tema}-${disciplina}`,
    disciplina,
    tema,
    createdAt: overrides.createdAt ?? '2026-07-10T00:00:00.000Z',
    factoryDestinationFolder: overrides.factoryDestinationFolder ?? '',
    modules: overrides.modules ?? {},
    editalLink: overrides.editalLink === null ? undefined : {
      groupKey: overrides.groupKey ?? `edital:${disciplina.toLowerCase()}|${tema.toLowerCase()}`,
      discipline: overrides.linkDiscipline ?? disciplina,
      subject: tema
    }
  };
}

function baseState(agenda) {
  const state = {
    factoryAgenda: agenda,
    syllabusItems: [],
    dailyGoals: [],
    studies: [],
    materials: [],
    questionLogs: [],
    questionBank: [],
    questionBankSessions: [],
    questionErrorNotebook: [],
    simulados: [],
    subjects: [],
    disciplineWeights: {}
  };
  state.factoryItems = state.factoryAgenda;
  return state;
}

test('V428 reescreve a disciplina em factoryAgenda, a coleção que a V426 esqueceu', () => {
  const state = baseState([factoryItem()]);
  const result = api.apply(state);
  assert.equal(result.blocked, false);
  assert.equal(state.factoryAgenda[0].disciplina, 'CIÊNCIAS FORENSES');
  assert.equal(result.report.renamedByCollection.factoryAgenda, 1);
});

test('V428 reescreve editalLink.groupKey e editalLink.discipline junto da disciplina', () => {
  const state = baseState([factoryItem()]);
  api.apply(state);
  const link = state.factoryAgenda[0].editalLink;
  assert.equal(link.groupKey, 'edital:ciências forenses|balística forense');
  assert.equal(link.discipline, 'CIÊNCIAS FORENSES');
});

test('V428 usa a mesma canonical de script.js: minúsculas sem remover acento', () => {
  assert.equal(api.canonical(' MEDICINA LEGAL '), 'medicina legal');
  assert.equal(api.factoryEditalGroupKey('CIÊNCIAS FORENSES', 'Balística forense'), 'edital:ciências forenses|balística forense');
  assert.match(api.factoryEditalGroupKey('CIÊNCIAS FORENSES', 'x'), /ciências/, 'remover acento produziria chave que o sync não reconhece');
});

test('V428 remove a cópia vazia e preserva o original com trabalho de módulo', () => {
  const original = factoryItem({ id: 'velho', modules: MODULE_WORK, createdAt: '2026-07-10T00:00:00.000Z' });
  const copia = factoryItem({
    id: 'novo', disciplina: 'CIÊNCIAS FORENSES', createdAt: '2026-09-01T21:07:24.518Z',
    groupKey: 'edital:ciências forenses|balística forense'
  });
  const state = baseState([original, copia]);
  const result = api.apply(state);
  assert.equal(result.report.removedCount, 1);
  assert.equal(state.factoryAgenda.length, 1);
  assert.equal(state.factoryAgenda[0].id, 'velho');
});

test('V428 preserva os dois quando o trabalho está na cópia mais nova', () => {
  const original = factoryItem({ id: 'velho', createdAt: '2026-07-10T00:00:00.000Z' });
  const copia = factoryItem({
    id: 'novo', disciplina: 'CIÊNCIAS FORENSES', createdAt: '2026-09-01T21:07:24.518Z',
    groupKey: 'edital:ciências forenses|balística forense', modules: MODULE_WORK
  });
  const state = baseState([original, copia]);
  const result = api.apply(state);
  assert.equal(result.report.removedCount, 0);
  assert.equal(state.factoryAgenda.length, 2);
  assert.match(result.report.preserved[0].reason, /cópia mais nova/);
});

test('V428 nunca remove item referenciado por meta diária', () => {
  const original = factoryItem({ id: 'velho', modules: MODULE_WORK });
  const copia = factoryItem({
    id: 'novo', disciplina: 'CIÊNCIAS FORENSES', createdAt: '2026-09-01T21:07:24.518Z',
    groupKey: 'edital:ciências forenses|balística forense'
  });
  const state = baseState([original, copia]);
  state.dailyGoals.push({ id: 'g1', factoryItemId: 'novo' });
  const result = api.apply(state);
  assert.equal(result.report.removedCount, 0);
  assert.equal(state.factoryAgenda.length, 2);
});

test('V428 grava tombstones por id nas duas coleções e guarda os registros removidos', () => {
  const original = factoryItem({ id: 'velho', modules: MODULE_WORK });
  const copia = factoryItem({
    id: 'novo', disciplina: 'CIÊNCIAS FORENSES', createdAt: '2026-09-01T21:07:24.518Z',
    groupKey: 'edital:ciências forenses|balística forense'
  });
  const state = baseState([original, copia]);
  api.apply(state);
  assert.ok(state.syncTombstones.collections.factoryItems['factoryItems:id:novo']);
  assert.ok(state.syncTombstones.collections.factoryAgenda['factoryAgenda:id:novo']);
  assert.equal(state.migrations.factoryEditalLinkRepairV428.removedRecords.length, 1);
  assert.equal(state.migrations.factoryEditalLinkRepairV428.removedRecords[0].id, 'novo');
});

test('V428 mantém factoryItems apontando para factoryAgenda', () => {
  const state = baseState([factoryItem()]);
  api.apply(state);
  assert.equal(state.factoryItems, state.factoryAgenda, 'quebrar o apelido faria ensureFactoryAgenda descartar o reparo');
});

test('V428 reprova o estado antes do reparo e aprova depois', () => {
  const state = baseState([factoryItem()]);
  const antes = api.verify(state);
  assert.equal(antes.ok, false, 'antes do reparo o vínculo aponta para a disciplina antiga');
  assert.ok(antes.errors.some((message) => /nomes antigos|vínculo inconsistente/.test(message)));
  api.apply(state);
  assert.deepEqual(api.verify(state), { ok: true, errors: [] });
});

test('V428 aborta sem escrita parcial quando o estado não pode ser processado', () => {
  const item = factoryItem();
  // Estado corrompido: o getter estoura durante a clonagem, antes de qualquer escrita.
  Object.defineProperty(item, 'modules', { enumerable: true, get() { throw new Error('estado corrompido'); } });
  const state = baseState([item]);
  const result = api.apply(state);
  assert.equal(result.blocked, true);
  assert.equal(result.reason, 'postcondition');
  assert.equal(state.factoryAgenda[0].disciplina, 'MEDICINA LEGAL', 'o estado real não pode ser tocado');
  assert.equal(state.factoryAgenda[0].editalLink.groupKey, 'edital:medicina legal|balística forense');
  assert.equal(state.migrations, undefined, 'nenhum marcador de conclusão é gravado');
});

test('V428 é idempotente: a segunda execução não altera nada', () => {
  const original = factoryItem({ id: 'velho', modules: MODULE_WORK });
  const copia = factoryItem({
    id: 'novo', disciplina: 'CIÊNCIAS FORENSES', createdAt: '2026-09-01T21:07:24.518Z',
    groupKey: 'edital:ciências forenses|balística forense'
  });
  const state = baseState([original, copia]);
  api.apply(state);
  const snapshot = JSON.stringify(state.factoryAgenda);
  const again = api.apply(state);
  assert.equal(again.repeated, true);
  assert.equal(again.changed, false);
  assert.equal(JSON.stringify(state.factoryAgenda), snapshot);
});

test('V428 classifica a Etapa A pelo número da lei presente no texto', () => {
  const proc = api.resolvedDiscipline({
    disciplina: 'LEGISLAÇÃO PENAL E PROCESSUAL PENAL ESPECIAL',
    tema: 'Identificação criminal — Lei 12.037/2009'
  });
  assert.equal(proc, 'LEGISLAÇÃO ESPECÍFICA – DIREITO PROCESSUAL PENAL');
  const adm = api.resolvedDiscipline({
    disciplina: 'LEGISLAÇÃO PENAL E PROCESSUAL PENAL ESPECIAL',
    tema: 'Improbidade administrativa', observacao: 'Lei 8.429'
  });
  assert.equal(adm, 'DIREITO ADMINISTRATIVO');
  const penal = api.resolvedDiscipline({
    disciplina: 'LEGISLAÇÃO PENAL E PROCESSUAL PENAL ESPECIAL',
    tema: 'Crime sem lei mapeada'
  });
  assert.equal(penal, 'LEGISLAÇÃO ESPECÍFICA – DIREITO PENAL');
});

test('V428 alcança os vínculos do edital inativo, não só os que já duplicaram', () => {
  const inativo = factoryItem({ id: 'pcma', tema: 'Tema só da PCMA' });
  const state = baseState([inativo]);
  api.apply(state);
  assert.equal(state.factoryAgenda[0].editalLink.groupKey, 'edital:ciências forenses|tema só da pcma');
  assert.equal(state.factoryAgenda[0].disciplina, 'CIÊNCIAS FORENSES');
});

test('V428 relata duplicatas remanescentes sem removê-las', () => {
  const a = factoryItem({ id: 'a', modules: MODULE_WORK });
  const b = factoryItem({ id: 'b', modules: MODULE_WORK, createdAt: '2026-08-01T00:00:00.000Z' });
  const state = baseState([a, b]);
  const result = api.apply(state);
  assert.equal(result.report.removedCount, 0);
  assert.equal(result.report.leftoverDuplicateGroups.length, 1);
  assert.equal(state.factoryAgenda.length, 2);
});

test('V428 não altera o tamanho das coleções protegidas', () => {
  const state = baseState([factoryItem()]);
  state.syllabusItems.push({ id: 's1', discipline: 'MEDICINA LEGAL', subject: 'Quesitos oficiais' });
  state.studies.push({ id: 'e1', discipline: 'MEDICINA LEGAL' });
  state.materials.push({ id: 'm1', discipline: 'MEDICINA LEGAL' });
  api.apply(state);
  assert.equal(state.syllabusItems.length, 1);
  assert.equal(state.studies.length, 1);
  assert.equal(state.materials.length, 1);
  assert.equal(state.syllabusItems[0].discipline, 'CIÊNCIAS FORENSES');
  assert.equal(state.materials[0].discipline, 'CIÊNCIAS FORENSES');
});

test('V428 não introduz polling, temporizador nem gravação fora do fluxo', () => {
  const source = read('factory-edital-link-repair-v428.js');
  assert.doesNotMatch(source, /setInterval|requestAnimationFrame|MutationObserver/);
  assert.doesNotMatch(source, /localStorage|indexedDB/);
  const saves = source.match(/saveData\(\)/g) || [];
  assert.equal(saves.length, 1, 'a persistência ocorre uma única vez, após o reparo');
});

test('V428 alcança o estado declarado como const no escopo global', () => {
  const vm = require('node:vm');
  const source = read('factory-edital-link-repair-v428.js');
  const listeners = new Map();
  const context = vm.createContext({
    console: { info() {}, warn() {} },
    structuredClone,
    window: { addEventListener: (nome, fn) => listeners.set(nome, fn), dispatchEvent: () => true },
    CustomEvent: class { constructor(nome, init) { this.type = nome; this.detail = init?.detail; } }
  });
  context.__disparaLoad = () => listeners.get('load')?.();
  // Reproduz script.js:1091 — `const state` cria binding léxico global,
  // visível como identificador e ausente de globalThis.
  vm.runInContext(`const state = ${JSON.stringify({
    factoryAgenda: [{
      id: 'a', disciplina: 'MEDICINA LEGAL', tema: 'Balística forense',
      createdAt: '2026-07-10T00:00:00.000Z', modules: {},
      editalLink: { groupKey: 'edital:medicina legal|balística forense', discipline: 'MEDICINA LEGAL' }
    }],
    dailyGoals: [], syllabusItems: [], studies: [], materials: []
  })}; globalThis.__leituraDoGlobal = typeof globalThis.state;`, context);
  assert.equal(context.__leituraDoGlobal, 'undefined', 'globalThis.state não existe para um const global');

  vm.runInContext(source, context);
  // Exercita o caminho real de boot — runOnce via evento —, e não apply() com
  // o estado passado à mão, que passaria mesmo lendo globalThis.state.
  vm.runInContext('globalThis.__disparaLoad();', context);
  vm.runInContext('globalThis.__disciplina = state.factoryAgenda[0].disciplina;', context);
  assert.equal(context.__disciplina, 'CIÊNCIAS FORENSES', 'ler apenas globalThis.state faria o reparo sair em silêncio');
  vm.runInContext('globalThis.__marcador = !!state.migrations?.factoryEditalLinkRepairV428?.completed;', context);
  assert.equal(context.__marcador, true);
});

test('V428 não depende exclusivamente de globalThis.state', () => {
  const source = read('factory-edital-link-repair-v428.js');
  assert.match(source, /function resolveAppState\(\)/);
  assert.doesNotMatch(source, /const state = globalThis\.state;/, 'foi o que impediu o reparo de rodar na V428 inicial');
});

test('V428 mantém paridade raiz/docs', () => {
  assert.equal(read('factory-edital-link-repair-v428.js'), read('docs/factory-edital-link-repair-v428.js'));
});

test('V428 é publicado pelo carregador de módulos com cache-bust', () => {
  const loader = read('performance-emergency-v350.js');
  assert.match(loader, /factory-edital-link-repair-v428\.js\?v=/);
  assert.equal(read('performance-emergency-v350.js'), read('docs/performance-emergency-v350.js'));
});
