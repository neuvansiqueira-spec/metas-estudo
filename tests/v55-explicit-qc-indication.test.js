const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const version = JSON.parse(fs.readFileSync("package.json", "utf8")).version;
const html = fs.readFileSync("index.html", "utf8");
const script = fs.readFileSync("script.js", "utf8");
const worker = fs.readFileSync("service-worker.js", "utf8");

function routeApi() {
  const catalogStart = script.indexOf("const QCONCURSOS_CONFIRMED_SUBJECTS");
  const catalogEnd = script.indexOf("function questionItemOptionLabel", catalogStart);
  const routeStart = script.indexOf("const QCONCURSOS_DELEGADO_URL");
  const routeEnd = script.indexOf("function renderQconcursosFilterRoute", routeStart);
  return new Function(`${script.slice(catalogStart, catalogEnd)}\n${script.slice(routeStart, routeEnd)}; return { buildQconcursosFilterRoute };`)();
}

test("referência numérica do edital não vira código e catálogo fornece a numeração QC", () => {
  const route = routeApi().buildQconcursosFilterRoute({
    discipline: "Direito Administrativo",
    topic: "9.1 Conceito, Fontes e Princípios do Direito Administrativo.",
    subject: "Princípios da Administração Pública",
    subtopic: "9.1.1"
  }, "Cebraspe");
  assert.equal(route.subtopic, "");
  assert.equal(route.editalReference, "9.1.1");
  assert.equal(route.searchTerm, "Princípios da Administração Pública");
  assert.equal(route.qcNumber, "2.2");
  assert.equal(route.qcNumberSource, "catalog");
});

test("subtema textual continua complementando a busca no QC", () => {
  const route = routeApi().buildQconcursosFilterRoute({
    discipline: "Direito Processual Penal",
    subject: "Prisão temporária",
    subtopic: "Representação",
    reference: "9.4",
    qconcursosNumber: "2.1"
  }, "Cebraspe");
  assert.equal(route.subtopic, "Representação");
  assert.equal(route.editalReference, "9.4");
  assert.equal(route.searchTerm, "Prisão temporária — Representação");
  assert.equal(route.qcNumber, "2.1");
});

test("hierarquia mostra indicação QC, código próprio e referência do edital separados", () => {
  assert.match(script, /ASSUNTO PARA BUSCAR NO QCONCURSOS/);
  assert.match(script, /`QC • \$\{portugueseTitleCase\(route\.subject\)\}`/);
  assert.match(script, /NÚMERO DO ASSUNTO NO QCONCURSOS/);
  assert.match(script, /REFERÊNCIA DO EDITAL — NÃO É QC/);
  assert.match(script, /Ainda não localizado — procure pelo nome acima no QConcursos/);
});

test("orientação impede copiar automaticamente a numeração do edital", () => {
  assert.match(html, /Não copie a referência do edital/);
  assert.match(html, /ela não é o número QC/);
  assert.match(html, /sugere automaticamente os números já confirmados/);
});

test("base v55 e arquivos publicados permanecem sincronizados", () => {
  assert.match(worker, new RegExp(`const CURRENT_VERSION = "${version}"`));
  assert.match(worker, /"20260718-numeracao-qc-filtros-v54"/);
  assert.match(html, new RegExp(`Versão: ${version}`));
  for (const file of ["index.html", "script.js", "service-worker.js", "header-brand-fix.js", "sync-integral-time-protection.js"]) {
    assert.equal(fs.readFileSync(file, "utf8"), fs.readFileSync(`docs/${file}`, "utf8"), `${file} deve ser idêntico em docs`);
  }
});
