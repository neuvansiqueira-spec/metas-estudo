const PREVIOUS_VERSION = "20260717-numero-qc-v26";
const PREVIOUS_DEPLOYMENT_VERSIONS = [
  PREVIOUS_VERSION,
  "20260717-sincronizacao-conteudo-v30",
  "20260717-mensagens-cronometro-livre-pwa-v31"
];
const CURRENT_VERSION = "20260717-sincronizacao-automatica-dispositivos-v32";
const CACHE_NAME = `metas-estudo-${CURRENT_VERSION}`;
const ASSET_CACHE_NAME = `${CACHE_NAME}-startup-v8`;
const FILES_TO_CACHE = [
  "./",
  "index.html",
  "style.css",
  "script.js",
  "sync-integral-core.js",
  "sync-integral-state.js",
  "sync-integral-cloud.js",
  "analytics-engine.js",
  "study-advisor.js",
  "advisor-navigation-engine.js",
  "storage-indexeddb.js",
  "manifest.json",
  "icons/logo-mark.svg",
  "icons/icon.svg",
  "icons/icon-maskable.svg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(ASSET_CACHE_NAME).then((cache) => cache.addAll(FILES_TO_CACHE)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((cacheNames) => Promise.all(
    cacheNames.filter((cacheName) => cacheName !== ASSET_CACHE_NAME).map((cacheName) => caches.delete(cacheName))
  )));
  self.clients.claim();
});

function shouldPreferNetwork(request) {
  const destination = request.destination;
  return request.mode === "navigate" || ["document", "script", "style", "worker"].includes(destination);
}

function cacheResponse(request, response) {
  if (!response || !response.ok) return;
  caches.open(ASSET_CACHE_NAME).then((cache) => cache.put(request, response));
}

function replaceVersion(source) {
  return PREVIOUS_DEPLOYMENT_VERSIONS.reduce(
    (text, version) => text.split(version).join(CURRENT_VERSION),
    String(source || "")
  );
}

function patchHtmlSource(source) {
  return replaceVersion(source);
}

