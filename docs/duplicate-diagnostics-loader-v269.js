(() => {
  "use strict";

  const VERSION = "20260810-duplicate-batch-persistence-v301";
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

  function installConsolidationContinuityV276() {
    if (globalThis.__aldusDuplicateConsolidationContinuityV276) return;

    const nativeSetTimeout = window.setTimeout;
    let armed = false;
    let safetyTimer = null;

    const restoreTimer = () => {
      if (window.setTimeout === patchedSetTimeout) window.setTimeout = nativeSetTimeout;
      armed = false;
      if (safetyTimer !== null) {
        window.clearTimeout(safetyTimer);
        safetyTimer = null;
      }
    };

    const refreshDiagnostic = () => {
      const root = document.getElementById("aldusDuplicateDiagnosticsV260");
      if (!root || root.hidden) return;
      const runButton = root.querySelector("[data-dup-run]");
      if (!runButton) return;

      let attempts = 0;
      const tryRefresh = () => {
        attempts += 1;
        if (!runButton.disabled) {
          runButton.click();
          return;
        }
        if (attempts < 40) nativeSetTimeout.call(window, tryRefresh, 50);
      };
      nativeSetTimeout.call(window, tryRefresh, 25);
    };

    function patchedSetTimeout(callback, delay, ...args) {
      const callbackText = typeof callback === "function"
        ? Function.prototype.toString.call(callback)
        : String(callback || "");
      const isConsolidationReload = armed
        && Number(delay) === 900
        && /location\.reload\s*\(/.test(callbackText);

      if (isConsolidationReload) {
        restoreTimer();
        refreshDiagnostic();
        return 0;
      }
      return nativeSetTimeout.call(window, callback, delay, ...args);
    }

    document.addEventListener("click", (event) => {
      const action = event.target.closest?.("#aldusDuplicateDiagnosticsV260 [data-action='keep']");
      if (!action) return;

      restoreTimer();
      armed = true;
      window.setTimeout = patchedSetTimeout;
      safetyTimer = nativeSetTimeout.call(window, restoreTimer, 15000);
    }, true);

    globalThis.__aldusDuplicateConsolidationContinuityV276 = Object.freeze({
      version: VERSION,
      restore: restoreTimer
    });
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

  function appendActionsV274() {
    appendScript("aldusDuplicateDiagnosticsActionsV274", "duplicate-diagnostics-actions-v274.js");
  }

  function appendMapV273() {
    appendScript("aldusDuplicateDiagnosticsMapV273", "duplicate-diagnostics-map-v273.js", appendActionsV274);
  }

  function appendSearchV272() {
    appendStylesheet("aldusDuplicateDiagnosticsSearchStylesV271", "duplicate-diagnostics-search-v271.css");
    appendScript("aldusDuplicateDiagnosticsSearchV272", "duplicate-diagnostics-search-v272.js", appendMapV273);
  }

  function appendStability() {
    appendScript("aldusDuplicateDiagnosticsUiStabilityV261", "duplicate-diagnostics-ui-v261-stability.js", appendSearchV272);
  }

  function appendEnhancer() {
    if (globalThis.__aldusDuplicateDiagnosticsUiV261) {
      appendStability();
      return;
    }
    appendScript("aldusDuplicateDiagnosticsUiScriptV261", "duplicate-diagnostics-ui-v261.js", appendStability);
  }

  installSyllabusDeletionPersistenceV267();
  installConsolidationContinuityV276();
  appendStylesheet("aldusDuplicateDiagnosticsStylesV260", "duplicate-diagnostics-v260.css");
  appendStylesheet("aldusDuplicateDiagnosticsUiStylesV261", "duplicate-diagnostics-ui-v261.css");
  appendStylesheet("aldusDuplicateDiagnosticsPaletteV263", "duplicate-diagnostics-palette-v263.css");
  appendStylesheet("aldusDuplicateDiagnosticsContrastV264", "duplicate-diagnostics-contrast-v264.css");
  appendStylesheet("aldusDuplicateDiagnosticsRelationsStylesV266", "duplicate-diagnostics-relations-v266.css");

  if (globalThis.AldusDuplicateDiagnosticsV260) appendEnhancer();
  else appendScript("aldusDuplicateDiagnosticsScriptV260", "duplicate-diagnostics-v260.js", appendEnhancer);

  globalThis.__aldusDuplicateDiagnosticsLoaderV276 = Object.freeze({ version: VERSION });
})();
