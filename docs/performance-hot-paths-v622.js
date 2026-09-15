/* V622 — desempenho das áreas mais usadas: Plano do Dia, Fábrica, Calendário e troca de área. */
(() => {
  "use strict";

  const VERSION = "20260914-desempenho-areas-v622";
  const FLAG = "__ALDUS_PERFORMANCE_HOT_PATHS_V622__";
  const RETRY_MS = 150;
  const INSTALL_TIMEOUT_MS = 60000;

  if (globalThis[FLAG]) return;

  // Medido em 14/09/2026 com o backup de 13/09 (629 metas, 620 itens do edital,
  // 877 temas da Fábrica, 198 materiais):
  // - seletor de assunto do Plano do Dia: 180 ms por abertura, quase tudo
  //   resolvendo o número do QConcursos de 613 assuntos para um rótulo que não
  //   mostra esse número;
  // - revisão inteligente do Plano do Dia e métricas do Calendário: cada item do
  //   edital varria todas as metas, estudos e registros de questões;
  // - Fábrica: a chave de assunto refazia a mesma normalização milhares de vezes;
  // - sincronização Fábrica ↔ planejamento, rodada depois de cada salvamento:
  //   cerca de 1 s de tela parada, comparando cada tema com cada meta;
  // - troca de área: o desenho da nova tela esperava o mouse parar, até 800 ms.
  // As substitutas devolvem o mesmo resultado das originais. O script.js está
  // congelado pelo fluxo V426; por isso a troca acontece aqui. Se alguém alterar
  // uma das originais, a impressão digital deixa de bater e a substituição
  // daquela função não é instalada.
  const EXPECTED_FINGERPRINTS = Object.freeze({
    goalsForItem: "5c889330-224",
    questionLogsForItem: "63988dfd-229",
    studiesForItem: "50f2e8fe-418",
    subjectForDiscipline: "ad3d2882-137",
    getSmartReviewSuggestions: "8830389d-1513",
    planningMetrics: "e11a3eff-1996",
    questionItemOptionLabel: "2f9f6609-480",
    qconcursosAuditedMatch: "63a0bcbb-509",
    normalizeQconcursosCatalogText: "4f8ebc15-181",
    dailyPlanSubjectKey: "f2dd8c79-129",
    syncFactoryMaterialsPlanningV80: "7d4e06c9-4513",
    scheduleViewRenderAfterPaintV170: "ce142f16-1432",
    dailyPlanSubjectsCompatible: "0226e679-237",
    dailyPlanRecordsShareSubject: "9336d2a1-415",
    dailyPlanSubjectAliases: "3c8059c0-308",
    factorySyllabusItemIds: "a6f79c66-259",
    materialMatchesAssociation: "c28c0179-861",
    materialAssociationIds: "b88f865e-235"
  });

  function normalizeSource(source) {
    return String(source).replace(/\s+/g, " ").trim();
  }

  function fingerprint(fnOrSource) {
    const text = normalizeSource(typeof fnOrSource === "function" ? Function.prototype.toString.call(fnOrSource) : fnOrSource);
    let hash = 2166136261;
    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return `${(hash >>> 0).toString(16).padStart(8, "0")}-${text.length}`;
  }

  const originals = {};
  const report = { version: VERSION, installed: [], skipped: [], installedAt: "" };

  function pushIndex(map, key, index) {
    const list = map.get(key);
    if (list) list.push(index);
    else map.set(key, [index]);
  }

  function mergeAscending(left = [], right = []) {
    if (!left.length) return right;
    if (!right.length) return left;
    const merged = [];
    let a = 0;
    let b = 0;
    while (a < left.length || b < right.length) {
      const next = b >= right.length || (a < left.length && left[a] <= right[b]) ? left[a++] : right[b++];
      if (merged[merged.length - 1] !== next) merged.push(next);
    }
    return merged;
  }

  // Buscas por item do edital com índice válido só durante uma chamada de
  // getSmartReviewSuggestions ou planningMetrics. As duas apenas leem metas,
  // estudos, registros de questões e disciplinas, então o índice montado na
  // entrada continua fiel até a saída. Fora dessas chamadas as buscas seguem
  // exatamente como no script.js: nenhum índice sobrevive a uma alteração.
  let lookupScope = null;

  function withLookupScope(run) {
    if (lookupScope) return run();
    lookupScope = new Map();
    try {
      return run();
    } finally {
      lookupScope = null;
    }
  }

  function scopedIndex(key, list, build) {
    if (!Array.isArray(list)) return null;
    let entry = lookupScope.get(key);
    if (!entry || entry.list !== list || entry.length !== list.length) {
      const valid = !list.some((record) => record === null || record === undefined);
      entry = { list, length: list.length, index: valid ? build(list) : null };
      lookupScope.set(key, entry);
    }
    return entry.index;
  }

  // goalsForItem e questionLogsForItem: mesmo item do edital pelo id ou mesma
  // disciplina + assunto canônicos.
  function buildDisciplineSubjectIndex(list) {
    const byId = new Map();
    const byKey = new Map();
    list.forEach((record, index) => {
      pushIndex(byId, record.syllabusItemId, index);
      const discipline = canonical(record.discipline);
      let subjects = byKey.get(discipline);
      if (!subjects) byKey.set(discipline, (subjects = new Map()));
      pushIndex(subjects, canonical(record.subject), index);
    });
    return { byId, byKey };
  }

  function idBucket(index, id) {
    return id === id ? index.byId.get(id) : undefined;
  }

  function recordsForItem(list, index, item) {
    const byKey = index.byKey.get(canonical(item.discipline))?.get(canonical(item.subject));
    return mergeAscending(idBucket(index, item.id), byKey).map((position) => list[position]);
  }

  function scopedGoalsForItem(item) {
    const list = state.dailyGoals;
    const index = lookupScope && item != null ? scopedIndex("goals", list, buildDisciplineSubjectIndex) : null;
    return index ? recordsForItem(list, index, item) : originals.goalsForItem(item);
  }

  function scopedQuestionLogsForItem(item) {
    const list = state.questionLogs;
    const index = lookupScope && item != null ? scopedIndex("questionLogs", list, buildDisciplineSubjectIndex) : null;
    return index ? recordsForItem(list, index, item) : originals.questionLogsForItem(item);
  }

  function scopedSubjectForDiscipline(discipline) {
    const index = lookupScope ? scopedIndex("subjects", state.subjects, (list) => {
      const byName = new Map();
      list.forEach((subject) => {
        const key = canonical(subject.name);
        if (!byName.has(key)) byName.set(key, subject);
      });
      return byName;
    }) : null;
    return index ? index.get(canonical(discipline)) : originals.subjectForDiscipline(discipline);
  }

  function buildStudiesIndex(list) {
    const byId = new Map();
    const bySubjectId = new Map();
    list.forEach((study, index) => {
      pushIndex(byId, study.syllabusItemId, index);
      pushIndex(bySubjectId, study.subjectId, index);
    });
    return { byId, bySubjectId };
  }

  function scopedStudiesForItem(item) {
    const list = state.studies;
    const index = lookupScope && item != null ? scopedIndex("studies", list, buildStudiesIndex) : null;
    if (!index) return originals.studiesForItem(item);
    const subjectId = subjectForDiscipline(item.discipline)?.id;
    let bySubject = [];
    if (subjectId) {
      const subject = canonical(item.subject);
      bySubject = (index.bySubjectId.get(subjectId) || []).filter((position) => {
        const topic = list[position].topic;
        if (!topic) return true;
        const canonicalTopic = canonical(topic);
        return canonicalTopic.includes(subject) || subject.includes(canonicalTopic);
      });
    }
    return mergeAscending(idBucket(index, item.id), bySubject).map((position) => list[position]);
  }

  function scopedGetSmartReviewSuggestions(...args) {
    return withLookupScope(() => originals.getSmartReviewSuggestions.apply(this, args));
  }

  function scopedPlanningMetrics(...args) {
    return withLookupScope(() => originals.planningMetrics.apply(this, args));
  }

  // Seletor de assunto do Plano do Dia: o rótulo só usa o número do QConcursos
  // quando pedido, mas a original resolvia o número antes de olhar o pedido.
  function lazyQuestionItemOptionLabel(item = {}, showQconcursosNumber = false) {
    if (!showQconcursosNumber) {
      return `${item.subject || item.assunto || "Assunto sem nome"}${item.subtopic || item.subtema ? ` • ${item.subtopic || item.subtema}` : ""}`;
    }
    return originals.questionItemOptionLabel(item, showQconcursosNumber);
  }

  function memoize(originalName, keyOf) {
    const memo = new Map();
    return function memoized(value) {
      const key = keyOf(value);
      let result = memo.get(key);
      if (result === undefined) {
        result = originals[originalName](key);
        if (memo.size >= 20000) memo.clear();
        memo.set(key, result);
      }
      return result;
    };
  }

  // As duas são funções puras de texto; a chave é o mesmo texto que a original
  // deriva da entrada antes de normalizar.
  const memoizedNormalizeQconcursosCatalogText = memoize("normalizeQconcursosCatalogText", (value = "") => String(value || ""));
  const memoizedDailyPlanSubjectKey = memoize("dailyPlanSubjectKey", (value) => (typeof value === "string" ? value : String(value || "")));

  // A tabela auditada é constante: o índice guarda a primeira entrada de cada
  // disciplina + tópico + assunto, como fazia o find da original.
  let crosswalkCache = null;
  function crosswalkIndex() {
    let crosswalk;
    try { crosswalk = QCONCURSOS_AUDITED_CROSSWALK; } catch { return null; }
    if (!Array.isArray(crosswalk)) return null;
    if (crosswalkCache && crosswalkCache.list === crosswalk && crosswalkCache.length === crosswalk.length) return crosswalkCache.index;
    if (crosswalk.some((entry) => entry === null || entry === undefined)) return null;
    const index = new Map();
    crosswalk.forEach((entry) => {
      const key = `${normalizeQconcursosCatalogText(entry.d)}${normalizeQconcursosCatalogText(entry.t)}${normalizeQconcursosCatalogText(entry.s)}`;
      if (!index.has(key)) index.set(key, entry);
    });
    crosswalkCache = { list: crosswalk, length: crosswalk.length, index };
    return index;
  }

  function indexedQconcursosAuditedMatch(item = {}) {
    const index = crosswalkIndex();
    if (!index) return originals.qconcursosAuditedMatch(item);
    const discipline = normalizeQconcursosCatalogText(item.discipline || item.disciplina);
    const topic = normalizeQconcursosCatalogText(item.topic || item.topico);
    const subject = normalizeQconcursosCatalogText(item.subject || item.assunto);
    return index.get(`${discipline}${topic}${subject}`) || null;
  }

  // Sincronização Fábrica ↔ planejamento: é a mesma função, linha por linha,
  // trocando só as buscas quadráticas (tema × meta, material × item do edital e
  // material × meta) por índices de id e de disciplina + assunto.
  function buildSubjectAliasIndex(records, disciplineOf, subjectOf, canonicalDiscipline, requireDiscipline) {
    const index = new Map();
    records.forEach((record, position) => {
      const discipline = canonicalDiscipline(disciplineOf(record));
      if (requireDiscipline && !discipline) return;
      let aliases = index.get(discipline);
      if (!aliases) index.set(discipline, (aliases = new Map()));
      for (const alias of new Set(dailyPlanSubjectAliases(subjectOf(record)))) pushIndex(aliases, alias, position);
    });
    return index;
  }

  function aliasMatches(index, discipline, subject) {
    const aliases = index.get(discipline);
    if (!aliases) return [];
    const found = new Set();
    for (const alias of dailyPlanSubjectAliases(subject)) for (const position of aliases.get(alias) || []) found.add(position);
    return [...found];
  }

  // materialMatchesAssociation(material, { discipline, subject, syllabusItemId, goalId })
  // para todas as metas de uma vez: mesmo goalId; se a meta tem item do edital,
  // só o id decide; sem item, disciplina + assunto compatíveis.
  function buildGoalAssociationIndex(goals) {
    const byGoalId = new Map();
    const bySyllabusItemId = new Map();
    goals.forEach((goal, position) => {
      if (goal.id) pushIndex(byGoalId, goal.id, position);
      if (goal.syllabusItemId) pushIndex(bySyllabusItemId, goal.syllabusItemId, position);
    });
    const bySubject = buildSubjectAliasIndex(
      goals.map((goal) => (goal.syllabusItemId ? null : goal)),
      (goal) => (goal ? goal.discipline || goal.disciplina : ""),
      (goal) => (goal ? goal.subject || goal.assunto : ""),
      dailyPlanCanonical,
      true
    );
    return { byGoalId, bySyllabusItemId, bySubject };
  }

  function goalPositionsForMaterial(index, material) {
    const found = new Set();
    if (material.goalId) for (const position of index.byGoalId.get(material.goalId) || []) found.add(position);
    for (const id of materialAssociationIds(material)) for (const position of index.bySyllabusItemId.get(id) || []) found.add(position);
    const discipline = dailyPlanCanonical(material.discipline);
    if (discipline) for (const position of aliasMatches(index.bySubject, discipline, material.subject)) found.add(position);
    return [...found].sort((left, right) => left - right);
  }

  function indexedSyncFactoryMaterialsPlanningV80(targetState = state) {
    if (targetState !== state) return { changed: false, factoryItems: 0, linkedGoals: 0, linkedMaterials: 0 };
    targetState.factoryAgenda ||= []; targetState.factoryItems ||= []; targetState.materials ||= []; targetState.dailyGoals ||= []; targetState.migrations ||= {};
    const fingerprintBefore = factoryPlanningSyncFingerprintV170(targetState);
    if (factoryPlanningSyncFingerprintCacheV170 === fingerprintBefore) {
      return {
        changed: false,
        skipped: true,
        factoryItems: targetState.factoryAgenda.filter((item) => item.editalActive !== false).length,
        linkedGoals: targetState.dailyGoals.filter((goal) => goal.factoryItemId).length,
        linkedMaterials: targetState.materials.filter((material) => material.planningGoalIds?.length).length
      };
    }
    const before = JSON.stringify({ factoryAgenda: targetState.factoryAgenda, materials: targetState.materials, goalLinks: targetState.dailyGoals.map((goal) => ({ id: goal.id, factoryItemId: goal.factoryItemId || "", materialIds: goal.materialIds || [], hasMaterial: Boolean(goal.hasMaterial) })) });
    const editalReport = syncFactoryWithActiveEdital();
    const agenda = ensureFactoryAgenda();
    syncAllFactoryMaterials();
    const activeAgenda = agenda.filter((item) => item.editalActive !== false);
    const goals = targetState.dailyGoals.filter(isPlanningStudyGoal);
    // itemMatchesGoal(item, goal) da original: id do edital em comum ou
    // dailyPlanRecordsShareSubject(item, goal).
    const goalsById = new Map();
    goals.forEach((goal, position) => { if (goal.syllabusItemId) pushIndex(goalsById, goal.syllabusItemId, position); });
    const goalsBySubject = buildSubjectAliasIndex(
      goals,
      (goal) => goal.disciplina || goal.discipline,
      (goal) => goal.tema || goal.subject || goal.assunto,
      dailyPlanCanonical,
      true
    );
    const matchingGoalPositions = (item) => {
      const found = new Set();
      for (const id of factorySyllabusItemIds(item)) for (const position of goalsById.get(id) || []) found.add(position);
      const discipline = dailyPlanCanonical(item.disciplina || item.discipline);
      if (discipline) for (const position of aliasMatches(goalsBySubject, discipline, item.tema || item.subject || item.assunto)) found.add(position);
      return [...found].sort((left, right) => left - right);
    };
    activeAgenda.forEach((item) => {
      const linkedGoals = matchingGoalPositions(item).map((position) => goals[position]);
      const pendingGoals = linkedGoals.filter((goal) => !isGoalDone(goal)).sort((left, right) => goalDateValue(left).localeCompare(goalDateValue(right)));
      const nextGoal = pendingGoals.find((goal) => goalDateValue(goal) >= todayISO()) || pendingGoals[0] || null;
      const linkedSyllabusIds = [...new Set([...factorySyllabusItemIds(item), ...linkedGoals.map((goal) => goal.syllabusItemId).filter(Boolean)])];
      item.syllabusItemIds = linkedSyllabusIds;
      item.syllabusItemId = item.syllabusItemId || linkedSyllabusIds[0] || "";
      item.goalId = nextGoal?.id || "";
      item.planningDates = [...new Set(linkedGoals.map(goalDateValue).filter(Boolean))].sort();
      item.planningStatus = pendingGoals.length ? "Planejado" : linkedGoals.length ? "Concluído no planejamento" : "Sem meta planejada";
      if (nextGoal) {
        item.dataPlanejada = goalDateValue(nextGoal);
        item.prioridade = nextGoal.priority || nextGoal.prioridade || item.prioridade;
      }
    });
    // Como na original, a contagem usa os ids já ampliados pelo laço acima.
    const linkedGoalPositions = new Set();
    activeAgenda.forEach((item) => matchingGoalPositions(item).forEach((position) => linkedGoalPositions.add(position)));
    const linkedGoalCount = linkedGoalPositions.size;
    const syllabusItems = targetState.syllabusItems || [];
    const syllabusBySubject = syllabusItems.some((item) => item === null || item === undefined)
      ? null
      : buildSubjectAliasIndex(
        syllabusItems,
        (item) => item.discipline || item.disciplina,
        (item) => item.subject || item.assunto || item.topic,
        canonical,
        false
      );
    const goalAssociations = buildGoalAssociationIndex(goals);
    targetState.materials.forEach((material) => {
      const matchingItems = syllabusBySubject
        ? aliasMatches(syllabusBySubject, canonical(material.discipline || material.disciplina), material.subject || material.assunto).sort((left, right) => left - right).map((position) => syllabusItems[position])
        : syllabusItems.filter((item) => canonical(item.discipline || item.disciplina) === canonical(material.discipline || material.disciplina) && dailyPlanSubjectsCompatible(item.subject || item.assunto || item.topic, material.subject || material.assunto));
      const ids = [...new Set([material.syllabusItemId, ...(material.syllabusItemIds || []), ...matchingItems.map((item) => item.id)].filter(Boolean))];
      material.syllabusItemIds = ids;
      material.syllabusItemId = material.syllabusItemId || ids[0] || "";
      material.planningGoalIds = [...new Set(goalPositionsForMaterial(goalAssociations, material).map((position) => goals[position].id).filter(Boolean))];
    });
    // V402: a Fábrica calcula os vínculos, mas não grava dados derivados nas metas.
    targetState.factoryAgenda = agenda.map(normalizeFactoryItem);
    targetState.factoryItems = targetState.factoryAgenda;
    const after = JSON.stringify({ factoryAgenda: targetState.factoryAgenda, materials: targetState.materials, goalLinks: targetState.dailyGoals.map((goal) => ({ id: goal.id, factoryItemId: goal.factoryItemId || "", materialIds: goal.materialIds || [], hasMaterial: Boolean(goal.hasMaterial) })) });
    primeFactoryPlanningSyncFingerprintV170(targetState);
    return { changed: before !== after, skipped: false, factoryItems: activeAgenda.length, linkedGoals: linkedGoalCount, linkedMaterials: targetState.materials.filter((material) => material.planningGoalIds?.length).length, editalReport };
  }

  // Troca de área: a V344 adiava o desenho da nova tela enquanto o mouse se
  // mexia (pointermove conta como interação), até 800 ms. Na prática, quem
  // clica no menu e move o mouse via a área vazia por quase um segundo. Aqui só
  // entrada discreta (clique, tecla, rolagem, toque) adia o desenho; o resto é
  // a mesma função da V344.
  let lastDiscreteInputAt = -Infinity;
  function markDiscreteInput() {
    lastDiscreteInputAt = performance.now();
  }
  function discreteInputQuietFor() {
    return Math.max(0, performance.now() - lastDiscreteInputAt);
  }
  function hasPendingDiscreteInput() {
    try {
      return Boolean(navigator.scheduling?.isInputPending?.({ includeContinuous: false }));
    } catch {
      return false;
    }
  }
  function shouldKeepYieldingToDiscreteInput(startedAt) {
    const elapsed = performance.now() - startedAt;
    if (elapsed >= INTERACTION_MAX_DEFER_MS_V344) return false;
    return discreteInputQuietFor() < INTERACTION_QUIET_WINDOW_MS_V344 || hasPendingDiscreteInput();
  }

  function scheduleViewRenderAfterPaint(target) {
    const token = ++pendingViewRenderTokenV170;
    const requestedAt = performance.now();
    const stillCurrent = () => token === pendingViewRenderTokenV170
      && document.documentElement.dataset.activeView === target;
    const performRender = () => {
      if (!stillCurrent()) return;
      renderView(target, { reuseIfFresh: true });
    };
    const queueIdle = () => {
      if (!stillCurrent()) return;
      const elapsed = performance.now() - requestedAt;
      const remaining = Math.max(50, INTERACTION_MAX_DEFER_MS_V344 - elapsed);
      if (typeof requestIdleCallback === "function") {
        requestIdleCallback(runWhenIdle, { timeout: remaining });
      } else {
        setTimeout(() => runWhenIdle({ didTimeout: elapsed >= INTERACTION_MAX_DEFER_MS_V344 }), 0);
      }
    };
    const runWhenIdle = (deadline = { didTimeout: false }) => {
      if (!stillCurrent()) return;
      if (!deadline.didTimeout && shouldKeepYieldingToDiscreteInput(requestedAt)) {
        const quietDelay = Math.max(16, Math.ceil(INTERACTION_QUIET_WINDOW_MS_V344 - discreteInputQuietFor()));
        setTimeout(queueIdle, Math.min(INTERACTION_QUIET_WINDOW_MS_V344, quietDelay));
        return;
      }
      performRender();
    };
    const afterFirstPaint = () => {
      if (!stillCurrent()) return;
      if (typeof requestAnimationFrame === "function") requestAnimationFrame(queueIdle);
      else queueIdle();
    };
    if (typeof requestAnimationFrame === "function") requestAnimationFrame(afterFirstPaint);
    else setTimeout(queueIdle, 0);
    return token;
  }

  function listenForDiscreteInput() {
    if (typeof document === "undefined") return;
    for (const type of ["pointerdown", "wheel", "keydown", "touchstart"]) {
      document.addEventListener(type, markDiscreteInput, { capture: true, passive: true });
    }
  }

  const ITEM_LOOKUPS = ["goalsForItem", "questionLogsForItem", "subjectForDiscipline", "studiesForItem"];
  const REPLACEMENTS = [
    { name: "goalsForItem", replacement: scopedGoalsForItem },
    { name: "questionLogsForItem", replacement: scopedQuestionLogsForItem },
    { name: "subjectForDiscipline", replacement: scopedSubjectForDiscipline },
    { name: "studiesForItem", replacement: scopedStudiesForItem },
    { name: "getSmartReviewSuggestions", replacement: scopedGetSmartReviewSuggestions, requires: ITEM_LOOKUPS },
    { name: "planningMetrics", replacement: scopedPlanningMetrics, requires: ITEM_LOOKUPS },
    { name: "questionItemOptionLabel", replacement: lazyQuestionItemOptionLabel },
    { name: "normalizeQconcursosCatalogText", replacement: memoizedNormalizeQconcursosCatalogText },
    { name: "qconcursosAuditedMatch", replacement: indexedQconcursosAuditedMatch, requires: ["normalizeQconcursosCatalogText"] },
    { name: "dailyPlanSubjectKey", replacement: memoizedDailyPlanSubjectKey },
    {
      name: "syncFactoryMaterialsPlanningV80",
      replacement: indexedSyncFactoryMaterialsPlanningV80,
      requires: ["dailyPlanSubjectsCompatible", "dailyPlanRecordsShareSubject", "dailyPlanSubjectAliases", "factorySyllabusItemIds", "materialMatchesAssociation", "materialAssociationIds"]
    },
    { name: "scheduleViewRenderAfterPaintV170", replacement: scheduleViewRenderAfterPaint, onInstall: listenForDiscreteInput }
  ];

  function coreReady() {
    try {
      return typeof state === "object" && state !== null
        && typeof globalThis.syncFactoryMaterialsPlanningV80 === "function"
        && typeof globalThis.scheduleViewRenderAfterPaintV170 === "function";
    } catch {
      return false;
    }
  }

  // Compara com a original guardada quando a função já foi trocada aqui, para
  // que a dependência de uma substituição anterior da lista siga válida.
  function unchanged(name) {
    const current = originals[name] || globalThis[name];
    return typeof current === "function" && fingerprint(current) === EXPECTED_FINGERPRINTS[name];
  }

  let installed = false;
  function install() {
    if (installed) return true;
    if (!coreReady()) return false;
    for (const { name, replacement, requires = [], onInstall } of REPLACEMENTS) {
      const stale = [name, ...requires].filter((dependency) => !unchanged(dependency));
      if (stale.length) {
        report.skipped.push({ name, changed: stale });
        continue;
      }
      originals[name] = globalThis[name];
      globalThis[name] = replacement;
      onInstall?.();
      report.installed.push(name);
    }
    installed = true;
    report.installedAt = new Date().toISOString();
    if (report.skipped.length) {
      console.warn(`[Aldus ${VERSION}] Funções alteradas no script.js ficaram sem otimização:`, report.skipped);
    }
    return true;
  }

  const api = Object.freeze({
    VERSION,
    EXPECTED_FINGERPRINTS,
    normalizeSource,
    fingerprint,
    originals,
    report,
    install
  });
  globalThis[FLAG] = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
    return;
  }
  if (typeof document === "undefined") return;

  if (install()) return;
  const startedAt = Date.now();
  const retry = () => {
    if (install()) return;
    if (Date.now() - startedAt >= INSTALL_TIMEOUT_MS) {
      console.warn(`[Aldus ${VERSION}] O núcleo não ficou pronto a tempo; nenhuma otimização foi aplicada.`);
      return;
    }
    setTimeout(retry, RETRY_MS);
  };
  setTimeout(retry, RETRY_MS);
})();
