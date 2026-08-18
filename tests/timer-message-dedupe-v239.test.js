const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const source = fs.readFileSync("timer-message-dedupe-v239.js", "utf8");

function runtime(messages = { 10: ["A", "B", "C", "D", "E", "F", "G"], 25: ["H", "I", "J", "K", "L", "M"] }) {
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
  return { context, api: context.__ALDUS_TIMER_MESSAGE_LAST_FIVE_V242__, store };
}

test("módulo publica a política das últimas cinco mensagens", () => {
  assert.match(source, /timer-message-last-five-hotfix1/);
  assert.match(source, /__ALDUS_TIMER_MESSAGE_LAST_FIVE_V242__/);
  assert.match(source, /const RECENT_WINDOW = 5/);
  assert.match(source, /if \(globalThis\[GLOBAL_KEY\]\) return/);
});

test("não repete nenhuma das últimas cinco quando há alternativa", () => {
  const { api } = runtime();
  for (const phrase of ["A", "B", "C", "D", "E"]) {
    assert.equal(api.selectPhrase(10, phrase), phrase);
  }
  assert.equal(api.selectPhrase(10, "A"), "F");
});

test("uma frase pode voltar depois de sair da janela das últimas cinco", () => {
  const { api } = runtime();
  for (const phrase of ["A", "B", "C", "D", "E", "F"]) {
    assert.equal(api.selectPhrase(10, phrase), phrase);
  }
  assert.equal(api.selectPhrase(10, "A"), "A");
});

test("seleção automática também evita as últimas cinco", () => {
  const { api } = runtime();
  for (const phrase of ["A", "B", "C", "D", "E"]) api.selectPhrase(10, phrase);
  assert.equal(api.selectPhrase(10), "F");
});

test("pool pequeno evita ao menos repetição consecutiva", () => {
  const { api } = runtime({ 10: ["A", "B", "C"] });
  assert.equal(api.selectPhrase(10, "A"), "A");
  assert.equal(api.selectPhrase(10, "B"), "B");
  assert.equal(api.selectPhrase(10, "C"), "C");
  assert.notEqual(api.selectPhrase(10, "C"), "C");
});

test("pool com uma única frase continua funcionando", () => {
  const { api } = runtime({ 10: ["Única"] });
  assert.equal(api.selectPhrase(10, "Única"), "Única");
  assert.equal(api.selectPhrase(10, "Única"), "Única");
});

test("disparo duplicado do mesmo marco em seis segundos continua suprimido", () => {
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

test("remove o invólucro antigo V239 antes de instalar a nova regra", () => {
  const { api } = runtime();
  const original = function originalPresenter() {};
  const previous = function previousGuard() {};
  Object.defineProperty(previous, "__aldusTimerMessageDedupeV239", { value: true });
  Object.defineProperty(previous, "__aldusOriginal", { value: original });
  assert.equal(api.unwrapPreviousGuard(previous), original);
});

test("controlador anterior preserva marcos, retomadas e permanência de 30 segundos", () => {
  const motivation = fs.readFileSync("timer-motivation-v159.js", "utf8");
  assert.match(motivation, /displayedMotivationalMilestones/);
  assert.match(motivation, /pending = reached\.filter\(\(milestone\) => !shown\.includes\(milestone\)\)/);
  assert.match(motivation, /justResumed = runtime\.lastPaused === true && floatingTimer\.paused === false/);
  assert.match(motivation, /const DISPLAY_DURATION_MS = 30000/);
  assert.match(motivation, /}, DISPLAY_DURATION_MS\);/);
});

test("publicação renova cache, carrega diretamente e mantém paridade", () => {
  require("./current-release-contract").assertCurrentReleaseContract();
});