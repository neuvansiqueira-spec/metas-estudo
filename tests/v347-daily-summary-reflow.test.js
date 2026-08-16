const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const ROOT_FILE = "daily-summary-time-format-v243.js";
const DOCS_FILE = `docs/${ROOT_FILE}`;

function fakeElement(kind = "generic") {
  return {
    nodeType: 1,
    kind,
    dataset: {},
    textContent: "",
    value: "",
    closest(selector) {
      if (kind === "planned" && selector.includes(".planned-today-stat")) return this;
      if (kind === "realized" && selector.includes(".realized-today-stat")) return this;
      if (kind === "weekly" && selector.includes("#weeklyGoalStatus")) return this;
      return null;
    }
  };
}

function loadModule() {
  const source = fs.readFileSync(ROOT_FILE, "utf8");
  const planned = fakeElement("planned");
  const realized = fakeElement("realized");
  const weekly = fakeElement("weekly");
  const screenStage = fakeElement("stage");
  const unrelated = fakeElement("unrelated");
  const goalDate = fakeElement("goalDate");
  goalDate.value = "2026-08-16";

  const documentListeners = new Map();
  const windowListeners = new Map();
  const rafQueue = [];
  let observerCallback = null;
  let observedTarget = null;
  let observedOptions = null;
  let centralCalls = 0;

  const document = {
    readyState: "complete",
    head: { appendChild() {} },
    getElementById(id) {
      if (id === "goalDate") return goalDate;
      return null;
    },
    createElement() {
      return { dataset: {}, textContent: "", id: "" };
    },
    querySelector(selector) {
      if (selector === ".planned-today-stat > strong") return planned;
      if (selector === ".realized-today-stat > strong") return realized;
      if (selector === "#weeklyGoalStatus") return weekly;
      if (selector === ".screen-stage") return screenStage;
      return null;
    },
    addEventListener(type, listener) {
      documentListeners.set(type, listener);
    }
  };

  class FakeMutationObserver {
    constructor(callback) {
      observerCallback = callback;
    }
    observe(target, options) {
      observedTarget = target;
      observedOptions = options;
    }
  }

  const context = {
    console,
    document,
    MutationObserver: FakeMutationObserver,
    requestAnimationFrame(callback) {
      rafQueue.push(callback);
      return rafQueue.length;
    },
    window: {
      setTimeout() { return 0; },
      addEventListener(type, listener) {
        windowListeners.set(type, listener);
      }
    },
    state: {
      dailyGoals: [
        { id: "g1", date: "2026-08-16", minutes: 60, studyActualMinutes: 30 }
      ]
    },
    elements: { goalDate },
    bootstrapStateReady: true,
    todayISO: () => "2026-08-16",
    weekStart: () => "2026-08-10",
    addDays: () => "2026-08-16",
    availabilityForDate: () => ({ hours: 0 }),
    goalDateValue: (goal) => goal.date,
    goalTotalActualMinutes: (goal) => goal.studyActualMinutes,
    centralTimeChartLogs() {
      centralCalls += 1;
      return [{ id: "s1", date: "2026-08-16", minutes: 45 }];
    }
  };
  context.globalThis = context;

  vm.createContext(context);
  vm.runInContext(source, context);

  function flushRaf() {
    while (rafQueue.length) rafQueue.shift()();
  }

  return {
    api: context.__ALDUS_DAILY_SUMMARY_TIME_FORMAT_V243__,
    planned,
    realized,
    weekly,
    screenStage,
    unrelated,
    documentListeners,
    windowListeners,
    observerCallback: () => observerCallback,
    observedTarget: () => observedTarget,
    observedOptions: () => observedOptions,
    centralCalls: () => centralCalls,
    resetCentralCalls: () => { centralCalls = 0; },
    pendingRaf: () => rafQueue.length,
    flushRaf
  };
}

test("V347 mantém paridade raiz/docs e restringe o observer à screen-stage", () => {
  const root = fs.readFileSync(ROOT_FILE, "utf8");
  const docs = fs.readFileSync(DOCS_FILE, "utf8");
  assert.equal(root, docs);
  assert.match(root, /document\.querySelector\("\.screen-stage"\)/);
  assert.doesNotMatch(root, /observer\.observe\(document\.documentElement/);
  assert.match(root, /window\.addEventListener\("aldus:view-active", scheduleApply\)/);
  assert.match(root, /document\.addEventListener\("aldus:daily-summary-refresh", scheduleApply\)/);
  const build = fs.readFileSync("build-bundles.mjs", "utf8");
  assert.match(build, /"daily-summary-time-format-v243\.js"/);
});

test("V347 chama centralTimeChartLogs no máximo uma vez por apply e ignora a própria escrita", () => {
  const harness = loadModule();
  assert.equal(harness.observedTarget(), harness.screenStage);
  const options = harness.observedOptions();
  assert.equal(options?.childList, true);
  assert.equal(options?.subtree, true);
  assert.equal(options?.characterData, true);
  assert.ok(harness.documentListeners.has("change"));
  assert.ok(harness.windowListeners.has("aldus:view-active"));
  assert.ok(harness.documentListeners.has("aldus:daily-summary-refresh"));
  assert.ok(harness.windowListeners.has("hashchange"));

  harness.flushRaf();
  assert.equal(harness.centralCalls(), 1, "a aplicação inicial deve varrer os logs uma única vez");

  harness.resetCentralCalls();
  const result = harness.api.apply();
  assert.equal(harness.centralCalls(), 1, "cada apply deve chamar centralTimeChartLogs no máximo uma vez");
  assert.equal(result.weeklyMinutes, 45);

  harness.observerCallback()([{ type: "childList", target: harness.planned }]);
  assert.equal(harness.pendingRaf(), 0, "a escrita nos próprios campos não deve agendar novo apply");
  harness.flushRaf();
  assert.equal(harness.centralCalls(), 1, "a própria escrita não deve provocar nova varredura");

  harness.observerCallback()([{ type: "childList", target: harness.unrelated }]);
  assert.equal(harness.pendingRaf(), 1, "mutação legítima da screen-stage deve agendar atualização");
  harness.flushRaf();
  assert.equal(harness.centralCalls(), 2, "mutação externa legítima deve atualizar os indicadores");
});
