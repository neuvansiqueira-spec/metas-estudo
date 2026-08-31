const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const planning = fs.readFileSync("planning-integrity-v235.js", "utf8");
const completedGuard = fs.readFileSync("completed-goal-guard-v177.js", "utf8");
const RELEASE = "20260831-daily-goals-explicit-mutation-v419";

test("V419 planejamento não chama repositor, save, render ou sync no diagnóstico de startup", () => {
  const start = planning.indexOf("function reconcileDailyPlanOnStartup");
  const end = planning.indexOf("function finalizeStartupReconcile", start);
  assert.ok(start >= 0 && end > start);
  const block = planning.slice(start, end);
  assert.match(block, /automatic-mutation-disabled-v419/);
  assert.doesNotMatch(block, /replenishMissingDailyPlanningGoalsV116|saveData|autoSyncAfterSave|\.push\(/);
  const replaceStart = planning.indexOf("function replaceStateIntegrityV388");
  const replaceEnd = planning.indexOf("};", replaceStart);
  assert.doesNotMatch(planning.slice(replaceStart, replaceEnd), /reconcileDailyPlanOnStartup/);
});

test("V419 guarda de concluídos não instala gatilhos automáticos e exige autorização dupla", () => {
  assert.match(completedGuard, new RegExp(`POLICY_VERSION = "${RELEASE}"`));
  assert.doesNotMatch(completedGuard, /window\.addEventListener\("aldus:bootstrap-ready"|window\.addEventListener\("aldus:post-bootstrap-maintenance-complete"|window\.addEventListener\("pageshow"|window\.addEventListener\("storage"|queueMicrotask\(/);
  assert.match(completedGuard, /options\?\.explicit !== true \|\| options\?\.allowMutations !== true/);
  assert.match(completedGuard, /automaticMutationDisabled: true/);
});

test("V419 auditoria de concluídos é read-only por padrão e muta somente quando explicitamente autorizada", () => {
  const targetState = {
    syllabusItems: [{ id: "s1", discipline: "Direito", subject: "Atos", status: "Concluído" }],
    dailyGoals: [{ id: "g1", date: "2026-08-31", discipline: "Direito", subject: "Atos", syllabusItemId: "s1", status: "Pendente", origin: "planejamento" }],
    migrations: {}
  };
  const counters = { save: 0, render: 0, sync: 0 };
  const context = {
    console, state: targetState,
    planningGoalTypeForItemV157() { return "Estudo novo"; },
    buildPlanningScoreContext() { return { candidates: [] }; },
    completedPlanningSubjectRecords() { return targetState.syllabusItems; },
    planningRecordMatchesCompletedSubject(record, completed) { return completed.some((item) => item.id === record.syllabusItemId); },
    isGoalDone(goal) { return goal.status === "Concluída"; },
    saveData() { counters.save += 1; }, render() { counters.render += 1; }, autoSyncAfterSave() { counters.sync += 1; },
    Date, Object, Array, String, Number, Set, Map
  };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(completedGuard, context);
  const before = JSON.stringify(targetState.dailyGoals);
  const blocked = context.__aldusCompletedGoalGuardV177.runAudit("bootstrap-ready");
  assert.equal(blocked.skipped, "explicit-authorization-required");
  assert.equal(JSON.stringify(targetState.dailyGoals), before);
  assert.deepEqual(counters, { save: 0, render: 0, sync: 0 });
  const explicit = context.__aldusCompletedGoalGuardV177.runAudit("manual-repair", { explicit: true, allowMutations: true });
  assert.equal(explicit.changed, true);
  assert.equal(targetState.dailyGoals.length, 0);
  assert.deepEqual(counters, { save: 1, render: 1, sync: 1 });
});

test("V419 mantém fontes raiz e publicadas idênticas", () => {
  assert.equal(planning, fs.readFileSync("docs/planning-integrity-v235.js", "utf8"));
  assert.equal(completedGuard, fs.readFileSync("docs/completed-goal-guard-v177.js", "utf8"));
  assert.equal(fs.readFileSync("planning-integrity-loader-v235.js", "utf8"), fs.readFileSync("docs/planning-integrity-loader-v235.js", "utf8"));
});
