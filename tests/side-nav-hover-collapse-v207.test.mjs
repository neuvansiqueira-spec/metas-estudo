import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const moduleSource = fs.readFileSync(new URL("../side-nav-hover-collapse-v207.js", import.meta.url), "utf8");
const publicModuleSource = fs.readFileSync(new URL("../docs/side-nav-hover-collapse-v207.js", import.meta.url), "utf8");

test("título e grupos entram suavemente depois que a barra começa a abrir", () => {
  assert.match(moduleSource, /side-nav-title-text/);
  assert.match(moduleSource, /animation:aldusSideNavTitleRevealV207 \\.14s ease \\.08s forwards/);
  assert.match(moduleSource, /aldusSideNavGroupsRevealV207/);
  assert.match(moduleSource, /white-space:nowrap/);
  assert.match(moduleSource, /overflow:hidden/);
});

test("cabeçalho não mantém a coluna vazia do botão removido", () => {
  assert.match(moduleSource, /grid-template-columns:minmax\\(0,1fr\\) !important/);
  assert.match(moduleSource, /#sideNavToggle\\[data-side-nav-auto-hover="true"\\]/);
  assert.match(moduleSource, /display:none !important/);
});

test("abertura automática preserva teclado, ponteiro e movimento reduzido", () => {
  assert.match(moduleSource, /pointerenter/);
  assert.match(moduleSource, /pointerleave/);
  assert.match(moduleSource, /focusin", openNow/);
  assert.match(moduleSource, /prefers-reduced-motion:reduce/);
  assert.match(moduleSource, /animation:none !important/);
});

test("layout não desloca o painel e não reinicia o estado por timers tardios", () => {
  assert.match(moduleSource, /--aldus-side-nav-collapsed-width:76px/);
  assert.match(moduleSource, /--aldus-side-nav-expanded-width:224px/);
  assert.match(moduleSource, /transition-property:width,padding,box-shadow/);
  assert.doesNotMatch(moduleSource, /transition-property:grid-template-columns/);
  assert.doesNotMatch(moduleSource, /setTimeout\\(applyDesktopState,\\s*(?:180|250|700|800)\\)/);
});

test("raiz e docs publicam a mesma V207 corrigida", () => {
  assert.equal(moduleSource, publicModuleSource);
});
