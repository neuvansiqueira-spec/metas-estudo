(() => {
  "use strict";

  const VERSION = "20260814-qconcursos-todas-disciplinas-v334";
  const QUESTION_PATH_PREFIX = "/questoes-de-concursos/disciplinas/";

  // Rotas públicas conferidas na taxonomia do QConcursos. O mapa inclui as
  // disciplinas simples e os nomes compostos existentes no catálogo PCPR/PCMA.
  const DIRECT_DISCIPLINE_ROUTES = Object.freeze({
    "direito administrativo": "direito-direito-administrativo",
    "direito constitucional": "direito-direito-constitucional",
    "direito penal": "direito-direito-penal",
    "direito processual penal": "direito-direito-processual-penal",
    "direito civil": "direito-direito-civil",
    "direito processual civil": "direito-direito-processual-civil-novo-codigo-de-processo-civil-cpc-2015",
    "direito agrario": "direito-direito-agrario",
    "direito ambiental": "direito-direito-ambiental",
    "direito digital": "direito-direito-digital",
    "direitos humanos": "direito-direitos-humanos",
    "direito tributario": "direito-direito-tributario",
    "direito financeiro": "direito-direito-financeiro",
    "direito eleitoral": "direito-direito-eleitoral",
    "direito do consumidor": "direito-direito-do-consumidor",
    "direito empresarial": "direito-direito-empresarial-comercial",
    "direito empresarial comercial": "direito-direito-empresarial-comercial",
    "criminologia": "direito-criminologia",
    "medicina legal": "criminalistica-medicina-legal",
    "criminalistica": "criminalistica-criminalistica",
    "administracao publica": "administracao-administracao-publica",
    "gestao publica": "administracao-administracao-publica",
    "legislacao estadual": "direito-legislacao-estadual",
    "legislacao estadual e institucional": "direito-legislacao-estadual",
    "legislacao penal e legislacao processual penal extravagante": "direito-direito-penal",
    "legislacao penal e processual penal extravagante": "direito-direito-penal",
    "legislacao penal e processual penal especial": "direito-direito-penal",
    "legislacao especifica direito penal": "direito-direito-penal",
    "legislacao especifica direito processual penal": "direito-direito-processual-penal",
    "legislacao especifica direitos humanos": "direito-direitos-humanos",
    "legislacao especifica direito constitucional": "direito-direito-constitucional",
    "legislacao especifica direito administrativo": "direito-direito-administrativo",
    "legislacao especifica direito ambiental": "direito-direito-ambiental"
  });

  const PUBLIC_MANAGEMENT_HINTS = Object.freeze([
    "gestao publica", "governanca", "planejamento", "gestao estrategica",
    "eficiencia administrativa", "gestao por resultados", "etica no servico publico"
  ]);
  const CRIMINOLOGY_HINTS = Object.freeze([
    "criminologia", "criminologico", "vitima", "vitimizacao", "controle social",
    "prevencao do delito", "prevencao da infracao", "politica criminal",
    "escola classica", "escola positiva", "teorias sociologicas", "reacao ao crime",
    "criminalidade", "criminoso cibernetico", "ambientes digitais criminogenos"
  ]);
  const MEDICINE_LEGAL_HINTS = Object.freeze([
    "medicina legal", "tanatologia", "traumatologia", "asfixiologia", "sexologia",
    "antropologia forense", "toxicologia", "odontologia legal", "psiquiatria forense",
    "cadaver", "necrops", "lesao corporal", "embriaguez", "veneno"
  ]);
  const CRIMINALISTICS_HINTS = Object.freeze([
    "criminalistica", "documentoscopia", "grafoscopia", "falsificacao", "balistica",
    "papiloscopia", "local de crime", "cadeia de custodia", "vestigio", "pericia criminal",
    "escrita", "assinatura"
  ]);

  function normalize(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("pt-BR")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }

  function unique(values) {
    return [...new Set(values.filter(Boolean))];
  }

  function itemTexts(item = {}) {
    return unique([
      item.subject, item.assunto, item.topic, item.topico,
      item.subtopic, item.subtema, item.reference, item.referencia
    ].map(normalize));
  }

  function containsAny(item = {}, hints = []) {
    const haystack = itemTexts(item).join(" ");
    return hints.some((hint) => haystack.includes(hint));
  }

  function resolveDisciplineRoute(item = {}) {
    const discipline = normalize(item.discipline || item.disciplina);
    if (!discipline) return { slug: "", source: "missing-discipline" };

    if (discipline === "direito administrativo e gestao publica") {
      const publicManagement = containsAny(item, PUBLIC_MANAGEMENT_HINTS);
      return {
        slug: publicManagement ? "administracao-administracao-publica" : "direito-direito-administrativo",
        source: publicManagement ? "catalog-public-management-v334" : "catalog-administrative-law-v334"
      };
    }

    if (discipline === "ciencias forenses") {
      if (containsAny(item, CRIMINOLOGY_HINTS)) {
        return { slug: "direito-criminologia", source: "catalog-criminology-v334" };
      }
      if (containsAny(item, MEDICINE_LEGAL_HINTS)) {
        return { slug: "criminalistica-medicina-legal", source: "catalog-medicine-legal-v334" };
      }
      if (containsAny(item, CRIMINALISTICS_HINTS)) {
        return { slug: "criminalistica-criminalistica", source: "catalog-criminalistics-v334" };
      }
      return { slug: "criminalistica-criminalistica", source: "catalog-forensics-default-v334" };
    }

    const slug = DIRECT_DISCIPLINE_ROUTES[discipline] || "";
    return { slug, source: slug ? "catalog-direct-discipline-v334" : "unmapped-discipline" };
  }

  function isNumericReference(value = "") {
    return /^\d+(?:\.\d+)*$/.test(String(value || "").trim());
  }

  function cleanSearchTerm(item = {}, route = {}) {
    const subject = String(item.subject || item.assunto || item.topic || item.topico || route.subject || "").trim();
    const rawSubtopic = String(item.subtopic || item.subtema || "").trim();
    const parts = [subject];
    if (rawSubtopic && !isNumericReference(rawSubtopic) && normalize(rawSubtopic) !== normalize(subject)) {
      parts.push(rawSubtopic);
    }
    return parts.filter(Boolean).join(" — ");
  }

  function hasConfirmedNativeSubject(route = {}) {
    if (!route.url || route.automaticFilters?.subject !== true) return false;
    try {
      const url = new URL(route.url);
      return !url.searchParams.get("q") && (
        url.searchParams.getAll("subject_ids[]").length > 0
        || (url.pathname.startsWith(QUESTION_PATH_PREFIX) && url.pathname.split("/").filter(Boolean).length >= 5)
      );
    } catch {
      return false;
    }
  }

  function repairRoute(route = {}, item = {}) {
    if (!route.url) return route;
    const resolution = resolveDisciplineRoute(item);
    if (!resolution.slug) return route;

    const url = new URL(route.url);
    const nativeSubject = hasConfirmedNativeSubject(route);
    const searchTerm = cleanSearchTerm(item, route);

    if (!nativeSubject) {
      url.pathname = `${QUESTION_PATH_PREFIX}${resolution.slug}/questoes`;
      url.searchParams.delete("discipline_ids[]");
      url.searchParams.delete("subject_ids[]");
      if (searchTerm) url.searchParams.set("q", searchTerm);
      else url.searchParams.delete("q");
    }

    return {
      ...route,
      url: url.toString(),
      searchTerm: nativeSubject ? route.searchTerm : searchTerm,
      disciplineRouteSource: resolution.source,
      catalogCoverageVersion: VERSION,
      qcLinkStatus: nativeSubject ? (route.qcLinkStatus || "direct") : "text",
      qcLinkStatusLabel: nativeSubject
        ? (route.qcLinkStatusLabel || "✅ Assunto QC vinculado")
        : "🔎 Disciplina e assunto aplicados automaticamente",
      automaticFilters: {
        ...route.automaticFilters,
        discipline: true,
        subject: nativeSubject,
        search: nativeSubject ? false : Boolean(searchTerm)
      }
    };
  }

  if (typeof buildQconcursosFilterRoute !== "function") return;
  const previousBuildQconcursosFilterRoute = buildQconcursosFilterRoute;
  buildQconcursosFilterRoute = function buildQconcursosFilterRouteV334(item = {}, board = "") {
    return repairRoute(previousBuildQconcursosFilterRoute(item, board), item);
  };

  function refreshVisibleRoute() {
    try {
      if (typeof renderQconcursosFilterRoute === "function") renderQconcursosFilterRoute();
    } catch (error) {
      console.warn("[Aldus Meta] Não foi possível atualizar os filtros integrais do QConcursos na V334.", error);
    }
  }

  if (typeof queueMicrotask === "function") queueMicrotask(refreshVisibleRoute);
  else if (typeof setTimeout === "function") setTimeout(refreshVisibleRoute, 0);

  Object.defineProperty(globalThis, "__aldusQconcursosAllFiltersV334", {
    value: Object.freeze({
      VERSION,
      directDisciplineRoutes: DIRECT_DISCIPLINE_ROUTES,
      resolveDisciplineRoute,
      cleanSearchTerm,
      hasConfirmedNativeSubject,
      repairRoute
    }),
    configurable: true
  });
})();
