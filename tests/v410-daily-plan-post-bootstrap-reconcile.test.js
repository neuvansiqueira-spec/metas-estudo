const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const source = fs.readFileSync("planning-integrity-v235.js", "utf8");
const docsSource = fs.readFileSync("docs/planning-integrity-v235.js", "utf8");
const DATE = "2026-08-30";
const MARKER = "__aldusDailyPlanStartupReconciledV406";
const POST_BOOTSTRAP_ATTR = "data-aldus-bootstrap-maintenance-ms";
const RELEASE = "20260831-daily-goals-explicit-mutation-v419";

class FakeWindow {
  constructor() { this.listeners = new Map(); }
  addEventListener(type, listener, options = {}) {
    const list = this.listeners.get(type) || [];
    list.push({ listener, once: options?.once === true });
    this.listeners.set(type, list);
  }
  emit(type, event = {}) {
    const list = [...(this.listeners.get(type) || [])];
    for (const entry of list) entry.listener({ type, ...event });
    this.listeners.set(type, (this.listeners.get(type) || []).filter((entry) => !entry.once));
  }
}

function makeState(count = 3) {
  return {
    planning: { config: { disciplinesPerDay: count, topicsPerDay: count } },
    dailyGoals: Array.from({ length: count }, (_, index) => ({ id: `auto-${index + 1}`, date: DATE, origin: "planejamento", status: "Pendente", minutes: 60 + index }))
  };
}

function baseContext(targetState, { postBootstrap = true } = {}) {
  const counters = { replenish: 0, save: 0, render: 0, sync: 0 };
  const attrs = new Map();
  if (postBootstrap) attrs.set(POST_BOOTSTRAP_ATTR, "1.0");
  const window = new FakeWindow();
  const snapshot = { disciplines: 6, topics: 6, savedAt: "2026-08-30T20:00:00-03:00" };
  const context = {
    console, state: targetState, window,
    document: {
      readyState: "complete",
      documentElement: { dataset: {}, getAttribute(name) { return attrs.has(name) ? attrs.get(name) : null; }, setAttribute(name, value) { attrs.set(name, String(value)); } },
      getElementById() { return null; }, querySelectorAll() { return []; }, querySelector() { return null; }, addEventListener() {}
    },
    localStorage: { getItem(key) { return key === "aldusPlanningManualGoalsV235" ? JSON.stringify(snapshot) : null; }, setItem() {} },
    planningTargetsForDate(date, s) { return { disciplines: Number(s?.planning?.config?.disciplinesPerDay || 0), topics: Number(s?.planning?.config?.topicsPerDay || 0) }; },
    todayISO() { return DATE; },
    replenishMissingDailyPlanningGoalsV116() { counters.replenish += 1; throw new Error("V419: reposição automática proibida"); },
    saveData() { counters.save += 1; }, render() { counters.render += 1; }, autoSyncAfterSave() { counters.sync += 1; },
    Date, Object, Array, String, Number, Set, Map
  };
  context.globalThis = context;
  return { context, counters, window, attrs };
}


test("V419 pós-bootstrap apenas diagnostica e não recompõe dailyGoals", () => {
  const targetState = makeState(3);
  const before = JSON.stringify(targetState.dailyGoals);
  const { context, counters, window } = baseContext(targetState, { postBootstrap: false });
  vm.createContext(context);
  vm.runInContext(source, context);
  assert.equal(JSON.stringify(targetState.dailyGoals), before);
  context.document.documentElement.setAttribute(POST_BOOTSTRAP_ATTR, "12.4");
  window.emit("aldus:post-bootstrap-maintenance-complete");
  assert.equal(JSON.stringify(targetState.dailyGoals), before);
  assert.equal(counters.replenish, 0);
  assert.equal(counters.save, 0);
  assert.equal(counters.render, 0);
  assert.equal(context[MARKER], true);
  assert.equal(context.__aldusDailyPlanStartupDiagnosticV419.skipped, "automatic-mutation-disabled-v419");
});

test("V419 replaceState depois do bootstrap não dispara reposição", () => {
  const initial = makeState(4);
  const finalState = makeState(2);
  const beforeFinal = JSON.stringify(finalState.dailyGoals);
  const { context, counters } = baseContext(initial);
  context.__finalState = finalState;
  vm.createContext(context);
  vm.runInContext(`let state = globalThis.state; globalThis.replaceState = function(nextState) { state = nextState; globalThis.state = nextState; return nextState; };`, context);
  vm.runInContext(source, context);
  vm.runInContext("replaceState(__finalState);", context);
  assert.equal(JSON.stringify(finalState.dailyGoals), beforeFinal);
  assert.equal(counters.replenish, 0);
  assert.equal(counters.save, 0);
});
