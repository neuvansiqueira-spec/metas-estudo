const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const inserted = [];
const currentScript = {
  src: "https://example.test/bootstrap-integrity-loader-v258.js",
  id: "aldusBootstrapIntegrityV258",
  nonce: "",
  crossOrigin: "",
  referrerPolicy: "",
  nextSibling: null,
  removeAttribute(name) { if (name === "id") this.id = ""; },
  parentNode: {
    insertBefore(node) { inserted.push(node); }
  }
};
const context = {
  console,
  URL,
  Date,
  Set,
  Map,
  WeakSet,
  Object,
  Array,
  JSON,
  String,
  Number,
  Boolean,
  structuredClone,
  document: {
    currentScript,
    baseURI: "https://example.test/",
    createElement() {
      return {
        src: "",
        async: true,
        addEventListener() {}
      };
    },
    head: null,
    documentElement: null
  }
};
context.globalThis = context;
vm.createContext(context);
vm.runInContext(fs.readFileSync("bootstrap-integrity-loader-v258.js", "utf8"), context);

const duplicate = {
  id: "7d97fba2-03d5-57ed-bc23-bdd42fb35ae6",
  discipline: "DIREITO ADMINISTRATIVO E GESTÃO PÚBLICA",
  topic: "5.9.2 Controle interno e externo.",
  reference: "Anexo I, item 5.9.2",
  contestCategory: "B"
};
const duplicateMapping = {
  id: "pcpr-2026:direito administrativo e gestao publica:5.9.2",
  contestId: "pcpr-2026-delegado",
  syllabusItemId: duplicate.id,
  code: "5.9.2",
  discipline: duplicate.discipline,
  topic: "Controle interno e externo.",
  subtopic: "Controle interno e externo.",
  reference: "Anexo I, item 5.9.2",
  classification: "B",
  questionWeight: 4,
  source: "Edital PCPR"
};
const canonical = {
  id: "canonical-9.10.1",
  discipline: "DIREITO ADMINISTRATIVO",
  topic: "9.10 Controle da Administração Pública. • 9.10.1",
  subject: "Controle administrativo",
  reference: "9.10.1 Controle administrativo.",
  contestCategory: "A",
  studyTime: 2.5,
  diagnosis: "OK",
  officialCoverage: [{
    contestId: "pcma-2026-delegado",
    code: "9.10.1",
    reference: "9.10.1 Controle administrativo.",
    classification: "A"
  }]
};

context.PCPR_PCMA_2026_CATALOG = {
  version: "pcpr-pcma-2026-v3",
  newItems: [duplicate, { id: "other" }],
  historicalItems: [],
  mappings: [duplicateMapping, { id: "other-map", syllabusItemId: "other" }]
};
assert.equal(context.PCPR_PCMA_2026_CATALOG.newItems.length, 1);
assert.equal(context.PCPR_PCMA_2026_CATALOG.mappings.length, 1);

context.applyPcprPcma2026Migration = (state) => ({ changed: false, blocked: false });
const state = {
  syllabusItems: [canonical, duplicate],
  contestSyllabusMap: [duplicateMapping],
  schedulableSettings: {
    [canonical.id]: { availability: "Agendável", priority: true },
    [duplicate.id]: { availability: "Agendável", priority: true }
  },
  studies: [{ syllabusItemId: duplicate.id, duration: 12 }],
  dailyGoals: [{ editalItemId: duplicate.id }],
  migrations: {}
};
const report = context.applyPcprPcma2026Migration(state);
assert.equal(report.changed, true);
assert.equal(state.syllabusItems.length, 1);
assert.equal(state.syllabusItems[0].id, canonical.id);
assert.equal(state.syllabusItems[0].studyTime, 2.5);
assert.equal(state.syllabusItems[0].contestCategory, "A");
assert.equal(state.studies[0].syllabusItemId, canonical.id);
assert.equal(state.dailyGoals[0].editalItemId, canonical.id);
assert.equal(state.contestSyllabusMap[0].syllabusItemId, canonical.id);
assert.equal(state.syllabusItems[0].officialCoverage.length, 2);
assert.equal(state.schedulableSettings[duplicate.id], undefined);
assert.equal(inserted.length, 1);
assert.match(inserted[0].src, /bootstrap-integrity-loader-v258-core\.js/);
console.log("canonical-control-admin-v259: 12 assertions passed");
