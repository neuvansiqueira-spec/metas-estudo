(() => {
  "use strict";

  const VERSION = "20260812-timer-diagnostics-security-v316";
  const GLOBAL_KEY = "__ALDUS_TIMER_RUNTIME_V316__";
  const SAFETY_KEY = "metasEstudoTimerSessionSafety";
  const DIAGNOSTICS_KEY = "aldus:timer:diagnostics:v316";
  const OWNER_KEY = "aldus:timer:owner:v316";
  const ALERT_CLAIMS_KEY = "aldus:timer:alert-claims:v316";
  const MAX_DIAGNOSTICS = 200;
  const OWNER_LEASE_MS = 7000;
  const CLAIM_TTL_MS = 12 * 60 * 60 * 1000;
  const TAB_ID = (() => {
    try { return crypto.randomUUID(); } catch {}
    return `tab-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  })();

  if (globalThis[GLOBAL_KEY]) return;

  let restoredAwaitingDecision = false;
  let installed = false;
  let triggerWrapped = false;
  let installAttempts = 0;

  function readJson(key, fallback) {
    try {
      const parsed = JSON.parse(localStorage.getItem(key) || "null");
      return parsed ?? fallback;
    } catch {
      return fallback;
    }
  }

  function writeJson(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  }

  function preflightStoredSession() {
    const saved = readJson(SAFETY_KEY, null);
    if (!saved?.goalId || saved.closed) return false;
    const protectedSnapshot = {
      ...saved,
      elapsedSeconds: Math.max(0, Number(saved.elapsedSeconds) || 0),
      startedAt: null,
      paused: true,
      completionDismissed: true,
      restoredByV316: true,
      snapshotAt: Date.now()
    };
    restoredAwaitingDecision = true;
    return writeJson(SAFETY_KEY, protectedSnapshot);
  }

  function timerState() {
    try { return typeof floatingTimer === "object" && floatingTimer ? floatingTimer : null; } catch { return null; }
  }

  function sessionKey(timer = timerState()) {
    return String(timer?.sessionId || timer?.timerSessionId || timer?.goalId || "none").slice(0, 100);
  }

  function diagnostics() {
    const stored = readJson(DIAGNOSTICS_KEY, []);
    return Array.isArray(stored) ? stored : [];
  }

  function record(event, detail = {}) {
    const timer = timerState();
    const entry = Object.freeze({
      ts: new Date().toISOString(),
      version: VERSION,
      event: String(event || "event").replace(/[^a-z0-9_-]/gi, "-").slice(0, 64),
      sessionId: sessionKey(timer),
      tabId: TAB_ID,
      source: String(detail.source || "timer").replace(/[^a-z0-9_-]/gi, "-").slice(0, 40),
      reason: String(detail.reason || "").replace(/[^a-z0-9_-]/gi, "-").slice(0, 64),
      mode: timer?.mode === "free" ? "free" : "countdown",
      paused: Boolean(timer?.paused),
      completed: Boolean(timer?.completed),
      visibility: document.visibilityState
    });
    const events = diagnostics();
    events.push(entry);
    if (events.length > MAX_DIAGNOSTICS) events.splice(0, events.length - MAX_DIAGNOSTICS);
    writeJson(DIAGNOSTICS_KEY, events);
    try {
      globalThis.AldusUsage?.track?.("timer_event", {
        view: "timer",
        feature: "timer",
        action: entry.event
      });
    } catch {}
    refreshPanel();
    return entry;
  }

  function owner() {
    const value = readJson(OWNER_KEY, null);
    return value && typeof value === "object" ? value : null;
  }

  function claimOwnership(reason = "interaction") {
    const now = Date.now();
    const current = owner();
    if (current?.tabId && current.tabId !== TAB_ID && Number(current.expiresAt) > now) {
      record("ownership-denied", { source: "tab", reason });
      return false;
    }
    const next = {
      tabId: TAB_ID,
      sessionId: sessionKey(),
      claimedAt: current?.tabId === TAB_ID ? current.claimedAt || now : now,
      expiresAt: now + OWNER_LEASE_MS
    };
    if (!writeJson(OWNER_KEY, next)) return true;
    const acquired = owner()?.tabId === TAB_ID;
    if (acquired && current?.tabId !== TAB_ID) record("ownership-acquired", { source: "tab", reason });
    return acquired;
  }

  function renewOwnership() {
    const current = owner();
    if (current?.tabId !== TAB_ID) return false;
    current.expiresAt = Date.now() + OWNER_LEASE_MS;
    current.sessionId = sessionKey();
    return writeJson(OWNER_KEY, current);
  }

  function releaseOwnership(reason = "release") {
    if (owner()?.tabId !== TAB_ID) return false;
    try { localStorage.removeItem(OWNER_KEY); } catch { return false; }
    record("ownership-released", { source: "tab", reason });
    return true;
  }

  function claimAlert(type) {
    if (type === "test") return true;
    if (!claimOwnership(`alert-${type}`)) return false;
    const now = Date.now();
    const key = `${sessionKey()}:${type}`;
    const stored = readJson(ALERT_CLAIMS_KEY, {});
    const claims = stored && typeof stored === "object" && !Array.isArray(stored) ? stored : {};
    Object.keys(claims).forEach((claimKey) => {
      if (now - Number(claims[claimKey]?.ts || 0) > CLAIM_TTL_MS) delete claims[claimKey];
    });
    if (claims[key]) {
      record("alert-suppressed", { source: "dedupe", reason: type });
      return false;
    }
    claims[key] = { ts: now, tabId: TAB_ID };
    writeJson(ALERT_CLAIMS_KEY, claims);
    return readJson(ALERT_CLAIMS_KEY, {})?.[key]?.tabId === TAB_ID;
  }

  async function emitCompletionOnce(source = "watchdog") {
    if (restoredAwaitingDecision || !claimAlert("completed")) return false;
    record("alert-emitted", { source, reason: "completed" });
    try {
      if (typeof playTimerCompletionAlarm === "function") await playTimerCompletionAlarm("completed");
      if (typeof notifyTimerAlert === "function") await notifyTimerAlert("completed");
      return true;
    } catch {
      return false;
    }
  }

  function prepareResume(reason = "resume") {
    if (!claimOwnership(reason)) {
      try { showDailyGoalMessage("O cronômetro está ativo em outra aba. Pause ou feche a outra aba antes de retomar aqui.", "warning"); } catch {}
      return false;
    }
    const timer = timerState();
    restoredAwaitingDecision = false;
    if (timer) {
      timer.restoredByV316 = false;
      timer.completionDismissed = false;
    }
    document.getElementById("timerRestoredNoticeV316")?.setAttribute("hidden", "");
    record("timer-resumed", { source: reason });
    return true;
  }

  function wrapCoreAlert() {
    if (triggerWrapped || typeof triggerTimerAlert !== "function") return triggerWrapped;
    const original = triggerTimerAlert;
    triggerTimerAlert = async function triggerTimerAlertV316(type, goal) {
      if (restoredAwaitingDecision && type !== "test") {
        record("alert-suppressed", { source: "restore", reason: type });
        return false;
      }
      if (!claimAlert(type)) return false;
      record("alert-emitted", { source: "core", reason: type });
      return original(type, goal);
    };
    triggerWrapped = true;
    return true;
  }

  function injectStyles() {
    if (document.getElementById("timerRuntimeStylesV316")) return;
    const style = document.createElement("style");
    style.id = "timerRuntimeStylesV316";
    style.textContent = `
      .timer-restored-notice-v316,.timer-diagnostics-v316{display:grid;gap:8px;margin-top:10px;padding:10px;border:1px solid color-mix(in srgb,var(--primary,#2563eb) 38%,#cbd5e1);border-radius:10px;background:color-mix(in srgb,var(--surface,#fff) 92%,#eff6ff)}
      .timer-restored-notice-v316[hidden]{display:none!important}.timer-restored-notice-v316 p,.timer-diagnostics-v316 small{margin:0;line-height:1.4}.timer-diagnostics-v316 pre{max-height:150px;margin:0;padding:8px;overflow:auto;border-radius:8px;background:rgba(15,23,42,.08);font-size:.7rem;white-space:pre-wrap;overflow-wrap:anywhere}
      html[data-aldus-theme="premium-stable"] .timer-restored-notice-v316,html[data-aldus-theme="premium-stable"] .timer-diagnostics-v316{border-color:rgba(125,181,224,.4);background:rgba(3,23,38,.78);color:#f8fbff}html[data-aldus-theme="premium-stable"] .timer-diagnostics-v316 pre{background:rgba(0,10,24,.58);color:#d6e3ec}
    `;
    (document.head || document.documentElement).appendChild(style);
  }

  function refreshPanel() {
    const output = document.querySelector("[data-timer-diagnostics-output-v316]");
    if (!output) return;
    const recent = diagnostics().slice(-8).reverse();
    output.textContent = recent.length
      ? recent.map((entry) => `${entry.ts} • ${entry.event} • ${entry.reason || entry.source}`).join("\n")
      : "Nenhum evento técnico registrado neste navegador.";
  }

  function ensurePanel() {
    const settings = document.getElementById("timerSettings");
    if (!settings) return false;
    let panel = document.getElementById("timerDiagnosticsV316");
    if (!panel) {
      panel = document.createElement("section");
      panel.id = "timerDiagnosticsV316";
      panel.className = "timer-diagnostics-v316";
      panel.innerHTML = `
        <strong>Diagnóstico local do cronômetro</strong>
        <small>Registra somente eventos técnicos neste navegador. Não registra disciplinas, questões ou textos.</small>
        <pre data-timer-diagnostics-output-v316></pre>
        <button type="button" class="secondary-button" data-timer-diagnostics-copy-v316>Copiar diagnóstico</button>
        <button type="button" class="secondary-button" data-timer-diagnostics-clear-v316>Limpar diagnóstico</button>
      `;
      settings.appendChild(panel);
    }
    refreshPanel();
    return true;
  }

  function ensureRestoredNotice() {
    const timer = timerState();
    if (timer?.restoredByV316) restoredAwaitingDecision = true;
    const body = document.querySelector("#floatingTimer .floating-timer-body");
    if (!body || !restoredAwaitingDecision || !timer?.goalId) return false;
    timer.startedAt = null;
    timer.paused = true;
    timer.completionDismissed = true;
    try { stopFloatingTimerInterval(); } catch {}
    let notice = document.getElementById("timerRestoredNoticeV316");
    if (!notice) {
      notice = document.createElement("section");
      notice.id = "timerRestoredNoticeV316";
      notice.className = "timer-restored-notice-v316";
      notice.innerHTML = `
        <strong>Sessão anterior encontrada</strong>
        <p>Ela foi restaurada pausada e não emitirá alarme até você decidir.</p>
        <div class="floating-timer-actions">
          <button type="button" data-timer-action="pause">Retomar</button>
          <button type="button" data-timer-action="save">Salvar</button>
          <button type="button" class="secondary-button" data-timer-restore-discard-v316>Descartar</button>
        </div>
      `;
      body.prepend(notice);
      record("session-restored-paused", { source: "restore" });
    }
    notice.hidden = false;
    return true;
  }

  function interceptActions(event) {
    const target = event.target?.closest?.("button");
    if (!target) return;
    if (target.matches("[data-goal-timer],[data-calendar-timer]")) {
      if (claimOwnership("start")) {
        restoredAwaitingDecision = false;
        return;
      }
      event.preventDefault();
      event.stopImmediatePropagation();
      try { showDailyGoalMessage("Já existe um cronômetro controlado por outra aba.", "warning"); } catch {}
      return;
    }
    const timerAction = target.dataset.timerAction;
    if ((timerAction === "pause" || timerAction === "continue") && timerState()?.paused) {
      if (prepareResume(`action-${timerAction}`)) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }
    if (target.matches("[data-timer-restore-discard-v316]")) {
      event.preventDefault();
      event.stopImmediatePropagation();
      restoredAwaitingDecision = false;
      record("restored-discarded", { source: "restore" });
      try { closeFloatingTimer(); } catch {}
      releaseOwnership("discard");
      target.closest("#timerRestoredNoticeV316")?.setAttribute("hidden", "");
      return;
    }
    if (target.matches("[data-timer-diagnostics-clear-v316]")) {
      try { localStorage.removeItem(DIAGNOSTICS_KEY); } catch {}
      refreshPanel();
      return;
    }
    if (target.matches("[data-timer-diagnostics-copy-v316]")) {
      void navigator.clipboard?.writeText?.(JSON.stringify(diagnostics(), null, 2));
    }
  }

  function enforceSingleRunningTab() {
    const timer = timerState();
    if (!timer?.goalId || timer.paused || timer.completed) return;
    if (claimOwnership("running")) return;
    try {
      timer.elapsedSeconds = typeof currentTimerSeconds === "function" ? currentTimerSeconds() : Number(timer.elapsedSeconds) || 0;
      timer.startedAt = null;
      timer.paused = true;
      stopFloatingTimerInterval();
      renderFloatingTimer();
      persistFloatingTimerSession({ storageOnly: true });
      record("timer-paused-other-tab", { source: "tab" });
    } catch {}
  }

  function install() {
    installAttempts += 1;
    injectStyles();
    const panel = ensurePanel();
    const wrapped = wrapCoreAlert();
    ensureRestoredNotice();
    enforceSingleRunningTab();
    installed = panel && wrapped;
    return installed;
  }

  const api = Object.freeze({
    version: VERSION,
    tabId: TAB_ID,
    install,
    record,
    events: () => diagnostics().slice(),
    clear: () => { try { localStorage.removeItem(DIAGNOSTICS_KEY); } catch {} refreshPanel(); },
    prepareResume,
    claimOwnership,
    releaseOwnership,
    emitCompletionOnce,
    shouldSuppressAlerts: () => restoredAwaitingDecision,
    isOwner: () => owner()?.tabId === TAB_ID
  });
  globalThis[GLOBAL_KEY] = api;

  preflightStoredSession();
  document.addEventListener("click", interceptActions, true);
  addEventListener("pagehide", () => releaseOwnership("pagehide"), { passive: true });
  addEventListener("storage", (event) => {
    if (event.key === OWNER_KEY) enforceSingleRunningTab();
  });

  const retry = setInterval(() => {
    install();
    renewOwnership();
    if (installed && installAttempts >= 20) clearInterval(retry);
  }, 100);
  setInterval(() => {
    renewOwnership();
    enforceSingleRunningTab();
  }, 2000);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install, { once: true });
  else install();
})();
