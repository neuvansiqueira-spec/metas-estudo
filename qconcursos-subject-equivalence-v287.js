(() => {
  "use strict";

  const VERSION = "20260809-qconcursos-link-vivo-v288";

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

  if (typeof buildQconcursosFilterRoute !== "function") return;
  const previousBuildQconcursosFilterRoute = buildQconcursosFilterRoute;

  buildQconcursosFilterRoute = function buildQconcursosFilterRouteV288(item = {}, board = "") {
    const route = previousBuildQconcursosFilterRoute(item, board);
    const equivalence = verifiedEquivalence(item);
    if (!equivalence) return route;

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
    // Corrige seleções restauradas antes de esta camada ser carregada.
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", refreshVisibleQconcursosLinkV288, { once: true });
    } else {
      queueMicrotask(refreshVisibleQconcursosLinkV288);
    }

    // Regra final: imediatamente antes da navegação, recalcula o href usando
    // disciplina/assunto/banca atualmente selecionados. Assim um href antigo
    // nunca abre o QC com q= quando já existe subject_ids confirmado.
    document.addEventListener("click", (event) => {
      const anchor = event.target?.closest?.("a.button-link");
      if (!anchor || typeof elements === "undefined" || !elements.questionQconcursosRoute?.contains(anchor)) return;
      const route = currentQconcursosRouteV288();
      if (route?.url) anchor.href = route.url;
    }, true);
  }

  Object.defineProperty(globalThis, "__aldusQconcursosSubjectEquivalenceV287", {
    value: Object.freeze({ VERSION, verifiedEquivalence, equivalences: VERIFIED_EQUIVALENCES, liveLink: true }),
    configurable: true
  });
})();
