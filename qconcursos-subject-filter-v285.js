(() => {
  "use strict";

  const VERSION = "20260809-qconcursos-assunto-automatico-v285";

  const VERIFIED_SUBJECTS = Object.freeze([
    Object.freeze({
      discipline: "direito administrativo",
      qcNumber: "1",
      aliases: Object.freeze([
        "conceito fontes e principios do direito administrativo",
        "conceitos fontes e principios do direito administrativo",
        "conceito fontes e principios de direito administrativo",
        "conceitos iniciais de direito administrativo historico funcoes de estado e fontes",
        "fontes do direito administrativo"
      ]),
      ids: Object.freeze(["15940"]),
      label: "Conceitos iniciais de Direito Administrativo - Histórico, Funções de Estado e Fontes"
    })
  ]);

  function normalize(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("pt-BR")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }

  function numericIds(value) {
    const values = Array.isArray(value) ? value : [value];
    const output = [];
    values.flatMap((entry) => String(entry ?? "").split(/[;,|\s]+/)).forEach((entry) => {
      const id = entry.trim();
      if (/^\d+$/.test(id) && !output.includes(id)) output.push(id);
    });
    return output;
  }

  function idsFromStoredUrl(item = {}) {
    const stored = item.qconcursosUrl || item.qcUrl || item.qconcursosFilterUrl || item.qcFilterUrl || "";
    if (!stored) return [];
    try {
      return numericIds(new URL(stored).searchParams.getAll("subject_ids[]"));
    } catch {
      return [];
    }
  }

  function explicitSubjectIds(item = {}) {
    return numericIds([
      ...(Array.isArray(item.qconcursosSubjectIds) ? item.qconcursosSubjectIds : [item.qconcursosSubjectIds]),
      ...(Array.isArray(item.qcSubjectIds) ? item.qcSubjectIds : [item.qcSubjectIds]),
      item.qconcursosSubjectId,
      item.qcSubjectId,
      item.subjectIdQc,
      item.subject_id_qc,
      ...idsFromStoredUrl(item)
    ]);
  }

  function verifiedSubject(item = {}) {
    const discipline = normalize(item.discipline || item.disciplina);
    const qcNumber = String(item.qconcursosNumber || item.qcSubjectNumber || item.qcNumber || "").trim();
    const texts = [
      item.subject,
      item.assunto,
      item.topic,
      item.topico,
      item.subtopic,
      item.subtema
    ].map(normalize).filter(Boolean);

    return VERIFIED_SUBJECTS.find((entry) => {
      if (entry.discipline !== discipline) return false;
      if (qcNumber && entry.qcNumber === qcNumber) return true;
      return texts.some((text) => entry.aliases.some((alias) => text === alias || text.includes(alias) || alias.includes(text)));
    }) || null;
  }

  function resolveSubject(item = {}) {
    const explicit = explicitSubjectIds(item);
    if (explicit.length) return { ids: explicit, source: "saved", label: "" };
    const verified = verifiedSubject(item);
    if (verified) return { ids: [...verified.ids], source: "verified-map", label: verified.label };
    return { ids: [], source: "text-fallback", label: "" };
  }

  if (typeof buildQconcursosFilterRoute !== "function") return;
  const previousBuildQconcursosFilterRoute = buildQconcursosFilterRoute;

  buildQconcursosFilterRoute = function buildQconcursosFilterRouteV285(item = {}, board = "") {
    const route = previousBuildQconcursosFilterRoute(item, board);
    const resolution = resolveSubject(item);
    if (!resolution.ids.length) {
      return {
        ...route,
        subjectIds: [],
        subjectIdSource: resolution.source,
        automaticFilters: { ...route.automaticFilters, subject: false }
      };
    }

    const url = new URL(route.url);
    url.searchParams.delete("q");
    url.searchParams.delete("subject_ids[]");
    resolution.ids.forEach((id) => url.searchParams.append("subject_ids[]", id));

    return {
      ...route,
      url: url.toString(),
      subjectIds: [...resolution.ids],
      subjectIdSource: resolution.source,
      qcSubjectLabel: resolution.label || route.subject,
      automaticFilters: {
        ...route.automaticFilters,
        subject: true,
        search: false
      }
    };
  };

  Object.defineProperty(globalThis, "__aldusQconcursosSubjectFilterV285", {
    value: Object.freeze({ VERSION, resolveSubject, verifiedSubjects: VERIFIED_SUBJECTS }),
    configurable: true
  });
})();
