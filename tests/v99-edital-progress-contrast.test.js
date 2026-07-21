const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const style = fs.readFileSync('style.css', 'utf8');
const docsStyle = fs.readFileSync('docs/style.css', 'utf8');

test('acompanhamento do edital usa barra clara e escopo restrito à tela de progresso', () => {
  assert.match(style, /#view-progresso \.progress > span/);
  assert.match(style, /#20d9ff/);
  assert.match(style, /#5dc9f5/);
  assert.match(style, /#view-progresso \.progress[\s\S]*!important/);
});

test('estilo publicado permanece igual ao arquivo principal', () => {
  assert.equal(docsStyle, style);
});
