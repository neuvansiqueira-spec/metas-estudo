const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const modulo = require('../factory-leitor-tdah-v669.js');
const rootModule = fs.readFileSync('factory-leitor-tdah-v669.js', 'utf8');
const docsModule = fs.readFileSync('docs/factory-leitor-tdah-v669.js', 'utf8');
const rootLeitor = fs.readFileSync('leitor-tdah.html', 'utf8');
const docsLeitor = fs.readFileSync('docs/leitor-tdah.html', 'utf8');
const rootHtml = fs.readFileSync('index.html', 'utf8');
const docsHtml = fs.readFileSync('docs/index.html', 'utf8');
const worker = fs.readFileSync('service-worker.js', 'utf8');
const docsWorker = fs.readFileSync('docs/service-worker.js', 'utf8');

test('V669: módulo e leitor publicados iguais na raiz e em docs', () => {
  assert.equal(docsModule, rootModule);
  assert.equal(docsLeitor, rootLeitor);
});

test('V669: index carrega o módulo do botão depois da V668', () => {
  for (const html of [rootHtml, docsHtml]) {
    const v668 = html.indexOf('aldusFactoryLeiDidaticaV668');
    const v669 = html.indexOf('<script id="aldusFactoryLeitorTdahV669" defer src="factory-leitor-tdah-v669.js?v=20261021-leitor-tdah-v669"></script>');
    assert.ok(v668 > 0 && v669 > v668);
  }
});

test('V669: o service worker não troca o leitor pelo index', () => {
  for (const sw of [worker, docsWorker]) {
    const bypass = sw.indexOf('url.pathname.endsWith("/leitor-tdah.html")) return;');
    const navegacao = sw.indexOf('if (request.mode === "navigate"');
    assert.ok(bypass > 0 && bypass < navegacao);
  }
});

test('V669: link do leitor leva assunto, tema, disciplina e pasta', () => {
  const link = modulo.linkDoLeitor({ id: 'fab-1', tema: 'Prescrição e decadência', disciplina: 'Direito Civil', factoryDestinationFolder: 'https://drive.google.com/drive/folders/abc' });
  const params = new URLSearchParams(link.split('?')[1]);
  assert.ok(link.startsWith('leitor-tdah.html?'));
  assert.equal(params.get('item'), 'fab-1');
  assert.equal(params.get('tema'), 'Prescrição e decadência');
  assert.equal(params.get('disciplina'), 'Direito Civil');
  assert.equal(params.get('pasta'), 'https://drive.google.com/drive/folders/abc');
  assert.equal(modulo.pastaDoItem({ pastaDestinoWordPdf: ' x ' }), 'x');
});

test('V669: contagem de artigos prontos ignora quadro final e trechos sem conteúdo', () => {
  const estado = {
    inv: { blocos: [
      { id: 'A', artigo: '1', titulo: 'Art. 1', trechos: [{ id: 'A1', elegivel: true }, { id: 'A2', elegivel: false }] },
      { id: 'B', artigo: '2', titulo: 'Art. 2', trechos: [{ id: 'B1', elegivel: true }] },
      { id: 'Q', artigo: '', titulo: 'QUADRO FINAL DE JURISPRUDÊNCIA', trechos: [{ id: 'Q1', elegivel: true }] }
    ] },
    content: { trechos: { A1: { flashcards: [1], por_que: 'x', texto_facil: 'y' }, B1: { flashcards: [1] } } }
  };
  assert.deepEqual(modulo.contarArtigos(estado), { prontos: 1, total: 2 });
  assert.equal(modulo.contarArtigos({}), null);
});

test('V669: o leitor salva no IndexedDB próprio e nunca no estado do site', () => {
  assert.match(rootLeitor, /const IDB_NOME='aldus-leitor-tdah'/);
  assert.doesNotMatch(rootLeitor, /saveData\(/);
  assert.doesNotMatch(rootModule, /saveData\(|state\.[a-zA-Z]+\s*=/);
});
