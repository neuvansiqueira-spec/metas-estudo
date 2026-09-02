const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const root = fs.readFileSync('factory-summary-toc-v381.js', 'utf8');
const docs = fs.readFileSync('docs/factory-summary-toc-v381.js', 'utf8');
const security = fs.readFileSync('security-observability-v318.js', 'utf8');
const docsSecurity = fs.readFileSync('docs/security-observability-v318.js', 'utf8');

test('V422 torna o sumário um espelho didático do módulo', () => {
  assert.match(root, /\d{8}-factory-summary-toc-[a-z0-9-]+/);
  assert.match(root, /SUMÁRIO DIDÁTICO OBRIGATÓRIO DO DOCUMENTO — V422/);
  assert.match(root, /MESMA LINGUAGEM DIDÁTICA, HIERARQUIA VISUAL, ÍCONES FUNCIONAIS/);
  assert.match(root, /♦️ \*\*📑 SUMÁRIO\*\*/);
  assert.match(root, /ESPELHO VISUAL DO CORPO/);
  assert.match(root, /NÃO converta títulos ricos do corpo em linhas planas sem ícones/);
});

test('Resumo Aula e modo integrado preservam a gramática visual no sumário', () => {
  assert.match(root, /NÍVEL 1 — GRANDES EIXOS/);
  assert.match(root, /reproduza o padrão ♦️ do corpo/);
  assert.match(root, /NÍVEL 2 — INSTITUTOS\/SUBTÓPICOS/);
  assert.match(root, /reproduza o marcador ▶️📚 do corpo/);
  assert.match(root, /faixa azul-clara discreta e compacta/);
  assert.match(root, /♦️ \*\*🌍 1\. FORMAÇÃO, POSIÇÃO E FORÇA NORMATIVA DA DUDH\*\*/);
  assert.match(root, /▶️📚 \*\*ORIGEM, APROVAÇÃO E FINALIDADE\*\*/);
  assert.match(root, /♦️ \*\*⚖️ QUADRO FINAL DE JURISPRUDÊNCIA\*\*/);
});

test('sumário corrige alinhamento e quebras estranhas observadas no Word', () => {
  assert.match(root, /O SUMÁRIO DEVE SER ALINHADO À ESQUERDA/);
  assert.match(root, /NUNCA JUSTIFIQUE OS PARÁGRAFOS DO SUMÁRIO/);
  assert.match(root, /NÃO distribua artificialmente espaços entre palavras/);
  assert.match(root, /recuo suspenso coerente/);
  assert.match(root, /líder pontilhado discreto/);
  assert.match(root, /número da página alinhado à direita/);
});

test('Jurisprudência e Peça mantêm a identidade própria em vez de receber padrão de Aula', () => {
  assert.match(root, /NO MÓDULO JURISPRUDÊNCIA, O SUMÁRIO DEVE ESPELHAR A IDENTIDADE VISUAL/);
  assert.match(root, /NÃO force ♦️ ou ▶️📚 se o corpo daquele módulo usar outra gramática visual/);
  assert.match(root, /NO MÓDULO PEÇA, O SUMÁRIO DEVE ESPELHAR A ARQUITETURA VISUAL DA PRÓPRIA PEÇA/);
  assert.match(root, /NÃO transforme a peça em RESUMO\/AULA/);
});

test('V422 substitui instruções V381 e V382 já persistidas sem duplicar o sumário', () => {
  assert.match(root, /const LEGACY_MARKER = "## SUMÁRIO OBRIGATÓRIO DO DOCUMENTO — V381"/);
  assert.match(root, /const SUMMARY_MARKER_V382 = "## SUMÁRIO DIDÁTICO OBRIGATÓRIO DO DOCUMENTO — V382"/);
  assert.match(root, /const SUMMARY_MARKER = "## SUMÁRIO DIDÁTICO OBRIGATÓRIO DO DOCUMENTO — V422"/);
  assert.match(root, /\[LEGACY_MARKER, SUMMARY_MARKER_V382\]/);
  assert.match(root, /Math\.min\(\.\.\.legacyIndexes\)/);
  assert.match(root, /factorySummaryTocV422/);
});

test('V422 continua isolada de hot paths; gravação ocorre apenas na migração', () => {
  for (const forbidden of [
    'MutationObserver',
    'setInterval(',
    'getComputedStyle(',
    'requestAnimationFrame(',
    'indexedDB',
    'localStorage'
  ]) {
    assert.equal(root.includes(forbidden), false, `não deve conter ${forbidden}`);
  }
  assert.match(root, /factoryJurisprudenceCitationV422/);
  assert.match(root, /stateChanged && typeof saveData === "function"/);
});

test('loader usa cache-bust V422 e raiz/docs permanecem idênticos', () => {
  assert.match(security, /installFactorySummaryTocV382/);
  assert.match(security, /factory-summary-toc-v381\.js\?v=\d{8}-[a-z0-9-]+/);
  assert.match(security, /aldusFactorySummaryTocV382/);
  assert.equal(root, docs, 'runtime raiz e docs devem ser idênticos');
  assert.equal(security, docsSecurity, 'loader raiz e docs devem ser idênticos');
});
