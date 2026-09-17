const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const source = fs.readFileSync("factory-executive-ui-v136.js", "utf8");
const published = fs.readFileSync("docs/factory-executive-ui-v136.js", "utf8");

function section(open) {
  return { open, dataset: {} };
}

function card(text, parent) {
  return { textContent: text, dataset: {}, closest: (selector) => (selector === "#factoryList > details" ? parent : null) };
}

// Simula a Fábrica em "Todas as Metas" > "Pendentes": FAÇA AGORA aberto, fila
// recolhida e a lista paginada em 20, com o tema procurado fora da primeira página.
function runtime() {
  const doNow = section(true);
  const queue = section(false);
  const list = section(false);
  const firstPage = [card("SEMANA 05 · Direito Administrativo — Atos Administrativos", doNow), card("SEMANA 08 · Direito Administrativo — Licitação", queue)];
  const lastPage = card("SEMANA 04 · Direito Digital — Crimes Cibernéticos", list);
  const input = { value: "" };
  const status = { textContent: "" };
  const clear = { hidden: true };
  const animationFrames = [];
  const idleCallbacks = [];

  const context = {
    console,
    location: { hash: "#fabrica-resumos" },
    factoryVisibleCount: 20,
    requestAnimationFrame(callback) { animationFrames.push(callback); return animationFrames.length; },
    requestIdleCallback(callback) { idleCallbacks.push(callback); return idleCallbacks.length; },
    cancelIdleCallback() {},
    addEventListener() {},
    CSS: { escape: (value) => value },
    renderFactory() {}
  };
  const cards = () => (context.factoryVisibleCount > 20 ? [...firstPage, lastPage] : firstPage);
  const marked = (key) => [...cards(), doNow, queue, list].filter((node) => node.dataset[key] === "true");
  const root = {
    addEventListener() {},
    querySelector(selector) {
      if (selector === "#factoryExecutiveSearchV136") return input;
      if (selector === "#factoryExecutiveSearchStatusV136") return status;
      if (selector === "[data-factory-search-clear-v136]") return clear;
      if (selector === "#factoryList [data-show-factory-more]") return context.factoryVisibleCount > 20 ? null : {};
      if (selector === '[data-production-scope="all"][aria-pressed="true"]') return {};
      return null;
    },
    querySelectorAll(selector) {
      if (selector === "#factoryList article.factory-card") return cards();
      if (selector === '[data-factory-search-hidden-v136="true"]') return marked("factorySearchHiddenV136");
      if (selector === '[data-factory-search-opened-v136="true"]') return marked("factorySearchOpenedV136");
      return [];
    }
  };
  context.document = {
    getElementById(id) {
      if (id === "view-fabrica-resumos") return root;
      if (id === "factoryExecutiveStylesV136") return {};
      return null;
    }
  };
  context.window = context;
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(source, context, { filename: "factory-executive-ui-v136.js" });

  const flush = () => {
    while (animationFrames.length || idleCallbacks.length) (animationFrames.shift() || idleCallbacks.shift())();
  };
  const search = (text) => {
    input.value = text;
    context.renderFactory();
    flush();
  };
  flush();
  return { context, doNow, queue, list, firstPage, lastPage, status, search };
}

test("V625 busca enxerga temas além da primeira página de 20", () => {
  const rt = runtime();
  rt.search("ciberneticos");
  assert.equal(rt.context.factoryVisibleCount, Number.MAX_SAFE_INTEGER);
  assert.equal(rt.lastPage.dataset.factorySearchHiddenV136, "false");
  assert.equal(rt.status.textContent, "1 resultado encontrado nesta visualização.");
});

test("V625 abre só o painel com resultado e esconde os demais", () => {
  const rt = runtime();
  rt.search("licitacao");
  assert.equal(rt.queue.open, true, "a fila recolhida deve abrir para mostrar o resultado");
  assert.equal(rt.queue.dataset.factorySearchHiddenV136, "false");
  assert.equal(rt.doNow.dataset.factorySearchHiddenV136, "true", "o FAÇA AGORA de outro tema não deve ficar à vista");
  assert.equal(rt.list.dataset.factorySearchHiddenV136, "true");
});

test("V625 limpar a busca fecha o que ela abriu e volta aos 20 temas", () => {
  const rt = runtime();
  rt.search("ciberneticos");
  assert.equal(rt.list.open, true);
  rt.search("");
  assert.equal(rt.context.factoryVisibleCount, 20);
  assert.equal(rt.list.open, false);
  assert.equal(rt.doNow.open, true, "painel aberto pelo usuário continua aberto");
  for (const node of [rt.doNow, rt.queue, rt.list, ...rt.firstPage]) {
    assert.notEqual(node.dataset.factorySearchHiddenV136, "true");
  }
});

test("V625 sem resultado em Todas as Metas não manda escolher Todas as Metas", () => {
  const rt = runtime();
  rt.search("tema inexistente");
  assert.doesNotMatch(rt.status.textContent, /Selecione “Todas as Metas”/);
});

test("V625 publicada em docs e no bundle", () => {
  assert.equal(published, source);
  for (const bundle of ["app.bundle.js", "app-v424.js", "docs/app-v424.js"]) {
    assert.ok(fs.readFileSync(bundle, "utf8").includes("V625: as listas por etapa mostram 20 temas"), bundle);
  }
});
