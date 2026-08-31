const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const source = fs.readFileSync("planning-integrity-v235.js", "utf8");
const docsSource = fs.readFileSync("docs/planning-integrity-v235.js", "utf8");
const MARKER = "__aldusDailyPlanStartupReconciledV406";
const DATE = "2026-08-30";
const POST_BOOTSTRAP_ATTR = "data-aldus-bootstrap-maintenance-ms";
const planned = [
  { id: "auto-1", minutes: 60 },
  { id: "auto-2", minutes: 70 },
  { id: "auto-3", minutes: 70 },
  { id: "auto-4", minutes: 75 },
  { id: "auto-5", minutes: 75 },
  { id: "auto-6", minutes: 75 }
].map((goal) => ({
  ...goal,
  date: DATE,
  origin: "planejamento",
  origem: "planejamento",
  status: "Pendente"
}));

class FakeWindow {
  addEventListener() {}
}

function minutes(goals) {
  return goals.reduce((sum, goal) => sum + Number(goal.minutes || 0), 0);
}

function makeState({ includeManual = false } = {}) {
  const dailyGoals = planned.slice(0, 3).map((goal) => ({ ...goal }));
  if (includeManual) {
    dailyGoals.push({
      id: "manual-1",
      date: DATE,
      origin: "manual",
      origem: "manual",
      status: "Em andamento",
      minutes: 25,
      actualMinutes: 11,
      history: ["preservar"]
    });
  }
  return {
    planning: {
      config: { disciplinesPerDay: 3, topicsPerDay: 3 }
    },
    dailyGoals
  };
}

