const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');

const EXPECTED = Object.freeze({
  triagem: 'Classifica cada arquivo da pasta por módulo e avalia se as fontes bastam. Não gera conteúdo.',
  resumoAula: 'Transforma as fontes teóricas em mapa hierárquico de palavras-chave para cópia manuscrita.',
  lei: 'Lei topificada artigo por artigo, restrita ao recorte informado.',
  jurisprudencia: 'Julgados, súmulas e teses buscados exclusivamente na pasta jurisprudencial.',
  peca: 'Modelo de peça processual a partir das fontes práticas.',
  consolidacao: 'Reúne os módulos já gerados num documento único.',
  resumoAulaJurisprudencia: 'Resumo teórico com a jurisprudência integrada no ponto do instituto, mais quadro final.',
  leiJurisprudencia: 'Lei topificada com jurisprudência junto do dispositivo, mais quadro final.',
  padronizacaoFinalSumario: 'Só padroniza formatação e cria o sumário de um DOCX pronto. Não altera conteúdo.'
});

function extractBalanced(source, marker, openChar, closeChar) {
  const start = source.indexOf(marker);
  assert.notEqual(start, -1, `marcador ausente: ${marker}`);
  const open = source.indexOf(openChar, start + marker.length);
  assert.notEqual(open, -1, `abertura ausente para ${marker}`);
  let depth = 0;
  let quote = '';
  let template = false;
  let escaped = false;
  for (let i = open; i < source.length; i += 1) {
    const ch = source[i];
    if (escaped) { escaped = false; continue; }
    if (ch === '\\') { escaped = true; continue; }
    if (quote) { if (ch === quote) quote = ''; continue; }
    if (template) { if (ch === '`') template = false; continue; }
    if (ch === '"' || ch === "'") { quote = ch; continue; }
    if (ch === '`') { template = true; continue; }
    if (ch === openChar) depth += 1;
    if (ch === closeChar) {
      depth -= 1;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  throw new Error(`bloco não fechado: ${marker}`);
}

function sourceUnderTest() {
  const source = read('script.js');
  const types = extractBalanced(source, 'const FACTORY_PROMPT_TYPES =', '[', ']') + ';';
  const descriptions = extractBalanced(source, 'const FACTORY_PROMPT_DESCRIPTIONS =', '{', '}') + ';';
  const render = extractBalanced(source, 'function renderFactoryPromptLibrary()', '{', '}');
  return { source, types, descriptions, render };
}

function renderInVm({ unsafeDescription = false, includeUnknown = true } = {}) {
  const { types, descriptions, render } = sourceUnderTest();
  const sandbox = { result: '' };
  vm.createContext(sandbox);
  const runtime = `
${types}
${descriptions}
const elements = { factoryPromptLibraryPanel: { innerHTML: '' } };
const state = { factoryPromptLibrary: {} };
function normalizeFactoryPromptLibrary(value) { return value || {}; }
function escapeHTML(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
${render}
FACTORY_PROMPT_TYPES.push(
  { key: 'resumoAulaJurisprudencia', label: 'Gerar prompt Resumo/Aula + Jurisprudência' },
  { key: 'leiJurisprudencia', label: 'Gerar prompt Lei + Jurisprudência' },
  { key: 'padronizacaoFinalSumario', label: 'Gerar prompt Padronização Final + Sumário' }
);
${includeUnknown ? "FACTORY_PROMPT_TYPES.push({ key: 'futureType', label: 'Gerar prompt Futuro' });" : ''}
${unsafeDescription ? "FACTORY_PROMPT_DESCRIPTIONS.triagem = '<b>& \\\"x\\\"</b>';" : ''}
renderFactoryPromptLibrary();
result = elements.factoryPromptLibraryPanel.innerHTML;
`;
  vm.runInContext(runtime, sandbox);
  return sandbox.result;
}

test('V423 descreve exatamente os nove tipos da Biblioteca, inclusive os três injetados em runtime', () => {
  const { descriptions } = sourceUnderTest();
  const sandbox = {};
  vm.createContext(sandbox);
  vm.runInContext(`${descriptions}\nglobalThis.value = FACTORY_PROMPT_DESCRIPTIONS;`, sandbox);
  assert.deepEqual(JSON.parse(JSON.stringify(sandbox.value)), EXPECTED);

  const injected = [
    ['factory-resumo-aula-jurisprudencia-v380.js', 'resumoAulaJurisprudencia'],
    ['factory-lei-jurisprudencia-v383.js', 'leiJurisprudencia'],
    ['factory-padronizacao-final-sumario-v385.js', 'padronizacaoFinalSumario']
  ];
  for (const [file, key] of injected) {
    assert.match(read(file), new RegExp(`const TYPE_KEY = ["']${key}["'];`));
  }
});

test('renderFactoryPromptLibrary emite a descrição conhecida entre título e textarea', () => {
  const html = renderInVm();
  const hint = `<small class="factory-prompt-hint">${EXPECTED.triagem}</small>`;
  assert.ok(html.includes(hint));
  assert.match(html, new RegExp(`<strong>PROMPT TRIAGEM COMPLETO</strong>${hint.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}<textarea`));
  assert.equal((html.match(/class="factory-prompt-hint"/g) || []).length, 9);
});

test('chave futura sem descrição não gera hint nem erro', () => {
  const html = renderInVm({ includeUnknown: true });
  assert.ok(html.includes('PROMPT Futuro'));
  const futureLabelStart = html.indexOf('PROMPT Futuro');
  const futureTextarea = html.indexOf('<textarea', futureLabelStart);
  assert.notEqual(futureTextarea, -1);
  assert.ok(!html.slice(futureLabelStart, futureTextarea).includes('factory-prompt-hint'));
});

test('descrição passa por escapeHTML antes de entrar no HTML', () => {
  const html = renderInVm({ unsafeDescription: true });
  assert.ok(html.includes('&lt;b&gt;&amp; &quot;x&quot;&lt;/b&gt;'));
  assert.ok(!html.includes('<small class="factory-prompt-hint"><b>'));
  assert.match(sourceUnderTest().source, /\? `<small class="factory-prompt-hint">\$\{escapeHTML\(description\)\}<\/small>`/);
});

test('V423 usa CSS já bundleado e preserva o agrupamento de contraste V68', () => {
  const style = read('style.css');
  const contrast = read('aldus-contrast-system-v68.css');
  assert.match(style, /\.factory-prompt-hint \{ display: block; margin-bottom: 6px; color: var\(--muted\); font-size: \.85rem; line-height: 1\.35; \}/);
  assert.match(contrast, /\.material-estimate-mode-hint,\r?\n\s+\.factory-prompt-hint,/);
  const build = read('build-bundles.mjs');
  assert.match(build, /"style\.css"/);
  assert.match(build, /"aldus-contrast-system-v68\.css"/);
});

test('V423 rotaciona CURRENT_VERSION/CACHE_NAME e publica bundle e worker correspondentes', () => {
  const version = JSON.parse(read('package.json')).version;
  assert.equal(version, '20260901-daily-plan-completed-visible-v424');
  const worker = read('service-worker.js');
  assert.match(worker, new RegExp(`const CURRENT_VERSION = "${version}";`));
  assert.match(worker, /const CACHE_NAME = `metas-estudo-\$\{CURRENT_VERSION\}-/);
  assert.match(worker, /name\.startsWith\("metas-estudo-"\) && name !== CACHE_NAME/);
  assert.match(worker, /caches\.match\(request, \{ ignoreSearch: true \}\)/);
  assert.match(read('index.html'), new RegExp(`app-v424\\.js\\?v=${version}`));
  assert.match(read('bootstrap-fast-path-v351.js'), new RegExp(`app-v424\\.js\\?v=${version}`));
  assert.match(read('bootstrap-integrity-loader-v258-core.js'), new RegExp(`app-v424\\.js\\?v=${version}`));
  assert.equal(read('service-worker.js'), read('service-worker-v424.js'));
  assert.ok(JSON.parse(read('published-service-workers.json')).versoes.includes('v424'));
});

test('raiz e docs são byte a byte idênticos nos arquivos V423 tocados que possuem cópia publicada', () => {
  const parity = [
    'script.js', 'style.css', 'aldus-contrast-system-v68.css',
    'app.bundle.js', 'app.bundle.css', 'app-v424.js', 'app-v424.css',
    'index.html', 'app-version.js', 'service-worker.js', 'service-worker-v424.js',
    'service-worker-v402.js', 'service-worker-v168.js', 'service-worker-v169.js', 'service-worker-v332.js',
    'bootstrap-fast-path-v351.js', 'bootstrap-integrity-loader-v258-core.js'
  ];
  for (const file of parity) {
    assert.equal(read(file), read(`docs/${file}`), `${file} deve ser idêntico em docs/`);
  }
});
