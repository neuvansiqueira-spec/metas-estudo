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

test('V639 herda fundo e texto do cartão e só colore a borda, com cores da paleta do site', () => {
  assert.match(runtime, /class="secondary-button"/);
  // o cartão da Fábrica é escuro enquanto as variáveis do :root são claras: o módulo não pode pintar fundo nem texto
  assert.match(runtime, /\.etapa \{[^}]*background: transparent/);
  assert.match(runtime, /\.etapa \{[^}]*color: inherit/);
  assert.doesNotMatch(runtime, /(?<!border-left-)color:\s*(var\(|#|rgb)/, 'sem cor de texto fixada pelo módulo');
  assert.doesNotMatch(runtime, /background:\s*(var\(|#|rgb)/, 'sem fundo próprio');
  const paleta = new Set(fs.readdirSync('.').filter((f) => f.endsWith('.css'))
    .flatMap((f) => [...fs.readFileSync(f, 'utf8').matchAll(/#[0-9a-fA-F]{6}(?![0-9a-fA-F])/g)].map((m) => m[0].toLowerCase())));
  const usadas = [...new Set([...runtime.matchAll(/#[0-9a-fA-F]{6}(?![0-9a-fA-F])/g)].map((m) => m[0].toLowerCase()))];
  assert.ok(usadas.length >= 3, 'as três etapas têm cor de borda (a 4ª, tema específico, foi para a V647)');
  usadas.forEach((cor) => assert.ok(paleta.has(cor), `cor ${cor} não existe na paleta do site`));
});

test('V639 não põe mais o tema específico dentro do cartão (foi para o painel da V647)', () => {
  const ctx = carregar(() => bloco(botoes()));
  const html = ctx.factoryDetailBodyHTML({ id: 'tema-1' });
  assert.doesNotMatch(html, /tema-livre|Tema específico|etapa-4/);
  assert.doesNotMatch(runtime, /gerarTemaLivre|data-aldus-tema-livre/);
});
