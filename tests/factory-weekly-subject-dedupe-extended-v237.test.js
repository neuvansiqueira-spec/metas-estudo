const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const source = fs.readFileSync("factory-queue-integrity-v236.js", "utf8");

function createCard(title, metaText, options = {}) {
  const heading = { textContent: title };
  const meta = { textContent: metaText };
  return {
    dataset: {},
    removed: false,
    querySelector(selector) {
      if (selector === "h3") return options.withoutHeading ? null : heading;
      if (selector === "p.item-meta") return options.withoutMeta ? null : meta;
      return null;
    },
    remove() { this.removed = true; },
    heading,
    meta
  };
}

function loadRuntime(options = {}) {
  const {
    cards = [],
    scope = "week",
    exposeScope = true,
    activeWeek = false,
    includePanel = true,
    includeContent = true,
    includeBadge = true
  } = options;

  const badge = { textContent: String(cards.length) };
  const content = {
    querySelectorAll() { return cards.filter((card) => !card.removed); }
  };
  const panel = {
    querySelector(selector) {
      if (selector.includes("factory-collapsible-content")) return includeContent ? content : null;
      if (selector.includes("summary small")) return includeBadge ? badge : null;
      return null;
    }
  };
  const document = {
    querySelector(selector) {
      if (selector.includes("factory-today-plan")) return includePanel ? panel : null;
      if (selector.includes('[data-production-scope="week"].active')) return activeWeek ? {} : null;
      return null;
    }
  };
  const context = {
    console,
    document,
    location: { hash: "" },
    window: {
      setInterval() { return 1; },
      clearInterval() {},
      setTimeout() {}
    }
  };
  if (exposeScope) context.factoryProductionScope = scope;
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(source, context);
  return { api: context.__ALDUS_FACTORY_QUEUE_INTEGRITY_V236__, badge, cards };
}

test("quatro ocorrências do mesmo assunto viram um cartão com quatro datas", () => {
  const cards = [
    createCard("DIREITO PENAL — Concurso de Pessoas", "04/08/2026 • Precisa produzir"),
    createCard("DIREITO PENAL — Concurso de Pessoas", "05/08/2026 • Precisa produzir"),
    createCard("DIREITO PENAL — Concurso de Pessoas", "07/08/2026 • Precisa produzir"),
    createCard("DIREITO PENAL — Concurso de Pessoas", "09/08/2026 • Precisa produzir")
  ];
  const { api, badge } = loadRuntime({ cards });
  const result = api.dedupeWeeklyProjection();

  assert.equal(result.removed, 3);
  assert.equal(result.remaining, 1);
  assert.equal(badge.textContent, "1");
  assert.equal(cards[0].meta.textContent, "Datas: 04/08/2026, 05/08/2026, 07/08/2026 e 09/08/2026 • Precisa produzir");
  assert.equal(cards.filter((card) => !card.removed).length, 1);
});

test("vários grupos duplicados recalculam o contador global corretamente", () => {
  const cards = [
    createCard("PENAL — A", "04/08/2026 • Pendente"),
    createCard("PENAL — A", "05/08/2026 • Pendente"),
    createCard("PROCESSO PENAL — B", "04/08/2026 • Pendente"),
    createCard("PROCESSO PENAL — B", "06/08/2026 • Pendente"),
    createCard("ADMINISTRATIVO — C", "05/08/2026 • Pendente"),
    createCard("ADMINISTRATIVO — C", "07/08/2026 • Pendente")
  ];
  const { api, badge } = loadRuntime({ cards });
  const result = api.dedupeWeeklyProjection();

  assert.equal(result.removed, 3);
  assert.equal(result.remaining, 3);
  assert.equal(badge.textContent, "3");
  assert.deepEqual([...result.mergedSubjects], ["PENAL — A", "PROCESSO PENAL — B", "ADMINISTRATIVO — C"]);
});

test("títulos que apenas contêm o outro não são confundidos", () => {
  const { api } = loadRuntime();
  const result = api.collapseWeeklyProjectionRecords([
    { title: "DIREITO PENAL — Crime", date: "04/08/2026" },
    { title: "DIREITO PENAL — Crime Tentado", date: "05/08/2026" }
  ]);
  assert.equal(result.length, 2);
});

