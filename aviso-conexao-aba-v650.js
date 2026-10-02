// V650 — Avisos na tela principal:
// 1. Google Drive sem conexão (desconectado ou autorização vencida): faixa no topo
//    de qualquer tela, com "Reconectar" — o mesmo botão "Conectar Google Drive" do
//    Backup. Some sozinha quando a conexão volta.
// 2. Aba parada há 60 minutos ou mais (escolha dele): ao voltar, faixa pedindo para
//    recarregar antes de mexer, porque a aba guarda a cópia dos dados de quando foi
//    aberta. Com o cronômetro ligado (rodando ou pausado) não avisa: conta como uso.
(() => {
  "use strict";

  const VERSION = "V650";
  const INSTALL_KEY = "__ALDUS_AVISO_CONEXAO_ABA_V650__";
  const BAR_ID = "aldusAvisosV650";
  const IDLE_LIMIT_MS = 60 * 60 * 1000;
  const STARTUP_GRACE_MS = 8000;
  const DRIVE_CHECK_MS = 15000;
  if (typeof document === "undefined" || globalThis[INSTALL_KEY]) return;
  globalThis[INSTALL_KEY] = Object.freeze({ version: VERSION });

  const loadedAt = Date.now();
  let lastActivityAt = Date.now();
  let idleDismissed = false;

  function bar() {
    let element = document.getElementById(BAR_ID);
    if (element) return element;
    element = document.createElement("div");
    element.id = BAR_ID;
    element.setAttribute("role", "status");
    element.setAttribute("aria-live", "polite");
    element.style.cssText = "position:fixed;top:0;left:0;right:0;z-index:2147482000;display:flex;flex-direction:column;gap:1px;padding-top:env(safe-area-inset-top,0)";
    document.body.appendChild(element);
    // Espaço no topo da página do tamanho da faixa, para ela não cobrir o menu.
    const spacer = document.createElement("div");
    spacer.id = `${BAR_ID}Espaco`;
    spacer.setAttribute("aria-hidden", "true");
    document.body.prepend(spacer);
    if (typeof ResizeObserver === "function") new ResizeObserver(fitSpacer).observe(element);
    return element;
  }

  function fitSpacer() {
    const element = document.getElementById(BAR_ID);
    const spacer = document.getElementById(`${BAR_ID}Espaco`);
    if (element && spacer) spacer.style.height = `${element.offsetHeight}px`;
  }

  function notice(kind, text, actions) {
    const container = bar();
    let row = container.querySelector(`[data-aviso-v650="${kind}"]`);
    if (!row) {
      row = document.createElement("div");
      row.dataset.avisoV650 = kind;
      row.style.cssText = "display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:4px 10px;padding:6px 12px;background:#ffd400;color:#1a1400;font:600 13px/1.3 Arial,sans-serif;box-shadow:0 2px 10px rgba(0,0,0,.35)";
      container.appendChild(row);
    }
    row.replaceChildren();
    const label = document.createElement("span");
    label.textContent = text;
    row.appendChild(label);
    actions.forEach(([caption, handler, primary]) => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = caption;
      const reset = "width:auto;min-width:0;min-height:0;height:auto;margin:0;flex:0 0 auto;box-shadow:none;line-height:1.2;";
      button.style.cssText = reset + (primary
        ? "border:0;border-radius:8px;padding:5px 10px;font:700 13px Arial,sans-serif;background:#1a1400;color:#ffd400;cursor:pointer"
        : "border:1px solid #1a1400;border-radius:8px;padding:4px 9px;font:600 12px Arial,sans-serif;background:transparent;color:#1a1400;cursor:pointer");
      button.addEventListener("click", handler);
      row.appendChild(button);
    });
    fitSpacer();
  }

  function clearNotice(kind) {
    document.querySelector(`#${BAR_ID} [data-aviso-v650="${kind}"]`)?.remove();
    fitSpacer();
  }

  function driveConnected() {
    try {
      return Boolean(readSyncMeta()?.connected) && Boolean(hasValidGoogleDriveAccessToken());
    } catch {
      return true;
    }
  }

  function checkDrive() {
    if (Date.now() - loadedAt < STARTUP_GRACE_MS) return;
    if (typeof readSyncMeta !== "function" || typeof hasValidGoogleDriveAccessToken !== "function") return;
    if (driveConnected()) {
      clearNotice("drive");
      return;
    }
    let connected = false;
    try { connected = Boolean(readSyncMeta()?.connected); } catch {}
    const text = connected
      ? "Google Drive: autorização vencida. Alterações não vão para o outro aparelho."
      : "Google Drive desconectado. Alterações não vão para o outro aparelho.";
    notice("drive", text, [["Reconectar", () => document.getElementById("connectGoogleDrive")?.click(), true]]);
  }

  function timerInUse() {
    try {
      return typeof floatingTimer !== "undefined" && Boolean(floatingTimer?.goalId || floatingTimer?.startedAt);
    } catch {
      return false;
    }
  }

  function checkIdle() {
    const idleMs = Date.now() - lastActivityAt;
    if (idleDismissed || idleMs < IDLE_LIMIT_MS || timerInUse()) return;
    const minutes = Math.floor(idleMs / 60000);
    const span = minutes >= 120 ? `${Math.floor(minutes / 60)} horas` : `${minutes} minutos`;
    notice("idle", `Aba parada há ${span}. Recarregue antes de mexer.`, [
      ["Recarregar", () => location.reload(), true],
      ["Continuar assim", () => { idleDismissed = true; clearNotice("idle"); }, false]
    ]);
  }

  function onActivity() {
    checkIdle();
    lastActivityAt = Date.now();
  }

  ["pointerdown", "keydown", "touchstart", "wheel"].forEach((type) => {
    window.addEventListener(type, onActivity, { capture: true, passive: true });
  });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      checkIdle();
      checkDrive();
    }
  });
  window.addEventListener("focus", checkDrive);
  // A faixa de aba parada aparece sozinha, antes do primeiro toque depois da pausa.
  setInterval(() => { checkDrive(); if (document.visibilityState === "visible") checkIdle(); }, DRIVE_CHECK_MS);
  setTimeout(checkDrive, STARTUP_GRACE_MS + 200);
})();
