const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const source = fs.readFileSync("factory-queue-integrity-v236.js", "utf8");

function createCard(title, metaText) {
  const heading = { textContent: title };
  const meta = { textContent: metaText };
  return {
    dataset: {},
    removed: false,
    querySelector(selector) {
      if (selector === "h3") return heading;
      if (selector === "p.item-meta") return meta;
      return null;
    },
    remove() { this.removed = true; },
    heading,
    meta
  };
}

function loadRuntime(cards = [], scope = "week") {
  const badge = { textContent: String(cards.length) };
  const content = {
    querySelectorAll() { return cards.filter((card) => !card.removed); }
  };
  const panel = {
    querySelector(selector) {
      if (selector.includes("factory-collapsible-content")) return content;
      if (selector.includes("summary small")) return badge;
      return null;
    }
  };
  const document = {
    querySelector(selector) {
      if (selector.includes("factory-today-plan")) return panel;
      return null;
    }
  };
  const context = {
    console,
    document,
    location: { hash: "" },
    factoryProductionScope: scope,
    window: {
      setInterval() { return 1; },
      clearInterval() {},
      setTimeout() {}
    }
  };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(source, context);
  return { api: context.__ALDUS_FACTORY_QUEUE_INTEGRITY_V236__, badge, cards };
}

test("produção semanal funde assuntos exatamente iguais e preserva todas as datas", () => {
  const cards = [
    createCard("DIREITO PENAL — Teoria do Crime", "04/08/2026 • Precisa produzir • 0 arquivo(s)"),
    createCard("DIREITO PENAL — Teoria do Crime", "06/08/2026 • Precisa produzir • 0 arquivo(s)"),
    createCard("DIREITO PROCESSUAL PENAL — Inquérito Policial", "05/08/2026 • Material já disponível • 1 arquivo(s)")
  ];
  const { api, badge } = loadRuntime(cards);
  const result = api.dedupeWeeklyProjection();

  assert.equal(result.removed, 1);
  assert.equal(result.remaining, 2);
  assert.deepEqual([...result.mergedSubjects], ["DIREITO PENAL — Teoria do Crime"]);
  assert.equal(cards[1].removed, true);
  assert.equal(cards[0].meta.textContent, "Datas: 04/08/2026 e 06/08/2026 • Precisa produzir • 0 arquivo(s)");
  assert.equal(cards[0].dataset.weeklyMergedDatesV237, "04/08/2026|06/08/2026");
  assert.equal(badge.textContent, "2");
});

test("repetição no mesmo dia não duplica a data", () => {
  const cards = [
    createCard("DIREITO CONSTITUCIONAL — Poder Constituinte", "05/08/2026 • Precisa produzir • 0 arquivo(s)"),
    createCard("DIREITO CONSTITUCIONAL — Poder Constituinte", "05/08/2026 • Precisa produzir • 0 arquivo(s)")
  ];
  const { api, badge } = loadRuntime(cards);
  const result = api.dedupeWeeklyProjection();

  assert.equal(result.removed, 1);
  assert.equal(result.remaining, 1);
  assert.equal(cards[0].meta.textContent, "05/08/2026 • Precisa produzir • 0 arquivo(s)");
  assert.equal(cards[0].dataset.weeklyMergedDatesV237, "05/08/2026");
  assert.equal(badge.textContent, "1");
});

test("três datas são exibidas sem repetição", () => {
  const { api } = loadRuntime();
  assert.equal(
    api.formatMergedDates(["04/08/2026", "05/08/2026", "04/08/2026", "07/08/2026"]),
    "Datas: 04/08/2026, 05/08/2026 e 07/08/2026"
  );
});

test("disciplinas diferentes não são fundidas mesmo com assunto semelhante", () => {
  const { api } = loadRuntime();
  const collapsed = api.collapseWeeklyProjectionRecords([
    { title: "DIREITO PENAL — Princípios", date: "04/08/2026" },
    { title: "DIREITO PROCESSUAL PENAL — Princípios", date: "05/08/2026" }
  ]);
  assert.equal(collapsed.length, 2);
});

test("diferenças apenas de caixa, acento e espaços não recriam cartão duplicado", () => {
  const { api } = loadRuntime();
  const collapsed = api.collapseWeeklyProjectionRecords([
    { title: "Direito Administrativo — Regime jurídico-administrativo", date: "04/08/2026" },
    { title: "  DIREITO ADMINISTRATIVO — Regime juridico-administrativo  ", date: "07/08/2026" }
  ]);
  assert.equal(collapsed.length, 1);
  assert.deepEqual([...collapsed[0].dates], ["04/08/2026", "07/08/2026"]);
});

test("modo diário preserva cartões separados", () => {
  const cards = [
    createCard("DIREITO PENAL — Teoria do Crime", "04/08/2026 • Precisa produzir • 0 arquivo(s)"),
    createCard("DIREITO PENAL — Teoria do Crime", "04/08/2026 • Precisa produzir • 0 arquivo(s)")
  ];
  const { api, badge } = loadRuntime(cards, "day");
  const result = api.dedupeWeeklyProjection();

  assert.equal(result.removed, 0);
  assert.equal(cards[0].removed, false);
  assert.equal(cards[1].removed, false);
  assert.equal(badge.textContent, "2");
});

test("publicação e carregadores apontam para o hotfix4 sem divergência entre raiz e docs", () => {
  const docsSource = fs.readFileSync("docs/factory-queue-integrity-v236.js", "utf8");
  const loader = fs.readFileSync("planning-integrity-loader-v235.js", "utf8");
  const docsLoader = fs.readFileSync("docs/planning-integrity-loader-v235.js", "utf8");
  const worker = fs.readFileSync("service-worker.js", "utf8");
  const docsWorker = fs.readFileSync("docs/service-worker.js", "utf8");

  assert.equal(docsSource, source);
  assert.equal(docsLoader, loader);
  assert.equal(docsWorker, worker);
  assert.match(source, /factory-queue-integrity-hotfix4/);
  assert.match(loader, /const FACTORY_HOTFIX = "factory-queue-integrity-hotfix4"/);
  assert.match(worker, /factory-queue-integrity-hotfix4/);
  assert.match(worker, /factory-weekly-dedupe-v237-hotfix1/);
});
