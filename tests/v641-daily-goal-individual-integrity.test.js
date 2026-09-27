"use strict";

// V641 — "Uma ação sobre uma meta individual não pode alterar nenhuma outra meta."
//
// Defeito reproduzido em 27/09/2026 (site servido de docs/, dados de teste): com 4 metas
// escolhidas no dia, salvar 1 meta pelo formulário deixava o dia com 10. O envio chamava
// reconcileDailyGoalsWithPlanning; a V610 conta como automáticas só as de origem
// "planejamento", encontrava 0 de 5 e acrescentava 5. Reagendar e concluir usavam o mesmo
// reconciliador. Estes testes fixam a separação entre operação individual e global.

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const script = fs.readFileSync("script.js", "utf8");
const guardSource = fs.readFileSync("daily-goal-individual-guard-v641.js", "utf8");
const manual = fs.readFileSync("manual-goal-additive-v379.js", "utf8");

function between(start, end) {
  const a = script.indexOf(start);
  const b = script.indexOf(end, a + start.length);
  assert.ok(a >= 0 && b > a, `trecho ausente: ${start}`);
  return script.slice(a, b);
}

const DAY = "2026-09-27";
const goal = (id, extra = {}) => ({
  id, date: DAY, data: DAY, discipline: `Disciplina ${id}`, subject: `Assunto ${id}`, syllabusItemId: `item-${id}`,
  origin: "escolha do usuário", status: "Pendente", priority: "Alta", minutes: 50, actualMinutes: 0,
  studyActualMinutes: 0, questionActualMinutes: 0, history: [{ at: "2026-09-27T08:00:00.000Z", text: "Assunto escolhido diretamente para 27/09/2026." }],
  completed: false, completedAt: null, userSelectedForDate: true, createdAt: "2026-09-27T08:00:00.000Z", updatedAt: "2026-09-27T08:00:00.000Z", ...extra
});
const ids = (list) => [...list].map((g) => g.id);
const snapshot = (goals, except = []) => JSON.stringify(goals.filter((g) => !except.includes(g.id)));

// --- Trava estrutural -------------------------------------------------------

function loadGuard(initialGoals) {
  const saves = [];
  const context = {
    console: { error() {}, warn() {}, log() {} },
    setTimeout, queueMicrotask, JSON, Date, Map, Set, WeakMap, String, Number, Math, Array, Object,
    state: { dailyGoals: initialGoals },
    todayISO: () => DAY,
    saveData() { saves.push(JSON.stringify(context.state.dailyGoals)); },
    render() {},
    showDailyGoalMessage() {}
  };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(guardSource, context);
  return { context, api: context.__ALDUS_DAILY_GOAL_INDIVIDUAL_GUARD_V641__, saves };
}

test("trava: operação individual que cria metas extras tem as criações desfeitas (cenários 4 e 12)", () => {
  const { context, api } = loadGuard(["A", "B", "C", "D"].map((id) => goal(id)));
  const before = snapshot(context.state.dailyGoals);
  api.run("teste", { maxAdds: 1, add: (g) => g.origin === "manual" }, () => {
    context.state.dailyGoals.push(goal("E", { origin: "manual" }));
    for (let i = 0; i < 5; i += 1) context.state.dailyGoals.push(goal(`auto${i}`, { origin: "planejamento" }));
  });
  assert.deepEqual(ids(context.state.dailyGoals), ["A", "B", "C", "D", "E"]);
  assert.equal(snapshot(context.state.dailyGoals, ["E"]), before);
  assert.equal(api.violations.at(-1).entries.filter((e) => e.type === "added").length, 5);
});

test("trava: alteração ou remoção de meta não alvo é desfeita e registrada (cenários 6 e 15)", () => {
  const { context, api } = loadGuard(["A", "B", "C", "D"].map((id) => goal(id)));
  const before = snapshot(context.state.dailyGoals, ["A"]);
  api.run("registrar tempo", { targets: ["A"] }, () => {
    const [a, b, c] = context.state.dailyGoals;
    a.actualMinutes = 30; a.studyActualMinutes = 30;
    b.status = "Reagendada"; b.date = b.data = "2026-09-28";
    context.state.dailyGoals = context.state.dailyGoals.filter((g) => g !== c);
  });
  assert.equal(context.state.dailyGoals.find((g) => g.id === "A").actualMinutes, 30);
  assert.equal(snapshot(context.state.dailyGoals.slice().sort((x, y) => x.id.localeCompare(y.id)), ["A"]), before);
  const types = [...api.violations.at(-1).entries].map((e) => e.type).sort();
  assert.deepEqual(types, ["modified", "removed"]);
});

