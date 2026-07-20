const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const script = read("script.js");
const html = read("index.html");
const css = read("style.css");
const contrast = read("aldus-contrast-system-v68.css");

test("Central de Metas oferece períodos e todos os filtros solicitados", () => {
  for (const id of ["centralTimePeriod", "centralTimeDiscipline", "centralTimeSubject", "centralTimeEdital", "centralTimeType", "centralTimeChart"]) assert.match(html, new RegExp(`id="${id}"`));
  for (const period of ["day", "week", "month", "total"]) assert.match(html, new RegExp(`value="${period}"`));
});

test("gráfico usa registros reais e evita duplicar tempo já lançado na meta", () => {
  assert.match(script, /function centralTimeChartLogs/);
  assert.match(script, /goalUnloggedActualMinutes\(goal\)/);
  assert.match(script, /function centralTimePeriodBounds/);
  assert.match(script, /function centralTimeLogEdital/);
  assert.match(script, /conic-gradient/);
  assert.match(script, /Distribuição por/);
});

test("pizza e legenda são responsivas e legíveis", () => {
  assert.match(css, /\.central-time-pie/);
  assert.match(css, /\.central-time-legend-row/);
  assert.match(css, /@media \(max-width: 760px\)[\s\S]*\.central-time-chart-layout/);
});

test("contraste da Fábrica diferencia painéis e Faça Agora", () => {
  assert.match(contrast, /V83: contraste reforçado especificamente para a Fábrica/);
  assert.match(contrast, /#view-fabrica-resumos \.factory-collapsible/);
  assert.match(contrast, /#view-fabrica-resumos \.factory-do-now > summary/);
  assert.match(contrast, /#f2c94c/);
});

test("V83 mantém cache anterior e arquivos publicados em paridade", () => {
  const version = "20260720-navegacao-lateral-recolhivel-v91";
  assert.equal(JSON.parse(read("package.json")).version, version);
  assert.match(html, new RegExp(version));
  assert.match(read("service-worker.js"), new RegExp(`CURRENT_VERSION = "${version}"`));
  assert.match(read("service-worker.js"), /"20260720-fabrica-recolhivel-v82"/);
  for (const file of ["script.js", "index.html", "style.css", "aldus-contrast-system-v68.css", "service-worker.js", "header-brand-fix.js", "sync-integral-time-protection.js"]) assert.equal(read(file), read(path.join("docs", file)), file);
});
