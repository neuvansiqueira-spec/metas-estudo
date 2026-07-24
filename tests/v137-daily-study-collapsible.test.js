const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const html = fs.readFileSync('index.html', 'utf8');
const script = fs.readFileSync('daily-study-collapsible-v137.js', 'utf8');
const docsScript = fs.readFileSync('docs/daily-study-collapsible-v137.js', 'utf8');
const loader = fs.readFileSync('central-goals-real-time-v124.js', 'utf8');
const docsLoader = fs.readFileSync('docs/central-goals-real-time-v124.js', 'utf8');

test('Plano do Dia mantém a estrutura original usada pela melhoria', () => {
  assert.match(html, /id="view-metas-do-dia"/);
  assert.match(html, /class="today-study-panel"/);
  assert.match(html, /id="today-study-title">O que estudar hoje/);
  assert.match(html, /id="dailyGoalsList"/);
});

test('script do recolhimento possui sintaxe JavaScript válida', () => {
  assert.doesNotThrow(() => new Function(script));
});

test('recolhimento é acessível, reversível e mantém a lista original', () => {
  assert.match(script, /aria-controls/);
  assert.match(script, /aria-expanded/);
  assert.match(script, /content\.hidden = isCollapsed/);
  assert.match(script, /content\.appendChild\(list\)/);
  assert.match(script, /setCollapsed\(false\)/);
  assert.match(script, /Abrir O que estudar hoje/);
  assert.match(script, /Recolher O que estudar hoje/);
});

test('alteração permanece isolada da persistência e das regras das metas', () => {
  assert.doesNotMatch(script, /localStorage|sessionStorage|indexedDB|metasConcursoData/);
  assert.doesNotMatch(script, /state\s*[.[]|saveState|syncState|Google Drive/);
  assert.doesNotMatch(script, /dailyGoals\s*=|splice\(|push\(/);
  assert.match(script, /#view-metas-do-dia/);
});

test('carregamento é versionado e protegido contra duplicidade', () => {
  assert.match(loader, /__aldusDailyStudyCollapsibleLoaderV137/);
  assert.match(loader, /daily-study-collapsible-v137\.js\?v=20260724-plano-dia-recolhivel-v137/);
  assert.match(script, /__aldusDailyStudyCollapsibleV137/);
});

test('arquivos publicados permanecem idênticos à raiz', () => {
  assert.equal(docsScript, script);
  assert.equal(docsLoader, loader);
});
