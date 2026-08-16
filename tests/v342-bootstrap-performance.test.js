const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const source = fs.readFileSync("bootstrap-integrity-loader-v258-core.js", "utf8");
const bootstrap = require("../bootstrap-integrity-loader-v258-core.js");

test("V342 evita clonar o estado inteiro apenas para avaliar um candidato", () => {
  const state = {
    subjects: [{ id: "s1" }],
    studies: [{ id: "st1", updatedAt: "2026-08-15T20:00:00.000Z" }],
    syllabusItems: [],
    dailyGoals: [],
    questionLogs: [],
    materials: [],
    questionBank: [],
    questionBankSessions: [],
    questionErrorNotebook: [],
    simulados: [],
    smartReviews: [],
    factoryAgenda: [],
    factoryItems: []
  };
  const candidate = bootstrap.makeCandidate("test", state);
  assert.strictEqual(candidate.state, state);
  assert.equal(candidate.counts.studies, 1);
  assert.match(candidate.checksum, /^fnv1a-json-v2-/);
});

test("V342 usa apenas chaves do banco de snapshots para detectar cópia já existente", () => {
  const start = source.indexOf("async function saveSafetySnapshot");
  const end = source.indexOf("function localCandidateEntries", start);
  const flow = source.slice(start, end);
  assert.ok(start >= 0 && end > start);
  assert.match(flow, /getAllKeys\(database, SAFETY_STORE\)/);
  assert.doesNotMatch(flow, /getAllRecords\(database, SAFETY_STORE\)/);
});

test("V342 reaproveita checksum conhecido nos snapshots e evita reserialização redundante", () => {
  const start = source.indexOf("async function saveSafetySnapshot");
  const end = source.indexOf("function localCandidateEntries", start);
  const flow = source.slice(start, end);
  assert.match(flow, /knownChecksum/);
  assert.match(flow, /knownChecksum \|\| checksumState\(state\)/);
});
