const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "..", "save-performance-v186.js"), "utf8");

function makeContext() {
  let idleCallback = null;
  const saveCalls = [];
  const counters = { priorities: 0, reinforcement: 0, factory: 0, render: 0, sync: 0 };
  let tick = 0;
  const context = {
    console,
    Date,
    Object,
    String,
    Number,
    Array,
    Boolean,
    Set,
    state: { primaryRecords: [] },
    document: { hidden: false },
    performance: { now: () => ++tick },
    saveData(options = {}) {
      saveCalls.push({ ...options });
      context.state.primaryRecords.push(saveCalls.length);
      context.__aldusSavePerformanceV170 = { persistenceMs: 2 };
      return true;
    },
    refreshPlanningPrioritiesForQuestionChangesV155() { counters.priorities += 1; },
    repairInvalidReinforcementGoalsV157() { counters.reinforcement += 1; return { repaired: true }; },
    syncFactoryMaterialsPlanningV80() { counters.factory += 1; },
    render() { counters.render += 1; },
    autoSyncAfterSave() { counters.sync += 1; },
    requestIdleCallback(callback) { idleCallback = callback; return 1; },
    cancelIdleCallback() { idleCallback = null; },
    setTimeout,
    clearTimeout
  };
  context.window = context;
  context.globalThis = context;
  context.flushIdle = () => { const callback = idleCallback; idleCallback = null; callback?.(); };
  context.getSaveCalls = () => saveCalls;
  context.getCounters = () => ({ ...counters });
  vm.createContext(context);
  vm.runInContext(source, context, { filename: "save-performance-v186.js" });
  return context;
}

test("salva os dados principais imediatamente e adia os cálculos derivados", () => {
  const context = makeContext();
  context.saveData({ markLocalChange: true });

  assert.equal(context.getSaveCalls().length, 1);
  assert.equal(context.getSaveCalls()[0].markLocalChange, true);
  assert.equal(context.getSaveCalls()[0].skipDerivedRefresh, true);
  assert.deepEqual(context.getCounters(), { priorities: 0, reinforcement: 0, factory: 0, render: 0, sync: 0 });
  assert.deepEqual(context.state.primaryRecords, [1]);

  context.flushIdle();
  assert.equal(context.getSaveCalls().length, 2);
  assert.equal(context.getSaveCalls()[1].skipDerivedRefresh, true);
  assert.deepEqual(context.getCounters(), { priorities: 1, reinforcement: 1, factory: 1, render: 1, sync: 1 });
});

test("agrupa várias gravações rápidas em uma atualização derivada", () => {
  const context = makeContext();
  context.saveData();
  context.saveData();
  context.saveData();

  assert.equal(context.getSaveCalls().length, 3);
  context.flushIdle();
  assert.equal(context.getSaveCalls().length, 4);
  assert.deepEqual(context.getCounters(), { priorities: 1, reinforcement: 1, factory: 1, render: 1, sync: 1 });
});

test("mantém a opção de atualização derivada imediata para fluxos críticos", () => {
  const context = makeContext();
  context.saveData({ forceDerivedRefresh: true });
  assert.equal(context.getSaveCalls().length, 1);
  assert.equal(context.getSaveCalls()[0].forceDerivedRefresh, true);
  assert.equal(context.getSaveCalls()[0].skipDerivedRefresh, undefined);
});
