const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const script = read("script.js");

function sourceBetween(start, end) {
  const from = script.indexOf(start);
  const to = script.indexOf(end, from + start.length);
  assert.notEqual(from, -1, `Marcador inicial ausente: ${start}`);
  assert.notEqual(to, -1, `Marcador final ausente: ${end}`);
  return script.slice(from, to);
}

function monthlyContext(targetTopics = 28, replaceableCount = 25, candidateCount = 50) {
  let candidateIndex = 0;
  const candidates = Array.from({ length: candidateCount }, (_, index) => ({ id: `new-${index}`, syllabusItemId: `s-${index}`, discipline: `D${index}`, subject: `A${index}`, date: "", status: "Pendente" }));
  const context = {
    state: {},
    todayISO: () => "2026-07-20",
    parseDate: (value) => new Date(`${value}T12:00:00Z`),
    addDays: (date, days) => {
      const value = new Date(`${date}T12:00:00Z`);
      value.setUTCDate(value.getUTCDate() + days);
      return value.toISOString().slice(0, 10);
    },
    daysBetween: (start, count) => Array.from({ length: count }, (_, index) => context.addDays(start, index)),
    goalDateValue: (goal) => goal.date,
    isPlanningStudyGoal: () => true,
    isManualDailyGoal: () => false,
    isAutomaticIntactDailyGoal: (goal) => goal.status !== "Concluída",
    planningConfig: () => ({ disciplinesPerMonth: 10 }),
    monthlyPlanningTarget: () => ({ topics: targetTopics }),
    planningTargetsForDate: () => ({ topics: 3, disciplines: 2 }),
    buildPlanningScoreContext: () => ({ scores: new Map() }),
    reserveGeneratedSyllabus: (set, goals) => goals.forEach((goal) => set.add(goal.syllabusItemId || goal.id)),
    eligiblePlanningGoalsForDate: (date) => candidateIndex < candidates.length ? [{ ...candidates[candidateIndex++], date }] : [],
    selectPlanningGoalsForTargets: ({ eligibleGoals }) => ({ selected: eligibleGoals.slice(0, 1) }),
    canonical: (value) => String(value || "").toLowerCase(),
    goalSyllabusReservationKey: (goal) => goal.syllabusItemId || goal.id,
  };
  vm.createContext(context);
  vm.runInContext(sourceBetween("function balancedWeeklyDateSlotsV78", "function buildBalancedWeekGenerationV78"), context);
  vm.runInContext(sourceBetween("function buildBalancedMonthGenerationV79", "function rebalanceCurrentMonthV79"), context);
  const protectedGoals = Array.from({ length: 3 }, (_, index) => ({ id: `done-${index}`, date: `2026-07-0${index + 1}`, discipline: "Concluída", subject: `Feito ${index}`, status: "Concluída" }));
  const replaceableGoals = Array.from({ length: replaceableCount }, (_, index) => ({ id: `old-${index}`, date: index % 2 ? "2026-07-20" : "2026-07-21", discipline: "Antiga", subject: `Assunto ${index}`, status: "Pendente" }));
  return { context, goals: [...protectedGoals, ...replaceableGoals] };
}

test("mês cobre todos os dias restantes antes de repetir uma data", () => {
  const { context, goals } = monthlyContext(28, 25, 50);
  const plan = context.buildBalancedMonthGenerationV79({ dailyGoals: goals, monthlyGoals: {} }, "2026-07-20");
  assert.equal(plan.complete, true);
  assert.equal(plan.fulfilledTarget, true);
  assert.equal(plan.replaceableGoals.length, 25);
  assert.equal(new Set(plan.made.map((goal) => goal.date)).size, 12);
  assert.deepEqual([...new Set(plan.made.slice(0, 12).map((goal) => goal.date))], Array.from({ length: 12 }, (_, index) => context.addDays("2026-07-20", index)));
});

test("meta maior que a capacidade ocupa todos os dias sem perder metas existentes", () => {
  const { context, goals } = monthlyContext(66, 25, 36);
  const plan = context.buildBalancedMonthGenerationV79({ dailyGoals: goals, monthlyGoals: {} }, "2026-07-20");
  assert.equal(plan.complete, true);
  assert.equal(plan.fulfilledTarget, false);
  assert.equal(plan.made.length, 36);
  assert.equal(new Set(plan.made.map((goal) => goal.date)).size, 12);
  assert.ok(plan.made.length >= plan.replaceableGoals.length);
});

test("geração mensal usa o plano equilibrado em vez do preenchimento cronológico antigo", () => {
  const block = sourceBetween("function generateMonthGoals", "function generateCalendarGoals");
  assert.match(block, /buildBalancedMonthGenerationV79\(state, reference\)/);
  assert.match(block, /Pré-visualização mensal equilibrada/);
  assert.doesNotMatch(block, /daysBetween\(start, days\)\.forEach/);
});

test("primeira abertura da V79 redistribui o mês atual uma única vez", () => {
  assert.match(script, /function rebalanceCurrentMonthV79/);
  assert.match(script, /balancedMonthlyCalendarV79/);
  assert.match(script, /rebalanceCurrentMonthV79\(state\)/);
});

test("V83 mantém a distribuição mensal da V79, cache e publicação em paridade", () => {
  const version = "20260720-logos-link-inicio-v94";
  assert.equal(JSON.parse(read("package.json")).version, version);
  assert.match(read("index.html"), new RegExp(version));
  assert.match(read("service-worker.js"), new RegExp(`CURRENT_VERSION = "${version}"`));
  assert.match(read("service-worker.js"), /"20260720-calendario-mensal-v79"/);
  for (const file of ["script.js", "index.html", "service-worker.js", "header-brand-fix.js", "sync-integral-time-protection.js"]) {
    assert.equal(read(file), read(path.join("docs", file)), file);
  }
});
