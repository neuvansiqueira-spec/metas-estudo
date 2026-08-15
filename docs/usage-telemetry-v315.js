(() => {
  "use strict";

  if (globalThis.__aldusUsageTelemetryV317) return;

  const VERSION = "20260812-posthog-telemetry-v317";
  const DEFAULT_ENDPOINT = "https://us.i.posthog.com/batch/";
  const DEFAULT_PROJECT_TOKEN = "phc_ALLcUsY57Zp3nXGd58NtMAPL3KhD8mZXJ6kyzR9ioqdA";
  const STORAGE_KEY = "aldus:usage:local:v317";
  const SESSION_KEY = "aldus:usage:session:v317";
  const VISITOR_KEY = "aldus:usage:visitor:v317";
  const FIRST_SEEN_KEY = "aldus:usage:first-seen:v317";
  const CONSENT_KEY = "aldus:usage:consent:v317";
  const MAX_LOCAL_EVENTS = 250;
  const MAX_PENDING_EVENTS = 50;
  const FLUSH_INTERVAL_MS = 12000;
  const HEARTBEAT_INTERVAL_MS = 60000;

  const endpoint = String(
    document.querySelector('meta[name="aldus-usage-endpoint"]')?.content
      || globalThis.__ALDUS_USAGE_ENDPOINT__
      || DEFAULT_ENDPOINT
  ).trim();
  const projectToken = String(
    document.querySelector('meta[name="aldus-usage-project-token"]')?.content
      || globalThis.__ALDUS_USAGE_PROJECT_TOKEN__
      || DEFAULT_PROJECT_TOKEN
  ).trim();

  const pending = [];
  const startedAt = Date.now();
  let flushTimer = null;
  let heartbeatTimer = null;
  let lastView = "";
  let trackingStarted = false;
  let sessionEnded = false;
  let visitorCache = null;

  function randomId() {
    try {
      return crypto.randomUUID();
    } catch {
      return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
    }
  }

  function safeGet(storage, key) {
    try { return storage.getItem(key) || ""; } catch { return ""; }
  }

  function safeSet(storage, key, value) {
    try { storage.setItem(key, value); return true; } catch { return false; }
  }

  function safeRemove(storage, key) {
    try { storage.removeItem(key); } catch {}
  }

  function sessionId() {
    let value = safeGet(sessionStorage, SESSION_KEY);
    if (!value) {
      value = randomId();
      safeSet(sessionStorage, SESSION_KEY, value);
    }
    return value;
  }

  const SESSION_ID = sessionId();

  function cleanToken(value, fallback = "unknown") {
    const token = String(value || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9_.-]+/g, "-")
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

  function browserKind() {
    const ua = String(navigator.userAgent || "");
    if (/Edg\//.test(ua)) return "edge";
    if (/OPR\//.test(ua)) return "opera";
    if (/Firefox\//.test(ua)) return "firefox";
    if (/CriOS\//.test(ua)) return "chrome-ios";
    if (/Chrome\//.test(ua)) return "chrome";
    if (/Safari\//.test(ua)) return "safari";
    return "other";
  }

  function operatingSystem() {
    const ua = String(navigator.userAgent || "");
    if (/Windows/.test(ua)) return "windows";
    if (/Android/.test(ua)) return "android";
    if (/iPhone|iPad|iPod/.test(ua)) return "ios";
    if (/Mac OS X/.test(ua)) return "macos";
    if (/Linux/.test(ua)) return "linux";
    return "other";
  }

  function referrerDomain() {
    if (!document.referrer) return "direct";
    try { return cleanToken(new URL(document.referrer).hostname, "direct"); } catch { return "other"; }
  }

  function consentChoice() {
    const value = safeGet(localStorage, CONSENT_KEY);
    return value === "granted" || value === "denied" ? value : "unknown";
  }

  function doNotTrackEnabled() {
    return String(navigator.doNotTrack || globalThis.doNotTrack || "") === "1";
  }

  function trackingAllowed() {
    return consentChoice() === "granted" && !doNotTrackEnabled();
  }

  function visitorContext() {
    if (visitorCache) return visitorCache;
    let visitorId = safeGet(localStorage, VISITOR_KEY);
    let firstSeen = safeGet(localStorage, FIRST_SEEN_KEY);
    const returning = Boolean(visitorId && firstSeen);
    if (!visitorId) {
      visitorId = randomId();
      safeSet(localStorage, VISITOR_KEY, visitorId);
    }
    if (!firstSeen) {
      firstSeen = new Date().toISOString();
      safeSet(localStorage, FIRST_SEEN_KEY, firstSeen);
    }
    visitorCache = { visitorId, visitorType: returning ? "returning" : "new" };
    return visitorCache;
  }

  function storeLocal(event) {
    try {
      const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      const events = Array.isArray(existing) ? existing : [];
      events.push(event);
      if (events.length > MAX_LOCAL_EVENTS) events.splice(0, events.length - MAX_LOCAL_EVENTS);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
    } catch {
      // A telemetria nunca deve impedir o funcionamento do site.
    }
  }

  function baseContext() {
    const visitor = visitorContext();
    return {
      visitorId: visitor.visitorId,
      visitorType: visitor.visitorType,
      device: deviceKind(),
      browser: browserKind(),
      os: operatingSystem(),
      referrerDomain: referrerDomain()
    };
  }

  function track(name, detail = {}) {
    if (!trackingAllowed()) return null;
    const context = baseContext();
    const event = Object.freeze({
      schema: "aldus-usage-v2",
      version: VERSION,
      event: cleanToken(name, "event"),
      ts: new Date().toISOString(),
      visitorId: context.visitorId,
      visitorType: context.visitorType,
      sessionId: SESSION_ID,
      view: cleanToken(detail.view || currentView()),
      feature: cleanToken(detail.feature || detail.view || currentView()),
      action: cleanToken(detail.action || "observe"),
      device: context.device,
      browser: context.browser,
      os: context.os,
      referrerDomain: context.referrerDomain,
      durationSeconds: Number.isFinite(detail.durationSeconds)
        ? Math.max(0, Math.round(detail.durationSeconds))
        : null
    });

    storeLocal(event);
    pending.push(event);
    if (pending.length > MAX_PENDING_EVENTS) pending.splice(0, pending.length - MAX_PENDING_EVENTS);
    scheduleFlush();
    return event;
  }

  function postHogEvent(event) {
    const properties = {
      "$process_person_profile": false,
      "$session_id": event.sessionId,
      schema: event.schema,
      version: event.version,
      session_id: event.sessionId,
      visitor_type: event.visitorType,
      view: event.view,
      feature: event.feature,
      action: event.action,
      device: event.device,
      browser: event.browser,
      os: event.os,
      referrer_domain: event.referrerDomain
    };
    if (event.durationSeconds !== null) properties.duration_seconds = event.durationSeconds;
    return {
      event: event.event,
      distinct_id: event.visitorId,
      timestamp: event.ts,
      properties
    };
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
    if (!target || target.closest("[data-aldus-telemetry-control]")) return;
    const nav = target.closest("[data-view-link]");
    if (nav?.dataset?.viewLink) {
      track("view_open", { view: nav.dataset.viewLink, feature: nav.dataset.viewLink, action: "open" });
      return;
    }
    const view = target.closest(".app-view[data-view]")?.dataset?.view || currentView();
    track("feature_action", { view, feature: view, action: classifyAction(target) });
  }

  function onSubmit(event) {
    const form = event.target instanceof Element ? event.target.closest("form") : null;
    if (!form || form.closest("[data-aldus-telemetry-control]")) return;
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
    if (!trackingAllowed() || !endpoint || !projectToken || pending.length === 0) return false;
    const batch = pending.splice(0, pending.length);
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        mode: "cors",
        credentials: "omit",
        keepalive: true,
        referrerPolicy: "no-referrer",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ api_key: projectToken, batch: batch.map(postHogEvent) })
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
    if (!trackingAllowed() || !endpoint || !projectToken || flushTimer) return;
    flushTimer = setTimeout(async () => {
      flushTimer = null;
      await flush();
    }, FLUSH_INTERVAL_MS);
  }

  function getLocalEvents() {
    try {
      const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      return Array.isArray(value) ? value.slice() : [];
    } catch { return []; }
  }

  function clearLocalEvents() {
    safeRemove(localStorage, STORAGE_KEY);
  }

  function endSession() {
    if (!trackingStarted || sessionEnded) return;
    sessionEnded = true;
    track("session_end", {
      view: currentView(),
      feature: "session",
      action: "end",
      durationSeconds: (Date.now() - startedAt) / 1000
    });
  }

  function startTracking() {
    if (trackingStarted || !trackingAllowed()) return;
    trackingStarted = true;
    sessionEnded = false;
    lastView = currentView();
    track("session_start", { view: lastView, feature: "session", action: "start" });
    track("view_open", { view: lastView, feature: lastView, action: "open" });
    heartbeatTimer = setInterval(() => {
      track("session_heartbeat", { view: currentView(), feature: "session", action: "active" });
      void flush();
    }, HEARTBEAT_INTERVAL_MS);
  }

  function setConsent(choice) {
    if (choice !== "granted" && choice !== "denied") return false;
    safeSet(localStorage, CONSENT_KEY, choice);
    if (choice === "granted") {
      startTracking();
    } else {
      pending.splice(0, pending.length);
      clearLocalEvents();
      safeRemove(localStorage, VISITOR_KEY);
      safeRemove(localStorage, FIRST_SEEN_KEY);
      visitorCache = null;
      if (heartbeatTimer) clearInterval(heartbeatTimer);
      heartbeatTimer = null;
      trackingStarted = false;
    }
    document.getElementById("aldus-telemetry-notice")?.remove();
    return true;
  }

  function showPrivacyNotice(force = false) {
    if (!force && consentChoice() !== "unknown") return;
    document.getElementById("aldus-telemetry-notice")?.remove();
    const notice = document.createElement("section");
    notice.id = "aldus-telemetry-notice";
    notice.dataset.aldusTelemetryControl = "true";
    notice.setAttribute("role", "dialog");
    notice.setAttribute("aria-label", "Preferências de privacidade");
    notice.style.cssText = "position:fixed;left:16px;right:16px;bottom:16px;z-index:2147483646;max-width:760px;margin:auto;padding:16px;border:1px solid #5b7896;border-radius:12px;background:#071a2d;color:#fff;box-shadow:0 12px 36px rgba(0,0,0,.35);font:14px/1.45 Arial,sans-serif";
    const title = document.createElement("strong");
    title.textContent = "Estatísticas de uso e privacidade";
    const text = document.createElement("p");
    text.textContent = "Com sua permissão, o Aldus Meta registra telas e recursos usados, duração aproximada, dispositivo, navegador, sistema, origem e região aproximada. Não envia textos, questões, respostas, materiais do Drive, nome ou e-mail.";
    text.style.cssText = "margin:8px 0 12px";
    const actions = document.createElement("div");
    actions.style.cssText = "display:flex;gap:8px;flex-wrap:wrap";
    const allow = document.createElement("button");
    allow.type = "button";
    allow.textContent = "Permitir estatísticas anônimas";
    allow.style.cssText = "padding:10px 14px;border:0;border-radius:8px;background:#7dd3fc;color:#06243c;font-weight:700;cursor:pointer";
    allow.addEventListener("click", () => setConsent("granted"));
    const deny = document.createElement("button");
    deny.type = "button";
    deny.textContent = "Não permitir";
    deny.style.cssText = "padding:10px 14px;border:1px solid #91a7bd;border-radius:8px;background:transparent;color:#fff;font-weight:700;cursor:pointer";
    deny.addEventListener("click", () => setConsent("denied"));
    actions.append(allow, deny);
    notice.append(title, text, actions);
    document.body.appendChild(notice);
  }

  function installPrivacyControl() {
    if (document.getElementById("aldus-privacy-control")) return;
    const control = document.createElement("button");
    control.id = "aldus-privacy-control";
    control.dataset.aldusTelemetryControl = "true";
    control.type = "button";
    control.textContent = "Privacidade";
    control.title = "Alterar estatísticas anônimas";
    control.style.cssText = "position:fixed;left:8px;right:auto;bottom:8px;z-index:2147483645;width:auto;max-width:max-content;padding:6px 9px;border:1px solid #90a4b8;border-radius:999px;background:#071a2d;color:#fff;opacity:.78;font:12px Arial,sans-serif;cursor:pointer";
    control.addEventListener("click", () => showPrivacyNotice(true));
    document.body.appendChild(control);
  }

  function init() {
    document.addEventListener("click", onClick, { capture: true, passive: true });
    document.addEventListener("submit", onSubmit, { capture: true });
    addEventListener("hashchange", onHashChange, { passive: true });
    addEventListener("pagehide", () => { endSession(); void flush(); }, { passive: true });
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") void flush();
    });
    installPrivacyControl();
    if (trackingAllowed()) startTracking();
    else if (consentChoice() === "unknown" && !doNotTrackEnabled()) showPrivacyNotice();
  }

  const api = Object.freeze({
    version: VERSION,
    endpointConfigured: Boolean(endpoint && projectToken),
    consent: consentChoice,
    setConsent,
    showPrivacyNotice,
    track,
    flush,
    getLocalEvents,
    clearLocalEvents
  });

  globalThis.AldusUsage = api;
  globalThis.__aldusUsageTelemetryV317 = api;
  globalThis.__aldusUsageTelemetryV316 = api;
  globalThis.__aldusUsageTelemetryV315 = api;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
