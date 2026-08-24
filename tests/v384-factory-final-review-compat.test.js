const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const compat = require('../factory-final-review-v384-compat.js');
const root = fs.readFileSync('factory-final-review-v384-compat.js', 'utf8');
const docs = fs.readFileSync('docs/factory-final-review-v384-compat.js', 'utf8');
const security = fs.readFileSync('security-observability-v318.js', 'utf8');

test('V384 remove instrução V128 de múltiplos módulos e preserva a nova de produtos', () => {
  const text = [
    'Disciplina: X',
    'Tema: Y',
    'MÓDULO: CONSOLIDAÇÃO',
    '',
    'MODO AUTOMÁTICO: REVISÃO E CONSOLIDAÇÃO FINAL DE MÚLTIPLOS MÓDULOS.',
    'texto legado que não deve permanecer',
    '',
    'MODO AUTOMÁTICO: REVISÃO E CONSOLIDAÇÃO FINAL DE MÚLTIPLOS PRODUTOS.',
    'texto V384'
  ].join('\n');
  const cleaned = compat.stripLegacyFinalOutput(text);
  assert.doesNotMatch(cleaned, /MÚLTIPLOS MÓDULOS/);
  assert.doesNotMatch(cleaned, /texto legado/);
  assert.match(cleaned, /MÚLTIPLOS PRODUTOS/);
  assert.match(cleaned, /texto V384/);
});

test('V384 remove instrução V128 de módulo único e preserva produto único', () => {
  const text = 'Contexto\n\nMODO AUTOMÁTICO: REFINAMENTO FINAL DE MÓDULO ÚNICO.\nlegado\n\nMODO AUTOMÁTICO: REFINAMENTO FINAL DE PRODUTO ÚNICO.\nnovo';
  const cleaned = compat.stripLegacyFinalOutput(text);
  assert.doesNotMatch(cleaned, /MÓDULO ÚNICO/);
  assert.doesNotMatch(cleaned, /legado/);
  assert.match(cleaned, /PRODUTO ÚNICO/);
});

test('V384 remove a primeira cópia do bloqueio legado quando há duas', () => {
  const marker = 'REVISÃO E CONSOLIDAÇÃO FINAL — BLOQUEADA COM SEGURANÇA.';
  const text = `Contexto\n\n${marker}\nlegado\n\n${marker}\nnovo`;
  const cleaned = compat.stripLegacyFinalOutput(text);
  assert.equal((cleaned.match(/BLOQUEADA COM SEGURANÇA/g) || []).length, 1);
  assert.doesNotMatch(cleaned, /legado/);
  assert.match(cleaned, /novo/);
});

test('compatibilidade não altera outros textos e permanece sem hot paths', () => {
  assert.equal(compat.stripLegacyFinalOutput('texto comum'), 'texto comum');
  for (const forbidden of ['MutationObserver', 'setInterval(', 'getComputedStyle(', 'requestAnimationFrame(', 'indexedDB', 'localStorage', 'saveData(']) {
    assert.equal(root.includes(forbidden), false, `não deve conter ${forbidden}`);
  }
});

test('compatibilidade é carregada depois da V384 e raiz/docs são idênticos', () => {
  const mainPos = security.indexOf('installFactoryFinalReviewV384();');
  const compatPos = security.indexOf('installFactoryFinalReviewCompatV384();');
  assert.ok(mainPos >= 0);
  assert.ok(compatPos > mainPos);
  assert.match(security, /factory-final-review-v384-compat\.js\?v=20260824-final-review-consolidation-v384-compat/);
  assert.equal(root, docs);
});
