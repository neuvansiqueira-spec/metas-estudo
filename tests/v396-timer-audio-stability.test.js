const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const ROOT = "timer-audio-stability-v396.js";
const DOCS = "docs/timer-audio-stability-v396.js";
const source = fs.readFileSync(ROOT, "utf8");

function sharedStorage({ quota = false } = {}) {
  const values = new Map();
  return {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) {
      if (quota) {
        const error = new Error("Setting the value exceeded the quota");
        error.name = "QuotaExceededError";
        throw error;
      }
      values.set(key, String(value));
    },
    removeItem(key) { values.delete(key); },
    values
  };
}

function loadRuntime({ storage = sharedStorage(), visible = true, focused = true } = {}) {
  class FakeAudioContext {
    constructor() {
      this.state = "running";
      this.currentTime = 1;
      this.destination = {};
    }
    createOscillator() {
      return {
        type: "sine",
        frequency: { setValueAtTime() {} },
        connect() {}, disconnect() {}, start() {}, stop() {}, addEventListener() {}
      };
    }
    createGain() {
      return {
        gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} },
        connect() {}, disconnect() {}
      };
    }
    resume() { return Promise.resolve(); }
  }

  const document = {
    visibilityState: visible ? "visible" : "hidden",
    hidden: !visible,
    body: {},
    documentElement: { dataset: {} },
    hasFocus() { return focused; },
    getElementById() { return null; },
    querySelector() { return null; },
    addEventListener() {}
  };
  const window = {
    AudioContext: FakeAudioContext,
    webkitAudioContext: undefined,
    getComputedStyle() { return { display: "block", visibility: "visible" }; },
    setInterval() { return 1; },
    clearInterval() {},
    setTimeout() { return 1; },
    clearTimeout() {}
  };
  const context = {
    console,
    document,
    window,
    localStorage: storage,
    MutationObserver: class { observe() {} disconnect() {} },
    state: { settings: { timerPreferences: { sound: true, motivationalSound: true } } },
    floatingTimer: { goalId: "goal-1", elapsedSeconds: 20 * 60, paused: true },
    currentTimerSeconds() { return 20 * 60; },
    playTimerControlBeep() {},
    MetasQuestionAccuracySpectrum: {},
    Date,
    Promise,
    Object,
    String,
    Number,
    Math,
    Set,
    Map,
    WeakSet
  };
  context.globalThis = context;
  vm.runInNewContext(source, context, { filename: ROOT });
  return context.__ALDUS_TIMER_AUDIO_RECOVERY_V236__;
}

test("duas abas tratam 20 minutos de foco como o mesmo evento mesmo com frases diferentes", () => {
  const storage = sharedStorage();
  const first = loadRuntime({ storage });
  const second = loadRuntime({ storage });
  assert.equal(first.claimMotivationalSessionEvent("20 MINUTOS DE FOCO — primeira frase", 10, 10_000), true);
  assert.equal(second.claimMotivationalSessionEvent("20 MINUTOS DE FOCO — outra frase", 10, 10_100), false);
});

test("quota cheia não falha aberta em aba oculta", () => {
  const storage = sharedStorage({ quota: true });
  const hidden = loadRuntime({ storage, visible: false, focused: false });
  assert.equal(hidden.claimSharedAudioEvent("motivation:goal-1:focus-minutes:20", 60_000, 20_000), false);
});

test("quota cheia ainda permite um único fallback na aba visível e focada", () => {
  const storage = sharedStorage({ quota: true });
  const active = loadRuntime({ storage, visible: true, focused: true });
  assert.equal(active.claimSharedAudioEvent("motivation:goal-1:focus-minutes:20", 60_000, 20_000), true);
  assert.equal(active.claimSharedAudioEvent("motivation:goal-1:focus-minutes:20", 60_000, 20_100), false);
});

test("V396 alivia somente dados efêmeros quando detecta QuotaExceededError", () => {
  assert.match(source, /metasEstudoTimerMotivationalHistoryV161/);
  assert.match(source, /aldus:timer:diagnostics:v316/);
  assert.match(source, /metasEstudoTimerAudioEventV240/);
  assert.match(source, /QuotaExceededError/);
  assert.doesNotMatch(source, /metasEstudoTimerSessionSafety.*removeItem/s);
});

test("observador deixa de vigiar o body inteiro após encontrar os dois alvos", () => {
  assert.match(source, /if \(bound >= 2 && discoveryObserver\)/);
  assert.match(source, /discoveryObserver\.disconnect\(\)/);
  assert.match(source, /targetObserver\.observe\(element/);
});

test("V396 entra antes do núcleo nos dois bootstraps", () => {
  const protectedLoader = fs.readFileSync("bootstrap-integrity-loader-v275.js", "utf8");
  const legacyLoader = fs.readFileSync("bootstrap-integrity-loader-v258.js", "utf8");
  for (const loader of [protectedLoader, legacyLoader]) {
    assert.match(loader, /TIMER_AUDIO_STABILITY_SCRIPT = "timer-audio-stability-v396\.js\?v=20260825-timer-audio-stability-v396"/);
    assert.ok(loader.indexOf("parent.insertBefore(timerAudioStability") < loader.indexOf("parent.insertBefore(core"));
  }
  assert.match(protectedLoader, /await timerAudioReady/);
});

test("worker renova o cache e precacheia V396 sem remover fast paths", () => {
  const worker = fs.readFileSync("service-worker.js", "utf8");
  assert.match(worker, /TIMER_AUDIO_STABILITY_VERSION = "20260825-timer-audio-stability-v396"/);
  assert.match(worker, /timer-audio-stability-v396/);
  assert.match(worker, /TIMER_AUDIO_STABILITY,/);
  assert.match(worker, /&update=v395&audio=v396/);
  assert.match(worker, /async function cachedFirstNavigation/);
  assert.match(worker, /async function cacheFirstStatic/);
});

test("raiz e docs publicam exatamente a mesma V396 e mesmos bootstraps/workers", () => {
  for (const file of [
    ROOT,
    "bootstrap-integrity-loader-v275.js",
    "bootstrap-integrity-loader-v258.js",
    "service-worker.js",
    "service-worker-v378.js"
  ]) {
    assert.equal(fs.readFileSync(file, "utf8"), fs.readFileSync(`docs/${file}`, "utf8"), `${file} deve permanecer idêntico em docs`);
  }
  assert.match(source, /20260825-timer-audio-stability-v396/);
  assert.match(source, /focus-minutes:/);
});
