const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(root, "planning-quality-v368.js"), "utf8");
const appSource = fs.readFileSync(path.join(root, "script.js"), "utf8");
const PIECE_DISCIPLINE = "PEÇA PARA DELEGADO DE POLÍCIA CIVIL";
const BANK = "Representação por Quebra de Sigilo Bancário";
const ALLOWED_PIECES = new Set([
  "Relatório Final de Inquérito Policial",
  "Auto de Prisão em Flagrante / Despacho Pós-Flagrante",
  "Representação por Prisão Preventiva",
  "Representação por Prisão Temporária"
]);

const originClassifierSource = appSource.match(/function isManualDailyGoal\(goal\) \{[^\n]+\}/)?.[0];

function installRealOriginClassifier(sandbox) {
  assert.ok(originClassifierSource, "O classificador real de origens automáticas precisa estar presente no bundle-fonte.");
  sandbox.canonical = (value) => String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
  vm.runInContext(`${originClassifierSource}\nglobalThis.isManualDailyGoal = isManualDailyGoal;`, sandbox);
}

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
  installRealOriginClassifier(sandbox);
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

test("V371 restringe a meta diária às quatro Peças autorizadas com aleatoriedade controlada", () => {
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

  assert.equal(report.catalogAdded, 4);
  assert.equal(state.syllabusItems.filter((item) => ALLOWED_PIECES.has(item.subject)).length, 4);
  const month = state.dailyGoals.map((goal) => goal.subject);
  assert.equal(month.length, 31);
  assert.equal(new Set(month).size, 4);
  assert.ok(month.every((subject) => ALLOWED_PIECES.has(subject)));
  assert.ok(month.every((subject, index) => index === 0 || subject !== month[index - 1]));
  const counts = [...month.reduce((map, subject) => map.set(subject, (map.get(subject) || 0) + 1), new Map()).values()];
  assert.ok(Math.max(...counts) - Math.min(...counts) <= 1);
});

