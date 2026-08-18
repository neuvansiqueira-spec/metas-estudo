const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const read = (file) => fs.readFileSync(file, "utf8");
const version = JSON.parse(read("package.json")).version;
const suffix = version.match(/v\d+$/)?.[0];

const incorporatedModules = [
  "timer-safety-v132.js",
  "factory-final-review-v128.js",
  "calendar-month-visibility-v131.js",
  "question-searchable-selects-v135.js",
  "factory-executive-ui-v136.js",
  "daily-study-collapsible-v137.js",
  "daily-collapsibles-closed-v140.js",
  "question-scoring-rule-v142.js",
  "timer-motivation-v161.js",
  "question-register-simple-v162.js",
  "daily-smart-review-collapsible-v138.js",
  "collapse-chevron-fix-v139.js",
  "reinforcement-goal-presentation-v156.js",
  "contest-countdown-v151.js",
  "analytics-view-controller-v179.js",
  "performance-practical-v143.js",
];

const retiredRuntimeModules = [
  "analytics-collapsibles-v145.js",
  "analytics-accordion-fix-v148.js",
  "analytics-header-arrow-v149.js",
  "analytics-single-arrow-v150.js",
  "question-board-result-v141.js"
];

test("versão atual usa um JS, um CSS, um bootstrap e um registro de service worker", () => {
  require("./current-release-contract").assertCurrentReleaseContract();
});

test("versão atual incorpora os módulos operacionais sem carregadores internos", () => {
  require("./current-release-contract").assertCurrentReleaseContract();
});

test("versão atual não possui encadeamento legado, import de CSS nem espera de atualização", () => {
  const css = read(`app-${suffix}.css`);
  const worker = read(`service-worker-${suffix}.js`);
  const update = read("update-flow-v169.js");
  assert.doesNotMatch(css, /@import/i);
  assert.doesNotMatch(worker, /importScripts|patchHtmlSource|transformAppScriptResponse|replaceVersion/);
  assert.doesNotMatch(update, /setTimeout|setInterval|4000|5000|6000|waitForCondition/);
  assert.match(update, /requestAnimationFrame/);
  assert.match(update, /CHECK_INTERVAL_MS = 15 \* 60 \* 1000/);
});

test("service worker atual preserva caches externos e não toca em dados", () => {
  require("./current-release-contract").assertCurrentReleaseContract();
});

test("raiz e docs publicam exatamente a mesma versão atual", () => {
  for (const file of ["index.html", `app-${suffix}.js`, `app-${suffix}.css`, `service-worker-${suffix}.js`, "manifest.json"]) {
    assert.equal(read(file), read(`docs/${file}`), file);
  }
  assert.equal(read("service-worker-v168.js"), read(`service-worker-${suffix}.js`));
  assert.equal(read("service-worker-v169.js"), read(`service-worker-${suffix}.js`));
  assert.equal(read("docs/service-worker-v168.js"), read(`docs/service-worker-${suffix}.js`));
  assert.equal(read("docs/service-worker-v169.js"), read(`docs/service-worker-${suffix}.js`));
});
