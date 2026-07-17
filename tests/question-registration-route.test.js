const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const html = fs.readFileSync('index.html', 'utf8');
const script = fs.readFileSync('script.js', 'utf8');
const style = fs.readFileSync('style.css', 'utf8');

function routeLogic() {
  const start = script.indexOf('const QCONCURSOS_DELEGADO_URL');
  const end = script.indexOf('function renderQconcursosFilterRoute', start);
  return new Function(`${script.slice(start, end)}; return { buildQconcursosFilterRoute, QCONCURSOS_DELEGADO_URL };`)();
}

test('registro de questões possui duas etapas recolhíveis sem duplicar o formulário', () => {
  const view = html.slice(html.indexOf('id="view-questoes"'), html.indexOf('id="view-banco-questoes"'));
  assert.equal((view.match(/<details class="question-register-section/g) || []).length, 2);
  assert.equal((view.match(/id="questionForm"/g) || []).length, 1);
  assert.match(view, /ETAPA 1 • BUSCA E CONTEÚDO/);
  assert.match(view, /Encontrar e Filtrar Questões para Delegado/);
  assert.match(view, /ETAPA 2 • RESULTADO/);
  assert.match(view, /Registrar Resultado da Nova Sessão/);
});

test('capitalização visual mantém preposições em minúsculas sem alterar o valor original', () => {
  const start = script.indexOf('function portugueseTitleCase');
  const end = script.indexOf('function buildQconcursosFilterRoute', start);
  const titleCase = new Function(`${script.slice(start, end)}; return portugueseTitleCase;`)();
  const original = 'representação por prisão temporária e medidas cautelares';
  assert.equal(titleCase(original), 'Representação por Prisão Temporária e Medidas Cautelares');
  assert.equal(original, 'representação por prisão temporária e medidas cautelares');
});

test('rota prioriza cargo Delegado e preserva disciplina, assunto, subtema e banca', () => {
  const api = routeLogic();
  const route = api.buildQconcursosFilterRoute({ discipline:'Direito Processual Penal', topic:'Prisões', subject:'Prisão temporária', subtopic:'Representação' }, 'Cebraspe');
  assert.match(route.url, /job_ids%5B%5D=169/);
  assert.equal(route.discipline, 'Direito Processual Penal');
  assert.equal(route.theme, 'Prisões');
  assert.equal(route.subject, 'Prisão temporária');
  assert.equal(route.subtopic, 'Representação');
  assert.equal(route.board, 'Cebraspe');
});

test('rota inclui numeração própria do QC e não reaproveita referência do edital', () => {
  const api = routeLogic();
  const mapped = api.buildQconcursosFilterRoute({ discipline:'Direito Penal', subject:'Princípios', reference:'9.4', qconcursosNumber:'1.2' }, 'Cebraspe');
  const unmapped = api.buildQconcursosFilterRoute({ discipline:'Direito Penal', subject:'Princípios', reference:'9.4' }, 'Cebraspe');
  assert.equal(mapped.qcNumber, '1.2');
  assert.equal(unmapped.qcNumber, '');
  assert.match(script, /Numeração do Assunto no QC/);
});

test('resultado mostra vínculo ativo e salvamento mantém syllabusItemId, disciplina e assunto', () => {
  assert.match(html, /id="questionRegistrationLinkSummary"/);
  assert.match(script, /VÍNCULO ATIVO DA SESSÃO/);
  const saveBlock = script.slice(script.indexOf('function saveQuestionLog'), script.indexOf('function questionRecordItem'));
  assert.match(saveBlock, /syllabusItemId: item\.id/);
  assert.match(saveBlock, /discipline: elements\.questionDiscipline\.value/);
  assert.match(saveBlock, /subject: item\.subject/);
});

test('hierarquia principal e secundária tem identidade visual responsiva', () => {
  assert.match(html, /view-identity-heading/);
  assert.match(style, /\.app-view > \.section-heading/);
  assert.match(style, /\.question-register-section > summary/);
  assert.match(style, /\.question-topic-hierarchy/);
  assert.match(style, /@media \(max-width: 720px\)[\s\S]*\.question-topic-hierarchy \{ grid-template-columns: 1fr;/);
});

test('orientador avisa como ampliar amostra e abre site externo com segurança', () => {
  assert.match(script, /menos de 20 questões/);
  assert.match(script, /retire primeiro o período, depois a banca/);
  assert.match(script, /target="_blank" rel="noopener noreferrer"/);
});
