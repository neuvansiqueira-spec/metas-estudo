const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { execFileSync } = require("node:child_process");

// V654 — 05/10/2026, perfil do DevTools gravado pelo usuário (aba visível,
// conectado ao Drive): depois de Reconectar, a conferência com a nuvem mesclou os
// ~20 MB (mergeSyncStates 2,6 s; cadeia 3,9 s) e a página ficou parada de 29 a 34 s.
// Conferido nos dados reais dele (aba do Chrome, sem gravar): a mesclagem nova dá
// resultado idêntico byte a byte em 4 cenários e cai de ~3,0–3,4 s para ~1,4–1,6 s.

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

function engine(sources) {
  const source = [
    "const defaultState = { subjects: [], dailyGoals: [], settings: {}, planning: {}, migrations: {} };",
    "let state = {};",
    "function cloneData(value) { return value == null ? value : JSON.parse(JSON.stringify(value)); }",
    ...sources,
    "globalThis.__api = { mergeSyncStates, syncMergeRecord, syncMergeCollection };"
  ].join("\n");
  const context = { console, setTimeout: () => 0, clearTimeout: () => {}, localStorage: { setItem() {} }, getDeviceId: () => "pc" };
  vm.createContext(context);
  vm.runInContext(source, context);
  return context.__api;
}

function previousSources() {
  try {
    return ["sync-integral-core.js", "sync-integral-deletions.js", "sync-integral-state.js"]
      .map((file) => execFileSync("git", ["show", `9a923a6:${file}`], { cwd: root, encoding: "utf8" }));
  } catch {
    return null;
  }
}

function sampleStates() {
  const t1 = "2026-10-01T10:00:00.000Z";
  const t2 = "2026-10-05T12:00:00.000Z";
  const goals = Array.from({ length: 30 }, (_, index) => ({
    id: `g${index}`, date: "2026-10-05", subject: `Assunto ${index}`, discipline: "Penal", origin: "manual",
    actualMinutes: index, studyActualMinutes: index, status: index % 3 ? "Pendente" : "Concluída", updatedAt: t1,
    history: [{ at: t1, minutes: index }], meta: { nested: { deep: [index, "x"] }, label: `L${index}` }
  }));
  const agenda = Array.from({ length: 12 }, (_, index) => ({ id: `f${index}`, tema: `Tema ${index}`, prioridade: "Média", updatedAt: t1, modules: { resumoAula: { status: "Não iniciado" } } }));
  const local = {
    updatedAt: t1, subjects: [{ id: "s1", name: "Penal", updatedAt: t1 }], dailyGoals: goals,
    factoryAgenda: agenda, factoryItems: agenda, settings: { theme: "dark", weekly: 20 }, planning: { config: { topicsPerDay: 3 } },
    migrations: { a: true }, duplicateDiagnostics: { runs: [{ at: t1, found: 2 }] }, questionBank: [{ id: "q1", enunciado: "A", updatedAt: t1 }]
  };
  const remote = JSON.parse(JSON.stringify(local));
  remote.updatedAt = t2;
  remote.dailyGoals.slice(0, 10).forEach((goal, index) => { goal.updatedAt = t2; goal.actualMinutes += 5; goal.history.push({ at: t2, minutes: 5 }); goal.meta.label = `R${index}`; });
  remote.dailyGoals.push({ id: "g-novo", date: "2026-10-06", subject: "Novo", discipline: "Civil", origin: "manual", updatedAt: t2 });
  remote.factoryAgenda = remote.factoryItems;
  remote.factoryAgenda[0].prioridade = "Alta";
  remote.factoryAgenda[0].updatedAt = t2;
  remote.settings.weekly = 25;
  remote.questionBank = [];
  return { local, remote };
}

test("V654 a mesclagem nova dá exatamente o mesmo resultado que a anterior", () => {
  const previous = previousSources();
  if (!previous) return; // cópia sem histórico git
  const before = engine(previous);
  const after = engine(["sync-integral-core.js", "sync-integral-deletions.js", "sync-integral-state.js"].map(read));
  const { local, remote } = sampleStates();
  for (const [a, b, prefer] of [[local, remote, "remote"], [remote, local, "local"], [local, local, "remote"], [remote, remote, "local"]]) {
    assert.equal(JSON.stringify(after.mergeSyncStates(a, b, prefer)), JSON.stringify(before.mergeSyncStates(a, b, prefer)));
  }
  // Registro a registro, inclusive objetos aninhados e listas.
  local.dailyGoals.forEach((goal, index) => {
    const other = remote.dailyGoals[index];
    assert.equal(JSON.stringify(after.syncMergeRecord(goal, other, "remote")), JSON.stringify(before.syncMergeRecord(goal, other, "remote")));
    assert.equal(JSON.stringify(after.syncMergeRecord(other, goal, "local")), JSON.stringify(before.syncMergeRecord(other, goal, "local")));
  });
});

