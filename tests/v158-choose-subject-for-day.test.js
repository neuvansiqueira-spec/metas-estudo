const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const script = read("script.js");
const html = read("index.html");
const css = read("style.css");

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function item(id, discipline, subject) {
  return { id, discipline, subject, status: "Não iniciado", domain: "Não avaliado", priority: "Alta" };
}

function goal(id, syllabusItemId, date, overrides = {}) {
  return {
    id,
    syllabusItemId,
    date,
    data: date,
    discipline: `Disciplina ${syllabusItemId}`,
    subject: `Assunto ${syllabusItemId}`,
    type: "Estudo novo",
    tipo: "estudo novo",
    minutes: 60,
    status: "Pendente",
    origin: "planejamento",
    origem: "planejamento",
    ...overrides
  };
}

function stateFixture({ targetTopics = 2 } = {}) {
  return {
    targetTopics,
    syllabusItems: [
      item("item-1", "Direito Penal", "Teoria do Crime"),
      item("item-2", "Direito Constitucional", "Poder Constituinte"),
      item("item-3", "Direito Administrativo", "Atos Administrativos")
    ],
    dailyGoals: [],
    studies: [{ id: "study-protected", minutes: 30 }],
    questionLogs: [{ id: "question-protected", total: 10 }],
    smartReviews: [{ id: "review-protected" }],
    simulados: [{ id: "mock-protected" }],
    materials: [{ id: "material-protected" }],
    questionBankSessions: [{ id: "session-protected" }]
  };
}

function runtime(targetState) {
  const start = script.indexOf('const USER_SELECTED_GOAL_ORIGIN_V158');
  const end = script.indexOf("function generateDailyGoals", start);
  assert.ok(start >= 0 && end > start);
  let sequence = 0;
  const localISODate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };
  const context = {
    state: targetState,
    todayISO: () => "2026-07-27",
    localISODate,
    goalDateValue: (record = {}) => record.date || record.data || "",
    isPlanningStudyGoal: () => true,
    isGoalDone: (record = {}) => record.status === "Concluída",
    isGoalInProgress: (record = {}) => record.status === "Em andamento",
    goalTotalActualMinutes: (record = {}) => Number(record.actualMinutes) || 0,
    planningTargetsForDate: (_date, state) => ({ topics: state.targetTopics }),
    planningItemKey: (record = {}) => String(record.syllabusItemId || `${record.discipline}|${record.subject}`),
    addDays: (date, offset) => {
      const parsed = new Date(`${date}T12:00:00`);
      parsed.setDate(parsed.getDate() + offset);
      return localISODate(parsed);
    },
    buildPlanningScoreContext: () => ({ itemMetrics: new Map() }),
    planningGoalTypeForItemV157: () => "Estudo novo",
    makeGoal: (selectedItem, date, type) => [goal(`new-${++sequence}`, selectedItem.id, date, {
      discipline: selectedItem.discipline,
      subject: selectedItem.subject,
      type,
      tipo: type.toLowerCase(),
      origin: "edital verticalizado",
      origem: "edital verticalizado"
    })],
    appendGoalHistory: (record, text) => {
      record.history ||= [];
      record.history.push({ at: "2026-07-27T12:00:00.000Z", text });
    },
    formatDateBR: (date) => date,
    console,
    Date,
    Map,
    Set,
    Math,
    Number,
    String,
    Object,
    Array,
    JSON
  };
  vm.createContext(context);
  vm.runInContext(`${script.slice(start, end)}; api = {
    isPendingReplacementGoalV158,
    selectedSubjectDayCapacityV158,
    scheduleSelectedSubjectForDayV158
  };`, context);
  return context.api;
}

test("interface oferece disciplina, assunto e data dentro do Plano do Dia", () => {
  assert.match(html, /<summary>Escolher assunto para este dia<\/summary>/);
  assert.match(html, /id="chooseSubjectForDayDate" type="date"/);
  assert.match(html, /id="chooseSubjectForDayDiscipline"/);
  assert.match(html, /id="chooseSubjectForDayItem"/);
  assert.match(html, /id="chooseSubjectReplacementGoal"/);
  assert.match(css, /\.choose-subject-day-panel/);
});

test("assunto escolhido entra exatamente na data informada, inclusive hoje", () => {
  const state = stateFixture();
  state.dailyGoals.push(goal("g1", "item-1", "2026-07-27"));
  const api = runtime(state);
  const report = clone(api.scheduleSelectedSubjectForDayV158(state, {
    date: "2026-07-27",
    syllabusItemId: "item-3"
  }));
  const selected = state.dailyGoals.find((record) => record.id === report.selectedGoalId);

  assert.equal(report.changed, true);
  assert.equal(report.code, "added");
  assert.equal(selected.date, "2026-07-27");
  assert.equal(selected.data, "2026-07-27");
  assert.equal(selected.syllabusItemId, "item-3");
  assert.equal(selected.origin, "escolha do usuário");
});

