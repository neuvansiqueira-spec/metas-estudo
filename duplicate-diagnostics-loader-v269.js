(() => {
  "use strict";

  const VERSION = "20260808-duplicate-direct-topic-search-v270";
  const source = document.currentScript;
  const baseUrl = source?.src || document.baseURI;

  function installSyllabusDeletionPersistenceV267() {
    if (globalThis.__aldusSyllabusDeletionPersistenceV267) return;

    const getAppState = () => {
      try {
        return typeof state !== "undefined" ? state : null;
      } catch {
        return null;
      }
    };

    const deletedSyllabusIds = (targetState) => new Set(
      Object.keys(targetState?.syncTombstones?.collections?.syllabusItems || {})
    );

    const purgeDeletedSyllabusItems = (targetState) => {
      if (!targetState || !Array.isArray(targetState.syllabusItems)) return 0;
      const deletedIds = deletedSyllabusIds(targetState);
      if (!deletedIds.size) return 0;
      const previousLength = targetState.syllabusItems.length;
      targetState.syllabusItems = targetState.syllabusItems.filter(
        (item) => !deletedIds.has(String(item?.id || ""))
      );
      return previousLength - targetState.syllabusItems.length;
    };

    try {
      if (typeof applyPcprPcma2026Migration === "function") {
        const originalMigration = applyPcprPcma2026Migration;
        applyPcprPcma2026Migration = function applyPcprPcma2026MigrationWithPersistentDeletions(targetState) {
          const result = originalMigration.apply(this, arguments);
          purgeDeletedSyllabusItems(targetState || getAppState());
          return result;
        };
      }
    } catch (error) {
      console.error("[V267] Não foi possível proteger a migração contra restauração de assuntos excluídos.", error);
    }

    const repairLoadedState = () => {
      const targetState = getAppState();
      const removed = purgeDeletedSyllabusItems(targetState);
      if (!removed) return;
      try {
        if (typeof saveData === "function") saveData({ markLocalChange: true });
        if (typeof render === "function") render();
      } catch (error) {
        console.error("[V267] A limpeza foi aplicada em memória, mas não pôde ser persistida.", error);
      }
    };

    setTimeout(repairLoadedState, 0);
    setTimeout(repairLoadedState, 1200);
    globalThis.__aldusSyllabusDeletionPersistenceV267 = Object.freeze({ version: VERSION, purge: purgeDeletedSyllabusItems });
  }

  function appendStylesheet(id, fileName) {
    if (document.getElementById(id)) return;
    const stylesheet = document.createElement("link");
    stylesheet.id = id;
    stylesheet.rel = "stylesheet";
    stylesheet.href = new URL(`${fileName}?v=${VERSION}`, baseUrl).toString();
    (document.head || document.documentElement).appendChild(stylesheet);
  }

  function appendScript(id, fileName, onLoad) {
    const existing = document.getElementById(id);
    if (existing) {
      if (typeof onLoad === "function") {
        if (existing.dataset.loaded === "true") onLoad();
        else existing.addEventListener("load", onLoad, { once: true });
      }
      return existing;
    }
    const script = document.createElement("script");
    script.id = id;
    script.src = new URL(`${fileName}?v=${VERSION}`, baseUrl).toString();
    script.async = false;
    script.addEventListener("load", () => {
      script.dataset.loaded = "true";
      onLoad?.();
    }, { once: true });
    script.addEventListener("error", () => console.error(`[${VERSION}] Falha ao carregar ${fileName}.`), { once: true });
    (document.body || document.documentElement).appendChild(script);
    return script;
  }

  function appendRelations() {
    appendScript("aldusDuplicateDiagnosticsRelationsV269", "duplicate-diagnostics-relations-v269.js");
  }

  function appendStability() {
    appendScript("aldusDuplicateDiagnosticsUiStabilityV261", "duplicate-diagnostics-ui-v261-stability.js", appendRelations);
  }

  function appendEnhancer() {
    if (globalThis.__aldusDuplicateDiagnosticsUiV261) {
      appendStability();
      return;
    }
    appendScript("aldusDuplicateDiagnosticsUiScriptV261", "duplicate-diagnostics-ui-v261.js", appendStability);
  }

  installSyllabusDeletionPersistenceV267();
  appendStylesheet("aldusDuplicateDiagnosticsStylesV260", "duplicate-diagnostics-v260.css");
  appendStylesheet("aldusDuplicateDiagnosticsUiStylesV261", "duplicate-diagnostics-ui-v261.css");
  appendStylesheet("aldusDuplicateDiagnosticsPaletteV263", "duplicate-diagnostics-palette-v263.css");
  appendStylesheet("aldusDuplicateDiagnosticsContrastV264", "duplicate-diagnostics-contrast-v264.css");
  appendStylesheet("aldusDuplicateDiagnosticsRelationsStylesV266", "duplicate-diagnostics-relations-v266.css");

  if (globalThis.AldusDuplicateDiagnosticsV260) appendEnhancer();
  else appendScript("aldusDuplicateDiagnosticsScriptV260", "duplicate-diagnostics-v260.js", appendEnhancer);

  globalThis.__aldusDuplicateDiagnosticsLoaderV269 = Object.freeze({ version: VERSION });
})();
