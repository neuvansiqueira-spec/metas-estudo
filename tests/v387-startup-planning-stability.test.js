const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const read = (path) => fs.readFileSync(path, "utf8");
const startup = read("startup-planning-stability-v387.js");
const docsStartup = read("docs/startup-planning-stability-v387.js");
const factory = read("factory-queue-integrity-v236.js");
const docsFactory = read("docs/factory-queue-integrity-v236.js");
const loader = read("planning-integrity-loader-v235.js");
const docsLoader = read("docs/planning-integrity-loader-v235.js");
const manual = read("manual-goal-additive-v379.js");
const docsManual = read("docs/manual-goal-additive-v379.js");
const observability = read("security-observability-v318.js");
const docsObservability = read("docs/security-observability-v318.js");

function loadStartupRuntime() {
  const calls = {
    alignment: 0,
    integratedPriority: 0,
    performanceRefresh: 0,
    inflationRepair: 0,
    reinforcementRepair: 0
  };
  const context = {
    console,
    Date,
    Object,
    String,
    Promise,
    queueMicrotask: (callback) => callback(),
    navigator: { userActivation: { isActive: false } },
    ensureDailyPlanAlignedWithPlanningV174() {
      calls.alignment += 1;
      return { changed: true };
    },
    applyIntegratedPlanningPrioritiesV155() {
      calls.integratedPriority += 1;
      return { ok: true, changed: true };
    },
    refreshPlanningPrioritiesForQuestionChangesV155() {
      calls.performanceRefresh += 1;
      return { ok: true, changed: true };
    },
    repairDailyPlanningInflationV108() {
      calls.inflationRepair += 1;
      return { changed: true, removed: [{ id: "automatic" }], reports: [] };
    },
    repairInvalidReinforcementGoalsV157() {
      calls.reinforcementRepair += 1;
      return { changed: true, corrected: [{ id: "automatic" }] };
    }
  };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(startup, context);
  return { context, calls };
}

test("V399 bloqueia alinhamento silencioso e só libera alteração explicitamente autorizada", () => {
  const { context, calls } = loadStartupRuntime();
  const automatic = context.ensureDailyPlanAlignedWithPlanningV174({}, "2026-08-26");
  assert.equal(automatic.changed, false);
  assert.equal(automatic.skipped, "20260826-planning-legacy-mutator-guard-v399");
  assert.equal(calls.alignment, 0);

  context.navigator.userActivation.isActive = true;
  const mereActivation = context.ensureDailyPlanAlignedWithPlanningV174({}, "2026-08-26");
  assert.equal(mereActivation.changed, false, "um clique genérico não autoriza reescrever metas");
  assert.equal(calls.alignment, 0);

  const explicitResult = context.ensureDailyPlanAlignedWithPlanningV174({}, "2026-08-26", { explicit: true });
  assert.equal(explicitResult.changed, true);
  assert.equal(calls.alignment, 1);
});

test("V399 neutraliza os mutadores legados automáticos que ainda existem no bundle", () => {
  const { context, calls } = loadStartupRuntime();

  assert.equal(context.applyIntegratedPlanningPrioritiesV155({}, { reason: "replace-state" }).changed, false);
  assert.equal(context.refreshPlanningPrioritiesForQuestionChangesV155({}).changed, false);
  assert.equal(context.repairDailyPlanningInflationV108({}, { source: "bootstrap-legacy" }).changed, false);
  assert.equal(context.repairInvalidReinforcementGoalsV157({}).changed, false);

  assert.deepEqual(calls, {
    alignment: 0,
    integratedPriority: 0,
    performanceRefresh: 0,
    inflationRepair: 0,
    reinforcementRepair: 0
  });
});

