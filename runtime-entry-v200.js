"use strict";

const ALDUS_V213_VERSION = "20260801-carregamento-compilado-v169";
const ALDUS_V212_VERSION = "20260731-restaura-carregamento-rapido-v169";
const ALDUS_V211_VERSION = "20260731-variedade-mensagens-cronometro-v169";
const ALDUS_V210_VERSION = "20260731-refina-titulo-cronometro-v169";
const ALDUS_V209_VERSION = "20260731-contraste-titulo-cronometro-v169";
const ALDUS_V208_VERSION = "20260731-borda-ativa-cronometro-v169";
const ALDUS_V207_VERSION = "20260731-suaviza-titulo-navegacao-v169";
const ALDUS_V206_VERSION = "20260731-remove-agulha-menu-lateral-v169";
const ALDUS_V205_VERSION = "20260731-corrige-menu-lateral-hover-v169";
const ALDUS_V204_VERSION = "20260731-menu-lateral-hover-v169";
const ALDUS_V199_VERSION = "20260730-contraste-resultado-liquido-v169";

const ALDUS_V213_MODULE_CACHE = "aldus-runtime-modules-v213";
const ALDUS_V213_COMPILED_CACHE = "aldus-compiled-app-v213";
const ALDUS_V213_COMPILED_ASSET = "./app-v169.compiled-v213.js";
const ALDUS_V213_MINIMUM_SOURCE_LENGTH = 50000;
const ALDUS_V213_MODULES = Object.freeze([
  {
    asset: "./planning-shift-disciplines-v200.js",
    marker: "/* Aldus runtime source: planning-shift-disciplines-v200.js */"
  },
  {
    asset: "./planning-shift-disciplines-visual-v201.js",
    marker: "/* Aldus runtime source: planning-shift-disciplines-visual-v203.js */"
  },
  {
    asset: "./side-nav-hover-collapse-v207.js",
    marker: "/* Aldus runtime source: side-nav-hover-collapse-v207.js */"
  },
  {
    asset: "./floating-timer-active-border-v208.js",
    marker: "/* Aldus runtime source: floating-timer-active-border-v208.js */"
  },
  {
    asset: "./floating-timer-label-contrast-v209.js",
    marker: "/* Aldus runtime source: floating-timer-label-contrast-v209.js */"
  },
  {
    asset: "./floating-timer-label-quality-v210.js",
    marker: "/* Aldus runtime source: floating-timer-label-quality-v210.js */"
  },
  {
    asset: "./timer-message-variety-v211.js",
    marker: "/* Aldus runtime source: timer-message-variety-v211.js */"
  }
]);
const ALDUS_V213_REQUIRED_SOURCE_MARKERS = Object.freeze([
  'const STORAGE_KEY = "metasConcursoData";',
  "TIMER_MOTIVATIONAL_MESSAGES",
  ...ALDUS_V213_MODULES.map(({ marker }) => marker)
]);

let aldusBaseFetchListener = null;
let aldusV213ModuleSourcesPromise = null;
let aldusV213CompiledPayloadPromise = null;
const aldusNativeAddEventListener = self.addEventListener.bind(self);

self.addEventListener = function interceptBaseRuntimeListener(type, listener, options) {
  if (type === "fetch") {
    aldusBaseFetchListener = listener;
    return;
  }
  return aldusNativeAddEventListener(type, listener, options);
};

importScripts("./runtime-shell-base-v199.js");
self.addEventListener = aldusNativeAddEventListener;

function aldusV213Request(asset, noStore = false) {
  return new Request(
    new URL(asset, self.registration.scope),
    noStore ? { cache: "no-store" } : undefined
  );
}

function aldusV213CompiledRequest() {
  return aldusV213Request(ALDUS_V213_COMPILED_ASSET);
}

async function aldusV213FetchAndCacheModule(cache, asset) {
  const request = aldusV213Request(asset);
  const response = await fetch(aldusV213Request(asset, true));
  if (!response?.ok) throw new Error(`Falha ao carregar módulo ${asset}.`);
  await cache.put(request, response.clone());
  return response;
}

