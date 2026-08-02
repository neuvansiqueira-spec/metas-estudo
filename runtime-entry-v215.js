"use strict";

const ALDUS_V215_VERSION = "20260802-restaura-graficos-historico-v169";
const ALDUS_V213_VERSION = "20260801-carregamento-compilado-v169";
const ALDUS_V215_MODULE_ASSET = "./question-history-charts-v215.js";
const ALDUS_V215_MODULE_MARKER = "/* Aldus runtime source: question-history-charts-v215.js */";
const ALDUS_V215_MODULE_CACHE = "aldus-runtime-modules-v215";
const ALDUS_V215_COMPILED_CACHE = "aldus-compiled-app-v215";
const ALDUS_V215_COMPILED_ASSET = "./app-v169.compiled-v215.js";
const ALDUS_V215_MINIMUM_SOURCE_LENGTH = 50000;

let aldusV213FetchListener = null;
let aldusV215PayloadPromise = null;
let aldusV215ModuleSourcePromise = null;
const aldusV215NativeAddEventListener = self.addEventListener.bind(self);

self.addEventListener = function interceptV213Fetch(type, listener, options) {
  if (type === "fetch") {
    aldusV213FetchListener = listener;
    return;
  }
  return aldusV215NativeAddEventListener(type, listener, options);
};

importScripts("./runtime-entry-v200.js");
self.addEventListener = aldusV215NativeAddEventListener;

function aldusV215Request(asset, noStore = false) {
  return new Request(
    new URL(asset, self.registration.scope),
    noStore ? { cache: "no-store" } : undefined
  );
}

function aldusV215CompiledRequest() {
  return aldusV215Request(ALDUS_V215_COMPILED_ASSET);
}

async function aldusV215LoadModuleSource() {
  const cache = await caches.open(ALDUS_V215_MODULE_CACHE);
  const request = aldusV215Request(ALDUS_V215_MODULE_ASSET);
  let response = await cache.match(request, { ignoreSearch: true });
  if (!response?.ok) {
    response = await fetch(aldusV215Request(ALDUS_V215_MODULE_ASSET, true));
    if (!response?.ok) throw new Error("Não foi possível carregar o módulo dos gráficos do histórico.");
    await cache.put(request, response.clone());
  }
  return response.text();
}

function aldusV215ModuleSource() {
  if (!aldusV215ModuleSourcePromise) {
    aldusV215ModuleSourcePromise = aldusV215LoadModuleSource().catch((error) => {
      aldusV215ModuleSourcePromise = null;
      throw error;
    });
  }
  return aldusV215ModuleSourcePromise;
}

function aldusV215ValidateSource(source) {
  if (typeof source !== "string" || source.length < ALDUS_V215_MINIMUM_SOURCE_LENGTH) {
    throw new Error("O JavaScript consolidado ficou menor que o esperado.");
  }
  const required = [
    'const STORAGE_KEY = "metasConcursoData";',
    "TIMER_MOTIVATIONAL_MESSAGES",
    ALDUS_V215_MODULE_MARKER,
    "questionHistoryChartsV215"
  ];
  const missing = required.filter((marker) => !source.includes(marker));
  if (missing.length) throw new Error(`Marcadores obrigatórios ausentes: ${missing.join(", ")}`);
  return source;
}

function aldusV215PayloadResponse(payload, cacheState = "compiled") {
  const headers = new Headers(payload.headers || []);
  headers.set("content-type", "text/javascript; charset=utf-8");
  headers.set("x-aldus-runtime-patch", ALDUS_V215_VERSION);
  headers.set("x-aldus-compiled-app", ALDUS_V215_VERSION);
  headers.set("x-aldus-compiled-cache", cacheState);
  headers.set("x-aldus-question-history-charts", "restored-v215");
  return new Response(payload.source, {
    status: payload.status || 200,
    statusText: payload.statusText || "OK",
    headers
  });
}

function aldusV215ResponsePayload(source, response) {
  const headers = new Headers(response?.headers || undefined);
  for (const name of ["content-length", "content-encoding", "etag", "last-modified"]) headers.delete(name);
  return {
    source: aldusV215ValidateSource(source),
    status: response?.status || 200,
    statusText: response?.statusText || "OK",
    headers: [...headers.entries()]
  };
}

