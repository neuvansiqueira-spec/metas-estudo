const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const ROOT_FILE = "timer-sound-master-v265.js";
const DOCS_FILE = "docs/timer-sound-master-v265.js";
const source = fs.readFileSync(ROOT_FILE, "utf8");

function loadRuntime({ stateSound = true, storedSound = null } = {}) {
  const events = {
    control: 0,
    alarm: 0,
    centralControl: 0,
    centralMotivation: 0,
    centralStops: 0,
    spectrum: 0,
    legacySilence: 0,
    saves: 0,
    listeners: [],
    windowListeners: [],
    storage: new Map()
  };
  if (storedSound !== null) {
    events.storage.set("metasEstudoTimerSoundEnabled", String(storedSound));
  }

  const inputs = [];
  const document = {
    activeElement: null,
    documentElement: { dataset: {} },
    addEventListener(type, listener, capture) {
      events.listeners.push({ type, listener, capture });
    },
    querySelectorAll(selector) {
      return selector === '[data-timer-pref="sound"]' ? inputs : [];
    }
  };

  const window = {
    addEventListener(type, listener) {
      events.windowListeners.push({ type, listener });
    },
    setInterval() { return 1; },
    clearInterval() {},
    setTimeout() { return 2; }
  };

  const state = { settings: { timerPreferences: {} } };
  if (typeof stateSound === "boolean") state.settings.timerPreferences.sound = stateSound;

  function playTimerControlBeep() {
    events.control += 1;
    return Promise.resolve(true);
  }
  Object.defineProperty(playTimerControlBeep, "__aldusTimerAudioRecoveryV236", { value: true });

  function playTimerBeep() {
    events.alarm += 1;
    return Promise.resolve(true);
  }
  Object.defineProperty(playTimerBeep, "__aldusTimerAudioUnifiedV241", { value: true });

  function playTimerCompletionAlarm() {
    events.alarm += 1;
    return Promise.resolve(true);
  }
  Object.defineProperty(playTimerCompletionAlarm, "__aldusTimerAudioUnifiedV241", { value: true });

  const context = {
    console,
    document,
    window,
    state,
    localStorage: {
      getItem(key) {
        return events.storage.has(key) ? events.storage.get(key) : null;
      },
      setItem(key, value) {
        events.storage.set(key, String(value));
      }
    },
    saveTimerPreferences() { events.saves += 1; },
    playTimerControlBeep,
    playTimerBeep,
    playTimerCompletionAlarm,
    silenceTimerAlert() {
      events.legacySilence += 1;
      return true;
    },
    __ALDUS_TIMER_AUDIO_RECOVERY_V236__: Object.freeze({
      __aldusTimerAudioRecoveryV236: true,
      playControlSound() {
        events.centralControl += 1;
        return Promise.resolve(true);
      },
      playMotivationalSound() {
        events.centralMotivation += 1;
        return Promise.resolve(true);
      },
      stopActiveSound() {
        events.centralStops += 1;
        return true;
      }
    }),
    __ALDUS_TIMER_AUDIO_UNIFIER_V241__: Object.freeze({
      silenceUnifiedAlarm() {
        events.centralStops += 1;
        return true;
      }
    }),
    MetasQuestionAccuracySpectrum: Object.freeze({
      __aldusTimerAudioRecoveryV236: true,
      playMotivationalChime() {
        events.spectrum += 1;
        return Promise.resolve(true);
      }
    })
  };

  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(source, context, { filename: ROOT_FILE });
  return { context, events, api: context.__ALDUS_TIMER_SOUND_MASTER_V265__, inputs };
}

test("som ligado mantém os caminhos de áudio disponíveis", async () => {
  const runtime = loadRuntime({ stateSound: true });
  assert.equal(await runtime.context.playTimerControlBeep("start"), true);
  assert.equal(await runtime.context.playTimerBeep("test"), true);
  assert.equal(await runtime.context.playTimerCompletionAlarm("completed"), true);
  assert.equal(await runtime.context.__ALDUS_TIMER_AUDIO_RECOVERY_V236__.playControlSound("start"), true);
  assert.equal(await runtime.context.__ALDUS_TIMER_AUDIO_RECOVERY_V236__.playMotivationalSound("x", 10), true);
  assert.equal(await runtime.context.MetasQuestionAccuracySpectrum.playMotivationalChime(10), true);
  assert.equal(runtime.events.control, 1);
  assert.equal(runtime.events.alarm, 2);
  assert.equal(runtime.events.centralControl, 1);
  assert.equal(runtime.events.centralMotivation, 1);
  assert.equal(runtime.events.spectrum, 1);
});

