/* V622 — a otimização das áreas mais usadas devolve exatamente o que o script.js devolvia. */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const read = (file) => fs.readFileSync(file, "utf8");
const script = read("script.js");
const moduleSource = read("performance-hot-paths-v622.js");
const moduleApi = require("../performance-hot-paths-v622.js");
const trainingApi = require("../question-training.js");

// O script.js depende do DOM inteiro; recortamos só as funções envolvidas,
// casando parênteses dos parâmetros e chaves do corpo.
function extractFunction(source, name) {
  const start = source.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `função ausente no script.js: ${name}`);
  let index = source.indexOf("(", start);
  let depth = 0;
  for (; index < source.length; index += 1) {
    if (source[index] === "(") depth += 1;
    else if (source[index] === ")") { depth -= 1; if (depth === 0) break; }
  }
  index = source.indexOf("{", index);
  depth = 0;
  for (; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    else if (source[index] === "}") { depth -= 1; if (depth === 0) return source.slice(start, index + 1); }
  }
  throw new Error(`fim não encontrado: ${name}`);
}

function between(source, start, end) {
  const from = source.indexOf(start);
  const to = source.indexOf(end, from);
  assert.ok(from >= 0 && to > from, `recorte ausente: ${start}`);
  return source.slice(from, to);
}

const ORIGINAL_FUNCTIONS = [
  "normalizeText", "goalsForItem", "questionLogsForItem", "studiesForItem", "subjectForDiscipline",
  "uniqueTimerStudiesForGoal", "goalUnloggedActualMinutes", "goalTotalActualMinutes", "minutesForItem",
  "hasCompletedGoal", "isTopicStudied", "completedStatus", "isCompletedStatusValue", "hasDiagnosis",
  "isUndiagnosed", "itemPerformance", "isWeakItem", "lastStudyDateForItem", "lastReviewForItem",
  "recentErrorLogForItem", "smartReviewReason", "smartReviewPlan", "getSmartReviewSuggestions",
  "isGoalDone", "goalDateValue", "getStudyTimeLogs", "planningMetrics",
  "normalizeQconcursosCatalogText", "qconcursosAuditedMatch", "qconcursosCatalogMatch",
  "qconcursosNumberResolution", "questionItemOptionLabel",
  "dailyPlanSubjectKey", "dailyPlanSubjectAliases", "dailyPlanSubjectsCompatible", "dailyPlanRecordsShareSubject",
  "factorySyllabusItemIds", "materialAssociationIds", "materialMatchesAssociation",
  "factoryPlanningSyncFingerprintV170", "primeFactoryPlanningSyncFingerprintV170", "syncFactoryMaterialsPlanningV80",
  "scheduleViewRenderAfterPaintV170"
];

const ORIGINAL_SOURCE = [
  between(script, "const CANONICAL_CACHE = new Map();", "function getSyllabusDisciplines"),
  between(script, "const DAILY_PLAN_CANONICAL_CACHE = new Map();", "function dailyPlanSubjectKey"),
  ...ORIGINAL_FUNCTIONS.map((name) => extractFunction(script, name)),
  'let factoryPlanningSyncFingerprintCacheV170 = "";',
  "const INTERACTION_QUIET_WINDOW_MS_V344 = 90;",
  "const INTERACTION_MAX_DEFER_MS_V344 = 800;",
  "let pendingViewRenderTokenV170 = 0;"
].join("\n");

function addDays(date, amount) {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + amount);
  return value.toISOString().slice(0, 10);
}

