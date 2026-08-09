(() => {
  "use strict";

  const VERSION = "20260809-qconcursos-mapeamento-ampliado-v290";

  // IDs abaixo só são usados quando a equivalência com o QConcursos foi
  // confirmada. A numeração hierárquica do QC nunca é tratada como subject_id.
  const VERIFIED_EQUIVALENCES = Object.freeze([
    Object.freeze({
      discipline: "direito constitucional",
      aliases: Object.freeze([
        "direitos individuais e coletivos",
        "direitos e deveres individuais e coletivos",
        "dos direitos e deveres individuais e coletivos",
        "direitos individuais"
      ]),
      subjectIds: Object.freeze(["16321"]),
      qcLabel: "Direitos Individuais"
    })
  ]);

  // Slugs de disciplinas conferidos na taxonomia pública atual do QConcursos.
  // O mapa explícito evita fabricar caminhos para disciplinas especiais.
  const VERIFIED_DISCIPLINE_ROUTES = Object.freeze({
    "direito administrativo": "direito-direito-administrativo",
    "direito penal": "direito-direito-penal",
    "direito processual penal": "direito-direito-processual-penal",
    "direito constitucional": "direito-direito-constitucional",
    "direito civil": "direito-direito-civil",
    "direito tributario": "direito-direito-tributario",
    "direito financeiro": "direito-direito-financeiro",
    "direito eleitoral": "direito-direito-eleitoral",
    "direito do consumidor": "direito-direito-do-consumidor",
    "direito empresarial": "direito-direito-empresarial-comercial",
    "direito empresarial comercial": "direito-direito-empresarial-comercial",
    "direito processual civil": "direito-direito-processual-civil-novo-codigo-de-processo-civil-cpc-2015",
    "direito ambiental": "direito-direito-ambiental",
    "direito agrario": "direito-direito-agrario",
    "direito digital": "direito-direito-digital",
    "direitos humanos": "direito-direitos-humanos",
    "criminologia": "direito-criminologia",
    "medicina legal": "criminalistica-medicina-legal",
    "criminalistica": "criminalistica-criminalistica",
    "administracao publica": "administracao-administracao-publica",
    "gestao publica": "administracao-administracao-publica",
    "legislacao especifica direito penal": "direito-direito-penal",
    "legislacao especifica direito constitucional": "direito-direito-constitucional",
    "legislacao especifica direito administrativo": "direito-direito-administrativo",
    "legislacao especifica direito ambiental": "direito-direito-ambiental"
  });

  // Exceções em que o slug canônico do assunto não é uma simples versão
  // normalizada do rótulo auditado.
  const VERIFIED_SUBJECT_SLUGS = Object.freeze({
    "direito-direito-constitucional|poder constituinte": "poder-constituinte-originario-derivado-e-decorrente-reforma-emendas-e-revisao-e-mutacao-da-constituicao"
  });

  const PUBLIC_MANAGEMENT_HINTS = Object.freeze([
    "gestao publica",
    "governanca",
    "governabilidade",
    "accountability",
    "politicas publicas",
    "gestao por resultados",
    "governo eletronico",
    "administracao publica gerencial",
    "nova gestao publica",
    "modelos teoricos de administracao publica",
    "planejamento estrategico",
    "desburocratizacao",
    "reforma administrativa",
    "qualidade no servico publico"
  ]);

  const MEDICINE_LEGAL_HINTS = Object.freeze([
    "medicina legal",
    "tanatologia",
    "traumatologia",
    "asfixiologia",
    "sexologia",
    "antropologia",
    "psiquiatr",
    "toxicologia",
    "odontologia",
    "genetica forense",
    "quimica medico legal",
    "infortunistica"
  ]);

  const CRIMINALISTICS_HINTS = Object.freeze([
    "criminalistica",
    "documentoscopia",
    "grafoscopia",
    "escrita",
    "assinatura",
    "balistica",
    "papiloscopia",
    "local de crime",
    "cadeia de custodia",
    "computacao forense",
    "fotografia forense",
    "vestigio"
  ]);

  function normalize(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("pt-BR")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }

  function slugify(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("pt-BR")
      .replace(/['’]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function unique(values) {
    return [...new Set(values.filter(Boolean))];
  }

  function itemTexts(item = {}) {
    return unique([
      item.subject,
      item.assunto,
      item.topic,
      item.topico,
      item.subtopic,
      item.subtema
    ].map(normalize));
  }

  function semanticMatch(item = {}, entry) {
    const discipline = normalize(item.discipline || item.disciplina);
    if (!entry || discipline !== entry.discipline) return false;
    return itemTexts(item).some((text) => entry.aliases.some((alias) =>
      text === alias || text.includes(alias) || alias.includes(text)
    ));
  }

  function verifiedEquivalence(item = {}) {
    return VERIFIED_EQUIVALENCES.find((entry) => semanticMatch(item, entry)) || null;
  }

  function crosswalkEntries() {
    const source = globalThis.QCONCURSOS_AUDITED_CROSSWALK
      || globalThis.window?.QCONCURSOS_AUDITED_CROSSWALK;
    return Array.isArray(source) ? source : [];
  }

  function normalizedCrosswalkEntry(entry = {}) {
    return {
      raw: entry,
      discipline: normalize(entry.d || entry.discipline),
      topic: normalize(entry.t || entry.topic),
      subject: normalize(entry.s || entry.subject),
      number: String(entry.n || entry.number || "").trim(),
      kind: normalize(entry.k || entry.kind)
    };
  }

  function candidateCrosswalkDisciplines(item = {}) {
    const discipline = normalize(item.discipline || item.disciplina);
    const candidates = [discipline];

    if (discipline === "direito administrativo e gestao publica") {
      candidates.push("direito administrativo", "administracao publica", "gestao publica");
    }
    if (discipline === "ciencias forenses") {
      candidates.push("medicina legal", "criminalistica");
    }
    if (discipline.includes("legislacao especifica") && discipline.includes("direito penal")) candidates.push("direito penal");
    if (discipline.includes("legislacao especifica") && discipline.includes("direito constitucional")) candidates.push("direito constitucional");
    if (discipline.includes("legislacao especifica") && discipline.includes("direito administrativo")) candidates.push("direito administrativo");
    if (discipline.includes("legislacao especifica") && discipline.includes("direito ambiental")) candidates.push("direito ambiental");

    return unique(candidates);
  }

  function auditedEntryForItem(item = {}) {
    const disciplines = candidateCrosswalkDisciplines(item);
    const topic = normalize(item.topic || item.topico);
    const subject = normalize(item.subject || item.assunto);
    const qcNumber = String(item.qconcursosNumber || item.qcSubjectNumber || item.qcNumber || "").trim();
    if (!disciplines.length || (!subject && !topic && !qcNumber)) return null;

    const entries = crosswalkEntries().map(normalizedCrosswalkEntry)
      .filter((entry) => disciplines.includes(entry.discipline));
    if (!entries.length) return null;

    const bySubjectAndTopic = entries.find((entry) =>
      subject && entry.subject === subject && (!topic || !entry.topic || entry.topic === topic)
    );
    if (bySubjectAndTopic) return bySubjectAndTopic;

    const bySubject = entries.find((entry) => subject && entry.subject === subject);
    if (bySubject) return bySubject;

    if (qcNumber) {
      const exactByNumber = entries.find((entry) =>
        entry.number === qcNumber && entry.kind === "exact"
      );
      if (exactByNumber) return exactByNumber;
    }
    return null;
  }

  function canonicalEntryForItem(item = {}) {
    const matched = auditedEntryForItem(item);
    if (!matched || matched.kind === "unavailable" || !matched.number) return null;
    if (matched.kind === "exact") return matched;

    return crosswalkEntries()
      .map(normalizedCrosswalkEntry)
      .find((entry) =>
        entry.discipline === matched.discipline
        && entry.number === matched.number
        && entry.kind === "exact"
      ) || null;
  }

  function containsHint(item = {}, hints = []) {
    const haystack = itemTexts(item).join(" ");
    return hints.some((hint) => haystack.includes(hint));
  }

  function resolveDisciplineRouteSlug(item = {}, canonical = null) {
    const canonicalDiscipline = normalize(canonical?.raw?.d || canonical?.raw?.discipline);
    if (canonicalDiscipline && VERIFIED_DISCIPLINE_ROUTES[canonicalDiscipline]) {
      return { slug: VERIFIED_DISCIPLINE_ROUTES[canonicalDiscipline], source: "audited-discipline" };
    }

    const discipline = normalize(item.discipline || item.disciplina);
    if (VERIFIED_DISCIPLINE_ROUTES[discipline]) {
      return { slug: VERIFIED_DISCIPLINE_ROUTES[discipline], source: "verified-discipline" };
    }

    if (discipline === "direito administrativo e gestao publica") {
      const management = containsHint(item, PUBLIC_MANAGEMENT_HINTS);
      return {
        slug: management ? "administracao-administracao-publica" : "direito-direito-administrativo",
        source: management ? "hybrid-public-management" : "hybrid-administrative-law"
      };
    }

    if (discipline === "ciencias forenses") {
      if (containsHint(item, MEDICINE_LEGAL_HINTS)) {
        return { slug: "criminalistica-medicina-legal", source: "hybrid-medicine-legal" };
      }
      if (containsHint(item, CRIMINALISTICS_HINTS)) {
        return { slug: "criminalistica-criminalistica", source: "hybrid-criminalistics" };
      }
    }

    return { slug: "", source: "unmapped" };
  }

  function auditedCanonicalRoute(item = {}) {
    const matched = auditedEntryForItem(item);
    const canonical = canonicalEntryForItem(item);
    if (!matched || !canonical) return null;

    const disciplineRoute = resolveDisciplineRouteSlug(item, canonical);
    const subjectLabel = canonical.raw.s || canonical.raw.subject || "";
    const normalizedLabel = normalize(subjectLabel);
    const subjectSlug = VERIFIED_SUBJECT_SLUGS[`${disciplineRoute.slug}|${normalizedLabel}`] || slugify(subjectLabel);
    if (!disciplineRoute.slug || !subjectSlug) return null;

    return {
      disciplineSlug: disciplineRoute.slug,
      disciplineRouteSource: disciplineRoute.source,
      subjectSlug,
      qcLabel: subjectLabel,
      qcNumber: canonical.number,
      crosswalkKind: matched.kind,
      canonicalKind: canonical.kind
    };
  }

  function routeAlreadyHasConfirmedSubject(route) {
    if (!route?.url || route?.automaticFilters?.subject !== true) return false;
    try {
      const url = new URL(route.url);
      return !url.searchParams.get("q");
    } catch {
      return false;
    }
  }

  function linkStatusForRoute(route = {}) {
    if (route.qcLinkStatus && route.qcLinkStatusLabel) {
      return { status: route.qcLinkStatus, label: route.qcLinkStatusLabel };
    }
    if (Array.isArray(route.subjectIds) && route.subjectIds.length) {
      return { status: "direct-id", label: "✅ Assunto QC vinculado por ID" };
    }
    if (route.subjectRouteSource === "audited-crosswalk-canonical-route") {
      return route.auditedMatchKind === "category"
        ? { status: "category", label: "🟡 Vinculado à categoria correspondente do QC" }
        : { status: "direct", label: "✅ Assunto QC vinculado" };
    }
    if (route.automaticFilters?.subject === true && route.automaticFilters?.search !== true) {
      return { status: "direct", label: "✅ Assunto QC vinculado" };
    }
    return { status: "text", label: "⚠️ Sem equivalente direto no QC — busca por texto" };
  }

  function annotateRouteStatus(route = {}) {
    const status = linkStatusForRoute(route);
    return { ...route, qcLinkStatus: status.status, qcLinkStatusLabel: status.label };
  }

  if (typeof buildQconcursosFilterRoute !== "function") return;
  const previousBuildQconcursosFilterRoute = buildQconcursosFilterRoute;

  buildQconcursosFilterRoute = function buildQconcursosFilterRouteV290(item = {}, board = "") {
    const route = previousBuildQconcursosFilterRoute(item, board);
    const equivalence = verifiedEquivalence(item);

    if (equivalence) {
      const url = new URL(route.url);
      url.pathname = "/questoes-de-concursos/questoes";
      url.searchParams.delete("q");
      url.searchParams.delete("subject_ids[]");
      equivalence.subjectIds.forEach((id) => url.searchParams.append("subject_ids[]", id));

      return annotateRouteStatus({
        ...route,
        url: url.toString(),
        subjectIds: [...equivalence.subjectIds],
        subjectIdSource: "verified-semantic-equivalence",
        qcSubjectLabel: equivalence.qcLabel,
        subjectCoherence: "confirmed-equivalence",
        automaticFilters: {
          ...route.automaticFilters,
          subject: true,
          search: false
        }
      });
    }

    // Preserva subject_id explícito ou rota canônica já confirmada pelas camadas
    // anteriores (V285/V286), evitando substituir equivalência mais precisa.
    if (routeAlreadyHasConfirmedSubject(route)) return annotateRouteStatus(route);

    const auditedRoute = auditedCanonicalRoute(item);
    if (!auditedRoute) return annotateRouteStatus(route);

    const url = new URL(route.url);
    url.pathname = `/questoes-de-concursos/disciplinas/${auditedRoute.disciplineSlug}/${auditedRoute.subjectSlug}/questoes`;
    url.searchParams.delete("q");
    url.searchParams.delete("subject_ids[]");

    return annotateRouteStatus({
      ...route,
      url: url.toString(),
      subjectIds: [],
      subjectIdSource: "audited-crosswalk-canonical-route",
      subjectRouteSource: "audited-crosswalk-canonical-route",
      disciplineRouteSource: auditedRoute.disciplineRouteSource,
      auditedMatchKind: auditedRoute.crosswalkKind,
      qcSubjectLabel: auditedRoute.qcLabel,
      qcNumber: auditedRoute.qcNumber || route.qcNumber,
      subjectCoherence: auditedRoute.crosswalkKind === "category"
        ? "audited-category-route"
        : "audited-canonical-route",
      automaticFilters: {
        ...route.automaticFilters,
        subject: true,
        search: false
      }
    });
  };

  function currentQconcursosRouteV290() {
    if (typeof elements === "undefined" || typeof getSyllabusById !== "function") return null;
    const item = getSyllabusById(elements.questionSyllabusItem?.value);
    if (!item) return null;
    return buildQconcursosFilterRoute(item, elements.questionBoard?.value || "");
  }

  function ensureStatusStylesV290() {
    if (typeof document === "undefined" || document.getElementById("aldusQcLinkStatusV290Style")) return;
    const style = document.createElement("style");
    style.id = "aldusQcLinkStatusV290Style";
    style.textContent = `
      #questionQconcursosLinkStatusV290 {
        margin-top: 8px;
        padding: 8px 10px;
        border: 1px solid color-mix(in srgb, currentColor 18%, transparent);
        border-radius: 10px;
        font-size: .82rem;
        line-height: 1.35;
        font-weight: 650;
        background: color-mix(in srgb, currentColor 5%, transparent);
      }
      #questionQconcursosLinkStatusV290[data-status="direct"],
      #questionQconcursosLinkStatusV290[data-status="direct-id"] { opacity: .96; }
      #questionQconcursosLinkStatusV290[data-status="category"] { opacity: .91; }
      #questionQconcursosLinkStatusV290[data-status="text"] { opacity: .82; }
    `;
    document.head.appendChild(style);
  }

  function renderQconcursosLinkStatusV290() {
    if (typeof document === "undefined") return;
    const host = typeof elements !== "undefined" && elements.questionQconcursosRoute
      ? elements.questionQconcursosRoute
      : document.getElementById("questionQconcursosRoute");
    if (!host) return;

    const route = currentQconcursosRouteV290();
    if (!route) return;
    ensureStatusStylesV290();

    let statusElement = document.getElementById("questionQconcursosLinkStatusV290");
    if (!statusElement || statusElement.parentElement !== host) {
      statusElement?.remove();
      statusElement = document.createElement("div");
      statusElement.id = "questionQconcursosLinkStatusV290";
      host.appendChild(statusElement);
    }
    statusElement.dataset.status = route.qcLinkStatus || "text";
    statusElement.textContent = route.qcLinkStatusLabel || linkStatusForRoute(route).label;
  }

  if (typeof renderQconcursosFilterRoute === "function") {
    const previousRenderQconcursosFilterRoute = renderQconcursosFilterRoute;
    renderQconcursosFilterRoute = function renderQconcursosFilterRouteV290(...args) {
      const result = previousRenderQconcursosFilterRoute.apply(this, args);
      if (typeof queueMicrotask === "function") queueMicrotask(renderQconcursosLinkStatusV290);
      else renderQconcursosLinkStatusV290();
      return result;
    };
  }

  function refreshVisibleQconcursosLinkV290() {
    try {
      if (typeof renderQconcursosFilterRoute === "function") renderQconcursosFilterRoute();
      else renderQconcursosLinkStatusV290();
    } catch (error) {
      console.warn("[Aldus Meta] Não foi possível atualizar a rota visível do QConcursos.", error);
    }
  }

  if (typeof document !== "undefined") {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", refreshVisibleQconcursosLinkV290, { once: true });
    } else if (typeof queueMicrotask === "function") {
      queueMicrotask(refreshVisibleQconcursosLinkV290);
    } else {
      refreshVisibleQconcursosLinkV290();
    }

    document.addEventListener("click", (event) => {
      const anchor = event.target?.closest?.("a.button-link");
      if (!anchor || typeof elements === "undefined" || !elements.questionQconcursosRoute?.contains(anchor)) return;
      const route = currentQconcursosRouteV290();
      if (route?.url) anchor.href = route.url;
      renderQconcursosLinkStatusV290();
    }, true);
  }

  Object.defineProperty(globalThis, "__aldusQconcursosSubjectEquivalenceV287", {
    value: Object.freeze({
      VERSION,
      verifiedEquivalence,
      verifiedDisciplineRoutes: VERIFIED_DISCIPLINE_ROUTES,
      candidateCrosswalkDisciplines,
      auditedEntryForItem,
      canonicalEntryForItem,
      resolveDisciplineRouteSlug,
      auditedCanonicalRoute,
      linkStatusForRoute,
      equivalences: VERIFIED_EQUIVALENCES,
      liveLink: true,
      visibleStatus: true
    }),
    configurable: true
  });
})();
