(() => {
  "use strict";
  if (globalThis.__aldusQuestionBankFiltersV224) return;
  globalThis.__aldusQuestionBankFiltersV224 = true;

  const VERSION = "20260803-filtros-treino-completos-v224";
  const EXTRA_FILTERS = [
    { id: "qbFilterAgencyV224", label: "Órgão", empty: "Todos", keys: ["orgao", "órgão", "agency", "instituicao", "instituição"] },
    { id: "qbFilterRoleV224", label: "Cargo", empty: "Todos", keys: ["cargo", "job", "funcao", "função"] },
    { id: "qbFilterTypeV224", label: "Tipo", empty: "Todos", keys: ["tipo", "type"] },
    { id: "qbFilterKeyStatusV224", label: "Gabarito", empty: "Todos", virtual: true }
  ];
  const FILTER_ORDER = ["discipline", "subject", "theme", "board", "year", "agency", "role", "type", "keyStatus"];

  const byId = (id) => document.getElementById(id);
  const text = (value) => String(value ?? "").trim();
  const canon = (value) => typeof canonical === "function"
    ? canonical(value)
    : text(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const unique = (values) => [...new Map(values.filter(Boolean).map((value) => [canon(value), text(value)])).values()]
    .sort((a, b) => a.localeCompare(b, "pt-BR", { numeric: true }));
  const safePartial = (a, b) => {
    if (!text(a) || !text(b)) return false;
    if (typeof qbSafePartialMatch === "function") return qbSafePartialMatch(a, b);
    const x = canon(a), y = canon(b);
    return x === y || (Math.min(x.length, y.length) >= 4 && (x.includes(y) || y.includes(x)));
  };

  function questionValue(question, keys) {
    for (const key of keys) {
      const value = text(question?.[key]);
      if (value) return value;
    }
    return "";
  }

  function questionDiscipline(question) {
    return questionValue(question, ["disciplina", "discipline"]);
  }
  function questionSubject(question) {
    return questionValue(question, ["assunto", "subject", "topico", "tópico", "topic"]);
  }
  function questionTheme(question) {
    return questionValue(question, ["tema", "theme", "subtema", "subtopic", "subassunto"]);
  }
  function questionBoard(question) {
    return questionValue(question, ["banca", "board"]);
  }
  function questionYear(question) {
    return questionValue(question, ["ano", "year"]);
  }
  function questionAgency(question) {
    return questionValue(question, EXTRA_FILTERS[0].keys);
  }
  function questionRole(question) {
    return questionValue(question, EXTRA_FILTERS[1].keys);
  }
  function questionType(question) {
    const raw = questionValue(question, EXTRA_FILTERS[2].keys);
    if (raw) return raw;
    return typeof qbIsMultipleChoice === "function" && qbIsMultipleChoice(question) ? "Múltipla escolha" : "Certo/Errado";
  }
  function questionKeyStatus(question) {
    return typeof qbHasKey === "function" && qbHasKey(question) ? "with" : "without";
  }

  function itemDiscipline(item) {
    return text(item?.discipline || item?.disciplina || "Sem disciplina");
  }
  function itemTexts(item) {
    const values = typeof qbItemTexts === "function"
      ? qbItemTexts(item)
      : [item?.subject, item?.assunto, item?.topic, item?.topico, item?.subtopic, item?.subassunto];
    return unique(values.map(text));
  }
  function itemSubject(item) {
    return text(item?.subject || item?.assunto || item?.topic || item?.topico || item?.subtopic || item?.subassunto);
  }
  function itemThemes(item) {
    const primary = canon(itemSubject(item));
    return unique([item?.topic, item?.topico, item?.subtopic, item?.subassunto]
      .map(text)
      .filter((value) => value && canon(value) !== primary));
  }

  function scopeValue() {
    return elements.qbTrainingScope?.value || "all";
  }
  function reviewValue() {
    return elements.qbReviewType?.value || "wrong";
  }
  function syllabusCatalogItems() {
    if (scopeValue() === "syllabus") return typeof qbActiveSyllabusItems === "function" ? qbActiveSyllabusItems() : [];
    if (scopeValue() === "review" && ["weak", "unseen", "week"].includes(reviewValue())) {
      return typeof qbReviewSyllabusItems === "function" ? qbReviewSyllabusItems(reviewValue()) : [];
    }
    return [];
  }
  function usesSyllabusCatalog() {
    return syllabusCatalogItems().length > 0;
  }

  function ensureStyles() {
    if (byId("qbFilterStylesV224")) return;
    const style = document.createElement("style");
    style.id = "qbFilterStylesV224";
    style.textContent = `
      .qb-filter-coverage-v224{display:flex;flex-wrap:wrap;gap:8px 14px;align-items:center;margin-top:12px;padding:12px 14px;border:1px solid var(--border,#dbe4f0);border-radius:14px;background:rgba(37,99,235,.05)}
      .qb-filter-coverage-v224 strong{font-size:.95rem}.qb-filter-coverage-v224 span{font-size:.82rem;opacity:.84}
      .qb-filter-grid [data-qb-extra-filter-v224]{min-width:0}
      #qbClearFiltersV224{white-space:nowrap}
      html[data-aldus-theme="premium-stable"] .qb-filter-coverage-v224{border-color:rgba(104,173,220,.34);background:rgba(10,54,86,.72)}
      @media(max-width:720px){.qb-filter-coverage-v224{align-items:flex-start;flex-direction:column}.qb-training-actions #qbClearFiltersV224{order:4;width:100%}}
    `;
    document.head.appendChild(style);
  }

  function ensureExtraControls() {
    ensureStyles();
    const year = elements.qbFilterYear || byId("qbFilterYear");
    const grid = year?.closest(".qb-filter-grid");
    if (!grid) return;

    let anchor = year.closest("label");
    EXTRA_FILTERS.forEach((config) => {
      if (byId(config.id)) {
        anchor = byId(config.id).closest("label") || anchor;
        return;
      }
      const label = document.createElement("label");
      label.dataset.qbExtraFilterV224 = config.id;
      const options = config.virtual
        ? `<option value="">${config.empty}</option><option value="with">Com gabarito</option><option value="without">Sem gabarito</option>`
        : `<option value="">${config.empty}</option>`;
      label.innerHTML = `${config.label}<select id="${config.id}">${options}</select>`;
      anchor.insertAdjacentElement("afterend", label);
      anchor = label;
    });

    const actions = grid.parentElement?.querySelector(".qb-training-actions");
    if (actions && !byId("qbClearFiltersV224")) {
      const button = document.createElement("button");
      button.id = "qbClearFiltersV224";
      button.type = "button";
      button.className = "secondary-button";
      button.textContent = "Limpar filtros";
      actions.appendChild(button);
    }

    if (!byId("qbFilterCoverageV224")) {
      const coverage = document.createElement("div");
      coverage.id = "qbFilterCoverageV224";
      coverage.className = "qb-filter-coverage-v224";
      coverage.setAttribute("aria-live", "polite");
      actions?.insertAdjacentElement("afterend", coverage);
    }
  }

  function filterElements() {
    return {
      discipline: elements.qbFilterDiscipline,
      subject: elements.qbFilterSubject,
      theme: elements.qbFilterTheme,
      board: elements.qbFilterBoard,
      year: elements.qbFilterYear,
      agency: byId("qbFilterAgencyV224"),
      role: byId("qbFilterRoleV224"),
      type: byId("qbFilterTypeV224"),
      keyStatus: byId("qbFilterKeyStatusV224")
    };
  }

  function currentFilters() {
    const controls = filterElements();
    return Object.fromEntries(FILTER_ORDER.map((key) => [key, text(controls[key]?.value)]));
  }

  function syllabusItemsFor(discipline, subject = "", theme = "") {
    return syllabusCatalogItems().filter((item) => {
      if (discipline && !safePartial(itemDiscipline(item), discipline)) return false;
      const texts = itemTexts(item);
      if (subject && !texts.some((value) => safePartial(value, subject))) return false;
      if (theme) {
        const themes = itemThemes(item);
        if (![...texts, ...themes].some((value) => safePartial(value, theme))) return false;
      }
      return true;
    });
  }

  function matchesDiscipline(question, value) {
    if (!value) return true;
    if (usesSyllabusCatalog() && typeof qbQuestionMatchesSyllabusDiscipline === "function") {
      return qbQuestionMatchesSyllabusDiscipline(question, value);
    }
    return safePartial(questionDiscipline(question), value);
  }

  function matchesSubject(question, discipline, value) {
    if (!value) return true;
    if (usesSyllabusCatalog()) {
      const items = syllabusItemsFor(discipline, value);
      if (items.length && typeof qbMatchesSyllabusItem === "function") {
        return items.some((item) => qbMatchesSyllabusItem(question, item));
      }
    }
    return [questionSubject(question), questionTheme(question)].some((candidate) => safePartial(candidate, value));
  }

  function matchesTheme(question, discipline, subject, value) {
    if (!value) return true;
    if (usesSyllabusCatalog()) {
      const items = syllabusItemsFor(discipline, subject, value);
      if (items.length && typeof qbMatchesSyllabusItem === "function") {
        return items.some((item) => qbMatchesSyllabusItem(question, item));
      }
    }
    return [questionTheme(question), questionSubject(question)].some((candidate) => safePartial(candidate, value));
  }

  function exactMatch(candidate, selected) {
    return !selected || canon(candidate) === canon(selected);
  }

  function passes(question, filters, ignored = new Set()) {
    if (!ignored.has("discipline") && !matchesDiscipline(question, filters.discipline)) return false;
    if (!ignored.has("subject") && !matchesSubject(question, filters.discipline, filters.subject)) return false;
    if (!ignored.has("theme") && !matchesTheme(question, filters.discipline, filters.subject, filters.theme)) return false;
    if (!ignored.has("board") && !exactMatch(questionBoard(question), filters.board)) return false;
    if (!ignored.has("year") && !exactMatch(questionYear(question), filters.year)) return false;
    if (!ignored.has("agency") && !exactMatch(questionAgency(question), filters.agency)) return false;
    if (!ignored.has("role") && !exactMatch(questionRole(question), filters.role)) return false;
    if (!ignored.has("type") && !exactMatch(questionType(question), filters.type)) return false;
    if (!ignored.has("keyStatus") && filters.keyStatus && questionKeyStatus(question) !== filters.keyStatus) return false;
    const search = canon(elements.qbFilterSearch?.value || "");
    if (search) {
      const haystack = canon([
        question?.enunciado, questionDiscipline(question), questionSubject(question), questionTheme(question),
        questionBoard(question), questionYear(question), questionAgency(question), questionRole(question),
        questionType(question), question?.referencia, question?.qcCodigo
      ].join(" "));
      if (!haystack.includes(search)) return false;
    }
    return true;
  }

  function enhancedFilteredQuestions() {
    const filters = currentFilters();
    return (typeof qbScopedBank === "function" ? qbScopedBank() : state.questionBank || [])
      .filter((question) => passes(question, filters));
  }

  function optionsForKey(key, filters) {
    const scoped = typeof qbScopedBank === "function" ? qbScopedBank() : state.questionBank || [];
    const catalog = syllabusCatalogItems();
    const ignoredByKey = {
      discipline: new Set(["discipline", "subject", "theme"]),
      subject: new Set(["subject", "theme"]),
      theme: new Set(["theme"]),
      board: new Set(["board"]),
      year: new Set(["year"]),
      agency: new Set(["agency"]),
      role: new Set(["role"]),
      type: new Set(["type"])
    };
    const base = scoped.filter((question) => passes(question, filters, ignoredByKey[key] || new Set([key])));

    if (key === "discipline") {
      return catalog.length ? unique(catalog.map(itemDiscipline)) : unique(base.map(questionDiscipline));
    }
    if (key === "subject") {
      if (catalog.length) return unique(syllabusItemsFor(filters.discipline).map(itemSubject));
      return unique(base.map(questionSubject));
    }
    if (key === "theme") {
      const bankThemes = unique(base.map(questionTheme));
      if (!catalog.length) return bankThemes;
      const catalogThemes = syllabusItemsFor(filters.discipline, filters.subject).flatMap(itemThemes);
      return unique([...catalogThemes, ...bankThemes]);
    }
    if (key === "board") return unique(base.map(questionBoard));
    if (key === "year") return unique(base.map(questionYear)).sort((a, b) => Number(b) - Number(a) || b.localeCompare(a));
    if (key === "agency") return unique(base.map(questionAgency));
    if (key === "role") return unique(base.map(questionRole));
    if (key === "type") return unique(base.map(questionType));
    return [];
  }

  function countForOption(key, value, filters) {
    const next = { ...filters, [key]: value };
    if (key === "discipline") { next.subject = ""; next.theme = ""; }
    if (key === "subject") next.theme = "";
    return (typeof qbScopedBank === "function" ? qbScopedBank() : state.questionBank || [])
      .filter((question) => passes(question, next)).length;
  }

  function fillCountedSelect(select, values, emptyLabel, key, filters) {
    if (!select) return false;
    const current = text(select.value);
    const options = values.map((value) => ({ value, count: countForOption(key, value, filters) }));
    select.innerHTML = `<option value="">${emptyLabel}</option>` + options.map(({ value, count }) => {
      const suffix = count ? `${count}` : "0 — sem questões";
      return `<option value="${escapeHTML(value)}">${escapeHTML(value)} (${suffix})</option>`;
    }).join("");
    if (values.some((value) => canon(value) === canon(current))) {
      const exact = values.find((value) => canon(value) === canon(current));
      select.value = exact;
      return false;
    }
    select.value = "";
    return Boolean(current);
  }

  function updateCoverage() {
    const coverage = byId("qbFilterCoverageV224");
    if (!coverage) return;
    const list = enhancedFilteredQuestions();
    const disciplines = unique(list.map(questionDiscipline)).length;
    const subjects = unique(list.map(questionSubject)).length;
    const withKey = list.filter((question) => questionKeyStatus(question) === "with").length;
    const scope = typeof qbScopeLabel === "function" ? qbScopeLabel() : "Banco de questões";
    coverage.innerHTML = `<strong>${list.length} questão(ões) encontrada(s)</strong><span>${escapeHTML(scope)}</span><span>${disciplines} disciplina(s)</span><span>${subjects} assunto(s)</span><span>${withKey} com gabarito</span>`;
    if (elements.qbStartTraining) {
      elements.qbStartTraining.disabled = list.length === 0;
      elements.qbStartTraining.title = list.length ? `Iniciar treino com até ${text(elements.qbTrainingLimit?.value || list.length)} questão(ões)` : "Nenhuma questão corresponde aos filtros atuais";
    }
  }

  function enhancedRenderCascadingFilters() {
    ensureExtraControls();
    if (elements.qbReviewTypeWrapper) elements.qbReviewTypeWrapper.hidden = scopeValue() !== "review";
    const controls = filterElements();
    const filters = currentFilters();

    fillCountedSelect(controls.discipline, optionsForKey("discipline", filters), "Todas", "discipline", filters);
    filters.discipline = text(controls.discipline?.value);
    fillCountedSelect(controls.subject, optionsForKey("subject", filters), "Todos", "subject", filters);
    filters.subject = text(controls.subject?.value);
    fillCountedSelect(controls.theme, optionsForKey("theme", filters), "Todos", "theme", filters);
    filters.theme = text(controls.theme?.value);
    fillCountedSelect(controls.board, optionsForKey("board", filters), "Todas", "board", filters);
    filters.board = text(controls.board?.value);
    fillCountedSelect(controls.year, optionsForKey("year", filters), "Todos", "year", filters);
    filters.year = text(controls.year?.value);
    fillCountedSelect(controls.agency, optionsForKey("agency", filters), "Todos", "agency", filters);
    filters.agency = text(controls.agency?.value);
    fillCountedSelect(controls.role, optionsForKey("role", filters), "Todos", "role", filters);
    filters.role = text(controls.role?.value);
    fillCountedSelect(controls.type, optionsForKey("type", filters), "Todos", "type", filters);

    updateCoverage();
  }

  function resetPreview() {
    qbPreviewVisible = false;
    if (elements.qbPreviewSection) elements.qbPreviewSection.hidden = true;
    if (elements.qbFilteredPreview) elements.qbFilteredPreview.innerHTML = "Clique em “Pré-visualizar” para listar as questões encontradas.";
  }

  function refreshAllFilters() {
    enhancedRenderCascadingFilters();
    if (typeof qbRenderQuestionBankStats === "function") qbRenderQuestionBankStats();
    resetPreview();
    const list = enhancedFilteredQuestions();
    if (elements.qbMessage) elements.qbMessage.textContent = list.length
      ? `${list.length} questão(ões) disponíveis com a combinação atual de filtros.`
      : "Nenhuma questão corresponde à combinação atual. Itens do edital com zero questões permanecem visíveis para diagnóstico.";
  }

  function clearFilters() {
    const controls = filterElements();
    Object.values(controls).forEach((control) => { if (control) control.value = ""; });
    if (elements.qbFilterSearch) elements.qbFilterSearch.value = "";
    refreshAllFilters();
  }

  function bindExtraEvents() {
    EXTRA_FILTERS.forEach(({ id }) => {
      const control = byId(id);
      if (!control || control.dataset.qbFilterBoundV224) return;
      control.dataset.qbFilterBoundV224 = "true";
      control.addEventListener("change", refreshAllFilters);
    });
    const clear = byId("qbClearFiltersV224");
    if (clear && !clear.dataset.qbFilterBoundV224) {
      clear.dataset.qbFilterBoundV224 = "true";
      clear.addEventListener("click", clearFilters);
    }
  }

  const originalRenderQuestionBank = typeof renderQuestionBank === "function" ? renderQuestionBank : null;
  qbFilteredQuestions = enhancedFilteredQuestions;
  qbRenderCascadingFilters = enhancedRenderCascadingFilters;

  if (originalRenderQuestionBank) {
    renderQuestionBank = function renderQuestionBankV224(options = {}) {
      const result = originalRenderQuestionBank(options);
      ensureExtraControls();
      bindExtraEvents();
      return result;
    };
  }

  function initialize() {
    ensureExtraControls();
    bindExtraEvents();
    document.documentElement.dataset.qbFiltersVersion = VERSION;
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initialize, { once: true });
  else initialize();
})();
