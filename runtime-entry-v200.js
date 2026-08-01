"use strict";

const ALDUS_V208_VERSION = "20260731-borda-ativa-cronometro-v169";
const ALDUS_V207_VERSION = "20260731-suaviza-titulo-navegacao-v169";
const ALDUS_V206_VERSION = "20260731-remove-agulha-menu-lateral-v169";
const ALDUS_V205_VERSION = "20260731-corrige-menu-lateral-hover-v169";
const ALDUS_V204_VERSION = "20260731-menu-lateral-hover-v169";
const ALDUS_V199_VERSION = "20260730-contraste-resultado-liquido-v169";
const ALDUS_V200_MODULE = "./planning-shift-disciplines-v200.js";
const ALDUS_V203_VISUAL_MODULE = "./planning-shift-disciplines-visual-v201.js";
const ALDUS_V207_NAV_MODULE = "./side-nav-hover-collapse-v207.js";
const ALDUS_V208_TIMER_BORDER_MODULE = "./floating-timer-active-border-v208.js";
const ALDUS_V200_MARKER = "/* Aldus runtime source: planning-shift-disciplines-v200.js */";
const ALDUS_V203_VISUAL_MARKER = "/* Aldus runtime source: planning-shift-disciplines-visual-v203.js */";
const ALDUS_V207_NAV_MARKER = "/* Aldus runtime source: side-nav-hover-collapse-v207.js */";
const ALDUS_V208_TIMER_BORDER_MARKER = "/* Aldus runtime source: floating-timer-active-border-v208.js */";

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

async function aldusV208ApplicationResponse(baseResponse) {
  if (!baseResponse?.ok) return baseResponse;
  try {
    const [moduleResponse, visualResponse, navResponse, timerBorderResponse] = await Promise.all([
      fetch(new URL(ALDUS_V200_MODULE, self.registration.scope), { cache: "no-store" }),
      fetch(new URL(ALDUS_V203_VISUAL_MODULE, self.registration.scope), { cache: "no-store" }),
      fetch(new URL(ALDUS_V207_NAV_MODULE, self.registration.scope), { cache: "no-store" }),
      fetch(new URL(ALDUS_V208_TIMER_BORDER_MODULE, self.registration.scope), { cache: "no-store" })
    ]);
    if (!moduleResponse?.ok || !visualResponse?.ok || !navResponse?.ok || !timerBorderResponse?.ok) return baseResponse;
    const [source, moduleSource, visualSource, navSource, timerBorderSource] = await Promise.all([
      baseResponse.text(),
      moduleResponse.text(),
      visualResponse.text(),
      navResponse.text(),
      timerBorderResponse.text()
    ]);
    let patchedSource = source
      .replaceAll(ALDUS_V199_VERSION, ALDUS_V208_VERSION)
      .replaceAll(ALDUS_V204_VERSION, ALDUS_V208_VERSION)
      .replaceAll(ALDUS_V205_VERSION, ALDUS_V208_VERSION)
      .replaceAll(ALDUS_V206_VERSION, ALDUS_V208_VERSION)
      .replaceAll(ALDUS_V207_VERSION, ALDUS_V208_VERSION);
    if (!patchedSource.includes(ALDUS_V200_MARKER)) {
      patchedSource = `${patchedSource.trim()}\n\n${ALDUS_V200_MARKER}\n${moduleSource.trim()}\n`;
    }
    if (!patchedSource.includes(ALDUS_V203_VISUAL_MARKER)) {
      patchedSource = `${patchedSource.trim()}\n\n${ALDUS_V203_VISUAL_MARKER}\n${visualSource.trim()}\n`;
    }
    if (!patchedSource.includes(ALDUS_V207_NAV_MARKER)) {
      patchedSource = `${patchedSource.trim()}\n\n${ALDUS_V207_NAV_MARKER}\n${navSource.trim()}\n`;
    }
    if (!patchedSource.includes(ALDUS_V208_TIMER_BORDER_MARKER)) {
      patchedSource = `${patchedSource.trim()}\n\n${ALDUS_V208_TIMER_BORDER_MARKER}\n${timerBorderSource.trim()}\n`;
    }
    const headers = new Headers(baseResponse.headers);
    for (const name of ["content-length", "content-encoding", "etag", "last-modified"]) headers.delete(name);
    headers.set("content-type", "text/javascript; charset=utf-8");
    headers.set("x-aldus-runtime-patch", ALDUS_V208_VERSION);
    return new Response(patchedSource, {
      status: baseResponse.status,
      statusText: baseResponse.statusText,
      headers
    });
  } catch (error) {
    console.warn("[Aldus V208] Não foi possível aplicar a borda ativa do cronômetro; a V199 será mantida.", error);
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
  event.respondWith(isApplication ? baseResponsePromise.then(aldusV208ApplicationResponse) : baseResponsePromise);
});