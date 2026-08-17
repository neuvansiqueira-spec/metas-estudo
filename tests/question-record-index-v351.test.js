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
  const trecho = recorte("function questionRecordIndexV351(", "function questionRecordTotals(", "índice de registros");
  const context = { console, state };
  context.globalThis = context;
  context.canonical = (value) => String(value ?? "").trim().toLowerCase();
  context.getSyllabusById = (id) => state.syllabusItems.find((item) => item.id === id);
  vm.createContext(context);
  vm.runInContext(trecho, context);
  return context;
}

// Implementação literal anterior ao índice, usada como referência.
function questionRecordItemLegado(state, canonical, record) {
  const direct = state.syllabusItems.find((item) => item.id === record.syllabusItemId);
  if (direct) return direct;
  const importKey = record.importKey || record.syllabusImportKey;
  if (importKey) {
    const found = state.syllabusItems.filter((item) => (item.importKey || item.importMeta?.importKey) === importKey);
    if (found.length === 1) return found[0];
  }
  const matches = state.syllabusItems.filter((item) => canonical(item.discipline) === canonical(record.discipline) && canonical(item.subject) === canonical(record.subject));
  return matches.length === 1 ? matches[0] : null;
}

function equivalenteLegado(state, canonical, group, session, counts) {
  return (state.questionLogs || []).some((log) => canonical(log.discipline) === canonical(group.discipline)
    && canonical(log.subject) === canonical(group.subject)
    && String(log.date || "") === String(session.createdAt || "").slice(0, 10)
    && Number(log.total) === counts.total
    && Number(log.correct) === counts.correct
    && Number(log.wrong) === counts.wrong
    && Number(log.blank) === counts.blank);
}

