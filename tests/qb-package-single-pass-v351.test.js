const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const vm = require("node:vm");

const source = fs.readFileSync("script.js", "utf8");

function recorte(inicio, fim, rotulo) {
  const start = source.indexOf(inicio);
  assert.ok(start >= 0, `${rotulo}: início não encontrado`);
  const end = source.indexOf(fim, start);
  assert.ok(end > start, `${rotulo}: fim não encontrado`);
  return source.slice(start, end);
}

function carregar(state) {
  const trecho = recorte("const QB_PARTIAL_MATCH_CACHE = new Map();", "function qbSyllabusPackageQuestions(", "correspondência do banco");
  const context = { console, state };
  context.globalThis = context;
  context.canonical = (value) => String(value ?? "").trim().toLowerCase();
  vm.createContext(context);
  vm.runInContext(trecho, context);
  return context;
}

// Implementação literal anterior à memoização, usada como referência.
function partialMatchLegado(canonical, a, b) {
  const x = canonical(a).replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
  const y = canonical(b).replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
  if (!x || !y) return false;
  if (x === y) return true;
  const minLen = Math.min(x.length, y.length);
  if (minLen < 4) return false;
  return x.includes(y) || y.includes(x);
}

// Uma passada só, como no código novo, comparada com as três passadas originais.
function coberturaLegada(questionBank, items, matches) {
  const questions = questionBank.filter((q) => items.some((item) => matches(q, item)));
  const covered = items.filter((item) => questions.some((q) => matches(q, item)));
  const missing = items.filter((item) => !covered.includes(item));
  return { questions, covered, missing };
}

function coberturaPassadaUnica(questionBank, items, matches) {
  const itensCobertos = new Set();
  const questions = questionBank.filter((q) => {
    let casou = false;
    items.forEach((item) => {
      if (!matches(q, item)) return;
      casou = true;
      itensCobertos.add(item);
    });
    return casou;
  });
  return {
    questions,
    covered: items.filter((item) => itensCobertos.has(item)),
    missing: items.filter((item) => !itensCobertos.has(item))
  };
}

function mulberry32(seed) {
  return function next() {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

test("a normalização memoizada devolve o mesmo veredito da versão original", () => {
  const ctx = carregar({ questionBank: [] });
  const valores = ["Direito Penal", "direito  penal", "Nulidades!", "nul", "Súmulas — vinculantes", "", null, undefined, 0, 123,
    "Prisão Temporária", "prisao temporaria", "  ", "ab", "abcd", "Processo Penal / Provas", "provas"];
  valores.forEach((a) => {
    valores.forEach((b) => {
      assert.equal(
        ctx.qbSafePartialMatch(a, b),
        partialMatchLegado(ctx.canonical, a, b),
        `divergiu em ${JSON.stringify(a)} x ${JSON.stringify(b)}`
      );
    });
  });
});

test("cobertura em uma passada dá exatamente o mesmo resultado das três passadas", () => {
  const rand = mulberry32(20260817);
  const disciplinas = ["Direito Penal", "Processo Penal", "Criminologia"];
  const assuntos = ["Nulidades", "Prazos", "Súmulas", "Provas", "Prisão Temporária", "Competência"];

  for (let rodada = 0; rodada < 12; rodada += 1) {
    const items = [];
    for (let i = 0; i < 25; i += 1) {
      items.push({
        id: `item-${i}`,
        discipline: disciplinas[Math.floor(rand() * disciplinas.length)],
        subject: assuntos[Math.floor(rand() * assuntos.length)],
        topic: rand() < 0.3 ? assuntos[Math.floor(rand() * assuntos.length)] : undefined
      });
    }
    const questionBank = [];
    for (let i = 0; i < 60; i += 1) {
      questionBank.push({
        id: `q-${i}`,
        disciplina: disciplinas[Math.floor(rand() * disciplinas.length)],
        assunto: rand() < 0.8 ? assuntos[Math.floor(rand() * assuntos.length)] : "",
        tema: rand() < 0.4 ? assuntos[Math.floor(rand() * assuntos.length)] : undefined
      });
    }
    const ctx = carregar({ questionBank });
    const matches = (q, item) => ctx.qbMatchesSyllabusItem(q, item);

    const legado = coberturaLegada(questionBank, items, matches);
    const novo = coberturaPassadaUnica(questionBank, items, matches);

    assert.deepEqual(novo.questions.map((q) => q.id), legado.questions.map((q) => q.id), `rodada ${rodada}: questions divergiu`);
    assert.deepEqual(novo.covered.map((i) => i.id), legado.covered.map((i) => i.id), `rodada ${rodada}: covered divergiu`);
    assert.deepEqual(novo.missing.map((i) => i.id), legado.missing.map((i) => i.id), `rodada ${rodada}: missing divergiu`);
    // o cenário precisa ter cobertura parcial para o teste valer
    if (rodada === 0) assert.ok(legado.covered.length > 0 && legado.missing.length > 0, "o cenário deve ter itens cobertos e descobertos");
  }
});

test("a passada única e a memoização viajam no código publicado", () => {
  assert.match(source, /const itensCobertos = new Set\(\);/);
  assert.match(source, /const covered = items\.filter\(\(item\) => itensCobertos\.has\(item\)\);/);
  assert.match(source, /const missing = items\.filter\(\(item\) => !itensCobertos\.has\(item\)\);/);
  assert.doesNotMatch(source, /items\.filter\(\(item\) => !covered\.includes\(item\)\)/, "o laço quadrático de missing não deve voltar");
  assert.match(source, /function qbNormalizeForPartialMatch\(value\)/);

  for (const gerado of ["app-v344.js", "docs/app-v344.js"]) {
    const conteudo = fs.readFileSync(gerado, "utf8");
    assert.match(conteudo, /function qbNormalizeForPartialMatch\(value\)/, `${gerado} está sem a memoização`);
    assert.match(conteudo, /const itensCobertos = new Set\(\);/, `${gerado} está sem a passada única`);
  }
});
