const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

// V655 — 05/10/2026: o usuário trabalha com várias abas do site (cronômetro e
// Fábrica) e o site travava mesmo sem reconectar o Drive. Cada salvamento fazia
// as outras abas lerem, conferirem e mesclarem os ~20 MB; e, conectado, cada
// alteração disparava um envio completo ao Drive 4 s depois.

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const script = read("script.js");
const between = (start, end) => {
  const from = script.indexOf(start);
  const to = script.indexOf(end, from + start.length);
  assert.ok(from >= 0 && to > from, `trecho não encontrado: ${start}`);
  return script.slice(from, to);
};

function batchHarness() {
  let now = 1_000_000;
  const timers = [];
  const runs = [];
  const listeners = {};
  const context = {
    Date: { now: () => now },
    Math,
    Boolean,
    AUTO_SYNC_DEBOUNCE_MS: 4000,
    autoSyncTimer: null, autoSyncIdleHandle: null, autoSyncIdleMode: "", pendingAutoSyncReason: "alteração",
    isSyncLocked: () => false,
    runAutoSyncAfterSave: (reason) => runs.push({ at: now, reason }),
    setTimeout: (fn, delay) => { const id = timers.length + 1; timers.push({ id, fn, at: now + delay, done: false }); return id; },
    clearTimeout: (id) => { const timer = timers.find((entry) => entry.id === id); if (timer) timer.done = true; },
    requestIdleCallback: (fn) => { const id = timers.length + 1; timers.push({ id, fn, at: now, done: false }); return id; },
    cancelIdleCallback: (id) => { const timer = timers.find((entry) => entry.id === id); if (timer) timer.done = true; },
    document: { hidden: false, addEventListener: (type, fn) => { listeners[type] = fn; } },
    window: { addEventListener: (type, fn) => { listeners[type] = fn; } }
  };
  vm.createContext(context);
  const code = between("// V655 — envio ao Drive em lote.", "function isQuotaExceededError")
    .replace(/^const /gm, "var ").replace(/^let /gm, "var ");
  vm.runInContext(`${code}\nglobalThis.__api = { autoSyncAfterSave, flushAutoSyncBatchNow, autoSyncBatchScheduled };`, context);
  const advance = (ms) => {
    const target = now + ms;
    for (;;) {
      const next = timers.filter((timer) => !timer.done && timer.at <= target).sort((a, b) => a.at - b.at)[0];
      if (!next) break;
      now = Math.max(now, next.at);
      next.done = true;
      next.fn();
    }
    now = target;
  };
  return { api: context.__api, runs, advance, listeners, context, now: () => now };
}

test("V655 a primeira alteração sai em 4 s; as seguintes juntam-se em um envio a cada 10 min", () => {
  const run = batchHarness();
  run.api.autoSyncAfterSave("primeira");
  run.advance(5000);
  assert.equal(run.runs.length, 1);
  for (let minute = 1; minute <= 9; minute += 1) {
    run.advance(60_000);
    run.api.autoSyncAfterSave(`alteração ${minute}`);
  }
  assert.equal(run.runs.length, 1, "nenhum envio antes de 10 minutos");
  run.advance(60_000);
  assert.equal(run.runs.length, 2, "um envio só para as 9 alterações");
  assert.equal(run.runs[1].reason, "alteração 9");
});

test("V655 ao sair da aba, o pendente é enviado na hora", () => {
  const run = batchHarness();
  run.api.autoSyncAfterSave("primeira");
  run.advance(5000);
  run.advance(60_000);
  run.api.autoSyncAfterSave("segunda");
  assert.equal(run.api.autoSyncBatchScheduled(), true);
  run.context.document.hidden = true;
  run.listeners.visibilitychange();
  assert.equal(run.runs.length, 2);
  assert.equal(run.api.autoSyncBatchScheduled(), false);
  run.advance(20 * 60_000);
  assert.equal(run.runs.length, 2, "não envia de novo sem alteração nova");
});

