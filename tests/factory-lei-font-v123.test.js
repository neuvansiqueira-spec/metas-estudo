const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const patch = fs.readFileSync('factory-lei-prompt-v123.js', 'utf8');
const docsPatch = fs.readFileSync('docs/factory-lei-prompt-v123.js', 'utf8');

test('V123 obriga fonte preta e restringe cor a ícones e faixa', () => {
  assert.match(patch, /REGRA ABSOLUTA DE COR DA FONTE/);
  assert.match(patch, /TODO TEXTO DO DOCUMENTO DEVE USAR EXCLUSIVAMENTE A COR PRETA PURA #000000/);
  assert.match(patch, /É PROIBIDO USAR VERDE, AZUL, CINZA, VERMELHO, DOURADO OU QUALQUER OUTRA COR NAS LETRAS/);
  assert.match(patch, /FORCE A COR #000000 EM CADA RUN NÃO-EMOJI/);
});

test('V123 instala uma vez o prompt corrigido e preserva cópia do anterior', () => {
  const context = {
    console,
    Date,
    defaultFactoryPromptLibrary: { lei: '' },
    state: { migrations: {}, factoryPromptLibrary: { lei: 'PROMPT ANTERIOR' } },
    saveData() {},
    factoryPromptBase() { return ''; },
    normalizeFactoryPromptLibrary(library = {}) { return { ...library }; },
    factoryRouterText() { return 'Status anterior: Não iniciado'; },
    window: { addEventListener() {}, setTimeout() {} },
    navigator: {}
  };
  vm.createContext(context);
  vm.runInContext(patch, context);
  assert.match(context.state.factoryPromptLibrary.lei, /COR PRETA PURA #000000/);
  assert.equal(context.state.factoryPromptLibraryBackups.leiBeforeV123, 'PROMPT ANTERIOR');
  assert.ok(context.state.migrations.factoryLeiFontePretaObrigatoriaV4);
});

test('V123 mantém raiz e publicação sincronizadas', () => {
  assert.equal(patch, docsPatch);
  assert.match(fs.readFileSync('index.html', 'utf8'), /factory-lei-prompt-v123\.js\?v=20260721-prompt-lei-fonte-preta-v123/);
  assert.match(fs.readFileSync('service-worker-v123.js', 'utf8'), /factory-lei-prompt-v123\.js\?v=\$\{CURRENT_VERSION\}/);
});
