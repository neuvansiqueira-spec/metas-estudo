const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const entry = fs.readFileSync('index.html', 'utf8');
const shell = fs.readFileSync('docs/index.html', 'utf8');
const workflow = fs.readFileSync('.github/workflows/pages.yml', 'utf8');

function renderEntry(shellHtml = shell) {
  const inlineScript = entry.match(/<script>([\s\S]*?)<\/script>/)?.[1];
  assert.ok(inlineScript, 'a entrada pública deve conter o bootstrap inline');

  let rendered = '';
  class XMLHttpRequestStub {
    open() {}
    setRequestHeader() {}
    send() {
      this.status = 200;
      this.responseText = shellHtml;
    }
  }

  const context = vm.createContext({
    console,
    Date,
    Object,
    encodeURIComponent,
    XMLHttpRequest: XMLHttpRequestStub,
    document: {
      open() {},
      write(value) { rendered += String(value); },
      close() {}
    }
  });
  vm.runInContext(inlineScript, context);
  return rendered;
}

test('V328 ativa a formatação do RESUMO/AULA também pela entrada pública da raiz', () => {
  assert.match(entry, /aldus-resumo-aula-format/);
  assert.match(entry, /factory-resumo-aula-visual-v326\.js\?v=\$\{RESUMO_AULA_VISUAL_VERSION\}/);
  assert.match(entry, /factory-resumo-aula-canonical-v327\.js\?v=\$\{RESUMO_AULA_CANONICAL_VERSION\}/);
  assert.match(entry, /RESUMO_AULA_VISUAL_PATTERN/);
  assert.match(entry, /RESUMO_AULA_CANONICAL_PATTERN/);
});

test('V328 preserva a ordem visual e depois canônica, sem permitir duplicação', () => {
  const visualTag = entry.indexOf('const resumoAulaVisualTag');
  const canonicalTag = entry.indexOf('const resumoAulaCanonicalTag');
  const visualInjection = entry.indexOf('${resumoAulaVisualTag}');
  const canonicalInjection = entry.indexOf('${resumoAulaCanonicalTag}');

  assert.ok(visualTag >= 0 && canonicalTag > visualTag);
  assert.ok(visualInjection >= 0 && canonicalInjection > visualInjection);
  assert.match(entry, /html\.indexOf\("aldusFactoryResumoAulaCanonicalV327"\) < html\.indexOf\("aldusFactoryResumoAulaVisualV326"\)/);
});

test('V328 renderiza uma única cópia de cada política na ordem correta', () => {
  const rendered = renderEntry(`${shell}\n<script src="factory-resumo-aula-visual-v326.js?v=antiga"></script>\n<script src="factory-resumo-aula-canonical-v327.js?v=antiga"></script>`);
  const visualMatches = rendered.match(/id="aldusFactoryResumoAulaVisualV326"/g) || [];
  const canonicalMatches = rendered.match(/id="aldusFactoryResumoAulaCanonicalV327"/g) || [];

  assert.equal(visualMatches.length, 1);
  assert.equal(canonicalMatches.length, 1);
  assert.ok(rendered.indexOf('aldusFactoryResumoAulaCanonicalV327') > rendered.indexOf('aldusFactoryResumoAulaVisualV326'));
});

test('a publicação executa a regressão da entrada V328', () => {
  assert.match(workflow, /tests\/v328-factory-resumo-aula-entry\.test\.js/);
});