test("V399 mantém saída explícita para operações realmente autorizadas", () => {
  const { context, calls } = loadStartupRuntime();

  assert.equal(context.applyIntegratedPlanningPrioritiesV155({}, { explicit: true }).changed, true);
  assert.equal(context.refreshPlanningPrioritiesForQuestionChangesV155({}, { explicit: true }).changed, true);
  assert.equal(context.repairDailyPlanningInflationV108({}, { allowRebuild: true }).changed, true);
  assert.equal(context.repairInvalidReinforcementGoalsV157({}, { explicit: true }).changed, true);

  assert.equal(calls.integratedPriority, 1);
  assert.equal(calls.performanceRefresh, 1);
  assert.equal(calls.inflationRepair, 1);
  assert.equal(calls.reinforcementRepair, 1);
});

test("V399 não adiciona polling nem observação contínua", () => {
  assert.equal(startup.includes("setInterval("), false);
  assert.equal(startup.includes("MutationObserver"), false);
  assert.equal(startup.includes("requestAnimationFrame("), false);
  assert.equal(startup.includes("getComputedStyle("), false);
  assert.match(startup, /factory-queue-integrity-v236\.js/);
  assert.match(startup, /planning-integrity-loader-v235\.js/);
  assert.match(startup, /manual-goal-additive-v379\.js/);
  assert.match(startup, /factory-lc259-link-v398\.js/);
});

test("V236 elimina o polling de 100 ms e reduz normalizações repetidas", () => {
  assert.equal(factory.includes("setInterval("), false);
  assert.match(factory, /CANONICAL_CACHE_LIMIT = 512/);
  assert.match(factory, /canonicalCache/);
  assert.match(factory, /if \(!\/simulad\/i\.test\(rawText\)\) return/);
  assert.match(factory, /aldus:bootstrap-integrity-v258-ready/);
  assert.match(factory, /hashchange/);
});

test("V235 não realinha nem salva metas automaticamente ao carregar", () => {
  assert.equal(loader.includes("ensureDailyPlanAlignedWithPlanningV174"), false);
  assert.equal(loader.includes("setInterval("), false);
  assert.equal(loader.includes("saveData({ markLocalChange: true })"), false);
  assert.match(loader, /STARTUP_STABILITY_VERSION = "20260824-startup-planning-stability-v387"/);
  assert.match(loader, /aldus:bootstrap-integrity-v258-ready/);
  assert.match(loader, /aldus:post-bootstrap-maintenance-complete/);
});

test("V379 recompõe a cota apenas após ações explícitas", () => {
  assert.equal(manual.includes("nestedIdle"), false);
  assert.equal(manual.includes("afterBootstrap"), false);
  assert.match(manual, /manual-submit/);
  assert.match(manual, /GENERATION_IDS/);
  assert.match(manual, /reconcileSnapshot\(targetState, snapshot, `after-\$\{id\}`\)/);
  assert.doesNotMatch(manual, /reconcileSnapshot\(targetState, snapshot, "bootstrap-ready"\)/);
  assert.doesNotMatch(manual, /reconcileSnapshot\(targetState, snapshot, "planning-route-entered"\)/);
});

test("V399 amplia a política de consentimento para os reparadores legados restantes", () => {
  const stabilityIndex = observability.indexOf("installStartupPlanningStabilityV387();");
  const manualIndex = observability.indexOf("installManualGoalAdditiveV379();");
  assert.ok(stabilityIndex >= 0 && manualIndex > stabilityIndex);
  assert.match(startup, /20260826-planning-legacy-mutator-guard-v399/);
  assert.match(startup, /wrapQuestionPerformanceRefresh/);
  assert.match(startup, /wrapDailyInflationRepair/);
  assert.match(startup, /wrapIntegratedPlanningPriority/);
  assert.match(startup, /legacyAutomaticRepairsDisabledV399/);
});

test("V399 mantém paridade entre raiz e docs", () => {
  assert.equal(startup, docsStartup);
  assert.equal(factory, docsFactory);
  assert.equal(loader, docsLoader);
  assert.equal(manual, docsManual);
  assert.equal(observability, docsObservability);
});
