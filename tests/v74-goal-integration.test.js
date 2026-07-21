const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const script = fs.readFileSync('script.js', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');
const version = JSON.parse(fs.readFileSync('package.json', 'utf8')).version;

function sourceBetween(start, end) {
  const from = script.indexOf(start);
  const to = script.indexOf(end, from + start.length);
  assert.notEqual(from, -1, `Marcador inicial ausente: ${start}`);
  assert.notEqual(to, -1, `Marcador final ausente: ${end}`);
  return script.slice(from, to);
}

function canonical(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

test('seletor cumpre assuntos e disciplinas como metas diferentes', () => {
  const context = {
    canonical,
    todayISO: () => '2026-07-19',
    planningItemKey: (goal) => canonical(`${goal.discipline}|${goal.subject}`),
  };
  vm.createContext(context);
  vm.runInContext(sourceBetween('function selectPlanningGoalsForTargets', 'function selectableDisciplineGoalsForDate'), context);
  const eligibleGoals = [
    { discipline: 'A', subject: 'A1' },
    { discipline: 'A', subject: 'A2' },
    { discipline: 'B', subject: 'B1' },
    { discipline: 'B', subject: 'B2' },
    { discipline: 'C', subject: 'C1' },
  ];
  const result = context.selectPlanningGoalsForTargets({ topicTarget: 3, disciplineTarget: 2, eligibleGoals });
  assert.equal(result.selected.length, 3);
  assert.equal(new Set(result.selected.map((goal) => goal.discipline)).size, 2);
  assert.equal(new Set(result.selected.map((goal) => `${goal.discipline}|${goal.subject}`)).size, 3);
});

test('tipo e disponibilidade do dia controlam a meta de estudo', () => {
  const context = {
    state: {},
    planningConfig: () => ({ topicsPerDay: 3, disciplinesPerDay: 2 }),
    getDayContentConfig: () => ({ mode: 'goals_only' }),
    dayModeIncludesGoals: (mode) => mode !== 'questions_only',
    availabilityForDate: () => ({ type: 'dia normal' }),
  };
  vm.createContext(context);
  vm.runInContext(sourceBetween('function planningTargetsForDate', 'function eligiblePlanningGoalsForDate'), context);
  assert.deepEqual({ ...context.planningTargetsForDate('2026-07-19') }, { topics: 3, disciplines: 2, dayContent: { mode: 'goals_only' }, unavailable: false });
  context.getDayContentConfig = () => ({ mode: 'questions_only' });
  assert.equal(context.planningTargetsForDate('2026-07-19').topics, 0);
  context.getDayContentConfig = () => ({ mode: 'goals_only' });
  context.availabilityForDate = () => ({ type: 'indisponível' });
  assert.equal(context.planningTargetsForDate('2026-07-19').topics, 0);
  assert.equal(context.planningTargetsForDate('2026-07-19', context.state, { manual: true }).topics, 3);
});

test('calendário gera, salva e sincroniza sem variável de contexto ausente', () => {
  const generation = sourceBetween('function generateGoalsForDate', 'function limitGeneratedGoals');
  const save = sourceBetween('function saveGeneratedGoals', 'function monthlyPlanningTarget');
  assert.match(generation, /const context = opts\.scoreContext \|\| buildPlanningScoreContext\(targetState\)/);
  assert.match(save, /state\.dailyGoals\.push\(\.\.\.unique\)/);
  assert.match(save, /saveData\(\{ markLocalChange: true \}\)/);
  assert.match(save, /autoSyncAfterSave\("calendar-goals-generation"\)/);
  assert.match(script, /dateRemainingTopics/);
  assert.match(script, /planningTargetsForDate\(date\)/);
});

test('planejamento, disponibilidade e metas mensais persistem e reconciliam', () => {
  const planningEvents = sourceBetween('function setPlanningSaveStatus', 'if (elements.generateDailyGoals)');
  assert.match(planningEvents, /reconcilePlanningDates\(state,[\s\S]*\{ rebuildAutomatic: true \}\)/);
  assert.match(planningEvents, /reconcileDailyGoalsWithPlanning\(state, date, \{ rebuildAutomatic: true \}\)/);
  assert.match(planningEvents, /saveData\(\{ markLocalChange: true \}\)/);
  assert.match(planningEvents, /autoSyncAfterSave\("planning"\)/);
  assert.match(script, /autoSyncAfterSave\("planning-availability"\)/);
  assert.match(script, /autoSyncAfterSave\("goal-calendar-weights"\)/);
  assert.match(script, /autoSyncAfterSave\("goal-calendar-monthly-target"\)/);
});

test('edição atualiza a meta existente e registros de questões são persistidos', () => {
  assert.match(html, /id="goalEditingId" type="hidden"/);
  assert.match(html, /id="cancelGoalEdit"/);
  assert.match(html, /id="goalSubmitButton"/);
  assert.match(script, /const existing = editingId \? state\.dailyGoals\.find/);
  assert.match(script, /Object\.assign\(existing, payload\)/);
  assert.match(script, /resetGoalFormEditing\(selectedDate\)/);
  assert.match(script, /autoSyncAfterSave\("daily-goal"\)/);
  const questionSave = sourceBetween('function saveQuestionLog', 'function questionRecordItem');
  assert.match(questionSave, /saveData\(\{ markLocalChange: true \}\)/);
  assert.match(questionSave, /autoSyncAfterSave\("question-log"\)/);
});

test('Central diferencia metas geradas de previsões e usa o mesmo estado', () => {
  const central = sourceBetween('function renderCentralGoals', 'function factoryEntryForDailyGoal');
  assert.match(central, /goalDateValue\(goal\) === date/);
  assert.match(central, /\$\{goals\.length\} gerada\(s\)/);
  assert.match(central, /\$\{target\} prevista\(s\) • a gerar/);
  assert.match(central, /monthlyPlanningTarget\(today\)/);
});

test('V74 renova cache e mantém raiz e publicação idênticas', () => {
  const worker = fs.readFileSync('service-worker.js', 'utf8');
  assert.equal(version, '20260719-integracao-metas-v74');
  assert.match(script, /const APP_VERSION = "20260719-integracao-metas-v74"/);
  assert.match(html, /Versão: 20260719-integracao-metas-v74/);
  assert.match(worker, /const CURRENT_VERSION = "20260719-integracao-metas-v74"/);
  assert.match(worker, /startup-v28/);
  assert.match(worker, /"20260719-rolagem-navegacao-v73"/);
  assert.equal(script, fs.readFileSync('docs/script.js', 'utf8'));
  assert.equal(html, fs.readFileSync('docs/index.html', 'utf8'));
  assert.equal(worker, fs.readFileSync('docs/service-worker.js', 'utf8'));
});
