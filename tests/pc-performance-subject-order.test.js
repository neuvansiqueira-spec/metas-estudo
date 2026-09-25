const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "..", "script.js"), "utf8");
const observability = fs.readFileSync(path.join(__dirname, "..", "security-observability-v318.js"), "utf8");

function select(value = "") {
  return {
    value,
    set innerHTML(html) {
      this.html = html;
      const values = [...html.matchAll(/<option value="([^"]*)"/g)].map((match) => match[1]);
      if (!values.includes(this.value)) this.value = values[0] || "";
    },
    get innerHTML() { return this.html || ""; }
  };
}

test("assuntos aparecem em ordem alfabética dentro da disciplina sem perder a seleção", () => {
  const start = source.indexOf("function renderChooseSubjectForDayV158()");
  const end = source.indexOf("function generateDailyGoals()", start);
  assert.ok(start >= 0 && end > start);
  const elements = {
    chooseSubjectForDayForm: {}, chooseSubjectForDayDate: { value: "2026-09-25" },
    chooseSubjectForDayDiscipline: select("Direito Penal"), chooseSubjectForDayItem: select("a"),
    chooseSubjectReplacementGoal: select(), chooseSubjectReplacementField: {},
    chooseSubjectForDaySubmit: {}
  };
  const state = {
    syllabusItems: [
      { id: "z", discipline: "Direito Penal", subject: "Zeladoria" },
      { id: "b", discipline: "Direito Penal", subject: "Árvore", subtopic: "B" },
      { id: "other", discipline: "Português", subject: "Abreviações" },
      { id: "a", discipline: "Direito Penal", subject: "Árvore", subtopic: "A" },
      { id: "hidden", discipline: "Direito Penal", subject: "Abertura", hiddenFromCatalog: true }
    ],
    dailyGoals: []
  };
  const context = {
    elements, state, todayISO: () => "2026-09-25", escapeHTML: (value) => value,
    selectedSubjectDayCapacityV158: () => ({ full: false, replacementGoals: [] }),
    goalDateValue: (goal) => goal.date, isValidGoalDateV158: () => true,
    setChooseSubjectForDayStatusV158: () => {}
  };
  vm.createContext(context);
  vm.runInContext(source.slice(start, end) + "renderChooseSubjectForDayV158()", context);
  assert.deepEqual([...elements.chooseSubjectForDayItem.innerHTML.matchAll(/<option value="([^"]*)"/g)].map((match) => match[1]), ["", "a", "b", "z"]);
  assert.equal(elements.chooseSubjectForDayItem.value, "a");
});

test("sincronização da Fábrica reutiliza materiais e evita buscas lineares por item", () => {
  const start = source.indexOf("function factoryMaterialUniqueKey(");
  const end = source.indexOf("const FACTORY_MATERIALS_WORKFLOW_MIGRATION_V80", start);
  assert.ok(start >= 0 && end > start);
  const existing = {
    id: "saved-id", source: "factory", factoryUniqueKey: "item-1|resumoAula|Word",
    factoryItemId: "item-1", factoryModuleKey: "resumoAula", factoryFormat: "Word", available: false
  };
  const state = {
    materials: [existing, ...Array.from({ length: 500 }, (_, index) => ({ id: `other-${index}`, source: "manual" }))],
    factoryAgenda: [
      { id: "item-1", tema: "Tema A", disciplina: "Direito Penal", modules: { resumoAula: { wordLink: "https://example.org/a", pdfLink: "" } } },
      { id: "item-2", tema: "Tema B", disciplina: "Direito Penal", modules: { resumoAula: { wordLink: "https://example.org/b", pdfLink: "" } } }
    ]
  };
  state.materials.find = () => { throw new Error("busca linear inesperada"); };
  state.materials.findIndex = () => { throw new Error("busca linear inesperada"); };
  const context = {
    state, Map, Set, Date,
    normalizeFactoryItem: (item) => item,
    normalizeFactoryModules: (modules) => modules,
    ensureFactoryAgenda: () => state.factoryAgenda,
    FACTORY_MODULES: [{ key: "resumoAula", label: "Resumo/Aula" }],
    canonical: (value) => value.toLowerCase(),
    todayISO: () => "2026-09-25",
    isValidHttpUrl: (value) => /^https:\/\//.test(value),
    factoryResumoAulaFolderMaterialLink: () => "",
    normalizeMaterialEstimateFields: (material) => material
  };
  vm.createContext(context);
  vm.runInContext(source.slice(start, end) + "syncAllFactoryMaterials()", context);
  assert.equal(state.materials.length, 502);
  assert.equal(state.materials[0].id, "saved-id");
  assert.equal(state.materials[0].available, true);
  assert.equal(state.materials[0].link, "https://example.org/a");
  assert.equal(state.materials[501].factoryUniqueKey, "item-2|resumoAula|Word");
});

test("módulo de sumários carrega somente ao abrir a Fábrica", () => {
  const start = observability.indexOf("function installFactorySummaryTocV382()");
  const end = observability.indexOf("function installFactorySimuladoDiscursivoV619()", start);
  assert.ok(start >= 0 && end > start);
  const listeners = new Map();
  const scripts = [];
  const location = { hash: "#metas-do-dia" };
  const document = {
    documentElement: { dataset: { activeView: "metas-do-dia" } },
    getElementById: (id) => scripts.find((script) => script.id === id),
    createElement: () => ({ addEventListener(type, callback) { this[type] = callback; } }),
    head: { appendChild(script) { scripts.push(script); } }
  };
  const window = {
    addEventListener: (type, callback) => listeners.set(type, callback),
    removeEventListener: (type) => listeners.delete(type)
  };
  let installs = 0;
  const context = { document, location, window, globalThis: { __aldusFactorySummaryTocV382: { install: () => installs++ } } };
  vm.createContext(context);
  vm.runInContext(observability.slice(start, end) + "installFactorySummaryTocV382()", context);
  assert.equal(scripts.length, 0);
  document.documentElement.dataset.activeView = "fabrica-resumos";
  location.hash = "#fabrica-resumos";
  listeners.get("aldus:view-active")();
  assert.equal(scripts.length, 1);
  assert.match(scripts[0].src, /^factory-summary-toc-v381\.js\?/);
  scripts[0].load();
  assert.equal(installs, 1);
  assert.equal(listeners.size, 0);
});
