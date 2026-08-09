(() => {
  "use strict";

  const VERSION = "20260809-qconcursos-assunto-crosswalk-v289";

  // IDs abaixo são usados apenas quando a equivalência entre o item do edital
  // e o assunto do QConcursos foi confirmada. O número hierárquico do QC não
  // é tratado como subject_id.
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

  function auditedEntryForItem(item = {}) {
    const discipline = normalize(item.discipline || item.disciplina);
    const topic = normalize(item.topic || item.topico);
    const subject = normalize(item.subject || item.assunto);
    const qcNumber = String(item.qconcursosNumber || item.qcSubjectNumber || item.qcNumber || "").trim();
    if (!discipline || (!subject && !topic && !qcNumber)) return null;

    const entries = crosswalkEntries().map(normalizedCrosswalkEntry)
      .filter((entry) => entry.discipline === discipline);
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

    const sameNumberExact = crosswalkEntries()
      .map(normalizedCrosswalkEntry)
      .find((entry) =>
        entry.discipline === matched.discipline
        && entry.number === matched.number
        && entry.kind === "exact"
      );
    return sameNumberExact || null;
  }

  function disciplineRouteSlug(discipline) {
    const normalized = normalize(discipline);
    if (!normalized.startsWith("direito ")) return "";
    return `direito-${slugify(discipline)}`;
  }

  function auditedCanonicalRoute(item = {}) {
    const canonical = canonicalEntryForItem(item);
    if (!canonical) return null;
    const disciplineLabel = item.discipline || item.disciplina || canonical.raw.d || "";
    const disciplineSlug = disciplineRouteSlug(disciplineLabel);
    const subjectLabel = canonical.raw.s || canonical.raw.subject || "";
    const subjectSlug = slugify(subjectLabel);
    if (!disciplineSlug || !subjectSlug) return null;

    return {
      disciplineSlug,
      subjectSlug,
      qcLabel: subjectLabel,
      qcNumber: canonical.number,
      crosswalkKind: canonical.kind
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

  if (typeof buildQconcursosFilterRoute !== "function") return;
  const previousBuildQconcursosFilterRoute = buildQconcursosFilterRoute;

  buildQconcursosFilterRoute = function buildQconcursosFilterRouteV289(item = {}, board = "") {
    const route = previousBuildQconcursosFilterRoute(item, board);
    const equivalence = verifiedEquivalence(item);

    if (equivalence) {
      const url = new URL(route.url);
      url.pathname = "/questoes-de-concursos/questoes";
      url.searchParams.delete("q");
      url.searchParams.delete("subject_ids[]");
      equivalence.subjectIds.forEach((id) => url.searchParams.append("subject_ids[]", id));

      return {
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
      };
    }

    // Preserva subject_id explícito ou rota canônica já confirmada pelas camadas
    // anteriores (V285/V286), evitando substituir uma equivalência mais precisa.
    if (routeAlreadyHasConfirmedSubject(route)) return route;

    const auditedRoute = auditedCanonicalRoute(item);
    if (!auditedRoute) return route;

    const url = new URL(route.url);
    url.pathname = `/questoes-de-concursos/disciplinas/${auditedRoute.disciplineSlug}/${auditedRoute.subjectSlug}/questoes`;
    url.searchParams.delete("q");
    url.searchParams.delete("subject_ids[]");

    return {
      ...route,
      url: url.toString(),
      subjectIds: [],
      subjectIdSource: "audited-crosswalk-canonical-route",
      subjectRouteSource: "audited-crosswalk-canonical-route",
      qcSubjectLabel: auditedRoute.qcLabel,
      qcNumber: auditedRoute.qcNumber || route.qcNumber,
      subjectCoherence: "audited-canonical-route",
      automaticFilters: {
        ...route.automaticFilters,
        subject: true,
        search: false
      }
    };
  };

  function currentQconcursosRouteV288() {
    if (typeof elements === "undefined" || typeof getSyllabusById !== "function") return null;
    const item = getSyllabusById(elements.questionSyllabusItem?.value);
    if (!item) return null;
    return buildQconcursosFilterRoute(item, elements.questionBoard?.value || "");
  }

  function refreshVisibleQconcursosLinkV288() {
    try {
      if (typeof renderQconcursosFilterRoute === "function") renderQconcursosFilterRoute();
    } catch (error) {
      console.warn("[Aldus Meta] Não foi possível atualizar a rota visível do QConcursos.", error);
    }
  }

  if (typeof document !== "undefined") {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", refreshVisibleQconcursosLinkV288, { once: true });
    } else {
      queueMicrotask(refreshVisibleQconcursosLinkV288);
    }

    document.addEventListener("click", (event) => {
      const anchor = event.target?.closest?.("a.button-link");
      if (!anchor || typeof elements === "undefined" || !elements.questionQconcursosRoute?.contains(anchor)) return;
      const route = currentQconcursosRouteV288();
      if (route?.url) anchor.href = route.url;
    }, true);
  }

  Object.defineProperty(globalThis, "__aldusQconcursosSubjectEquivalenceV287", {
    value: Object.freeze({
      VERSION,
      verifiedEquivalence,
      auditedEntryForItem,
      canonicalEntryForItem,
      auditedCanonicalRoute,
      equivalences: VERIFIED_EQUIVALENCES,
      liveLink: true
    }),
    configurable: true
  });
})();
