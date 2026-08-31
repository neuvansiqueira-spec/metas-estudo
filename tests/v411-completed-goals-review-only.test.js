const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const source = fs.readFileSync("planning-integrity-v235.js", "utf8");
const docsSource = fs.readFileSync("docs/planning-integrity-v235.js", "utf8");
const loader = fs.readFileSync("planning-integrity-loader-v235.js", "utf8");
const docsLoader = fs.readFileSync("docs/planning-integrity-loader-v235.js", "utf8");
const DATE = "2026-08-31";

function completedRecords(targetState) {
  return (targetState.dailyGoals || []).filter((goal) => goal.status === "Concluída");
}

function matchesCompleted(record, completed) {
  return completed.some((goal) => goal.syllabusItemId === (record.syllabusItemId || record.id));
}

test("V411 não conta nem volta a selecionar assunto concluído no Plano do Dia", () => {
  const completed = { id: "done", date: DATE, discipline: "Direito", subject: "Atos", syllabusItemId: "s1", type: "Estudo novo", status: "Concluída" };
  const pending = { id: "pending", date: DATE, discipline: "Português", subject: "Crase", syllabusItemId: "s2", type: "Estudo novo", status: "Pendente" };
  const candidates = [
    { id: "s1", discipline: "Direito", subject: "Atos" },
    { id: "s3", discipline: "TI", subject: "Redes" },
    { id: "s4", discipline: "RLM", subject: "Lógica" }
  ];
  const targetState = {
    planning: { config: { disciplinesPerDay: 3, topicsPerDay: 3 } },
    dailyGoals: [completed, pending]
  };
  let saved = 0;
  let rendered = 0;
  const context = {
    console,
    state: targetState,
    window: { addEventListener() {} },
    document: {
      readyState: "complete",
      documentElement: { dataset: {}, getAttribute() { return "14.1"; } },
      getElementById() { return null; },
      querySelectorAll() { return []; },
      querySelector() { return null; },
      addEventListener() {}
    },
    localStorage: { getItem() { return null; }, setItem() {} },
    todayISO() { return DATE; },
    planningTargetsForDate() { return { disciplines: 3, topics: 3 }; },
    completedPlanningSubjectRecords: completedRecords,
    planningRecordMatchesCompletedSubject: matchesCompleted,
    isGoalDone(goal) { return goal.status === "Concluída"; },
    isPlanningStudyGoal() { return true; },
    goalSyllabusReservationKey(goal) { return goal.syllabusItemId; },
    buildPlanningScoreContext() {
      return { candidates: [...candidates], itemMetrics: new Map(), diagnosticMetrics: new Map([["s1", { boost: 200 }]]) };
    },
    eligiblePlanningGoalsForDate(date, options) {
      return options.scoreContext.candidates.map((item) => ({
        id: `goal-${item.id}`,
        date,
        discipline: item.discipline,
        subject: item.subject,
        syllabusItemId: item.id,
        type: "Estudo novo",
        status: "Pendente"
      }));
    },
    selectPlanningGoalsForTargets({ topicTarget, eligibleGoals, existingGoals }) {
      return { selected: eligibleGoals.slice(0, Math.max(0, topicTarget - existingGoals.length)) };
    },
    replenishMissingDailyPlanningGoalsV116() { throw new Error("o repositor antigo não deve ser usado"); },
    saveData() { saved += 1; },
    render() { rendered += 1; },
    Date,
    Object,
    Array,
    String,
    Number,
    Set,
    Map
  };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(source, context);

  const guardedContext = context.buildPlanningScoreContext(targetState);
  assert.deepEqual(Array.from(guardedContext.candidates, (item) => item.id), ["s3", "s4"]);
  assert.equal(targetState.dailyGoals.length, 4, "mantém o registro concluído e completa três vagas acionáveis");
  assert.equal(targetState.dailyGoals.filter((goal) => goal.status !== "Concluída").length, 3);
  assert.equal(targetState.dailyGoals.filter((goal) => goal.syllabusItemId === "s1").length, 1, "não recria assunto concluído mesmo com diagnóstico");
  assert.equal(saved, 1);
  assert.equal(rendered, 1);
  assert.equal(context.__ALDUS_PLANNING_INTEGRITY_V235__.completedGoalsReviewOnly, true);
});

test("V411 filtra a próxima atividade concluída sem apagar o histórico", () => {
  const completed = { id: "done", status: "Concluída", syllabusItemId: "s1" };
  const pending = { id: "pending", status: "Pendente", syllabusItemId: "s2" };
  const reopened = { id: "reopened", status: "Pendente", syllabusItemId: "s1" };
  const targetState = { planning: { config: { disciplinesPerDay: 1, topicsPerDay: 1 } }, dailyGoals: [completed, pending, reopened] };
  const cards = [completed, pending, reopened].map((goal) => ({
    dataset: { dailyGoalDetails: goal.id },
    removed: false,
    remove() { this.removed = true; }
  }));
  let received = [];
  const context = {
    console,
    state: targetState,
    window: { addEventListener() {} },
    document: {
      readyState: "complete",
      documentElement: { dataset: {}, getAttribute() { return null; } },
      getElementById() { return null; },
      querySelectorAll(selector) { return selector.includes("data-daily-goal-details") ? cards : []; },
      querySelector() { return null; },
      addEventListener() {}
    },
    localStorage: { getItem() { return null; }, setItem() {} },
    planningTargetsForDate() { return { disciplines: 1, topics: 1 }; },
    completedPlanningSubjectRecords: completedRecords,
    planningRecordMatchesCompletedSubject: matchesCompleted,
    isGoalDone(goal) { return goal.status === "Concluída"; },
    isPlanningStudyGoal() { return true; },
    renderNextDailyGoal(goals) { received = goals; },
    renderDailyGoals() {},
    Date,
    Object,
    Array,
    String,
    Number,
    Set,
    Map
  };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(source, context);
  context.renderNextDailyGoal([completed, pending, reopened]);
  context.renderDailyGoals();

  assert.deepEqual(Array.from(received, (goal) => goal.id), ["pending"]);
  assert.deepEqual(cards.map((card) => card.removed), [true, false, true]);
  assert.equal(targetState.dailyGoals.includes(completed), true, "o concluído continua preservado para Revisão");
});

test("V411 preserva desempenho e paridade dos arquivos publicados", () => {
  assert.equal(source, docsSource);
  assert.equal(loader, docsLoader);
  assert.match(loader, /const PLANNING_CORE_VERSION = "20260831-metas-concluidas-somente-revisao-v411"/);
  assert.match(loader, /planning-integrity-v235\.js\?v=\$\{encodeURIComponent\(PLANNING_CORE_VERSION\)\}/);
  assert.doesNotMatch(source, /setTimeout|setInterval|MutationObserver|requestAnimationFrame|requestIdleCallback/);
});
