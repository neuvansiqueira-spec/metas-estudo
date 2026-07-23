const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const source = fs.readFileSync("timer-safety-v132.js", "utf8");

function createContext() {
  const context = {
    console,
    floatingTimer: { mode: "free", sessionGoalMinutes: 0 },
    floatingTimerGoal: () => ({ id: "goal-1", minutes: 50 }),
    timerPlannedSeconds: () => 777,
    timerAlertMessage: () => "🚨 Faltam 1 minuto"
  };
  context.globalThis = context;
  vm.createContext(context);
  return context;
}

test("modo livre usa o tempo planejado da meta sem alterar o modo regressivo", () => {
  const context = createContext();
  vm.runInContext(source, context);

  assert.equal(context.timerPlannedSeconds(context.floatingTimerGoal()), 3000);

  context.floatingTimer.sessionGoalMinutes = 25;
  assert.equal(context.timerPlannedSeconds(context.floatingTimerGoal()), 1500);

  context.floatingTimer.mode = "countdown";
  assert.equal(context.timerPlannedSeconds(context.floatingTimerGoal()), 777);
});

test("texto de um minuto é corrigido sem modificar outras mensagens", () => {
  const context = createContext();
  vm.runInContext(source, context);
  assert.equal(context.timerAlertMessage(), "🚨 Falta 1 minuto");

  const otherContext = createContext();
  otherContext.timerAlertMessage = () => "⏳ Faltam 5 minutos";
  vm.runInContext(source, otherContext);
  assert.equal(otherContext.timerAlertMessage(), "⏳ Faltam 5 minutos");
});

test("aplicação é idempotente e registra o estado da correção", () => {
  const context = createContext();
  vm.runInContext(source, context);
  const firstPlannedFunction = context.timerPlannedSeconds;
  const firstAlertFunction = context.timerAlertMessage;

  vm.runInContext(source, context);

  assert.equal(context.timerPlannedSeconds, firstPlannedFunction);
  assert.equal(context.timerAlertMessage, firstAlertFunction);
  assert.deepEqual(
    JSON.parse(JSON.stringify(context.__aldusTimerSafetyV132Status)),
    { version: "20260722-cronometro-seguranca-v132", applied: true }
  );
});

test("raiz, docs e carregador permanecem sincronizados", () => {
  assert.equal(
    fs.readFileSync("timer-safety-v132.js", "utf8"),
    fs.readFileSync("docs/timer-safety-v132.js", "utf8")
  );
  const rootLoader = fs.readFileSync("central-goals-real-time-v124.js", "utf8");
  const docsLoader = fs.readFileSync("docs/central-goals-real-time-v124.js", "utf8");
  assert.equal(rootLoader, docsLoader);
  assert.equal((rootLoader.match(/timer-safety-v132\.js\?v=20260722-cronometro-seguranca-v132/g) || []).length, 1);
});
