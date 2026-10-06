/* V660 — correções da auditoria de 06/10/2026. */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const read = (file) => fs.readFileSync(file, "utf8");

// --- 1. Carimbo em massa na abertura -------------------------------------

function deletionTracker() {
  const listeners = {};
  const context = {
    console, setTimeout: () => 0, clearTimeout: () => {}, localStorage: { setItem() {} }, getDeviceId: () => "pc",
    requestIdleCallback: () => 0,
    window: { addEventListener: (type, fn) => { listeners[type] = fn; } },
    saves: 0
  };
  vm.createContext(context);
  vm.runInContext([
    "let state = { dailyGoals: [] };",
    "function cloneData(value) { return value == null ? value : JSON.parse(JSON.stringify(value)); }",
    "function saveData() { globalThis.saves += 1; }",
    read("sync-integral-core.js"),
    read("sync-integral-deletions.js"),
    "globalThis.__setState = (next) => { state = next; };",
    "globalThis.__state = () => state;",
    "globalThis.__save = () => saveData();"
  ].join("\n"), context);
  return { context, ready: () => listeners["aldus:bootstrap-ready"]() };
}

test("V660 a abertura não carimba registros que não mudaram", () => {
  const { context, ready } = deletionTracker();
  // Reparos salvam antes de os dados carregarem: o estado ainda é o padrão.
  context.__save();
  context.__save();
  const loaded = { dailyGoals: [
    { id: "g1", subject: "Prisão", updatedAt: "2026-10-05T23:30:27.491Z" },
    { id: "g2", subject: "Inquérito", updatedAt: "2026-10-05T23:30:27.491Z" }
  ] };
  context.__setState(loaded);
  ready();
  context.__save();
  assert.deepEqual(context.__state().dailyGoals.map((goal) => goal.updatedAt), ["2026-10-05T23:30:27.491Z", "2026-10-05T23:30:27.491Z"]);
  assert.deepEqual(Object.keys(context.__state().syncTombstones.collections.dailyGoals || {}), []);
});

test("V660 depois da abertura, só o registro alterado ganha horário novo", () => {
  const { context, ready } = deletionTracker();
  context.__setState({ dailyGoals: [{ id: "g1", subject: "A", updatedAt: "2026-10-01T00:00:00.000Z" }, { id: "g2", subject: "B", updatedAt: "2026-10-01T00:00:00.000Z" }] });
  ready();
  context.__state().dailyGoals[1].subject = "B editado";
  context.__save();
  const [g1, g2] = context.__state().dailyGoals;
  assert.equal(g1.updatedAt, "2026-10-01T00:00:00.000Z");
  assert.notEqual(g2.updatedAt, "2026-10-01T00:00:00.000Z");
});

// --- 4. Gravação sem segurar o banco durante a mesclagem -----------------

function storageHarness(initial) {
  let stored = initial ? structuredClone(initial) : null;
  const operations = [];
  let onFirstGet = null;
  const context = { console, Date, structuredClone, setImmediate, Blob,
    indexedDB: { open() {
      const request = {};
      setImmediate(() => {
        request.result = { close() {}, transaction() {
          let pending = 0, aborted = false, completed = false;
          const finish = () => setImmediate(() => { if (!pending && !aborted && !completed) { completed = true; tx.oncomplete(); } });
          const tx = { abort() { aborted = true; setImmediate(() => tx.onabort()); },
            objectStore() { return {
              get() {
                operations.push("get");
                pending++;
                const result = {};
                setImmediate(() => {
                  if (aborted) return;
                  if (onFirstGet) { const hook = onFirstGet; onFirstGet = null; hook(); }
                  result.result = structuredClone(stored);
                  result.onsuccess?.();
                  pending--;
                  finish();
                });
                return result;
              },
              put(value) { operations.push("put"); stored = structuredClone(value); return {}; }
            }; }
          };
          return tx;
        } };
        request.onsuccess();
      });
      return request;
    } }
  };
  vm.createContext(context);
  vm.runInContext(read("storage-indexeddb.js"), context);
  return { context, operations, stored: () => stored, beforeFirstGet: (hook) => { onFirstGet = hook; } };
}