test("diferença de pontuação mantém assuntos separados", () => {
  const { api } = loadRuntime();
  const result = api.collapseWeeklyProjectionRecords([
    { title: "DIREITO PENAL — Lei penal", date: "04/08/2026" },
    { title: "DIREITO PENAL: Lei penal", date: "05/08/2026" }
  ]);
  assert.equal(result.length, 2);
});

test("acentos compostos e decompostos são tratados como o mesmo título", () => {
  const { api } = loadRuntime();
  const composed = "DIREITO ADMINISTRATIVO — Prescrição";
  const decomposed = composed.normalize("NFD");
  const result = api.collapseWeeklyProjectionRecords([
    { title: composed, date: "04/08/2026" },
    { title: decomposed, date: "05/08/2026" }
  ]);
  assert.equal(result.length, 1);
  assert.deepEqual([...result[0].dates], ["04/08/2026", "05/08/2026"]);
});

test("tabulações, quebras de linha e espaços repetidos não recriam duplicidade", () => {
  const { api } = loadRuntime();
  const result = api.collapseWeeklyProjectionRecords([
    { title: "DIREITO CONSTITUCIONAL — Controle de Constitucionalidade", date: "04/08/2026" },
    { title: "DIREITO CONSTITUCIONAL\t—\nControle   de Constitucionalidade", date: "06/08/2026" }
  ]);
  assert.equal(result.length, 1);
});

test("cartões sem título não são agrupados indevidamente", () => {
  const cards = [
    createCard("", "04/08/2026 • Pendente", { withoutHeading: true }),
    createCard("", "05/08/2026 • Pendente", { withoutHeading: true })
  ];
  const { api, badge } = loadRuntime({ cards });
  const result = api.dedupeWeeklyProjection();
  assert.equal(result.removed, 0);
  assert.equal(result.remaining, 2);
  assert.equal(badge.textContent, "2");
});

test("cartões duplicados sem metadados não causam erro", () => {
  const cards = [
    createCard("DIREITO PENAL — Tipicidade", "", { withoutMeta: true }),
    createCard("DIREITO PENAL — Tipicidade", "", { withoutMeta: true })
  ];
  const { api } = loadRuntime({ cards });
  const result = api.dedupeWeeklyProjection();
  assert.equal(result.removed, 1);
  assert.equal(result.remaining, 1);
  assert.equal(cards[0].dataset.weeklyMergedDatesV237, "");
});

test("ausência do painel semanal retorna resultado seguro", () => {
  const { api } = loadRuntime({ includePanel: false });
  assert.deepEqual(
    JSON.parse(JSON.stringify(api.dedupeWeeklyProjection())),
    { removed: 0, remaining: 0, mergedSubjects: [] }
  );
});

test("ausência do conteúdo interno retorna resultado seguro", () => {
  const { api } = loadRuntime({ includeContent: false });
  const result = api.dedupeWeeklyProjection();
  assert.equal(result.removed, 0);
  assert.equal(result.remaining, 0);
});

test("ausência do contador não impede a deduplicação", () => {
  const cards = [
    createCard("DIREITO CIVIL — Pessoas", "04/08/2026 • Pendente"),
    createCard("DIREITO CIVIL — Pessoas", "05/08/2026 • Pendente")
  ];
  const { api } = loadRuntime({ cards, includeBadge: false });
  const result = api.dedupeWeeklyProjection();
  assert.equal(result.removed, 1);
  assert.equal(result.remaining, 1);
});

test("segunda execução é idempotente", () => {
  const cards = [
    createCard("DIREITO PENAL — Dolo", "04/08/2026 • Pendente"),
    createCard("DIREITO PENAL — Dolo", "05/08/2026 • Pendente")
  ];
  const { api, badge } = loadRuntime({ cards });
  const first = api.dedupeWeeklyProjection();
  const second = api.dedupeWeeklyProjection();

  assert.equal(first.removed, 1);
  assert.equal(second.removed, 0);
  assert.equal(second.remaining, 1);
  assert.equal(badge.textContent, "1");
});

