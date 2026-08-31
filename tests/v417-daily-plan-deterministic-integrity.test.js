const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const source = fs.readFileSync("script.js", "utf8");
const renderStart = source.indexOf("function renderDailyGoals()");
const renderEnd = source.indexOf("function renderNextDailyGoal", renderStart);
const renderSource = source.slice(renderStart, renderEnd);

function goal(id) {
  return { id, date: "2026-08-31", data: "2026-08-31", discipline: `Disciplina ${id}`, subject: `Assunto ${id}`, type: "Meta", origin: "planejamento", status: "Pendente", minutes: 60 };
}

function renderRuntime(count, suppliedGoals = null) {
  const dailyGoals = suppliedGoals || Array.from({ length: count }, (_, index) => goal(index + 1));
  const dailyGoalsList = { innerHTML: "", querySelectorAll: () => [] };
  const context = {
    state: { dailyGoals, smartReviews: [], studies: [] },
    elements: { dailyGoalsList, goalDate: { value: "2026-08-31" }, dailyGoalsSummary: { innerHTML: "" }, selectedGoalDateLabel: { textContent: "" } },
    window: {},
    document: { getElementById: () => ({ removeAttribute() {} }) },
    todayISO: () => "2026-08-31",
    dailyPlanAlignmentStatusV174: () => ({ aligned: false, skipped: "explicit-authorization-required" }),
    renderSmartReviewBlock() {}, renderChooseSubjectForDayV158() {},
    availabilityForDate: () => ({ type: "normal", hours: 5 }),
    actionableDailyPlanGoalsForDate: (targetState, date) => targetState.dailyGoals.filter((item) => item.date === date),
    cloneData: (value) => JSON.parse(JSON.stringify(value)),
    buildDailyPlanProjection: () => dailyGoals.map((item) => ({ goal: item, factoryItems: [], materialGroups: [], warnings: [] })),
    goalProgressStats: (goals) => ({ completed: 0, pending: goals.length, target: 300, done: 0, goalsPct: 0 }),
    getDayContentConfig: () => ({ mode: "goals_only" }), questionGoalProgress: () => ({ done: 0, target: 0 }),
    formatDateBR: (value) => value, dailyPlanSectionAttrs: () => "", dailyPlanSummaryHTML: () => "",
    formatHours: String, formatExportDuration: String, totalRecordedStudyMinutes: () => 0,
    renderNextDailyGoal() {}, dailyPlanQuestionsSection: () => "", rememberedDailyPlanSection: () => "",
    dailyGoalDetailsCard: () => "", goalDateValue: (item) => item.date, ensureDailyGoalEditAction() {}, Map
  };
  vm.createContext(context);
  vm.runInContext(`${renderSource}; result = renderDailyGoals;`, context);
  return { context, render: context.result };
}

function maintenanceRuntime(dailyGoals) {
  const start = source.indexOf("async function runPostInteractiveBootstrapMaintenanceV169");
  const end = source.indexOf("async function bootstrapApplication", start);
  const maintenanceSource = source.slice(start, end);
  let now = 0;
  let saves = 0;
  const context = {
    state: { dailyGoals },
    startupMetricsV169: {},
    performance: { now: () => ++now },
    runSecondaryStepV169: (_name, callback) => callback(),
    window: { dispatchEvent() {} },
    document: { documentElement: { setAttribute() {} } },
    CustomEvent: class CustomEvent { constructor(type, init) { this.type = type; this.detail = init?.detail; } },
    todayISO: () => "2026-08-31",
    dailyPlanAlignmentStatusV174: () => ({ aligned: false }),
    syncAllFactoryMaterials() {},
    migrateFactoryMaterialsPlanningV80: () => ({ skipped: true }),
    repairExistingFactoryMaterialLinksV85: () => ({ skipped: true }),
    primeFactoryPlanningSyncFingerprintV170() {},
    indexedDBStatus: {},
    estimateSerializedStateSize: () => 0,
    updateStorageDiagnostics() {},
    saveData: () => { saves += 1; },
    console
  };
  vm.createContext(context);
  vm.runInContext(`${maintenanceSource}; result = runPostInteractiveBootstrapMaintenanceV169;`, context);
  return { run: context.result, context, saves: () => saves };
}