async function aldusV213WarmModuleCache() {
  const cache = await caches.open(ALDUS_V213_MODULE_CACHE);
  await Promise.all(
    ALDUS_V213_MODULES.map(({ asset }) => aldusV213FetchAndCacheModule(cache, asset))
  );
}

async function aldusV213LoadModuleSources() {
  const cache = await caches.open(ALDUS_V213_MODULE_CACHE);
  return Promise.all(
    ALDUS_V213_MODULES.map(async ({ asset }) => {
      const request = aldusV213Request(asset);
      let response = await cache.match(request, { ignoreSearch: true });
      if (!response?.ok) response = await aldusV213FetchAndCacheModule(cache, asset);
      return response.text();
    })
  );
}

function aldusV213ModuleSources() {
  if (!aldusV213ModuleSourcesPromise) {
    aldusV213ModuleSourcesPromise = aldusV213LoadModuleSources().catch((error) => {
      aldusV213ModuleSourcesPromise = null;
      throw error;
    });
  }
  return aldusV213ModuleSourcesPromise;
}

function aldusV213ValidateSource(source) {
  if (typeof source !== "string" || source.length < ALDUS_V213_MINIMUM_SOURCE_LENGTH) {
    throw new Error("O JavaScript consolidado ficou menor que o esperado.");
  }
  const missing = ALDUS_V213_REQUIRED_SOURCE_MARKERS.filter((marker) => !source.includes(marker));
  if (missing.length) {
    throw new Error(`Marcadores obrigatórios ausentes: ${missing.join(", ")}`);
  }
  return source;
}

function aldusV213PayloadResponse(payload, cacheState = "compiled") {
  const headers = new Headers(payload.headers || []);
  headers.set("content-type", "text/javascript; charset=utf-8");
  headers.set("x-aldus-runtime-patch", ALDUS_V213_VERSION);
  headers.set("x-aldus-runtime-modules", "compiled-cache-memory");
  headers.set("x-aldus-compiled-app", ALDUS_V213_VERSION);
  headers.set("x-aldus-compiled-cache", cacheState);
  return new Response(payload.source, {
    status: payload.status || 200,
    statusText: payload.statusText || "OK",
    headers
  });
}

function aldusV213ResponsePayload(source, response) {
  const headers = new Headers(response?.headers || undefined);
  for (const name of ["content-length", "content-encoding", "etag", "last-modified"]) {
    headers.delete(name);
  }
  return {
    source: aldusV213ValidateSource(source),
    status: response?.status || 200,
    statusText: response?.statusText || "OK",
    headers: [...headers.entries()]
  };
}

async function aldusV213ReadCompiledPayload() {
  const cache = await caches.open(ALDUS_V213_COMPILED_CACHE);
  const response = await cache.match(aldusV213CompiledRequest(), { ignoreSearch: true });
  if (!response?.ok || response.headers.get("x-aldus-compiled-app") !== ALDUS_V213_VERSION) {
    return null;
  }
  const source = await response.text();
  return aldusV213ResponsePayload(source, response);
}

async function aldusV213WriteCompiledPayload(payload) {
  const cache = await caches.open(ALDUS_V213_COMPILED_CACHE);
  await cache.put(
    aldusV213CompiledRequest(),
    aldusV213PayloadResponse(payload, "stored")
  );
  return payload;
}

async function aldusV213BaseApplicationResponse(request, eventLike) {
  if (typeof patchedApplicationResponse === "function") {
    return patchedApplicationResponse(request, eventLike);
  }
  if (typeof aldusBaseFetchListener !== "function") {
    throw new Error("O runtime-base da aplicação não está disponível.");
  }
  let responsePromise = null;
  const proxyEvent = {
    request,
    waitUntil: (promise) => eventLike?.waitUntil?.(promise),
    respondWith: (promise) => { responsePromise = Promise.resolve(promise); }
  };
  aldusBaseFetchListener.call(self, proxyEvent);
  if (!responsePromise) throw new Error("O runtime-base não entregou a aplicação.");
  return responsePromise;
}

