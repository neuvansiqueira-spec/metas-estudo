const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const restoreSource = fs.readFileSync("daily-goal-authorized-restore-v388.js", "utf8");
const coreSource = fs.readFileSync("planning-integrity-v235.js", "utf8");

function automatic(id, discipline = `Disciplina ${id}`, subject = `Assunto ${id}`) {
  return { id, date: "2026-08-24", discipline, subject, origin: "planejamento", status: "Pendente" };
}

function targetCandidate() {
  return {
    id: "planejamento-gestao-publica-20260824",
    date: "2026-08-24",
    discipline: "DIREITO ADMINISTRATIVO E GESTÃO PÚBLICA",
    subject: "Planejamento e Gestão Pública",
    syllabusItemId: "gestao-publica-planejamento",
    origin: "planejamento",
    status: "Pendente"
  };
}

function runRestore(dailyGoals, eligible = [targetCandidate()]) {
  let saves = 0;
  let renders = 0;
  const context = {
    console,
    module: { exports: {} },
    exports: {},
    state: { dailyGoals, migrations: {} },
    eligiblePlanningGoalsForDate: () => eligible,
    buildPlanningScoreContext: () => ({}),
    isPlanningStudyGoal: () => true,
    saveData: () => { saves += 1; return true; },
    autoSyncAfterSave: () => {},
    render: () => { renders += 1; },
    window: { addEventListener: () => {} },
    globalThis: null,
    Date,
    Object,
    Array,
    String,
    Set,
    Map
  };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(restoreSource, context);
  return { context, saves, renders };
}

test("V388 restaura somente Planejamento e Gestão Pública quando o dia caiu de 7 para 6", () => {
  const six = Array.from({ length: 6 }, (_, index) => automatic(`auto-${index + 1}`));
  const { context, saves } = runRestore(six);
  assert.equal(context.state.dailyGoals.length, 7);
  const matches = context.state.dailyGoals.filter((goal) => goal.discipline === "DIREITO ADMINISTRATIVO E GESTÃO PÚBLICA" && goal.subject === "Planejamento e Gestão Pública");
  assert.equal(matches.length, 1);
  assert.equal(matches[0].origin, "planejamento");
  assert.equal(context.__ALDUS_AUTHORIZED_GOAL_RESTORE_V388__.changed, true);
  assert.equal(saves, 1);
});

test("V388 não cria oitava meta se o dia já possui sete", () => {
  const seven = Array.from({ length: 7 }, (_, index) => automatic(`auto-${index + 1}`));
  const { context, saves } = runRestore(seven);
  assert.equal(context.state.dailyGoals.length, 7);
  assert.equal(context.__ALDUS_AUTHORIZED_GOAL_RESTORE_V388__.skipped, "day-already-has-seven");
  assert.equal(saves, 0);
});

test("V388 não duplica a meta quando ela já está presente", () => {
  const goals = [
    ...Array.from({ length: 6 }, (_, index) => automatic(`auto-${index + 1}`)),
    targetCandidate()
  ];
  const { context, saves } = runRestore(goals);
  assert.equal(context.state.dailyGoals.length, 7);
  assert.equal(context.__ALDUS_AUTHORIZED_GOAL_RESTORE_V388__.skipped, "already-present");
  assert.equal(saves, 0);
});

test("núcleo V235/V388 não realinha nem salva metas automaticamente", () => {
  assert.equal(coreSource.includes("ensureDailyPlanAlignedWithPlanningV174"), false);
  assert.equal(coreSource.includes("reconcileTodayAndPersist"), false);
  assert.equal(coreSource.includes("setInterval("), false);
  assert.equal(coreSource.includes("MutationObserver"), false);
  assert.equal(coreSource.includes("requestAnimationFrame("), false);
  assert.equal(coreSource.includes("getComputedStyle("), false);
});

test("restauração V388 é pontual e sem hot paths contínuos", () => {
  assert.equal(restoreSource.includes("setInterval("), false);
  assert.equal(restoreSource.includes("MutationObserver"), false);
  assert.equal(restoreSource.includes("requestAnimationFrame("), false);
  assert.equal(restoreSource.includes("getComputedStyle("), false);
  assert.match(restoreSource, /EXPECTED_TOTAL = 7/);
  assert.match(restoreSource, /TARGET_DATE = "2026-08-24"/);
});

test("publicação raiz/docs permanece idêntica", () => {
  assert.equal(fs.readFileSync("docs/daily-goal-authorized-restore-v388.js", "utf8"), restoreSource);
  assert.equal(fs.readFileSync("docs/planning-integrity-v235.js", "utf8"), coreSource);
  const guard = fs.readFileSync("startup-planning-stability-v387.js", "utf8");
  assert.equal(fs.readFileSync("docs/startup-planning-stability-v387.js", "utf8"), guard);
  assert.match(guard, /planning-integrity-v235\.js/);
  assert.match(guard, /daily-goal-authorized-restore-v388\.js/);
});