for (const count of [5, 6]) {
  test(`renderizar 100 vezes preserva byte a byte um estado com ${count} metas`, () => {
    const runtime = renderRuntime(count);
    const before = JSON.stringify(runtime.context.state.dailyGoals);
    for (let index = 0; index < 100; index += 1) runtime.render();
    assert.equal(JSON.stringify(runtime.context.state.dailyGoals), before);
  });

  test(`sequência completa de abertura preserva identidade e conteúdo das ${count} metas`, async () => {
    const dailyGoals = Array.from({ length: count }, (_, index) => ({
      ...goal(index + 1),
      status: index === 0 ? "Em andamento" : "Pendente",
      minutes: 45 + index,
      actualMinutes: index === 0 ? 12 : 0
    }));
    const render = renderRuntime(count, dailyGoals);
    const maintenance = maintenanceRuntime(dailyGoals);
    const snapshot = JSON.parse(JSON.stringify(dailyGoals));

    // bootstrap -> Dashboard -> Plano do Dia -> novo render -> load -> manutenção pós-bootstrap
    render.context.dailyPlanAlignmentStatusV174(render.context.state, "2026-08-31");
    render.render();
    render.render();
    await maintenance.run("");

    assert.equal(dailyGoals.length, count);
    assert.deepEqual(JSON.parse(JSON.stringify(dailyGoals)), snapshot);
    assert.deepEqual(dailyGoals.map(({ id, discipline, subject, status, minutes, actualMinutes }) => ({ id, discipline, subject, status, minutes, actualMinutes })), snapshot.map(({ id, discipline, subject, status, minutes, actualMinutes }) => ({ id, discipline, subject, status, minutes, actualMinutes })));
    assert.equal(maintenance.saves(), 0);
  });
}

test("sequência bootstrap, Dashboard, Plano do Dia, load e manutenção não contém caminho automático de reconstrução", () => {
  const bootstrapStart = source.indexOf("async function bootstrapApplication");
  const bootstrap = source.slice(bootstrapStart);
  const maintenanceStart = source.indexOf("async function runPostInteractiveBootstrapMaintenanceV169");
  const maintenance = source.slice(maintenanceStart, source.indexOf("async function bootstrapApplication", maintenanceStart));

  assert.match(bootstrap, /dailyPlanAlignmentStatusV174\(state, todayISO\(\)\)/);
  assert.doesNotMatch(bootstrap, /replenishMissingDailyPlanningGoalsV116\(state, todayISO\(\)\)/);
  assert.doesNotMatch(renderSource, /saveData|reconcileDailyGoalsWithPlanning|ensureDailyPlanAlignedWithPlanningV174/);
  assert.doesNotMatch(maintenance, /repairAutomaticGoalDuplicatesV75\(state\)|repairCompletedPlanningGoalsV76\(state\)|rebalanceFuturePlanningGoalsV77\(state\)|rebalanceCurrentWeekV78\(state\)|rebalanceCurrentMonthV79\(state\)/);
});

