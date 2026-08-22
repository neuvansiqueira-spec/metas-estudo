const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const publishedFactoryAssets = [
  'factory-schedule-scope-v277.js',
  'factory-schedule-filters-v279.js',
  'factory-schedule-dates-v281.js',
  'duplicate-diagnostics-search-v272.js',
  'duplicate-diagnostics-search-v271.css'
];

test('V372 publica no docs todos os recursos que o service worker injeta', () => {
  for (const file of publishedFactoryAssets) {
    const source = path.join(root, file);
    const published = path.join(root, 'docs', file);
    assert.equal(fs.existsSync(source), true, `${file} deve existir na raiz`);
    assert.equal(fs.existsSync(published), true, `docs/${file} deve existir na publicação`);
    assert.equal(fs.readFileSync(published), fs.readFileSync(source), `docs/${file} deve permanecer em paridade com a raiz`);
  }
});

test('V372 separa pasta de destino de material concluído e remove disparos repetidos V237', () => {
  const scope = read('factory-schedule-scope-v277.js');
  assert.match(scope, /20260822-factory-completion-stability-v372/);
  assert.match(scope, /factoryResumoAulaFolderMaterialLinkV372/);
  assert.match(scope, /drive\\\.google\\\.com\\\/drive/);
  assert.match(scope, /return isDriveFolder\(value\) \? "" : value/);
  assert.match(scope, /current\.__destinationV237/);
  assert.match(scope, /globalThis\[name\] = current\.__aldusOriginal/);
});
