/* V660 — correções de dados apontadas na auditoria de 06/10/2026, aplicadas uma vez. */
(() => {
  "use strict";

  // 1. Assuntos do edital já estudados e ainda "Não iniciado": 156 das 207 metas
  //    concluídas apontavam para assuntos nessa situação, porque salvar pelo
  //    cronômetro não atualizava o assunto (corrigido no script.js). Passam a
  //    "Em andamento"; "Concluído" continua sendo só decisão do usuário.
  // 2. Vínculos com temas que foram fundidos em outro (campo mergedFrom do tema
  //    que ficou): 6 metas, 4 estudos e 30 materiais ainda apontavam para o id
  //    removido. Passam a apontar para o tema que ficou. Id sem destino
  //    registrado não é tocado: fica listado no relatório para decisão dele.
  const VERSION = "20261006-correcoes-dados-v660";
  const KEY = "__ALDUS_DATA_REPAIRS_V660__";
  const MIGRATION = "dataRepairsV660";
  if (globalThis[KEY]) return;

  const canon = (value) => String(value || "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim().toLowerCase();

  function appState() {
    try { if (typeof state !== "undefined" && state && typeof state === "object") return state; } catch {}
    return null;
  }

  function hasUserData(target) {
    return ["syllabusItems", "dailyGoals", "studies"].every((key) => Array.isArray(target?.[key]) && target[key].length);
  }

  function notStarted(item) {
    return !item?.status || canon(item.status) === "nao iniciado";
  }

  function repairStatuses(target, now) {
    if (typeof isTopicStudied !== "function") return [];
    const changed = [];
    for (const item of target.syllabusItems) {
      if (!item || !notStarted(item)) continue;
      let studied = false;
      try { studied = isTopicStudied(item) === true; } catch { studied = false; }
      if (!studied) continue;
      item.status = "Em andamento";
      item.updatedAt = now;
      changed.push(item.id);
    }
    return changed;
  }

  function mergedTargets(target) {
    const existing = new Set(target.syllabusItems.map((item) => item?.id).filter(Boolean));
    const keeperOf = new Map();
    for (const item of target.syllabusItems) {
      for (const removedId of Array.isArray(item?.mergedFrom) ? item.mergedFrom : []) {
        if (removedId && !existing.has(removedId) && !keeperOf.has(removedId)) keeperOf.set(removedId, item.id);
      }
    }
    return { existing, keeperOf };
  }

  function repairLinks(target, now) {
    const { existing, keeperOf } = mergedTargets(target);
    const repointed = { dailyGoals: 0, studies: 0, materials: 0 };
    const unresolved = new Set();
    const resolve = (id) => {
      if (!id || existing.has(id)) return id;
      const keeper = keeperOf.get(id);
      if (!keeper) unresolved.add(id);
      return keeper || id;
    };
    for (const collection of ["dailyGoals", "studies", "materials"]) {
      for (const record of Array.isArray(target[collection]) ? target[collection] : []) {
        if (!record || typeof record !== "object") continue;
        let touched = false;
        if (record.syllabusItemId) {
          const next = resolve(record.syllabusItemId);
          if (next !== record.syllabusItemId) { record.syllabusItemId = next; touched = true; }
        }
        if (collection === "materials" && Array.isArray(record.syllabusItemIds)) {
          const next = [...new Set(record.syllabusItemIds.map(resolve))];
          if (next.length !== record.syllabusItemIds.length || next.some((id, index) => id !== record.syllabusItemIds[index])) {
            record.syllabusItemIds = next;
            touched = true;
          }
        }
        if (touched) {
          record.updatedAt = now;
          repointed[collection] += 1;
        }
      }
    }
    return { repointed, unresolved: [...unresolved] };
  }

  // 3. Cópias de segurança avulsas guardadas dentro dos dados principais
  //    (backupMetasV606–V611, backupFabricaV613; 0,55 MB). Nenhuma parte do site
  //    as lê, mas elas iam em toda conferência, cópia e envio ao Drive. Vão para
  //    um banco separado neste navegador; só saem dos dados depois de relidas lá.
  const ARCHIVE_DB = "aldus-arquivo-v660";
  const ARCHIVE_STORE = "copias";
  const ARCHIVED_KEYS = ["backupMetasV606", "backupMetasV607", "backupMetasV608", "backupMetasV611", "backupFabricaV613"];

  function archiveCopies(target, now) {
    const keys = ARCHIVED_KEYS.filter((key) => target[key] !== undefined);
    if (!keys.length || typeof indexedDB === "undefined") return Promise.resolve([]);
    const record = { id: `${now}-backups-dentro-dos-dados`, savedAt: now, version: VERSION, data: Object.fromEntries(keys.map((key) => [key, target[key]])) };
    const expected = JSON.stringify(record.data);
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(ARCHIVE_DB, 1);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(ARCHIVE_STORE)) request.result.createObjectStore(ARCHIVE_STORE, { keyPath: "id" });
      };
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const database = request.result;
        const transaction = database.transaction(ARCHIVE_STORE, "readwrite");
        const store = transaction.objectStore(ARCHIVE_STORE);
        store.put(record);
        const check = store.get(record.id);
        let verified = false;
        check.onsuccess = () => { verified = JSON.stringify(check.result?.data) === expected; };
        transaction.oncomplete = () => { database.close(); verified ? resolve(keys) : reject(new Error("Cópia arquivada não conferiu.")); };
        transaction.onerror = () => { database.close(); reject(transaction.error); };
        transaction.onabort = () => { database.close(); reject(transaction.error); };
      };
    });
  }

  async function run() {
    const target = appState();
    if (!target || !hasUserData(target)) return false;
    target.migrations ||= {};
    if (target.migrations[MIGRATION]?.appliedAt) return true;
    const now = new Date().toISOString();
    let archived = [];
    try {
      archived = await archiveCopies(target, now);
      for (const key of archived) delete target[key];
    } catch (error) {
      console.warn(`[Aldus ${VERSION}] As cópias avulsas ficaram nos dados: o arquivo separado falhou.`, error);
      archived = [];
    }
    const statusChanged = repairStatuses(target, now);
    const links = repairLinks(target, now);
    target.migrations[MIGRATION] = {
      version: VERSION,
      appliedAt: now,
      syllabusStatusToInProgress: statusChanged.length,
      linksRepointed: links.repointed,
      unresolvedSyllabusIds: links.unresolved,
      archivedCopies: archived.length ? { database: ARCHIVE_DB, keys: archived } : null
    };
    try { if (typeof saveData === "function") saveData({ markLocalChange: true }); } catch (error) {
      console.warn(`[Aldus ${VERSION}] Correções aplicadas, mas o salvamento falhou.`, error);
    }
    try { if (typeof render === "function") render(); } catch {}
    return true;
  }

  const api = Object.freeze({ version: VERSION, run, repairStatuses, repairLinks, mergedTargets });
  globalThis[KEY] = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
    return;
  }
  if (typeof window === "undefined") return;

  // Depois do bootstrap e da manutenção que ele dispara, para não disputar com os
  // salvamentos da abertura.
  let scheduled = false;
  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    setTimeout(() => { run().catch((error) => console.warn(`[Aldus ${VERSION}] Correções não aplicadas.`, error)); }, 4000);
  };
  if (globalThis.__aldusBootstrapReady) schedule();
  else window.addEventListener("aldus:bootstrap-ready", schedule, { once: true });
})();
