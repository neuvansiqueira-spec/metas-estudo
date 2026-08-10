const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const ROOT_FILE = "timer-audio-recovery-v236.js";
const DOCS_FILE = "docs/timer-audio-recovery-v236.js";
const source = fs.readFileSync(ROOT_FILE, "utf8");

function createSharedStorage() {
  const values = new Map();
  return {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) { values.delete(key); },
    values
  };
}

function createDeferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function loadRuntime({
  now = 10_000,
  suspended = false,
  storage = createSharedStorage(),
  sound = true,
  motivationalSound = true,
  audioSupported = true
} = {}) {
  const events = {
    contexts: [],
    oscillators: [],
    gains: [],
    timers: [],
    clearedTimers: [],
    warnings: []
  };
  const resumeGate = createDeferred();

  class FakeOscillator {
    constructor() {
      this.frequency = { setValueAtTime() {} };
      this.starts = [];
      this.stops = [];
      this.listeners = {};
      this.disconnected = false;
      events.oscillators.push(this);
    }
    connect() {}
    disconnect() { this.disconnected = true; }
    start(at) { this.starts.push(at); }
    stop(at) { this.stops.push(at); }
    addEventListener(type, listener) { this.listeners[type] = listener; }
  }

  class FakeGain {
    constructor() {
      this.disconnected = false;
      this.gain = {
        setValueAtTime() {},
        exponentialRampToValueAtTime() {}
      };
      events.gains.push(this);
    }
    connect() {}
    disconnect() { this.disconnected = true; }
  }

  class FakeAudioContext {
    constructor() {
      this.currentTime = 5;
      this.state = suspended ? "suspended" : "running";
      this.destination = {};
      events.contexts.push(this);
    }
    createOscillator() { return new FakeOscillator(); }
    createGain() { return new FakeGain(); }
    resume() {
      if (!suspended) {
        this.state = "running";
        return Promise.resolve();
      }
      return resumeGate.promise.then(() => {
        this.state = "running";
      });
    }
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
    AudioContext: audioSupported ? FakeAudioContext : undefined,
    webkitAudioContext: undefined,
    getComputedStyle() { return { display: "block", visibility: "visible" }; },
    setInterval() { return 1; },
    clearInterval() {},
    setTimeout(callback, delay) {
      events.timers.push({ callback, delay });
      return events.timers.length;
    },
    clearTimeout(id) { events.clearedTimers.push(id); }
  };

  const context = {
    console: {
      ...console,
      warn(...args) { events.warnings.push(args); }
    },
    document,
    window,
    localStorage: storage,
    MutationObserver: class { observe() {} },
    state: { settings: { timerPreferences: { sound, motivationalSound } } },
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
  vm.runInNewContext(source, context, { filename: ROOT_FILE });

  return {
    api: context.__ALDUS_TIMER_AUDIO_RECOVERY_V236__,
    context,
    events,
    storage,
    setNow(value) { now = value; },
    releaseAudio() { resumeGate.resolve(); }
  };
}

async function flush() {
  await Promise.resolve();
  await Promise.resolve();
}

test("som desativado não cria AudioContext nem oscilador", async () => {
  const control = loadRuntime({ sound: false });
  assert.equal(await control.api.playControlSound("start"), false);
  assert.equal(control.events.contexts.length, 0);
  assert.equal(control.events.oscillators.length, 0);

  const motivation = loadRuntime({ motivationalSound: false });
  assert.equal(await motivation.api.playMotivationalSound("10% concluído", 10), false);
  assert.equal(motivation.events.contexts.length, 0);
  assert.equal(motivation.events.oscillators.length, 0);
});

test("controle repetido no mesmo instante emite somente um bip", async () => {
  const runtime = loadRuntime();
  await runtime.api.playControlSound("pause");
  await runtime.api.playControlSound("pause");
  assert.equal(runtime.events.oscillators.length, 1);
});

test("iniciar, pausar e continuar mantêm frequências e eventos distintos", async () => {
  const runtime = loadRuntime();
  await runtime.api.playControlSound("start");
  runtime.setNow(11_000);
  await runtime.api.playControlSound("pause");
  runtime.setNow(12_000);
  await runtime.api.playControlSound("resume");
  assert.equal(runtime.events.oscillators.length, 3);
  assert.equal(runtime.api.activeSound().kind, "control:resume");
});

test("duas chamadas de controle aguardando desbloqueio geram somente um bip", async () => {
  const runtime = loadRuntime({ suspended: true });
  const first = runtime.api.playControlSound("start");
  const second = runtime.api.playControlSound("start");
  await flush();
  assert.equal(runtime.events.oscillators.length, 0);
  runtime.releaseAudio();
  await Promise.all([first, second]);
  assert.equal(runtime.events.oscillators.length, 1);
});

test("duas chamadas motivacionais aguardando desbloqueio geram uma única melodia", async () => {
  const runtime = loadRuntime({ suspended: true });
  const first = runtime.api.playMotivationalSound("25% concluído", 25);
  const second = runtime.api.playMotivationalSound("25% concluído", 25);
  await flush();
  runtime.releaseAudio();
  await Promise.all([first, second]);
  assert.equal(runtime.events.oscillators.length, 2);
});

test("duas abas não reproduzem duas vezes o mesmo bip de controle", async () => {
  const storage = createSharedStorage();
  const firstTab = loadRuntime({ storage });
  const secondTab = loadRuntime({ storage });
  await firstTab.api.playControlSound("start");
  await secondTab.api.playControlSound("start");
  assert.equal(firstTab.events.oscillators.length + secondTab.events.oscillators.length, 1);
});

test("duas abas não reproduzem duas vezes o mesmo alarme motivacional", async () => {
  const storage = createSharedStorage();
  const firstTab = loadRuntime({ storage });
  const secondTab = loadRuntime({ storage });
  await firstTab.api.playMotivationalSound("50% concluído", 50);
  await secondTab.api.playMotivationalSound("50% concluído", 50);
  assert.equal(firstTab.events.oscillators.length + secondTab.events.oscillators.length, 2);
});

test("mesmo marco não volta a tocar quando a mensagem muda depois da janela curta", async () => {
  const runtime = loadRuntime();
  await runtime.api.playMotivationalSound("10% concluído — primeira mensagem", 10);
  runtime.setNow(20_000);
  await runtime.api.playMotivationalSound("10% concluído — segunda mensagem", 10);
  assert.equal(runtime.events.oscillators.length, 2);
  assert.equal(runtime.api.activeSound(), null);
});

test("FOCO RETOMADO repetido no mesmo trecho não mantém o alarme tocando", async () => {
  const runtime = loadRuntime();
  await runtime.api.playMotivationalSound("FOCO RETOMADO Respire fundo e proteja o ritmo conquistado.", 10);
  runtime.setNow(20_000);
  await runtime.api.playMotivationalSound("FOCO RETOMADO Continue no ritmo conquistado.", 10);
  assert.equal(runtime.events.oscillators.length, 2);
  assert.equal(runtime.api.activeSound(), null);
});

test("marco seguinte continua emitindo som após o anterior", async () => {
  const runtime = loadRuntime();
  await runtime.api.playMotivationalSound("25% concluído", 25);
  runtime.setNow(12_000);
  await runtime.api.playMotivationalSound("50% concluído", 50);
  assert.equal(runtime.events.oscillators.length, 4);
  assert.equal(runtime.api.activeSound().kind, "motivation");
});

test("alarme final impede que um aviso comum de menor prioridade o interrompa", async () => {
  const runtime = loadRuntime();
  await runtime.api.playMotivationalSound("100% concluído", 100);
  assert.equal(runtime.events.oscillators.length, 3);
  runtime.setNow(12_000);
  await runtime.api.playMotivationalSound("80% concluído", 80);
  assert.equal(runtime.events.oscillators.length, 3);
  assert.equal(runtime.api.activeSound().kind, "motivation:final");
});

test("prévia solicitada pelo usuário pode substituir qualquer som ativo", async () => {
  const runtime = loadRuntime();
  await runtime.api.playMotivationalSound("100% concluído", 100);
  await runtime.api.playMotivationalSound("prévia", 10, { preview: true });
  assert.equal(runtime.events.oscillators.length, 5);
  assert.equal(runtime.api.activeSound().kind, "motivation");
  assert.ok(runtime.events.oscillators.slice(0, 3).every((oscillator) => oscillator.stops.length >= 2));
});

test("limpeza programada interrompe e desconecta todos os nós ativos", async () => {
  const runtime = loadRuntime();
  await runtime.api.playMotivationalSound("75% concluído", 75);
  const cleanup = runtime.events.timers.find((timer) => timer.delay >= 500 && timer.delay <= 700);
  assert.ok(cleanup, "a melodia deve agendar limpeza de segurança");
  cleanup.callback();
  assert.equal(runtime.api.activeSound(), null);
  assert.ok(runtime.events.oscillators.every((oscillator) => oscillator.disconnected));
  assert.ok(runtime.events.gains.every((gain) => gain.disconnected));
});

test("navegador sem Web Audio falha de modo seguro e mantém aviso visual", async () => {
  const runtime = loadRuntime({ audioSupported: false });
  assert.equal(await runtime.api.playControlSound("start"), false);
  assert.equal(await runtime.api.playMotivationalSound("10% concluído", 10), false);
  assert.equal(runtime.events.oscillators.length, 0);
});

test("singleton impede instalação duplicada do controlador na mesma página", () => {
  const runtime = loadRuntime();
  const api = runtime.api;
  vm.runInNewContext(source, runtime.context, { filename: ROOT_FILE });
  assert.equal(runtime.context.__ALDUS_TIMER_AUDIO_RECOVERY_V236__, api);
  assert.equal(runtime.events.contexts.length, 0);
});

test("raiz, docs, loader e cache publicam a proteção ampliada", () => {
  assert.equal(source, fs.readFileSync(DOCS_FILE, "utf8"));
  assert.match(source, /timer-audio-recovery-hotfix5/);
  assert.match(source, /metasEstudoTimerAudioSessionEventV297/);
  assert.match(source, /claimMotivationalSessionEvent/);
  assert.match(source, /focus-resumed/);

  for (const file of ["planning-integrity-loader-v235.js", "docs/planning-integrity-loader-v235.js"]) {
    assert.match(fs.readFileSync(file, "utf8"), /TIMER_AUDIO_HOTFIX = "timer-audio-recovery-hotfix5"/);
  }
  for (const file of ["service-worker.js", "docs/service-worker.js"]) {
    const worker = fs.readFileSync(file, "utf8");
    assert.match(worker, /timer-alarm-audio-v297-hotfix5/);
    assert.match(worker, /timer-audio-recovery-hotfix5/);
  }
});