function mulberry32(seed) {
  return function next() {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Cobre o que a resolução distingue: id direto, id vazio, importKey única e
// repetida, chave canônica com um único candidato e com vários (que deve devolver
// null), acento e caixa divergentes.
function gerarCenario(semente) {
  const rand = mulberry32(semente);
  const disciplinas = ["Direito Penal", "DIREITO  penal", "Processo Penal", "Criminologia"];
  const assuntos = ["Nulidades", "nulidades", "Prazos", "  Súmulas "];
  const syllabusItems = [];
  for (let i = 0; i < 120; i += 1) {
    syllabusItems.push({
      id: rand() < 0.05 ? "" : `item-${i}`,
      discipline: disciplinas[Math.floor(rand() * disciplinas.length)],
      subject: assuntos[Math.floor(rand() * assuntos.length)],
      importKey: rand() < 0.3 ? `imp-${Math.floor(rand() * 30)}` : undefined
    });
  }
  const questionLogs = [];
  for (let i = 0; i < 200; i += 1) {
    questionLogs.push({
      id: `log-${i}`,
      date: `2026-08-${String(1 + Math.floor(rand() * 28)).padStart(2, "0")}`,
      discipline: disciplinas[Math.floor(rand() * disciplinas.length)],
      subject: assuntos[Math.floor(rand() * assuntos.length)],
      total: Math.floor(rand() * 5),
      correct: Math.floor(rand() * 3),
      wrong: Math.floor(rand() * 2),
      blank: Math.floor(rand() * 2)
    });
  }
  const registros = [];
  for (let i = 0; i < 300; i += 1) {
    registros.push({
      syllabusItemId: rand() < 0.3 ? `item-${Math.floor(rand() * 120)}` : (rand() < 0.5 ? "" : undefined),
      importKey: rand() < 0.25 ? `imp-${Math.floor(rand() * 30)}` : undefined,
      discipline: disciplinas[Math.floor(rand() * disciplinas.length)],
      subject: assuntos[Math.floor(rand() * assuntos.length)]
    });
  }
  return { state: { syllabusItems, questionLogs }, registros };
}

test("questionRecordItem indexado resolve exatamente o mesmo item que a varredura", () => {
  const { state, registros } = gerarCenario(20260817);
  const ctx = carregar(state);
  const indice = ctx.questionRecordIndexV351();

  registros.forEach((registro, i) => {
    const esperado = questionRecordItemLegado(state, ctx.canonical, registro);
    const obtido = ctx.questionRecordItem(registro, indice);
    assert.equal(obtido, esperado, `registro ${i} divergiu`);
  });
});

test("sem índice o comportamento permanece o da varredura", () => {
  const { state, registros } = gerarCenario(7);
  const ctx = carregar(state);
  registros.slice(0, 80).forEach((registro, i) => {
    assert.equal(ctx.questionRecordItem(registro), questionRecordItemLegado(state, ctx.canonical, registro), `registro ${i} divergiu sem índice`);
  });
});

test("o teste de equivalência das sessões dá o mesmo veredito da varredura", () => {
  const { state } = gerarCenario(99);
  const ctx = carregar(state);
  const indice = ctx.questionRecordIndexV351();
  const rand = mulberry32(4242);
  const disciplinas = ["Direito Penal", "DIREITO  penal", "Processo Penal", "Inexistente"];
  const assuntos = ["Nulidades", "nulidades", "Prazos", "Outro"];

  let casosVerdadeiros = 0;
  for (let i = 0; i < 400; i += 1) {
    // metade dos casos copia um registro existente, para garantir acertos reais
    const base = state.questionLogs[Math.floor(rand() * state.questionLogs.length)];
    const usarBase = rand() < 0.5;
    const group = usarBase
      ? { discipline: base.discipline, subject: base.subject }
      : { discipline: disciplinas[Math.floor(rand() * disciplinas.length)], subject: assuntos[Math.floor(rand() * assuntos.length)] };
    const session = { createdAt: `${usarBase ? base.date : "2026-08-15"}T10:00:00.000Z` };
    const counts = usarBase
      ? { total: base.total, correct: base.correct, wrong: base.wrong, blank: base.blank }
      : { total: Math.floor(rand() * 5), correct: Math.floor(rand() * 3), wrong: Math.floor(rand() * 2), blank: Math.floor(rand() * 2) };

    const esperado = equivalenteLegado(state, ctx.canonical, group, session, counts);
    const obtido = indice.logsEquivalentes.has([
      ctx.canonical(group.discipline), ctx.canonical(group.subject),
      String(session.createdAt || "").slice(0, 10),
      counts.total, counts.correct, counts.wrong, counts.blank
    ].join("|"));
    assert.equal(obtido, esperado, `caso ${i} divergiu`);
    if (esperado) casosVerdadeiros += 1;
  }
  assert.ok(casosVerdadeiros > 20, `o cenário precisa exercitar equivalências verdadeiras, teve ${casosVerdadeiros}`);
});

test("resolver todos os registros contra o índice não cresce de forma quadrática", () => {
  function medir(quantidadeItens, quantidadeRegistros) {
    const { state } = gerarCenario(1234);
    while (state.syllabusItems.length < quantidadeItens) state.syllabusItems.push({ ...state.syllabusItems[state.syllabusItems.length % 120], id: `extra-${state.syllabusItems.length}` });
    const ctx = carregar(state);
    const registros = [];
    for (let i = 0; i < quantidadeRegistros; i += 1) registros.push({ discipline: "Direito Penal", subject: "Nulidades", syllabusItemId: "" });
    const inicio = process.hrtime.bigint();
    const indice = ctx.questionRecordIndexV351();
    registros.forEach((r) => ctx.questionRecordItem(r, indice));
    return Number(process.hrtime.bigint() - inicio) / 1e6;
  }
  medir(240, 400);
  const base = Math.max(medir(240, 400), 0.5);
  const dobro = medir(480, 800);
  assert.ok(dobro < base * 3.5, `crescimento quadrático detectado: ${base.toFixed(2)} ms e ${dobro.toFixed(2)} ms`);
});

test("a consolidação é memoizada por chave de revisão e a otimização viaja no gerado", () => {
  assert.match(source, /let unifiedQuestionRecordsSnapshotV351 = null;/);
  assert.match(source, /function unifiedQuestionRecordsRevisionKeyV351\(\)/);
  assert.match(source, /unifiedQuestionRecordsSnapshotV351\?\.revisionKey === revisionKey/);
  assert.match(source, /questionRecordItem\(log, indice\)/);
  assert.match(source, /indice\.logsEquivalentes\.has\(/);

  for (const gerado of ["app-v344.js", "docs/app-v344.js"]) {
    const conteudo = fs.readFileSync(gerado, "utf8");
    assert.match(conteudo, /function questionRecordIndexV351\(/, `${gerado} está sem o índice`);
    assert.match(conteudo, /unifiedQuestionRecordsSnapshotV351/, `${gerado} está sem a memoização`);
  }
});
