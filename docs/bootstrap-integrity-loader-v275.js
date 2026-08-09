(() => {
  "use strict";

  const VERSION = "20260809-planejamento-plantao-salvamento-v283";
  const CORE_SCRIPT = `bootstrap-integrity-loader-v258-core.js?v=${VERSION}`;
  const DIAGNOSTICS_SCRIPT = `duplicate-diagnostics-v260.js?v=${VERSION}`;
  const DIAGNOSTICS_STYLESHEET = `duplicate-diagnostics-v260.css?v=${VERSION}`;
  const RECOVERY_SCRIPT = `recovery-safety-v275.js?v=${VERSION}`;
  const PLANNING_SHIFT_PERSISTENCE_SCRIPT = `planning-shift-persistence-v283.js?v=${VERSION}`;

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

  async function start() {
    const source = document.currentScript;
    const baseUrl = source?.src || document.baseURI;
    const parent = source?.parentNode || document.body || document.documentElement;
    installStylesheet(baseUrl);

    const loading = document.getElementById("appLoadingState");
    if (loading) loading.textContent = "Protegendo e validando seus dados antes de iniciar...";

    const guardPromise = globalThis.__ALDUS_CATASTROPHIC_GUARD_READY_V275__;
    if (guardPromise && typeof guardPromise.then === "function") {
      try {
        await guardPromise;
      } catch (error) {
        console.error(`[${VERSION}] A proteção preventiva falhou. O bootstrap continuará sem sobrescrever o diagnóstico do erro.`, error);
      }
    }

    const core = makeScript("aldusBootstrapIntegrityCoreV275", CORE_SCRIPT, baseUrl, source);
    const shiftPersistence = makeScript("aldusPlanningShiftPersistenceV283", PLANNING_SHIFT_PERSISTENCE_SCRIPT, baseUrl, source);
    const diagnostics = makeScript("aldusDuplicateDiagnosticsScriptV260", DIAGNOSTICS_SCRIPT, baseUrl, source);
    const recovery = makeScript("aldusRecoverySafetyV275", RECOVERY_SCRIPT, baseUrl, source);

    core.addEventListener("error", () => console.error(`[${VERSION}] Falha ao carregar o núcleo de inicialização.`), { once: true });
    shiftPersistence.addEventListener("error", () => console.error(`[${VERSION}] Falha ao carregar a persistência das disciplinas de plantão.`), { once: true });
    diagnostics.addEventListener("error", () => console.error(`[${VERSION}] Falha ao carregar o diagnóstico de duplicações.`), { once: true });
    recovery.addEventListener("error", () => console.error(`[${VERSION}] Falha ao carregar a recuperação segura.`), { once: true });

    parent.insertBefore(core, source?.nextSibling || null);
    parent.insertBefore(shiftPersistence, core.nextSibling);
    parent.insertBefore(diagnostics, shiftPersistence.nextSibling);
    parent.insertBefore(recovery, diagnostics.nextSibling);

    globalThis.__aldusBootstrapIntegrityLoaderV275 = Object.freeze({
      version: VERSION,
      core: CORE_SCRIPT,
      planningShiftPersistence: PLANNING_SHIFT_PERSISTENCE_SCRIPT,
      diagnostics: DIAGNOSTICS_SCRIPT,
      recovery: RECOVERY_SCRIPT
    });
  }

  start().catch((error) => {
    console.error(`[${VERSION}] Falha ao iniciar o carregador protegido.`, error);
    const loading = document.getElementById("appLoadingState");
    if (loading) loading.textContent = "Falha na proteção dos dados. Recarregue a página antes de continuar.";
  });
})();
