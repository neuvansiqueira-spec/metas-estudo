const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(
  path.join(__dirname, "..", "daily-delegate-piece-goal-v183.js"),
  "utf8"
);

function makeContext({ completedPiece = false } = {}) {
  const listeners = new Map();
  const today = "2026-07-30";
  const state = {
    syllabusItems: [
      { id: "piece-1", discipline: "PEÇAS PARA DELEGADO", subject: "Representação por prisão preventiva", status: completedPiece ? "Concluído" : "Não iniciado" },
      { id: "penal-1", discipline: "Direito Penal", subject: "Crimes contra a pessoa", status: "Não iniciado" },
      { id: "proc-1", discipline: "Direito Processual Penal", subject: "Inquérito policial", status: "Não iniciado" }
    ],
    dailyGoals: [
      { id: "manual", date: today, discipline: "Direito Constitucional", subject: "Controle de constitucionalidade", status: "Pendente", origin: "manual" },
      { id: "auto-high", date: today, discipline: "Direito Penal", subject: "Crimes contra a pessoa", syllabusItemId: "penal-1", status: "Pendente", origin: "planejamento" },
      { id: "auto-low", date: today, discipline: "Direito Processual Penal", subject: "Inquérito policial", syllabusItemId: "proc-1", status: "Pendente", origin: "planejamento" }
    ],
    schedulableSettings: {},
    contestSyllabusMap: [],
    migrations: {}
  };
  let saveCalls = 0;
  let renderCalls = 0;
  let syncCalls = 0;
  let id = 0;

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
    state,
    queueMicrotask: (callback) => callback(),
    todayISO: () => today,
    addDays(date, days) {
      const parsed = new Date(`${date}T12:00:00Z`);
      parsed.setUTCDate(parsed.getUTCDate() + days);
      return parsed.toISOString().slice(0, 10);
    },
    planningTargetsForDate(date) {
      return { topics: date === today ? 3 : 0, disciplines: 2, unavailable: false };
    },
    completedStatus(item) { return item.status === "Concluído"; },
    normalGoalTypeForItemV157() { return "Estudo novo"; },
    createId() { id += 1; return `new-${id}`; },
    makeGoal(item, date, type) {
      return [{
        id: `goal-${item.id}-${date}`,
        date,
        data: date,
        discipline: item.discipline,
        disciplina: item.discipline,
        syllabusItemId: item.id,
        subject: item.subject,
        assunto: item.subject,
        baseSubject: item.subject,
        type,
        tipo: type.toLowerCase(),
        minutes: type === "Revisão" ? 30 : 60,
        status: "Pendente",
        origin: "planejamento"
      }];
    },
    isManualDailyGoal(goal) {
      return !["edital verticalizado", "planejamento", "plano do dia"].includes(String(goal.origin || "").toLowerCase());
    },
    isGoalDone(goal) { return goal.status === "Concluída"; },
    isGoalInProgress(goal) { return goal.status === "Em andamento"; },
    goalTotalActualMinutes(goal) { return Number(goal.actualMinutes || 0); },
    isProtectedDailyGoal(goal) {
      return context.isManualDailyGoal(goal)
        || context.isGoalDone(goal)
        || context.isGoalInProgress(goal)
        || context.goalTotalActualMinutes(goal) > 0
        || (goal.history || []).length > 0;
    },
    isPlanningStudyGoal() { return true; },
    buildPlanningScoreContext() {
      return { scores: new Map([["piece-1", 100], ["penal-1", 90], ["proc-1", 10]]) };
    },
    planningDistributionOrderV77(records) { return records.slice(); },
    selectPlanningGoalsForTargets(args = {}) {
      const selected = (args.eligibleGoals || []).slice(
        0,
        Math.max(0, Number(args.topicTarget || 0) - (args.existingGoals || []).length)
      );
      return {
        selected,
        topicTarget: args.topicTarget,
        disciplineTarget: args.disciplineTarget,
        foundTopics: selected.length,
        foundDisciplines: selected.length
      };
    },
    generateGoalsForDate() { return []; },
    saveData() { saveCalls += 1; },
    render() { renderCalls += 1; },
    autoSyncAfterSave() { syncCalls += 1; }
  };

  context.window = context;
  context.globalThis = context;
  context.addEventListener = (type, listener) => {
    const entries = listeners.get(type) || [];
    entries.push(listener);
    listeners.set(type, entries);
  };
  context.dispatchEvent = (event) => {
    for (const listener of listeners.get(event.type) || []) listener(event);
  };
  context.getCounters = () => ({ saveCalls, renderCalls, syncCalls });
  vm.createContext(context);
  vm.runInContext(source, context, { filename: "daily-delegate-piece-goal-v183.js" });
  return context;
}

