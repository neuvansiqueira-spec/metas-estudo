(() => {
  "use strict";

  const VERSION = "20260805-timer-message-last-five-v242";
  const HOTFIX = "timer-message-last-five-hotfix1";
  const GLOBAL_KEY = "__ALDUS_TIMER_MESSAGE_LAST_FIVE_V242__";
  const CHOICE_HISTORY_KEY = "metasEstudoTimerMessageChoiceV239";
  const PRESENTATION_HISTORY_KEY = "metasEstudoTimerMessagePresentationV239";
  const EVENT_HISTORY_KEY = "metasEstudoTimerMessageEventV239";
  const WRAP_FLAG = "__aldusTimerMessageLastFiveV242";
  const PREVIOUS_WRAP_FLAG = "__aldusTimerMessageDedupeV239";
  const EVENT_DEDUPE_MS = 6000;
  const RECENT_WINDOW = 5;
  const RECENT_LIMIT = 12;

  if (globalThis[GLOBAL_KEY]) return;

  function canonical(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  function structuredCloneFallback(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function readJson(key, fallback) {
    try {
      const parsed = JSON.parse(localStorage.getItem(key) || "null");
      return parsed && typeof parsed === "object" ? parsed : structuredCloneFallback(fallback);
    } catch {
      return structuredCloneFallback(fallback);
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

  function messagePool(milestone) {
    try {
      const source = typeof TIMER_MOTIVATIONAL_MESSAGES !== "undefined"
        ? TIMER_MOTIVATIONAL_MESSAGES
        : globalThis.TIMER_MOTIVATIONAL_MESSAGES;
      const values = Array.isArray(source?.[milestone]) ? source[milestone] : [];
      const seen = new Set();
      return values
        .map((value) => String(value || "").trim())
        .filter((value) => {
          const key = canonical(value);
          if (!key || seen.has(key)) return false;
          seen.add(key);
          return true;
        });
    } catch {
      return [];
    }
  }

  function recentWindow(history = {}) {
    return (Array.isArray(history.recent) ? history.recent : [])
      .filter((phrase) => canonical(phrase))
      .slice(0, RECENT_WINDOW);
  }

  function phraseWasRecent(phrase, recent = []) {
    const key = canonical(phrase);
    return Boolean(key) && recent.some((item) => canonical(item) === key);
  }

  function pickAlternative(messages, lastPhrase, recent = []) {
    const lastKey = canonical(lastPhrase);
    const recentKeys = new Set(recent.slice(0, RECENT_WINDOW).map(canonical).filter(Boolean));
    return messages.find((phrase) => !recentKeys.has(canonical(phrase)))
      || messages.find((phrase) => canonical(phrase) !== lastKey)
      || messages[0]
      || "";
  }

  function remember(history, selected) {
    history.lastPhrase = selected;
    history.recent = [
      selected,
      ...(Array.isArray(history.recent) ? history.recent : [])
    ].slice(0, RECENT_LIMIT);
    return history;
  }

  function selectPhrase(milestone, proposed = "") {
    const history = readJson(CHOICE_HISTORY_KEY, { lastPhrase: "", recent: [] });
    const pool = messagePool(milestone);
    const recent = recentWindow(history);
    let selected = String(proposed || "").trim();

    if (!selected || (pool.length > 1 && phraseWasRecent(selected, recent))) {
      selected = pickAlternative(pool, history.lastPhrase, recent);
    }

    if (!selected) return "";
    writeJson(CHOICE_HISTORY_KEY, remember(history, selected));
    return selected;
  }

  function registerEvent(milestone, now = Date.now()) {
    const key = canonical(milestone);
    const history = readJson(EVENT_HISTORY_KEY, { key: "", at: 0 });
    const duplicate = Boolean(key)
      && history.key === key
      && now - Number(history.at || 0) < EVENT_DEDUPE_MS;
    if (!duplicate) writeJson(EVENT_HISTORY_KEY, { key, at: now });
    return !duplicate;
  }

  function renderedMessage() {
    if (typeof document === "undefined") return null;
    const elements = [
      document.getElementById("timerMotivationalToast"),
      document.getElementById("timerMotivationalInlineV159")
    ].filter(Boolean);
    const source = elements.find((element) => !element.hidden && element.querySelector?.("span"))
      || elements.find((element) => element.querySelector?.("span"));
    if (!source) return null;
    const title = source.querySelector("strong")?.textContent || "";
    const phrase = source.querySelector("span")?.textContent || "";
    const milestone = Number(title.match(/(\d+)\s*%/)?.[1]) || title;
    return { elements, title, phrase, milestone };
  }

  let lastRenderedSignature = "";
  let inspectionScheduled = false;

  function inspectRenderedMessage() {
    inspectionScheduled = false;
    const rendered = renderedMessage();
    if (!rendered?.phrase) return { changed: false, reason: "empty" };

    const signature = `${canonical(rendered.title)}|${canonical(rendered.phrase)}`;
    if (signature === lastRenderedSignature) return { changed: false, reason: "same-render" };

    const history = readJson(PRESENTATION_HISTORY_KEY, { lastPhrase: "", recent: [] });
    const pool = messagePool(rendered.milestone);
    const recent = recentWindow(history);
    let selected = rendered.phrase;

    if (pool.length > 1 && phraseWasRecent(selected, recent)) {
      selected = pickAlternative(pool, history.lastPhrase, recent);
    }

    if (selected && canonical(selected) !== canonical(rendered.phrase)) {
      rendered.elements.forEach((element) => {
        const span = element.querySelector?.("span");
        if (span) span.textContent = selected;
      });
    }

    if (selected) writeJson(PRESENTATION_HISTORY_KEY, remember(history, selected));

    lastRenderedSignature = `${canonical(rendered.title)}|${canonical(selected)}`;
    return {
      changed: canonical(selected) !== canonical(rendered.phrase),
      phrase: selected,
      milestone: rendered.milestone
    };
  }

  function scheduleInspection() {
    if (inspectionScheduled) return;
    inspectionScheduled = true;
    const schedule = typeof queueMicrotask === "function"
      ? queueMicrotask
      : (callback) => setTimeout(callback, 0);
    schedule(inspectRenderedMessage);
  }

  function currentPresenter() {
    try {
      if (typeof showTimerMotivationalToast === "function") return showTimerMotivationalToast;
    } catch {}
    return typeof globalThis.showTimerMotivationalToast === "function"
      ? globalThis.showTimerMotivationalToast
      : null;
  }

  function unwrapPreviousGuard(presenter) {
    let current = presenter;
    let guard = 0;
    while (
      typeof current === "function"
      && typeof current.__aldusOriginal === "function"
      && (current[PREVIOUS_WRAP_FLAG] || current[WRAP_FLAG])
      && guard < 5
    ) {
      current = current.__aldusOriginal;
      guard += 1;
    }
    return current;
  }

  function installPresenterGuard() {
    const current = currentPresenter();
    if (!current) return false;
    if (current[WRAP_FLAG]) return true;
    const original = unwrapPreviousGuard(current);

    const guarded = function showTimerMotivationalToastLastFiveV242(milestone, phrase = "") {
      const selected = selectPhrase(milestone, phrase);
      if (!registerEvent(milestone)) return false;
      return original.call(this, milestone, selected);
    };
    Object.defineProperty(guarded, WRAP_FLAG, { value: true });
    Object.defineProperty(guarded, "__aldusOriginal", { value: original });

    try {
      showTimerMotivationalToast = guarded;
    } catch {}
    globalThis.showTimerMotivationalToast = guarded;
    return true;
  }

  let observer = null;
  function installObserver() {
    if (observer || typeof document === "undefined" || typeof MutationObserver !== "function") return Boolean(observer);
    const root = document.body || document.documentElement;
    if (!root) return false;
    observer = new MutationObserver(scheduleInspection);
    observer.observe(root, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["class", "hidden"]
    });
    scheduleInspection();
    return true;
  }

  const api = {
    version: VERSION,
    hotfix: HOTFIX,
    eventDedupeMs: EVENT_DEDUPE_MS,
    recentWindow: RECENT_WINDOW,
    recentLimit: RECENT_LIMIT,
    canonical,
    messagePool,
    phraseWasRecent,
    pickAlternative,
    selectPhrase,
    registerEvent,
    inspectRenderedMessage,
    installPresenterGuard,
    installObserver,
    unwrapPreviousGuard
  };
  globalThis[GLOBAL_KEY] = Object.freeze(api);

  if (typeof document === "undefined") return;

  let attempts = 0;
  const install = () => {
    attempts += 1;
    installPresenterGuard();
    installObserver();
    if (attempts >= 200 || currentPresenter()?.[WRAP_FLAG]) clearInterval(timer);
  };
  const timer = setInterval(install, 100);
  install();
})();