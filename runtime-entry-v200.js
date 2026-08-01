"use strict";

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

const ALDUS_V212_MODULE_CACHE = "aldus-runtime-modules-v212";
const ALDUS_V212_MODULES = Object.freeze([
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

let aldusBaseFetchListener = null;
let aldusV212ModuleSourcesPromise = null;
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

function aldusV212ModuleRequest(asset, noStore = false) {
  return new Request(new URL(asset, self.registration.scope), noStore ? { cache: "no-store" } : undefined);
}

async function aldusV212FetchAndCacheModule(cache, asset) {
  const request = aldusV212ModuleRequest(asset);
  const response = await fetch(aldusV212ModuleRequest(asset, true));
  if (!response?.ok) throw new Error(`Falha ao carregar módulo ${asset}.`);
  await cache.put(request, response.clone());
  return response;
}

async function aldusV212WarmModuleCache() {
  const cache = await caches.open(ALDUS_V212_MODULE_CACHE);
  await Promise.all(
    ALDUS_V212_MODULES.map(({ asset }) => aldusV212FetchAndCacheModule(cache, asset))
  );
}

async function aldusV212LoadModuleSources() {
  const cache = await caches.open(ALDUS_V212_MODULE_CACHE);
  return Promise.all(
    ALDUS_V212_MODULES.map(async ({ asset }) => {
      const request = aldusV212ModuleRequest(asset);
      let response = await cache.match(request, { ignoreSearch: true });
      if (!response?.ok) response = await aldusV212FetchAndCacheModule(cache, asset);
      return response.text();
    })
  );
}

function aldusV212ModuleSources() {
  if (!aldusV212ModuleSourcesPromise) {
    aldusV212ModuleSourcesPromise = aldusV212LoadModuleSources().catch((error) => {
      aldusV212ModuleSourcesPromise = null;
      throw error;
    });
  }
  return aldusV212ModuleSourcesPromise;
}

aldusNativeAddEventListener("install", (event) => {
  event.waitUntil(
    aldusV212WarmModuleCache().catch((error) => {
      console.warn("[Aldus V212] O pré-carregamento dos módulos falhou; será usado carregamento sob demanda.", error);
    })
  );
});

aldusNativeAddEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((name) => name.startsWith("aldus-runtime-modules-") && name !== ALDUS_V212_MODULE_CACHE)
          .map((name) => caches.delete(name))
      )
    )
  );
});

async function aldusV212ApplicationResponse(baseResponse) {
  if (!baseResponse?.ok) return baseResponse;
  try {
    const [source, moduleSources] = await Promise.all([
      baseResponse.text(),
      aldusV212ModuleSources()
    ]);

    let patchedSource = source
      .replaceAll(ALDUS_V199_VERSION, ALDUS_V212_VERSION)
      .replaceAll(ALDUS_V204_VERSION, ALDUS_V212_VERSION)
      .replaceAll(ALDUS_V205_VERSION, ALDUS_V212_VERSION)
      .replaceAll(ALDUS_V206_VERSION, ALDUS_V212_VERSION)
      .replaceAll(ALDUS_V207_VERSION, ALDUS_V212_VERSION)
      .replaceAll(ALDUS_V208_VERSION, ALDUS_V212_VERSION)
      .replaceAll(ALDUS_V209_VERSION, ALDUS_V212_VERSION)
      .replaceAll(ALDUS_V210_VERSION, ALDUS_V212_VERSION)
      .replaceAll(ALDUS_V211_VERSION, ALDUS_V212_VERSION);

    ALDUS_V212_MODULES.forEach(({ marker }, index) => {
      if (!patchedSource.includes(marker)) {
        patchedSource = `${patchedSource.trim()}\n\n${marker}\n${moduleSources[index].trim()}\n`;
      }
    });

    const headers = new Headers(baseResponse.headers);
    for (const name of ["content-length", "content-encoding", "etag", "last-modified"]) headers.delete(name);
    headers.set("content-type", "text/javascript; charset=utf-8");
    headers.set("x-aldus-runtime-patch", ALDUS_V212_VERSION);
    headers.set("x-aldus-runtime-modules", "cache-first-memory");
    return new Response(patchedSource, {
      status: baseResponse.status,
      statusText: baseResponse.statusText,
      headers
    });
  } catch (error) {
    console.warn("[Aldus V212] Não foi possível usar o carregamento rápido; a versão anterior será mantida.", error);
    return baseResponse;
  }
}

aldusNativeAddEventListener("fetch", (event) => {
  if (typeof aldusBaseFetchListener !== "function") return;
  let baseResponsePromise = null;
  const proxyEvent = {
    request: event.request,
    waitUntil: (promise) => event.waitUntil(promise),
    respondWith: (promise) => { baseResponsePromise = Promise.resolve(promise); }
  };
  aldusBaseFetchListener.call(self, proxyEvent);
  if (!baseResponsePromise) return;
  const url = new URL(event.request.url);
  const isApplication = url.origin === self.location.origin && url.pathname.endsWith("/app-v169.js");
  event.respondWith(isApplication ? baseResponsePromise.then(aldusV212ApplicationResponse) : baseResponsePromise);
});
