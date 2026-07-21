const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const html = fs.readFileSync('index.html', 'utf8');
const script = fs.readFileSync('script.js', 'utf8');
const style = fs.readFileSync('style.css', 'utf8');

test('registro possui ficha recolhível com os campos solicitados', () => {
  const ids = ['questionNotebookPanel','questionQcCode','questionQcLink','questionStatement','questionAlternatives','questionMarkedAnswer','questionAnswerKey','questionPersonalComment','questionErrorReason','questionLegalBasis','questionBizu1','questionBizu2','questionBizu3','questionAddToErrorNotebook'];
  ids.forEach((id) => assert.match(html, new RegExp(`id="${id}"`)));
  assert.doesNotMatch(html, /<details id="questionNotebookPanel"[^>]* open/);
});

test('ficha é salva no lançamento, restaurada na edição e pode alimentar o caderno de erros', () => {
  assert.match(script, /questionNotebook = readQuestionNotebookFromForm/);
  assert.match(script, /questionNotebook,/);
  assert.match(script, /writeQuestionNotebookToForm\(log\.questionNotebook\)/);
  assert.match(script, /registrarNoCadernoErros\(\{ id:`manual-\$\{id\}`/);
  assert.match(script, /questionNotebookSummaryHTML\(r\.original\?\.questionNotebook\)/);
});

test('visual da ficha está limitado aos componentes do caderno da questão', () => {
  assert.match(style, /\.question-notebook-panel/);
  assert.match(style, /\.question-history-notebook-content/);
});

test('arquivos publicados permanecem iguais aos arquivos principais', () => {
  assert.equal(fs.readFileSync('docs/index.html', 'utf8'), html);
  assert.equal(fs.readFileSync('docs/script.js', 'utf8'), script);
  assert.equal(fs.readFileSync('docs/style.css', 'utf8'), style);
});
