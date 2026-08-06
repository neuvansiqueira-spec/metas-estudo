(() => {
  "use strict";

  const VERSION = "20260806-duplicate-diagnostics-v260";
  const source = document.currentScript;
  const baseUrl = source?.src || document.baseURI;

  if (!document.getElementById("aldusDuplicateDiagnosticsStylesV260")) {
    const stylesheet = document.createElement("link");
    stylesheet.id = "aldusDuplicateDiagnosticsStylesV260";
    stylesheet.rel = "stylesheet";
    stylesheet.href = new URL(`duplicate-diagnostics-v260.css?v=${VERSION}`, baseUrl).toString();
    (document.head || document.documentElement).appendChild(stylesheet);
  }

  if (!document.getElementById("aldusDuplicateDiagnosticsScriptV260")) {
    const script = document.createElement("script");
    script.id = "aldusDuplicateDiagnosticsScriptV260";
    script.src = new URL(`duplicate-diagnostics-v260.js?v=${VERSION}`, baseUrl).toString();
    script.async = false;
    script.addEventListener("error", () => {
      console.error(`[${VERSION}] Falha ao carregar o diagnóstico de duplicações.`);
    });
    (document.body || document.documentElement).appendChild(script);
  }

  globalThis.__aldusDuplicateDiagnosticsLoaderV260 = Object.freeze({ version: VERSION });
})();
