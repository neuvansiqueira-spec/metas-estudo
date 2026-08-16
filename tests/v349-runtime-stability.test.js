const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const factoryDestinationSource = fs.readFileSync("factory-destination-recursive-v232.js", "utf8");
const jurisprudenciaSource = fs.readFileSync("factory-jurisprudencia-prompt-v332.js", "utf8");
const syncDeletionSource = fs.readFileSync("sync-integral-deletions.js", "utf8");

function vmContext(values = {}) {
  const context = { console, Date, Map, Set, Object, Array, Number, String, JSON, ...values };
  context.globalThis = context;
  vm.createContext(context);
  return context;
}

test("V349 remapeia os seis UUIDs históricos sem bloquear o planejamento", () => {
  const entries = [
    ["police-inquiry-archiving", "old-1", "Arquivamento do inquérito policial"],
    ["law-12850-obstruction", "old-2", "Lei nº 12.850/2013: organizações criminosas e obstrução da investigação"],
    ["law-9605-environmental", "old-3", "Lei nº 9.605/1998: crimes ambientais e prova pericial"],
    ["law-8072-heinous", "old-4", "Lei nº 8.072/1990: crimes hediondos"],
    ["law-14133-procurement", "old-5", "Lei nº 14.133/2021: licitações, contratação direta e agentes"],
    ["human-rights-global-system", "old-6", "Sistema global de proteção dos Direitos Humanos"]
  ];
  const state = {
    planning: { topicPrioritySignalsV155: {} },
    syllabusItems: entries.map(([key, , label], index) => ({
      id: `current-${index + 1}`,
      discipline: key === "human-rights-global-system" ? "Direitos Humanos" : "Direito",
      subject: label,
      status: "Não iniciado"
    }))
  };
  const context = vmContext({ state });
  const prelude = `
    const INITIAL_WRONG_TOPICS_V155 = Object.freeze(${JSON.stringify(entries.map(([key, syllabusItemId, label]) => ({ key, syllabusItemId, label })))});
    function planningPrioritySignalsV155(targetState = state) {
      targetState.planning ||= {};
      targetState.planning.topicPrioritySignalsV155 ||= {};
      return targetState.planning.topicPrioritySignalsV155;
    }
    function seedInitialWrongTopicsV155(targetState = state) { return { inserted: [], missing: INITIAL_WRONG_TOPICS_V155, signals: planningPrioritySignalsV155(targetState) }; }
  `;
  vm.runInContext(prelude + "\n" + factoryDestinationSource, context);
  const result = vm.runInContext("seedInitialWrongTopicsV155(state)", context);
  assert.equal(result.missing.length, 0);
  assert.equal(result.unavailable.length, 0);
  entries.forEach(([key], index) => {
    assert.equal(state.planning.topicPrioritySignalsV155[key].syllabusItemId, `current-${index + 1}`);
  });
});

test("V349 transforma prioridade histórica realmente ausente em aviso, não erro fatal", () => {
  const context = vmContext({ state: { planning: { topicPrioritySignalsV155: {} }, syllabusItems: [] } });
  vm.runInContext(`
    const INITIAL_WRONG_TOPICS_V155 = Object.freeze([{ key: "police-inquiry-archiving", syllabusItemId: "old", label: "Arquivamento do inquérito policial" }]);
    function planningPrioritySignalsV155(targetState = state) { targetState.planning ||= {}; targetState.planning.topicPrioritySignalsV155 ||= {}; return targetState.planning.topicPrioritySignalsV155; }
    function seedInitialWrongTopicsV155(targetState = state) { return { inserted: [], missing: INITIAL_WRONG_TOPICS_V155, signals: planningPrioritySignalsV155(targetState) }; }
  ` + factoryDestinationSource, context);
  const result = vm.runInContext("seedInitialWrongTopicsV155(state)", context);
  assert.deepEqual(Array.from(result.missing), []);
  assert.equal(result.unavailable.length, 1);
  assert.equal(result.unavailable[0].key, "police-inquiry-archiving");
});

test("V349 preserva pasta destino informada manualmente", () => {
  const context = vmContext({ state: { factoryAgenda: [], factoryItems: [], migrations: {} } });
  vm.runInContext(factoryDestinationSource, context);
  const item = {
    id: "factory-1",
    disciplina: "Direito Penal",
    tema: "Crimes hediondos",
    factoryDestinationFolder: "https://drive.google.com/drive/folders/manual-escolhida"
  };
  const tree = {
    rootId: "root",
    nodes: [
      { id: "root", name: "PASTAS_DE_DESTINO", parentId: "", depth: 0, pathIds: ["root"], pathNames: [] },
      { id: "penal", name: "01_DIREITO_PENAL", parentId: "root", depth: 1, pathIds: ["root", "penal"], pathNames: ["01_DIREITO_PENAL"] },
      { id: "auto-hediondos", name: "CRIMES_HEDIONDOS", parentId: "penal", depth: 2, pathIds: ["root", "penal", "auto-hediondos"], pathNames: ["01_DIREITO_PENAL", "CRIMES_HEDIONDOS"] }
    ]
  };
  context.__applyFactoryDestinationToItemV232(item, tree);
  assert.equal(item.factoryDestinationFolder, "https://drive.google.com/drive/folders/manual-escolhida");
  assert.equal(item.factoryDestinationFolderManual, true);
  assert.equal(item.factoryDestinationFolderCatalogVersion, undefined);
});

