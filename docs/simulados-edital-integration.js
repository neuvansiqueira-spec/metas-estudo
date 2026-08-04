(function (root, factory) {
  "use strict";

  const api = factory(root);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.AldusSimuladosOperational = api;
  if (root?.document) api.installRuntimeExclusion();
})(typeof globalThis !== "undefined" ? globalThis : this, function (root) {
  "use strict";

  const VERSION = "20260804-simulados-sem-fabrica-cache-unico-v236";
  const DISCIPLINE = "SIMULADOS";
  const LEGACY_DISCIPLINE_ID = "disciplina-operacional-simulados";
  const STUDY_OPTION_ID = "operacional-simulados";
  const SUBJECT_OPTION_ID = "operacional-simulados-realizacao";
  const SUBJECT = "Realização de simulado";
  const WRAP_FLAG = "__aldusSimuladosFactoryExclusionV236";
  let installTimer = null;

  function normalize(value) {
    return String(value ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toLocaleLowerCase("pt-BR");
  }

  function isOperationalDiscipline(value) {
    if (value && typeof value === "object") {
      return [value.name, value.nome, value.discipline, value.disciplina, value.label, value.title]
        .some((candidate) => normalize(candidate) === "simulados");
    }
    return normalize(value) === "simulados" || value === STUDY_OPTION_ID || value === LEGACY_DISCIPLINE_ID;
  }

  function isOperationalSubject(value) {
    return value === SUBJECT_OPTION_ID || normalize(value) === normalize(SUBJECT);
  }

  function isLegacyInjectedSubject(subject) {
    if (!subject || typeof subject !== "object") return false;
    const explicitlyInjected = subject.id === LEGACY_DISCIPLINE_ID
      || subject.operational === true
      || subject.isOperational === true
      || subject.isPseudoDiscipline === true
      || subject.linkedView === "simulados";
    return explicitlyInjected && isOperationalDiscipline(subject);
  }

  function entryReferencesOperationalSimulados(entry, seen = new WeakSet()) {
    if (!entry) return false;
    if (Array.isArray(entry)) return entry.some((item) => entryReferencesOperationalSimulados(item, seen));
    if (typeof entry !== "object") return isOperationalDiscipline(entry) || isOperationalSubject(entry);
    if (seen.has(entry)) return false;
    seen.add(entry);

    if (
      isOperationalDiscipline(entry)
      || isOperationalDiscipline(entry.discipline)
      || isOperationalDiscipline(entry.disciplina)
      || isOperationalSubject(entry.subject)
      || isOperationalSubject(entry.assunto)
      || entry.id === LEGACY_DISCIPLINE_ID
      || entry.syllabusItemId === LEGACY_DISCIPLINE_ID
      || entry.studyOptionId === STUDY_OPTION_ID
      || entry.subjectOptionId === SUBJECT_OPTION_ID
    ) return true;

    return [entry.goal, entry.goals, entry.item, entry.items, entry.entry, entry.entries]
      .some((value) => entryReferencesOperationalSimulados(value, seen));
  }

  function filterFactoryEntries(entries) {
    if (!Array.isArray(entries)) return entries;
    return entries.filter((entry) => !entryReferencesOperationalSimulados(entry));
  }

  function removeLegacyInjectedSubject(targetState) {
    if (!targetState || typeof targetState !== "object" || !Array.isArray(targetState.subjects)) {
      return { changed: false, removed: 0 };
    }
    const before = targetState.subjects.length;
    targetState.subjects = targetState.subjects.filter((subject) => !isLegacyInjectedSubject(subject));
    const removed = before - targetState.subjects.length;
    if (removed) {
      targetState.migrations ||= {};
      const migration = {
        version: VERSION,
        executedAt: new Date().toISOString(),
        removedSubjects: removed,
        preservedStudies: Array.isArray(targetState.studies)
          ? targetState.studies.filter((study) => isOperationalDiscipline(study.discipline || study.disciplina)).length
          : 0,
        preservedGoals: Array.isArray(targetState.dailyGoals)
          ? targetState.dailyGoals.filter((goal) => isOperationalDiscipline(goal.discipline || goal.disciplina)).length
          : 0
      };
      targetState.migrations.simuladosOperationalDecoupledV234 = migration;
      targetState.migrations.simuladosOperationalDecoupledV236 = migration;
    }
    return { changed: removed > 0, removed };
  }

  function currentState() {
    try {
      if (typeof state !== "undefined" && state && typeof state === "object") return state;
    } catch {}
    try {
      return root?.state && typeof root.state === "object" ? root.state : null;
    } catch {
      return null;
    }
  }

  function cleanOperationalSubject() {
    const targetState = currentState();
    if (!targetState) return { changed: false, removed: 0 };
    return removeLegacyInjectedSubject(targetState);
  }

  function wrapFunction(name, createWrapper) {
    const original = root?.[name];
    if (typeof original !== "function" || original[WRAP_FLAG]) return false;
    const wrapped = createWrapper(original);
    Object.defineProperty(wrapped, WRAP_FLAG, { value: true });
    Object.defineProperty(wrapped, "__aldusOriginal", { value: original });
    root[name] = wrapped;
    return true;
  }

  function removeVisibleFactoryResidue() {
    const view = root.document?.querySelector?.('#view-fabrica-resumos, [data-view="fabrica-resumos"]');
    if (!view) return 0;
    const selectors = [
      ".factory-card",
      ".factory-topic-card",
      ".factory-item",
      ".factory-queue-item",
      "[data-factory-entry]",
      "[data-factory-item]",
      ".factory-list > li",
      ".factory-table tbody > tr"
    ];
    let removed = 0;
    view.querySelectorAll(selectors.join(",")).forEach((node) => {
      const text = normalize(node.textContent);
      if (text.includes("simulados") && /(material|resumo|produzir|pendente|fabrica)/.test(text)) {
        node.remove();
        removed += 1;
      }
    });
    return removed;
  }

  function installFactoryExclusion() {
    cleanOperationalSubject();
    let installed = false;

    installed = wrapFunction("exactFactoryGoalMatches", (original) => function exactFactoryGoalMatchesWithoutSimulados(goal, ...args) {
      if (entryReferencesOperationalSimulados(goal)) {
        return { items: [], mode: "operational-simulados-excluded-v236" };
      }
      return original.call(this, goal, ...args);
    }) || installed;

    for (const name of ["ensureFactoryAgenda", "factoryGoalGroupsForDate", "factoryQueueForDate", "factoryDoNowQueue"]) {
      installed = wrapFunction(name, (original) => function factoryCollectionWithoutSimulados(...args) {
        return filterFactoryEntries(original.apply(this, args));
      }) || installed;
    }

    installed = wrapFunction("factoryResumoAulaPending", (original) => function factoryResumoAulaPendingWithoutSimulados(entry, ...args) {
      if (entryReferencesOperationalSimulados(entry)) return false;
      return original.call(this, entry, ...args);
    }) || installed;

    installed = wrapFunction("renderFactory", (original) => function renderFactoryWithoutSimulados(...args) {
      cleanOperationalSubject();
      const result = original.apply(this, args);
      removeVisibleFactoryResidue();
      return result;
    }) || installed;

    installed = wrapFunction("replaceState", (original) => function replaceStateWithoutOperationalSubject(...args) {
      const result = original.apply(this, args);
      cleanOperationalSubject();
      installFactoryExclusion();
      return result;
    }) || installed;

    return installed;
  }

  function installRuntimeExclusion() {
    if (!root?.document) return false;
    cleanOperationalSubject();
    installFactoryExclusion();

    if (!installTimer) {
      let attempts = 0;
      installTimer = root.setInterval(() => {
        attempts += 1;
        cleanOperationalSubject();
        installFactoryExclusion();
        if (attempts >= 200) {
          root.clearInterval(installTimer);
          installTimer = null;
        }
      }, 100);
    }

    root.addEventListener?.("hashchange", () => {
      cleanOperationalSubject();
      installFactoryExclusion();
      if (root.location?.hash === "#fabrica-resumos") root.setTimeout(removeVisibleFactoryResidue, 0);
    });

    root.document.addEventListener?.("DOMContentLoaded", () => {
      cleanOperationalSubject();
      installFactoryExclusion();
    }, { once: true });

    root.__ALDUS_SIMULADOS_FACTORY_EXCLUSION_V236__ = Object.freeze({
      version: VERSION,
      discipline: DISCIPLINE,
      installedAt: new Date().toISOString()
    });
    return true;
  }

  return Object.freeze({
    VERSION,
    DISCIPLINE,
    LEGACY_DISCIPLINE_ID,
    STUDY_OPTION_ID,
    SUBJECT_OPTION_ID,
    SUBJECT,
    isOperationalDiscipline,
    isOperationalSubject,
    isLegacyInjectedSubject,
    entryReferencesOperationalSimulados,
    filterFactoryEntries,
    removeLegacyInjectedSubject,
    installFactoryExclusion,
    installRuntimeExclusion
  });
});
