const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const source = fs.readFileSync("manual-goal-additive-v379.js", "utf8");

function loadRuntime() {
  const context = {
    module: { exports: {} },
    exports: {},
    console,
    Map,
    Set,
    String,
    Object,
    Array,
    Number,
    Date,
    queueMicrotask,
    setTimeout,
    clearTimeout
  };
  vm.createContext(context);
  vm.runInContext(source, context);
  return { api: context.module.exports, context };
}

function automatic(id, date = "2026-08-24") {
  return {
    id,
    date,
    discipline: `Disciplina ${id}`,
    subject: `Assunto ${id}`,
    origin: "planejamento",
    status: "Pendente"
  };
}

function manual(id = "manual", date = "2026-08-24") {
  return {
    id,
    date,
    discipline: "Meta manual",
    subject: "Atividade extra",
    origin: "manual",
    status: "Pendente"
  };
}

test("V379: cinco metas automáticas + uma manual permanecem seis", () => {
  const { api } = loadRuntime();
  const state = {
    dailyGoals: [
      ...Array.from({ length: 5 }, (_, index) => automatic(`auto-${index + 1}`)),
      manual()
    ]
  };

  api.withManualGoalsOutsideQuota(state, () => {
    state.dailyGoals = state.dailyGoals.slice(0, 5);
  });

  assert.equal(state.dailyGoals.length, 6);
  assert.equal(
    JSON.stringify(Array.from(state.dailyGoals, (goal) => goal.id)),
    JSON.stringify(["auto-1", "auto-2", "auto-3", "auto-4", "auto-5", "manual"])
  );
});

test("V379: a cota automática pode ser ajustada sem apagar a meta manual", () => {
  const { api } = loadRuntime();
  const state = {
    dailyGoals: [
      ...Array.from({ length: 6 }, (_, index) => automatic(`auto-${index + 1}`)),
      manual()
    ]
  };

  api.withManualGoalsOutsideQuota(state, () => {
    state.dailyGoals = state.dailyGoals.slice(0, 5);
  });

  assert.equal(state.dailyGoals.length, 6);
  assert.equal(state.dailyGoals.filter((goal) => goal.origin === "planejamento").length, 5);
  assert.equal(state.dailyGoals.filter((goal) => goal.origin === "manual").length, 1);
});

test("V379: seleção do planejamento não conta meta manual na cota", () => {
  const { api, context } = loadRuntime();
  context.selectPlanningGoalsForTargets = ({ existingGoals, topicTarget }) => ({
    needed: topicTarget - existingGoals.length
  });
  api.installGuards();

  const existingGoals = [
    ...Array.from({ length: 4 }, (_, index) => automatic(`auto-${index + 1}`)),
    manual()
  ];
  const result = context.selectPlanningGoalsForTargets({ existingGoals, topicTarget: 5 });
  assert.equal(result.needed, 1);
});

test("V379: recomposição automática também ignora a meta manual na cota", () => {
  const { api, context } = loadRuntime();
  context.replenishMissingDailyPlanningGoalsV116 = (targetState) => {
    const missing = Math.max(0, 5 - targetState.dailyGoals.length);
    for (let index = 0; index < missing; index += 1) {
      targetState.dailyGoals.push(automatic(`nova-${index + 1}`));
    }
    return {
      changed: missing > 0,
      added: Array.from({ length: missing }, (_, index) => `nova-${index + 1}`)
    };
  };

  const state = {
    dailyGoals: [
      ...Array.from({ length: 4 }, (_, index) => automatic(`auto-${index + 1}`)),
      manual()
    ]
  };
  const report = api.ensureAutomaticQuota(state, "2026-08-24");

  assert.equal(report.changed, true);
  assert.equal(state.dailyGoals.filter((goal) => goal.origin === "planejamento").length, 5);
  assert.equal(state.dailyGoals.filter((goal) => goal.origin === "manual").length, 1);
  assert.equal(state.dailyGoals.length, 6);
});

test("V379: snapshot restaura meta automática removida quando existe meta manual", () => {
  const { api } = loadRuntime();
  const automaticPiece = {
    ...automatic("peca-auto"),
    discipline: "PEÇA PARA DELEGADO DE POLÍCIA CIVIL",
    subject: "Relatório Final de Inquérito Policial"
  };
  const manualPiece = {
    ...manual("peca-manual"),
    discipline: "PEÇA PARA DELEGADO DE POLÍCIA CIVIL",
    subject: "Representação por Prisão Preventiva"
  };
  const state = { dailyGoals: [automaticPiece, manualPiece] };
  const snapshot = new Map([["2026-08-24", api.snapshotDate(state, "2026-08-24")]]);

  state.dailyGoals = [manualPiece];

  assert.equal(api.restoreSnapshot(state, snapshot), 1);
  assert.equal(state.dailyGoals.length, 2);
  assert.ok(state.dailyGoals.some((goal) => goal.id === "peca-auto"));
});