function run({ failSave = false, includeManual = false } = {}) {
  const targetState = makeState({ includeManual });
  const counters = { replenish: 0, save: 0, render: 0, sync: 0 };
  const observed = { disciplinesAtReplenish: 0, markerAtReplenish: null, markerAtSave: null, markerAtRender: null };
  const snapshot = {
    disciplines: 6,
    topics: 6,
    savedAt: "2026-08-30T20:00:00-03:00"
  };

  const context = {
    console,
    state: targetState,
    window: new FakeWindow(),
    document: {
      readyState: "complete",
      documentElement: {
        dataset: {},
        getAttribute(name) { return name === POST_BOOTSTRAP_ATTR ? "1.0" : null; }
      },
      getElementById() { return null; },
      addEventListener() {}
    },
    localStorage: {
      getItem(key) {
        return key === "aldusPlanningManualGoalsV235" ? JSON.stringify(snapshot) : null;
      },
      setItem() {}
    },
    planningTargetsForDate(date, state) {
      return {
        disciplines: Number(state?.planning?.config?.disciplinesPerDay || 0),
        topics: Number(state?.planning?.config?.topicsPerDay || 0)
      };
    },
    todayISO() { return DATE; },
    replenishMissingDailyPlanningGoalsV116(state) {
      counters.replenish += 1;
      observed.disciplinesAtReplenish = Number(state.planning.config.disciplinesPerDay || 0);
      observed.markerAtReplenish = context[MARKER] === true;
      const target = Number(state.planning.config.disciplinesPerDay || 0);
      let changed = false;
      for (const expected of planned.slice(0, target)) {
        if (state.dailyGoals.some((goal) => goal.id === expected.id)) continue;
        state.dailyGoals.push({ ...expected });
        changed = true;
      }
      return { changed, target };
    },
    saveData() {
      counters.save += 1;
      observed.markerAtSave = context[MARKER] === true;
      if (failSave) throw new Error("falha simulada de persistência");
      return true;
    },
    render() {
      counters.render += 1;
      observed.markerAtRender = context[MARKER] === true;
    },
    autoSyncAfterSave() {
      counters.sync += 1;
    },
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
  return { context, state: targetState, counters, observed };
}

test("V406 restaura a configuração autoritativa antes de reconciliar 3 metas/3h20 para 6 metas/7h05", () => {
  const result = run();

  assert.equal(result.counters.replenish, 1);
  assert.equal(result.observed.disciplinesAtReplenish, 6);
  assert.equal(result.state.planning.config.disciplinesPerDay, 6);
  assert.equal(result.state.planning.config.topicsPerDay, 6);
  assert.equal(result.state.dailyGoals.length, 6);
  assert.equal(minutes(result.state.dailyGoals), 425);
  assert.equal(result.counters.save, 1);
  assert.equal(result.counters.render, 1);
  assert.equal(result.counters.sync, 1);
  assert.equal(result.observed.markerAtReplenish, false);
  assert.equal(result.observed.markerAtSave, false);
  assert.equal(result.observed.markerAtRender, false);
  assert.equal(result.context[MARKER], true);
});

test("V406 preserva meta manual e execução já registrada ao repor apenas automáticas faltantes", () => {
  const result = run({ includeManual: true });
  const manual = result.state.dailyGoals.find((goal) => goal.id === "manual-1");

  assert.deepEqual(
    JSON.parse(JSON.stringify(manual)),
    {
      id: "manual-1",
      date: DATE,
      origin: "manual",
      origem: "manual",
      status: "Em andamento",
      minutes: 25,
      actualMinutes: 11,
      history: ["preservar"]
    }
  );
  assert.equal(result.state.dailyGoals.filter((goal) => goal.origin === "planejamento").length, 6);
  assert.equal(result.counters.replenish, 1);
});

test("V406 só marca a reconciliação como concluída depois de persistir e renderizar", () => {
  const result = run({ failSave: true });

  assert.equal(result.counters.replenish, 1);
  assert.equal(result.observed.disciplinesAtReplenish, 6);
  assert.equal(result.counters.save, 1);
  assert.equal(result.counters.render, 0);
  assert.equal(result.observed.markerAtReplenish, false);
  assert.equal(result.observed.markerAtSave, false);
  assert.equal(result.context[MARKER], false);
});

test("V406 mantém 6 metas/7h05 em recargas completas repetidas", () => {
  for (let reload = 0; reload < 5; reload += 1) {
    const result = run();
    assert.equal(result.observed.disciplinesAtReplenish, 6, `recarga ${reload + 1}`);
    assert.equal(result.state.dailyGoals.length, 6, `recarga ${reload + 1}`);
    assert.equal(minutes(result.state.dailyGoals), 425, `recarga ${reload + 1}`);
    assert.equal(result.counters.replenish, 1, `recarga ${reload + 1}`);
    assert.equal(result.counters.save, 1, `recarga ${reload + 1}`);
    assert.equal(result.counters.render, 1, `recarga ${reload + 1}`);
    assert.equal(result.context[MARKER], true, `recarga ${reload + 1}`);
  }
});

test("V410 mantém a sequência autoritativa sem polling, timers ou microtasks", () => {
  for (const token of [
    "queueMicrotask(",
    "Promise.resolve().then",
    "setTimeout(",
    "setInterval(",
    "requestAnimationFrame(",
    "requestIdleCallback(",
    "MutationObserver",
    "scheduleStartupReconcile"
  ]) {
    assert.equal(source.includes(token), false, `mecanismo proibido: ${token}`);
  }

  const finalizeIndex = source.indexOf("function finalizeStartupReconcile");
  const enforceIndex = source.indexOf("enforceSnapshot(targetState);", finalizeIndex);
  const reconcileIndex = source.indexOf("reconcileDailyPlanOnStartup(targetState);", finalizeIndex);
  assert.ok(finalizeIndex >= 0 && enforceIndex > finalizeIndex && reconcileIndex > enforceIndex, "a restauração autoritativa pós-bootstrap deve preceder a reconciliação");
  assert.match(source, /data-aldus-bootstrap-maintenance-ms/);
  assert.equal(source, docsSource);
});