test("modo semanal é reconhecido pelo botão ativo quando a variável global não existe", () => {
  const cards = [
    createCard("DIREITO PENAL — Erro", "04/08/2026 • Pendente"),
    createCard("DIREITO PENAL — Erro", "05/08/2026 • Pendente")
  ];
  const { api } = loadRuntime({ cards, exposeScope: false, activeWeek: true });
  const result = api.dedupeWeeklyProjection();
  assert.equal(result.removed, 1);
});

test("sem variável global e sem botão semanal ativo nenhum cartão é removido", () => {
  const cards = [
    createCard("DIREITO PENAL — Erro", "04/08/2026 • Pendente"),
    createCard("DIREITO PENAL — Erro", "05/08/2026 • Pendente")
  ];
  const { api } = loadRuntime({ cards, exposeScope: false, activeWeek: false });
  const result = api.dedupeWeeklyProjection();
  assert.equal(result.removed, 0);
  assert.equal(cards.filter((card) => !card.removed).length, 2);
});

test("escopo desconhecido não ativa a regra semanal", () => {
  const cards = [
    createCard("DIREITO PENAL — Pena", "04/08/2026 • Pendente"),
    createCard("DIREITO PENAL — Pena", "05/08/2026 • Pendente")
  ];
  const { api } = loadRuntime({ cards, scope: "month" });
  assert.equal(api.dedupeWeeklyProjection().removed, 0);
});

test("a função de colapso não modifica os registros de entrada", () => {
  const { api } = loadRuntime();
  const input = [
    { title: "PENAL — A", date: "04/08/2026", metaRest: "Pendente" },
    { title: "PENAL — A", date: "05/08/2026", metaRest: "Pendente" }
  ];
  const before = JSON.stringify(input);
  api.collapseWeeklyProjectionRecords(input);
  assert.equal(JSON.stringify(input), before);
});

test("registros nulos são ignorados sem afetar a ordem", () => {
  const { api } = loadRuntime();
  const result = api.collapseWeeklyProjectionRecords([
    null,
    { title: "PENAL — A", date: "04/08/2026" },
    undefined,
    { title: "ADMINISTRATIVO — B", date: "05/08/2026" }
  ]);
  assert.equal(result.length, 2);
  assert.equal(result[0].title, "PENAL — A");
  assert.equal(result[1].title, "ADMINISTRATIVO — B");
});

test("datas vazias não aparecem no texto consolidado", () => {
  const { api } = loadRuntime();
  assert.equal(api.formatMergedDates(["", "04/08/2026", null, "04/08/2026"]), "04/08/2026");
  assert.equal(api.formatMergedDates([]), "");
});

test("a lista de assuntos mesclados não repete o mesmo nome", () => {
  const cards = [
    createCard("PENAL — A", "04/08/2026 • Pendente"),
    createCard("PENAL — A", "05/08/2026 • Pendente"),
    createCard("PENAL — A", "06/08/2026 • Pendente"),
    createCard("PENAL — A", "07/08/2026 • Pendente")
  ];
  const { api } = loadRuntime({ cards });
  const result = api.dedupeWeeklyProjection();
  assert.deepEqual([...result.mergedSubjects], ["PENAL — A"]);
});

test("cento e vinte cartões são reduzidos para quarenta assuntos", () => {
  const cards = [];
  for (let subject = 1; subject <= 40; subject += 1) {
    cards.push(createCard(`DISCIPLINA — Assunto ${subject}`, "04/08/2026 • Pendente"));
    cards.push(createCard(`DISCIPLINA — Assunto ${subject}`, "05/08/2026 • Pendente"));
    cards.push(createCard(`DISCIPLINA — Assunto ${subject}`, "06/08/2026 • Pendente"));
  }
  const { api, badge } = loadRuntime({ cards });
  const result = api.dedupeWeeklyProjection();
  assert.equal(result.removed, 80);
  assert.equal(result.remaining, 40);
  assert.equal(badge.textContent, "40");
});

