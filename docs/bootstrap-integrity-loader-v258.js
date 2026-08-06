(() => {
  "use strict";

  const VERSION = "20260806-duplicate-diagnostics-v260";
  const CORE_SCRIPT = "bootstrap-integrity-loader-v258-core.js?v=20260806-duplicate-diagnostics-v260";
  const DIAGNOSTICS_SCRIPT = "duplicate-diagnostics-v260.js?v=20260806-duplicate-diagnostics-v260";
  const DIAGNOSTICS_STYLESHEET = "duplicate-diagnostics-v260.css?v=20260806-duplicate-diagnostics-v260";

  function installStylesheet(baseUrl) {
    if (document.getElementById("aldusDuplicateDiagnosticsStylesV260")) return;
    const link = document.createElement("link");
    link.id = "aldusDuplicateDiagnosticsStylesV260";
    link.rel = "stylesheet";
    link.href = new URL(DIAGNOSTICS_STYLESHEET, baseUrl).toString();
    (document.head || document.documentElement).appendChild(link);
  }

  function makeScript(id, sourceUrl, baseUrl, source) {
    const script = document.createElement("script");
    script.id = id;
    script.src = new URL(sourceUrl, baseUrl).toString();
    script.async = false;
    if (source?.nonce) script.nonce = source.nonce;
    if (source?.crossOrigin) script.crossOrigin = source.crossOrigin;
    if (source?.referrerPolicy) script.referrerPolicy = source.referrerPolicy;
    return script;
  }

  const source = document.currentScript;
  const baseUrl = source?.src || document.baseURI;
  const parent = source?.parentNode || document.head || document.documentElement;

  installStylesheet(baseUrl);

  const core = makeScript(source?.id || "aldusBootstrapIntegrityLoaderV258", CORE_SCRIPT, baseUrl, source);
  if (source?.id) source.removeAttribute("id");
  core.addEventListener("error", () => {
    console.error(`[${VERSION}] Falha ao carregar o núcleo de inicialização preservado.`);
  });

  const diagnostics = makeScript("aldusDuplicateDiagnosticsScriptV260", DIAGNOSTICS_SCRIPT, baseUrl, source);
  diagnostics.addEventListener("error", () => {
    console.error(`[${VERSION}] Falha ao carregar o diagnóstico de duplicações.`);
  });

  parent.insertBefore(core, source?.nextSibling || null);
  parent.insertBefore(diagnostics, core.nextSibling);

  globalThis.__aldusDuplicateDiagnosticsLoaderV260 = Object.freeze({
    version: VERSION,
    core: CORE_SCRIPT,
    script: DIAGNOSTICS_SCRIPT,
    stylesheet: DIAGNOSTICS_STYLESHEET
  });
})();