async function aldusV213CompilePayload(request, eventLike) {
  const baseResponse = await aldusV213BaseApplicationResponse(request, eventLike);
  if (!baseResponse?.ok) throw new Error("A aplicação-base não foi carregada.");
  const [source, moduleSources] = await Promise.all([
    baseResponse.text(),
    aldusV213ModuleSources()
  ]);

  let patchedSource = source
      .replaceAll(ALDUS_V199_VERSION, ALDUS_V213_VERSION)
      .replaceAll(ALDUS_V204_VERSION, ALDUS_V213_VERSION)
      .replaceAll(ALDUS_V205_VERSION, ALDUS_V213_VERSION)
      .replaceAll(ALDUS_V206_VERSION, ALDUS_V213_VERSION)
      .replaceAll(ALDUS_V207_VERSION, ALDUS_V213_VERSION)
      .replaceAll(ALDUS_V208_VERSION, ALDUS_V213_VERSION)
      .replaceAll(ALDUS_V209_VERSION, ALDUS_V213_VERSION)
      .replaceAll(ALDUS_V210_VERSION, ALDUS_V213_VERSION)
      .replaceAll(ALDUS_V211_VERSION, ALDUS_V213_VERSION)
      .replaceAll(ALDUS_V212_VERSION, ALDUS_V213_VERSION);

  ALDUS_V213_MODULES.forEach(({ marker }, index) => {
    if (!patchedSource.includes(marker)) {
      patchedSource = `${patchedSource.trim()}\n\n${marker}\n${moduleSources[index].trim()}\n`;
    }
  });

  return aldusV213ResponsePayload(patchedSource, baseResponse);
}

async function aldusV213BuildAndStorePayload(request, eventLike) {
  const payload = await aldusV213CompilePayload(request, eventLike);
  return aldusV213WriteCompiledPayload(payload);
}

function aldusV213CompiledPayload(request, eventLike) {
  if (!aldusV213CompiledPayloadPromise) {
    aldusV213CompiledPayloadPromise = (async () => {
      const cached = await aldusV213ReadCompiledPayload();
      if (cached) return cached;
      return aldusV213BuildAndStorePayload(request, eventLike);
    })().catch((error) => {
      aldusV213CompiledPayloadPromise = null;
      throw error;
    });
  }
  return aldusV213CompiledPayloadPromise;
}

async function aldusV213PrepareCompiledApplication() {
  await aldusV213WarmModuleCache();
  const appRequest = new Request(
    new URL(`./app-v169.js?v=${encodeURIComponent(ALDUS_V213_VERSION)}`, self.registration.scope),
    { cache: "reload" }
  );
  const backgroundPromises = [];
  const eventLike = {
    waitUntil: (promise) => backgroundPromises.push(Promise.resolve(promise))
  };
  const payload = await aldusV213BuildAndStorePayload(appRequest, eventLike);
  aldusV213CompiledPayloadPromise = Promise.resolve(payload);
  await Promise.allSettled(backgroundPromises);
}

aldusNativeAddEventListener("install", (event) => {
  event.waitUntil(
    aldusV213PrepareCompiledApplication().catch((error) => {
      console.warn("[Aldus V213] A pré-compilação não foi concluída; ocorrerá no primeiro acesso.", error);
    })
  );
});

aldusNativeAddEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((name) =>
            (name.startsWith("aldus-runtime-modules-") && name !== ALDUS_V213_MODULE_CACHE) ||
            (name.startsWith("aldus-compiled-app-") && name !== ALDUS_V213_COMPILED_CACHE)
          )
          .map((name) => caches.delete(name))
      )
    )
  );
});

async function aldusV213ServeApplication(request) {
  const passiveEvent = { waitUntil: () => undefined };
  try {
    const payload = await aldusV213CompiledPayload(request, passiveEvent);
    return aldusV213PayloadResponse(payload, "hit");
  } catch (error) {
    console.warn("[Aldus V213] O cache compilado não pôde ser usado; carregando pelo runtime-base.", error);
    return aldusV213BaseApplicationResponse(request, passiveEvent);
  }
}

aldusNativeAddEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  const isApplication =
    url.origin === self.location.origin &&
    url.pathname.endsWith("/app-v169.js");

  if (isApplication) {
    event.respondWith(aldusV213ServeApplication(event.request));
    return;
  }

  if (typeof aldusBaseFetchListener === "function") {
    aldusBaseFetchListener.call(self, event);
  }
});
