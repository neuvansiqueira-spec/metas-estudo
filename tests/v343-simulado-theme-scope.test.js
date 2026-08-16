const assert = require("node:assert/strict");
const fs = require("node:fs");
const test = require("node:test");

function read(path) {
  return fs.readFileSync(path, "utf8");
}

test("V343 aplica o tema premium ao gerador dentro de Simulados", () => {
  const css = read("daily-summary-elegant-nested-v252.css");

  assert.match(css, /#view-simulados \.factory-simulado-disciplines/);
  assert.match(css, /#view-simulados \.factory-simulado-discipline-list label/);
  assert.match(css, /#view-simulados \.factory-simulado-discipline-list label span/);
  assert.match(css, /#view-simulados \.factory-simulado-theme-mode/);
  assert.match(css, /#view-simulados \.factory-simulado-options/);
  assert.match(css, /background: #0a2b45/);
  assert.match(css, /color: #f8fbff !important/);
});

test("V343 mantém o hotfix restrito ao modo premium e à tela de Simulados", () => {
  const css = read("daily-summary-elegant-nested-v252.css");
  const v343 = css.slice(css.indexOf("/* V343"));

  assert.ok(v343.length > 0);
  assert.doesNotMatch(v343, /(^|\n)\.factory-simulado-/);
  assert.match(v343, /html\[data-aldus-theme="premium-stable"\] #view-simulados/);
});

test("V343 usa uma folha já carregada depois do bundle principal", () => {
  const html = read("index.html");
  const app = html.indexOf('id="aldusAppBundleStyles"');
  const hotfixHost = html.indexOf("daily-summary-elegant-nested-v252.css");

  assert.ok(app >= 0);
  assert.ok(hotfixHost > app);
});

test("V343 mantém paridade entre raiz e docs", () => {
  assert.equal(
    read("daily-summary-elegant-nested-v252.css"),
    read("docs/daily-summary-elegant-nested-v252.css")
  );
});
