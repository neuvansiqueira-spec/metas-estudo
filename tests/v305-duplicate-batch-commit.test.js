"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const batch = require("../duplicate-diagnostics-batch-v305.js");

assert.equal(batch.VERSION, "20260811-duplicate-batch-core-pin-v308");

const plan = {
  actions: [
    { keeperId: "keeper", removedId: "dup-a" },
    { keeperId: "keeper", removedId: "dup-b" }
  ]
};
const state = {
  syllabusItems: [{ id: "keeper" }, { id: "dup-a" }, { id: "dup-b" }],
  syncTombstones: { schemaVersion: 1, collections: {} }
};

assert.deepEqual(batch.planIds(plan).sort(), ["dup-a", "dup-b", "keeper"]);
assert.equal(batch.stateContainsPlan(state, plan), true);

const removedIds = batch.removedIdsFromPlan(plan);
state.syllabusItems = [{ id: "keeper" }];
assert.deepEqual(batch.remainingRemovedIds(state, removedIds), []);

batch.ensureDeletionTombstones(state, removedIds, "2026-08-11T10:00:00.000Z");
assert.equal(state.syncTombstones.collections.syllabusItems["syllabusItems:id:dup-a"].reason, "duplicate-consolidation-v308");
assert.equal(state.syncTombstones.collections.syllabusItems["syllabusItems:id:dup-b"].version, batch.VERSION);
assert.equal(batch.validateSnapshot(state, removedIds), state);
assert.throws(
  () => batch.validateSnapshot({ syllabusItems: [{ id: "dup-a" }] }, removedIds),
  /ainda presentes/
);

const api = { VERSION: "20260811-duplicate-batch-performance-v304" };
globalThis.__aldusDuplicateBatchPlanV304 = {
  version: api.VERSION,
  itemCount: 3,
  plan
};
assert.equal(batch.cachedPlanForState({ syllabusItems: [{ id: "keeper" }, { id: "dup-a" }, { id: "dup-b" }] }, api).actions.length, 2);
assert.equal(batch.cachedPlanForState({ syllabusItems: [{ id: "keeper" }, { id: "dup-a" }] }, api), null);

const source = fs.readFileSync(path.join(__dirname, "..", "duplicate-diagnostics-batch-v305.js"), "utf8");
const workerSource = fs.readFileSync(path.join(__dirname, "..", "service-worker.js"), "utf8");
assert.match(source, /synchronizeRuntimeStates\(verified\)/, "o estado relido deve voltar para todas as referências de runtime");
assert.match(source, /for \(let cycle = 0; cycle < 4; cycle \+= 1\)/, "deve haver barreira curta contra regressão assíncrona");
assert.match(source, /ensureDeletionTombstones\(workingState, removedIds, startedAt\)/, "o lote deve reforçar tombstones de exclusão");
assert.match(source, /clearCachedPlan\(\)/, "o plano antigo deve ser invalidado após o commit");
assert.match(source, /postReport = api\.diagnoseState\(verifiedState/, "o diagnóstico pós-lote deve usar o snapshot persistido");
assert.match(workerSource, /duplicate-diagnostics-batch-v305\.js/, "o service worker deve entregar a V305");
assert.match(workerSource, /installDuplicateBatchV305/, "a navegação deve substituir handlers antigos pelo V305");
assert.match(workerSource, /duplicate-batch-core-pin-v308/, "o cache deve ser renovado para a V308");

console.log("v305 duplicate batch commit: covered");
