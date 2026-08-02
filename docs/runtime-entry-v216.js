"use strict";

const ALDUS_V216_VERSION = "20260802-tons-azulados-historico-v169";
const ALDUS_V215_VERSION = "20260802-restaura-graficos-historico-v169";
const ALDUS_V216_MODULE_ASSET = "./question-history-tone-v216.js";
const ALDUS_V216_MODULE_MARKER = "/* Aldus runtime source: question-history-tone-v216.js */";
const ALDUS_V216_MODULE_CACHE = "aldus-runtime-modules-v216";
const ALDUS_V216_COMPILED_CACHE = "aldus-compiled-app-v216";
const ALDUS_V216_COMPILED_ASSET = "./app-v169.compiled-v216.js";
const ALDUS_V216_MINIMUM_SOURCE_LENGTH = 50000;

let aldusV215FetchListener = null;
let aldusV216PayloadPromise = null;
let aldusV216ModuleSourcePromise = null;
const aldusV216NativeAddEventListener = self.addEventListener.bind(self);

self.addEventListener = function interceptV215Fetch(type, listener, options) {
  if (type === "fetch") {
    aldusV215FetchListener = listener;
    return;
  }
  return aldusV216NativeAddEventListener(type, listener, options);
};

importScripts("./runtime-entry-v215.js");
self.addEventListener = aldusV216NativeAddEventListener;

function aldusV216Request(asset, noStore = false) {
  return new Request(
    new URL(asset, self.registration.scope),
    noStore ? { cache: "no-store" } : undefined
  );
}

function aldusV216CompiledRequest() {
  return aldusV216Request(ALDUS_V216_COMPILED_ASSET);
}

async function aldusV216LoadModuleSource() {
  const cache = await caches.open(ALDUS_V216_MODULE_CACHE);
  const request = aldusV216Request(ALDUS_V216_MODULE_ASSET);
  let response = await cache.match(request, { ignoreSearch: true });
  if (!response?.ok) {
    response = await fetch(aldusV216Request(ALDUS_V216_MODULE_ASSET, true));
    if (!response?.ok) throw new Error("Não foi possível carregar o módulo de tons azulados do histórico.");
    await cache.put(request, response.clone());
  }
  return response.text();
}

function aldusV216ModuleSource() {
  if (!aldusV216ModuleSourcePromise) {
    aldusV216ModuleSourcePromise = aldusV216LoadModuleSource().catch((error) => {
      aldusV216ModuleSourcePromise = null;
      throw error;
    });
  }
  return aldusV216ModuleSourcePromise;
}

function aldusV216ValidateSource(source) {
  if (typeof source !== "string" || source.length < ALDUS_V216_MINIMUM_SOURCE_LENGTH) {
    throw new Error("O JavaScript consolidado ficou menor que o esperado.");
  }
  const required = [
    'const STORAGE_KEY = "metasConcursoData";',
    "TIMER_MOTIVATIONAL_MESSAGES",
    "questionHistoryChartsV215",
    ALDUS_V216_MODULE_MARKER,
    "questionHistoryToneStylesV216"
  ];
  const missing = required.filter((marker) => !source.includes(marker));
  if (missing.length) throw new Error(`Marcadores obrigatórios ausentes: ${missing.join(", ")}`);
  return source;
}

function aldusV216PayloadResponse(payload, cacheState = "compiled") {
  const headers = new Headers(payload.headers || []);
  headers.set("content-type", "text/javascript; charset=utf-8");
  headers.set("x-aldus-runtime-patch", ALDUS_V216_VERSION);
  headers.set("x-aldus-compiled-app", ALDUS_V216_VERSION);
  headers.set("x-aldus-compiled-cache", cacheState);
  headers.set("x-aldus-question-history-tone", "blue-ice-v216");
  return new Response(payload.source, {
    status: payload.status || 200,
    statusText: payload.statusText || "OK",
    headers
  });
}

function aldusV216ResponsePayload(source, response) {
  const headers = new Headers(response?.headers || undefined);
  for (const name of ["content-length", "content-encoding", "etag", "last-modified"]) headers.delete(name);
  return {
    source: aldusV216ValidateSource(source),
    status: response?.status || 200,
    statusText: response?.statusText || "OK",
    headers: [...headers.entries()]
  };
}

