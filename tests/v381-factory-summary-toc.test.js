const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const runtimePath = 'factory-summary-toc-v381.js';
const docsPath = 'docs/factory-summary-toc-v381.js';
const loaderPath = 'security-observability-v318.js';
const docsLoaderPath = 'docs/security-observability-v318.js';

const runtime = fs.readFileSync(runtimePath, 'utf8');
const docsRuntime = fs.readFileSync(docsPath, 'utf8');
const loader = fs.readFileSync(loaderPath, 'utf8');
const docsLoader = fs.readFileSync(docsLoaderPath, 'utf8');
const api = require(`../${runtimePath}`);

test('V381 cobre exatamente os quatro prompts de conteúdo solicitados', () => {
  assert.deepEqual([...api.targetTypes], [
    'resumoAula',
    'jurisprudencia',
    'peca',
    'resumoAulaJurisprudencia'
  ]);
  assert.match(runtime, /RESUMO\/AULA: indexe os grandes eixos/);
  assert.match(runtime, /JURISPRUDÊNCIA: indexe os grandes eixos/);
  assert.match(runtime, /PEÇA: indexe as grandes seções/);
  assert.match(runtime, /RESUMO\/AULA \+ JURISPRUDÊNCIA: indexe a estrutura didática/);
});

test('sumário é obrigatório, navegável e não inventa paginação', () => {
  const prompt = api.withSummary('PROMPT BASE');
  assert.match(prompt, /SUMÁRIO OBRIGATÓRIO DO DOCUMENTO — V381/);
  assert.match(prompt, /SUMÁRIO AUTOMÁTICO REAL DO WORD/);
  assert.match(prompt, /navegação clicável\/hiperlinks internos/);
  assert.match(prompt, /números de página quando o DOCX puder calculá-los com segurança/);
  assert.match(prompt, /Painel de Navegação do Word/);
  assert.match(prompt, /Título 1, Título 2/);
  assert.match(prompt, /NÃO invente números de página/);
  assert.match(prompt, /NÃO estime páginas/);
});

test('regra de sumário é idempotente e preserva o prompt preexistente', () => {
  const once = api.withSummary('CONTEÚDO ORIGINAL');
  const twice = api.withSummary(once);
  assert.equal(twice, once);
  assert.match(once, /^CONTEÚDO ORIGINAL/);
  assert.equal((once.match(/SUMÁRIO OBRIGATÓRIO DO DOCUMENTO — V381/g) || []).length, 1);
});

test('V381 preserva identidade visual dos módulos e granularidade útil', () => {
  assert.match(runtime, /preserve integralmente a aparência visual já exigida pelo módulo/);
  assert.match(runtime, /não autoriza mudar fonte, cor, negrito, faixa, emoji, espaçamento ou identidade visual/);
  assert.match(runtime, /não transforme linhas internas como REGRA, EXCEÇÃO, PRAZO, COMPETÊNCIA, TESE, PROVA/);
  assert.match(runtime, /evite granularidade excessiva/);
  assert.match(runtime, /QUADRO FINAL DE JURISPRUDÊNCIA como seção do sumário/);
});

test('V381 permanece fora dos hot paths e sem persistência automática', () => {
  assert.doesNotMatch(runtime, /MutationObserver\s*\(/);
  assert.doesNotMatch(runtime, /setInterval\s*\(/);
  assert.doesNotMatch(runtime, /getComputedStyle\s*\(/);
  assert.doesNotMatch(runtime, /requestAnimationFrame\s*\(/);
  assert.doesNotMatch(runtime, /indexedDB\s*\./);
  assert.doesNotMatch(runtime, /localStorage\s*\./);
  assert.doesNotMatch(runtime, /saveData\s*\(/);
  assert.doesNotMatch(runtime, /autoSyncAfterSave\s*\(/);
});

test('loader V381 é isolado, ordenado após V380 e raiz/docs permanecem idênticos', () => {
  assert.equal(runtime, docsRuntime, 'runtime V381 raiz/docs deve permanecer sincronizado');
  assert.equal(loader, docsLoader, 'loader raiz/docs deve permanecer sincronizado');
  assert.match(loader, /factory-summary-toc-v381\.js\?v=20260824-factory-summary-toc-v381/);
  assert.match(loader, /installFactoryResumoAulaJurisprudenciaV380\(\);[\s\S]*installFactorySummaryTocV381\(\);/);
  assert.doesNotMatch(loader, /factory-summary-toc-v381[\s\S]*MutationObserver\s*\(/);
});
