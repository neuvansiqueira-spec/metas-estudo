(() => {
  "use strict";

  const VERSION = "20260802-corrige-atualizacao-versao-v217";
  const VERSION_TEXT = `Versão: ${VERSION}`;
  const OBSERVER_KEY = "__ALDUS_VERSION_SYNC_V217_OBSERVER__";

  function applyVersion() {
    document.documentElement.dataset.aldusVersion = VERSION;
    document.querySelectorAll(".app-version").forEach((element) => {
      if (element.textContent !== VERSION_TEXT) element.textContent = VERSION_TEXT;
      element.setAttribute("data-version", VERSION);
      element.setAttribute("title", "Versão efetivamente carregada pelo aplicativo");
    });

    const stylesheet = document.getElementById("aldusAppBundleStyles");
    if (stylesheet) stylesheet.dataset.runtimeVersion = VERSION;
    const script = document.getElementById("aldusAppBundleScript");
    if (script) script.dataset.runtimeVersion = VERSION;
  }

  function startObserver() {
    if (globalThis[OBSERVER_KEY]) return;
    const observer = new MutationObserver(applyVersion);
    observer.observe(document.documentElement, { childList: true, subtree: true });
    globalThis[OBSERVER_KEY] = observer;
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      applyVersion();
      startObserver();
    }, { once: true });
  } else {
    applyVersion();
    startObserver();
  }

  window.addEventListener("pageshow", applyVersion);
  navigator.serviceWorker?.addEventListener("controllerchange", () => {
    if (sessionStorage.getItem("aldus.v217.controllerReloaded") === "1") return;
    sessionStorage.setItem("aldus.v217.controllerReloaded", "1");
    location.reload();
  });

  globalThis.__ALDUS_VERSION_SYNC_V217__ = Object.freeze({ version: VERSION, apply: applyVersion });
})();
