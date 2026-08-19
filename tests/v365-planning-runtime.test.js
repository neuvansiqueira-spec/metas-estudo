const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'planning-runtime-v365.js'), 'utf8');

function makeContext(route = '#calendario-metas') {
  const listeners = new Map();
  const documentListeners = new Map();
  const document = {
    addEventListener(type, listener, capture = false) {
      const list = documentListeners.get(type) || [];
      list.push({ listener, capture: Boolean(capture) });
      documentListeners.set(type, list);
    }
  };
  const context = {
    console,
    Date,
    Map,
    Set,
    Object,
    String,
    Number,
    Array,
    Boolean,
    Math,
    JSON,
    document,
    location: { hash: route },
    performance: { now: (() => { let value = 0; return () => ++value; })() },
    queueMicrotask(callback) { callback(); },
    requestIdleCallback(callback) { callback(); return 1; },
    setTimeout(callback) { callback(); return 1; },
    addEventListener(type, listener) {
      const list = listeners.get(type) || [];
      list.push(listener);
      listeners.set(type, list);
    },
    dispatchEvent(event) {
      for (const listener of listeners.get(event.type) || []) listener(event);
    }
  };
  context.window = context;
  context.globalThis = context;
  context.todayISO = () => '2026-08-19';
  context.saveData = () => { context.saves = (context.saves || 0) + 1; };
  context.render = () => { context.renders = (context.renders || 0) + 1; };
  context.autoSyncAfterSave = () => { context.syncs = (context.syncs || 0) + 1; };
  context.click = (id) => {
    const target = { id, parentElement: document };
    for (const { listener, capture } of documentListeners.get('click') || []) if (capture) listener({ target });
    for (const { listener, capture } of documentListeners.get('click') || []) if (!capture) listener({ target });
  };
  vm.createContext(context);
  vm.runInContext(source, context, { filename: 'planning-runtime-v365.js' });
  return context;
}

const PIECES = [
  ['4d0ea920-103f-5837-9a0f-52c578953e5d', 'Representação por Prisão Temporária'],
  ['e0906c87-c3d8-59f6-9c7f-784eb0fcc546', 'Representação por Prisão Preventiva'],
  ['752a1824-290b-585d-a033-d1630647df77', 'Representação por Busca e Apreensão'],
  ['5ae73131-f876-5c20-a573-4f59ce7411f8', 'Representação por Interceptação Telefônica'],
  ['261e0e54-798c-5394-92d0-fb875b26e263', 'Representação por Interceptação Telemática'],
  ['fdd2ecb9-0b9c-506f-99cd-2c38dcfca534', 'Representação por Interceptação Ambiental'],
  ['75efe26c-7291-5981-a51c-42dce41b3aa8', 'Representação por Quebra de Sigilo Financeiro'],
  ['958b698b-5323-5d06-8930-ca79252bc265', 'Representação por Quebra de Sigilo Bancário'],
  ['322d5a10-97e0-53c1-976b-c6efbdb9596a', 'Representação por Quebra de Sigilo Fiscal'],
  ['d2002c8c-a3b8-5a5b-9b67-1c166d6cb7df', 'Representação por Quebra de Sigilo Telefônico'],
  ['a739d529-5420-5d11-8cd7-da3bc3b9dd88', 'Representação por Quebra de Sigilo Telemático']
];

function installPieceCatalog(context) {
  const definitions = PIECES.map(([id, subject]) => ({ id, subject }));
  context.__aldusPieceRotationRepairV358 = { pieceDefinitions: definitions, runCatalog() {} };
  context.__aldusDelegatePieceCatalogV360 = context.__aldusPieceRotationRepairV358;
  context.state.syllabusItems.push(...definitions.map(({ id, subject }) => ({
    id,
    discipline: 'PEÇA PARA DELEGADO DE POLÍCIA CIVIL',
    subject,
    supplementalDelegatePieceV360: true
  })));
}