test("todas as reconstruções automáticas declaradas exigem contexto explícito", () => {
  const calls = [...source.matchAll(/reconcile(?:DailyGoalsWithPlanning|PlanningDates)\([^;\n]*rebuildAutomatic: true[^;\n]*\)/g)].map((match) => match[0]);
  assert.ok(calls.length >= 3);
  for (const call of calls) assert.match(call, /explicit: true|allowRebuild: true/);

  const refreshStart = source.indexOf("function refreshDailyGoalsFromPlanning()");
  const refresh = source.slice(refreshStart, source.indexOf("function appendGoalHistory", refreshStart));
  assert.match(refresh, /explicit: true/);
  assert.match(refresh, /allowRebuild: true/);
  assert.equal((refresh.match(/saveData\(/g) || []).length, 1);
  assert.equal((refresh.match(/autoSyncAfterSave\(/g) || []).length, 1);
});

test("atualização explícita usa uma transação e não persiste quando o resultado é idêntico", () => {
  const refreshStart = source.indexOf("function refreshDailyGoalsFromPlanning()");
  const refreshSource = source.slice(refreshStart, source.indexOf("function appendGoalHistory", refreshStart));
  const execute = (changed) => {
    const counters = { save: 0, render: 0, sync: 0 };
    const context = {
      state: { syllabusItems: [{}], dailyGoals: [goal(1)] },
      elements: { goalDate: { value: "2026-08-31" } },
      todayISO: () => "2026-08-31",
      ensureDailyPlanAlignedWithPlanningV174(targetState, _date, options) {
        assert.equal(options.explicit, true);
        assert.equal(options.allowRebuild, true);
        if (changed) targetState.dailyGoals.push(goal(2));
        return { report: { added: changed ? ["2"] : [], removed: [], preserved: [], warnings: [], found: changed ? 2 : 1, foundTopics: changed ? 2 : 1, expected: 2, expectedTopics: 2 } };
      },
      saveData: () => { counters.save += 1; },
      render: () => { counters.render += 1; },
      autoSyncAfterSave: () => { counters.sync += 1; },
      showDailyGoalMessage() {}, showView() {}, renderFactory() {},
      factoryCurrentFilter: "todos", formatDateBR: String, console, JSON
    };
    vm.createContext(context);
    vm.runInContext(`${refreshSource}; refreshDailyGoalsFromPlanning();`, context);
    return counters;
  };

  assert.deepEqual(execute(true), { save: 1, render: 1, sync: 1 });
  assert.deepEqual(execute(false), { save: 0, render: 0, sync: 0 });
});

test("reposição aditiva nunca substitui nem elimina dailyGoals existentes", () => {
  const start = source.indexOf("function replenishMissingDailyPlanningGoalsV116");
  const block = source.slice(start, source.indexOf("function reconcileDailyGoalsWithPlanning", start));
  assert.match(block, /targetState\.dailyGoals\.push\(goal\)/);
  assert.doesNotMatch(block, /targetState\.dailyGoals\s*=|dailyGoals\.splice\(|dailyGoals\.pop\(|dailyGoals\.shift\(/);
});

test("metas manuais, executadas, concluídas, reagendadas, editadas e com histórico são protegidas", () => {
  const manualStart = source.indexOf("function isManualDailyGoal");
  const protectedEnd = source.indexOf("function isAutomaticIntactDailyGoal", manualStart);
  const protectedSource = source.slice(manualStart, protectedEnd);
  const context = {
    canonical: (value) => String(value || "").toLowerCase(),
    isGoalDone: (item) => item.status === "Concluída",
    isGoalInProgress: (item) => item.status === "Em andamento" || Number(item.actualMinutes) > 0,
    goalTotalActualMinutes: (item) => Number(item.actualMinutes) || 0
  };
  vm.createContext(context);
  vm.runInContext(`${protectedSource}; result = isProtectedDailyGoal;`, context);
  const protectedGoal = context.result;
  for (const item of [
    { origin: "manual", status: "Pendente" },
    { origin: "planejamento", status: "Concluída" },
    { origin: "planejamento", status: "Em andamento" },
    { origin: "planejamento", status: "Reagendada" },
    { origin: "planejamento", status: "Pendente", actualMinutes: 10 },
    { origin: "planejamento", status: "Pendente", userEdited: true },
    { origin: "planejamento", status: "Pendente", history: [{ at: "agora" }] }
  ]) assert.equal(protectedGoal(item), true);
});

test("V417 publica somente um núcleo e mantém raiz e docs sincronizados", () => {
  const index = fs.readFileSync("index.html", "utf8");
  const docsIndex = fs.readFileSync("docs/index.html", "utf8");
  const bridge = fs.readFileSync("service-worker-v402.js", "utf8");
  assert.equal(index, docsIndex);
  assert.match(index, /app-v417\.js\?v=20260831-daily-plan-deterministic-integrity-v417/);
  assert.equal((index.match(/app-v417\.js\?v=/g) || []).length, 1);
  assert.doesNotMatch(index, /app-v413\.js\?v=/);
  assert.match(bridge, /DAILY_PLAN_DETERMINISTIC_CACHE_VERSION_V417/);
  assert.doesNotMatch(bridge, /setTimeout|setInterval|MutationObserver|requestAnimationFrame|requestIdleCallback/);
});
