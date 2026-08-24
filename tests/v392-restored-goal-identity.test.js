const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const source = fs.readFileSync("daily-goal-authorized-restore-v392.js", "utf8");
const docsSource = fs.readFileSync("docs/daily-goal-authorized-restore-v392.js", "utf8");
const startup = fs.readFileSync("startup-planning-stability-v387.js", "utf8");
const docsStartup = fs.readFileSync("docs/startup-planning-stability-v387.js", "utf8");
const V391 = "20260824-restaura-planejamento-gestao-estrategica-v391";

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

function targetItem(overrides = {}) {
  return {
    id: "shared-item-id",
    discipline: "DIREITO ADMINISTRATIVO E GESTÃO PÚBLICA",
    subject: "Planejamento e gestão estratégica.",
    reference: "Anexo I, item 5.11.2",
    status: "Não iniciado",
    ...overrides
  };
}

function wrongLegislationGoal(overrides = {}) {
  return {
    id: "restored-v391-goal",
    date: "2026-08-24",
    data: "2026-08-24",
    discipline: "LEGISLAÇÃO ESTADUAL E INSTITUCIONAL",
    disciplina: "LEGISLAÇÃO ESTADUAL E INSTITUCIONAL",
    subject: "Estruturação das carreiras da Polícia Civil do Estado do Paraná: Lei Complementar Estadual n.º 259, de 21 de julho de 2023, e suas alterações posteriores.",
    assunto: "Estruturação das carreiras da Polícia Civil do Estado do Paraná: Lei Complementar Estadual n.º 259, de 21 de julho de 2023, e suas alterações posteriores.",
    baseSubject: "Estruturação das carreiras da Polícia Civil do Estado do Paraná: Lei Complementar Estadual n.º 259, de 21 de julho de 2023, e suas alterações posteriores.",
    syllabusItemId: "shared-item-id",
    origin: "planejamento",
    origem: "planejamento",
    status: "Pendente",
    minutes: 75,
    actualMinutes: 0,
    restoredBy: V391,
    ...overrides
  };
}

function run(state) {
  let saves = 0;
  let renders = 0;
  let syncs = 0;
  const context = {
    console,
    state,
    saveData: () => { saves += 1; return true; },
    autoSyncAfterSave: () => { syncs += 1; },
    render: () => { renders += 1; },
    window: { addEventListener: () => {} },
    module: { exports: {} },
    exports: {},
    globalThis: null,
    Date,
    Object,
    Array,
    String,
    Number,
    Set,
    Map
  };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(source, context);
  return { context, state, saves, renders, syncs };
}

test("V392 corrige em lugar a meta errada criada pela V391 e mantém sete metas", () => {
  const wrong = wrongLegislationGoal();
  const state = {
    dailyGoals: [...Array.from({ length: 6 }, (_, i) => automatic(`auto-${i + 1}`)), wrong],
    syllabusItems: [
      { id: "shared-item-id", discipline: "LEGISLAÇÃO ESTADUAL E INSTITUCIONAL", subject: "Lei Complementar Estadual n.º 259" },
      targetItem()
    ],
    migrations: {}
  };
  const result = run(state);

  assert.equal(state.dailyGoals.length, 7);
  assert.equal(wrong.id, "restored-v391-goal", "preserva o UUID da meta já criada");
  assert.equal(wrong.discipline, "DIREITO ADMINISTRATIVO E GESTÃO PÚBLICA");
  assert.equal(wrong.disciplina, "DIREITO ADMINISTRATIVO E GESTÃO PÚBLICA");
  assert.equal(wrong.subject, "Planejamento e gestão estratégica.");
  assert.equal(wrong.assunto, "Planejamento e gestão estratégica.");
  assert.equal(wrong.baseSubject, "Planejamento e gestão estratégica.");
  assert.equal(wrong.syllabusItemId, undefined, "ID ambíguo é removido para impedir religação ao item errado");
  assert.equal(wrong.restoredBy, "20260824-corrige-identidade-meta-planejamento-v392");
  assert.equal(wrong.restoredFrom, V391);
  assert.equal(result.context.__ALDUS_AUTHORIZED_GOAL_RESTORE_V392__.changed, true);
  assert.equal(result.context.__ALDUS_AUTHORIZED_GOAL_RESTORE_V392__.total, 7);
  assert.equal(result.saves, 1);
  assert.equal(result.renders, 1);
  assert.equal(result.syncs, 1);
});

test("V392 mantém syllabusItemId quando o ID do item correto é único", () => {
  const wrong = wrongLegislationGoal({ syllabusItemId: "target-unique" });
  const state = {
    dailyGoals: [...Array.from({ length: 6 }, (_, i) => automatic(`auto-${i + 1}`)), wrong],
    syllabusItems: [targetItem({ id: "target-unique" })],
    migrations: {}
  };
  run(state);
  assert.equal(wrong.syllabusItemId, "target-unique");
  assert.equal(wrong.discipline, "DIREITO ADMINISTRATIVO E GESTÃO PÚBLICA");
  assert.equal(wrong.subject, "Planejamento e gestão estratégica.");
});

test("V392 não altera uma meta V391 se houver execução registrada", () => {
  const wrong = wrongLegislationGoal({ actualMinutes: 10, status: "Em andamento" });
  const before = JSON.stringify(wrong);
  const state = {
    dailyGoals: [...Array.from({ length: 6 }, (_, i) => automatic(`auto-${i + 1}`)), wrong],
    syllabusItems: [targetItem()],
    migrations: {}
  };
  const result = run(state);
  assert.equal(JSON.stringify(wrong), before);
  assert.equal(result.context.__ALDUS_AUTHORIZED_GOAL_RESTORE_V392__.skipped, "wrong-goal-has-execution");
  assert.equal(result.saves, 0);
});

test("V392 não toca no dia quando a meta correta já existe", () => {
  const correct = {
    id: "correct",
    date: "2026-08-24",
    discipline: "DIREITO ADMINISTRATIVO E GESTÃO PÚBLICA",
    subject: "Planejamento e gestão estratégica.",
    origin: "planejamento",
    status: "Pendente"
  };
  const state = {
    dailyGoals: [...Array.from({ length: 6 }, (_, i) => automatic(`auto-${i + 1}`)), correct],
    syllabusItems: [targetItem()],
    migrations: {}
  };
  const result = run(state);
  assert.equal(result.context.__ALDUS_AUTHORIZED_GOAL_RESTORE_V392__.skipped, "target-already-correct");
  assert.equal(result.saves, 0);
});

test("V392 não adiciona hot paths nem chama makeGoal", () => {
  for (const token of [
    "setTimeout(",
    "setInterval(",
    "requestAnimationFrame(",
    "requestIdleCallback(",
    "MutationObserver",
    "getComputedStyle(",
    "makeGoal("
  ]) assert.equal(source.includes(token), false, `caminho proibido: ${token}`);
  assert.match(source, /findV391Goal/);
  assert.match(source, /uniqueItemId/);
  assert.match(source, /wrongGoal\.discipline = discipline/);
});

test("V392 mantém paridade raiz/docs e é carregada depois da V391", () => {
  assert.equal(source, docsSource);
  assert.equal(startup, docsStartup);
  const v391 = startup.indexOf("loadAuthorizedRestoreV391();");
  const v392 = startup.indexOf("loadAuthorizedCorrectionV392();");
  assert.ok(v391 >= 0 && v392 > v391);
  assert.match(startup, /daily-goal-authorized-restore-v392\.js/);
  assert.match(startup, /20260824-corrige-identidade-meta-planejamento-v392/);
  assert.match(startup, /aldusAuthorizedGoalRestoreV392/);
});