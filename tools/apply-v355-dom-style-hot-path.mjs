import fs from "node:fs";

const RUNTIME_VERSION = "20260818-factory-dom-style-on-demand-v355";
const sourcePath = "factory-executive-ui-v136.js";
let source = fs.readFileSync(sourcePath, "utf8");

if (!source.includes(RUNTIME_VERSION)) {
  source = source.replace(
    '  const VERSION = "20260724-fabrica-executiva-v136";\n',
    `  const VERSION = "20260724-fabrica-executiva-v136";\n  const RUNTIME_VERSION = "${RUNTIME_VERSION}";\n`
  );
}

const oldSearch = `  function applySearch() {
    const input = root.querySelector("#factoryExecutiveSearchV136");
    const clear = root.querySelector("[data-factory-search-clear-v136]");
    const status = root.querySelector("#factoryExecutiveSearchStatusV136");
    if (!input || !status) return;
    const query = normalize(input.value);
    let visible = 0;
    targets().forEach((target) => {
      const match = !query || normalize(target.textContent).includes(query);
      target.dataset.factorySearchHiddenV136 = String(!match);
      if (match) visible += 1;
    });
    if (clear) clear.hidden = !query;
    status.textContent = !query ? "Pesquise na lista atualmente exibida." : visible
      ? \`${'${visible}'} ${'${visible === 1 ? "resultado encontrado" : "resultados encontrados"}'} nesta visualização.\`
      : "Nenhum tema encontrado nesta visualização. Ajuste a pesquisa ou o filtro.";
  }
`;

const newSearch = `  function applySearch() {
    const input = root.querySelector("#factoryExecutiveSearchV136");
    const clear = root.querySelector("[data-factory-search-clear-v136]");
    const status = root.querySelector("#factoryExecutiveSearchStatusV136");
    if (!input || !status) return;
    const query = normalize(input.value);

    // V355: durante o boot e nas atualizações normais a busca está vazia. Nesse
    // caso não há motivo para ler textContent de todos os cartões nem regravar
    // dataset em cada item, operação que forçava recálculo amplo de estilo.
    if (!query) {
      root.querySelectorAll('[data-factory-search-hidden-v136="true"]').forEach((target) => {
        target.dataset.factorySearchHiddenV136 = "false";
      });
      if (clear) clear.hidden = true;
      if (status.textContent !== "Pesquise na lista atualmente exibida.") {
        status.textContent = "Pesquise na lista atualmente exibida.";
      }
      return;
    }

    let visible = 0;
    targets().forEach((target) => {
      const match = normalize(target.textContent).includes(query);
      const nextHidden = String(!match);
      if (target.dataset.factorySearchHiddenV136 !== nextHidden) {
        target.dataset.factorySearchHiddenV136 = nextHidden;
      }
      if (match) visible += 1;
    });
    if (clear) clear.hidden = false;
    const nextStatus = visible
      ? \`${'${visible}'} ${'${visible === 1 ? "resultado encontrado" : "resultados encontrados"}'} nesta visualização.\`
      : "Nenhum tema encontrado nesta visualização. Ajuste a pesquisa ou o filtro.";
    if (status.textContent !== nextStatus) status.textContent = nextStatus;
  }
`;

if (source.includes(oldSearch)) source = source.replace(oldSearch, newSearch);
else if (!source.includes("V355: durante o boot e nas atualizações normais")) throw new Error("Bloco applySearch V136 não encontrado.");

source = source.replace(
  '    root.querySelectorAll("#factoryList .compact-factory-card").forEach((card) => card.dataset.factoryExecutiveV136 = "true");',
  '    root.querySelectorAll(\'#factoryList .compact-factory-card:not([data-factory-executive-v136="true"])\').forEach((card) => { card.dataset.factoryExecutiveV136 = "true"; });'
);