test("trava: a verificação roda antes de cada saveData, então o estado errado nunca é persistido", () => {
  const { context, api, saves } = loadGuard(["A", "B"].map((id) => goal(id)));
  api.run("teste", { targets: ["A"] }, () => {
    context.state.dailyGoals.push(goal("intrusa", { origin: "planejamento" }));
    context.saveData();
  });
  assert.equal(saves.length, 1);
  assert.deepEqual(JSON.parse(saves[0]).map((g) => g.id), ["A", "B"]);
});

test("trava: criação com a mesma identidade semântica no mesmo dia é bloqueada mesmo com UUID diferente (cenário 11)", () => {
  const { context, api } = loadGuard([goal("A"), goal("B")]);
  api.run("adicionar", { maxAdds: 1, add: () => true }, () => {
    context.state.dailyGoals.push({ ...goal("A"), id: "outro-uuid", origin: "planejamento" });
  });
  assert.deepEqual(ids(context.state.dailyGoals), ["A", "B"]);
  assert.equal(api.violations.at(-1).entries[0].reason, "duplicidade semântica no mesmo dia");
});

test("trava: exclusão autorizada remove só o alvo (cenário 2)", () => {
  const { context, api } = loadGuard(["A", "B", "C", "D", "E"].map((id) => goal(id)));
  const before = snapshot(context.state.dailyGoals, ["C"]);
  api.run("excluir", { targets: ["C"], removableTargets: ["C"] }, () => {
    context.state.dailyGoals = context.state.dailyGoals.filter((g) => g.id !== "C");
  });
  assert.deepEqual(ids(context.state.dailyGoals), ["A", "B", "D", "E"]);
  assert.equal(snapshot(context.state.dailyGoals), before);
  assert.equal(api.violations.length, 0);
});

test("trava: fora de uma operação individual não interfere (operações globais explícitas)", () => {
  const { context, api } = loadGuard([goal("A")]);
  for (let i = 0; i < 5; i += 1) context.state.dailyGoals.push(goal(`auto${i}`, { origin: "planejamento" }));
  context.saveData();
  assert.equal(context.state.dailyGoals.length, 6);
  assert.equal(api.violations.length, 0);
  assert.equal(api.active, "");
});

test("trava: sem alvo identificável não abre escopo e nunca desfaz alteração legítima", () => {
  const { context, api } = loadGuard([goal("A"), goal("B")]);
  api.run("sem-alvo", null, () => { context.state.dailyGoals[1].status = "Concluída"; });
  assert.equal(context.state.dailyGoals[1].status, "Concluída");
  assert.equal(api.violations.length, 0);
});

// --- Exclusão individual (script.js) ----------------------------------------

function loadDelete(goals, answers = {}) {
  const calls = { save: 0, render: 0, sync: 0, reconcile: 0, messages: [] };
  const context = {
    state: { dailyGoals: goals, studies: [], questionLogs: [] },
    confirm: () => answers.confirm ?? true,
    prompt: () => ("prompt" in answers ? answers.prompt : "RETIRAR"),
    saveData: () => { calls.save += 1; },
    render: () => { calls.render += 1; },
    autoSyncAfterSave: () => { calls.sync += 1; },
    showDailyGoalMessage: (text) => calls.messages.push(text),
    reconcileDailyGoalsWithPlanning: () => { calls.reconcile += 1; },
    replenishMissingDailyPlanningGoalsV116: () => { calls.reconcile += 1; },
    appendGoalHistory: (g, text) => { (g.history ||= []).push({ at: "agora", text }); },
    canonical: (v) => String(v || "").normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase(),
    goalDateValue: (g) => String(g.date || g.data || "").slice(0, 10),
    goalTotalActualMinutes: (g) => Number(g.actualMinutes) || 0,
    isGoalDone: (g) => g.completed === true || g.status === "Concluída",
    isGoalInProgress: (g) => g.status === "Em andamento",
    planningItemKey: (g) => `${g.discipline}|${g.subject}`,
    formatDateBR: (d) => d
  };
  vm.createContext(context);
  vm.runInContext(between("function dailyPlanGoalsForDisplay(", "function planningDistributionProfileV77"), context);
  return { context, calls };
}

