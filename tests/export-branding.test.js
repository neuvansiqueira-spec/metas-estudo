const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const script = fs.readFileSync('script.js', 'utf8');
const docsScript = fs.readFileSync('docs/script.js', 'utf8');
const style = fs.readFileSync('aldus-export-brand-v63.css', 'utf8');

test('arquivos visuais gerados recebem a nova logo Aldus incorporada', () => {
  assert.match(script, /function generatedBrandMarkSvg\(/);
  assert.match(script, /data-generated-brand="Aldus Metas Concurso"/);
  assert.match(script, /M256 42 477 458 370 398 256 176 142 398 35 458Z/);
  assert.match(script, /m256 255 19 46 46 19-46 19-19 46-19-46-46-19 46-19Z/);
  assert.match(script, /function ensureGeneratedSvgBrand\(svg\)/);
  assert.match(script, /function svgToPngBlob\(svg, options = \{\}\)[\s\S]*ensureGeneratedSvgBrand\(svg\)/);
  assert.match(script, /ensureGeneratedSvgBrand\(buildChartSvg\(type, rows, meta\)\)/);
  assert.match(script, /buildGoalCalendarSvg[\s\S]*generatedBrandMarkSvg\(1400, 34, 130\)/);
  assert.match(script, /buildScopedGoalCalendarSvg[\s\S]*generatedBrandMarkSvg\(1400, 34, 130\)/);
});

test('PDFs impressos exibem a logo no cabeçalho', () => {
  assert.match(script, /function generatedBrandPrintHtml\(\)/);
  assert.match(script, /buildGoalCalendarPrintHTML[\s\S]*generatedBrandPrintHtml\(\)/);
  assert.match(script, /buildPerformancePrintHtml[\s\S]*generatedBrandPrintHtml\(\)/);
  assert.match(style, /\.generated-file-brand svg[\s\S]*width: 22mm/);
  assert.match(style, /\.performance-print-hero::after[\s\S]*display: none/);
});

test('Excel e JSON recebem identificação da marca sem quebrar os dados', () => {
  assert.match(script, /function generatedFileBranding\(\)/);
  assert.match(script, /branding: generatedFileBranding\(\)/);
  assert.match(script, /const brandedPayload = \{ \.\.\.payload, branding: generatedFileBranding\(\) \}/);
  assert.match(script, /const rows = \[\["ALDUS", "METAS CONCURSO"\]/);
  assert.match(script, /const sections = \[\["ALDUS", "METAS CONCURSO"\], \[\]\]/);
  assert.match(script, /\[\['ALDUS', 'METAS CONCURSO'\], \[\], headersByType/);
  assert.match(script, /function buildBrandedXlsxArchive\(/);
  assert.match(script, /name: "xl\/media\/logo\.png"/);
  assert.match(script, /name="Logo Aldus Metas Concurso"/);
});

test('arquivos publicados mantêm a mesma implementação de marca', () => {
  assert.equal(script, docsScript);
});
