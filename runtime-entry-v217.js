"use strict";

const ALDUS_V217_VERSION = "20260802-corrige-atualizacao-versao-v217";
const ALDUS_V216_VERSION = "20260802-tons-azulados-historico-v169";
const ALDUS_V217_LEGACY_HTML_VERSION = "20260730-meta-diaria-peca-delegado-v169";
const ALDUS_V217_MODULE_ASSET = "./version-sync-v217.js";
const ALDUS_V217_MODULE_MARKER = "/* Aldus runtime source: version-sync-v217.js */";
const ALDUS_V217_MODULE_CACHE = "aldus-runtime-modules-v217";
const ALDUS_V217_COMPILED_CACHE = "aldus-compiled-app-v217";
const ALDUS_V217_COMPILED_ASSET = "./app-v169.compiled-v217.js";
const ALDUS_V217_MINIMUM_SOURCE_LENGTH = 50000;

let aldusV216FetchListener = null;
let aldusV217PayloadPromise = null;
let aldusV217ModuleSourcePromise = null;
const aldusV217NativeAddEventListener = self.addEventListener.bind(self);

self.addEventListener = function interceptV216Fetch(type, listener, options) {
  if (type === "fetch") {
    aldusV216FetchListener = listener;
    return;
  }
  return aldusV217NativeAddEventListener(type, listener, options);
};

importScripts("./runtime-entry-v216.js");
self.addEventListener = aldusV217NativeAddEventListener;

function aldusV217Request(asset, noStore = false) {
  return new Request(
    new URL(asset, self.registration.scope),
    noStore ? { cache: "no-store" } : undefined
  );
}

function aldusV217CompiledRequest() {
  return aldusV217Request(ALDUS_V217_COMPILED_ASSET);
}

async function aldusV217LoadModuleSource() {
  const cache = await caches.open(ALDUS_V217_MODULE_CACHE);
  const request = aldusV217Request(ALDUS_V217_MODULE_ASSET);
  let response = await cache.match(request, { ignoreSearch: true });
  if (!response?.ok) {
    response = await fetch(aldusV217Request(ALDUS_V217_MODULE_ASSET, true));
    if (!response?.ok) throw new Error("Não foi possível carregar o sincronizador de versão.");
    await cache.put(request, response.clone());
  }
  return response.text();
}

function aldusV217ModuleSource() {
  if (!aldusV217ModuleSourcePromise) {
    aldusV217ModuleSourcePromise = aldusV217LoadModuleSource().catch((error) => {
      aldusV217ModuleSourcePromise = null;
      throw error;
    });
  }
  return aldusV217ModuleSourcePromise;
}

function aldusV217ValidateSource(source) {
  if (typeof source !== "string" || source.length < ALDUS_V217_MINIMUM_SOURCE_LENGTH) {
    throw new Error("O JavaScript consolidado ficou menor que o esperado.");
  }
  const required = [
    'const STORAGE_KEY = "metasConcursoData";',
    "TIMER_MOTIVATIONAL_MESSAGES",
    "questionHistoryChartsV215",
    "questionHistoryToneStylesV216",
    ALDUS_V217_MODULE_MARKER,
    "__ALDUS_VERSION_SYNC_V217__"
  ];
  const missing = required.filter((marker) => !source.includes(marker));
  if (missing.length) throw new Error(`Marcadores obrigatórios ausentes: ${missing.join(", ")}`);
  return source;
}

function aldusV217PayloadResponse(payload, cacheState = "compiled") {
  const headers = new Headers(payload.headers || []);
  headers.set("content-type", "text/javascript; charset=utf-8");
  headers.set("x-aldus-runtime-patch", ALDUS_V217_VERSION);
  headers.set("x-aldus-compiled-app", ALDUS_V217_VERSION);
  headers.set("x-aldus-compiled-cache", cacheState);
  headers.set("x-aldus-version-sync", "footer-and-assets-v217");
  return new Response(payload.source, {
    status: payload.status || 200,
    statusText: payload.statusText || "OK",
    headers
  });
}

function aldusV217ResponsePayload(source, response) {
  const headers = new Headers(response?.headers || undefined);
  for (const name of ["content-length", "content-encoding", "etag", "last-modified"]) headers.delete(name);
  return {
    source: aldusV217ValidateSource(source),
    status: response?.status || 200,
    statusText: response?.statusText || "OK",
    headers: [...headers.entries()]
  };
}

async function aldusV217V216Response(request, eventLike) {
  if (typeof aldusV216FetchListener !== "function") {
    throw new Error("O runtime V216 não está disponível.");
  }
  let responsePromise = null;
  const proxyEvent = {
    request,
    waitUntil: (promise) => eventLike?.waitUntil?.(promise),
    respondWith: (promise) => { responsePromise = Promise.resolve(promise); }
  };
  aldusV216FetchListener.call(self, proxyEvent);
  if (!responsePromise) throw new Error("O runtime V216 não entregou uma resposta.");
  return responsePromise;
}