test('V365 reaplica o ciclo das 11 Peças após redistribuição mensal', () => {
  const context = makeContext();
  context.state = { syllabusItems: [], dailyGoals: [] };
  installPieceCatalog(context);
  context.state.dailyGoals.push({
    id: 'past', date: '2026-08-18', discipline: 'PEÇA PARA DELEGADO DE POLÍCIA CIVIL',
    subject: 'Representação por Quebra de Sigilo Bancário', type: 'Estudo novo', origin: 'planejamento', status: 'Pendente'
  });
  for (let day = 19; day <= 31; day += 1) {
    context.state.dailyGoals.push({
      id: `piece-${day}`, date: `2026-08-${String(day).padStart(2, '0')}`,
      discipline: 'PEÇA PARA DELEGADO DE POLÍCIA CIVIL',
      subject: 'Representação por Quebra de Sigilo Bancário', type: 'Estudo novo', origin: 'planejamento', status: 'Pendente'
    });
  }

  const report = context.__aldusPlanningRuntimeV365.run('month-regeneration');
  const future = context.state.dailyGoals.filter((goal) => goal.date >= '2026-08-19').map((goal) => goal.subject);
  assert.equal(future[0], 'Representação por Quebra de Sigilo Fiscal');
  assert.equal(new Set(future.slice(0, 11)).size, 11, 'primeiro ciclo futuro deve usar 11 Peças distintas');
  assert.equal(report.pieceReassigned, 13);
  assert.equal(context.saves, 1);
});

test('V365 remove duplicata automática de Peça no mesmo dia e preserva manual/executada', () => {
  const context = makeContext();
  context.state = { syllabusItems: [], dailyGoals: [] };
  installPieceCatalog(context);
  context.state.dailyGoals.push(
    { id: 'auto-a', date: '2026-08-19', discipline: 'PEÇA PARA DELEGADO DE POLÍCIA CIVIL', subject: 'Representação por Quebra de Sigilo Bancário', type: 'Estudo novo', origin: 'planejamento', status: 'Pendente' },
    { id: 'auto-b', date: '2026-08-19', discipline: 'PEÇA PARA DELEGADO DE POLÍCIA CIVIL', subject: 'Representação por Quebra de Sigilo Bancário', type: 'Estudo novo', origin: 'planejamento', status: 'Pendente' },
    { id: 'manual', date: '2026-08-20', discipline: 'PEÇA PARA DELEGADO DE POLÍCIA CIVIL', subject: 'Representação por Prisão Preventiva', type: 'Estudo novo', origin: 'manual', status: 'Pendente' },
    { id: 'auto-c', date: '2026-08-20', discipline: 'PEÇA PARA DELEGADO DE POLÍCIA CIVIL', subject: 'Representação por Quebra de Sigilo Bancário', type: 'Estudo novo', origin: 'planejamento', status: 'Pendente' }
  );
  const report = context.__aldusPlanningRuntimeV365.run('repair');
  assert.equal(context.state.dailyGoals.some((goal) => goal.id === 'auto-b'), false);
  assert.equal(context.state.dailyGoals.some((goal) => goal.id === 'manual'), true);
  assert.equal(context.state.dailyGoals.some((goal) => goal.id === 'auto-c'), false, 'automática deve ceder lugar à Peça manual protegida');
  assert.equal(report.pieceDuplicatesRemoved, 2);
});