test("V401: meta anterior da semana cria execução manual no Plano do Dia atual", () => {
  const { api } = loadRuntime();
  const original = {
    id: "meta-terca",
    date: "2026-08-25",
    data: "2026-08-25",
    syllabusItemId: "item-1",
    discipline: "Direito Penal",
    subject: "Crimes contra a dignidade sexual",
    origin: "planejamento",
    status: "Em andamento",
    minutes: 60,
    studyActualMinutes: 20,
    questionActualMinutes: 0,
    actualMinutes: 20
  };
  const state = { dailyGoals: [original] };

  const report = api.ensureTodayExecutionGoal(original, state, "2026-08-26");

  assert.equal(report.created, true);
  assert.equal(report.goal.date, "2026-08-26");
  assert.equal(report.goal.data, "2026-08-26");
  assert.equal(report.goal.minutes, 40);
  assert.equal(report.goal.actualMinutes, 0);
  assert.equal(report.goal.status, "Pendente");
  assert.equal(report.goal.manual, true);
  assert.equal(report.goal.resumedFromGoalId, "meta-terca");
  assert.equal(report.goal.resumedFromDate, "2026-08-25");
  assert.equal(original.date, "2026-08-25");
  assert.equal(original.actualMinutes, 20);
  assert.equal(state.dailyGoals.length, 2);
});

test("V401: clicar novamente na mesma meta antiga no mesmo dia não duplica a retomada", () => {
  const { api } = loadRuntime();
  const original = {
    id: "meta-antiga",
    date: "2026-08-24",
    syllabusItemId: "item-2",
    discipline: "Direito Administrativo",
    subject: "Atos administrativos",
    origin: "planejamento",
    status: "Pendente",
    minutes: 50
  };
  const state = { dailyGoals: [original] };

  const first = api.ensureTodayExecutionGoal(original, state, "2026-08-26");
  const second = api.ensureTodayExecutionGoal(original, state, "2026-08-26");

  assert.equal(first.created, true);
  assert.equal(second.created, false);
  assert.equal(second.reused, true);
  assert.equal(second.goal.id, first.goal.id);
  assert.equal(state.dailyGoals.length, 2);
});

test("V401: meta equivalente já existente hoje é reutilizada em vez de criar cópia", () => {
  const { api } = loadRuntime();
  const oldGoal = {
    id: "meta-segunda",
    date: "2026-08-24",
    syllabusItemId: "item-3",
    discipline: "Processo Penal",
    subject: "Citações e intimações",
    status: "Pendente",
    minutes: 50
  };
  const todayGoal = {
    id: "meta-hoje",
    date: "2026-08-26",
    syllabusItemId: "item-3",
    discipline: "Processo Penal",
    subject: "Citações e intimações",
    status: "Pendente",
    minutes: 50
  };
  const state = { dailyGoals: [oldGoal, todayGoal] };

  const report = api.ensureTodayExecutionGoal(oldGoal, state, "2026-08-26");

  assert.equal(report.created, false);
  assert.equal(report.reused, true);
  assert.equal(report.goal.id, "meta-hoje");
  assert.equal(state.dailyGoals.length, 2);
});

test("V401: não transporta automaticamente meta de semana anterior", () => {
  const { api } = loadRuntime();
  const oldGoal = {
    id: "meta-fora-semana",
    date: "2026-08-22",
    discipline: "Constitucional",
    subject: "Segurança pública",
    status: "Pendente",
    minutes: 50
  };
  const state = { dailyGoals: [oldGoal] };

  const report = api.ensureTodayExecutionGoal(oldGoal, state, "2026-08-26");

  assert.equal(report.created, false);
  assert.equal(report.eligible, false);
  assert.equal(report.goal, oldGoal);
  assert.equal(state.dailyGoals.length, 1);
});

test("V401: meta já concluída pode ser refeita hoje sem reaproveitar tempo anterior", () => {
  const { api } = loadRuntime();
  const doneGoal = {
    id: "meta-concluida",
    date: "2026-08-25",
    syllabusItemId: "item-4",
    discipline: "Direitos Humanos",
    subject: "DUDH",
    status: "Concluída",
    completed: true,
    minutes: 60,
    studyActualMinutes: 65,
    actualMinutes: 65
  };
  const state = { dailyGoals: [doneGoal] };

  const report = api.ensureTodayExecutionGoal(doneGoal, state, "2026-08-26");

  assert.equal(report.created, true);
  assert.equal(report.goal.minutes, 60);
  assert.equal(report.goal.studyActualMinutes, 0);
  assert.equal(report.goal.actualMinutes, 0);
  assert.equal(report.goal.completed, false);
  assert.equal(doneGoal.completed, true);
});

test("V401: cronômetro e registro manual de tempo são envolvidos pela retomada", () => {
  assert.match(source, /wrapResumeAction\("startFloatingTimer"\)/);
  assert.match(source, /wrapResumeAction\("registerGoalTime", true\)/);
  assert.match(source, /skipDerivedRefresh: true/);
  assert.match(source, /resumedFromGoalId/);
});

test("V379/V401: guard permanece fora dos hot paths de performance", () => {
  assert.ok(Buffer.byteLength(source, "utf8") < 18000);
  assert.equal(source.includes("MutationObserver"), false);
  assert.equal(source.includes("setInterval("), false);
  assert.equal(source.includes("getComputedStyle("), false);
  assert.equal(source.includes("requestAnimationFrame("), false);
});

test("V379/V401: publicação raiz/docs é idêntica e carregada pelo observability", () => {
  const docsSource = fs.readFileSync("docs/manual-goal-additive-v379.js", "utf8");
  const loader = fs.readFileSync("security-observability-v318.js", "utf8");
  const docsLoader = fs.readFileSync("docs/security-observability-v318.js", "utf8");

  assert.equal(docsSource, source);
  assert.equal(docsLoader, loader);
  assert.match(loader, /manual-goal-additive-v379\.js\?v=20260826-manual-goal-additive-v401-previous-goal-resume-today/);
  assert.match(loader, /installManualGoalAdditiveV379\(\)/);
});