async function aldusV217CompilePayload(request, eventLike) {
  const baseResponse = await aldusV217V216Response(request, eventLike);
  if (!baseResponse?.ok) throw new Error("A aplicação consolidada V216 não foi carregada.");
  const [baseSource, moduleSource] = await Promise.all([
    baseResponse.text(),
    aldusV217ModuleSource()
  ]);
  let source = baseSource
    .replaceAll(ALDUS_V216_VERSION, ALDUS_V217_VERSION)
    .replaceAll(ALDUS_V217_LEGACY_HTML_VERSION, ALDUS_V217_VERSION);
  if (!source.includes(ALDUS_V217_MODULE_MARKER)) {
    source = `${source.trim()}\n\n${ALDUS_V217_MODULE_MARKER}\n${moduleSource.trim()}\n`;
  }
  return aldusV217ResponsePayload(source, baseResponse);
}

async function aldusV217ReadPayload() {
  const cache = await caches.open(ALDUS_V217_COMPILED_CACHE);
  const response = await cache.match(aldusV217CompiledRequest(), { ignoreSearch: true });
  if (!response?.ok || response.headers.get("x-aldus-compiled-app") !== ALDUS_V217_VERSION) return null;
  return aldusV217ResponsePayload(await response.text(), response);
}

async function aldusV217WritePayload(payload) {
  const cache = await caches.open(ALDUS_V217_COMPILED_CACHE);
  await cache.put(aldusV217CompiledRequest(), aldusV217PayloadResponse(payload, "stored"));
  return payload;
}

async function aldusV217BuildPayload(request, eventLike) {
  return aldusV217WritePayload(await aldusV217CompilePayload(request, eventLike));
}

function aldusV217Payload(request, eventLike) {
  if (!aldusV217PayloadPromise) {
    aldusV217PayloadPromise = (async () => {
      const cached = await aldusV217ReadPayload();
      if (cached) return cached;
      return aldusV217BuildPayload(request, eventLike);
    })().catch((error) => {
      aldusV217PayloadPromise = null;
      throw error;
    });
  }
  return aldusV217PayloadPromise;
}

async function aldusV217Prepare() {
  const request = new Request(
    new URL(`./app-v169.js?v=${encodeURIComponent(ALDUS_V217_VERSION)}`, self.registration.scope),
    { cache: "reload" }
  );
  const pending = [];
  const eventLike = { waitUntil: (promise) => pending.push(Promise.resolve(promise)) };
  const payload = await aldusV217BuildPayload(request, eventLike);
  aldusV217PayloadPromise = Promise.resolve(payload);
  await Promise.allSettled(pending);
}

async function aldusV217PatchNavigation(response) {
  if (!response?.ok) return response;
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("text/html")) return response;
  const source = await response.text();
  const patched = source
    .replaceAll(ALDUS_V217_LEGACY_HTML_VERSION, ALDUS_V217_VERSION)
    .replaceAll(ALDUS_V216_VERSION, ALDUS_V217_VERSION);
  const headers = new Headers(response.headers);
  for (const name of ["content-length", "content-encoding", "etag", "last-modified"]) headers.delete(name);
  headers.set("content-type", "text/html; charset=utf-8");
  headers.set("cache-control", "no-cache");
  headers.set("x-aldus-html-version", ALDUS_V217_VERSION);
  return new Response(patched, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

aldusV217NativeAddEventListener("install", (event) => {
  event.waitUntil((async () => {
    try {
      await aldusV217Prepare();
    } catch (error) {
      console.warn("[Aldus V217] A versão será preparada no primeiro acesso.", error);
    } finally {
      await self.skipWaiting();
    }
  })());
});

aldusV217NativeAddEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(
      names
        .filter((name) =>
          (name.startsWith("aldus-runtime-modules-v21") && ![ALDUS_V217_MODULE_CACHE, "aldus-runtime-modules-v216", "aldus-runtime-modules-v215", "aldus-runtime-modules-v213"].includes(name)) ||
          (name.startsWith("aldus-compiled-app-v21") && ![ALDUS_V217_COMPILED_CACHE, "aldus-compiled-app-v216", "aldus-compiled-app-v215", "aldus-compiled-app-v213"].includes(name))
        )
        .map((name) => caches.delete(name))
    );
    await self.clients.claim();
  })());
});

async function aldusV217ServeApplication(request) {
  const passiveEvent = { waitUntil: () => undefined };
  try {
    const payload = await aldusV217Payload(request, passiveEvent);
    return aldusV217PayloadResponse(payload, "hit");
  } catch (error) {
    console.warn("[Aldus V217] Não foi possível sincronizar a versão; mantendo a aplicação V216.", error);
    return aldusV217V216Response(request, passiveEvent);
  }
}

async function aldusV217ServeNavigation(request, event) {
  try {
    return await aldusV217PatchNavigation(await aldusV217V216Response(request, event));
  } catch (error) {
    console.warn("[Aldus V217] Não foi possível atualizar o HTML em cache.", error);
    return aldusV217V216Response(request, event);
  }
}

aldusV217NativeAddEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  const isSameOrigin = url.origin === self.location.origin;
  const isApplication = isSameOrigin && url.pathname.endsWith("/app-v169.js");
  const isNavigation = event.request.mode === "navigate" || (isSameOrigin && (url.pathname.endsWith("/") || url.pathname.endsWith("/index.html")));

  if (isApplication) {
    event.respondWith(aldusV217ServeApplication(event.request));
    return;
  }
  if (isNavigation) {
    event.respondWith(aldusV217ServeNavigation(event.request, event));
    return;
  }
  if (typeof aldusV216FetchListener === "function") aldusV216FetchListener.call(self, event);
});
