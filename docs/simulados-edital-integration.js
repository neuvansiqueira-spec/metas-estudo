(() => {
  "use strict";

  const MAIN_STORAGE_KEY = "metasConcursoData";
  const DISCIPLINE_NAME = "Simulados";
  const DISCIPLINE_ID = "disciplina-operacional-simulados";
  const DEFAULT_SUBJECT = "Realização de simulado";
  const SCRIPT_VERSION = "1.0.0";

  function normalizeText(value) {
    return String(value ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toLocaleLowerCase("pt-BR");
  }

  function isSimulados(value) {
    if (value && typeof value === "object") {
      return [value.name, value.nome, value.discipline, value.disciplina, value.label, value.title]
        .some((candidate) => normalizeText(candidate) === "simulados");
    }
    return normalizeText(value) === "simulados";
  }

  function makeOperationalDiscipline(sample) {
    if (typeof sample === "string") return DISCIPLINE_NAME;

    return {
      id: DISCIPLINE_ID,
      name: DISCIPLINE_NAME,
      nome: DISCIPLINE_NAME,
      discipline: DISCIPLINE_NAME,
      disciplina: DISCIPLINE_NAME,
      label: DISCIPLINE_NAME,
      goal: 0,
      weeklyGoal: 0,
      weeklyGoalHours: 0,
      metaSemanal: 0,
      targetHours: 0,
      operational: true,
      isOperational: true,
      isPseudoDiscipline: true,
      linkedView: "simulados",
      createdAt: new Date().toISOString(),
      integrationVersion: SCRIPT_VERSION
    };
  }

  function ensureOperationalDiscipline(state) {
    if (!state || typeof state !== "object" || Array.isArray(state)) return { state, changed: false };

    if (!Array.isArray(state.subjects)) {
      if (state.subjects == null) state.subjects = [];
      else return { state, changed: false };
    }

    const existing = state.subjects.find(isSimulados);
    if (existing) {
      if (existing && typeof existing === "object") {
        const before = JSON.stringify(existing);
        existing.name ||= DISCIPLINE_NAME;
        existing.nome ||= DISCIPLINE_NAME;
        existing.operational = true;
        existing.isOperational = true;
        existing.isPseudoDiscipline = true;
        existing.linkedView = "simulados";
        existing.integrationVersion = SCRIPT_VERSION;
        return { state, changed: before !== JSON.stringify(existing) };
      }
      return { state, changed: false };
    }

    const sample = state.subjects.find((item) => item && typeof item === "object") || state.subjects[0];
    state.subjects.push(makeOperationalDiscipline(sample));
    return { state, changed: true };
  }

  function normalizeStoredState(serialized) {
    try {
      const parsed = JSON.parse(serialized);
      const result = ensureOperationalDiscipline(parsed);
      return result.changed ? JSON.stringify(result.state) : serialized;
    } catch {
      return serialized;
    }
  }

  function migrateExistingState() {
    const serialized = localStorage.getItem(MAIN_STORAGE_KEY);
    if (!serialized) return false;
    const normalized = normalizeStoredState(serialized);
    if (normalized === serialized) return false;
    localStorage.setItem(MAIN_STORAGE_KEY, normalized);
    return true;
  }

  const originalSetItem = Storage.prototype.setItem;
  Storage.prototype.setItem = function patchedSetItem(key, value) {
    if (this === localStorage && key === MAIN_STORAGE_KEY && typeof value === "string") {
      return originalSetItem.call(this, key, normalizeStoredState(value));
    }
    return originalSetItem.call(this, key, value);
  };

  migrateExistingState();

  function optionText(option) {
    return normalizeText(option?.textContent || option?.label || option?.value);
  }

  function addOption(select, label = DISCIPLINE_NAME) {
    if (!(select instanceof HTMLSelectElement)) return null;
    const displayLabel = select.id === "studySubject" ? "SIMULADOS" : label;
    let option = [...select.options].find((item) => optionText(item) === "simulados");
    if (!option) {
      option = document.createElement("option");
      option.value = DISCIPLINE_ID;
      option.dataset.operationalDiscipline = "simulados";
      select.append(option);
    }
    if (option.textContent !== displayLabel) option.textContent = displayLabel;
    return option;
  }

  function addDatalistOption(datalist) {
    if (!(datalist instanceof HTMLDataListElement)) return;
    if ([...datalist.options].some((item) => optionText(item) === "simulados")) return;
    const option = document.createElement("option");
    option.value = DISCIPLINE_NAME;
    option.dataset.operationalDiscipline = "simulados";
    datalist.append(option);
  }

  function selectSimulados(select) {
    const option = addOption(select);
    if (!option) return false;
    select.value = option.value;
    select.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  }

  function configureStudyFields() {
    const studySelect = document.getElementById("studySubject");
    addOption(studySelect);
    if (studySelect && optionText(studySelect.selectedOptions?.[0]) === "simulados") {
      const topic = document.getElementById("studyTopic");
      if (topic && !topic.value.trim()) topic.value = DEFAULT_SUBJECT;
      const status = document.getElementById("studyTopicStatus");
      if (status) status.value = "Concluído";
    }

    const timerDiscipline = document.getElementById("timerStudyDiscipline");
    addOption(timerDiscipline);
    if (timerDiscipline && optionText(timerDiscipline.selectedOptions?.[0]) === "simulados") {
      const timerSubject = document.getElementById("timerStudySubject");
      if (timerSubject instanceof HTMLSelectElement) {
        let subjectOption = [...timerSubject.options].find((item) => normalizeText(item.textContent || item.value) === normalizeText(DEFAULT_SUBJECT));
        if (!subjectOption) {
          subjectOption = document.createElement("option");
          subjectOption.value = DEFAULT_SUBJECT;
          subjectOption.textContent = DEFAULT_SUBJECT;
          timerSubject.append(subjectOption);
        }
        timerSubject.value = subjectOption.value;
      }
      const updateGoal = document.getElementById("timerStudyUpdateGoal");
      if (updateGoal instanceof HTMLInputElement) updateGoal.checked = false;
    }
  }

  function openView(view) {
    const link = document.querySelector(`[data-view-link="${view}"]`);
    if (link instanceof HTMLElement) {
      link.click();
      return;
    }
    window.location.hash = `#${view}`;
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  }

  function prepareTimeRegistration() {
    openView("dashboard");
    window.setTimeout(() => {
      const studySelect = document.getElementById("studySubject");
      selectSimulados(studySelect);
      const topic = document.getElementById("studyTopic");
      if (topic instanceof HTMLInputElement) topic.value = DEFAULT_SUBJECT;
      const status = document.getElementById("studyTopicStatus");
      if (status instanceof HTMLSelectElement) status.value = "Concluído";
      document.getElementById("studyMinutes")?.focus();
    }, 80);
  }

  function enhanceSimuladosArea() {
    const view = document.getElementById("view-simulados");
    if (!view || view.querySelector("[data-simulados-time-link]")) return;

    const notice = document.createElement("div");
    notice.className = "notice";
    notice.dataset.simuladosTimeLink = "true";
    notice.innerHTML = `
      <strong>⏱ Tempo do simulado</strong>
      <p>O período usado para realizar o simulado é contabilizado na disciplina operacional <strong>Simulados</strong>. Resultado, líquido, desempenho por disciplina e diagnóstico continuam armazenados nesta área.</p>
      <button type="button" data-register-mock-time>Registrar tempo do simulado</button>
    `;
    view.querySelector(".section-heading")?.insertAdjacentElement("afterend", notice);
    notice.querySelector("[data-register-mock-time]")?.addEventListener("click", prepareTimeRegistration);
  }

  function enhanceSubjectList() {
    const list = document.getElementById("subjectList");
    if (!list) return;

    const row = [...list.children].find((item) => normalizeText(item.textContent).includes("simulados"));
    if (!row) return;
    row.dataset.operationalDiscipline = "simulados";

    if (!row.querySelector("[data-open-simulados]")) {
      const badge = document.createElement("span");
      badge.className = "badge neutral";
      badge.textContent = "Categoria operacional";
      badge.title = "Contabiliza tempo, mas não integra o conteúdo jurídico do edital.";
      row.append(badge);

      const button = document.createElement("button");
      button.type = "button";
      button.className = "secondary-button";
      button.dataset.openSimulados = "true";
      button.textContent = "Abrir Simulados";
      button.addEventListener("click", () => openView("simulados"));
      row.append(button);
    }

    row.querySelectorAll("button").forEach((button) => {
      const text = normalizeText(button.textContent || button.getAttribute("aria-label"));
      if (text.includes("excluir") || text.includes("remover")) {
        button.disabled = true;
        button.title = "A disciplina Simulados é uma categoria operacional permanente.";
      }
    });
  }

  function refreshIntegration() {
    document.querySelectorAll("datalist[id*='discipline' i]").forEach(addDatalistOption);
    document.querySelectorAll("select[id*='discipline' i]").forEach((select) => addOption(select));
    addOption(document.getElementById("studySubject"));
    configureStudyFields();
    enhanceSimuladosArea();
    enhanceSubjectList();
  }

  document.addEventListener("change", (event) => {
    if (event.target?.id === "studySubject" || event.target?.id === "timerStudyDiscipline") {
      configureStudyFields();
    }
  }, true);

  document.addEventListener("DOMContentLoaded", () => {
    refreshIntegration();
    const observer = new MutationObserver(() => refreshIntegration());
    observer.observe(document.body, { childList: true, subtree: true });
    window.setTimeout(refreshIntegration, 250);
    window.setTimeout(refreshIntegration, 1200);
  });
})();
