const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const coreSource = fs.readFileSync("bootstrap-integrity-loader-v258-core.js", "utf8");
const guardSource = fs.readFileSync("catastrophic-state-guard-v275.js", "utf8");
const bootstrap = require("../bootstrap-integrity-loader-v258-core.js");

test("V342 evita clonar o estado inteiro apenas para avaliar um candidato", () => {
  const state = {
    subjects: [{ id: "s1" }],
    studies: [{ id: "st1", updatedAt: "2026-08-15T20:00:00.000Z" }],
    syllabusItems: [], dailyGoals: [], questionLogs: [], materials: [], questionBank: [],
    questionBankSessions: [], questionErrorNotebook: [], simulados: [], smartReviews: [],
    factoryAgenda: [], factoryItems: []
  };
  const candidate = bootstrap.makeCandidate("test", state);
  assert.strictEqual(candidate.state, state);
  assert.equal(candidate.counts.studies, 1);
  assert.match(candidate.checksum, /^fnv1a-json-v2-/);
});

test("V342 usa apenas chaves do banco de snapshots no núcleo normal", () => {
  const start = coreSource.indexOf("async function saveSafetySnapshot");
  const end = coreSource.indexOf("function localCandidateEntries", start);
  const flow = coreSource.slice(start, end);
  assert.ok(start >= 0 && end > start);
  assert.match(flow, /getAllKeys\(database, SAFETY_STORE\)/);
  assert.doesNotMatch(flow, /getAllRecords\(database, SAFETY_STORE\)/);
  assert.match(flow, /knownChecksum \|\| checksumState\(state\)/);
});

test("V342 cria caminho rápido na proteção catastrófica quando a contagem anterior continua íntegra", () => {
  const start = guardSource.indexOf("async function reconcilePrebootstrap");
  const end = guardSource.indexOf("function destructiveWriteAllowed", start);
  const flow = guardSource.slice(start, end);
  assert.ok(start >= 0 && end > start);
  assert.match(flow, /previousStatus\?\.ready === true/);
  assert.match(flow, /catastrophicRegressionFromCounts\(mainState, previousStatus\.counts\)/);
  assert.match(flow, /action: "preserved-fast"/);
  assert.ok(flow.indexOf("preserved-fast") < flow.indexOf("readSafetyCandidates"));
});

test("V342 não carrega snapshots completos só para detectar duplicidade durante gravações", () => {
  const start = guardSource.indexOf("async function saveSafetySnapshot");
  const end = guardSource.indexOf("async function readSafetyCandidates", start);
  const flow = guardSource.slice(start, end);
  assert.match(flow, /getAllKeys\(database, SAFETY_STORE\)/);
  assert.doesNotMatch(flow, /getAllRecords\(database, SAFETY_STORE\)/);
  assert.match(flow, /knownChecksum \|\| checksumState\(state\)/);
});

test("V342 mantém somente snapshot anterior à gravação e o estado atual no IndexedDB", () => {
  const start = guardSource.indexOf("async function persistSerialized");
  const end = guardSource.indexOf("function schedulePersist", start);
  const flow = guardSource.slice(start, end);
  assert.match(flow, /"antes-da-gravacao"/);
  assert.doesNotMatch(flow, /"apos-gravacao-validada"/);
  assert.match(flow, /writeMainState\(data, reason\)/);
});
