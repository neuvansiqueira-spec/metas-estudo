const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const app = fs.readFileSync("app-v332.js", "utf8");

test("Google Drive recompõe os totais após recuperar minutos e antes de persistir ou renderizar", () => {
  const start = app.indexOf("async function applyCloudPayload(payload)");
  const end = app.indexOf("async function syncNow()", start);
  const flow = app.slice(start, end);

  assert.ok(start >= 0 && end > start, "applyCloudPayload deve existir na versão ativa");
  assert.ok(flow.indexOf("recoverLegacyTimerMinutesForGoals(state)") < flow.indexOf("syncRebuildGoalTotals(state)"));
  assert.ok(flow.indexOf("recoverOrphanLegacyTimerMinutesForGoals(state)") < flow.indexOf("syncRebuildGoalTotals(state)"));
  assert.ok(flow.indexOf("syncRebuildGoalTotals(state)") < flow.indexOf("saveStateToIndexedDB(snapshot)"));
  assert.ok(flow.indexOf("syncRebuildGoalTotals(state)") < flow.indexOf("render()"));
});

test("bootstrap do IndexedDB recompõe os totais após recuperar minutos e antes de renderizar", () => {
  const start = app.indexOf("async function bootstrapApplication()");
  const end = app.indexOf("function handleBootstrapFailure", start);
  const flow = app.slice(start, end);

  assert.ok(start >= 0 && end > start, "bootstrapApplication deve existir na versão ativa");
  assert.ok(flow.indexOf("replaceState(chosenState)") < flow.indexOf("syncRebuildGoalTotals(state)"));
  assert.ok(flow.indexOf("recoverLegacyTimerMinutesForGoals(state)") < flow.indexOf("syncRebuildGoalTotals(state)"));
  assert.ok(flow.indexOf("recoverOrphanLegacyTimerMinutesForGoals(state)") < flow.indexOf("syncRebuildGoalTotals(state)"));
  assert.ok(flow.indexOf("syncRebuildGoalTotals(state)") < flow.indexOf("renderFloatingTimer()"));
  assert.ok(flow.indexOf("syncRebuildGoalTotals(state)") < flow.indexOf("showView(hashToView()"));
});
