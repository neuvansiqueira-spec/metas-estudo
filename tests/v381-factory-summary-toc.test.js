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

test('V422 cobre os seis prompts de conteúdo solicitados', () => {
  assert.deepEqual([...api.targetTypes], [
    'resumoAula',
    'lei',
    'jurisprudencia',
    'peca',
    'resumoAulaJurisprudencia',
    'leiJurisprudencia'
  ]);
  assert.equal(api.summaryMarker, '## SUMÁRIO DIDÁTICO OBRIGATÓRIO DO DOCUMENTO — V422');
});

test('sumário V422 é obrigatório, navegável e não inventa paginação', () => {
  const prompt = api.withSummary('PROMPT BASE');
  assert.match(prompt, /SUMÁRIO DIDÁTICO OBRIGATÓRIO DO DOCUMENTO — V422/);
  assert.match(prompt, /### HIPERLINKS OBRIGATÓRIOS/);
  assert.match(prompt, /TODA ENTRADA DO SUMÁRIO[^\n]+DEVE SER UM HIPERLINK INTERNO/);
  assert.match(prompt, /NO SUMÁRIO AUTOMÁTICO, HABILITE OS HIPERLINKS DO CAMPO TOC/);
  assert.match(prompt, /NO FALLBACK MANUAL, CRIE INDICADORES\/ÂNCORAS/);
  assert.match(prompt, /SOMENTE SE A FERRAMENTA COMPROVADAMENTE NÃO SUPORTAR HIPERLINK INTERNO/);
  assert.match(prompt, /Painel de Navegação do Word/i);
  assert.match(prompt, /NÃO invente ou estime números de página/);
});

test('regra V422 de sumário é idempotente e preserva o prompt preexistente', () => {
  const once = api.withSummary('CONTEÚDO ORIGINAL');
  const twice = api.withSummary(once);
  assert.equal(twice, once);
  assert.match(once, /^CONTEÚDO ORIGINAL/);
  assert.equal((once.match(/SUMÁRIO DIDÁTICO OBRIGATÓRIO DO DOCUMENTO — V422/g) || []).length, 1);
});

test('V422 preserva identidade visual dos módulos e granularidade útil', () => {
  assert.match(runtime, /MESMA LINGUAGEM DIDÁTICA, HIERARQUIA VISUAL, ÍCONES FUNCIONAIS/);
  assert.match(runtime, /NÃO converta títulos ricos do corpo em linhas planas sem ícones/);
  assert.match(runtime, /não crie terceiro nível apenas para repetir linhas internas de REGRA, EXCEÇÃO, PRAZO, COMPETÊNCIA, TESE ou PROVA/);
  assert.match(runtime, /NÃO crie uma entrada para cada tese isolada/);
  assert.match(runtime, /⚖️ QUADRO FINAL DE JURISPRUDÊNCIA/);
});

test('V422 permanece fora dos hot paths e persiste somente migrações explícitas', () => {
  for (const forbidden of [
    'MutationObserver(',
    'setInterval(',
    'getComputedStyle(',
    'requestAnimationFrame(',
    'indexedDB.',
    'localStorage.',
    'autoSyncAfterSave('
  ]) {
    assert.equal(runtime.includes(forbidden), false, `token proibido: ${forbidden}`);
  }
  assert.match(runtime, /state\.migrations\[JURISPRUDENCE_CITATION_MIGRATION_ID\]/);
  assert.match(runtime, /stateChanged && typeof saveData === "function"/);
});

test('loader V422 é isolado, ordenado após V380 e raiz/docs permanecem idênticos', () => {
  assert.equal(runtime, docsRuntime, 'runtime raiz/docs deve permanecer sincronizado');
  assert.equal(loader, docsLoader, 'loader raiz/docs deve permanecer sincronizado');
  assert.match(loader, /factory-summary-toc-v381\.js\?v=20260901-factory-summary-toc-v422/);
  assert.match(loader, /installFactoryResumoAulaJurisprudenciaV380\(\);[\s\S]*installFactorySummaryTocV382\(\);/);
  assert.doesNotMatch(loader, /factory-summary-toc-v381[\s\S]*MutationObserver\s*\(/);
});
