const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const script = read("script.js");

function declaration(name) {
  const start = script.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `${name} deve existir`);
  const parametersStart = script.indexOf("(", start);
  let parametersDepth = 0;
  let parametersEnd = -1;
  for (let index = parametersStart; index < script.length; index += 1) {
    if (script[index] === "(") parametersDepth += 1;
    if (script[index] === ")" && --parametersDepth === 0) { parametersEnd = index; break; }
  }
  const bodyStart = script.indexOf("{", parametersEnd);
  let depth = 0;
  let quote = "";
  let escaped = false;
  for (let index = bodyStart; index < script.length; index += 1) {
    const char = script[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === quote) quote = "";
      continue;
    }
    if (char === "\"" || char === "'" || char === "`") { quote = char; continue; }
    if (char === "{") depth += 1;
    if (char === "}" && --depth === 0) return script.slice(start, index + 1);
  }
  throw new Error(`declaração incompleta: ${name}`);
}

test("V402 vincula Citações e Intimações mesmo com pontuação divergente", () => {
  const context = {
    Map,
    Set,
    state: { syllabusItems: [] },
    factorySyllabusStableKey: () => "",
    factorySyllabusMainSubject: () => "",
    factoryGoalSubtopic: (goal) => goal.subtopic || ""
  };
  vm.createContext(context);
  vm.runInContext(`
    const DAILY_PLAN_CANONICAL_CACHE = new Map();
    const DAILY_PLAN_CANONICAL_CACHE_LIMIT = 20000;
    ${declaration("dailyPlanCanonical")}
    ${declaration("dailyPlanSubjectKey")}
    ${declaration("dailyPlanSubjectAliases")}
    ${declaration("dailyPlanSubjectsCompatible")}
    ${declaration("exactFactoryGoalMatches")}
  `, context);

  const agenda = [{
    id: "factory-citacoes",
    disciplina: "DIREITO PROCESSUAL PENAL",
    tema: "Citações e Intimações",
    editalSubtemas: [],
    editalLink: { itemIds: [], itemKeys: [] }
  }];
  const result = context.exactFactoryGoalMatches({
    discipline: "Direito Processual Penal.",
    subject: "Citações e Intimações."
  }, agenda);

  assert.equal(result.items.length, 1);
  assert.equal(result.items[0].id, "factory-citacoes");
});

test("V402 encontra tema cadastrado como subassunto do edital", () => {
  const context = {
    Map,
    Set,
    state: { syllabusItems: [] },
    factorySyllabusStableKey: () => "",
    factorySyllabusMainSubject: () => "",
    factoryGoalSubtopic: (goal) => goal.subtopic || ""
  };
  vm.createContext(context);
  vm.runInContext(`
    const DAILY_PLAN_CANONICAL_CACHE = new Map();
    const DAILY_PLAN_CANONICAL_CACHE_LIMIT = 20000;
    ${declaration("dailyPlanCanonical")}
    ${declaration("dailyPlanSubjectKey")}
    ${declaration("dailyPlanSubjectAliases")}
    ${declaration("dailyPlanSubjectsCompatible")}
    ${declaration("exactFactoryGoalMatches")}
  `, context);

  const result = context.exactFactoryGoalMatches({
    discipline: "DIREITO PROCESSUAL PENAL",
    subject: "Atos processuais",
    subtopic: "Citações e Intimações."
  }, [{
    id: "factory-citacoes",
    disciplina: "DIREITO PROCESSUAL PENAL",
    tema: "Citações e Intimações",
    editalSubtemas: [],
    editalLink: { itemIds: [], itemKeys: [] }
  }]);

  assert.equal(result.items.length, 1);
});

test("V402 usa os mesmos recortes temporais do Plano do Dia e do Calendário", () => {
  assert.match(script, /if \(scope === "week"\) return daysBetween\(weekStart\(todayISO\(\)\), 7\)/);
  assert.match(script, /return \[todayISO\(\)\]/);
  assert.match(script, /if \(scope === "all"\)[\s\S]{0,180}state\.dailyGoals/);
  assert.doesNotMatch(declaration("factoryDoNowQueue"), /goalDateValue\(goal\) < today/);
});

test("V402 mantém a navegação da Fábrica somente leitura sobre dailyGoals", () => {
  const renderSource = declaration("renderFactory");
  const infoSource = declaration("renderFactoryIntegrityInfo");
  const scopeSource = declaration("handleFactoryScopeClick");
  for (const source of [renderSource, infoSource, scopeSource]) {
    assert.doesNotMatch(source, /saveData|autoSyncAfterSave|reconcilePlanningDates|dailyGoals\s*=|\.splice\(/);
  }
  const syncSource = declaration("syncFactoryMaterialsPlanningV80");
  assert.doesNotMatch(syncSource, /goal\.factoryItemId\s*=|goal\.materialIds\s*=|goal\.hasMaterial\s*=/);
});

test("V402 consolida a interface e remove a sobreposição de cronograma legada", () => {
  const html = read("index.html");
  const docsHtml = read("docs/index.html");
  const worker = read("service-worker.js");
  const executive = read("factory-executive-ui-v136.js");

  assert.equal(html, docsHtml);
  assert.match(html, /data-production-scope="day"/);
  assert.match(html, /data-production-scope="week"/);
  assert.match(html, /data-production-scope="all"/);
  assert.match(html, /factory-filter-panel" hidden aria-hidden="true"/);
  assert.match(worker, /removeLegacyFactorySchedule/);
  assert.doesNotMatch(worker, /const FACTORY_SCHEDULE_SCOPE|const FACTORY_SCHEDULE_FILTERS|const FACTORY_SCHEDULE_DATES/);
  assert.doesNotMatch(worker, /injectBeforeFinalClosingTag\(patched, "<\/body>", tags\)/);
  assert.doesNotMatch(executive, /MutationObserver/);
  assert.doesNotMatch(executive, /data-factory-command-v136="filters"/);
});

test("V402 publica a cadeia completa do diagnóstico de duplicidades", () => {
  for (const file of [
    "duplicate-diagnostics-search-v271.css",
    "duplicate-diagnostics-search-v272.js",
    "duplicate-diagnostics-map-v273.js",
    "duplicate-diagnostics-actions-v274.js"
  ]) {
    assert.equal(read(file), read(`docs/${file}`), `${file} deve ser idêntico em docs`);
  }
});
