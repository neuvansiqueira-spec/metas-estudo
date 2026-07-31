"use strict";

const ALDUS_V201_VERSION = "20260731-ajuste-visual-disciplinas-plantao-v169";
const ALDUS_V199_VERSION = "20260730-contraste-resultado-liquido-v169";
const ALDUS_V200_MODULE = "./planning-shift-disciplines-v200.js";
const ALDUS_V201_VISUAL_MODULE = "./planning-shift-disciplines-visual-v201.js";
const ALDUS_V200_MARKER = "/* Aldus runtime source: planning-shift-disciplines-v200.js */";
const ALDUS_V201_VISUAL_MARKER = "/* Aldus runtime source: planning-shift-disciplines-visual-v201.js */";

let aldusBaseFetchListener = null;
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

async function aldusV201ApplicationResponse(baseResponse) {
  if (!baseResponse?.ok) return baseResponse;
  try {
    const [moduleResponse, visualResponse] = await Promise.all([
      fetch(new URL(ALDUS_V200_MODULE, self.registration.scope), { cache: "no-store" }),
      fetch(new URL(ALDUS_V201_VISUAL_MODULE, self.registration.scope), { cache: "no-store" })
    ]);
    if (!moduleResponse?.ok || !visualResponse?.ok) return baseResponse;
    const [source, moduleSource, visualSource] = await Promise.all([
      baseResponse.text(),
      moduleResponse.text(),
      visualResponse.text()
    ]);
    let patchedSource = source.replaceAll(ALDUS_V199_VERSION, ALDUS_V201_VERSION);
    if (!patchedSource.includes(ALDUS_V200_MARKER)) {
      patchedSource = `${patchedSource.trim()}\n\n${ALDUS_V200_MARKER}\n${moduleSource.trim()}\n`;
    }
    if (!patchedSource.includes(ALDUS_V201_VISUAL_MARKER)) {
      patchedSource = `${patchedSource.trim()}\n\n${ALDUS_V201_VISUAL_MARKER}\n${visualSource.trim()}\n`;
    }
    const headers = new Headers(baseResponse.headers);
    for (const name of ["content-length", "content-encoding", "etag", "last-modified"]) headers.delete(name);
    headers.set("content-type", "text/javascript; charset=utf-8");
    headers.set("x-aldus-runtime-patch", ALDUS_V201_VERSION);
    return new Response(patchedSource, {
      status: baseResponse.status,
      statusText: baseResponse.statusText,
      headers
    });
  } catch (error) {
    console.warn("[Aldus V201] Não foi possível aplicar o ajuste visual do campo de plantão; a V199 será mantida.", error);
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
  event.respondWith(isApplication ? baseResponsePromise.then(aldusV201ApplicationResponse) : baseResponsePromise);
});