test("dia cheio exige escolha explícita e não altera dados se ela faltar", () => {
  const state = stateFixture();
  state.dailyGoals.push(
    goal("g1", "item-1", "2026-07-27"),
    goal("g2", "item-2", "2026-07-27")
  );
  const before = clone(state);
  const api = runtime(state);
  const report = clone(api.scheduleSelectedSubjectForDayV158(state, {
    date: "2026-07-27",
    syllabusItemId: "item-3"
  }));

  assert.equal(report.changed, false);
  assert.equal(report.code, "replacement-required");
  assert.deepEqual(state, before);
});

test("substituição move somente a meta escolhida e preserva seu UUID", () => {
  const state = stateFixture();
  const untouched = goal("g1", "item-1", "2026-07-27");
  const replaced = goal("g2", "item-2", "2026-07-27");
  state.dailyGoals.push(untouched, replaced);
  const protectedBefore = clone({
    untouched,
    studies: state.studies,
    questionLogs: state.questionLogs,
    smartReviews: state.smartReviews,
    simulados: state.simulados,
    materials: state.materials,
    questionBankSessions: state.questionBankSessions
  });
  const api = runtime(state);
  const report = clone(api.scheduleSelectedSubjectForDayV158(state, {
    date: "2026-07-27",
    syllabusItemId: "item-3",
    replacementGoalId: "g2"
  }));

  assert.equal(report.changed, true);
  assert.equal(report.code, "replaced");
  assert.equal(report.replacementGoalId, "g2");
  assert.equal(replaced.id, "g2");
  assert.equal(replaced.date, "2026-07-28");
  assert.equal(replaced.status, "Pendente");
  assert.equal(state.dailyGoals.filter((record) => record.date === "2026-07-27").length, 2);
  assert.equal(new Set(state.dailyGoals.map((record) => record.id)).size, state.dailyGoals.length);
  assert.deepEqual(untouched, protectedBefore.untouched);
  assert.deepEqual(state.studies, protectedBefore.studies);
  assert.deepEqual(state.questionLogs, protectedBefore.questionLogs);
  assert.deepEqual(state.smartReviews, protectedBefore.smartReviews);
  assert.deepEqual(state.simulados, protectedBefore.simulados);
  assert.deepEqual(state.materials, protectedBefore.materials);
  assert.deepEqual(state.questionBankSessions, protectedBefore.questionBankSessions);
});

test("meta futura do assunto é antecipada e troca de data sem duplicação", () => {
  const state = stateFixture();
  state.dailyGoals.push(
    goal("g1", "item-1", "2026-07-27"),
    goal("g2", "item-2", "2026-07-27"),
    goal("future-selected", "item-3", "2026-08-02")
  );
  const api = runtime(state);
  const report = clone(api.scheduleSelectedSubjectForDayV158(state, {
    date: "2026-07-27",
    syllabusItemId: "item-3",
    replacementGoalId: "g2"
  }));

  assert.equal(report.reusedFutureGoal, true);
  assert.equal(report.selectedGoalId, "future-selected");
  assert.equal(state.dailyGoals.find((record) => record.id === "future-selected").date, "2026-07-27");
  assert.equal(state.dailyGoals.find((record) => record.id === "g2").date, "2026-08-02");
  assert.equal(state.dailyGoals.filter((record) => record.syllabusItemId === "item-3").length, 1);

  const snapshot = clone(state);
  const second = clone(api.scheduleSelectedSubjectForDayV158(state, {
    date: "2026-07-27",
    syllabusItemId: "item-3"
  }));
  assert.equal(second.changed, false);
  assert.equal(second.code, "already-scheduled");
  assert.deepEqual(state, snapshot);
});

test("meta concluída ou em andamento nunca pode ser escolhida para sair", () => {
  const state = stateFixture({ targetTopics: 1 });
  state.dailyGoals.push(goal("in-progress", "item-1", "2026-07-27", {
    status: "Em andamento",
    actualMinutes: 20
  }));
  const before = clone(state);
  const api = runtime(state);
  const report = clone(api.scheduleSelectedSubjectForDayV158(state, {
    date: "2026-07-27",
    syllabusItemId: "item-3",
    replacementGoalId: "in-progress"
  }));

  assert.equal(report.changed, false);
  assert.equal(report.code, "invalid-replacement");
  assert.deepEqual(state, before);
});

test("fluxo persiste e sincroniza sem limpar storages ou recriar planejamento", () => {
  const start = script.indexOf('const USER_SELECTED_GOAL_ORIGIN_V158');
  const source = script.slice(
    start,
    script.indexOf("elements.planningDayModes?.addEventListener", start)
  );
  assert.match(source, /saveData\(\{ markLocalChange: true \}\)/);
  assert.match(source, /autoSyncAfterSave\("choose-subject-for-day"\)/);
  assert.doesNotMatch(source, /localStorage\.clear|indexedDB\.deleteDatabase|clearProjectLocalStorage|reconcileDailyGoalsWithPlanning\(state, report\.date/);
});
