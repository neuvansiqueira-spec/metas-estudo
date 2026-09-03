const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const source = fs.readFileSync("planning-integrity-v235.js", "utf8");
const docsSource = fs.readFileSync("docs/planning-integrity-v235.js", "utf8");
const loader = fs.readFileSync("planning-integrity-loader-v235.js", "utf8");
const docsLoader = fs.readFileSync("docs/planning-integrity-loader-v235.js", "utf8");
const DATE = "2026-08-31";
const RELEASE = "20260903-protected-daily-goals-dom-v442";

function completedRecords(targetState) { return (targetState.dailyGoals || []).filter((goal) => goal.status === "Concluída"); }
function matchesCompleted(record, completed) { return completed.some((goal) => goal.syllabusItemId === (record.syllabusItemId || record.id)); }

test("V419 filtra concluídos dos candidatos sem preencher vagas no startup", () => {
  const completed = { id: "done", date: DATE, discipline: "Direito", subject: "Atos", syllabusItemId: "s1", type: "Estudo novo", status: "Concluída" };
  const pending = { id: "pending", date: DATE, discipline: "Português", subject: "Crase", syllabusItemId: "s2", type: "Estudo novo", status: "Pendente" };
  const candidates = [{ id: "s1", discipline: "Direito", subject: "Atos" }, { id: "s3", discipline: "TI", subject: "Redes" }, { id: "s4", discipline: "RLM", subject: "Lógica" }];
  const targetState = { planning: { config: { disciplinesPerDay: 3, topicsPerDay: 3 } }, dailyGoals: [completed, pending] };
  const context = {
    console, state: targetState, window: { addEventListener() {} },
    document: { readyState: "complete", documentElement: { dataset: {}, getAttribute() { return "14.1"; } }, getElementById() { return null; }, querySelectorAll() { return []; }, querySelector() { return null; }, addEventListener() {} },
    localStorage: { getItem() { return null; }, setItem() {} }, todayISO() { return DATE; },
    planningTargetsForDate() { return { disciplines: 3, topics: 3 }; }, completedPlanningSubjectRecords: completedRecords, planningRecordMatchesCompletedSubject: matchesCompleted,
    isGoalDone(goal) { return goal.status === "Concluída"; }, isPlanningStudyGoal() { return true; }, goalSyllabusReservationKey(goal) { return goal.syllabusItemId; },
    buildPlanningScoreContext() { return { candidates: [...candidates], itemMetrics: new Map(), diagnosticMetrics: new Map() }; },
    eligiblePlanningGoalsForDate(date, options) { return options.scoreContext.candidates.map((item) => ({ id: `goal-${item.id}`, date, discipline: item.discipline, subject: item.subject, syllabusItemId: item.id, type: "Estudo novo", status: "Pendente" })); },
    selectPlanningGoalsForTargets({ topicTarget, eligibleGoals, existingGoals }) { return { selected: eligibleGoals.slice(0, Math.max(0, topicTarget - existingGoals.length)) }; },
    replenishMissingDailyPlanningGoalsV116() { throw new Error("repositor legado não deve ser usado diretamente"); },
    saveData() { throw new Error("startup não deve salvar"); }, render() { throw new Error("startup não deve renderizar por mutação"); },
    Date, Object, Array, String, Number, Set, Map
  };
  context.globalThis = context;
  vm.createContext(context);
  const before = JSON.stringify(targetState.dailyGoals);
  vm.runInContext(source, context);
  assert.deepEqual(Array.from(context.buildPlanningScoreContext(targetState).candidates, (item) => item.id), ["s3", "s4"]);
  assert.equal(JSON.stringify(targetState.dailyGoals), before);
  assert.equal(context.__ALDUS_PLANNING_INTEGRITY_V235__.completedGoalsReviewOnly, true);
  assert.equal(context.__ALDUS_PLANNING_INTEGRITY_V235__.automaticDailyGoalMutationDisabled, true);
});

test("V419 mantém concluído fora da próxima atividade sem apagar histórico", () => {
  const completed = { id: "done", status: "Concluída", syllabusItemId: "s1" };
  const pending = { id: "pending", status: "Pendente", syllabusItemId: "s2" };
  const reopened = { id: "reopened", status: "Pendente", syllabusItemId: "s1" };
  const targetState = { planning: { config: { disciplinesPerDay: 1, topicsPerDay: 1 } }, dailyGoals: [completed, pending, reopened] };
  let received = [];
  const cards = [completed, pending, reopened].map((goal) => ({ dataset: { dailyGoalDetails: goal.id }, removed: false, remove() { this.removed = true; } }));
  const context = {
    console, state: targetState, window: { addEventListener() {} },
    document: { readyState: "complete", documentElement: { dataset: {}, getAttribute() { return null; } }, getElementById() { return null; }, querySelectorAll(s) { return s.includes("data-daily-goal-details") ? cards : []; }, querySelector() { return null; }, addEventListener() {} },
    localStorage: { getItem() { return null; }, setItem() {} }, planningTargetsForDate() { return { disciplines: 1, topics: 1 }; },
    completedPlanningSubjectRecords: completedRecords, planningRecordMatchesCompletedSubject: matchesCompleted, isGoalDone(goal) { return goal.status === "Concluída"; }, isPlanningStudyGoal() { return true; },
    renderNextDailyGoal(goals) { received = goals; }, renderDailyGoals() {}, Date, Object, Array, String, Number, Set, Map
  };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(source, context);
  context.renderNextDailyGoal([completed, pending, reopened]);
  context.renderDailyGoals();
  assert.deepEqual(Array.from(received, (goal) => goal.id), ["pending"]);
  assert.deepEqual(cards.map((card) => card.removed), [true, false, true]);
  assert.equal(targetState.dailyGoals.length, 3);
});

test("V419 preserva paridade e cache-bust do núcleo corrigido", () => {
  assert.equal(source, docsSource);
  assert.equal(loader, docsLoader);
  assert.match(loader, new RegExp(`const PLANNING_CORE_VERSION = "${RELEASE}"`));
  assert.match(loader, /planning-integrity-v235\.js\?v=\$\{encodeURIComponent\(PLANNING_CORE_VERSION\)\}/);
  assert.doesNotMatch(source, /setTimeout|setInterval|MutationObserver|requestAnimationFrame|requestIdleCallback/);
});