async function aldusV216V215Response(request, eventLike) {
  if (typeof aldusV215FetchListener !== "function") {
    throw new Error("O runtime V215 não está disponível.");
  }
  let responsePromise = null;
  const proxyEvent = {
    request,
    waitUntil: (promise) => eventLike?.waitUntil?.(promise),
    respondWith: (promise) => { responsePromise = Promise.resolve(promise); }
  };
  aldusV215FetchListener.call(self, proxyEvent);
  if (!responsePromise) throw new Error("O runtime V215 não entregou a aplicação.");
  return responsePromise;
}

async function aldusV216CompilePayload(request, eventLike) {
  const baseResponse = await aldusV216V215Response(request, eventLike);
  if (!baseResponse?.ok) throw new Error("A aplicação consolidada V215 não foi carregada.");
  const [baseSource, moduleSource] = await Promise.all([
    baseResponse.text(),
    aldusV216ModuleSource()
  ]);
  let source = baseSource.replaceAll(ALDUS_V215_VERSION, ALDUS_V216_VERSION);
  if (!source.includes(ALDUS_V216_MODULE_MARKER)) {
    source = `${source.trim()}\n\n${ALDUS_V216_MODULE_MARKER}\n${moduleSource.trim()}\n`;
  }
  return aldusV216ResponsePayload(source, baseResponse);
}

async function aldusV216ReadPayload() {
  const cache = await caches.open(ALDUS_V216_COMPILED_CACHE);
  const response = await cache.match(aldusV216CompiledRequest(), { ignoreSearch: true });
  if (!response?.ok || response.headers.get("x-aldus-compiled-app") !== ALDUS_V216_VERSION) return null;
  return aldusV216ResponsePayload(await response.text(), response);
}

async function aldusV216WritePayload(payload) {
  const cache = await caches.open(ALDUS_V216_COMPILED_CACHE);
  await cache.put(aldusV216CompiledRequest(), aldusV216PayloadResponse(payload, "stored"));
  return payload;
}

async function aldusV216BuildPayload(request, eventLike) {
  const payload = await aldusV216CompilePayload(request, eventLike);
  return aldusV216WritePayload(payload);
}

function aldusV216Payload(request, eventLike) {
  if (!aldusV216PayloadPromise) {
    aldusV216PayloadPromise = (async () => {
      const cached = await aldusV216ReadPayload();
      if (cached) return cached;
      return aldusV216BuildPayload(request, eventLike);
    })().catch((error) => {
      aldusV216PayloadPromise = null;
      throw error;
    });
  }
  return aldusV216PayloadPromise;
}

async function aldusV216Prepare() {
  const request = new Request(
    new URL(`./app-v169.js?v=${encodeURIComponent(ALDUS_V216_VERSION)}`, self.registration.scope),
    { cache: "reload" }
  );
  const pending = [];
  const eventLike = { waitUntil: (promise) => pending.push(Promise.resolve(promise)) };
  const payload = await aldusV216BuildPayload(request, eventLike);
  aldusV216PayloadPromise = Promise.resolve(payload);
  await Promise.allSettled(pending);
}

aldusV216NativeAddEventListener("install", (event) => {
  event.waitUntil(
    aldusV216Prepare().catch((error) => {
      console.warn("[Aldus V216] Os tons azulados serão preparados no primeiro acesso.", error);
    })
  );
});

aldusV216NativeAddEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) => Promise.all(
      names
        .filter((name) =>
          (name.startsWith("aldus-runtime-modules-v21") && name !== ALDUS_V216_MODULE_CACHE && name !== "aldus-runtime-modules-v215" && name !== "aldus-runtime-modules-v213") ||
          (name.startsWith("aldus-compiled-app-v21") && name !== ALDUS_V216_COMPILED_CACHE && name !== "aldus-compiled-app-v215" && name !== "aldus-compiled-app-v213")
        )
        .map((name) => caches.delete(name))
    ))
  );
});

async function aldusV216ServeApplication(request) {
  const passiveEvent = { waitUntil: () => undefined };
  try {
    const payload = await aldusV216Payload(request, passiveEvent);
    return aldusV216PayloadResponse(payload, "hit");
  } catch (error) {
    console.warn("[Aldus V216] Não foi possível aplicar os tons azulados; mantendo a aplicação V215.", error);
    return aldusV216V215Response(request, passiveEvent);
  }
}

aldusV216NativeAddEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  const isApplication = url.origin === self.location.origin && url.pathname.endsWith("/app-v169.js");
  if (isApplication) {
    event.respondWith(aldusV216ServeApplication(event.request));
    return;
  }
  if (typeof aldusV215FetchListener === "function") aldusV215FetchListener.call(self, event);
});
