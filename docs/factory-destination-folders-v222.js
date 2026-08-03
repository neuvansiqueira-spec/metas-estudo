/* Vinculação automática das pastas de destino da Fábrica de Resumos — v222. */
(() => {
  "use strict";

  const MIGRATION_VERSION = "20260803-pastas-destino-fabrica-v222";
  const MANAGED_VERSION_FIELD = "factoryDestinationFolderCatalogVersion";
  const RETRY_DELAYS = [0, 800, 2500, 7000];
  const STOP_WORDS = new Set([
    "a", "ao", "aos", "as", "com", "da", "das", "de", "do", "dos", "e", "em", "na", "nas", "no", "nos", "o", "os", "para", "por",
    "aplicavel", "aplicaveis", "aspecto", "aspectos", "brasil", "brasileira", "brasileiro", "direito", "estadual", "federal", "lei", "leis", "n", "no"
  ]);

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
    return canonicalText(value).replace(/^\d+(?:\s+\d+){0,3}\s+/, "").trim();
  }

  function leadingCode(value = "") {
    const raw = String(value || "").trim();
    const match = raw.match(/^(?:ITEM\s*)?(\d+(?:[._-]\d+){0,3})(?=\D|$)/i);
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
    ].filter(Boolean);
  }

  function topicTexts(item = {}) {
    const values = [
      item.tema, item.theme, item.assunto, item.subject, item.topico, item.topic,
      item.subtema, item.subtheme, item.reference, item.referencia,
      item.editalLink?.subject, item.editalLink?.topic, item.editalLink?.groupKey,
      item.editalVinculo?.subject, item.editalVinculo?.topic
    ];
    if (Array.isArray(item.editalSubtemas)) values.push(...item.editalSubtemas);
    if (Array.isArray(item.subtemasEdital)) values.push(...item.subtemasEdital);
    return values.filter(Boolean).map(String);
  }

  function disciplineScore(input, entry) {
    const normalized = canonicalText(input);
    if (!normalized) return 0;
    const candidates = [entry.folder?.title, ...(entry.aliases || [])].map(canonicalText).filter(Boolean);
    let score = 0;
    candidates.forEach((candidate) => {
      if (normalized === candidate) score = Math.max(score, 100);
      else if (normalized.includes(candidate) || candidate.includes(normalized)) {
        const ratio = Math.min(normalized.length, candidate.length) / Math.max(normalized.length, candidate.length);
        score = Math.max(score, 72 + ratio * 18);
      } else {
        score = Math.max(score, jaccard(normalized, candidate) * 72);
      }
    });
    return score;
  }

  function resolveDiscipline(item, catalog) {
    const inputs = disciplineTexts(item);
    if (!inputs.length) return null;
    const ranked = (catalog.disciplines || []).map((entry) => ({
      entry,
      score: Math.max(...inputs.map((input) => disciplineScore(input, entry)))
    })).sort((left, right) => right.score - left.score);
    if (!ranked[0] || ranked[0].score < 58) return null;
    if (ranked[1] && ranked[0].score < 96 && ranked[0].score - ranked[1].score < 5) return null;
    return ranked[0];
  }

  function topicScore(input, folder) {
    const inputCode = leadingCode(input);
    const folderCode = leadingCode(folder.title);
    const inputText = stripLeadingCode(input);
    const folderText = stripLeadingCode(folder.title);
    if (!inputText || !folderText) return { score: 0, reason: "none" };
    if (inputCode && folderCode && inputCode === folderCode) return { score: 130, reason: "code" };
    if (inputText === folderText) return { score: 115, reason: "exact" };
    if (inputText.includes(folderText) || folderText.includes(inputText)) {
      const ratio = Math.min(inputText.length, folderText.length) / Math.max(inputText.length, folderText.length);
      return { score: 88 + ratio * 16, reason: "containment" };
    }
    const numbers = numberOverlap(inputText, folderText);
    const similarity = jaccard(inputText, folderText);
    if (numbers.length >= 2 && similarity >= 0.18) return { score: 84 + Math.min(8, numbers.length * 2) + similarity * 8, reason: "law-number" };
    if (numbers.length >= 2) return { score: 78 + Math.min(8, numbers.length * 2), reason: "law-number" };
    return { score: similarity * 100, reason: "tokens" };
  }

  function resolveTopic(item, disciplineEntry) {
    const inputs = topicTexts(item);
    if (!inputs.length || !disciplineEntry?.topics?.length) return null;
    const ranked = disciplineEntry.topics.map((folder) => {
      let best = { score: 0, reason: "none", input: "" };
      inputs.forEach((input) => {
        const current = topicScore(input, folder);
        if (current.score > best.score) best = { ...current, input };
      });
      return { folder, ...best };
    }).sort((left, right) => right.score - left.score);
    const best = ranked[0];
    const second = ranked[1];
    if (!best || best.score < 54) return null;
    if (second && best.score < 110 && best.score - second.score < 4) return null;
    return best;
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

  function applyToItem(item, catalog, options = {}) {
    if (!item || typeof item !== "object") return { changed: false, status: "invalid" };
    const existing = existingDestination(item);
    const managed = isManagedDestination(item);
    if (existing && !managed && !options.overwriteManual) return { changed: false, status: "manual-preserved", url: existing };

    const disciplineMatch = resolveDiscipline(item, catalog);
    if (!disciplineMatch?.entry?.folder?.url) return { changed: false, status: "discipline-unmatched" };
    const topicMatch = resolveTopic(item, disciplineMatch.entry);
    const destination = topicMatch?.folder || disciplineMatch.entry.folder;
    const matchType = topicMatch ? "topic" : "discipline-fallback";
    const previousSnapshot = JSON.stringify([
      item.factoryDestinationFolder,
      item[MANAGED_VERSION_FIELD],
      item.factoryDestinationFolderCatalogKey,
      item.factoryDestinationFolderMatchType,
      item.factoryDestinationFolderMatchTitle
    ]);

    item.factoryDestinationFolder = destination.url;
    item[MANAGED_VERSION_FIELD] = MIGRATION_VERSION;
    item.factoryDestinationFolderCatalogKey = disciplineMatch.entry.key;
    item.factoryDestinationFolderMatchType = matchType;
    item.factoryDestinationFolderMatchTitle = destination.title;
    item.factoryDestinationFolderMatchScore = Math.round(topicMatch?.score || disciplineMatch.score || 0);
    item.factoryDestinationFolderMatchedAt ||= new Date().toISOString();

    const nextSnapshot = JSON.stringify([
      item.factoryDestinationFolder,
      item[MANAGED_VERSION_FIELD],
      item.factoryDestinationFolderCatalogKey,
      item.factoryDestinationFolderMatchType,
      item.factoryDestinationFolderMatchTitle
    ]);
    return {
      changed: previousSnapshot !== nextSnapshot,
      status: matchType,
      url: destination.url,
      title: destination.title,
      score: item.factoryDestinationFolderMatchScore
    };
  }

  function applyFactoryDestinationFolders(options = {}) {
    const catalog = globalThis.__FACTORY_DESTINATION_CATALOG_V222__;
    const targetState = currentState();
    if (!catalog?.disciplines?.length || !targetState) return { applied: false, reason: "not-ready", changed: 0 };
    const agenda = currentAgenda(targetState);
    if (!Array.isArray(agenda)) return { applied: false, reason: "agenda-unavailable", changed: 0 };

    const report = {
      version: MIGRATION_VERSION,
      appliedAt: new Date().toISOString(),
      total: agenda.length,
      changed: 0,
      topic: 0,
      disciplineFallback: 0,
      manualPreserved: 0,
      unmatched: 0
    };

    agenda.forEach((item) => {
      const result = applyToItem(item, catalog, options);
      if (result.changed) report.changed += 1;
      if (result.status === "topic") report.topic += 1;
      else if (result.status === "discipline-fallback") report.disciplineFallback += 1;
      else if (result.status === "manual-preserved") report.manualPreserved += 1;
      else if (result.status === "discipline-unmatched") report.unmatched += 1;
    });

    targetState.factoryAgenda = agenda;
    targetState.factoryItems = agenda;
    targetState.migrations ||= {};
    targetState.migrations.factoryDestinationFoldersV222 = report;
    globalThis.__factoryDestinationFoldersV222Report = report;

    if (report.changed > 0) {
      try { if (typeof saveData === "function") saveData(); } catch (error) { console.warn("[Fábrica v222] Não foi possível salvar imediatamente.", error); }
      try { if (typeof renderFactory === "function" && location.hash === "#fabrica-resumos") renderFactory(); } catch {}
    }
    return { applied: true, ...report };
  }

  function scheduleApplication() {
    RETRY_DELAYS.forEach((delay) => setTimeout(() => applyFactoryDestinationFolders(), delay));
  }

  function wrapEditalSync() {
    try {
      if (typeof syncFactoryWithActiveEdital !== "function" || syncFactoryWithActiveEdital.__destinationFoldersV222Wrapped) return;
      const original = syncFactoryWithActiveEdital;
      const wrapped = function (...args) {
        const result = original.apply(this, args);
        queueMicrotask(() => applyFactoryDestinationFolders());
        return result;
      };
      Object.defineProperty(wrapped, "__destinationFoldersV222Wrapped", { value: true });
      syncFactoryWithActiveEdital = wrapped;
    } catch (error) {
      console.warn("[Fábrica v222] Integração com o edital será aplicada pelas tentativas programadas.", error);
    }
  }

  Object.defineProperties(globalThis, {
    __applyFactoryDestinationFoldersV222: { value: applyFactoryDestinationFolders, configurable: true },
    __resolveFactoryDestinationDisciplineV222: { value: resolveDiscipline, configurable: true },
    __resolveFactoryDestinationTopicV222: { value: resolveTopic, configurable: true },
    __applyFactoryDestinationToItemV222: { value: applyToItem, configurable: true }
  });

  wrapEditalSync();
  if (typeof document === "undefined") return;
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", scheduleApplication, { once: true });
  else scheduleApplication();
  window.addEventListener("hashchange", () => { if (location.hash === "#fabrica-resumos") applyFactoryDestinationFolders(); });
})();
