const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const source = fs.readFileSync("planning-integrity-v235.js", "utf8");
const docsSource = fs.readFileSync("docs/planning-integrity-v235.js", "utf8");

function runtime() {
  const storage = new Map();
  const targetState = {
    planning: { config: { disciplinesPerDay: 2, topicsPerDay: 3 }, availability: {} },
    dailyGoals: [
      { id: "concluida", date: "2026-08-04", status: "Concluída", actualMinutes: 60 },
      { id: "automatica-antiga", date: "2026-08-04", status: "Pendente", origin: "planejamento" }
    ]
  };
  const viewCache = new Map([["metas-do-dia", true], ["fabrica-resumos", true], ["planejamento", true]]);
  let saveCalls = 0;
  let alignmentCalls = 0;
  let factoryCalls = 0;
  const context = {
    globalThis: null,
    window: null,
    state: targetState,
    document: {
      readyState: "complete",
      documentElement: { dataset: {} },
      querySelectorAll: () => [],
      querySelector: () => null,
      getElementById: () => null,
      addEventListener: () => {}
    },
    localStorage: {
      getItem: (key) => storage.get(key) || null,
      setItem: (key, value) => storage.set(key, value)
    },
    location: { hash: "" },
    console,
    Date,
    JSON,
    Math,
    Number,
    String,
    Object,
    Array,
    setInterval,
    clearInterval,
    setTimeout,
    clearTimeout,
    todayISO: () => "2026-08-04",
    getPlanningDayType: () => "plantao",
    planningTargetsForDate: () => ({ disciplines: 2, topics: 3, dayContent: { mode: "goals_only" } }),
    ensureDailyPlanAlignedWithPlanningV174(state, date) {
      alignmentCalls += 1;
      const total = context.planningTargetsForDate(date, state).topics;
      const preserved = state.dailyGoals.filter((goal) => goal.status === "Concluída" || Number(goal.actualMinutes) > 0);
      state.dailyGoals = [
        ...preserved,
        ...Array.from({ length: Math.max(0, total - preserved.length) }, (_, index) => ({
          id: `planejada-${index + 1}`,
          date,
          status: "Pendente",
          origin: "planejamento"
        }))
      ];
      return { changed: true };
    },
    renderFactory() { factoryCalls += 1; },
    viewRenderCacheV172: viewCache,
    saveData() { saveCalls += 1; return true; },
    autoSyncAfterSave() {},
    render() {}
  };
  context.globalThis = context;
  context.window = context;
  vm.createContext(context);
  vm.runInContext(source, context);
  return {
    context,
    state: targetState,
    viewCache,
    counts: () => ({ saveCalls, alignmentCalls, factoryCalls })
  };
}

test("mantém paridade entre raiz e publicação", () => {
  assert.equal(source, docsSource);
});

test("restaura cinco metas de 04/08 preservando meta concluída", async () => {
  const app = runtime();
  await new Promise((resolve) => setTimeout(resolve, 250));
  assert.equal(app.state.planning.config.disciplinesPerDay, 5);
  assert.equal(app.state.planning.config.topicsPerDay, 5);
  assert.equal(app.state.planning.dailyGoalOverridesV235["2026-08-04"].disciplines, 5);
  assert.deepEqual(
    {
      disciplines: app.context.planningTargetsForDate("2026-08-04", app.state).disciplines,
      topics: app.context.planningTargetsForDate("2026-08-04", app.state).topics
    },
    { disciplines: 5, topics: 5 }
  );
  assert.equal(app.state.dailyGoals.length, 5);
  assert.ok(app.state.dailyGoals.some((goal) => goal.id === "concluida"));
  assert.ok(app.counts().saveCalls >= 1);
});

test("invalida Plano do Dia, Planejamento e Fábrica após alinhamento", async () => {
  const app = runtime();
  await new Promise((resolve) => setTimeout(resolve, 250));
  assert.equal(app.viewCache.has("metas-do-dia"), false);
  assert.equal(app.viewCache.has("fabrica-resumos"), false);
  assert.equal(app.viewCache.has("planejamento"), false);
  const before = app.counts().alignmentCalls;
  app.context.renderFactory();
  assert.ok(app.counts().alignmentCalls > before);
  assert.equal(app.counts().factoryCalls, 1);
});
