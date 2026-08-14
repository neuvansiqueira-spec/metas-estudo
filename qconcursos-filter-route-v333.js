(() => {
  "use strict";

  const VERSION = "20260814-restaura-filtros-qconcursos-v333";
  const AGRARIAN_FOUNDATIONS_PATH = "/questoes-de-concursos/disciplinas/direito-direito-agrario/nocoes-fundamentais-de-direito-agrario/questoes";
  const DISCIPLINE_PATHS = Object.freeze({
    "direito administrativo": "direito-direito-administrativo",
    "direito constitucional": "direito-direito-constitucional",
    "direito penal": "direito-direito-penal",
    "direito processual penal": "direito-direito-processual-penal",
    "direito civil": "direito-direito-civil",
    "direito tributario": "direito-direito-tributario",
    "direito financeiro": "direito-direito-financeiro",
    "direito eleitoral": "direito-direito-eleitoral",
    "direito do consumidor": "direito-direito-do-consumidor",
    "direito empresarial": "direito-direito-empresarial-comercial",
    "direito processual civil": "direito-direito-processual-civil-novo-codigo-de-processo-civil-cpc-2015",
    "direito ambiental": "direito-direito-ambiental",
    "direito agrario": "direito-direito-agrario",
    "direito digital": "direito-direito-digital",
    "direitos humanos": "direito-direitos-humanos",
    "criminologia": "direito-criminologia",
    "medicina legal": "criminalistica-medicina-legal",
    "criminalistica": "criminalistica-criminalistica",
    "administracao publica": "administracao-administracao-publica",
    "gestao publica": "administracao-administracao-publica"
  });

  function normalize(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("pt-BR")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }

  function itemTexts(item = {}) {
    return [item.subject, item.assunto, item.topic, item.topico, item.subtopic, item.subtema]
      .map(normalize)
      .filter(Boolean);
  }

  function isAgrarianFoundations(item = {}) {
    if (normalize(item.discipline || item.disciplina) !== "direito agrario") return false;
    const aliases = [
      "teoria geral do direito agrario origem conceito e principios",
      "origem conceito e principios do direito agrario",
      "nocoes fundamentais de direito agrario"
    ];
    return itemTexts(item).some((text) => aliases.some((alias) => text === alias || text.includes(alias) || alias.includes(text)));
  }

  function disciplineSlug(item = {}) {
    return DISCIPLINE_PATHS[normalize(item.discipline || item.disciplina)] || "";
  }

  function removeNumericReferenceFromSearch(url, item = {}) {
    const rawSubtopic = String(item.subtopic || item.subtema || "").trim();
    if (!/^\d+(?:\.\d+)*$/.test(rawSubtopic)) return;
    const subject = String(item.subject || item.assunto || item.topic || item.topico || "").trim();
    if (subject) url.searchParams.set("q", subject);
  }

  function repairRoute(route = {}, item = {}) {
    if (!route.url) return route;
    const url = new URL(route.url);
    removeNumericReferenceFromSearch(url, item);

    if (isAgrarianFoundations(item)) {
      url.pathname = AGRARIAN_FOUNDATIONS_PATH;
      url.searchParams.delete("q");
      url.searchParams.delete("discipline_ids[]");
      url.searchParams.delete("subject_ids[]");
      return {
        ...route,
        url: url.toString(),
        searchTerm: String(item.subject || item.assunto || item.topic || item.topico || "").trim(),
        qcSubjectLabel: "Noções Fundamentais de Direito Agrário",
        subjectIds: [],
        subjectIdSource: "verified-canonical-subject-route-v333",
        subjectRouteSource: "verified-canonical-subject-route-v333",
        subjectCoherence: "confirmed-canonical-route",
        qcLinkStatus: "direct",
        qcLinkStatusLabel: "✅ Assunto QC vinculado",
        automaticFilters: {
          ...route.automaticFilters,
          discipline: true,
          subject: true,
          search: false
        }
      };
    }

    const slug = disciplineSlug(item);
    if (slug && route.automaticFilters?.discipline !== true) {
      url.pathname = `/questoes-de-concursos/disciplinas/${slug}/questoes`;
      url.searchParams.delete("discipline_ids[]");
      return {
        ...route,
        url: url.toString(),
        disciplineRouteSource: "verified-discipline-route-v333",
        automaticFilters: {
          ...route.automaticFilters,
          discipline: true
        }
      };
    }

    return url.toString() === route.url ? route : { ...route, url: url.toString() };
  }

  if (typeof buildQconcursosFilterRoute !== "function") return;
  const previousBuildQconcursosFilterRoute = buildQconcursosFilterRoute;
  buildQconcursosFilterRoute = function buildQconcursosFilterRouteV333(item = {}, board = "") {
    return repairRoute(previousBuildQconcursosFilterRoute(item, board), item);
  };

  function refreshVisibleRoute() {
    try {
      if (typeof renderQconcursosFilterRoute === "function") renderQconcursosFilterRoute();
    } catch (error) {
      console.warn("[Aldus Meta] Não foi possível atualizar o link do QConcursos na V333.", error);
    }
  }

  if (typeof queueMicrotask === "function") queueMicrotask(refreshVisibleRoute);
  else if (typeof setTimeout === "function") setTimeout(refreshVisibleRoute, 0);

  Object.defineProperty(globalThis, "__aldusQconcursosFilterRouteV333", {
    value: Object.freeze({ VERSION, repairRoute, isAgrarianFoundations, disciplineSlug }),
    configurable: true
  });
})();
