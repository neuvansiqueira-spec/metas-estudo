import test from "node:test";
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
  assert.ok(source.includes("if (!query) {"));
  assert.ok(source.includes('data-factory-search-hidden-v136="true"'));
  assert.ok(source.includes("if (target.dataset.factorySearchHiddenV136 !== nextHidden)"));
  assert.ok(!source.includes("const match = !query || normalize(target.textContent)"));
});

test("V355 remove o observer direto para refresh pesado e preserva isolamento", () => {
  assert.ok(source.includes("20260818-factory-dom-style-on-demand-v355"));
  assert.ok(source.includes("const isFactoryRoute = () =>"));
  assert.ok(source.includes("requestIdleCallback(() => requestAnimationFrame(runRefresh)"));
  assert.ok(!source.includes("new MutationObserver(refresh)"));
  for (const forbidden of ["localStorage", "indexedDB", "saveData(", "syncFactoryUpdate(", "state."]) {
    assert.equal(source.includes(forbidden), false, `V355 não deveria introduzir ${forbidden}`);
  }
});

test("V355 foi regenerada no bundle e publicada com cache novo sem remover V354", () => {
  assert.equal(published, source);
  assert.equal(publishedBundle, bundle);
  assert.match(bundle, /Aldus source: factory-executive-ui-v136.js/);
  assert.ok(bundle.includes("20260818-factory-dom-style-on-demand-v355"));
  assert.match(worker, /dom-style-hot-path-v355-factory-destination-runtime-v354-navigation-bootstrap-v353-bootstrap-fast-path-v351/);
  assert.match(worker, /factory-destination-on-demand-v354/);
});
