const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const source = fs.readFileSync("daily-goal-authorized-restore-v391.js", "utf8");
const docsSource = fs.readFileSync("docs/daily-goal-authorized-restore-v391.js", "utf8");
const startup = fs.readFileSync("startup-planning-stability-v387.js", "utf8");
const docsStartup = fs.readFileSync("docs/startup-planning-stability-v387.js", "utf8");

function automatic(id) {
  return {
    id,
    date: "2026-08-24",
    discipline: `Disciplina ${id}`,
    subject: `Assunto ${id}`,
    origin: "planejamento",
    status: "Pendente"
  };
}

function realTargetItem(overrides = {}) {
  return {
    id: "pcpr-5-11-2-planejamento-gestao-estrategica",
    discipline: "DIREITO ADMINISTRATIVO E GESTÃO PÚBLICA",
    subject: "Planejamento e gestão estratégica.",
    reference: "Anexo I, item 5.11.2",
    status: "Não iniciado",
    ...overrides
  };
}

function runWithState({ dailyGoals, syllabusItems = [realTargetItem()], eligible = [] }) {
  let saves = 0;
  let renders = 0;
  let syncs = 0;
  const state = { dailyGoals, syllabusItems, migrations: {}, schedulableSettings: {} };
  const context = {
    console,
    module: { exports: {} },
    exports: {},
    state,
    eligiblePlanningGoalsForDate: () => eligible,
    buildPlanningScoreContext: () => ({}),
    isPlanningStudyGoal: () => true,
    normalGoalTypeForItemV157: () => "Estudo novo",
    makeGoal(item, date, type) {
      return [{
        id: `goal-${item.id}`,
        date,
        discipline: item.discipline,
        subject: item.subject,
        baseSubject: item.subject,
        syllabusItemId: item.id,
        type,
        minutes: 60,
        status: "Pendente"
      }];
    },
    saveData: () => { saves += 1; return true; },
    autoSyncAfterSave: () => { syncs += 1; },
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
  vm.runInContext(source, context);
  return { context, state, saves, renders, syncs };
}

test("V391 reproduz o caso real da tela: 6→7 com Planejamento e gestão estratégica", () => {
  const six = Array.from({ length: 6 }, (_, index) => automatic(`auto-${index + 1}`));
  const result = runWithState({ dailyGoals: six, eligible: [] });

  assert.equal(result.state.dailyGoals.length, 7);
  const restored = result.state.dailyGoals.find((goal) => goal.syllabusItemId === "pcpr-5-11-2-planejamento-gestao-estrategica");
  assert.ok(restored);
  assert.equal(restored.discipline, "DIREITO ADMINISTRATIVO E GESTÃO PÚBLICA");
  assert.equal(restored.subject, "Planejamento e gestão estratégica.");
  assert.equal(restored.origin, "planejamento");
  assert.equal(restored.restoredBy, "20260824-restaura-planejamento-gestao-estrategica-v391");
  assert.equal(result.context.__ALDUS_AUTHORIZED_GOAL_RESTORE_V391__.changed, true);
  assert.equal(result.context.__ALDUS_AUTHORIZED_GOAL_RESTORE_V391__.source, "syllabus-item");
  assert.equal(result.context.__ALDUS_AUTHORIZED_GOAL_RESTORE_V391__.total, 7);
  assert.equal(result.saves, 1);
  assert.equal(result.renders, 1);
  assert.equal(result.syncs, 1);
});

test("V391 reconhece a forma numerada exibida no edital", () => {
  const item = realTargetItem({ subject: "5.11.2 Planejamento e gestão estratégica.", reference: "" });
  const six = Array.from({ length: 6 }, (_, index) => automatic(`auto-${index + 1}`));
  const result = runWithState({ dailyGoals: six, syllabusItems: [item] });
  assert.equal(result.state.dailyGoals.length, 7);
  assert.equal(result.context.__ALDUS_AUTHORIZED_GOAL_RESTORE_V391__.changed, true);
});

test("V391 também reconhece o item pela referência 5.11.2 dentro da disciplina correta", () => {
  const item = realTargetItem({ subject: "Nome interno diferente", reference: "Anexo I, item 5.11.2" });
  const six = Array.from({ length: 6 }, (_, index) => automatic(`auto-${index + 1}`));
  const result = runWithState({ dailyGoals: six, syllabusItems: [item] });
  assert.equal(result.state.dailyGoals.length, 7);
  assert.equal(result.context.__ALDUS_AUTHORIZED_GOAL_RESTORE_V391__.changed, true);
});

test("V391 não aceita 5.11.2 de outra disciplina", () => {
  const wrong = realTargetItem({ discipline: "OUTRA DISCIPLINA", reference: "Anexo I, item 5.11.2" });
  const six = Array.from({ length: 6 }, (_, index) => automatic(`auto-${index + 1}`));
  const result = runWithState({ dailyGoals: six, syllabusItems: [wrong] });
  assert.equal(result.state.dailyGoals.length, 6);
  assert.equal(result.context.__ALDUS_AUTHORIZED_GOAL_RESTORE_V391__.skipped, "candidate-not-found");
  assert.equal(result.saves, 0);
});

test("V391 não cria oitava nem duplica o item real", () => {
  const seven = Array.from({ length: 7 }, (_, index) => automatic(`auto-${index + 1}`));
  const full = runWithState({ dailyGoals: seven });
  assert.equal(full.state.dailyGoals.length, 7);
  assert.equal(full.context.__ALDUS_AUTHORIZED_GOAL_RESTORE_V391__.skipped, "day-already-has-seven");

  const existing = [
    ...Array.from({ length: 6 }, (_, index) => automatic(`auto-${index + 1}`)),
    {
      id: "existing-real-target",
      date: "2026-08-24",
      discipline: "DIREITO ADMINISTRATIVO E GESTÃO PÚBLICA",
      subject: "Planejamento e gestão estratégica."
    }
  ];
  const duplicate = runWithState({ dailyGoals: existing });
  assert.equal(duplicate.state.dailyGoals.length, 7);
  assert.equal(duplicate.context.__ALDUS_AUTHORIZED_GOAL_RESTORE_V391__.skipped, "already-present");
  assert.equal(duplicate.saves, 0);
});

test("V391 continua fora dos hot paths de performance", () => {
  for (const token of [
    "setTimeout(",
    "setInterval(",
    "requestAnimationFrame(",
    "requestIdleCallback(",
    "MutationObserver",
    "getComputedStyle("
  ]) assert.equal(source.includes(token), false, `hot path proibido: ${token}`);

  assert.match(source, /TARGET_PRIMARY_SUBJECT = "planejamento e gestao estrategica"/);
  assert.match(source, /TARGET_REFERENCE = "5 11 2"/);
  assert.match(source, /dayGoals\.length !== EXPECTED_TOTAL - 1/);
  assert.match(source, /makeGoal\(item, TARGET_DATE, type, scoreContext, targetState\)/);
});

test("V391 é entregue pelo guard e mantém paridade raiz/docs", () => {
  assert.equal(source, docsSource);
  assert.equal(startup, docsStartup);
  assert.match(startup, /daily-goal-authorized-restore-v391\.js/);
  assert.match(startup, /20260824-restaura-planejamento-gestao-estrategica-v391/);
  assert.match(startup, /aldusAuthorizedGoalRestoreV391/);
  assert.match(startup, /daily-goal-authorized-restore-v390\.js/);
});