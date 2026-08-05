const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const source = fs.readFileSync("timer-audio-recovery-v236.js", "utf8");
const AUDIO_EVENT_KEY = "metasEstudoTimerAudioEventV240";

function sharedStorage() {
  const values = new Map();
  return {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); },
    values
  };
}

function runtime({ storage = sharedStorage(), now = 10_000 } = {}) {
  const oscillators = [];

  class FakeOscillator {
    constructor() {
      this.frequency = { setValueAtTime() {} };
      oscillators.push(this);
    }
    connect() {}
    disconnect() {}
    start() {}
    stop() {}
    addEventListener() {}
  }

  class FakeGain {
    constructor() {
      this.gain = {
        setValueAtTime() {},
        exponentialRampToValueAtTime() {}
      };
    }
    connect() {}
    disconnect() {}
  }

  class FakeAudioContext {
    constructor() {
      this.currentTime = 5;
      this.state = "running";
      this.destination = {};
    }
    createOscillator() { return new FakeOscillator(); }
    createGain() { return new FakeGain(); }
  }

  class FakeDate extends Date {
    static now() { return now; }
  }

  const document = {
    activeElement: null,
    body: {},
    documentElement: { dataset: {} },
    querySelector() { return null; },
    getElementById() { return null; },
    addEventListener() {}
  };
  const window = {
    AudioContext: FakeAudioContext,
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
    MutationObserver: class { observe() {} },
    state: { settings: { timerPreferences: { sound: true, motivationalSound: true } } },
    playTimerControlBeep() {},
    MetasQuestionAccuracySpectrum: {},
    setTimeout: window.setTimeout,
    clearTimeout: window.clearTimeout,
    Date: FakeDate,
    Promise,
    Object,
    String,
    Number,
    Math,
    Set
  };
  context.globalThis = context;
  vm.runInNewContext(source, context, { filename: "timer-audio-recovery-v236.js" });

  return {
    api: context.__ALDUS_TIMER_AUDIO_RECOVERY_V236__,
    oscillators,
    setNow(value) { now = value; }
  };
}

test("trava compartilhada do bip expira e permite repetição legítima", async () => {
  const storage = sharedStorage();
  const first = runtime({ storage, now: 10_000 });
  const second = runtime({ storage, now: 10_350 });
  await first.api.playControlSound("start");
  await second.api.playControlSound("start");
  assert.equal(first.oscillators.length + second.oscillators.length, 2);
});

test("trava compartilhada do alarme expira e permite o mesmo marco depois", async () => {
  const storage = sharedStorage();
  const first = runtime({ storage, now: 10_000 });
  const second = runtime({ storage, now: 11_500 });
  await first.api.playMotivationalSound("50% concluído", 50);
  await second.api.playMotivationalSound("50% concluído", 50);
  assert.equal(first.oscillators.length + second.oscillators.length, 4);
});

test("registro com horário futuro não bloqueia alarmes atuais", async () => {
  const storage = sharedStorage();
  storage.setItem(AUDIO_EVENT_KEY, JSON.stringify({
    version: 1,
    events: { "control:start": 20_000 }
  }));
  const current = runtime({ storage, now: 10_000 });
  await current.api.playControlSound("start");
  assert.equal(current.oscillators.length, 1);
});

test("armazenamento compartilhado corrompido não impede o som", async () => {
  const storage = sharedStorage();
  storage.setItem(AUDIO_EVENT_KEY, "{json inválido");
  const current = runtime({ storage });
  await current.api.playControlSound("pause");
  assert.equal(current.oscillators.length, 1);
});
