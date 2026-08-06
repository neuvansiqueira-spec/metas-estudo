(() => {
  "use strict";

  const VERSION = "20260806-duplicate-diagnostics-ui-v261";
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

  function appendEnhancer() {
    if (document.getElementById("aldusDuplicateDiagnosticsUiScriptV261")) return;
    const script = document.createElement("script");
    script.id = "aldusDuplicateDiagnosticsUiScriptV261";
    script.src = new URL(`duplicate-diagnostics-ui-v261.js?v=${VERSION}`, baseUrl).toString();
    script.async = false;
    script.addEventListener("error", () => {
      console.error(`[${VERSION}] Falha ao carregar as melhorias visuais do diagnóstico.`);
    });
    (document.body || document.documentElement).appendChild(script);
  }

  appendStylesheet("aldusDuplicateDiagnosticsStylesV260", "duplicate-diagnostics-v260.css");
  appendStylesheet("aldusDuplicateDiagnosticsUiStylesV261", "duplicate-diagnostics-ui-v261.css");

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

  globalThis.__aldusDuplicateDiagnosticsLoaderV260 = Object.freeze({ version: VERSION });
})();
