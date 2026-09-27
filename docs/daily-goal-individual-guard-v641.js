(() => {
  "use strict";

  // V641 — Trava estrutural do Plano do Dia.
  //
  // Regra: UMA AÇÃO EXPLÍCITA DO USUÁRIO SOBRE UMA META INDIVIDUAL ALTERA SOMENTE AQUELA META.
  //
  // Defeito que motivou a trava (reproduzido em 27/09/2026 no site servido localmente):
  // com 4 metas escolhidas no dia, salvar 1 meta pelo formulário deixava o dia com 10.
  // O envio chamava reconcileDailyGoalsWithPlanning; a V610 conta como "automáticas"
  // só as de origem "planejamento", viu 0 de 5 e acrescentou 5. Reagendar e concluir
  // passavam pelo mesmo reconciliador. As causas foram corrigidas na origem (script.js
  // e manual-goal-additive-v379.js); esta trava impede que outra rotina volte a fazer isso.
  //
  // Funcionamento: cada operação individual (formulário de meta, escolha de assunto,
  // registrar tempo, status, reagendar, concluir, excluir) abre um escopo com a foto de
  // todas as metas. Antes de cada saveData e ao fim da operação, compara-se o estado com
  // a foto: qualquer meta criada, removida ou alterada fora do que a operação autoriza é
  // desfeita e registrada em __ALDUS_DAILY_GOAL_INDIVIDUAL_GUARD_V641__.violations.
  //
  // Depois de cada saveData a foto é refeita: normalizações da própria persistência
  // (lápides, totais do cronômetro) não são tratadas como efeito da operação.
  // Operações globais explícitas (Gerar, Atualizar conforme planejamento, Calendário,
  // redistribuição) não abrem escopo e continuam podendo alterar várias metas.

  const VERSION = "20260927-daily-goal-individual-guard-v641";
  const KEY = "__ALDUS_DAILY_GOAL_INDIVIDUAL_GUARD_V641__";
  const MARK = "__aldusIndividualGuardV641";
  const ORIGINAL = "__aldusIndividualGuardV641Original";
  const LINKS = [ORIGINAL, "__aldusPreviousGoalResumeOriginal", "__aldusManualGoalAdditiveOriginal", "__aldusOriginal", "__aldusV427Original"];
  const AUTOMATIC_ORIGINS = new Set(["planejamento", "edital verticalizado", "plano do dia"]);
  const MAX_VIOLATIONS = 50;
  if (globalThis[KEY]) return;

  let active = null;
  const violations = [];

  const canon = (value) => String(value || "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim().toLowerCase();
  const dateOf = (goal) => String(goal?.date || goal?.data || "").slice(0, 10);
  const baseSubject = (goal) => String(goal?.baseSubject || goal?.subject || goal?.assunto || "").replace(/\s+—\s+parte\s+\d+\/\d+\s*$/i, "");
  const semanticKey = (goal) => {
    const discipline = canon(goal?.discipline || goal?.disciplina);
    const subject = canon(baseSubject(goal));
    return discipline && subject ? `${discipline}|${subject}` : "";
  };
  const sameSubject = (left, right) => {
    const a = String(left?.syllabusItemId || ""), b = String(right?.syllabusItemId || "");
    if (a && b && a === b) return true;
    const ka = semanticKey(left);
    return Boolean(ka) && ka === semanticKey(right);
  };
  const serialize = (value) => { try { return JSON.stringify(value); } catch { return `unserializable:${Math.random()}`; } };
  const clone = (value) => JSON.parse(serialize(value));
  const minutesOf = (goal) => Math.max(0, Number(goal?.actualMinutes) || (Number(goal?.studyActualMinutes) || 0) + (Number(goal?.questionActualMinutes) || 0));
  const isDone = (goal) => goal?.completed === true || ["concluida", "concluido"].includes(canon(goal?.status)) || canon(goal?.studyStatus) === "concluido";
  const removedFromPlan = (goal) => goal?.removedFromDailyPlanV641 === true;

  function appState() {
    try { if (typeof state !== "undefined" && state && typeof state === "object") return state; } catch {}
    return globalThis.state && typeof globalThis.state === "object" ? globalThis.state : null;
  }

  function todayDate() {
    try { if (typeof globalThis.todayISO === "function") return globalThis.todayISO(); } catch {}
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  }

  // Chave estável mesmo com ids repetidos (defeito conhecido de 16/09/2026): id#ocorrência.
  function keyed(list) {
    const seen = new Map();
    return (Array.isArray(list) ? list : []).map((goal) => {
      const id = String(goal?.id || "");
      const index = seen.get(id) || 0;
      seen.set(id, index + 1);
      return { key: `${id}#${index}`, goal };
    });
  }

  function takeSnapshot(targetState) {
    return new Map(keyed(targetState.dailyGoals).map(({ key, goal }) => [key, { json: serialize(goal), goal: clone(goal) }]));
  }

  // --- Autorizações por operação -------------------------------------------

  function emptyAllow() {
    return { targets: new Set(), removableTargets: new Set(), maxAdds: 0, addRules: [], removeRules: [], modifyRules: [] };
  }

  function mergeAllow(into, extra = {}) {
    (extra.targets || []).forEach((id) => id && into.targets.add(String(id)));
    (extra.removableTargets || []).forEach((id) => id && into.removableTargets.add(String(id)));
    into.maxAdds += Number(extra.maxAdds) || 0;
    if (extra.add) into.addRules.push(extra.add);
    if (extra.remove) into.removeRules.push(extra.remove);
    if (extra.modify) into.modifyRules.push(extra.modify);
    return into;
  }

  function canAdd(scope, goal) { return scope.addRules.some((rule) => { try { return rule(goal) === true; } catch { return false; } }); }
  function canRemove(scope, before) {
    if (scope.removableTargets.has(String(before?.id || ""))) return true;
    return scope.removeRules.some((rule) => { try { return rule(before) === true; } catch { return false; } });
  }
  function canModify(scope, goal, before) {
    if (scope.targets.has(String(goal?.id || ""))) return true;
    return scope.modifyRules.some((rule) => { try { return rule(goal, before) === true; } catch { return false; } });
  }

  // --- Verificação ----------------------------------------------------------

  function record(scope, entries) {
    if (!entries.length) return;
    const report = { at: new Date().toISOString(), operation: scope.name, entries };
    violations.push(report);
    if (violations.length > MAX_VIOLATIONS) violations.shift();
    console.error(`[Aldus V641] A operação individual "${scope.name}" tentou alterar outras metas; a alteração foi desfeita.`, report);
    try {
      if (typeof globalThis.showDailyGoalMessage === "function") {
        globalThis.showDailyGoalMessage(`Proteção do Plano do Dia: uma rotina tentou alterar ${entries.length} meta(s) além da escolhida; a alteração foi desfeita.`, "warning");
      }
    } catch {}
  }

  function describe(goal, type, reason = "") {
    return { type, reason, id: goal?.id || "", date: dateOf(goal), discipline: goal?.discipline || goal?.disciplina || "", subject: goal?.subject || goal?.assunto || "", origin: goal?.origin || goal?.origem || "" };
  }

  function enforce(scope, phase) {
    const targetState = scope.state;
    if (!targetState || !Array.isArray(targetState.dailyGoals)) return 0;
    const current = keyed(targetState.dailyGoals);
    const currentKeys = new Set(current.map(({ key }) => key));
    const result = [];
    const entries = [];
    let adds = 0;

    current.forEach(({ key, goal }) => {
      const before = scope.snapshot.get(key);
      if (!before) {
        const duplicate = result.concat(current.map((entry) => entry.goal))
          .find((other) => other !== goal && !removedFromPlan(other) && dateOf(other) === dateOf(goal) && sameSubject(other, goal));
        if (adds >= scope.allow.maxAdds || !canAdd(scope.allow, goal)) { entries.push(describe(goal, "added", "criação não autorizada")); return; }
        if (duplicate && !removedFromPlan(goal)) { entries.push(describe(goal, "added", "duplicidade semântica no mesmo dia")); return; }
        adds += 1;
        result.push(goal);
        return;
      }
      if (serialize(goal) === before.json || canModify(scope.allow, goal, before.goal)) { result.push(goal); return; }
      entries.push(describe(before.goal, "modified", "alteração não autorizada"));
      result.push(clone(before.goal));
    });

    scope.snapshot.forEach((before, key) => {
      if (currentKeys.has(key) || canRemove(scope.allow, before.goal)) return;
      entries.push(describe(before.goal, "removed", "remoção não autorizada"));
      result.push(clone(before.goal));
    });

    if (entries.length) {
      targetState.dailyGoals = result;
      scope.corrected = true;
      record(scope, entries.map((entry) => ({ ...entry, phase })));
    }
    return entries.length;
  }

  // --- Escopo ---------------------------------------------------------------

  function begin(name, allow = {}) {
    const targetState = appState();
    if (!targetState || !Array.isArray(targetState.dailyGoals)) return null;
    if (active) {
      active.depth += 1;
      mergeAllow(active.allow, allow);
      return active;
    }
    active = { name, depth: 1, state: targetState, allow: mergeAllow(emptyAllow(), allow), snapshot: takeSnapshot(targetState), corrected: false, closed: false };
    return active;
  }

  function end(scope) {
    if (!scope || scope !== active) return;
    scope.depth -= 1;
    if (scope.depth > 0) return;
    const corrected = enforce(scope, "end") > 0;
    active = null;
    scope.closed = true;
    if (corrected) {
      try { if (typeof globalThis.saveData === "function") globalThis.saveData({ markLocalChange: true, reason: "daily-goal-individual-guard-v641" }); } catch {}
      try { if (typeof globalThis.render === "function") globalThis.render(); } catch {}
    }
  }

  function run(name, allow, operation, receiver, args) {
    // Sem alvo identificável não há como separar "a meta escolhida" das demais: não abre escopo
    // (nunca desfazer uma alteração legítima por falta de informação).
    if (!allow) return operation.apply(receiver, args);
    const scope = begin(name, allow);
    try {
      return operation.apply(receiver, args);
    } finally {
      end(scope);
    }
  }

  // --- Regras das operações -------------------------------------------------

  function resumedFrom(goalId) {
    return { targets: [goalId], maxAdds: 1, add: (goal) => String(goal?.resumedFromGoalId || "") === String(goalId || "") };
  }

  // O modal chama confirmGoalCompletion() sem argumento; o id fica no `let` global do script.js,
  // visível por identificador simples para os demais scripts clássicos.
  function activeCompletionGoalId() {
    try { return typeof goalCompletionActiveGoalId !== "undefined" ? goalCompletionActiveGoalId : ""; } catch { return ""; }
  }

  function completionAllow(goalId) {
    const targetState = appState();
    const target = (targetState?.dailyGoals || []).find((goal) => String(goal?.id || "") === String(goalId || ""));
    if (!target) return null;
    const today = todayDate();
    return {
      targets: [goalId],
      // Continuação da sessão (assunto ainda em andamento): mesma matéria, data futura, pendente.
      maxAdds: 1,
      add: (goal) => sameSubject(goal, target) && dateOf(goal) > dateOf(target) && !isDone(goal),
      // Cópias automáticas intocadas do mesmo assunto, de hoje em diante (limpeza da conclusão).
      remove: (before) => sameSubject(before, target)
        && dateOf(before) >= today
        && AUTOMATIC_ORIGINS.has(canon(before?.origin || before?.origem || "manual"))
        && !isDone(before)
        && minutesOf(before) <= 0
        && ["", "pendente"].includes(canon(before?.status || "Pendente"))
    };
  }

  function formAllow(form) {
    if (form?.id === "goalForm") {
      const editingId = String(document.getElementById("goalEditingId")?.value || "");
      const date = String(document.getElementById("goalDate")?.value || "").slice(0, 10) || todayDate();
      return editingId
        ? { targets: [editingId] }
        : { maxAdds: 1, add: (goal) => dateOf(goal) === date };
    }
    if (form?.id === "chooseSubjectForDayForm") {
      const itemId = String(document.getElementById("chooseSubjectForDayItem")?.value || "");
      const replacementId = String(document.getElementById("chooseSubjectReplacementGoal")?.value || "");
      return {
        targets: replacementId ? [replacementId] : [],
        maxAdds: 1,
        add: (goal) => String(goal?.syllabusItemId || "") === itemId,
        // Antecipação: a meta futura do mesmo assunto é trazida para a data escolhida.
        modify: (goal, before) => Boolean(itemId) && String(before?.syllabusItemId || "") === itemId
      };
    }
    return null;
  }

  // --- Instalação -----------------------------------------------------------

  function chainHas(fn) {
    let current = fn;
    for (let depth = 0; current && depth < 20; depth += 1) {
      if (current[MARK] === VERSION) return true;
      current = LINKS.map((link) => current[link]).find((next) => typeof next === "function");
    }
    return false;
  }

  function wrapGlobal(name, allowFor) {
    const original = globalThis[name];
    if (typeof original !== "function" || chainHas(original)) return typeof original === "function";
    const wrapped = function (...args) { return run(name, allowFor(...args), original, this, args); };
    Object.defineProperty(wrapped, MARK, { value: VERSION });
    Object.defineProperty(wrapped, ORIGINAL, { value: original });
    globalThis[name] = wrapped;
    return true;
  }

  function wrapSave() {
    const original = globalThis.saveData;
    if (typeof original !== "function" || chainHas(original)) return typeof original === "function";
    const wrapped = function (...args) {
      if (!active) return original.apply(this, args);
      enforce(active, "save");
      const result = original.apply(this, args);
      if (active) active.snapshot = takeSnapshot(active.state);
      return result;
    };
    Object.defineProperty(wrapped, MARK, { value: VERSION });
    Object.defineProperty(wrapped, ORIGINAL, { value: original });
    globalThis.saveData = wrapped;
    return true;
  }

  function install() {
    return {
      save: wrapSave(),
      registerGoalTime: wrapGlobal("registerGoalTime", (goal) => resumedFrom(goal?.id)),
      postponeGoal: wrapGlobal("postponeGoal", (goal) => ({ targets: [goal?.id] })),
      confirmGoalCompletion: wrapGlobal("confirmGoalCompletion", (goalId) => completionAllow(goalId ?? activeCompletionGoalId())),
      deleteDailyGoalV641: wrapGlobal("deleteDailyGoalV641", (goalId) => ({ targets: [goalId], removableTargets: [goalId] }))
    };
  }

  // Formulários: o manipulador do site é síncrono, então o escopo abre na captura
  // e fecha na propagação de volta. O setTimeout cobre envio interrompido por
  // outra proteção (ex.: bloqueio de reenvio em 800 ms), para o escopo nunca ficar aberto.
  function installFormScopes() {
    if (typeof document === "undefined") return;
    const scopes = new WeakMap();
    document.addEventListener("submit", (event) => {
      const allow = formAllow(event.target);
      if (!allow) return;
      install();
      const scope = begin(`form:${event.target.id}`, allow);
      if (!scope) return;
      scopes.set(event, scope);
      setTimeout(() => { if (!scope.closed && active === scope) { scope.depth = 1; end(scope); } }, 0);
    }, true);
    document.addEventListener("submit", (event) => {
      const scope = scopes.get(event);
      if (scope && !scope.closed) end(scope);
    }, false);

    // Botões de ação da meta (status, tempo, reagendar, excluir) no Plano do Dia.
    const clickScopes = new WeakMap();
    document.addEventListener("click", (event) => {
      const button = event.target?.closest?.("button[data-goal-action], button[data-delete-goal]");
      if (!button || !button.closest("#dailyGoalsList, #nextDailyGoal")) return;
      if (button.dataset.goalAction === "Concluída") return; // só abre o modal; a conclusão é guardada na confirmação
      const goalId = button.dataset.deleteGoal || button.dataset.id || "";
      install();
      const allow = button.dataset.deleteGoal ? { targets: [goalId], removableTargets: [goalId] } : resumedFrom(goalId);
      const scope = begin(`click:${button.dataset.deleteGoal ? "excluir" : button.dataset.goalAction}`, allow);
      if (!scope) return;
      clickScopes.set(event, scope);
      setTimeout(() => { if (!scope.closed && active === scope) { scope.depth = 1; end(scope); } }, 0);
    }, true);
    document.addEventListener("click", (event) => {
      const scope = clickScopes.get(event);
      if (scope && !scope.closed) end(scope);
    }, false);
  }

  const api = Object.freeze({
    version: VERSION,
    install,
    run: (name, allow, operation) => run(name, allow, operation, null, []),
    begin,
    end,
    enforce: () => (active ? enforce(active, "manual") : 0),
    get active() { return active ? active.name : ""; },
    get violations() { return violations.map((entry) => ({ ...entry, entries: entry.entries.map((item) => ({ ...item })) })); },
    sameSubject
  });
  globalThis[KEY] = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;

  install();
  installFormScopes();
  if (typeof window !== "undefined") {
    for (const eventName of ["load", "aldus:bootstrap-ready", "aldus:post-bootstrap-maintenance-complete", "aldus:bootstrap-integrity-v258-ready"]) {
      window.addEventListener(eventName, () => { install(); queueMicrotask(install); }, { once: true });
    }
  }
})();
