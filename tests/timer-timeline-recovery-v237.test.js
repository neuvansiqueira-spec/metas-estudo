const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { test } = require('node:test');

const source = fs.readFileSync('timer-timeline-recovery-v237.js', 'utf8');
const docsSource = fs.readFileSync('docs/timer-timeline-recovery-v237.js', 'utf8');

function runtime(timer, now = Date.parse('2026-08-04T20:00:00-03:00')) {
  let currentNow = now;
  const context = {
    console,
    Date: class extends Date { static now() { return currentNow; } },
    floatingTimer: { ...timer },
    currentTimerSeconds() {
      const value = Number(context.floatingTimer.elapsedSeconds) || 0;
      if (!context.floatingTimer.paused && context.floatingTimer.startedAt) {
        return value + Math.floor((currentNow - context.floatingTimer.startedAt) / 1000);
      }
      return value;
    },
    persistFloatingTimerSession() { context.persisted = true; },
    renderFloatingTimer() { context.rendered = true; },
    restoreFloatingTimerSession() { context.restoreCalls = (context.restoreCalls || 0) + 1; },
    document: { visibilityState: 'visible', addEventListener() {} },
    window: {
      addEventListener() {},
      setInterval(fn) { context.interval = fn; return 1; },
      clearInterval() {}
    }
  };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(source, context);
  return { context, api: context.__ALDUS_TIMER_TIMELINE_RECOVERY_V237__ };
}

test('recupera 20 minutos contínuos pela linha do tempo', () => {
  const now = Date.parse('2026-08-04T20:00:00-03:00');
  const { api } = runtime({ goalId: 'goal-1', openedAt: now - 20 * 60 * 1000, elapsedSeconds: 0, paused: false, pauses: [], resumes: [] }, now);
  assert.equal(api.calculateTimelineElapsedSeconds({ goalId: 'goal-1', openedAt: now - 20 * 60 * 1000, elapsedSeconds: 0, paused: false, pauses: [], resumes: [] }, now), 1200);
});

test('desconta intervalos pausados e preserva retomadas', () => {
  const now = Date.parse('2026-08-04T20:00:00-03:00');
  const openedAt = now - 30 * 60 * 1000;
  const { api } = runtime({ goalId: 'goal-2', openedAt, elapsedSeconds: 0, paused: false }, now);
  assert.equal(api.calculateTimelineElapsedSeconds({
    goalId: 'goal-2', openedAt, elapsedSeconds: 0, paused: false,
    pauses: [new Date(openedAt + 10 * 60 * 1000).toISOString()],
    resumes: [new Date(openedAt + 15 * 60 * 1000).toISOString()]
  }, now), 25 * 60);
});

test('sessão pausada não acumula tempo após a pausa', () => {
  const now = Date.parse('2026-08-04T20:00:00-03:00');
  const openedAt = now - 40 * 60 * 1000;
  const pauseAt = openedAt + 12 * 60 * 1000;
  const { api } = runtime({ goalId: 'goal-3', openedAt, elapsedSeconds: 0, paused: true }, now);
  assert.equal(api.calculateTimelineElapsedSeconds({
    goalId: 'goal-3', openedAt, elapsedSeconds: 0, paused: true,
    pauses: [new Date(pauseAt).toISOString()], resumes: []
  }, now), 12 * 60);
});

test('reconciliação nunca reduz o contador e persiste o acréscimo', () => {
  const now = Date.parse('2026-08-04T20:00:00-03:00');
  const { context, api } = runtime({
    goalId: 'goal-4', openedAt: now - 20 * 60 * 1000,
    elapsedSeconds: 300, startedAt: now, paused: false, pauses: [], resumes: []
  }, now);
  assert.equal(context.floatingTimer.elapsedSeconds, 1200);
  assert.equal(context.floatingTimer.startedAt, now);
  assert.equal(context.persisted, true);
  assert.equal(context.rendered, true);
  assert.equal(api.reconcileTimerTimeline(now), false);
});

test('não altera sessão concluída, inválida ou com valor já maior', () => {
  const now = Date.parse('2026-08-04T20:00:00-03:00');
  const { api } = runtime({ goalId: 'goal-5', openedAt: now - 1000, elapsedSeconds: 5000, paused: false }, now);
  assert.equal(api.calculateTimelineElapsedSeconds({ goalId: 'goal-5', openedAt: now - 1000, elapsedSeconds: 5000 }, now), 5000);
  assert.equal(api.calculateTimelineElapsedSeconds({ goalId: 'goal-5', openedAt: now - 5000, elapsedSeconds: 10, completed: true }, now), 10);
  assert.equal(api.calculateTimelineElapsedSeconds({ elapsedSeconds: 44 }, now), 44);
});

test('wrapper de restauração e singleton não duplicam execução', () => {
  const now = Date.parse('2026-08-04T20:00:00-03:00');
  const { context, api } = runtime({ goalId: null, elapsedSeconds: 0, paused: true }, now);
  const first = context.restoreFloatingTimerSession;
  assert.equal(api.installRestoreWrapper(), true);
  assert.equal(context.restoreFloatingTimerSession, first);
  vm.runInContext(source, context);
  assert.equal(context.restoreFloatingTimerSession, first);
  context.restoreFloatingTimerSession();
  assert.equal(context.restoreCalls, 1);
});

test('cópia publicada em docs permanece idêntica', () => {
  assert.equal(docsSource, source);
});
