const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const source = fs.readFileSync("planning-integrity-v235.js", "utf8");
const docsSource = fs.readFileSync("docs/planning-integrity-v235.js", "utf8");
const DATE = "2026-08-30";
const MARKER = "__aldusDailyPlanStartupReconciledV406";
const POST_BOOTSTRAP_ATTR = "data-aldus-bootstrap-maintenance-ms";

class FakeWindow {
  addEventListener() {}
}

test("V407 continua instalando com state léxico e V410 reconcilia após bootstrap definitivo", () => {
  const planned = Array.from({ length: 6 }, (_, index) => ({
    id: `auto-${index + 1}`,
    date: DATE,
    origin: "planejamento",
    status: "Pendente",
    minutes: index === 0 ? 50 : 75
  }));
  const targetState = {
    planning: { config: { disciplinesPerDay: 5, topicsPerDay: 5 } },
    dailyGoals: planned.slice(0, 5).map((goal) => ({ ...goal }))
  };
  const counters = { replenish: 0, save: 0, render: 0 };
  const snapshot = {
    disciplines: 6,
    topics: 6,
    savedAt: "2026-08-30T20:00:00-03:00"
  };

  const context = {
    console,
    __targetState: targetState,
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
    planningTargetsForDate(date, resolvedState) {
      return {
        disciplines: Number(resolvedState?.planning?.config?.disciplinesPerDay || 0),
        topics: Number(resolvedState?.planning?.config?.topicsPerDay || 0)
      };
    },
    todayISO() { return DATE; },
    replenishMissingDailyPlanningGoalsV116(resolvedState) {
      counters.replenish += 1;
      const target = Number(resolvedState.planning.config.disciplinesPerDay || 0);
      let changed = false;
      for (const expected of planned.slice(0, target)) {
        if (resolvedState.dailyGoals.some((goal) => goal.id === expected.id)) continue;
        resolvedState.dailyGoals.push({ ...expected });
        changed = true;
      }
      return { changed, target };
    },
    saveData() { counters.save += 1; },
    render() { counters.render += 1; },
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

  vm.runInContext("let state = __targetState;", context);
  assert.equal(context.state, undefined, "binding léxico não deve virar globalThis.state");

  vm.runInContext(source, context);

  assert.equal(targetState.planning.config.disciplinesPerDay, 6);
  assert.equal(targetState.planning.config.topicsPerDay, 6);
  assert.equal(targetState.dailyGoals.length, 6);
  assert.equal(counters.replenish, 1);
  assert.equal(counters.save, 1);
  assert.equal(counters.render, 1);
  assert.equal(context[MARKER], true);
  assert.equal(context.__ALDUS_PLANNING_INTEGRITY_V235__?.version, "20260831-metas-concluidas-somente-revisao-v411");
  assert.equal(context.document.documentElement.dataset.aldusIntegrityVersion, "20260831-metas-concluidas-somente-revisao-v411");
  assert.equal(source, docsSource);
});
