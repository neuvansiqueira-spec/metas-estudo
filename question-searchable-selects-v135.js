(() => {
  if (window.__aldusQuestionSearchableSelectsV135) return;
  window.__aldusQuestionSearchableSelectsV135 = true;

  const VERSION = "20260723-pesquisa-registro-questoes-v135";
  const FIELD_CONFIG = {
    questionDiscipline: { name: "disciplina", placeholder: "Pesquisar disciplina..." },
    questionSyllabusItem: { name: "assunto do edital", placeholder: "Pesquisar assunto, número ou palavra-chave..." },
    questionBoard: { name: "banca", placeholder: "Pesquisar banca..." },
    questionTrainingType: { name: "tipo de treino", placeholder: "Pesquisar tipo de treino..." },
    questionItemResult: { name: "resultado da questão", placeholder: "Pesquisar resultado..." },
    questionItemDifficulty: { name: "dificuldade", placeholder: "Pesquisar dificuldade..." }
  };

  const originalDisabled = new WeakMap();

  function normalizeSearchText(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("pt-BR")
      .replace(/\s+/g, " ")
      .trim();
  }

  function ensureStyles() {
    if (document.getElementById("questionSearchableSelectStylesV135")) return;
    const style = document.createElement("style");
    style.id = "questionSearchableSelectStylesV135";
    style.textContent = `
      #view-questoes .question-searchable-select-v135 {
        align-content: start;
      }
      #view-questoes .question-select-search-v135 {
        width: 100%;
        min-height: 46px;
        margin: 7px 0 2px;
        padding: 11px 14px 11px 42px;
        border: 1px solid var(--border, #8eb8d6);
        border-radius: 14px;
        background-color: var(--surface, #ffffff);
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='%235f8fb2' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='11' cy='11' r='8'/%3E%3Cpath d='m21 21-4.35-4.35'/%3E%3C/svg%3E");
        background-repeat: no-repeat;
        background-position: 14px center;
        color: var(--text, #172033);
        font: inherit;
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, .04);
      }
      #view-questoes .question-select-search-v135::placeholder {
        color: var(--muted, #64748b);
        opacity: .95;
      }
      #view-questoes .question-select-search-v135:focus {
        outline: none;
        border-color: #60a5fa;
        box-shadow: 0 0 0 3px rgba(96, 165, 250, .2);
      }
      #view-questoes .question-select-search-status-v135 {
        display: block;
        min-height: 1.1em;
        margin: 2px 2px 0;
        color: var(--muted, #64748b);
        font-size: .78rem;
        font-weight: 700;
      }
      #view-questoes .question-select-search-status-v135[data-empty="true"] {
        color: var(--warning, #f59e0b);
      }
      html[data-aldus-theme="premium-stable"] #view-questoes .question-select-search-v135 {
        border-color: #5f8fb2;
        background-color: #061f34;
        color: #f4f9fd;
      }
      html[data-aldus-theme="premium-stable"] #view-questoes .question-select-search-v135::placeholder,
      html[data-aldus-theme="premium-stable"] #view-questoes .question-select-search-status-v135 {
        color: #b8d0e1;
      }
      @media (max-width: 700px) {
        #view-questoes .question-select-search-v135 {
          min-height: 48px;
          font-size: 16px;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function rememberOptionState(option) {
    if (!originalDisabled.has(option)) originalDisabled.set(option, Boolean(option.disabled));
  }

  function enhanceSelect(select, config) {
    if (!select || select.dataset.questionSearchV135 === "true") return;
    const label = select.closest("label");
    if (!label) return;

    select.dataset.questionSearchV135 = "true";
    select.dataset.questionSearchVersion = VERSION;
    label.classList.add("question-searchable-select-v135");

    const search = document.createElement("input");
    search.type = "search";
    search.className = "question-select-search-v135";
    search.placeholder = config.placeholder;
    search.autocomplete = "off";
    search.spellcheck = false;
    search.setAttribute("aria-label", `Pesquisar ${config.name}`);
    search.setAttribute("aria-controls", select.id);

    const status = document.createElement("small");
    status.className = "question-select-search-status-v135";
    status.setAttribute("aria-live", "polite");
    status.hidden = true;

    select.before(search);
    select.after(status);

    function restoreOptions() {
      [...select.options].forEach((option) => {
        rememberOptionState(option);
        option.hidden = false;
        option.disabled = originalDisabled.get(option);
      });
    }

    function matchingOptions(query) {
      return [...select.options].filter((option) => {
        const searchable = normalizeSearchText(`${option.textContent || ""} ${option.value || ""}`);
        return searchable.includes(query);
      });
    }

    function applyFilter() {
      const query = normalizeSearchText(search.value);
      restoreOptions();

      if (!query) {
        status.hidden = true;
        status.textContent = "";
        status.dataset.empty = "false";
        return;
      }

      const matches = matchingOptions(query);
      const matchSet = new Set(matches);
      let selectableMatches = 0;

      [...select.options].forEach((option) => {
        const keepSelected = option.selected;
        const isMatch = matchSet.has(option);
        const shouldShow = isMatch || keepSelected;
        option.hidden = !shouldShow;
        option.disabled = originalDisabled.get(option) || (!shouldShow && !keepSelected);
        if (isMatch && !originalDisabled.get(option) && option.value !== "") selectableMatches += 1;
      });

      status.hidden = false;
      status.dataset.empty = String(selectableMatches === 0);
      status.textContent = selectableMatches === 0
        ? "Nenhuma opção encontrada. Limpe ou ajuste a pesquisa."
        : `${selectableMatches} ${selectableMatches === 1 ? "opção encontrada" : "opções encontradas"}. Pressione Enter para escolher a primeira.`;
    }

    function selectFirstMatch() {
      const first = [...select.options].find((option) => !option.hidden && !option.disabled && option.value !== "");
      if (!first) return false;
      select.value = first.value;
      select.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    }

    search.addEventListener("input", applyFilter);
    search.addEventListener("search", applyFilter);
    search.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        search.value = "";
        applyFilter();
        event.preventDefault();
        return;
      }
      if (event.key === "Enter") {
        if (normalizeSearchText(search.value) && selectFirstMatch()) event.preventDefault();
        return;
      }
      if (event.key === "ArrowDown") {
        select.focus();
        event.preventDefault();
      }
    });

    select.addEventListener("change", () => {
      search.value = "";
      applyFilter();
    });

    const observer = new MutationObserver(() => queueMicrotask(applyFilter));
    observer.observe(select, { childList: true, subtree: true, characterData: true });
    applyFilter();
  }

  function initialize() {
    const form = document.getElementById("questionForm");
    if (!form) return;
    ensureStyles();
    Object.entries(FIELD_CONFIG).forEach(([id, config]) => enhanceSelect(document.getElementById(id), config));
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initialize, { once: true });
  else initialize();
})();
