const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

function loadAudioRuntime(source) {
  const events = { oscillators: [], timers: [] };

  class FakeOscillator {
    constructor() {
      this.frequency = { setValueAtTime() {} };
      this.starts = [];
      this.stops = [];
      this.listeners = {};
      events.oscillators.push(this);
    }
    connect() {}
    disconnect() {}
    start(at) { this.starts.push(at); }
    stop(at) { this.stops.push(at); }
    addEventListener(type, listener) { this.listeners[type] = listener; }
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
      this.currentTime = 10;
      this.state = "running";
      this.destination = {};
    }
    createOscillator() { return new FakeOscillator(); }
    createGain() { return new FakeGain(); }
    async resume() { this.state = "running"; }
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
    setTimeout(callback, delay) {
      events.timers.push({ callback, delay });
      return events.timers.length;
    },
    clearTimeout() {}
  };

  const context = {
    console,
    document,
    window,
    localStorage: { getItem() { return null; } },
    MutationObserver: class { observe() {} },
    state: { settings: { timerPreferences: { sound: true, motivationalSound: true } } },
    playTimerControlBeep() {},
    MetasQuestionAccuracySpectrum: {},
    setTimeout: window.setTimeout,
    clearTimeout: window.clearTimeout,
    Date
  };
  context.globalThis = context;
  vm.runInNewContext(source, context, { filename: "timer-audio-recovery-v236.js" });
  return { api: context.__ALDUS_TIMER_AUDIO_RECOVERY_V236__, events };
}

for (const file of ["timer-audio-recovery-v236.js", "docs/timer-audio-recovery-v236.js"]) {
  test(`${file}: usa arbitragem única e hotfix3`, () => {
    const source = fs.readFileSync(file, "utf8");
    assert.match(source, /timer-audio-recovery-hotfix3/);
    assert.match(source, /function beginSound\(/);
    assert.match(source, /if \(priority < activeSound\.priority\) return null/);
    assert.match(source, /stopSound\(activeSound\)/);
  });
}

test("som motivacional substitui bip de controle sem tocar em paralelo", async () => {
  const source = fs.readFileSync("timer-audio-recovery-v236.js", "utf8");
  const { api, events } = loadAudioRuntime(source);

  await api.playControlSound("pause");
  assert.equal(events.oscillators.length, 1);
  assert.equal(api.activeSound().kind, "control:pause");

  await api.playMotivationalSound("10% concluído", 10);
  assert.equal(events.oscillators.length, 3);
  assert.equal(api.activeSound().kind, "motivation");
  assert.ok(events.oscillators[0].stops.length >= 2, "o bip anterior deve ser interrompido ao começar o aviso prioritário");
});

test("bip de controle é suprimido enquanto aviso motivacional prioritário está ativo", async () => {
  const source = fs.readFileSync("timer-audio-recovery-v236.js", "utf8");
  const { api, events } = loadAudioRuntime(source);

  await api.playMotivationalSound("50% concluído", 50);
  assert.equal(events.oscillators.length, 2);
  await api.playControlSound("resume");
  assert.equal(events.oscillators.length, 2);
  assert.equal(api.activeSound().kind, "motivation");
});

test("melodia motivacional agenda notas em sequência, sem sobreposição interna", async () => {
  const source = fs.readFileSync("timer-audio-recovery-v236.js", "utf8");
  const { api, events } = loadAudioRuntime(source);

  await api.playMotivationalSound("marco:20", 20);
  assert.equal(events.oscillators.length, 2);
  const firstStop = events.oscillators[0].stops[0];
  const secondStart = events.oscillators[1].starts[0];
  assert.ok(secondStart >= firstStop, `a segunda nota (${secondStart}) não pode começar antes do fim da primeira (${firstStop})`);
});

test("aviso final substitui aviso comum e mantém três notas sequenciais", async () => {
  const source = fs.readFileSync("timer-audio-recovery-v236.js", "utf8");
  const { api, events } = loadAudioRuntime(source);

  await api.playMotivationalSound("80% concluído", 80);
  await api.playMotivationalSound("100% concluído", 100);
  assert.equal(api.activeSound().kind, "motivation:final");
  const finalOscillators = events.oscillators.slice(-3);
  assert.equal(finalOscillators.length, 3);
  assert.ok(finalOscillators[1].starts[0] >= finalOscillators[0].stops[0]);
  assert.ok(finalOscillators[2].starts[0] >= finalOscillators[1].stops[0]);
});

test("arquivos publicados permanecem idênticos", () => {
  assert.equal(
    fs.readFileSync("timer-audio-recovery-v236.js", "utf8"),
    fs.readFileSync("docs/timer-audio-recovery-v236.js", "utf8")
  );
});

test("loader e service worker publicam o hotfix3 nas duas árvores", () => {
  for (const file of ["planning-integrity-loader-v235.js", "docs/planning-integrity-loader-v235.js"]) {
    assert.match(fs.readFileSync(file, "utf8"), /TIMER_AUDIO_HOTFIX = "timer-audio-recovery-hotfix3"/);
  }
  for (const file of ["service-worker.js", "docs/service-worker.js"]) {
    const source = fs.readFileSync(file, "utf8");
    assert.match(source, /timer-sound-overlap-v238-hotfix3/);
    assert.match(source, /timer-audio-recovery-hotfix3/);
  }
});
