const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const source = fs.readFileSync("timer-session-integrity-v236.js", "utf8");
const MIGRATION_KEY = "timerSessionIncidentRecoveryV236_20260804";
const RECOVERY_SESSION_ID = "timer-recovery-v236-20260804-lei-antiterrorismo";

function targetGoal(overrides = {}) {
  return {
    id: "goal-antiterrorismo",
    date: "2026-08-04",
    discipline: "LEGISLAÇÃO PENAL E LEGISLAÇÃO PROCESSUAL PENAL EXTRAVAGANTE",
    subject: "Lei Antiterrorismo (Lei n.º 13.260/2016).",
    minutes: 60,
    studyActualMinutes: 5,
    questionActualMinutes: 0,
    actualMinutes: 5,
    tempo_real_minutos: 5,
    status: "Em andamento",
    ...overrides
  };
}

function runModule(state, sharedStorage = new Map()) {
  const intervals = [];
  const listeners = [];
  const saves = [];
  const syncs = [];
  let renders = 0;
  let snapshotCalls = 0;

  const localStorage = {
    getItem(key) { return sharedStorage.has(key) ? sharedStorage.get(key) : null; },
    setItem(key, value) { sharedStorage.set(key, String(value)); },
    removeItem(key) { sharedStorage.delete(key); }
  };

  const window = {
    setInterval(callback, milliseconds) {
      const id = intervals.length + 1;
      intervals.push({ id, callback, milliseconds, cleared: false });
      return id;
    },
    clearInterval(id) {
      const interval = intervals.find((item) => item.id === id);
      if (interval) interval.cleared = true;
    },
    addEventListener(type, callback, options) {
      listeners.push({ target: "window", type, callback, options });
    }
  };

  const document = {
    visibilityState: "visible",
    addEventListener(type, callback, options) {
      listeners.push({ target: "document", type, callback, options });
    }
  };

  const context = {
    console,
    Date,
    Math,
    Object,
    Number,
    String,
    Array,
    Boolean,
    JSON,
    Map,
    Set,
    RegExp,
    Intl,
    state,
    localStorage,
    window,
    document,
    navigator: {
      serviceWorker: {
        addEventListener(type, callback) {
          listeners.push({ target: "serviceWorker", type, callback });
        }
      }
    },
    appendGoalHistory(goal, text) {
      goal.history ||= [];
      goal.history.push({ at: "test", text });
    },
    saveData(options) { saves.push(options); },
    autoSyncAfterSave(reason) { syncs.push(reason); },
    render() { renders += 1; },
    persistFloatingTimerSession(options) {
      snapshotCalls += 1;
      return { options };
    }
  };
  context.globalThis = context;

  vm.createContext(context);
  vm.runInContext(source, context, { filename: "timer-session-integrity-v236.js" });

  return {
    context,
    intervals,
    listeners,
    saves,
    syncs,
    renders: () => renders,
    snapshotCalls: () => snapshotCalls,
    storage: sharedStorage
  };
}

test("recupera exatamente os 15 minutos faltantes e fecha a meta em 20 minutos", () => {
  const state = { dailyGoals: [targetGoal()], studies: [], migrations: {} };
  const runtime = runModule(state);
  const goal = state.dailyGoals[0];

  assert.equal(goal.studyActualMinutes, 20);
  assert.equal(goal.questionActualMinutes, 0);
  assert.equal(goal.actualMinutes, 20);
  assert.equal(goal.tempo_real_minutos, 20);
  assert.equal(goal.status, "Em andamento");
  assert.equal(state.studies.length, 1);
  assert.equal(state.studies[0].timerSessionId, RECOVERY_SESSION_ID);
  assert.equal(state.studies[0].minutes, 15);
  assert.equal(state.studies[0].seconds, 900);
  assert.equal(state.studies[0].goalId, goal.id);
  assert.equal(state.migrations[MIGRATION_KEY].beforeMinutes, 5);
  assert.equal(state.migrations[MIGRATION_KEY].restoredMinutes, 15);
  assert.equal(state.migrations[MIGRATION_KEY].afterMinutes, 20);
  assert.equal(goal.history.length, 1);
  assert.match(goal.history[0].text, /Recuperação automática de 15 minuto/);
  assert.equal(runtime.saves.length, 1);
  assert.deepEqual(runtime.saves[0], { markLocalChange: true });
  assert.deepEqual(runtime.syncs, ["timer-session-recovery-v236"]);
  assert.equal(runtime.renders(), 1);
});

test("é idempotente após recarregar e não duplica minutos nem sessão", () => {
  const state = { dailyGoals: [targetGoal()], studies: [], migrations: {} };
  const storage = new Map();
  runModule(state, storage);
  const firstState = JSON.stringify(state);

  const second = runModule(state, storage);

  assert.equal(JSON.stringify(state), firstState);
  assert.equal(state.dailyGoals[0].actualMinutes, 20);
  assert.equal(state.studies.filter((item) => item.timerSessionId === RECOVERY_SESSION_ID).length, 1);
  assert.equal(second.saves.length, 0);
  assert.equal(second.syncs.length, 0);
  assert.equal(second.renders(), 0);
});

