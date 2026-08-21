const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(root, "planning-quality-v368.js"), "utf8");
const PIECE_DISCIPLINE = "PEÇA PARA DELEGADO DE POLÍCIA CIVIL";
const BANK = "Representação por Quebra de Sigilo Bancário";

function context(state, today = "2026-08-21") {
  const sandbox = {
    state,
    todayISO: () => today,
    performance: { now: () => 1 },
    queueMicrotask: () => {},
    setTimeout: () => 0,
    console,
    globalThis: null
  };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox);
  return sandbox;
}

function pieceGoal(date, subject = BANK, extra = {}) {
  return {
    id: `piece-${date}-${Math.random()}`,
    date,
    discipline: PIECE_DISCIPLINE,
    disciplina: PIECE_DISCIPLINE,
    subject,
    assunto: subject,
    baseSubject: subject,
    type: "Estudo novo",
    origin: "planejamento peça diária",
    status: "Pendente",
    fixedDailyPieceV183: true,
    ...extra
  };
}

test("V368 transforma o cronograma real de uma única Peça em rodízio dos 11 tipos", () => {
  const dailyGoals = [];
  for (let day = 1; day <= 31; day += 1) {
    dailyGoals.push(pieceGoal(`2026-08-${String(day).padStart(2, "0")}`));
  }
  const state = {
    syllabusItems: [{ id: "bank", discipline: PIECE_DISCIPLINE, subject: BANK, classification: "PIECE" }],
    dailyGoals
  };
  const sandbox = context(state);
  const report = sandbox.__aldusPlanningQualityV368.run("test", { persist: false });

  assert.equal(report.catalogAdded, 10);
  assert.equal(state.syllabusItems.filter((item) => item.classification === "PIECE").length, 11);
  const month = state.dailyGoals.map((goal) => goal.subject);
  assert.equal(month.length, 31);
  assert.equal(new Set(month).size, 11);
  assert.ok(month.every((subject, index) => index === 0 || subject !== month[index - 1]));
  assert.notEqual(state.dailyGoals.find((goal) => goal.date === "2026-08-03").subject, BANK);
});

test("V368 preserva Peça manual ou executada e remove somente a automática concorrente", () => {
  const protectedGoal = pieceGoal("2026-08-03", "Representação por Prisão Preventiva", {
    origin: "manual",
    manual: true,
    actualMinutes: 18,
    status: "Em andamento"
  });
  const automatic = pieceGoal("2026-08-03");
  const state = { syllabusItems: [], dailyGoals: [protectedGoal, automatic] };
  const sandbox = context(state);
  const report = sandbox.__aldusPlanningQualityV368.run("test", { persist: false });

  assert.equal(report.pieceDuplicatesRemoved, 1);
  assert.equal(state.dailyGoals.length, 1);
  assert.equal(state.dailyGoals[0], protectedGoal);
  assert.equal(protectedGoal.actualMinutes, 18);
});

test("V368 troca metas automáticas do mês semanticamente parecidas quando há alternativa didática", () => {
  const items = [
    { id: "a", discipline: "DIREITO CONSTITUCIONAL", topic: "Constituição", subject: "Controle de constitucionalidade", status: "Não iniciado" },
    { id: "b", discipline: "DIREITO CONSTITUCIONAL", topic: "Constituição", subject: "Controle da constitucionalidade", status: "Não iniciado" },
    { id: "c", discipline: "DIREITO CONSTITUCIONAL", topic: "Estado", subject: "Organização do Estado", status: "Não iniciado" }
  ];
  const goal = (id, date) => ({
    id: `goal-${id}`,
    date,
    discipline: "DIREITO CONSTITUCIONAL",
    subject: items.find((item) => item.id === id).subject,
    syllabusItemId: id,
    type: "Estudo novo",
    origin: "planejamento",
    status: "Pendente"
  });
  const state = { syllabusItems: items, dailyGoals: [goal("a", "2026-08-06"), goal("b", "2026-08-07")] };
  const sandbox = context(state);
  const report = sandbox.__aldusPlanningQualityV368.run("test", { persist: false });

  assert.equal(report.similarGoalsReplaced, 1);
  assert.equal(state.dailyGoals[0].subject, "Controle de constitucionalidade");
  assert.equal(state.dailyGoals[1].subject, "Organização do Estado");
  assert.equal(state.dailyGoals[1].syllabusItemId, "c");
});

test("V368 qualifica assunto vago com o nível hierárquico disponível", () => {
  const item = {
    id: "forensics",
    discipline: "CIÊNCIAS FORENSES",
    topic: "Criminalística",
    subject: "Conceitos fundamentais.",
    status: "Não iniciado"
  };
  const state = {
    syllabusItems: [item],
    dailyGoals: [{
      id: "goal-forensics",
      date: "2026-08-12",
      discipline: item.discipline,
      subject: item.subject,
      syllabusItemId: item.id,
      type: "Estudo novo",
      origin: "planejamento",
      status: "Pendente"
    }]
  };
  const sandbox = context(state);
  const report = sandbox.__aldusPlanningQualityV368.run("test", { persist: false });

  assert.equal(report.vagueTitlesClarified, 1);
  assert.equal(state.dailyGoals[0].subject, "Criminalística — Conceitos fundamentais.");
});

