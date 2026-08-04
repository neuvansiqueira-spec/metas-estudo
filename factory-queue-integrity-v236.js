(() => {
  "use strict";

  const VERSION = "20260804-simulados-sem-fabrica-cache-unico-v236";
  const HOTFIX = "factory-queue-integrity-hotfix2";
  const GLOBAL_FLAG = "__ALDUS_FACTORY_QUEUE_INTEGRITY_V236__";

  if (globalThis[GLOBAL_FLAG]) return;

  function canonical(value) {
    return String(value ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .replace(/\s+/g, " ")
      .toLocaleLowerCase("pt-BR");
  }

  function firstValue(...values) {
    return values.find((value) => String(value ?? "").trim()) || "";
  }

  function entryItem(entry = {}) {
    return entry?.item && typeof entry.item === "object" ? entry.item : entry;
  }

  function entryGoals(entry = {}) {
    if (Array.isArray(entry?.goals)) return entry.goals.filter(Boolean);
    return entry?.goal ? [entry.goal] : [];
  }

  function isSimuladosName(value) {
    const normalized = canonical(value);
    return normalized === "simulados"
      || normalized === "realizacao de simulado"
      || value === "disciplina-operacional-simulados"
      || value === "operacional-simulados"
      || value === "operacional-simulados-realizacao";
  }

  function referencesSimulados(entry, seen = new WeakSet()) {
    if (!entry) return false;
    if (Array.isArray(entry)) return entry.some((value) => referencesSimulados(value, seen));
    if (typeof entry !== "object") return isSimuladosName(entry);
    if (seen.has(entry)) return false;
    seen.add(entry);

    if (
      isSimuladosName(entry.id)
      || isSimuladosName(entry.syllabusItemId)
      || isSimuladosName(entry.studyOptionId)
      || isSimuladosName(entry.subjectOptionId)
      || isSimuladosName(entry.name)
      || isSimuladosName(entry.nome)
      || isSimuladosName(entry.discipline)
      || isSimuladosName(entry.disciplina)
      || isSimuladosName(entry.subject)
      || isSimuladosName(entry.assunto)
      || isSimuladosName(entry.tema)
    ) return true;

    return [entry.item, entry.items, entry.goal, entry.goals, entry.entry, entry.entries]
      .some((value) => referencesSimulados(value, seen));
  }

  function sortedCanonical(values) {
    return [...new Set((Array.isArray(values) ? values : [values]).map(canonical).filter(Boolean))].sort();
  }

  function semanticKey(entry = {}) {
    const item = entryItem(entry);
    const goals = entryGoals(entry);
    const firstGoal = goals[0] || {};
    const discipline = canonical(firstValue(
      item.disciplina,
      item.discipline,
      entry.disciplina,
      entry.discipline,
      firstGoal.disciplina,
      firstGoal.discipline
    ));
    const theme = canonical(firstValue(
      item.tema,
      item.subject,
      item.assunto,
      item.title,
      item.titulo,
      entry.tema,
      entry.subject,
      entry.assunto,
      firstGoal.baseSubject,
      firstGoal.subject,
      firstGoal.assunto
    ));
    const subtopics = sortedCanonical([
      ...(Array.isArray(entry.subtopics) ? entry.subtopics : []),
      ...(Array.isArray(item.editalSubtemas) ? item.editalSubtemas : []),
      firstGoal.subtopic,
      firstGoal.subassunto
    ]).join("|");

    if (discipline || theme) return `${discipline}::${theme}::${subtopics}`;
    const id = firstValue(item.id, entry.id);
    return id ? `id::${canonical(id)}` : "";
  }

  const STATUS_SCORE = Object.freeze({
    "pdf gerado": 90,
    "aprovado": 80,
    "aguardando revisao": 70,
    "em producao": 60,
    "precisa refazer": 50,
    "atualizar depois": 40,
    "nao iniciado": 20,
    "nao se aplica": 10
  });

  function itemScore(entry = {}) {
    const item = entryItem(entry);
    const modules = item?.modules && typeof item.modules === "object" ? item.modules : {};
    let score = 0;
    Object.values(modules).forEach((module) => {
      const status = canonical(module?.status || module);
      score += STATUS_SCORE[status] || 0;
      if (module?.fileId || module?.driveFileId || module?.url || module?.link) score += 8;
    });
    if (item?.destinationFolderUrl || item?.pastaDestino || item?.folderUrl) score += 5;
    score += entryGoals(entry).length;
    return score;
  }

  function uniqueBy(values, keyFactory) {
    const result = [];
    const seen = new Set();
    (values || []).forEach((value, index) => {
      if (!value) return;
      const key = keyFactory(value, index);
      if (seen.has(key)) return;
      seen.add(key);
      result.push(value);
    });
    return result;
  }

  function goalKey(goal = {}, index = 0) {
    return firstValue(
      goal.id,
      goal.goalId,
      goal.syllabusItemId ? `${goal.syllabusItemId}|${goal.date || goal.data || ""}|${goal.type || goal.tipo || ""}` : "",
      `${canonical(goal.discipline || goal.disciplina)}|${canonical(goal.baseSubject || goal.subject || goal.assunto)}|${goal.date || goal.data || ""}|${goal.type || goal.tipo || ""}|${index}`
    );
  }

  function mergeFactoryEntries(left, right) {
    const preferred = itemScore(right) > itemScore(left) ? right : left;
    const secondary = preferred === left ? right : left;
    const preferredItem = entryItem(preferred);
    const secondaryItem = entryItem(secondary);
    const mergedGoals = uniqueBy([...entryGoals(left), ...entryGoals(right)], goalKey);
    const mergedSubtopics = [...new Set([
      ...(Array.isArray(left?.subtopics) ? left.subtopics : []),
      ...(Array.isArray(right?.subtopics) ? right.subtopics : [])
    ].filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b), "pt-BR"));

    if (left?.item || right?.item) {
      return {
        ...secondary,
        ...preferred,
        item: preferredItem,
        goals: mergedGoals,
        subtopics: mergedSubtopics,
        sortIndex: Math.min(
          Number.isFinite(Number(left?.sortIndex)) ? Number(left.sortIndex) : Number.MAX_SAFE_INTEGER,
          Number.isFinite(Number(right?.sortIndex)) ? Number(right.sortIndex) : Number.MAX_SAFE_INTEGER
        ),
        duplicateFactoryItemIds: uniqueBy(
          [preferredItem?.id, secondaryItem?.id, ...(left?.duplicateFactoryItemIds || []), ...(right?.duplicateFactoryItemIds || [])],
          (value) => String(value)
        )
      };
    }

    const preferredLink = preferredItem?.editalLink || {};
    const secondaryLink = secondaryItem?.editalLink || {};
    return {
      ...secondaryItem,
      ...preferredItem,
      editalSubtemas: [...new Set([
        ...(secondaryItem?.editalSubtemas || []),
        ...(preferredItem?.editalSubtemas || [])
      ].filter(Boolean))],
      editalLink: {
        ...secondaryLink,
        ...preferredLink,
        itemIds: [...new Set([
          ...(secondaryLink.itemIds || []),
          ...(preferredLink.itemIds || [])
        ].filter(Boolean))],
        references: [...new Set([
          ...(secondaryLink.references || []),
          ...(preferredLink.references || [])
        ].filter(Boolean))]
      },
      duplicateFactoryItemIds: uniqueBy(
        [preferredItem?.id, secondaryItem?.id, ...(left?.duplicateFactoryItemIds || []), ...(right?.duplicateFactoryItemIds || [])],
        (value) => String(value)
      )
    };
  }

  function sanitizeFactoryEntries(entries) {
    if (!Array.isArray(entries)) return entries;
    const output = [];
    const positions = new Map();
    entries.forEach((entry) => {
      if (!entry || referencesSimulados(entry)) return;
      const key = semanticKey(entry);
      if (!key || !positions.has(key)) {
        if (key) positions.set(key, output.length);
        output.push(entry);
        return;
      }
      const index = positions.get(key);
      output[index] = mergeFactoryEntries(output[index], entry);
    });
    return output;
  }

  function removeVisibleResidue() {
    const view = document.querySelector('#view-fabrica-resumos, [data-view="fabrica-resumos"]');
    if (!view) return;
    view.querySelectorAll("li, article, details, tr").forEach((node) => {
      const text = canonical(node.textContent);
      if (text.includes("disciplina: simulados") && /(material|produzir|pendente|resumo)/.test(text)) {
        const container = node.closest("li") || node;
        if (container !== view) container.remove();
      }
    });
  }

  function install() {
    let installed = false;

    if (typeof exactFactoryGoalMatches === "function" && !exactFactoryGoalMatches.__aldusFactoryQueueIntegrityV236) {
      const originalExactMatch = exactFactoryGoalMatches;
      exactFactoryGoalMatches = function exactFactoryGoalMatchesV236(goal, agenda, ...rest) {
        if (referencesSimulados(goal)) return { items: [], mode: HOTFIX };
        const result = originalExactMatch.call(this, goal, sanitizeFactoryEntries(agenda), ...rest);
        return result && typeof result === "object"
          ? { ...result, items: sanitizeFactoryEntries(result.items || []) }
          : result;
      };
      Object.defineProperty(exactFactoryGoalMatches, "__aldusFactoryQueueIntegrityV236", { value: true });
      Object.defineProperty(exactFactoryGoalMatches, "__aldusOriginal", { value: originalExactMatch });
      installed = true;
    }

    if (typeof ensureFactoryAgenda === "function" && !ensureFactoryAgenda.__aldusFactoryQueueIntegrityV236) {
      const originalEnsureAgenda = ensureFactoryAgenda;
      ensureFactoryAgenda = function ensureFactoryAgendaIntegrityV236(...args) {
        return sanitizeFactoryEntries(originalEnsureAgenda.apply(this, args));
      };
      Object.defineProperty(ensureFactoryAgenda, "__aldusFactoryQueueIntegrityV236", { value: true });
      Object.defineProperty(ensureFactoryAgenda, "__aldusOriginal", { value: originalEnsureAgenda });
      installed = true;
    }

    if (typeof factoryGoalGroupsForDate === "function" && !factoryGoalGroupsForDate.__aldusFactoryQueueIntegrityV236) {
      const originalGoalGroups = factoryGoalGroupsForDate;
      factoryGoalGroupsForDate = function factoryGoalGroupsForDateIntegrityV236(...args) {
        if (Array.isArray(args[1])) args[1] = sanitizeFactoryEntries(args[1]);
        return sanitizeFactoryEntries(originalGoalGroups.apply(this, args));
      };
      Object.defineProperty(factoryGoalGroupsForDate, "__aldusFactoryQueueIntegrityV236", { value: true });
      Object.defineProperty(factoryGoalGroupsForDate, "__aldusOriginal", { value: originalGoalGroups });
      installed = true;
    }

    if (typeof factoryQueueForDate === "function" && !factoryQueueForDate.__aldusFactoryQueueIntegrityV236) {
      const originalQueueForDate = factoryQueueForDate;
      factoryQueueForDate = function factoryQueueForDateIntegrityV236(...args) {
        if (Array.isArray(args[1])) args[1] = sanitizeFactoryEntries(args[1]);
        return sanitizeFactoryEntries(originalQueueForDate.apply(this, args));
      };
      Object.defineProperty(factoryQueueForDate, "__aldusFactoryQueueIntegrityV236", { value: true });
      Object.defineProperty(factoryQueueForDate, "__aldusOriginal", { value: originalQueueForDate });
      installed = true;
    }

    if (typeof factoryDoNowQueue === "function" && !factoryDoNowQueue.__aldusFactoryQueueIntegrityV236) {
      const originalDoNowQueue = factoryDoNowQueue;
      factoryDoNowQueue = function factoryDoNowQueueIntegrityV236(...args) {
        if (Array.isArray(args[0])) args[0] = sanitizeFactoryEntries(args[0]);
        return sanitizeFactoryEntries(originalDoNowQueue.apply(this, args));
      };
      Object.defineProperty(factoryDoNowQueue, "__aldusFactoryQueueIntegrityV236", { value: true });
      Object.defineProperty(factoryDoNowQueue, "__aldusOriginal", { value: originalDoNowQueue });
      installed = true;
    }

    if (typeof factoryResumoAulaPending === "function" && !factoryResumoAulaPending.__aldusFactoryQueueIntegrityV236) {
      const originalPending = factoryResumoAulaPending;
      factoryResumoAulaPending = function factoryResumoAulaPendingV236(entry, ...args) {
        if (referencesSimulados(entry)) return false;
        return originalPending.call(this, entry, ...args);
      };
      Object.defineProperty(factoryResumoAulaPending, "__aldusFactoryQueueIntegrityV236", { value: true });
      Object.defineProperty(factoryResumoAulaPending, "__aldusOriginal", { value: originalPending });
      installed = true;
    }

    if (typeof renderFactory === "function" && !renderFactory.__aldusFactoryQueueIntegrityV236) {
      const originalRender = renderFactory;
      renderFactory = function renderFactoryQueueIntegrityV236(...args) {
        const result = originalRender.apply(this, args);
        removeVisibleResidue();
        return result;
      };
      Object.defineProperty(renderFactory, "__aldusFactoryQueueIntegrityV236", { value: true });
      Object.defineProperty(renderFactory, "__aldusOriginal", { value: originalRender });
      installed = true;
    }

    return installed;
  }

  function redrawIfActive() {
    if (location.hash === "#fabrica-resumos" || document.querySelector('[data-view="fabrica-resumos"].active')) {
      try { renderFactory(); } catch (error) { console.warn("[Aldus V236] Não foi possível redesenhar a Fábrica após a correção.", error); }
    }
  }

  const initiallyInstalled = install();
  if (initiallyInstalled) redrawIfActive();
  const retryTimer = window.setInterval(() => {
    if (install()) {
      redrawIfActive();
    }
  }, 100);
  window.setTimeout(() => window.clearInterval(retryTimer), 15000);

  globalThis[GLOBAL_FLAG] = Object.freeze({
    version: VERSION,
    hotfix: HOTFIX,
    installedAt: new Date().toISOString(),
    referencesSimulados,
    semanticKey,
    sanitizeFactoryEntries
  });
})();
