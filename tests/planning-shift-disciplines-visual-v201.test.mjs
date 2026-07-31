import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const visual = fs.readFileSync(new URL("../planning-shift-disciplines-visual-v201.js", import.meta.url), "utf8");
const runtime = fs.readFileSync(new URL("../runtime-entry-v200.js", import.meta.url), "utf8");

test("remove o cartão branco fixo e herda o tema", () => {
  assert.match(visual, /background:none/);
  assert.match(visual, /color:inherit/);
  assert.doesNotMatch(visual, /#f7fbff|#eef6ff|background:#fff/);
});

test("mantém o campo alinhado aos demais controles", () => {
  assert.match(visual, /width:100%/);
  assert.match(visual, /min-height:68px/);
  assert.match(visual, /margin-top:10px/);
});

test("texto auxiliar permanece legível nos dois temas", () => {
  assert.match(visual, /opacity:\.68/);
  assert.match(visual, /font-weight:600/);
  assert.match(visual, /line-height:1\.45/);
});

test("runtime V201 injeta o ajuste depois do módulo funcional V200", () => {
  const functional = runtime.indexOf("ALDUS_V200_MARKER");
  const visualMarker = runtime.indexOf("ALDUS_V201_VISUAL_MARKER");
  const appendFunctional = runtime.indexOf("patchedSource.includes(ALDUS_V200_MARKER)");
  const appendVisual = runtime.indexOf("patchedSource.includes(ALDUS_V201_VISUAL_MARKER)");
  assert.ok(functional >= 0 && visualMarker >= 0);
  assert.ok(appendFunctional >= 0 && appendVisual > appendFunctional);
  assert.match(runtime, /20260731-ajuste-visual-disciplinas-plantao-v169/);
});