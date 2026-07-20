const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const script = read("script.js");

function sourceBetween(start, end) {
  const from = script.indexOf(start);
  const to = script.indexOf(end, from + start.length);
  assert.notEqual(from, -1, `Marcador inicial ausente: ${start}`);
  assert.notEqual(to, -1, `Marcador final ausente: ${end}`);
  return script.slice(from, to);
}

test("Fábrica, metas e materiais recebem vínculos explícitos do mesmo assunto", () => {
  const factoryItem = { id: "factory-1", disciplina: "Direito Penal", tema: "Teoria do Crime", syllabusItemIds: ["s-1"], editalActive: true, prioridade: "Média" };
  const goal = { id: "goal-1", syllabusItemId: "s-1", discipline: "Direito Penal", subject: "Teoria do Crime", date: "2026-07-21", status: "Pendente" };
  const material = { id: "material-1", syllabusItemId: "s-1", syllabusItemIds: ["s-1"], discipline: "Direito Penal", subject: "Teoria do Crime", available: true };
  const state = { factoryAgenda: [factoryItem], factoryItems: [factoryItem], materials: [material], dailyGoals: [goal], syllabusItems: [{ id: "s-1", discipline: "Direito Penal", subject: "Teoria do Crime" }], migrations: {} };
  const context = {
    state,
    syncFactoryWithActiveEdital: () => ({ changed: false, subjects: 1 }),
    ensureFactoryAgenda: () => state.factoryAgenda,
    syncAllFactoryMaterials: () => {},
    isPlanningStudyGoal: () => true,
    factorySyllabusItemIds: (item) => item.syllabusItemIds || [],
    dailyPlanRecordsShareSubject: (left, right) => left.disciplina === right.discipline && left.tema === right.subject,
    isGoalDone: (item) => item.status === "Concluída",
    goalDateValue: (item) => item.date,
    todayISO: () => "2026-07-20",
    canonical: (value) => String(value || "").toLowerCase(),
    dailyPlanSubjectsCompatible: (left, right) => String(left).toLowerCase() === String(right).toLowerCase(),
    materialMatchesAssociation: (item, request) => item.syllabusItemIds.includes(request.syllabusItemId),
    materialAvailable: (item) => item.available !== false,
    normalizeFactoryItem: (item) => ({ ...item }),
  };
  vm.createContext(context);
  vm.runInContext(sourceBetween("const FACTORY_MATERIALS_WORKFLOW_MIGRATION_V80", "function migrateFactoryMaterialsPlanningV80"), context);
  const report = context.syncFactoryMaterialsPlanningV80(state);
  assert.equal(report.changed, true);
  assert.equal(factoryItem.goalId, "goal-1");
  assert.equal(factoryItem.dataPlanejada, "2026-07-21");
  assert.equal(factoryItem.planningStatus, "Planejado");
  assert.equal(goal.factoryItemId, "factory-1");
  assert.deepEqual([...goal.materialIds], ["material-1"]);
  assert.equal(goal.hasMaterial, true);
  assert.deepEqual([...material.planningGoalIds], ["goal-1"]);
});

test("sincronização passa a fazer parte de todo salvamento e da primeira abertura", () => {
  assert.match(sourceBetween("function saveData", "async function initializeIndexedDBBackup"), /syncFactoryMaterialsPlanningV80\(state\)/);
  assert.match(script, /migrateFactoryMaterialsPlanningV80\(state\)/);
  assert.match(script, /factoryMaterialsPlanningV80/);
});

test("Fábrica mostra data e estado do planejamento sem confundir produção com estudo", () => {
  const highlight = sourceBetween("function factoryThemeHighlightHTML", "function renderFactory");
  assert.match(highlight, /Planejamento integrado/);
  assert.match(highlight, /planningStatus/);
  assert.match(script, /subjects: agenda\.filter\(\(item\) => item\.editalActive !== false\)\.length/);
  assert.match(script, /status = factoryOverallStatus/);
});

test("V83 mantém cache, versão anterior e arquivos publicados em paridade", () => {
  const version = "20260720-logos-link-inicio-v94";
  assert.equal(JSON.parse(read("package.json")).version, version);
  assert.match(read("index.html"), new RegExp(version));
  assert.match(read("service-worker.js"), new RegExp(`CURRENT_VERSION = "${version}"`));
  assert.match(read("service-worker.js"), /"20260720-calendario-mensal-v79"/);
  for (const file of ["script.js", "index.html", "service-worker.js", "header-brand-fix.js", "sync-integral-time-protection.js"]) {
    assert.equal(read(file), read(path.join("docs", file)), file);
  }
});
