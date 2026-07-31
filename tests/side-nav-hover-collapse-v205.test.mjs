import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const moduleSource = fs.readFileSync(new URL("../side-nav-hover-collapse-v205.js", import.meta.url), "utf8");
const runtimeSource = fs.readFileSync(new URL("../runtime-entry-v200.js", import.meta.url), "utf8");
const workerSource = fs.readFileSync(new URL("../service-worker-v169.js", import.meta.url), "utf8");

test("usa os seletores reais da estrutura publicada", () => {
  assert.match(moduleSource, /const LAYOUT_SELECTOR = "\.app-layout"/);
  assert.match(moduleSource, /const NAV_SELECTOR = "\[data-side-nav\]"/);
  assert.doesNotMatch(moduleSource, /const LAYOUT_SELECTOR = "\.app-shell"/);
  assert.doesNotMatch(moduleSource, /const NAV_SELECTOR = "#sideNav"/);
});

test("aciona o atributo real consumido pelo CSS premium", () => {
  assert.match(moduleSource, /ROOT_COLLAPSED_ATTRIBUTE = "data-side-nav-collapsed"/);
  assert.match(moduleSource, /root = document\.documentElement/);
  assert.match(moduleSource, /root\.setAttribute\(ROOT_COLLAPSED_ATTRIBUTE, collapsed \? "true" : "false"\)/);
  assert.match(moduleSource, /root\.removeAttribute\(ROOT_COLLAPSED_ATTRIBUTE\)/);
});

test("abre por aproximação, recolhe na saída e preserva toque", () => {
  assert.match(moduleSource, /pointerenter/);
  assert.match(moduleSource, /pointerleave/);
  assert.match(moduleSource, /setCollapsed\(false\)/);
  assert.match(moduleSource, /setCollapsed\(true\)/);
  assert.match(moduleSource, /\(hover: hover\) and \(pointer: fine\) and \(min-width: 761px\)/);
  assert.match(moduleSource, /restoreTogglePresentation/);
});

test("runtime e worker forçam a publicação da correção V205", () => {
  assert.match(runtimeSource, /20260731-corrige-menu-lateral-hover-v169/);
  assert.match(runtimeSource, /side-nav-hover-collapse-v205\.js/);
  assert.match(runtimeSource, /ALDUS_V205_NAV_MARKER/);
  assert.match(workerSource, /20260731-corrige-menu-lateral-hover-v205/);
  assert.match(workerSource, /importScripts\("\.\/runtime-entry-v200\.js"\)/);
});