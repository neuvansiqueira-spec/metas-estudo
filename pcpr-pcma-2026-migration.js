(function installPcprPcma2026Migration(global) {
  "use strict";

  const VERSION = "pcpr-pcma-2026-v3";
  const clone = (value) => JSON.parse(JSON.stringify(value));

  function upsertSystemRecords(current = [], incoming = []) {
    const byId = new Map((Array.isArray(current) ? current : []).filter(Boolean).map((item) => [item.id, item]));
    incoming.forEach((item) => {
      const existing = byId.get(item.id);
      if (existing) Object.assign(existing, clone(item));
      else byId.set(item.id, clone(item));
    });
    return [...byId.values()];
  }

  function appendMissingRecords(current = [], incoming = []) {
    const output = Array.isArray(current) ? current : [];
    const ids = new Set(output.map((item) => item?.id).filter(Boolean));
    incoming.forEach((item) => {
      if (!item?.id || ids.has(item.id)) return;
      output.push(clone(item));
      ids.add(item.id);
    });
    return output;
  }

  function migrationCoverage(catalog) {
    const coverage = new Map();
    catalog.mappings.forEach((mapping) => {
      const list = coverage.get(mapping.syllabusItemId) || [];
      list.push({
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
      });
      coverage.set(mapping.syllabusItemId, list);
    });
    return coverage;
  }

  function applyPcprPcma2026Migration(targetState = {}) {
    const catalog = global.PCPR_PCMA_2026_CATALOG;
    if (!catalog || catalog.version !== VERSION) {
      return { changed: false, blocked: true, reason: "Catálogo PCPR/PCMA 2026 indisponível ou incompatível." };
    }

    targetState.syllabusItems ||= [];
    targetState.subjects ||= [];
    targetState.schedulableSettings ||= {};
    targetState.contestProfiles ||= [];
    targetState.contestSyllabusMap ||= [];
    targetState.contestPlanningProfiles ||= {};
    targetState.migrations ||= {};

    const beforeIds = new Set(targetState.syllabusItems.map((item) => item.id));
    const protectedHistoryCounts = Object.fromEntries([
      "studies", "dailyGoals", "questionLogs", "smartReviews", "simulados", "materials",
      "questionBank", "questionBankSessions", "questionErrorNotebook", "factoryItems", "factoryAgenda"
    ].map((key) => [key, Array.isArray(targetState[key]) ? targetState[key].length : 0]));

    appendMissingRecords(targetState.syllabusItems, catalog.newItems);
    appendMissingRecords(targetState.syllabusItems, catalog.historicalItems);
    targetState.contestProfiles = upsertSystemRecords(targetState.contestProfiles, catalog.contestProfiles);
    targetState.contestSyllabusMap = upsertSystemRecords(targetState.contestSyllabusMap, catalog.mappings);
    targetState.contestPlanningProfiles = {
      ...targetState.contestPlanningProfiles,
      ...clone(catalog.contestPlanningProfiles)
    };
    targetState.activeContestId ||= "pcpr-2026-delegado";
    targetState.planningMode ||= "joint";

    const coverage = migrationCoverage(catalog);
    targetState.syllabusItems.forEach((item) => {
      const officialCoverage = coverage.get(item.id);
      if (officialCoverage?.length) {
        item.officialCoverage = officialCoverage;
        item.contestCategories = [...new Set(officialCoverage.map((row) => row.classification))];
        item.contestIds = [...new Set(officialCoverage.map((row) => row.contestId))];
      }
      if (item.restoredFromHistoricalReference || item.importMeta?.legacyRestored) {
        item.legacyOnly = true;
        item.hiddenFromCatalog = true;
        item.schedulable = false;
        item.agendavel = false;
        item.importMeta = { ...(item.importMeta || {}), legacyRestored: true, agendavel: false };
        targetState.schedulableSettings[item.id] = {
          ...(targetState.schedulableSettings[item.id] || {}),
          availability: "Não agendável",
          mode: targetState.schedulableSettings[item.id]?.mode || "Revisão apenas",
          priority: false,
          systemLocked: true
        };
      }
    });

    catalog.newItems.forEach((item) => {
      if (targetState.schedulableSettings[item.id]) return;
      const category = item.contestCategory;
      targetState.schedulableSettings[item.id] = {
        availability: category === "D" ? "Não agendável" : "Agendável",
        mode: "Estudo + questões",
        priority: category === "A" || category === "B"
      };
    });

    const afterIds = new Set(targetState.syllabusItems.map((item) => item.id));
    const duplicateUuids = targetState.syllabusItems.length - afterIds.size;
    const lostUuids = [...beforeIds].filter((id) => !afterIds.has(id));
    const historyCountsAfter = Object.fromEntries(Object.keys(protectedHistoryCounts).map((key) => [
      key,
      Array.isArray(targetState[key]) ? targetState[key].length : 0
    ]));
    const historyLoss = Object.keys(protectedHistoryCounts).filter((key) => historyCountsAfter[key] < protectedHistoryCounts[key]);

    if (duplicateUuids || lostUuids.length || historyLoss.length) {
      throw new Error(`Migração PCPR/PCMA bloqueada: duplicados=${duplicateUuids}; UUIDs perdidos=${lostUuids.length}; coleções reduzidas=${historyLoss.join(",") || "nenhuma"}.`);
    }

    const previousMigration = targetState.migrations[VERSION];
    targetState.migrations[VERSION] = {
      version: VERSION,
      appliedAt: previousMigration?.appliedAt || new Date().toISOString(),
      officialCounts: clone(catalog.officialCounts),
      originalUuidsPreserved: previousMigration?.originalUuidsPreserved ?? beforeIds.size,
      createdUuids: previousMigration?.createdUuids ?? [...afterIds].filter((id) => !beforeIds.has(id)).length,
      duplicateUuids: 0,
      protectedHistoryCounts: previousMigration?.protectedHistoryCounts || protectedHistoryCounts,
      historyCountsAfter: previousMigration?.historyCountsAfter || historyCountsAfter
    };
    return {
      changed: afterIds.size !== beforeIds.size,
      blocked: false,
      originalUuidsPreserved: beforeIds.size,
      createdUuids: [...afterIds].filter((id) => !beforeIds.has(id)).length,
      totalSyllabusItems: afterIds.size,
      officialMappings: targetState.contestSyllabusMap.length
    };
  }

  function contestPlanningProfile(targetState = {}, date = "") {
    const profiles = targetState.contestPlanningProfiles || global.PCPR_PCMA_2026_CATALOG?.contestPlanningProfiles || {};
    const mode = ["pcpr", "pcma", "joint"].includes(targetState.planningMode) ? targetState.planningMode : "joint";
    const profile = profiles[mode] || profiles.joint || {};
    if (mode === "joint" && profile.switchDate && date && date >= profile.switchDate) {
      return { ...profile, examDate: profile.nextExamDate || profile.examDate, categories: profile.postSwitchCategories || profile.categories, phase: "post-pcpr" };
    }
    return { ...profile, phase: mode === "joint" ? "pre-pcpr" : mode };
  }

  function officialMappingsForItem(targetState = {}, syllabusItemId = "") {
    return (targetState.contestSyllabusMap || []).filter((mapping) => mapping.syllabusItemId === syllabusItemId);
  }

  function isItemEnabledForPlanning(targetState = {}, syllabusItemId = "", date = "") {
    const item = (targetState.syllabusItems || []).find((candidate) => candidate.id === syllabusItemId);
    if (item?.legacyOnly || item?.hiddenFromCatalog) return false;
    const mappings = officialMappingsForItem(targetState, syllabusItemId);
    if (!mappings.length) return true;
    const profile = contestPlanningProfile(targetState, date);
    const contestIds = new Set(profile.contestIds || []);
    const allowedCategories = new Set(Object.entries(profile.categories || {}).filter(([, weight]) => Number(weight) > 0).map(([category]) => category));
    return mappings.some((mapping) => contestIds.has(mapping.contestId) && allowedCategories.has(mapping.classification));
  }

  global.applyPcprPcma2026Migration = applyPcprPcma2026Migration;
  global.contestPlanningProfile = contestPlanningProfile;
  global.officialMappingsForItem = officialMappingsForItem;
  global.isItemEnabledForPlanning = isItemEnabledForPlanning;
})(globalThis);
