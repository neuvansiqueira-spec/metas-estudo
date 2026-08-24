const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const source = fs.readFileSync("daily-goal-authorized-restore-v390.js", "utf8");
const docsSource = fs.readFileSync("docs/daily-goal-authorized-restore-v390.js", "utf8");
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

function targetItem() {
  return {
    id: "syllabus-planejamento-gestao-publica",
    discipline: "DIREITO ADMINISTRATIVO E GESTÃO PÚBLICA",
    subject: "Planejamento e Gestão Pública",
    status: "Pendente"
  };
}

function runWithState({ dailyGoals, syllabusItems = [targetItem()], eligible = [] }) {
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

test("V390 restaura 6→7 usando o item exato do edital quando o candidato elegível sumiu", () => {
  const six = Array.from({ length: 6 }, (_, index) => automatic(`auto-${index + 1}`));
  const result = runWithState({ dailyGoals: six, eligible: [] });

  assert.equal(result.state.dailyGoals.length, 7);
  const restored = result.state.dailyGoals.find((goal) => goal.syllabusItemId === "syllabus-planejamento-gestao-publica");
  assert.ok(restored);
  assert.equal(restored.discipline, "DIREITO ADMINISTRATIVO E GESTÃO PÚBLICA");
  assert.equal(restored.subject, "Planejamento e Gestão Pública");
  assert.equal(restored.origin, "planejamento");
  assert.equal(restored.restoredBy, "20260824-restaura-meta-planejamento-gestao-publica-v390");
  assert.equal(result.context.__ALDUS_AUTHORIZED_GOAL_RESTORE_V390__.changed, true);
  assert.equal(result.context.__ALDUS_AUTHORIZED_GOAL_RESTORE_V390__.source, "syllabus-item");
  assert.equal(result.context.__ALDUS_AUTHORIZED_GOAL_RESTORE_V390__.total, 7);
  assert.equal(result.saves, 1);
  assert.equal(result.renders, 1);
  assert.equal(result.syncs, 1);
});

test("V390 não cria oitava nem duplica meta existente", () => {
  const seven = Array.from({ length: 7 }, (_, index) => automatic(`auto-${index + 1}`));
  const full = runWithState({ dailyGoals: seven });
  assert.equal(full.state.dailyGoals.length, 7);
  assert.equal(full.context.__ALDUS_AUTHORIZED_GOAL_RESTORE_V390__.skipped, "day-already-has-seven");
  assert.equal(full.saves, 0);

  const existing = [
    ...Array.from({ length: 6 }, (_, index) => automatic(`auto-${index + 1}`)),
    {
      id: "existing-target",
      date: "2026-08-24",
      discipline: "DIREITO ADMINISTRATIVO E GESTÃO PÚBLICA",
      subject: "Planejamento e Gestão Pública"
    }
  ];
  const duplicate = runWithState({ dailyGoals: existing });
  assert.equal(duplicate.state.dailyGoals.length, 7);
  assert.equal(duplicate.context.__ALDUS_AUTHORIZED_GOAL_RESTORE_V390__.skipped, "already-present");
  assert.equal(duplicate.saves, 0);
});

test("V390 não inventa meta se o item exato não existir no edital", () => {
  const six = Array.from({ length: 6 }, (_, index) => automatic(`auto-${index + 1}`));
  const result = runWithState({ dailyGoals: six, syllabusItems: [] });
  assert.equal(result.state.dailyGoals.length, 6);
  assert.equal(result.context.__ALDUS_AUTHORIZED_GOAL_RESTORE_V390__.skipped, "candidate-not-found");
  assert.equal(result.saves, 0);
});

test("V390 permanece fora de hot paths e só consulta o edital no cenário 6 metas + alvo ausente", () => {
  for (const token of [
    "setTimeout(",
    "setInterval(",
    "requestAnimationFrame(",
    "requestIdleCallback(",
    "MutationObserver",
    "getComputedStyle("
  ]) assert.equal(source.includes(token), false, `hot path proibido: ${token}`);

  assert.match(source, /dayGoals\.length !== EXPECTED_TOTAL - 1/);
  assert.match(source, /findSyllabusItem\(targetState\)/);
  assert.match(source, /makeGoal\(item, TARGET_DATE, type, scoreContext, targetState\)/);
});

test("V390 permanece preservada como legado enquanto o guard entrega V391", () => {
  assert.equal(source, docsSource);
  assert.equal(startup, docsStartup);
  assert.match(startup, /daily-goal-authorized-restore-v391\.js/);
  assert.match(startup, /aldusAuthorizedGoalRestoreV391/);
  assert.match(startup, /daily-goal-authorized-restore-v390\.js/);
});