/* Compatibilidade V349 das prioridades históricas com o catálogo atual do edital. */
(() => {
  "use strict";

  const VERSION = "20260816-runtime-stability-v349";
  const HINTS = Object.freeze({
    "police-inquiry-archiving": { terms: ["arquivamento", "inquerito", "policial"] },
    "law-12850-obstruction": { law: "12850", terms: ["obstrucao", "investigacao", "organizacao", "criminosa"] },
    "law-9605-environmental": { law: "9605", terms: ["crime", "ambiental", "pericia"] },
    "law-8072-heinous": { law: "8072", terms: ["hediondo"] },
    "law-14133-procurement": { law: "14133", terms: ["licitacao", "contratacao", "agente"] },
    "human-rights-global-system": { terms: ["sistema", "global", "protecao", "direitos", "humanos"] }
  });
  const STOP_WORDS = new Set(["a", "ao", "aos", "as", "com", "da", "das", "de", "do", "dos", "e", "em", "na", "nas", "no", "nos", "o", "os", "para", "por", "lei", "leis", "direito", "direitos"]);

  if (typeof seedInitialWrongTopicsV155 !== "function"
      || typeof planningPrioritySignalsV155 !== "function"
      || typeof INITIAL_WRONG_TOPICS_V155 === "undefined") return;

  function normalizeText(value = "") {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[º°ª]/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function compactDigits(value = "") {
    return String(value || "").replace(/\D+/g, "");
  }

  function itemText(item = {}) {
    return [
      item.discipline, item.disciplina, item.subject, item.assunto, item.topic, item.topico,
      item.subtopic, item.subtema, item.reference, item.referencia, item.notes, item.observacoes
    ].filter(Boolean).join(" ");
  }

  function tokens(value = "") {
    return new Set(normalizeText(value).split(" ").filter((token) => token.length > 2 && !STOP_WORDS.has(token)));
  }

  function scoreCandidate(entry, item) {
    const candidateRaw = itemText(item);
    const candidate = normalizeText(candidateRaw);
    const label = normalizeText(entry.label);
    if (!candidate) return -Infinity;

    const hint = HINTS[entry.key] || {};
    if (hint.law && !compactDigits(candidateRaw).includes(hint.law)) return -Infinity;

    let score = hint.law ? 95 : 0;
    if (candidate === label) score += 220;
    else if (candidate.includes(label) || label.includes(candidate)) score += 145;

    const labelTokens = tokens(entry.label);
    const candidateTokens = tokens(candidateRaw);
    let overlap = 0;
    labelTokens.forEach((token) => { if (candidateTokens.has(token)) overlap += 1; });
    if (labelTokens.size) score += (overlap / labelTokens.size) * 100;

    const hintTerms = Array.isArray(hint.terms) ? hint.terms : [];
    let hintMatches = 0;
    hintTerms.forEach((term) => { if (candidate.includes(normalizeText(term))) hintMatches += 1; });
    score += hintMatches * 28;

    if (hint.law && hintTerms.length && hintMatches === 0) score -= 35;
    return score;
  }

  function resolveCurrentItem(targetState, entry, signals) {
    const items = (targetState.syllabusItems || []).filter((item) => item?.id && !item.legacyOnly && !item.hiddenFromCatalog && item.status !== "Ignorado");
    const direct = items.find((item) => item.id === entry.syllabusItemId);
    if (direct) return { item: direct, reason: "historical-id", score: Infinity };

    const signalId = signals?.[entry.key]?.syllabusItemId || "";
    const signaled = signalId && items.find((item) => item.id === signalId);
    if (signaled) return { item: signaled, reason: "current-signal-id", score: Infinity };

    const ranked = items
      .map((item) => ({ item, score: scoreCandidate(entry, item) }))
      .filter((candidate) => Number.isFinite(candidate.score))
      .sort((left, right) => right.score - left.score || String(left.item.id).localeCompare(String(right.item.id)));
    const best = ranked[0];
    const second = ranked[1];
    if (!best || best.score < 105) return null;
    if (second && best.score < 180 && best.score - second.score < 12) return null;
    return { ...best, reason: "catalog-match" };
  }

  seedInitialWrongTopicsV155 = function seedInitialWrongTopicsCompatV349(targetState = state) {
    const signals = planningPrioritySignalsV155(targetState);
    const inserted = [];
    const resolved = [];
    const unavailable = [];

    INITIAL_WRONG_TOPICS_V155.forEach((entry) => {
      const match = resolveCurrentItem(targetState, entry, signals);
      if (!match?.item) {
        unavailable.push(entry);
        return;
      }

      const currentSignal = signals[entry.key];
      if (!currentSignal) {
        signals[entry.key] = {
          syllabusItemId: match.item.id,
          label: entry.label,
          wrong: 1,
          correct: 0,
          source: "simulado-informado-2026-07-26",
          createdAt: "2026-07-26T00:00:00.000-03:00",
          legacySyllabusItemId: match.item.id === entry.syllabusItemId ? "" : entry.syllabusItemId,
          resolvedBy: match.reason === "historical-id" ? "historical-id" : VERSION
        };
        inserted.push({ ...entry, resolvedSyllabusItemId: match.item.id, reason: match.reason });
        return;
      }

      if (currentSignal.syllabusItemId !== match.item.id) {
        signals[entry.key] = {
          ...currentSignal,
          syllabusItemId: match.item.id,
          legacySyllabusItemId: currentSignal.legacySyllabusItemId || currentSignal.syllabusItemId || entry.syllabusItemId,
          resolvedBy: VERSION,
          resolvedAt: new Date().toISOString()
        };
        resolved.push({ ...entry, previousSyllabusItemId: currentSignal.syllabusItemId || "", resolvedSyllabusItemId: match.item.id, reason: match.reason });
      }
    });

    const unavailableKeys = unavailable.map((entry) => entry.key).sort();
    const previousUnavailable = globalThis.__aldusPlanningPriorityCompatV349?.unavailableKeys || [];
    if (unavailableKeys.join("|") !== previousUnavailable.join("|") && unavailableKeys.length) {
      console.warn("[Metas Estudo] Prioridades históricas sem correspondente atual foram ignoradas sem bloquear o planejamento.", unavailableKeys);
    }

    globalThis.__aldusPlanningPriorityCompatV349 = Object.freeze({
      version: VERSION,
      inserted: inserted.map((entry) => entry.key),
      resolved: resolved.map((entry) => entry.key),
      unavailableKeys,
      appliedAt: new Date().toISOString()
    });

    return { inserted, resolved, unavailable, missing: [], signals };
  };
})();

/* Vinculação recursiva e exata das pastas de destino da Fábrica de Resumos — v232, estabilizada pela V349. */
(() => {
  "use strict";

  const VERSION = "20260803-pastas-destino-temas-exatos-v232";
  const ROOT_FOLDER_ID = "1fBp2Ibx4_acuP4fvIK26SKkVtLJmEcOJ";
  const MANAGED_VERSION_FIELD = "factoryDestinationFolderCatalogVersion";
  const CACHE_KEY = "aldusFactoryDestinationTreeV232";
  const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
  const MAX_FOLDER_COUNT = 10000;
  const STOP_WORDS = new Set([
    "a", "ao", "aos", "as", "com", "da", "das", "de", "do", "dos", "e", "em", "na", "nas", "no", "nos", "o", "os", "para", "por",
    "aplicavel", "aplicaveis", "aspecto", "aspectos", "brasil", "brasileira", "brasileiro", "direito", "estadual", "federal", "lei", "leis", "n", "no"
  ]);

  let refreshInFlight = null;
  let lastRefreshAt = 0;

  function canonicalText(value = "") {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toUpperCase()
      .replace(/[º°ª]/g, "")
      .replace(/[^A-Z0-9]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function stripLeadingCode(value = "") {
    return canonicalText(value).replace(/^\d+(?:\s+\d+){0,5}\s+/, "").trim();
  }

  function leadingCode(value = "") {
    const raw = String(value || "").trim();
    const match = raw.match(/^(?:ITEM\s*)?(\d+(?:[._-]\d+){0,5})(?=\D|$)/i);
    if (!match) return "";
    return match[1].split(/[._-]+/).map((part) => String(Number(part))).join(".");
  }

  function tokenSet(value = "") {
    return new Set(stripLeadingCode(value).split(" ").filter((token) => token.length > 1 && !STOP_WORDS.has(token.toLowerCase())));
  }

  function jaccard(left, right) {
    const a = tokenSet(left);
    const b = tokenSet(right);
    if (!a.size || !b.size) return 0;
    let intersection = 0;
    a.forEach((token) => { if (b.has(token)) intersection += 1; });
    return intersection / (a.size + b.size - intersection);
  }

  function relevantNumbers(value = "") {
    return new Set(canonicalText(value).split(" ").filter((token) => /^\d{3,4}$/.test(token)));
  }

  function numberOverlap(left, right) {
    const a = relevantNumbers(left);
    const b = relevantNumbers(right);
    return [...a].filter((number) => b.has(number));
  }

  function disciplineTexts(item = {}) {
    return [
      item.disciplina, item.discipline, item.materia, item.subjectDiscipline,
      item.editalLink?.discipline, item.editalVinculo?.discipline
    ].filter(Boolean).map(String);
  }

  function topicTexts(item = {}) {
    const values = [
      item.tema, item.theme, item.assunto, item.subject, item.topico, item.topic,
      item.subtema, item.subtheme, item.reference, item.referencia,
      item.editalLink?.subject, item.editalLink?.topic, item.editalLink?.groupKey,
      item.editalVinculo?.subject, item.editalVinculo?.topic
    ];
    if (item.tema && item.subtema) values.push(`${item.tema} ${item.subtema}`);
    if (item.theme && item.subtheme) values.push(`${item.theme} ${item.subtheme}`);
    if (Array.isArray(item.editalSubtemas)) values.push(...item.editalSubtemas);
    if (Array.isArray(item.subtemasEdital)) values.push(...item.subtemasEdital);
    return [...new Set(values.filter(Boolean).map(String))];
  }

  function currentState() {
    try {
      if (typeof state !== "undefined" && state) return state;
    } catch {}
    return globalThis.__FACTORY_DESTINATION_STATE__ || null;
  }

  function currentAgenda(targetState) {
    try {
      if (typeof ensureFactoryAgenda === "function") return ensureFactoryAgenda();
    } catch {}
    if (Array.isArray(targetState?.factoryAgenda) && targetState.factoryAgenda.length) return targetState.factoryAgenda;
    if (Array.isArray(targetState?.factoryItems)) return targetState.factoryItems;
    return [];
  }

  function existingDestination(item = {}) {
    return String(item.factoryDestinationFolder || item.pastaDestinoWordPdf || item.destinationFolder || item.finalFilesFolder || "").trim();
  }

  function isManagedDestination(item = {}) {
    return Boolean(item[MANAGED_VERSION_FIELD] || item.factoryDestinationFolderCatalogKey || item.factoryDestinationFolderMatchType);
  }

  function isLegacyFallback(item = {}) {
    return item.factoryDestinationFolderMatchType === "discipline-fallback";
  }

  function driveFolderUrl(id) {
    return `https://drive.google.com/drive/folders/${id}`;
  }

  function clearManagedMetadata(item) {
    let changed = false;
    [
      "factoryDestinationFolderCatalogVersion",
      "factoryDestinationFolderCatalogKey",
      "factoryDestinationFolderMatchType",
      "factoryDestinationFolderMatchTitle",
      "factoryDestinationFolderMatchScore",
      "factoryDestinationFolderMatchedAt",
      "factoryDestinationFolderMatchPath",
      "factoryDestinationFolderMatchId"
    ].forEach((key) => {
      if (Object.prototype.hasOwnProperty.call(item, key)) {
        delete item[key];
        changed = true;
      }
    });
    return changed;
  }

  function isManualDestinationV349(item = {}, existing = existingDestination(item)) {
    if (!existing) return false;
    if (item.factoryDestinationFolderManual === true) return true;
    if (!isManagedDestination(item)) return true;
    const matchId = String(item.factoryDestinationFolderMatchId || "").trim();
    if (matchId && existing !== driveFolderUrl(matchId)) return true;
    return false;
  }

  function markManualDestinationV349(item) {
    let changed = item.factoryDestinationFolderManual !== true;
    item.factoryDestinationFolderManual = true;
    if (clearManagedMetadata(item)) changed = true;
    return changed;
  }

  function normalizeFolderRecord(folder = {}) {
    return {
      id: String(folder.id || ""),
      name: String(folder.name || folder.title || ""),
      parents: Array.isArray(folder.parents) ? folder.parents.map(String) : [],
      modifiedTime: String(folder.modifiedTime || "")
    };
  }

  function buildDestinationTree(allFolders = [], rootId = ROOT_FOLDER_ID) {
    const byId = new Map();
    allFolders.map(normalizeFolderRecord).filter((folder) => folder.id).forEach((folder) => byId.set(folder.id, folder));
    if (!byId.has(rootId)) byId.set(rootId, { id: rootId, name: "PASTAS_DE_DESTINO", parents: [], modifiedTime: "" });

    const descendants = new Set([rootId]);
    let changed = true;
    let passes = 0;
    while (changed && passes < 30) {
      changed = false;
      passes += 1;
      byId.forEach((folder) => {
        if (descendants.has(folder.id)) return;
        if (folder.parents.some((parentId) => descendants.has(parentId))) {
          descendants.add(folder.id);
          changed = true;
        }
      });
    }

    const nodes = [];
    const nodeById = new Map();
    const root = { id: rootId, name: byId.get(rootId)?.name || "PASTAS_DE_DESTINO", parentId: "", depth: 0, pathIds: [rootId], pathNames: [] };
    nodes.push(root);
    nodeById.set(rootId, root);

    let pending = [...descendants].filter((id) => id !== rootId);
    let guard = 0;
    while (pending.length && guard < 40) {
      guard += 1;
      const nextPending = [];
      let progressed = false;
      pending.forEach((id) => {
        const folder = byId.get(id);
        const parentId = folder?.parents.find((candidate) => nodeById.has(candidate));
        if (!folder || !parentId) {
          nextPending.push(id);
          return;
        }
        const parent = nodeById.get(parentId);
        const node = {
          id: folder.id,
          name: folder.name,
          parentId,
          depth: parent.depth + 1,
          pathIds: [...parent.pathIds, folder.id],
          pathNames: [...parent.pathNames, folder.name],
          modifiedTime: folder.modifiedTime || ""
        };
        nodes.push(node);
        nodeById.set(node.id, node);
        progressed = true;
      });
      pending = nextPending;
      if (!progressed) break;
    }

    return {
      version: VERSION,
      rootId,
      fetchedAt: new Date().toISOString(),
      nodes,
      unresolved: pending.length
    };
  }

  function destinationDisciplineNodes(tree) {
    return (tree?.nodes || []).filter((node) => {
      if (node.depth !== 1) return false;
      const title = stripLeadingCode(node.name);
      if (!title) return false;
      if (/AUDIO|MATERIAL|COMPLEMENTAR|PENDENTE|SELECIONADO|VIAGEM/.test(title)) return false;
      return /DIREITO|LEGISLACAO|CIENCIA|CRIMINOLOGIA|MEDICINA|PECA/.test(title);
    });
  }

  function disciplineScore(input, node) {
    const normalized = canonicalText(input);
    const candidate = stripLeadingCode(node.name);
    if (!normalized || !candidate) return 0;
    if (normalized === candidate) return 160;
    if (normalized.includes(candidate) || candidate.includes(normalized)) {
      const ratio = Math.min(normalized.length, candidate.length) / Math.max(normalized.length, candidate.length);
      return 105 + ratio * 35;
    }
    return jaccard(normalized, candidate) * 115;
  }

  function resolveDiscipline(item, tree) {
    const inputs = disciplineTexts(item);
    if (!inputs.length) return null;
    const ranked = destinationDisciplineNodes(tree).map((node) => ({
      node,
      score: Math.max(...inputs.map((input) => disciplineScore(input, node)))
    })).sort((left, right) => right.score - left.score || left.node.name.localeCompare(right.node.name, "pt-BR"));
    const best = ranked[0];
    const second = ranked[1];
    if (!best || best.score < 74) return null;
    if (second && best.score < 150 && best.score - second.score < 9) return null;
    return best;
  }

  function topicCandidateScore(input, node, disciplineNode) {
    const inputCode = leadingCode(input);
    const folderCode = leadingCode(node.name);
    const inputText = stripLeadingCode(input);
    const folderText = stripLeadingCode(node.name);
    const relativePath = node.pathNames.slice(disciplineNode.depth).map(stripLeadingCode).filter(Boolean).join(" ");
    if (!inputText || !folderText) return { score: 0, reason: "none" };

    const similarity = jaccard(inputText, folderText);
    const pathSimilarity = jaccard(inputText, relativePath);
    const depthBonus = Math.min(12, Math.max(0, node.depth - disciplineNode.depth) * 2);

    if (inputCode && folderCode && inputCode === folderCode) {
      return { score: 220 + similarity * 10 + depthBonus, reason: "code-exact" };
    }
    if (inputText === folderText) return { score: 195 + depthBonus, reason: "title-exact" };
    if (canonicalText(input) === canonicalText(relativePath)) return { score: 185 + depthBonus, reason: "path-exact" };

    if (inputText.includes(folderText) || folderText.includes(inputText)) {
      const ratio = Math.min(inputText.length, folderText.length) / Math.max(inputText.length, folderText.length);
      return { score: 125 + ratio * 35 + depthBonus, reason: "title-containment" };
    }
    if (relativePath.includes(inputText) || inputText.includes(relativePath)) {
      const ratio = Math.min(inputText.length, relativePath.length) / Math.max(inputText.length, relativePath.length);
      return { score: 115 + ratio * 30 + depthBonus, reason: "path-containment" };
    }

    const numbers = numberOverlap(inputText, folderText);
    if (numbers.length >= 2 && similarity >= 0.16) {
      return { score: 120 + Math.min(18, numbers.length * 4) + similarity * 20 + depthBonus, reason: "law-number" };
    }
    if (numbers.length >= 2) return { score: 108 + Math.min(18, numbers.length * 4) + depthBonus, reason: "law-number" };

    const tokenScore = Math.max(similarity * 112, pathSimilarity * 102) + depthBonus;
    return { score: tokenScore, reason: pathSimilarity > similarity ? "path-tokens" : "title-tokens" };
  }

  function resolveTopic(item, tree, disciplineMatch) {
    const inputs = topicTexts(item);
    if (!inputs.length || !disciplineMatch?.node) return null;
    const disciplineNode = disciplineMatch.node;
    const candidates = (tree?.nodes || []).filter((node) => node.id !== disciplineNode.id && node.pathIds.includes(disciplineNode.id));
    if (!candidates.length) return null;

    const ranked = candidates.map((node) => {
      let best = { score: 0, reason: "none", input: "" };
      inputs.forEach((input) => {
        const current = topicCandidateScore(input, node, disciplineNode);
        if (current.score > best.score) best = { ...current, input };
      });
      return { node, ...best };
    }).sort((left, right) => right.score - left.score || right.node.depth - left.node.depth || left.node.name.localeCompare(right.node.name, "pt-BR"));

    const best = ranked[0];
    const second = ranked[1];
    if (!best || best.score < 88) return null;
    if (second && best.score < 180 && best.score - second.score < 8) return null;
    return best;
  }

  function clearManagedFields(item) {
    delete item.factoryDestinationFolder;
    delete item.factoryDestinationFolderManual;
    clearManagedMetadata(item);
  }

  function applyToItem(item, tree, options = {}) {
    if (!item || typeof item !== "object") return { changed: false, status: "invalid" };
    const existing = existingDestination(item);
    const manual = isManualDestinationV349(item, existing);
    if (manual) {
      const changed = markManualDestinationV349(item);
      return { changed, status: "manual-preserved", url: existing };
    }
    if (existing && options.preserveExisting === true) {
      return { changed: false, status: "manual-preserved", url: existing };
    }

    const disciplineMatch = resolveDiscipline(item, tree);
    const topicMatch = disciplineMatch ? resolveTopic(item, tree, disciplineMatch) : null;
    if (!topicMatch?.node?.id) {
      if (isLegacyFallback(item) || item[MANAGED_VERSION_FIELD] === VERSION) {
        clearManagedFields(item);
        return { changed: true, status: "managed-cleared" };
      }
      return { changed: false, status: disciplineMatch ? "topic-unmatched" : "discipline-unmatched" };
    }

    const destination = topicMatch.node;
    const destinationUrl = driveFolderUrl(destination.id);
    const matchScore = Math.round(topicMatch.score);
    const matchPath = destination.pathNames.join(" → ");
    const matchType = `recursive-${topicMatch.reason}`;
    const catalogKey = disciplineMatch.node.id;

    const alreadyCurrent = existing === destinationUrl
      && item[MANAGED_VERSION_FIELD] === VERSION
      && item.factoryDestinationFolderCatalogKey === catalogKey
      && item.factoryDestinationFolderMatchType === matchType
      && item.factoryDestinationFolderMatchTitle === destination.name
      && item.factoryDestinationFolderMatchPath === matchPath
      && Number(item.factoryDestinationFolderMatchScore || 0) === matchScore;
    if (alreadyCurrent) return { changed: false, status: "topic", url: destinationUrl, title: destination.name, score: matchScore };

    if (existing && existing !== destinationUrl) {
      item.factoryDestinationFolderPreviousUrl = existing;
      item.factoryDestinationFolderReplacedAt = new Date().toISOString();
      item.factoryDestinationFolderReplacementReason = "tema-especifico-recursivo";
    }
    delete item.factoryDestinationFolderManual;
    item.factoryDestinationFolder = destinationUrl;
    item[MANAGED_VERSION_FIELD] = VERSION;
    item.factoryDestinationFolderCatalogKey = catalogKey;
    item.factoryDestinationFolderMatchType = matchType;
    item.factoryDestinationFolderMatchTitle = destination.name;
    item.factoryDestinationFolderMatchScore = matchScore;
    item.factoryDestinationFolderMatchPath = matchPath;
    item.factoryDestinationFolderMatchId = destination.id;
    item.factoryDestinationFolderMatchedAt = new Date().toISOString();
    return { changed: true, status: "topic", url: destinationUrl, title: destination.name, score: matchScore, path: matchPath };
  }

  function saveAndRender(report) {
    if (!report.changed) return;
    try { if (typeof saveData === "function") saveData(); } catch (error) { console.warn("[Fábrica v232] Falha ao salvar vínculos de destino.", error); }
    try {
      if (typeof renderFactory === "function" && (typeof location === "undefined" || location.hash === "#fabrica-resumos")) renderFactory();
      else if (typeof render === "function") render();
    } catch {}
  }

  function applyTree(tree, options = {}) {
    const targetState = currentState();
    if (!tree?.nodes?.length || !targetState) return { applied: false, reason: "not-ready", changed: 0 };
    const agenda = currentAgenda(targetState);
    if (!Array.isArray(agenda)) return { applied: false, reason: "agenda-unavailable", changed: 0 };

    const report = {
      version: VERSION,
      appliedAt: new Date().toISOString(),
      rootId: tree.rootId,
      folderCount: tree.nodes.length,
      total: agenda.length,
      changed: 0,
      topic: 0,
      managedCleared: 0,
      manualPreserved: 0,
      unmatched: 0
    };
    agenda.forEach((item) => {
      const result = applyToItem(item, tree, options);
      if (result.changed) report.changed += 1;
      if (result.status === "topic") report.topic += 1;
      else if (result.status === "managed-cleared") report.managedCleared += 1;
      else if (result.status === "manual-preserved") report.manualPreserved += 1;
      else if (result.status === "topic-unmatched" || result.status === "discipline-unmatched") report.unmatched += 1;
    });

    targetState.factoryAgenda = agenda;
    targetState.factoryItems = agenda;
    targetState.migrations ||= {};
    targetState.migrations.factoryDestinationFoldersV232 = report;
    globalThis.__factoryDestinationFoldersV232Report = report;
    saveAndRender(report);
    return { applied: true, ...report };
  }

  function removeLegacyDisciplineFallbacks() {
    const targetState = currentState();
    if (!targetState) return { changed: 0 };
    const agenda = currentAgenda(targetState);
    let changed = 0;
    agenda.forEach((item) => {
      if (!isLegacyFallback(item)) return;
      clearManagedFields(item);
      changed += 1;
    });
    if (changed) {
      targetState.factoryAgenda = agenda;
      targetState.factoryItems = agenda;
      targetState.migrations ||= {};
      targetState.migrations.factoryDestinationFallbackCleanupV232 = { version: VERSION, changed, appliedAt: new Date().toISOString() };
      saveAndRender({ changed });
    }
    return { changed };
  }

  function cacheTree(tree) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ cachedAt: Date.now(), tree }));
    } catch (error) {
      console.warn("[Fábrica v232] Não foi possível armazenar o catálogo recursivo em cache.", error);
    }
  }

  function loadCachedTree({ allowExpired = false } = {}) {
    try {
      const parsed = JSON.parse(localStorage.getItem(CACHE_KEY) || "null");
      if (!parsed?.tree?.nodes?.length) return null;
      if (!allowExpired && Date.now() - Number(parsed.cachedAt || 0) > CACHE_TTL_MS) return null;
      return parsed.tree;
    } catch {
      return null;
    }
  }

  async function fetchAllDriveFolders() {
    if (typeof driveFetch !== "function") throw new Error("Google Drive indisponível neste carregamento.");
    const folders = [];
    let pageToken = "";
    do {
      const params = new URLSearchParams({
        q: "mimeType='application/vnd.google-apps.folder' and trashed=false",
        spaces: "drive",
        pageSize: "1000",
        fields: "nextPageToken,files(id,name,parents,modifiedTime)",
        orderBy: "name"
      });
      if (pageToken) params.set("pageToken", pageToken);
      params.set("supportsAllDrives", "true");
      params.set("includeItemsFromAllDrives", "true");
      const response = await driveFetch(`https://www.googleapis.com/drive/v3/files?${params.toString()}`);
      const payload = await response.json();
      folders.push(...(payload.files || []));
      pageToken = String(payload.nextPageToken || "");
      if (folders.length > MAX_FOLDER_COUNT) throw new Error("A árvore do Google Drive excedeu o limite seguro de leitura.");
    } while (pageToken);
    return folders;
  }

  async function refreshFromDrive(options = {}) {
    if (refreshInFlight) return refreshInFlight;
    if (!options.force && Date.now() - lastRefreshAt < 30000) {
      const cached = loadCachedTree({ allowExpired: true });
      return cached ? applyTree(cached, options) : { applied: false, reason: "refresh-throttled", changed: 0 };
    }

    refreshInFlight = (async () => {
      removeLegacyDisciplineFallbacks();
      try {
        if (typeof hasValidGoogleDriveAccessToken === "function" && !hasValidGoogleDriveAccessToken()) {
          const cached = loadCachedTree({ allowExpired: true });
          return cached ? applyTree(cached, options) : { applied: false, reason: "google-drive-authorization-required", changed: 0 };
        }
        const folders = await fetchAllDriveFolders();
        const tree = buildDestinationTree(folders, ROOT_FOLDER_ID);
        if (tree.nodes.length <= 1) throw new Error("A pasta principal foi localizada, mas suas subpastas não ficaram acessíveis.");
        cacheTree(tree);
        lastRefreshAt = Date.now();
        return applyTree(tree, options);
      } catch (error) {
        const cached = loadCachedTree({ allowExpired: true });
        if (cached) {
          console.warn("[Fábrica v232] Leitura atual do Drive falhou; usando o último catálogo válido.", error);
          return applyTree(cached, options);
        }
        console.warn("[Fábrica v232] Autorize novamente o Google Drive para localizar as subpastas específicas dos temas.", error);
        return { applied: false, reason: "drive-read-failed", error: String(error?.message || error), changed: 0 };
      }
    })();

    try {
      return await refreshInFlight;
    } finally {
      refreshInFlight = null;
    }
  }

  function applyCachedTree() {
    removeLegacyDisciplineFallbacks();
    const cached = loadCachedTree();
    return cached ? applyTree(cached) : { applied: false, reason: "cache-empty", changed: 0 };
  }

  function wrapEditalSync() {
    try {
      if (typeof syncFactoryWithActiveEdital !== "function" || syncFactoryWithActiveEdital.__destinationFoldersV232Wrapped) return;
      const original = syncFactoryWithActiveEdital;
      const wrapped = function (...args) {
        const result = original.apply(this, args);
        queueMicrotask(() => {
          applyCachedTree();
          if (typeof hasValidGoogleDriveAccessToken === "function" && hasValidGoogleDriveAccessToken()) refreshFromDrive();
        });
        return result;
      };
      Object.defineProperty(wrapped, "__destinationFoldersV232Wrapped", { value: true });
      syncFactoryWithActiveEdital = wrapped;
    } catch (error) {
      console.warn("[Fábrica v232] A integração com o edital será aplicada pelas tentativas programadas.", error);
    }
  }

  function wrapPostAuthorizationRefresh() {
    try {
      if (typeof checkCloudForUpdatesAfterAuth !== "function" || checkCloudForUpdatesAfterAuth.__destinationFoldersV232Wrapped) return;
      const original = checkCloudForUpdatesAfterAuth;
      const wrapped = async function (...args) {
        const result = await original.apply(this, args);
        await refreshFromDrive({ force: true });
        return result;
      };
      Object.defineProperty(wrapped, "__destinationFoldersV232Wrapped", { value: true });
      checkCloudForUpdatesAfterAuth = wrapped;
    } catch (error) {
      console.warn("[Fábrica v232] A atualização das pastas ocorrerá ao abrir a Fábrica.", error);
    }
  }

  Object.defineProperties(globalThis, {
    __FACTORY_DESTINATION_ROOT_V232__: { value: ROOT_FOLDER_ID, configurable: true },
    __buildFactoryDestinationTreeV232: { value: buildDestinationTree, configurable: true },
    __resolveFactoryDestinationDisciplineV232: { value: resolveDiscipline, configurable: true },
    __resolveFactoryDestinationTopicV232: { value: resolveTopic, configurable: true },
    __applyFactoryDestinationToItemV232: { value: applyToItem, configurable: true },
    __applyFactoryDestinationTreeV232: { value: applyTree, configurable: true },
    __refreshFactoryDestinationFoldersV232: { value: refreshFromDrive, configurable: true },
    __removeFactoryDisciplineFallbacksV232: { value: removeLegacyDisciplineFallbacks, configurable: true }
  });

  wrapEditalSync();
  wrapPostAuthorizationRefresh();
  if (typeof document === "undefined") return;

  const start = () => {
    applyCachedTree();
    setTimeout(() => {
      if (typeof hasValidGoogleDriveAccessToken === "function" && hasValidGoogleDriveAccessToken()) refreshFromDrive();
    }, 1200);
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();

  window.addEventListener("hashchange", () => {
    if (location.hash !== "#fabrica-resumos") return;
    applyCachedTree();
    if (typeof hasValidGoogleDriveAccessToken === "function" && hasValidGoogleDriveAccessToken()) refreshFromDrive();
  });
})();
