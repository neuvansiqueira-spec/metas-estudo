const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const source = fs.readFileSync("daily-plan-explicit-alignment-v393.js", "utf8");
const docsSource = fs.readFileSync("docs/daily-plan-explicit-alignment-v393.js", "utf8");
const startup = fs.readFileSync("startup-planning-stability-v387.js", "utf8");
const docsStartup = fs.readFileSync("docs/startup-planning-stability-v387.js", "utf8");

function ordinary(id, discipline, subject, overrides = {}) {
  return {
    id,
    date: "2026-08-24",
    discipline,
    disciplina: discipline,
    subject,
    assunto: subject,
    baseSubject: subject,
    syllabusItemId: `item-${id}`,
    origin: "planejamento",
    origem: "planejamento",
    status: "Pendente",
    minutes: 60,
    ...overrides
  };
}

function targetItem() {
  return {
    id: "pcpr-admin-5-11-2",
    discipline: "DIREITO ADMINISTRATIVO E GESTÃO PÚBLICA",
    disciplina: "DIREITO ADMINISTRATIVO E GESTÃO PÚBLICA",
    subject: "5.11.2 Planejamento e gestão estratégica.",
    assunto: "5.11.2 Planejamento e gestão estratégica.",
    reference: "Anexo I, item 5.11.2",
    status: "Não iniciado"
  };
}

function realState() {
  return {
    planning: {},
    migrations: {},
    syllabusItems: [
      targetItem(),
      { id: "leg-259", discipline: "LEGISLAÇÃO ESTADUAL E INSTITUCIONAL", subject: "Estruturação das carreiras da Polícia Civil do Estado do Paraná: Lei Complementar Estadual n.º 259, de 21 de julho de 2023, e suas alterações posteriores." }
    ],
    dailyGoals: [
      ordinary("pp", "DIREITO PROCESSUAL PENAL", "Prisão e Liberdade Provisória", { actualMinutes: 43, status: "Em andamento" }),
      ordinary("dh", "DIREITOS HUMANOS", "Declaração Universal dos Direitos Humanos (1948)"),
      ordinary("peca", "PEÇA PARA DELEGADO DE POLÍCIA CIVIL", "Auto de Prisão em Flagrante / Despacho Pós-Flagrante"),
      ordinary("cf", "CIÊNCIAS FORENSES", "Análise de documentos.", { status: "Concluída" }),
      ordinary("crim", "CRIMINOLOGIA", "Teorias sociológicas", { status: "Concluída" }),
      ordinary("dp", "DIREITO PENAL", "Teoria da Pena", { status: "Concluída", actualMinutes: 111 }),
      ordinary("wrong", "LEGISLAÇÃO ESTADUAL E INSTITUCIONAL", "Estruturação das carreiras da Polícia Civil do Estado do Paraná: Lei Complementar Estadual n.º 259, de 21 de julho de 2023, e suas alterações posteriores.", { syllabusItemId: "leg-259", minutes: 75 })
    ]
  };
}

