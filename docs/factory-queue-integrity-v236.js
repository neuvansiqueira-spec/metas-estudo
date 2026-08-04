(() => {
  "use strict";

  const VERSION = "20260804-simulados-sem-fabrica-cache-unico-v236";
  const HOTFIX = "factory-queue-integrity-hotfix3";
  const FLAG = "__aldusFactoryQueueIntegrityV236";
  if (globalThis.__ALDUS_FACTORY_QUEUE_INTEGRITY_V236__) return;

  const canonical = (value) => String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().replace(/\s+/g, " ").toLocaleLowerCase("pt-BR");
  const first = (...values) => values.find((value) => String(value ?? "").trim()) || "";
  const itemOf = (entry = {}) => entry?.item && typeof entry.item === "object" ? entry.item : entry;
  const goalsOf = (entry = {}) => Array.isArray(entry?.goals) ? entry.goals.filter(Boolean) : (entry?.goal ? [entry.goal] : []);
  const unique = (values) => [...new Set((values || []).filter(Boolean))];

  function isSimulados(value) {
    const name = canonical(value);
    return name === "simulados"
      || name === "realizacao de simulado"
      || ["disciplina-operacional-simulados", "operacional-simulados", "operacional-simulados-realizacao"].includes(value);
  }

  function referencesSimulados(entry, seen = new WeakSet()) {
    if (!entry) return false;
    if (Array.isArray(entry)) return entry.some((value) => referencesSimulados(value, seen));
    if (typeof entry !== "object") return isSimulados(entry);
    if (seen.has(entry)) return false;
    seen.add(entry);
    if ([entry.id, entry.syllabusItemId, entry.studyOptionId, entry.subjectOptionId, entry.name, entry.nome, entry.discipline, entry.disciplina, entry.subject, entry.assunto, entry.tema].some(isSimulados)) return true;
    return [entry.item, entry.items, entry.goal, entry.goals, entry.entry, entry.entries].some((value) => referencesSimulados(value, seen));
  }

  function semanticKey(entry = {}) {
    const item = itemOf(entry);
    const goal = goalsOf(entry)[0] || {};
    const discipline = canonical(first(item.disciplina, item.discipline, entry.disciplina, entry.discipline, goal.disciplina, goal.discipline));
    const theme = canonical(first(item.tema, item.subject, item.assunto, item.title, item.titulo, entry.tema, entry.subject, entry.assunto, goal.baseSubject, goal.subject, goal.assunto));
    const subtopics = unique([...(entry.subtopics || []), ...(item.editalSubtemas || []), goal.subtopic, goal.subassunto].map(canonical)).sort().join("|");
    if (discipline || theme) return `${discipline}::${theme}::${subtopics}`;
    return first(item.id, entry.id) ? `id::${canonical(first(item.id, entry.id))}` : "";
  }

  const statusScore = { "pdf gerado": 90, aprovado: 80, "aguardando revisao": 70, "em producao": 60, "precisa refazer": 50, "atualizar depois": 40, "nao iniciado": 20, "nao se aplica": 10 };
  function score(entry = {}) {
    const item = itemOf(entry);
    let value = goalsOf(entry).length;
    Object.values(item.modules || {}).forEach((module) => {
      value += statusScore[canonical(module?.status || module)] || 0;
      if (module?.fileId || module?.driveFileId || module?.url || module?.link) value += 8;
    });
    if (item.destinationFolderUrl || item.pastaDestino || item.folderUrl) value += 5;
    return value;
  }

  function goalKey(goal = {}, index = 0) {
    return first(goal.id, goal.goalId, goal.syllabusItemId ? `${goal.syllabusItemId}|${goal.date || goal.data || ""}|${goal.type || goal.tipo || ""}` : "", `${canonical(goal.discipline || goal.disciplina)}|${canonical(goal.baseSubject || goal.subject || goal.assunto)}|${goal.date || goal.data || ""}|${goal.type || goal.tipo || ""}|${index}`);
  }

  function dedupeObjects(values, keyFactory) {
    const seen = new Set();
    return (values || []).filter((value, index) => {
      if (!value) return false;
      const key = keyFactory(value, index);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function merge(left, right) {
    const preferred = score(right) > score(left) ? right : left;
    const secondary = preferred === left ? right : left;
    const preferredItem = itemOf(preferred);
    const secondaryItem = itemOf(secondary);
    if (left?.item || right?.item) {
      return {
        ...secondary,
        ...preferred,
        item: preferredItem,
        goals: dedupeObjects([...goalsOf(left), ...goalsOf(right)], goalKey),
        subtopics: unique([...(left.subtopics || []), ...(right.subtopics || [])]).sort((a, b) => String(a).localeCompare(String(b), "pt-BR")),
        sortIndex: Math.min(Number.isFinite(+left.sortIndex) ? +left.sortIndex : Number.MAX_SAFE_INTEGER, Number.isFinite(+right.sortIndex) ? +right.sortIndex : Number.MAX_SAFE_INTEGER),
        duplicateFactoryItemIds: unique([preferredItem.id, secondaryItem.id, ...(left.duplicateFactoryItemIds || []), ...(right.duplicateFactoryItemIds || [])])
      };
    }
    const preferredLink = preferredItem.editalLink || {};
    const secondaryLink = secondaryItem.editalLink || {};
    return {
      ...secondaryItem,
      ...preferredItem,
      editalSubtemas: unique([...(secondaryItem.editalSubtemas || []), ...(preferredItem.editalSubtemas || [])]),
      editalLink: { ...secondaryLink, ...preferredLink, itemIds: unique([...(secondaryLink.itemIds || []), ...(preferredLink.itemIds || [])]), references: unique([...(secondaryLink.references || []), ...(preferredLink.references || [])]) },
      duplicateFactoryItemIds: unique([preferredItem.id, secondaryItem.id, ...(left.duplicateFactoryItemIds || []), ...(right.duplicateFactoryItemIds || [])])
    };
  }

  function sanitize(entries) {
    if (!Array.isArray(entries)) return entries;
    const output = [];
    const positions = new Map();
    entries.forEach((entry) => {
      if (!entry || referencesSimulados(entry)) return;
      const key = semanticKey(entry);
      if (!key || !positions.has(key)) {
        if (key) positions.set(key, output.length);
        output.push(entry);
      } else {
        const index = positions.get(key);
        output[index] = merge(output[index], entry);
      }
    });
    return output;
  }

  function chainHas(fn) {
    const seen = new Set();
    while (typeof fn === "function" && !seen.has(fn)) {
      if (fn[FLAG]) return true;
      seen.add(fn);
      fn = fn.__aldusOriginal;
    }
    return false;
  }

  function mark(wrapped, original) {
    Object.defineProperty(wrapped, FLAG, { value: true });
    Object.defineProperty(wrapped, "__aldusOriginal", { value: original });
    return wrapped;
  }

  function removeVisibleResidue() {
    const view = document.querySelector('#view-fabrica-resumos, [data-view="fabrica-resumos"]');
    if (!view) return;
    view.querySelectorAll("li, article, details, tr").forEach((node) => {
      const text = canonical(node.textContent);
      if (text.includes("disciplina: simulados") && /(material|produzir|pendente|resumo)/.test(text)) (node.closest("li") || node).remove();
    });
  }

  function install() {
    let changed = false;
    if (typeof exactFactoryGoalMatches === "function" && !chainHas(exactFactoryGoalMatches)) {
      const original = exactFactoryGoalMatches;
      exactFactoryGoalMatches = mark(function (goal, agenda, ...rest) {
        if (referencesSimulados(goal)) return { items: [], mode: HOTFIX };
        const result = original.call(this, goal, sanitize(agenda), ...rest);
        return result && typeof result === "object" ? { ...result, items: sanitize(result.items || []) } : result;
      }, original);
      changed = true;
    }
    if (typeof ensureFactoryAgenda === "function" && !chainHas(ensureFactoryAgenda)) {
      const original = ensureFactoryAgenda;
      ensureFactoryAgenda = mark(function (...args) { return sanitize(original.apply(this, args)); }, original);
      changed = true;
    }
    if (typeof factoryGoalGroupsForDate === "function" && !chainHas(factoryGoalGroupsForDate)) {
      const original = factoryGoalGroupsForDate;
      factoryGoalGroupsForDate = mark(function (...args) { if (Array.isArray(args[1])) args[1] = sanitize(args[1]); return sanitize(original.apply(this, args)); }, original);
      changed = true;
    }
    if (typeof factoryQueueForDate === "function" && !chainHas(factoryQueueForDate)) {
      const original = factoryQueueForDate;
      factoryQueueForDate = mark(function (...args) { if (Array.isArray(args[1])) args[1] = sanitize(args[1]); return sanitize(original.apply(this, args)); }, original);
      changed = true;
    }
    if (typeof factoryDoNowQueue === "function" && !chainHas(factoryDoNowQueue)) {
      const original = factoryDoNowQueue;
      factoryDoNowQueue = mark(function (...args) { if (Array.isArray(args[0])) args[0] = sanitize(args[0]); return sanitize(original.apply(this, args)); }, original);
      changed = true;
    }
    if (typeof factoryResumoAulaPending === "function" && !chainHas(factoryResumoAulaPending)) {
      const original = factoryResumoAulaPending;
      factoryResumoAulaPending = mark(function (entry, ...args) { return referencesSimulados(entry) ? false : original.call(this, entry, ...args); }, original);
      changed = true;
    }
    if (typeof renderFactory === "function" && !chainHas(renderFactory)) {
      const original = renderFactory;
      renderFactory = mark(function (...args) { const result = original.apply(this, args); removeVisibleResidue(); return result; }, original);
      changed = true;
    }
    return changed;
  }

  function redraw() {
    if (location.hash === "#fabrica-resumos" || document.querySelector('[data-view="fabrica-resumos"].active')) {
      try { renderFactory(); } catch (error) { console.warn("[Aldus V236] Falha ao redesenhar a Fábrica após a correção.", error); }
    }
  }

  if (install()) redraw();
  const timer = window.setInterval(() => { if (install()) redraw(); }, 100);
  window.setTimeout(() => window.clearInterval(timer), 15000);
  globalThis.__ALDUS_FACTORY_QUEUE_INTEGRITY_V236__ = Object.freeze({ version: VERSION, hotfix: HOTFIX, installedAt: new Date().toISOString(), referencesSimulados, semanticKey, sanitizeFactoryEntries: sanitize });
})();
