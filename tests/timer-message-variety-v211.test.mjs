import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const source = fs.readFileSync(new URL("../timer-message-variety-v211.js", import.meta.url), "utf8");

function createContext() {
  const storage = new Map();
  const context = {
    console,
    Math: Object.create(Math),
    JSON,
    Set,
    Uint32Array,
    Promise,
    localStorage: {
      getItem(key) { return storage.has(key) ? storage.get(key) : null; },
      setItem(key, value) { storage.set(key, String(value)); }
    },
    TIMER_MOTIVATIONAL_MESSAGES: {
      10: ["existente 10 A", "existente 10 B"],
      25: ["existente 25 A", "existente 25 B"],
      40: ["existente 40 A", "existente 40 B"],
      50: ["existente 50 A", "existente 50 B"],
      65: ["existente 65 A", "existente 65 B"],
      75: ["existente 75 A", "existente 75 B"],
      90: ["existente 90 A", "existente 90 B"],
      100: ["existente 100 A", "existente 100 B"]
    },
    readTimerMotivationalHistory() {
      try { return JSON.parse(storage.get("motivation") || "{}"); } catch { return {}; }
    },
    writeTimerMotivationalHistory(history) {
      storage.set("motivation", JSON.stringify(history));
    },
    chooseTimerMotivationalMessage() { return "fallback"; },
    floatingTimer: {},
    floatingTimerGoal() { return { id: "goal" }; },
    async triggerTimerAlert() { return "ok"; },
    timerAlertMessage() { return "⏳ Faltam 5 minutos"; },
    timerAlertTitle(type) { return type; },
    globalThis: null
  };
  context.Math.random = () => 0;
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(source, context);
  return { context, storage };
}

test("amplia o banco motivacional para 12 frases em cada marco no cenário de teste", () => {
  const { context } = createContext();
  for (const milestone of [10, 25, 40, 50, 65, 75, 90, 100]) {
    assert.equal(context.TIMER_MOTIVATIONAL_MESSAGES[milestone].length, 12);
    assert.equal(new Set(context.TIMER_MOTIVATIONAL_MESSAGES[milestone]).size, 12);
  }
});

test("oferece 24 avisos únicos para os cinco minutos finais", () => {
  const { context } = createContext();
  const messages = [...context.AldusTimerMessageVarietyV211.fiveMinuteMessages];
  assert.equal(messages.length, 24);
  assert.equal(new Set(messages).size, 24);
  assert.ok(messages.every((message) => /5 minutos|Cinco minutos/i.test(message)));
});

test("não repete aviso antes de esgotar o ciclo nem na virada do ciclo", () => {
  const { context } = createContext();
  const sequence = Array.from({ length: 24 }, () =>
    context.AldusTimerMessageVarietyV211.chooseFiveMinuteMessage()
  );
  assert.equal(new Set(sequence).size, 24);
  const next = context.AldusTimerMessageVarietyV211.chooseFiveMinuteMessage();
  assert.notEqual(next, sequence.at(-1));
});

test("não repete mensagem motivacional antes de esgotar o marco", () => {
  const { context } = createContext();
  const sequence = Array.from({ length: 12 }, () => context.chooseTimerMotivationalMessage(50));
  assert.equal(new Set(sequence).size, 12);
  const next = context.chooseTimerMotivationalMessage(50);
  assert.notEqual(next, sequence.at(-1));
});

test("usa uma única frase escolhida durante o aviso visual e a notificação", async () => {
  const { context } = createContext();
  await context.triggerTimerAlert("five-minutes", context.floatingTimerGoal());
  const visible = context.timerAlertMessage(context.floatingTimerGoal());
  const notification = context.timerAlertTitle("five-minutes");
  assert.equal(visible, `⏳ ${notification}`);
});
