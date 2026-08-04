(function (root, factory) {
  "use strict";

  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.AldusSimuladosOperational = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const DISCIPLINE = "SIMULADOS";
  const LEGACY_DISCIPLINE_ID = "disciplina-operacional-simulados";
  const STUDY_OPTION_ID = "operacional-simulados";
  const SUBJECT_OPTION_ID = "operacional-simulados-realizacao";
  const SUBJECT = "Realização de simulado";

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

  function removeLegacyInjectedSubject(targetState) {
    if (!targetState || typeof targetState !== "object" || !Array.isArray(targetState.subjects)) {
      return { changed: false, removed: 0 };
    }
    const before = targetState.subjects.length;
    targetState.subjects = targetState.subjects.filter((subject) => !isLegacyInjectedSubject(subject));
    const removed = before - targetState.subjects.length;
    if (removed) {
      targetState.migrations ||= {};
      targetState.migrations.simuladosOperationalDecoupledV234 = {
        executedAt: new Date().toISOString(),
        removedSubjects: removed,
        preservedStudies: Array.isArray(targetState.studies) ? targetState.studies.filter((study) => isOperationalDiscipline(study.discipline || study.disciplina)).length : 0,
        preservedGoals: Array.isArray(targetState.dailyGoals) ? targetState.dailyGoals.filter((goal) => isOperationalDiscipline(goal.discipline || goal.disciplina)).length : 0
      };
    }
    return { changed: removed > 0, removed };
  }

  return Object.freeze({
    DISCIPLINE,
    LEGACY_DISCIPLINE_ID,
    STUDY_OPTION_ID,
    SUBJECT_OPTION_ID,
    SUBJECT,
    isOperationalDiscipline,
    isOperationalSubject,
    isLegacyInjectedSubject,
    removeLegacyInjectedSubject
  });
});