test("desligar a chave geral interrompe e bloqueia todos os sons", async () => {
  const runtime = loadRuntime({ stateSound: true });
  const handler = runtime.events.listeners.find((item) => item.type === "change" && item.capture)?.listener;
  assert.equal(typeof handler, "function");

  let immediateStopped = false;
  let propagationStopped = false;
  const input = { checked: false, dataset: {}, setAttribute() {} };
  handler({
    target: { closest: () => input },
    stopImmediatePropagation() { immediateStopped = true; },
    stopPropagation() { propagationStopped = true; }
  });

  assert.equal(immediateStopped, true);
  assert.equal(propagationStopped, true);
  assert.equal(runtime.context.state.settings.timerPreferences.sound, false);
  assert.equal(runtime.events.storage.get("metasEstudoTimerSoundEnabled"), "false");
  assert.equal(runtime.events.saves, 1);
  assert.ok(runtime.events.centralStops >= 1);
  assert.ok(runtime.events.legacySilence >= 1);

  assert.equal(await runtime.context.playTimerControlBeep("start"), false);
  assert.equal(await runtime.context.playTimerBeep("test"), false);
  assert.equal(await runtime.context.playTimerCompletionAlarm("completed"), false);
  assert.equal(await runtime.context.__ALDUS_TIMER_AUDIO_RECOVERY_V236__.playControlSound("start"), false);
  assert.equal(
    await runtime.context.__ALDUS_TIMER_AUDIO_RECOVERY_V236__.playMotivationalSound("prévia", 100, { preview: true }),
    false
  );
  assert.equal(await runtime.context.MetasQuestionAccuracySpectrum.playMotivationalChime(10), false);
  assert.equal(runtime.events.control, 0);
  assert.equal(runtime.events.alarm, 0);
  assert.equal(runtime.events.centralControl, 0);
  assert.equal(runtime.events.centralMotivation, 0);
  assert.equal(runtime.events.spectrum, 0);
});

test("preferência local desligada prevalece sobre estado antigo ligado", async () => {
  const runtime = loadRuntime({ stateSound: true, storedSound: false });
  assert.equal(runtime.api.masterSoundEnabled(), false);
  assert.equal(await runtime.context.playTimerBeep("test"), false);
  assert.equal(runtime.events.alarm, 0);
});

test("reativar a chave geral libera o áudio sem tocar prévia automática", async () => {
  const runtime = loadRuntime({ stateSound: false, storedSound: false });
  const handler = runtime.events.listeners.find((item) => item.type === "change" && item.capture)?.listener;
  const input = { checked: true, dataset: {}, setAttribute() {} };
  handler({
    target: { closest: () => input },
    stopImmediatePropagation() {},
    stopPropagation() {}
  });

  assert.equal(runtime.context.state.settings.timerPreferences.sound, true);
  assert.equal(runtime.events.storage.get("metasEstudoTimerSoundEnabled"), "true");
  assert.equal(runtime.events.centralMotivation, 0);
  assert.equal(await runtime.context.playTimerBeep("test"), true);
  assert.equal(runtime.events.alarm, 1);
});

test("mudança em outra aba desliga e silencia a aba atual", () => {
  const runtime = loadRuntime({ stateSound: true });
  const handler = runtime.events.windowListeners.find((item) => item.type === "storage")?.listener;
  assert.equal(typeof handler, "function");
  handler({ key: "metasEstudoTimerSoundEnabled", newValue: "false" });
  assert.equal(runtime.context.state.settings.timerPreferences.sound, false);
  assert.ok(runtime.events.centralStops >= 1);
});

test("preserva as marcas dos controladores anteriores para evitar sobrescrita", () => {
  const runtime = loadRuntime({ stateSound: true });
  assert.equal(runtime.context.playTimerControlBeep.__aldusTimerAudioRecoveryV236, true);
  assert.equal(runtime.context.playTimerBeep.__aldusTimerAudioUnifiedV241, true);
  assert.equal(runtime.context.playTimerCompletionAlarm.__aldusTimerAudioUnifiedV241, true);
  assert.equal(runtime.api.installed(), true);
});

test("raiz, docs e service worker publicam a V265", () => {
  assert.equal(source, fs.readFileSync(DOCS_FILE, "utf8"));
  assert.match(source, /20260806-timer-sound-master-v265/);
  assert.match(source, /master-mute-hotfix1/);

  for (const file of ["service-worker-v265.js", "docs/service-worker-v265.js"]) {
    const worker = fs.readFileSync(file, "utf8");
    assert.match(worker, /timer-sound-master-v265\.js/);
    assert.match(worker, /injectTimerSoundMaster/);
    assert.match(worker, /master-mute-hotfix1/);
  }

  for (const file of ["service-worker-v166.js", "docs/service-worker-v166.js"]) {
    const wrapper = fs.readFileSync(file, "utf8");
    assert.match(wrapper, /service-worker-v265\.js/);
    assert.match(wrapper, /20260806-timer-sound-master-v265/);
  }
});
