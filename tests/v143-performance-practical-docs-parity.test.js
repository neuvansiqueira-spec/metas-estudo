const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const root = fs.readFileSync('performance-practical-v143.js', 'utf8');
const docs = fs.readFileSync('docs/performance-practical-v143.js', 'utf8');

for (const label of ['Diagnóstico em 30 segundos', 'Principal avanço', 'Principal atenção', 'Próxima ação', 'Plano prático', 'Saldo A−E']) {
  test(`recurso ${label} existe na raiz e na versão publicada`, () => {
    assert.match(root, new RegExp(label.replace('−', '[−-]')));
    assert.match(docs, new RegExp(label.replace('−', '[−-]')));
  });
}

test('ambas as versões declaram processamento local e não persistem dados', () => {
  for (const source of [root, docs]) {
    assert.match(source, /dados processados localmente|Nenhum registro foi alterado/i);
    assert.doesNotMatch(source, /localStorage|indexedDB|saveData\s*\(|autoSyncAfterSave/i);
  }
});