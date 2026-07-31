import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const moduleSource = fs.readFileSync(new URL("../side-nav-hover-collapse-v204.js", import.meta.url), "utf8");
const runtimeSource = fs.readFileSync(new URL("../runtime-entry-v200.js", import.meta.url), "utf8");

test("menu inicia recolhido no desktop e preserva mobile", () => {
  assert.match(moduleSource, /side-nav-collapsed/);
  assert.match(moduleSource, /shell\.classList\.toggle\(COLLAPSED_CLASS, !pinned\)/);
  assert.match(moduleSource, /min-width: 761px/);
  assert.match(moduleSource, /shell\.classList\.remove\(MODULE_CLASS, PINNED_CLASS, COLLAPSED_CLASS\)/);
});

test("aproximação abre e saída recolhe com atraso curto", () => {
  assert.match(moduleSource, /pointerenter/);
  assert.match(moduleSource, /pointerleave/);
  assert.match(moduleSource, /setCollapsed\(false\)/);
  assert.match(moduleSource, /setCollapsed\(true\)/);
  assert.match(moduleSource, /OPEN_DELAY_MS = 130/);
  assert.match(moduleSource, /CLOSE_DELAY_MS = 150/);
});

test("controle de fixação é acessível e usa preferência isolada", () => {
  assert.match(moduleSource, /aldus\.sideNavPinnedOpen\.v204/);
  assert.match(moduleSource, /aria-pressed/);
  assert.match(moduleSource, /Fixar menu lateral aberto/);
  assert.match(moduleSource, /stopImmediatePropagation/);
});

test("runtime carrega V204 após preservar V200 e V203", () => {
  assert.match(runtimeSource, /20260731-menu-lateral-hover-v169/);
  assert.match(runtimeSource, /planning-shift-disciplines-v200\.js/);
  assert.match(runtimeSource, /planning-shift-disciplines-visual-v201\.js/);
  assert.match(runtimeSource, /side-nav-hover-collapse-v204\.js/);
  assert.match(runtimeSource, /ALDUS_V204_NAV_MARKER/);
});
