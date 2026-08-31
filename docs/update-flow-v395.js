(() => {
  "use strict";

  const VERSION = "20260825-no-auto-reload-v395";
  const CHECK_INTERVAL_MS = 15 * 60 * 1000;
  const BANNER_ID = "aldusUpdateBannerV169";
  const DIRTY_ATTRIBUTE = "data-aldus-user-edited-v169";
  let lastCheckAt = 0;
  let registrationRef = null;
  let updateAvailable = false;
  let manualReloadRequested = false;
  const watchedRegistrations = new WeakSet();

  if (typeof document === "undefined" || !("serviceWorker" in navigator) || globalThis.__ALDUS_UPDATE_FLOW_V169__) return;

  function injectStyles() {
    if (document.getElementById("aldusUpdateStylesV169")) return;
    const style = document.createElement("style");
    style.id = "aldusUpdateStylesV169";
    style.textContent = `
      #${BANNER_ID} {
        position: fixed;
        right: 18px;
        bottom: 18px;
        z-index: 100000;
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        align-items: center;
        gap: 14px;
        width: min(430px, calc(100vw - 28px));
        padding: 14px 15px;
        border: 1px solid rgba(242, 207, 101, .72);
        border-radius: 16px;
        background: rgba(4, 29, 49, .97);
        color: #f4f9fd;
        box-shadow: 0 18px 48px rgba(0, 0, 0, .34);
        backdrop-filter: blur(12px);
      }
      #${BANNER_ID}[hidden] { display: none !important; }
      #${BANNER_ID} .aldus-update-copy-v169 { display: grid; gap: 3px; min-width: 0; }
      #${BANNER_ID} strong { font-size: .96rem; }
      #${BANNER_ID} small { color: #b8d0e1; font-size: .79rem; line-height: 1.35; }
      #${BANNER_ID} button { min-height: 40px; padding: 9px 13px; border-radius: 12px; white-space: nowrap; }
      @media (max-width: 560px) {
        #${BANNER_ID} { right: 14px; bottom: 14px; grid-template-columns: 1fr; }
        #${BANNER_ID} button { width: 100%; }
      }
    `;
    document.head.appendChild(style);
  }

  function hasActiveTimer() {
    try {
      if (typeof floatingTimer !== "undefined") {
        return Boolean(floatingTimer.goalId) && !floatingTimer.paused && !floatingTimer.completed;
      }
    } catch {}
    const timer = document.getElementById("floatingTimer");
    const pauseButton = document.getElementById("timerPauseResume");
    return Boolean(timer && !timer.hidden && /pausar/i.test(pauseButton?.textContent || ""));
  }

  function hasActiveEditing() {
    return Boolean(document.querySelector(`[${DIRTY_ATTRIBUTE}="true"]`));
  }

  function editingContainer(target) {
    if (!target?.closest) return null;
    return target.closest("form") || target.closest("input, textarea, select, [contenteditable='true']");
  }

  function markUserEditing(event) {
    if (!event?.isTrusted) return;
    const container = editingContainer(event.target);
    if (container) container.setAttribute(DIRTY_ATTRIBUTE, "true");
  }

  function clearUserEditing(target) {
    const container = target?.matches?.(`[${DIRTY_ATTRIBUTE}]`) ? target : editingContainer(target);
    container?.removeAttribute(DIRTY_ATTRIBUTE);
  }

  function buttonFinishesEditing(button) {
    if (!button) return false;
    if (button.type === "submit" || button.type === "reset") return true;
    const intent = [button.id, button.name, button.value, button.textContent, ...Object.values(button.dataset || {})]
      .filter(Boolean).join(" ");
    return /\b(salvar|cancelar|confirmar|concluir)\b/i.test(intent);
  }

  function installEditingGuard() {
    document.addEventListener("input", markUserEditing, true);
    document.addEventListener("change", markUserEditing, true);
    document.addEventListener("reset", (event) => clearUserEditing(event.target), true);
    document.addEventListener("submit", (event) => clearUserEditing(event.target), true);
    document.addEventListener("click", (event) => {
      if (!event.isTrusted) return;
      const button = event.target?.closest?.("button, input[type='submit'], input[type='reset']");
      if (buttonFinishesEditing(button)) queueMicrotask(() => clearUserEditing(button));
    }, true);
    window.addEventListener("aldus:editing-saved", (event) => clearUserEditing(event.detail?.form || event.target));
    window.addEventListener("aldus:editing-cancelled", (event) => clearUserEditing(event.detail?.form || event.target));
  }

  function safeToReload() {
    return !hasActiveTimer() && !hasActiveEditing();
  }

  function pendingWorker(registration = registrationRef) {
    // Um worker ainda em instalação não está pronto para ser aplicado.
    return registration?.waiting || null;
  }

  function ensureBanner() {
    let banner = document.getElementById(BANNER_ID);
    if (banner) return banner;
    banner = document.createElement("aside");
    banner.id = BANNER_ID;
    banner.hidden = true;
    banner.setAttribute("role", "status");
    banner.setAttribute("aria-live", "polite");
    banner.innerHTML = `
      <span class="aldus-update-copy-v169">
        <strong>Nova versão pronta</strong>
        <small data-aldus-update-message-v169>Atualize quando terminar. A página não será recarregada automaticamente.</small>
      </span>
      <button type="button" data-aldus-update-now-v169>Atualizar agora</button>
    `;
    banner.querySelector("[data-aldus-update-now-v169]")?.addEventListener("click", () => {
      const message = banner.querySelector("[data-aldus-update-message-v169]");
      if (!safeToReload()) {
        if (message) message.textContent = "Finalize o preenchimento ou pause e salve o cronômetro antes de atualizar.";
        return;
      }
      manualReloadRequested = true;
      const waiting = registrationRef?.waiting;
      if (waiting) {
        if (message) message.textContent = "Aplicando a atualização escolhida por você…";
        waiting.postMessage?.({ type: "SKIP_WAITING" });
        return;
      }
      manualReloadRequested = false;
      hideUpdateReady();
    });
    document.body.appendChild(banner);
    return banner;
  }

  function showUpdateReady() {
    injectStyles();
    ensureBanner().hidden = false;
    return true;
  }

  function hideUpdateReady() {
    const banner = document.getElementById(BANNER_ID);
    if (banner) banner.hidden = true;
  }

  function watchRegistration(registration) {
    if (!registration || watchedRegistrations.has(registration)) return;
    watchedRegistrations.add(registration);
    registration.addEventListener("updatefound", () => {
      const installing = registration.installing;
      if (!installing) return;
      installing.addEventListener("statechange", () => {
        if (installing.state === "installed" && navigator.serviceWorker.controller) {
          updateAvailable = true;
          showUpdateReady();
        }
      });
    });
  }

  async function checkForUpdate(force = false) {
    const now = Date.now();
    if (!force && now - lastCheckAt < CHECK_INTERVAL_MS) return false;
    lastCheckAt = now;
    try {
      registrationRef ||= await navigator.serviceWorker.ready;
      watchRegistration(registrationRef);
      await registrationRef.update();
      if (pendingWorker(registrationRef)) {
        updateAvailable = true;
        showUpdateReady();
      } else if (!updateAvailable) {
        hideUpdateReady();
      }
      return true;
    } catch (error) {
      console.warn(`[Aldus ${VERSION}] Não foi possível verificar atualização agora.`, error);
      return false;
    }
  }

  function install() {
    injectStyles();
    ensureBanner();
    installEditingGuard();
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (manualReloadRequested && safeToReload()) {
        location.reload();
        return;
      }
      manualReloadRequested = false;
      updateAvailable = false;
      hideUpdateReady();
      console.info(`[Aldus ${VERSION}] Novo Service Worker assumiu o controle sem recarregar a página.`);
    });
    window.addEventListener("focus", () => checkForUpdate());
    window.addEventListener("pageshow", (event) => { if (event.persisted) checkForUpdate(true); });
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") checkForUpdate();
    });
    requestAnimationFrame(() => requestAnimationFrame(() => checkForUpdate(true)));
  }

  Object.defineProperty(globalThis, "__ALDUS_UPDATE_FLOW_V169__", {
    value: Object.freeze({
      version: VERSION,
      installedAt: new Date().toISOString(),
      navigationMode: "cache-first-network-background",
      reloadMode: "manual-only-no-controller-reload-v395",
      hasActiveEditing,
      hasActiveTimer,
      safeToReload,
      clearUserEditing
    }),
    configurable: false,
    enumerable: false,
    writable: false
  });

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install, { once: true });
  else install();
})();
