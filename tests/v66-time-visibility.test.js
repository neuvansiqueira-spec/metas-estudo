const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const stateModule = fs.readFileSync("sync-integral-state.js", "utf8");
const script = fs.readFileSync("script.js", "utf8");
const css = fs.readFileSync("aldus-daily-goals-v66.css", "utf8");
const index = fs.readFileSync("index.html", "utf8");
const worker = fs.readFileSync("service-worker.js", "utf8");
const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));

function timeLogic() {
  return new Function(`${stateModule}; return { syncRebuildGoalTotals, syncGoalForExecutionRecord };`)();
}

test("sessão ligada a meta removida é religada à única meta equivalente", () => {
  const { syncRebuildGoalTotals } = timeLogic();
  const state = {
    migrations: {
      legacyTimerRecoveryV2: {
        assignments: { "timer-1": { goalId: "meta-antiga" } }
      }
    },
    studies: [{
      id: "estudo-1",
      timerSessionId: "timer-1",
      goalId: "meta-antiga",
      date: "2026-07-19",
      discipline: "DIREITO PENAL",
      topic: "Teoria Geral do Crime",
      minutes: 38,
      origin: "timer"
    }],
    questionLogs: [],
    dailyGoals: [{
      id: "meta-nova",
      date: "2026-07-19",
      discipline: "Direito Penal",
      subject: "Teoria Geral do Crime",
      studyActualMinutes: 0,
      questionActualMinutes: 0,
      actualMinutes: 0
    }]
  };

  syncRebuildGoalTotals(state);

  assert.equal(state.dailyGoals[0].studyActualMinutes, 38);
  assert.equal(state.dailyGoals[0].actualMinutes, 38);
  assert.equal(state.studies[0].goalId, "meta-nova");
  assert.equal(state.studies[0].previousGoalId, "meta-antiga");
});

test("tempo de estudo e questões é recomposto sem duplicar sessões", () => {
  const { syncRebuildGoalTotals } = timeLogic();
  const state = {
    migrations: {},
    studies: [
      { id: "a", timerSessionId: "mesma", goalId: "g", minutes: 20, origin: "timer" },
      { id: "b", timerSessionId: "mesma", goalId: "g", minutes: 20, origin: "timer" },
      { id: "c", timerSessionId: "questoes", goalId: "g", minutes: 12, timerKind: "questions", origin: "timer" },
      { id: "d", timerSessionId: "ignorada", goalId: "g", minutes: 99, updatesGoal: false, origin: "timer" }
    ],
    questionLogs: [{ id: "q1", goalId: "g", minutes: 6 }],
    dailyGoals: [{ id: "g", date: "2026-07-19", studyActualMinutes: 0, questionActualMinutes: 0, actualMinutes: 0 }]
  };

  syncRebuildGoalTotals(state);

  assert.equal(state.dailyGoals[0].studyActualMinutes, 20);
  assert.equal(state.dailyGoals[0].questionActualMinutes, 18);
  assert.equal(state.dailyGoals[0].actualMinutes, 38);
});

test("correspondência ambígua não atribui tempo à meta errada", () => {
  const { syncRebuildGoalTotals } = timeLogic();
  const state = {
    migrations: {},
    studies: [{ id: "s", goalId: "antiga", date: "2026-07-19", discipline: "Direito Penal", topic: "Teoria Geral do Crime", minutes: 40, origin: "timer" }],
    questionLogs: [],
    dailyGoals: [
      { id: "g1", date: "2026-07-19", discipline: "Direito Penal", subject: "Teoria Geral do Crime" },
      { id: "g2", date: "2026-07-19", discipline: "Direito Penal", subject: "Teoria Geral do Crime" }
    ]
  };

  syncRebuildGoalTotals(state);

  assert.equal(state.dailyGoals[0].actualMinutes, 0);
  assert.equal(state.dailyGoals[1].actualMinutes, 0);
  assert.equal(state.studies[0].goalId, "antiga");
});

test("restauração e nuvem executam a reconciliação antes de exibir os dados", () => {
  assert.match(script, /replaceState\(payload\.state\); recoverLegacyTimerMinutesForGoals\(state\); recoverOrphanLegacyTimerMinutesForGoals\(state\); const snapshot/);
  assert.match(script, /recoverOrphanLegacyTimerMinutesForGoals\(state\);\n  if \(typeof syncRebuildGoalTotals === "function"\) syncRebuildGoalTotals\(state\);/);
  assert.match(stateModule, /syncGoalForExecutionRecord/);
  assert.match(stateModule, /syncRelinkExecutionRecord/);
});

test("Plano do Dia usa superfícies escuras com texto legível", () => {
  assert.match(index, /aldus-daily-goals-v66\.css\?v=20260719-contraste-integral-v68/);
  assert.match(css, /--v66-text: #f7fbff/);
  assert.match(css, /\.goal-material-estimate/);
  assert.match(css, /\.daily-goal-content > \.card-meta-grid > span/);
  assert.match(css, /color: #ffffff !important/);
  assert.match(css, /@media \(max-width: 768px\)/);
});

test("cache, versão e cópias de publicação permanecem em paridade", () => {
  assert.equal(packageJson.version, "20260719-contraste-integral-v68");
  assert.match(worker, /const CURRENT_VERSION = "20260719-contraste-integral-v68"/);
  assert.match(worker, /aldus-daily-goals-v66\.css/);
  assert.equal(fs.readFileSync("script.js", "utf8"), fs.readFileSync("docs/script.js", "utf8"));
  assert.equal(fs.readFileSync("sync-integral-state.js", "utf8"), fs.readFileSync("docs/sync-integral-state.js", "utf8"));
  assert.equal(css, fs.readFileSync("docs/aldus-daily-goals-v66.css", "utf8"));
  assert.equal(index, fs.readFileSync("docs/index.html", "utf8"));
  assert.equal(worker, fs.readFileSync("docs/service-worker.js", "utf8"));
});

