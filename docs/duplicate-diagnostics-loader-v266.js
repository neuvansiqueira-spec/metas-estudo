(() => {
  "use strict";

  const VERSION = "20260806-duplicate-relations-global-search-v266";
  const source = document.currentScript;
  const baseUrl = source?.src || document.baseURI;

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
    script.addEventListener("error", () => {
      console.error(`[${VERSION}] Falha ao carregar ${fileName}.`);
    }, { once: true });
    (document.body || document.documentElement).appendChild(script);
    return script;
  }

  function appendRelations() {
    appendScript(
      "aldusDuplicateDiagnosticsRelationsV266",
      "duplicate-diagnostics-relations-v266.js"
    );
  }

  function appendStability() {
    appendScript(
      "aldusDuplicateDiagnosticsUiStabilityV261",
      "duplicate-diagnostics-ui-v261-stability.js",
      appendRelations
    );
  }

  function appendEnhancer() {
    if (globalThis.__aldusDuplicateDiagnosticsUiV261) {
      appendStability();
      return;
    }
    appendScript(
      "aldusDuplicateDiagnosticsUiScriptV261",
      "duplicate-diagnostics-ui-v261.js",
      appendStability
    );
  }

  appendStylesheet("aldusDuplicateDiagnosticsStylesV260", "duplicate-diagnostics-v260.css");
  appendStylesheet("aldusDuplicateDiagnosticsUiStylesV261", "duplicate-diagnostics-ui-v261.css");
  appendStylesheet("aldusDuplicateDiagnosticsPaletteV263", "duplicate-diagnostics-palette-v263.css");
  appendStylesheet("aldusDuplicateDiagnosticsContrastV264", "duplicate-diagnostics-contrast-v264.css");
  appendStylesheet("aldusDuplicateDiagnosticsRelationsStylesV266", "duplicate-diagnostics-relations-v266.css");

  if (globalThis.AldusDuplicateDiagnosticsV260) appendEnhancer();
  else appendScript(
    "aldusDuplicateDiagnosticsScriptV260",
    "duplicate-diagnostics-v260.js",
    appendEnhancer
  );

  globalThis.__aldusDuplicateDiagnosticsLoaderV266 = Object.freeze({ version: VERSION });
})();
