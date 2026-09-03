const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const source = read('daily-plan-visible-goals-v441.js');
const api = require(path.join(root, 'daily-plan-visible-goals-v441.js'));
const TODAY = '2026-09-03';

function goal(id, options = {}) {
  return {
    ...(id === undefined ? {} : { id }),
    date: options.date || TODAY,
    discipline: options.discipline || 'DIREITO PENAL',
    subject: options.subject || id || 'Sem id',
    origin: options.origin || 'Planejamento',
    status: options.status || 'Pendente',
    ...options
  };
}

function withCoreGlobals(callback) {
  const previous = {
    goalDateValue: globalThis.goalDateValue,
    isProtectedDailyGoal: globalThis.isProtectedDailyGoal,
    dailyPlanGoalsForDisplay: globalThis.dailyPlanGoalsForDisplay
  };
  globalThis.goalDateValue = (item) => item?.date || item?.data || '';
  globalThis.isProtectedDailyGoal = (item) => item?.origin === 'Manual'
    || item?.userEdited === true
    || Number(item?.actualMinutes) > 0
    || Boolean(item?.history?.length);
  try {
    return callback();
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete globalThis[key];
      else globalThis[key] = value;
    }
  }
}

test('V441 restaura a meta manual e a peça protegida omitidas pelo filtro original', () => withCoreGlobals(() => {
  const visible = goal('visivel');
  const manual = goal('dedicacao-delta', { discipline: 'DEDICAÇÃO DELTA', subject: 'SEMANA 01', origin: 'Manual' });
  const piece = goal('apf', { discipline: 'PEÇA PARA DELEGADO DE POLÍCIA CIVIL', subject: 'Auto de Prisão em Flagrante', actualMinutes: 15 });
  const automatic = goal('automatica');
  const result = api.restoreProtectedGoals([visible], { dailyGoals: [visible, manual, piece, automatic] }, TODAY);
  assert.deepEqual(result.map((item) => item.id), ['visivel', 'dedicacao-delta', 'apf']);
}));

test('V441 faz dailyPlanGoalsForDisplay retornar a meta manual de hoje cujo assunto já consta concluído', () => {
  const listeners = new Map();
  const context = vm.createContext({
    console: { warn() {}, info() {} },
    window: { addEventListener: (name, fn, options) => listeners.set(name, { fn, options }) }
  });

  vm.runInContext(`
    const state = {
      dailyGoals: [{
        id: 'dedicacao-delta',
        date: '${TODAY}',
        discipline: 'DEDICAÇÃO DELTA',
        subject: 'SEMANA 01',
        origin: 'Manual',
        status: 'Pendente'
      }],
      completedSubjects: new Set(['SEMANA 01'])
    };
    function todayISO() { return '${TODAY}'; }
    function goalDateValue(item) { return item.date; }
    function isGoalDone(item) { return item.status === 'Concluída'; }
    function completedPlanningSubjectRecords(targetState) { return targetState.completedSubjects; }
    function planningRecordMatchesCompletedSubject(item, records) { return records.has(item.subject); }
    function isActionableDailyPlanGoal(item, targetState, completedRecords) {
      return !isGoalDone(item) && !planningRecordMatchesCompletedSubject(item, completedRecords);
    }
    function isProtectedDailyGoal(item) { return item.origin === 'Manual'; }
    function dailyPlanGoalsForDisplay(targetState = state, date = todayISO()) {
      const completedRecords = completedPlanningSubjectRecords(targetState);
      return targetState.dailyGoals.filter((item) => goalDateValue(item) === date
        && (isGoalDone(item) || isActionableDailyPlanGoal(item, targetState, completedRecords)));
    }
    globalThis.__v441Before = dailyPlanGoalsForDisplay(state, '${TODAY}');
  `, context);

  assert.equal(context.__v441Before.length, 0, 'o filtro original reproduz o defeito e omite a meta');
  vm.runInContext(source, context);
  listeners.get('aldus:bootstrap-ready').fn();
  vm.runInContext(`globalThis.__v441After = dailyPlanGoalsForDisplay(state, '${TODAY}');`, context);
  assert.deepEqual(Array.from(context.__v441After, (item) => item.id), ['dedicacao-delta']);
});

test('V441 não restaura meta automática omitida pela deduplicação', () => withCoreGlobals(() => {
  const original = [];
  const result = api.restoreProtectedGoals(original, { dailyGoals: [goal('automatica')] }, TODAY);
  assert.strictEqual(result, original);
}));