function createScheduler() {
  const scheduler = { clock: 0, frames: [], idles: [], timers: [], renders: [], listeners: {} };
  scheduler.globals = {
    performance: { now: () => scheduler.clock },
    requestAnimationFrame: (fn) => scheduler.frames.push(fn),
    requestIdleCallback: (fn) => scheduler.idles.push(fn),
    setTimeout: (fn, ms = 0) => scheduler.timers.push({ at: scheduler.clock + ms, fn }),
    document: {
      documentElement: { dataset: { activeView: "metas-do-dia" } },
      addEventListener: (type, fn) => { scheduler.listeners[type] = fn; }
    },
    renderView: (target, options) => scheduler.renders.push({ target, options, at: scheduler.clock })
  };
  scheduler.run = (limitMs = 2000) => {
    const end = scheduler.clock + limitMs;
    while (scheduler.clock <= end) {
      if (scheduler.frames.length) { scheduler.frames.shift()(); continue; }
      if (scheduler.idles.length) { scheduler.idles.shift()({ didTimeout: false }); continue; }
      const due = scheduler.timers.filter((timer) => timer.at <= scheduler.clock);
      if (due.length) { scheduler.timers = scheduler.timers.filter((timer) => !due.includes(timer)); due.forEach((timer) => timer.fn()); continue; }
      if (!scheduler.timers.length) return;
      scheduler.clock = Math.min(...scheduler.timers.map((timer) => timer.at));
    }
  };
  return scheduler;
}

