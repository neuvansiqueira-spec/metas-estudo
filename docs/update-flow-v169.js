(() => {
  "use strict";

  const PATCH_VERSION = "20260728-bootstrap-interativo-v169";
  const CHECK_INTERVAL_MS = 15 * 60 * 1000;
  const BANNER_ID = "aldusUpdateBannerV169";
  const DIRTY_ATTRIBUTE = "data-aldus-user-edited-v169";
  const CONTROLLER_RELOAD_GUARD = "aldus:v169:controller-reload";
  let lastCheckAt = 0;
  let registrationRef = null;
  let hadController = Boolean(navigator.serviceWorker?.controller);
  let deferredControllerReload = false;
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
        return Boolean(floatingTimer.goalId)
          && !floatingTimer.paused
          && !floatingTimer.completed;
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
    const container = target?.matches?.(`[${DIRTY_ATTRIBUTE}]`)
      ? target
      : editingContainer(target);
    container?.removeAttribute(DIRTY_ATTRIBUTE);
  }

  function buttonFinishesEditing(button) {
    if (!button) return false;
    if (button.type === "submit" || button.type === "reset") return true;
    const intent = [
      button.id,
      button.name,
      button.value,
      button.textContent,
      ...Object.values(button.dataset || {})
    ].filter(Boolean).join(" ");
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

  function workerSuffix(worker) {
    const match = String(worker?.scriptURL || "").match(/service-worker-(v\d+)\.js/i);
    return match?.[1]?.toLowerCase() || "";
  }

  function visibleSuffix() {
    return String(globalThis.__ALDUS_APP_RELEASE__?.suffix || "").toLowerCase();
  }

  function pendingWorker(registration = registrationRef) {
    const waiting = registration?.waiting;
    if (waiting) return waiting;
    const installing = registration?.installing;
    if (installing && !["redundant", "activated"].includes(installing.state)) return installing;
    return null;
  }

  function currentReleaseAlreadyActive(registration = registrationRef) {
    const visible = visibleSuffix();
    const controller = workerSuffix(navigator.serviceWorker?.controller);
    return Boolean(
      visible
      && visible === "v169"
      && controller === visible
      && !pendingWorker(registration)
    );
  }

  function shouldShowUpdateReady(registration = registrationRef) {
    if (deferredControllerReload) return true;
    if (!pendingWorker(registration)) return false;
    return !currentReleaseAlreadyActive(registration);
  }

  function reloadGuardToken() {
    return pendingWorker()?.scriptURL
      || navigator.serviceWorker?.controller?.scriptURL
      || PATCH_VERSION;
  }

  function reloadOnce(reason) {
    const token = reloadGuardToken();
    try {
      if (sessionStorage.getItem(CONTROLLER_RELOAD_GUARD) === token) return false;
      sessionStorage.setItem(CONTROLLER_RELOAD_GUARD, token);
    } catch {}
    deferredControllerReload = false;
    console.info("[Aldus v169] Atualização segura da interface.", { reason });
    location.reload();
    return true;
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
        <small data-aldus-update-message-v169>Atualize quando terminar. Os dados já salvos serão preservados.</small>
      </span>
      <button type="button" data-aldus-update-now-v169>Atualizar agora</button>
    `;
    banner.querySelector("[data-aldus-update-now-v169]")?.addEventListener("click", () => {
      const message = banner.querySelector("[data-aldus-update-message-v169]");
      if (!safeToReload()) {
        if (message) message.textContent = "Finalize o preenchimento ou pause e salve o cronômetro antes de atualizar.";
        return;
      }
      const waiting = registrationRef?.waiting;
      waiting?.postMessage?.({ type: "SKIP_WAITING" });
      reloadOnce("update-button");
    });
    document.body.appendChild(banner);
    return banner;
  }

  function showUpdateReady() {
    if (!shouldShowUpdateReady()) {
      const existingBanner = document.getElementById(BANNER_ID);
      if (existingBanner) existingBanner.hidden = true;
      return false;
    }
    injectStyles();
    ensureBanner().hidden = false;
    return true;
  }

  function hideRedundantUpdateReady() {
    const banner = document.getElementById(BANNER_ID);
    if (banner && !shouldShowUpdateReady()) banner.hidden = true;
  }

  function watchRegistration(registration) {
    if (!registration || watchedRegistrations.has(registration)) return;
    watchedRegistrations.add(registration);
    registration.addEventListener("updatefound", () => {
      const installing = registration.installing;
      if (!installing) return;
      installing.addEventListener("statechange", () => {
        if (installing.state === "installed" && navigator.serviceWorker.controller) showUpdateReady();
        if (["activated", "redundant"].includes(installing.state)) hideRedundantUpdateReady();
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
      if (shouldShowUpdateReady(registrationRef)) showUpdateReady();
      else hideRedundantUpdateReady();
      return true;
    } catch (error) {
      console.warn("[Aldus v169] Não foi possível verificar atualização agora.", error);
      return false;
    }
  }

  function checkAfterFirstRender() {
    requestAnimationFrame(() => requestAnimationFrame(() => checkForUpdate(true)));
  }

  function install() {
    injectStyles();
    ensureBanner();
    installEditingGuard();
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (!hadController) {
        hadController = true;
        hideRedundantUpdateReady();
        return;
      }
      hadController = true;
      if (safeToReload()) {
        reloadOnce("controllerchange");
        return;
      }
      deferredControllerReload = true;
      showUpdateReady();
    });
    window.addEventListener("focus", () => checkForUpdate());
    window.addEventListener("pageshow", (event) => {
      if (event.persisted) checkForUpdate(true);
    });
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") checkForUpdate();
    });
    checkAfterFirstRender();

    Object.defineProperty(globalThis, "__ALDUS_UPDATE_FLOW_V169__", {
      value: Object.freeze({
        version: PATCH_VERSION,
        installedAt: new Date().toISOString(),
        navigationMode: "cache-first-network-background",
        reloadMode: "single-safe-controller-reload",
        hasActiveEditing,
        hasActiveTimer,
        safeToReload,
        shouldShowUpdateReady,
        clearUserEditing
      }),
      configurable: false,
      enumerable: false,
      writable: false
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", install, { once: true });
  } else {
    install();
  }
})();
