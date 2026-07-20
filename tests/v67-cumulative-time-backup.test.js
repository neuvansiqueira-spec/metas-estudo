const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const script = fs.readFileSync("script.js", "utf8");
const css = fs.readFileSync("aldus-daily-time-v67.css", "utf8");
const index = fs.readFileSync("index.html", "utf8");
const worker = fs.readFileSync("service-worker.js", "utf8");
const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));

const canonical = (value) => String(value || "").trim().toLowerCase();
const cloneData = (value) => JSON.parse(JSON.stringify(value));

test("mesclagem recupera o tempo de uma meta de mesmo ID sem reduzir dados atuais", () => {
  const source = script.slice(script.indexOf("function backupGoalIdentity"), script.indexOf("function mergeBackupData"));
  const state = { dailyGoals: [{ id: "meta-17", date: "2026-07-17", discipline: "DIREITO PENAL", subject: "Teoria Geral do Crime", studyActualMinutes: 0, questionActualMinutes: 0, actualMinutes: 0, status: "Pendente" }] };
  const api = new Function("state", "canonical", "cloneData", `${source}; return { mergeBackupDailyGoals, mergeBackupGoalTimeFields };`)(state, canonical, cloneData);

  api.mergeBackupDailyGoals([{ id: "meta-17", date: "2026-07-17", discipline: "DIREITO PENAL", subject: "Teoria Geral do Crime", studyActualMinutes: 76, questionActualMinutes: 24, actualMinutes: 100, status: "Concluída" }]);

  assert.equal(state.dailyGoals.length, 1);
  assert.equal(state.dailyGoals[0].studyActualMinutes, 76);
  assert.equal(state.dailyGoals[0].questionActualMinutes, 24);
  assert.equal(state.dailyGoals[0].actualMinutes, 100);
  assert.equal(state.dailyGoals[0].tempo_real_minutos, 100);
  assert.equal(state.dailyGoals[0].status, "Concluída");
});

test("meta atual fica em zero e o acumulado do mesmo assunto permanece 2h55", () => {
  const source = script.slice(script.indexOf("function relatedGoalExecutionMinutes"), script.indexOf("function goalAccumulatedExecution"));
  const state = { dailyGoals: [
    { id: "g16", syllabusItemId: "penal-1", actualMinutes: 75 },
    { id: "g17", syllabusItemId: "penal-1", actualMinutes: 100 },
    { id: "g19", syllabusItemId: "penal-1", actualMinutes: 0 }
  ] };
  const relatedMinutes = new Function("state", "canonical", "goalTotalActualMinutes", `${source}; return relatedGoalExecutionMinutes;`)(state, canonical, (goal) => Number(goal.actualMinutes) || 0);

  assert.equal(state.dailyGoals[2].actualMinutes, 0);
  assert.equal(relatedMinutes(state.dailyGoals[2]), 175);
});

test("histórico de estudos do cenário do backup soma 3h58 sem duplicar sessão", () => {
  const source = script.slice(script.indexOf("function totalRecordedStudyMinutes"), script.indexOf("function nextGoalEstimateHTML"));
  const totalRecordedStudyMinutes = new Function(`${source}; return totalRecordedStudyMinutes;`)();
  const records = [59, 18, 24, 31, 15, 1, 11, 79].map((minutes, index) => ({ id: `s${index}`, timerSessionId: `t${index}`, minutes }));
  records.push({ id: "duplicada", timerSessionId: "t0", minutes: 59 });

  assert.equal(totalRecordedStudyMinutes(records), 238);
});

test("Plano do Dia diferencia o valor diário do acumulado com contraste responsivo", () => {
  assert.match(script, /Tempo acumulado neste assunto/);
  assert.match(script, /Nesta meta de/);
  assert.match(script, /Histórico de estudo registrado/);
  assert.match(script, /mergeBackupDailyGoals\(data\.dailyGoals \|\| \[\]\)/);
  assert.match(index, /aldus-daily-time-v67\.css\?v=20260719-inicializacao-rapida-v72/);
  assert.match(css, /\.goal-execution-summary/);
  assert.match(css, /grid-template-columns: minmax\(0, 1\.25fr\)/);
  assert.match(css, /@media \(max-width: 768px\)/);
});

test("versão, cache e publicação em docs estão em paridade", () => {
  assert.equal(packageJson.version, "20260719-inicializacao-rapida-v72");
  assert.match(worker, /const CURRENT_VERSION = "20260719-inicializacao-rapida-v72"/);
  assert.match(worker, /aldus-daily-time-v67\.css/);
  assert.equal(script, fs.readFileSync("docs/script.js", "utf8"));
  assert.equal(index, fs.readFileSync("docs/index.html", "utf8"));
  assert.equal(worker, fs.readFileSync("docs/service-worker.js", "utf8"));
  assert.equal(css, fs.readFileSync("docs/aldus-daily-time-v67.css", "utf8"));
});