test("V660 sem mudança desde a cópia conferida, não regrava", async () => {
  const db = require("../storage-indexeddb.js");
  const data = { dailyGoals: [{ id: "g1" }] };
  const record = { id: "current", schemaVersion: 1, savedAt: "x", checksum: db.checksumForState(data), serializedSize: 1, data };
  const h = storageHarness(record);
  const saved = await h.context.saveStateToIndexedDB(structuredClone(data), { directSnapshot: true, verify: true, expectedChecksum: record.checksum });
  assert.deepEqual(h.operations, ["get"]);
  assert.equal(saved.unchangedV660, true);
  assert.equal(saved.checksum, record.checksum);
});

test("V660 outra aba gravou no meio: mescla fora da transação e grava de novo", async () => {
  const db = require("../storage-indexeddb.js");
  const base = { dailyGoals: [{ id: "g1" }] };
  const baseRecord = { id: "current", schemaVersion: 1, savedAt: "a", checksum: db.checksumForState(base), serializedSize: 1, data: base };
  const other = { dailyGoals: [{ id: "g1" }, { id: "outra-aba" }] };
  // Esta aba conhece a cópia "base"; outra aba já gravou "other" no banco.
  const otherRecord = { id: "current", schemaVersion: 1, savedAt: "b", checksum: db.checksumForState(other), serializedSize: 1, data: other };
  const h2 = storageHarness(otherRecord);
  let merges = 0;
  const saved = await h2.context.saveStateToIndexedDB({ dailyGoals: [{ id: "g1" }, { id: "local" }] }, {
    directSnapshot: true, verify: true, expectedChecksum: baseRecord.checksum,
    mergeConcurrentState: (local, stored) => { merges += 1; return { dailyGoals: [...stored.dailyGoals, ...local.dailyGoals.filter((g) => !stored.dailyGoals.some((s) => s.id === g.id))] }; }
  });
  assert.equal(merges, 1);
  // 1ª transação: só lê e sai sem gravar; 2ª: lê, grava e confere.
  assert.deepEqual(h2.operations, ["get", "get", "put", "get"]);
  assert.equal(saved.concurrentMerge, true);
  assert.deepEqual(h2.stored().data.dailyGoals.map((g) => g.id), ["g1", "outra-aba", "local"]);
});

test("V660 a proteção contra estado vazio continua valendo", async () => {
  const db = require("../storage-indexeddb.js");
  const data = { dailyGoals: [{ id: "g1" }] };
  const record = { id: "current", schemaVersion: 1, savedAt: "x", checksum: db.checksumForState(data), serializedSize: 1, data };
  const h = storageHarness(record);
  await assert.rejects(h.context.saveStateToIndexedDB({}, { directSnapshot: true }), /estado vazio não substitui/);
  assert.deepEqual(h.stored().data, data);
});

// --- 5. Impressões digitais repetidas na abertura -----------------------

test("V660 só com o IndexedDB como fonte, não compara a cópia consigo mesma", () => {
  const source = read("sync-integral-time-protection.js");
  assert.match(source, /const onlyIndexedDB = sources\.length === 1 && sources\[0\] === "IndexedDB";/);
  assert.match(source, /const changed = onlyIndexedDB \? false : typeof syncStateFingerprint === "function"/);
});

// --- 6. Tempo por período sem varrer os estudos para cada meta ----------

