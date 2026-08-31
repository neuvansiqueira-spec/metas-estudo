const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const packageVersion = JSON.parse(fs.readFileSync("package.json", "utf8")).version;
const releaseSuffix = packageVersion.match(/v\d+$/)?.[0] || "current";
const script = fs.readFileSync("script.js", "utf8");
const bundle = fs.readFileSync(`app-${releaseSuffix}.js`, "utf8");
const docsBundle = fs.readFileSync(`docs/app-${releaseSuffix}.js`, "utf8");
const index = fs.readFileSync("index.html", "utf8");
const docsIndex = fs.readFileSync("docs/index.html", "utf8");
const workerBridge = fs.readFileSync("service-worker-v402.js", "utf8");
const docsWorkerBridge = fs.readFileSync("docs/service-worker-v402.js", "utf8");
const worker = fs.readFileSync("service-worker.js", "utf8");

test("release atual substitui a reconciliação V413 por diagnóstico antes da primeira exibição", () => {
  const reconcile = script.indexOf('medirFaseBootV350("diagnostico-plano-dia-deterministico-v417"');
  const firstRender = script.indexOf('medirFaseBootV350("showView-inicial"');

  assert.ok(reconcile >= 0);
  assert.ok(reconcile < firstRender);
  assert.match(script, /__aldusDailyPlanStartupReconciledV406 = false/);
  assert.match(script, /completedBeforeFirstRender: true/);
  assert.doesNotMatch(script.slice(script.indexOf("async function bootstrapApplication")), /replenishMissingDailyPlanningGoalsV116\(state, todayISO\(\)\)/);
});

test("V413 usa uma única lista acionável no Dashboard e no Plano do Dia", () => {
  assert.match(script, /function actionableDailyPlanGoalsForDate/);
  assert.match(script, /const dayGoals = actionableDailyPlanGoalsForDate\(state, date\)/);
  assert.match(script, /renderGoalDashboardCards\(todayPlanGoals\)/);
  assert.match(script, /const todayGoals = Array\.isArray\(precomputedTodayGoals\) \? precomputedTodayGoals : actionableDailyPlanGoalsForDate\(state, today\)/);
});

test("V413 exclui concluídos no núcleo, inclusive candidatos com reforço diagnóstico", () => {
  assert.match(script, /isIntegratedPlanningCandidateV155\(item, targetState\) && !planningRecordMatchesCompletedSubject\(item, completedRecords\)/);
  assert.doesNotMatch(script, /diagnosticMetrics\.get\(item\.id\)\?\.boost \|\| 0\) > 0 \|\| !planningRecordMatchesCompletedSubject/);
  assert.match(script, /isPlanningStudyGoal\(goal\) && isActionableDailyPlanGoal\(goal, targetState, completedRecords\)/);
});

test("release atual publica bundle e ponte de cache sem observadores ou polling novos", () => {
  assert.equal(bundle, docsBundle);
  assert.equal(index, docsIndex);
  assert.equal(workerBridge, docsWorkerBridge);
  assert.ok(index.includes(`app-${releaseSuffix}.js?v=${packageVersion}`));
  assert.match(workerBridge, /CORE_DAILY_PLAN_CACHE_VERSION_V413/);
  assert.match(workerBridge, /bootstrap-integrity-loader-v258-core\.js/);
  assert.ok(workerBridge.includes(`app-${releaseSuffix}.js`));
  assert.match(worker, /html\.includes\(`app-\$\{RELEASE_SUFFIX\}\.js\?v=\$\{CURRENT_VERSION\}`\)/);
  assert.match(worker, /html\.includes\(`Versão: \$\{CURRENT_VERSION\}`\)/);
  assert.doesNotMatch(workerBridge, /addEventListener\("fetch"/);
  assert.doesNotMatch(workerBridge, /setTimeout|setInterval|MutationObserver|requestAnimationFrame|requestIdleCallback/);
});
