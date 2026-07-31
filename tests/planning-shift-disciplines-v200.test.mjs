import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const moduleSource = fs.readFileSync(new URL("../planning-shift-disciplines-v200.js", import.meta.url), "utf8");
const docsSource = fs.readFileSync(new URL("../docs/planning-shift-disciplines-v200.js", import.meta.url), "utf8");
const workerSource = fs.readFileSync(new URL("../runtime-entry-v200.js", import.meta.url), "utf8");
const baseWorkerSource = fs.readFileSync(new URL("../runtime-shell-base-v199.js", import.meta.url), "utf8");
const serviceWorkerSource = fs.readFileSync(new URL("../service-worker-v169.js", import.meta.url), "utf8");

test("declares the dedicated shift-day discipline field and keeps root/docs parity", () => {
  assert.equal(moduleSource, docsSource);
  assert.match(moduleSource, /Disciplinas no dia de plantão/);
  assert.match(moduleSource, /shiftDisciplinesPerDay/);
  assert.match(moduleSource, /planningShiftDisciplinesPerDay/);
});

test("uses the dedicated limit only on plantão days", () => {
  const targetState = { planning: { config: { disciplinesPerDay: 4, shiftDisciplinesPerDay: 1 } } };
  const context = {
    globalThis: null,
    state: targetState,
    planningConfig: (value = targetState) => value.planning.config,
    getPlanningDayType: (date) => date === "2026-08-01" ? "plantao" : "normal",
    planningTargetsForDate: () => ({ disciplines: 4, topics: 4, dayContent: { mode: "goals_only" } }),
    generateGoalsForDate: (_date, opts) => opts,
    selectableDisciplineGoalsForDate: () => ["original"],
    setTimeout,
    console
  };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(moduleSource, context);
  const shift = context.planningTargetsForDate("2026-08-01", targetState);
  const normal = context.planningTargetsForDate("2026-08-02", targetState);
  assert.equal(shift.disciplines, 1);
  assert.equal(shift.topics, 4);
  assert.equal(normal.disciplines, 4);
});

test("overrides generator disciplineLimit for plantão without changing normal days", () => {
  const targetState = { planning: { config: { disciplinesPerDay: 3, shiftDisciplinesPerDay: 2 } } };
  const context = {
    globalThis: null,
    state: targetState,
    planningConfig: (value = targetState) => value.planning.config,
    getPlanningDayType: (date) => date === "shift" ? "plantao" : "normal",
    planningTargetsForDate: () => ({ disciplines: 3, topics: 3 }),
    generateGoalsForDate: (_date, opts) => opts,
    selectableDisciplineGoalsForDate: () => [],
    setTimeout,
    console
  };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(moduleSource, context);
  assert.equal(context.generateGoalsForDate("shift", { disciplineLimit: 9 }).disciplineLimit, 2);
  assert.equal(context.generateGoalsForDate("normal", { disciplineLimit: 9 }).disciplineLimit, 9);
  assert.equal(targetState.planning.config.disciplinesPerDay, 3);
});

test("runtime entry extends V199 and preserves previous modules", () => {
  assert.equal(serviceWorkerSource.trim(), 'importScripts("./runtime-entry-v200.js");');
  assert.match(workerSource, /runtime-shell-base-v199\.js/);
  assert.match(workerSource, /20260731-disciplinas-dia-plantao-v169/);
  assert.match(workerSource, /planning-shift-disciplines-v200\.js/);
  assert.match(workerSource, /Aldus runtime source: planning-shift-disciplines-v200\.js/);
  assert.match(baseWorkerSource, /question-history-visual-fix-v199\.css/);
  assert.match(baseWorkerSource, /question-bank-json-review-v192\.js/);
});