test("excluir meta sem execução: sai só ela, sem substituta, sem reconciliar (cenários 2, 3 e 8)", () => {
  const goals = ["A", "B", "C", "D", "E"].map((id) => goal(id));
  const { context, calls } = loadDelete(goals);
  const before = snapshot(goals, ["C"]);
  const report = context.deleteDailyGoalV641("C");
  assert.equal(report.code, "deleted");
  assert.deepEqual(ids(context.state.dailyGoals), ["A", "B", "D", "E"]);
  assert.equal(snapshot(context.state.dailyGoals), before);
  assert.equal(calls.reconcile, 0);
  assert.equal(calls.save, 1);
  assert.equal(calls.sync, 1);
});

test("excluir meta com tempo: padrão RETIRAR preserva registro, tempo e histórico (seção 11)", () => {
  const goals = [goal("A"), goal("B", { actualMinutes: 25, studyActualMinutes: 25, status: "Em andamento" })];
  const { context } = loadDelete(goals);
  const report = context.deleteDailyGoalV641("B");
  const b = context.state.dailyGoals.find((g) => g.id === "B");
  assert.equal(report.code, "removed-from-plan");
  assert.equal(b.actualMinutes, 25);
  assert.equal(b.status, "Em andamento");
  assert.equal(b.removedFromDailyPlanV641, true);
  assert.deepEqual(ids(context.dailyPlanGoalsForDisplay(context.state, DAY)), ["A"]);
});

test("excluir meta com tempo: APAGAR só com escolha expressa; cancelar não altera nada", () => {
  const withTime = () => [goal("A"), goal("B", { actualMinutes: 10 })];
  const cancelled = loadDelete(withTime(), { prompt: null });
  assert.equal(cancelled.context.deleteDailyGoalV641("B").code, "cancelled");
  assert.equal(cancelled.context.state.dailyGoals.length, 2);
  assert.equal(cancelled.calls.save, 0);
  const erased = loadDelete(withTime(), { prompt: "apagar" });
  assert.equal(erased.context.deleteDailyGoalV641("B").code, "deleted");
  assert.deepEqual(ids(erased.context.state.dailyGoals), ["A"]);
});

test("identidade semântica: mesma data + mesmo assunto do edital é a mesma meta, qualquer que seja o UUID", () => {
  const goals = [goal("A")];
  const { context } = loadDelete(goals);
  assert.ok(context.findSemanticDuplicateGoalV641(context.state, { ...goal("A"), id: "novo" }));
  assert.ok(context.findSemanticDuplicateGoalV641(context.state, { ...goal("A"), id: "novo", syllabusItemId: "" }));
  assert.equal(context.findSemanticDuplicateGoalV641(context.state, { ...goal("A"), id: "novo", date: "2026-09-28", data: "2026-09-28" }), null);
  assert.equal(context.findSemanticDuplicateGoalV641(context.state, goals[0], goals[0]), null);
});

// --- Contratos de origem -----------------------------------------------------

