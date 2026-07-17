const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

function patchFunctionFrom(source) {
  const start = source.indexOf("function patchAppScriptSource");
  const endMarker = "\n}\n\nasync function patchAppScriptResponse";
  const end = source.indexOf(endMarker, start);
  assert.notEqual(start, -1, "função de correção não encontrada");
  assert.notEqual(end, -1, "fim da função de correção não encontrado");
  const functionSource = source.slice(start, end + 2);
  const context = {};
  vm.runInNewContext(`${functionSource}; patch = patchAppScriptSource;`, context);
  return context.patch;
}

for (const file of ["service-worker.js", "docs/service-worker.js"]) {
  test(`${file}: libera mensagens motivacionais no Cronômetro Livre com duração`, () => {
    const source = fs.readFileSync(file, "utf8");
    const patch = patchFunctionFrom(source);
    const original = [
      "const TIMER_MOTIVATIONAL_TOAST_DURATION_MS = 5000;",
      "if (!goal || !supportedMode || !planned || state.settings?.timerPreferences?.motivationalMessages === false) return;"
    ].join("\n");
    const result = patch(original);

    assert.match(result, /TIMER_MOTIVATIONAL_TOAST_DURATION_MS = 30000/);
    assert.match(result, /floatingTimer\.mode !== "free" && !goal/);
    assert.match(result, /\|\| !planned \|\|/);
    assert.doesNotMatch(result, /if \(!goal \|\| !supportedMode/);
  });
}

test("service worker publicado permanece sincronizado", () => {
  assert.equal(
    fs.readFileSync("service-worker.js", "utf8"),
    fs.readFileSync("docs/service-worker.js", "utf8")
  );
});