test('V365 reordena metas futuras selecionadas pela ordem didática do edital', () => {
  const context = makeContext();
  const discipline = 'DIREITO CONSTITUCIONAL';
  const syllabus = [
    ['c1', 'Princípios fundamentais'],
    ['c2', 'Organização do Estado'],
    ['c3', 'Poderes da União'],
    ['c4', 'Remédios constitucionais']
  ].map(([id, subject]) => ({ id, discipline, subject, priority: 'Média' }));
  context.state = {
    syllabusItems: syllabus,
    dailyGoals: [
      { id: 'g1', date: '2026-08-21', discipline, subject: 'Poderes da União', syllabusItemId: 'c3', origin: 'planejamento', type: 'Estudo novo', status: 'Pendente', plannedMinutes: 75 },
      { id: 'g2', date: '2026-08-22', discipline, subject: 'Remédios constitucionais', syllabusItemId: 'c4', origin: 'planejamento', type: 'Estudo novo', status: 'Pendente', plannedMinutes: 75 },
      { id: 'g3', date: '2026-08-24', discipline, subject: 'Princípios fundamentais', syllabusItemId: 'c1', origin: 'planejamento', type: 'Estudo novo', status: 'Pendente', plannedMinutes: 75 },
      { id: 'g4', date: '2026-08-27', discipline, subject: 'Organização do Estado', syllabusItemId: 'c2', origin: 'planejamento', type: 'Estudo novo', status: 'Pendente', plannedMinutes: 75 }
    ]
  };
  const report = context.__aldusPlanningRuntimeV365.run('didactic');
  assert.deepEqual(context.state.dailyGoals.map((goal) => goal.subject), syllabus.map((item) => item.subject));
  assert.deepEqual(context.state.dailyGoals.map((goal) => goal.plannedMinutes), [75, 75, 75, 75]);
  assert.equal(report.didacticDisciplines, 1);
});

test('V365 não altera meta manual nem meta já executada na ordenação didática', () => {
  const context = makeContext();
  const discipline = 'DIREITO PENAL';
  context.state = {
    syllabusItems: [
      { id: 'p1', discipline, subject: 'Parte Geral' },
      { id: 'p2', discipline, subject: 'Crimes em espécie' }
    ],
    dailyGoals: [
      { id: 'manual', date: '2026-08-19', discipline, subject: 'Crimes em espécie', syllabusItemId: 'p2', origin: 'manual', type: 'Estudo novo', status: 'Pendente' },
      { id: 'done', date: '2026-08-20', discipline, subject: 'Crimes em espécie', syllabusItemId: 'p2', origin: 'planejamento', type: 'Estudo novo', status: 'Em andamento', actualMinutes: 10 },
      { id: 'auto', date: '2026-08-21', discipline, subject: 'Parte Geral', syllabusItemId: 'p1', origin: 'planejamento', type: 'Estudo novo', status: 'Pendente' }
    ]
  };
  context.__aldusPlanningRuntimeV365.run('protected');
  assert.equal(context.state.dailyGoals[0].subject, 'Crimes em espécie');
  assert.equal(context.state.dailyGoals[1].subject, 'Crimes em espécie');
});

test('V365 limita a seleção nova à fronteira didática antes do score original', () => {
  const context = makeContext();
  const discipline = 'DIREITO PROCESSUAL PENAL';
  const items = ['Sistemas Processuais', 'Ação Penal', 'Competência', 'Sentença Penal'].map((subject, index) => ({ id: `i${index}`, discipline, subject }));
  context.state = { syllabusItems: items, dailyGoals: [] };
  context.selectPlanningGoalsForTargets = (args) => ({ selected: [args.eligibleGoals.at(-1)] });
  assert.equal(context.__aldusPlanningRuntimeV365.installSelectionGate(), true);
  const eligibleGoals = items.map((item) => ({ ...item, syllabusItemId: item.id, origin: 'edital verticalizado', type: 'Estudo novo', status: 'Pendente' }));
  const result = context.selectPlanningGoalsForTargets({ targetState: context.state, topicTarget: 1, existingGoals: [], eligibleGoals });
  assert.equal(result.selected[0].subject, 'Ação Penal', 'o score pode escolher dentro da fronteira A/B, mas não saltar diretamente para Sentença');
});

test('V365 não cria hot path contínuo nem toca armazenamento diretamente', () => {
  assert.match(source, /generateCalendarGoals/);
  assert.match(source, /exportGoalCalendarExcel/);
  assert.doesNotMatch(source, /MutationObserver|setInterval|localStorage|indexedDB|structuredClone|syncStableSerialize/);
});
