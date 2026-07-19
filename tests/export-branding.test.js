const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const script = fs.readFileSync('script.js', 'utf8');
const docsScript = fs.readFileSync('docs/script.js', 'utf8');
const style = fs.readFileSync('aldus-export-brand-v64.css', 'utf8');

test('arquivos visuais gerados recebem a nova logo Aldus incorporada', () => {
  assert.match(script, /function generatedBrandMarkSvg\(/);
  assert.match(script, /data-generated-brand="Aldus Metas Concurso"/);
  assert.match(script, /M220 18 430 405 330 348 220 135 110 348 10 405Z/);
  assert.match(script, /m220 236 18 44 44 18-44 18-18 44-18-44-44-18 44-18Z/);
  assert.match(script, /function ensureGeneratedSvgBrand\(svg\)/);
  assert.match(script, /function svgToPngBlob\(svg, options = \{\}\)[\s\S]*ensureGeneratedSvgBrand\(svg\)/);
  assert.match(script, /ensureGeneratedSvgBrand\(buildChartSvg\(type, rows, meta\)\)/);
  assert.match(script, /buildGoalCalendarSvg[\s\S]*generatedBrandMarkSvg\(1180, 26, 350\)/);
  assert.match(script, /buildScopedGoalCalendarSvg[\s\S]*generatedBrandMarkSvg\(1180, 26, 350\)/);
});

test('PDFs impressos exibem a logo no cabeçalho', () => {
  assert.match(script, /function generatedBrandPrintHtml\(\)/);
  assert.match(script, /buildGoalCalendarPrintHTML[\s\S]*generatedBrandPrintHtml\(\)/);
  assert.match(script, /buildPerformancePrintHtml[\s\S]*generatedBrandPrintHtml\(\)/);
  assert.match(style, /\.generated-file-brand[\s\S]*width: 52mm/);
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
  assert.match(script, /name="Logo Aldus Meta"/);
});

test('arquivos publicados mantêm a mesma implementação de marca', () => {
  assert.equal(script, docsScript);
});
