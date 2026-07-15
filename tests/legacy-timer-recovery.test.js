const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const script = fs.readFileSync('script.js', 'utf8');

function logic() {
  const matchStart = script.indexOf('function normalizeMatchText');
  const matchEnd = script.indexOf('const DISCIPLINE_EQUIVALENCES', matchStart);
  const normalizeStart = script.indexOf('function normalizeGoalTimeFields');
  const normalizeEnd = script.indexOf('state.dailyGoals.forEach', normalizeStart);
  const recoverStart = script.indexOf('function isGoalDone');
  const recoverEnd = script.indexOf('function isGoalInProgress');
  const code = script.slice(matchStart, matchEnd) + script.slice(normalizeStart, normalizeEnd) + script.slice(recoverStart, recoverEnd);
  return new Function('appendGoalHistory', `const state = {}; const LEGACY_TIMER_GOAL_MINUTES_RECOVERY_MIGRATION_ID = 'legacyTimerGoalMinutesRecoveryV1'; const LEGACY_TIMER_RECOVERY_V2_MIGRATION_KEY = 'legacyTimerRecoveryV2';
${code}; return { normalizeGoalTimeFields, goalTotalActualMinutes, recoverLegacyTimerMinutesForGoals, recoverOrphanLegacyTimerMinutesForGoals };`)((goal, text) => {
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
  assert.match(script, new RegExp("replaceState\\(chosenState\\);\\n    mergeCompatibleLocalStorageData\\(\\);\\n    const legacyGoalIdRecoveryReport = recoverLegacyTimerMinutesForGoals\\(state\\);\\n    const legacyOrphanRecoveryReport = recoverOrphanLegacyTimerMinutesForGoals\\(state\\);[\\s\\S]*?render\\(\\);"));
});

test('bootstrap expõe relatório temporário e console informativo sem dados pessoais', () => {
  assert.match(script, /window\.__legacyTimerRecoveryReport = legacyTimerRecoveryReport;/);
  assert.match(script, /console\.info\("\[Metas Estudo\] Recuperação de tempos antigos", legacyTimerRecoveryReport\);/);
  assert.match(script, /function legacyRecoveryReportBase\(targetState = state\)/);
});


test('goalId antigo diferente não impede correspondência segura e caso real Inquérito Policial resulta em 34 de 27 min', () => {
  const { recoverLegacyTimerMinutesForGoals, recoverOrphanLegacyTimerMinutesForGoals } = logic();
  const state = { migrations: {}, studies: [{ id: 'study-old', timerSessionId: 'timer-old', date: '2026-07-14', discipline: 'Direito Processual Penal', topic: 'Inquérito Policial', minutes: 34, actualDuration: 34, origin: 'timer', goalId: 'goal-antigo' }], dailyGoals: [{ id: 'goal-novo', date: '2026-07-14', discipline: 'Direito Processual Penal', subject: 'Inquérito Policial', minutes: 27, studyActualMinutes: 0, questionActualMinutes: 0, actualMinutes: 0, status: 'Pendente' }] };
  recoverLegacyTimerMinutesForGoals(state);
  const report = recoverOrphanLegacyTimerMinutesForGoals(state);
  assert.equal(report.recoveredByExactFields, 1);
  assert.equal(state.dailyGoals[0].studyActualMinutes, 34);
  assert.equal(state.dailyGoals[0].questionActualMinutes, 0);
  assert.equal(state.dailyGoals[0].actualMinutes, 34);
  assert.equal(state.dailyGoals[0].status, 'Em andamento');
});

test('syllabusItemId, normalização, legado sem origin, parcial, ambíguo, manual, inválido e idempotência', () => {
  const { recoverOrphanLegacyTimerMinutesForGoals } = logic();
  const state = { migrations: {}, studies: [
    { id: 'a', timerSessionId: 'a', date: '2026-07-14', syllabusItemId: 'item-1', discipline: 'X', topic: 'Y', minutes: 10, origin: 'timer' },
    { id: 'b', timerSessionId: 'b', date: '2026-07-14', discipline: 'DIREITO PROCESSUAL PENAL', topic: 'Inquerito  Policial', minutes: 12, origin: 'timer' },
    { id: 'c', timerSessionId: 'c', date: '2026-07-14', discipline: 'Direito Processual Penal', topic: 'Inquérito', minutes: 99, origin: 'timer' },
    { id: 'd', timerSessionId: 'd', date: '2026-07-14', discipline: 'Amb', topic: 'Mesmo', minutes: 8, origin: 'timer' },
    { id: 'e', timerSessionId: 'e', date: '2026-07-14', discipline: 'Manual', topic: 'Não', minutes: 8, origin: 'manual' },
    { id: 'f', sessionId: 'f', timerMode: 'free', date: '2026-07-14', discipline: 'Legado', topic: 'Sem origin', actualDuration: 7 },
    { id: 'g', timerSessionId: 'g', date: '2026-07-14', discipline: 'Bad', topic: 'Zero', minutes: 0, origin: 'timer' },
    { id: 'dup1', timerSessionId: 'dup', date: '2026-07-14', discipline: 'Dup', topic: 'Um', minutes: 5, origin: 'timer' },
    { id: 'dup2', timerSessionId: 'dup', date: '2026-07-14', discipline: 'Dup', topic: 'Um', minutes: 5, origin: 'timer' }
  ], dailyGoals: [
    { id: 'ga', date: '2026-07-14', syllabusItemId: 'item-1', studyActualMinutes: 0 },
    { id: 'gb', date: '2026-07-14', discipline: 'direito processual penal', subject: 'Inquérito Policial', studyActualMinutes: 0 },
    { id: 'gc', date: '2026-07-14', discipline: 'Direito Processual Penal', subject: 'Inquérito Policial Militar', studyActualMinutes: 0 },
    { id: 'gd1', date: '2026-07-14', discipline: 'Amb', subject: 'Mesmo', studyActualMinutes: 0 },
    { id: 'gd2', date: '2026-07-14', discipline: 'Amb', subject: 'Mesmo', studyActualMinutes: 0 },
    { id: 'gf', date: '2026-07-14', discipline: 'Legado', subject: 'Sem origin', studyActualMinutes: 0 },
    { id: 'gdup', date: '2026-07-14', discipline: 'Dup', subject: 'Um', studyActualMinutes: 0 },
    { id: 'preserved', date: '2026-07-14', discipline: 'Bad', subject: 'Zero', studyActualMinutes: 34, actualMinutes: 34 }
  ] };
  const beforeStudies = JSON.stringify(state.studies);
  const first = recoverOrphanLegacyTimerMinutesForGoals(state);
  const second = recoverOrphanLegacyTimerMinutesForGoals(state);
  assert.equal(first.recoveredBySyllabusItem, 1);
  assert.equal(first.recoveredByExactFields, 3);
  assert.equal(first.ambiguousSessions, 1);
  assert.equal(state.dailyGoals.find(g=>g.id==='ga').actualMinutes, 10);
  assert.equal(state.dailyGoals.find(g=>g.id==='gb').actualMinutes, 12);
  assert.equal(state.dailyGoals.find(g=>g.id==='gc').actualMinutes || 0, 0);
  assert.equal(state.dailyGoals.find(g=>g.id==='gf').actualMinutes, 7);
  assert.equal(state.dailyGoals.find(g=>g.id==='gdup').actualMinutes, 5);
  assert.equal(second.recoveredMinutes, 0);
  assert.equal(state.dailyGoals.find(g=>g.id==='gdup').actualMinutes, 5);
  assert.equal(JSON.stringify(state.studies), beforeStudies);
});

test('associação manual exige confirmação interna e ignorar sessão persiste', () => {
  assert.match(script, /legacyTimerRecoveryModal/);
  assert.match(fs.readFileSync('index.html', 'utf8'), /Confirmar associação/);
  assert.match(script, /data-legacy-recovery-ignore/);
  assert.doesNotMatch(script, /prompt\(".*legacy|confirm\(".*legacy|alert\(".*legacy/i);
});

test('raiz e docs permanecem iguais na recuperação v3', () => {
  assert.equal(fs.readFileSync('script.js','utf8'), fs.readFileSync('docs/script.js','utf8'));
  assert.equal(fs.readFileSync('index.html','utf8'), fs.readFileSync('docs/index.html','utf8'));
  assert.equal(fs.readFileSync('style.css','utf8'), fs.readFileSync('docs/style.css','utf8'));
  assert.equal(fs.readFileSync('service-worker.js','utf8'), fs.readFileSync('docs/service-worker.js','utf8'));
});
