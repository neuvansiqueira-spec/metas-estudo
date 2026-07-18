const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

function patchFunctionsFrom(source) {
  const start = source.indexOf('const PREVIOUS_DEPLOYMENT_VERSIONS =');
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
  test(`${file}: mantém correções históricas na versão atual`, () => {
    const source = fs.readFileSync(file, "utf8");
    const patch = patchFunctionsFrom(source);
    const currentVersion = JSON.parse(fs.readFileSync("package.json", "utf8")).version;
    const original = [
      'const APP_VERSION = "20260717-numero-qc-v26";',
      'const TIMER_MOTIVATIONAL_TOAST_DURATION_MS = 5000;',
      'if (!goal || !supportedMode || !planned || state.settings?.timerPreferences?.motivationalMessages === false) return;',
      'const sessionGoalMinutes = selectedMode === "free" ? 0 : 0;',
      'function timerPlannedSeconds(goal = floatingTimerGoal()) { return floatingTimer.mode === "free" ? Math.max(0, Math.round((Number(floatingTimer.sessionGoalMinutes) || 0) * 60)) : Math.max(0, Math.round((Number(goal?.minutes) || 0) * 60)); }'
    ].join("\n");

    const result = patch.patchAppScriptSource(original);
    assert.equal(patch.CURRENT_VERSION, currentVersion);
    assert.match(result, new RegExp(`APP_VERSION = "${currentVersion}"`));
    assert.match(result, /TIMER_MOTIVATIONAL_TOAST_DURATION_MS = 30000/);
    assert.match(result, /floatingTimer\.mode !== "free" && !goal/);
    assert.match(result, /sessionGoalMinutes = selectedMode === "free" \? Math\.max\(0, Number\(goal\.minutes\) \|\| 0\) : 0/);
    assert.match(result, /Number\(floatingTimer\.sessionGoalMinutes\) \|\| Number\(goal\?\.minutes\) \|\| 0/);
    assert.doesNotMatch(result, /__timerMotivationPwaFallbackV31/);

    const html = patch.patchHtmlSource('<p>Versão: 20260717-numero-qc-v26</p></body>');
    assert.match(html, new RegExp(`Versão: ${currentVersion}`));
    assert.match(html, new RegExp(`question-accuracy-spectrum\\.js\\?v=${currentVersion}`));
    assert.equal((html.match(/question-accuracy-spectrum\.js/g) || []).length, 1);

    const oldInjected = patch.patchHtmlSource('<script src="question-accuracy-spectrum.js?v=antiga"></script></body>');
    assert.equal((oldInjected.match(/question-accuracy-spectrum\.js/g) || []).length, 1);
    assert.match(oldInjected, new RegExp(`question-accuracy-spectrum\\.js\\?v=${currentVersion}`));
  });
}

test("service worker publicado permanece sincronizado", () => {
  assert.equal(
    fs.readFileSync("service-worker.js", "utf8"),
    fs.readFileSync("docs/service-worker.js", "utf8")
  );
});
