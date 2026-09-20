const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

// V628 (18/09/2026), regra do usuário: "QUANDO UMA META É CONCLUÍDA ELA DEVE FICAR NA FÁBRICA".
// A Fábrica tem área de Prontos, e assunto concluído ainda pode precisar de atualização.
// Quem decide Pendentes x Prontos é o Resumo/Aula do tema, não a conclusão da meta.

const root = path.resolve(__dirname, "..");
const script = fs.readFileSync(path.join(root, "script.js"), "utf8");

function sourceBetween(start, end) {
  const from = script.indexOf(start);
  const to = script.indexOf(end, from + start.length);
  assert.notEqual(from, -1, `Marcador inicial ausente: ${start}`);
  assert.notEqual(to, -1, `Marcador final ausente: ${end}`);
  return script.slice(from, to);
}

const TODAY = "2026-09-18";
const item = (id, tema, resumoAula) => ({
  id, tema, disciplina: "DIREITO PENAL", prioridade: "Alta", editalActive: true,
  editalLink: { itemIds: [`syl-${id}`] }, modules: { resumoAula }
});
const goal = (id, date, itemId, status, type = "Estudo novo") => ({
  id, date, data: date, discipline: "DIREITO PENAL", syllabusItemId: `syl-${itemId}`, status, type
});

function loadFactory() {
  const agenda = [
    item("patrimonio", "Crimes Contra o Patrimônio", { status: "Não iniciado", pdfLink: "https://drive.google.com/drive/folders/1" }),
    item("sem-resumo", "Tema concluído sem resumo", { status: "Não iniciado" }),
    item("nao-aplica", "Tema sem resumo aplicável", { status: "Não se aplica" })
  ];
  const context = {
    state: {
      syllabusItems: [],
      dailyGoals: [
        goal("p-1", "2026-08-18", "patrimonio", "Concluída"),
        goal("p-2", TODAY, "patrimonio", "Pendente", "Revisão"),
        goal("s-1", "2026-09-15", "sem-resumo", "Concluída"),
        goal("n-1", "2026-09-16", "nao-aplica", "Concluída")
      ]
    },
    factoryProductionScope: "all",
    lastFactoryTodayInfo: null,
    todayISO: () => TODAY,
    goalDateValue: (g = {}) => g.date || g.data || "",
    isGoalDone: (g = {}) => g.status === "Concluída",
    // Todos os assuntos contam como já concluídos: se a Fábrica ainda filtrasse por isso, nada apareceria.
    planningRecordMatchesCompletedSubject: () => true,
    factorySubjectAlreadyStudied: () => true,
    exactFactoryGoalMatches: (g, list) => ({ items: list.filter((it) => it.editalLink.itemIds.includes(g.syllabusItemId)), mode: "identificador" }),
    factoryGoalSubtopic: () => "",
    normalizeFactoryModules: (modules = {}) => ({ resumoAula: { status: "Não iniciado", ...(modules.resumoAula || {}) } }),
    factoryResumoAulaReady: (it = {}) => Boolean(it.modules?.resumoAula?.pdfLink || it.modules?.resumoAula?.wordLink),
    factoryOverallStatus: () => "Não iniciado",
    canonical: (value) => String(value || "").toLowerCase(),
    ensureFactoryAgenda: () => agenda,
    weekStart: () => "2026-09-13",
    addDays: (date, days) => new Date(Date.parse(`${date}T12:00:00Z`) + days * 864e5).toISOString().slice(0, 10),
    daysBetween: (start, count) => Array.from({ length: count }, (_, i) => new Date(Date.parse(`${start}T12:00:00Z`) + i * 864e5).toISOString().slice(0, 10))
  };
  vm.createContext(context);
  vm.runInContext(sourceBetween("function factoryGoalGroupsForDate", "function factoryScopeLabel"), context);
  return { context, agenda };
}

// Listas criadas dentro do vm têm outro Array.prototype; copiar antes de comparar.
const ids = (entries) => [...entries].map((entry) => entry.item.id).sort();

test("meta concluída continua ligada ao seu tema na Fábrica", () => {
  const { context, agenda } = loadFactory();
  const groups = context.factoryGoalGroupsForDate("2026-08-18", agenda);
  assert.deepEqual(ids(groups), ["patrimonio"]);
  assert.deepEqual([...groups[0].goals].map((g) => g.id), ["p-1"]);
});

test("meta pendente de assunto já concluído aparece na Fábrica no dia dela", () => {
  const { context, agenda } = loadFactory();
  const queue = context.factoryQueueForDate(TODAY, agenda);
  assert.deepEqual(ids(queue), ["patrimonio"]);
  assert.deepEqual([...queue[0].goals].map((g) => g.id), ["p-2"]);
});

test("Resumo/Aula decide a etapa: com arquivo vai para Prontos, sem arquivo fica pendente, Não se aplica sai", () => {
  const { context, agenda } = loadFactory();
  const [patrimonio, semResumo, naoAplica] = agenda;
  assert.equal(context.factoryResumoAulaPending({ item: patrimonio }), false);
  assert.equal(context.factoryResumoAulaReady(patrimonio), true);
  assert.equal(context.factoryResumoAulaPending({ item: semResumo }), true);
  assert.equal(context.factoryResumoAulaPending({ item: naoAplica }), false);
});

test("Todas as Metas: pendente inclui tema de meta concluída sem resumo; Prontos inclui o tema concluído com resumo", () => {
  const { context, agenda } = loadFactory();
  assert.deepEqual(ids(context.factoryAllGoalsQueue(agenda)), ["sem-resumo"]);
  const allDates = context.factoryScopeDates("all");
  const periodEntries = allDates.flatMap((date) => context.factoryQueueForDate(date, agenda));
  const prontos = [...new Set(periodEntries.filter(({ item: it }) => context.factoryResumoAulaReady(it)).map(({ item: it }) => it.id))];
  assert.deepEqual(prontos, ["patrimonio"]);
});

test("Produção da Semana também mantém o tema de meta concluída na semana", () => {
  const { context, agenda } = loadFactory();
  context.factoryProductionScope = "week";
  assert.deepEqual(ids(context.factoryWeeklyQueue(agenda)), ["sem-resumo"]);
});

test("painel de materiais e aviso de integridade não escondem meta pendente de assunto já concluído", () => {
  const render = sourceBetween("function renderFactoryIntegrityInfo", "function setFactoryTriagemStatus");
  // V629: a projeção do painel de materiais passou a ser montada em factoryPendingMaterialsHTML.
  const panel = sourceBetween("function factoryPendingMaterialsHTML", "function hydrateFactoryPendingMaterials");
  assert.match(panel, /buildDailyPlanProjection\(date\)\.filter\(\(entry\) => !isGoalDone\(entry\.goal\)\)/);
  assert.doesNotMatch(render, /planningRecordMatchesCompletedSubject/);
});
