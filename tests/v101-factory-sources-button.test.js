const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const html = fs.readFileSync('index.html', 'utf8');
const script = fs.readFileSync('script.js', 'utf8');

test('painel de cadastro da fábrica possui destino estável para o botão de fontes', () => {
  assert.match(html, /<details id="factoryRegisterPanel" class="factory-collapsible factory-register-panel">/);
  assert.match(html, /id="factorySourceFolder"/);
});

test('configurar fontes abre o painel, rola para o formulário e focaliza o campo', () => {
  const start = script.indexOf('function editFactoryItem');
  const end = script.indexOf('function deleteFactoryItem', start);
  const block = script.slice(start, end);
  assert.match(block, /getElementById\("factoryRegisterPanel"\)/);
  assert.match(block, /registerPanel\.open = true/);
  assert.match(block, /scrollIntoView/);
  assert.match(block, /factorySourceFolder\?\.focus/);
  assert.match(block, /factorySourceFolder\?\.select/);
});

test('ação principal continua roteada para edição do tema', () => {
  assert.match(script, /if \(!factorySourceConfigured\(item\)\) return \{ label: "Configurar fontes", action: "edit" \}/);
  assert.match(script, /data-factory-edit="\$\{item\.id\}"/);
});

test('arquivos publicados permanecem sincronizados', () => {
  assert.equal(fs.readFileSync('docs/index.html', 'utf8'), html);
  assert.equal(fs.readFileSync('docs/script.js', 'utf8'), script);
});
