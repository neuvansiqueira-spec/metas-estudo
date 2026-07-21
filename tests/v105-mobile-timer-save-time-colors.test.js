const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const script = fs.readFileSync('script.js', 'utf8');
const css = fs.readFileSync('style.css', 'utf8');

test('resumo de hoje diferencia os três tempos por classes próprias', () => {
  assert.match(script, /stat-card planned-today-stat/);
  assert.match(script, /stat-card realized-today-stat/);
  assert.match(script, /stat-card historical-time-stat/);
  assert.match(css, /\.planned-today-stat strong/);
  assert.match(css, /\.realized-today-stat strong/);
});

test('modal móvel mantém Salvar estudo acima da navegação fixa', () => {
  assert.match(css, /body:has\(#timerStudyModal:not\(\[hidden\]\)\) \.mobile-quick-nav/);
  assert.match(css, /#timerStudyModal\s*\{[\s\S]*?z-index: 3200/);
  assert.match(css, /#timerStudyModal \.modal-actions\s*\{[\s\S]*?position: sticky/);
  assert.match(css, /#timerStudyModal \.modal-actions button\s*\{[\s\S]*?min-height: 50px/);
});
