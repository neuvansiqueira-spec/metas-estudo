const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(root, "planning-variety-v357.js"), "utf8");

function makeContext(route = "#metas-do-dia") {
  const listeners = new Map();
  let idleCallback = null;
  const context = {
    console,
    Date,
    Map,
    Set,
    Object,
    String,
    Number,
    Array,
    Boolean,
    Math,
    JSON,
    location: { hash: route },
    performance: { now: (() => { let value = 0; return () => ++value; })() },
    requestIdleCallback(callback) { idleCallback = callback; return 1; },
    cancelIdleCallback() { idleCallback = null; },
    setTimeout(callback) { callback(); return 1; },
    queueMicrotask(callback) { callback(); },
    addEventListener(type, listener) {
      const entries = listeners.get(type) || [];
      entries.push(listener);
      listeners.set(type, entries);
    },
    dispatchEvent(event) {
      for (const listener of listeners.get(event.type) || []) listener(event);
    }
  };
  context.window = context;
  context.globalThis = context;
  context.flushIdle = () => { const callback = idleCallback; idleCallback = null; callback?.(); };
  vm.createContext(context);
  vm.runInContext(source, context, { filename: "planning-variety-v357.js" });
  return context;
}

test("V357 oferece os 11 tipos de Peça sem persistir itens virtuais no edital", () => {
  const context = makeContext();
  let visiblePieces = 0;
  context.state = {
    syllabusItems: [{ id: "real-piece", discipline: "PEÇA PARA DELEGADO DE POLÍCIA CIVIL", subject: "Representação por Prisão Preventiva", status: "Não iniciado" }],
    dailyGoals: []
  };
  context.__aldusDailyDelegatePieceGoalV183 = Object.freeze({
    ensureDailyPieceForDate(date, targetState) {
      visiblePieces = targetState.syllabusItems.filter((item) => /delegado/i.test(item.discipline || "")).length;
      const virtual = targetState.syllabusItems.find((item) => String(item.id).startsWith("v357-piece:"));
      const goal = { id: "goal-piece", date, discipline: virtual.discipline, subject: virtual.subject, syllabusItemId: virtual.id, fixedDailyPieceV183: true };
      targetState.dailyGoals.push(goal);
      return { changed: true, added: goal };
    }
  });

  const report = context.__aldusDailyDelegatePieceGoalV183.ensureDailyPieceForDate("2026-08-18", context.state, {});
  assert.equal(context.__aldusPlanningVarietyV357.pieceTypes.length, 11);
  assert.equal(visiblePieces, 11);
  assert.equal(context.state.syllabusItems.length, 1);
  assert.equal(report.added.syllabusItemId, "");
  assert.match(report.added.pieceCatalogKeyV357, /^v357-piece:/);
});

test("V357 evita tema semanticamente repetido quando existe alternativa", () => {
  const context = makeContext();
  context.todayISO = () => "2026-08-18";
  context.state = {
    syllabusItems: [],
    dailyGoals: [{
      id: "already",
      date: "2026-08-18",
      discipline: "Direito Processual Penal",
      subject: "Representação por Prisão Preventiva",
      type: "Estudo novo",
      origin: "planejamento",
      status: "Pendente"
    }]
  };
  context.selectPlanningGoalsForTargets = (args) => ({ selected: args.eligibleGoals.slice(0, Math.max(0, args.topicTarget - (args.existingGoals || []).length)) });
  context.generateGoalsForDate = () => [];
  context.reconcileDailyGoalsWithPlanning = () => ({});
  context.reconcilePlanningDates = () => ({ added: [] });
  context.dispatchEvent({ type: "aldus:bootstrap-ready" });

  const result = context.selectPlanningGoalsForTargets({
    date: "2026-08-19",
    targetState: context.state,
    topicTarget: 1,
    existingGoals: [],
    eligibleGoals: [
      { id: "duplicate", discipline: "Direito Processual Penal", subject: "Prisão Preventiva", type: "Estudo novo", origin: "edital verticalizado", status: "Pendente" },
      { id: "alternative", discipline: "Direito Processual Penal", subject: "Cadeia de Custódia", type: "Estudo novo", origin: "edital verticalizado", status: "Pendente" }
    ]
  });
  assert.equal(result.selected[0].id, "alternative");
});