const TIMER_MOTIVATION_PWA_FALLBACK = [
  ';(() => {',
  '  if (globalThis.__timerMotivationPwaFallbackV31) return;',
  '  globalThis.__timerMotivationPwaFallbackV31 = true;',
  '',
  '  const milestones = [10, 25, 40, 50, 65, 75, 90, 100];',
  '  let activeSessionKey = "";',
  '  let shownMilestones = [];',
  '  let hideTimeout = null;',
  '',
  '  function showPwaMotivationalToast(milestone) {',
  '    const toast = document.getElementById("timerMotivationalToast");',
  '    if (!toast) return;',
  '',
  '    let phrase = "Você está avançando. Continue firme.";',
  '    try {',
  '      if (typeof chooseTimerMotivationalMessage === "function") {',
  '        phrase = chooseTimerMotivationalMessage(milestone) || phrase;',
  '      }',
  '    } catch (error) {',
  '      console.warn("[Cronômetro] Falha ao escolher mensagem motivacional.", error);',
  '    }',
  '',
  '    clearTimeout(hideTimeout);',
  '    toast.innerHTML = `<strong>${milestone}% CONCLUÍDO</strong><span>${phrase}</span>`;',
  '    toast.hidden = false;',
  '    toast.classList.add("visible");',
  '    Object.assign(toast.style, {',
  '      display: "grid",',
  '      position: "fixed",',
  '      top: "18px",',
  '      left: "50%",',
  '      transform: "translateX(-50%)",',
  '      zIndex: "100000",',
  '      opacity: "1",',
  '      visibility: "visible",',
  '      pointerEvents: "none",',
  '      maxWidth: "min(92vw, 620px)"',
  '    });',
  '',
  '    hideTimeout = setTimeout(() => {',
  '      toast.classList.remove("visible");',
  '      toast.style.opacity = "0";',
  '      hideTimeout = setTimeout(() => {',
  '        toast.hidden = true;',
  '        toast.style.display = "none";',
  '      }, 260);',
  '    }, 30000);',
  '  }',
  '',
  '  setInterval(() => {',
  '    try {',
  '      if (typeof floatingTimer === "undefined" || floatingTimer.mode !== "free" || !floatingTimer.goalId) return;',
  '      if (typeof state !== "undefined" && state.settings?.timerPreferences?.motivationalMessages === false) return;',
  '',
  '      const goal = typeof floatingTimerGoal === "function" ? floatingTimerGoal() : null;',
  '      const plannedMinutes = Number(floatingTimer.sessionGoalMinutes) || Number(goal?.minutes) || 0;',
  '      const plannedSeconds = Math.max(0, Math.round(plannedMinutes * 60));',
  '      if (!plannedSeconds) return;',
  '',
  '      const sessionKey = `${floatingTimer.sessionId || ""}|${floatingTimer.goalId}|${floatingTimer.openedAt || ""}`;',
  '      if (sessionKey !== activeSessionKey) {',
  '        activeSessionKey = sessionKey;',
  '        shownMilestones = [];',
  '      }',
  '',
  '      const elapsedSeconds = typeof currentTimerSeconds === "function"',
  '        ? currentTimerSeconds()',
  '        : Math.max(0, Number(floatingTimer.elapsedSeconds) || 0);',
  '      const progress = Math.min(100, (elapsedSeconds / plannedSeconds) * 100);',
  '      const reached = milestones.filter((milestone) => progress >= milestone);',
  '      const pending = reached.filter((milestone) => !shownMilestones.includes(milestone));',
  '      const milestone = pending[pending.length - 1];',
  '      if (!milestone) return;',
  '',
  '      shownMilestones = [...new Set([...shownMilestones, ...reached])];',
  '      showPwaMotivationalToast(milestone);',
  '    } catch (error) {',
  '      console.warn("[Cronômetro] Verificador motivacional do PWA falhou.", error);',
  '    }',
  '  }, 1000);',
  '})();',
].join("\n");
function patchAppScriptSource(source, syncIntegralSource = "") {
  const oldGuard = 'if (!goal || !supportedMode || !planned || state.settings?.timerPreferences?.motivationalMessages === false) return;';
  const newGuard = 'if ((floatingTimer.mode !== "free" && !goal) || !supportedMode || !planned || state.settings?.timerPreferences?.motivationalMessages === false) return;';
  const oldFreeGoal = 'const sessionGoalMinutes = selectedMode === "free" ? 0 : 0;';
  const newFreeGoal = 'const sessionGoalMinutes = selectedMode === "free" ? Math.max(0, Number(goal.minutes) || 0) : 0;';
  const oldPlannedSeconds = 'function timerPlannedSeconds(goal = floatingTimerGoal()) { return floatingTimer.mode === "free" ? Math.max(0, Math.round((Number(floatingTimer.sessionGoalMinutes) || 0) * 60)) : Math.max(0, Math.round((Number(goal?.minutes) || 0) * 60)); }';
  const newPlannedSeconds = 'function timerPlannedSeconds(goal = floatingTimerGoal()) { return floatingTimer.mode === "free" ? Math.max(0, Math.round((Number(floatingTimer.sessionGoalMinutes) || Number(goal?.minutes) || 0) * 60)) : Math.max(0, Math.round((Number(goal?.minutes) || 0) * 60)); }';
  let patched = replaceVersion(source)
    .replace(oldGuard, newGuard)
    .replace(oldFreeGoal, newFreeGoal)
    .replace(oldPlannedSeconds, newPlannedSeconds)
    .replace("const TIMER_MOTIVATIONAL_TOAST_DURATION_MS = 5000;", "const TIMER_MOTIVATIONAL_TOAST_DURATION_MS = 30000;");

  if (syncIntegralSource && !patched.includes("function mergeSyncStates(")) {
    patched = patched.replace("\nasync function uploadSyncPayload", `\n${syncIntegralSource}\nasync function uploadSyncPayload`);
  }
  patched = patched.replace(
    /async function uploadSyncPayload\([\s\S]*?\nasync function runAutoSyncAfterSave/,
    'async function uploadSyncPayload(payload = makeSyncPayload(), options = {}) { return uploadSyncPayloadIntegral(payload, options); }\nasync function runAutoSyncAfterSave'
  );
  patched = patched.replace(
    /async function applyCloudPayload\(payload\) \{[\s\S]*?\nasync function syncNow\(\)/,
    'async function applyCloudPayload(payload) { return applyCloudPayloadIntegral(payload); }\nasync function syncNow()'
  );
  patched = patched.replace(
    /async function syncNow\(\) \{[\s\S]*?\nfunction hasPendingLocalChanges/,
    'async function syncNow() { return syncNowIntegral(); }\nfunction hasPendingLocalChanges'
  );
  patched = patched.replace(
    /async function checkCloudForNewerVersion\(context = "open"\) \{[\s\S]*?\nasync function checkCloudForUpdatesAfterAuth/,
    'async function checkCloudForNewerVersion(context = "open") { return checkCloudForNewerVersionIntegral(context); }\nasync function checkCloudForUpdatesAfterAuth'
  );
  patched = patched
    .split("Baixar versão da nuvem").join("Mesclar dados deste dispositivo com a nuvem")
    .replace("Baixar dados da nuvem e substituir os dados deste dispositivo? Um backup local automático será criado antes.", "Mesclar os dados da nuvem com os dados deste dispositivo? Um backup local automático será criado antes.")
    .replace("Dados atualizados pela nuvem.", "Dados locais e da nuvem mesclados com segurança.");

  if (!patched.includes("__timerMotivationPwaFallbackV31")) {
    patched += `\n${TIMER_MOTIVATION_PWA_FALLBACK}\n`;
  }
  return patched;
}

async function patchTextResponse(response, transform, contentType) {
  if (!response || !response.ok) return response;
  const source = await response.text();
  const headers = new Headers(response.headers);
  headers.delete("content-length");
  headers.delete("content-encoding");
  headers.delete("etag");
  headers.set("content-type", contentType);
  return new Response(transform(source), { status: response.status, statusText: response.statusText, headers });
}

function patchHtmlResponse(response) {
  return patchTextResponse(response, patchHtmlSource, "text/html; charset=utf-8");
}

async function loadSyncIntegralSource() {
  const files = ["sync-integral-core.js", "sync-integral-state.js", "sync-integral-cloud.js"];
  const parts = [];
  for (const file of files) {
    try {
      const response = await fetch(file, { cache: "no-store" });
      if (response.ok) { parts.push(await response.text()); continue; }
    } catch (error) {}
    const cached = await caches.match(file);
    if (cached) parts.push(await cached.text());
  }
  return parts.join("\n");
}

async function patchAppScriptResponse(response) {
  if (!response || !response.ok) return response;
  const source = await response.text();
  const syncIntegralSource = await loadSyncIntegralSource();
  const headers = new Headers(response.headers);
  headers.delete("content-length");
  headers.delete("content-encoding");
  headers.delete("etag");
  headers.set("content-type", "application/javascript; charset=utf-8");
  return new Response(patchAppScriptSource(source, syncIntegralSource), { status: response.status, statusText: response.statusText, headers });
}

function isMainAppScript(request) {
  try { return new URL(request.url).pathname.endsWith("/script.js"); }
  catch (error) { return false; }
}

async function networkFirstNavigation(request) {
  try {
    const networkResponse = await fetch(request);
    const patchedResponse = await patchHtmlResponse(networkResponse);
    cacheResponse(request, patchedResponse.clone());
    return patchedResponse;
  } catch (error) {
    const cachedResponse = await caches.match(request) || await caches.match("index.html");
    return cachedResponse ? patchHtmlResponse(cachedResponse) : cachedResponse;
  }
}

async function patchedAppScript(request) {
  try {
    const networkResponse = await fetch(request);
    const patchedResponse = await patchAppScriptResponse(networkResponse);
    cacheResponse(request, patchedResponse.clone());
    return patchedResponse;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    return cachedResponse ? patchAppScriptResponse(cachedResponse) : cachedResponse;
  }
}

function staleWhileRevalidate(request) {
  return caches.match(request).then((cachedResponse) => {
    const networkResponse = fetch(request).then((response) => {
      cacheResponse(request, response.clone());
      return response;
    }).catch(() => cachedResponse);
    return cachedResponse || networkResponse;
  });
}

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  if (isMainAppScript(event.request)) {
    event.respondWith(patchedAppScript(event.request));
    return;
  }
  if (shouldPreferNetwork(event.request) && (event.request.mode === "navigate" || event.request.destination === "document")) {
    event.respondWith(networkFirstNavigation(event.request));
    return;
  }
  if (["script", "style", "worker", "image", "manifest"].includes(event.request.destination)) {
    event.respondWith(staleWhileRevalidate(event.request));
  }
});
