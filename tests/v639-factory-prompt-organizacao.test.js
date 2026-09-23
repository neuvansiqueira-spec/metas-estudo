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
  assert.ok(usadas.length >= 4, 'as quatro etapas têm cor de borda');
  usadas.forEach((cor) => assert.ok(paleta.has(cor), `cor ${cor} não existe na paleta do site`));
});

test('V639 acrescenta o bloco 4, de tema específico, com os prompts numerados', () => {
  const ctx = carregar(() => bloco(botoes()));
  const html = ctx.factoryDetailBodyHTML({ id: 'tema-1' });
  assert.match(html, /4\. Tema específico/);
  assert.match(html, /<span class="numero">4\.1<\/span>RESUMO\/AULA \+ JURISPRUDÊNCIA/);
  assert.match(html, /<span class="numero">4\.2<\/span>LEI \+ JURISPRUDÊNCIA/);
  assert.match(html, /<span class="numero">4\.3<\/span>JURISPRUDÊNCIA/);
  assert.match(html, /data-aldus-tema-livre-campo="tema-1"/);
  assert.match(html, /data-aldus-tema-livre="tema-1\|resumoAulaJurisprudencia"/);
  assert.match(html, /Não cria meta nem altera a Fábrica/);
});

test('V639 troca o assunto no texto do prompt sem tocar no item da Fábrica', () => {
  const escritas = [];
  const item = { id: 'tema-1', disciplina: 'DIREITO PROCESSUAL PENAL', observacao: 'obs original' };
  // ensureFactoryAgenda regrava state.factoryAgenda a cada chamada: qualquer escrita no item viraria dado salvo
  Object.defineProperty(item, 'tema', {
    get: () => 'Tema da meta', set: (v) => escritas.push(v), enumerable: true
  });
  const pasta = 'Pasta de destino: G:/RESUMOS/Tema da meta/';
  const full = { value: `Disciplina: DIREITO PROCESSUAL PENAL\nTema: Tema da meta\nProduza o resumo de Tema da meta.\n${pasta}` };
  const router = { value: 'Tema: Tema da meta' };
  const msg = { textContent: '' };
  const cabecalho = { textContent: 'DIREITO PROCESSUAL PENAL — Tema da meta' };
  const dentroDoCartao = [];
  const campo = { value: 'busca pessoal em abordagem', closest: () => ({ appendChild: (el) => dentroDoCartao.push(el) }) };
  const ctx = carregar(() => bloco(botoes()));
  ctx.CSS = { escape: (v) => v };
  ctx.ensureFactoryAgenda = () => [item];
  ctx.document.querySelector = (sel) => {
    if (sel.includes('tema-livre-campo')) return campo;
    if (sel.includes('tema-livre-recorte')) return { value: 'requisitos' };
    if (sel.includes('tema-livre-msg')) return msg;
    if (sel.includes('factory-prompt-text')) return full;
    if (sel.includes('factory-router-text')) return router;
    if (sel.includes('factory-prompt-header')) return cabecalho;
    return null;
  };
  ctx.document.createElement = () => ({ dataset: {}, setAttribute() {}, click() {}, remove() {} });
  ctx.__ALDUS_FACTORY_PROMPT_ORGANIZACAO_V639__.gerarTemaLivre('tema-1', 'resumoAulaJurisprudencia');

  assert.deepEqual(escritas, [], 'o item da Fábrica não pode ser alterado');
  assert.equal(item.observacao, 'obs original');
  assert.equal(dentroDoCartao.length, 1, 'o gatilho nasce dentro do cartão, que é onde o site escuta o clique');
  assert.match(full.value, /^Tema: busca pessoal em abordagem$/m);
  assert.match(full.value, /^Recorte pedido: requisitos$/m);
  assert.match(full.value, /Produza o resumo de busca pessoal em abordagem\./);
  assert.ok(full.value.includes(pasta), 'a pasta de destino continua a do tema original');
  assert.match(router.value, /^Tema: busca pessoal em abordagem$/m, 'o prompt roteador também troca');
  assert.equal(cabecalho.textContent, 'DIREITO PROCESSUAL PENAL — busca pessoal em abordagem');
  assert.match(msg.textContent, /Prompt gerado para: busca pessoal em abordagem/);
});

test('V639 avisa quando o painel do prompt não abriu, em vez de dizer que gerou', () => {
  const item = { id: 'tema-1', tema: 'Tema da meta' };
  const msg = { textContent: '' };
  const ctx = carregar(() => bloco(botoes()));
  ctx.CSS = { escape: (v) => v };
  ctx.ensureFactoryAgenda = () => [item];
  ctx.document.querySelector = (sel) => {
    if (sel.includes('tema-livre-campo')) return { value: 'tema novo', closest: () => ({ appendChild() {} }) };
    if (sel.includes('tema-livre-msg')) return msg;
    return null;   // nenhum textarea: o painel não abriu
  };
  ctx.document.createElement = () => ({ dataset: {}, setAttribute() {}, click() {}, remove() {} });
  ctx.__ALDUS_FACTORY_PROMPT_ORGANIZACAO_V639__.gerarTemaLivre('tema-1', 'jurisprudencia');
  assert.match(msg.textContent, /não foi gerado/i);
});

test('V639 não gera nada quando o tema específico está em branco', () => {
  const item = { id: 'tema-1', tema: 'Tema da meta' };
  let clicou = false;
  const ctx = carregar(() => bloco(botoes()));
  const msg = { textContent: '' };
  ctx.CSS = { escape: (v) => v };
  ctx.ensureFactoryAgenda = () => [item];
  ctx.document.querySelector = (sel) => (sel.includes('msg') ? msg : (sel.includes('campo') ? { value: '   ', focus() {} } : null));
  ctx.document.createElement = () => ({ dataset: {}, setAttribute() {}, click() { clicou = true; }, remove() {} });
  ctx.__ALDUS_FACTORY_PROMPT_ORGANIZACAO_V639__.gerarTemaLivre('tema-1', 'jurisprudencia');
  assert.equal(clicou, false);
  assert.match(msg.textContent, /Escreva o tema específico/);
});

test('V639 troca o assunto antes de o bridge ler a linha "Tema:" (V630 e V632 leem em microtask)', async () => {
  const item = { id: 'tema-1', tema: 'Tema da meta', disciplina: 'DIREITO PENAL' };
  const msg = { textContent: '' };
  let full = null;
  let lidoPeloBridge = null;
  const campo = { value: 'crime permanente', closest: () => ({ appendChild() {} }) };
  const ctx = carregar(() => bloco(botoes()));
  ctx.CSS = { escape: (v) => v };
  ctx.ensureFactoryAgenda = () => [item];
  ctx.document.querySelector = (sel) => {
    if (sel.includes('tema-livre-campo')) return campo;
    if (sel.includes('tema-livre-msg')) return msg;
    if (sel.includes('factory-prompt-text')) return full;
    return null;
  };
  ctx.document.createElement = () => ({
    dataset: {}, setAttribute() {}, remove() {},
    click() {
      full = { value: `Disciplina: ${item.disciplina}\nTema: ${item.tema}` };   // o site monta o painel, síncrono
      queueMicrotask(() => { lidoPeloBridge = (full.value.match(/^Tema:\s*(.+)$/m) || [])[1]; });
    }
  });
  ctx.__ALDUS_FACTORY_PROMPT_ORGANIZACAO_V639__.gerarTemaLivre('tema-1', 'resumoAulaJurisprudencia');
  await new Promise((r) => setImmediate(r));
  assert.equal(lidoPeloBridge, 'crime permanente', 'o bridge tem de buscar pelo tema digitado');
});
