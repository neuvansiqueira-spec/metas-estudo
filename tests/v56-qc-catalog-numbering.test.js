const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const version = JSON.parse(fs.readFileSync("package.json", "utf8")).version;
const html = fs.readFileSync("index.html", "utf8");
const script = fs.readFileSync("script.js", "utf8");
const worker = fs.readFileSync("service-worker.js", "utf8");

function catalogApi() {
  const start = script.indexOf("const QCONCURSOS_CONFIRMED_SUBJECTS");
  const end = script.indexOf("function questionItemOptionLabel", start);
  return new Function(`${script.slice(start, end)}; return { qconcursosNumberResolution, qconcursosNumberForItem };`)();
}

test("catálogo do print reconhece as seis numerações visíveis de Direito Administrativo", () => {
  const api = catalogApi();
  const discipline = "Direito Administrativo";
  const cases = [
    ["Conceito, Fontes e Princípios do Direito Administrativo", "1"],
    ["Regime jurídico administrativo", "2"],
    ["Conceito de administração pública", "2.1"],
    ["Princípios da Administração Pública", "2.2"],
    ["Princípios - Legalidade, Impessoalidade, Moralidade, Publicidade e Eficiência", "2.3"],
    ["Princípios - Contraditório e Ampla Defesa", "2.4"]
  ];
  for (const [subject, number] of cases) {
    assert.deepEqual(api.qconcursosNumberResolution({ discipline, subject }), { number, source: "catalog" });
  }
});

test("número confirmado pelo usuário tem prioridade sobre o catálogo", () => {
  const result = catalogApi().qconcursosNumberResolution({
    discipline: "Direito Administrativo",
    subject: "Princípios da Administração Pública",
    qconcursosNumber: "8.8"
  });
  assert.deepEqual(result, { number: "8.8", source: "saved" });
});

test("assuntos não confirmados não recebem numeração inventada", () => {
  assert.deepEqual(catalogApi().qconcursosNumberResolution({ discipline: "Direito Administrativo", subject: "Licitações" }), { number: "", source: "missing" });
  assert.deepEqual(catalogApi().qconcursosNumberResolution({ discipline: "Direito Penal", subject: "Princípios" }), { number: "", source: "missing" });
});

test("interface exibe número automático e permite confirmação ou correção", () => {
  assert.match(script, /conforme catálogo do QC/);
  assert.match(script, /correspondência automática pelo catálogo/);
  assert.match(html, /Confirmar ou Corrigir Número do QC/);
  assert.match(html, /Ex\.: 1, 2\.2 ou 12\.3\.2/);
});

test("catálogo v56 permanece coberto após versões posteriores", () => {
  assert.match(version, /logo-exportacoes-visivel-v64$/);
  assert.match(worker, new RegExp(`const CURRENT_VERSION = "${version}"`));
  assert.match(worker, /"20260718-indicacao-qc-explicita-v55"/);
  assert.match(worker, /"20260718-numeracao-qc-catalogo-v56"/);
  assert.match(worker, /"20260718-cruzamento-qc-completo-v57"/);
  assert.match(worker, /"20260718-revisao-visual-global-v58"/);
  assert.match(worker, /"20260718-planejamento-contraste-v59"/);
  assert.match(html, new RegExp(`Versão: ${version}`));
  for (const file of ["index.html", "script.js", "service-worker.js", "header-brand-fix.js", "sync-integral-time-protection.js"]) {
    assert.equal(fs.readFileSync(file, "utf8"), fs.readFileSync(`docs/${file}`, "utf8"), `${file} deve ser idêntico em docs`);
  }
});
