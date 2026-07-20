const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const version = '20260719-inicializacao-rapida-v72';
const html = fs.readFileSync('index.html', 'utf8');
const script = fs.readFileSync('script.js', 'utf8');
const serviceWorker = fs.readFileSync('service-worker.js', 'utf8');
const style = fs.readFileSync('aldus-export-brand-v64.css', 'utf8');

function spreadsheetHelpers() {
  const start = script.indexOf('function generatedFileBranding()');
  const end = script.indexOf('function humanDurationFromHours');
  assert.ok(start >= 0 && end > start, 'bloco de planilha encontrado');
  return new Function('APP_VERSION', `${script.slice(start, end)}; return { generatedCsvRows, spreadsheetWorksheetXml, buildBrandedXlsxArchive };`)(version);
}

test('v64 é a camada final de identidade visual das exportações', () => {
  assert.equal(JSON.parse(fs.readFileSync('package.json', 'utf8')).version, version);
  assert.match(html, new RegExp(`id="aldusExportBrandV64"[^>]+${version}`));
  assert.ok(html.indexOf('aldus-export-brand-v64.css') > html.indexOf('aldus-export-brand-v63.css'));
  assert.match(script, new RegExp(`const APP_VERSION = "${version}"`));
  assert.match(serviceWorker, new RegExp(`const CURRENT_VERSION = "${version}"`));
  assert.match(serviceWorker, /"aldus-export-brand-v64\.css"/);
});

test('PDFs e imagens usam o vetor exato da nova marca Aldus', () => {
  assert.match(script, /aria-label="Logo Aldus Meta"/);
  assert.match(script, /data-generated-brand="Aldus Metas Concurso"/);
  assert.match(script, /M220 18 430 405 330 348 220 135 110 348 10 405Z/);
  assert.match(script, /buildGoalCalendarPrintHTML[\s\S]*generatedBrandPrintHtml\(\)/);
  assert.match(script, /buildPerformancePrintHtml[\s\S]*generatedBrandPrintHtml\(\)/);
  assert.match(script, /function svgToPngBlob[\s\S]*ensureGeneratedSvgBrand\(svg\)/);
  assert.match(style, /\.generated-file-brand[\s\S]*width: 52mm/);
  assert.doesNotMatch(script, /data-generated-brand="NS Metas Concurso"/);
});

test('calendário e desempenho oferecem Excel real no lugar do CSV principal', () => {
  assert.match(html, /id="exportGoalCalendarExcel"[^>]*>Gerar Excel</);
  assert.match(html, /data-performance-export="xlsx"[^>]*>Exportar Excel</);
  assert.doesNotMatch(html, /id="exportGoalCalendarCsv"/);
  assert.match(script, /calendario-\$\{goalCalendarScopeLabel\(scope\)\}-\$\{payload\.referenceDate\}\.xlsx/);
  assert.match(script, /if \(action === 'xlsx'\) await downloadGeneratedExcel/);
  assert.match(script, /data-chart-format="xlsx">Excel/);
  assert.match(script, /if \(format === 'xlsx'\) await downloadGeneratedExcel/);
});

test('a planilha XLSX contém a logo como imagem incorporada', () => {
  const helpers = spreadsheetHelpers();
  const rows = helpers.generatedCsvRows('\ufeffALDUS;METAS CONCURSO\n\nRESUMO GERAL\nIndicador;Valor\nTempo estudado;1h');
  assert.deepEqual(rows[0], ['ALDUS', 'METAS CONCURSO']);
  const png = new Uint8Array(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64'));
  const archive = helpers.buildBrandedXlsxArchive(rows, png, { title: 'Relatório de teste', sheetName: 'Teste', generatedAt: '2026-07-18T12:00:00.000Z' });
  assert.equal(archive[0], 0x50);
  assert.equal(archive[1], 0x4b);
  const content = Buffer.from(archive).toString('utf8');
  for (const entry of ['[Content_Types].xml', 'xl/worksheets/sheet1.xml', 'xl/drawings/drawing1.xml', 'xl/media/logo.png']) assert.match(content, new RegExp(entry.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.match(content, /Logo Aldus Meta/);
  assert.match(content, /relationships\/image/);
  assert.match(helpers.spreadsheetWorksheetXml(rows, { title: 'Relatório Aldus', generatedAt: '2026-07-18T12:00:00.000Z' }), /Aldus Metas Concurso/);
});

test('raiz e publicação GitHub Pages mantêm paridade na v64', () => {
  for (const file of ['index.html', 'script.js', 'service-worker.js', 'header-brand-fix.js', 'sync-integral-time-protection.js', 'aldus-export-brand-v63.css', 'aldus-export-brand-v64.css']) {
    assert.equal(fs.readFileSync(file, 'utf8'), fs.readFileSync(`docs/${file}`, 'utf8'), file);
  }
});
