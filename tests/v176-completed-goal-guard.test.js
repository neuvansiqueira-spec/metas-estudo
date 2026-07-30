import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const source = fs.readFileSync(new URL("../completed-goal-guard-v176.js", import.meta.url), "utf8");

function executePatch() {
  const state = {
    syllabusItems: [
      { id: "done", discipline: "Direito Penal", subject: "Teoria do Crime", status: "Concluído" },
      { id: "open", discipline: "Processo Penal", subject: "Provas", status: "Não iniciado" }
    ],
    schedulableSettings: {},
    dailyGoals: [
      { id: "remove", date: "2026-07-30", syllabusItemId: "done", discipline: "Direito Penal", subject: "Teoria do Crime", type: "Reforço", status: "Pendente", origin: "planejamento" },
      { id: "convert", date: "2026-07-30", syllabusItemId: "open", discipline: "Processo Penal", subject: "Provas", type: "Reforço", status: "Pendente", origin: "planejamento", history: ["Gerada automaticamente"] },
      { id: "manual", date: "2026-07-30", syllabusItemId: "done", discipline: "Direito Penal", subject: "Teoria do Crime", type: "Reforço", status: "Pendente", origin: "manual" },
      { id: "executed", date: "2026-07-30", syllabusItemId: "done", discipline: "Direito Penal", subject: "Teoria do Crime", type: "Reforço", status: "Pendente", origin: "planejamento", actualMinutes: 15 }
    ],
    migrations: {}
  };

  const context = {
    console,
    state,
    globalThis: null,
    isManualDailyGoal: (goal) => String(goal.origin || "").includes("manual"),
    isGoalDone: (goal) => goal.status === "Concluída",
    normalGoalTypeForItemV157: () => "Estudo novo",
    completedPlanningSubjectRecords: (targetState) => targetState.syllabusItems.filter((item) => item.status === "Concluído"),
    planningRecordMatchesCompletedSubject: (record, completed) => completed.some((item) => item.id === record.syllabusItemId || (item.discipline === record.discipline && item.subject === record.subject)),
    buildPlanningScoreContext: (targetState) => ({ candidates: [...targetState.syllabusItems] }),
    saveData: () => {},
    render: () => {},
    autoSyncAfterSave: () => {}
  };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(source, context);
  return { state, context };
}

test("remove meta automática pendente de assunto concluído e bloqueia nova candidatura", () => {
  const { state, context } = executePatch();
  assert.equal(state.dailyGoals.some((goal) => goal.id === "remove"), false);
  assert.deepEqual(context.buildPlanningScoreContext(state).candidates.map((item) => item.id), ["open"]);
});

test("converte reforço automático sem apagar histórico e preserva manual ou executada", () => {
  const { state } = executePatch();
  const converted = state.dailyGoals.find((goal) => goal.id === "convert");
  assert.equal(converted.type, "Estudo novo");
  assert.deepEqual(converted.history, ["Gerada automaticamente"]);
  assert.equal(state.dailyGoals.find((goal) => goal.id === "manual").type, "Reforço");
  assert.equal(state.dailyGoals.find((goal) => goal.id === "executed").actualMinutes, 15);
});