test("V371 reconhece a marca automática legada mesmo quando a origem está vazia", () => {
  const goals = ["06", "07", "08"].map((day) => pieceGoal(`2026-08-${day}`, BANK, { origin: "", origem: "" }));
  const state = {
    syllabusItems: [{ id: "bank", discipline: PIECE_DISCIPLINE, subject: BANK, classification: "PIECE" }],
    dailyGoals: goals
  };
  const sandbox = context(state);

  assert.equal(sandbox.isManualDailyGoal(goals[0]), true,
    "A fixture precisa reproduzir a classificação incorreta que existia no bundle real.");
  assert.equal(sandbox.isManualDailyGoal({ origin: "manual" }), true);
  sandbox.__aldusPlanningQualityV368.run("legacy-classifier-regression", { persist: false });
  assert.equal(new Set(state.dailyGoals.map((goal) => goal.subject)).size, 3,
    "A política V371 deve usar a marca fixa V183 e diversificar as Peças automáticas legadas.");
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

test("V397 mantém a exportação mensal estritamente somente leitura", () => {
  const state = {
    syllabusItems: [{ id: "bank", discipline: PIECE_DISCIPLINE, subject: BANK, classification: "PIECE" }],
    dailyGoals: [pieceGoal("2026-08-06"), pieceGoal("2026-08-07"), pieceGoal("2026-08-08")]
  };
  const before = JSON.stringify(state);
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
  installRealOriginClassifier(sandbox);
  vm.runInContext(source, sandbox);

  const payload = sandbox.buildGoalCalendarExportPayload();
  assert.equal(JSON.stringify(state), before, "Exportar não pode alterar o planejamento em memória.");
  assert.equal(new Set(payload.subjects).size, 1, "A exportação deve refletir exatamente o estado salvo.");
  assert.equal(sandbox.__aldusPlanningQualityV368.getLastReport(), null);
});

test("V397 preserva execução e repara Peças somente após geração explícita: preserva execução e usa somente as quatro Peças autorizadas", () => {
  const executed = [
    pieceGoal("2026-08-03", BANK, { status: "Concluída", actualMinutes: 35 }),
    pieceGoal("2026-08-04", BANK, { status: "Concluída", actualMinutes: 17 }),
    pieceGoal("2026-08-05", BANK, { status: "Em andamento", actualMinutes: 12 }),
    pieceGoal("2026-08-05", BANK, { status: "Concluída", actualMinutes: 21 }),
    pieceGoal("2026-08-10", BANK, { status: "Concluída", actualMinutes: 30 }),
    pieceGoal("2026-08-14", BANK, { status: "Concluída", actualMinutes: 45 }),
    pieceGoal("2026-08-18", BANK, { status: "Concluída", actualMinutes: 20 })
  ];
  const pendingDates = ["01", "02", "06", "07", "08", "09", "11", "12", "13", "15", "16", "17", "19", "20", "21", "22", "23", "24", "25", "26", "27", "28", "29", "30", "31"];
  const pending = pendingDates.map((day) => pieceGoal(`2026-08-${day}`, BANK, { origin: "", origem: "" }));
  const state = {
    syllabusItems: [{ id: "bank", discipline: PIECE_DISCIPLINE, subject: BANK, classification: "PIECE" }],
    dailyGoals: [...executed, ...pending]
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
  installRealOriginClassifier(sandbox);
  vm.runInContext(source, sandbox);

  sandbox.__aldusPlanningQualityV368.run("explicit-generation", { persist: false, render: false, sync: false });
  const payload = sandbox.buildGoalCalendarExportPayload();
  assert.ok(executed.every((goal) => goal.subject === BANK));
  assert.equal(payload.rows.filter((row) => row.status !== "Pendente").length, 7);
  const pendingRows = payload.rows.filter((row) => row.status === "Pendente");
  const pendingCounts = new Map();
  pendingRows.forEach((row) => pendingCounts.set(row.subject, (pendingCounts.get(row.subject) || 0) + 1));
  assert.equal(pendingRows.length, 25);
  assert.equal(pendingCounts.has(BANK), false, "Peças fora do conjunto autorizado não devem voltar para a fila pendente.");
  assert.equal(pendingCounts.size, 4);
  assert.ok([...pendingCounts.keys()].every((subject) => ALLOWED_PIECES.has(subject)));
  assert.ok(Math.max(...pendingCounts.values()) - Math.min(...pendingCounts.values()) <= 1);
  assert.ok(pendingRows.every((row, index) => index === 0 || row.subject !== pendingRows[index - 1].subject));
});

test("V397 não cria hot path e não executa reparos em eventos passivos", () => {
  assert.doesNotMatch(source, /MutationObserver|setInterval|localStorage|indexedDB/);
  assert.equal((source.match(/requestIdleCallback/g) || []).length, 0);
  assert.equal((source.match(/document\.addEventListener\("click"/g) || []).length, 1);
  assert.match(source, /PLANNING_ROUTES\.has\(routeName\(\)\)/);
  assert.match(source, /GENERATION_IDS\.has\(id\)/);
  assert.doesNotMatch(source, /before-export-payload|planning-route-entered|post-bootstrap-maintenance/);
});

test("V397 está espelhada e ligada aos dois caminhos de bootstrap publicados", () => {
  assert.equal(source, fs.readFileSync(path.join(root, "docs", "planning-quality-v368.js"), "utf8"));
  assert.equal(
    fs.readFileSync(path.join(root, "timer-goal-integrity-v366.js"), "utf8"),
    fs.readFileSync(path.join(root, "docs", "timer-goal-integrity-v366.js"), "utf8")
  );
  for (const file of ["bootstrap-fast-path-v351.js", "bootstrap-integrity-loader-v258-core.js"]) {
    const rootSource = fs.readFileSync(path.join(root, file), "utf8");
    const docsSource = fs.readFileSync(path.join(root, "docs", file), "utf8");
    assert.equal(rootSource, docsSource, `${file} precisa manter paridade com docs`);
    assert.match(rootSource, /aldusPlanningQualityV368.*planning-quality-v368\.js\?v=20260826-planning-stability-v397/);
    assert.match(rootSource, /aldusTimerGoalIntegrityV366.*timer-goal-integrity-v366\.js\?v=20260821-timer-goal-integrity-v366/);
  }
});