function legacyLogs(state) {
  const number = (value) => Math.max(0, Number(value) || 0);
  const date = (record) => String(record?.date || record?.data || "").slice(0, 10);
  const key = (record) => String(record.timerSessionId || record.sessionId || record.id || JSON.stringify(record));
  const unique = (records = []) => { const seen = new Set(); return records.filter((r) => { const id = key(r); if (seen.has(id)) return false; seen.add(id); return true; }); };
  const recordSeconds = (record = {}) => {
    for (const field of ["seconds", "elapsedSeconds", "actualDurationSeconds"]) {
      const value = record[field];
      if (value !== undefined && value !== null && value !== "" && Number.isFinite(Number(value)) && Number(value) >= 0) return Math.round(Number(value));
    }
    return Math.round(number(record.minutes ?? record.actualDuration) * 60);
  };
  const legacyGoalMinutes = (goal = {}) => {
    const has = (field) => goal[field] !== undefined && goal[field] !== null && goal[field] !== "";
    const questions = number(goal.questionActualMinutes);
    return has("studyActualMinutes") || has("questionActualMinutes") ? number(goal.studyActualMinutes) + questions : number(goal.actualMinutes ?? goal.tempo_real_minutos);
  };
  const credited = (goal, studies) => studies.filter((s) => String(s.goalId || s.dailyGoalId || "") === String(goal.id) && s.origin === "timer" && s.updatesGoal !== false);
  const residual = (goal, studies) => Math.max(0, legacyGoalMinutes(goal) - credited(goal, studies).reduce((t, s) => t + number(s.minutes), 0));
  const studies = unique(state.studies || []);
  return [
    ...studies.map((s) => ({ ...s, seconds: recordSeconds(s) })),
    ...unique(state.dailyGoals || []).map((g) => ({ id: `goal-${g.id}`, date: date(g), discipline: g.discipline || g.disciplina, topic: g.subject || g.assunto, syllabusItemId: g.syllabusItemId, type: g.type || g.tipo || "Meta", seconds: Math.round(residual(g, studies) * 60) })),
    ...unique(state.questionLogs || []).map((q) => ({ ...q, id: `questions-${q.id || key(q)}`, date: date(q), type: q.trainingType || "Questões", seconds: recordSeconds(q) }))
  ].filter((log) => log.seconds > 0);
}

test("V660 a lista de tempo devolve exatamente o mesmo resultado", () => {
  const ledger = require("../study-time-ledger.js");
  let seed = 7;
  const random = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
  const pick = (list) => list[Math.floor(random() * list.length)];
  const goals = Array.from({ length: 120 }, (_, i) => ({ id: `g${i}`, date: pick(["2026-10-01", "2026-10-05"]), subject: "S", studyActualMinutes: pick([0, 15.5, 40, undefined]), questionActualMinutes: pick([0, 10, undefined]), actualMinutes: pick([0, 30, 75]) }));
  const studies = Array.from({ length: 300 }, (_, i) => ({ id: `s${i}`, timerSessionId: pick([`t${i}`, `t${i % 40}`, ""]), goalId: pick([`g${i % 120}`, "", undefined]), dailyGoalId: pick(["", `g${i % 7}`]), origin: pick(["timer", "manual"]), updatesGoal: pick([true, false, undefined]), minutes: pick([5, 12.25, 30]), seconds: pick([undefined, 300]), date: "2026-10-05" }));
  const state = { dailyGoals: goals, studies, questionLogs: [{ id: "q1", minutes: 20, date: "2026-10-05" }] };
  assert.deepEqual(ledger.logs(state), legacyLogs(state));
});

// --- 7. Etapa do carregador que nunca terminava -------------------------

test("V660 o carregador V258 reconhece script já carregado por outro caminho", () => {
  const source = read("bootstrap-integrity-loader-v258-core.js");
  assert.match(source, /function scriptAlreadyFetched\(element\)/);
  assert.match(source, /scriptAlreadyFetched\(existing\) && document\.readyState === "complete"/);
  assert.equal(source, read("docs/bootstrap-integrity-loader-v258-core.js"));
});

// --- 9. Registro de pausas enxerga todos os cliques ----------------------

