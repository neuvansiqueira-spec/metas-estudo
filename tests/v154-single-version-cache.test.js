const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const version = JSON.parse(read("package.json")).version;

test("app-version é a única rotina pública que escreve no rodapé", () => {
  const canonical = read("app-version.js");
  assert.match(canonical, new RegExp(`const VERSION = "${version}";`));
  assert.match(canonical, /querySelectorAll\("\.app-version"\)/);

  const possibleWriters = [
    "script.js", "aldus-meta-branding.js", "analytics-accordion-fix-v148.js",
    "analytics-header-arrow-v149.js", "analytics-single-arrow-v150.js",
    "contest-countdown-v151.js", "daily-goal-methodology-v117.js",
    "daily-goal-replenishment-v116.js", "factory-lei-prompt-v119.js",
    "factory-lei-prompt-v120.js", "factory-lei-prompt-v121.js",
    "factory-lei-prompt-v122.js"
  ];
  for (const file of possibleWriters) {
    assert.doesNotMatch(read(file), /querySelector(All)?\([^)]*app-version|aldusReleaseVersion\s*=/, file);
  }
});

test("módulos v149 e v150 preservam identificação interna sem assumir versão global", () => {
  for (const file of ["analytics-header-arrow-v149.js", "analytics-single-arrow-v150.js"]) {
    const source = read(file);
    assert.match(source, /const VERSION = "20260725-/);
    assert.doesNotMatch(source, /Versão:|app-version|aldusReleaseVersion/);
  }
});

test("service worker remove somente caches estáticos do aplicativo", () => {
  require("./current-release-contract").assertCurrentReleaseContract();
});

test("ativação preserva caches externos ao aplicativo", () => {
  require("./current-release-contract").assertCurrentReleaseContract();
});

test("fonte canônica aplica a versão uma vez sem observador contínuo", async () => {
  const label = { textContent: "" };
  const html = { dataset: {} };
  const context = {
    globalThis: null,
    document: {
      documentElement: html,
      readyState: "complete",
      querySelectorAll: () => [label],
      addEventListener: () => {}
    },
    Object
  };
  context.globalThis = context;
  vm.runInNewContext(read("app-version.js"), context);
  assert.equal(label.textContent, `Versão: ${version}`);
  assert.doesNotMatch(read("app-version.js"), /MutationObserver/);
});

test("raiz e docs são idênticos nos arquivos responsáveis pela versão e pelo cache", () => {
  for (const file of [
    "index.html", "app-version.js", "service-worker.js", "factory-visibility-v122.css",
    "analytics-header-arrow-v149.js", "analytics-single-arrow-v150.js"
  ]) {
    assert.equal(read(file), read(`docs/${file}`), file);
  }
});
