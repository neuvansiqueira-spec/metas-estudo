(() => {
  "use strict";

  const RUNTIME_KEY = "__metasTimerMaterialLinkFixV40";
  if (globalThis[RUNTIME_KEY]) return;
  globalThis[RUNTIME_KEY] = true;

  function normalizedText(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toLowerCase();
  }

  function currentTimerGoal() {
    try {
      if (typeof floatingTimerGoal === "function") {
        const goal = floatingTimerGoal();
        if (goal) return goal;
      }
    } catch (error) {}
    try {
      if (typeof floatingTimer !== "undefined" && typeof state !== "undefined") {
        return (state.dailyGoals || []).find((goal) => goal.id === floatingTimer.goalId) || null;
      }
    } catch (error) {}
    return null;
  }

  function materialIdentity(material = {}) {
    try {
      if (typeof dailyGoalMaterialIdentity === "function") return dailyGoalMaterialIdentity(material);
    } catch (error) {}
    try {
      if (typeof materialPhysicalFileIdentity === "function") return materialPhysicalFileIdentity(material);
    } catch (error) {}
    return String(
      material.id || material.materialId || material.factoryMaterialId || material.link ||
      [material.title || material.titulo, material.discipline || material.disciplina, material.subject || material.assunto].join("|")
    );
  }

  function materialValue(material = {}) {
    return String(material.id || material.materialId || material.factoryMaterialId || material.link || materialIdentity(material));
  }

  function materialLabel(material = {}) {
    const title = material.title || material.titulo || material.name || material.nome || material.moduleTitle || material.factoryModuleLabel || material.link || "Material disponível";
    const source = material.source === "factory"
      ? "Fábrica de Resumos"
      : (material.origin || material.origem || "");
    return source ? `${title} — ${source}` : title;
  }

  function selectedSyllabusItemId(discipline, subject, goal) {
    if (goal?.syllabusItemId) return goal.syllabusItemId;
    try {
      if (typeof state === "undefined") return "";
      return (state.syllabusItems || []).find((item) =>
        normalizedText(item.discipline || item.disciplina) === normalizedText(discipline) &&
        normalizedText(item.subject || item.assunto) === normalizedText(subject)
      )?.id || "";
    } catch (error) {
      return "";
    }
  }

  function fallbackMaterials(discipline, subject, syllabusItemId) {
    try {
      if (typeof state === "undefined") return [];
      return (state.materials || []).filter((material) => {
        if (material.available === false || material.disponivel === false) return false;
        const ids = [material.syllabusItemId, ...(Array.isArray(material.syllabusItemIds) ? material.syllabusItemIds : [])].filter(Boolean);
        if (syllabusItemId && ids.includes(syllabusItemId)) return true;
        return normalizedText(material.discipline || material.disciplina) === normalizedText(discipline) &&
          normalizedText(material.subject || material.assunto) === normalizedText(subject);
      });
    } catch (error) {
      return [];
    }
  }

  function resolvedTimerMaterials() {
    const goal = currentTimerGoal();
    const discipline = document.getElementById("timerStudyDiscipline")?.value || goal?.discipline || "";
    const subject = document.getElementById("timerStudySubject")?.value || goal?.subject || "";
    const syllabusItemId = selectedSyllabusItemId(discipline, subject, goal);
    let materials = [];
    try {
      if (typeof resolveAvailableMaterials === "function") {
        materials = resolveAvailableMaterials({ discipline, subject, syllabusItemId }) || [];
      }
    } catch (error) {
      console.warn("[Cronômetro] Não foi possível consultar a fonte central de materiais.", error);
    }
    if (!Array.isArray(materials) || !materials.length) materials = fallbackMaterials(discipline, subject, syllabusItemId);

    const unique = new Map();
    materials.forEach((material) => {
      if (!material || typeof material !== "object" || material.available === false || material.disponivel === false) return;
      const identity = materialIdentity(material) || materialValue(material);
      const existing = unique.get(identity);
      if (!existing || (!existing.estimatedMinutes && material.estimatedMinutes)) unique.set(identity, material);
    });
    return [...unique.values()];
  }

  function preferredMaterialValues(goal, currentValue) {
    const values = [currentValue, goal?.estimateSourceId, goal?.materialId, goal?.material];
    try {
      if (typeof floatingTimer !== "undefined") values.push(floatingTimer.material);
    } catch (error) {}
    return values.filter(Boolean).map(String);
  }

  function populateTimerMaterialOptions() {
    const modal = document.getElementById("timerStudyModal");
    const select = document.getElementById("timerStudyMaterial");
    if (!modal || modal.hidden || !select) return 0;

    const goal = currentTimerGoal();
    const previousValue = select.value || "";
    const preferred = new Set(preferredMaterialValues(goal, previousValue));
    const materials = resolvedTimerMaterials();

    const options = [new Option("Sem material vinculado", "")];
    materials.forEach((material) => {
      const option = new Option(materialLabel(material), materialValue(material));
      option.dataset.materialIdentity = materialIdentity(material);
      options.push(option);
    });
    select.replaceChildren(...options);

    const directMatch = options.find((option) => preferred.has(option.value));
    if (directMatch) select.value = directMatch.value;
    else if (materials.length) select.value = materialValue(materials[0]);
    else select.value = "";

    select.dataset.timerMaterialResolvedV40 = "true";
    select.dataset.timerMaterialCount = String(materials.length);
    return materials.length;
  }

  let refreshTimer = null;
  function scheduleMaterialRefresh(delay = 0) {
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(() => {
      try { populateTimerMaterialOptions(); }
      catch (error) { console.warn("[Cronômetro] Falha ao atualizar materiais vinculados.", error); }
    }, delay);
  }

  function installTimerMaterialLinkFix() {
    document.addEventListener("click", (event) => {
      if (event.target?.closest?.('[data-timer-action="save"]')) scheduleMaterialRefresh(30);
    }, true);
    document.addEventListener("change", (event) => {
      if (["timerStudyDiscipline", "timerStudySubject"].includes(event.target?.id)) scheduleMaterialRefresh(0);
    }, true);

    const modal = document.getElementById("timerStudyModal");
    if (modal && typeof MutationObserver !== "undefined") {
      const observer = new MutationObserver(() => scheduleMaterialRefresh(0));
      observer.observe(modal, { attributes: true, attributeFilter: ["hidden"] });
    }
    setTimeout(() => scheduleMaterialRefresh(0), 250);
  }

  globalThis.MetasTimerMaterialLinkFix = Object.freeze({
    normalizedText,
    materialIdentity,
    materialValue,
    materialLabel,
    resolvedTimerMaterials,
    populateTimerMaterialOptions,
    installTimerMaterialLinkFix
  });

  if (typeof document !== "undefined") installTimerMaterialLinkFix();
})();
