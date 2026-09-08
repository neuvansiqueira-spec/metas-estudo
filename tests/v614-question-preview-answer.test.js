const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

function artigo() {
  return {
    html: '',
    atributos: {},
    hasAttribute(nome) { return Object.prototype.hasOwnProperty.call(this.atributos, nome); },
    setAttribute(nome, valor) { this.atributos[nome] = valor; },
    insertAdjacentHTML(_posicao, html) { this.html += html; }
  };
}

// A previa original desenha um <article class="qb-preview-item"> por questao, na
// mesma ordem de qbFilteredQuestions(). O modulo so acrescenta ao fim de cada um.
function harness({ questoes = [], comCaixa = true, comPreview = true } = {}) {
  const artigos = questoes.map(() => artigo());
  const caixa = { querySelectorAll: () => artigos };
  const chamadas = [];
  const context = {
    console: { warn() {}, error() {} },
    setInterval: () => 0,
    clearInterval() {},
    document: { getElementById: (id) => (comCaixa && id === 'qbFilteredPreview' ? caixa : null) },
    qbFilteredQuestions: () => questoes,
    escapeHTML: (valor) => String(valor).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  };
  if (comPreview) context.qbPreview = function qbPreviewOriginal() { chamadas.push('original'); return 'ok'; };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(read('question-preview-answer-v614.js'), context);
  return { context, api: context.__ALDUS_QB_PREVIEW_ANSWER_V614__, artigos, chamadas };
}

const questao = (extra = {}) => ({
  disciplina: 'DIREITO PENAL', assunto: 'Crimes contra a vida',
  enunciado: 'Enunciado da questão.', alternativas: { A: 'Primeira', B: 'Segunda' },
  gabarito: 'B', justificativa: 'Justificativa — QConcursos: texto.\n\nExplicação complementar: outro texto.',
  ...extra
});

test('V614 acrescenta gabarito e justificativa a cada item da prévia', () => {
  const h = harness({ questoes: [questao()] });
  assert.equal(h.api.install(), true);
  h.context.qbPreview();
  assert.equal(h.chamadas.length, 1, 'a prévia original precisa continuar sendo desenhada');
  assert.match(h.artigos[0].html, /<strong>Gabarito:<\/strong>/);
  assert.match(h.artigos[0].html, /B\) Segunda/, 'a letra sozinha não se lê; vai com a alternativa');
  assert.match(h.artigos[0].html, /<strong>Justificativa:<\/strong>/);
  assert.match(h.artigos[0].html, /QConcursos/);
});

test('V614 preserva as quebras de linha da justificativa', () => {
  const h = harness({ questoes: [questao()] });
  h.api.install();
  h.context.qbPreview();
  assert.match(h.artigos[0].html, /<br>/, 'sem isso as duas justificativas viram um bloco só');
});

test('V614 casa cada artigo com a sua questão, pela ordem', () => {
  const questoes = [questao({ gabarito: 'A' }), questao({ gabarito: 'B' }), questao({ gabarito: 'A', alternativas: { A: 'Terceira' } })];
  const h = harness({ questoes });
  h.api.install();
  h.context.qbPreview();
  assert.match(h.artigos[0].html, /A\) Primeira/);
  assert.match(h.artigos[1].html, /B\) Segunda/);
  assert.match(h.artigos[2].html, /A\) Terceira/);
});

test('V614 avisa quando a questão veio sem gabarito e sem justificativa', () => {
  const h = harness({ questoes: [questao({ gabarito: '', justificativa: '', fundamento: '' })] });
  h.api.install();
  h.context.qbPreview();
  assert.match(h.artigos[0].html, /Sem gabarito e sem justificativa/,
    'o silêncio é ambíguo: ele precisa saber que o JSON não trouxe o campo');
});

test('V614 não duplica quando a prévia é desenhada de novo', () => {
  const h = harness({ questoes: [questao()] });
  h.api.install();
  h.context.qbPreview();
  const primeira = h.artigos[0].html;
  h.context.qbPreview();
  assert.equal(h.artigos[0].html, primeira);
});

test('V614 não instala dois invólucros sobre a mesma função', () => {
  const h = harness({ questoes: [questao()] });
  h.api.install();
  const primeiro = h.context.qbPreview;
  assert.equal(h.api.install(), true);
  assert.equal(h.context.qbPreview, primeiro);
});

test('V614 espera a função do script.js aparecer', () => {
  const h = harness({ questoes: [questao()], comPreview: false });
  assert.equal(h.api.install(), false, 'sem qbPreview não há o que envolver');
});

test('V614 escapa o conteúdo, que vem de JSON colado', () => {
  const h = harness({ questoes: [questao({ justificativa: '<script>alert(1)</script>' })] });
  h.api.install();
  h.context.qbPreview();
  assert.doesNotMatch(h.artigos[0].html, /<script>/);
  assert.match(h.artigos[0].html, /&lt;script&gt;/);
});

test('V614 não toca em metas nem faz polling', () => {
  const fonte = read('question-preview-answer-v614.js');
  assert.doesNotMatch(fonte, /dailyGoals/);
  assert.doesNotMatch(fonte, /MutationObserver/);
});

test('V614 mantém paridade raiz/docs e é publicado com cache-bust', () => {
  assert.equal(read('question-preview-answer-v614.js'), read('docs/question-preview-answer-v614.js'));
  const versao = read('question-preview-answer-v614.js').match(/VERSION = "([^"]+)"/)[1];
  assert.ok(read('performance-emergency-v350.js').includes(`question-preview-answer-v614.js?v=${versao}`));
  assert.match(read('performance-emergency-v350.js'), /\n {2}installQuestionPreviewAnswerV614\(\);/);
  for (const arquivo of ['performance-emergency-v350.js', 'security-observability-v318.js', 'index.html']) {
    assert.equal(read(arquivo), read(`docs/${arquivo}`), arquivo);
  }
});