test("V660 o registro de pausas ouve na janela, antes de qualquer bloqueio", () => {
  const source = read("timer-pause-origin-v645.js");
  assert.match(source, /typeof window\.addEventListener === "function" \? window : document/);
  assert.match(source, /alvoDosCliques\.addEventListener\("click"/);
});

// --- 10. Assuntos por dia acompanha disciplinas por dia ------------------

test("V660 'Assuntos por dia' acompanha 'Disciplinas por dia' nos dois sentidos", () => {
  const source = read("planning-integrity-v235.js");
  assert.match(source, /countInput\.addEventListener\("input", \(\) => \{\s*const count = positiveInteger\(countInput\.value\);\s*if \(count\) topicsInput\.value = String\(count\);/);
  assert.match(source, /O Plano do Dia usa este número como limite de metas automáticas/);
  assert.equal(source, read("docs/planning-integrity-v235.js"));
});

// --- 11. Aviso pequeno do Drive parado ----------------------------------

test("V660 aviso pequeno de Drive parado, sem religar a faixa", () => {
  const source = read("aviso-conexao-aba-v650.js");
  assert.match(source, /const DRIVE_NOTICE_ENABLED = false;/);
  assert.match(source, /Drive parado desde \$\{since\}/);
  assert.match(source, /function checkDrive\(\) \{\s*updateDriveChip\(\);/);
  assert.match(source, /getElementById\("connectGoogleDrive"\)\?\.click\(\)/);
});

// --- 12. Erros de sincronização não se apagam ---------------------------

test("V660 cada erro de sincronização entra numa lista", () => {
  const script = read("script.js");
  const start = script.indexOf("const SYNC_ERROR_LOG_KEY_V660");
  const end = script.indexOf("function markLocalUpdated(");
  const storage = new Map();
  const context = { localStorage: { getItem: (k) => storage.get(k) ?? null, setItem: (k, v) => storage.set(k, String(v)) } };
  vm.createContext(context);
  vm.runInContext(`${script.slice(start, end)}\nglobalThis.__append = appendSyncErrorLogV660;`, context);
  context.__append({ lastCloudErrorKind: "apply", error: "Erro ao aplicar os dados da nuvem.", errorDetails: "TypeError: x" });
  context.__append({ error: "Autorização expirada.", lastAutoSyncError: "Autorização expirada.", lastAutoSyncErrorReason: "deferred" });
  context.__append({ error: "Autorização expirada.", lastAutoSyncError: "Autorização expirada.", lastAutoSyncErrorReason: "deferred" });
  context.__append({ error: "" });
  const log = JSON.parse(storage.get("aldus:sync:erros:v660"));
  assert.equal(log.length, 2);
  assert.equal(log[0].kind, "apply");
  assert.equal(log[0].details, "TypeError: x");
  assert.equal(log[1].count, 2);
});

// --- 13 e 14. Correções de dados -----------------------------------------

test("V660 assunto já estudado passa a Em andamento; concluído e não estudado ficam", () => {
  const repairs = require("../correcoes-dados-v660.js");
  global.isTopicStudied = (item) => item.estudado === true;
  try {
    const target = { syllabusItems: [
      { id: "a", status: "Não iniciado", estudado: true },
      { id: "b", status: "Não iniciado", estudado: false },
      { id: "c", status: "Concluído", estudado: true },
      { id: "d", estudado: true }
    ] };
    assert.deepEqual(repairs.repairStatuses(target, "agora"), ["a", "d"]);
    assert.deepEqual(target.syllabusItems.map((item) => item.status), ["Em andamento", "Não iniciado", "Concluído", "Em andamento"]);
  } finally {
    delete global.isTopicStudied;
  }
});

test("V660 vínculo com tema fundido aponta para o tema que ficou; sem destino não muda", () => {
  const repairs = require("../correcoes-dados-v660.js");
  const target = {
    syllabusItems: [{ id: "novo", mergedFrom: ["velho"] }, { id: "outro" }],
    dailyGoals: [{ id: "m1", syllabusItemId: "velho" }, { id: "m2", syllabusItemId: "outro" }, { id: "m3", syllabusItemId: "sumido" }],
    studies: [{ id: "e1", syllabusItemId: "velho" }],
    materials: [{ id: "x1", syllabusItemId: "outro", syllabusItemIds: ["outro", "velho", "novo"] }]
  };
  const report = repairs.repairLinks(target, "agora");
  assert.deepEqual(target.dailyGoals.map((goal) => goal.syllabusItemId), ["novo", "outro", "sumido"]);
  assert.equal(target.studies[0].syllabusItemId, "novo");
  assert.deepEqual(target.materials[0].syllabusItemIds, ["outro", "novo"]);
  assert.deepEqual(report.repointed, { dailyGoals: 1, studies: 1, materials: 1 });
  assert.deepEqual(report.unresolved, ["sumido"]);
});

test("V660.1 itens da Fábrica e seus materiais deixam de carregar ids de temas fundidos", () => {
  const repairs = require("../correcoes-dados-v660.js");
  const agenda = [
    { id: "f1", syllabusItemId: "velho", syllabusItemIds: ["velho", "outro"], editalLink: { itemIds: ["velho"] } },
    { id: "f2", syllabusItemId: "outro", syllabusItemIds: ["outro"] }
  ];
  const target = {
    syllabusItems: [{ id: "novo", mergedFrom: ["velho"] }, { id: "outro" }],
    factoryAgenda: agenda,
    factoryItems: agenda,
    materials: [{ id: "m1", syllabusItemId: "novo", parentSyllabusItemId: "velho", syllabusItemIds: ["novo", "velho", "sumido"] }]
  };
  const report = repairs.repairLinks(target, "agora", ["factoryAgenda", "factoryItems", "materials"]);
  assert.equal(agenda[0].syllabusItemId, "novo");
  assert.deepEqual(agenda[0].syllabusItemIds, ["novo", "outro"]);
  assert.deepEqual(agenda[0].editalLink.itemIds, ["novo"]);
  assert.deepEqual(target.materials[0].syllabusItemIds, ["novo", "sumido"]);
  assert.equal(target.materials[0].parentSyllabusItemId, "novo");
  assert.deepEqual(report.repointed, { factoryAgenda: 1, factoryItems: 0, materials: 1 });
  assert.deepEqual(report.unresolved, ["sumido"]);
});

test("V660 fundir temas também troca o id dentro das listas", () => {
  const api = require("../duplicate-diagnostics-v309.js");
  const material = { id: "x", syllabusItemIds: ["velho", "outro"], editalLink: { itemIds: ["velho"] } };
  const report = api.remapItemLinks([material], "velho", "novo");
  assert.deepEqual(material.syllabusItemIds, ["novo", "outro"]);
  assert.deepEqual(material.editalLink.itemIds, ["novo"]);
  assert.equal(report.changed, 2);
});

test("V660 correções de dados são carregadas e espelhadas em docs", () => {
  const loader = read("performance-emergency-v350.js");
  assert.match(loader, /script\.src = "correcoes-dados-v660\.js\?v=20261006-correcoes-dados-v660-1";/);
  assert.match(loader, /\n  installCorrecoesDadosV660\(\);\r?\n/);
  for (const file of ["correcoes-dados-v660.js", "performance-emergency-v350.js", "timer-pause-origin-v645.js", "aviso-conexao-aba-v650.js", "sync-integral-time-protection.js", "duplicate-diagnostics-v309.js"]) {
    assert.equal(read(file), read(`docs/${file}`), file);
  }
});

// --- 2 e 13 no script.js --------------------------------------------------

test("V660 materiais da Fábrica: mesma regra de vínculo da V80, e cronômetro atualiza o assunto", () => {
  const script = read("script.js");
  assert.match(script, /const primarySyllabusItemId = normalized\.syllabusItemId \|\| syllabusItemIds\[0\] \|\| "";/);
  assert.match(script, /syllabusItemIds: linkedSyllabusItemIds\(idx >= 0 \? state\.materials\[idx\] : null\)/);
  assert.match(script, /syllabusItemIds: linkedSyllabusItemIds\(folderIndex >= 0 \? state\.materials\[folderIndex\] : null\)/);
  assert.match(script, /updateItemProgress\(studiedSyllabusItem\.id, \{ status: "Em andamento"/);
  assert.match(script, /if \(!record\.unchangedV660\) publishIndexedDBPersistenceSignal\(record\);/);
});
