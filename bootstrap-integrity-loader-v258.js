(() => {
  "use strict";

  const VERSION = "20260808-bootstrap-chain-preload-v267";
  const CORE_SCRIPT = "bootstrap-integrity-loader-v258-core.js?v=20260806-duplicate-diagnostics-v260";
  const DIAGNOSTICS_SCRIPT = "duplicate-diagnostics-v260.js?v=20260806-duplicate-diagnostics-v260";
  const DIAGNOSTICS_STYLESHEET = "duplicate-diagnostics-v260.css?v=20260806-duplicate-diagnostics-v260";
  const PRELOAD_SCRIPTS = [
    "daily-summary-time-format-v243.js?v=20260805-daily-summary-hours-minutes-v243&hotfix=daily-summary-time-format-hotfix3",
    "dashboard-today-time-sync-v253.js?v=20260805-dashboard-today-time-sync-v253&hotfix=dashboard-today-time-sync-hotfix1",
    "dashboard-today-questions-sync-v257.js?v=20260805-dashboard-today-questions-sync-v257&hotfix=question-bank-sessions1",
    "planning-integrity-loader-v235.js?v=20260804-simulados-sem-fabrica-cache-unico-v236&publication=v244",
    "central-goals-period-palette-v248.js?v=20260805-central-period-cards-v248",
    "daily-summary-elegant-v250.js?v=20260805-daily-summary-elegant-v250",
    "timer-session-integrity-v236.js?v=20260804-simulados-sem-fabrica-cache-unico-v236&hotfix=timer-session-integrity-hotfix1"
  ];

  function installStylesheet(baseUrl) {
    if (document.getElementById("aldusDuplicateDiagnosticsStylesV260")) return;
    const link = document.createElement("link");
    link.id = "aldusDuplicateDiagnosticsStylesV260";
    link.rel = "stylesheet";
    link.href = new URL(DIAGNOSTICS_STYLESHEET, baseUrl).toString();
    (document.head || document.documentElement).appendChild(link);
  }

  function installScriptPreloads(baseUrl) {
    const head = document.head || document.documentElement;
    PRELOAD_SCRIPTS.forEach((sourceUrl, index) => {
      const id = `aldusBootstrapChainPreloadV267-${index + 1}`;
      if (document.getElementById(id)) return;
      const link = document.createElement("link");
      link.id = id;
      link.rel = "preload";
      link.as = "script";
      link.href = new URL(sourceUrl, baseUrl).toString();
      head.appendChild(link);
    });
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

  installScriptPreloads(baseUrl);
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
    stylesheet: DIAGNOSTICS_STYLESHEET,
    preloadedScripts: PRELOAD_SCRIPTS.length
  });
})();
