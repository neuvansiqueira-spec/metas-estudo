const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const read = (path) => fs.readFileSync(path, "utf8");

test("index publicado carrega a V243 diretamente com URL inédita", () => {
  const html = read("index.html");
  assert.match(html, /id="aldusDailySummaryTimeFormatV243Direct"/);
  assert.match(html, /daily-summary-time-format-v243\.js\?v=20260805-daily-summary-hours-minutes-v243&hotfix=daily-summary-time-format-hotfix2/);
  assert.match(html, /planning-integrity-loader-v235\.js\?v=20260804-simulados-sem-fabrica-cache-unico-v236&publication=v244/);
});

test("raiz e docs publicam o mesmo HTML de inicialização", () => {
  const root = read("index.html");
  const docs = read("docs/index.html");
  const marker = "aldusDailySummaryTimeFormatV243Direct";
  assert.equal(root.includes(marker), true);
  assert.equal(docs.includes(marker), true);
  assert.equal(root.slice(root.indexOf(marker) - 80, root.indexOf(marker) + 300), docs.slice(docs.indexOf(marker) - 80, docs.indexOf(marker) + 300));
});

test("loader e service worker usam o hotfix2", () => {
  for (const path of ["planning-integrity-loader-v235.js", "docs/planning-integrity-loader-v235.js"]) {
    assert.match(read(path), /DAILY_SUMMARY_TIME_HOTFIX = "daily-summary-time-format-hotfix2"/);
  }
  for (const path of ["service-worker.js", "docs/service-worker.js"]) {
    const source = read(path);
    assert.match(source, /daily-summary-direct-v244-hotfix2/);
    assert.match(source, /hotfix=daily-summary-time-format-hotfix2/);
    assert.match(source, /x-aldus-daily-summary-time", "daily-summary-time-format-hotfix2"/);
  }
});

test("módulo continua formatando horas e minutos", () => {
  const source = read("daily-summary-time-format-v243.js");
  assert.match(source, /return rest \? `\$\{hours\}h \$\{rest\}min` : `\$\{hours\}h`/);
  assert.match(source, /return `\$\{total\}min`/);
});
