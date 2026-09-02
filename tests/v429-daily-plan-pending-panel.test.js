const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const api = require(path.join(root, 'daily-plan-pending-panel-v429.js'));

function goal(id, date, discipline, subject, done = false) {
  return { id, date, data: date, discipline, subject, status: done ? 'Concluída' : 'Pendente', done };
}

function stateWith(goals) {
  const target = { dailyGoals: goals };
  globalThis.state = target;
  globalThis.todayISO = () => '2026-09-02';
  globalThis.goalDateValue = (g) => g.date || g.data || '';
  globalThis.isGoalDone = (g) => g.done === true || g.status === 'Concluída';
  return target;
}

test('V429 lista apenas metas pendentes de datas passadas', () => {
  stateWith([
    goal('a', '2026-08-30', 'DIREITO PENAL', 'Teoria da pena'),
    goal('b', '2026-09-02', 'DIREITO PENAL', 'Meta de hoje'),
    goal('c', '2026-08-28', 'DIREITO PENAL', 'Concluída antiga', true),
    goal('d', '2026-09-10', 'DIREITO CIVIL', 'Meta futura')
  ]);
  const pendentes = api.overdueGoals();
  assert.deepEqual(pendentes.map((g) => g.id), ['a'],
    'hoje, futuro e concluídas não são pendências de outros dias');
});

test('V429 agrupa por disciplina, da mais atrasada para a menos', () => {
  stateWith([
    goal('a', '2026-08-30', 'DIREITO PENAL', 'Um'),
    goal('b', '2026-08-29', 'DIREITO PENAL', 'Dois'),
    goal('c', '2026-08-28', 'DIREITO CIVIL', 'Três')
  ]);
  const grupos = api.groupByDiscipline(api.overdueGoals());
  assert.equal(grupos[0][0], 'DIREITO PENAL');
  assert.equal(grupos[0][1].length, 2);
  assert.equal(grupos[1][0], 'DIREITO CIVIL');
});

test('V429 trata meta sem disciplina sem quebrar o agrupamento', () => {
  stateWith([goal('a', '2026-08-30', '', 'Sem disciplina')]);
  const grupos = api.groupByDiscipline(api.overdueGoals());
  assert.equal(grupos[0][0], 'Sem disciplina');
});

test('V429 traz a meta para hoje preservando identidade e histórico', () => {
  const target = stateWith([goal('a', '2026-08-30', 'DIREITO PENAL', 'Teoria da pena')]);
  const historico = [];
  globalThis.appendGoalHistory = (g, texto) => historico.push(texto);
  globalThis.saveData = () => {};
  try {
    assert.equal(api.bringToToday('a'), true);
    const movida = target.dailyGoals[0];
    assert.equal(movida.id, 'a', 'a meta é movida, não recriada');
    assert.equal(movida.date, '2026-09-02');
    assert.equal(movida.data, '2026-09-02');
    assert.equal(movida.status, 'Reagendada');
    assert.match(historico[0], /Trazida de 2026-08-30 para 2026-09-02/);
    assert.equal(target.dailyGoals.length, 1, 'nenhuma meta nova é criada');
  } finally {
    delete globalThis.appendGoalHistory;
    delete globalThis.saveData;
  }
});

test('V429 protege a meta trazida com userEdited, a flag que a V419 nunca ligou', () => {
  const target = stateWith([goal('a', '2026-08-30', 'DIREITO PENAL', 'Teoria da pena')]);
  globalThis.saveData = () => {};
  try {
    api.bringToToday('a');
    assert.equal(target.dailyGoals[0].userEdited, true,
      'isProtectedDailyGoal já respeita a flag; sem ela a meta trazida poderia ser removida depois');
  } finally {
    delete globalThis.saveData;
  }
});

test('V429 não reconcilia ao trazer: dia cheio não perde meta para acomodar', () => {
  const source = read('daily-plan-pending-panel-v429.js');
  const codigo = source.split('\n').filter((linha) => !linha.trim().startsWith('//')).join('\n');
  assert.doesNotMatch(codigo, /reconcileDailyGoalsWithPlanning|reconcilePlanningDates/,
    'removeGoals(excess) roda mesmo sem rebuildAutomatic e despejaria uma meta do dia');
});

test('V429 ignora id inexistente e meta que já está em hoje', () => {
  const target = stateWith([goal('a', '2026-09-02', 'DIREITO PENAL', 'Já é de hoje')]);
  globalThis.saveData = () => {};
  try {
    assert.equal(api.bringToToday('inexistente'), false);
    assert.equal(api.bringToToday('a'), false);
    assert.equal(target.dailyGoals[0].status, 'Pendente', 'nada é alterado');
  } finally {
    delete globalThis.saveData;
  }
});

test('V429 escapa o texto vindo dos dados do usuário', () => {
  const source = read('daily-plan-pending-panel-v429.js');
  assert.match(source, /function escapeText/);
  assert.match(source, /escapeText\(subjectOf\(goal\)\)/);
  assert.match(source, /escapeText\(discipline\)/);
  assert.doesNotMatch(source, /\$\{subjectOf\(goal\)\}/, 'assunto nunca entra cru no HTML');
});

test('V429 não remove nem cria metas em nenhum caminho', () => {
  const source = read('daily-plan-pending-panel-v429.js');
  const codigo = source.split('\n').filter((linha) => !linha.trim().startsWith('//')).join('\n');
  assert.doesNotMatch(codigo, /dailyGoals\s*=\s*|\.splice\(|\.push\(\s*\{/);
  assert.doesNotMatch(codigo, /setInterval|MutationObserver/);
});

test('V429 alcança o estado declarado como const no escopo global', () => {
  const vm = require('node:vm');
  const listeners = new Map();
  const context = vm.createContext({
    console: { warn() {}, info() {} },
    document: null,
    window: { addEventListener: (nome, fn) => listeners.set(nome, fn) }
  });
  vm.runInContext(`const state = { dailyGoals: [{ id: 'a', date: '2026-08-30', discipline: 'X', subject: 'Y', status: 'Pendente' }] };
    function todayISO() { return '2026-09-02'; }
    function goalDateValue(g) { return g.date; }
    function isGoalDone() { return false; }
    globalThis.__leituraDoGlobal = typeof globalThis.state;`, context);
  assert.equal(context.__leituraDoGlobal, 'undefined');
  vm.runInContext(read('daily-plan-pending-panel-v429.js'), context);
  vm.runInContext('globalThis.__pendentes = __ALDUS_DAILY_PLAN_PENDING_PANEL_V429__.overdueGoals().length;', context);
  assert.equal(context.__pendentes, 1, 'ler apenas globalThis.state deixaria o painel sempre vazio');
});

test('V429 mantém paridade raiz/docs e é publicado com cache-bust', () => {
  assert.equal(read('daily-plan-pending-panel-v429.js'), read('docs/daily-plan-pending-panel-v429.js'));
  const loader = read('performance-emergency-v350.js');
  assert.match(loader, /daily-plan-pending-panel-v429\.js\?v=/);
  assert.equal(loader, read('docs/performance-emergency-v350.js'));
});
