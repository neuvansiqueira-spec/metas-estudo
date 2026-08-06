(() => {
  "use strict";

  const VERSION = "20260806-canonical-control-admin-v259";
  const DUPLICATE_ITEM_ID = "7d97fba2-03d5-57ed-bc23-bdd42fb35ae6";
  const DUPLICATE_MAPPING_ID = "pcpr-2026:direito administrativo e gestao publica:5.9.2";
  const CORE_SCRIPT = "bootstrap-integrity-loader-v258-core.js?v=20260806-canonical-control-admin-v259";
  const LINK_FIELDS = new Set([
    "syllabusItemId",
    "syllabusId",
    "editalItemId",
    "syllabus_item_id",
    "syllabus_id",
    "edital_item_id"
  ]);
  const protectedCollections = [
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

  const captured = {
    duplicateItems: [],
    duplicateMappings: []
  };

  function normalize(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }

  function textOf(item) {
    if (!item || typeof item !== "object") return "";
    return normalize([
      item.code,
      item.reference,
      item.topic,
      item.subject,
      item.subtopic,
      item.title,
      item.name,
      item.discipline
    ].filter(Boolean).join(" "));
  }

  function isDuplicateItem(item) {
    if (!item || typeof item !== "object") return false;
    if (item.id === DUPLICATE_ITEM_ID) return true;
    const text = textOf(item);
    return text.includes("5 9 2")
      && text.includes("controle interno e externo")
      && text.includes("direito administrativo");
  }

  function isDuplicateMapping(mapping) {
    if (!mapping || typeof mapping !== "object") return false;
    if (mapping.id === DUPLICATE_MAPPING_ID) return true;
    if (mapping.syllabusItemId === DUPLICATE_ITEM_ID) return true;
    const text = textOf(mapping);
    return text.includes("5 9 2")
      && text.includes("controle interno e externo")
      && text.includes("direito administrativo");
  }

  function canonicalScore(item) {
    if (!item || typeof item !== "object" || isDuplicateItem(item)) return -1;
    const text = textOf(item);
    let score = 0;
    if (text.includes("9 10 1")) score += 12;
    if (text.includes("controle administrativo")) score += 10;
    if (normalize(item.discipline) === "direito administrativo") score += 6;
    if (Array.isArray(item.officialCoverage) && item.officialCoverage.length >= 2) score += 4;
    if (Number(item.studyTime || item.timeSpent || item.totalHours || 0) > 0) score += 2;
    if (String(item.contestCategory || item.category || "").toUpperCase() === "A") score += 2;
    return score;
  }

  function findCanonicalItem(state) {
    const items = Array.isArray(state?.syllabusItems) ? state.syllabusItems : [];
    return items
      .map((item, index) => ({ item, index, score: canonicalScore(item) }))
      .filter((entry) => entry.score >= 20)
      .sort((left, right) => right.score - left.score || left.index - right.index)[0]?.item || null;
  }

  function clone(value) {
    try {
      return typeof structuredClone === "function"
        ? structuredClone(value)
        : JSON.parse(JSON.stringify(value));
    } catch {
      return value;
    }
  }

  function sanitizeCatalog(value) {
    if (!value || typeof value !== "object") return value;
    const output = { ...value };
    ["newItems", "historicalItems"].forEach((key) => {
      const rows = Array.isArray(value[key]) ? value[key] : [];
      const removed = rows.filter(isDuplicateItem);
      captured.duplicateItems.push(...removed.map(clone));
      output[key] = rows.filter((row) => !isDuplicateItem(row));
    });
    const mappings = Array.isArray(value.mappings) ? value.mappings : [];
    const removedMappings = mappings.filter(isDuplicateMapping);
    captured.duplicateMappings.push(...removedMappings.map(clone));
    output.mappings = mappings.filter((row) => !isDuplicateMapping(row));
    return output;
  }

  function remapLinks(value, duplicateIds, canonicalId, seen = new WeakSet()) {
    if (!value || typeof value !== "object") return 0;
    if (seen.has(value)) return 0;
    seen.add(value);
    let changed = 0;

    if (Array.isArray(value)) {
      value.forEach((entry) => { changed += remapLinks(entry, duplicateIds, canonicalId, seen); });
      return changed;
    }

    Object.keys(value).forEach((key) => {
      const current = value[key];
      if (LINK_FIELDS.has(key) && duplicateIds.has(current)) {
        value[key] = canonicalId;
        changed += 1;
        return;
      }
      if (current && typeof current === "object") {
        changed += remapLinks(current, duplicateIds, canonicalId, seen);
      }
    });
    return changed;
  }

  function coverageFromMapping(mapping) {
    return {
      contestId: mapping.contestId,
      code: mapping.code,
      discipline: mapping.discipline,
      topic: mapping.topic,
      subtopic: mapping.subtopic,
      reference: mapping.reference,
      legislation: mapping.legislation,
      phase: mapping.phase,
      questionWeight: mapping.questionWeight,
      classification: mapping.classification,
      correspondence: mapping.correspondence,
      source: mapping.source
    };
  }

  function coverageKey(row) {
    return [row?.contestId, row?.code, row?.reference, row?.discipline, row?.topic]
      .map(normalize)
      .join("|");
  }

  function mergeOfficialCoverage(canonical, mappings) {
    const combined = [
      ...(Array.isArray(canonical.officialCoverage) ? canonical.officialCoverage : []),
      ...mappings.map(coverageFromMapping)
    ];
    const byKey = new Map();
    combined.filter(Boolean).forEach((row) => byKey.set(coverageKey(row), row));
    canonical.officialCoverage = [...byKey.values()];
    canonical.contestCategories = [...new Set(canonical.officialCoverage.map((row) => row.classification).filter(Boolean))];
    canonical.contestIds = [...new Set(canonical.officialCoverage.map((row) => row.contestId).filter(Boolean))];
  }

  function consolidateState(state) {
    if (!state || typeof state !== "object") {
      return { changed: false, reason: "estado-invalido" };
    }

    state.syllabusItems ||= [];
    state.contestSyllabusMap ||= [];
    state.schedulableSettings ||= {};
    state.migrations ||= {};

    const canonical = findCanonicalItem(state);
    if (!canonical?.id) {
      return { changed: false, reason: "item-canonico-nao-localizado" };
    }

    const duplicateItems = state.syllabusItems.filter(isDuplicateItem);
    const duplicateIds = new Set([DUPLICATE_ITEM_ID, ...duplicateItems.map((item) => item.id).filter(Boolean)]);
    const staleMappings = state.contestSyllabusMap.filter((mapping) => isDuplicateMapping(mapping) || duplicateIds.has(mapping?.syllabusItemId));
    const sourceMappings = [...captured.duplicateMappings, ...staleMappings];
    const mappingById = new Map(state.contestSyllabusMap.map((mapping) => [mapping?.id, mapping]));

    sourceMappings.forEach((source) => {
      const retargeted = { ...clone(source), syllabusItemId: canonical.id };
      const id = retargeted.id || DUPLICATE_MAPPING_ID;
      retargeted.id = id;
      const existing = mappingById.get(id);
      if (existing) Object.assign(existing, retargeted);
      else {
        state.contestSyllabusMap.push(retargeted);
        mappingById.set(id, retargeted);
      }
    });

    let remappedLinks = 0;
    protectedCollections.forEach((key) => {
      if (Array.isArray(state[key])) {
        remappedLinks += remapLinks(state[key], duplicateIds, canonical.id);
      }
    });

    ["selectedSyllabusItemId", "activeSyllabusItemId", "currentSyllabusItemId"].forEach((key) => {
      if (duplicateIds.has(state[key])) {
        state[key] = canonical.id;
        remappedLinks += 1;
      }
    });

    const canonicalSetting = state.schedulableSettings[canonical.id];
    duplicateIds.forEach((duplicateId) => {
      if (!duplicateId || duplicateId === canonical.id) return;
      if (!canonicalSetting && state.schedulableSettings[duplicateId]) {
        state.schedulableSettings[canonical.id] = clone(state.schedulableSettings[duplicateId]);
      }
      delete state.schedulableSettings[duplicateId];
    });

    const beforeCount = state.syllabusItems.length;
    state.syllabusItems = state.syllabusItems.filter((item) => !duplicateIds.has(item?.id) && !isDuplicateItem(item));
    const removedItems = beforeCount - state.syllabusItems.length;

    const officialMappings = state.contestSyllabusMap.filter((mapping) => mapping?.syllabusItemId === canonical.id);
    mergeOfficialCoverage(canonical, officialMappings);

    const previous = state.migrations[VERSION] || {};
    state.migrations[VERSION] = {
      ...previous,
      version: VERSION,
      appliedAt: previous.appliedAt || new Date().toISOString(),
      canonicalSyllabusItemId: canonical.id,
      removedDuplicateSyllabusItemIds: [...duplicateIds].filter((id) => id !== canonical.id),
      retargetedMappingId: DUPLICATE_MAPPING_ID,
      remappedLinks,
      removedItems,
      preservedCanonicalProgress: true
    };

    return {
      changed: removedItems > 0 || sourceMappings.length > 0 || remappedLinks > 0,
      canonicalSyllabusItemId: canonical.id,
      removedItems,
      remappedLinks,
      officialCoverage: canonical.officialCoverage.length
    };
  }

  function installInterceptedGlobal(name, transform) {
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, name);
    let current = descriptor && "value" in descriptor ? descriptor.value : globalThis[name];
    if (current !== undefined) current = transform(current);

    try {
      Object.defineProperty(globalThis, name, {
        configurable: true,
        enumerable: descriptor?.enumerable ?? true,
        get() { return current; },
        set(value) { current = transform(value); }
      });
    } catch (error) {
      console.error(`[${VERSION}] Não foi possível interceptar ${name}.`, error);
    }
  }

  installInterceptedGlobal("PCPR_PCMA_2026_CATALOG", sanitizeCatalog);
  installInterceptedGlobal("applyPcprPcma2026Migration", (migration) => {
    if (typeof migration !== "function" || migration.__canonicalControlAdminV259) return migration;
    const wrapped = function wrappedPcprPcmaMigration(state, ...args) {
      const report = migration.call(this, state, ...args) || {};
      const consolidation = consolidateState(state);
      return {
        ...report,
        changed: Boolean(report.changed || consolidation.changed),
        canonicalControlAdministrative: consolidation
      };
    };
    Object.defineProperty(wrapped, "__canonicalControlAdminV259", { value: true });
    return wrapped;
  });

  globalThis.__canonicalControlAdminV259 = Object.freeze({
    version: VERSION,
    sanitizeCatalog,
    consolidateState,
    findCanonicalItem,
    isDuplicateItem,
    isDuplicateMapping
  });

  const source = document.currentScript;
  const core = document.createElement("script");
  const baseUrl = source?.src || document.baseURI;
  core.src = new URL(CORE_SCRIPT, baseUrl).toString();
  core.async = false;
  if (source?.nonce) core.nonce = source.nonce;
  if (source?.crossOrigin) core.crossOrigin = source.crossOrigin;
  if (source?.referrerPolicy) core.referrerPolicy = source.referrerPolicy;
  if (source?.id) {
    core.id = source.id;
    source.removeAttribute("id");
  }
  core.addEventListener("error", () => {
    console.error(`[${VERSION}] Falha ao carregar o núcleo de inicialização preservado.`);
  });
  (source?.parentNode || document.head || document.documentElement).insertBefore(core, source?.nextSibling || null);
})();
