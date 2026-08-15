const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const script = fs.readFileSync("script.js", "utf8");
const style = fs.readFileSync("style.css", "utf8");

function functionSource(name, nextName) {
  const start = script.indexOf(`function ${name}`);
  const end = script.indexOf(`function ${nextName}`, start);
  assert.ok(start >= 0, `${name} não foi encontrada`);
  assert.ok(end > start, `${nextName} deve vir depois de ${name}`);
  return script.slice(start, end);
}

test("o bootstrap não escurece a interface", () => {
  assert.doesNotMatch(
    style,
    /body\.app-bootstrapping\s+\.app-layout\s*\{[^}]*opacity\s*:/s
  );
  const show = functionSource("showBootstrapLoadingState()", "hideBootstrapLoadingState");
  assert.doesNotMatch(show, /app-bootstrapping/);
  assert.doesNotMatch(show, /layout\.setAttribute\("inert", ""\)/);
  assert.match(show, /layout\.removeAttribute\("inert"\)/);
});

test("a proteção temporária é removida quando o núcleo fica pronto", () => {
  const hide = functionSource("hideBootstrapLoadingState()", "safeReadLocalStorageStateForBootstrap");
  assert.match(hide, /layout\.removeAttribute\("aria-busy"\)/);
  assert.match(hide, /layout\.removeAttribute\("inert"\)/);
});

test("a tela visível é alinhada à rota antes da leitura dos dados", () => {
  const show = functionSource("showBootstrapLoadingState()", "hideBootstrapLoadingState");
  const align = functionSource("alignBootstrapShellToRouteV169()", "enhanceCollapsibleSections");
  assert.match(show, /alignBootstrapShellToRouteV169\(\)/);
  assert.match(align, /const target = hashToView\(\)/);
  assert.match(align, /panel\.hidden = !active/);
  assert.match(align, /aria-current/);
  assert.doesNotMatch(align, /renderView|saveData|localStorage|indexedDB|tombstone/i);
});
