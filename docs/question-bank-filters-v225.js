(() => {
  "use strict";
  if (globalThis.__aldusQuestionBankFiltersV225) return;
  globalThis.__aldusQuestionBankFiltersV225 = true;

  const VERSION = "20260803-corrige-banco-questoes-integral-v227";
  const UNMAPPED_SUBJECT = "__qb_unmapped_subject_v225__";
  const FILTER_IDS = {
    scope: "qbTrainingScope",
    review: "qbReviewType",
    discipline: "qbFilterDiscipline",
    subject: "qbFilterSubject",
    theme: "qbFilterTheme",
    board: "qbFilterBoard",
    year: "qbFilterYear",
    agency: "qbFilterAgencyV224",
    role: "qbFilterRoleV224",
    type: "qbFilterTypeV224",
    keyStatus: "qbFilterKeyStatusV224",
    search: "qbFilterSearch"
  };
  const CASCADE_ORDER = ["discipline", "subject", "theme", "board", "year", "agency", "role", "type", "keyStatus"];
  const STOP_WORDS = new Set(["a","as","o","os","de","da","das","do","dos","e","em","no","nos","na","nas","para","por","com","sem","ao","aos","um","uma","lei","direito"]);

  const byId = (id) => document.getElementById(id);
  const text = (value) => String(value ?? "").trim();
  const canon = (value) => text(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[–—]/g, "-")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .toLowerCase();
  const html = (value) => typeof escapeHTML === "function"
    ? escapeHTML(value)
    : text(value).replace(/[&<>"']/g, (char) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[char]));
  const unique = (values) => [...new Map(values.filter(Boolean).map((value) => [canon(value), text(value)])).values()]
    .sort((a, b) => a.localeCompare(b, "pt-BR", { numeric: true }));

  function splitValues(value) {
    const input = Array.isArray(value) ? value : [value];
    const output = [];
    input.flat(Infinity).forEach((entry) => {
      const raw = text(entry);
      if (!raw) return;
      const pieces = raw.split(/\s*(?:•|;|\||\n)\s*/).map(text).filter(Boolean);
      if (pieces.length > 1) output.push(...pieces);
      else output.push(raw);
    });
    return unique(output);
  }

  function stripReferencePrefix(value) {
    return text(value).replace(/^\s*\d+(?:\.\d+)*\s*[-–—.:)]?\s*/, "").trim();
  }

  function aliasToken(token) {
    const value = canon(token);
    if (["tipicidade", "tipico", "tipica", "tipicos", "tipicas"].includes(value)) return "fato_tipico";
    if (["toxico", "toxicos", "droga", "drogas", "entorpecente", "entorpecentes", "11343"].includes(value)) return "drogas";
    if (["organizacao", "organizacoes", "criminosa", "criminosas", "12850"].includes(value)) return "organizacao_criminosa";
    if (["cebraspe", "cespe"].includes(value)) return "cebraspe";
    return value.replace(/(coes|cao|s)$/u, "");
  }

  function conceptText(value) {
    let normalized = canon(stripReferencePrefix(value));
    normalized = normalized
      .replace(/teoria da imputacao objetiva/g, "fato tipico")
      .replace(/tipicidade/g, "fato tipico")
      .replace(/lei (?:de )?toxicos/g, "lei de drogas")
      .replace(/lei (?:n )?11 343(?: 2006)?/g, "lei de drogas")
      .replace(/lei antidrogas/g, "lei de drogas")
      .replace(/crime organizado/g, "organizacao criminosa")
      .replace(/lei (?:n )?12 850(?: 2013)?/g, "organizacao criminosa");
    return normalized.replace(/\s+/g, " ").trim();
  }

  function tokens(value) {
    return [...new Set(conceptText(value).split(/\s+/).filter((token) => token && !STOP_WORDS.has(token)).map(aliasToken).filter(Boolean))];
  }

  function fuzzyTextMatch(a, b) {
    const x = conceptText(a);
    const y = conceptText(b);
    if (!x || !y) return false;
    if (x === y || (Math.min(x.length, y.length) >= 6 && (x.includes(y) || y.includes(x)))) return true;
    const xTokens = tokens(x), yTokens = tokens(y);
    if (!xTokens.length || !yTokens.length) return false;
    const common = xTokens.filter((token) => yTokens.includes(token)).length;
    const minimum = Math.min(xTokens.length, yTokens.length);
    if (minimum === 1) return common === 1;
    return common >= 2 && common / minimum >= 0.67;
  }

  function normalizeFacetValue(key, value) {
    const raw = text(value);
    const normalized = canon(raw);
    if (!raw) return "";
    if (key === "board") {
      if (normalized.includes("cebraspe") || normalized.includes("cespe")) return "CEBRASPE";
      if (normalized.includes("fundacao getulio vargas") || normalized === "fgv") return "FGV";
      return raw;
    }
    if (key === "type") {
      if (normalized.includes("certo") && normalized.includes("errado")) return "Certo/Errado";
      if (normalized.includes("multipla") || normalized.includes("multiple choice")) return "Múltipla escolha";
      return raw;
    }
    if (key === "role") {
      if (normalized.includes("delegado") && normalized.includes("policia")) return "Delegado de Polícia";
      return raw;
    }
    if (key === "agency") return raw.toUpperCase().replace(/^PC\s*[-/]?\s*/i, "PC-").replace(/\s+/g, "");
    return raw;
  }

  function questionDiscipline(question) { return text(question?.disciplina || question?.discipline); }
  function questionSubjectValues(question) {
    return unique([
      ...splitValues(question?.assuntos),
      ...splitValues(question?.assunto),
      ...splitValues(question?.subject)
    ]);
  }
  function questionThemeValues(question) {
    return unique([
      ...splitValues(question?.temas),
      ...splitValues(question?.tema),
      ...splitValues(question?.theme),
      ...splitValues(question?.subtema)
    ]).filter((value) => !/^\d+(?:\.\d+)*$/.test(value));
  }
  function questionFacet(question, key) {
    if (key === "discipline") return questionDiscipline(question);
    if (key === "board") return normalizeFacetValue(key, question?.banca || question?.board);
    if (key === "year") return text(question?.ano || question?.year);
    if (key === "agency") return normalizeFacetValue(key, question?.orgao || question?.órgão || question?.agency || question?.instituicao);
    if (key === "role") return normalizeFacetValue(key, question?.cargo || question?.job || question?.funcao);
    if (key === "type") {
      const raw = question?.tipo || question?.type || (typeof qbIsMultipleChoice === "function" && qbIsMultipleChoice(question) ? "Múltipla escolha" : "Certo/Errado");
      return normalizeFacetValue(key, raw);
    }
    if (key === "keyStatus") return typeof qbHasKey === "function" && qbHasKey(question) ? "with" : "without";
    return "";
  }

  function itemDiscipline(item) { return text(item?.discipline || item?.disciplina); }
  function itemSubject(item) { return text(item?.subject || item?.assunto || stripReferencePrefix(item?.reference)); }
  function itemTexts(item) {
    return unique([itemSubject(item), stripReferencePrefix(item?.topic), stripReferencePrefix(item?.reference)]);
  }

  function scopeValue() { return text(byId(FILTER_IDS.scope)?.value || elements.qbTrainingScope?.value || "all"); }
  function reviewValue() { return text(byId(FILTER_IDS.review)?.value || elements.qbReviewType?.value || "wrong"); }
  function activeSyllabusItems() {
    return typeof qbActiveSyllabusItems === "function"
      ? qbActiveSyllabusItems()
      : (state.syllabusItems || []).filter((item) => canon(item?.status) !== "ignorado");
  }
  function catalogItems() {
    if (scopeValue() === "syllabus") return activeSyllabusItems();
    if (scopeValue() === "review" && ["weak", "unseen", "week"].includes(reviewValue())) {
      return typeof qbReviewSyllabusItems === "function" ? qbReviewSyllabusItems(reviewValue()) : activeSyllabusItems();
    }
    return [];
  }

  function disciplineMatches(question, discipline) {
    return !discipline || fuzzyTextMatch(questionDiscipline(question), discipline);
  }

  function questionMatchesItem(question, item) {
    if (!disciplineMatches(question, itemDiscipline(item))) return false;
    if (question?.syllabusItemId && item?.id && question.syllabusItemId === item.id) return true;
    if (typeof qbMatchesSyllabusItem === "function" && qbMatchesSyllabusItem(question, item)) return true;
    const questionTexts = [...questionSubjectValues(question), ...questionThemeValues(question)];
    return itemTexts(item).some((itemTextValue) => questionTexts.some((questionTextValue) => fuzzyTextMatch(itemTextValue, questionTextValue)));
  }

  function itemsForSelection(discipline, subject = "") {
    return catalogItems().filter((item) => {
      if (discipline && !fuzzyTextMatch(itemDiscipline(item), discipline)) return false;
      if (subject && subject !== UNMAPPED_SUBJECT && !fuzzyTextMatch(itemSubject(item), subject)) return false;
      return true;
    });
  }

  function questionMappedToCatalog(question, discipline = "") {
    const items = itemsForSelection(discipline);
    return items.some((item) => questionMatchesItem(question, item));
  }

  function scopeBank() {
    const bank = state.questionBank || [];
    const scope = scopeValue();
    if (scope === "all") return bank;
    if (scope === "review" && ["wrong", "blank", "wrong_blank"].includes(reviewValue()) && typeof qbScopedBank === "function") {
      return qbScopedBank();
    }
    const disciplines = unique(catalogItems().map(itemDiscipline));
    return bank.filter((question) => disciplines.some((discipline) => disciplineMatches(question, discipline)));
  }

  function control(key) { return byId(FILTER_IDS[key]); }
  function selectedFilters() {
    return Object.fromEntries(CASCADE_ORDER.map((key) => [key, text(control(key)?.value)]));
  }

  function matchesSelectedSubject(question, filters) {
    if (!filters.subject) return true;
    if (filters.subject === UNMAPPED_SUBJECT) return !questionMappedToCatalog(question, filters.discipline);
    const catalog = itemsForSelection(filters.discipline, filters.subject);
    if (catalog.length) return catalog.some((item) => questionMatchesItem(question, item));
    return questionSubjectValues(question).some((value) => fuzzyTextMatch(value, filters.subject));
  }

  function matchesSelectedTheme(question, value) {
    return !value || questionThemeValues(question).some((theme) => fuzzyTextMatch(theme, value));
  }

  function facetEquals(key, candidate, selected) {
    if (!selected) return true;
    return canon(normalizeFacetValue(key, candidate)) === canon(normalizeFacetValue(key, selected));
  }

  function passes(question, filters, maxIndex = CASCADE_ORDER.length - 1, includeSearch = true) {
    for (let index = 0; index <= maxIndex; index++) {
      const key = CASCADE_ORDER[index];
      const selected = filters[key];
      if (!selected) continue;
      if (key === "discipline" && !disciplineMatches(question, selected)) return false;
      if (key === "subject" && !matchesSelectedSubject(question, filters)) return false;
      if (key === "theme" && !matchesSelectedTheme(question, selected)) return false;
      if (["board", "year", "agency", "role", "type"].includes(key) && !facetEquals(key, questionFacet(question, key), selected)) return false;
      if (key === "keyStatus" && questionFacet(question, key) !== selected) return false;
    }
    if (includeSearch) {
      const search = canon(control("search")?.value);
      if (search) {
        const haystack = canon([
          question?.enunciado,
          questionDiscipline(question),
          ...questionSubjectValues(question),
          ...questionThemeValues(question),
          questionFacet(question, "board"),
          questionFacet(question, "year"),
          questionFacet(question, "agency"),
          questionFacet(question, "role"),
          questionFacet(question, "type"),
          question?.referencia,
          question?.qcCodigo
        ].join(" "));
        if (!haystack.includes(search)) return false;
      }
    }
    return true;
  }

  function filteredQuestions() {
    const filters = selectedFilters();
    return scopeBank().filter((question) => passes(question, filters));
  }

  function optionValues(key, filters) {
    const index = CASCADE_ORDER.indexOf(key);
    const base = scopeBank().filter((question) => passes(question, filters, index - 1, false));
    if (key === "discipline") {
      const catalog = catalogItems();
      return catalog.length ? unique(catalog.map(itemDiscipline)) : unique(base.map(questionDiscipline));
    }
    if (key === "subject") {
      const catalog = itemsForSelection(filters.discipline);
      if (catalogItems().length && !filters.discipline) return [];
      if (!catalog.length) return unique(base.flatMap(questionSubjectValues));
      const values = unique(catalog.map(itemSubject));
      if (base.some((question) => !questionMappedToCatalog(question, filters.discipline))) values.push(UNMAPPED_SUBJECT);
      return values;
    }
    if (key === "theme") {
      if (!filters.subject) return [];
      return unique(base.flatMap(questionThemeValues));
    }
    if (key === "keyStatus") return ["with", "without"];
    return unique(base.map((question) => questionFacet(question, key)));
  }

  function optionLabel(key, value) {
    if (key === "subject" && value === UNMAPPED_SUBJECT) return "Questões ainda não vinculadas a um assunto do edital";
    if (key === "keyStatus") return value === "with" ? "Com gabarito" : "Sem gabarito";
    return value;
  }

  function countForOption(key, value, filters) {
    const index = CASCADE_ORDER.indexOf(key);
    const next = { ...filters, [key]: value };
    return scopeBank().filter((question) => passes(question, next, index, false)).length;
  }

  function fillSelect(key, values, filters) {
    const select = control(key);
    if (!select) return;
    const current = text(select.value);
    const waitingForDiscipline = key === "subject" && catalogItems().length > 0 && !filters.discipline;
    const waitingForSubject = key === "theme" && !filters.subject;
    const emptyLabel = waitingForDiscipline
      ? "Escolha primeiro a disciplina"
      : waitingForSubject
        ? "Escolha primeiro o assunto"
        : ({ discipline:"Todas", subject:"Todos", theme:"Todos", board:"Todas", year:"Todos", agency:"Todos", role:"Todos", type:"Todos", keyStatus:"Todos" })[key] || "Todos";
    select.innerHTML = `<option value="">${emptyLabel}</option>` + values.map((value) => {
      const count = countForOption(key, value, filters);
      const label = optionLabel(key, value);
      const suffix = count ? String(count) : "0 — sem questões";
      return `<option value="${html(value)}">${html(label)} (${suffix})</option>`;
    }).join("");
    const replacement = values.find((value) => canon(value) === canon(current));
    select.value = replacement || "";
    select.disabled = waitingForDiscipline || waitingForSubject;
    if (select.disabled) select.setAttribute?.("aria-disabled", "true");
    else select.removeAttribute?.("aria-disabled");
  }

  function renderFilters() {
    const filters = selectedFilters();
    CASCADE_ORDER.forEach((key) => {
      fillSelect(key, optionValues(key, filters), filters);
      filters[key] = text(control(key)?.value);
    });
    updateCoverage();
  }

  function updateCoverage() {
    const coverage = byId("qbFilterCoverageV224");
    const list = filteredQuestions();
    const mapped = list.filter((question) => questionMappedToCatalog(question, control("discipline")?.value)).length;
    const unmapped = catalogItems().length ? list.length - mapped : 0;
    if (coverage) {
      const disciplines = unique(list.map(questionDiscipline)).length;
      const subjects = unique(list.flatMap(questionSubjectValues)).length;
      const withKey = list.filter((question) => questionFacet(question, "keyStatus") === "with").length;
      const unmappedText = catalogItems().length ? `<span>${unmapped} sem vínculo direto ao assunto do edital</span>` : "";
      coverage.innerHTML = `<strong>${list.length} questão(ões) encontrada(s)</strong><span>${disciplines} disciplina(s)</span><span>${subjects} assunto(s) do banco</span><span>${withKey} com gabarito</span>${unmappedText}`;
    }
    if (elements.qbStartTraining) {
      elements.qbStartTraining.disabled = list.length === 0;
      elements.qbStartTraining.title = list.length ? "Iniciar treino com os filtros atuais" : "Nenhuma questão corresponde aos filtros atuais";
    }
  }

  function clearAfter(key) {
    const index = CASCADE_ORDER.indexOf(key);
    if (index < 0) return;
    CASCADE_ORDER.slice(index + 1).forEach((nextKey) => {
      const element = control(nextKey);
      if (element) element.value = "";
    });
  }

  function resetPreview() {
    if (typeof qbPreviewVisible !== "undefined") qbPreviewVisible = false;
    if (elements.qbPreviewSection) elements.qbPreviewSection.hidden = true;
    if (elements.qbFilteredPreview) elements.qbFilteredPreview.innerHTML = "Clique em “Pré-visualizar” para listar as questões encontradas.";
  }

  function refresh(message = true) {
    renderFilters();
    if (typeof qbRenderQuestionBankStats === "function") qbRenderQuestionBankStats();
    resetPreview();
    const list = filteredQuestions();
    if (message && elements.qbMessage) elements.qbMessage.textContent = list.length
      ? `${list.length} questão(ões) disponíveis com os filtros atuais.`
      : "Nenhuma questão corresponde aos filtros atuais.";
  }

  function handleFilterEvent(event) {
    const target = event.target;
    const key = Object.entries(FILTER_IDS).find(([, id]) => id === target?.id)?.[0];
    if (!key) return;
    event.stopImmediatePropagation();
    if (key === "scope" || key === "review") {
      CASCADE_ORDER.forEach((filterKey) => { const element = control(filterKey); if (element) element.value = ""; });
    } else if (CASCADE_ORDER.includes(key)) clearAfter(key);
    refresh();
  }

  let searchTimer = 0;
  function handleSearchEvent(event) {
    if (event.target?.id !== FILTER_IDS.search) return;
    event.stopImmediatePropagation();
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => refresh(false), 120);
  }

  function bindEvents() {
    if (document.documentElement.dataset.qbFiltersBoundV225) return;
    document.documentElement.dataset.qbFiltersBoundV225 = "true";
    document.addEventListener("change", handleFilterEvent, true);
    document.addEventListener("input", handleSearchEvent, true);
    byId("qbClearFiltersV224")?.addEventListener("click", (event) => {
      event.stopImmediatePropagation();
      CASCADE_ORDER.forEach((key) => { const element = control(key); if (element) element.value = ""; });
      if (control("search")) control("search").value = "";
      refresh();
    }, true);
  }

  const previousRenderQuestionBank = typeof renderQuestionBank === "function" ? renderQuestionBank : null;
  qbFilteredQuestions = filteredQuestions;
  qbRenderCascadingFilters = renderFilters;
  if (previousRenderQuestionBank) {
    renderQuestionBank = function renderQuestionBankV225(options = {}) {
      const result = previousRenderQuestionBank(options);
      renderFilters();
      return result;
    };
  }

  const api = Object.freeze({
    VERSION,
    UNMAPPED_SUBJECT,
    splitValues,
    normalizeFacetValue,
    questionSubjectValues,
    questionThemeValues,
    fuzzyTextMatch,
    questionMatchesItem,
    questionMappedToCatalog,
    itemsForSelection,
    scopeBank,
    filteredQuestions,
    optionValues
  });
  Object.defineProperty(globalThis, "__aldusQuestionBankFiltersV225Api", { value: api, configurable: true });

  function initialize() {
    bindEvents();
    renderFilters();
    document.documentElement.dataset.qbFiltersVersion = VERSION;
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initialize, { once: true });
  else initialize();
})();
