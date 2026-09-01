(() => {
  "use strict";

  const VERSION = "20260901-discipline-unification-v426-persistence-r3";
  const MIGRATION_KEY = "disciplineUnificationV426";
  const API_KEY = "__ALDUS_DISCIPLINE_UNIFICATION_V426__";
  const WRAP_MARKER = "__aldusDisciplineUnificationV426Wrapped";
  const ABORT_LOCK_KEY = "aldus:v426:aborted-build-lock";

  const SPLIT_ORIGINS = Object.freeze([
    "LEGISLAÇÃO PENAL E LEGISLAÇÃO PROCESSUAL PENAL EXTRAVAGANTE",
    "LEGISLAÇÃO PENAL E PROCESSUAL PENAL ESPECIAL"
  ]);
  const DESTINATIONS = Object.freeze({
    penal: "LEGISLAÇÃO ESPECÍFICA – DIREITO PENAL",
    processualPenal: "LEGISLAÇÃO ESPECÍFICA – DIREITO PROCESSUAL PENAL",
    administrativo: "LEGISLAÇÃO ESPECÍFICA – DIREITO ADMINISTRATIVO",
    direitosHumanos: "LEGISLAÇÃO ESPECÍFICA – DIREITOS HUMANOS"
  });
  const WHOLE_MERGES = Object.freeze({
    CRIMINOLOGIA: "CIÊNCIAS FORENSES",
    "MEDICINA LEGAL": "CIÊNCIAS FORENSES",
    "DIREITO ADMINISTRATIVO E GESTÃO PÚBLICA": "DIREITO ADMINISTRATIVO",
    "LEGISLAÇÃO ESPECIAL – DIREITO ADMINISTRATIVO": DESTINATIONS.administrativo
  });
  const REMOVABLE_IF_EMPTY = Object.freeze([
    "Direito Penal e Legislação Complementar",
    "Direito Administrativo e Legislação Complementar",
    "Direito Constitucional e Legislação Complementar",
    "Direito Civil e Legislação Complementar",
    DESTINATIONS.direitosHumanos,
    ...SPLIT_ORIGINS
  ]);
  const SPECIFIC_LAW_RULES = Object.freeze([
    ["7.210", DESTINATIONS.processualPenal], ["12.037", DESTINATIONS.processualPenal],
    ["10.446", DESTINATIONS.processualPenal], ["5.553", DESTINATIONS.processualPenal],
    ["8.429", "DIREITO ADMINISTRATIVO"], ["12.846", "DIREITO ADMINISTRATIVO"],
    ["12.318", "DIREITO CIVIL"]
  ]);
  const EXPLICIT_PENAL_LAWS = Object.freeze(["9.609", "9.610", "12.288", "6.001"]);
  const OPERATIONAL_DISCIPLINES = new Set(["simulado", "simulados", "peca", "pecas"]);
  const LIST_COLLECTIONS = Object.freeze([
    ["syllabusItems", ["discipline"]], ["dailyGoals", ["discipline", "disciplina"]],
    ["studies", ["discipline"]], ["materials", ["discipline"]],
    ["questionLogs", ["discipline", "disciplina"]], ["questionBank", ["discipline", "disciplina"]],
    ["questionErrorNotebook", ["discipline", "disciplina"]], ["factoryItems", ["disciplina"]],
    ["subjects", ["discipline"]]
  ]);
  const PROTECTED_LENGTHS = Object.freeze([
    "syllabusItems", "dailyGoals", "studies", "materials", "questionLogs", "questionBank",
    "questionBankSessions", "questionErrorNotebook", "simulados", "factoryItems", "subjects"
  ]);

  const clone = (v) => JSON.parse(JSON.stringify(v));
  const isObject = (v) => v && typeof v === "object" && !Array.isArray(v);
  const hasOwn = (o, k) => Object.prototype.hasOwnProperty.call(o || {}, k);
  const cleanText = (v) => String(v ?? "").replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
  const canonical = (v) => cleanText(v).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const recordLabel = (r = {}) => cleanText(r.subject || r.assunto || r.topic || r.topico || r.title || r.name || r.id || "(sem assunto)");
  const recordText = (r = {}) => [r.subject, r.assunto, r.topic, r.topico, r.title, r.name, r.description].map(cleanText).filter(Boolean).join(" | ");

  function classifySplitRecord(record = {}) {
    const text = recordText(record);
    for (const [law, target] of SPECIFIC_LAW_RULES) if (text.includes(law)) return { target, law, matched: true };
    for (const law of EXPLICIT_PENAL_LAWS) if (text.includes(law)) return { target: DESTINATIONS.penal, law, matched: true };
    return { target: DESTINATIONS.penal, law: null, matched: false };
  }
  function assertDestinationSpelling() {
    for (const name of Object.values(DESTINATIONS)) if (name.includes(" - ") || !name.includes(" – ")) throw new Error(`V426: nome-destino inválido: ${name}`);
  }
  function rememberCount(report, key, n = 1) { report.collectionRewriteCounts[key] = (report.collectionRewriteCounts[key] || 0) + n; }
  function buildSplitTargetMap(working, report) {
    const map = new Map();
    for (const item of working.syllabusItems || []) {
      if (!SPLIT_ORIGINS.includes(item?.discipline)) continue;
      const from = item.discipline, c = classifySplitRecord(item);
      map.set(String(item.id || ""), c.target);
      item.discipline = c.target;
      rememberCount(report, "syllabusItems");
      const entry = { id: item.id || "", subject: recordLabel(item), from, to: c.target, law: c.law };
      report.stageAReassignments.push(entry);
      if (!c.matched) report.stageAUnmatched.push(entry);
    }
    return map;
  }
  function resolveTarget(record, map) {
    const id = String(record?.syllabusItemId || "");
    return id && map.has(id) ? map.get(id) : classifySplitRecord(record).target;
  }
  function rewrittenDiscipline(value, record, map) {
    const name = cleanText(value);
    if (SPLIT_ORIGINS.includes(name)) return resolveTarget(record, map);
    return hasOwn(WHOLE_MERGES, name) ? WHOLE_MERGES[name] : value;
  }
  function rewriteFields(record, fields, map) {
    if (!isObject(record)) return false;
    let changed = false;
    for (const field of fields) {
      if (!hasOwn(record, field)) continue;
      const next = rewrittenDiscipline(record[field], record, map);
      if (next !== record[field]) { record[field] = next; changed = true; }
    }
    return changed;
  }
  function rewriteCollections(working, map, report) {
    for (const [collection, fields] of LIST_COLLECTIONS) {
      for (const record of working[collection] || []) if (rewriteFields(record, fields, map)) rememberCount(report, collection);
    }
    for (const session of working.questionBankSessions || []) for (const item of session?.items || []) if (rewriteFields(item, ["disciplina"], map)) rememberCount(report, "questionBankSessions.items");
    for (const simulado of working.simulados || []) for (const item of simulado?.disciplines || []) if (rewriteFields(item, ["discipline"], map)) rememberCount(report, "simulados.disciplines");
  }
  function numericWeight(v) { const n = Number(v); return Number.isFinite(n) ? n : null; }
  function mergeWeightKey(weights, source, target, report, scope = "disciplineWeights") {
    if (!isObject(weights) || !hasOwn(weights, source)) return false;
    const sourceRaw = weights[source], targetRaw = hasOwn(weights, target) ? weights[target] : undefined;
    const a = numericWeight(sourceRaw), b = numericWeight(targetRaw);
    const finalValue = a !== null && b !== null ? Math.max(a, b) : a !== null ? a : b !== null ? b : targetRaw !== undefined ? targetRaw : sourceRaw;
    weights[target] = finalValue; delete weights[source];
    report.weightMerges.push({ scope, from: source, to: target, sourceWeight: sourceRaw, previousDestinationWeight: targetRaw ?? null, finalWeight: finalValue });
    rememberCount(report, scope); return true;
  }
  function rewriteWeightMap(weights, report, scope) {
    if (!isObject(weights)) return;
    for (const source of SPLIT_ORIGINS) mergeWeightKey(weights, source, DESTINATIONS.penal, report, scope);
    for (const [source, target] of Object.entries(WHOLE_MERGES)) mergeWeightKey(weights, source, target, report, scope);
  }
  function normalizePlanningProfiles(working, report) {
    const categories = working?.contestPlanningProfiles?.joint?.categories;
    if (!isObject(categories)) return;
    const before = categories.C; categories.C = 0;
    if (before !== 0) report.configChanges.push({ path: "contestPlanningProfiles.joint.categories.C", before, after: 0 });
  }
  function countNamedReferences(state, name) {
    let count = 0;
    for (const [collection, fields] of LIST_COLLECTIONS) for (const r of state?.[collection] || []) if (fields.some((f) => cleanText(r?.[f]) === name)) count += 1;
    for (const s of state?.questionBankSessions || []) for (const r of s?.items || []) if (cleanText(r?.disciplina) === name) count += 1;
    for (const s of state?.simulados || []) for (const r of s?.disciplines || []) if (cleanText(r?.discipline) === name) count += 1;
    return count;
  }
  function removeEmptyDisciplines(working, report) {
    working.disciplineWeights ||= {};
    for (const name of REMOVABLE_IF_EMPTY) {
      const syllabusCount = (working.syllabusItems || []).filter((i) => cleanText(i?.discipline) === name).length;
      const otherReferences = Math.max(0, countNamedReferences(working, name) - syllabusCount);
      if (syllabusCount) { report.notEmptyDisciplines.push({ name, syllabusItems: syllabusCount, otherReferences }); continue; }
      const hadWeight = hasOwn(working.disciplineWeights, name);
      if (hadWeight) { delete working.disciplineWeights[name]; rememberCount(report, "disciplineWeights"); }
      report.excludedDisciplines.push(name);
      report.stageCDetails.push({ name, removedWeight: hadWeight, preservedHistoricalReferences: otherReferences });
    }
  }
  function applyPlanningConfig(working, report) {
    working.planning ||= {}; working.planning.config ||= {};
    const config = working.planning.config;
    const tb = config.topicsPerDay; config.topicsPerDay = 8;
    if (tb !== 8) report.configChanges.push({ path: "planning.config.topicsPerDay", before: tb ?? null, after: 8 });
    const db = config.disciplinesPerDay;
    if (!Number.isFinite(Number(db)) || Number(db) < 8) { config.disciplinesPerDay = 8; report.configChanges.push({ path: "planning.config.disciplinesPerDay", before: db ?? null, after: 8 }); }
  }
  function collectDisciplineNames(state) {
    const names = new Set(), add = (v) => { const s = cleanText(v); if (s) names.add(s); };
    for (const [collection, fields] of LIST_COLLECTIONS) for (const r of state?.[collection] || []) for (const f of fields) add(r?.[f]);
    for (const s of state?.questionBankSessions || []) for (const r of s?.items || []) add(r?.disciplina);
    for (const s of state?.simulados || []) for (const r of s?.disciplines || []) add(r?.discipline);
    for (const k of Object.keys(state?.disciplineWeights || {})) add(k);
    return names;
  }
  function assertNoLegacyNamesRemain(state) {
    const names = collectDisciplineNames(state), forbidden = [...SPLIT_ORIGINS, ...Object.keys(WHOLE_MERGES)];
    const remaining = forbidden.filter((n) => names.has(n));
    if (remaining.length) throw new Error(`V426: nomes antigos permaneceram após migração: ${remaining.join(", ")}`);
  }
  function assertNoWrongDestinationHyphen(state) {
    for (const n of collectDisciplineNames(state)) if (Object.values(DESTINATIONS).includes(n) && n.includes(" - ")) throw new Error(`V426: destino usa hífen: ${n}`);
  }
  function disciplineExists(state, name) {
    const wanted = cleanText(name);
    if (!wanted) return false;
    if (OPERATIONAL_DISCIPLINES.has(canonical(wanted))) return true;
    if ((state?.syllabusItems || []).some((i) => cleanText(i?.discipline) === wanted)) return true;
    return (state?.dailyGoals || []).some((g) => cleanText(g?.discipline) === wanted || cleanText(g?.disciplina) === wanted);
  }
  function migrationTouchedDisciplineNames() {
    const names = new Set([...REMOVABLE_IF_EMPTY, ...SPLIT_ORIGINS, ...Object.keys(WHOLE_MERGES), ...Object.values(WHOLE_MERGES), ...Object.values(DESTINATIONS)]);
    for (const [, target] of SPECIFIC_LAW_RULES) names.add(target);
    return names;
  }
  function validateWeightKeysPostCondition(state, preexistingWeightKeys = new Set(), report = {}) {
    const weights = state?.disciplineWeights || {}, touched = migrationTouchedDisciplineNames();
    const invalid = Object.keys(weights).map(cleanText).filter((n) => n && !disciplineExists(state, n));
    const touchedInvalid = invalid.filter((n) => touched.has(n));
    const unrelatedInvalid = invalid.filter((n) => !touched.has(n));
    const syllabusNames = new Set((state?.syllabusItems || []).map((i) => cleanText(i?.discipline)).filter(Boolean));
    const sortPt = (values) => [...new Set(values)].sort((a, b) => a.localeCompare(b, "pt-BR"));
    report.weightValidation = {
      mode: "post-condition",
      existenceRule: "syllabusItems|dailyGoals|operational",
      legitimateNonSyllabusWeights: sortPt(Object.keys(weights).map(cleanText).filter((n) => n && !syllabusNames.has(n) && disciplineExists(state, n))),
      unrelatedPreexistingOrphanWeights: sortPt(unrelatedInvalid.filter((n) => preexistingWeightKeys.has(n))),
      unrelatedInvalidWeights: sortPt(unrelatedInvalid),
      touchedInvalidWeights: sortPt(touchedInvalid)
    };
    if (touchedInvalid.length) throw new Error(`V426: pós-condição de disciplineWeights falhou nas disciplinas tocadas: ${touchedInvalid.join(", ")}`);
  }
  function basePostConditionsSatisfied(state) {
    try {
      assertNoLegacyNamesRemain(state); assertNoWrongDestinationHyphen(state);
      if (Number(state?.planning?.config?.topicsPerDay) !== 8 || Number(state?.planning?.config?.disciplinesPerDay) < 8) return false;
      if (isObject(state?.contestPlanningProfiles?.joint?.categories) && Number(state.contestPlanningProfiles.joint.categories.C) !== 0) return false;
      for (const name of REMOVABLE_IF_EMPTY) {
        const empty = !(state?.syllabusItems || []).some((i) => cleanText(i?.discipline) === name);
        if (empty && hasOwn(state?.disciplineWeights || {}, name)) return false;
      }
      return true;
    } catch { return false; }
  }
  function completedMigration(state) { return state?.migrations?.[MIGRATION_KEY]?.completed === true && basePostConditionsSatisfied(state); }
  function snapshotLengths(state) { return Object.fromEntries(PROTECTED_LENGTHS.map((k) => [k, Array.isArray(state?.[k]) ? state[k].length : 0])); }
  function assertLengthsUnchanged(a, b) { for (const k of PROTECTED_LENGTHS) if (a[k] !== b[k]) throw new Error(`V426: coleção ${k} mudou de tamanho (${a[k]} -> ${b[k]}).`); }
  function replaceState(target, source) { for (const k of Object.keys(target)) delete target[k]; Object.assign(target, source); }

  function applyDisciplineUnificationV426(targetState = {}, options = {}) {
    assertDestinationSpelling();
    if (!isObject(targetState)) return { changed: false, blocked: true, reason: "state-unavailable" };
    if (completedMigration(targetState)) return { changed: false, blocked: false, repeated: true, report: clone(targetState.migrations[MIGRATION_KEY].report || {}) };
    const backup = options.backupConfirmation;
    if (!backup?.confirmed || !cleanText(backup.fileName)) return { changed: false, blocked: true, reason: "backup-required" };
    const protectedBefore = snapshotLengths(targetState), beforeNames = collectDisciplineNames(targetState);
    const preexistingWeightKeys = new Set(Object.keys(targetState.disciplineWeights || {}).map(cleanText));
    const working = clone(targetState);
    const report = { version: VERSION, backup: clone(backup), collectionRewriteCounts: {}, stageAReassignments: [], stageAUnmatched: [], weightMerges: [], excludedDisciplines: [], notEmptyDisciplines: [], stageCDetails: [], weightValidation: null, configChanges: [], distinctDisciplineNamesBefore: beforeNames.size, distinctDisciplineNamesAfter: null, destinationHyphenValidated: false };
    working.disciplineWeights ||= {};
    const map = buildSplitTargetMap(working, report);
    rewriteCollections(working, map, report);
    rewriteWeightMap(working.disciplineWeights, report, "disciplineWeights");
    normalizePlanningProfiles(working, report);
    removeEmptyDisciplines(working, report);
    applyPlanningConfig(working, report);
    assertLengthsUnchanged(protectedBefore, snapshotLengths(working));
    assertNoLegacyNamesRemain(working); assertNoWrongDestinationHyphen(working);
    validateWeightKeysPostCondition(working, preexistingWeightKeys, report);
    report.distinctDisciplineNamesAfter = collectDisciplineNames(working).size; report.destinationHyphenValidated = true;
    working.migrations ||= {};
    const prior = isObject(working.migrations[MIGRATION_KEY]) ? working.migrations[MIGRATION_KEY] : {};
    working.migrations[MIGRATION_KEY] = { ...prior, version: VERSION, executedAt: new Date().toISOString(), completed: true, backup: clone(report.backup), report: clone(report), stages: { ...(prior.stages || {}), ABCD: { completed: true, version: VERSION, executedAt: new Date().toISOString() } } };
    replaceState(targetState, working);
    return { changed: true, blocked: false, report: clone(report) };
  }

  function enforcePostMigrationPlanningProfile(targetState) {
    if (!targetState?.migrations?.[MIGRATION_KEY]) return false;
    const categories = targetState?.contestPlanningProfiles?.joint?.categories;
    if (!isObject(categories)) return false;
    categories.C = 0; return true;
  }
  function installPcprCompatibilityWrapper() {
    try {
      const current = globalThis.applyPcprPcma2026Migration;
      if (typeof current !== "function" || current[WRAP_MARKER] === VERSION) return Boolean(current);
      const wrapped = function(...args) { const result = current.apply(this, args); enforcePostMigrationPlanningProfile(args[0]); return result; };
      Object.defineProperty(wrapped, WRAP_MARKER, { value: VERSION }); globalThis.applyPcprPcma2026Migration = wrapped; return true;
    } catch { return false; }
  }
  function readMigrationAbortLock() { try { const raw = localStorage.getItem(ABORT_LOCK_KEY); return raw ? JSON.parse(raw) : null; } catch { return null; } }
  function clearMigrationAbortLock() { try { localStorage.removeItem(ABORT_LOCK_KEY); } catch {} }
  function migrationAbortLockApplies(buildVersion = VERSION) { const lock = readMigrationAbortLock(); if (!lock) return false; if (lock.buildVersion !== buildVersion) { clearMigrationAbortLock(); return false; } return true; }
  function markMigrationAbort(error, backup, buildVersion = VERSION) { if (!backup?.confirmed || !cleanText(backup.fileName)) return false; try { localStorage.setItem(ABORT_LOCK_KEY, JSON.stringify({ buildVersion, backupFileName: cleanText(backup.fileName), backupSavedAt: backup.savedAt || null, error: cleanText(error?.message || error), abortedAt: new Date().toISOString() })); return true; } catch { return false; } }
  function reportText(report = {}) { return ["V426 — Relatório de unificação de disciplinas", `Backup confirmado: ${report.backup?.fileName || "não informado"}`, `Nomes distintos: ${report.distinctDisciplineNamesBefore ?? "?"} → ${report.distinctDisciplineNamesAfter ?? "?"}`, `Etapa A: ${(report.stageAReassignments || []).length} reatribuições`, `Disciplinas excluídas: ${(report.excludedDisciplines || []).join("; ") || "nenhuma"}`, `Configurações: ${(report.configChanges || []).map((i) => `${i.path}: ${String(i.before)}→${String(i.after)}`).join("; ") || "nenhuma"}`].join("\n"); }

  async function buildAndSaveBackup(targetState) {
    if (typeof globalThis.showSaveFilePicker !== "function") throw new Error("Este navegador não permite confirmar a gravação do backup.");
    const exportedAt = new Date().toISOString(), payload = JSON.stringify({ app: "Aldus Meta", schema: "discipline-unification-v426-pre-migration-backup", version: 1, storageKey: "metasConcursoData", exportedAt, data: clone(targetState), localStorage: { metasConcursoData: (() => { try { return localStorage.getItem("metasConcursoData") || JSON.stringify(targetState); } catch { return JSON.stringify(targetState); } })() } }, null, 2);
    const suggestedName = `backup-metas-estudo-v426-${exportedAt.replace(/[:.]/g, "-")}.json`;
    const handle = await showSaveFilePicker({ suggestedName, types: [{ description: "Backup JSON Aldus Meta", accept: { "application/json": [".json"] } }] });
    const writable = await handle.createWritable(); await writable.write(payload); await writable.close();
    const file = await handle.getFile(); if (file.size !== new Blob([payload]).size) throw new Error("Backup incompleto.");
    return { confirmed: true, fileName: file.name || suggestedName, savedAt: new Date().toISOString(), bytes: file.size };
  }
  function armBrowserMigration() { installPcprCompatibilityWrapper(); return true; }

  const api = Object.freeze({ version: VERSION, migrationKey: MIGRATION_KEY, destinations: DESTINATIONS, splitOrigins: SPLIT_ORIGINS, wholeMerges: WHOLE_MERGES, apply: applyDisciplineUnificationV426, reportText, disciplineExists, validateWeightKeysPostCondition, basePostConditionsSatisfied, completedMigration, enforcePostMigrationPlanningProfile, installPcprCompatibilityWrapper, markMigrationAbort, clearMigrationAbortLock, migrationAbortLockApplies, readMigrationAbortLock, abortLockKey: ABORT_LOCK_KEY, buildAndSaveBackup, armBrowserMigration });
  globalThis[API_KEY] = api; globalThis.applyDisciplineUnificationV426 = applyDisciplineUnificationV426;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof window !== "undefined") { window.addEventListener("aldus:bootstrap-ready", armBrowserMigration, { once: true }); window.addEventListener("aldus:post-bootstrap-maintenance-complete", armBrowserMigration, { once: true }); window.addEventListener("load", armBrowserMigration, { once: true }); }
})();