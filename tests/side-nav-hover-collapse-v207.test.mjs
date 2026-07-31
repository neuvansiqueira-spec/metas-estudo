import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const moduleSource = fs.readFileSync(new URL("../side-nav-hover-collapse-v207.js", import.meta.url), "utf8");
const publicModuleSource = fs.readFileSync(new URL("../docs/side-nav-hover-collapse-v207.js", import.meta.url), "utf8");
const runtimeSource = fs.readFileSync(new URL("../runtime-entry-v200.js", import.meta.url), "utf8");
const workerSource = fs.readFileSync(new URL("../service-worker-v169.js", import.meta.url), "utf8");

test("título Navegação só aparece após a barra ganhar largura", () => {
  assert.match(moduleSource, /side-nav-title-text/);
  assert.match(moduleSource, /animation:aldusSideNavTitleRevealV207 \.14s ease \.22s forwards/);
  assert.match(moduleSource, /white-space:nowrap/);
  assert.match(moduleSource, /overflow:hidden/);
});

test("cabeçalho não mantém a coluna vazia do botão removido", () => {
  assert.match(moduleSource, /grid-template-columns:minmax\(0,1fr\) !important/);
  assert.match(moduleSource, /#sideNavToggle\[data-side-nav-auto-hover="true"\]/);
  assert.match(moduleSource, /display:none !important/);
});

test("mantém abertura automática e acessibilidade de movimento reduzido", () => {
  assert.match(moduleSource, /pointerenter/);
  assert.match(moduleSource, /pointerleave/);
  assert.match(moduleSource, /prefers-reduced-motion:reduce/);
  assert.match(moduleSource, /animation:none/);
});

test("raiz, docs, runtime e service worker publicam a V207", () => {
  assert.equal(moduleSource, publicModuleSource);
  assert.match(runtimeSource, /20260731-suaviza-titulo-navegacao-v169/);
  assert.match(runtimeSource, /side-nav-hover-collapse-v207\.js/);
  assert.match(runtimeSource, /ALDUS_V207_NAV_MARKER/);
  assert.match(workerSource, /20260731-suaviza-titulo-navegacao-v207/);
});