const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const rootDir = path.resolve(__dirname, "..");
const files = {
  rootPatch: path.join(rootDir, "analytics-accordion-fix-v148.js"),
  docsPatch: path.join(rootDir, "docs", "analytics-accordion-fix-v148.js"),
  rootDaily: path.join(rootDir, "daily-collapsibles-closed-v140.js"),
  docsDaily: path.join(rootDir, "docs", "daily-collapsibles-closed-v140.js"),
  rootCentral: path.join(rootDir, "central-goals-real-time-v124.js"),
  docsCentral: path.join(rootDir, "docs", "central-goals-real-time-v124.js")
};

const read = (file) => fs.readFileSync(file, "utf8");

test("arquivos JavaScript alterados possuem sintaxe válida", () => {
  Object.values(files).forEach((file) => execFileSync(process.execPath, ["--check", file]));
});

test("raiz e docs permanecem byte a byte iguais", () => {
  assert.equal(read(files.rootPatch), read(files.docsPatch));
  assert.equal(read(files.rootDaily), read(files.docsDaily));
  assert.equal(read(files.rootCentral), read(files.docsCentral));
});

test("clique é capturado no documento antes dos controladores conflitantes", () => {
  const source = read(files.rootPatch);
  assert.match(source, /document\.addEventListener\("click", toggleFromEvent, true\)/);
  assert.match(source, /event\.preventDefault\(\)/);
  assert.match(source, /event\.stopPropagation\(\)/);
  assert.match(source, /event\.stopImmediatePropagation\(\)/);
  assert.match(source, /details\.open = nextOpen/);
  assert.match(source, /requestAnimationFrame/);
});

test("correção trata somente summary diretamente vinculado a details da análise", () => {
  const source = read(files.rootPatch);
  assert.match(source, /#view-analise-estrategica/);
  assert.match(source, /details\.firstElementChild === summary/);
  assert.match(source, /HTMLDetailsElement/);
  assert.match(source, /interactiveChild/);
  assert.match(source, /aria-expanded/);
});

test("controladores antigos v146 e v147 são bloqueados e removidos do carregamento", () => {
  const source = read(files.rootPatch);
  const daily = read(files.rootDaily);
  assert.match(source, /__aldusAnalyticsTabsFixV146 = true/);
  assert.match(source, /__aldusAnalyticsTabsFixLoaderV146 = true/);
  assert.match(source, /__aldusReleaseVersionV147 = true/);
  assert.match(source, /__aldusReleaseVersionLoaderV147 = true/);
  assert.doesNotMatch(daily, /analytics-tabs-fix-v146\.js/);
  assert.doesNotMatch(daily, /release-version-v147\.js/);
});

test("v148 é carregada antes dos painéis v145 e força cache novo da cadeia", () => {
  const daily = read(files.rootDaily);
  const central = read(files.rootCentral);
  assert.ok(daily.indexOf("analytics-accordion-fix-v148.js") < daily.indexOf("analytics-collapsibles-v145.js"));
  assert.ok(central.indexOf("analytics-accordion-fix-v148.js") < central.indexOf("daily-collapsibles-closed-v140.js"));
  assert.match(central, /daily-collapsibles-closed-v140\.js\?v=20260725-analise-estrategica-abas-funcionais-v148/);
});

test("alteração não acessa dados, armazenamento, sincronização ou rede", () => {
  const source = `${read(files.rootPatch)}\n${read(files.rootDaily)}\n${read(files.rootCentral)}`;
  for (const forbidden of ["localStorage", "sessionStorage", "indexedDB", "saveData", "syncIntegral", "XMLHttpRequest", "WebSocket"]) {
    assert.equal(source.includes(forbidden), false, `não deve conter ${forbidden}`);
  }
});
