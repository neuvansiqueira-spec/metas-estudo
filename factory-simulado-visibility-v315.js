(() => {
  "use strict";

  const VERSION = "20260812-gerador-simulados-visibilidade-v315";
  const PROMPT_SCRIPT = `factory-simulado-prompt-v310.js?v=${VERSION}`;
  const RECOVERY_SCRIPT_ID = "aldusFactorySimuladoPromptRecoveryV315";
  const BUILDER_ID = "factorySimuladoBuilderV310";
  const MAX_ACTIVE_ATTEMPTS = 120;
  let attempts = 0;
  let loading = false;
  let timer = 0;

  function builderIsVisible() {
    const builder = document.getElementById(BUILDER_ID);
    return Boolean(builder && builder.isConnected && builder.closest("#factoryList"));
  }

  function factoryIsReady() {
    return Boolean(document.getElementById("factoryList") && typeof globalThis.renderFactory === "function");
  }

  function markReady(reason) {
    const source = document.currentScript;
    if (source) source.dataset.aldusLoaded = "true";
    globalThis.__ALDUS_FACTORY_SIMULADO_VISIBILITY_V315__ = Object.freeze({
      version: VERSION,
      ready: true,
      reason,
      checkedAt: new Date().toISOString()
    });
  }

  function schedule(delay = 120) {
    if (timer || builderIsVisible()) return;
    timer = globalThis.setTimeout(() => {
      timer = 0;
      ensureBuilder();
    }, delay);
  }

  function loadPromptModule() {
    if (loading || builderIsVisible()) return;
    loading = true;

    const previous = document.getElementById(RECOVERY_SCRIPT_ID);
    if (previous) previous.remove();

    // A versão antiga pode ter iniciado antes do aplicativo e perdido o bloco
    // quando a Fábrica renderizou a lista. Liberar apenas a trava visual permite
    // remontar o módulo sem tocar nos dados ou no estado de estudo.
    if (globalThis.__ALDUS_FACTORY_SIMULADO_V310_BROWSER__ && !builderIsVisible()) {
      globalThis.__ALDUS_FACTORY_SIMULADO_V310_BROWSER__ = false;
    }

    const script = document.createElement("script");
    script.id = RECOVERY_SCRIPT_ID;
    script.src = PROMPT_SCRIPT;
    script.async = false;
    script.addEventListener("load", () => {
      loading = false;
      globalThis.requestAnimationFrame?.(() => {
        if (builderIsVisible()) markReady("gerador-remontado");
        else schedule(160);
      });
    }, { once: true });
    script.addEventListener("error", () => {
      loading = false;
      console.error(`[${VERSION}] Falha ao recuperar o Gerador de Simulados.`);
      schedule(500);
    }, { once: true });
    document.body.appendChild(script);
  }

  function ensureBuilder() {
    if (builderIsVisible()) {
      markReady("gerador-presente");
      return true;
    }
    if (!factoryIsReady()) {
      attempts += 1;
      if (attempts <= MAX_ACTIVE_ATTEMPTS) schedule(250);
      return false;
    }
    loadPromptModule();
    return false;
  }

  const observer = new MutationObserver(() => {
    if (!builderIsVisible() && document.getElementById("factoryList")) schedule(80);
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });

  document.addEventListener("DOMContentLoaded", () => schedule(0), { once: true });
  window.addEventListener("aldus:bootstrap-integrity-v258-ready", () => schedule(0));
  window.addEventListener("hashchange", () => schedule(40));

  const source = document.currentScript;
  if (source) source.dataset.aldusLoaded = "true";
  globalThis.__ALDUS_FACTORY_SIMULADO_VISIBILITY_V315__ = Object.freeze({
    version: VERSION,
    ready: false,
    reason: "aguardando-fabrica",
    checkedAt: new Date().toISOString()
  });

  if (document.readyState === "loading") schedule(120);
  else schedule(0);
})();
