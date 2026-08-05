const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const source = fs.readFileSync("timer-message-dedupe-v239.js", "utf8");

function runtime(messages = { 10: ["A", "B", "C"], 25: ["D", "E"] }) {
  const store = new Map();
  const context = {
    console,
    Date,
    JSON,
    Object,
    String,
    Number,
    Array,
    Set,
    Math,
    RegExp,
    TIMER_MOTIVATIONAL_MESSAGES: messages,
    localStorage: {
      getItem(key) { return store.has(key) ? store.get(key) : null; },
      setItem(key, value) { store.set(key, String(value)); }
    }
  };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(source, context);
  return { context, api: context.__ALDUS_TIMER_MESSAGE_DEDUPE_V239__, store };
}

test("módulo publica singleton e hotfix de repetição", () => {
  assert.match(source, /timer-message-dedupe-hotfix1/);
  assert.match(source, /__ALDUS_TIMER_MESSAGE_DEDUPE_V239__/);
  assert.match(source, /if \(globalThis\[GLOBAL_KEY\]\) return/);
});

test("a mesma frase consecutiva é substituída quando há alternativa", () => {
  const { api } = runtime();
  assert.equal(api.selectPhrase(10, "A"), "A");
  assert.equal(api.selectPhrase(10, "A"), "B");
});

test("frase pode voltar depois de outra sem bloqueio permanente", () => {
  const { api } = runtime();
  assert.equal(api.selectPhrase(10, "A"), "A");
  assert.equal(api.selectPhrase(10, "B"), "B");
  assert.equal(api.selectPhrase(10, "A"), "A");
});

test("pool com uma única frase continua funcionando", () => {
  const { api } = runtime({ 10: ["Única"] });
  assert.equal(api.selectPhrase(10, "Única"), "Única");
  assert.equal(api.selectPhrase(10, "Única"), "Única");
});

test("disparo duplicado do mesmo marco em seis segundos é suprimido", () => {
  const { api } = runtime();
  assert.equal(api.registerEvent(50, 1000), true);
  assert.equal(api.registerEvent(50, 6999), false);
  assert.equal(api.registerEvent(50, 7000), true);
});

test("marcos diferentes não são confundidos", () => {
  const { api } = runtime();
  assert.equal(api.registerEvent(25, 1000), true);
  assert.equal(api.registerEvent(40, 1100), true);
});

test("controlador anterior já protege marcos e retomadas", () => {
  const motivation = fs.readFileSync("timer-motivation-v159.js", "utf8");
  assert.match(motivation, /displayedMotivationalMilestones/);
  assert.match(motivation, /pending = reached\.filter\(\(milestone\) => !shown\.includes\(milestone\)\)/);
  assert.match(motivation, /justResumed = runtime\.lastPaused === true && floatingTimer\.paused === false/);
  assert.match(motivation, /FALLBACK_INTERVAL_MS = 12 \* 60 \* 1000/);
});

test("publicação carrega o módulo e mantém raiz e docs em paridade", () => {
  const worker = fs.readFileSync("service-worker.js", "utf8");
  assert.match(worker, /timer-message-dedupe-v239\.js/);
  assert.match(worker, /timer-message-dedupe-hotfix1/);
  assert.equal(source, fs.readFileSync("docs/timer-message-dedupe-v239.js", "utf8"));
  assert.equal(worker, fs.readFileSync("docs/service-worker.js", "utf8"));
});