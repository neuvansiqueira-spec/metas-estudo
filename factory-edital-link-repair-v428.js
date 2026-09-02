(() => {
  "use strict";

  // V428 — Reparo do vínculo do edital na Fábrica.
  //
  // A V426 reescreveu `factoryItems`, mas `factoryAgenda` — a fonte da verdade,
  // da qual `factoryItems` é apenas um apelido em ensureFactoryAgenda() — ficou
  // fora de LIST_COLLECTIONS. Três consequências encadeadas:
  //
  //   1. a reescrita de `factoryItems.disciplina` era descartada no primeiro
  //      ensureFactoryAgenda() seguinte;
  //   2. `assertNoLegacyNamesRemain` não inspeciona `factoryAgenda`, então a
  //      pós-condição passava com os nomes antigos ainda vivos;
  //   3. `editalLink.groupKey` nunca entrou no escopo da migração, e como
  //      syncFactoryWithActiveEdital() deduplica por essa chave, cada disciplina
  //      renomeada virou item novo em vez de item atualizado.
  //
  // Este módulo repara o efeito e a causa: renomeia na agenda, reescreve os
  // vínculos e remove as cópias vazias que o sync criou, preservando qualquer
  // item com trabalho de módulo.

  const VERSION = "20260901-factory-edital-link-repair-v428";
  const MIGRATION_KEY = "factoryEditalLinkRepairV428";
  const API_KEY = "__ALDUS_FACTORY_EDITAL_LINK_REPAIR_V428__";

  const SPLIT_ORIGINS = Object.freeze([
    "LEGISLAÇÃO PENAL E LEGISLAÇÃO PROCESSUAL PENAL EXTRAVAGANTE",
    "LEGISLAÇÃO PENAL E PROCESSUAL PENAL ESPECIAL"
  ]);

  const DESTINATIONS = Object.freeze({
    penal: "LEGISLAÇÃO ESPECÍFICA – DIREITO PENAL",
    processualPenal: "LEGISLAÇÃO ESPECÍFICA – DIREITO PROCESSUAL PENAL",
    administrativo: "LEGISLAÇÃO ESPECÍFICA – DIREITO ADMINISTRATIVO"
  });

  const WHOLE_MERGES = Object.freeze({
    CRIMINOLOGIA: "CIÊNCIAS FORENSES",
    "MEDICINA LEGAL": "CIÊNCIAS FORENSES",
    "DIREITO ADMINISTRATIVO E GESTÃO PÚBLICA": "DIREITO ADMINISTRATIVO",
    "LEGISLAÇÃO ESPECIAL – DIREITO ADMINISTRATIVO": DESTINATIONS.administrativo
  });

  const SPECIFIC_LAW_RULES = Object.freeze([
    ["7.210", DESTINATIONS.processualPenal],
    ["12.037", DESTINATIONS.processualPenal],
    ["10.446", DESTINATIONS.processualPenal],
    ["5.553", DESTINATIONS.processualPenal],
    ["8.429", "DIREITO ADMINISTRATIVO"],
    ["12.846", "DIREITO ADMINISTRATIVO"],
    ["12.318", "DIREITO CIVIL"]
  ]);

  const LEGACY_NAMES = Object.freeze([...SPLIT_ORIGINS, ...Object.keys(WHOLE_MERGES)]);

  // factoryAgenda é a coleção que a V426 esqueceu; ela lidera a lista de propósito.
  const RENAME_COLLECTIONS = Object.freeze([
    ["factoryAgenda", ["disciplina"]],
    ["factoryItems", ["disciplina"]],
    ["syllabusItems", ["discipline"]],
    ["dailyGoals", ["discipline", "disciplina"]],
    ["studies", ["discipline"]],
    ["materials", ["discipline"]],
    ["questionLogs", ["discipline", "disciplina"]],
    ["questionBank", ["discipline", "disciplina"]],
    ["questionErrorNotebook", ["discipline", "disciplina"]],
    ["subjects", ["discipline"]]
  ]);

  const PROTECTED_LENGTHS = Object.freeze([
    "syllabusItems", "dailyGoals", "studies", "materials", "questionLogs",
    "questionBank", "questionBankSessions", "questionErrorNotebook", "simulados", "subjects"
  ]);

  const isObject = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);
  const hasOwn = (target, key) => Object.prototype.hasOwnProperty.call(target || {}, key);
  const cleanText = (value) => String(value ?? "").trim();
  const clone = (value) => (typeof structuredClone === "function" ? structuredClone(value) : JSON.parse(JSON.stringify(value)));

  // Espelha canonical() de script.js: trim + lowercase, sem remover acento.
  // Divergir daqui produziria chaves que o sync não reconhece — e uma nova
  // enxurrada de duplicados.
  const canonical = (value) => cleanText(value).toLowerCase();

  function factoryEditalGroupKey(discipline, subject) {
    return `edital:${canonical(discipline)}|${canonical(subject)}`;
  }

  function classificationText(item = {}) {
    const subtopics = Array.isArray(item.editalSubtemas) ? item.editalSubtemas.join(" ") : "";
    return [item.tema, item.observacao, subtopics, item.editalLink?.subject].map(cleanText).join(" ");
  }

  function resolvedDiscipline(item = {}) {
    const name = cleanText(item.disciplina);
    if (!name) return name;
    if (SPLIT_ORIGINS.includes(name)) {
      const haystack = classificationText(item);
      for (const [law, target] of SPECIFIC_LAW_RULES) if (haystack.includes(law)) return target;
      return DESTINATIONS.penal;
    }
    if (hasOwn(WHOLE_MERGES, name)) return WHOLE_MERGES[name];
    return name;
  }

  function rewrittenName(value, record) {
    const name = cleanText(value);
    if (!name) return value;
    if (SPLIT_ORIGINS.includes(name)) return resolvedDiscipline({ ...record, disciplina: name });
    if (hasOwn(WHOLE_MERGES, name)) return WHOLE_MERGES[name];
    return value;
  }

  function hasModuleWork(item = {}) {
    const modules = isObject(item.modules) ? item.modules : {};
    for (const key of Object.keys(modules)) {
      const entry = modules[key];
      if (!isObject(entry)) continue;
      if (cleanText(entry.wordLink) || cleanText(entry.pdfLink)) return true;
      if (cleanText(entry.status) && cleanText(entry.status) !== "Não iniciado") return true;
    }
    return false;
  }

  function agendaOf(state) {
    if (Array.isArray(state?.factoryAgenda) && state.factoryAgenda.length) return state.factoryAgenda;
    if (Array.isArray(state?.factoryItems)) return state.factoryItems;
    return [];
  }

  function renameCollections(working, report) {
    for (const [collection, fields] of RENAME_COLLECTIONS) {
      const list = Array.isArray(working[collection]) ? working[collection] : [];
      for (const record of list) {
        if (!isObject(record)) continue;
        for (const field of fields) {
          if (!hasOwn(record, field)) continue;
          const after = rewrittenName(record[field], record);
          if (after !== record[field]) {
            record[field] = after;
            report.renamedByCollection[collection] = (report.renamedByCollection[collection] || 0) + 1;
            report.renamedTotal += 1;
          }
        }
      }
    }
    const weights = isObject(working.disciplineWeights) ? working.disciplineWeights : null;
    if (!weights) return;
    for (const key of Object.keys(weights)) {
      const after = rewrittenName(key, {});
      if (after === key) continue;
      const current = Number(weights[after]);
      const incoming = Number(weights[key]);
      weights[after] = Number.isFinite(current) && Number.isFinite(incoming)
        ? Math.max(current, incoming)
        : (Number.isFinite(incoming) ? incoming : current);
      delete weights[key];
      report.weightKeysMerged.push({ from: key, to: after });
    }
  }

  function relinkAgenda(agenda, report) {
    for (const item of agenda) {
      if (!isObject(item) || !isObject(item.editalLink)) continue;
      const discipline = cleanText(item.disciplina);
      const expected = factoryEditalGroupKey(discipline, item.tema);
      if (item.editalLink.groupKey === expected && cleanText(item.editalLink.discipline) === discipline) continue;
      item.editalLink.groupKey = expected;
      item.editalLink.discipline = discipline;
      report.relinked += 1;
    }
  }

  function goalReferencedFactoryIds(working) {
    const referenced = new Set();
    for (const goal of Array.isArray(working.dailyGoals) ? working.dailyGoals : []) {
      const id = cleanText(goal?.factoryItemId);
      if (id) referenced.add(id);
    }
    return referenced;
  }

  function dedupeAgenda(agenda, working, report) {
    const referenced = goalReferencedFactoryIds(working);
    const groups = new Map();
    for (const item of agenda) {
      if (!isObject(item)) continue;
      const key = item.editalLink?.groupKey || factoryEditalGroupKey(item.disciplina, item.tema);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(item);
    }

    const doomed = new Set();
    for (const [key, group] of groups) {
      if (group.length < 2) continue;
      report.duplicateGroups += 1;
      const withWork = group.filter(hasModuleWork);
      const oldest = group.slice().sort((a, b) => String(a.createdAt || "").localeCompare(String(b.createdAt || "")))[0];

      if (withWork.length > 1) {
        report.preserved.push({ key, reason: "mais de um item com trabalho de módulo", count: group.length });
        continue;
      }
      const anchor = withWork[0] || oldest;
      // Se o trabalho está na cópia nova, remover a antiga descartaria pasta e
      // histórico. Preserva os dois e relata — a escolha é do usuário.
      if (withWork.length === 1 && anchor !== oldest) {
        report.preserved.push({ key, reason: "trabalho de módulo está na cópia mais nova", count: group.length });
        continue;
      }
      for (const item of group) {
        if (item === anchor || hasModuleWork(item)) continue;
        if (referenced.has(cleanText(item.id))) {
          report.preserved.push({ key, reason: "meta diária referencia o item", count: group.length });
          continue;
        }
        doomed.add(item);
      }
    }

    if (!doomed.size) return [];
    const removed = [...doomed].map((item) => clone(item));
    const survivors = agenda.filter((item) => !doomed.has(item));
    working.factoryAgenda = survivors;
    working.factoryItems = survivors;
    report.removedCount = removed.length;
    return removed;
  }

  function writeTombstones(working, removed, changedAt) {
    if (!removed.length) return;
    if (!isObject(working.syncTombstones)) working.syncTombstones = { schemaVersion: 1, collections: {} };
    if (!isObject(working.syncTombstones.collections)) working.syncTombstones.collections = {};
    let deviceId = "";
    try { deviceId = typeof getDeviceId === "function" ? getDeviceId() : ""; } catch { deviceId = ""; }
    for (const collection of ["factoryItems", "factoryAgenda"]) {
      const bucket = working.syncTombstones.collections[collection] ||= {};
      for (const item of removed) {
        const id = cleanText(item.id);
        if (!id) continue;
        const key = `${collection}:id:${id}`;
        bucket[key] = { key, collection, deletedAt: changedAt, deviceId };
      }
    }
  }

  function snapshotLengths(state) {
    const sizes = {};
    for (const collection of PROTECTED_LENGTHS) sizes[collection] = Array.isArray(state?.[collection]) ? state[collection].length : 0;
    return sizes;
  }

  function assertLengthsUnchanged(before, after) {
    for (const collection of PROTECTED_LENGTHS) {
      if (before[collection] !== after[collection]) {
        throw new Error(`V428: coleção protegida "${collection}" mudou de tamanho (${before[collection]} → ${after[collection]}).`);
      }
    }
  }

  function assertNoLegacyNamesRemain(state) {
    const found = new Set();
    for (const [collection, fields] of RENAME_COLLECTIONS) {
      for (const record of Array.isArray(state?.[collection]) ? state[collection] : []) {
        if (!isObject(record)) continue;
        for (const field of fields) {
          const value = cleanText(record[field]);
          if (LEGACY_NAMES.includes(value)) found.add(`${collection}.${field}=${value}`);
        }
      }
    }
    for (const key of Object.keys(isObject(state?.disciplineWeights) ? state.disciplineWeights : {})) {
      if (LEGACY_NAMES.includes(cleanText(key))) found.add(`disciplineWeights.${key}`);
    }
    if (found.size) throw new Error(`V428: nomes antigos permaneceram: ${[...found].join(", ")}`);
  }

  function assertLinksConsistent(state) {
    for (const item of agendaOf(state)) {
      if (!isObject(item) || !isObject(item.editalLink)) continue;
      const expected = factoryEditalGroupKey(item.disciplina, item.tema);
      if (item.editalLink.groupKey !== expected) {
        throw new Error(`V428: vínculo inconsistente em "${cleanText(item.tema)}" (${item.editalLink.groupKey} ≠ ${expected}).`);
      }
    }
  }

  function assertAgendaAliased(state) {
    if (state.factoryItems !== state.factoryAgenda) {
      throw new Error("V428: factoryItems deixou de apontar para factoryAgenda.");
    }
  }

  function surveyRemainingDuplicates(state) {
    const groups = new Map();
    for (const item of agendaOf(state)) {
      if (!isObject(item)) continue;
      const key = item.editalLink?.groupKey || factoryEditalGroupKey(item.disciplina, item.tema);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(item);
    }
    const leftovers = [];
    for (const [key, group] of groups) {
      if (group.length < 2) continue;
      leftovers.push({ key, count: group.length, withWork: group.filter(hasModuleWork).length });
    }
    return leftovers;
  }

  // Pós-condição verificável de fora: o mesmo conjunto de asserções que decide
  // se o reparo pode ser gravado.
  function verify(state) {
    const errors = [];
    for (const check of [assertNoLegacyNamesRemain, assertLinksConsistent, assertAgendaAliased]) {
      try { check(state); } catch (error) { errors.push(error?.message || String(error)); }
    }
    return { ok: errors.length === 0, errors };
  }

  function completedRepair(state) {
    return state?.migrations?.[MIGRATION_KEY]?.completed === true;
  }

  function replaceState(target, source) {
    for (const key of Object.keys(target)) delete target[key];
    Object.assign(target, source);
  }

  function applyFactoryEditalLinkRepairV428(targetState = {}, options = {}) {
    if (!isObject(targetState)) return { changed: false, blocked: true, reason: "state-unavailable" };
    if (completedRepair(targetState) && !options.force) {
      return { changed: false, blocked: false, repeated: true, report: clone(targetState.migrations[MIGRATION_KEY].report || {}) };
    }

    const changedAt = new Date().toISOString();
    const protectedBefore = snapshotLengths(targetState);
    let working = null;
    const report = {
      version: VERSION,
      executedAt: changedAt,
      renamedTotal: 0,
      renamedByCollection: {},
      weightKeysMerged: [],
      relinked: 0,
      duplicateGroups: 0,
      removedCount: 0,
      preserved: [],
      leftoverDuplicateGroups: []
    };

    try {
      // O clone fica dentro do try: estado corrompido vira aborto limpo,
      // nunca exceção durante o boot.
      working = clone(targetState);
      renameCollections(working, report);

      const agenda = agendaOf(working);
      working.factoryAgenda = agenda;
      working.factoryItems = agenda;

      relinkAgenda(agenda, report);
      const removed = dedupeAgenda(agenda, working, report);
      writeTombstones(working, removed, changedAt);

      assertLengthsUnchanged(protectedBefore, snapshotLengths(working));
      assertNoLegacyNamesRemain(working);
      assertLinksConsistent(working);
      assertAgendaAliased(working);

      report.leftoverDuplicateGroups = surveyRemainingDuplicates(working);

      working.migrations ||= {};
      working.migrations[MIGRATION_KEY] = {
        version: VERSION,
        executedAt: changedAt,
        completed: true,
        report: clone(report),
        removedRecords: removed
      };

      replaceState(targetState, working);
      // replaceState copia referências uma a uma; refaz o apelido no estado real.
      targetState.factoryItems = targetState.factoryAgenda;
      return { changed: true, blocked: false, report: clone(report), removed: removed.length };
    } catch (error) {
      // Nada foi escrito em targetState: todo o trabalho ocorreu sobre o clone.
      return { changed: false, blocked: true, reason: "postcondition", message: error?.message || String(error) };
    }
  }

  function reportText(report = {}) {
    const lines = [
      "V428 — Reparo do vínculo do edital na Fábrica",
      `Campos de disciplina renomeados: ${report.renamedTotal ?? 0}`
    ];
    for (const [collection, count] of Object.entries(report.renamedByCollection || {})) lines.push(`- ${collection}: ${count}`);
    lines.push(
      `Vínculos editalLink reescritos: ${report.relinked ?? 0}`,
      `Grupos duplicados encontrados: ${report.duplicateGroups ?? 0}`,
      `Itens removidos: ${report.removedCount ?? 0}`,
      "",
      "Preservados por decisão conservadora:"
    );
    if (!(report.preserved || []).length) lines.push("- nenhum");
    else for (const entry of report.preserved) lines.push(`- ${entry.key}: ${entry.reason}`);
    lines.push("", "Duplicatas remanescentes (apenas relatadas):");
    if (!(report.leftoverDuplicateGroups || []).length) lines.push("- nenhuma");
    else for (const entry of report.leftoverDuplicateGroups) lines.push(`- ${entry.key}: ${entry.count} itens`);
    return lines.join("\n");
  }

  const api = Object.freeze({
    version: VERSION,
    migrationKey: MIGRATION_KEY,
    legacyNames: LEGACY_NAMES,
    wholeMerges: WHOLE_MERGES,
    splitOrigins: SPLIT_ORIGINS,
    destinations: DESTINATIONS,
    canonical,
    factoryEditalGroupKey,
    resolvedDiscipline,
    hasModuleWork,
    apply: applyFactoryEditalLinkRepairV428,
    surveyRemainingDuplicates,
    verify,
    reportText
  });

  globalThis[API_KEY] = api;
  globalThis.applyFactoryEditalLinkRepairV428 = applyFactoryEditalLinkRepairV428;
  if (typeof module !== "undefined" && module.exports) module.exports = api;

  function runOnce() {
    try {
      const state = globalThis.state;
      if (!isObject(state) || completedRepair(state)) return;
      const result = applyFactoryEditalLinkRepairV428(state);
      if (result.blocked) {
        console.warn("[Aldus V428] Reparo não aplicado; nenhum dado alterado.", result.message || result.reason);
        return;
      }
      if (!result.changed) return;
      console.info("[Aldus V428] Reparo aplicado.", result.report);
      try { if (typeof saveData === "function") saveData(); }
      catch (error) { console.warn("[Aldus V428] Falha ao persistir.", error); }
      try { window.dispatchEvent(new CustomEvent("aldus:factory-edital-link-repair-v428-complete", { detail: clone(result.report) })); } catch {}
    } catch (error) {
      console.warn("[Aldus V428] Reparo interrompido.", error);
    }
  }

  if (typeof window !== "undefined") {
    window.addEventListener("aldus:post-bootstrap-maintenance-complete", runOnce, { once: true });
    window.addEventListener("aldus:bootstrap-ready", runOnce, { once: true });
    window.addEventListener("load", runOnce, { once: true });
  }
})();
