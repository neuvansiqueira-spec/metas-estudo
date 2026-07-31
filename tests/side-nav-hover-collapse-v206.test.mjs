import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const moduleSource = fs.readFileSync(new URL("../side-nav-hover-collapse-v206.js", import.meta.url), "utf8");
const runtimeSource = fs.readFileSync(new URL("../runtime-entry-v200.js", import.meta.url), "utf8");
const workerSource = fs.readFileSync(new URL("../service-worker-v169.js", import.meta.url), "utf8");

test("remove a agulha e o controle de fixação no desktop", () => {
  assert.match(moduleSource, /data-side-nav-auto-hover/);
  assert.match(moduleSource, /display:none !important/);
  assert.doesNotMatch(moduleSource, /📌|📍|setPinned|PIN_KEY/);
});

test("mantém abertura e recolhimento automáticos", () => {
  assert.match(moduleSource, /pointerenter/);
  assert.match(moduleSource, /pointerleave/);
  assert.match(moduleSource, /setCollapsed\(false\)/);
  assert.match(moduleSource, /setCollapsed\(true\)/);
  assert.match(moduleSource, /data-side-nav-collapsed/);
});

test("preserva o botão original no mobile", () => {
  assert.match(moduleSource, /restoreMobileToggle/);
  assert.match(moduleSource, /removeAttribute\("data-side-nav-auto-hover"\)/);
  assert.match(moduleSource, /removeAttribute\("aria-hidden"\)/);
  assert.match(moduleSource, /removeAttribute\("tabindex"\)/);
});

test("runtime e service worker publicam a V206", () => {
  assert.match(runtimeSource, /20260731-remove-agulha-menu-lateral-v169/);
  assert.match(runtimeSource, /side-nav-hover-collapse-v206\.js/);
  assert.match(runtimeSource, /ALDUS_V206_NAV_MARKER/);
  assert.match(workerSource, /20260731-remove-agulha-menu-lateral-v206/);
});