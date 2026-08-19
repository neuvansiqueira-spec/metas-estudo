const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(root, "planning-variety-v357.js"), "utf8");

function makeContext(route = "#metas-do-dia") {
  const listeners = new Map();
  let idleCallback = null;
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
    JSON,
    location: { hash: route },
    performance: { now: (() => { let value = 0; return () => ++value; })() },
    requestIdleCallback(callback) { idleCallback = callback; return 1; },
    cancelIdleCallback() { idleCallback = null; },
    setTimeout(callback) { callback(); return 1; },
    queueMicrotask(callback) { callback(); },
    addEventListener(type, listener) {
      const entries = listeners.get(type) || [];
      entries.push(listener);
      listeners.set(type, entries);
    },
    dispatchEvent(event) {
      for (const listener of listeners.get(event.type) || []) listener(event);
    }
  };
  context.window = context;
  context.globalThis = context;
  context.flushIdle = () => { const callback = idleCallback; idleCallback = null; callback?.(); };
  vm.createContext(context);
  vm.runInContext(source, context, { filename: "planning-variety-v357.js" });
  return context;
}

test("V357 oferece os 11 tipos de Peça sem persistir itens virtuais no edital", () => {
  const context = makeContext();
  let visiblePieces = 0;
  context.state = {
    syllabusItems: [{ id: "real-piece", discipline: "PEÇA PARA DELEGADO DE POLÍCIA CIVIL", subject: "Representação por Prisão Preventiva", status: "Não iniciado" }],
    dailyGoals: []
  };
  context.__aldusDailyDelegatePieceGoalV183 = Object.freeze({
    ensureDailyPieceForDate(date, targetState) {
      visiblePieces = targetState.syllabusItems.filter((item) => /delegado/i.test(item.discipline || "")).length;
      const virtual = targetState.syllabusItems.find((item) => String(item.id).startsWith("v357-piece:"));
      const goal = { id: "goal-piece", date, discipline: virtual.discipline, subject: virtual.subject, syllabusItemId: virtual.id, fixedDailyPieceV183: true };
      targetState.dailyGoals.push(goal);
      return { changed: true, added: goal };
    }
  });

  const report = context.__aldusDailyDelegatePieceGoalV183.ensureDailyPieceForDate("2026-08-18", context.state, {});
  assert.equal(context.__aldusPlanningVarietyV357.pieceTypes.length, 11);
  assert.equal(visiblePieces, 11);
  assert.equal(context.state.syllabusItems.length, 1);
  assert.equal(report.added.syllabusItemId, "");
  assert.match(report.added.pieceCatalogKeyV357, /^v357-piece:/);
});

test("V357 evita tema semanticamente repetido quando existe alternativa", () => {
  const context = makeContext();
  context.todayISO = () => "2026-08-18";
  context.state = {
    syllabusItems: [],
    dailyGoals: [{
      id: "already",
      date: "2026-08-18",
      discipline: "Direito Processual Penal",
      subject: "Representação por Prisão Preventiva",
      type: "Estudo novo",
      origin: "planejamento",
      status: "Pendente"
    }]
  };
  context.selectPlanningGoalsForTargets = (args) => ({ selected: args.eligibleGoals.slice(0, Math.max(0, args.topicTarget - (args.existingGoals || []).length)) });
  context.generateGoalsForDate = () => [];
  context.reconcileDailyGoalsWithPlanning = () => ({});
  context.reconcilePlanningDates = () => ({ added: [] });
  context.dispatchEvent({ type: "aldus:bootstrap-ready" });

  const result = context.selectPlanningGoalsForTargets({
    date: "2026-08-19",
    targetState: context.state,
    topicTarget: 1,
    existingGoals: [],
    eligibleGoals: [
      { id: "duplicate", discipline: "Direito Processual Penal", subject: "Prisão Preventiva", type: "Estudo novo", origin: "edital verticalizado", status: "Pendente" },
      { id: "alternative", discipline: "Direito Processual Penal", subject: "Cadeia de Custódia", type: "Estudo novo", origin: "edital verticalizado", status: "Pendente" }
    ]
  });
  assert.equal(result.selected[0].id, "alternative");
});

