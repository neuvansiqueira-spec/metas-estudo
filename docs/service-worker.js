const PREVIOUS_DEPLOYMENT_VERSIONS = [
  "20260717-numero-qc-v26",
  "20260717-sincronizacao-conteudo-v30",
  "20260717-mensagens-cronometro-livre-pwa-v31",
  "20260717-sincronizacao-automatica-dispositivos-v32",
  "20260717-salvamento-integral-tempo-v33",
  "20260717-espectro-continuo-acertos-v34",
  "20260717-login-google-somente-manual-v36",
  "20260717-espectro-compacto-site-app-v37",
  "20260717-aviso-sonoro-motivacional-v38",
  "20260717-sincronizacao-completa-dispositivos-v39",
  "20260717-material-cronometro-v40",
  "20260717-logo-aldus-meta-v41",
  "20260717-cabecalho-estavel-v42",
  "20260717-grafico-periodo-recolhivel-v43",
  "20260717-tema-premium-aldus-v44",
  "20260717-restauracao-estavel-v45",
  "20260717-premium-estavel-v46",
  "20260718-protecao-recuperacao-tempo-v48",
  "20260718-diagnostico-recuperacao-tempo-v49",
  "20260718-integridade-recuperacao-visual-v50",
  "20260718-recuperacao-drive-redesign-v51",
  "20260718-correcao-visual-responsiva-v52",
  "20260718-contraste-interno-v53",
  "20260718-numeracao-qc-filtros-v54"
];
const CURRENT_VERSION = "20260718-indicacao-qc-explicita-v55";
const CACHE_NAME = `metas-estudo-${CURRENT_VERSION}`;
const ASSET_CACHE_NAME = `${CACHE_NAME}-startup-v23`;
const FILES_TO_CACHE = [
  "./",
  "index.html",
  "style.css",
  "aldus-premium-theme.css",
  "aldus-premium-refinement-v47.css",
  "aldus-interface-v51.css",
  "aldus-responsive-v52.css",
  "aldus-contrast-v53.css",
  "script.js",
  "question-history-pie.js",
  "header-brand-fix.js",
  "question-accuracy-spectrum.js",
  "timer-material-link-fix.js",
  "sync-integral-core.js",
  "sync-integral-deletions.js",
  "sync-integral-state.js",
  "sync-integral-cloud.js",
  "sync-integral-time-protection.js",
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

function cacheResponse(request, response) {
  if (!response?.ok) return;
  caches.open(ASSET_CACHE_NAME).then((cache) => cache.put(request, response));
}

function replaceVersion(source) {
  return PREVIOUS_DEPLOYMENT_VERSIONS.reduce(
    (text, previousVersion) => text.split(previousVersion).join(CURRENT_VERSION),
    String(source || "")
  );
}

function patchHtmlSource(source) {
  let patched = replaceVersion(source);
  [
    "question-accuracy-spectrum.js",
    "timer-material-link-fix.js",
    "question-history-pie.js",
    "header-brand-fix.js",
    "aldus-meta-branding.js"
  ].forEach((filename) => {
    const escaped = filename.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    patched = patched.replace(new RegExp(`\\s*<script[^>]*${escaped}[^>]*><\\/script>`, "gi"), "");
  });
  if (!patched.includes("aldus-interface-v51.css")) {
    patched = patched.replace("</head>", `<link id="aldusInterfaceV51" rel="stylesheet" href="aldus-interface-v51.css?v=${CURRENT_VERSION}" />\n</head>`);
  }
  if (!patched.includes("aldus-responsive-v52.css")) {
    patched = patched.replace("</head>", `<link id="aldusResponsiveV52" rel="stylesheet" href="aldus-responsive-v52.css?v=${CURRENT_VERSION}" />\n</head>`);
  }
  if (!patched.includes("aldus-contrast-v53.css")) {
    patched = patched.replace("</head>", `<link id="aldusContrastV53" rel="stylesheet" href="aldus-contrast-v53.css?v=${CURRENT_VERSION}" />\n</head>`);
  }
  return patched.replace(
    "</body>",
    `<script src="question-accuracy-spectrum.js?v=${CURRENT_VERSION}"></script>
<script src="timer-material-link-fix.js?v=${CURRENT_VERSION}" data-timer-material-link-fix="v40"></script>
<script src="question-history-pie.js?v=${CURRENT_VERSION}"></script>
<script src="header-brand-fix.js?v=${CURRENT_VERSION}"></script>
</body>`
  );
}

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
  patched = patched
    .replace(
      /async function uploadSyncPayload\([\s\S]*?\nasync function runAutoSyncAfterSave/,
      'async function uploadSyncPayload(payload = makeSyncPayload(), options = {}) { return uploadSyncPayloadIntegral(payload, options); }\nasync function runAutoSyncAfterSave'
    )
    .replace(
      /async function applyCloudPayload\(payload\) \{[\s\S]*?\nasync function syncNow\(\)/,
      'async function applyCloudPayload(payload) { return applyCloudPayloadIntegral(payload); }\nasync function syncNow()'
    )
    .replace(
      /async function syncNow\(\) \{[\s\S]*?\nfunction hasPendingLocalChanges/,
      'async function syncNow() { return syncNowIntegral(); }\nfunction hasPendingLocalChanges'
    )
    .replace(
      /async function checkCloudForNewerVersion\(context = "open"\) \{[\s\S]*?\nasync function checkCloudForUpdatesAfterAuth/,
      'async function checkCloudForNewerVersion(context = "open") { return checkCloudForNewerVersionIntegral(context); }\nasync function checkCloudForUpdatesAfterAuth'
    )
    .split("Baixar versão da nuvem").join("Mesclar dados deste dispositivo com a nuvem")
    .replace("Baixar dados da nuvem e substituir os dados deste dispositivo? Um backup local automático será criado antes.", "Mesclar os dados da nuvem com os dados deste dispositivo? Um backup local automático será criado antes.")
    .replace("Dados atualizados pela nuvem.", "Dados locais e da nuvem mesclados com segurança.");

  return patched;
}

async function patchTextResponse(response, transform, contentType) {
  if (!response?.ok) return response;
  const source = await response.text();
  const headers = new Headers(response.headers);
  ["content-length", "content-encoding", "etag"].forEach((name) => headers.delete(name));
  headers.set("content-type", contentType);
  return new Response(transform(source), {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

async function loadSyncIntegralSource() {
  const files = ["sync-integral-core.js", "sync-integral-deletions.js", "sync-integral-state.js", "sync-integral-cloud.js", "sync-integral-time-protection.js"];
  const parts = [];
  for (const file of files) {
    try {
      const response = await fetch(file, { cache: "no-store" });
      if (response.ok) {
        parts.push(await response.text());
        continue;
      }
    } catch (error) {}
    const cached = await caches.match(file);
    if (cached) parts.push(await cached.text());
  }
  return parts.join("\n");
}

async function networkFirstNavigation(request) {
  try {
    const response = await patchTextResponse(await fetch(request, { cache: "no-store" }), patchHtmlSource, "text/html; charset=utf-8");
    cacheResponse(request, response.clone());
    return response;
  } catch (error) {
    const cached = await caches.match(request) || await caches.match("index.html");
    return cached ? patchTextResponse(cached, patchHtmlSource, "text/html; charset=utf-8") : cached;
  }
}

async function networkFirstAppScript(request) {
  const transform = async (response) => {
    if (!response?.ok) return response;
    const source = await response.text();
    const syncSource = await loadSyncIntegralSource();
    const headers = new Headers(response.headers);
    ["content-length", "content-encoding", "etag"].forEach((name) => headers.delete(name));
    headers.set("content-type", "application/javascript; charset=utf-8");
    return new Response(patchAppScriptSource(source, syncSource), {
      status: response.status,
      statusText: response.statusText,
      headers
    });
  };
  try {
    const response = await transform(await fetch(request, { cache: "no-store" }));
    cacheResponse(request, response.clone());
    return response;
  } catch (error) {
    const cached = await caches.match(request);
    return cached ? transform(cached) : cached;
  }
}

async function networkFirstStableAsset(request) {
  try {
    const response = await fetch(request, { cache: "no-store" });
    cacheResponse(request, response.clone());
    return response;
  } catch (error) {
    return caches.match(request);
  }
}

function staleWhileRevalidate(request) {
  return caches.match(request).then((cached) => {
    const network = fetch(request)
      .then((response) => {
        cacheResponse(request, response.clone());
        return response;
      })
      .catch(() => cached);
    return cached || network;
  });
}

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);

  if (url.pathname.endsWith("/script.js")) {
    event.respondWith(networkFirstAppScript(event.request));
    return;
  }
  if (url.pathname.endsWith("/header-brand-fix.js") || url.pathname.endsWith("/aldus-premium-theme.css") || url.pathname.endsWith("/aldus-premium-refinement-v47.css") || url.pathname.endsWith("/aldus-interface-v51.css") || url.pathname.endsWith("/aldus-responsive-v52.css") || url.pathname.endsWith("/aldus-contrast-v53.css")) {
    event.respondWith(networkFirstStableAsset(event.request));
    return;
  }
  if (event.request.mode === "navigate" || event.request.destination === "document") {
    event.respondWith(networkFirstNavigation(event.request));
    return;
  }
  if (["script", "style", "worker", "image", "manifest"].includes(event.request.destination)) {
    event.respondWith(staleWhileRevalidate(event.request));
  }
});
