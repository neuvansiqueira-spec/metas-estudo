const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const runtime = fs.readFileSync('factory-prompt-organizacao-v639.js', 'utf8');
const docsRuntime = fs.readFileSync('docs/factory-prompt-organizacao-v639.js', 'utf8');
const rootHtml = fs.readFileSync('index.html', 'utf8');
const docsHtml = fs.readFileSync('docs/index.html', 'utf8');

const CHAVES = ['triagem', 'resumoAula', 'resumoAulaJurisprudencia', 'lei', 'leiJurisprudencia',
  'jurisprudencia', 'peca', 'consolidacao', 'fusaoFinal', 'padronizacaoFinalSumario'];

function carregar(detalhe) {
  const ctx = {
    console,
    setTimeout: (fn) => { fn(); return 0; },
    document: {
      readyState: 'complete',
      addEventListener() {},
      getElementById: () => null,
      createElement: () => ({ setAttribute() {}, appendChild() {}, style: {} }),
      head: { appendChild() {} }
    },
    factoryDetailBodyHTML: detalhe,
    addEventListener() {}
  };
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(runtime, ctx);
  return ctx;
}

function botoes(id = 'tema-1', chaves = CHAVES) {
  return chaves.map((chave) => `<button type="button" class="secondary-button" data-factory-prompt="${id}|${chave}">Gerar prompt ${chave}</button>`).join('');
}
// mesma estrutura do cartão real: div.factory-prompt-actions > div.card-actions
function bloco(conteudo) {
  return `<div class="factory-prompt-actions"><h4>Botões de todos os prompts</h4><div class="card-actions">${conteudo}</div></div>`;
}

test('V639 mantém raiz e docs idênticos e é carregado pelo index.html', () => {
  assert.equal(runtime, docsRuntime, 'runtime V639 deve ser idêntico entre raiz e docs');
  assert.equal(rootHtml, docsHtml, 'index.html deve ser idêntico entre raiz e docs');
  assert.match(rootHtml, /id="aldusFactoryPromptOrganizacaoV639"[^>]+factory-prompt-organizacao-v639\.js/);
});

test('V639 agrupa e numera os prompts nas três etapas', () => {
  const ctx = carregar(() => `<div>antes</div>${bloco(botoes())}<div>depois</div>`);
  const html = ctx.factoryDetailBodyHTML({ id: 'tema-1' });
  assert.match(html, /1\. Antes de produzir/);
  assert.match(html, /2\. Produção/);
  assert.match(html, /3\. Fechamento/);
  assert.match(html, /<span class="numero">1\.1<\/span>TRIAGEM/);
  assert.match(html, /<span class="numero">2\.2<\/span>RESUMO\/AULA \+ JURISPRUDÊNCIA/);
  assert.match(html, /<span class="numero">2\.5<\/span>JURISPRUDÊNCIA/);
  assert.match(html, /<span class="numero">3\.3<\/span>PADRONIZAÇÃO FINAL \+ SUMÁRIO/);
  assert.ok(html.includes('<div>antes</div>') && html.includes('<div>depois</div>'), 'o resto da tela é preservado');
});

test('V639 preserva os comandos de cada botão, que é o que a Fábrica e o bridge usam', () => {
  const ctx = carregar(() => bloco(botoes()));
  const html = ctx.factoryDetailBodyHTML({ id: 'tema-1' });
  CHAVES.forEach((chave) => assert.ok(html.includes(`data-factory-prompt="tema-1|${chave}"`), `faltou ${chave}`));
  assert.equal((html.match(/data-factory-prompt=/g) || []).length, CHAVES.length);
});

test('V639 põe prompt novo, ainda desconhecido, no fim do fechamento', () => {
  const extra = `<button type="button" class="secondary-button" data-factory-prompt="tema-1|moduloNovo">Gerar prompt Módulo Novo</button>`;
  const ctx = carregar(() => bloco(botoes() + extra));
  const html = ctx.factoryDetailBodyHTML({ id: 'tema-1' });
  assert.match(html, /<span class="numero">3\.4<\/span>MÓDULO NOVO/);
});

test('V639 não mexe em tela sem bloco de prompts e devolve o original se algo falhar', () => {
  const ctx = carregar(() => '<div>sem prompts aqui</div>');
  assert.equal(ctx.factoryDetailBodyHTML({ id: 'x' }), '<div>sem prompts aqui</div>');
  const ctx2 = carregar(() => { throw new Error('falha simulada'); });
  assert.throws(() => ctx2.factoryDetailBodyHTML({ id: 'x' }), /falha simulada/);
});

test('V639 usa apenas cores e classes do próprio site', () => {
  assert.match(runtime, /var\(--primary/);
  assert.match(runtime, /var\(--success/);
  assert.match(runtime, /var\(--muted/);
  assert.match(runtime, /class="secondary-button"/);
  assert.doesNotMatch(runtime, /#(?!f8fafc|64748b|2563eb|16a34a)[0-9a-fA-F]{6}/, 'sem cores fora da paleta do site');
});