test("reconhece variações de nome e categoria PIECE", () => {
  const context = makeContext();
  const api = context.__aldusDailyDelegatePieceGoalV183;
  assert.equal(api.isDelegatePieceRecord({ discipline: "Peça para Delegado de Polícia Civil" }, context.state), true);
  assert.equal(api.isDelegatePieceRecord({ discipline: "PEÇAS PARA DELEGADO" }, context.state), true);
  assert.equal(api.isDelegatePieceRecord({ contestCategory: "PIECE" }, context.state), true);
  assert.equal(api.isDelegatePieceRecord({ discipline: "Direito Penal" }, context.state), false);
});

test("reserva Peça como primeira meta e mantém o limite do dia", () => {
  const context = makeContext();
  const result = context.selectPlanningGoalsForTargets({
    date: "2026-07-30",
    targetState: context.state,
    topicTarget: 3,
    disciplineTarget: 2,
    existingGoals: [],
    eligibleGoals: [
      { id: "g1", discipline: "Direito Penal", subject: "A" },
      { id: "g2", discipline: "Processo Penal", subject: "B" },
      { id: "g3", discipline: "Constitucional", subject: "C" }
    ]
  });
  assert.equal(result.selected.length, 3);
  assert.equal(result.selected[0].fixedDailyPieceV183, true);
  assert.equal(result.selected[0].origin, "planejamento peça diária");
});

test("substitui somente meta automática intacta e preserva meta manual", () => {
  const context = makeContext();
  const report = context.__aldusDailyDelegatePieceGoalV183.ensureDailyPieceForDate("2026-07-30", context.state);
  assert.equal(report.changed, true);
  assert.equal(report.removed.id, "auto-low");
  assert.equal(context.state.dailyGoals.some((goal) => goal.id === "manual"), true);
  assert.equal(context.state.dailyGoals.some((goal) => goal.id === "auto-high"), true);
  assert.equal(context.state.dailyGoals.some((goal) => goal.id === "auto-low"), false);
  assert.equal(context.state.dailyGoals.filter((goal) => goal.fixedDailyPieceV183).length, 1);
});

test("quando todas as Peças foram concluídas, mantém treino diário como Revisão", () => {
  const context = makeContext({ completedPiece: true });
  const report = context.__aldusDailyDelegatePieceGoalV183.ensureDailyPieceForDate("2026-07-30", context.state);
  assert.equal(report.changed, true);
  assert.equal(report.added.type, "Revisão");
  assert.equal(report.added.fixedDailyPieceV183, true);
});

test("auditoria no bootstrap salva uma vez e não usa service worker ou MutationObserver", () => {
  const context = makeContext();
  context.dispatchEvent({ type: "aldus:bootstrap-ready" });
  assert.deepEqual(context.getCounters(), { saveCalls: 1, renderCalls: 1, syncCalls: 1 });
  assert.equal(source.includes("MutationObserver"), false);
  assert.equal(source.includes("serviceWorker"), false);
  assert.equal(source.includes("RUNTIME_PATCH_ASSET"), false);
});
