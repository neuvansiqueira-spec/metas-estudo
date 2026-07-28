const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const script = fs.readFileSync("script.js", "utf8");

function sourceBetween(start, end) {
  const from = script.indexOf(start);
  const to = script.indexOf(end, from + start.length);
  assert.notEqual(from, -1, `Marcador inicial ausente: ${start}`);
  assert.notEqual(to, -1, `Marcador final ausente: ${end}`);
  return script.slice(from, to);
}

test("troca de tela libera a navegação antes da renderização pesada", () => {
  const showView = sourceBetween(
    "function showView(viewId = hashToView(), options = {})",
    'document.addEventListener("click"'
  );
  const scheduler = sourceBetween(
    "function scheduleViewRenderAfterPaintV170(target)",
    "function showView"
  );

  assert.match(showView, /scheduleViewRenderAfterPaintV170\(target\)/);
  assert.ok(
    showView.indexOf('"aldus:view-active"') <
      showView.indexOf("scheduleViewRenderAfterPaintV170(target)")
  );
  assert.match(showView, /options\.immediateRender/);
  assert.match(scheduler, /requestAnimationFrame\(\(\) => setTimeout\(run, 0\)\)/);
  assert.match(scheduler, /token !== pendingViewRenderTokenV170/);
  assert.match(scheduler, /dataset\.activeView !== target/);
});

test("bootstrap continua renderizando os dados antes de declarar o núcleo pronto", () => {
  const bootstrap = sourceBetween(
    "async function bootstrapApplication()",
    "function handleBootstrapFailure"
  );
  assert.match(
    bootstrap,
    /showView\(hashToView\(\), \{ skipScroll: true, keepMenuOpen: true, immediateRender: true \}\)/
  );
  assert.ok(
    bootstrap.indexOf("immediateRender: true") <
      bootstrap.indexOf('markStartupMilestoneV169("dataRenderedMs")')
  );
});

test("salvamento mede o custo e evita sincronização global repetida da Fábrica", () => {
  const saveData = sourceBetween(
    "function saveData(options = {})",
    "async function initializeIndexedDBBackup"
  );
  assert.match(saveData, /__aldusSavePerformanceV170/);
  assert.match(saveData, /factoryPlanningSkipped/);
  assert.match(saveData, /persistStateSafely\(options\)/);

  const factorySync = sourceBetween(
    "const FACTORY_MATERIALS_WORKFLOW_MIGRATION_V80",
    "function migrateFactoryMaterialsPlanningV80"
  );
  assert.match(factorySync, /factoryPlanningSyncFingerprintV170/);
  assert.match(factorySync, /factoryPlanningSyncFingerprintCacheV170 === fingerprintBefore/);
  assert.match(factorySync, /skipped: true/);
  assert.doesNotMatch(
    factorySync,
    /localStorage\.clear|deleteDatabase|clearProjectLocalStorage|tombstone.*delete/i
  );
});

test("fingerprint preserva a sincronização quando muda e pula somente repetição idêntica", () => {
  const factoryItem = {
    id: "factory-1",
    disciplina: "Direito Penal",
    tema: "Teoria do Crime",
    syllabusItemIds: ["s-1"],
    editalActive: true
  };
  const goal = {
    id: "goal-1",
    syllabusItemId: "s-1",
    discipline: "Direito Penal",
    subject: "Teoria do Crime",
    date: "2026-07-28",
    status: "Pendente"
  };
  const material = {
    id: "material-1",
    syllabusItemId: "s-1",
    syllabusItemIds: ["s-1"],
    discipline: "Direito Penal",
    subject: "Teoria do Crime",
    available: true
  };
  const state = {
    factoryAgenda: [factoryItem],
    factoryItems: [factoryItem],
    materials: [material],
    dailyGoals: [goal],
    syllabusItems: [{ id: "s-1", discipline: "Direito Penal", subject: "Teoria do Crime" }],
    migrations: {},
    contestSyllabusMap: []
  };
  let fullSyncExecutions = 0;
  const context = {
    state,
    syncFactoryWithActiveEdital: () => {
      fullSyncExecutions += 1;
      return { changed: false };
    },
    ensureFactoryAgenda: () => state.factoryAgenda,
    syncAllFactoryMaterials: () => {},
    isPlanningStudyGoal: () => true,
    factorySyllabusItemIds: (item) => item.syllabusItemIds || [],
    dailyPlanRecordsShareSubject: (left, right) =>
      left.disciplina === right.discipline && left.tema === right.subject,
    isGoalDone: (item) => item.status === "Concluída",
    goalDateValue: (item) => item.date,
    todayISO: () => "2026-07-28",
    canonical: (value) => String(value || "").toLowerCase(),
    dailyPlanSubjectsCompatible: (left, right) =>
      String(left).toLowerCase() === String(right).toLowerCase(),
    materialMatchesAssociation: (item, request) =>
      item.syllabusItemIds.includes(request.syllabusItemId),
    materialAvailable: (item) => item.available !== false,
    normalizeFactoryItem: (item) => ({ ...item })
  };
  vm.createContext(context);
  vm.runInContext(
    sourceBetween(
      "const FACTORY_MATERIALS_WORKFLOW_MIGRATION_V80",
      "function migrateFactoryMaterialsPlanningV80"
    ),
    context
  );

  const first = context.syncFactoryMaterialsPlanningV80(state);
  const second = context.syncFactoryMaterialsPlanningV80(state);
  goal.status = "Concluída";
  const third = context.syncFactoryMaterialsPlanningV80(state);

  assert.equal(first.skipped, false);
  assert.equal(second.skipped, true);
  assert.equal(third.skipped, false);
  assert.equal(fullSyncExecutions, 2);
});

test("sincronização com Drive consolida salvamentos próximos sem atrasar o clique", () => {
  const autoSync = sourceBetween(
    'function autoSyncAfterSave(reason = "alteração")',
    "function isQuotaExceededError"
  );
  assert.match(autoSync, /clearTimeout\(autoSyncTimer\)/);
  assert.match(autoSync, /autoSyncTimer = setTimeout/);
  assert.match(autoSync, /AUTO_SYNC_DEBOUNCE_MS/);
  assert.match(autoSync, /requestIdleCallback\(run, \{ timeout: 2000 \}\)/);
  assert.doesNotMatch(autoSync, /return runAutoSyncAfterSave/);
});