async function aldusV215V213Response(request, eventLike) {
  if (typeof aldusV213FetchListener !== "function") {
    throw new Error("O runtime V213 não está disponível.");
  }
  let responsePromise = null;
  const proxyEvent = {
    request,
    waitUntil: (promise) => eventLike?.waitUntil?.(promise),
    respondWith: (promise) => { responsePromise = Promise.resolve(promise); }
  };
  aldusV213FetchListener.call(self, proxyEvent);
  if (!responsePromise) throw new Error("O runtime V213 não entregou a aplicação.");
  return responsePromise;
}

async function aldusV215CompilePayload(request, eventLike) {
  const baseResponse = await aldusV215V213Response(request, eventLike);
  if (!baseResponse?.ok) throw new Error("A aplicação consolidada V213 não foi carregada.");
  const [baseSource, moduleSource] = await Promise.all([
    baseResponse.text(),
    aldusV215ModuleSource()
  ]);
  let source = baseSource.replaceAll(ALDUS_V213_VERSION, ALDUS_V215_VERSION);
  if (!source.includes(ALDUS_V215_MODULE_MARKER)) {
    source = `${source.trim()}\n\n${ALDUS_V215_MODULE_MARKER}\n${moduleSource.trim()}\n`;
  }
  return aldusV215ResponsePayload(source, baseResponse);
}

async function aldusV215ReadPayload() {
  const cache = await caches.open(ALDUS_V215_COMPILED_CACHE);
  const response = await cache.match(aldusV215CompiledRequest(), { ignoreSearch: true });
  if (!response?.ok || response.headers.get("x-aldus-compiled-app") !== ALDUS_V215_VERSION) return null;
  return aldusV215ResponsePayload(await response.text(), response);
}

async function aldusV215WritePayload(payload) {
  const cache = await caches.open(ALDUS_V215_COMPILED_CACHE);
  await cache.put(aldusV215CompiledRequest(), aldusV215PayloadResponse(payload, "stored"));
  return payload;
}

async function aldusV215BuildPayload(request, eventLike) {
  const payload = await aldusV215CompilePayload(request, eventLike);
  return aldusV215WritePayload(payload);
}

function aldusV215Payload(request, eventLike) {
  if (!aldusV215PayloadPromise) {
    aldusV215PayloadPromise = (async () => {
      const cached = await aldusV215ReadPayload();
      if (cached) return cached;
      return aldusV215BuildPayload(request, eventLike);
    })().catch((error) => {
      aldusV215PayloadPromise = null;
      throw error;
    });
  }
  return aldusV215PayloadPromise;
}

async function aldusV215Prepare() {
  const request = new Request(
    new URL(`./app-v169.js?v=${encodeURIComponent(ALDUS_V215_VERSION)}`, self.registration.scope),
    { cache: "reload" }
  );
  const pending = [];
  const eventLike = { waitUntil: (promise) => pending.push(Promise.resolve(promise)) };
  const payload = await aldusV215BuildPayload(request, eventLike);
  aldusV215PayloadPromise = Promise.resolve(payload);
  await Promise.allSettled(pending);
}

aldusV215NativeAddEventListener("install", (event) => {
  event.waitUntil(
    aldusV215Prepare().catch((error) => {
      console.warn("[Aldus V215] O gráfico será preparado no primeiro acesso.", error);
    })
  );
});

aldusV215NativeAddEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) => Promise.all(
      names
        .filter((name) =>
          (name.startsWith("aldus-runtime-modules-v21") && name !== ALDUS_V215_MODULE_CACHE && name !== "aldus-runtime-modules-v213") ||
          (name.startsWith("aldus-compiled-app-v21") && name !== ALDUS_V215_COMPILED_CACHE && name !== "aldus-compiled-app-v213")
        )
        .map((name) => caches.delete(name))
    ))
  );
});

async function aldusV215ServeApplication(request) {
  const passiveEvent = { waitUntil: () => undefined };
  try {
    const payload = await aldusV215Payload(request, passiveEvent);
    return aldusV215PayloadResponse(payload, "hit");
  } catch (error) {
    console.warn("[Aldus V215] Não foi possível usar o gráfico restaurado; mantendo a aplicação V213.", error);
    return aldusV215V213Response(request, passiveEvent);
  }
}

aldusV215NativeAddEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  const isApplication = url.origin === self.location.origin && url.pathname.endsWith("/app-v169.js");
  if (isApplication) {
    event.respondWith(aldusV215ServeApplication(event.request));
    return;
  }
  if (typeof aldusV213FetchListener === "function") aldusV213FetchListener.call(self, event);
});
