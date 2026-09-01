(() => {
  "use strict";

  const VERSION = "20260901-discipline-unification-v426";
  const MIGRATION_KEY = "disciplineUnificationV426";
  const API_KEY = "__ALDUS_DISCIPLINE_UNIFICATION_V426__";
  const WRAP_MARKER = "__aldusDisciplineUnificationV426Wrapped";

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
    ["7.210", DESTINATIONS.processualPenal],
    ["12.037", DESTINATIONS.processualPenal],
    ["10.446", DESTINATIONS.processualPenal],
    ["5.553", DESTINATIONS.processualPenal],
    ["8.429", "DIREITO ADMINISTRATIVO"],
    ["12.846", "DIREITO ADMINISTRATIVO"],
    ["12.318", "DIREITO CIVIL"]
  ]);

  const EXPLICIT_PENAL_LAWS = Object.freeze(["9.609", "9.610", "12.288", "6.001"]);

  const LIST_COLLECTIONS = Object.freeze([
    ["syllabusItems", ["discipline"]],
    ["dailyGoals", ["discipline", "disciplina"]],
    ["studies", ["discipline"]],
    ["materials", ["discipline"]],
    ["questionLogs", ["discipline", "disciplina"]],
    ["questionBank", ["discipline", "disciplina"]],
    ["questionErrorNotebook", ["discipline", "disciplina"]],
    ["factoryItems", ["disciplina"]],
    ["subjects", ["discipline"]]
  ]);

  const PROTECTED_LENGTHS = Object.freeze([
    "syllabusItems", "dailyGoals", "studies", "materials", "questionLogs",
    "questionBank", "questionBankSessions", "questionErrorNotebook", "simulados",
    "factoryItems", "subjects"
  ]);

  const clone = (value) => JSON.parse(JSON.stringify(value));
  const isObject = (value) => value && typeof value === "object" && !Array.isArray(value);
  const hasOwn = (object, key) => Object.prototype.hasOwnProperty.call(object || {}, key);

  function cleanText(value) {
    return String(value ?? "").replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
  }

  function recordText(record = {}) {
    return [record.subject, record.assunto, record.topic, record.topico, record.title, record.name, record.description]
      .map(cleanText)
      .filter(Boolean)
      .join(" | ");
  }

  function recordLabel(record = {}) {
    return cleanText(record.subject || record.assunto || record.topic || record.topico || record.title || record.name || record.id || "(sem assunto)");
  }

  function classifySplitRecord(record = {}) {
    const text = recordText(record);
    for (const [law, target] of SPECIFIC_LAW_RULES) {
      if (text.includes(law)) return { target, law, matched: true, explicitPenal: false };
    }
    for (const law of EXPLICIT_PENAL_LAWS) {
      if (text.includes(law)) return { target: DESTINATIONS.penal, law, matched: true, explicitPenal: true };
    }
    return { target: DESTINATIONS.penal, law: null, matched: false, explicitPenal: false };
  }

  function destinationHasWrongHyphen(name) {
    return Object.values(DESTINATIONS).includes(name) && name.includes(" - ");
  }

  function assertDestinationSpelling() {
    for (const name of Object.values(DESTINATIONS)) {
      if (name.includes(" - ") || !name.includes(" – ")) {
        throw new Error(`V426: nome-destino inválido; esperado travessão U+2013: ${name}`);
      }
    }
  }

  function rememberCount(report, collection, increment = 1) {
    report.collectionRewriteCounts[collection] = (report.collectionRewriteCounts[collection] || 0) + increment;
  }

  function buildSplitTargetMap(working, report) {
    const targetBySyllabusId = new Map();
    const items = Array.isArray(working.syllabusItems) ? working.syllabusItems : [];
    for (const item of items) {
      if (!SPLIT_ORIGINS.includes(item?.discipline)) continue;
      const from = item.discipline;
      const classification = classifySplitRecord(item);
      targetBySyllabusId.set(String(item.id || ""), classification.target);
      item.discipline = classification.target;
      rememberCount(report, "syllabusItems");
      const entry = {
        id: item.id || "",
        subject: recordLabel(item),
        from,
        to: classification.target,
        law: classification.law
      };
      report.stageAReassignments.push(entry);
      if (!classification.matched) report.stageAUnmatched.push(entry);
    }
    return targetBySyllabusId;
  }

  function resolveSplitTarget(record, targetBySyllabusId) {
    const syllabusId = String(record?.syllabusItemId || "");
    if (syllabusId && targetBySyllabusId.has(syllabusId)) return targetBySyllabusId.get(syllabusId);
    return classifySplitRecord(record).target;
  }

  function rewrittenDiscipline(value, record, targetBySyllabusId) {
    const name = cleanText(value);
    if (!name) return value;
    if (SPLIT_ORIGINS.includes(name)) return resolveSplitTarget(record, targetBySyllabusId);
    if (hasOwn(WHOLE_MERGES, name)) return WHOLE_MERGES[name];
    return value;
  }

  function rewriteRecordFields(record, fields, targetBySyllabusId) {
    if (!isObject(record)) return false;
    let changed = false;
    for (const field of fields) {
      if (!hasOwn(record, field)) continue;
      const before = record[field];
      const after = rewrittenDiscipline(before, record, targetBySyllabusId);
      if (after !== before) {
        record[field] = after;
        changed = true;
      }
    }
    return changed;
  }

  function rewriteCollections(working, targetBySyllabusId, report) {
    for (const [collection, fields] of LIST_COLLECTIONS) {
      const list = Array.isArray(working[collection]) ? working[collection] : [];
      for (const record of list) {
        if (collection === "syllabusItems" && !SPLIT_ORIGINS.includes(record?.discipline) && !hasOwn(WHOLE_MERGES, record?.discipline)) continue;
        if (rewriteRecordFields(record, fields, targetBySyllabusId)) rememberCount(report, collection);
      }
    }

    const sessions = Array.isArray(working.questionBankSessions) ? working.questionBankSessions : [];
    for (const session of sessions) {
      const items = Array.isArray(session?.items) ? session.items : [];
      for (const item of items) {
        if (rewriteRecordFields(item, ["disciplina"], targetBySyllabusId)) rememberCount(report, "questionBankSessions.items");
      }
    }

    const simulados = Array.isArray(working.simulados) ? working.simulados : [];
    for (const simulado of simulados) {
      const disciplines = Array.isArray(simulado?.disciplines) ? simulado.disciplines : [];
      for (const discipline of disciplines) {
        if (rewriteRecordFields(discipline, ["discipline"], targetBySyllabusId)) rememberCount(report, "simulados.disciplines");
      }
    }
  }

  function numericWeight(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  function mergeWeightKey(weights, source, target, report, scope = "disciplineWeights") {
    if (!isObject(weights) || !hasOwn(weights, source)) return false;
    const sourceRaw = weights[source];
    const targetRaw = hasOwn(weights, target) ? weights[target] : undefined;
    const sourceNumber = numericWeight(sourceRaw);
    const targetNumber = numericWeight(targetRaw);
    let finalValue;
    if (sourceNumber !== null && targetNumber !== null) finalValue = Math.max(sourceNumber, targetNumber);
    else if (sourceNumber !== null) finalValue = sourceNumber;
    else if (targetNumber !== null) finalValue = targetNumber;
    else finalValue = targetRaw !== undefined ? targetRaw : sourceRaw;
    weights[target] = finalValue;
    delete weights[source];
    report.weightMerges.push({
      scope,
      from: source,
      to: target,
      sourceWeight: sourceRaw,
      previousDestinationWeight: targetRaw ?? null,
      finalWeight: finalValue
    });
    rememberCount(report, scope);
    return true;
  }

  function rewriteWeightMap(weights, report, scope) {
    if (!isObject(weights)) return;
    for (const source of SPLIT_ORIGINS) mergeWeightKey(weights, source, DESTINATIONS.penal, report, scope);
    for (const [source, target] of Object.entries(WHOLE_MERGES)) mergeWeightKey(weights, source, target, report, scope);
  }

  function normalizePlanningProfiles(working, report) {
    const profiles = isObject(working.contestPlanningProfiles) ? working.contestPlanningProfiles : null;
    if (!profiles) return;
    const joint = profiles.joint;
    if (isObject(joint?.categories)) {
      const before = joint.categories.C;
      joint.categories.C = 0;
      if (before !== 0) {
        report.configChanges.push({ path: "contestPlanningProfiles.joint.categories.C", before, after: 0 });
      }
    }
  }

  function collectDisciplineNames(state) {
    const names = new Set();
    const add = (value) => {
      const name = cleanText(value);
      if (name) names.add(name);
    };
    for (const [collection, fields] of LIST_COLLECTIONS) {
      for (const record of Array.isArray(state?.[collection]) ? state[collection] : []) {
        for (const field of fields) add(record?.[field]);
      }
    }
    for (const session of Array.isArray(state?.questionBankSessions) ? state.questionBankSessions : []) {
      for (const item of Array.isArray(session?.items) ? session.items : []) add(item?.disciplina);
    }
    for (const simulado of Array.isArray(state?.simulados) ? state.simulados : []) {
      for (const item of Array.isArray(simulado?.disciplines) ? simulado.disciplines : []) add(item?.discipline);
    }
    for (const key of Object.keys(isObject(state?.disciplineWeights) ? state.disciplineWeights : {})) add(key);
    return names;
  }

  function countNamedReferences(state, name) {
    let count = 0;
    for (const [collection, fields] of LIST_COLLECTIONS) {
      for (const record of Array.isArray(state?.[collection]) ? state[collection] : []) {
        if (fields.some((field) => cleanText(record?.[field]) === name)) count += 1;
      }
    }
    for (const session of Array.isArray(state?.questionBankSessions) ? state.questionBankSessions : []) {
      for (const item of Array.isArray(session?.items) ? session.items : []) {
        if (cleanText(item?.disciplina) === name) count += 1;
      }
    }
    for (const simulado of Array.isArray(state?.simulados) ? state.simulados : []) {
      for (const item of Array.isArray(simulado?.disciplines) ? simulado.disciplines : []) {
        if (cleanText(item?.discipline) === name) count += 1;
      }
    }
    return count;
  }

  function removeEmptyDisciplines(working, report) {
    const syllabusItems = Array.isArray(working.syllabusItems) ? working.syllabusItems : [];
    working.disciplineWeights ||= {};
    for (const name of REMOVABLE_IF_EMPTY) {
      const syllabusCount = syllabusItems.filter((item) => cleanText(item?.discipline) === name).length;
      if (syllabusCount > 0) {
        report.notEmptyDisciplines.push({ name, syllabusItems: syllabusCount, otherReferences: countNamedReferences(working, name) - syllabusCount });
        continue;
      }
      const otherReferences = countNamedReferences(working, name);
      if (otherReferences > 0) {
        report.notEmptyDisciplines.push({ name, syllabusItems: 0, otherReferences });
        continue;
      }
      if (hasOwn(working.disciplineWeights, name)) {
        delete working.disciplineWeights[name];
        rememberCount(report, "disciplineWeights");
      }
      report.excludedDisciplines.push(name);
    }
  }

  function snapshotLengths(state) {
    return Object.fromEntries(PROTECTED_LENGTHS.map((key) => [key, Array.isArray(state?.[key]) ? state[key].length : 0]));
  }

  function assertLengthsUnchanged(before, after) {
    for (const key of PROTECTED_LENGTHS) {
      if (before[key] !== after[key]) throw new Error(`V426: coleção ${key} mudou de tamanho (${before[key]} -> ${after[key]}).`);
    }
  }

  function assertNoLegacyNamesRemain(state) {
    const names = collectDisciplineNames(state);
    const forbidden = [...SPLIT_ORIGINS, ...Object.keys(WHOLE_MERGES)];
    const remaining = forbidden.filter((name) => names.has(name));
    if (remaining.length) throw new Error(`V426: nomes antigos permaneceram após migração: ${remaining.join(", ")}`);
  }

  function assertWeightKeysExist(state) {
    const syllabusNames = new Set((Array.isArray(state?.syllabusItems) ? state.syllabusItems : []).map((item) => cleanText(item?.discipline)).filter(Boolean));
    const invalid = Object.keys(isObject(state?.disciplineWeights) ? state.disciplineWeights : {}).filter((name) => !syllabusNames.has(cleanText(name)));
    if (invalid.length) throw new Error(`V426: disciplineWeights contém disciplina inexistente: ${invalid.join(", ")}`);
  }

  function assertNoWrongDestinationHyphen(state) {
    for (const name of collectDisciplineNames(state)) {
      if (destinationHasWrongHyphen(name)) throw new Error(`V426: destino usa hífen em vez de travessão: ${name}`);
    }
  }

  function applyPlanningConfig(working, report) {
    working.planning ||= {};
    working.planning.config ||= {};
    const config = working.planning.config;
    const topicsBefore = config.topicsPerDay;
    config.topicsPerDay = 8;
    if (topicsBefore !== 8) report.configChanges.push({ path: "planning.config.topicsPerDay", before: topicsBefore ?? null, after: 8 });
    const disciplinesBefore = Number(config.disciplinesPerDay);
    if (!Number.isFinite(disciplinesBefore) || disciplinesBefore < 8) {
      const before = config.disciplinesPerDay;
      config.disciplinesPerDay = 8;
      report.configChanges.push({ path: "planning.config.disciplinesPerDay", before: before ?? null, after: 8 });
    }
  }

  function replaceState(target, source) {
    for (const key of Object.keys(target)) delete target[key];
    Object.assign(target, source);
  }

  function completedMigration(targetState) {
    return targetState?.migrations?.[MIGRATION_KEY]?.completed === true;
  }

  function applyDisciplineUnificationV426(targetState = {}, options = {}) {
    assertDestinationSpelling();
    if (!isObject(targetState)) return { changed: false, blocked: true, reason: "state-unavailable" };
    if (completedMigration(targetState)) {
      return {
        changed: false,
        blocked: false,
        repeated: true,
        report: clone(targetState.migrations[MIGRATION_KEY].report || {})
      };
    }

    const backup = options.backupConfirmation;
    if (!backup?.confirmed || !cleanText(backup.fileName)) {
      return { changed: false, blocked: true, reason: "backup-required" };
    }

    const beforeNames = collectDisciplineNames(targetState);
    const protectedBefore = snapshotLengths(targetState);
    const working = clone(targetState);
    const report = {
      version: VERSION,
      backup: {
        confirmed: true,
        fileName: cleanText(backup.fileName),
        savedAt: backup.savedAt || new Date().toISOString(),
        bytes: Number.isFinite(Number(backup.bytes)) ? Number(backup.bytes) : null
      },
      collectionRewriteCounts: {},
      stageAReassignments: [],
      stageAUnmatched: [],
      weightMerges: [],
      excludedDisciplines: [],
      notEmptyDisciplines: [],
      configChanges: [],
      distinctDisciplineNamesBefore: beforeNames.size,
      distinctDisciplineNamesAfter: null,
      destinationHyphenValidated: false
    };

    working.disciplineWeights ||= {};
    const targetBySyllabusId = buildSplitTargetMap(working, report);
    rewriteCollections(working, targetBySyllabusId, report);
    rewriteWeightMap(working.disciplineWeights, report, "disciplineWeights");
    normalizePlanningProfiles(working, report);
    removeEmptyDisciplines(working, report);
    applyPlanningConfig(working, report);

    const protectedAfter = snapshotLengths(working);
    assertLengthsUnchanged(protectedBefore, protectedAfter);
    assertNoLegacyNamesRemain(working);
    assertNoWrongDestinationHyphen(working);
    assertWeightKeysExist(working);

    report.distinctDisciplineNamesAfter = collectDisciplineNames(working).size;
    report.destinationHyphenValidated = true;
    working.migrations ||= {};
    working.migrations[MIGRATION_KEY] = {
      version: VERSION,
      executedAt: new Date().toISOString(),
      completed: true,
      backup: clone(report.backup),
      report: clone(report)
    };

    replaceState(targetState, working);
    return { changed: true, blocked: false, report: clone(report) };
  }

  function enforcePostMigrationPlanningProfile(targetState) {
    if (!completedMigration(targetState)) return false;
    const joint = targetState?.contestPlanningProfiles?.joint;
    if (!isObject(joint?.categories)) return false;
    joint.categories.C = 0;
    return true;
  }

  function installPcprCompatibilityWrapper() {
    try {
      const current = globalThis.applyPcprPcma2026Migration;
      if (typeof current !== "function" || current[WRAP_MARKER] === VERSION) return Boolean(current);
      const wrapped = function applyPcprPcma2026MigrationV426(...args) {
        const result = current.apply(this, args);
        const targetState = args[0];
        enforcePostMigrationPlanningProfile(targetState);
        return result;
      };
      Object.defineProperty(wrapped, WRAP_MARKER, { value: VERSION });
      Object.defineProperty(wrapped, "__aldusV426Original", { value: current });
      globalThis.applyPcprPcma2026Migration = wrapped;
      return true;
    } catch {
      return false;
    }
  }

  function reportText(report = {}) {
    const lines = [
      "V426 — Relatório de unificação de disciplinas",
      `Backup confirmado: ${report.backup?.fileName || "não informado"}`,
      `Nomes distintos: ${report.distinctDisciplineNamesBefore ?? "?"} → ${report.distinctDisciplineNamesAfter ?? "?"}`,
      `Travessão validado: ${report.destinationHyphenValidated ? "sim" : "não"}`,
      "",
      "Registros reescritos por coleção:"
    ];
    for (const [collection, count] of Object.entries(report.collectionRewriteCounts || {})) lines.push(`- ${collection}: ${count}`);
    lines.push("", "Etapa A — itens reatribuídos:");
    for (const item of report.stageAReassignments || []) lines.push(`- ${item.subject} → ${item.to}${item.law ? ` [${item.law}]` : ""}`);
    lines.push("", "Etapa A — sem regra específica (encaminhados para Penal):");
    if (!(report.stageAUnmatched || []).length) lines.push("- nenhum");
    else for (const item of report.stageAUnmatched) lines.push(`- ${item.subject}`);
    lines.push("", "Fusões de peso:");
    if (!(report.weightMerges || []).length) lines.push("- nenhuma");
    else for (const item of report.weightMerges) lines.push(`- [${item.scope}] ${item.from} (${String(item.sourceWeight)}) → ${item.to}; final ${String(item.finalWeight)}`);
    lines.push("", `Disciplinas excluídas: ${(report.excludedDisciplines || []).join("; ") || "nenhuma"}`);
    lines.push(`Deveriam estar vazias, mas não estavam: ${(report.notEmptyDisciplines || []).map((item) => `${item.name} (syllabus=${item.syllabusItems}, refs=${item.otherReferences})`).join("; ") || "nenhuma"}`);
    lines.push("", "Configurações:");
    for (const item of report.configChanges || []) lines.push(`- ${item.path}: ${String(item.before)} → ${String(item.after)}`);
    return lines.join("\n");
  }

  async function buildAndSaveBackup(targetState) {
    if (typeof globalThis.showSaveFilePicker !== "function") {
      throw new Error("Este navegador não permite confirmar a gravação do backup. Use Chrome/Edge desktop atualizado.");
    }
    const exportedAt = new Date().toISOString();
    let storageValue = "";
    try { storageValue = localStorage.getItem("metasConcursoData") || ""; } catch {}
    const envelope = {
      app: "Aldus Meta",
      schema: "discipline-unification-v426-pre-migration-backup",
      version: 1,
      storageKey: "metasConcursoData",
      exportedAt,
      data: clone(targetState),
      localStorage: { metasConcursoData: storageValue || JSON.stringify(targetState) }
    };
    const payload = JSON.stringify(envelope, null, 2);
    const timestamp = exportedAt.replace(/[:.]/g, "-");
    const suggestedName = `backup-metas-estudo-v426-${timestamp}.json`;
    const handle = await globalThis.showSaveFilePicker({
      suggestedName,
      types: [{ description: "Backup JSON Aldus Meta", accept: { "application/json": [".json"] } }]
    });
    const writable = await handle.createWritable();
    try {
      await writable.write(payload);
      await writable.close();
    } catch (error) {
      try { await writable.abort?.(); } catch {}
      throw error;
    }
    const savedFile = await handle.getFile();
    const expectedBytes = new Blob([payload]).size;
    if (savedFile.size !== expectedBytes) {
      throw new Error(`Backup incompleto: esperado ${expectedBytes} bytes, gravado ${savedFile.size}.`);
    }
    return {
      confirmed: true,
      fileName: savedFile.name || handle.name || suggestedName,
      savedAt: new Date().toISOString(),
      bytes: savedFile.size
    };
  }

  function createPanel() {
    if (typeof document === "undefined" || document.getElementById("aldusV426MigrationPanel")) return null;
    const panel = document.createElement("section");
    panel.id = "aldusV426MigrationPanel";
    panel.setAttribute("role", "status");
    panel.style.cssText = "position:fixed;right:16px;bottom:16px;z-index:2147483000;width:min(520px,calc(100vw - 32px));max-height:72vh;overflow:auto;background:#fff;border:1px solid #c9c3b8;border-radius:12px;box-shadow:0 12px 36px rgba(0,0,0,.22);padding:16px;font:14px/1.45 Arial,sans-serif;color:#181818";
    panel.innerHTML = '<strong style="display:block;font-size:16px;margin-bottom:8px">V426 — unificação de disciplinas</strong><p style="margin:0 0 12px">Antes de alterar qualquer dado, o Aldus Meta precisa gravar e verificar um backup JSON completo.</p><button type="button" data-v426-apply style="border:0;border-radius:8px;padding:10px 14px;font-weight:700;cursor:pointer">Salvar backup e aplicar V426</button><div data-v426-status style="margin-top:10px"></div>';
    document.body.appendChild(panel);
    return panel;
  }

  function armBrowserMigration() {
    try {
      if (typeof state === "undefined" || !isObject(state)) return false;
      installPcprCompatibilityWrapper();
      if (completedMigration(state)) {
        enforcePostMigrationPlanningProfile(state);
        return true;
      }
      const panel = createPanel();
      if (!panel) return false;
      const button = panel.querySelector("[data-v426-apply]");
      const status = panel.querySelector("[data-v426-status]");
      button?.addEventListener("click", async () => {
        button.disabled = true;
        status.textContent = "Gravando e verificando o backup…";
        try {
          const backupConfirmation = await buildAndSaveBackup(state);
          if (typeof saveData !== "function") throw new Error("Função de persistência indisponível; a migração não foi iniciada.");
          const beforeMigration = clone(state);
          const result = applyDisciplineUnificationV426(state, { backupConfirmation });
          if (result.blocked) throw new Error(result.reason || "Migração bloqueada.");
          installPcprCompatibilityWrapper();
          enforcePostMigrationPlanningProfile(state);
          try {
            saveData();
          } catch (saveError) {
            replaceState(state, beforeMigration);
            throw new Error(`Falha ao persistir a V426; estado em memória restaurado. ${saveError?.message || String(saveError)}`);
          }
          const text = reportText(result.report);
          status.innerHTML = '<strong>V426 aplicada com backup confirmado.</strong><pre data-v426-report style="white-space:pre-wrap;max-height:42vh;overflow:auto;background:#f7f5f1;padding:10px;border-radius:8px"></pre><button type="button" data-v426-copy style="margin-top:8px">Copiar relatório</button>';
          status.querySelector("[data-v426-report]").textContent = text;
          status.querySelector("[data-v426-copy]")?.addEventListener("click", async () => {
            try { await navigator.clipboard.writeText(text); } catch {}
          });
          console.info("[Aldus V426] Migração concluída", result.report);
          try { window.dispatchEvent(new CustomEvent("aldus:discipline-unification-v426-complete", { detail: clone(result.report) })); } catch {}
        } catch (error) {
          const cancelled = error?.name === "AbortError";
          status.textContent = cancelled
            ? "Backup cancelado. Nenhum dado da V426 foi alterado."
            : `V426 não aplicada: ${error?.message || String(error)} Nenhum dado da V426 será alterado sem backup confirmado.`;
          button.disabled = false;
        }
      });
      return true;
    } catch {
      return false;
    }
  }

  const api = Object.freeze({
    version: VERSION,
    migrationKey: MIGRATION_KEY,
    destinations: DESTINATIONS,
    splitOrigins: SPLIT_ORIGINS,
    wholeMerges: WHOLE_MERGES,
    apply: applyDisciplineUnificationV426,
    reportText,
    enforcePostMigrationPlanningProfile,
    installPcprCompatibilityWrapper,
    armBrowserMigration
  });

  globalThis[API_KEY] = api;
  globalThis.applyDisciplineUnificationV426 = applyDisciplineUnificationV426;

  if (typeof module !== "undefined" && module.exports) module.exports = api;

  if (typeof window !== "undefined") {
    window.addEventListener("aldus:bootstrap-ready", armBrowserMigration, { once: true });
    window.addEventListener("aldus:post-bootstrap-maintenance-complete", armBrowserMigration, { once: true });
    window.addEventListener("load", armBrowserMigration, { once: true });
  }
})();
