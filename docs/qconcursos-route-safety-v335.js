(() => {
  "use strict";

  const VERSION = "20260814-qconcursos-rota-segura-v335";
  const QUESTION_PATH_PREFIX = "/questoes-de-concursos/disciplinas/";
  const TRUSTED_CANONICAL_SOURCES = new Set([
    "canonical-qc-route",
    "verified-canonical-subject-route-v333"
  ]);

  function parsedUrl(route = {}) {
    try {
      return route.url ? new URL(route.url) : null;
    } catch {
      return null;
    }
  }

  function hasNativeSubjectId(url) {
    return url.searchParams.getAll("subject_ids[]").some((value) => /^\d+$/.test(value));
  }

  function hasTrustedCanonicalSubjectRoute(route = {}, url = parsedUrl(route)) {
    if (!url || route.automaticFilters?.subject !== true || url.searchParams.get("q")) return false;
    if (hasNativeSubjectId(url)) return true;
    const source = route.subjectRouteSource || route.subjectIdSource || "";
    return TRUSTED_CANONICAL_SOURCES.has(source)
      && url.pathname.startsWith(QUESTION_PATH_PREFIX)
      && url.pathname.split("/").filter(Boolean).length >= 5;
  }

  function repairRoute(route = {}, item = {}) {
    const url = parsedUrl(route);
    if (!url || hasTrustedCanonicalSubjectRoute(route, url)) return route;

    const catalog = globalThis.__aldusQconcursosAllFiltersV334;
    const resolution = catalog?.resolveDisciplineRoute?.(item);
    if (!resolution?.slug) return route;

    const searchTerm = catalog.cleanSearchTerm(item, route);
    url.pathname = `${QUESTION_PATH_PREFIX}${resolution.slug}/questoes`;
    url.searchParams.delete("discipline_ids[]");
    url.searchParams.delete("subject_ids[]");
    if (searchTerm) url.searchParams.set("q", searchTerm);
    else url.searchParams.delete("q");

    return {
      ...route,
      url: url.toString(),
      searchTerm,
      subjectIds: [],
      subjectIdSource: "route-safety-text-fallback-v335",
      subjectRouteSource: "route-safety-text-fallback-v335",
      subjectCoherence: "text-fallback-route-safety-v335",
      disciplineRouteSource: resolution.source,
      catalogCoverageVersion: VERSION,
      qcLinkStatus: "text",
      qcLinkStatusLabel: "🔎 Disciplina e assunto aplicados automaticamente",
      automaticFilters: {
        ...route.automaticFilters,
        discipline: true,
        subject: false,
        search: Boolean(searchTerm)
      }
    };
  }

  if (typeof buildQconcursosFilterRoute !== "function") return;
  const previousBuildQconcursosFilterRoute = buildQconcursosFilterRoute;
  buildQconcursosFilterRoute = function buildQconcursosFilterRouteV335(item = {}, board = "") {
    return repairRoute(previousBuildQconcursosFilterRoute(item, board), item);
  };

  function refreshVisibleRoute() {
    try {
      if (typeof renderQconcursosFilterRoute === "function") renderQconcursosFilterRoute();
    } catch (error) {
      console.warn("[Aldus Meta] Não foi possível aplicar a rota segura do QConcursos na V335.", error);
    }
  }

  if (typeof queueMicrotask === "function") queueMicrotask(refreshVisibleRoute);
  else if (typeof setTimeout === "function") setTimeout(refreshVisibleRoute, 0);

  Object.defineProperty(globalThis, "__aldusQconcursosRouteSafetyV335", {
    value: Object.freeze({
      VERSION,
      trustedCanonicalSources: Object.freeze([...TRUSTED_CANONICAL_SOURCES]),
      hasTrustedCanonicalSubjectRoute,
      repairRoute
    }),
    configurable: true
  });
})();