test('V441 não duplica meta já visível, nem por referência nem por id', () => withCoreGlobals(() => {
  const visible = goal('manual', { origin: 'Manual' });
  const sameId = goal('manual', { origin: 'Manual', subject: 'Outra instância' });
  const original = [visible];
  const result = api.restoreProtectedGoals(original, { dailyGoals: [visible, sameId] }, TODAY);
  assert.strictEqual(result, original);
  assert.equal(result.length, 1);
}));

test('V441 nunca inclui meta protegida de outra data', () => withCoreGlobals(() => {
  const original = [];
  const result = api.restoreProtectedGoals(original, {
    dailyGoals: [goal('ontem', { date: '2026-09-02', origin: 'Manual' })]
  }, TODAY);
  assert.strictEqual(result, original);
}));

test('V441 preserva a referência da lista quando não há nada a restaurar', () => withCoreGlobals(() => {
  const visible = goal('visivel');
  const original = [visible];
  const result = api.restoreProtectedGoals(original, { dailyGoals: [visible, goal('automatica')] }, TODAY);
  assert.strictEqual(result, original);
}));

test('V441 tolera estado ausente, dailyGoals não-lista e item sem id', () => withCoreGlobals(() => {
  const original = [];
  assert.strictEqual(api.restoreProtectedGoals(original, null, TODAY), original);
  assert.strictEqual(api.restoreProtectedGoals(original, { dailyGoals: {} }, TODAY), original);
  const withoutId = goal(undefined, { origin: 'Manual' });
  assert.deepEqual(api.restoreProtectedGoals(original, { dailyGoals: [withoutId] }, TODAY), [withoutId]);
}));

test('V441 consulta o filtro original em toda chamada e não empilha o embrulho', () => withCoreGlobals(() => {
  const protectedGoal = goal('manual', { origin: 'Manual' });
  const targetState = { dailyGoals: [protectedGoal] };
  let calls = 0;
  const original = () => { calls += 1; return []; };
  globalThis.dailyPlanGoalsForDisplay = original;

  assert.equal(api.install(), true);
  const wrapped = globalThis.dailyPlanGoalsForDisplay;
  assert.equal(api.install(), true);
  assert.strictEqual(globalThis.dailyPlanGoalsForDisplay, wrapped);
  assert.deepEqual(wrapped(targetState, TODAY), [protectedGoal]);
  assert.deepEqual(wrapped(targetState, TODAY), [protectedGoal]);
  assert.equal(calls, 2);
  assert.strictEqual(wrapped.__aldusV441Original, original);
}));

test('V441 alcança state por identificador direto e instala nos três eventos uma única vez', () => {
  const listeners = new Map();
  const context = vm.createContext({
    console: { warn() {}, info() {} },
    window: { addEventListener: (name, fn, options) => listeners.set(name, { fn, options }) }
  });
  vm.runInContext(`
    const state = { dailyGoals: [{ id: 'manual', date: '${TODAY}', origin: 'Manual', status: 'Pendente' }] };
    function todayISO() { return '${TODAY}'; }
    function goalDateValue(item) { return item.date; }
    function isProtectedDailyGoal(item) { return item.origin === 'Manual'; }
    let originalCalls = 0;
    function dailyPlanGoalsForDisplay() { originalCalls += 1; return []; }
  `, context);
  vm.runInContext(source, context);

  for (const name of ['aldus:post-bootstrap-maintenance-complete', 'aldus:bootstrap-ready', 'load']) {
    assert.equal(listeners.get(name)?.options?.once, true, `${name} usa once`);
  }
  listeners.get('aldus:bootstrap-ready').fn();
  listeners.get('load').fn();
  vm.runInContext(`
    globalThis.__v441Result = dailyPlanGoalsForDisplay();
    globalThis.__v441Calls = originalCalls;
    globalThis.__v441Wrapped = dailyPlanGoalsForDisplay === globalThis.dailyPlanGoalsForDisplay;
  `, context);
  assert.deepEqual(Array.from(context.__v441Result, (item) => item.id), ['manual']);
  assert.equal(context.__v441Calls, 1);
  assert.equal(context.__v441Wrapped, true);
});

test('V441 é somente leitura e mantém o núcleo intocado', () => {
  assert.doesNotMatch(source, /saveData|localStorage|setInterval|MutationObserver/);
  assert.doesNotMatch(source, /globalThis\.state/);
  assert.match(read('script.js'), /function dailyPlanGoalsForDisplay\(targetState = state, date = todayISO\(\)\)/);
});

test('V441 tem paridade raiz/docs e carregamento com cache-bust datado', () => {
  assert.equal(source, read('docs/daily-plan-visible-goals-v441.js'));
  const loader = read('performance-emergency-v350.js');
  assert.match(loader, /daily-plan-visible-goals-v441\.js\?v=20260903-[a-z0-9-]+/);
  assert.equal(loader, read('docs/performance-emergency-v350.js'));
});