test("V368 audita o estado imediatamente antes de construir a exportação mensal", () => {
  const state = {
    syllabusItems: [{ id: "bank", discipline: PIECE_DISCIPLINE, subject: BANK, classification: "PIECE" }],
    dailyGoals: [pieceGoal("2026-08-06"), pieceGoal("2026-08-07"), pieceGoal("2026-08-08")]
  };
  const sandbox = {
    state,
    todayISO: () => "2026-08-21",
    buildGoalCalendarExportPayload: () => ({ subjects: state.dailyGoals.map((goal) => goal.subject) }),
    performance: { now: () => 1 },
    queueMicrotask: (callback) => callback(),
    setTimeout: () => 0,
    console,
    globalThis: null
  };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox);

  const payload = sandbox.buildGoalCalendarExportPayload();
  assert.equal(new Set(payload.subjects).size, 3);
  assert.equal(sandbox.__aldusPlanningQualityV368.getLastReport().reason, "before-export-payload");
});

test("V368 reproduz o Excel de agosto: preserva execução e diversifica todas as Peças automáticas pendentes", () => {
  const completed = pieceGoal("2026-08-03", BANK, { status: "Concluída", actualMinutes: 35 });
  const inProgress = pieceGoal("2026-08-05", BANK, { status: "Em andamento", actualMinutes: 12 });
  const pendingDates = ["01", "02", "03", "06", "07", "08", "09", "11", "12", "13", "15", "16", "17", "19", "20", "21", "22", "23", "24", "25", "26", "27", "28", "29", "30", "31"];
  const pending = pendingDates.map((day) => pieceGoal(`2026-08-${day}`));
  const state = {
    syllabusItems: [{ id: "bank", discipline: PIECE_DISCIPLINE, subject: BANK, classification: "PIECE" }],
    dailyGoals: [completed, inProgress, ...pending]
  };
  const sandbox = {
    state,
    todayISO: () => "2026-08-21",
    buildGoalCalendarExportPayload: () => ({ rows: state.dailyGoals.map((goal) => ({ date: goal.date, subject: goal.subject, status: goal.status })) }),
    performance: { now: () => 1 },
    queueMicrotask: (callback) => callback(),
    setTimeout: () => 0,
    console,
    globalThis: null
  };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox);

  const payload = sandbox.buildGoalCalendarExportPayload();
  assert.equal(completed.subject, BANK);
  assert.equal(inProgress.subject, BANK);
  assert.equal(payload.rows.filter((row) => row.date === "2026-08-03").length, 1);
  const pendingRows = payload.rows.filter((row) => row.status === "Pendente");
  assert.ok(new Set(pendingRows.map((row) => row.subject)).size >= 9);
  assert.ok(pendingRows.some((row) => row.date < "2026-08-21" && row.subject !== BANK));
});

test("V368 não cria hot path e mantém execução limitada às rotas e ações de planejamento", () => {
  assert.doesNotMatch(source, /MutationObserver|setInterval|localStorage|indexedDB/);
  assert.equal((source.match(/requestIdleCallback/g) || []).length, 2);
  assert.equal((source.match(/document\.addEventListener\("click"/g) || []).length, 1);
  assert.match(source, /PLANNING_ROUTES\.has\(routeName\(\)\)/);
  assert.match(source, /GENERATION_IDS\.has\(id\)/);
  assert.match(source, /EXPORT_IDS\.has\(id\)/);
});

test("V368 está espelhada e ligada aos dois caminhos de bootstrap publicados", () => {
  assert.equal(source, fs.readFileSync(path.join(root, "docs", "planning-quality-v368.js"), "utf8"));
  assert.equal(
    fs.readFileSync(path.join(root, "timer-goal-integrity-v366.js"), "utf8"),
    fs.readFileSync(path.join(root, "docs", "timer-goal-integrity-v366.js"), "utf8")
  );
  for (const file of ["bootstrap-fast-path-v351.js", "bootstrap-integrity-loader-v258-core.js"]) {
    const rootSource = fs.readFileSync(path.join(root, file), "utf8");
    const docsSource = fs.readFileSync(path.join(root, "docs", file), "utf8");
    assert.equal(rootSource, docsSource, `${file} precisa manter paridade com docs`);
    assert.match(rootSource, /aldusPlanningQualityV368.*planning-quality-v368\.js\?v=20260821-planning-quality-v368/);
    assert.match(rootSource, /aldusTimerGoalIntegrityV366.*timer-goal-integrity-v366\.js\?v=20260821-timer-goal-integrity-v366/);
  }
});
