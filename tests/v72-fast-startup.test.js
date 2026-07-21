const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const version = JSON.parse(fs.readFileSync("package.json", "utf8")).version;
const html = fs.readFileSync("index.html", "utf8");
const script = fs.readFileSync("script.js", "utf8");
const worker = fs.readFileSync("service-worker.js", "utf8");
const header = fs.readFileSync("header-brand-fix.js", "utf8");

test("a publicação atual antecipa um único bundle sem alterar a ordem dos módulos", () => {
  const files = [
    "sync-integral-core.js",
    "sync-integral-deletions.js",
    "sync-integral-state.js",
    "sync-integral-cloud.js",
    "sync-integral-time-protection.js",
    "script.js"
  ];
  assert.match(html, new RegExp(`<link rel="preload" as="script" href="app-v112\\.js\\?v=${version}"`));
  const bundle = fs.readFileSync("app.bundle.js", "utf8");
  let previousIndex = -1;
  files.forEach((file) => {
    const index = bundle.indexOf(`Aldus source: ${file}`);
    assert.ok(index > previousIndex, `${file} deve permanecer na ordem de execução`);
    previousIndex = index;
  });
  assert.match(script, /script\.async = false/);
  assert.match(script, /INTEGRAL_SYNC_ENHANCEMENT_FILES\.map\(loadIntegralSyncEnhancementFile\)/);
  assert.match(script, /await Promise\.all\(pendingFiles\)/);
});

test("navegação e script principal usam o cache atual antes da rede", () => {
  assert.match(worker, /async function cacheFirstNavigation\(/);
  assert.match(worker, /async function cacheFirstAppScript\(/);
  assert.match(worker, /caches\.match\(request, \{ ignoreSearch: true \}\)/);
  assert.match(worker, /const freshNavigation = fetchFreshNavigation\(event\.request\)/);
  assert.match(worker, /event\.waitUntil\(freshNavigation/);
  assert.doesNotMatch(worker, /networkFirstNavigation/);
  assert.doesNotMatch(worker, /networkFirstAppScript/);
});

test("fontes de integridade são lidas em paralelo e permanecem na ordem declarada", () => {
  assert.match(worker, /const parts = await Promise\.all\(files\.map\(loadPart\)\)/);
  assert.match(worker, /return parts\.filter\(Boolean\)\.join\("\\n"\)/);
  assert.match(worker, /preferCache && cached/);
});

test("recuperação de tempo usa índices lineares sem alterar os dados recuperados", () => {
  const start = script.indexOf("function recoverOrphanLegacyTimerMinutesForGoals");
  const end = script.indexOf("function mergeLegacyTimerRecoveryReports", start);
  const body = script.slice(start, end);
  assert.match(body, /const currentGoalIds = new Set/);
  assert.match(body, /const goalsByDateAndSyllabus = new Map/);
  assert.match(body, /const goalsByDateAndFields = new Map/);
  assert.match(body, /currentGoalIds\.has\(assignment\.goalId\)/);
});

test("service worker é registrado uma única vez e a publicação permanece espelhada", () => {
  assert.equal((script.match(/navigator\.serviceWorker\.register\(/g) || []).length, 1);
  assert.equal((header.match(/navigator\.serviceWorker\.register\(/g) || []).length, 0);
  assert.equal(html, fs.readFileSync("docs/index.html", "utf8"));
  assert.equal(script, fs.readFileSync("docs/script.js", "utf8"));
  assert.equal(worker, fs.readFileSync("docs/service-worker.js", "utf8"));
  assert.equal(header, fs.readFileSync("docs/header-brand-fix.js", "utf8"));
});
