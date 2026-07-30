import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const css = fs.readFileSync(new URL("../loading-scrollbar-stability-v197.css", import.meta.url), "utf8");
const worker = fs.readFileSync(new URL("../service-worker-v169.js", import.meta.url), "utf8");

test("aviso de carregamento sai do fluxo da página", () => {
  assert.match(css, /\.app-loading-state\s*\{[\s\S]*position:\s*fixed\s*!important/);
  assert.match(css, /margin:\s*0\s*!important/);
  assert.match(css, /pointer-events:\s*none\s*!important/);
});

test("palco principal não cria rolagem vertical interna", () => {
  assert.match(css, /\.screen-stage\s*\{[\s\S]*overflow-y:\s*visible\s*!important/);
  assert.match(css, /scrollbar-gutter:\s*stable\s*!important/);
});

test("worker aplica o CSS antes de entregar o bundle visual", () => {
  assert.match(worker, /CURRENT_VERSION = "20260730-estabiliza-rolagem-carregamento-v169"/);
  assert.match(worker, /RUNTIME_SCROLL_STABILITY_ASSET/);
  assert.match(worker, /patchedStylesheetResponse/);
  assert.match(worker, /url\.pathname\.endsWith\("\/app-v169\.css"\)/);
  assert.match(worker, /x-aldus-runtime-style-patch/);
});
