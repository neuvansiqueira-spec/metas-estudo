const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const script = fs.readFileSync('script.js', 'utf8');
const docsScript = fs.readFileSync('docs/script.js', 'utf8');
const style = fs.readFileSync('style.css', 'utf8');

test('arquivos visuais gerados recebem a logo NS incorporada', () => {
  assert.match(script, /function generatedBrandMarkSvg\(/);
  assert.match(script, /data-generated-brand="NS Metas Concurso"/);
  assert.match(script, /function ensureGeneratedSvgBrand\(svg\)/);
  assert.match(script, /function svgToPngBlob\(svg, options = \{\}\)[\s\S]*ensureGeneratedSvgBrand\(svg\)/);
  assert.match(script, /ensureGeneratedSvgBrand\(buildChartSvg\(type, rows, meta\)\)/);
  assert.match(script, /buildGoalCalendarSvg[\s\S]*generatedBrandMarkSvg\(1400, 34, 130\)/);
  assert.match(script, /buildScopedGoalCalendarSvg[\s\S]*generatedBrandMarkSvg\(1400, 34, 130\)/);
});

test('PDFs impressos exibem a logo no cabeçalho', () => {
  assert.match(script, /function generatedBrandPrintHtml\(\)/);
  assert.match(script, /buildGoalCalendarPrintHTML[\s\S]*generatedBrandPrintHtml\(\)/);
  assert.match(style, /\.generated-file-brand img \{ width: 22mm; height: 24mm;/);
  assert.match(style, /\.performance-print-hero::after[\s\S]*icons\/logo-mark\.svg/);
});

test('CSV e JSON recebem identificação da marca sem quebrar os dados', () => {
  assert.match(script, /function generatedFileBranding\(\)/);
  assert.match(script, /branding: generatedFileBranding\(\)/);
  assert.match(script, /const brandedPayload = \{ \.\.\.payload, branding: generatedFileBranding\(\) \}/);
  assert.match(script, /const rows = \[\["NS", "METAS CONCURSO"\]/);
  assert.match(script, /const sections = \[\["NS", "METAS CONCURSO"\], \[\]\]/);
  assert.match(script, /\[\['NS', 'METAS CONCURSO'\], \[\], headersByType/);
});

test('arquivos publicados mantêm a mesma implementação de marca', () => {
  assert.equal(script, docsScript);
});
