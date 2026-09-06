const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

// A cadeia real do site, copiada de script.js:5692. Ela termina em `observacoes`
// — e é por isso que o JSON do cartão gravava "Acertei — marquei C" no lugar da
// justificativa.
function explicacaoDoSite(raw = {}) {
  return String(raw.justificativa ?? raw.fundamento ?? raw.comentario ?? raw.comentário
    ?? raw.explanation ?? raw.notes ?? raw.observacoes ?? raw.observations ?? "").trim();
}

function harness({ comSecao = true, comEntrada = true } = {}) {
  const eventos = [];
  const nos = new Map();
  const criar = (tag) => {
    const node = {
      tag, id: '', className: '', innerHTML: '', textContent: '', value: '', files: null,
      filhos: [], parentNode: null, ouvintes: {},
      appendChild(filho) { filho.parentNode = this; this.filhos.push(filho); if (filho.id) nos.set(filho.id, filho); return filho; },
      addEventListener(nome, fn) { (this.ouvintes[nome] ||= []).push(fn); },
      dispatchEvent(evento) { eventos.push({ id: this.id, tipo: evento?.type }); return true; },
      querySelector() { return null; },
      closest() { return null; }
    };
    return node;
  };

  if (comSecao) { const s = criar('section'); s.id = 'view-metas-do-dia'; nos.set(s.id, s); }
  if (comEntrada) { const e = criar('input'); e.id = 'qbFile'; nos.set(e.id, e); }

  const context = {
    console: { warn() {}, error() {}, info() {} },
    questionBankExplanation: explicacaoDoSite,
    document: { getElementById: (id) => nos.get(id) || null, createElement: criar },
    File: class { constructor(partes) { this.partes = partes; } },
    DataTransfer: class { constructor() { this.items = { add: () => {} }; this.files = ['fake']; } },
    Event: class { constructor(tipo) { this.type = tipo; } },
    setInterval: () => 0,
    clearInterval() {}
  };
  context.globalThis = context;
  context.window = context;
  vm.createContext(context);
  vm.runInContext(read('daily-plan-question-import-v451.js'), context);
  return { context, api: context.__ALDUS_DAILY_PLAN_QUESTION_IMPORT_V451__, nos, eventos };
}

// Uma questão como o cartão realmente exporta, tirada do arquivo dele de 06/09/2026.
const questaoDoCartao = {
  id: 'Q3848977',
  enunciado: 'A Polícia Civil do Estado do Piauí tomou conhecimento...',
  gabarito: 'C',
  observacoes: 'Acertei — marquei C, correta C — 06/09/2026',
  justificativa_qconcursos: 'O STJ entende que a pluralidade de vítimas...',
  explicacao_complementar: 'Note a diferença entre o dolo eventual e a culpa consciente.'
};

test('V451 aproveita a justificativa que o cartão exporta', () => {
  const { api } = harness();
  const saida = api.explicacao(questaoDoCartao);
  assert.match(saida, /Justificativa — QConcursos: O STJ entende/);
  assert.match(saida, /Explicação complementar: Note a diferença/);
});

test('V451 conserta o que o site fazia: gravar o registro do acerto como justificativa', () => {
  const { api } = harness();
  // O que acontecia antes desta correção:
  assert.equal(explicacaoDoSite(questaoDoCartao), 'Acertei — marquei C, correta C — 06/09/2026');
  // O que passa a acontecer:
  assert.doesNotMatch(api.explicacao(questaoDoCartao), /marquei C, correta C/);
});

test('V451 assume a função do site, para valer nas duas importações', () => {
  const { context, api } = harness();
  assert.equal(context.questionBankExplanation, api.explicacao,
    'sem assumir a função, o caminho da Fábrica continuaria descartando a justificativa');
});

test('V451 não estraga questão sem os campos novos', () => {
  const { api } = harness();
  assert.equal(api.explicacao({ justificativa: 'texto antigo' }), 'texto antigo');
  assert.equal(api.explicacao({ fundamento: 'outro' }), 'outro');
  assert.equal(api.explicacao({}), '');
});

test('V451 cria o painel dentro do Plano do Dia', () => {
  const { nos } = harness();
  const painel = nos.get('aldusDailyPlanQuestionImportV451');
  assert.ok(painel, 'o painel precisa existir');
  assert.equal(painel.parentNode.id, 'view-metas-do-dia');
  assert.match(painel.innerHTML, /Registrar questões do cartão/);
  assert.match(painel.innerHTML, /data-v451="texto"/);
});

test('V451 não reimplanta importação: entrega ao mesmo input da Fábrica', () => {
  const { api, eventos } = harness();
  const r = api.enviarParaRevisao(JSON.stringify({ questionBank: [questaoDoCartao] }));
  assert.equal(r.enviado, true);
  assert.deepEqual(eventos, [{ id: 'qbFile', tipo: 'change' }],
    'o change no #qbFile é o que abre a revisão da V192, com validadas, certas e erradas');
});

test('V451 recusa texto que não é JSON, antes de mexer em qualquer coisa', () => {
  const { api, eventos } = harness();
  const r = api.enviarParaRevisao('colei a mensagem inteira do chat por engano');
  assert.match(r.erro, /não é um JSON válido|nao e um JSON valido/i);
  assert.equal(eventos.length, 0, 'nada pode ser disparado com conteúdo inválido');
});

test('V451 avisa quando a importação da Fábrica não está na página', () => {
  const { api } = harness({ comEntrada: false });
  const r = api.enviarParaRevisao('{"questionBank":[]}');
  assert.match(r.erro, /Fábrica|Fabrica/);
});

test('V451 mantém paridade raiz/docs', () => {
  assert.equal(read('daily-plan-question-import-v451.js'), read('docs/daily-plan-question-import-v451.js'));
});
