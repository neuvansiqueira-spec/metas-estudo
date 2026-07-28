const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const source = fs.readFileSync("update-flow-v169.js", "utf8");
const appSource = fs.readFileSync("script.js", "utf8");
const workerSource = fs.readFileSync("service-worker-v169.js", "utf8");

class MockNode {
  constructor(tagName, ownerDocument) {
    this.tagName = String(tagName || "div").toUpperCase();
    this.ownerDocument = ownerDocument;
    this.parentNode = null;
    this.children = [];
    this.listeners = new Map();
    this.attributes = new Map();
    this.dataset = {};
    this.hidden = false;
    this.id = "";
    this.type = "";
    this.value = "";
    this.defaultValue = "";
    this.textContent = "";
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
    if (name === "id") this.id = String(value);
  }

  getAttribute(name) {
    return this.attributes.get(name) ?? null;
  }

  removeAttribute(name) {
    this.attributes.delete(name);
  }

  matches(selector) {
    if (selector.includes("data-aldus-user-edited-v169")) {
      return this.attributes.get("data-aldus-user-edited-v169") === "true";
    }
    if (selector === "form") return this.tagName === "FORM";
    if (/input|textarea|select|\[contenteditable/.test(selector)) {
      return ["INPUT", "TEXTAREA", "SELECT"].includes(this.tagName);
    }
    return false;
  }

  closest(selector) {
    let current = this;
    while (current) {
      if (selector === "form" && current.tagName === "FORM") return current;
      if (/input|textarea|select|\[contenteditable/.test(selector) && ["INPUT", "TEXTAREA", "SELECT"].includes(current.tagName)) return current;
      if (/button|input\[type='submit'\]|input\[type='reset'\]/.test(selector) && ["BUTTON", "INPUT"].includes(current.tagName)) return current;
      current = current.parentNode;
    }
    return null;
  }

  appendChild(child) {
    child.parentNode = this;
    this.children.push(child);
    this.ownerDocument?.register(child);
    return child;
  }

  addEventListener(type, callback) {
    const list = this.listeners.get(type) || [];
    list.push(callback);
    this.listeners.set(type, list);
  }

  emit(type, event = {}) {
    for (const callback of this.listeners.get(type) || []) callback({ target: this, isTrusted: true, ...event });
  }

  querySelector(selector) {
    if (selector === "[data-aldus-update-now-v169]") return this.updateButton || null;
    if (selector === "[data-aldus-update-message-v169]") return this.updateMessage || null;
    return null;
  }

  set innerHTML(value) {
    this._innerHTML = String(value);
    if (!this._innerHTML.includes("data-aldus-update-now-v169")) return;
    this.updateMessage = new MockNode("small", this.ownerDocument);
    this.updateMessage.textContent = "Atualize quando terminar. Os dados já salvos serão preservados.";
    this.updateButton = new MockNode("button", this.ownerDocument);
    this.updateButton.type = "button";
    this.updateButton.textContent = "Atualizar agora";
    this.updateButton.parentNode = this;
    this.ownerDocument?.register(this.updateMessage);
    this.ownerDocument?.register(this.updateButton);
  }

  get innerHTML() {
    return this._innerHTML || "";
  }
}

function createEventTarget() {
  const listeners = new Map();
  return {
    addEventListener(type, callback) {
      const list = listeners.get(type) || [];
      list.push(callback);
      listeners.set(type, list);
    },
    emit(type, event = {}) {
      for (const callback of listeners.get(type) || []) callback(event);
    }
  };
}

function createRuntime({ controller = "service-worker-v169.js", waiting = "", timer = null } = {}) {
  const nodes = [];
  const documentEvents = createEventTarget();
  const windowEvents = createEventTarget();
  const swEvents = createEventTarget();
  const rafQueue = [];
  const session = new Map();
  let reloads = 0;
  let waitingMessages = 0;

  const document = {
    readyState: "complete",
    visibilityState: "visible",
    head: null,
    body: null,
    register(node) {
      if (!nodes.includes(node)) nodes.push(node);
    },
    createElement(tag) {
      return new MockNode(tag, document);
    },
    getElementById(id) {
      return nodes.find((node) => node.id === id) || null;
    },
    querySelector(selector) {
      if (selector.includes("data-aldus-user-edited-v169")) {
        return nodes.find((node) => node.attributes.get("data-aldus-user-edited-v169") === "true") || null;
      }
      return null;
    },
    addEventListener: documentEvents.addEventListener
  };
  document.head = new MockNode("head", document);
  document.body = new MockNode("body", document);
  document.register(document.head);
  document.register(document.body);

  const makeWorker = (scriptURL) => scriptURL ? {
    scriptURL: `https://aldus.local/${scriptURL}`,
    state: "installed",
    postMessage() { waitingMessages += 1; },
    addEventListener() {}
  } : null;
  const registration = {
    waiting: makeWorker(waiting),
    installing: null,
    active: makeWorker(controller),
    async update() {},
    addEventListener() {}
  };
  const serviceWorker = {
    controller: makeWorker(controller),
    ready: Promise.resolve(registration),
    addEventListener: swEvents.addEventListener
  };
  const context = {
    console,
    document,
    navigator: { serviceWorker },
    window: windowEvents,
    location: { reload() { reloads += 1; } },
    sessionStorage: {
      getItem(key) { return session.get(key) ?? null; },
      setItem(key, value) { session.set(key, String(value)); }
    },
    requestAnimationFrame(callback) {
      rafQueue.push(callback);
      return rafQueue.length;
    },
    queueMicrotask,
    setTimeout,
    clearTimeout,
    Date,
    WeakSet,
    Object,
    globalThis: null,
    __ALDUS_APP_RELEASE__: { version: "20260728-interatividade-atualizacao-v169", suffix: "v169" },
    floatingTimer: timer
  };
  context.window.addEventListener = windowEvents.addEventListener;
  context.window.dispatchEvent = (event) => windowEvents.emit(event.type, event);
  context.globalThis = context;
  vm.runInNewContext(source, context);

  return {
    context,
    document,
    registration,
    serviceWorker,
    api: context.__ALDUS_UPDATE_FLOW_V169__,
    dispatchDocument(type, event) { documentEvents.emit(type, event); },
    dispatchControllerChange() { swEvents.emit("controllerchange", {}); },
    async flushAnimationFrames() {
      while (rafQueue.length) rafQueue.shift()();
      await new Promise((resolve) => setImmediate(resolve));
    },
    form() {
      const form = new MockNode("form", document);
      const input = new MockNode("input", document);
      form.appendChild(input);
      document.body.appendChild(form);
      return { form, input };
    },
    banner() { return document.getElementById("aldusUpdateBannerV169"); },
    reloadCount() { return reloads; },
    waitingMessageCount() { return waitingMessages; }
  };
}

test("campos preenchidos automaticamente não criam falsa edição", () => {
  const runtime = createRuntime();
  const { input } = runtime.form();
  input.value = "conteúdo persistido";
  assert.equal(runtime.api.hasActiveEditing(), false);
  assert.equal(runtime.api.safeToReload(), true);
});

test("edição só nasce de input/change real e é zerada ao submeter", () => {
  const runtime = createRuntime();
  const { form, input } = runtime.form();
  input.value = "preenchimento automático";
  runtime.dispatchDocument("input", { target: input, isTrusted: false });
  assert.equal(runtime.api.hasActiveEditing(), false);
  runtime.dispatchDocument("input", { target: input, isTrusted: true });
  assert.equal(runtime.api.hasActiveEditing(), true);
  runtime.dispatchDocument("submit", { target: form, isTrusted: true });
  assert.equal(runtime.api.hasActiveEditing(), false);
});

test("salvar ou cancelar zera a alteração explícita do formulário", async () => {
  const runtime = createRuntime();
  const { form, input } = runtime.form();
  const save = new MockNode("button", runtime.document);
  save.textContent = "Salvar";
  form.appendChild(save);
  runtime.dispatchDocument("change", { target: input, isTrusted: true });
  assert.equal(runtime.api.hasActiveEditing(), true);
  runtime.dispatchDocument("click", { target: save, isTrusted: true });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(runtime.api.hasActiveEditing(), false);

  const cancel = new MockNode("button", runtime.document);
  cancel.textContent = "Cancelar";
  form.appendChild(cancel);
  runtime.dispatchDocument("input", { target: input, isTrusted: true });
  runtime.dispatchDocument("click", { target: cancel, isTrusted: true });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(runtime.api.hasActiveEditing(), false);
});

test("Atualizar agora ativa o worker pendente e recarrega uma vez", async () => {
  const runtime = createRuntime({ controller: "service-worker-v169.js", waiting: "service-worker-v170.js" });
  await runtime.flushAnimationFrames();
  const banner = runtime.banner();
  assert.equal(runtime.api.shouldShowUpdateReady(), true);
  banner.updateButton.emit("click");
  banner.updateButton.emit("click");
  assert.equal(runtime.waitingMessageCount(), 2);
  assert.equal(runtime.reloadCount(), 1);
});

test("V169 visível e controlada pela V169 não repete aviso", () => {
  const runtime = createRuntime({ controller: "service-worker-v169.js" });
  assert.equal(runtime.api.shouldShowUpdateReady(), false);
  assert.equal(runtime.banner().hidden, true);
});

test("novo build V169 realmente pendente continua acionável", () => {
  const runtime = createRuntime({ controller: "service-worker-v169.js", waiting: "service-worker-v169.js" });
  assert.equal(runtime.api.shouldShowUpdateReady(runtime.registration), true);
});

test("sem worker waiting ou installing não existe atualização pendente", () => {
  const runtime = createRuntime({ controller: "service-worker-v169.js" });
  assert.equal(runtime.api.shouldShowUpdateReady(), false);
});

test("aba com cache anterior atualiza diretamente sem loop", () => {
  const runtime = createRuntime({ controller: "service-worker-v168.js" });
  runtime.serviceWorker.controller = {
    scriptURL: "https://aldus.local/service-worker-v169.js",
    state: "activated"
  };
  runtime.dispatchControllerChange();
  runtime.dispatchControllerChange();
  assert.equal(runtime.reloadCount(), 1);
});

test("cronômetro ativo impede recarga automática e mantém aviso", () => {
  const runtime = createRuntime({
    controller: "service-worker-v168.js",
    timer: { goalId: "goal-1", paused: false, completed: false }
  });
  runtime.serviceWorker.controller = {
    scriptURL: "https://aldus.local/service-worker-v169.js",
    state: "activated"
  };
  runtime.dispatchControllerChange();
  assert.equal(runtime.reloadCount(), 0);
  assert.equal(runtime.api.safeToReload(), false);
  assert.equal(runtime.banner().hidden, false);
});

test("inicialização libera interface antes das rotinas secundárias e mede quatro marcos", () => {
  const bootstrapStart = appSource.indexOf("async function bootstrapApplication()");
  const bootstrapEnd = appSource.indexOf("function handleBootstrapFailure", bootstrapStart);
  const bootstrap = appSource.slice(bootstrapStart, bootstrapEnd);
  assert.ok(bootstrapStart >= 0 && bootstrapEnd > bootstrapStart);
  assert.ok(bootstrap.indexOf('markStartupMilestoneV169("dataRenderedMs")') < bootstrap.indexOf('runSecondaryStepV169("deferred-view-initializers"'));
  assert.ok(bootstrap.indexOf("hideBootstrapLoadingState()") < bootstrap.indexOf('runSecondaryStepV169("deferred-view-initializers"'));
  assert.match(appSource, /htmlVisibleMs/);
  assert.match(appSource, /interfaceInteractiveMs/);
  assert.match(appSource, /dataRenderedMs/);
  assert.match(appSource, /secondaryInitializationCompleteMs/);
});

test("inicializadores pesados ficam no bundle e aguardam a tela correspondente", () => {
  const deferredModules = {
    "question-searchable-selects-v135.js": /"questoes", "historico-questoes"/,
    "question-register-simple-v162.js": /"questoes"/,
    "factory-final-review-v128.js": /"fabrica-resumos"/,
    "analytics-accordion-fix-v148.js": /"analise-estrategica"/,
    "analytics-header-arrow-v149.js": /"analise-estrategica"/,
    "analytics-single-arrow-v150.js": /"analise-estrategica"/,
    "contest-countdown-v151.js": /"dashboard"/
  };
  for (const [file, viewPattern] of Object.entries(deferredModules)) {
    const moduleSource = fs.readFileSync(file, "utf8");
    assert.match(moduleSource, /__aldusDeferViewInitializerV169/);
    assert.match(moduleSource, viewPattern);
  }
});

test("correção de atualização não acessa nem altera armazenamento persistente", () => {
  assert.doesNotMatch(source, /localStorage|indexedDB|deleteDatabase|defaultValue\s*!==|\.value\s*!==/);
  assert.match(source, /data-aldus-user-edited-v169/);
  assert.match(source, /event\?\.isTrusted/);
});

function createWorkerFetchRuntime({ cachedText = "", networkText = "rede-v169" } = {}) {
  const listeners = {};
  const cachedResponse = cachedText ? new Response(cachedText) : null;
  const cacheWrites = [];
  let networkRequests = 0;
  const context = {
    self: {
      registration: { scope: "https://aldus.local/" },
      location: { origin: "https://aldus.local" },
      clients: { claim: async () => {} },
      skipWaiting() {},
      addEventListener(type, callback) { listeners[type] = callback; }
    },
    caches: {
      keys: async () => [],
      delete: async () => true,
      open: async () => ({
        addAll: async () => {},
        put: async (request, response) => cacheWrites.push([request.url || String(request), await response.text()])
      }),
      match: async () => cachedResponse?.clone() || null
    },
    fetch: async () => {
      networkRequests += 1;
      return new Response(networkText, { status: 200 });
    },
    URL,
    Response,
    Request,
    Set
  };
  vm.runInNewContext(workerSource, context);
  return {
    async fetchStatic() {
      let responsePromise;
      const background = [];
      listeners.fetch({
        request: {
          method: "GET",
          url: "https://aldus.local/app-v169.js?v=test",
          mode: "same-origin",
          destination: "script"
        },
        respondWith(value) { responsePromise = Promise.resolve(value); },
        waitUntil(value) { background.push(Promise.resolve(value)); }
      });
      const response = await responsePromise;
      await Promise.all(background);
      return response.text();
    },
    cacheWrites,
    networkRequests: () => networkRequests
  };
}

test("cache vazio entrega o app-v169 pela rede e grava a resposta", async () => {
  const runtime = createWorkerFetchRuntime();
  assert.equal(await runtime.fetchStatic(), "rede-v169");
  assert.equal(runtime.networkRequests(), 1);
  assert.equal(runtime.cacheWrites.length, 1);
});

test("cache existente entrega imediatamente a cópia e atualiza em segundo plano", async () => {
  const runtime = createWorkerFetchRuntime({ cachedText: "cache-v169", networkText: "rede-nova-v169" });
  assert.equal(await runtime.fetchStatic(), "cache-v169");
  assert.equal(runtime.networkRequests(), 1);
  assert.deepEqual(runtime.cacheWrites.map((entry) => entry[1]), ["rede-nova-v169"]);
});
