(() => {
  "use strict";

  const VERSION = "20260809-qconcursos-assunto-coerente-v286";

  const VERIFIED_SUBJECT_ROUTES = Object.freeze([
    Object.freeze({
      discipline: "direito administrativo",
      aliases: Object.freeze([
        "conceito fontes e principios do direito administrativo",
        "conceitos fontes e principios do direito administrativo",
        "conceito fontes e principios de direito administrativo",
        "conceitos iniciais de direito administrativo historico funcoes de estado e fontes",
        "fontes do direito administrativo"
      ]),
      label: "Conceitos iniciais de Direito Administrativo - Histórico, Funções de Estado e Fontes",
      pathname: "/questoes-de-concursos/disciplinas/direito-direito-administrativo/conceitos-iniciais-de-direito-administrativo-historico-funcoes-de-estado-e-fontes/questoes"
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

  function itemTexts(item = {}) {
    return [
      item.subject,
      item.assunto,
      item.topic,
      item.topico,
      item.subtopic,
      item.subtema
    ].map(normalize).filter(Boolean);
  }

  function aliasesMatch(item = {}, entry) {
    const discipline = normalize(item.discipline || item.disciplina);
    if (!entry || entry.discipline !== discipline) return false;
    return itemTexts(item).some((text) => entry.aliases.some((alias) =>
      text === alias || text.includes(alias) || alias.includes(text)
    ));
  }

  function verifiedRoute(item = {}) {
    return VERIFIED_SUBJECT_ROUTES.find((entry) => aliasesMatch(item, entry)) || null;
  }

  function hasConfirmedExplicitSubjectId(item = {}) {
    return item.qconcursosSubjectIdConfirmed === true
      || item.qcSubjectIdConfirmed === true
      || item.subjectIdQcConfirmed === true
      || item.subject_id_qc_confirmed === true;
  }

  function fallbackSearchTerm(item = {}, route = {}) {
    const explicit = String(route.searchTerm || "").trim();
    if (explicit) return explicit;
    const subject = String(item.subject || item.assunto || item.topic || item.topico || "").trim();
    const subtopic = String(item.subtopic || item.subtema || "").trim();
    return [subject, subtopic].filter(Boolean).join(" — ");
  }

  if (typeof buildQconcursosFilterRoute !== "function") return;
  const previousBuildQconcursosFilterRoute = buildQconcursosFilterRoute;

  buildQconcursosFilterRoute = function buildQconcursosFilterRouteV286(item = {}, board = "") {
    const route = previousBuildQconcursosFilterRoute(item, board);
    const canonicalRoute = verifiedRoute(item);
    const url = new URL(route.url);

    if (canonicalRoute) {
      url.pathname = canonicalRoute.pathname;
      url.searchParams.delete("subject_ids[]");
      url.searchParams.delete("q");
      return {
        ...route,
        url: url.toString(),
        subjectIds: [],
        subjectIdSource: "canonical-qc-route",
        qcSubjectLabel: canonicalRoute.label,
        subjectCoherence: "confirmed",
        automaticFilters: {
          ...route.automaticFilters,
          subject: true,
          search: false
        }
      };
    }

    if (route.subjectIdSource === "saved" && hasConfirmedExplicitSubjectId(item)) {
      return {
        ...route,
        subjectCoherence: "confirmed-explicit-id",
        automaticFilters: {
          ...route.automaticFilters,
          subject: true,
          search: false
        }
      };
    }

    // Regra crítica: número hierárquico do QC ou ID inferido nunca pode, sozinho,
    // selecionar um assunto diferente do que está ativo no filtro do Aldus Meta.
    url.searchParams.delete("subject_ids[]");
    const searchTerm = fallbackSearchTerm(item, route);
    if (searchTerm) url.searchParams.set("q", searchTerm);
    else url.searchParams.delete("q");

    return {
      ...route,
      url: url.toString(),
      searchTerm,
      subjectIds: [],
      subjectIdSource: "coherence-text-fallback",
      qcSubjectLabel: route.subject,
      subjectCoherence: "text-fallback",
      automaticFilters: {
        ...route.automaticFilters,
        subject: false,
        search: Boolean(searchTerm)
      }
    };
  };

  Object.defineProperty(globalThis, "__aldusQconcursosSubjectCoherenceV286", {
    value: Object.freeze({ VERSION, verifiedRoute, verifiedRoutes: VERIFIED_SUBJECT_ROUTES }),
    configurable: true
  });
})();
