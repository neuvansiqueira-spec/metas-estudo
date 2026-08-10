const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(ROOT, file), "utf8");

function loadApi() {
  const file = path.join(ROOT, "question-bank-json-details-v299.js");
  delete require.cache[require.resolve(file)];
  delete global.AldusQuestionBankJsonDetailsV299;
  delete global.__aldusQuestionBankJsonDetailsV299;
  require(file);
  return global.AldusQuestionBankJsonDetailsV299;
}

test("V299 separa justificativa e comentário sem criar conteúdo ausente", () => {
  const api = loadApi();
  assert.deepEqual(api.detailsFromRaw({ justificativa: "Fundamento legal", comentario: "Comentário do professor" }), {
    justification: "Fundamento legal",
    comment: "Comentário do professor"
  });
  assert.deepEqual(api.detailsFromRaw({ comentarioQc: "Somente comentário oficial" }), {
    justification: "",
    comment: "Somente comentário oficial"
  });
  assert.deepEqual(api.detailsFromRaw({ justificativa: "  ", comentario: null }), {
    justification: "",
    comment: ""
  });
});

test("V299 reconhece aliases compatíveis do JSON", () => {
  const api = loadApi();
  assert.deepEqual(api.detailsFromRaw({ explanation: "Explicação", officialComment: { texto: "Comentário" } }), {
    justification: "Explicação",
    comment: "Comentário"
  });
  assert.equal(api.detailLabel({ justification: "J", comment: "C" }), "Justificativa e comentário");
  assert.equal(api.detailLabel({ justification: "J", comment: "" }), "Justificativa");
  assert.equal(api.detailLabel({ justification: "", comment: "C" }), "Comentário");
  assert.equal(api.detailLabel({ justification: "", comment: "" }), "");
});

test("V299 usa painel expansível e não adiciona colunas permanentes", () => {
  const source = read("question-bank-json-details-v299.js");
  assert.match(source, /aria-expanded/);
  assert.match(source, /detailRow\.hidden/);
  assert.match(source, /colspan="8"/);
  assert.match(source, /document\.addEventListener\("change", captureJsonBeforeReview, true\)/);
  assert.match(source, /@media\(max-width:720px\)/);
});

test("V299 é carregada antes do aplicativo e publicada com paridade em docs", () => {
  const html = read("index.html");
  const worker = read("service-worker.js");
  assert.match(html, /question-bank-json-details-v299\.js\?v=20260810-revisao-json-explicacoes-v299/);
  assert.ok(html.indexOf("aldusQuestionBankJsonDetailsV299") < html.indexOf('rel="preload" as="script"'));
  assert.match(worker, /QUESTION_JSON_DETAILS_SCRIPT/);
  assert.equal(read("question-bank-json-details-v299.js"), read("docs/question-bank-json-details-v299.js"));
  assert.equal(html, read("docs/index.html"));
  assert.equal(worker, read("docs/service-worker.js"));
});