function run(targetState) {
  let saves = 0;
  let renders = 0;
  let syncs = 0;
  let marks = 0;
  let originalAlignCalls = 0;
  const context = {
    console,
    state: targetState,
    ensureDailyPlanAlignedWithPlanningV174() {
      originalAlignCalls += 1;
      return { changed: true, report: { removed: ["wrong"] } };
    },
    markDailyPlanAlignmentV174() { marks += 1; },
    saveData() { saves += 1; return true; },
    autoSyncAfterSave() { syncs += 1; },
    render() { renders += 1; },
    window: { addEventListener() {} },
    module: { exports: {} },
    exports: {},
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
  return { context, state: targetState, saves, renders, syncs, marks, getOriginalAlignCalls: () => originalAlignCalls };
}

test("V393 corrige exatamente a meta errada da captura e mantém 7 metas", () => {
  const result = run(realState());
  assert.equal(result.state.dailyGoals.length, 7);
  const corrected = result.state.dailyGoals.find((goal) => goal.id === "wrong");
  assert.equal(corrected.discipline, "DIREITO ADMINISTRATIVO E GESTÃO PÚBLICA");
  assert.equal(corrected.disciplina, "DIREITO ADMINISTRATIVO E GESTÃO PÚBLICA");
  assert.equal(corrected.subject, "Planejamento e gestão estratégica.");
  assert.equal(corrected.assunto, "Planejamento e gestão estratégica.");
  assert.equal(corrected.baseSubject, "Planejamento e gestão estratégica.");
  assert.equal(corrected.syllabusItemId, "pcpr-admin-5-11-2");
  assert.equal(corrected.correctedBy, "20260824-explicit-daily-plan-alignment-v393");
  assert.equal(result.context.__ALDUS_DAILY_PLAN_EXPLICIT_ALIGNMENT_V393__.changed, true);
  assert.equal(result.context.__ALDUS_DAILY_PLAN_EXPLICIT_ALIGNMENT_V393__.total, 7);
  assert.equal(result.saves, 1);
  assert.equal(result.renders, 1);
  assert.equal(result.syncs, 1);
  assert.equal(result.marks, 1);
});

test("V393 bloqueia reconciliação automática e só libera chamada explicitamente autorizada", () => {
  const result = run(realState());
  const automatic = result.context.ensureDailyPlanAlignedWithPlanningV174(result.state, "2026-08-24");
  assert.equal(automatic.changed, false);
  assert.equal(automatic.skipped, "20260824-explicit-daily-plan-alignment-v393");
  assert.equal(result.getOriginalAlignCalls(), 0);

  const explicit = result.context.ensureDailyPlanAlignedWithPlanningV174(result.state, "2026-08-24", { explicit: true });
  assert.equal(explicit.changed, true);
  assert.equal(result.getOriginalAlignCalls(), 1);
});

test("V393 não troca uma meta executada nem cria oitava meta", () => {
  const executed = realState();
  executed.dailyGoals.find((goal) => goal.id === "wrong").actualMinutes = 10;
  const protectedResult = run(executed);
  assert.equal(protectedResult.context.__ALDUS_DAILY_PLAN_EXPLICIT_ALIGNMENT_V393__.skipped, "wrong-replacement-has-execution");
  assert.equal(executed.dailyGoals.find((goal) => goal.id === "wrong").discipline, "LEGISLAÇÃO ESTADUAL E INSTITUCIONAL");
  assert.equal(protectedResult.saves, 0);

  const eight = realState();
  eight.dailyGoals.push(ordinary("extra", "OUTRA", "Outra meta"));
  const fullResult = run(eight);
  assert.equal(fullResult.context.__ALDUS_DAILY_PLAN_EXPLICIT_ALIGNMENT_V393__.skipped, "unexpected-day-total");
  assert.equal(eight.dailyGoals.length, 8);
  assert.equal(fullResult.saves, 0);
});

test("V393 permanece fora dos hot paths de performance", () => {
  for (const token of [
    "setTimeout(",
    "setInterval(",
    "requestAnimationFrame(",
    "requestIdleCallback(",
    "MutationObserver",
    "getComputedStyle("
  ]) assert.equal(source.includes(token), false, `hot path proibido: ${token}`);

  assert.match(source, /blockAutomaticAlignment/);
  assert.match(source, /options\?\.explicit === true/);
  assert.match(source, /markDailyPlanAlignmentV174/);
});

test("V393 é entregue pelo guard e mantém paridade raiz\/docs", () => {
  assert.equal(source, docsSource);
  assert.equal(startup, docsStartup);
  assert.match(startup, /daily-plan-explicit-alignment-v393\.js/);
  assert.match(startup, /20260824-explicit-daily-plan-alignment-v393/);
  assert.match(startup, /loadExplicitAlignmentV393/);
});
