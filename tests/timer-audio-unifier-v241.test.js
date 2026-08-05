const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const ROOT_FILE = "timer-audio-unifier-v241.js";
const DOCS_FILE = "docs/timer-audio-unifier-v241.js";
const source = fs.readFileSync(ROOT_FILE, "utf8");

function loadRuntime({ recovery = true } = {}) {
  const events = {
    central: [],
    centralStops: 0,
    legacyCompletion: [],
    legacySilence: 0,
    listeners: []
  };

  const document = {
    documentElement: { dataset: {} },
    addEventListener(type, listener, capture) {
      events.listeners.push({ type, listener, capture });
    },
    querySelectorAll() { return []; }
  };

  const context = {
    console,
    document,
    window: {
      setInterval() { return 1; },
      clearInterval() {},
      setTimeout() { return 2; }
    },
    localStorage: {
      getItem() { return null; },
      setItem() {}
    },
    state: { settings: { timerPreferences: { sound: true, motivationalSound: true } } },
    floatingTimer: { sessionId: "sessao-123", goalId: "meta-9" },
    playTimerCompletionAlarm(type) {
      events.legacyCompletion.push(type);
      return Promise.resolve(true);
    },
    playTimerBeep(type) {
      events.legacyCompletion.push(`beep:${type}`);
      return Promise.resolve(true);
    },
    silenceTimerAlert() {
      events.legacySilence += 1;
      return true;
    }
  };

  if (recovery) {
    context.__ALDUS_TIMER_AUDIO_RECOVERY_V236__ = {
      playMotivationalSound(signature, milestone, options) {
        events.central.push({ signature, milestone, options });
        return Promise.resolve(true);
      },
      stopActiveSound() {
        events.centralStops += 1;
        return true;
      }
    };
  }

  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(source, context, { filename: ROOT_FILE });
  return { context, events, api: context.__ALDUS_TIMER_AUDIO_UNIFIER_V241__ };
}

test("instala um único controlador sobre conclusão, teste e silenciar", () => {
  const runtime = loadRuntime();
  assert.equal(runtime.api.installed(), true);
  assert.equal(runtime.context.playTimerBeep.__aldusTimerAudioUnifiedV241, true);
  assert.equal(runtime.context.playTimerCompletionAlarm, runtime.context.playTimerBeep);
  assert.equal(runtime.context.silenceTimerAlert.__aldusTimerAudioUnifiedV241, true);
});

test("botão Testar alarme usa somente a prévia do controlador central", async () => {
  const runtime = loadRuntime();
  const result = await runtime.context.playTimerBeep("test");
  assert.equal(result, true);
  assert.equal(runtime.events.legacyCompletion.length, 0);
  assert.equal(runtime.events.central.length, 1);
  assert.equal(runtime.events.central[0].milestone, 100);
  assert.equal(runtime.events.central[0].options.preview, true);
  assert.match(runtime.events.central[0].signature, /teste do alarme/i);
});

test("conclusão da sessão usa alarme final central e inclui a sessão", async () => {
  const runtime = loadRuntime();
  await runtime.context.playTimerCompletionAlarm("completed");
  assert.equal(runtime.events.legacyCompletion.length, 0);
  assert.equal(runtime.events.central.length, 1);
  assert.equal(runtime.events.central[0].milestone, 100);
  assert.equal(runtime.events.central[0].options.preview, false);
  assert.match(runtime.events.central[0].signature, /sessao-123/);
});

test("silenciar interrompe controlador central e qualquer resíduo legado", () => {
  const runtime = loadRuntime();
  assert.equal(runtime.context.silenceTimerAlert(), true);
  assert.equal(runtime.events.centralStops, 1);
  assert.equal(runtime.events.legacySilence, 1);
});

test("sem controlador central mantém fallback antigo sem quebrar o alarme", async () => {
  const runtime = loadRuntime({ recovery: false });
  const result = await runtime.context.playTimerBeep("test");
  assert.equal(result, true);
  assert.deepEqual(runtime.events.legacyCompletion, ["test"]);
});

test("mudança da preferência bloqueia a prévia antiga e usa a central", async () => {
  const runtime = loadRuntime();
  const handler = runtime.events.listeners.find((item) => item.type === "change" && item.capture === true)?.listener;
  assert.equal(typeof handler, "function");

  let immediateStopped = false;
  let propagationStopped = false;
  const input = { checked: true };
  handler({
    target: { closest: () => input },
    stopImmediatePropagation() { immediateStopped = true; },
    stopPropagation() { propagationStopped = true; }
  });
  await Promise.resolve();

  assert.equal(immediateStopped, true);
  assert.equal(propagationStopped, true);
  assert.equal(runtime.events.central.length, 1);
  assert.equal(runtime.events.central[0].milestone, 10);
  assert.equal(runtime.events.central[0].options.preview, true);
});

test("o caminho real antigo é identificado e coberto pela unificação", () => {
  const app = fs.readFileSync("script.js", "utf8");
  assert.match(app, /async function playTimerBeep\(type = "completed"\) \{ return playTimerCompletionAlarm\(type\); \}/);
  assert.match(app, /if \(action === "test-alerts"\) testTimerAlerts\(\)/);
  assert.match(app, /await playTimerBeep\("test"\)/);
});

test("raiz, docs, loader e cache publicam o V241", () => {
  assert.equal(source, fs.readFileSync(DOCS_FILE, "utf8"));
  assert.match(source, /20260805-timer-audio-unified-v241/);
  assert.match(source, /timer-audio-unifier-hotfix1/);

  for (const file of ["planning-integrity-loader-v235.js", "docs/planning-integrity-loader-v235.js"]) {
    const loader = fs.readFileSync(file, "utf8");
    assert.match(loader, /timer-audio-unifier-v241\.js/);
    assert.match(loader, /timer-audio-unifier-hotfix1/);
  }

  for (const file of ["service-worker.js", "docs/service-worker.js"]) {
    const worker = fs.readFileSync(file, "utf8");
    assert.match(worker, /timer-audio-unifier-v241\.js/);
    assert.match(worker, /timer-audio-unified-v241-hotfix1/);
  }
});