function signalHarness({ hidden, unchanged }) {
  const calls = { loads: 0, merges: 0, replaced: null, renders: 0, queued: 0 };
  const record = { checksum: "novo", data: { dailyGoals: [{ id: "g1" }] } };
  const context = {
    console,
    bootstrapStateReady: true,
    indexedDBPersistenceSignalHandling: false,
    indexedDBPersistenceInstanceId: "esta-aba",
    indexedDBPersistBaseChecksum: "base",
    indexedDBPersistQueued: false,
    indexedDBPersistInFlight: false,
    state: { dailyGoals: [] },
    document: { hidden },
    loadStateFromIndexedDB: async () => { calls.loads += 1; return record; },
    validateIndexedDBState: () => true,
    checksumForState: (value) => (value === context.state ? (unchanged ? "base" : "alterado") : "mesclado"),
    mergeSyncStates: (a, b) => { calls.merges += 1; return { ...a, ...b }; },
    replaceState: (value) => { calls.replaced = value; },
    queueIndexedDBStateCopy: () => { calls.queued += 1; },
    render: () => { calls.renders += 1; },
    showDailyGoalMessage() {}
  };
  vm.createContext(context);
  const code = between("let indexedDBDeferredSignalV655 = null;", "function installIndexedDBPersistenceSignals()").replace(/^let /gm, "var ");
  vm.runInContext(`${code}\nglobalThis.__handle = handleIndexedDBPersistenceSignal; globalThis.__deferred = () => indexedDBDeferredSignalV655;`, context);
  return { context, calls, record, handle: (signal) => context.__handle(signal) };
}

test("V655 aba escondida não lê nem mescla: guarda o aviso para quando voltar", async () => {
  const run = signalHarness({ hidden: true, unchanged: true });
  await run.handle({ source: "outra-aba", checksum: "novo" });
  assert.equal(run.calls.loads, 0);
  assert.equal(run.calls.merges, 0);
  assert.deepEqual(run.context.__deferred(), { source: "outra-aba", checksum: "novo" });
});

test("V655 aba sem nada próprio pendente adota o registro salvo sem mesclar", async () => {
  const run = signalHarness({ hidden: false, unchanged: true });
  await run.handle({ source: "outra-aba", checksum: "novo" });
  assert.equal(run.calls.merges, 0);
  assert.equal(run.calls.replaced, run.record.data);
  assert.equal(run.context.indexedDBPersistBaseChecksum, "novo");
  assert.equal(run.calls.renders, 1);
});

test("V655 aba com alteração própria ainda não gravada mescla como antes", async () => {
  const run = signalHarness({ hidden: false, unchanged: false });
  await run.handle({ source: "outra-aba", checksum: "novo" });
  assert.equal(run.calls.merges, 1);
  assert.equal(run.calls.queued, 1);
});

test("V655 a aba que volta a ser vista processa o último aviso guardado", () => {
  const install = between("function installIndexedDBPersistenceSignals()", "installIndexedDBPersistenceSignals();");
  assert.match(install, /visibilitychange[\s\S]*indexedDBDeferredSignalV655 = null;[\s\S]*handleIndexedDBPersistenceSignal\(signal\)/);
});

test("V655 a conferência da nuvem não refaz a mesclagem enquanto o lote está agendado", () => {
  const source = read("sync-leve-conferencia-v649.js");
  assert.match(source, /modifiedTime === lastFullCheckModifiedTime && \(!syncPending\(\) \|\| batchScheduled\)/);
  assert.match(source, /if \(saved\?\.modifiedTime\) lastFullCheckModifiedTime = String\(saved\.modifiedTime\);/);
  assert.match(read("performance-emergency-v350.js"), /sync-leve-conferencia-v649\.js\?v=20261005-envio-em-lote-v655/);
});

test("V655 mantém paridade raiz/docs", () => {
  for (const file of ["script.js", "sync-leve-conferencia-v649.js", "performance-emergency-v350.js"]) {
    assert.equal(read(path.join("docs", file)).replace(/\r\n/g, "\n"), read(file).replace(/\r\n/g, "\n"), file);
  }
});