test("V357 não deixa o cronograma incompleto quando só existe o tema repetido", () => {
  const context = makeContext();
  context.todayISO = () => "2026-08-18";
  context.state = {
    syllabusItems: [],
    dailyGoals: [{ id: "already", date: "2026-08-18", discipline: "Direito Processual Penal", subject: "Representação por Prisão Preventiva", type: "Estudo novo", origin: "planejamento", status: "Pendente" }]
  };
  context.selectPlanningGoalsForTargets = (args) => ({ selected: args.eligibleGoals.slice(0, 1) });
  context.generateGoalsForDate = () => [];
  context.reconcileDailyGoalsWithPlanning = () => ({});
  context.reconcilePlanningDates = () => ({ added: [] });
  context.dispatchEvent({ type: "aldus:bootstrap-ready" });

  const result = context.selectPlanningGoalsForTargets({
    date: "2026-08-19",
    targetState: context.state,
    topicTarget: 1,
    existingGoals: [],
    eligibleGoals: [{ id: "duplicate", discipline: "Direito Processual Penal", subject: "Prisão Preventiva", type: "Estudo novo", origin: "edital verticalizado", status: "Pendente" }]
  });
  assert.equal(result.selected[0].id, "duplicate");
});

test("auditoria V357 troca apenas duplicata automática futura intacta", () => {
  const context = makeContext();
  context.todayISO = () => "2026-08-18";
  let saves = 0;
  let renders = 0;
  let syncs = 0;
  let reconciliations = 0;
  context.state = {
    syllabusItems: [],
    dailyGoals: [
      { id: "first", date: "2026-08-18", discipline: "Direito Processual Penal", subject: "Representação por Prisão Preventiva", type: "Estudo novo", origin: "planejamento", status: "Pendente" },
      { id: "duplicate", date: "2026-08-19", discipline: "Direito Processual Penal", subject: "Prisão Preventiva", type: "Estudo novo", origin: "planejamento", status: "Pendente" },
      { id: "manual", date: "2026-08-20", discipline: "Direito Processual Penal", subject: "Prisão Preventiva", type: "Estudo novo", origin: "manual", status: "Pendente" },
      { id: "review", date: "2026-08-21", discipline: "Direito Processual Penal", subject: "Prisão Preventiva", type: "Revisão", origin: "planejamento", status: "Pendente" },
      { id: "started", date: "2026-08-22", discipline: "Direito Processual Penal", subject: "Prisão Preventiva", type: "Estudo novo", origin: "planejamento", status: "Em andamento", actualMinutes: 10 }
    ]
  };
  context.selectPlanningGoalsForTargets = (args) => ({ selected: args.eligibleGoals || [] });
  context.generateGoalsForDate = () => [];
  context.reconcileDailyGoalsWithPlanning = () => ({});
  context.reconcilePlanningDates = (targetState, dates) => {
    reconciliations += 1;
    targetState.dailyGoals.push({ id: "replacement", date: dates[0], discipline: "Direito Processual Penal", subject: "Cadeia de Custódia", type: "Estudo novo", origin: "planejamento", status: "Pendente" });
    return { added: ["replacement"] };
  };
  context.saveData = () => { saves += 1; };
  context.render = () => { renders += 1; };
  context.autoSyncAfterSave = () => { syncs += 1; };
  context.dispatchEvent({ type: "aldus:bootstrap-ready" });
  context.flushIdle();

  assert.equal(context.state.dailyGoals.some((goal) => goal.id === "duplicate"), false);
  assert.equal(context.state.dailyGoals.some((goal) => goal.id === "manual"), true);
  assert.equal(context.state.dailyGoals.some((goal) => goal.id === "review"), true);
  assert.equal(context.state.dailyGoals.some((goal) => goal.id === "started"), true);
  assert.equal(reconciliations, 1);
  assert.equal(saves, 1);
  assert.equal(renders, 1);
  assert.equal(syncs, 1);
});

test("V357 não cria hot path, loop contínuo nem acesso direto ao armazenamento", () => {
  assert.match(source, /requestIdleCallback/);
  assert.match(source, /PLANNING_ROUTES/);
  assert.doesNotMatch(source, /MutationObserver|setInterval|localStorage|indexedDB|syncStableSerialize|cloneData|structuredClone/);
  const pagesWorkflow = fs.readFileSync(path.join(root, ".github", "workflows", "pages.yml"), "utf8");
  assert.match(pagesWorkflow, /planning-variety-v357\.js/);
  assert.match(pagesWorkflow, /aldusPlanningVarietyV357/);
});

const v361Source = fs.readFileSync(path.join(root, "factory-schedule-performance-v361.js"), "utf8");

function v361Dates(count) {
  const start = new Date("2026-08-19T12:00:00Z");
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(start);
    date.setUTCDate(date.getUTCDate() + index);
    return date.toISOString().slice(0, 10);
  });
}

