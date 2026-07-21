const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const html = fs.readFileSync('index.html', 'utf8');
const script = fs.readFileSync('script.js', 'utf8');
const style = fs.readFileSync('style.css', 'utf8');

test('Fábrica possui abas separadas para Plano do Dia e Produção da Semana', () => {
  assert.match(html, /data-factory-scope="day"[^>]*>Plano do Dia/);
  assert.match(html, /data-factory-scope="week"[^>]*>Produção da Semana/);
  assert.match(style, /\.factory-production-tabs/);
});

test('modo diário procura somente hoje e dias futuros e libera o primeiro dia pendente', () => {
  const start = script.indexOf('function factoryDoNowQueue');
  const end = script.indexOf('function factoryActionButtonHTML', start);
  const block = script.slice(start, end);
  assert.match(block, /date >= today/);
  assert.doesNotMatch(block, /date <= today/);
  assert.match(block, /if \(pending\.length\) return pending/);
  assert.match(block, /factoryUnlockedDayDate/);
});

test('modo semanal limita a produção a sete dias e remove duplicidades', () => {
  assert.match(script, /function factoryWeeklyQueue/);
  assert.match(script, /daysBetween\(start, 7\)/);
  assert.match(script, /seen\.has\(entry\.item\.id\)/);
  assert.match(script, /factoryProductionScope === "week"/);
});

test('lista geral da Fábrica usa somente entradas do período planejado', () => {
  assert.match(script, /let entries = periodEntries/);
  assert.match(script, /Pendentes no período/);
  assert.match(script, /Exibindo somente os resumos pendentes do Plano do Dia/);
  assert.match(script, /foi liberado automaticamente/);
});

test('arquivos publicados permanecem sincronizados', () => {
  assert.equal(fs.readFileSync('docs/index.html', 'utf8'), html);
  assert.equal(fs.readFileSync('docs/script.js', 'utf8'), script);
  assert.equal(fs.readFileSync('docs/style.css', 'utf8'), style);
});