const tailPattern = /  let scheduled = false;\n  function refresh\(\) \{[\s\S]*?\n  refresh\(\);\n\}\)\(\);\s*$/;
const newTail = `  const isFactoryRoute = () => typeof location !== "undefined" && location.hash === "#fabrica-resumos";
  let scheduled = false;
  let idleHandle = null;
  let dirty = true;

  function runRefresh() {
    scheduled = false;
    idleHandle = null;
    if (!isFactoryRoute() || !dirty) return;
    dirty = false;
    ensureStyles();
    const { toolbar, flow } = ensureToolbar();
    enhancePanels();
    bind(toolbar, flow);
    syncUi();
    applySearch();
  }

  function refresh({ interactive = false } = {}) {
    dirty = true;
    if (!isFactoryRoute()) return false;

    // Um clique do usuário não deve esperar um callback ocioso já pendente.
    if (interactive && idleHandle !== null && typeof cancelIdleCallback === "function") {
      cancelIdleCallback(idleHandle);
      idleHandle = null;
      scheduled = false;
    }
    if (scheduled) return false;
    scheduled = true;

    if (!interactive && typeof requestIdleCallback === "function") {
      idleHandle = requestIdleCallback(() => requestAnimationFrame(runRefresh), { timeout: 500 });
    } else {
      requestAnimationFrame(runRefresh);
    }
    return true;
  }

  function mutationNeedsRefresh(records) {
    return records.some((record) => {
      if (record.type !== "childList" || (!record.addedNodes.length && !record.removedNodes.length)) return false;
      const target = record.target;
      if (target?.closest?.(".factory-executive-toolbar-v136, .factory-stage-flow-v136")) return false;
      return true;
    });
  }

  new MutationObserver((records) => {
    // Fora da Fábrica, o observer fica praticamente inerte: apenas registra que
    // a view mudou. A atualização completa ocorrerá uma única vez ao entrar nela.
    if (!isFactoryRoute()) {
      dirty = true;
      return;
    }
    if (mutationNeedsRefresh(records)) refresh();
  }).observe(root, { childList: true, subtree: true });

  root.addEventListener("click", (event) => {
    if (event.target.closest("[data-factory-filter], [data-factory-scope]")) refresh({ interactive: true });
  });

  addEventListener("hashchange", () => {
    if (isFactoryRoute()) refresh({ interactive: true });
  });

  if (isFactoryRoute()) refresh({ interactive: true });
})();
`;

if (tailPattern.test(source)) source = source.replace(tailPattern, newTail);
else if (!source.includes("const isFactoryRoute = () =>")) throw new Error("Tail V136 esperado não encontrado.");

if (!source.includes(RUNTIME_VERSION)) throw new Error("Runtime V355 não aplicado.");
if (source.includes("new MutationObserver(refresh)")) throw new Error("Observer pesado antigo ainda presente.");
if (!source.includes('if (!isFactoryRoute()) {\n      dirty = true;\n      return;')) throw new Error("Gate de rota V355 ausente.");
if (!source.includes("requestIdleCallback(() => requestAnimationFrame(runRefresh)")) throw new Error("Coalescência ociosa V355 ausente.");
fs.writeFileSync(sourcePath, source);

// Gira o cache sem quebrar o marcador contínuo da V354.
const workerPath = "service-worker.js";
let worker = fs.readFileSync(workerPath, "utf8");
if (!worker.includes("dom-style-hot-path-v355")) {
  worker = worker.replace(
    "factory-destination-runtime-v354-navigation-bootstrap-v353-bootstrap-fast-path-v351`",
    "factory-destination-runtime-v354-navigation-bootstrap-v353-bootstrap-fast-path-v351-dom-style-hot-path-v355`"
  );
}
if (!worker.includes("factory-destination-runtime-v354-navigation-bootstrap-v353-bootstrap-fast-path-v351-dom-style-hot-path-v355")) {
  throw new Error("Cache V355 não foi aplicado preservando V354/V353/V351.");
}
fs.writeFileSync(workerPath, worker);

