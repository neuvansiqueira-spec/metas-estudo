const fs = require('node:fs');
const vm = require('node:vm');
const test = require('node:test');
const assert = require('node:assert/strict');

function makeContext() {
  const rows = [];
  const form = { dataset: {}, addEventListener() {} };
  const confirmButton = { disabled: false, closest() { return null; } };
  const context = {
    console,
    setTimeout(fn) { fn(); return 1; },
    clearTimeout() {},
    globalThis: null,
    state: {
      dailyGoals: [{
        id: 'g1',
        date: '2026-09-16',
        discipline: 'CIÊNCIAS FORENSES',
        subject: 'Prevenção do delito.',
        studyActualMinutes: 0,
        questionActualMinutes: 0,
        actualMinutes: 0,
        status: 'Em andamento'
      }],
      studies: []
    },
    elements: {
      historyBody: {
        innerHTML: '',
        appendChild(row) { rows.push(row); }
      }
    },
    document: {
      getElementById(id) {
        if (id === 'timerStudyForm') return form;
        if (id === 'goalCompletionConfirm') return confirmButton;
        return null;
      },
      createElement() { return { innerHTML: '' }; }
    },
    saveData() { context.saved = (context.saved || 0) + 1; },
    render() {},
    renderHistory() {},
    confirmGoalCompletion(goalId) {
      const goal = context.state.dailyGoals.find((item) => item.id === goalId);
      goal.status = 'Concluída';
      context.goalCompletionInProgress.delete(goalId);
      return true;
    },
    replaceState() {},
    goalCompletionActiveGoalId: 'g1',
    goalCompletionInProgress: new Set(),
    formatDateBR(value) { return value; },
    escapeHTML(value) { return String(value ?? ''); },
    subjectNameById() { return ''; },
    formatHours(value) { return String(value); },
    __aldusBootstrapReady: true
  };
  context.globalThis = context;

  for (let index = 0; index < 25; index += 1) {
    context.state.studies.push({
      id: `old-${index}`,
      date: '2026-09-16',
      endedAt: `2026-09-16T10:${String(index).padStart(2, '0')}:00Z`,
      discipline: 'Outra',
      topic: 'Registro anterior',
      minutes: 1,
      questions: 0,
      correct: 0,
      wrong: 0,
      blank: 0
    });
  }

  context.state.studies.push({
    id: 'target',
    sessionId: 'session-target',
    timerSessionId: 'session-target',
    date: '2026-09-16',
    endedAt: '2026-09-16T14:00:00Z',
    discipline: 'CIÊNCIAS FORENSES',
    topic: 'Prevenção do delito.',
    seconds: 4011,
    minutes: 66.85,
    origin: 'timer',
    updatesGoal: true,
    goalId: 'g1',
    timerKind: 'study',
    questions: 0,
    correct: 0,
    wrong: 0,
    blank: 0
  });

  context.__ALDUS_STUDY_TIME__ = {
    recordSeconds(study) {
      return study.seconds ?? Math.round((study.minutes || 0) * 60);
    },
    goalSeconds(goal, state, kind) {
      return state.studies
        .filter((study) => study.goalId === goal.id
          && study.origin === 'timer'
          && study.updatesGoal !== false
          && (!kind || (study.timerKind === 'questions' ? 'questions' : 'study') === kind))
        .reduce((total, study) => total + (study.seconds ?? Math.round((study.minutes || 0) * 60)), 0);
    },
    logs(state) {
      return state.studies.map((study) => ({ ...study, seconds: this.recordSeconds(study) }));
    }
  };

  return { context, rows };
}

function loadHotfix(context) {
  vm.createContext(context);
  const source = fs.readFileSync('goal-time-history-hotfix-v425.js', 'utf8');
  vm.runInContext(source, context);
}

test('reconcilia 1h06min51s do cronômetro antes de concluir a meta', () => {
  const { context } = makeContext();
  loadHotfix(context);
  context.confirmGoalCompletion('g1');

  const goal = context.state.dailyGoals[0];
  assert.equal(goal.status, 'Concluída');
  assert.ok(Math.abs(goal.studyActualMinutes - 66.85) < 0.001);
  assert.ok(context.saved > 0);
});

test('histórico não perde sessão recente quando há mais de 20 registros no mesmo dia', () => {
  const { context, rows } = makeContext();
  loadHotfix(context);
  context.renderHistory();

  assert.equal(rows.length, 26);
  assert.ok(rows.some((row) => row.innerHTML.includes('Prevenção do delito.')));
});

test('startup carrega o hotfix por caminho fora da lista estática do service worker', () => {
  const startup = fs.readFileSync('startup-planning-stability-v387.js', 'utf8');
  const serviceWorker = fs.readFileSync('service-worker.js', 'utf8');

  assert.match(startup, /goal-time-history-hotfix-v425\.js/);
  assert.match(startup, /loadGoalTimeHistoryHotfixV425\(\)/);
  assert.doesNotMatch(serviceWorker, /"goal-time-history-hotfix-v425\.js/);
});
