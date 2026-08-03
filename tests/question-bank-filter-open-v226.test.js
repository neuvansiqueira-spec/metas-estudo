import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const root = process.cwd();
const source = fs.readFileSync(path.join(root, "question-bank-filter-open-v226.js"), "utf8");

class FakeElement {
  constructor(id = "") {
    this.id = id;
    this._html = '<option value="">Todos</option><option value="A">A</option>';
    this.style = {};
    this.dataset = {};
    this.disabled = false;
    this.listeners = {};
    this.attributes = {};
  }

  addEventListener(type, listener) {
    (this.listeners[type] ||= []).push(listener);
  }

  removeAttribute(name) {
    delete this.attributes[name];
  }

  dispatch(type, extra = {}) {
    for (const listener of this.listeners[type] || []) {
      listener({ target: this, key: "", ...extra });
    }
  }

  get options() {
    return [...this._html.matchAll(/value="([^"]*)"/g)].map((match) => ({ value: match[1] }));
  }
}

Object.defineProperty(FakeElement.prototype, "innerHTML", {
  configurable: true,
  get() { return this._html; },
  set(value) { this._html = String(value); }
});

class FakeSelect extends FakeElement {
  constructor(id) {
    super(id);
    this._value = "A";
  }
}

Object.defineProperty(FakeSelect.prototype, "value", {
  configurable: true,
  get() { return this._value; },
  set(value) { this._value = String(value); }
});

function createRuntime() {
  const select = new FakeSelect("qbFilterDiscipline");
  const style = new FakeElement();
  const document = {
    readyState: "complete",
    body: new FakeElement("body"),
    head: { appendChild() {} },
    documentElement: { dataset: {} },
    getElementById(id) {
      return id === "qbFilterDiscipline" ? select : null;
    },
    createElement(tag) {
      return tag === "style" ? style : new FakeElement();
    }
  };

  class MutationObserver {
    constructor(listener) { this.listener = listener; }
    observe() {}
  }

  const context = {
    globalThis: null,
    Element: FakeElement,
    HTMLSelectElement: FakeSelect,
    document,
    MutationObserver,
    setTimeout,
    clearTimeout,
    console
  };
  context.globalThis = context;
  vm.runInNewContext(source, context);
  return { context, document, select, style };
}

test("protege todos os filtros relevantes e reforça a abertura", () => {
  assert.match(source, /qbFilterDiscipline/);
  assert.match(source, /qbFilterSubject/);
  assert.match(source, /qbFilterTheme/);
  assert.match(source, /pointer-events: auto !important/);
  assert.match(source, /z-index: 3 !important/);
});

test("não substitui as opções enquanto o filtro está aberto", async () => {
  const { select } = createRuntime();
  assert.equal(select.dataset.qbFilterOpenV226, "true");

  select.dispatch("pointerdown");
  select.innerHTML = '<option value="">Todos</option><option value="B">B</option>';

  assert.match(select.innerHTML, /value="A"/);
  assert.doesNotMatch(select.innerHTML, /value="B"/);

  select.dispatch("blur");
  await new Promise((resolve) => setTimeout(resolve, 5));

  assert.match(select.innerHTML, /value="B"/);
  assert.equal(select.value, "");
});

test("ignora reconstrução idêntica e mantém o campo habilitado", () => {
  const { select } = createRuntime();
  const original = select.innerHTML;
  select.innerHTML = original;

  assert.equal(select.innerHTML, original);
  assert.equal(select.disabled, false);
  assert.equal(select.style.pointerEvents, "auto");
});
