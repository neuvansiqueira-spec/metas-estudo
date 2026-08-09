(() => {
  "use strict";

  const VERSION = "20260808-direct-publish-factory-schedule-v278";
  const source = document.currentScript;
  const baseUrl = source?.src || document.baseURI;

  function appendScript(id, fileName, version, errorMessage) {
    const existing = document.getElementById(id);
    if (existing) return existing;

    const script = document.createElement("script");
    script.id = id;
    script.src = new URL(`${fileName}?v=${version}`, baseUrl).toString();
    script.async = false;
    script.addEventListener("error", () => {
      console.error(`[${VERSION}] ${errorMessage}`);
    }, { once: true });
    (document.body || document.documentElement).appendChild(script);
    return script;
  }

  appendScript(
    "aldusDuplicateDiagnosticsLoaderV276",
    "duplicate-diagnostics-loader-v269.js",
    "20260808-duplicate-consolidation-continuity-v276",
    "Falha ao carregar o diagnóstico atualizado."
  );

  appendScript(
    "aldusFactoryScheduleScopeV277",
    "factory-schedule-scope-v277.js",
    "20260808-factory-schedule-scope-v277-direct-v278",
    "Falha ao carregar o modo Cronograma da Fábrica de Resumos."
  );

  globalThis.__aldusDirectPublishLoaderV278 = Object.freeze({
    version: VERSION,
    installedAt: new Date().toISOString()
  });
})();
