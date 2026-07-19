const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const version = '20260719-tempo-acumulado-backup-v67';
const html = fs.readFileSync('index.html', 'utf8');
const worker = fs.readFileSync('service-worker.js', 'utf8');
const chartSource = fs.readFileSync('question-history-pie.js', 'utf8');

function chartHelpers() {
  const start = chartSource.indexOf('function formatInteger');
  const end = chartSource.indexOf('function resultRow', start);
  assert.ok(start >= 0 && end > start, 'funções do gráfico localizadas');
  return new Function(`${chartSource.slice(start, end)}; return { donutSegmentPath, donutSegments, donutSvg };`)();
}

test('v65 invalida o cache e publica o novo gráfico', () => {
  assert.equal(JSON.parse(fs.readFileSync('package.json', 'utf8')).version, version);
  assert.match(html, new RegExp(`question-history-pie\\.js\\?v=${version}`));
  assert.match(html, new RegExp(`Versão: ${version}`));
  assert.match(worker, new RegExp(`const CURRENT_VERSION = "${version}"`));
  assert.match(worker, /"20260718-logo-exportacoes-visivel-v64"/);
});

test('rosca usa segmentos elípticos e profundidade real em SVG', () => {
  const helpers = chartHelpers();
  const path = helpers.donutSegmentPath(-90, 234);
  assert.match(path, /A 158 82 0 1 1/);
  assert.match(path, /A 88 46 0 1 0/);

  const svg = helpers.donutSvg(
    { key: 'month', label: 'Mês' },
    { correct: 9, wrong: 1, null: 0 },
    10
  );
  assert.match(svg, /class="qh-donut-svg"/);
  assert.match(svg, /class="qh-donut-depth"/);
  assert.match(svg, /translate\(0 22\)/);
  assert.match(svg, /translate\(0 6\)/);
  assert.match(svg, /qhCorrectTop/);
  assert.match(svg, /qhWrongTop/);
  assert.match(svg, /Acertos: 9 \(90%\)/);
  assert.match(svg, /Erro: 1 \(10%\)/);
  assert.match(svg, /9 acertos, 1 erro e 0 nulos em 10 questões/);
  assert.match(svg, />90%<\/text>/);
  assert.match(svg, /Proporção das 10 questões selecionadas/);
});

test('gráfico é didático, acessível e legível no tema escuro', () => {
  assert.match(chartSource, /role="img" aria-labelledby=/);
  assert.match(chartSource, /<desc id=/);
  assert.match(chartSource, /Distribuição 3D das respostas/);
  assert.match(chartSource, /\.qh-donut-center-value/);
  assert.match(chartSource, /html\[data-aldus-theme="premium-stable"\] \.qh-result-label/);
  assert.match(chartSource, /color: #e9f2f8 !important/);
  assert.doesNotMatch(chartSource, /--qh-pie-gradient/);
});

test('raiz e GitHub Pages usam a mesma implementação', () => {
  for (const file of [
    'index.html',
    'script.js',
    'service-worker.js',
    'header-brand-fix.js',
    'sync-integral-time-protection.js',
    'question-history-pie.js'
  ]) {
    assert.equal(fs.readFileSync(file, 'utf8'), fs.readFileSync(`docs/${file}`, 'utf8'), file);
  }
});
