const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const ROOT_FILE = "timer-controls-hardening-v268.js";
const DOCS_FILE = "docs/timer-controls-hardening-v268.js";
const source = fs.readFileSync(ROOT_FILE, "utf8");

function runtime({ confirmResult = true } = {}) {
  const events = {
    renders: 0,
    persists: 0,
    resets: 0,
    closes: 0,
    sounds: [],
    completionAlarms: 0,
    confirms: 0,
    listeners: []
  };
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
    sessionGoalMinutes: 60,
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
  let now = 10_000;
  const context = {
    console,
    document,
    Date: class extends Date { static now() { return now; } },
    window: {
      setInterval() { return 17; },
      clearInterval() {},
      setTimeout() { return 18; },
      confirm() { events.confirms += 1; return confirmResult; }
    },
    floatingTimer: timer,
    currentTimerSeconds() {
      const running = timer.startedAt && !timer.paused ? Math.floor((now - timer.startedAt) / 1000) : 0;
      return timer.elapsedSeconds + Math.max(0, running);
    },
    formatTimerSeconds(seconds) {
      const h = Math.floor(seconds / 3600);
      const m = Math.floor((seconds % 3600) / 60);
      const s = seconds % 60;
      return [h,m,s].map((x) => String(x).padStart(2, "0")).join(":");
    },
    stopFloatingTimerInterval() { timer.intervalId = null; },
    renderFloatingTimer() { events.renders += 1; },
    playTimerControlBeep(type) { events.sounds.push(type); return Promise.resolve(true); },
    playTimerCompletionAlarm() { events.completionAlarms += 1; return Promise.resolve(true); },
    scheduleFloatingTimerSessionPersistenceAfterPaint() { events.persists += 1; },
    persistFloatingTimerSession() { events.persists += 1; },
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
  return {
    context,
    timer,
    events,
    api: context.__ALDUS_TIMER_CONTROLS_HARDENING_V268__,
    setNow(value) { now = value; }
  };
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

test("pausar e continuar preservam a mesma sessão e o tempo acumulado", () => {
  const r = runtime();
  r.timer.completed = false;
  r.timer.paused = false;
  r.timer.elapsedSeconds = 125;
  r.timer.startedAt = 10_000;
  r.setNow(15_000);

  assert.equal(r.api.pauseActiveTimer(), true);
  assert.equal(r.timer.sessionId, "session-1");
  assert.equal(r.timer.elapsedSeconds, 130);
  assert.equal(r.timer.startedAt, null);
  assert.equal(r.timer.paused, true);

  r.setNow(20_000);
  assert.equal(r.api.resumePausedTimer(), true);
  assert.equal(r.timer.sessionId, "session-1");
  assert.equal(r.timer.elapsedSeconds, 130);
  assert.equal(r.timer.startedAt, 20_000);
  assert.equal(r.timer.paused, false);
  assert.deepEqual(r.events.sounds, ["pause", "resume"]);
  assert.ok(r.events.persists >= 2);
});

test("regressivo em zero conclui e toca o alarme somente uma vez", () => {
  const r = runtime();
  r.timer.completed = false;
  r.timer.paused = false;
  r.timer.elapsedSeconds = 3600;
  r.timer.startedAt = 10_000;
  r.setNow(10_000);

  assert.equal(r.api.ensureCountdownCompletion(), true);
  assert.equal(r.timer.completed, true);
  assert.equal(r.timer.paused, true);
  assert.equal(r.events.completionAlarms, 1);

  assert.equal(r.api.ensureCountdownCompletion(), true);
  assert.equal(r.events.completionAlarms, 1);
});

test("se o núcleo já marcou o zero como concluído e pausado, o alarme ainda é reforçado", () => {
  const r = runtime();
  r.timer.completed = true;
  r.timer.paused = true;
  r.timer.elapsedSeconds = 3600;

  assert.equal(r.api.ensureCountdownCompletion(), true);
  assert.equal(r.events.completionAlarms, 1);
  assert.equal(r.api.ensureCountdownCompletion(), true);
  assert.equal(r.events.completionAlarms, 1);
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

test("raiz e docs publicam o hardening V316 com compatibilidade V295", () => {
  assert.equal(source, fs.readFileSync(DOCS_FILE, "utf8"));
  assert.match(source, /20260810-timer-runtime-fix-v295/);
  assert.match(source, /20260812-timer-diagnostics-security-v316/);
  assert.match(source, /timer-controls-hardening-hotfix2/);
  assert.match(source, /pauseActiveTimer/);
  assert.match(source, /resumePausedTimer/);
  assert.match(source, /ensureCountdownCompletion/);
});

test("bootstrap protegido e ponte de compatibilidade carregam o runtime do cronômetro", () => {
  for (const file of ["bootstrap-integrity-loader-v275.js", "docs/bootstrap-integrity-loader-v275.js"]) {
    const loader = fs.readFileSync(file, "utf8");
    assert.match(loader, /timer-sound-master-v265\.js/);
    assert.match(loader, /timer-controls-hardening-v268\.js/);
    assert.match(loader, /timer-controls-hardening-hotfix2/);
  }
  for (const file of ["planning-shift-persistence-v283.js", "docs/planning-shift-persistence-v283.js"]) {
    const bridge = fs.readFileSync(file, "utf8");
    assert.match(bridge, /20260810-timer-runtime-fix-v295/);
    assert.match(bridge, /timer-sound-master-v265\.js/);
    assert.match(bridge, /timer-controls-hardening-v268\.js/);
  }
});
