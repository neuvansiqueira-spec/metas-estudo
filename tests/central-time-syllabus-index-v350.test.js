const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const vm = require("node:vm");

// O arquivo completo depende do DOM, então recortamos apenas os trechos
// necessários pelos marcadores das funções envolvidas.
function recorte(source, inicio, fim, rotulo) {
  const start = source.indexOf(inicio);
  assert.ok(start >= 0, `${rotulo}: início não encontrado`);
  const end = source.indexOf(fim, start);
  assert.ok(end > start, `${rotulo}: fim não encontrado`);
  return source.slice(start, end);
}

function carregar() {
  const source = fs.readFileSync("app-v344.js", "utf8");

  const canonico = recorte(
    source,
    "const DAILY_PLAN_CANONICAL_CACHE = new Map();",
    "function dailyPlanSubjectKey",
    "dailyPlanCanonical"
  );
  const indice = recorte(
    source,
    "function centralTimeSyllabusIndex(",
    "function centralTimeLogEdital(",
    "centralTimeSyllabusIndex"
  );

  const context = { console, state: { syllabusItems: [] } };
  context.globalThis = context;
  // centralTimeLogSyllabusItem depende dessa comparação de assuntos; a versão
  // real usa aliases, e aqui basta uma equivalência canônica para exercitar o
  // índice sem arrastar o resto do arquivo.
  vm.createContext(context);
  vm.runInContext(canonico, context);
  vm.runInContext(
    "function dailyPlanSubjectsCompatible(left, right) { return dailyPlanCanonical(left) === dailyPlanCanonical(right); }",
    context
  );
  vm.runInContext(indice, context);
  return context;
}

// Implementação literal anterior à otimização, usada como referência.
function buscaLegada(ctx, log) {
  const items = ctx.state.syllabusItems || [];
  const exact = log.syllabusItemId ? items.find((item) => item.id === log.syllabusItemId) : null;
  if (exact) return exact;
  return items.find((item) =>
    ctx.dailyPlanCanonical(item.discipline) === ctx.dailyPlanCanonical(log.discipline)
    && ctx.dailyPlanSubjectsCompatible(item.subject, log.subject)) || null;
}

