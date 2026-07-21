const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const script = fs.readFileSync('script.js', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');
const css = fs.readFileSync('style.css', 'utf8');

const DEFAULT_SOURCE = 'https://drive.google.com/drive/folders/1BTUFtLBf6tuKG6kqWTRIrPT75cltdy-n';

test('Fábrica usa a pasta padrão sem substituir fonte personalizada', () => {
  assert.match(script, new RegExp(`const FACTORY_DEFAULT_SOURCE_FOLDER = "${DEFAULT_SOURCE}"`));
  assert.match(script, /leiModule\.leiFonte \|\| FACTORY_DEFAULT_SOURCE_FOLDER/);
  assert.match(script, /previousModules\.lei\.leiFonte = elements\.factorySourceFolder\?\.value\.trim\(\) \|\| ""/);
  assert.match(html, new RegExp(`id="factorySourceFolder"[^>]+value="${DEFAULT_SOURCE}"`));
  assert.match(html, /Você pode substituir o link em cada tema/);
});

test('cada assunto da fila possui aba recolhível própria', () => {
  assert.match(script, /<li><details class="factory-queue-item"><summary>/);
  assert.match(script, /<div class="factory-queue-item-content">/);
  assert.match(css, /\.factory-queue-item\s*\{/);
  assert.match(css, /\.factory-queue-item\[open\] > summary/);
});
