const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

function patchFunctionsFrom(source) {
  const start = source.indexOf('const PREVIOUS_VERSION =');
  const endMarker = '\nasync function patchTextResponse';
  const end = source.indexOf(endMarker, start);
  assert.notEqual(start, -1, "constantes de versão não encontradas");
  assert.notEqual(end, -1, "fim das funções de correção não encontrado");

  const block = source.slice(start, end);
  const context = {
    self: { addEventListener() {}, skipWaiting() {}, clients: { claim() {} } },
    caches: { open: async () => ({ addAll() {}, put() {} }), keys: async () => [], delete: async () => true, match: async () => null },
    fetch: async () => ({ ok: false }),
    Headers,
    Response,
    URL,
    console
  };
  vm.runInNewContext(`${block}; result = { replaceVersion, patchHtmlSource, patchAppScriptSource, CURRENT_VERSION };`, context);
  return context.result;
}

for (const file of ["service-worker.js", "docs/service-worker.js"]) {
  test(`${file}: configura o Cronômetro Livre com a duração da meta`, () => {
    const source = fs.readFileSync(file, "utf8");
    const patch = patchFunctionsFrom(source);
    const original = [
      'const APP_VERSION = "20260717-numero-qc-v26";',
      'const TIMER_MOTIVATIONAL_TOAST_DURATION_MS = 5000;',
      'if (!goal || !supportedMode || !planned || state.settings?.timerPreferences?.motivationalMessages === false) return;',
      'const sessionGoalMinutes = selectedMode === "free" ? 0 : 0;',
      'function timerPlannedSeconds(goal = floatingTimerGoal()) { return floatingTimer.mode === "free" ? Math.max(0, Math.round((Number(floatingTimer.sessionGoalMinutes) || 0) * 60)) : Math.max(0, Math.round((Number(goal?.minutes) || 0) * 60)); }'
    ].join("\n");

    const result = patch.patchAppScriptSource(original);
    assert.equal(patch.CURRENT_VERSION, "20260717-sincronizacao-integral-cronometro-v29");
    assert.match(result, /APP_VERSION = "20260717-sincronizacao-integral-cronometro-v29"/);
    assert.match(result, /TIMER_MOTIVATIONAL_TOAST_DURATION_MS = 30000/);
    assert.match(result, /floatingTimer\.mode !== "free" && !goal/);
    assert.doesNotMatch(result, /if \(!goal \|\| !supportedMode/);
    assert.match(result, /sessionGoalMinutes = selectedMode === "free" \? Math\.max\(0, Number\(goal\.minutes\) \|\| 0\) : 0/);
    assert.doesNotMatch(result, /sessionGoalMinutes = selectedMode === "free" \? 0 : 0/);
    assert.match(result, /Number\(floatingTimer\.sessionGoalMinutes\) \|\| Number\(goal\?\.minutes\) \|\| 0/);

    const html = patch.patchHtmlSource('<p>Versão: 20260717-numero-qc-v26</p>');
    assert.equal(html, '<p>Versão: 20260717-sincronizacao-integral-cronometro-v29</p>');
  });
}

test("service worker publicado permanece sincronizado", () => {
  assert.equal(
    fs.readFileSync("service-worker.js", "utf8"),
    fs.readFileSync("docs/service-worker.js", "utf8")
  );
});
