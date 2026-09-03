const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const source = fs.readFileSync("planning-integrity-v235.js", "utf8");
const docsSource = fs.readFileSync("docs/planning-integrity-v235.js", "utf8");
const DATE = "2026-08-30";
const MARKER = "__aldusDailyPlanStartupReconciledV406";
const POST_BOOTSTRAP_ATTR = "data-aldus-bootstrap-maintenance-ms";
const RELEASE = "20260903-protected-daily-goals-dom-v442";

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


test("V419 continua instalando com state léxico sem preencher metas automaticamente", () => {
  const targetState = makeState(5);
  const before = JSON.stringify(targetState.dailyGoals);
  const { context, counters } = baseContext(targetState);
  context.__targetState = targetState;
  delete context.state;
  vm.createContext(context);
  vm.runInContext("let state = __targetState;", context);
  vm.runInContext(source, context);
  assert.equal(targetState.planning.config.disciplinesPerDay, 6);
  assert.equal(JSON.stringify(targetState.dailyGoals), before);
  assert.equal(counters.replenish, 0);
  assert.equal(counters.save, 0);
  assert.equal(context.__ALDUS_PLANNING_INTEGRITY_V235__.version, RELEASE);
  assert.equal(context.document.documentElement.dataset.aldusIntegrityVersion, RELEASE);
  assert.equal(source, docsSource);
});
