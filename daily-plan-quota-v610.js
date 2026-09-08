(() => {
  "use strict";
  const VERSION = "20260908-plano-do-dia-v610";
  const KEY = "__ALDUS_DAILY_PLAN_QUOTA_V610__";
  const MARK = "__aldusDailyPlanQuotaV610";
  const START = "2026-09-08";
  if (globalThis[KEY]) return;
  let context = null, action = null;
  const canon = x => String(x || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
  const dateOf = g => String(g?.date || g?.data || "").slice(0, 10);
  const enabled = date => /^\d{4}-\d{2}-\d{2}$/.test(date || "") && date >= START;
  const pending = g => g?.completed !== true && !["concluida", "concluido", "ignorada", "ignorado", "nao cumprida", "nao cumprido", "adiada", "reagendada"].includes(canon(g?.status));
  const integer = x => (typeof x === "number" || typeof x === "string" && x.trim() !== "") && Number.isInteger(Number(x)) && Number(x) >= 0 ? Number(x) : null;
  const clone = x => JSON.parse(JSON.stringify(x));
  function appState() {
    try { if (typeof state !== "undefined" && state && typeof state === "object") return state; } catch {}
    return null;
  }
  const day = (s, d) => (s?.dailyGoals || []).filter(g => dateOf(g) === d);
  function piece(g, s) {
    if (g?.fixedDailyPieceV183 || canon(g?.origin || g?.origem) === "planejamento peca diaria") return true;
    return globalThis.__aldusDailyDelegatePieceGoalV183?.isDelegatePieceRecord?.(g, s) === true;
  }
  function automatic(g, s) {
    return !piece(g, s) && !g?.simulado3V605 && !g?.userSelectedForDate
      && ["planejamento", "edital verticalizado", "plano do dia"].includes(canon(g?.origin || g?.origem));
  }
  function limitFor(s) {
    // O formulario manda. Carimbos historicos so servem quando falta config valido.
    return integer(s?.planning?.config?.topicsPerDay)
      ?? integer(s?.planning?.manualGoalsConfigV235?.topics)
      ?? integer(globalThis.__ALDUS_PLANNING_STABILITY_V427__?.targetTopics) ?? 0;
  }
  function budget(s, d) {
    const limit = limitFor(s), before = day(s, d).filter(g => automatic(g, s) && pending(g)).length;
    return { date: d, limit, before, remaining: Math.max(0, limit - before) };
  }
  const key = g => g?.id ? `id:${g.id}` : JSON.stringify([dateOf(g), g?.syllabusItemId, g?.discipline, g?.subject, g?.type]);
  function additions(candidates, s, d, maximum = budget(s, d).remaining) {
    const seen = new Set(s.dailyGoals.map(key));
    let count = 0, hasPiece = day(s, d).some(g => piece(g, s) && !["ignorada", "ignorado", "nao cumprida"].includes(canon(g.status)));
    return candidates.filter(g => {
      if (!g || dateOf(g) !== d || seen.has(key(g))) return false;
      if (piece(g, s)) { if (hasPiece) return false; hasPiece = true; }
      else if (automatic(g, s) && pending(g)) { if (count >= maximum) return false; count++; }
      seen.add(key(g));
      return true;
    });
  }
  function ensurePiece(draft, d) {
    const api = globalThis.__aldusDailyDelegatePieceGoalV183;
    if (!api || day(draft, d).some(g => piece(g, draft) && !["ignorada", "ignorado", "nao cumprida"].includes(canon(g.status)))) return;
    const item = api.choosePieceItem(d, draft, day(draft, d));
    const goal = api.buildFixedPieceGoal(item, d, draft);
    if (goal) draft.dailyGoals.push(goal);
  }
  function reconcile(original, receiver, s, d, opts) {
    if (!s || !Array.isArray(s.dailyGoals) || !enabled(d)) return original.call(receiver, s, d, opts);
    const info = budget(s, d);
    // Toda normalizacao/remocao legada ocorre na copia. So novas metas voltam.
    const draft = { ...s, dailyGoals: clone(s.dailyGoals), planning: { ...s.planning, config: { ...s.planning?.config } }, migrations: clone(s.migrations || {}) };
    ensurePiece(draft, d);
    const previous = context;
    context = { original: s, draft, date: d };
    let result;
    try {
      result = original.call(receiver, draft, d, { ...opts, rebuildAutomatic: false,
        ...(opts.reservedSyllabusIds ? { reservedSyllabusIds: new Set(opts.reservedSyllabusIds) } : {}) }) || {};
    } finally { context = previous; }
    const added = additions(draft.dailyGoals, s, d, info.remaining);
    for (const g of added) {
      if (piece(g, s)) g.origin = g.origem = "planejamento peça diária";
      s.dailyGoals.push(g);
      if (opts.reservedSyllabusIds && g.syllabusItemId) opts.reservedSyllabusIds.add(String(g.syllabusItemId));
    }
    const addedAutomatic = added.filter(g => automatic(g, s) && pending(g)).length;
    const report = { ...result, date: d, expectedTopics: info.limit, foundTopics: info.before + addedAutomatic,
      added: added.map(g => g.id), removed: [], preserved: s.dailyGoals.filter(g => dateOf(g) === d && !added.includes(g)).map(g => g.id),
      warnings: [], quota: { ...info, added: addedAutomatic, after: info.before + addedAutomatic } };
    if (action?.date === d) action.report = report;
    return report;
  }
  function wrap(name, factory) {
    const original = globalThis[name];
    if (typeof original !== "function" || original[MARK]) return;
    const fn = factory(original);
    Object.defineProperty(fn, MARK, { value: true });
    globalThis[name] = fn;
  }
  function selectedDate() {
    try { if (typeof elements !== "undefined" && elements.goalDate?.value) return elements.goalDate.value; } catch {}
    return globalThis.document?.getElementById("goalDate")?.value || (typeof todayISO === "function" ? todayISO() : "");
  }
  function message(q) {
    return `Metas automáticas: limite ${q.limit}. Já havia ${q.before}; cabiam ${q.remaining}; entraram ${q.added}. A peça diária e as cotas de simulados são adicionais; metas manuais ficam fora desse limite. Metas existentes foram mantidas.`;
  }
  function install() {
    wrap("reconcileDailyGoalsWithPlanning", original => function(s = appState(), d = selectedDate(), opts = {}) { return reconcile(original, this, s, d, opts); });
    wrap("selectPlanningGoalsForTargets", original => function(args = {}) {
      if (!context || !enabled(args.date) || context.date !== args.date) return original.apply(this, arguments);
      const s = context.original, info = budget(s, args.date);
      const autos = day(s, args.date).filter(g => automatic(g, s) && pending(g));
      const pieces = day(context.draft, args.date).filter(g => piece(g, s)).slice(0, 1);
      if (!info.remaining) return { selected: [], foundTopics: info.before, foundDisciplines: new Set(autos.map(g => g.discipline)).size };
      // A V183 ve a peca existente; sua vaga extra nao reduz o alvo automatico.
      return original.call(this, { ...args, targetState: context.draft, existingGoals: [...autos, ...pieces],
        eligibleGoals: (args.eligibleGoals || []).filter(g => !piece(g, s)),
        topicTarget: info.limit + pieces.length, disciplineTarget: info.limit + pieces.length });
    });
    wrap("generateGoalsForDate", original => function(d, opts = {}) {
      const s = opts.targetState || appState();
      if (!s || !enabled(d)) return original.apply(this, arguments);
      const info = budget(s, d);
      const draft = { ...s, dailyGoals: clone(s.dailyGoals) };
      ensurePiece(draft, d);
      const createdPiece = additions(draft.dailyGoals, s, d).filter(g => piece(g, s));
      const generated = info.remaining ? original.call(this, d, { ...opts, targetState: draft, maxGoals: info.remaining, topicLimit: info.remaining }) || [] : [];
      return additions([...createdPiece, ...generated], s, d, info.remaining);
    });
    const api = globalThis.__aldusDailyDelegatePieceGoalV183;
    if (api && !api.quotaGuardV610) globalThis.__aldusDailyDelegatePieceGoalV183 = Object.freeze({ ...api, quotaGuardV610: true,
      ensureDailyPieceForDate(d, s = appState(), opts = {}) {
        if (!s || !enabled(d)) return api.ensureDailyPieceForDate(d, s, opts);
        const draft = { ...s, dailyGoals: clone(s.dailyGoals) };
        ensurePiece(draft, d);
        const added = additions(draft.dailyGoals, s, d).filter(g => piece(g, s));
        s.dailyGoals.push(...added);
        return { changed: !!added.length, date: d, added: added[0] || null, removed: null };
      }
    });
    wrap("showDailyGoalMessage", original => function(text, tone, ...rest) {
      return original.call(this, action?.report?.quota && tone !== "error" ? message(action.report.quota) : text, tone, ...rest);
    });
    for (const name of ["generateDailyGoals", "refreshDailyGoalsFromPlanning"]) wrap(name, original => function(...args) {
      const s = appState(), d = selectedDate();
      if (!s || !enabled(d)) return original.apply(this, args);
      const previous = action; action = { date: d };
      try {
        if (limitFor(s) === 0) {
          const report = globalThis.reconcileDailyGoalsWithPlanning(s, d, { explicit: true });
          if (report.added.length) { globalThis.saveData?.({ skipDerivedRefresh: true }); globalThis.render?.(); }
          globalThis.showDailyGoalMessage?.(message(report.quota), "info");
          return;
        }
        return original.apply(this, args);
      } finally { action = previous; }
    });
  }
  function click(event) {
    const button = event.target?.closest?.("#generateDailyGoals, #refreshDailyGoalsFromPlanning");
    if (!button || button.disabled || !enabled(selectedDate())) return;
    install();
    const fn = globalThis[button.id];
    if (!fn?.[MARK]) return;
    event.preventDefault(); event.stopImmediatePropagation(); fn.call(button, event);
  }
  globalThis[KEY] = Object.freeze({ version: VERSION, install, budget, automatic, pending });
  install();
  globalThis.document?.addEventListener("click", click, true);
  for (const event of ["aldus:bootstrap-ready", "aldus:post-bootstrap-maintenance-complete", "load"]) globalThis.window?.addEventListener(event, install, { once: true });
})();
