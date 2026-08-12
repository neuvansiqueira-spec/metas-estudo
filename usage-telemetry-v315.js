(() => {
  "use strict";

  if (globalThis.__aldusUsageTelemetryV315) return;

  const VERSION = "20260812-usage-telemetry-v315";
  const STORAGE_KEY = "aldus:usage:local:v315";
  const SESSION_KEY = "aldus:usage:session:v315";
  const MAX_LOCAL_EVENTS = 250;
  const MAX_PENDING_EVENTS = 50;
  const FLUSH_INTERVAL_MS = 12000;

  const endpoint = String(
    document.querySelector('meta[name="aldus-usage-endpoint"]')?.content
      || globalThis.__ALDUS_USAGE_ENDPOINT__
      || ""
  ).trim();

  const pending = [];
  let flushTimer = null;
  let lastView = "";

  function randomId() {
    try {
      return crypto.randomUUID();
    } catch {
      return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
    }
  }

  function sessionId() {
    try {
      let value = sessionStorage.getItem(SESSION_KEY);
      if (!value) {
        value = randomId();
        sessionStorage.setItem(SESSION_KEY, value);
      }
      return value;
    } catch {
      return randomId();
    }
  }

  const SESSION_ID = sessionId();

  function cleanToken(value, fallback = "unknown") {
    const token = String(value || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80);
    return token || fallback;
  }

  function currentView() {
    const active = document.querySelector('.app-view.active[data-view], .app-view:not([hidden])[data-view]');
    if (active?.dataset?.view) return cleanToken(active.dataset.view);
    const hash = location.hash.replace(/^#/, "").split(/[?&]/)[0];
    return cleanToken(hash || "dashboard");
  }

  function deviceKind() {
    const width = Math.max(document.documentElement?.clientWidth || 0, innerWidth || 0);
    if (width <= 720) return "mobile";
    if (width <= 1100) return "tablet";
    return "desktop";
  }

  function storeLocal(event) {
    try {
      const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      const events = Array.isArray(existing) ? existing : [];
      events.push(event);
      if (events.length > MAX_LOCAL_EVENTS) events.splice(0, events.length - MAX_LOCAL_EVENTS);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
    } catch {
      // Telemetria nunca deve impedir o funcionamento do site.
    }
  }

  function track(name, detail = {}) {
    const event = Object.freeze({
      schema: "aldus-usage-v1",
      version: VERSION,
      event: cleanToken(name, "event"),
      ts: new Date().toISOString(),
      sessionId: SESSION_ID,
      view: cleanToken(detail.view || currentView()),
      feature: cleanToken(detail.feature || detail.view || currentView()),
      action: cleanToken(detail.action || "observe"),
      device: deviceKind()
    });

    storeLocal(event);
    pending.push(event);
    if (pending.length > MAX_PENDING_EVENTS) pending.splice(0, pending.length - MAX_PENDING_EVENTS);
    scheduleFlush();
    return event;
  }

  function classifyAction(target) {
    const source = [
      target?.dataset?.action,
      target?.id,
      target?.getAttribute?.("name"),
      target?.getAttribute?.("type")
    ].filter(Boolean).join(" ").toLowerCase();

    const rules = [
      ["generate", /gerar|generate|criar|create/],
      ["start", /iniciar|start|play|continuar|resume/],
      ["pause", /pausar|pause/],
      ["stop", /parar|stop|encerrar|finish/],
      ["save", /salvar|save|confirmar|confirm/],
      ["import", /importar|import/],
      ["export", /exportar|export|download/],
      ["add", /adicionar|add|novo|new/],
      ["delete", /excluir|delete|remover|remove/],
      ["apply", /aplicar|apply|consolidar|merge/],
      ["open", /abrir|open|view|detalh/]
    ];
    return rules.find(([, pattern]) => pattern.test(source))?.[0] || "interaction";
  }

  function onClick(event) {
    const target = event.target instanceof Element
      ? event.target.closest('button, a, [role="button"]')
      : null;
    if (!target) return;

    const nav = target.closest("[data-view-link]");
    if (nav?.dataset?.viewLink) {
      track("view_open", {
        view: nav.dataset.viewLink,
        feature: nav.dataset.viewLink,
        action: "open"
      });
      return;
    }

    const view = target.closest(".app-view[data-view]")?.dataset?.view || currentView();
    track("feature_action", {
      view,
      feature: view,
      action: classifyAction(target)
    });
  }

  function onSubmit(event) {
    const form = event.target instanceof Element ? event.target.closest("form") : null;
    if (!form) return;
    const view = form.closest(".app-view[data-view]")?.dataset?.view || currentView();
    track("form_submit", { view, feature: view, action: "submit" });
  }

  function onHashChange() {
    const view = currentView();
    if (view === lastView) return;
    lastView = view;
    track("view_open", { view, feature: view, action: "open" });
  }

  async function flush() {
    if (!endpoint || pending.length === 0) return false;
    const batch = pending.splice(0, pending.length);
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        mode: "cors",
        credentials: "omit",
        keepalive: true,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schema: "aldus-usage-batch-v1", version: VERSION, events: batch })
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return true;
    } catch {
      pending.unshift(...batch.slice(-MAX_PENDING_EVENTS));
      if (pending.length > MAX_PENDING_EVENTS) pending.splice(0, pending.length - MAX_PENDING_EVENTS);
      return false;
    }
  }

  function scheduleFlush() {
    if (!endpoint || flushTimer) return;
    flushTimer = setTimeout(async () => {
      flushTimer = null;
      await flush();
    }, FLUSH_INTERVAL_MS);
  }

  function getLocalEvents() {
    try {
      const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      return Array.isArray(value) ? value.slice() : [];
    } catch {
      return [];
    }
  }

  function clearLocalEvents() {
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
  }

  function init() {
    document.addEventListener("click", onClick, { capture: true, passive: true });
    document.addEventListener("submit", onSubmit, { capture: true });
    addEventListener("hashchange", onHashChange, { passive: true });
    addEventListener("pagehide", () => { void flush(); }, { passive: true });
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") void flush();
    });

    lastView = currentView();
    track("session_start", { view: lastView, feature: lastView, action: "start" });
  }

  const api = Object.freeze({
    version: VERSION,
    endpointConfigured: Boolean(endpoint),
    track,
    flush,
    getLocalEvents,
    clearLocalEvents
  });

  globalThis.AldusUsage = api;
  globalThis.__aldusUsageTelemetryV315 = api;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
