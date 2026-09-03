const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const core = fs.readFileSync('planning-integrity-v235.js', 'utf8');
const docsCore = fs.readFileSync('docs/planning-integrity-v235.js', 'utf8');
const loader = fs.readFileSync('planning-integrity-loader-v235.js', 'utf8');
const docsLoader = fs.readFileSync('docs/planning-integrity-loader-v235.js', 'utf8');
const bridge = fs.readFileSync('service-worker-v402.js', 'utf8');
const docsBridge = fs.readFileSync('docs/service-worker-v402.js', 'utf8');
const canonicalWorker = fs.readFileSync('service-worker.js', 'utf8');

const V442 = '20260903-protected-daily-goals-dom-v442';

function card(id) {
  return {
    dataset: { dailyGoalDetails: id },
    removed: false,
    remove() { this.removed = true; }
  };
}

test('V442 preserva manual, peça e concluída, removendo somente a automática deduplicada', () => {
  const goals = [
    { id: 'manual', date: '2026-09-03', origin: 'manual', subject: 'SEMANA 01', status: 'Pendente' },
    { id: 'piece', date: '2026-09-03', origin: 'planejamento peça diária', subject: 'APF', status: 'Pendente' },
    { id: 'automatic', date: '2026-09-03', origin: 'planejamento', subject: 'LICITAÇÕES', status: 'Pendente' },
    { id: 'done', date: '2026-09-03', origin: 'planejamento', subject: 'PENAL', status: 'Concluída' }
  ];
  const cards = goals.map((goal) => card(goal.id));
  const resume = { textContent: '' };
  const board = {
    querySelectorAll(selector) {
      assert.equal(selector, '[data-daily-goal-details]');
      return cards.filter((item) => !item.removed);
    },
    closest(selector) {
      assert.equal(selector, 'details');
      return {
        querySelector(resumeSelector) {
          assert.equal(resumeSelector, '.daily-plan-resume');
          return resume;
        }
      };
    }
  };

  const completedSubjects = new Set(['SEMANA 01', 'APF', 'LICITAÇÕES', 'PENAL']);
  const context = {
    console: { warn() {}, info() {} },
    state: { dailyGoals: goals, planning: { config: {} } },
    localStorage: { getItem() { return null; }, setItem() {} },
    planningTargetsForDate() { return { disciplines: 1, topics: 1 }; },
    completedPlanningSubjectRecords() { return completedSubjects; },
    planningRecordMatchesCompletedSubject(goal, records) { return records.has(goal.subject); },
    isGoalDone(goal) { return goal.status === 'Concluída'; },
    isPlanningStudyGoal() { return true; },
    isProtectedDailyGoal(goal) {
      return goal.origin === 'manual'
        || goal.origin === 'planejamento peça diária'
        || goal.status === 'Concluída';
    },
    renderDailyGoals() { return 'rendered'; },
    document: {
      readyState: 'complete',
      documentElement: { dataset: {}, getAttribute() { return null; } },
      getElementById() { return null; },
      querySelectorAll(selector) {
        assert.equal(selector, '#view-metas-do-dia [data-daily-goal-details]');
        return cards.filter((item) => !item.removed);
      },
      querySelector(selector) {
        return selector === '#view-metas-do-dia .daily-goals-board' ? board : null;
      }
    },
    window: { addEventListener() {} }
  };

  vm.createContext(context);
  vm.runInContext(core, context);
  assert.equal(context.renderDailyGoals(), 'rendered');

  const byId = new Map(cards.map((item) => [item.dataset.dailyGoalDetails, item]));
  assert.equal(byId.get('manual').removed, false, 'meta manual permanece no DOM');
  assert.equal(byId.get('piece').removed, false, 'peça diária permanece no DOM');
  assert.equal(byId.get('automatic').removed, true, 'meta automática deduplicada continua removida');
  assert.equal(byId.get('done').removed, false, 'meta concluída continua visível pela proteção existente');

  const visible = cards.filter((item) => !item.removed).length;
  assert.equal(visible, 3);
  assert.equal(resume.textContent, `${visible} meta(s) pendente(s)`, 'resumo acompanha exatamente a lista após a remoção');
});

test('V442 põe a exceção protegida antes da regra V411 de concluído/assunto concluído', () => {
  assert.match(core, /function shouldHideFromDailyPlanV411\([\s\S]*?if \(isProtectedDailyGoalV442\(goal\)\) return false;[\s\S]*?isCompletedGoalV411\(goal\) \|\| recordMatchesCompletedSubjectV411\(goal, completedRecords\)/);
  assert.equal(core, docsCore);
});

test('V442 renova a query do núcleo e força a limpeza do pathname cacheado antes da nova carga', () => {
  assert.match(loader, new RegExp(`const PLANNING_CORE_VERSION = "${V442}"`));
  assert.match(loader, /planning-integrity-v235\.js\?v=\$\{encodeURIComponent\(PLANNING_CORE_VERSION\)\}/);
  assert.equal(loader, docsLoader);

  assert.match(bridge, new RegExp(`const CACHE_FIX_VERSION = "${V442}"`));
  assert.match(bridge, /new URL\("planning-integrity-v235\.js", self\.registration\.scope\)\.pathname/);
  assert.match(bridge, /new URL\("planning-integrity-loader-v235\.js", self\.registration\.scope\)\.pathname/);
  assert.match(bridge, /self\.addEventListener\("activate", \(event\) => \{\s*event\.waitUntil\(invalidatePlanningIntegrityCacheV408\(\)\);\s*\}\);/);
  assert.match(bridge, /cache\.delete\(request\)/);
  assert.equal(bridge, docsBridge);

  assert.match(canonicalWorker, /caches\.match\(request, \{ ignoreSearch: true \}\)/);
});