function harness(state, { beforeModule = "" } = {}) {
  const scheduler = createScheduler();
  const context = vm.createContext({
    console: { info() {}, warn() {}, error() {}, log() {} },
    state,
    todayISO: () => "2026-09-14",
    daysDiff: (a, b) => Math.round((Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`)) / 86400000),
    availabilityForDate: (date) => ({ type: date.endsWith("5") ? "plantão" : "dia normal", hours: date.endsWith("7") ? 0 : 3, label: "" }),
    dayTypeLabel: (availability) => availability.label || availability.type,
    addDays,
    parseDate: (date) => new Date(`${date}T00:00:00Z`),
    timeLogFromStudy: (study) => ({ date: study.date, discipline: study.discipline || "", subject: study.topic, minutes: Number(study.minutes) || 0 }),
    planningConfig: () => ({ safetyDays: 3 }),
    QCONCURSOS_AUDITED_CROSSWALK: [
      { d: "Direito Penal", t: "Geral", s: "Prazos", n: "101", k: "exact" },
      { d: "DIREITO  PENAL", t: "geral", s: "prazos", n: "999", k: "exact" },
      { d: "Ética e Cidadania", t: "Geral", s: "Princípios", n: "", k: "unavailable" }
    ],
    QCONCURSOS_CONFIRMED_SUBJECTS: [{ discipline: "direito constitucional", aliases: ["sumulas"], number: "202" }],
    syncFactoryWithActiveEdital: () => ({ edital: "sincronizado" }),
    ensureFactoryAgenda: () => {
      context.state.factoryAgenda = context.state.factoryAgenda.map((item) => ({ ...item }));
      context.state.factoryItems = context.state.factoryAgenda;
      return context.state.factoryAgenda;
    },
    syncAllFactoryMaterials: () => {},
    isPlanningStudyGoal: (goal = {}) => goal.type !== "Operacional",
    normalizeFactoryItem: (item) => ({ ...item }),
    ...scheduler.globals
  });
  vm.runInContext(ORIGINAL_SOURCE, context);
  if (beforeModule) vm.runInContext(beforeModule, context);
  const original = Object.fromEntries(ORIGINAL_FUNCTIONS.map((name) => [name, context[name]]));
  const installModule = () => {
    vm.runInContext(moduleSource, context);
    return context.__ALDUS_PERFORMANCE_HOT_PATHS_V622__;
  };
  return { context, original, installModule, scheduler };
}

function mulberry32(seed) {
  return function next() {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Cobre o que as buscas distinguem: acento, caixa e espaços divergentes, o
// apelido "Representação por", ids ausentes e inexistentes, disciplinas vazias.
function generateState(seed) {
  const rand = mulberry32(seed);
  const pick = (list) => list[Math.floor(rand() * list.length)];
  const maybe = (value, chance = 0.5) => (rand() < chance ? value : undefined);
  const disciplines = ["Direito Penal", "DIREITO  PENAL", "Direito Constitucional", "Ética e Cidadania", "etica e cidadania", ""];
  const subjects = ["Prazos", "prazos ", "Representação por Crimes", "Crimes", "Súmulas", "Nulidades", "", "Princípios"];
  const dates = Array.from({ length: 20 }, (_, index) => addDays("2026-09-01", index));
  const items = Array.from({ length: 60 }, (_, index) => ({
    id: `item-${index}`,
    discipline: pick(disciplines),
    subject: pick(subjects),
    topic: pick(["Geral", "geral", "Parte especial"]),
    subtopic: maybe(pick(["Sub A", "Sub B"]), 0.3),
    status: pick(["Não iniciado", "Em andamento", "Concluído", "Dominado", "Ignorado"]),
    priority: pick(["Alta", "Média"]),
    domain: pick(["Fraco", "Sem diagnóstico", "Bom"]),
    weight: Math.floor(rand() * 5),
    studyMinutes: pick([0, 0, 30]),
    manualWeak: rand() < 0.1,
    reviewed: rand() < 0.1,
    qconcursosNumber: maybe("555", 0.1),
    hiddenFromCatalog: rand() < 0.05
  }));
  const itemIds = () => pick([...items.map((item) => item.id), "", "", "inexistente"]);
  const subjectsList = Array.from({ length: 8 }, (_, index) => ({ id: `subject-${index}`, name: pick(disciplines) }));
  const goals = Array.from({ length: 150 }, (_, index) => ({
    id: pick([`goal-${index}`, `goal-${index}`, ""]),
    syllabusItemId: itemIds(),
    discipline: pick(disciplines),
    disciplina: maybe(pick(disciplines), 0.2),
    subject: pick(subjects),
    tema: maybe(pick(subjects), 0.2),
    assunto: maybe(pick(subjects), 0.2),
    date: pick(dates),
    status: pick(["Pendente", "Concluída", "Em andamento"]),
    type: pick(["Estudo novo", "Revisão", "Operacional"]),
    priority: maybe(pick(["Alta", "Baixa"])),
    actualMinutes: pick([0, 15, 40]),
    studyActualMinutes: maybe(pick([0, 20]), 0.3)
  }));
  const studies = Array.from({ length: 80 }, (_, index) => ({
    id: `study-${index}`,
    syllabusItemId: itemIds(),
    subjectId: pick([...subjectsList.map((subject) => subject.id), ""]),
    topic: pick(subjects),
    minutes: pick([0, 10, 25]),
    questions: pick([0, 5]),
    correct: pick([0, 2, 4]),
    wrong: pick([0, 1, 3]),
    date: pick(dates),
    goalId: pick(goals).id,
    origin: pick(["timer", "manual"])
  }));
  const questionLogs = Array.from({ length: 50 }, (_, index) => ({
    id: `log-${index}`,
    syllabusItemId: itemIds(),
    discipline: pick(disciplines),
    subject: pick(subjects),
    total: pick([0, 10]),
    correct: pick([0, 4, 8]),
    wrong: pick([0, 2, 6]),
    minutes: pick([0, 12]),
    date: pick(dates)
  }));
  const smartReviews = Array.from({ length: 12 }, (_, index) => ({
    id: `review-${index}`,
    date: pick(dates),
    status: pick(["revisado", "sugerido", "adiado"]),
    syllabusItemId: itemIds(),
    discipline: pick(disciplines),
    subject: pick(subjects)
  }));
  const factoryAgenda = Array.from({ length: 70 }, (_, index) => ({
    id: `factory-${index}`,
    disciplina: pick(disciplines),
    tema: pick(subjects),
    syllabusItemId: maybe(itemIds(), 0.3),
    syllabusItemIds: maybe([itemIds(), itemIds()].filter(Boolean), 0.3),
    editalLink: maybe({ itemIds: [itemIds()].filter(Boolean) }, 0.4),
    editalActive: pick([true, false, undefined]),
    prioridade: "Média"
  }));
  const materials = Array.from({ length: 40 }, (_, index) => ({
    id: `material-${index}`,
    discipline: pick(disciplines),
    disciplina: maybe(pick(disciplines), 0.2),
    subject: pick(subjects),
    assunto: maybe(pick(subjects), 0.2),
    syllabusItemId: maybe(itemIds(), 0.3),
    syllabusItemIds: maybe([itemIds()].filter(Boolean), 0.3),
    parentSyllabusItemId: maybe(itemIds(), 0.2),
    goalId: maybe(pick(goals).id, 0.2),
    factoryItemId: maybe(pick(factoryAgenda).id, 0.2)
  }));
  return {
    syllabusItems: items,
    subjects: subjectsList,
    dailyGoals: goals,
    studies,
    questionLogs,
    smartReviews,
    factoryAgenda,
    factoryItems: factoryAgenda,
    materials,
    edital: { examDate: "2026-12-01" },
    migrations: {}
  };
}

test("V622 fixa a impressão digital de cada função original do script.js", () => {
  for (const [name, expected] of Object.entries(moduleApi.EXPECTED_FINGERPRINTS)) {
    assert.equal(moduleApi.fingerprint(extractFunction(script, name)), expected, `${name} mudou no script.js; revise a substituição da V622`);
  }
});

test("V622 é carregado pelo instalador emergencial e espelhado em docs", () => {
  const loader = read("performance-emergency-v350.js");
  assert.ok(loader.includes('script.src = "performance-hot-paths-v622.js?v=20260914-desempenho-areas-v622";'));
  assert.match(loader, /\n  installPerformanceHotPathsV622\(\);\r?\n  if \(install\(\)\) return;/);
  for (const file of ["performance-hot-paths-v622.js", "performance-emergency-v350.js", "question-training.js", "question-training-ui.js"]) {
    assert.deepEqual(fs.readFileSync(file), fs.readFileSync(`docs/${file}`), `${file} deve ser idêntico em docs`);
  }
  assert.match(read("build-bundles.mjs"), /"performance-hot-paths-v622\.js"/);
  assert.match(read("app.bundle.js"), /function statsIndex\(state\)/, "o bundle precisa trazer o índice do treino de questões");
});

test("V622 instala todas as substituições quando as originais não mudaram", () => {
  const { installModule } = harness(generateState(1));
  const api = installModule();
  assert.equal(api.report.skipped.length, 0);
  assert.deepEqual([...api.report.installed].sort(), [
    "dailyPlanSubjectKey", "getSmartReviewSuggestions", "goalsForItem", "normalizeQconcursosCatalogText",
    "planningMetrics", "qconcursosAuditedMatch", "questionItemOptionLabel", "questionLogsForItem",
    "scheduleViewRenderAfterPaintV170", "studiesForItem", "subjectForDiscipline", "syncFactoryMaterialsPlanningV80"
  ]);
});

test("V622 revisão inteligente, métricas e buscas por item devolvem o mesmo resultado", () => {
  for (const seed of [2, 3, 4, 5]) {
    const state = generateState(seed);
    const { context, original, installModule } = harness(state);
    const dates = ["2026-09-01", "2026-09-05", "2026-09-07", "2026-09-10", "2026-09-14"];
    const lookups = (fns) => state.syllabusItems.map((item) => [
      fns.goalsForItem(item), fns.questionLogsForItem(item), fns.studiesForItem(item), fns.subjectForDiscipline(item.discipline)
    ]);
    const expected = {
      suggestions: dates.map((date) => original.getSmartReviewSuggestions(date)),
      metrics: original.planningMetrics(),
      lookups: lookups(original)
    };
    installModule();
    assert.deepEqual(dates.map((date) => context.getSmartReviewSuggestions(date)), expected.suggestions, `semente ${seed}: revisão inteligente`);
    assert.deepEqual(context.planningMetrics(), expected.metrics, `semente ${seed}: métricas do planejamento`);
    assert.deepEqual(lookups(context), expected.lookups, `semente ${seed}: buscas fora do escopo`);
  }
});

test("V622 rótulo do assunto, número do QConcursos e chave de assunto seguem idênticos", () => {
  const state = generateState(6);
  const { context, original, installModule } = harness(state);
  const samples = [...state.syllabusItems, {}, { discipline: "Direito Penal", topic: "Geral", subject: "Prazos" }, { disciplina: "ética e cidadania", topico: "geral", assunto: "principios" }];
  const texts = [...state.syllabusItems.flatMap((item) => [item.subject, item.discipline, item.topic]), undefined, null, 0, false, "", " Representação por  Érro ", "representacao por x"];
  const expected = {
    labels: samples.map((item) => [original.questionItemOptionLabel(item), original.questionItemOptionLabel(item, true)]),
    audited: samples.map((item) => original.qconcursosAuditedMatch(item)),
    normalized: texts.map((text) => original.normalizeQconcursosCatalogText(text)),
    keys: texts.map((text) => original.dailyPlanSubjectKey(text))
  };
  installModule();
  assert.deepEqual(samples.map((item) => [context.questionItemOptionLabel(item), context.questionItemOptionLabel(item, true)]), expected.labels);
  assert.deepEqual(samples.map((item) => context.qconcursosAuditedMatch(item)), expected.audited);
  assert.equal(context.qconcursosAuditedMatch({ discipline: "direito penal", topic: "GERAL", subject: "prazos" }).n, "101", "a primeira entrada auditada continua vencendo");
  assert.deepEqual(texts.map((text) => context.normalizeQconcursosCatalogText(text)), expected.normalized);
  assert.deepEqual(texts.map((text) => context.dailyPlanSubjectKey(text)), expected.keys);
});

test("V622 sincronização Fábrica ↔ planejamento produz o mesmo estado e o mesmo relatório", () => {
  for (const seed of [7, 8, 9, 10, 11]) {
    const first = generateState(seed);
    const second = structuredClone(first);
    const { context, original, installModule } = harness(first);
    vm.runInContext('factoryPlanningSyncFingerprintCacheV170 = "";', context);
    const expectedReport = original.syncFactoryMaterialsPlanningV80(first);
    installModule();
    context.state = second;
    vm.runInContext('factoryPlanningSyncFingerprintCacheV170 = "";', context);
    const report = context.syncFactoryMaterialsPlanningV80(second);
    assert.deepEqual(report, expectedReport, `semente ${seed}: relatório`);
    assert.equal(JSON.stringify(second), JSON.stringify(first), `semente ${seed}: estado`);
    assert.ok(first.materials.some((material) => material.planningGoalIds.length), `semente ${seed}: o cenário precisa ter vínculos`);
    assert.deepEqual(JSON.parse(JSON.stringify(context.syncFactoryMaterialsPlanningV80(second))), { changed: false, skipped: true, factoryItems: second.factoryAgenda.filter((item) => item.editalActive !== false).length, linkedGoals: 0, linkedMaterials: second.materials.filter((material) => material.planningGoalIds?.length).length }, "a impressão da sincronização continua evitando repetição");
  }
});

test("V622 não substitui uma função que foi alterada no script.js", () => {
  const { context, installModule } = harness(generateState(12), {
    beforeModule: 'function questionItemOptionLabel(item = {}) { return "versão nova do script"; }'
  });
  const api = installModule();
  assert.deepEqual(JSON.parse(JSON.stringify(api.report.skipped)), [{ name: "questionItemOptionLabel", changed: ["questionItemOptionLabel"] }]);
  assert.equal(context.questionItemOptionLabel({ subject: "Prazos" }), "versão nova do script");
  assert.ok(api.report.installed.includes("syncFactoryMaterialsPlanningV80"));
});

test("V622 troca de área não espera o mouse parar, mas ainda cede a clique e tecla", () => {
  const { context, installModule, scheduler } = harness(generateState(13));
  installModule();
  assert.deepEqual(Object.keys(scheduler.listeners).sort(), ["keydown", "pointerdown", "touchstart", "wheel"]);

  scheduler.clock = 5000;
  context.scheduleViewRenderAfterPaintV170("metas-do-dia");
  scheduler.run();
  assert.equal(scheduler.renders.length, 1);
  assert.equal(scheduler.renders[0].at, 5000, "sem clique recente o desenho sai no primeiro quadro ocioso");
  assert.deepEqual({ ...scheduler.renders[0].options }, { reuseIfFresh: true });

  scheduler.clock = 10000;
  scheduler.listeners.pointerdown();
  context.scheduleViewRenderAfterPaintV170("metas-do-dia");
  scheduler.run();
  assert.equal(scheduler.renders.length, 2);
  assert.ok(scheduler.renders[1].at >= 10090 && scheduler.renders[1].at < 10800, `logo após o clique espera a janela de 90 ms (${scheduler.renders[1].at})`);

  scheduler.clock = 20000;
  context.scheduleViewRenderAfterPaintV170("metas-do-dia");
  context.scheduleViewRenderAfterPaintV170("metas-do-dia");
  scheduler.run();
  assert.equal(scheduler.renders.length, 3, "um pedido mais novo cancela o anterior");

  scheduler.globals.document.documentElement.dataset.activeView = "fabrica-resumos";
  context.scheduleViewRenderAfterPaintV170("metas-do-dia");
  scheduler.run();
  assert.equal(scheduler.renders.length, 3, "a área abandonada não é desenhada");
});

test("V622 contadores do treino de questões são os mesmos com e sem o índice da passada", () => {
  const rand = mulberry32(14);
  const pick = (list) => list[Math.floor(rand() * list.length)];
  const disciplines = ["DIREITO PENAL", "Direito Penal", "Direito Constitucional"];
  const themes = ["Tema de teste", "tema de TESTE", "Crimes", "Súmulas"];
  const bank = Array.from({ length: 120 }, (_, index) => ({
    id: pick([`Q${index}`, `q ${index}`, `Q${index % 30}`]),
    disciplina: pick(disciplines),
    assunto: pick(themes),
    corrigida: pick([true, false, undefined]),
    resultado: pick(["ACERTEI", "ERREI", "NAO_RESPONDIDA", "certo"]),
    resposta_marcada: pick(["", "A", "F"]),
    origem_tipo: pick(["qconcursos", "autoral"])
  }));
  const state = {
    questionBank: bank,
    questionTrainingEvents: Array.from({ length: 25 }, (_, index) => ({
      id: `event-${index}`,
      kind: pick(["prompt", "import"]),
      topicKey: trainingApi.topicKey({ discipline: pick(disciplines), theme: pick(themes) }),
      questionIds: [pick(bank).id, `Q${Math.floor(rand() * 150)}`, `q ${Math.floor(rand() * 40)}`]
    })),
    questionBankSessions: [{ items: bank.slice(0, 60).map((question) => ({ id: question.id, status: pick(["certo", "errado", "branco"]) })) }]
  };
  const contexts = [...bank, ...state.questionTrainingEvents.map((event) => {
    const [discipline, theme] = event.topicKey.split("|");
    return { discipline, theme };
  })];
  const index = trainingApi.statsIndex(state);
  for (const ctx of contexts) {
    assert.deepEqual(trainingApi.stats(state, ctx, index), trainingApi.stats(state, ctx), JSON.stringify(ctx));
  }
  const other = { ...state, questionBank: bank.slice(0, 10) };
  assert.deepEqual(trainingApi.stats(other, bank[0], index), trainingApi.stats(other, bank[0]), "índice de outro estado é ignorado");
});
