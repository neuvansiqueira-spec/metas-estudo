(() => {
  "use strict";

  const VERSION = "20260808-factory-schedule-scope-v277";
  const FLAG = "__ALDUS_FACTORY_SCHEDULE_SCOPE_V277__";
  let scheduleSearch = "";
  let installed = false;

  const canonical = (value) => String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/\s+/g, " ")
    .trim();

  function currentState() {
    try { return typeof state === "object" && state ? state : globalThis.state; }
    catch { return globalThis.state || null; }
  }

  function isoToday() {
    try { if (typeof todayISO === "function") return todayISO(); } catch {}
    const now = new Date();
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 10);
  }

  function goalDate(goal = {}) {
    try {
      if (typeof goalDateValue === "function") {
        const value = goalDateValue(goal);
        if (value) return String(value).slice(0, 10);
      }
    } catch {}
    return String(goal.date || goal.data || goal.scheduledDate || goal.dataPlanejada || "").slice(0, 10);
  }

  function scheduleDates() {
    const targetState = currentState();
    const today = isoToday();
    const dates = new Set();
    (Array.isArray(targetState?.dailyGoals) ? targetState.dailyGoals : []).forEach((goal) => {
      const date = goalDate(goal);
      if (date && date >= today) dates.add(date);
    });
    return [...dates].sort();
  }

  function scheduleQueue(agenda, dates = scheduleDates()) {
    const activeAgenda = (Array.isArray(agenda) ? agenda : []).filter((item) => item?.editalActive !== false);
    const seen = new Set();
    const queue = [];
    dates.forEach((date) => {
      let entries = [];
      try { entries = typeof factoryQueueForDate === "function" ? factoryQueueForDate(date, activeAgenda) : []; }
      catch (error) { console.warn(`[${VERSION}] Falha ao ler a fila de ${date}.`, error); }
      (Array.isArray(entries) ? entries : []).forEach((entry) => {
        const id = String(entry?.item?.id || entry?.id || "");
        if (!id || seen.has(id)) return;
        try {
          if (typeof factoryResumoAulaPending === "function" && !factoryResumoAulaPending(entry)) return;
        } catch {}
        seen.add(id);
        queue.push({ ...entry, sourceDate: date });
      });
    });
    return queue;
  }

  function ensureTab() {
    const tabs = document.querySelector("#view-fabrica-resumos .factory-production-tabs, .factory-production-tabs");
    if (!tabs) return null;
    let button = tabs.querySelector('[data-production-scope="schedule"]');
    if (!button) {
      button = document.createElement("button");
      button.type = "button";
      button.className = "secondary-button";
      button.dataset.productionScope = "schedule";
      button.textContent = "Cronograma";
      button.setAttribute("aria-pressed", "false");
      tabs.appendChild(button);
    }
    return button;
  }

  function replaceText(root, from, to) {
    if (!root) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      if (node.nodeValue?.includes(from)) node.nodeValue = node.nodeValue.replaceAll(from, to);
    }
  }

  function formatDate(value) {
    try { if (typeof formatDateBR === "function") return formatDateBR(value); } catch {}
    const [year, month, day] = String(value || "").split("-");
    return year && month && day ? `${day}/${month}/${year}` : String(value || "");
  }

  function applySearch(root = document.getElementById("factoryList")) {
    if (!root) return;
    const term = canonical(scheduleSearch);
    const selectors = [
      ".factory-today-plan article.factory-card",
      ".factory-today-queue li",
      ".factory-section article.factory-card"
    ].join(",");
    root.querySelectorAll(selectors).forEach((node) => {
      if (!term) {
        node.hidden = false;
        return;
      }
      node.hidden = !canonical(node.textContent).includes(term);
    });
  }

  function ensureSearch(root) {
    if (!root) return;
    let tools = root.querySelector(":scope > .factory-schedule-tools-v277");
    if (!tools) {
      tools = document.createElement("div");
      tools.className = "factory-schedule-tools-v277";
      tools.innerHTML = `
        <label style="display:grid;gap:6px;margin:0 0 10px;">
          <span style="font-weight:700;">Buscar no cronograma</span>
          <input type="search" data-factory-schedule-search-v277 placeholder="Disciplina, assunto ou tema" autocomplete="off" />
        </label>`;
      root.prepend(tools);
      const input = tools.querySelector("[data-factory-schedule-search-v277]");
      input?.addEventListener("input", (event) => {
        scheduleSearch = event.target.value || "";
        applySearch(root);
      });
    }
    const input = tools.querySelector("[data-factory-schedule-search-v277]");
    if (input && input.value !== scheduleSearch) input.value = scheduleSearch;
  }

  function decorateSchedule(dates) {
    const root = document.getElementById("factoryList");
    ensureTab();
    document.querySelectorAll("[data-production-scope]").forEach((button) => {
      const active = button.dataset.productionScope === "schedule";
      button.classList.toggle("active", active);
      button.classList.toggle("secondary-button", !active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
    });
    if (!root) return;

    ensureSearch(root);
    replaceText(root, "MATERIAIS DAS METAS PENDENTES — SEMANA", "MATERIAIS DAS METAS PENDENTES — CRONOGRAMA");
    replaceText(root, "Fila da semana", "Fila do cronograma");
    replaceText(root, "Nenhum resumo/aula pendente de hoje ou de dias anteriores.", "Nenhum resumo/aula pendente no cronograma.");

    const notice = root.querySelector(".factory-scope-notice");
    if (notice) {
      notice.textContent = dates.length
        ? `Cronograma: temas programados de ${formatDate(dates[0])} a ${formatDate(dates.at(-1))}. Produzir material aqui não altera a data nem o status da meta.`
        : "Cronograma: não há metas programadas de hoje em diante. Produzir material aqui não altera datas nem status de estudo.";
    }
    applySearch(root);
  }

  function install() {
    if (installed) return true;
    if (typeof document === "undefined") return false;
    if (
      typeof renderFactory !== "function"
      || typeof ensureFactoryAgenda !== "function"
      || typeof factoryQueueForDate !== "function"
      || typeof daysBetween !== "function"
      || typeof factoryWeeklyQueue !== "function"
      || typeof factoryProductionQueue !== "function"
    ) return false;

    const originalRenderFactory = renderFactory;
    const originalProductionQueue = factoryProductionQueue;

    factoryProductionQueue = function factoryProductionQueueV277(agenda = ensureFactoryAgenda()) {
      try {
        if (factoryProductionScope === "schedule") return scheduleQueue(agenda);
      } catch {}
      return originalProductionQueue.apply(this, arguments);
    };

    renderFactory = function renderFactoryV277(...args) {
      let scheduleMode = false;
      try { scheduleMode = factoryProductionScope === "schedule"; } catch {}
      if (!scheduleMode) {
        const result = originalRenderFactory.apply(this, args);
        ensureTab();
        return result;
      }

      const dates = scheduleDates();
      const effectiveDates = dates.length ? dates : [isoToday()];
      const previousScope = factoryProductionScope;
      const originalDaysBetween = daysBetween;
      const originalWeeklyQueue = factoryWeeklyQueue;
      try {
        factoryProductionScope = "week";
        daysBetween = function daysBetweenScheduleV277(start, count) {
          if (String(start || "") === isoToday() && Number(count) === 7) return [...effectiveDates];
          return originalDaysBetween.apply(this, arguments);
        };
        factoryWeeklyQueue = function factoryWeeklyQueueScheduleV277(agenda = ensureFactoryAgenda()) {
          return scheduleQueue(agenda, dates);
        };
        return originalRenderFactory.apply(this, args);
      } finally {
        daysBetween = originalDaysBetween;
        factoryWeeklyQueue = originalWeeklyQueue;
        factoryProductionScope = previousScope;
        decorateSchedule(dates);
      }
    };

    document.addEventListener("click", (event) => {
      const button = event.target.closest?.('[data-production-scope="schedule"]');
      if (!button) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      try {
        factoryProductionScope = "schedule";
        factoryCurrentFilter = "faca-agora";
        factoryOpenDetailId = "";
        factoryVisibleCount = 20;
        renderFactory();
      } catch (error) {
        console.error(`[${VERSION}] Não foi possível abrir o escopo Cronograma.`, error);
      }
    }, true);

    ensureTab();
    installed = true;
    globalThis[FLAG] = Object.freeze({
      version: VERSION,
      scheduleDates,
      scheduleQueue,
      installedAt: new Date().toISOString()
    });
    return true;
  }

  if (!install()) {
    const timer = window.setInterval(() => {
      if (install()) window.clearInterval(timer);
    }, 120);
    window.setTimeout(() => window.clearInterval(timer), 15000);
  }
})();
