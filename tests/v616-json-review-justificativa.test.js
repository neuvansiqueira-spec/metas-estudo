const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const review = fs.readFileSync('question-bank-json-review-v192.js', 'utf8');
const publicReview = fs.readFileSync('docs/question-bank-json-review-v192.js', 'utf8');
const bundle = fs.readFileSync('app.bundle.js', 'utf8');

// Extrai só o utilitário, que não depende de DOM, para exercitar de verdade.
function carregarUtilitario(globais = {}) {
  const inicio = review.indexOf('function justificativaDaQuestao(');
  assert.ok(inicio >= 0, 'utilitário ausente');
  const fim = review.indexOf('\n  }', inicio);
  assert.ok(fim > inicio, 'fim do utilitário não encontrado');
  const corpo = review.slice(inicio, fim + 4);
  const contexto = { ...globais };
  contexto.globalThis = contexto;
  vm.createContext(contexto);
  vm.runInContext('function text(value) { return String(value ?? "").trim(); }\n' + corpo, contexto);
  return contexto.justificativaDaQuestao;
}

test('a conferência da importação mostra a justificativa ao lado do gabarito', () => {
  assert.match(review, /<th>Gabarito<\/th><th>Justificativa<\/th><th>Resultado<\/th>/);
  assert.match(review, /aldus-json-review-reason-v192/);
  assert.match(review, /const justificativa = justificativaDaQuestao\(q\);/);
});

test('linha sem justificativa é sinalizada, não fica em branco', () => {
  assert.match(review, /sem justificativa/);
  assert.match(review, /aldus-json-review-reason-missing-v192/);
});

test('o topo soma quantas questões trazem justificativa', () => {
  assert.match(review, /let comJustificativa = 0;/);
  assert.match(review, /if \(justificativa\) comJustificativa \+= 1;/);
  assert.match(review, /Com justificativa<\/span><strong>\$\{comJustificativa\} de \$\{rows\.length\}/);
});

test('usa o compositor canônico e só recorre aos campos crus se ele faltar', () => {
  const comCompositor = carregarUtilitario({
    questionBankExplanation: (q) => (q.id === 'x' ? 'texto composto' : '')
  });
  assert.equal(comCompositor({ id: 'x', justificativa: 'crua' }), 'texto composto');

  // sem o compositor carregado, o texto ainda aparece
  const semCompositor = carregarUtilitario({});
  assert.equal(semCompositor({ justificativa: '  da justificativa  ' }), 'da justificativa');
  assert.equal(semCompositor({ fundamento: 'do fundamento' }), 'do fundamento');
  assert.equal(semCompositor({ comentarioQc: 'do comentario' }), 'do comentario');
  assert.equal(semCompositor({}), '');

  // compositor que lança não pode derrubar a conferência
  const compositorQuebrado = carregarUtilitario({
    questionBankExplanation: () => { throw new Error('falhou'); }
  });
  assert.equal(compositorQuebrado({ justificativa: 'reserva' }), 'reserva');
});

test('mantém o painel visível da V192 e a paridade de publicação', () => {
  assert.doesNotMatch(review, /\bconfirm\s*\(/);
  assert.match(review, /REVISAR ANTES DE SALVAR/);
  assert.equal(review, publicReview);
  assert.match(bundle, /aldus-json-review-reason-v192/);
});
