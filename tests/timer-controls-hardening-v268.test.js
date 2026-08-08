const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const ROOT_FILE = "timer-controls-hardening-v268.js";
const DOCS_FILE = "docs/timer-controls-hardening-v268.js";
const source = fs.readFileSync(ROOT_FILE, "utf8");

function runtime({ confirmResult = true } = {}) {
  const events = { renders: 0, persists: 0, resets: 0, closes: 0, sounds: [], confirms: 0, listeners: [] };
  const timer = {
    sessionId: "session-1",
    goalId: "goal-1",
    elapsedSeconds: 3600,
    startedAt: null,
    paused: true,
    completed: true,
    completionDismissed: false,
    completionAlarmPlayed: true,
    previousRemainingSeconds: 0,
    mode: "countdown",
    plannedMinutes: 60,
    sessionGoalMinutes: 0,
    intervalId: null
  };
  const document = {
    documentElement: { dataset: {} },
    head: { appendChild() {} },
    body: { appendChild() {} },
    getElementById() { return null; },
    addEventListener(type, listener, capture) { events.listeners.push({ type, listener, capture }); },
    createElement() {
      return {
        id: "",
        hidden: true,
        dataset: {},
        style: {},
        setAttribute() {},
        addEventListener() {},
        appendChild() {},
        querySelector() { return null; },
        innerHTML: "",
        textContent: ""
      };
    }
  };
  const context = {
    console,
    document,
    window: {
      setInterval() { return 17; },
      clearInterval() {},
      setTimeout() { return 18; },
      confirm() { events.confirms += 1; return confirmResult; }
    },
    floatingTimer: timer,
    currentTimerSeconds() { return timer.elapsedSeconds; },
    formatTimerSeconds(seconds) {
      const h = Math.floor(seconds / 3600);
      const m = Math.floor((seconds % 3600) / 60);
      const s = seconds % 60;
      return [h,m,s].map((x) => String(x).padStart(2, "0")).join(":");
    },
    stopFloatingTimerInterval() { timer.intervalId = null; },
    renderFloatingTimer() { events.renders += 1; },
    playTimerControlBeep(type) { events.sounds.push(type); return Promise.resolve(true); },
    scheduleFloatingTimerSessionPersistenceAfterPaint() { events.persists += 1; },
    resetFloatingTimer() { events.resets += 1; timer.elapsedSeconds = 0; },
    closeFloatingTimer() { events.closes += 1; timer.goalId = null; },
    silenceTimerAlert() { return true; },
    showDailyGoalMessage() {},
    __ALDUS_TIMER_SOUND_MASTER_V265__: {
      install() { return true; },
      masterSoundEnabled() { return true; },
      stopAllSounds() { return true; }
    }
  };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(source, context, { filename: ROOT_FILE });
  return { context, timer, events, api: context.__ALDUS_TIMER_CONTROLS_HARDENING_V268__ };
}

test("continuar após conclusão realmente retoma e passa a contar tempo adicional", () => {
  const r = runtime();
  assert.equal(r.api.continuePastCompletion(), true);
  assert.equal(r.timer.paused, false);
  assert.equal(r.timer.completed, false);
  assert.equal(r.timer.completionDismissed, true);
  assert.equal(r.timer.mode, "free");
  assert.ok(r.timer.startedAt > 0);
  assert.equal(r.timer.intervalId, 17);
  assert.ok(r.events.persists >= 1);
  assert.deepEqual(r.events.sounds, ["resume"]);
});

test("zerar exige confirmação quando existe tempo não salvo", () => {
  const cancelled = runtime({ confirmResult: false });
  assert.equal(cancelled.api.resetWithConfirmation(), false);
  assert.equal(cancelled.events.resets, 0);
  assert.equal(cancelled.events.confirms, 1);

  const confirmed = runtime({ confirmResult: true });
  assert.equal(confirmed.api.resetWithConfirmation(), true);
  assert.equal(confirmed.events.resets, 1);
});

test("fechar aviso apenas oculta a conclusão e preserva a sessão", () => {
  const r = runtime();
  assert.equal(r.api.dismissCompletionNotice(), true);
  assert.equal(r.timer.goalId, "goal-1");
  assert.equal(r.timer.completed, true);
  assert.equal(r.timer.paused, true);
  assert.equal(r.timer.completionDismissed, true);
  assert.equal(r.events.closes, 0);
  assert.ok(r.events.persists >= 1);
});

test("raiz e docs publicam o mesmo hotfix V268", () => {
  assert.equal(source, fs.readFileSync(DOCS_FILE, "utf8"));
  assert.match(source, /20260808-timer-controls-sound-v268/);
  assert.match(source, /timer-controls-hardening-hotfix1/);
  assert.match(source, /Há tempo não salvo/);
  assert.match(source, /continuePastCompletion/);
});

test("bootstrap e service worker carregam proteção de controles e som mestre", () => {
  for (const file of ["bootstrap-integrity-loader-v258.js", "docs/bootstrap-integrity-loader-v258.js"]) {
    const loader = fs.readFileSync(file, "utf8");
    assert.match(loader, /timer-sound-master-v265\.js/);
    assert.match(loader, /timer-controls-hardening-v268\.js/);
  }
  for (const file of ["service-worker-v266.js", "docs/service-worker-v266.js"]) {
    const worker = fs.readFileSync(file, "utf8");
    assert.match(worker, /timer-controls-hardening-v268\.js/);
    assert.match(worker, /x-aldus-timer-controls-hardening/);
  }
});
