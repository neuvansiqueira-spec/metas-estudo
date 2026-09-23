const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const version = JSON.parse(fs.readFileSync("package.json", "utf8")).version;
const suffix = version.match(/v\d+$/)?.[0];
const nav = fs.readFileSync("side-nav-hover-collapse-v207.js", "utf8");
const mobile = fs.readFileSync("aldus-responsive-v52.css", "utf8");
const app = fs.readFileSync("app-" + suffix + ".js", "utf8");
const css = fs.readFileSync("app-" + suffix + ".css", "utf8");

test("menu móvel mostra os links imediatamente ao abrir", () => {
  assert.match(mobile, /visibility 0s linear \.2s !important/);
  assert.match(mobile, /visibility 0s linear 0s !important/);
});

test("barra lateral expande sem deslocar o painel", () => {
  assert.match(nav, /--aldus-side-nav-collapsed-width:76px/);
  assert.match(nav, /--aldus-side-nav-expanded-width:224px/);
  assert.match(nav, /transition-property:width,padding,box-shadow/);
  assert.doesNotMatch(nav, /transition-property:grid-template-columns/);
});

test("teclado abre imediatamente e não há resets tardios", () => {
  assert.match(nav, /const CLOSE_DELAY_MS = 320/);
  assert.match(nav, /focusin", openNow/);
  assert.doesNotMatch(nav, /setTimeout\(applyDesktopState,\s*(?:180|250|700|800)\)/);
});

test("bundle V424 incorpora a correção e raiz/docs ficam espelhados", () => {
  assert.match(app, /const CLOSE_DELAY_MS = 320/);
  assert.match(app, /focusin", openNow/);
  assert.match(css, /visibility 0s linear 0s !important/);
  assert.equal(app, fs.readFileSync("docs/app-" + suffix + ".js", "utf8"));
  assert.equal(css, fs.readFileSync("docs/app-" + suffix + ".css", "utf8"));
  assert.equal(nav, fs.readFileSync("docs/side-nav-hover-collapse-v207.js", "utf8"));
  assert.equal(mobile, fs.readFileSync("docs/aldus-responsive-v52.css", "utf8"));
});