test("fila interna remove SIMULADOS sem excluir disciplinas legítimas", () => {
  const { api } = loadRuntime();
  const result = api.sanitizeFactoryEntries([
    { id: "operacional-simulados", disciplina: "SIMULADOS", tema: "Realização de simulado" },
    { id: "penal", disciplina: "DIREITO PENAL", tema: "Teoria do Crime" }
  ]);
  assert.equal(result.length, 1);
  assert.equal(result[0].id, "penal");
});

test("fila interna consolida duplicata e conserva o registro mais completo", () => {
  const { api } = loadRuntime();
  const result = api.sanitizeFactoryEntries([
    {
      item: {
        id: "item-antigo",
        disciplina: "DIREITO PENAL",
        tema: "Culpabilidade",
        modules: { resumoAula: { status: "Não iniciado" } }
      },
      goals: [{ id: "meta-1" }]
    },
    {
      item: {
        id: "item-completo",
        disciplina: "DIREITO PENAL",
        tema: "Culpabilidade",
        destinationFolderUrl: "https://drive.google.com/folder",
        modules: { resumoAula: { status: "PDF gerado", fileId: "arquivo-1" } }
      },
      goals: [{ id: "meta-2" }]
    }
  ]);

  assert.equal(result.length, 1);
  assert.equal(result[0].item.id, "item-completo");
  assert.deepEqual(new Set(result[0].goals.map((goal) => goal.id)), new Set(["meta-1", "meta-2"]));
  assert.ok(result[0].duplicateFactoryItemIds.includes("item-antigo"));
  assert.ok(result[0].duplicateFactoryItemIds.includes("item-completo"));
});

test("mesmo assunto em disciplinas diferentes permanece separado na fila interna", () => {
  const { api } = loadRuntime();
  const result = api.sanitizeFactoryEntries([
    { id: "a", disciplina: "DIREITO PENAL", tema: "Princípios" },
    { id: "b", disciplina: "DIREITO PROCESSUAL PENAL", tema: "Princípios" }
  ]);
  assert.equal(result.length, 2);
});

test("subtemas diferentes permanecem separados na fila interna", () => {
  const { api } = loadRuntime();
  const result = api.sanitizeFactoryEntries([
    { item: { id: "a", disciplina: "DIREITO PENAL", tema: "Crime" }, subtopics: ["Tipicidade"] },
    { item: { id: "b", disciplina: "DIREITO PENAL", tema: "Crime" }, subtopics: ["Ilicitude"] }
  ]);
  assert.equal(result.length, 2);
});

test("ordem dos subtemas não impede a consolidação de registros equivalentes", () => {
  const { api } = loadRuntime();
  const result = api.sanitizeFactoryEntries([
    { item: { id: "a", disciplina: "DIREITO PENAL", tema: "Crime" }, subtopics: ["Tipicidade", "Ilicitude"] },
    { item: { id: "b", disciplina: "DIREITO PENAL", tema: "Crime" }, subtopics: ["Ilicitude", "Tipicidade"] }
  ]);
  assert.equal(result.length, 1);
});

test("arquivos de publicação expõem a mesma correção ampliada", () => {
  const docsSource = fs.readFileSync("docs/factory-queue-integrity-v236.js", "utf8");
  const loader = fs.readFileSync("planning-integrity-loader-v235.js", "utf8");
  const docsLoader = fs.readFileSync("docs/planning-integrity-loader-v235.js", "utf8");
  const worker = fs.readFileSync("service-worker.js", "utf8");
  const docsWorker = fs.readFileSync("docs/service-worker.js", "utf8");

  assert.equal(docsSource, source);
  assert.equal(docsLoader, loader);
  assert.equal(docsWorker, worker);
  assert.match(source, /dedupeWeeklyProjection/);
  assert.match(source, /collapseWeeklyProjectionRecords/);
  assert.match(loader, /factory-queue-integrity-hotfix4/);
  assert.match(worker, /factory-weekly-dedupe-v237-hotfix1/);
});
