(() => {
  "use strict";

  const VERSION = "20260901-v426-weight-postcondition-repair";
  const API_KEY = "__ALDUS_DISCIPLINE_UNIFICATION_V426__";
  const INSTALL_KEY = "__ALDUS_V426_WEIGHT_REPAIR_INSTALLED__";
  const ATTEMPT_KEY = "aldus:v426:backup-confirmed-attempt";

  const STAGE_C_REMOVABLE = Object.freeze([
    "Direito Penal e Legislação Complementar",
    "Direito Administrativo e Legislação Complementar",
    "Direito Constitucional e Legislação Complementar",
    "Direito Civil e Legislação Complementar",
    "LEGISLAÇÃO ESPECÍFICA – DIREITOS HUMANOS",
    "LEGISLAÇÃO PENAL E LEGISLAÇÃO PROCESSUAL PENAL EXTRAVAGANTE",
    "LEGISLAÇÃO PENAL E PROCESSUAL PENAL ESPECIAL"
  ]);

  const OPERATIONAL_DISCIPLINES = new Set(["simulado", "simulados", "peca", "pecas"]);
  const clone = (value) => JSON.parse(JSON.stringify(value));
  const isObject = (value) => value && typeof value === "object" && !Array.isArray(value);
  const hasOwn = (object, key) => Object.prototype.hasOwnProperty.call(object || {}, key);

  function cleanText(value) {
    return String(value ?? "").replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
  }

  function canonical(value) {
    return cleanText(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  }

  function disciplineExists(state, name) {
    const wanted = cleanText(name);
    if (!wanted) return false;
    if (OPERATIONAL_DISCIPLINES.has(canonical(wanted))) return true;
    if ((Array.isArray(state?.syllabusItems) ? state.syllabusItems : []).some((item) => cleanText(item?.discipline) === wanted)) return true;
    return (Array.isArray(state?.dailyGoals) ? state.dailyGoals : []).some((goal) =>
      cleanText(goal?.discipline) === wanted || cleanText(goal?.disciplina) === wanted
    );
  }

  function numericWeight(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  }

  function restoreWeight(weights, name, hiddenValue) {
    if (!hasOwn(weights, name)) {
      weights[name] = hiddenValue;
      return;
    }
    const current = numericWeight(weights[name]);
    const hidden = numericWeight(hiddenValue);
    if (current !== null && hidden !== null) weights[name] = Math.max(current, hidden);
  }

  function stageCEmpty(state, name) {
    return !(Array.isArray(state?.syllabusItems) ? state.syllabusItems : []).some((item) => cleanText(item?.discipline) === name);
  }

  function replaceState(target, source) {
    for (const key of Object.keys(target)) delete target[key];
    Object.assign(target, source);
  }

  function stateFingerprint(state) {
    const text = JSON.stringify(state || {});
    let hash = 2166136261;
    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return `${text.length}:${(hash >>> 0).toString(16)}`;
  }

  function markBackupConfirmedAttempt(targetState, backup) {
    if (!backup?.confirmed || !cleanText(backup.fileName)) return;
    try {
      sessionStorage.setItem(ATTEMPT_KEY, JSON.stringify({
        repairVersion: VERSION,
        backupFileName: cleanText(backup.fileName),
        backupSavedAt: backup.savedAt || new Date().toISOString(),
        stateFingerprint: stateFingerprint(targetState),
        startedAt: new Date().toISOString()
      }));
    } catch {}
  }

  function buildTouchedSet(baseApi) {
    const touched = new Set(STAGE_C_REMOVABLE);
    for (const source of Array.isArray(baseApi?.splitOrigins) ? baseApi.splitOrigins : []) touched.add(cleanText(source));
    for (const [source, target] of Object.entries(isObject(baseApi?.wholeMerges) ? baseApi.wholeMerges : {})) {
      touched.add(cleanText(source));
      touched.add(cleanText(target));
    }
    for (const target of Object.values(isObject(baseApi?.destinations) ? baseApi.destinations : {})) touched.add(cleanText(target));
    return touched;
  }

  function amendReport(targetState, baseResult, details) {
    const migration = targetState?.migrations?.disciplineUnificationV426;
    const report = clone(baseResult?.report || migration?.report || {});
    report.weightValidation = {
      mode: "post-condition",
      existenceRule: "syllabusItems|dailyGoals|operational",
      stageCWeightsRemoved: details.stageCWeightsRemoved.slice(),
      legitimateNonSyllabusWeights: details.legitimateNonSyllabusWeights.slice(),
      unrelatedPreexistingOrphanWeights: details.unrelatedPreexistingOrphanWeights.slice(),
      touchedInvalidWeights: details.touchedInvalidWeights.slice()
    };
    report.preexistingOrphanWeightKeys = details.unrelatedPreexistingOrphanWeights.slice();
    report.legitimateNonSyllabusWeightKeys = details.legitimateNonSyllabusWeights.slice();
    report.stageCWeightKeysRemoved = details.stageCWeightsRemoved.slice();
    report.excludedDisciplines ||= [];
    for (const name of details.stageCWeightsRemoved) {
      if (!report.excludedDisciplines.includes(name)) report.excludedDisciplines.push(name);
    }
    if (Array.isArray(report.notEmptyDisciplines)) {
      report.notEmptyDisciplines = report.notEmptyDisciplines.filter((entry) => !details.stageCWeightsRemoved.includes(cleanText(entry?.name)));
    }
    if (migration) migration.report = clone(report);
    return report;
  }

  function install() {
    if (globalThis[INSTALL_KEY]) return true;
    const baseApi = globalThis[API_KEY];
    if (!baseApi || typeof baseApi.apply !== "function") return false;

    const originalApply = baseApi.apply;
    const touched = buildTouchedSet(baseApi);
    const sourceKeys = new Set([
      ...(Array.isArray(baseApi.splitOrigins) ? baseApi.splitOrigins : []),
      ...Object.keys(isObject(baseApi.wholeMerges) ? baseApi.wholeMerges : {})
    ].map(cleanText));

    function apply(targetState = {}, options = {}) {
      if (!isObject(targetState)) return originalApply(targetState, options);
      const backup = options?.backupConfirmation;
      markBackupConfirmedAttempt(targetState, backup);

      if (targetState?.migrations?.disciplineUnificationV426?.completed === true) {
        return originalApply(targetState, options);
      }

      const shadow = clone(targetState);
      shadow.disciplineWeights ||= {};
      const hiddenWeights = {};
      const syllabusNames = new Set((shadow.syllabusItems || []).map((item) => cleanText(item?.discipline)).filter(Boolean));

      // A validação antiga só conhece syllabusItems. Retiramos temporariamente as chaves
      // que ela classificaria incorretamente, sem alterar o estado real. Fontes que a
      // própria V426 precisa fundir permanecem visíveis para a Etapa D.
      for (const [name, value] of Object.entries(shadow.disciplineWeights)) {
        const cleanName = cleanText(name);
        if (syllabusNames.has(cleanName) || sourceKeys.has(cleanName)) continue;
        hiddenWeights[name] = value;
        delete shadow.disciplineWeights[name];
      }

      const result = originalApply(shadow, options);
      if (result?.blocked || result?.repeated) return result;

      shadow.disciplineWeights ||= {};
      const stageCWeightsRemoved = [];
      for (const [name, value] of Object.entries(hiddenWeights)) {
        const cleanName = cleanText(name);
        if (STAGE_C_REMOVABLE.includes(cleanName) && stageCEmpty(shadow, cleanName)) {
          delete shadow.disciplineWeights[name];
          stageCWeightsRemoved.push(cleanName);
          continue;
        }
        restoreWeight(shadow.disciplineWeights, name, value);
      }

      const invalid = Object.keys(shadow.disciplineWeights)
        .map(cleanText)
        .filter(Boolean)
        .filter((name) => !disciplineExists(shadow, name));
      const touchedInvalidWeights = invalid.filter((name) => touched.has(name));
      const unrelatedPreexistingOrphanWeights = invalid.filter((name) => !touched.has(name));
      const legitimateNonSyllabusWeights = Object.keys(shadow.disciplineWeights)
        .map(cleanText)
        .filter(Boolean)
        .filter((name) => !syllabusNames.has(name) && disciplineExists(shadow, name));

      // Pós-condição: somente inconsistências criadas/tocadas pela V426 bloqueiam.
      // Órfãs anteriores e alheias à migração ficam intactas e vão para o relatório.
      if (touchedInvalidWeights.length) {
        throw new Error(`V426: pós-condição de disciplineWeights falhou nas disciplinas tocadas: ${touchedInvalidWeights.join(", ")}`);
      }

      const report = amendReport(shadow, result, {
        stageCWeightsRemoved,
        legitimateNonSyllabusWeights,
        unrelatedPreexistingOrphanWeights,
        touchedInvalidWeights
      });
      replaceState(targetState, shadow);
      return { ...result, changed: true, blocked: false, report: clone(report) };
    }

    const repairedApi = Object.freeze({
      ...baseApi,
      version: `${baseApi.version || "v426"}+weight-repair`,
      apply,
      weightRepairVersion: VERSION,
      disciplineExists,
      stateFingerprint,
      attemptStorageKey: ATTEMPT_KEY
    });

    globalThis[API_KEY] = repairedApi;
    globalThis.applyDisciplineUnificationV426 = apply;
    globalThis[INSTALL_KEY] = true;
    if (typeof module !== "undefined" && module.exports) module.exports = repairedApi;
    console.info(`[Aldus ${VERSION}] Validação de disciplineWeights convertida em pós-condição.`);
    return true;
  }

  if (!install() && typeof document !== "undefined") {
    const baseScript = document.getElementById("aldusDisciplineUnificationV426");
    baseScript?.addEventListener("load", install, { once: true });
  }
})();