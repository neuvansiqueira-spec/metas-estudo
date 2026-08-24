const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const source = fs.readFileSync("daily-goal-authorized-restore-v389.js", "utf8");
const docsSource = fs.readFileSync("docs/daily-goal-authorized-restore-v389.js", "utf8");
const startup = fs.readFileSync("startup-planning-stability-v387.js", "utf8");
const docsStartup = fs.readFileSync("docs/startup-planning-stability-v387.js", "utf8");

function automatic(id) {
  return {
    id,
    date: "2026-08-24",
    discipline: `Disciplina ${id}`,
    subject: `Assunto ${id}`,
    origin: "planejamento",
    status: "Pendente"
  };
}

function targetCandidate() {
  return {
    id: "planejamento-gestao-publica-20260824",
    date: "2026-08-24",
    discipline: "DIREITO ADMINISTRATIVO E GESTÃO PÚBLICA",
    subject: "Planejamento e Gestão Pública",
    syllabusItemId: "gestao-publica-planejamento",
    origin: "planejamento",
    status: "Pendente"
  };
}

function buildContext(targetState) {
  const listeners = new Map();
  let saves = 0;
  let renders = 0;
  const context = {
    console,
    __targetState: targetState,
    eligiblePlanningGoalsForDate: () => [targetCandidate()],
    buildPlanningScoreContext: () => ({}),
    isPlanningStudyGoal: () => true,
    saveData: () => { saves += 1; return true; },
    autoSyncAfterSave: () => {},
    render: () => { renders += 1; },
    window: {
      addEventListener(name, callback) {
        listeners.set(name, callback);
      }
    },
    module: { exports: {} },
    exports: {},
    Date,
    Object,
    Array,
    String,
    Set,
    Map
  };
  context.globalThis = context;
  vm.createContext(context);
  return { context, listeners, getSaves: () => saves, getRenders: () => renders };
}

test("V389 sai de state-unavailable e acessa o state lexical real após o bootstrap", () => {
  const targetState = {
    dailyGoals: Array.from({ length: 6 }, (_, index) => automatic(`auto-${index + 1}`)),
    migrations: {}
  };
  const runtime = buildContext(targetState);

  vm.runInContext(source, runtime.context);
  assert.equal(runtime.context.__ALDUS_AUTHORIZED_GOAL_RESTORE_V389__.skipped, "state-unavailable");
  assert.equal(targetState.dailyGoals.length, 6);
  assert.equal(Object.prototype.hasOwnProperty.call(runtime.context, "state"), false);

  vm.runInContext("let state = __targetState;", runtime.context);
  runtime.listeners.get("aldus:bootstrap-ready")();

  assert.equal(targetState.dailyGoals.length, 7);
  assert.equal(runtime.context.__ALDUS_AUTHORIZED_GOAL_RESTORE_V389__.changed, true);
  assert.equal(runtime.context.__ALDUS_AUTHORIZED_GOAL_RESTORE_V389__.total, 7);
  assert.equal(runtime.getSaves(), 1);
  assert.equal(runtime.getRenders(), 1);
  assert.equal(Object.prototype.hasOwnProperty.call(runtime.context, "state"), false);
});

test("V389 é estritamente 6→7 e nunca cria oitava meta", () => {
  const targetState = {
    dailyGoals: Array.from({ length: 7 }, (_, index) => automatic(`auto-${index + 1}`)),
    migrations: {}
  };
  const runtime = buildContext(targetState);
  vm.runInContext("let state = __targetState;", runtime.context);
  vm.runInContext(source, runtime.context);

  assert.equal(targetState.dailyGoals.length, 7);
  assert.equal(runtime.context.__ALDUS_AUTHORIZED_GOAL_RESTORE_V389__.skipped, "day-already-has-seven");
  assert.equal(runtime.getSaves(), 0);
});

test("V389 não duplica Planejamento e Gestão Pública", () => {
  const targetState = {
    dailyGoals: [
      ...Array.from({ length: 6 }, (_, index) => automatic(`auto-${index + 1}`)),
      targetCandidate()
    ],
    migrations: {}
  };
  const runtime = buildContext(targetState);
  vm.runInContext("let state = __targetState;", runtime.context);
  vm.runInContext(source, runtime.context);

  assert.equal(targetState.dailyGoals.length, 7);
  assert.equal(runtime.context.__ALDUS_AUTHORIZED_GOAL_RESTORE_V389__.skipped, "already-present");
  assert.equal(runtime.getSaves(), 0);
});

test("V389 não adiciona hot paths nem trabalho contínuo", () => {
  assert.equal(source.includes("setInterval("), false);
  assert.equal(source.includes("setTimeout("), false);
  assert.equal(source.includes("MutationObserver"), false);
  assert.equal(source.includes("requestAnimationFrame("), false);
  assert.equal(source.includes("requestIdleCallback("), false);
  assert.equal(source.includes("getComputedStyle("), false);
  assert.equal(source.includes("globalThis.state"), false);
  assert.match(source, /typeof state !== "undefined"/);
  assert.match(source, /dayGoals\.length !== EXPECTED_TOTAL - 1/);
});

test("V389 mantém paridade e é retirada do cache enquanto a V391 assume a entrega ativa", () => {
  assert.equal(source, docsSource);
  assert.equal(startup, docsStartup);
  assert.match(startup, /daily-goal-authorized-restore-v389\.js/);
  assert.match(startup, /daily-goal-authorized-restore-v390\.js/);
  assert.match(startup, /daily-goal-authorized-restore-v391\.js/);
  assert.match(startup, /20260824-restaura-planejamento-gestao-estrategica-v391/);
  assert.doesNotMatch(startup, /const RESTORE_VERSION = "20260824-restaura-meta-planejamento-gestao-publica-v389"/);
  assert.doesNotMatch(startup, /const RESTORE_VERSION = "20260824-restaura-meta-planejamento-gestao-publica-v390"/);
  assert.match(startup, /daily-goal-authorized-restore-v388\.js/);
});
