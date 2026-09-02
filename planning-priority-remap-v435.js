(() => {
  "use strict";

  // V435 — Reparar prioridades do simulado que apontam para o assunto errado.
  //
  // `INITIAL_WRONG_TOPICS_V155` (script.js:6733) lista 17 assuntos errados no
  // simulado de 26/07/2026. Quatro dos ids da lista não existem mais no edital,
  // e os sinais correspondentes acabaram apontando para outro assunto:
  //
  //   law-9605-environmental      -> Lei nº 11.343/2006 (drogas)
  //   law-14133-procurement       -> "Licitações e Contratos Administrativos"
  //   police-inquiry-archiving    -> "Inquérito Policial" inteiro
  //   human-rights-global-system  -> "Sistema interamericano", que JÁ é outra
  //                                  prioridade e passa a pesar em dobro
  //
  // O efeito não é perder priorização: é priorizar o assunto errado, em
  // silêncio, com a mesma confiança do acerto.
  //
  // Decisões do usuário, registradas:
  //   * 9.605 vai para "Crimes e infrações administrativas contra o meio
  //     ambiente", em DIREITO AMBIENTAL;
  //   * 14.133 vai para "Licitações: modalidades e procedimentos";
  //   * "Arquivamento do inquérito policial" sai — é espécie de Inquérito
  //     Policial, e priorizar o instituto inteiro é maior do que o erro;
  //   * "Sistema global de proteção dos Direitos Humanos" sai — não consta do
  //     edital, e hoje só duplica o peso do sistema interamericano.
  //
  // O vínculo é por disciplina + assunto, não por id: se um id mudar noutra
  // migração, como aconteceu na V426, o reparo sobrevive.
  //
  // `script.js` está na trava de escopo de .github/workflows/v426-validation.yml
  // e não pode ser alterado; daí um módulo próprio.

  const VERSION = "20260902-planning-priority-remap-v435";
  const API_KEY = "__ALDUS_PLANNING_PRIORITY_REMAP_V435__";
  const MARKER_KEY = "planningPriorityRemapV435";
  const SOURCE = "simulado-informado-2026-07-26";

  const REPOINTS = Object.freeze([
    Object.freeze({
      key: "law-9605-environmental",
      label: "Lei nº 9.605/1998: crimes ambientais e prova pericial",
      discipline: "DIREITO AMBIENTAL",
      subjectStartsWith: "Crimes e infrações administrativas contra o meio ambiente"
    }),
    Object.freeze({
      key: "law-14133-procurement",
      label: "Lei nº 14.133/2021: licitações, contratação direta e agentes",
      discipline: "DIREITO ADMINISTRATIVO",
      subjectStartsWith: "Licitações: modalidades e procedimentos"
    })
  ]);

  const REMOVALS = Object.freeze([
    Object.freeze({ key: "police-inquiry-archiving", reason: "espécie de Inquérito Policial; priorizar o instituto inteiro excede o erro" }),
    Object.freeze({ key: "human-rights-global-system", reason: "não consta do edital; hoje duplica o peso do sistema interamericano" })
  ]);

  const isObject = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);
  const clean = (value) => String(value ?? "").trim();
  const canonical = (value) => clean(value).toLowerCase();

  function resolveAppState() {
    try {
      // eslint-disable-next-line no-undef
      if (isObject(state)) return state;
    } catch { /* binding inexistente ou em TDZ */ }
    if (isObject(globalThis.state)) return globalThis.state;
    return null;
  }

  // Só mexe no que a máquina criou e o usuário nunca tocou. Se ele respondeu
  // questões sobre o tema, `wrong`/`correct` deixam de ser 1/0 e o sinal passa
  // a ser dado dele — intocável.
  function isUntouchedSeed(signal) {
    return isObject(signal)
      && clean(signal.source) === SOURCE
      && Number(signal.wrong) === 1
      && Number(signal.correct) === 0;
  }

  function candidatesFor(targetState, entry) {
    const items = Array.isArray(targetState?.syllabusItems) ? targetState.syllabusItems : [];
    const discipline = canonical(entry.discipline);
    const prefix = canonical(entry.subjectStartsWith);
    return items.filter((item) => isObject(item)
      && item.id
      && !item.legacyOnly
      && !item.hiddenFromCatalog
      && canonical(item.discipline) === discipline
      && canonical(item.subject).startsWith(prefix));
  }

  function signalsOf(targetState) {
    if (!isObject(targetState.planning)) return null;
    if (!isObject(targetState.planning.topicPrioritySignalsV155)) {
      targetState.planning.topicPrioritySignalsV155 = {};
    }
    return targetState.planning.topicPrioritySignalsV155;
  }

  function apply(targetState, options = {}) {
    if (!isObject(targetState)) return { changed: false, blocked: true, reason: "state-unavailable" };
    if (targetState?.migrations?.[MARKER_KEY]?.completed === true && !options.force) {
      return { changed: false, blocked: false, repeated: true };
    }
    const signals = signalsOf(targetState);
    if (!signals) return { changed: false, blocked: true, reason: "planning-unavailable" };

    const report = { version: VERSION, repointed: [], removed: [], preserved: [], ambiguous: [], notFound: [] };

    for (const entry of REPOINTS) {
      const signal = signals[entry.key];
      if (signal && !isUntouchedSeed(signal)) { report.preserved.push(entry.key); continue; }
      const matches = candidatesFor(targetState, entry);
      if (matches.length !== 1) {
        // Repontar para o assunto errado é o defeito que este módulo corrige.
        (matches.length > 1 ? report.ambiguous : report.notFound).push(entry.key);
        continue;
      }
      const item = matches[0];
      if (signal && clean(signal.syllabusItemId) === clean(item.id)) { report.preserved.push(entry.key); continue; }
      const before = signal ? clean(signal.syllabusItemId) : "";
      signals[entry.key] = {
        syllabusItemId: item.id,
        label: entry.label,
        wrong: 1,
        correct: 0,
        source: SOURCE,
        createdAt: clean(signal?.createdAt) || new Date().toISOString(),
        remappedBy: VERSION,
        previousSyllabusItemId: before
      };
      report.repointed.push({ key: entry.key, from: before, to: item.id, subject: clean(item.subject) });
    }

    for (const entry of REMOVALS) {
      const signal = signals[entry.key];
      if (!signal) continue;
      if (!isUntouchedSeed(signal)) { report.preserved.push(entry.key); continue; }
      delete signals[entry.key];
      report.removed.push({ key: entry.key, reason: entry.reason, was: clean(signal.syllabusItemId) });
    }

    targetState.migrations ||= {};
    targetState.migrations[MARKER_KEY] = {
      version: VERSION,
      executedAt: new Date().toISOString(),
      completed: true,
      report
    };
    return { changed: report.repointed.length + report.removed.length > 0, blocked: false, report };
  }

  const api = Object.freeze({
    version: VERSION,
    markerKey: MARKER_KEY,
    repoints: REPOINTS,
    removals: REMOVALS,
    isUntouchedSeed,
    candidatesFor,
    apply
  });

  globalThis[API_KEY] = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;

  function runOnce() {
    try {
      const appState = resolveAppState();
      if (!appState) return;
      const result = apply(appState);
      if (result.blocked || !result.changed) return;
      console.info("[Aldus V435] Prioridades do simulado reparadas.", result.report);
      try { if (typeof saveData === "function") saveData(); }
      catch (error) { console.warn("[Aldus V435] Falha ao persistir.", error); }
    } catch (error) {
      console.warn("[Aldus V435] Reparo não aplicado.", error);
    }
  }

  if (typeof window !== "undefined") {
    window.addEventListener("aldus:post-bootstrap-maintenance-complete", runOnce, { once: true });
    window.addEventListener("aldus:bootstrap-ready", runOnce, { once: true });
    window.addEventListener("load", runOnce, { once: true });
  }
})();
