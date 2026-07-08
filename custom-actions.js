(() => {
  if (window.__METAS_DELETE_ACTIONS_LOADED__) return;
  window.__METAS_DELETE_ACTIONS_LOADED__ = true;

  const DELETE_ACTIONS_VERSION = "20260708-delete-discipline-subject-v2";

  function ready() {
    return typeof state !== "undefined" && Array.isArray(state.syllabusItems) && Array.isArray(state.subjects);
  }

  function safeCanonical(value) {
    if (typeof canonical === "function") return canonical(value);
    return String(value || "").trim().toLowerCase();
  }

  function currentView() {
    return String(location.hash || "#dashboard").replace(/^#/, "") || "dashboard";
  }

  function removeSchedulableSettings(itemIds) {
    itemIds.forEach((id) => {
      if (state.schedulableSettings) delete state.schedulableSettings[id];
    });
  }

  function cleanupDisciplineWeight(discipline) {
    const stillExists = state.syllabusItems.some((item) => safeCanonical(item.discipline) === safeCanonical(discipline));
    if (!stillExists && state.disciplineWeights) delete state.disciplineWeights[discipline];
  }

  function subjectHasStudies(subject) {
    return (state.studies || []).some((study) => study.subjectId === subject.id);
  }

  function cleanupOrphanImportedSubjects(removedDisciplineNames = []) {
    const removed = new Set([...removedDisciplineNames].map(safeCanonical));
    const existingDisciplines = new Set((state.syllabusItems || []).map((item) => safeCanonical(item.discipline)));
    state.subjects = (state.subjects || []).filter((subject) => {
      const name = safeCanonical(subject.name);
      if (!removed.has(name)) return true;
      if (!subject.importedFromSyllabus) return true;
      if (existingDisciplines.has(name)) return true;
      if (subjectHasStudies(subject)) return true;
      return false;
    });
  }

  function persistAndRefresh(message, view = currentView()) {
    if (typeof saveData === "function") saveData();
    if (typeof render === "function") render();
    if (typeof showView === "function") showView(view || currentView());
    if (message) showTemporaryMessage(message);
    queueEnhance();
  }

  function showTemporaryMessage(message) {
    const target = document.querySelector("#importMessage") || document.querySelector("#syllabusCount") || document.querySelector("#subjectList");
    if (!target) return;
    const box = document.createElement("p");
    box.className = "notice";
    box.textContent = message;
    target.insertAdjacentElement("afterend", box);
    setTimeout(() => box.remove(), 5000);
  }

  function deleteSyllabusItem(id) {
    if (!ready()) return alert("O site ainda não terminou de carregar.");
    const item = state.syllabusItems.find((entry) => entry.id === id);
    if (!item) return alert("Assunto não encontrado.");
    const label = `${item.discipline} — ${item.subject}`;
    if (!confirm(`Excluir este assunto do Edital Verticalizado?\n\n${label}\n\nHistórico, questões, simulados, materiais e planejamento serão preservados.`)) return;
    removeSchedulableSettings(new Set([id]));
    state.syllabusItems = state.syllabusItems.filter((entry) => entry.id !== id);
    cleanupOrphanImportedSubjects([item.discipline]);
    cleanupDisciplineWeight(item.discipline);
    persistAndRefresh("Assunto excluído com sucesso.", "edital-verticalizado");
  }

  function deleteDiscipline(discipline) {
    if (!ready()) return alert("O site ainda não terminou de carregar.");
    const name = String(discipline || "").trim();
    if (!name) return;
    const items = state.syllabusItems.filter((item) => safeCanonical(item.discipline) === safeCanonical(name));
    const subjects = state.subjects.filter((subject) => safeCanonical(subject.name) === safeCanonical(name));
    const hasManualSubject = subjects.some((subject) => !subject.importedFromSyllabus);
    const linkedStudyCount = subjects.reduce((sum, subject) => sum + (state.studies || []).filter((study) => study.subjectId === subject.id).length, 0);
    const warning = hasManualSubject || linkedStudyCount
      ? "\n\nAtenção: existe disciplina manual ou estudo registrado com esse nome. O site vai excluir os assuntos do edital, mas preservar o histórico e a disciplina manual/usada em estudo."
      : "";
    if (!confirm(`Excluir a disciplina do edital?\n\n${name}\n\nAssuntos vinculados: ${items.length}.${warning}\n\nHistórico, questões, simulados, materiais e planejamento serão preservados.`)) return;
    const itemIds = new Set(items.map((item) => item.id));
    removeSchedulableSettings(itemIds);
    state.syllabusItems = state.syllabusItems.filter((item) => !itemIds.has(item.id));
    cleanupOrphanImportedSubjects([name]);
    cleanupDisciplineWeight(name);
    persistAndRefresh("Disciplina excluída do edital com sucesso.", currentView());
  }

  function enhanceSyllabusDeleteButtons() {
    if (!ready()) return;
    document.querySelectorAll("#syllabusList .syllabus-card").forEach((card) => {
      const actions = card.querySelector(".card-actions");
      const edit = actions?.querySelector("button[data-action='edit'][data-id]");
      if (!actions || !edit || actions.querySelector("[data-custom-delete-syllabus]")) return;
      const button = document.createElement("button");
      button.type = "button";
      button.className = "danger";
      button.dataset.customDeleteSyllabus = edit.dataset.id;
      button.textContent = "Excluir assunto";
      actions.appendChild(button);
    });
  }

  function enhanceSubjectDeleteButtons() {
    if (!ready()) return;
    document.querySelectorAll("#subjectList .subject-item").forEach((item) => {
      if (item.querySelector("[data-custom-delete-discipline]")) return;
      const strong = item.querySelector("strong");
      const discipline = strong?.textContent?.trim();
      if (!discipline) return;
      const button = document.createElement("button");
      button.type = "button";
      button.className = "danger";
      button.dataset.customDeleteDiscipline = discipline;
      button.textContent = "Excluir disciplina";
      item.appendChild(button);
    });
  }

  function enhanceImportedGroupsRenderingOnce() {
    const box = document.querySelector("#importedSyllabusGroups");
    if (!box || box.dataset.customRendered === "true") return;
    if (typeof renderImportedSyllabusGroups === "function") {
      renderImportedSyllabusGroups();
      box.dataset.customRendered = "true";
    }
  }

  function enhanceDeleteButtons() {
    try {
      enhanceSyllabusDeleteButtons();
      enhanceSubjectDeleteButtons();
      enhanceImportedGroupsRenderingOnce();
    } catch (error) {
      console.warn(`[Metas Estudo] Falha no complemento ${DELETE_ACTIONS_VERSION}.`, error);
    }
  }

  let enhanceTimer = null;
  function queueEnhance() {
    clearTimeout(enhanceTimer);
    enhanceTimer = setTimeout(enhanceDeleteButtons, 80);
  }

  function wrapFunction(name) {
    if (typeof window[name] !== "function" || window[name].__deleteActionsWrapped) return;
    const original = window[name];
    const wrapped = function(...args) {
      const result = original.apply(this, args);
      queueEnhance();
      return result;
    };
    wrapped.__deleteActionsWrapped = true;
    window[name] = wrapped;
  }

  document.addEventListener("click", (event) => {
    const subjectButton = event.target.closest("button[data-custom-delete-syllabus]");
    if (subjectButton) {
      event.preventDefault();
      deleteSyllabusItem(subjectButton.dataset.customDeleteSyllabus);
      return;
    }
    const disciplineButton = event.target.closest("button[data-custom-delete-discipline]");
    if (disciplineButton) {
      event.preventDefault();
      deleteDiscipline(disciplineButton.dataset.customDeleteDiscipline);
    }
  });

  ["render", "showView", "renderSyllabus", "renderSubjects", "renderImportPreview"].forEach(wrapFunction);
  window.addEventListener("hashchange", queueEnhance);
  window.addEventListener("load", queueEnhance);
  setTimeout(enhanceDeleteButtons, 0);
  setTimeout(enhanceDeleteButtons, 500);
})();
