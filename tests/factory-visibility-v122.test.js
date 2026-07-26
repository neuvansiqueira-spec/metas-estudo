const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const css = fs.readFileSync('factory-visibility-v122.css', 'utf8');
const docsCss = fs.readFileSync('docs/factory-visibility-v122.css', 'utf8');
const index = fs.readFileSync('index.html', 'utf8');
const docsIndex = fs.readFileSync('docs/index.html', 'utf8');
const worker = fs.readFileSync('service-worker-v122.js', 'utf8');
const docsWorker = fs.readFileSync('docs/service-worker-v122.js', 'utf8');
const promptPatch = fs.readFileSync('factory-lei-prompt-v122.js', 'utf8');
const docsPromptPatch = fs.readFileSync('docs/factory-lei-prompt-v122.js', 'utf8');

test('V122 adiciona margem interna segura ao Faça Agora sem cortar conteúdo', () => {
  assert.match(css, /#factoryDoNow > \.factory-collapsible-content\s*\{[\s\S]*padding: 20px 22px 24px !important/);
  assert.match(css, /#factoryDoNow \.compact-factory-card\s*\{[\s\S]*padding: 16px 18px !important/);
  assert.match(css, /#factoryDoNow \.factory-card-header\s*\{[\s\S]*grid-template-columns: minmax\(0, 1fr\) auto !important/);
  assert.match(css, /#factoryDoNow \.compact-factory-card \.factory-theme-highlight\s*\{[\s\S]*padding: 4px 8px 8px !important/);
  assert.doesNotMatch(css, /word-break:\s*break-all/);
});

test('V122 deixa o assunto largo, métricas compactas e possui quebras responsivas', () => {
  assert.match(css, /grid-template-columns: minmax\(460px, 2\.8fr\) repeat\(3, minmax\(125px, \.65fr\)\) !important/);
  assert.match(css, /\.stat-card:not\(\.factory-summary-now\)[\s\S]*min-height: 132px !important/);
  assert.match(css, /@media \(max-width: 1080px\)/);
  assert.match(css, /@media \(max-width: 700px\)/);
  assert.match(css, /@media \(max-width: 430px\)/);
});

test('V122 permanece carregado e seus artefatos históricos continuam sincronizados', () => {
  assert.match(index, /factory-visibility-v122\.css\?v=20260721-[^"']+/);
  assert.match(index, /factory-lei-prompt-v12[2-9]\.js\?v=20260721-[^"']+/);
  assert.match(worker, /factory-visibility-v122\.css\?v=\$\{CURRENT_VERSION\}/);
  assert.match(worker, /factory-lei-prompt-v122\.js\?v=\$\{CURRENT_VERSION\}/);
  assert.match(promptPatch, /service-worker-v122\.js/);
  assert.equal(css, docsCss);
  assert.equal(index, docsIndex);
  assert.equal(worker, docsWorker);
  assert.equal(promptPatch, docsPromptPatch);
});
