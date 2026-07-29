const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const read = (file) => fs.readFileSync(file, "utf8");
const source = read("aldus-question-register-v180.css");
const published = read("docs/aldus-question-register-v180.css");
const bundle = read("app-v169.css");

test("refinamento de Registrar questões possui paridade de publicação", () => {
  assert.equal(source, published);
  assert.equal(
    (bundle.match(/Aldus source: aldus-question-register-v180\.css/g) || []).length,
    1
  );
});

test("refinamento fica restrito ao desktop e à área Registrar questões", () => {
  assert.match(source, /@media \(min-width: 1051px\)/);
  assert.doesNotMatch(source, /@media \(max-width:/);
  assert.doesNotMatch(source, /#view-(?!questoes)/);
  assert.match(source, /#view-questoes \.question-registration-flow/);
  assert.match(source, /#view-questoes \.question-register-section/);
});

test("layout melhora hierarquia, leitura dos campos e resultados", () => {
  assert.match(source, /grid-template-columns: repeat\(12, minmax\(0, 1fr\)\)/);
  assert.match(source, /label:has\(#questionCorrect\)/);
  assert.match(source, /label:has\(#questionWrong\)/);
  assert.match(source, /label:has\(#questionBlank\)/);
  assert.match(source, /#questionCalculated/);
  assert.match(source, /#questionAnalysis/);
  assert.match(source, /#questionNotebookPanel/);
  assert.match(source, /button\[type="submit"\]/);
});

test("camada visual não acessa dados, armazenamento ou execução", () => {
  for (const forbidden of [
    "localStorage",
    "sessionStorage",
    "indexedDB",
    "saveData",
    "state.",
    "fetch(",
    "MutationObserver",
    "addEventListener"
  ]) {
    assert.equal(source.includes(forbidden), false, `não deve conter ${forbidden}`);
  }
});