test("V654 a mesclagem não altera os estados de entrada", () => {
  const api = engine(["sync-integral-core.js", "sync-integral-deletions.js", "sync-integral-state.js"].map(read));
  const { local, remote } = sampleStates();
  const localBefore = JSON.stringify(local);
  const remoteBefore = JSON.stringify(remote);
  const merged = api.mergeSyncStates(local, remote, "remote");
  merged.dailyGoals[0].subject = "mudado depois";
  assert.equal(JSON.stringify(local), localBefore);
  assert.equal(JSON.stringify(remote), remoteBefore);
});

function uploadHarness({ modifiedTime, prefetchedModifiedTime }) {
  const calls = { downloads: 0, updates: 0 };
  const remote = { app: "metas-estudo", schemaVersion: 1, updatedAt: "2026-10-05T10:00:00.000Z", deviceId: "celular", state: { dailyGoals: [] } };
  const context = {
    console, Date, JSON, Object, String, Boolean, Array, Set, Math, Number,
    isSyncing: false,
    state: { dailyGoals: [] },
    cloneData: (value) => JSON.parse(JSON.stringify(value)),
    syncStateFingerprint: () => "fp",
    findSyncFile: async () => ({ id: "arquivo", modifiedTime }),
    downloadSyncFile: async () => { calls.downloads += 1; return JSON.parse(JSON.stringify(remote)); },
    validateCloudPayload() {},
    syncCreateSafetyBackup() {},
    mergeSyncStates: (a, b) => ({ ...a, ...b }),
    getDeviceId: () => "pc", getDeviceName: () => "PC",
    updateSyncFile: async () => { calls.updates += 1; return { id: "arquivo" }; },
    createSyncFile: async () => ({ id: "arquivo" }),
    replaceState() {}, saveData() {}, writeSyncMeta() {}, syncPayloadUpdatedAt: () => "", suppressAutoChecksAfterSync() {}, render() {}, renderSyncStatus() {},
    makeSyncPayload: () => ({ state: {} })
  };
  context.globalThis = context;
  vm.createContext(context);
  const source = read("sync-integral-cloud.js");
  const start = source.indexOf("function syncPreparePayload(");
  const end = source.indexOf("async function applyCloudPayloadIntegral(");
  vm.runInContext(`${source.slice(start, end)}\nglobalThis.__upload = uploadSyncPayloadIntegral;`, context);
  return { calls, upload: () => context.__upload({ state: { dailyGoals: [] } }, { prefetchedRemote: remote, prefetchedModifiedTime }) };
}

test("V654 o envio reaproveita o arquivo já baixado quando o Drive tem a mesma versão", async () => {
  const run = uploadHarness({ modifiedTime: "2026-10-05T13:00:00.000Z", prefetchedModifiedTime: "2026-10-05T13:00:00.000Z" });
  await run.upload();
  assert.equal(run.calls.downloads, 0);
  assert.equal(run.calls.updates, 1);
});

test("V654 o envio baixa de novo quando o arquivo do Drive mudou", async () => {
  const run = uploadHarness({ modifiedTime: "2026-10-05T13:05:00.000Z", prefetchedModifiedTime: "2026-10-05T13:00:00.000Z" });
  await run.upload();
  assert.equal(run.calls.downloads, 1);
  assert.equal(run.calls.updates, 1);
});

test("V654 quem chama repassa o download já feito e a versão do arquivo", () => {
  const script = read("script.js");
  assert.match(script, /prefetchedRemote: file \? remoteForUploadV654 : null, prefetchedModifiedTime: file \? String\(file\.modifiedTime \|\| ""\) : ""/);
  assert.match(script, /validateCloudPayload\(payload\); markPulledSyncFileV654\(payload, file\);/);
  const cloud = read("sync-integral-cloud.js");
  assert.match(cloud, /prefetchedRemote: payload, prefetchedModifiedTime: mergedFromModifiedTime/);
});

test("V654 mantém paridade raiz/docs", () => {
  for (const file of ["script.js", "sync-integral-cloud.js", "sync-integral-state.js", "sync-integral-deletions.js"]) {
    assert.equal(read(path.join("docs", file)).replace(/\r\n/g, "\n"), read(file).replace(/\r\n/g, "\n"), file);
  }
});