function makeV361Context() {
  const scheduledDates = v361Dates(30);
  const targetState = {
    dailyGoals: scheduledDates.map((date, index) => ({
      id: `goal-${index}`,
      date,
      syllabusItemId: `syllabus-${index}`,
      discipline: `Disciplina ${index}`,
      subject: `Tema ${index}`,
      status: "Pendente"
    }))
  };
  const agenda = Array.from({ length: 100 }, (_, index) => ({
    id: `factory-${index}`,
    editalActive: true,
    editalLink: { itemIds: [`syllabus-${index}`], discipline: `Disciplina ${index}`, subject: `Tema ${index}` },
    modules: { resumoAula: { status: "Não iniciado" } }
  }));
  let originalQueueCalls = 0;
  let largestAgenda = 0;
  const document = {
    readyState: "complete",
    addEventListener() {},
    getElementById() { return null; },
    createElement() { throw new Error("DOM não deve ser necessário neste teste"); }
  };
  const context = {
    console,
    Date,
    Map,
    Set,
    WeakSet,
    Object,
    String,
    Number,
    Array,
    Boolean,
    Math,
    JSON,
    document,
    state: targetState,
    factoryProductionScope: "schedule",
    __ALDUS_FACTORY_SCHEDULE_SCOPE_V277__: { version: "v277" },
    isPlanningStudyGoal: () => true,
    factoryResumoAulaPending: () => true,
    ensureFactoryAgenda: () => agenda,
    requestAnimationFrame(callback) { callback(); return 1; },
    queueMicrotask(callback) { callback(); },
    addEventListener() {},
    factoryQueueForDate(date, narrowedAgenda) {
      originalQueueCalls += 1;
      largestAgenda = Math.max(largestAgenda, narrowedAgenda.length);
      const goal = targetState.dailyGoals.find((entry) => entry.date === date);
      const item = narrowedAgenda.find((entry) => entry.editalLink.itemIds.includes(goal?.syllabusItemId));
      return item ? [{ item, goals: [goal] }] : [];
    }
  };
  context.renderFactory = () => {
    scheduledDates.forEach((date) => context.factoryQueueForDate(date, agenda));
    return true;
  };
  context.window = context;
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(v361Source, context, { filename: "factory-schedule-performance-v361.js" });
  return {
    context,
    get originalQueueCalls() { return originalQueueCalls; },
    get largestAgenda() { return largestAgenda; }
  };
}

test("V361 limita o primeiro render a 20 temas e calcula o próximo bloco sob demanda", () => {
  const fixture = makeV361Context();
  fixture.context.renderFactory();
  const first = fixture.context.__ALDUS_FACTORY_SCHEDULE_PERFORMANCE_V361__.getSession();
  assert.equal(first.visibleLimit, 20);
  assert.equal(first.loadedThemes, 20);
  assert.equal(fixture.originalQueueCalls, 20);
  assert.equal(first.hasMorePotential, true);

  fixture.context.__ALDUS_FACTORY_SCHEDULE_PERFORMANCE_V361__.showMore();
  const second = fixture.context.__ALDUS_FACTORY_SCHEDULE_PERFORMANCE_V361__.getSession();
  assert.equal(second.visibleLimit, 40);
  assert.equal(second.loadedThemes, 30);
  assert.equal(fixture.originalQueueCalls, 30, "datas já calculadas devem vir do cache");
  assert.equal(second.hasMorePotential, false);
});

test("V361 reduz a agenda exata antes da fila pesada", () => {
  const fixture = makeV361Context();
  fixture.context.renderFactory();
  assert.equal(fixture.largestAgenda, 1, "agenda de 100 itens deve cair para o item exato do dia");
});

test("V361 desativa V280/V281 e não cria hot path contínuo", () => {
  const fixture = makeV361Context();
  assert.equal(fixture.context.__ALDUS_FACTORY_SCHEDULE_FILTERS_V280__.supersededByV361, true);
  assert.equal(fixture.context.__ALDUS_FACTORY_SCHEDULE_DATES_V281__.supersededByV361, true);
  assert.match(v361Source, /PAGE_SIZE = 20/);
  assert.match(v361Source, /narrowAgendaForDate/);
  assert.match(v361Source, /requestAnimationFrame/);
  assert.doesNotMatch(v361Source, /MutationObserver|setInterval|localStorage|indexedDB|saveData\s*\(|syncStableSerialize|cloneData/);
  const preloader = fs.readFileSync(path.join(root, "planning-piece-rotation-v358.js"), "utf8");
  assert.match(preloader, /aldusFactorySchedulePerformanceV361/);
  assert.match(preloader, /factory-schedule-performance-v361\.js\?v=/);
  const docsRuntime = fs.readFileSync(path.join(root, "docs", "factory-schedule-performance-v361.js"), "utf8");
  assert.equal(docsRuntime, v361Source);
});