test("V349 não emite erro V332 e aplica a pasta jurisprudencial ao prompt oficial", () => {
  const errors = [];
  const warnings = [];
  let saves = 0;
  const basePrompt = [
    "TRANSFORME JURISPRUDÊNCIAS EM MAPA MENTAL HIERÁRQUICO DE PALAVRAS-CHAVE PARA CÓPIA MANUSCRITA.",
    "",
    "## ESCOPO DO MÓDULO",
    "",
    "USE APENAS AS FONTES CLASSIFICADAS COMO JURISPRUDÊNCIA NA TRIAGEM.",
    "",
    "## VALIDAÇÃO OBRIGATÓRIA DAS FONTES",
    "",
    "ANTES DE AFIRMAR QUE NÃO EXISTE JURISPRUDÊNCIA:",
    "1. RECUPERE INTEGRALMENTE O RESULTADO DA TRIAGEM.",
    "",
    "## OBJETIVO",
    "",
    "NÚCLEO COBRÁVEL.",
    "",
    "## FORMATO OBRIGATÓRIO",
    "",
    "## ENTREGA EM WORD"
  ].join("\n");
  const context = vmContext({
    window: { __aldusBootstrapReady: true, addEventListener() {} },
    defaultFactoryPromptLibrary: { jurisprudencia: basePrompt },
    FACTORY_LIBRARY_FALLBACK: "fallback",
    state: { migrations: {}, factoryPromptLibrary: { jurisprudencia: basePrompt }, factoryPromptLibraryBackups: {} },
    normalizeFactoryPromptLibrary: (library) => library,
    saveData: () => { saves += 1; },
    factoryPromptBase: () => "fallback-base",
    console: { info() {}, warn: (...args) => warnings.push(args), error: (...args) => errors.push(args) }
  });
  context.globalThis = context;
  vm.runInContext(jurisprudenciaSource, context);
  assert.equal(errors.length, 0);
  assert.equal(warnings.length, 0);
  assert.match(context.state.factoryPromptLibrary.jurisprudencia, /1ECc_otgQKwH7WfPdQr8CtD0kB07pz9Xe/);
  assert.equal(context.state.migrations.factoryJurisprudenciaFonteCoberturaV332, true);
  assert.equal(context.__aldusFactoryJurisprudenciaV349.version, "20260816-runtime-stability-v349");
  assert.equal(saves, 1);
});

test("V349 mantém a otimização V348 integrada ao rastreamento real de exclusões", () => {
  let signatureCalls = 0;
  let cloneCalls = 0;
  const state = {
    subjects: Array.from({ length: 500 }, (_, index) => ({ id: `s${index}`, name: `Disciplina ${index}`, nested: { value: index } })),
    studies: [],
    dailyGoals: [{ id: "g1", minutes: 30 }]
  };
  const context = vmContext({
    state,
    window: undefined,
    SYNC_COLLECTIONS: ["subjects", "studies", "dailyGoals"],
    SYNC_MAX_NUMERIC_FIELDS: new Set(),
    syncStableSerialize(value) { signatureCalls += 1; return JSON.stringify(value); },
    syncCollectionKey(item, collection) { return `${collection}:id:${item.id}`; },
    syncClone(value) { cloneCalls += 1; return structuredClone(value); },
    syncTimestamp() { return 0; },
    syncPrimitiveArray(left, right) { return [...left, ...right]; },
    syncValueEmpty(value) { return value === null || value === undefined || value === ""; },
    getDeviceId() { return "device-v349"; },
    saveData() { return true; },
    structuredClone
  });
  context.globalThis = context;
  vm.runInContext(syncDeletionSource, context);
  signatureCalls = 0;
  cloneCalls = 0;
  state.subjects[10].name = "Alterada";
  context.saveData({ skipDerivedRefresh: true });
  assert.equal(cloneCalls, 0);
  assert.equal(signatureCalls, 502, "500 subjects + 1 dailyGoal na comparação e 1 dailyGoal no refresh pós-save");
  assert.equal(context.__aldusSyncSavePerformanceV348.integrated, true);
  assert.equal(context.__aldusSyncSavePerformanceV348.version, "20260816-runtime-stability-v349");
});
