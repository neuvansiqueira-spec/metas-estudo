/* Aldus V361: Cronograma da Fábrica incremental e fora do hot path */
(() => {
  "use strict";

  const VERSION = "20260819-factory-schedule-incremental-v361";
  const FLAG = "__ALDUS_FACTORY_SCHEDULE_PERFORMANCE_V361__";
  const LEGACY_FILTER_FLAG = "__ALDUS_FACTORY_SCHEDULE_FILTERS_V280__";
  const LEGACY_DATES_FLAG = "__ALDUS_FACTORY_SCHEDULE_DATES_V281__";
  const PAGE_SIZE = 20;

  if (globalThis[FLAG]?.version === VERSION) return;

  // V361 assume estes dois complementos antes que sejam executados. O escopo-base V277 permanece intacto.
  // Assim evitamos o horizonte síncrono de até 366 dias da V280 e a observação global da V281.
  if (!globalThis[LEGACY_FILTER_FLAG]) {
    globalThis[LEGACY_FILTER_FLAG] = Object.freeze({ version: VERSION, supersededByV361: true });
  }
  if (!globalThis[LEGACY_DATES_FLAG]) {
    globalThis[LEGACY_DATES_FLAG] = Object.freeze({ version: VERSION, supersededByV361: true });
  }

  let installed = false;
  let originalQueue = null;
  let originalRender = null;
  let sessionActive = false;
  let visibleLimit = PAGE_SIZE;
  let queueCalls = 0;
  let skippedQueueCalls = 0;
  let hasMorePotential = false;
  let dateCache = new Map();
  let metadataById = new Map();
  let goalsByDate = new Map();
  let agendaIndexSource = null;
  let agendaBySyllabusId = new Map();
  let selectedDate = "";
  let selectedDiscipline = "";
  let selectedTheme = "";
  let searchText = "";

  const canonical = (value) => String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/\s+/g, " ")
    .trim();

  const escapeHtml = (value) => String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

  function currentState() {
    try { return typeof state === "object" && state ? state : globalThis.state; }
    catch { return globalThis.state || null; }
  }

  function scheduleActive() {
    try { return factoryProductionScope === "schedule"; }
    catch { return false; }
  }

  function goalDate(goal = {}) {
    try {
      if (typeof goalDateValue === "function") return String(goalDateValue(goal) || "").slice(0, 10);
    } catch {}
    return String(goal.date || goal.data || "").slice(0, 10);
  }

  function isStudyGoal(goal = {}) {
    try { return typeof isPlanningStudyGoal !== "function" || isPlanningStudyGoal(goal); }
    catch { return true; }
  }

  function entryId(entry = {}) {
    return String(entry?.item?.id || entry?.id || "");
  }

  function disciplineOf(entry = {}) {
    return String(
      entry?.item?.editalLink?.discipline
      || entry?.item?.disciplina
      || entry?.item?.discipline
      || ""
    ).trim();
  }

  function themeOf(entry = {}) {
    return String(
      entry?.item?.editalLink?.subject
      || entry?.item?.tema
      || entry?.item?.subject
      || entry?.item?.assunto
      || ""
    ).trim();
  }

  function formatDate(date) {
    try { if (typeof formatDateBR === "function") return formatDateBR(date); } catch {}
    const [year, month, day] = String(date || "").split("-");
    return year && month && day ? `${day}/${month}/${year}` : String(date || "");
  }

  function rebuildGoalsIndex() {
    goalsByDate = new Map();
    const targetState = currentState();
    (Array.isArray(targetState?.dailyGoals) ? targetState.dailyGoals : []).forEach((goal) => {
      const date = goalDate(goal);
      if (!date || !isStudyGoal(goal)) return;
      const list = goalsByDate.get(date) || [];
      list.push(goal);
      goalsByDate.set(date, list);
    });
  }

  function resetSession({ keepFilters = true } = {}) {
    sessionActive = false;
    visibleLimit = PAGE_SIZE;
    queueCalls = 0;
    skippedQueueCalls = 0;
    hasMorePotential = false;
    dateCache = new Map();
    metadataById = new Map();
    goalsByDate = new Map();
    agendaIndexSource = null;
    agendaBySyllabusId = new Map();
    if (!keepFilters) selectedDate = selectedDiscipline = selectedTheme = searchText = "";
  }

  function startSession() {
    if (sessionActive) return;
    sessionActive = true;
    rebuildGoalsIndex();
  }

  function buildAgendaIndex(agenda) {
    if (!Array.isArray(agenda)) return;
    if (agendaIndexSource === agenda) return;
    agendaIndexSource = agenda;
    agendaBySyllabusId = new Map();
    agenda.forEach((item) => {
      const ids = item?.editalLink?.itemIds;
      if (!Array.isArray(ids)) return;
      ids.forEach((id) => {
        const key = String(id || "");
        if (!key) return;
        const list = agendaBySyllabusId.get(key) || [];
        list.push(item);
        agendaBySyllabusId.set(key, list);
      });
    });
  }

  // Reduz a agenda apenas quando todos os goals do dia têm vínculo exato coberto.
  // Se existir qualquer dúvida, devolve a agenda completa e preserva o fallback semântico legado.
  function narrowAgendaForDate(date, agenda) {
    if (!Array.isArray(agenda) || !agenda.length) return agenda;
    const dayGoals = goalsByDate.get(String(date || "").slice(0, 10)) || [];
    if (!dayGoals.length) return agenda;
    const ids = dayGoals.map((goal) => String(goal.syllabusItemId || goal.syllabus_item_id || "")).filter(Boolean);
    if (ids.length !== dayGoals.length) return agenda;

    buildAgendaIndex(agenda);
    const candidates = [];
    const seen = new Set();
    for (const id of ids) {
      const matches = agendaBySyllabusId.get(id);
      if (!matches?.length) return agenda;
      matches.forEach((item) => {
        if (seen.has(item)) return;
        seen.add(item);
        candidates.push(item);
      });
    }
    return candidates.length ? candidates : agenda;
  }

  function pendingEntries(entries) {
    return (Array.isArray(entries) ? entries : []).filter((entry) => {
      try { return typeof factoryResumoAulaPending !== "function" || factoryResumoAulaPending(entry); }
      catch { return true; }
    });
  }

  function rememberEntry(entry, date) {
    const id = entryId(entry);
    if (!id) return;
    const current = metadataById.get(id) || {
      id,
      entry,
      dates: [],
      discipline: disciplineOf(entry),
      theme: themeOf(entry)
    };
    if (date && !current.dates.includes(date)) current.dates.push(date);
    metadataById.set(id, current);
  }

  function limitedQueueForDate(date, agenda) {
    const key = String(date || "").slice(0, 10);
    if (dateCache.has(key)) return dateCache.get(key);
    if (metadataById.size >= visibleLimit) {
      hasMorePotential = true;
      skippedQueueCalls += 1;
      return [];
    }

    const narrowed = narrowAgendaForDate(key, agenda);
    queueCalls += 1;
    const source = pendingEntries(originalQueue(key, narrowed) || []);
    const output = [];

    for (const entry of source) {
      const id = entryId(entry);
      if (!id) continue;
      if (!metadataById.has(id) && metadataById.size >= visibleLimit) {
        hasMorePotential = true;
        continue;
      }
      rememberEntry(entry, key);
      output.push(entry);
    }

    dateCache.set(key, output);
    return output;
  }

  function loadedMetadata() {
    const values = [...metadataById.values()];
    return {
      values,
      dates: [...new Set(values.flatMap((item) => item.dates))].sort(),
      disciplines: [...new Set(values.map((item) => item.discipline).filter(Boolean))].sort((a, b) => a.localeCompare(b, "pt-BR")),
      themes: [...new Set(values.map((item) => item.theme).filter(Boolean))].sort((a, b) => a.localeCompare(b, "pt-BR"))
    };
  }

  function options(values, selected, allLabel, formatter = (value) => value) {
    return `<option value="">${escapeHtml(allLabel)}</option>`
      + values.map((value) => `<option value="${escapeHtml(value)}"${value === selected ? " selected" : ""}>${escapeHtml(formatter(value))}</option>`).join("");
  }

  function annotateVisible(root) {
    root.querySelectorAll?.(".factory-today-queue li").forEach((node) => {
      const id = String(node.querySelector?.("[data-factory-toggle-detail]")?.dataset?.factoryToggleDetail || "");
      const meta = metadataById.get(id);
      if (!meta) return;
      node.dataset.scheduleDates = meta.dates.join(",");
      node.dataset.scheduleDiscipline = meta.discipline;
      node.dataset.scheduleTheme = meta.theme;
    });
    root.querySelectorAll?.("article.factory-card").forEach((node) => {
      const id = String(node.dataset?.factoryCard || "");
      const meta = metadataById.get(id);
      if (!meta) return;
      node.dataset.scheduleDates = meta.dates.join(",");
      node.dataset.scheduleDiscipline = meta.discipline;
      node.dataset.scheduleTheme = meta.theme;
    });
  }

  function nodeMatches(node) {
    const dates = String(node.dataset?.scheduleDates || "").split(",").filter(Boolean);
    if (selectedDate && !dates.includes(selectedDate)) return false;
    if (selectedDiscipline && canonical(node.dataset?.scheduleDiscipline) !== canonical(selectedDiscipline)) return false;
    if (selectedTheme && canonical(node.dataset?.scheduleTheme) !== canonical(selectedTheme)) return false;
    if (searchText && !canonical(node.textContent).includes(canonical(searchText))) return false;
    return true;
  }

  function applyFilters(root) {
    const nodes = root.querySelectorAll?.(".factory-today-plan article.factory-card,.factory-today-queue li,.factory-section article.factory-card") || [];
    nodes.forEach((node) => { node.hidden = !nodeMatches(node); });
    const items = [...(root.querySelectorAll?.(".factory-today-queue ol > li") || [])];
    const visible = items.filter((item) => !item.hidden).length;
    const count = root.querySelector?.(".factory-today-queue summary small");
    if (count) count.textContent = String(visible);
  }

  function showMore() {
    if (!scheduleActive()) return false;
    visibleLimit += PAGE_SIZE;
    hasMorePotential = false;
    renderFactory();
    return true;
  }

  function renderTools(root) {
    root.querySelector?.(":scope > .factory-schedule-tools-v277")?.remove();
    root.querySelector?.(":scope > .factory-schedule-filters-v280")?.remove();
    root.querySelector?.(":scope > .factory-schedule-performance-v361")?.remove();

    const meta = loadedMetadata();
    const box = document.createElement("section");
    box.className = "factory-schedule-performance-v361 notice";
    box.innerHTML = `
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px;align-items:end">
        <label><strong>Data</strong><select data-v361-date>${options(meta.dates, selectedDate, "Datas carregadas", formatDate)}</select></label>
        <label><strong>Disciplina</strong><select data-v361-discipline>${options(meta.disciplines, selectedDiscipline, "Todas as disciplinas")}</select></label>
        <label><strong>Tema</strong><select data-v361-theme>${options(meta.themes, selectedTheme, "Todos os temas")}</select></label>
        <label><strong>Busca livre</strong><input data-v361-search type="search" placeholder="Disciplina, assunto ou tema" value="${escapeHtml(searchText)}"></label>
      </div>
      <div class="card-actions" style="margin-top:10px">
        <button type="button" class="secondary-button" data-v361-clear>Limpar filtros</button>
        ${hasMorePotential ? `<button type="button" class="secondary-button" data-v361-more>Mostrar mais ${PAGE_SIZE}</button>` : ""}
      </div>
      <small data-v361-status>Mostrando até ${visibleLimit} temas. Cálculo incremental: ${queueCalls} data(s) processada(s)${skippedQueueCalls ? `; ${skippedQueueCalls} adiada(s)` : ""}.</small>`;
    root.prepend(box);

    box.querySelector?.("[data-v361-date]")?.addEventListener("change", (event) => { selectedDate = event.target.value || ""; applyFilters(root); });
    box.querySelector?.("[data-v361-discipline]")?.addEventListener("change", (event) => { selectedDiscipline = event.target.value || ""; applyFilters(root); });
    box.querySelector?.("[data-v361-theme]")?.addEventListener("change", (event) => { selectedTheme = event.target.value || ""; applyFilters(root); });
    box.querySelector?.("[data-v361-search]")?.addEventListener("input", (event) => { searchText = event.target.value || ""; applyFilters(root); });
    box.querySelector?.("[data-v361-clear]")?.addEventListener("click", () => {
      selectedDate = selectedDiscipline = selectedTheme = searchText = "";
      applyFilters(root);
      renderTools(root);
    });
    box.querySelector?.("[data-v361-more]")?.addEventListener("click", () => showMore());
  }

  function enhanceSchedule() {
    if (!scheduleActive()) return;
    const root = document.getElementById?.("factoryList");
    if (!root) return;
    annotateVisible(root);
    renderTools(root);
    applyFilters(root);
    const notice = root.querySelector?.(".factory-scope-notice");
    const meta = loadedMetadata();
    if (notice && meta.dates.length) {
      notice.textContent = `Cronograma carregado progressivamente: ${formatDate(meta.dates[0])} a ${formatDate(meta.dates.at(-1))}. Mostrando até ${visibleLimit} temas por vez para preservar a performance.`;
    }
  }

  function scheduleEnhance() {
    const run = () => enhanceSchedule();
    if (typeof requestAnimationFrame === "function") requestAnimationFrame(run);
    else queueMicrotask(run);
  }

  function invalidateBeforeMutation(event) {
    if (!scheduleActive()) return;
    const button = event.target?.closest?.("#factoryList button");
    if (!button) return;
    if (button.closest?.(".factory-schedule-performance-v361")) return;
    if (button.matches?.("[data-factory-toggle-detail]")) return;
    resetSession({ keepFilters: true });
  }

  function install() {
    if (installed) return true;
    if (
      typeof renderFactory !== "function"
      || typeof factoryQueueForDate !== "function"
      || typeof ensureFactoryAgenda !== "function"
      || !globalThis.__ALDUS_FACTORY_SCHEDULE_SCOPE_V277__
    ) return false;

    originalQueue = factoryQueueForDate;
    originalRender = renderFactory;

    factoryQueueForDate = function factoryQueueForDateV361(date, agenda = ensureFactoryAgenda()) {
      if (!scheduleActive()) return originalQueue.apply(this, arguments);
      startSession();
      return limitedQueueForDate(date, agenda);
    };

    renderFactory = function renderFactoryV361(...args) {
      if (!scheduleActive()) {
        if (sessionActive) resetSession({ keepFilters: true });
        return originalRender.apply(this, args);
      }
      startSession();
      hasMorePotential = false;
      skippedQueueCalls = 0;
      const result = originalRender.apply(this, args);
      scheduleEnhance();
      return result;
    };

    document.addEventListener?.("click", invalidateBeforeMutation, true);
    installed = true;
    globalThis[FLAG] = Object.freeze({
      version: VERSION,
      pageSize: PAGE_SIZE,
      installedAt: new Date().toISOString(),
      showMore,
      resetSession,
      narrowAgendaForDate,
      getSession: () => Object.freeze({
        active: sessionActive,
        visibleLimit,
        loadedThemes: metadataById.size,
        cachedDates: dateCache.size,
        queueCalls,
        skippedQueueCalls,
        hasMorePotential
      })
    });
    if (scheduleActive()) renderFactory();
    return true;
  }

  function installWhenReady() {
    if (install()) return;
    // Sem polling: o evento load ocorre depois dos módulos V277/V280/V281 injetados pelo Service Worker.
    if (typeof window !== "undefined" && document.readyState !== "complete") {
      window.addEventListener("load", install, { once: true });
    }
  }

  installWhenReady();
  if (!installed && typeof window !== "undefined") {
    window.addEventListener("aldus:bootstrap-ready", () => queueMicrotask(install), { once: true });
  }
})();
