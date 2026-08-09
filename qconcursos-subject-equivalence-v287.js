(() => {
  "use strict";

  const VERSION = "20260809-qconcursos-assunto-equivalente-v287";

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

  buildQconcursosFilterRoute = function buildQconcursosFilterRouteV287(item = {}, board = "") {
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

  Object.defineProperty(globalThis, "__aldusQconcursosSubjectEquivalenceV287", {
    value: Object.freeze({ VERSION, verifiedEquivalence, equivalences: VERIFIED_EQUIVALENCES }),
    configurable: true
  });
})();
