const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(root, "planning-quality-v367.js"), "utf8");
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

test("V367 transforma o cronograma real de uma única Peça em rodízio dos 11 tipos", () => {
  const dailyGoals = [];
  for (let day = 1; day <= 31; day += 1) {
    dailyGoals.push(pieceGoal(`2026-08-${String(day).padStart(2, "0")}`));
  }
  const state = {
    syllabusItems: [{ id: "bank", discipline: PIECE_DISCIPLINE, subject: BANK, classification: "PIECE" }],
    dailyGoals
  };
  const sandbox = context(state);
  const report = sandbox.__aldusPlanningQualityV367.run("test", { persist: false });

  assert.equal(report.catalogAdded, 10);
  assert.equal(state.syllabusItems.filter((item) => item.classification === "PIECE").length, 11);
  assert.ok(state.dailyGoals.filter((goal) => goal.date < "2026-08-21").every((goal) => goal.subject === BANK));
  const future = state.dailyGoals.filter((goal) => goal.date >= "2026-08-21").map((goal) => goal.subject);
  assert.equal(future.length, 11);
  assert.equal(new Set(future).size, 11);
  assert.equal(future[0], "Representação por Quebra de Sigilo Fiscal");
  assert.equal(future.at(-1), BANK);
});

test("V367 preserva Peça manual ou executada e remove somente a automática concorrente", () => {
  const protectedGoal = pieceGoal("2026-08-21", "Representação por Prisão Preventiva", {
    origin: "manual",
    manual: true,
    actualMinutes: 18,
    status: "Em andamento"
  });
  const automatic = pieceGoal("2026-08-21");
  const state = { syllabusItems: [], dailyGoals: [protectedGoal, automatic] };
  const sandbox = context(state);
  const report = sandbox.__aldusPlanningQualityV367.run("test", { persist: false });

  assert.equal(report.pieceDuplicatesRemoved, 1);
  assert.equal(state.dailyGoals.length, 1);
  assert.equal(state.dailyGoals[0], protectedGoal);
  assert.equal(protectedGoal.actualMinutes, 18);
});

test("V367 troca metas futuras semanticamente parecidas quando há alternativa didática", () => {
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
  const state = { syllabusItems: items, dailyGoals: [goal("a", "2026-08-21"), goal("b", "2026-08-22")] };
  const sandbox = context(state);
  const report = sandbox.__aldusPlanningQualityV367.run("test", { persist: false });

  assert.equal(report.similarGoalsReplaced, 1);
  assert.equal(state.dailyGoals[0].subject, "Controle de constitucionalidade");
  assert.equal(state.dailyGoals[1].subject, "Organização do Estado");
  assert.equal(state.dailyGoals[1].syllabusItemId, "c");
});

test("V367 qualifica assunto vago com o nível hierárquico disponível", () => {
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
      date: "2026-08-21",
      discipline: item.discipline,
      subject: item.subject,
      syllabusItemId: item.id,
      type: "Estudo novo",
      origin: "planejamento",
      status: "Pendente"
    }]
  };
  const sandbox = context(state);
  const report = sandbox.__aldusPlanningQualityV367.run("test", { persist: false });

  assert.equal(report.vagueTitlesClarified, 1);
  assert.equal(state.dailyGoals[0].subject, "Criminalística — Conceitos fundamentais.");
});

test("V367 não cria hot path e mantém execução limitada às rotas e ações de planejamento", () => {
  assert.doesNotMatch(source, /MutationObserver|setInterval|localStorage|indexedDB/);
  assert.equal((source.match(/requestIdleCallback/g) || []).length, 2);
  assert.equal((source.match(/document\.addEventListener\("click"/g) || []).length, 1);
  assert.match(source, /PLANNING_ROUTES\.has\(routeName\(\)\)/);
  assert.match(source, /GENERATION_IDS\.has\(id\)/);
  assert.match(source, /EXPORT_IDS\.has\(id\)/);
});

test("V367 permanece arquivada e sua sucessora corrigida está ligada aos dois caminhos de bootstrap", () => {
  assert.equal(source, fs.readFileSync(path.join(root, "docs", "planning-quality-v367.js"), "utf8"));
  assert.equal(
    fs.readFileSync(path.join(root, "timer-goal-integrity-v366.js"), "utf8"),
    fs.readFileSync(path.join(root, "docs", "timer-goal-integrity-v366.js"), "utf8")
  );
  for (const file of ["bootstrap-fast-path-v351.js", "bootstrap-integrity-loader-v258-core.js"]) {
    const rootSource = fs.readFileSync(path.join(root, file), "utf8");
    const docsSource = fs.readFileSync(path.join(root, "docs", file), "utf8");
    assert.equal(rootSource, docsSource, `${file} precisa manter paridade com docs`);
    assert.match(rootSource, /aldusPlanningQualityV368.*planning-quality-v368\.js\?v=20260821-planning-quality-v370/);
    assert.match(rootSource, /aldusTimerGoalIntegrityV366.*timer-goal-integrity-v366\.js\?v=20260821-timer-goal-integrity-v366/);
  }
});
