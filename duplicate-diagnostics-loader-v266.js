(() => {
  "use strict";

  const VERSION = "20260808-duplicate-cross-discipline-fix-v271";
  const source = document.currentScript;
  const baseUrl = source?.src || document.baseURI;
  const id = "aldusDuplicateDiagnosticsLoaderV271";

  if (document.getElementById(id)) return;

  const script = document.createElement("script");
  script.id = id;
  script.src = new URL(`duplicate-diagnostics-loader-v269.js?v=${VERSION}`, baseUrl).toString();
  script.async = false;
  script.addEventListener("error", () => {
    console.error(`[${VERSION}] Falha ao carregar o diagnóstico atualizado.`);
  }, { once: true });
  (document.body || document.documentElement).appendChild(script);
})();