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
  constructor() {
    this.listeners = new Map();
  }
  addEventListener(type, listener, options = {}) {
    const current = this.listeners.get(type) || [];
    current.push({ listener, once: options?.once === true });
    this.listeners.set(type, current);
  }
  emit(type) {
    const current = [...(this.listeners.get(type) || [])];
    for (const entry of current) entry.listener({ type });
    this.listeners.set(type, (this.listeners.get(type) || []).filter((entry) => !entry.once));
  }
}

function plannedGoals() {
  return [
    { id: "auto-1", minutes: 60 },
    { id: "auto-2", minutes: 70 },
    { id: "auto-3", minutes: 70 },
    { id: "auto-4", minutes: 75 },
    { id: "auto-5", minutes: 75 },
    { id: "auto-6", minutes: 75 }
  ].map((goal) => ({ ...goal, date: DATE, origin: "planejamento", status: "Pendente" }));
}

function stateWithCount(count) {
  const goals = plannedGoals();
  return {
    planning: { config: { disciplinesPerDay: count, topicsPerDay: count } },
    dailyGoals: goals.slice(0, count).map((goal) => ({ ...goal }))
  };
}

test("V410 ignora estado provisório e reconcilia uma única vez após a manutenção pós-bootstrap", () => {
  const provisionalState = stateWithCount(4);
  const finalState = stateWithCount(3);
  const allGoals = plannedGoals();
  const counters = { replenish: 0, save: 0, render: 0, replace: 0 };
  const rootAttributes = new Map();
  const window = new FakeWindow();
  const snapshot = {
    disciplines: 6,
    topics: 6,
    savedAt: "2026-08-30T20:00:00-03:00"
  };

  const context = {
    console,
    __provisionalState: provisionalState,
    __finalState: finalState,
    window,
    document: {
      readyState: "complete",
      documentElement: {
        dataset: {},
        getAttribute(name) { return rootAttributes.has(name) ? rootAttributes.get(name) : null; },
        setAttribute(name, value) { rootAttributes.set(name, String(value)); }
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
      for (const expected of allGoals.slice(0, target)) {
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

  vm.runInContext(`
    let state = __provisionalState;
    globalThis.replaceState = function(nextState) {
      state = nextState;
      globalThis.__currentLexicalState = state;
      return state;
    };
    globalThis.__currentLexicalState = state;
  `, context);

  vm.runInContext(source, context);

  assert.equal(context.__ALDUS_PLANNING_INTEGRITY_V235__?.version, "20260831-metas-concluidas-somente-revisao-v411");
  assert.equal(context[MARKER], undefined, "não deve marcar reconciliação durante o estado provisório");
  assert.equal(counters.replenish, 0, "não deve recompor o estado provisório");
  assert.equal(provisionalState.dailyGoals.length, 4);
  assert.equal(provisionalState.planning.config.disciplinesPerDay, 4);

  vm.runInContext("replaceState(__finalState);", context);
  counters.replace += 1;

  assert.equal(finalState.dailyGoals.length, 3, "replaceState definitivo ainda não deve repor metas antes da manutenção final");
  assert.equal(finalState.planning.config.disciplinesPerDay, 6, "o guard deve restaurar a configuração autoritativa");
  assert.equal(counters.replenish, 0);
  assert.equal(context[MARKER], undefined);

  context.document.documentElement.setAttribute(POST_BOOTSTRAP_ATTR, "12.4");
  window.emit("aldus:post-bootstrap-maintenance-complete");

  assert.equal(finalState.planning.config.disciplinesPerDay, 6);
  assert.equal(finalState.planning.config.topicsPerDay, 6);
  assert.equal(finalState.dailyGoals.length, 6);
  assert.equal(finalState.dailyGoals.reduce((sum, goal) => sum + goal.minutes, 0), 425);
  assert.equal(counters.replenish, 1);
  assert.equal(counters.save, 1);
  assert.equal(counters.render, 1);
  assert.equal(context[MARKER], true);

  window.emit("aldus:bootstrap-ready");
  window.emit("load");
  assert.equal(counters.replenish, 1, "eventos posteriores não podem reconciliar novamente");
  assert.equal(counters.save, 1);
  assert.equal(counters.render, 1);
  assert.equal(source, docsSource);
});

test("V410 também reconcilia imediatamente se o script carregar depois da manutenção pós-bootstrap", () => {
  const targetState = stateWithCount(3);
  const allGoals = plannedGoals();
  const counters = { replenish: 0 };
  const snapshot = { disciplines: 6, topics: 6, savedAt: "2026-08-30T20:00:00-03:00" };
  const context = {
    console,
    state: targetState,
    window: new FakeWindow(),
    document: {
      readyState: "complete",
      documentElement: {
        dataset: {},
        getAttribute(name) { return name === POST_BOOTSTRAP_ATTR ? "9.2" : null; }
      },
      getElementById() { return null; },
      addEventListener() {}
    },
    localStorage: {
      getItem(key) { return key === "aldusPlanningManualGoalsV235" ? JSON.stringify(snapshot) : null; },
      setItem() {}
    },
    planningTargetsForDate(date, resolvedState) {
      return { disciplines: resolvedState.planning.config.disciplinesPerDay, topics: resolvedState.planning.config.topicsPerDay };
    },
    todayISO() { return DATE; },
    replenishMissingDailyPlanningGoalsV116(resolvedState) {
      counters.replenish += 1;
      for (const expected of allGoals) {
        if (!resolvedState.dailyGoals.some((goal) => goal.id === expected.id)) resolvedState.dailyGoals.push({ ...expected });
      }
      return { changed: true };
    },
    saveData() {},
    render() {},
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

  assert.equal(targetState.dailyGoals.length, 6);
  assert.equal(counters.replenish, 1);
  assert.equal(context[MARKER], true);
});
