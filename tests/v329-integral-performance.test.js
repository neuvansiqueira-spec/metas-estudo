"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const read = (file) => fs.readFileSync(file, "utf8");
const currentVersion = JSON.parse(read("package.json")).version;
const currentSuffix = currentVersion.match(/v\d+$/)?.[0];

test("V329 entrega diretamente o shell canônico sem requisição síncrona", () => {
  const root = read("index.html");
  const docs = read("docs/index.html");
  assert.equal(root, docs);
  assert.match(root, /aldus-performance-release" content="20260814-desempenho-integral-v329/);
  assert.doesNotMatch(root, /XMLHttpRequest|docs\/index\.html\?aldusEntry=|document\.write\(/);
  assert.ok(root.includes(`app-${currentSuffix}.css?v=${currentVersion}`));
  assert.ok(root.includes(`app-${currentSuffix}.js?v=${currentVersion}`));
});

test("V329 não bloqueia o parser com scripts externos", () => {
  const html = read("index.html");
  const scripts = [...html.matchAll(/<script\b[^>]*\bsrc="[^"]+"[^>]*>/g)].map((match) => match[0]);
  assert.ok(scripts.length >= 10);
  scripts.forEach((tag) => assert.match(tag, /\bdefer\b/, tag));
});

test("V329 reduz o recurso visual crítico em mais de 95%", () => {
  const original = fs.statSync("icons/aldus-visual.png").size;
  const optimized = fs.statSync("icons/aldus-visual-320.webp").size;
  assert.ok(optimized < original * 0.05, `${optimized} deve ser menor que 5% de ${original}`);
  assert.match(read("index.html"), /icons\/aldus-visual-320\.webp/);
  assert.equal(fs.readFileSync("icons/aldus-visual-320.webp").compare(fs.readFileSync("docs/icons/aldus-visual-320.webp")), 0);
});

test("V329 paraleliza módulos auxiliares após carregar o núcleo", () => {
  const bootstrap = read("bootstrap-integrity-loader-v258-core.js");
  assert.match(bootstrap, /const \[application, \.\.\.enhancements\] = SCRIPT_CHAIN/);
  assert.match(bootstrap, /await loadScript\(\.\.\.application\)/);
  assert.match(bootstrap, /await Promise\.all\(enhancements\.map/);
  assert.ok(bootstrap.indexOf("await loadScript(...application)") < bootstrap.indexOf("await Promise.all(enhancements.map"));
});

test("V329 usa cache imediato na navegação e pré-cache essencial enxuto", () => {
  const worker = read("service-worker.js");
  const essential = worker.slice(worker.indexOf("const ESSENTIAL_ASSETS"), worker.indexOf("async function precacheAssets"));
  assert.match(worker, /async function cachedFirstNavigation\(request, event\)/);
  assert.match(worker, /event\?\.waitUntil\?\.\(refreshNavigation\(request\)/);
  assert.match(worker, /event\.respondWith\(cachedFirstNavigation\(request, event\)\)/);
  assert.doesNotMatch(worker, /Promise\.allSettled\(STATIC_ASSETS/);
  assert.doesNotMatch(essential, /USAGE_TELEMETRY|SIMULADO_INTERATIVO|DUPLICATE_BATCH|FACTORY_SIMULADO/);
  assert.doesNotMatch(worker, /localStorage|sessionStorage|indexedDB|deleteDatabase/);
});

test("V329 contém listas longas e evita recomputações repetidas", () => {
  const css = read("app-v329.css");
  const script = read("script.js");
  assert.match(css, /content-visibility:\s*auto/);
  assert.match(css, /contain-intrinsic-size:\s*auto 240px/);
  assert.match(script, /qbSyllabusPackagesSnapshot/);
  assert.match(script, /qbQuestionSearchText/);
  assert.match(script, /qbSearchTextCache = new WeakMap/);
  assert.match(script, /materialFilterTextTimerV329/);
});
