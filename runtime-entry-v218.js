"use strict";

const ALDUS_V218_VERSION = "20260802-recupera-atualizacao-presa-v218";
const ALDUS_V218_MARKER = "/* Aldus runtime source: version-sync-v218 */";
const ALDUS_V218_KNOWN_VERSIONS = [
  "20260730-meta-diaria-peca-delegado-v169",
  "20260802-tons-azulados-historico-v169",
  "20260802-corrige-atualizacao-versao-v217"
];

let aldusV216FetchListener = null;
const aldusV218NativeAddEventListener = self.addEventListener.bind(self);

self.addEventListener = function interceptV216Fetch(type, listener, options) {
  if (type === "fetch") {
    aldusV216FetchListener = listener;
    return;
  }
  return aldusV218NativeAddEventListener(type, listener, options);
};

importScripts("./runtime-entry-v216.js");
self.addEventListener = aldusV218NativeAddEventListener;

function aldusV218VersionSyncSource() {
  return `(() => {
  "use strict";
  const VERSION = ${JSON.stringify(ALDUS_V218_VERSION)};
  const TEXT = \`Versão: \${VERSION}\`;
  const OBSERVER_KEY = "__ALDUS_VERSION_SYNC_V218_OBSERVER__";

  function applyVersion() {
    document.documentElement.dataset.aldusVersion = VERSION;
    document.querySelectorAll(".app-version").forEach((element) => {
      element.textContent = TEXT;
      element.dataset.version = VERSION;
      element.title = "Versão efetivamente carregada pelo aplicativo";
    });
  }

  function startObserver() {
    if (globalThis[OBSERVER_KEY] || !document.documentElement) return;
    const observer = new MutationObserver(applyVersion);
    observer.observe(document.documentElement, { childList: true, subtree: true });
    globalThis[OBSERVER_KEY] = observer;
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      applyVersion();
      startObserver();
    }, { once: true });
  } else {
    applyVersion();
    startObserver();
  }

  window.addEventListener("pageshow", applyVersion);
  globalThis.__ALDUS_VERSION_SYNC_V218__ = Object.freeze({ version: VERSION, apply: applyVersion });
})();`;
}

async function aldusV218BaseResponse(request, eventLike) {
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

function aldusV218ReplaceKnownVersions(source) {
  let patched = source;
  for (const version of ALDUS_V218_KNOWN_VERSIONS) {
    patched = patched.replaceAll(version, ALDUS_V218_VERSION);
  }
  return patched;
}

function aldusV218Headers(response, contentType) {
  const headers = new Headers(response?.headers || undefined);
  for (const name of ["content-length", "content-encoding", "etag", "last-modified"]) headers.delete(name);
  headers.set("content-type", contentType);
  headers.set("cache-control", "no-cache");
  headers.set("x-aldus-runtime-patch", ALDUS_V218_VERSION);
  return headers;
}

async function aldusV218ServeApplication(request, eventLike) {
  const response = await aldusV218BaseResponse(request, eventLike);
  if (!response?.ok) return response;
  let source = aldusV218ReplaceKnownVersions(await response.text());
  if (!source.includes(ALDUS_V218_MARKER)) {
    source = `${source.trim()}\n\n${ALDUS_V218_MARKER}\n${aldusV218VersionSyncSource()}\n`;
  }
  const headers = aldusV218Headers(response, "text/javascript; charset=utf-8");
  headers.set("x-aldus-version-sync", "footer-v218");
  return new Response(source, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

async function aldusV218ServeNavigation(request, eventLike) {
  const response = await aldusV218BaseResponse(request, eventLike);
  if (!response?.ok) return response;
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("text/html")) return response;

  let source = aldusV218ReplaceKnownVersions(await response.text());
  source = source
    .replace(/(<p\s+class=["']app-version["'][^>]*>)[\s\S]*?(<\/p>)/i, `$1Versão: ${ALDUS_V218_VERSION}$2`)
    .replace(/(app-v169\.css\?v=)[^"'\s<]+/g, `$1${ALDUS_V218_VERSION}`)
    .replace(/(app-v169\.js\?v=)[^"'\s<]+/g, `$1${ALDUS_V218_VERSION}`);

  const headers = aldusV218Headers(response, "text/html; charset=utf-8");
  headers.set("x-aldus-html-version", ALDUS_V218_VERSION);
  return new Response(source, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

aldusV218NativeAddEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

aldusV218NativeAddEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

aldusV218NativeAddEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  const sameOrigin = url.origin === self.location.origin;
  const isApplication = sameOrigin && url.pathname.endsWith("/app-v169.js");
  const isNavigation = event.request.mode === "navigate" ||
    (sameOrigin && (url.pathname.endsWith("/") || url.pathname.endsWith("/index.html")));

  if (isApplication) {
    event.respondWith(
      aldusV218ServeApplication(event.request, event).catch((error) => {
        console.warn("[Aldus V218] Falha ao sincronizar a aplicação; mantendo V216.", error);
        return aldusV218BaseResponse(event.request, event);
      })
    );
    return;
  }

  if (isNavigation) {
    event.respondWith(
      aldusV218ServeNavigation(event.request, event).catch((error) => {
        console.warn("[Aldus V218] Falha ao atualizar o HTML; mantendo V216.", error);
        return aldusV218BaseResponse(event.request, event);
      })
    );
    return;
  }

  if (typeof aldusV216FetchListener === "function") {
    aldusV216FetchListener.call(self, event);
  }
});