test("adicionar/editar pelo formulário não reconcilia, não completa cota e bloqueia duplicata (cenários 1, 4, 14)", () => {
  const handler = between('elements.goalForm.addEventListener("submit"', 'elements.cancelGoalEdit');
  assert.doesNotMatch(handler, /reconcileDailyGoalsWithPlanning\(/);
  assert.doesNotMatch(handler, /replenishMissingDailyPlanningGoals/);
  assert.doesNotMatch(handler, /markDailyPlanAlignmentV174\(/);
  assert.match(handler, /findSemanticDuplicateGoalV641\(state, payload, existing\)/);
  assert.doesNotMatch(manual, /addEventListener\("submit"/);
});

test("reagendar move só a meta: nenhum dos dois dias é reconciliado", () => {
  const postpone = between("function postponeGoal(goal)", "function registerGoalTime(");
  assert.doesNotMatch(postpone, /reconcileDailyGoalsWithPlanning\(/);
  assert.match(postpone, /findSemanticDuplicateGoalV641/);
});

test("concluir não gera metas substitutas (cenários 5 e 13)", () => {
  const replan = between("function replanFutureGoalsAfterCompletionV77", "function rebalanceFuturePlanningGoalsV77");
  assert.doesNotMatch(replan, /reconcilePlanningDates\(/);
  assert.match(replan, /added: \[\]/);
});

test("botão Excluir meta aparece em cada meta e usa a exclusão individual", () => {
  assert.match(script, /data-delete-goal="\$\{goal\.id\}">Excluir meta<\/button>/);
  assert.match(script, /deleteDailyGoalV641\(deleteButton\.dataset\.deleteGoal\)/);
  assert.match(script, /Nenhuma outra meta será adicionada, substituída ou alterada\./);
});

test("V641: módulo publicado em docs/ e carregado pelo observability", () => {
  assert.equal(fs.readFileSync("docs/daily-goal-individual-guard-v641.js", "utf8"), guardSource);
  const loader = fs.readFileSync("security-observability-v318.js", "utf8");
  assert.match(loader, /daily-goal-individual-guard-v641\.js\?v=20260927-daily-goal-individual-guard-v641/);
  assert.match(loader, /installManualGoalAdditiveV379\(\);\s*installDailyGoalIndividualGuardV641\(\);/);
  assert.equal(guardSource.includes("setInterval("), false);
  assert.equal(guardSource.includes("MutationObserver"), false);
});

// --- Sincronização: data planejada não é carimbo de revisão ------------------
//
// Dados reais de 25/09/2026: a peça "Representação por Prisão Temporária" de 28/09 foi
// antecipada para 25/09 duas vezes (11:54 e 12:05 UTC) e voltou para 28/09 com o histórico
// das duas antecipações. syncTimestamp usava `date` junto com updatedAt: a versão velha
// (date 28/09 → 28/09 00:00) vencia qualquer edição feita antes de 28/09.

function loadSyncCore() {
  const context = { cloneData: (v) => JSON.parse(JSON.stringify(v)), JSON, Date, Math, Number, String, Set, Map, Array, Object };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync("sync-integral-core.js", "utf8"), context);
  vm.runInContext(fs.readFileSync("sync-integral-deletions.js", "utf8").split("let syncDeletionSnapshot")[0].replace(/^const SYNC_TOMBSTONE_SCHEMA_VERSION[^\n]*\n/, "const SYNC_TOMBSTONE_SCHEMA_VERSION = 1;\n"), context);
  return context;
}

test("mesclagem: meta antecipada (28/09 → 25/09) não volta para 28/09 (cenários 7, 8 e 18)", () => {
  const ctx = loadSyncCore();
  const old = { id: "p", date: "2026-09-28", data: "2026-09-28", origin: "planejamento peça diária", status: "Pendente", history: [], updatedAt: "2026-09-25T10:00:00.000Z" };
  const moved = { ...old, date: "2026-09-25", data: "2026-09-25", origin: "escolha do usuário", userSelectedForDate: true, updatedAt: "2026-09-25T11:54:16.205Z", history: [{ at: "2026-09-25T11:54:16.205Z", text: "Assunto escolhido para 25/09/2026; antecipado de 28/09/2026." }] };
  for (const [a, b, prefer] of [[old, moved, "remote"], [moved, old, "local"], [old, moved, "local"], [moved, old, "remote"]]) {
    const merged = ctx.syncMergeRecord(a, b, prefer);
    assert.equal(merged.date, "2026-09-25");
    assert.equal(merged.origin, "escolha do usuário");
    assert.equal(merged.history.length, 1);
  }
});

test("mesclagem: registro sem nenhum carimbo ainda usa a data como último recurso", () => {
  const ctx = loadSyncCore();
  assert.equal(ctx.syncTimestamp({ date: "2026-09-25" }), Date.parse("2026-09-25"));
  assert.equal(ctx.syncTimestamp({ date: "2026-09-28", updatedAt: "2026-09-25T11:00:00.000Z" }), Date.parse("2026-09-25T11:00:00.000Z"));
});

test("Gerar (V610) não acrescenta ao dia um assunto que já está nele, mesmo concluído ou escolhido pelo usuário", () => {
  const source = fs.readFileSync("daily-plan-quota-v610.js", "utf8");
  assert.match(source, /if \(sameDaySubject\(s, d, g\)\) return false;/);
  assert.equal(fs.readFileSync("docs/daily-plan-quota-v610.js", "utf8"), source);
});
