const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

function fakeElement(kind = "generic") {
  return {
    nodeType: 1, kind, dataset: {}, textContent: "", value: "", id: "", style: {},
    setAttribute() {}, remove() {},
    closest(selector) {
      if (kind === "planned" && selector.includes(".planned-today-stat")) return this;
      if (kind === "realized" && selector.includes(".realized-today-stat")) return this;
      if (kind === "weekly" && selector.includes("#weeklyGoalStatus")) return this;
      return null;
    }
  };
}

function createLocalStorage() {
  const values = new Map();
  return {
    get length() { return values.size; },
    key(index) { return Array.from(values.keys())[index] ?? null; },
    getItem(key) { return values.has(String(key)) ? values.get(String(key)) : null; },
    setItem(key, value) { values.set(String(key), String(value)); },
    removeItem(key) { values.delete(String(key)); }
  };
}

function loadCrossTabHarness() {
  const summarySource = fs.readFileSync("daily-summary-time-format-v243.js", "utf8");
  const storageSource = fs.readFileSync("storage-concurrency-v345.js", "utf8");
  const planned = fakeElement("planned");
  const realized = fakeElement("realized");
  const weekly = fakeElement("weekly");
  const screenStage = fakeElement("stage");
  const goalDate = fakeElement("goalDate");
  goalDate.id = "goalDate";
  goalDate.value = "2026-08-16";
  const documentListeners = new Map();
  const elementsById = new Map([["goalDate", goalDate]]);
  const rafQueue = [];
  let persisted = null;

  function addDocumentListener(type, listener) {
    const listeners = documentListeners.get(type) || [];
    listeners.push(listener);
    documentListeners.set(type, listeners);
  }

  const document = {
    readyState: "complete",
    hidden: false,
    documentElement: { dataset: {} },
    body: { appendChild(element) { if (element?.id) elementsById.set(element.id, element); } },
    head: { appendChild(element) { if (element?.id) elementsById.set(element.id, element); } },
    getElementById(id) { return elementsById.get(id) || null; },
    createElement() { return fakeElement("created"); },
    querySelector(selector) {
      if (selector === ".planned-today-stat > strong") return planned;
      if (selector === ".realized-today-stat > strong") return realized;
      if (selector === "#weeklyGoalStatus") return weekly;
      if (selector === ".screen-stage") return screenStage;
      return null;
    },
    addEventListener: addDocumentListener,
    dispatchEvent(event) {
      for (const listener of documentListeners.get(event?.type) || []) listener(event);
      return true;
    }
  };

  class FakeMutationObserver { constructor() {} observe() {} }
  class FakeCustomEvent { constructor(type, options = {}) { this.type = type; this.detail = options.detail; } }
  const localStorage = createLocalStorage();
  const state = { dailyGoals: [], studies: [], questionLogs: [], questionBank: [], questionBankSessions: [], simulados: [], questionErrorNotebook: [] };
  const context = {
    console, document, MutationObserver: FakeMutationObserver, CustomEvent: FakeCustomEvent,
    localStorage, state, elements: { goalDate }, bootstrapStateReady: true,
    todayISO: () => "2026-08-16", weekStart: () => "2026-08-10", addDays: () => "2026-08-16",
    availabilityForDate: () => ({ hours: 0 }), goalDateValue: (goal) => goal.date,
    goalTotalActualMinutes: (goal) => Number(goal.studyActualMinutes) || 0,
    centralTimeChartLogs() {
      return [
        ...(state.studies || []).map((study) => ({ id: study.id, date: study.date, minutes: Number(study.minutes) || 0 })),
        ...(state.questionLogs || []).map((log) => ({ id: log.id, date: log.date, minutes: Number(log.minutes) || 0 }))
      ];
    },
    requestAnimationFrame(callback) { rafQueue.push(callback); return rafQueue.length; },
    window: { setTimeout() { return 0; }, addEventListener() {} },
    setTimeout() { return 0; }, setInterval() { return 1; }, clearInterval() {},
    queueMicrotask(callback) { callback(); }, addEventListener() {},
    crypto: { randomUUID: () => "primary-tab" }, structuredClone: global.structuredClone,
    saveData() { return true; }, autoSyncAfterSave() { return Promise.resolve(true); },
    async saveStateToIndexedDB(snapshot) { persisted = structuredClone(snapshot); return { savedAt: "2026-08-16T19:30:00.000Z" }; },
    async loadStateFromIndexedDB() { return persisted ? { data: structuredClone(persisted) } : { data: structuredClone(state) }; },
    HTMLFormElement: class HTMLFormElement {}
  };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(summarySource, context);
  function flushRaf() { while (rafQueue.length) rafQueue.shift()(); }
  flushRaf();
  vm.runInContext(storageSource, context);
  context.AldusStorageConcurrencyV345.installRuntimeGuards();
  return { context, localStorage, weekly, flushRaf, pendingRaf: () => rafQueue.length };
}

test("V347 commit cross-tab primário atualiza o resumo semanal para cronômetro e simulado", async () => {
  const harness = loadCrossTabHarness();
  assert.equal(harness.weekly.textContent, "0min registradas");
  harness.localStorage.setItem("aldus:module-request:v346:req-timer", JSON.stringify({
    id: "req-timer", type: "timer",
    payload: { sessionId: "timer-1", goalId: "", minutes: 45,
      study: { id: "study-1", sessionId: "timer-1", timerSessionId: "timer-1", date: "2026-08-16", minutes: 45, updatesGoal: false, timerKind: "study" }, goal: null }
  }));
  await harness.context.AldusStorageConcurrencyV345.processPendingRequests();
  assert.equal(harness.pendingRaf(), 1);
  harness.flushRaf();
  assert.equal(harness.weekly.textContent, "45min registradas");

  harness.localStorage.removeItem("aldus:module-request:v346:req-timer");
  harness.localStorage.removeItem("aldus:module-ack:v346:req-timer");
  harness.localStorage.setItem("aldus:module-request:v346:req-sim", JSON.stringify({
    id: "req-sim", type: "simulation",
    payload: { sessionId: "sim-1", bankQuestions: [], session: { id: "sim-1" },
      questionLogs: [{ id: "qlog-1", date: "2026-08-16", minutes: 15 }], mock: { id: "mock-1" }, notebook: [] }
  }));
  await harness.context.AldusStorageConcurrencyV345.processPendingRequests();
  assert.equal(harness.pendingRaf(), 1);
  harness.flushRaf();
  assert.equal(harness.weekly.textContent, "1h registradas");
});
