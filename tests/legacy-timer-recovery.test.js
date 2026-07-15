const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const script = fs.readFileSync('script.js', 'utf8');

function logic() {
  const normalizeStart = script.indexOf('function normalizeGoalTimeFields');
  const normalizeEnd = script.indexOf('state.dailyGoals.forEach', normalizeStart);
  const recoverStart = script.indexOf('function isGoalDone');
  const recoverEnd = script.indexOf('function isGoalInProgress');
  const code = script.slice(normalizeStart, normalizeEnd) + script.slice(recoverStart, recoverEnd);
  return new Function('appendGoalHistory', `const state = {}; const LEGACY_TIMER_GOAL_MINUTES_RECOVERY_MIGRATION_ID = 'legacyTimerGoalMinutesRecoveryV1';
${code}; return { normalizeGoalTimeFields, goalTotalActualMinutes, recoverLegacyTimerMinutesForGoals };`)((goal, text) => {
    goal.history ||= [];
    goal.history.push({ at: 'test', text });
    goal.notes = [goal.notes || '', text].filter(Boolean).join('\n');
  });
}

test('meta zerada recupera sessão antiga de 34 minutos e é idempotente', () => {
  const { recoverLegacyTimerMinutesForGoals } = logic();
  const state = {
    dailyGoals: [{ id: 'g1', minutes: 27, status: 'Pendente', studyActualMinutes: 0, questionActualMinutes: 0, actualMinutes: 0 }],
    studies: [{ id: 's1', goalId: 'g1', timerSessionId: 't1', minutes: 34, origin: 'timer' }],
    migrations: {}
  };
  const studiesBefore = JSON.stringify(state.studies);
  const first = recoverLegacyTimerMinutesForGoals(state);
  assert.equal(first.inspectedGoals, 1);
  assert.equal(first.recoveredGoals, 1);
  assert.equal(first.recoveredMinutes, 34);
  assert.equal(state.dailyGoals[0].studyActualMinutes, 34);
  assert.equal(state.dailyGoals[0].actualMinutes, 34);
  assert.equal(state.dailyGoals[0].questionActualMinutes, 0);
  assert.equal(state.dailyGoals[0].status, 'Em andamento');
  assert.equal(state.dailyGoals[0].history.length, 1);
  assert.equal(JSON.stringify(state.studies), studiesBefore);
  const second = recoverLegacyTimerMinutesForGoals(state);
  assert.equal(second.recoveredGoals, 0);
  assert.equal(state.dailyGoals[0].actualMinutes, 34);
  assert.equal(state.dailyGoals[0].history.length, 1);
});

test('meta que já possui tempo permanece preservada sem somar histórico', () => {
  const { recoverLegacyTimerMinutesForGoals } = logic();
  const state = { dailyGoals: [{ id: 'g1', studyActualMinutes: 34, questionActualMinutes: 0, actualMinutes: 34, status: 'Pendente' }], studies: [{ id: 's1', goalId: 'g1', timerSessionId: 't1', minutes: 34, origin: 'timer' }], migrations: {} };
  const report = recoverLegacyTimerMinutesForGoals(state);
  assert.equal(report.preservedGoals, 1);
  assert.equal(state.dailyGoals[0].studyActualMinutes, 34);
  assert.equal(state.dailyGoals[0].actualMinutes, 34);
});

test('deduplica sessões por timerSessionId e soma sessões diferentes', () => {
  const { recoverLegacyTimerMinutesForGoals } = logic();
  const state = { dailyGoals: [{ id: 'g1', status: 'Pendente' }], studies: [
    { id: 's1', goalId: 'g1', timerSessionId: 'same', minutes: 20, origin: 'timer' },
    { id: 's2', goalId: 'g1', timerSessionId: 'same', minutes: 20, origin: 'timer' },
    { id: 's3', goalId: 'g1', sessionId: 'other', actualDuration: 14, origin: 'timer' }
  ], migrations: {} };
  const report = recoverLegacyTimerMinutesForGoals(state);
  assert.equal(report.ignoredDuplicates, 1);
  assert.equal(state.dailyGoals[0].studyActualMinutes, 34);
  assert.equal(state.dailyGoals[0].actualMinutes, 34);
});

test('ignora registros sem goalId, de outra meta, não timer e valores inválidos', () => {
  const { recoverLegacyTimerMinutesForGoals } = logic();
  const state = { dailyGoals: [{ id: 'g1', status: 'Pendente' }], studies: [
    { id: 's0', minutes: 99, origin: 'timer' },
    { id: 's1', goalId: 'g2', minutes: 99, origin: 'timer' },
    { id: 's2', goalId: 'g1', minutes: 99, origin: 'manual' },
    { id: 's3', goalId: 'g1', timerSessionId: 'bad', minutes: 'x', origin: 'timer' },
    { id: 's4', goalId: 'g1', timerSessionId: 'neg', actualDuration: -5, origin: 'timer' }
  ], migrations: {} };
  const report = recoverLegacyTimerMinutesForGoals(state);
  assert.equal(report.recoveredGoals, 0);
  assert.equal(state.dailyGoals[0].actualMinutes, 0);
});

test('preserva questionActualMinutes e não conclui automaticamente', () => {
  const { recoverLegacyTimerMinutesForGoals } = logic();
  const withQuestion = { dailyGoals: [{ id: 'g1', questionActualMinutes: 5, status: 'Pendente' }], studies: [{ id: 's1', goalId: 'g1', minutes: 34, origin: 'timer' }], migrations: {} };
  recoverLegacyTimerMinutesForGoals(withQuestion);
  assert.equal(withQuestion.dailyGoals[0].questionActualMinutes, 5);
  assert.equal(withQuestion.dailyGoals[0].actualMinutes, 5);
  const normal = { dailyGoals: [{ id: 'g1', minutes: 27, status: 'Pendente' }], studies: [{ id: 's1', goalId: 'g1', minutes: 34, origin: 'timer' }], migrations: {} };
  recoverLegacyTimerMinutesForGoals(normal);
  assert.equal(normal.dailyGoals[0].status, 'Em andamento');
  assert.notEqual(normal.dailyGoals[0].status, 'Concluída');
});

test('marcador global não impede recuperação após backup restaurado', () => {
  const { recoverLegacyTimerMinutesForGoals } = logic();
  const state = { migrations: { legacyTimerGoalMinutesRecoveryV1: 'old' }, dailyGoals: [{ id: 'restored', status: 'Pendente' }], studies: [{ id: 's1', goalId: 'restored', minutes: 34, origin: 'timer' }] };
  const report = recoverLegacyTimerMinutesForGoals(state);
  assert.equal(report.recoveredGoals, 1);
  assert.equal(state.dailyGoals[0].actualMinutes, 34);
});

test('recuperação roda depois de replaceState e merge localStorage no bootstrap antes do render', () => {
  assert.match(script, /replaceState\(chosenState\);\n    mergeCompatibleLocalStorageData\(\);\n    const hadLegacyTimerRecoveryMarker = Boolean\(state\.migrations\?\.\[LEGACY_TIMER_GOAL_MINUTES_RECOVERY_MIGRATION_ID\]\);\n    const legacyTimerRecoveryReport = recoverLegacyTimerMinutesForGoals\(state\);[\s\S]*?render\(\);/);
});
