const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const distribution = fs.readFileSync("question-history-charts-v215.js", "utf8");
const period = fs.readFileSync("question-history-pie.js", "utf8");
const tone = fs.readFileSync("question-history-tone-v216.js", "utf8");

test("roscas de distribuição usam profundidade, brilho e centro premium", () => {
  assert.match(distribution, /"qhcv215-segment-depth"/);
  assert.match(distribution, /"qhcv215-segment-highlight"/);
  assert.match(distribution, /id="qhcv215CenterDisc"/);
  assert.match(distribution, /class="qhcv215-center-disc"/);
  assert.match(distribution, /% principal/);
  assert.match(distribution, /linear-gradient\(90deg,var\(--qhcv-color\),var\(--qhcv-light\)\)/);
});

test("gráfico por período mantém o SVG 3D com palco azul-gelo e acabamento dourado", () => {
  assert.match(period, /class="qh-donut-depth"/);
  assert.match(period, /class="qh-donut-gloss"/);
  assert.match(period, /class="qh-donut-inner-rim"/);
  assert.match(period, /id="qhCenterDiscGradient"/);
  assert.match(period, /stroke: rgba\(199, 154, 59, \.58\)/);
  assert.match(period, /linear-gradient\(155deg, #f8fcff 0%, #dfedf6 56%, #cfdfeb 100%\)/);
});

test("resultados e barras recebem codificação visual sem mudar os cálculos", () => {
  assert.match(period, /qh-result-row \$\{className\}/);
  assert.match(period, /\.qh-result-row\.correct/);
  assert.match(period, /\.qh-result-row\.wrong/);
  assert.match(period, /\.qh-result-row\.null/);
  assert.match(tone, /\.qhfe-breakdown-v198:nth-child\(1\).*#1769aa/s);
  assert.match(tone, /\.qhfe-breakdown-v198:nth-child\(2\).*#16705c/s);
  assert.match(tone, /\.qhfe-breakdown-v198:nth-child\(3\).*#9b6810/s);
});