const finalTest = `import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const source = fs.readFileSync(new URL("../factory-executive-ui-v136.js", import.meta.url), "utf8");
const published = fs.readFileSync(new URL("../docs/factory-executive-ui-v136.js", import.meta.url), "utf8");
const bundle = fs.readFileSync(new URL("../app-v344.js", import.meta.url), "utf8");
const publishedBundle = fs.readFileSync(new URL("../docs/app-v344.js", import.meta.url), "utf8");
const worker = fs.readFileSync(new URL("../service-worker.js", import.meta.url), "utf8");

function runtime(hash = "#metas-do-dia") {
  const root = {
    addEventListener() {},
    querySelector() { return null; },
    querySelectorAll() { return []; },
    closest() { return null; }
  };
  const listeners = new Map();
  let observerCallback = null;
  const animationFrames = [];
  const idleCallbacks = [];
  const context = {
    console,
    window: null,
    globalThis: null,
    location: { hash },
    document: {
      getElementById(id) {
        if (id === "view-fabrica-resumos") return root;
        if (id === "factoryExecutiveStylesV136") return {};
        return null;
      },
      createElement() { return { dataset: {}, setAttribute() {}, appendChild() {} }; },
      head: { appendChild() {} }
    },
    MutationObserver: class {
      constructor(callback) { observerCallback = callback; }
      observe() {}
    },
    requestAnimationFrame(callback) { animationFrames.push(callback); return animationFrames.length; },
    requestIdleCallback(callback) { idleCallbacks.push(callback); return idleCallbacks.length; },
    cancelIdleCallback() {},
    addEventListener(name, callback) { listeners.set(name, callback); },
    CSS: { escape(value) { return value; } },
    setTimeout
  };
  context.window = context;
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(source, context, { filename: "factory-executive-ui-v136.js" });
  return { context, root, listeners, observer: () => observerCallback, animationFrames, idleCallbacks };
}

test("V355 deixa a interface executiva da Fábrica inerte fora da rota da Fábrica", () => {
  const rt = runtime("#metas-do-dia");
  assert.equal(rt.animationFrames.length, 0, "Metas do Dia não deve agendar refresh da Fábrica");
  assert.equal(rt.idleCallbacks.length, 0, "Metas do Dia não deve agendar trabalho ocioso da Fábrica");
  rt.observer()([{ type: "childList", addedNodes: [{}], removedNodes: [], target: rt.root }]);
  assert.equal(rt.animationFrames.length, 0, "mutações ocultas não devem disparar RAF");
  assert.equal(rt.idleCallbacks.length, 0, "mutações ocultas não devem disparar refresh pesado");
});

test("V355 atualiza uma vez ao entrar na Fábrica e coalesce mutações seguintes", () => {
  const rt = runtime("#metas-do-dia");
  rt.context.location.hash = "#fabrica-resumos";
  rt.listeners.get("hashchange")();
  assert.equal(rt.animationFrames.length, 1, "entrada explícita deve responder no próximo frame");
  rt.animationFrames.shift()();
  rt.observer()([{ type: "childList", addedNodes: [{}], removedNodes: [], target: rt.root }]);
  assert.equal(rt.idleCallbacks.length, 1, "mutações da Fábrica devem ser coalescidas no período ocioso");
  rt.observer()([{ type: "childList", addedNodes: [{}], removedNodes: [], target: rt.root }]);
  assert.equal(rt.idleCallbacks.length, 1, "mutações consecutivas não podem empilhar refreshes");
});

test("V355 evita varredura integral quando a busca está vazia", () => {
  assert.match(source, /if \(!query\) \{/);
  assert.match(source, /data-factory-search-hidden-v136=\\"true\\"/);
  assert.match(source, /if \(target\.dataset\.factorySearchHiddenV136 !== nextHidden\)/);
  assert.doesNotMatch(source, /const match = !query \|\| normalize\(target\.textContent\)/);
});

test("V355 remove o observer direto para refresh pesado e preserva isolamento", () => {
  assert.match(source, /20260818-factory-dom-style-on-demand-v355/);
  assert.match(source, /const isFactoryRoute = \(\) =>/);
  assert.match(source, /requestIdleCallback\(\(\) => requestAnimationFrame\(runRefresh\)/);
  assert.doesNotMatch(source, /new MutationObserver\(refresh\)/);
  for (const forbidden of ["localStorage", "indexedDB", "saveData(", "syncFactoryUpdate(", "state."]) {
    assert.equal(source.includes(forbidden), false, \`V355 não deveria introduzir ${'${forbidden}'}\`);
  }
});

test("V355 foi regenerada no bundle e publicada com cache novo sem remover V354", () => {
  assert.equal(published, source);
  assert.equal(publishedBundle, bundle);
  assert.match(bundle, /Aldus source: factory-executive-ui-v136\.js/);
  assert.match(bundle, /20260818-factory-dom-style-on-demand-v355/);
  assert.match(worker, /factory-destination-runtime-v354-navigation-bootstrap-v353-bootstrap-fast-path-v351-dom-style-hot-path-v355/);
  assert.match(worker, /factory-destination-on-demand-v354/);
});
`;
fs.writeFileSync("tests/v355-dom-style-hot-path.test.js", finalTest);
if (fs.existsSync("tests/v355-hotpath-inspect.test.js")) fs.rmSync("tests/v355-hotpath-inspect.test.js");

