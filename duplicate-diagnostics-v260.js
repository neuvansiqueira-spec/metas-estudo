(() => {
  "use strict";

  const VERSION = "20260810-duplicate-batch-persistence-v301";
  const BACKUP_DB_NAME = "aldus-duplicate-diagnostics-v260";
  const BACKUP_STORE = "snapshots";
  const BACKUP_LIMIT = 10;
  const MAIN_LOCAL_KEY = "metasConcursoData";
  const DECISION_ACTIONS = new Set(["not-duplicate", "later", "consolidated"]);

  const LINK_FIELDS = new Set([
    "syllabusItemId",
    "syllabusId",
    "editalItemId",
    "syllabus_item_id",
    "syllabus_id",
    "edital_item_id",
    "topicId",
    "subjectId",
    "goalSyllabusItemId",
    "sourceSyllabusItemId",
    "targetSyllabusItemId"
  ]);

  const COLLECTION_KEYS = [
    "studies",
    "dailyGoals",
    "questionLogs",
    "smartReviews",
    "simulados",
    "materials",
    "questionBank",
    "questionBankSessions",
    "questionErrorNotebook",
    "factoryItems",
    "factoryAgenda"
  ];

  const TOPIC_FIELDS = ["topic", "subject", "subtopic", "title", "name", "reference", "assunto", "tema", "subtema"];
  const DISCIPLINE_FIELDS = ["discipline", "disciplina", "subjectGroup", "area"];
  const CODE_FIELDS = ["code", "codigo", "referenceCode", "ref"];

  const STOP_WORDS = new Set([
    "a", "ao", "aos", "as", "com", "como", "da", "das", "de", "do", "dos", "e", "em", "entre", "na", "nas", "no", "nos", "o", "os", "ou", "para", "pela", "pelas", "pelo", "pelos", "por", "que", "se", "sem", "sob", "sobre",
    "aspecto", "aspectos", "conceito", "conceitos", "conteudo", "conteudos", "disposicao", "disposicoes", "fundamento", "fundamentos", "geral", "gerais", "introducao", "lei", "leis", "materia", "materias", "norma", "normas", "nocao", "nocoes", "parte", "partes", "regra", "regras", "tema", "temas"
  ]);

  const DISCIPLINE_GENERIC_TOKENS = new Set([
    "direito", "gestao", "publica", "publico", "legislacao", "especial", "especifica", "conhecimentos", "gerais", "materia"
  ]);

  const STATUS_RANK = new Map([
    ["concluido", 5],
    ["concluida", 5],
    ["dominado", 5],
    ["revisao", 4],
    ["em andamento", 3],
    ["iniciado", 2],
    ["nao iniciado", 1],
    ["pendente", 1]
  ]);

  const CATEGORY_RANK = new Map([["A", 5], ["B", 4], ["C", 3], ["D", 2], ["E", 1]]);
  const SUM_NUMERIC_FIELDS = new Set([
    "studyTime", "timeSpent", "totalMinutes", "minutes", "seconds", "hours", "totalHours", "tempoEstudo", "tempoEmMinutos", "tempoEmSegundos"
  ]);
  const MAX_NUMERIC_FIELDS = new Set([
    "incidence", "incidencia", "priority", "weight", "questionWeight", "accuracy", "progress", "completion", "percentComplete"
  ]);

  function cloneData(value) {
    if (value === undefined) return undefined;
    try {
      return typeof structuredClone === "function"
        ? structuredClone(value)
        : JSON.parse(JSON.stringify(value));
    } catch {
      return value;
    }
  }

  function replaceStateContents(targetState, nextState) {
    if (!targetState || typeof targetState !== "object" || !nextState || typeof nextState !== "object") {
      throw new Error("Estado inválido para atualização atômica.");
    }
    const replacement = cloneData(nextState);
    Object.keys(targetState).forEach((key) => delete targetState[key]);
    Object.assign(targetState, replacement);
    return targetState;
  }

  function normalizeText(value) {
    return String(value ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[–—−]/g, "-")
      .toLowerCase()
      .replace(/\b(artigos?|arts?\.?|incisos?|alineas?|paragrafos?)\b/g, " ")
      .replace(/[^a-z0-9]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function displayText(value, fallback = "Não informado") {
    const text = String(value ?? "").trim();
    return text || fallback;
  }

  function firstValue(object, fields) {
    for (const field of fields) {
      const value = object?.[field];
      if (value !== undefined && value !== null && String(value).trim()) return value;
    }
    return "";
  }

  function normalizeCode(value) {
    const text = String(value ?? "").trim();
    if (!text) return "";
    const match = text.match(/(?:^|\b)(\d+(?:\.\d+){0,6})(?:\b|\s|$)/);
    return match ? match[1].replace(/\.+$/, "") : normalizeText(text).replace(/\s+/g, ".");
  }

  function codeOf(item) {
    const direct = firstValue(item, CODE_FIELDS);
    if (direct) return normalizeCode(direct);
    const reference = firstValue(item, ["reference", "referencia"]);
    const match = String(reference || "").match(/^\s*(\d+(?:\.\d+){0,6})\b/);
    return match ? match[1] : "";
  }

  function textTokens(value, options = {}) {
    const generic = options.discipline ? DISCIPLINE_GENERIC_TOKENS : STOP_WORDS;
    return [...new Set(normalizeText(value)
      .split(" ")
      .filter((token) => token.length >= 3 && !STOP_WORDS.has(token) && !generic.has(token) && !/^\d+$/.test(token)))];
  }

  function normalizedTopic(item) {
    const values = TOPIC_FIELDS.map((field) => item?.[field]).filter((value) => String(value ?? "").trim());
    const joined = values.join(" | ");
    const code = codeOf(item);
    const normalized = normalizeText(joined);
    if (!code) return normalized;
    const codeWords = normalizeText(code);
    return normalized.replace(new RegExp(`(^| )${escapeRegExp(codeWords)}( |$)`), " ").replace(/\s+/g, " ").trim();
  }

  function normalizedDiscipline(item) {
    return normalizeText(firstValue(item, DISCIPLINE_FIELDS));
  }

  function disciplineTokens(item) {
    const normalized = normalizedDiscipline(item);
    const tokens = textTokens(normalized, { discipline: true });
    return tokens.length ? tokens : textTokens(normalized);
  }

  function itemLabel(item) {
    return displayText(firstValue(item, ["topic", "subject", "subtopic", "title", "name", "reference", "assunto", "tema"]), "Tema sem título");
  }

  function itemDiscipline(item) {
    return displayText(firstValue(item, DISCIPLINE_FIELDS), "Disciplina não informada");
  }

  function escapeRegExp(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function setIntersection(left, right) {
    const rightSet = right instanceof Set ? right : new Set(right || []);
    return [...new Set(left || [])].filter((value) => rightSet.has(value));
  }

  function simpleJaccard(left, right) {
    const a = new Set(left || []);
    const b = new Set(right || []);
    if (!a.size && !b.size) return 0;
    const intersection = setIntersection(a, b).length;
    return intersection / (a.size + b.size - intersection || 1);
  }

  function weightedSetScore(tokens, weights) {
    return [...new Set(tokens || [])].reduce((sum, token) => sum + (weights.get(token) || 1), 0);
  }

  function weightedSimilarity(left, right, weights) {
    const a = new Set(left || []);
    const b = new Set(right || []);
    if (!a.size || !b.size) return { jaccard: 0, containment: 0, shared: [] };
    const shared = setIntersection(a, b);
    const intersectionWeight = weightedSetScore(shared, weights);
    const unionWeight = weightedSetScore(new Set([...a, ...b]), weights);
    const minWeight = Math.min(weightedSetScore(a, weights), weightedSetScore(b, weights));
    return {
      jaccard: unionWeight ? intersectionWeight / unionWeight : 0,
      containment: minWeight ? intersectionWeight / minWeight : 0,
      shared
    };
  }

  function trigrams(value) {
    const text = `  ${normalizeText(value)}  `;
    const grams = new Set();
    for (let index = 0; index <= text.length - 3; index += 1) grams.add(text.slice(index, index + 3));
    return grams;
  }

  function trigramSimilarity(left, right) {
    const a = trigrams(left);
    const b = trigrams(right);
    if (!a.size || !b.size) return 0;
    const intersection = setIntersection(a, b).length;
    return (2 * intersection) / (a.size + b.size || 1);
  }

  function codeHierarchy(left, right) {
    if (!left || !right || left === right) return false;
    const a = left.split(".");
    const b = right.split(".");
    const shorter = a.length < b.length ? a : b;
    const longer = a.length < b.length ? b : a;
    return shorter.every((part, index) => part === longer[index]);
  }

  function stableSerialize(value) {
    if (value === null || typeof value !== "object") return JSON.stringify(value);
    if (Array.isArray(value)) return `[${value.map(stableSerialize).join(",")}]`;
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableSerialize(value[key])}`).join(",")}}`;
  }

  function uniqueObjects(rows) {
    const map = new Map();
    (Array.isArray(rows) ? rows : []).filter(Boolean).forEach((row) => {
      const key = stableSerialize(row);
      if (!map.has(key)) map.set(key, cloneData(row));
    });
    return [...map.values()];
  }

  function pairKey(leftId, rightId) {
    return [String(leftId || ""), String(rightId || "")].sort().join("::");
  }

  function mappingRowsForItem(state, itemId) {
    return (Array.isArray(state?.contestSyllabusMap) ? state.contestSyllabusMap : [])
      .filter((row) => row?.syllabusItemId === itemId);
  }

  function coverageRowsForItem(state, item) {
    return uniqueObjects([
      ...(Array.isArray(item?.officialCoverage) ? item.officialCoverage : []),
      ...mappingRowsForItem(state, item?.id)
    ]);
  }

  function coverageSignature(row) {
    return [row?.contestId, row?.code, row?.discipline, row?.topic, row?.subtopic, row?.reference]
      .map(normalizeText)
      .join("|");
  }

  function coverageCrossReferences(leftProfile, rightProfile) {
    const contains = (profile, target) => profile.coverage.some((row) => {
      const code = normalizeCode(row?.code || row?.reference);
      const text = normalizeText([row?.topic, row?.subtopic, row?.reference, row?.discipline].filter(Boolean).join(" "));
      return Boolean(
        (target.code && code === target.code)
        || (target.normalizedTopic && text && (text.includes(target.normalizedTopic) || target.normalizedTopic.includes(text)))
      );
    });
    return contains(leftProfile, rightProfile) || contains(rightProfile, leftProfile);
  }

  function sharedCoverage(leftProfile, rightProfile) {
    const left = new Set(leftProfile.coverage.map(coverageSignature).filter((value) => value.replace(/\|/g, "")));
    return rightProfile.coverage.some((row) => left.has(coverageSignature(row)));
  }

  function countLinksInValue(value, itemId, seen = new WeakSet()) {
    if (!value || typeof value !== "object") return 0;
    if (seen.has(value)) return 0;
    seen.add(value);
    let count = 0;
    if (Array.isArray(value)) {
      value.forEach((entry) => { count += countLinksInValue(entry, itemId, seen); });
      return count;
    }
    Object.entries(value).forEach(([key, current]) => {
      if (LINK_FIELDS.has(key) && current === itemId) count += 1;
      else if (current && typeof current === "object") count += countLinksInValue(current, itemId, seen);
    });
    return count;
  }

  function itemHours(state, item) {
    const directMinutes = [item?.totalMinutes, item?.minutes, item?.tempoEmMinutos]
      .map(Number).filter(Number.isFinite).reduce((sum, value) => sum + Math.max(0, value), 0);
    const directHours = [item?.studyTime, item?.timeSpent, item?.totalHours, item?.hours, item?.tempoEstudo]
      .map(Number).filter(Number.isFinite).reduce((sum, value) => sum + Math.max(0, value), 0);
    const studyMinutes = (Array.isArray(state?.studies) ? state.studies : [])
      .filter((row) => row?.syllabusItemId === item?.id || row?.syllabusId === item?.id || row?.editalItemId === item?.id)
      .reduce((sum, row) => sum + Math.max(0, Number(row?.minutes) || Math.round((Number(row?.seconds) || 0) / 60)), 0);
    return Math.max(directHours, directMinutes / 60, studyMinutes / 60);
  }

  function itemImpact(state, item) {
    const collections = {};
    let references = 0;
    COLLECTION_KEYS.forEach((key) => {
      const count = countLinksInValue(state?.[key], item?.id);
      collections[key] = count;
      references += count;
    });
    const mappingCount = mappingRowsForItem(state, item?.id).length;
    const coverageCount = coverageRowsForItem(state, item).length;
    const materialCount = (collections.materials || 0) + (collections.factoryItems || 0) + (collections.factoryAgenda || 0);
    return {
      collections,
      references,
      mappingCount,
      coverageCount,
      materialCount,
      hours: itemHours(state, item)
    };
  }

  function categoryOf(item) {
    return String(item?.contestCategory || item?.category || item?.classification || "").trim().toUpperCase();
  }

  function statusOf(item) {
    return displayText(item?.status || item?.state || item?.studyStatus, "Não iniciado");
  }

  function diagnosisOf(item) {
    return displayText(item?.diagnosis || item?.diagnostico || item?.domain || item?.dominio, "Sem diagnóstico");
  }

  function statusRank(value) {
    const normalized = normalizeText(value);
    for (const [key, rank] of STATUS_RANK.entries()) if (normalized.includes(key)) return rank;
    return 0;
  }

  function keeperScore(state, item, profile) {
    const impact = profile?.impact || itemImpact(state, item);
    const category = categoryOf(item);
    const diagnosis = normalizeText(diagnosisOf(item));
    const hasDiagnosis = diagnosis && !diagnosis.includes("sem diagnostico") ? 1 : 0;
    return (
      impact.references * 5
      + impact.mappingCount * 3
      + impact.coverageCount * 4
      + impact.materialCount * 5
      + Math.min(impact.hours, 100) * 2
      + statusRank(statusOf(item)) * 4
      + (CATEGORY_RANK.get(category) || 0) * 3
      + hasDiagnosis * 3
      + (item?.id ? 1 : 0)
    );
  }

  function buildProfiles(state) {
    const items = (Array.isArray(state?.syllabusItems) ? state.syllabusItems : []).filter((item) => item && typeof item === "object" && item.id);
    const profiles = items.map((item, index) => {
      const topic = normalizedTopic(item);
      const topicTokens = textTokens(topic);
      const discipline = normalizedDiscipline(item);
      const disciplineTokenList = disciplineTokens(item);
      const coverage = coverageRowsForItem(state, item);
      const profile = {
        item,
        index,
        id: item.id,
        label: itemLabel(item),
        disciplineLabel: itemDiscipline(item),
        normalizedTopic: topic,
        topicTokens,
        normalizedDiscipline: discipline,
        disciplineTokens: disciplineTokenList,
        code: codeOf(item),
        normalizedReference: normalizeText(item?.reference || ""),
        coverage,
        contests: [...new Set(coverage.map((row) => row?.contestId || row?.contest || row?.concurso).filter(Boolean))],
        impact: null
      };
      profile.impact = itemImpact(state, item);
      profile.keeperScore = keeperScore(state, item, profile);
      return profile;
    });
    const documentFrequency = new Map();
    profiles.forEach((profile) => new Set(profile.topicTokens).forEach((token) => documentFrequency.set(token, (documentFrequency.get(token) || 0) + 1)));
    const weights = new Map();
    const count = Math.max(1, profiles.length);
    documentFrequency.forEach((frequency, token) => weights.set(token, Math.log((count + 1) / (frequency + 1)) + 1));
    return { profiles, weights };
  }

  function broadSpecificRelation(left, right, similarity) {
    if (!similarity.shared.length) return false;
    const leftSize = left.topicTokens.length;
    const rightSize = right.topicTokens.length;
    const sizeDifference = Math.abs(leftSize - rightSize);
    return similarity.containment >= 0.40 && sizeDifference >= 1;
  }

  function evaluatePair(left, right, weights) {
    const exactTopic = Boolean(left.normalizedTopic && left.normalizedTopic === right.normalizedTopic);
    const exactReference = Boolean(left.normalizedReference && left.normalizedReference === right.normalizedReference);
    const sameCode = Boolean(left.code && left.code === right.code);
    const disciplineSimilarity = simpleJaccard(left.disciplineTokens, right.disciplineTokens);
    const sameDiscipline = Boolean(
      left.normalizedDiscipline && right.normalizedDiscipline
      && (left.normalizedDiscipline === right.normalizedDiscipline || disciplineSimilarity >= 0.72)
    );
    const topicSimilarity = weightedSimilarity(left.topicTokens, right.topicTokens, weights);
    const characterSimilarity = trigramSimilarity(left.normalizedTopic, right.normalizedTopic);
    const hierarchy = codeHierarchy(left.code, right.code);
    const crossCoverage = coverageCrossReferences(left, right);
    const hasSharedCoverage = sharedCoverage(left, right);
    const broadSpecific = broadSpecificRelation(left, right, topicSimilarity);
    const rareAnchor = topicSimilarity.shared.some((token) => (weights.get(token) || 1) >= 1.15);

    if (!exactTopic && !exactReference && !sameCode && !crossCoverage && !hasSharedCoverage && !hierarchy && !topicSimilarity.shared.length) return null;
    if (!sameDiscipline && disciplineSimilarity < 0.34 && !sameCode && !crossCoverage && !hasSharedCoverage) return null;

    let score = 0;
    if (exactTopic) score = Math.max(score, 0.94);
    if (exactReference) score = Math.max(score, 0.92);
    if (sameCode && sameDiscipline) score = Math.max(score, 0.86);
    score += topicSimilarity.jaccard * 0.34;
    score += topicSimilarity.containment * 0.18;
    score += characterSimilarity * 0.12;
    score += disciplineSimilarity * 0.12;
    if (sameDiscipline) score += 0.08;
    if (sameCode) score += 0.18;
    if (hierarchy) score += 0.08;
    if (crossCoverage) score += 0.30;
    if (hasSharedCoverage) score += 0.28;
    if (broadSpecific) score += 0.08;
    if (rareAnchor) score += 0.04;
    score = Math.min(0.99, score);

    let classification = "related";
    if (exactTopic || exactReference || hasSharedCoverage || (sameCode && topicSimilarity.containment >= 0.65)) classification = "exact";
    else if (score >= 0.72 || crossCoverage) classification = "probable";
    else if (score >= 0.46 || hierarchy || broadSpecific) classification = "overlap";
    else if (score < 0.40) return null;

    const confidenceFloor = classification === "exact" ? 94 : classification === "probable" ? 72 : classification === "overlap" ? 48 : 42;
    const confidence = Math.max(confidenceFloor, Math.round(score * 100));
    const reasons = [];
    if (exactTopic) reasons.push("mesmo título normalizado");
    if (exactReference) reasons.push("mesma referência textual");
    if (sameCode) reasons.push("mesmo código de edital");
    if (hasSharedCoverage) reasons.push("mesma redação oficial vinculada");
    if (crossCoverage) reasons.push("uma meta já referencia a redação oficial da outra");
    if (topicSimilarity.jaccard >= 0.65) reasons.push("alta equivalência de palavras-chave");
    else if (topicSimilarity.shared.length) reasons.push(`termos em comum: ${topicSimilarity.shared.slice(0, 4).join(", ")}`);
    if (hierarchy) reasons.push("relação de código pai e subitem");
    if (broadSpecific) reasons.push("um título aparenta abranger o outro");
    if (sameDiscipline) reasons.push("mesma área disciplinar");

    return {
      key: pairKey(left.id, right.id),
      left,
      right,
      classification,
      confidence,
      score,
      reasons,
      evidence: {
        exactTopic,
        exactReference,
        sameCode,
        sameDiscipline,
        disciplineSimilarity,
        topicJaccard: topicSimilarity.jaccard,
        topicContainment: topicSimilarity.containment,
        characterSimilarity,
        sharedTokens: topicSimilarity.shared,
        hierarchy,
        crossCoverage,
        sharedCoverage: hasSharedCoverage,
        broadSpecific
      }
    };
  }

  function decisionStore(state) {
    const source = state?.duplicateDiagnostics?.decisions;
    return source && typeof source === "object" && !Array.isArray(source) ? source : {};
  }

  function recommendationForPair(pair) {
    const leftScore = pair.left.keeperScore;
    const rightScore = pair.right.keeperScore;
    const keep = leftScore >= rightScore ? pair.left : pair.right;
    const remove = keep === pair.left ? pair.right : pair.left;
    const margin = Math.abs(leftScore - rightScore);
    const reasons = [];
    if (keep.impact.references > remove.impact.references) reasons.push("possui mais vínculos históricos");
    if (keep.impact.hours > remove.impact.hours) reasons.push("possui mais tempo estudado");
    if (keep.impact.materialCount > remove.impact.materialCount) reasons.push("possui mais materiais vinculados");
    if (keep.impact.coverageCount > remove.impact.coverageCount) reasons.push("possui maior cobertura oficial");
    if (CATEGORY_RANK.get(categoryOf(keep.item)) > CATEGORY_RANK.get(categoryOf(remove.item))) reasons.push("tem categoria mais prioritária");
    if (!reasons.length) reasons.push("apresenta o conjunto de dados mais completo");
    return { keepId: keep.id, removeId: remove.id, margin, reasons };
  }

  function diagnoseState(state, options = {}) {
    const startedAt = Date.now();
    const { profiles, weights } = buildProfiles(state || {});
    const decisions = decisionStore(state || {});
    const pairs = [];
    for (let leftIndex = 0; leftIndex < profiles.length; leftIndex += 1) {
      for (let rightIndex = leftIndex + 1; rightIndex < profiles.length; rightIndex += 1) {
        const pair = evaluatePair(profiles[leftIndex], profiles[rightIndex], weights);
        if (!pair) continue;
        const decision = decisions[pair.key] || null;
        pair.decision = decision && DECISION_ACTIONS.has(decision.action) ? cloneData(decision) : null;
        pair.recommendation = recommendationForPair(pair);
        pairs.push(pair);
      }
    }
    const priority = { exact: 4, probable: 3, overlap: 2, related: 1 };
    pairs.sort((a, b) => (priority[b.classification] - priority[a.classification]) || (b.confidence - a.confidence) || a.left.index - b.left.index);
    const visiblePairs = options.includeDecided ? pairs : pairs.filter((pair) => pair.decision?.action !== "not-duplicate" && pair.decision?.action !== "consolidated");
    const counts = {
      items: profiles.length,
      pairs: pairs.length,
      exact: pairs.filter((pair) => pair.classification === "exact").length,
      probable: pairs.filter((pair) => pair.classification === "probable").length,
      overlap: pairs.filter((pair) => pair.classification === "overlap").length,
      related: pairs.filter((pair) => pair.classification === "related").length,
      pending: pairs.filter((pair) => !pair.decision || pair.decision.action === "later").length,
      dismissed: pairs.filter((pair) => pair.decision?.action === "not-duplicate").length,
      consolidated: pairs.filter((pair) => pair.decision?.action === "consolidated").length
    };
    return {
      version: VERSION,
      scannedAt: new Date().toISOString(),
      elapsedMs: Date.now() - startedAt,
      profiles,
      pairs,
      visiblePairs,
      counts
    };
  }

  function ensureDiagnosticsStore(state) {
    if (!state.duplicateDiagnostics || typeof state.duplicateDiagnostics !== "object" || Array.isArray(state.duplicateDiagnostics)) {
      state.duplicateDiagnostics = {};
    }
    state.duplicateDiagnostics.version = VERSION;
    state.duplicateDiagnostics.decisions ||= {};
    state.duplicateDiagnostics.audit ||= [];
    return state.duplicateDiagnostics;
  }

  function setPairDecision(state, leftId, rightId, action, extra = {}) {
    if (!DECISION_ACTIONS.has(action)) throw new Error("Decisão de duplicidade inválida.");
    const store = ensureDiagnosticsStore(state);
    const key = pairKey(leftId, rightId);
    store.decisions[key] = {
      action,
      itemIds: [leftId, rightId].sort(),
      decidedAt: new Date().toISOString(),
      version: VERSION,
      ...cloneData(extra)
    };
    store.lastScanAt = new Date().toISOString();
    return store.decisions[key];
  }

  function valueEmpty(value) {
    return value === undefined || value === null || value === "" || (Array.isArray(value) && value.length === 0);
  }

  function mergePrimitiveArrays(left, right) {
    const map = new Map();
    [...(Array.isArray(left) ? left : []), ...(Array.isArray(right) ? right : [])].forEach((entry) => {
      const key = typeof entry === "object" ? stableSerialize(entry) : `${typeof entry}:${String(entry)}`;
      if (!map.has(key)) map.set(key, cloneData(entry));
    });
    return [...map.values()];
  }

  function mergeObjectsPreferKeeper(keeper, removed, field = "") {
    if (Array.isArray(keeper) || Array.isArray(removed)) return mergePrimitiveArrays(keeper, removed);
    if (!keeper || typeof keeper !== "object") return valueEmpty(keeper) ? cloneData(removed) : cloneData(keeper);
    if (!removed || typeof removed !== "object") return cloneData(keeper);
    const result = cloneData(keeper);
    const keys = new Set([...Object.keys(removed), ...Object.keys(keeper)]);
    keys.forEach((key) => {
      if (key === "id") return;
      const keepValue = keeper[key];
      const removeValue = removed[key];
      if (Array.isArray(keepValue) || Array.isArray(removeValue)) {
        result[key] = mergePrimitiveArrays(keepValue, removeValue);
      } else if (keepValue && removeValue && typeof keepValue === "object" && typeof removeValue === "object") {
        result[key] = mergeObjectsPreferKeeper(keepValue, removeValue, key);
      } else if (SUM_NUMERIC_FIELDS.has(key)) {
        result[key] = Math.max(0, Number(keepValue) || 0) + Math.max(0, Number(removeValue) || 0);
      } else if (MAX_NUMERIC_FIELDS.has(key)) {
        result[key] = Math.max(Number(keepValue) || 0, Number(removeValue) || 0);
      } else if (key === "status" || key === "state" || key === "studyStatus") {
        result[key] = statusRank(keepValue) >= statusRank(removeValue) ? cloneData(keepValue) : cloneData(removeValue);
      } else if (key === "category" || key === "contestCategory" || key === "classification") {
        result[key] = (CATEGORY_RANK.get(String(keepValue || "").toUpperCase()) || 0) >= (CATEGORY_RANK.get(String(removeValue || "").toUpperCase()) || 0)
          ? cloneData(keepValue)
          : cloneData(removeValue);
      } else if (valueEmpty(keepValue) && !valueEmpty(removeValue)) {
        result[key] = cloneData(removeValue);
      }
    });
    return result;
  }

  function mergeSyllabusItems(keeper, removed, decidedAt) {
    const merged = mergeObjectsPreferKeeper(keeper, removed);
    merged.id = keeper.id;
    merged.code = keeper.code || removed.code || merged.code;
    merged.discipline = keeper.discipline || removed.discipline || merged.discipline;
    merged.topic = keeper.topic || keeper.subject || removed.topic || removed.subject || merged.topic;
    merged.officialCoverage = uniqueObjects([
      ...(Array.isArray(keeper.officialCoverage) ? keeper.officialCoverage : []),
      ...(Array.isArray(removed.officialCoverage) ? removed.officialCoverage : [])
    ]);
    merged.aliases = mergePrimitiveArrays(keeper.aliases, [
      ...(Array.isArray(removed.aliases) ? removed.aliases : []),
      {
        id: removed.id,
        code: removed.code || codeOf(removed),
        discipline: removed.discipline || itemDiscipline(removed),
        topic: removed.topic || removed.subject || itemLabel(removed),
        consolidatedAt: decidedAt
      }
    ]);
    merged.mergedFrom = mergePrimitiveArrays(keeper.mergedFrom, [removed.id, ...(Array.isArray(removed.mergedFrom) ? removed.mergedFrom : [])]);
    merged.updatedAt = decidedAt;
    return merged;
  }

  function remapItemLinks(value, removedId, keeperId, seen = new WeakSet(), path = "root") {
    if (!value || typeof value !== "object") return { changed: 0, paths: [] };
    if (seen.has(value)) return { changed: 0, paths: [] };
    seen.add(value);
    let changed = 0;
    const paths = [];
    if (Array.isArray(value)) {
      value.forEach((entry, index) => {
        const report = remapItemLinks(entry, removedId, keeperId, seen, `${path}[${index}]`);
        changed += report.changed;
        paths.push(...report.paths);
      });
      return { changed, paths };
    }

    if (Object.prototype.hasOwnProperty.call(value, removedId)) {
      if (!Object.prototype.hasOwnProperty.call(value, keeperId)) value[keeperId] = cloneData(value[removedId]);
      else if (value[keeperId] && value[removedId] && typeof value[keeperId] === "object" && typeof value[removedId] === "object") {
        value[keeperId] = mergeObjectsPreferKeeper(value[keeperId], value[removedId]);
      }
      delete value[removedId];
      changed += 1;
      paths.push(`${path}.{${removedId}}`);
    }

    Object.entries(value).forEach(([key, current]) => {
      if (LINK_FIELDS.has(key) && current === removedId) {
        value[key] = keeperId;
        value.updatedAt ||= new Date().toISOString();
        changed += 1;
        paths.push(`${path}.${key}`);
        return;
      }
      if (current && typeof current === "object") {
        const report = remapItemLinks(current, removedId, keeperId, seen, `${path}.${key}`);
        changed += report.changed;
        paths.push(...report.paths);
      }
    });
    return { changed, paths };
  }

  function syncCollectionKeySafe(item, collection) {
    try {
      if (typeof syncCollectionKey === "function") return syncCollectionKey(item, collection);
    } catch {}
    return String(item?.id || item?.uuid || item?.key || "");
  }

  function addSyllabusTombstone(state, removedItem, decidedAt) {
    const key = syncCollectionKeySafe(removedItem, "syllabusItems") || removedItem.id;
    state.syncTombstones ||= { schemaVersion: 1, collections: {} };
    state.syncTombstones.schemaVersion ||= 1;
    state.syncTombstones.collections ||= {};
    state.syncTombstones.collections.syllabusItems ||= {};
    state.syncTombstones.collections.syllabusItems[key] = {
      key,
      collection: "syllabusItems",
      deletedAt: decidedAt,
      deviceId: (() => {
        try { return typeof getDeviceId === "function" ? getDeviceId() : ""; } catch { return ""; }
      })(),
      reason: "duplicate-consolidation",
      version: VERSION
    };
    return key;
  }

  function consolidateItems(state, keeperId, removedId, options = {}) {
    if (!state || typeof state !== "object") throw new Error("Estado do aplicativo inválido.");
    if (!keeperId || !removedId || keeperId === removedId) throw new Error("Escolha dois itens diferentes para consolidar.");
    const items = Array.isArray(state.syllabusItems) ? state.syllabusItems : [];
    const keeper = items.find((item) => item?.id === keeperId);
    const removed = items.find((item) => item?.id === removedId);
    if (!keeper || !removed) throw new Error("Um dos temas não foi localizado no edital atual.");

    const decidedAt = options.decidedAt || new Date().toISOString();
    const before = {
      itemCount: items.length,
      keeper: cloneData(keeper),
      removed: cloneData(removed),
      keeperImpact: itemImpact(state, keeper),
      removedImpact: itemImpact(state, removed)
    };

    const merged = mergeSyllabusItems(keeper, removed, decidedAt);
    const mappingRows = Array.isArray(state.contestSyllabusMap) ? state.contestSyllabusMap : [];
    mappingRows.forEach((row) => {
      if (row?.syllabusItemId === removedId) {
        row.syllabusItemId = keeperId;
        row.updatedAt = decidedAt;
      }
    });
    merged.officialCoverage = uniqueObjects([
      ...(Array.isArray(merged.officialCoverage) ? merged.officialCoverage : []),
      ...mappingRows.filter((row) => row?.syllabusItemId === keeperId).map((row) => ({
        contestId: row.contestId,
        code: row.code,
        discipline: row.discipline,
        topic: row.topic,
        subtopic: row.subtopic,
        reference: row.reference,
        classification: row.classification,
        source: row.source
      }))
    ]);

    state.syllabusItems = items
      .filter((item) => item?.id !== removedId)
      .map((item) => item?.id === keeperId ? merged : item);

    let remappedLinks = 0;
    const remappedPaths = [];
    Object.keys(state).forEach((key) => {
      if (["syllabusItems", "contestSyllabusMap", "syncTombstones", "duplicateDiagnostics"].includes(key)) return;
      const report = remapItemLinks(state[key], removedId, keeperId, new WeakSet(), `state.${key}`);
      remappedLinks += report.changed;
      remappedPaths.push(...report.paths);
    });

    if (state.schedulableSettings && typeof state.schedulableSettings === "object") {
      const keepSetting = state.schedulableSettings[keeperId];
      const removeSetting = state.schedulableSettings[removedId];
      if (removeSetting !== undefined) {
        state.schedulableSettings[keeperId] = keepSetting === undefined
          ? cloneData(removeSetting)
          : mergeObjectsPreferKeeper(keepSetting, removeSetting);
        delete state.schedulableSettings[removedId];
      }
    }

    ["selectedSyllabusItemId", "activeSyllabusItemId", "currentSyllabusItemId"].forEach((key) => {
      if (state[key] === removedId) state[key] = keeperId;
    });

    const tombstoneKey = addSyllabusTombstone(state, removed, decidedAt);
    const diagnostics = ensureDiagnosticsStore(state);
    const decision = setPairDecision(state, keeperId, removedId, "consolidated", {
      keeperId,
      removedId,
      backupId: options.backupId || "",
      remappedLinks
    });
    const auditEntry = {
      id: options.auditId || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      action: "consolidated",
      decidedAt,
      keeperId,
      removedId,
      pairKey: pairKey(keeperId, removedId),
      backupId: options.backupId || "",
      remappedLinks,
      remappedPaths: remappedPaths.slice(0, 100),
      tombstoneKey,
      before,
      after: {
        itemCount: state.syllabusItems.length,
        keeper: cloneData(merged),
        keeperImpact: itemImpact(state, merged)
      },
      version: VERSION
    };
    diagnostics.audit.unshift(auditEntry);
    diagnostics.audit = diagnostics.audit.slice(0, 100);
    diagnostics.lastConsolidationAt = decidedAt;
    diagnostics.lastScanAt = decidedAt;
    state.migrations ||= {};
    state.migrations[VERSION] = {
      version: VERSION,
      appliedAt: state.migrations[VERSION]?.appliedAt || decidedAt,
      lastConsolidationAt: decidedAt,
      consolidations: (Number(state.migrations[VERSION]?.consolidations) || 0) + 1
    };

    return {
      changed: true,
      keeperId,
      removedId,
      remappedLinks,
      removedItems: before.itemCount - state.syllabusItems.length,
      officialCoverage: merged.officialCoverage.length,
      tombstoneKey,
      decision,
      auditEntry
    };
  }

  const RECOMMENDED_BATCH_PROBABLE_CONFIDENCE = 90;

  function recommendedBatchPlan(report, options = {}) {
    const probableConfidence = Math.max(72, Math.min(99,
      Number(options.probableConfidence) || RECOMMENDED_BATCH_PROBABLE_CONFIDENCE
    ));
    const pairs = Array.isArray(report?.pairs) ? report.pairs : [];
    const eligiblePairs = [];
    const excluded = {
      overlapOrRelated: 0,
      lowConfidence: 0,
      differentDiscipline: 0,
      alreadyDecided: 0,
      indirectConflict: 0
    };

    pairs.forEach((pair) => {
      if (pair?.decision) {
        excluded.alreadyDecided += 1;
        return;
      }
      if (pair?.classification !== "exact" && pair?.classification !== "probable") {
        excluded.overlapOrRelated += 1;
        return;
      }
      if (pair.classification === "probable" && Number(pair.confidence) < probableConfidence) {
        excluded.lowConfidence += 1;
        return;
      }
      if (pair?.evidence?.sameDiscipline !== true) {
        excluded.differentDiscipline += 1;
        return;
      }
      if (!pair?.left?.id || !pair?.right?.id || !pair?.recommendation?.keepId || !pair?.recommendation?.removeId) return;
      eligiblePairs.push(pair);
    });

    const adjacency = new Map();
    const profileById = new Map();
    const pairByKey = new Map();
    const connect = (from, to) => {
      if (!adjacency.has(from)) adjacency.set(from, new Set());
      adjacency.get(from).add(to);
    };
    eligiblePairs.forEach((pair) => {
      profileById.set(pair.left.id, pair.left);
      profileById.set(pair.right.id, pair.right);
      connect(pair.left.id, pair.right.id);
      connect(pair.right.id, pair.left.id);
      pairByKey.set(pairKey(pair.left.id, pair.right.id), pair);
    });

    const visited = new Set();
    const groups = [];
    const actions = [];
    [...adjacency.keys()].forEach((startId) => {
      if (visited.has(startId)) return;
      const stack = [startId];
      const memberIds = [];
      visited.add(startId);
      while (stack.length) {
        const currentId = stack.pop();
        memberIds.push(currentId);
        (adjacency.get(currentId) || []).forEach((nextId) => {
          if (visited.has(nextId)) return;
          visited.add(nextId);
          stack.push(nextId);
        });
      }

      const ranked = memberIds
        .map((id) => profileById.get(id))
        .filter(Boolean)
        .sort((left, right) =>
          (Number(right.keeperScore) - Number(left.keeperScore))
          || (Number(right.impact?.references) - Number(left.impact?.references))
          || (Number(right.impact?.coverageCount) - Number(left.impact?.coverageCount))
          || (Number(left.index) - Number(right.index))
        );
      const keeper = ranked[0];
      if (!keeper) return;

      const groupActions = [];
      ranked.slice(1).forEach((removed) => {
        const directPair = pairByKey.get(pairKey(keeper.id, removed.id));
        if (!directPair) {
          excluded.indirectConflict += 1;
          return;
        }
        const action = {
          keeperId: keeper.id,
          removedId: removed.id,
          keeperLabel: keeper.label,
          removedLabel: removed.label,
          classification: directPair.classification,
          confidence: directPair.confidence,
          pairKey: directPair.key
        };
        actions.push(action);
        groupActions.push(action);
      });
      if (groupActions.length) groups.push({ keeperId: keeper.id, keeperLabel: keeper.label, actions: groupActions });
    });

    return {
      version: VERSION,
      probableConfidence,
      eligiblePairs: eligiblePairs.length,
      groups,
      actions,
      excluded
    };
  }

  function stateCounts(state = {}) {
    return {
      syllabusItems: Array.isArray(state.syllabusItems) ? state.syllabusItems.length : 0,
      studies: Array.isArray(state.studies) ? state.studies.length : 0,
      dailyGoals: Array.isArray(state.dailyGoals) ? state.dailyGoals.length : 0,
      questionLogs: Array.isArray(state.questionLogs) ? state.questionLogs.length : 0,
      materials: Array.isArray(state.materials) ? state.materials.length : 0,
      questionBank: Array.isArray(state.questionBank) ? state.questionBank.length : 0,
      simulados: Array.isArray(state.simulados) ? state.simulados.length : 0
    };
  }

  function checksumText(text) {
    let hash = 2166136261;
    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return `fnv1a-json-v2-${(hash >>> 0).toString(16).padStart(8, "0")}-${text.length}`;
  }

  function checksumState(value) {
    return checksumText(JSON.stringify(value || {}));
  }

  function openBackupDatabase() {
    return new Promise((resolve, reject) => {
      if (typeof indexedDB === "undefined") {
        reject(new Error("IndexedDB indisponível para criar a cópia de segurança."));
        return;
      }
      const request = indexedDB.open(BACKUP_DB_NAME, 1);
      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains(BACKUP_STORE)) database.createObjectStore(BACKUP_STORE, { keyPath: "id" });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error("Falha ao abrir o banco de segurança."));
      request.onblocked = () => reject(new Error("Banco de segurança bloqueado por outra aba."));
    });
  }

  function runBackupOperation(mode, operation) {
    return openBackupDatabase().then((database) => new Promise((resolve, reject) => {
      const transaction = database.transaction(BACKUP_STORE, mode);
      const store = transaction.objectStore(BACKUP_STORE);
      const request = operation(store);
      transaction.oncomplete = () => { database.close(); resolve(request?.result); };
      transaction.onerror = () => { database.close(); reject(transaction.error || request?.error || new Error("Falha no banco de segurança.")); };
      transaction.onabort = () => { database.close(); reject(transaction.error || request?.error || new Error("Operação de segurança abortada.")); };
    }));
  }

  async function listBackups() {
    const rows = await runBackupOperation("readonly", (store) => store.getAll()).catch(() => []);
    return (Array.isArray(rows) ? rows : []).sort((a, b) => Date.parse(b.createdAt || "") - Date.parse(a.createdAt || ""));
  }

  async function saveBackupSnapshot(state, label = "before-consolidation") {
    const snapshotState = cloneData(state);
    const checksum = checksumState(snapshotState);
    const existing = await listBackups();
    const duplicate = existing.find((row) => row.checksum === checksum);
    if (duplicate) return duplicate;
    const createdAt = new Date().toISOString();
    const record = {
      id: `${Date.now()}-${checksum.slice(-12)}`,
      version: VERSION,
      createdAt,
      label,
      checksum,
      counts: stateCounts(snapshotState),
      data: snapshotState
    };
    await runBackupOperation("readwrite", (store) => store.put(record));
    const after = await listBackups();
    const stale = after.slice(BACKUP_LIMIT);
    if (stale.length) {
      await runBackupOperation("readwrite", (store) => {
        stale.forEach((row) => store.delete(row.id));
        return null;
      });
    }
    try {
      localStorage.setItem("aldusDuplicateDiagnosticsLastBackupV260", JSON.stringify({
        id: record.id,
        createdAt,
        checksum,
        counts: record.counts
      }));
    } catch {}
    return record;
  }

  async function deleteBackup(id) {
    if (!id) return false;
    await runBackupOperation("readwrite", (store) => store.delete(id));
    return true;
  }

  function runtimeState() {
    try {
      if (typeof state !== "undefined" && state && typeof state === "object" && Array.isArray(state.syllabusItems)) return state;
    } catch {}
    return null;
  }

  async function readMainIndexedDBRecord() {
    if (typeof loadStateFromIndexedDB === "function") return loadStateFromIndexedDB();
    return new Promise((resolve, reject) => {
      if (typeof indexedDB === "undefined") return reject(new Error("IndexedDB indisponível."));
      const request = indexedDB.open("metas-estudo-db");
      request.onsuccess = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains("appState")) {
          database.close();
          resolve(null);
          return;
        }
        const transaction = database.transaction("appState", "readonly");
        const get = transaction.objectStore("appState").get("current");
        get.onsuccess = () => resolve(get.result || null);
        get.onerror = () => reject(get.error || new Error("Falha ao ler o estado principal."));
        transaction.oncomplete = () => database.close();
      };
      request.onerror = () => reject(request.error || new Error("Falha ao abrir o banco principal."));
    });
  }

  async function loadCurrentState() {
    const runtime = runtimeState();
    if (runtime) return { state: runtime, source: "runtime", detached: false };
    const record = await readMainIndexedDBRecord();
    if (record?.data && typeof record.data === "object") return { state: cloneData(record.data), source: "indexeddb", detached: true };
    try {
      const local = JSON.parse(localStorage.getItem(MAIN_LOCAL_KEY) || "null");
      if (local && typeof local === "object") return { state: local, source: "localStorage", detached: true };
    } catch {}
    throw new Error("Não foi possível localizar os dados atuais do edital.");
  }

  async function writeMainIndexedDBState(nextState) {
    if (typeof saveStateToIndexedDB === "function") return saveStateToIndexedDB(nextState, { detachedSnapshot: true });
    const serialized = JSON.stringify(nextState);
    const record = {
      id: "current",
      schemaVersion: 1,
      savedAt: new Date().toISOString(),
      checksum: checksumText(serialized),
      serializedSize: serialized.length,
      data: cloneData(nextState)
    };
    return new Promise((resolve, reject) => {
      const request = indexedDB.open("metas-estudo-db", 1);
      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains("appState")) database.createObjectStore("appState", { keyPath: "id" });
      };
      request.onsuccess = () => {
        const database = request.result;
        const transaction = database.transaction("appState", "readwrite");
        transaction.objectStore("appState").put(record);
        transaction.oncomplete = () => { database.close(); resolve(record); };
        transaction.onerror = () => { database.close(); reject(transaction.error || new Error("Falha ao gravar o estado principal.")); };
      };
      request.onerror = () => reject(request.error || new Error("Falha ao abrir o banco principal."));
    });
  }

  async function persistCurrentState(nextState, source = "runtime") {
    if (source === "runtime") {
      try {
        if (typeof saveData === "function") await Promise.resolve(saveData());
      } catch (error) {
        console.warn(`[${VERSION}] saveData não concluiu a persistência; será usada a gravação direta.`, error);
      }
    }
    const saved = await writeMainIndexedDBState(nextState);
    const verified = await readMainIndexedDBRecord();
    if (!verified?.data || checksumState(verified.data) !== checksumState(nextState)) {
      throw new Error("A validação da gravação após a consolidação falhou.");
    }
    return saved;
  }

  async function restoreBackupSnapshot(record) {
    if (!record?.data || typeof record.data !== "object") throw new Error("Cópia de segurança inválida.");
    await writeMainIndexedDBState(cloneData(record.data));
    try {
      localStorage.setItem("aldusDuplicateDiagnosticsRestoredV260", JSON.stringify({
        backupId: record.id,
        restoredAt: new Date().toISOString(),
        checksum: record.checksum
      }));
    } catch {}
    return true;
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function formatHours(value) {
    const hours = Math.max(0, Number(value) || 0);
    if (hours < 1) return `${Math.round(hours * 60)} min`;
    const whole = Math.floor(hours);
    const minutes = Math.round((hours - whole) * 60);
    return minutes ? `${whole}h ${minutes}min` : `${whole}h`;
  }

  function classificationLabel(value) {
    return ({ exact: "Duplicidade exata", probable: "Duplicidade provável", overlap: "Sobreposição temática", related: "Tema relacionado" })[value] || value;
  }

  function itemCardHtml(profile, side, recommendation) {
    const item = profile.item;
    const recommended = recommendation?.keepId === profile.id;
    const contests = profile.contests.length ? profile.contests.join(", ") : "Não informado";
    return `
      <article class="aldus-dup-item ${recommended ? "is-recommended" : ""}" data-side="${side}">
        <div class="aldus-dup-item-heading">
          <span class="aldus-dup-side">Item ${side}</span>
          ${recommended ? '<span class="aldus-dup-recommended">Recomendado para permanecer</span>' : ""}
        </div>
        <h4>${escapeHtml(profile.disciplineLabel)}</h4>
        <p class="aldus-dup-topic">${escapeHtml(profile.label)}</p>
        <dl class="aldus-dup-details">
          <div><dt>Código</dt><dd>${escapeHtml(profile.code || "Não informado")}</dd></div>
          <div><dt>Categoria</dt><dd>${escapeHtml(categoryOf(item) || "Não informada")}</dd></div>
          <div><dt>Status</dt><dd>${escapeHtml(statusOf(item))}</dd></div>
          <div><dt>Diagnóstico</dt><dd>${escapeHtml(diagnosisOf(item))}</dd></div>
          <div><dt>Tempo</dt><dd>${escapeHtml(formatHours(profile.impact.hours))}</dd></div>
          <div><dt>Concursos</dt><dd>${escapeHtml(contests)}</dd></div>
          <div><dt>Redações vinculadas</dt><dd>${profile.impact.coverageCount}</dd></div>
          <div><dt>Vínculos históricos</dt><dd>${profile.impact.references}</dd></div>
          <div><dt>Materiais/Fábrica</dt><dd>${profile.impact.materialCount}</dd></div>
        </dl>
      </article>`;
  }

  function pairCardHtml(pair) {
    const later = pair.decision?.action === "later";
    const recommendedProfile = pair.recommendation.keepId === pair.left.id ? pair.left : pair.right;
    const recommendedRemove = recommendedProfile === pair.left ? pair.right : pair.left;
    const recommendationText = `Manter “${recommendedProfile.label}” e consolidar “${recommendedRemove.label}”`;
    return `
      <section class="aldus-dup-pair" data-pair-key="${escapeHtml(pair.key)}" data-classification="${escapeHtml(pair.classification)}" data-decision="${escapeHtml(pair.decision?.action || "pending")}">
        <header class="aldus-dup-pair-header">
          <div>
            <span class="aldus-dup-badge is-${escapeHtml(pair.classification)}">${escapeHtml(classificationLabel(pair.classification))}</span>
            ${later ? '<span class="aldus-dup-badge is-later">Analisar depois</span>' : ""}
            <h3>${pair.confidence}% de confiança</h3>
          </div>
          <button type="button" class="aldus-dup-card-toggle" aria-expanded="true" aria-label="Recolher cartão">−</button>
        </header>
        <div class="aldus-dup-card-body">
          <div class="aldus-dup-reason-box">
            <strong>Por que apareceu no diagnóstico?</strong>
            <p>${escapeHtml(pair.reasons.join("; ") || "Semelhança estrutural detectada.")}</p>
            <small><strong>Sugestão técnica:</strong> ${escapeHtml(recommendationText)}. A decisão continua sendo sua.</small>
          </div>
          <div class="aldus-dup-comparison">
            ${itemCardHtml(pair.left, "A", pair.recommendation)}
            ${itemCardHtml(pair.right, "B", pair.recommendation)}
          </div>
          <div class="aldus-dup-actions" role="group" aria-label="Escolha de consolidação">
            <button type="button" class="aldus-dup-action is-primary" data-action="keep" data-keep-id="${escapeHtml(pair.left.id)}" data-remove-id="${escapeHtml(pair.right.id)}">Manter A e consolidar B</button>
            <button type="button" class="aldus-dup-action is-primary" data-action="keep" data-keep-id="${escapeHtml(pair.right.id)}" data-remove-id="${escapeHtml(pair.left.id)}">Manter B e consolidar A</button>
            <button type="button" class="aldus-dup-action" data-action="not-duplicate" data-left-id="${escapeHtml(pair.left.id)}" data-right-id="${escapeHtml(pair.right.id)}">Não são duplicados</button>
            <button type="button" class="aldus-dup-action" data-action="later" data-left-id="${escapeHtml(pair.left.id)}" data-right-id="${escapeHtml(pair.right.id)}">Analisar depois</button>
          </div>
        </div>
      </section>`;
  }

  function shellHtml() {
    return `
      <div class="aldus-dup-backdrop" data-dup-close></div>
      <section class="aldus-dup-dialog" role="dialog" aria-modal="true" aria-labelledby="aldusDupTitle" tabindex="-1">
        <header class="aldus-dup-dialog-header">
          <div>
            <span class="aldus-dup-eyebrow">Integridade do edital</span>
            <h2 id="aldusDupTitle">Diagnóstico integral de duplicações</h2>
            <p>O sistema identifica candidatos, mas nenhuma meta é removida sem a sua escolha.</p>
          </div>
          <button type="button" class="aldus-dup-close" data-dup-close aria-label="Fechar diagnóstico">×</button>
        </header>
        <div class="aldus-dup-dialog-content">
          <div class="aldus-dup-toolbar">
            <div class="aldus-dup-primary-actions">
              <button type="button" class="aldus-dup-run is-primary" data-dup-run>Executar novo diagnóstico</button>
              <button type="button" class="aldus-dup-batch is-primary" data-dup-batch disabled>Consolidar recomendações</button>
            </div>
            <label>Exibir
              <select data-dup-filter>
                <option value="pending">Pendentes</option>
                <option value="exact">Duplicidades exatas</option>
                <option value="probable">Prováveis</option>
                <option value="overlap">Sobreposições</option>
                <option value="later">Analisar depois</option>
                <option value="all">Todos os candidatos</option>
              </select>
            </label>
            <button type="button" class="aldus-dup-undo" data-dup-undo disabled>Desfazer última consolidação</button>
            <button type="button" class="aldus-dup-export" data-dup-export disabled>Exportar diagnóstico</button>
          </div>
          <section class="aldus-dup-batch-preview" data-dup-batch-preview hidden aria-labelledby="aldusDupBatchTitle"></section>
          <div class="aldus-dup-status" data-dup-status role="status" aria-live="polite">Preparando diagnóstico…</div>
          <div class="aldus-dup-summary" data-dup-summary></div>
          <div class="aldus-dup-list" data-dup-list></div>
          <div class="aldus-dup-audit" data-dup-audit></div>
        </div>
      </section>`;
  }

  const ui = {
    root: null,
    report: null,
    loaded: null,
    filter: "pending",
    busy: false,
    batchPlan: null,
    lastFocused: null
  };

  function ensureUi() {
    if (ui.root?.isConnected) return ui.root;
    const root = document.createElement("div");
    root.id = "aldusDuplicateDiagnosticsV260";
    root.className = "aldus-dup-root";
    root.hidden = true;
    root.innerHTML = shellHtml();
    document.body.appendChild(root);
    root.addEventListener("click", handleUiClick);
    root.querySelector("[data-dup-filter]")?.addEventListener("change", (event) => {
      ui.filter = event.target.value;
      renderReport();
    });
    return (ui.root = root);
  }

  function injectOpenLinks() {
    if (document.querySelector("[data-duplicate-diagnostics-open]")) return;
    const targets = [...document.querySelectorAll('[data-view-link="edital"]')];
    targets.forEach((target) => {
      const link = document.createElement("a");
      link.href = "#diagnostico-duplicacoes";
      link.setAttribute("data-duplicate-diagnostics-open", "true");
      link.textContent = "🔎 Diagnóstico de duplicações";
      target.insertAdjacentElement("afterend", link);
    });
    document.addEventListener("click", (event) => {
      const trigger = event.target.closest?.("[data-duplicate-diagnostics-open]");
      if (!trigger) return;
      event.preventDefault();
      openUi();
    });
  }

  function setStatus(message, type = "info") {
    const node = ui.root?.querySelector("[data-dup-status]");
    if (!node) return;
    node.textContent = message;
    node.dataset.type = type;
  }

  function setBusy(value) {
    ui.busy = Boolean(value);
    ui.root?.querySelectorAll("button, select").forEach((control) => {
      if (control.matches("[data-dup-close]")) return;
      if (control.matches("[data-dup-undo]") && !value) return;
      control.disabled = Boolean(value);
    });
    if (!ui.busy) updateBatchButton();
  }

  async function openUi() {
    const root = ensureUi();
    ui.lastFocused = document.activeElement;
    root.hidden = false;
    document.documentElement.classList.add("aldus-dup-open");
    root.querySelector(".aldus-dup-dialog")?.focus();
    await runDiagnostic();
  }

  function closeUi() {
    if (!ui.root || ui.busy) return;
    ui.root.hidden = true;
    document.documentElement.classList.remove("aldus-dup-open");
    ui.lastFocused?.focus?.();
  }

  async function runDiagnostic() {
    if (ui.busy) return;
    setBusy(true);
    setStatus("Analisando integralmente as metas, códigos, vínculos, histórico e materiais…");
    try {
      ui.loaded = await loadCurrentState();
      await new Promise((resolve) => setTimeout(resolve, 0));
      ui.report = diagnoseState(ui.loaded.state, { includeDecided: true });
      ensureDiagnosticsStore(ui.loaded.state).lastScanAt = ui.report.scannedAt;
      renderReport();
      const backups = await listBackups();
      const undo = ui.root.querySelector("[data-dup-undo]");
      if (undo) undo.disabled = backups.length === 0;
      const exporter = ui.root.querySelector("[data-dup-export]");
      if (exporter) exporter.disabled = false;
      setStatus(`Diagnóstico concluído: ${ui.report.counts.items} metas analisadas e ${ui.report.counts.pending} candidatos pendentes.`, "success");
    } catch (error) {
      console.error(`[${VERSION}] Falha no diagnóstico.`, error);
      setStatus(String(error?.message || error), "error");
    } finally {
      setBusy(false);
      const backups = await listBackups();
      const undo = ui.root?.querySelector("[data-dup-undo]");
      if (undo) undo.disabled = backups.length === 0;
      const exporter = ui.root?.querySelector("[data-dup-export]");
      if (exporter) exporter.disabled = !ui.report;
    }
  }

  function filteredPairs() {
    const pairs = ui.report?.pairs || [];
    if (ui.filter === "all") return pairs;
    if (ui.filter === "later") return pairs.filter((pair) => pair.decision?.action === "later");
    if (ui.filter === "pending") return pairs.filter((pair) => !pair.decision || pair.decision.action === "later");
    return pairs.filter((pair) => pair.classification === ui.filter && pair.decision?.action !== "not-duplicate" && pair.decision?.action !== "consolidated");
  }

  function updateBatchButton() {
    const button = ui.root?.querySelector("[data-dup-batch]");
    if (!button) return;
    const plan = ui.report ? recommendedBatchPlan(ui.report) : null;
    const count = plan?.actions.length || 0;
    button.textContent = count ? `Consolidar recomendações (${count})` : "Consolidar recomendações";
    button.disabled = ui.busy || count === 0;
    button.title = count
      ? `${count} consolidações seguras disponíveis para prévia.`
      : "Nenhuma recomendação atende aos critérios seguros do lote.";
  }

  function closeBatchPreview() {
    const preview = ui.root?.querySelector("[data-dup-batch-preview]");
    if (preview) {
      preview.hidden = true;
      preview.innerHTML = "";
    }
    ui.batchPlan = null;
  }

  function previewRecommendedBatch() {
    if (!ui.report || ui.busy) return;
    const plan = recommendedBatchPlan(ui.report);
    ui.batchPlan = plan;
    const preview = ui.root?.querySelector("[data-dup-batch-preview]");
    if (!preview) return;
    if (!plan.actions.length) {
      closeBatchPreview();
      setStatus("Nenhuma recomendação atende aos critérios seguros para consolidação em lote.", "info");
      return;
    }

    const shown = plan.actions.slice(0, 30);
    const remaining = plan.actions.length - shown.length;
    preview.innerHTML = `
      <header>
        <div>
          <span class="aldus-dup-eyebrow">Revisão antes de aplicar</span>
          <h3 id="aldusDupBatchTitle">Prévia da consolidação recomendada</h3>
          <p>Somente duplicidades exatas e prováveis com pelo menos ${plan.probableConfidence}% de confiança, na mesma disciplina e ainda sem decisão.</p>
        </div>
        <button type="button" class="aldus-dup-batch-close" data-dup-batch-cancel aria-label="Fechar prévia">×</button>
      </header>
      <div class="aldus-dup-batch-metrics">
        <div><strong>${plan.actions.length}</strong><span>metas a consolidar</span></div>
        <div><strong>${plan.groups.length}</strong><span>grupos seguros</span></div>
        <div><strong>${plan.excluded.indirectConflict}</strong><span>conflitos mantidos para revisão</span></div>
      </div>
      <ol class="aldus-dup-batch-list">
        ${shown.map((action) => `<li><strong>Manter:</strong> ${escapeHtml(action.keeperLabel || action.keeperId)} <span aria-hidden="true">←</span> <strong>Consolidar:</strong> ${escapeHtml(action.removedLabel || action.removedId)} <small>${escapeHtml(classificationLabel(action.classification))} · ${action.confidence}%</small></li>`).join("")}
      </ol>
      ${remaining > 0 ? `<p class="aldus-dup-batch-more">E mais ${remaining} consolidações incluídas no mesmo lote.</p>` : ""}
      <p class="aldus-dup-batch-safety">Será criada uma única cópia integral antes do lote. Sobreposições, temas relacionados, decisões anteriores e conflitos indiretos não serão alterados.</p>
      <footer>
        <button type="button" class="aldus-dup-batch-cancel" data-dup-batch-cancel>Cancelar</button>
        <button type="button" class="aldus-dup-batch-confirm is-primary" data-dup-batch-confirm>Confirmar ${plan.actions.length} consolidações</button>
      </footer>`;
    preview.hidden = false;
    preview.scrollIntoView?.({ behavior: "smooth", block: "nearest" });
  }

  function summaryHtml(counts) {
    const cards = [
      [counts.items, "Metas analisadas"],
      [counts.exact, "Duplicidades exatas"],
      [counts.probable, "Prováveis"],
      [counts.overlap, "Sobreposições"],
      [counts.pending, "Pendentes de decisão"]
    ];
    return cards.map(([value, label]) => `<div><strong>${value}</strong><span>${escapeHtml(label)}</span></div>`).join("");
  }

  function auditHtml(state) {
    const rows = Array.isArray(state?.duplicateDiagnostics?.audit) ? state.duplicateDiagnostics.audit.slice(0, 5) : [];
    if (!rows.length) return "";
    return `
      <details>
        <summary>Histórico recente de consolidações (${rows.length})</summary>
        <ul>${rows.map((row) => `<li><strong>${escapeHtml(new Date(row.decidedAt).toLocaleString("pt-BR"))}</strong> — manteve ${escapeHtml(row.after?.keeper?.topic || row.after?.keeper?.subject || row.keeperId)} e consolidou ${escapeHtml(row.before?.removed?.topic || row.before?.removed?.subject || row.removedId)} (${row.remappedLinks || 0} vínculos remapeados).</li>`).join("")}</ul>
      </details>`;
  }

  function renderReport() {
    if (!ui.root || !ui.report) return;
    const summary = ui.root.querySelector("[data-dup-summary]");
    const list = ui.root.querySelector("[data-dup-list]");
    const audit = ui.root.querySelector("[data-dup-audit]");
    if (summary) summary.innerHTML = summaryHtml(ui.report.counts);
    const pairs = filteredPairs();
    if (list) list.innerHTML = pairs.length
      ? pairs.map(pairCardHtml).join("")
      : `<div class="aldus-dup-empty"><strong>Nenhum candidato neste filtro.</strong><p>Isso não significa que todas as metas sejam idênticas; apenas que nenhum par alcançou o limiar técnico desta categoria.</p></div>`;
    if (audit) audit.innerHTML = auditHtml(ui.loaded?.state);
    updateBatchButton();
  }

  function pairByIds(leftId, rightId) {
    const key = pairKey(leftId, rightId);
    return ui.report?.pairs.find((pair) => pair.key === key) || null;
  }

  async function persistDecision(leftId, rightId, action) {
    if (!ui.loaded?.state) return;
    setBusy(true);
    try {
      setPairDecision(ui.loaded.state, leftId, rightId, action);
      await persistCurrentState(ui.loaded.state, ui.loaded.source);
      ui.report = diagnoseState(ui.loaded.state, { includeDecided: true });
      renderReport();
      setStatus(action === "not-duplicate" ? "Par marcado como não duplicado." : "Par separado para análise posterior.", "success");
    } catch (error) {
      console.error(`[${VERSION}] Falha ao salvar decisão.`, error);
      setStatus(String(error?.message || error), "error");
    } finally {
      setBusy(false);
    }
  }

  async function applyConsolidation(keeperId, removedId) {
    if (!ui.loaded?.state) return;
    const pair = pairByIds(keeperId, removedId);
    const keeper = pair?.left.id === keeperId ? pair.left : pair?.right;
    const removed = pair?.left.id === removedId ? pair.left : pair?.right;
    const message = [
      `Manter “${keeper?.label || keeperId}” e consolidar “${removed?.label || removedId}”?`,
      "",
      "Os históricos, materiais, redações oficiais e demais vínculos serão transferidos para o item mantido.",
      "Uma cópia integral será criada antes da alteração."
    ].join("\n");
    if (!window.confirm(message)) return;

    setBusy(true);
    setStatus("Criando cópia integral de segurança…");
    try {
      const backup = await saveBackupSnapshot(ui.loaded.state, `before-${pairKey(keeperId, removedId)}`);
      setStatus("Consolidando os vínculos e validando a gravação…");
      const result = consolidateItems(ui.loaded.state, keeperId, removedId, { backupId: backup.id });
      await persistCurrentState(ui.loaded.state, ui.loaded.source);
      setStatus(`Consolidação concluída com ${result.remappedLinks} vínculos remapeados. A página será atualizada.`, "success");
      setTimeout(() => window.location.reload(), 900);
    } catch (error) {
      console.error(`[${VERSION}] Falha na consolidação.`, error);
      setStatus(`A consolidação não foi concluída: ${String(error?.message || error)}`, "error");
    } finally {
      setBusy(false);
    }
  }

  async function applyRecommendedBatch() {
    if (!ui.loaded?.state || !ui.batchPlan?.actions?.length || ui.busy) return;
    const plan = ui.batchPlan;
    const originalState = ui.loaded.state;
    const rollbackState = cloneData(originalState);
    const workingState = cloneData(originalState);
    let runtimeCommitted = false;
    closeBatchPreview();
    setBusy(true);
    setStatus(`Criando cópia integral antes de ${plan.actions.length} consolidações…`);
    try {
      const backup = await saveBackupSnapshot(originalState, `before-recommended-batch-${plan.actions.length}`);
      const decidedAt = new Date().toISOString();
      let remappedLinks = 0;
      plan.actions.forEach((action, index) => {
        const result = consolidateItems(workingState, action.keeperId, action.removedId, {
          backupId: backup.id,
          decidedAt,
          auditId: `batch-${Date.now()}-${index + 1}`
        });
        remappedLinks += result.remappedLinks;
      });
      setStatus("Validando a gravação do lote e todos os vínculos preservados…");
      const persistedState = ui.loaded.source === "runtime"
        ? replaceStateContents(originalState, workingState)
        : workingState;
      runtimeCommitted = persistedState === originalState;
      await persistCurrentState(persistedState, ui.loaded.source);
      ui.loaded.state = persistedState;
      ui.report = diagnoseState(persistedState, { includeDecided: true });
      ensureDiagnosticsStore(persistedState).lastScanAt = ui.report.scannedAt;
      renderReport();
      setBusy(false);
      const backups = await listBackups();
      const undo = ui.root?.querySelector("[data-dup-undo]");
      if (undo) undo.disabled = backups.length === 0;
      setStatus(`Lote concluído: ${plan.actions.length} metas consolidadas e ${remappedLinks} vínculos remapeados. O diagnóstico foi atualizado sem fechar a página.`, "success");
    } catch (error) {
      if (runtimeCommitted) {
        replaceStateContents(originalState, rollbackState);
        await persistCurrentState(originalState, ui.loaded.source).catch((rollbackError) => {
          console.error(`[${VERSION}] Falha ao restaurar o estado ativo após erro no lote.`, rollbackError);
        });
        ui.loaded.state = originalState;
      }
      console.error(`[${VERSION}] Falha na consolidação recomendada em lote.`, error);
      setStatus(`Nenhuma gravação do lote foi confirmada: ${String(error?.message || error)}`, "error");
      setBusy(false);
      updateBatchButton();
    }
  }

  async function undoLastConsolidation() {
    const backups = await listBackups();
    const lastAuditBackupId = ui.loaded?.state?.duplicateDiagnostics?.audit?.find?.((row) => row?.action === "consolidated" && row?.backupId)?.backupId;
    const latest = backups.find((row) => row.id === lastAuditBackupId) || backups[0];
    if (!latest) {
      setStatus("Nenhuma cópia de segurança de consolidação foi encontrada.", "error");
      return;
    }
    if (!window.confirm(`Restaurar a cópia de ${new Date(latest.createdAt).toLocaleString("pt-BR")}? O estado atual será substituído por essa cópia.`)) return;
    setBusy(true);
    setStatus("Restaurando a cópia integral de segurança…");
    try {
      await restoreBackupSnapshot(latest);
      await deleteBackup(latest.id);
      setStatus("Restauração concluída. A página será atualizada.", "success");
      setTimeout(() => window.location.reload(), 700);
    } catch (error) {
      console.error(`[${VERSION}] Falha ao desfazer consolidação.`, error);
      setStatus(String(error?.message || error), "error");
      setBusy(false);
    }
  }

  function exportDiagnostic() {
    if (!ui.report) return;
    const exportData = {
      app: "Aldus Metas Concurso",
      type: "duplicate-diagnostics",
      version: VERSION,
      scannedAt: ui.report.scannedAt,
      counts: ui.report.counts,
      candidates: ui.report.pairs.map((pair) => ({
        key: pair.key,
        classification: pair.classification,
        confidence: pair.confidence,
        reasons: pair.reasons,
        decision: pair.decision,
        recommendation: pair.recommendation,
        itemA: {
          id: pair.left.id,
          code: pair.left.code,
          discipline: pair.left.disciplineLabel,
          topic: pair.left.label,
          impact: pair.left.impact
        },
        itemB: {
          id: pair.right.id,
          code: pair.right.code,
          discipline: pair.right.disciplineLabel,
          topic: pair.right.label,
          impact: pair.right.impact
        }
      }))
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `aldus-diagnostico-duplicacoes-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function handleUiClick(event) {
    const close = event.target.closest?.("[data-dup-close]");
    if (close) return closeUi();
    const run = event.target.closest?.("[data-dup-run]");
    if (run) return runDiagnostic();
    const batch = event.target.closest?.("[data-dup-batch]");
    if (batch) return previewRecommendedBatch();
    const batchCancel = event.target.closest?.("[data-dup-batch-cancel]");
    if (batchCancel) return closeBatchPreview();
    const batchConfirm = event.target.closest?.("[data-dup-batch-confirm]");
    if (batchConfirm) return applyRecommendedBatch();
    const undo = event.target.closest?.("[data-dup-undo]");
    if (undo) return undoLastConsolidation();
    const exporter = event.target.closest?.("[data-dup-export]");
    if (exporter) return exportDiagnostic();
    const toggle = event.target.closest?.(".aldus-dup-card-toggle");
    if (toggle) {
      const card = toggle.closest(".aldus-dup-pair");
      card?.classList.toggle("is-collapsed");
      const expanded = !card?.classList.contains("is-collapsed");
      toggle.setAttribute("aria-expanded", String(expanded));
      toggle.textContent = expanded ? "−" : "+";
      return;
    }
    const action = event.target.closest?.("[data-action]");
    if (!action || ui.busy) return;
    if (action.dataset.action === "keep") return applyConsolidation(action.dataset.keepId, action.dataset.removeId);
    if (action.dataset.action === "not-duplicate") return persistDecision(action.dataset.leftId, action.dataset.rightId, "not-duplicate");
    if (action.dataset.action === "later") return persistDecision(action.dataset.leftId, action.dataset.rightId, "later");
  }

  function install() {
    if (globalThis.__aldusDuplicateDiagnosticsInstalledV260) return;
    globalThis.__aldusDuplicateDiagnosticsInstalledV260 = true;
    const start = () => {
      ensureUi();
      injectOpenLinks();
      const observer = new MutationObserver(() => injectOpenLinks());
      observer.observe(document.documentElement, { childList: true, subtree: true });
      document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && ui.root && !ui.root.hidden) closeUi();
      });
    };
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
    else start();
  }

  const API = Object.freeze({
    VERSION,
    normalizeText,
    normalizeCode,
    textTokens,
    simpleJaccard,
    weightedSimilarity,
    trigramSimilarity,
    codeHierarchy,
    pairKey,
    itemImpact,
    buildProfiles,
    evaluatePair,
    diagnoseState,
    setPairDecision,
    mergeSyllabusItems,
    remapItemLinks,
    consolidateItems,
    recommendedBatchPlan,
    replaceStateContents,
    stateCounts,
    checksumState
  });

  if (typeof module !== "undefined" && module.exports) {
    module.exports = API;
    return;
  }

  if (!globalThis.AldusDuplicateDiagnosticsV304) {
    globalThis.AldusDuplicateDiagnosticsV260 = API;
  }
  if (typeof document !== "undefined") install();
})();
