const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const version = JSON.parse(fs.readFileSync("package.json", "utf8")).version;
const html = fs.readFileSync("index.html", "utf8");
const script = fs.readFileSync("script.js", "utf8");
const worker = fs.readFileSync("service-worker.js", "utf8");

function optionApi(items) {
  const start = script.indexOf("const QCONCURSOS_CONFIRMED_SUBJECTS");
  const end = script.indexOf("function renderGoalSelectors", start);
  const source = script.slice(start, end);
  return new Function("state", "escapeHTML", `${source}; return { qconcursosNumberForItem, questionItemOptionLabel, optionsForItems };`)(
    { syllabusItems: items },
    (value) => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
  );
}

test("assuntos mostram a numeração QC salva sem reutilizar a referência do edital", () => {
  const numbered = { id: "a", discipline: "Direito Penal", subject: "Princípios", subtopic: "Legalidade", reference: "9.4", qconcursosNumber: "1.2" };
  const legacy = { id: "b", discipline: "Direito Penal", subject: "Crimes", qcSubjectNumber: "12.3.2" };
  const unnumbered = { id: "c", discipline: "Direito Penal", subject: "Penas", reference: "7.1" };
  const api = optionApi([numbered, legacy, unnumbered]);
  assert.equal(api.questionItemOptionLabel(numbered, true), "[QC 1.2] Princípios • Legalidade");
  assert.equal(api.questionItemOptionLabel(legacy, true), "[QC 12.3.2] Crimes");
  assert.equal(api.questionItemOptionLabel(unnumbered, true), "Penas");
  assert.equal(api.qconcursosNumberForItem(unnumbered), "");
});

test("seletor de registro e filtro do histórico exibem o prefixo QC", () => {
  const items = [
    { id: "a", discipline: "Direito Penal", subject: "Princípios", qconcursosNumber: "1.2" },
    { id: "b", discipline: "Direito Civil", subject: "Contratos", qconcursosNumber: "3.4" }
  ];
  const api = optionApi(items);
  const select = { innerHTML: "" };
  api.optionsForItems(select, "Direito Penal", "a", { showQconcursosNumber: true });
  assert.match(select.innerHTML, /\[QC 1\.2\] Princípios/);
  assert.doesNotMatch(select.innerHTML, /Contratos/);
  assert.match(script, /questionFilterSubject[\s\S]*questionItemOptionLabel\(item, true\)/);
});

test("salvar ou remover a numeração atualiza a lista e a rota imediatamente", () => {
  const start = script.indexOf('elements.saveQuestionQcNumber?.addEventListener');
  const end = script.indexOf('elements.questionSubjectSummary?.addEventListener', start);
  const block = script.slice(start, end);
  assert.match(block, /item\.qconcursosNumber = number/);
  assert.match(block, /renderQuestionSelectors\(\); renderQconcursosFilterRoute\(\)/);
  assert.match(block, /autoSyncAfterSave\("qconcursos-subject-number"\)/);
});

test("a rota e o vínculo ativo destacam o código usado no QConcursos", () => {
  assert.match(script, /Número para filtrar no QConcursos: QC/);
  assert.match(script, /route\.qcNumber \? `QC \$\{route\.qcNumber\}\$\{/);
  assert.match(html, /Assunto do edital \(com número QC automático ou confirmado\)/);
  assert.match(html, /sugere automaticamente os números já confirmados/);
});

test("versão v54 e publicação permanecem sincronizadas", () => {
  assert.match(worker, new RegExp(`const CURRENT_VERSION = "${version}"`));
  assert.match(worker, /"20260718-contraste-interno-v53"/);
  assert.match(html, new RegExp(`Versão: ${version}`));
  for (const file of ["index.html", "script.js", "service-worker.js", "header-brand-fix.js", "sync-integral-time-protection.js"]) {
    assert.equal(fs.readFileSync(file, "utf8"), fs.readFileSync(`docs/${file}`, "utf8"), `${file} deve ser idêntico em docs`);
  }
});