test("V357 não deixa o cronograma incompleto quando só existe o tema repetido", () => {
  const context = makeContext();
  context.todayISO = () => "2026-08-18";
  context.state = {
    syllabusItems: [],
    dailyGoals: [{ id: "already", date: "2026-08-18", discipline: "Direito Processual Penal", subject: "Representação por Prisão Preventiva", type: "Estudo novo", origin: "planejamento", status: "Pendente" }]
  };
  context.selectPlanningGoalsForTargets = (args) => ({ selected: args.eligibleGoals.slice(0, 1) });
  context.generateGoalsForDate = () => [];
  context.reconcileDailyGoalsWithPlanning = () => ({});
  context.reconcilePlanningDates = () => ({ added: [] });
  context.dispatchEvent({ type: "aldus:bootstrap-ready" });

  const result = context.selectPlanningGoalsForTargets({
    date: "2026-08-19",
    targetState: context.state,
    topicTarget: 1,
    existingGoals: [],
    eligibleGoals: [{ id: "duplicate", discipline: "Direito Processual Penal", subject: "Prisão Preventiva", type: "Estudo novo", origin: "edital verticalizado", status: "Pendente" }]
  });
  assert.equal(result.selected[0].id, "duplicate");
});

test("auditoria V357 troca apenas duplicata automática futura intacta", () => {
  const context = makeContext();
  context.todayISO = () => "2026-08-18";
  let saves = 0;
  let renders = 0;
  let syncs = 0;
  let reconciliations = 0;
  context.state = {
    syllabusItems: [],
    dailyGoals: [
      { id: "first", date: "2026-08-18", discipline: "Direito Processual Penal", subject: "Representação por Prisão Preventiva", type: "Estudo novo", origin: "planejamento", status: "Pendente" },
      { id: "duplicate", date: "2026-08-19", discipline: "Direito Processual Penal", subject: "Prisão Preventiva", type: "Estudo novo", origin: "planejamento", status: "Pendente" },
      { id: "manual", date: "2026-08-20", discipline: "Direito Processual Penal", subject: "Prisão Preventiva", type: "Estudo novo", origin: "manual", status: "Pendente" },
      { id: "review", date: "2026-08-21", discipline: "Direito Processual Penal", subject: "Prisão Preventiva", type: "Revisão", origin: "planejamento", status: "Pendente" },
      { id: "started", date: "2026-08-22", discipline: "Direito Processual Penal", subject: "Prisão Preventiva", type: "Estudo novo", origin: "planejamento", status: "Em andamento", actualMinutes: 10 }
    ]
  };
  context.selectPlanningGoalsForTargets = (args) => ({ selected: args.eligibleGoals || [] });
  context.generateGoalsForDate = () => [];
  context.reconcileDailyGoalsWithPlanning = () => ({});
  context.reconcilePlanningDates = (targetState, dates) => {
    reconciliations += 1;
    targetState.dailyGoals.push({ id: "replacement", date: dates[0], discipline: "Direito Processual Penal", subject: "Cadeia de Custódia", type: "Estudo novo", origin: "planejamento", status: "Pendente" });
    return { added: ["replacement"] };
  };
  context.saveData = () => { saves += 1; };
  context.render = () => { renders += 1; };
  context.autoSyncAfterSave = () => { syncs += 1; };
  context.dispatchEvent({ type: "aldus:bootstrap-ready" });
  context.flushIdle();

  assert.equal(context.state.dailyGoals.some((goal) => goal.id === "duplicate"), false);
  assert.equal(context.state.dailyGoals.some((goal) => goal.id === "manual"), true);
  assert.equal(context.state.dailyGoals.some((goal) => goal.id === "review"), true);
  assert.equal(context.state.dailyGoals.some((goal) => goal.id === "started"), true);
  assert.equal(reconciliations, 1);
  assert.equal(saves, 1);
  assert.equal(renders, 1);
  assert.equal(syncs, 1);
});

test("V357 não cria hot path, loop contínuo nem acesso direto ao armazenamento", () => {
  assert.match(source, /requestIdleCallback/);
  assert.match(source, /PLANNING_ROUTES/);
  assert.doesNotMatch(source, /MutationObserver|setInterval|localStorage|indexedDB|syncStableSerialize|cloneData|structuredClone/);
  const pagesWorkflow = fs.readFileSync(path.join(root, ".github", "workflows", "pages.yml"), "utf8");
  assert.match(pagesWorkflow, /planning-variety-v357\.js/);
  assert.match(pagesWorkflow, /aldusPlanningVarietyV357/);
});
