const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const originalBackupPath = path.resolve(root, "../sources/backup-metas-estudo-2026-07-25-22-44.json");
const originalPayload = JSON.parse(fs.readFileSync(originalBackupPath, "utf8"));
const clone = (value) => JSON.parse(JSON.stringify(value));
const hash = (value) => crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");

function migrationRuntime() {
  const context = { console };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(root, "pcpr-pcma-2026-catalog.js"), "utf8"), context);
  vm.runInContext(fs.readFileSync(path.join(root, "pcpr-pcma-2026-migration.js"), "utf8"), context);
  return context;
}

const protectedCollections = [
  "subjects", "studies", "dailyGoals", "questionLogs", "smartReviews", "simulados",
  "materials", "questionBank", "questionBankSessions", "questionErrorNotebook",
  "factoryItems", "factoryAgenda", "syncTombstones"
];

test("catálogo oficial tem cobertura integral sem UUID de mapeamento órfão", () => {
  const runtime = migrationRuntime();
  const catalog = runtime.PCPR_PCMA_2026_CATALOG;
  assert.equal(catalog.officialCounts.pcpr, 379);
  assert.equal(catalog.officialCounts.pcma, 561);
  assert.equal(catalog.officialCounts.totalMappings, 940);
  assert.equal(new Set(catalog.newItems.map((item) => item.id)).size, catalog.newItems.length);
  assert.equal(new Set(catalog.historicalItems.map((item) => item.id)).size, catalog.historicalItems.length);
  const available = new Set([
    ...originalPayload.data.syllabusItems.map((item) => item.id),
    ...catalog.newItems.map((item) => item.id),
    ...catalog.historicalItems.map((item) => item.id)
  ]);
  assert.equal(catalog.mappings.filter((mapping) => !available.has(mapping.syllabusItemId)).length, 0);
});

test("migração é aditiva, idempotente e preserva os 379 UUIDs originais", () => {
  const runtime = migrationRuntime();
  const state = clone(originalPayload.data);
  const originalIds = state.syllabusItems.map((item) => item.id);
  const protectedHashes = Object.fromEntries(protectedCollections.map((key) => [key, hash(state[key])]));
  const first = runtime.applyPcprPcma2026Migration(state);
  const once = JSON.stringify(state);
  const second = runtime.applyPcprPcma2026Migration(state);

  const ids = state.syllabusItems.map((item) => item.id);
  const idSet = new Set(ids);
  assert.equal(first.blocked, false);
  assert.equal(second.changed, false);
  assert.equal(JSON.stringify(state), once);
  assert.equal(ids.length, idSet.size);
  assert.equal(originalIds.every((id) => idSet.has(id)), true);
  assert.equal(new Set(originalIds).size, 379);
  assert.equal(state.syllabusItems.length, 841);
  assert.equal(first.createdUuids, 462);
  for (const key of protectedCollections) assert.equal(hash(state[key]), protectedHashes[key], key);
});

test("referências históricas órfãs passam a apontar para itens ocultos e não agendáveis", () => {
  const runtime = migrationRuntime();
  const state = clone(originalPayload.data);
  runtime.applyPcprPcma2026Migration(state);
  const ids = new Set(state.syllabusItems.map((item) => item.id));
  const referenced = [
    ...state.dailyGoals.map((item) => item.syllabusItemId),
    ...state.smartReviews.map((item) => item.syllabusItemId)
  ].filter(Boolean);
  assert.deepEqual(referenced.filter((id) => !ids.has(id)), []);
  const restored = state.syllabusItems.filter((item) => item.restoredFromHistoricalReference || item.importMeta?.legacyRestored);
  assert.equal(restored.length, 32);
  assert.equal(restored.every((item) => item.hiddenFromCatalog && item.schedulable === false && item.agendavel === false), true);
  assert.equal(restored.every((item) => state.schedulableSettings[item.id]?.availability === "Não agendável"), true);
});

test("perfis PCPR, PCMA e conjunto mantêm pesos separados e ativam a transição pós-PCPR", () => {
  const runtime = migrationRuntime();
  const state = clone(originalPayload.data);
  const historicalWeights = hash(state.disciplineWeights);
  runtime.applyPcprPcma2026Migration(state);
  assert.equal(hash(state.disciplineWeights), historicalWeights);
  assert.deepEqual([...state.contestProfiles.map((item) => item.id)].sort(), ["pcma-2026-delegado", "pcpr-2026-delegado"]);
  for (const mode of ["pcpr", "pcma", "joint"]) assert.ok(state.contestPlanningProfiles[mode]);
  state.planningMode = "joint";
  assert.equal(runtime.contestPlanningProfile(state, "2026-10-11").phase, "pre-pcpr");
  const post = runtime.contestPlanningProfile(state, "2026-10-12");
  assert.equal(post.phase, "post-pcpr");
  assert.equal(post.examDate, "2026-11-01");
  assert.equal(post.categories.B, 0);
  assert.equal(post.categories.D, 40);
});

test("backup migrado serializa e restaura sem perda ou duplicação", () => {
  const runtime = migrationRuntime();
  const payload = clone(originalPayload);
  runtime.applyPcprPcma2026Migration(payload.data);
  payload.version = 3;
  payload.migration = "pcpr-pcma-2026-v3";
  payload.localStorage ||= {};
  payload.localStorage.metasConcursoData = JSON.stringify(payload.data);
  const restored = JSON.parse(JSON.stringify(payload));
  assert.equal(hash(restored.data), hash(payload.data));
  assert.equal(hash(JSON.parse(restored.localStorage.metasConcursoData)), hash(payload.data));
  assert.equal(new Set(restored.data.syllabusItems.map((item) => item.id)).size, 841);
  assert.equal(restored.data.contestSyllabusMap.length, 940);
});
