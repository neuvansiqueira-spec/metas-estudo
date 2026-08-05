(() => {
  "use strict";

  const VERSION = "20260805-timer-message-dedupe-v239";
  const HOTFIX = "timer-message-dedupe-hotfix1";
  const GLOBAL_KEY = "__ALDUS_TIMER_MESSAGE_DEDUPE_V239__";
  const CHOICE_HISTORY_KEY = "metasEstudoTimerMessageChoiceV239";
  const PRESENTATION_HISTORY_KEY = "metasEstudoTimerMessagePresentationV239";
  const EVENT_HISTORY_KEY = "metasEstudoTimerMessageEventV239";
  const WRAP_FLAG = "__aldusTimerMessageDedupeV239";
  const EVENT_DEDUPE_MS = 6000;
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

  function pickAlternative(messages, lastPhrase, recent = []) {
    const lastKey = canonical(lastPhrase);
    const recentKeys = new Set(recent.map(canonical).filter(Boolean));
    return messages.find((phrase) => canonical(phrase) !== lastKey && !recentKeys.has(canonical(phrase)))
      || messages.find((phrase) => canonical(phrase) !== lastKey)
      || messages[0]
      || "";
  }

  function selectPhrase(milestone, proposed = "") {
    const history = readJson(CHOICE_HISTORY_KEY, { lastPhrase: "", recent: [] });
    const pool = messagePool(milestone);
    let selected = String(proposed || "").trim();

    if (!selected) {
      selected = pickAlternative(pool, history.lastPhrase, history.recent);
    } else if (pool.length > 1 && canonical(selected) === canonical(history.lastPhrase)) {
      selected = pickAlternative(pool, history.lastPhrase, history.recent);
    }

    if (!selected) return "";

    history.lastPhrase = selected;
    history.recent = [
      selected,
      ...(Array.isArray(history.recent) ? history.recent : [])
        .filter((phrase) => canonical(phrase) !== canonical(selected))
    ].slice(0, RECENT_LIMIT);
    writeJson(CHOICE_HISTORY_KEY, history);
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
    let selected = rendered.phrase;

    if (pool.length > 1 && canonical(selected) === canonical(history.lastPhrase)) {
      selected = pickAlternative(pool, history.lastPhrase, history.recent);
    }

    if (selected && canonical(selected) !== canonical(rendered.phrase)) {
      rendered.elements.forEach((element) => {
        const span = element.querySelector?.("span");
        if (span) span.textContent = selected;
      });
    }

    if (selected) {
      history.lastPhrase = selected;
      history.recent = [
        selected,
        ...(Array.isArray(history.recent) ? history.recent : [])
          .filter((phrase) => canonical(phrase) !== canonical(selected))
      ].slice(0, RECENT_LIMIT);
      writeJson(PRESENTATION_HISTORY_KEY, history);
    }

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

  function installPresenterGuard() {
    const original = currentPresenter();
    if (!original) return false;
    if (original[WRAP_FLAG]) return true;

    const guarded = function showTimerMotivationalToastDedupeV239(milestone, phrase = "") {
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
    recentLimit: RECENT_LIMIT,
    canonical,
    messagePool,
    pickAlternative,
    selectPhrase,
    registerEvent,
    inspectRenderedMessage,
    installPresenterGuard,
    installObserver
  };
  globalThis[GLOBAL_KEY] = Object.freeze(api);

  if (typeof document === "undefined") return;

  let attempts = 0;
  const install = () => {
    attempts += 1;
    installPresenterGuard();
    installObserver();
    if (attempts >= 200 || (globalThis.__aldusTimerMotivationV159 && currentPresenter()?.[WRAP_FLAG])) {
      clearInterval(timer);
    }
  };
  const timer = setInterval(install, 100);
  install();
})();