test("não reduz uma meta que já possui mais de 20 minutos", () => {
  const state = {
    dailyGoals: [targetGoal({
      studyActualMinutes: 25,
      actualMinutes: 25,
      tempo_real_minutos: 25
    })],
    studies: [],
    migrations: {}
  };

  runModule(state);

  assert.equal(state.dailyGoals[0].studyActualMinutes, 25);
  assert.equal(state.dailyGoals[0].actualMinutes, 25);
  assert.equal(state.dailyGoals[0].tempo_real_minutos, 25);
  assert.equal(state.studies.length, 0);
  assert.equal(state.migrations[MIGRATION_KEY].restoredMinutes, 0);
  assert.equal(state.migrations[MIGRATION_KEY].afterMinutes, 25);
});

test("não altera outras metas, datas ou disciplinas", () => {
  const unrelated = [
    targetGoal({ id: "outra-data", date: "2026-08-05", actualMinutes: 5 }),
    targetGoal({ id: "outra-disciplina", discipline: "DIREITO PENAL", actualMinutes: 5 }),
    targetGoal({ id: "outro-assunto", subject: "Lei de Drogas", actualMinutes: 5 })
  ];
  const state = { dailyGoals: unrelated, studies: [], migrations: {} };

  runModule(state);

  assert.deepEqual(state.dailyGoals.map((goal) => goal.actualMinutes), [5, 5, 5]);
  assert.equal(state.studies.length, 0);
  assert.equal(state.migrations[MIGRATION_KEY], undefined);
});

test("preserva minutos de questões ao completar apenas o tempo de estudo", () => {
  const state = {
    dailyGoals: [targetGoal({
      studyActualMinutes: 3,
      questionActualMinutes: 2,
      actualMinutes: 5,
      tempo_real_minutos: 5
    })],
    studies: [],
    migrations: {}
  };

  runModule(state);

  assert.equal(state.dailyGoals[0].studyActualMinutes, 18);
  assert.equal(state.dailyGoals[0].questionActualMinutes, 2);
  assert.equal(state.dailyGoals[0].actualMinutes, 20);
  assert.equal(state.studies[0].minutes, 15);
  assert.equal(state.studies[0].timerKind, "study");
});

test("instala snapshot periódico de 10 segundos e usa gravação storageOnly", () => {
  const state = { dailyGoals: [targetGoal({ actualMinutes: 20, studyActualMinutes: 20, tempo_real_minutos: 20 })], studies: [], migrations: {} };
  const runtime = runModule(state);
  const snapshotInterval = runtime.intervals.find((item) => item.milliseconds === 10000);

  assert.ok(snapshotInterval, "intervalo de proteção de 10 segundos não foi instalado");
  snapshotInterval.callback();
  assert.equal(runtime.snapshotCalls(), 1);
  assert.ok(runtime.listeners.some((item) => item.target === "window" && item.type === "beforeunload"));
  assert.ok(runtime.listeners.some((item) => item.target === "window" && item.type === "pagehide"));
  assert.ok(runtime.listeners.some((item) => item.target === "window" && item.type === "freeze"));
  assert.ok(runtime.listeners.some((item) => item.target === "document" && item.type === "visibilitychange"));
  assert.ok(runtime.listeners.some((item) => item.target === "serviceWorker" && item.type === "controllerchange"));
});

test("arquivos principal e público permanecem idênticos", () => {
  assert.equal(
    fs.readFileSync("timer-session-integrity-v236.js", "utf8"),
    fs.readFileSync("docs/timer-session-integrity-v236.js", "utf8")
  );
  assert.equal(
    fs.readFileSync("planning-integrity-loader-v235.js", "utf8"),
    fs.readFileSync("docs/planning-integrity-loader-v235.js", "utf8")
  );
  assert.equal(
    fs.readFileSync("service-worker-v236.js", "utf8"),
    fs.readFileSync("docs/service-worker-v236.js", "utf8")
  );
});

test("contrato publicado contém o hotfix e o cache corretos", () => {
  const loader = fs.readFileSync("planning-integrity-loader-v235.js", "utf8");
  const worker = fs.readFileSync("service-worker-v236.js", "utf8");

  assert.match(source, /timer-session-integrity-hotfix1/);
  assert.match(source, /TARGET_TOTAL_MINUTES = 20/);
  assert.match(source, /SNAPSHOT_INTERVAL_MS = 10000/);
  assert.match(loader, /timer-session-integrity-v236\.js/);
  assert.match(loader, /timer-session-integrity-hotfix1/);
  assert.match(worker, /timer-session-hotfix1/);
  assert.match(worker, /timer-session-integrity-v236\.js/);
});
