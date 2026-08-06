(() => {
  "use strict";

  const VERSION = "20260806-duplicate-diagnostics-contrast-v264";
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

  function appendStability() {
    if (document.getElementById("aldusDuplicateDiagnosticsUiStabilityV261")) return;
    const script = document.createElement("script");
    script.id = "aldusDuplicateDiagnosticsUiStabilityV261";
    script.src = new URL(`duplicate-diagnostics-ui-v261-stability.js?v=${VERSION}`, baseUrl).toString();
    script.async = false;
    script.addEventListener("error", () => {
      console.error(`[${VERSION}] Falha ao carregar a estabilização da interface.`);
    });
    (document.body || document.documentElement).appendChild(script);
  }

  function appendEnhancer() {
    const existing = document.getElementById("aldusDuplicateDiagnosticsUiScriptV261");
    if (existing) {
      if (globalThis.__aldusDuplicateDiagnosticsUiV261) appendStability();
      else existing.addEventListener("load", appendStability, { once: true });
      return;
    }
    const script = document.createElement("script");
    script.id = "aldusDuplicateDiagnosticsUiScriptV261";
    script.src = new URL(`duplicate-diagnostics-ui-v261.js?v=${VERSION}`, baseUrl).toString();
    script.async = false;
    script.addEventListener("load", appendStability, { once: true });
    script.addEventListener("error", () => {
      console.error(`[${VERSION}] Falha ao carregar as melhorias visuais do diagnóstico.`);
    });
    (document.body || document.documentElement).appendChild(script);
  }

  appendStylesheet("aldusDuplicateDiagnosticsStylesV260", "duplicate-diagnostics-v260.css");
  appendStylesheet("aldusDuplicateDiagnosticsUiStylesV261", "duplicate-diagnostics-ui-v261.css");
  appendStylesheet("aldusDuplicateDiagnosticsPaletteV263", "duplicate-diagnostics-palette-v263.css");
  appendStylesheet("aldusDuplicateDiagnosticsContrastV264", "duplicate-diagnostics-contrast-v264.css");

  let baseScript = document.getElementById("aldusDuplicateDiagnosticsScriptV260");
  if (!baseScript) {
    baseScript = document.createElement("script");
    baseScript.id = "aldusDuplicateDiagnosticsScriptV260";
    baseScript.src = new URL(`duplicate-diagnostics-v260.js?v=${VERSION}`, baseUrl).toString();
    baseScript.async = false;
    baseScript.addEventListener("error", () => {
      console.error(`[${VERSION}] Falha ao carregar o diagnóstico de duplicações.`);
    });
    (document.body || document.documentElement).appendChild(baseScript);
  }

  if (globalThis.AldusDuplicateDiagnosticsV260) appendEnhancer();
  else baseScript.addEventListener("load", appendEnhancer, { once: true });

  globalThis.__aldusDuplicateDiagnosticsLoaderV264 = Object.freeze({ version: VERSION });
})();
