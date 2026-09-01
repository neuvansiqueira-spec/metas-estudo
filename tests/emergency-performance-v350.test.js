const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const vm = require("node:vm");

function loadPcprModuleWithHotfix() {
  const source = fs.readFileSync("app-v344.js", "utf8");
  const startMarker = "/* Aldus source: pcpr-pcma-2026-migration.js */";
  const endMarker = "/* Aldus source: qconcursos-pdf-import-v181.js */";
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start);
  assert.ok(start >= 0, "módulo PCPR/PCMA não encontrado em app-v344.js");
  assert.ok(end > start, "fim do módulo PCPR/PCMA não encontrado em app-v344.js");

  const context = {
    console: { info() {}, warn() {}, error() {}, log() {} },
    setInterval,
    clearInterval,
    Date
  };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(source.slice(start, end), context);

  const original = context.officialMappingsForItem;
  assert.equal(typeof original, "function", "officialMappingsForItem deve existir na V344");
  vm.runInContext(fs.readFileSync("performance-emergency-v350.js", "utf8"), context);
  assert.notEqual(context.officialMappingsForItem, original, "hotfix deve substituir a varredura linear");
  return context;
}

function buildMap(size) {
  return Array.from({ length: size }, (_, index) => ({
    id: `m-${index}`,
    syllabusItemId: `item-${index % 40}`,
    contestId: index % 2 ? "pcpr-2026-delegado" : "pcma-2026-delegado",
    code: `C${index}`,
    classification: "A"
  }));
}

function legacyMappingsForItem(state, syllabusItemId) {
  return (state.contestSyllabusMap || []).filter((mapping) => mapping.syllabusItemId === syllabusItemId);
}

test("V350 preserva exatamente o resultado da consulta anterior", () => {
  const { officialMappingsForItem } = loadPcprModuleWithHotfix();
  const state = { contestSyllabusMap: buildMap(600) };
  for (const id of ["item-0", "item-7", "item-39", "inexistente", ""]) {
    assert.deepEqual([...officialMappingsForItem(state, id)], legacyMappingsForItem(state, id));
  }
});

test("V350 reutiliza o índice em vez de repetir a varredura integral", () => {
  const { officialMappingsForItem } = loadPcprModuleWithHotfix();
  const raw = buildMap(4000);
  let numericReads = 0;
  const list = new Proxy(raw, {
    get(target, property, receiver) {
      if (typeof property === "string" && /^\d+$/.test(property)) numericReads += 1;
      return Reflect.get(target, property, receiver);
    }
  });
  const state = { contestSyllabusMap: list };

  officialMappingsForItem(state, "item-0");
  numericReads = 0;
  for (let round = 0; round < 25; round += 1) {
    for (let id = 0; id < 40; id += 1) officialMappingsForItem(state, `item-${id}`);
  }

  assert.ok(
    numericReads < 5000,
    `consultas repetidas não podem reler milhares de registros por chamada; leituras=${numericReads}`
  );
});

test("V350 mantém caches separados para estado vivo e clone", () => {
  const { officialMappingsForItem } = loadPcprModuleWithHotfix();
  const live = { contestSyllabusMap: buildMap(1000) };
  const clone = { contestSyllabusMap: live.contestSyllabusMap.map((item) => ({ ...item })) };

  for (let round = 0; round < 10; round += 1) {
    for (let id = 0; id < 40; id += 1) {
      assert.deepEqual([...officialMappingsForItem(live, `item-${id}`)], legacyMappingsForItem(live, `item-${id}`));
      assert.deepEqual([...officialMappingsForItem(clone, `item-${id}`)], legacyMappingsForItem(clone, `item-${id}`));
    }
  }
});

test("V350 usa o observador já carregado antes do bootstrap e preserva o Service Worker V344", () => {
  const observer = fs.readFileSync("security-observability-v318.js", "utf8");
  const docsObserver = fs.readFileSync("docs/security-observability-v318.js", "utf8");
  const html = fs.readFileSync("index.html", "utf8");
  const worker = fs.readFileSync("service-worker.js", "utf8");
  const docsWorker = fs.readFileSync("docs/service-worker.js", "utf8");

  assert.equal(observer, docsObserver, "observabilidade raiz/docs deve permanecer idêntica");
  assert.match(observer, /performance-emergency-v350\.js\?v=20260901-v426-postcondition-r2/);
  assert.match(observer, /aldusEmergencyPerformanceV350/);
  assert.match(observer, /script\.async = false/);
  assert.ok(
    html.indexOf("security-observability-v318.js") < html.indexOf("bootstrap-integrity-loader-v258.js"),
    "carregador emergencial deve entrar antes do bootstrap"
  );

  assert.equal(worker, docsWorker, "Service Worker raiz/docs deve continuar idêntico");
  assert.match(worker, /CURRENT_VERSION = "20260815-interacao-responsiva-v344"/);
  assert.match(worker, /SECURITY_HARDENING/);
  assert.match(worker, /async function cachedFirstNavigation\(request, event\)/);
  assert.doesNotMatch(worker, /emergency-safe-mode-v350/);
});

test("hotfix V350 permanece idêntico entre raiz e docs", () => {
  assert.equal(
    fs.readFileSync("performance-emergency-v350.js", "utf8"),
    fs.readFileSync("docs/performance-emergency-v350.js", "utf8")
  );
});