const securityPath = ".github/workflows/security-ci.yml";
let security = fs.readFileSync(securityPath, "utf8");
security = security.replace(
  "            tests/v353-navigation-bootstrap-delivery.test.js \\\n            tests/v355-hotpath-inspect.test.js",
  "            tests/v353-navigation-bootstrap-delivery.test.js \\\n            tests/v354-factory-destination-runtime.test.js \\\n            tests/v355-dom-style-hot-path.test.js"
);
if (!security.includes("tests/v354-factory-destination-runtime.test.js") || !security.includes("tests/v355-dom-style-hot-path.test.js")) {
  throw new Error("Workflow de segurança não inclui os contratos V354/V355.");
}
fs.writeFileSync(securityPath, security);

const contractPath = "tests/current-release-contract.js";
let contract = fs.readFileSync(contractPath, "utf8");
if (!contract.includes('const factoryExecutiveRuntime = read("factory-executive-ui-v136.js");')) {
  contract = contract.replace(
    '  const planningIntegrityLoader = read("planning-integrity-loader-v235.js");',
    '  const planningIntegrityLoader = read("planning-integrity-loader-v235.js");\n  const factoryExecutiveRuntime = read("factory-executive-ui-v136.js");'
  );
  contract = contract.replace(
    '    "planning-integrity-loader-v235.js"\n  ]) {',
    '    "planning-integrity-loader-v235.js",\n    "factory-executive-ui-v136.js"\n  ]) {'
  );
  const anchor = '  assert.match(worker, /factory-destination-integrity-v237\\.js\\?v=20260804-pastas-destino-classificacao-exata-v237&hotfix=factory-destination-on-demand-v354/);';
  const addition = `${anchor}\n\n  // V355: a interface da Fábrica não pode voltar a recalcular DOM/estilo fora da própria rota.\n  assert.match(factoryExecutiveRuntime, /20260818-factory-dom-style-on-demand-v355/);\n  assert.match(factoryExecutiveRuntime, /const isFactoryRoute = \\(\\) =>/);\n  assert.match(factoryExecutiveRuntime, /requestIdleCallback/);\n  assert.doesNotMatch(factoryExecutiveRuntime, /new MutationObserver\\(refresh\\)/);\n  assert.match(worker, /factory-destination-runtime-v354-navigation-bootstrap-v353-bootstrap-fast-path-v351-dom-style-hot-path-v355/);`;
  if (!contract.includes(anchor)) throw new Error("Âncora V354 do contrato atual não encontrada.");
  contract = contract.replace(anchor, addition);
}
fs.writeFileSync(contractPath, contract);

console.log("V355 aplicada: hot path da Fábrica restrito à rota, busca vazia barata, cache girado e regressões instaladas.");
