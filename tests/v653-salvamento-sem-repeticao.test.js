const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

// V653 — 05/10/2026, medido na aba do usuário (20,3 MB de dados): cada ação que
// salva custava 1,5–2 s de página parada, porque a atualização derivada (V186)
// salvava e redesenhava de novo mesmo sem mudar nada, cada gravação reconferia
// os 20 MB do registro já conferido, e a lista da Fábrica era assinada duas vezes.

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

function v186({ priority, reinforcement, factory, fresh }) {
  let idle = null;
  const saves = [];
  const counters = { render: 0, sync: 0 };
  const context = {
    console, Date, Object, String, Number, Array, Boolean, Set, Map,
    state: {},
    document: { hidden: false },
    performance: { now: () => 1 },
    saveData(options = {}) { saves.push({ ...options }); context.viewDataRevisionV172 += 1; return true; },
    refreshPlanningPrioritiesForQuestionChangesV155: () => priority,
    repairInvalidReinforcementGoalsV157: () => reinforcement,
    syncFactoryMaterialsPlanningV80: () => factory,
    render() { counters.render += 1; },
    autoSyncAfterSave() { counters.sync += 1; },
    requestIdleCallback(callback) { idle = callback; return 1; },
    cancelIdleCallback() { idle = null; },
    setTimeout, clearTimeout,
    hashToView: () => "planejamento",
    resolveViewTarget: (view) => view
  };
  context.globalThis = context;
  context.window = context;
  vm.createContext(context);
  // viewRenderCacheV172 e viewDataRevisionV172 são declarações globais do script.js.
  vm.runInContext("var viewDataRevisionV172 = 10; var viewRenderCacheV172 = new Map();", context);
  vm.runInContext(read("save-performance-v186.js"), context);
  return {
    context, saves, counters,
    // A ação salva (revisão avança) e depois desenha a tela com a revisão nova.
    act() {
      context.saveData({ markLocalChange: true });
      if (fresh) vm.runInContext("viewRenderCacheV172.set('planejamento', { revision: viewDataRevisionV172, renderedAt: Date.now() });", context);
    },
    flush() { const callback = idle; idle = null; callback?.(); }
  };
}

const unchanged = { changed: false };

test("V653 sem mudança derivada e com a tela atual: não salva nem redesenha de novo, mas sincroniza", () => {
  const run = v186({ priority: unchanged, reinforcement: unchanged, factory: unchanged, fresh: true });
  run.act();
  run.flush();
  assert.equal(run.saves.length, 1, "só o salvamento da própria ação");
  assert.equal(run.counters.render, 0);
  assert.equal(run.counters.sync, 1);
  assert.equal(run.context.__aldusDeferredDerivedRefreshV186.repeatedSaveSkipped, true);
});

test("V653 sem mudança derivada mas tela não desenhada depois do salvamento: redesenha", () => {
  const run = v186({ priority: unchanged, reinforcement: unchanged, factory: unchanged, fresh: false });
  run.act();
  run.flush();
  assert.equal(run.saves.length, 1);
  assert.equal(run.counters.render, 1);
});

test("V653 com mudança derivada: salva e redesenha como antes", () => {
  const run = v186({ priority: unchanged, reinforcement: unchanged, factory: { changed: true }, fresh: true });
  run.act();
  run.flush();
  assert.equal(run.saves.length, 2);
  assert.equal(run.counters.render, 1);
  assert.equal(run.counters.sync, 1);
});

test("V653 passo sem resultado conta como mudança (comportamento anterior)", () => {
  const run = v186({ priority: undefined, reinforcement: unchanged, factory: unchanged, fresh: true });
  run.act();
  run.flush();
  assert.equal(run.saves.length, 2);
  assert.equal(run.counters.render, 1);
});

test("V653 a gravação não reconfere o registro já conferido, mas confere qualquer outro", () => {
  const storage = require("../storage-indexeddb.js");
  const data = { subjects: [{ id: "s1", name: "Penal" }], dailyGoals: [{ id: "g1" }] };
  const record = {
    id: "current", schemaVersion: 1, savedAt: "2026-10-05T12:00:00.000Z",
    checksum: storage.checksumForState(data), serializedSize: JSON.stringify(data).length, data
  };
  const fresh = () => structuredClone(record);
  assert.equal(storage.validateIndexedDBState(fresh()), true, "conferência completa do registro gravado");

  // Mesmo registro relido do IndexedDB: a gravação seguinte o aceita sem refazer a conta.
  const sameRecord = fresh();
  sameRecord.data.subjects[0].name = "alterado só para provar que a conta não foi refeita";
  const accepted = storage.resolveIndexedDBWriteCandidate({ subjects: [{ id: "s2" }] }, sameRecord, {});
  assert.equal(accepted.previousChecksum, record.checksum);

  // Registro diferente (outra gravação) com dados que não batem: conferido e recusado.
  const other = fresh();
  other.savedAt = "2026-10-05T12:00:01.000Z";
  other.data.subjects[0].name = "corrompido";
  const rejected = storage.resolveIndexedDBWriteCandidate({ subjects: [{ id: "s2" }] }, other, {});
  assert.equal(rejected.previousChecksum, "");
});

function deletionTracker() {
  const source = [
    "let state = {};",
    "function cloneData(value) { return value == null ? value : JSON.parse(JSON.stringify(value)); }",
    read("sync-integral-core.js"),
    read("sync-integral-deletions.js"),
    "globalThis.__api = { syncSnapshotCollections, syncTrackCollectionMutations };",
    "globalThis.__countSignatures = () => { const original = syncRecordSignature; let calls = 0; syncRecordSignature = (value) => { calls += 1; return original(value); }; return () => calls; };"
  ].join("\n");
  const context = { console, setTimeout: () => 0, clearTimeout: () => {}, localStorage: { setItem() {} }, getDeviceId: () => "pc" };
  vm.createContext(context);
  vm.runInContext(source, context);
  return context;
}

test("V653 a lista da Fábrica com dois nomes é assinada uma vez, com o mesmo resultado", () => {
  const context = deletionTracker();
  const agenda = Array.from({ length: 5 }, (_, index) => ({ id: `f${index}`, tema: `Tema ${index}` }));
  const shared = { factoryItems: agenda, factoryAgenda: agenda };
  const separate = { factoryItems: structuredClone(agenda), factoryAgenda: structuredClone(agenda) };
  const calls = context.__countSignatures();
  const snapshotShared = context.__api.syncSnapshotCollections(shared);
  assert.equal(calls(), 5);
  const snapshotSeparate = context.__api.syncSnapshotCollections(separate);
  for (const collection of ["factoryItems", "factoryAgenda"]) {
    assert.deepEqual([...snapshotShared[collection]], [...snapshotSeparate[collection]]);
  }
  agenda[2].tema = "Tema editado";
  const changed = context.__api.syncTrackCollectionMutations(snapshotShared, shared, "2026-10-05T12:00:00.000Z");
  assert.equal(changed, true);
  assert.equal(agenda[2].updatedAt, "2026-10-05T12:00:00.000Z");
  assert.equal(agenda[1].updatedAt, undefined);
});

test("V653 mantém paridade raiz/docs", () => {
  for (const file of ["save-performance-v186.js", "storage-indexeddb.js", "sync-integral-deletions.js"]) {
    assert.equal(read(path.join("docs", file)).replace(/\r\n/g, "\n"), read(file).replace(/\r\n/g, "\n"), file);
  }
});
