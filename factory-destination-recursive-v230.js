/* Vinculação recursiva e exata das pastas de destino da Fábrica de Resumos — v230. */
(() => {
  "use strict";

  const VERSION = "20260803-pastas-destino-recursivas-v230";
  const ROOT_FOLDER_ID = "1fBp2Ibx4_acuP4fvIK26SKkVtLJmEcOJ";
  const MANAGED_VERSION_FIELD = "factoryDestinationFolderCatalogVersion";
  const CACHE_KEY = "aldusFactoryDestinationTreeV230";
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
    delete item.factoryDestinationFolderCatalogVersion;
    delete item.factoryDestinationFolderCatalogKey;
    delete item.factoryDestinationFolderMatchType;
    delete item.factoryDestinationFolderMatchTitle;
    delete item.factoryDestinationFolderMatchScore;
    delete item.factoryDestinationFolderMatchedAt;
    delete item.factoryDestinationFolderMatchPath;
    delete item.factoryDestinationFolderMatchId;
  }

  function applyToItem(item, tree, options = {}) {
    if (!item || typeof item !== "object") return { changed: false, status: "invalid" };
    const existing = existingDestination(item);
    const managed = isManagedDestination(item);
    if (existing && !managed && !options.overwriteManual) return { changed: false, status: "manual-preserved", url: existing };

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
    try { if (typeof saveData === "function") saveData(); } catch (error) { console.warn("[Fábrica v230] Falha ao salvar vínculos de destino.", error); }
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
    targetState.migrations.factoryDestinationFoldersV230 = report;
    globalThis.__factoryDestinationFoldersV230Report = report;
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
      targetState.migrations.factoryDestinationFallbackCleanupV230 = { version: VERSION, changed, appliedAt: new Date().toISOString() };
      saveAndRender({ changed });
    }
    return { changed };
  }

  function cacheTree(tree) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ cachedAt: Date.now(), tree }));
    } catch (error) {
      console.warn("[Fábrica v230] Não foi possível armazenar o catálogo recursivo em cache.", error);
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
          console.warn("[Fábrica v230] Leitura atual do Drive falhou; usando o último catálogo válido.", error);
          return applyTree(cached, options);
        }
        console.warn("[Fábrica v230] Autorize novamente o Google Drive para localizar as subpastas específicas dos temas.", error);
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
      if (typeof syncFactoryWithActiveEdital !== "function" || syncFactoryWithActiveEdital.__destinationFoldersV230Wrapped) return;
      const original = syncFactoryWithActiveEdital;
      const wrapped = function (...args) {
        const result = original.apply(this, args);
        queueMicrotask(() => {
          applyCachedTree();
          if (typeof hasValidGoogleDriveAccessToken === "function" && hasValidGoogleDriveAccessToken()) refreshFromDrive();
        });
        return result;
      };
      Object.defineProperty(wrapped, "__destinationFoldersV230Wrapped", { value: true });
      syncFactoryWithActiveEdital = wrapped;
    } catch (error) {
      console.warn("[Fábrica v230] A integração com o edital será aplicada pelas tentativas programadas.", error);
    }
  }

  function wrapPostAuthorizationRefresh() {
    try {
      if (typeof checkCloudForUpdatesAfterAuth !== "function" || checkCloudForUpdatesAfterAuth.__destinationFoldersV230Wrapped) return;
      const original = checkCloudForUpdatesAfterAuth;
      const wrapped = async function (...args) {
        const result = await original.apply(this, args);
        await refreshFromDrive({ force: true });
        return result;
      };
      Object.defineProperty(wrapped, "__destinationFoldersV230Wrapped", { value: true });
      checkCloudForUpdatesAfterAuth = wrapped;
    } catch (error) {
      console.warn("[Fábrica v230] A atualização das pastas ocorrerá ao abrir a Fábrica.", error);
    }
  }

  Object.defineProperties(globalThis, {
    __FACTORY_DESTINATION_ROOT_V230__: { value: ROOT_FOLDER_ID, configurable: true },
    __buildFactoryDestinationTreeV230: { value: buildDestinationTree, configurable: true },
    __resolveFactoryDestinationDisciplineV230: { value: resolveDiscipline, configurable: true },
    __resolveFactoryDestinationTopicV230: { value: resolveTopic, configurable: true },
    __applyFactoryDestinationToItemV230: { value: applyToItem, configurable: true },
    __applyFactoryDestinationTreeV230: { value: applyTree, configurable: true },
    __refreshFactoryDestinationFoldersV230: { value: refreshFromDrive, configurable: true },
    __removeFactoryDisciplineFallbacksV230: { value: removeLegacyDisciplineFallbacks, configurable: true }
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
