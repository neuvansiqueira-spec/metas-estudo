(() => {
  "use strict";

  const VERSION = "20260826-factory-lc259-link-v398";
  const WRAP_MARKER = "__aldusFactoryLc259LinkV398";
  const LC259_MARKERS = [
    "lei complementar estadual n 259",
    "lei complementar estadual no 259",
    "lei complementar estadual 259"
  ];

  if (globalThis.__ALDUS_FACTORY_LC259_LINK_V398__?.version === VERSION) return;

  const canonical = (value) => String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  function itemOf(entry = {}) {
    return entry?.item && typeof entry.item === "object" ? entry.item : entry;
  }

  function first(...values) {
    return values.find((value) => String(value || "").trim()) || "";
  }

  function subjectOf(record = {}) {
    return canonical(first(
      record.baseSubject,
      record.subject,
      record.assunto,
      record.tema,
      record.topic,
      record.topico,
      record.title,
      record.titulo,
      record.name,
      record.nome
    ));
  }

  function disciplineOf(record = {}) {
    return canonical(first(record.discipline, record.disciplina));
  }

  function isLc259(record = {}) {
    const text = `${disciplineOf(record)} ${subjectOf(record)}`.trim();
    return LC259_MARKERS.some((marker) => text.includes(marker));
  }

  function sameDiscipline(left = {}, right = {}) {
    const a = disciplineOf(left);
    const b = disciplineOf(right);
    return !a || !b || a === b;
  }

  function semanticCandidates(goal, agenda = []) {
    if (!isLc259(goal) || !Array.isArray(agenda)) return [];
    const candidates = agenda
      .map(itemOf)
      .filter((item) => item && isLc259(item) && sameDiscipline(goal, item));

    if (candidates.length <= 1) return candidates;

    const goalSubject = subjectOf(goal);
    const exact = candidates.filter((item) => subjectOf(item) === goalSubject);
    if (exact.length === 1) return exact;

    const contained = candidates.filter((item) => {
      const itemSubject = subjectOf(item);
      return itemSubject && goalSubject && (itemSubject.includes(goalSubject) || goalSubject.includes(itemSubject));
    });
    return contained.length === 1 ? contained : [];
  }

  function install() {
    const current = globalThis.exactFactoryGoalMatches;
    if (typeof current !== "function") return false;
    if (current[WRAP_MARKER] === VERSION) return true;

    const wrapped = function(goal, agenda, ...rest) {
      const result = current.call(this, goal, agenda, ...rest);
      if (result?.items?.length) return result;
      const candidates = semanticCandidates(goal, agenda);
      if (candidates.length !== 1) return result;
      return {
        ...(result && typeof result === "object" ? result : {}),
        items: candidates,
        mode: "lc259-semantic-v398"
      };
    };

    Object.defineProperty(wrapped, WRAP_MARKER, { value: VERSION });
    Object.defineProperty(wrapped, "__aldusOriginal", { value: current });
    globalThis.exactFactoryGoalMatches = wrapped;
    return true;
  }

  function installWhenReady() {
    install();
  }

  installWhenReady();
  if (typeof window !== "undefined") {
    window.addEventListener("aldus:bootstrap-integrity-v258-ready", installWhenReady, { once: true });
    window.addEventListener("aldus:post-bootstrap-maintenance-complete", installWhenReady, { once: true });
    window.addEventListener("aldus:bootstrap-ready", installWhenReady, { once: true });
    window.addEventListener("load", installWhenReady, { once: true });
  }

  globalThis.__ALDUS_FACTORY_LC259_LINK_V398__ = Object.freeze({
    version: VERSION,
    readOnly: true,
    install,
    isLc259,
    semanticCandidates
  });

  if (typeof module !== "undefined" && module.exports) {
    module.exports = { VERSION, canonical, itemOf, subjectOf, disciplineOf, isLc259, sameDiscipline, semanticCandidates, install };
  }
})();