function mulberry32(seed) {
  return function next() {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Cobre o que a busca distingue: acento e caixa divergentes, espaços repetidos,
// disciplinas homônimas com assuntos diferentes, ids ausentes e ids inexistentes.
function gerarCenario(quantidadeItens, quantidadeLogs, semente) {
  const rand = mulberry32(semente);
  const disciplinas = ["Direito Constitucional", "DIREITO  penal", "Ética e Cidadania", "Raciocínio Lógico", "Legislação Extravagante"];
  const assuntos = ["Princípios", "principios", "Nulidades", "  Prazos ", "Súmulas"];

  const itens = [];
  for (let i = 0; i < quantidadeItens; i += 1) {
    itens.push({
      id: `item-${i}`,
      discipline: disciplinas[Math.floor(rand() * disciplinas.length)],
      subject: assuntos[Math.floor(rand() * assuntos.length)]
    });
  }

  const logs = [];
  for (let i = 0; i < quantidadeLogs; i += 1) {
    const sorteio = rand();
    logs.push({
      syllabusItemId: sorteio < 0.2 ? `item-${Math.floor(rand() * quantidadeItens)}`
        : sorteio < 0.3 ? "item-inexistente"
          : "",
      discipline: disciplinas[Math.floor(rand() * disciplinas.length)],
      subject: assuntos[Math.floor(rand() * assuntos.length)]
    });
  }

  return { itens, logs };
}

test("a otimização está na fonte, não apenas no arquivo gerado", () => {
  // app-v344.js e app.bundle.js são gerados por build-bundles.mjs a partir de
  // script.js. Editar o gerado direto funciona até o próximo `npm run build`,
  // que sobrescreve a alteração silenciosamente.
  const fonte = fs.readFileSync("script.js", "utf8");
  assert.match(fonte, /const DAILY_PLAN_CANONICAL_CACHE = new Map\(\);/,
    "a memoização precisa estar em script.js, senão o build a descarta");
  assert.match(fonte, /function centralTimeSyllabusIndex\(/,
    "o índice precisa estar em script.js, senão o build o descarta");

  for (const gerado of ["app-v344.js", "app.bundle.js", "docs/app-v344.js", "docs/app.bundle.js"]) {
    const conteudo = fs.readFileSync(gerado, "utf8");
    assert.match(conteudo, /const DAILY_PLAN_CANONICAL_CACHE = new Map\(\);/, `${gerado} está sem a memoização`);
    assert.match(conteudo, /function centralTimeSyllabusIndex\(/, `${gerado} está sem o índice`);
    assert.match(conteudo, /centralTimeLogEdital\(log, syllabusIndex\)/, `${gerado} não repassa o índice`);
  }
});

test("dailyPlanCanonical memoizada devolve o mesmo resultado da versão original", () => {
  const ctx = carregar();
  const original = (value) => String(value || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim().replace(/\s+/g, " ");
  const casos = ["Direito Constitucional", "  DIREITO   penal  ", "Ética", "Raciocínio Lógico-Matemático", "", null, undefined, 0, 123, "ÁÀÂÃÄ Çç ÉÊ Íï Óôõ Úü Ññ", "já  não   é"];
  casos.forEach((caso) => {
    assert.equal(ctx.dailyPlanCanonical(caso), original(caso), `divergiu em ${JSON.stringify(caso)}`);
    assert.equal(ctx.dailyPlanCanonical(caso), ctx.dailyPlanCanonical(caso), "segunda chamada deve repetir o resultado");
  });
});

test("o índice devolve exatamente o mesmo item que a varredura anterior", () => {
  const ctx = carregar();
  const { itens, logs } = gerarCenario(400, 1500, 20260817);
  ctx.state.syllabusItems = itens;

  const index = ctx.centralTimeSyllabusIndex();
  logs.forEach((log, i) => {
    const esperado = buscaLegada(ctx, log);
    const obtido = ctx.centralTimeLogSyllabusItem(log, index);
    assert.equal(obtido, esperado, `log ${i} divergiu`);
  });
});

test("sem índice o comportamento permanece o da varredura, para não afetar outros callers", () => {
  const ctx = carregar();
  const { itens, logs } = gerarCenario(120, 300, 7);
  ctx.state.syllabusItems = itens;

  logs.forEach((log, i) => {
    assert.equal(ctx.centralTimeLogSyllabusItem(log), buscaLegada(ctx, log), `log ${i} divergiu sem índice`);
  });
});

test("itens com id repetido continuam resolvendo para a primeira ocorrência", () => {
  const ctx = carregar();
  const primeiro = { id: "dup", discipline: "Direito", subject: "A" };
  const segundo = { id: "dup", discipline: "Direito", subject: "B" };
  ctx.state.syllabusItems = [primeiro, segundo];

  const index = ctx.centralTimeSyllabusIndex();
  assert.equal(ctx.centralTimeLogSyllabusItem({ syllabusItemId: "dup" }, index), primeiro);
  assert.equal(ctx.centralTimeLogSyllabusItem({ syllabusItemId: "dup" }, index), buscaLegada(ctx, { syllabusItemId: "dup" }));
});

test("itens nulos e lista vazia não quebram o índice", () => {
  const ctx = carregar();
  ctx.state.syllabusItems = [null, undefined, { id: "ok", discipline: "Direito", subject: "A" }];
  const index = ctx.centralTimeSyllabusIndex();
  assert.equal(ctx.centralTimeLogSyllabusItem({ syllabusItemId: "ok" }, index).id, "ok");
  assert.equal(ctx.centralTimeLogSyllabusItem({ discipline: "Inexistente", subject: "Z" }, index), null);

  ctx.state.syllabusItems = [];
  const vazio = ctx.centralTimeSyllabusIndex();
  assert.equal(ctx.centralTimeLogSyllabusItem({ discipline: "Direito", subject: "A" }, vazio), null);
});

test("consultar todos os logs contra o índice não cresce de forma quadrática", () => {
  const ctx = carregar();

  function medir(quantidadeItens, quantidadeLogs) {
    const { itens, logs } = gerarCenario(quantidadeItens, quantidadeLogs, 99);
    ctx.state.syllabusItems = itens;
    const inicio = process.hrtime.bigint();
    const index = ctx.centralTimeSyllabusIndex();
    logs.forEach((log) => ctx.centralTimeLogSyllabusItem(log, index));
    return Number(process.hrtime.bigint() - inicio) / 1e6;
  }

  medir(200, 500);
  const base = Math.max(medir(200, 500), 0.5);
  const dobro = medir(400, 1000);

  // Dobrando itens e logs ao mesmo tempo, uma varredura por log quadruplicaria o
  // tempo. Com o índice o crescimento é aproximadamente linear; a folga é ampla
  // para não deixar o teste instável em máquina compartilhada.
  assert.ok(
    dobro < base * 3.5,
    `crescimento quadrático detectado: ${base.toFixed(2)} ms para 200x500 e ${dobro.toFixed(2)} ms para 400x1000`
  );
});
