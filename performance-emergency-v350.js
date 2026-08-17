(() => {
  "use strict";

  const VERSION = "20260817-emergency-performance-v350";
  const INSTALL_TIMEOUT_MS = 30000;
  const RETRY_MS = 25;
  const indexCache = new WeakMap();
  let installed = false;

  function indexFor(list) {
    const cached = indexCache.get(list);
    if (cached
      && cached.length === list.length
      && cached.first === list[0]
      && cached.last === list[list.length - 1]) {
      return cached.index;
    }

    const index = new Map();
    list.forEach((mapping) => {
      if (!mapping) return;
      const id = mapping.syllabusItemId;
      const bucket = index.get(id);
      if (bucket) bucket.push(mapping);
      else index.set(id, [mapping]);
    });

    indexCache.set(list, {
      index,
      length: list.length,
      first: list[0],
      last: list[list.length - 1]
    });
    return index;
  }

  function indexedOfficialMappingsForItem(targetState = {}, syllabusItemId = "") {
    const list = targetState?.contestSyllabusMap || [];
    if (!Array.isArray(list) || list.length === 0) return [];
    return (indexFor(list).get(syllabusItemId) || []).slice();
  }

  function install() {
    if (installed) return true;
    if (typeof globalThis.officialMappingsForItem !== "function") return false;

    globalThis.officialMappingsForItem = indexedOfficialMappingsForItem;
    if (typeof globalThis.officialPlanningMappingsV155 === "function") {
      globalThis.officialPlanningMappingsV155 = (targetState = globalThis.state || {}, syllabusItemId = "") =>
        indexedOfficialMappingsForItem(targetState, syllabusItemId);
    }

    installed = true;
    globalThis.__ALDUS_EMERGENCY_PERFORMANCE_V350__ = Object.freeze({
      version: VERSION,
      installedAt: new Date().toISOString(),
      indexedOfficialMappings: true
    });
    console.info(`[Aldus ${VERSION}] Índice de mapeamentos ativado em modo de emergência.`);
    return true;
  }

  if (install()) return;

  const startedAt = Date.now();
  const timer = setInterval(() => {
    if (install() || Date.now() - startedAt >= INSTALL_TIMEOUT_MS) {
      clearInterval(timer);
      if (!installed) {
        console.warn(`[Aldus ${VERSION}] O núcleo não expôs officialMappingsForItem dentro do prazo; nenhuma alteração foi aplicada.`);
      }
    }
  }, RETRY_MS);
})();
