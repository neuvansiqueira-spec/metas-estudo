const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const preludeSource = fs.readFileSync(path.join(__dirname, "..", "daily-piece-audit-prelude-v186.js"), "utf8");
const performanceSource = fs.readFileSync(path.join(__dirname, "..", "daily-piece-audit-performance-v186.js"), "utf8");

function makeContext({ existingPieces = false } = {}) {
  const listeners = new Map();
  const timers = new Map();
  let timerId = 0;
  let idleCallback = null;
  let scoreBuilds = 0;
  let saveCalls = 0;
  let renderCalls = 0;
  let syncCalls = 0;
  const today = "2026-07-30";
  const activeDates = ["2026-07-30", "2026-07-31", "2026-08-01"];
  const state = { dailyGoals: [], migrations: {} };

  for (let index = 0; index < 1000; index += 1) {
    state.dailyGoals.push({ id: `history-${index}`, date: `2026-01-${String((index % 28) + 1).padStart(2, "0")}`, status: "Concluída" });
  }
  activeDates.forEach((date, index) => {
    state.dailyGoals.push({ id: `goal-${index}`, date, status: "Pendente", origin: "planejamento" });
    if (existingPieces) state.dailyGoals.push({ id: `piece-${index}`, date, status: "Pendente", fixedDailyPieceV183: true });
  });

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
    performance: { now: (() => { let value = 0; return () => ++value; })() },
    state,
    __aldusBootstrapReady: false,
    todayISO: () => today,
    addDays(date, days) {
      const parsed = new Date(`${date}T12:00:00Z`);
      parsed.setUTCDate(parsed.getUTCDate() + days);
      return parsed.toISOString().slice(0, 10);
    },
    buildPlanningScoreContext() { scoreBuilds += 1; return { scores: new Map() }; },
    saveData() { saveCalls += 1; return true; },
    render() { renderCalls += 1; },
    autoSyncAfterSave() { syncCalls += 1; },
    queueMicrotask(callback) { callback(); },
    setTimeout(callback) { const id = ++timerId; timers.set(id, callback); return id; },
    clearTimeout(id) { timers.delete(id); },
    requestIdleCallback(callback) { idleCallback = callback; return 999; },
    cancelIdleCallback() { idleCallback = null; },
    addEventListener(type, listener) {
      const items = listeners.get(type) || [];
      items.push(listener);
      listeners.set(type, items);
    },
    dispatchEvent(event) {
      for (const listener of listeners.get(event.type) || []) listener(event);
    }
  };
  context.window = context;
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(preludeSource, context, { filename: "daily-piece-audit-prelude-v186.js" });

  context.addEventListener("aldus:bootstrap-ready", () => { throw new Error("auditoria antiga não deveria executar"); });
  context.addEventListener("aldus:post-bootstrap-maintenance-complete", () => { throw new Error("auditoria antiga não deveria executar"); });
  context.addEventListener("pageshow", () => { throw new Error("auditoria antiga não deveria executar"); });
  context.__aldusDailyDelegatePieceGoalV183 = {
    isDelegatePieceRecord(goal) { return goal.fixedDailyPieceV183 === true; },
    ensureDailyPieceForDate(date, targetState) {
      const active = activeDates.includes(date);
      if (!active) return { changed: false, date, skipped: "inactive" };
      if (targetState.dailyGoals.some((goal) => goal.date === date && goal.fixedDailyPieceV183)) {
        return { changed: false, date, skipped: "present" };
      }
      context.buildPlanningScoreContext(targetState);
      const goal = { id: `added-${date}`, date, status: "Pendente", fixedDailyPieceV183: true };
      targetState.dailyGoals.push(goal);
      return { changed: true, date, added: goal, removed: null };
    }
  };

  vm.runInContext(performanceSource, context, { filename: "daily-piece-audit-performance-v186.js" });
  context.flushIdle = () => { const callback = idleCallback; idleCallback = null; callback?.(); };
  context.runTimers = () => { for (const callback of [...timers.values()]) callback(); timers.clear(); };
  context.getCounters = () => ({ scoreBuilds, saveCalls, renderCalls, syncCalls, timers: timers.size });
  return context;
}

test("bootstrap, manutenção e pageshow não agendam nem alteram metas", () => {
  const context = makeContext();
  const before = JSON.stringify(context.state.dailyGoals);
  context.dispatchEvent({ type: "aldus:bootstrap-ready" });
  context.dispatchEvent({ type: "aldus:post-bootstrap-maintenance-complete" });
  context.dispatchEvent({ type: "pageshow", persisted: true });
  context.flushIdle();
  context.runTimers();

  assert.equal(JSON.stringify(context.state.dailyGoals), before);
  assert.deepEqual(context.getCounters(), { scoreBuilds: 0, saveCalls: 0, renderCalls: 0, syncCalls: 0, timers: 0 });
  assert.equal(context.__aldusDailyPieceAuditPerformanceV186.legacyListenersSuppressed, 3);
  assert.equal(context.__aldusDailyPieceAuditPerformanceV186.automaticMutationDisabled, true);
});

test("auditoria sem autorização explícita é somente leitura e não percorre planejamento", () => {
  const context = makeContext();
  const before = JSON.stringify(context.state.dailyGoals);
  const report = context.__aldusDailyPieceAuditPerformanceV186.runAudit("automatic-like-call");

  assert.equal(report.changed, false);
  assert.equal(report.skipped, "explicit-authorization-required");
  assert.equal(JSON.stringify(context.state.dailyGoals), before);
  assert.deepEqual(context.getCounters(), { scoreBuilds: 0, saveCalls: 0, renderCalls: 0, syncCalls: 0, timers: 0 });
});

test("auditoria explicitamente autorizada reutiliza um único contexto de pontuação", () => {
  const context = makeContext();
  const report = context.__aldusDailyPieceAuditPerformanceV186.runAudit("test-explicit", { explicit: true, allowMutations: true });
  assert.equal(report.changed, true);
  assert.equal(report.performance.changedDates, 3);
  assert.equal(report.performance.scoreContextBuilds, 1);
  assert.deepEqual(context.getCounters(), { scoreBuilds: 1, saveCalls: 1, renderCalls: 1, syncCalls: 1, timers: 0 });
});

test("quando as Peças já existem, auditoria explícita não recalcula pontuação nem salva", () => {
  const context = makeContext({ existingPieces: true });
  const report = context.__aldusDailyPieceAuditPerformanceV186.runAudit("test-existing", { explicit: true, allowMutations: true });
  assert.equal(report.changed, false);
  assert.equal(report.performance.scoreContextBuilds, 0);
  assert.deepEqual(context.getCounters(), { scoreBuilds: 0, saveCalls: 0, renderCalls: 0, syncCalls: 0, timers: 0 });
});
