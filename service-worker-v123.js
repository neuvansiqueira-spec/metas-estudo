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
  "20260718-numeracao-qc-filtros-v54",
  "20260718-indicacao-qc-explicita-v55",
  "20260718-numeracao-qc-catalogo-v56",
  "20260718-cruzamento-qc-completo-v57",
  "20260718-revisao-visual-global-v58",
  "20260718-planejamento-contraste-v59",
  "20260718-historico-planejamento-v60",
  "20260718-calendario-contraste-v61",
  "20260718-calendario-disciplinas-v62",
  "20260718-logo-exportacoes-v63",
  "20260718-logo-exportacoes-visivel-v64",
  "20260718-grafico-respostas-3d-v65",
  "20260719-tempo-visibilidade-v66",
  "20260719-tempo-acumulado-backup-v67",
  "20260719-contraste-integral-v68",
  "20260719-contraste-componentes-v69",
  "20260719-conselheiro-layout-v70",
  "20260719-backup-contraste-v71",
  "20260719-inicializacao-rapida-v72",
  "20260719-rolagem-navegacao-v73",
  "20260719-integracao-metas-v74",
  "20260719-correcao-metas-v75",
  "20260720-concluidas-visibilidade-v76",
  "20260720-distribuicao-reposicao-v77",
  "20260720-calendario-semanal-v78",
  "20260720-calendario-mensal-v79",
  "20260720-integracao-fabrica-materiais-v80",
  "20260720-fabrica-pendencias-reais-v81",
  "20260720-fabrica-recolhivel-v82",
  "20260720-grafico-tempo-contraste-v83",
  "20260720-fabrica-materiais-rolagem-v84",
  "20260720-fabrica-materiais-reparo-v85",
  "20260720-cronometro-mobile-v86",
  "20260720-mensagem-motivacional-v87",
  "20260720-espaco-mensagem-cronometro-v88",
  "20260720-identidade-aldus-v89",
  "20260720-identidade-metas-concursos-v90",
  "20260720-navegacao-lateral-recolhivel-v91",
  "20260720-navegacao-recolhida-logo-v92",
  "20260720-navegacao-recolhida-nova-marca-v93",
  "20260720-logos-link-inicio-v94",
  "20260720-logo-recolhida-visibilidade-v95",
  "20260720-cronometro-bip-layout-v96",
  "20260720-cronometro-scroll-motivacao-v97",
  "20260720-qconcursos-filtros-automaticos-v98",
  "20260720-edital-progresso-contraste-v99",
  "20260720-caderno-questao-v100",
  "20260721-fabrica-fontes-v101",
  "20260721-fabrica-plano-semana-v102",
  "20260721-fabrica-fonte-fila-v103",
  "20260721-fabrica-visual-resumo-v104",
  "20260721-mobile-salvar-cores-tempo-v105",
  "20260721-dashboard-central-metas-v106",
  "20260721-browser-cache-atualizacao-v107",
  "20260721-plano-dia-sincronizacao-v108",
  "20260721-fabrica-visual-v110",
  "20260721-inicializacao-ultrarrapida-v110",
  "20260721-atualizador-cache-versionado-v111",
  "20260721-cache-legado-eliminado-v112",
  "20260721-versao-cache-definitiva-v113",
  "20260721-continuacao-automatica-v114",
  "20260721-protecao-metas-dia-v115",
  "20260721-recomposicao-metas-dia-v116",
  "20260721-metodologia-metas-v117",
  "20260721-estabilidade-v118",
  "20260721-prompt-lei-didatico-v119",
  "20260721-prompt-lei-modelo-v120",
  "20260721-prompt-lei-modelo-v121",
  "20260721-fabrica-visibilidade-v122"
];
const CURRENT_VERSION = "20260723-resumo-aula-topicos-v134";
const CACHE_NAME = `metas-estudo-${CURRENT_VERSION}`;
// Caches anteriores reconhecidos para limpeza: startup-v25 a startup-v28.
const ASSET_CACHE_NAME = `${CACHE_NAME}-startup-v29`;
const FILES_TO_CACHE = [
  `./?v=${CURRENT_VERSION}`,
  `index.html?v=${CURRENT_VERSION}`,
  `app-v118.css?v=${CURRENT_VERSION}`,
  `factory-visibility-v122.css?v=${CURRENT_VERSION}`,
  `app-v118.js?v=${CURRENT_VERSION}`,
  `factory-lei-prompt-v123.js?v=${CURRENT_VERSION}`,
  "manifest.json",
  "icons/aldus-visual.png",
  "icons/aldus-brand-mark-v93.png",
  "icons/logo-mark.svg",
  "icons/icon.svg",
  "icons/icon-maskable.svg"
];

// Fontes mantidas separadamente no repositório para testes, manutenção e
// compatibilidade com páginas antigas. A versão atual as entrega nos bundles.
const LEGACY_SOURCE_FILES = [
  "style.css", "aldus-premium-theme.css", "aldus-premium-refinement-v47.css",
  "aldus-interface-v51.css", "aldus-responsive-v52.css", "aldus-contrast-v53.css",
  "aldus-visual-v58.css", "aldus-planning-v59.css", "aldus-planning-history-v60.css",
  "aldus-calendar-v61.css", "aldus-calendar-v62.css", "aldus-export-brand-v63.css",
  "aldus-export-brand-v64.css", "aldus-daily-goals-v66.css", "aldus-daily-time-v67.css",
  "aldus-contrast-system-v68.css", "aldus-component-contrast-v69.css",
  "aldus-advisor-layout-v70.css", "aldus-backup-contrast-v71.css",
  "aldus-navigation-scroll-v73.css", "aldus-goal-integrity-v75.css",
  "aldus-completed-visibility-v76.css", "script.js", "qconcursos-crosswalk.js",
  "question-history-pie.js", "header-brand-fix.js", "side-nav-collapse-v91.js",
  "question-accuracy-spectrum.js", "timer-material-link-fix.js", "sync-integral-core.js",
  "sync-integral-deletions.js", "sync-integral-state.js", "sync-integral-cloud.js",
  "sync-integral-time-protection.js", "analytics-engine.js", "study-advisor.js",
  "advisor-navigation-engine.js", "storage-indexeddb.js"
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
  if (!response?.ok) return Promise.resolve(false);
  return caches.open(ASSET_CACHE_NAME)
    .then((cache) => cache.put(request, response))
    .then(() => true)
    .catch(() => false);
}

function requestTargetsCurrentVersion(request) {
  try {
    const requestedVersion = new URL(request.url).searchParams.get("v");
    return !requestedVersion || requestedVersion === CURRENT_VERSION;
  } catch (error) {
    return true;
  }
}

function replaceVersion(source) {
  return PREVIOUS_DEPLOYMENT_VERSIONS.reduce(
    (text, previousVersion) => text.split(previousVersion).join(CURRENT_VERSION),
    String(source || "")
  );
}

function patchHtmlSource(source) {
  let patched = replaceVersion(source);
  patched = patched
    .replace(/app\.bundle\.css(?:\?v=[^"'\s<>]+)?/gi, `app-v118.css?v=${CURRENT_VERSION}`)
    .replace(/app\.bundle\.js(?:\?v=[^"'\s<>]+)?/gi, `app-v118.js?v=${CURRENT_VERSION}`);
  patched = patched.replace(
    /<div class="brand aldus-visual-brand">\s*(<img class="aldus-visual-brand-image"[^>]*>)\s*<\/div>/i,
    '<a class="brand aldus-visual-brand brand-home-link" href="#dashboard" data-view-link="dashboard" aria-label="Ir para o início">$1</a>'
  );
  patched = patched.replace(
    /(<img class="side-nav-brand-mark" src=")icons\/logo-mark\.svg\?v=[^"]+/i,
    `$1icons/aldus-brand-mark-v93.png?v=${CURRENT_VERSION}`
  );
  if (!patched.includes('class="side-nav-brand-link"')) {
    patched = patched.replace(
      /(<img class="side-nav-brand-mark"[^>]*>)/i,
      '<a class="side-nav-brand-link" href="#dashboard" data-view-link="dashboard" aria-label="Ir para o início">$1</a>'
    );
  }
  if (patched.includes('id="aldusAppBundleScript"')) return patched;
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
  if (!patched.includes("aldus-visual-v58.css")) {
    patched = patched.replace("</head>", `<link id="aldusVisualV58" rel="stylesheet" href="aldus-visual-v58.css?v=${CURRENT_VERSION}" />\n</head>`);
  }
  if (!patched.includes("aldus-planning-v59.css")) {
    patched = patched.replace("</head>", `<link id="aldusPlanningV59" rel="stylesheet" href="aldus-planning-v59.css?v=${CURRENT_VERSION}" />\n</head>`);
  }
  if (!patched.includes("aldus-planning-history-v60.css")) {
    patched = patched.replace("</head>", `<link id="aldusPlanningHistoryV60" rel="stylesheet" href="aldus-planning-history-v60.css?v=${CURRENT_VERSION}" />\n</head>`);
  }
  if (!patched.includes("aldus-calendar-v61.css")) {
    patched = patched.replace("</head>", `<link id="aldusCalendarV61" rel="stylesheet" href="aldus-calendar-v61.css?v=${CURRENT_VERSION}" />\n</head>`);
  }
  if (!patched.includes("aldus-calendar-v62.css")) {
    patched = patched.replace("</head>", `<link id="aldusCalendarV62" rel="stylesheet" href="aldus-calendar-v62.css?v=${CURRENT_VERSION}" />\n</head>`);
  }
  if (!patched.includes("aldus-export-brand-v63.css")) {
    patched = patched.replace("</head>", `<link id="aldusExportBrandV63" rel="stylesheet" href="aldus-export-brand-v63.css?v=${CURRENT_VERSION}" />\n</head>`);
  }
  if (!patched.includes("aldus-export-brand-v64.css")) {
    patched = patched.replace("</head>", `<link id="aldusExportBrandV64" rel="stylesheet" href="aldus-export-brand-v64.css?v=${CURRENT_VERSION}" />\n</head>`);
  }
  if (!patched.includes("aldus-daily-time-v67.css")) {
    patched = patched.replace("</head>", `<link id="aldusDailyTimeV67" rel="stylesheet" href="aldus-daily-time-v67.css?v=${CURRENT_VERSION}" />\n</head>`);
  }
  if (!patched.includes("aldus-contrast-system-v68.css")) {
    patched = patched.replace("</head>", `<link id="aldusContrastSystemV68" rel="stylesheet" href="aldus-contrast-system-v68.css?v=${CURRENT_VERSION}" />\n</head>`);
  }
  if (!patched.includes("aldus-component-contrast-v69.css")) {
    patched = patched.replace("</head>", `<link id="aldusComponentContrastV69" rel="stylesheet" href="aldus-component-contrast-v69.css?v=${CURRENT_VERSION}" />\n</head>`);
  }
  if (!patched.includes("aldus-advisor-layout-v70.css")) {
    patched = patched.replace("</head>", `<link id="aldusAdvisorLayoutV70" rel="stylesheet" href="aldus-advisor-layout-v70.css?v=${CURRENT_VERSION}" />\n</head>`);
  }
  if (!patched.includes("aldus-backup-contrast-v71.css")) {
    patched = patched.replace("</head>", `<link id="aldusBackupContrastV71" rel="stylesheet" href="aldus-backup-contrast-v71.css?v=${CURRENT_VERSION}" />\n</head>`);
  }
  if (!patched.includes("aldus-navigation-scroll-v73.css")) {
    patched = patched.replace("</head>", `<link id="aldusNavigationScrollV73" rel="stylesheet" href="aldus-navigation-scroll-v73.css?v=${CURRENT_VERSION}" />\n</head>`);
  }
  if (!patched.includes("aldus-goal-integrity-v75.css")) {
    patched = patched.replace("</head>", `<link id="aldusGoalIntegrityV75" rel="stylesheet" href="aldus-goal-integrity-v75.css?v=${CURRENT_VERSION}" />\n</head>`);
  }
  if (!patched.includes("aldus-completed-visibility-v76.css")) {
    patched = patched.replace("</head>", `<link id="aldusCompletedVisibilityV76" rel="stylesheet" href="aldus-completed-visibility-v76.css?v=${CURRENT_VERSION}" />\n</head>`);
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

async function loadSyncIntegralSource({ preferCache = true } = {}) {
  const files = ["sync-integral-core.js", "sync-integral-deletions.js", "sync-integral-state.js", "sync-integral-cloud.js", "sync-integral-time-protection.js"];
  const loadPart = async (file) => {
    const cached = await caches.match(file, { ignoreSearch: true });
    if (preferCache && cached) return cached.text();
    try {
      const response = await fetch(file, { cache: "no-store" });
      if (response.ok) {
        const source = await response.clone().text();
        await cacheResponse(new Request(new URL(file, self.registration.scope)), response);
        return source;
      }
    } catch (error) {}
    return cached ? cached.text() : "";
  };
  const parts = await Promise.all(files.map(loadPart));
  return parts.filter(Boolean).join("\n");
}

async function fetchFreshNavigation(request) {
  const response = await patchTextResponse(await fetch(request, { cache: "no-store" }), patchHtmlSource, "text/html; charset=utf-8");
  await cacheResponse(request, response.clone());
  return response;
}

async function networkFirstNavigation(request, networkPromise) {
  let networkResponse = null;
  try {
    networkResponse = await networkPromise;
    if (networkResponse?.ok) return networkResponse;
  } catch (error) {}
  const cached = await caches.match(request, { ignoreSearch: true }) || await caches.match("index.html", { ignoreSearch: true });
  if (cached) return patchTextResponse(cached, patchHtmlSource, "text/html; charset=utf-8");
  return networkResponse || new Response("Aplicativo indisponível temporariamente.", { status: 503, headers: { "content-type": "text/plain; charset=utf-8" } });
}

async function transformAppScriptResponse(response, { preferCache = true } = {}) {
  if (!response?.ok) return response;
  const source = await response.text();
  const syncSource = await loadSyncIntegralSource({ preferCache });
  const headers = new Headers(response.headers);
  ["content-length", "content-encoding", "etag"].forEach((name) => headers.delete(name));
  headers.set("content-type", "application/javascript; charset=utf-8");
  return new Response(patchAppScriptSource(source, syncSource), {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

async function cacheFirstAppScript(request) {
  const targetsCurrentVersion = requestTargetsCurrentVersion(request);
  if (targetsCurrentVersion) {
    const exact = await caches.match(request);
    if (exact) return exact;

    const cachedCurrent = await caches.match(request, { ignoreSearch: true });
    if (cachedCurrent) {
      const transformed = await transformAppScriptResponse(cachedCurrent, { preferCache: true });
      await cacheResponse(request, transformed.clone());
      return transformed;
    }
  }

  let networkResponse = null;
  try {
    networkResponse = await transformAppScriptResponse(
      await fetch(request, { cache: "no-store" }),
      { preferCache: false }
    );
    if (networkResponse?.ok) {
      await cacheResponse(request, networkResponse.clone());
      return networkResponse;
    }
  } catch (error) {}

  const offlineFallback = await caches.match(request, { ignoreSearch: true });
  if (offlineFallback) {
    const transformed = await transformAppScriptResponse(offlineFallback, { preferCache: true });
    await cacheResponse(request, transformed.clone());
    return transformed;
  }
  return networkResponse || new Response("Script indisponível temporariamente.", {
    status: 503,
    headers: { "content-type": "text/plain; charset=utf-8" }
  });
}

function staleWhileRevalidate(request, event) {
  const cachedPromise = caches.match(request).then((exact) => (
    exact || (requestTargetsCurrentVersion(request) ? caches.match(request, { ignoreSearch: true }) : null)
  ));
  const network = fetch(request, { cache: "no-store" })
      .then((response) => {
        if (!response?.ok) return response;
        return cacheResponse(request, response.clone()).then(() => response);
      })
      .catch(() => null);
  event?.waitUntil(network.then(() => undefined));
  return cachedPromise.then((cached) => {
    if (cached) return cached;
    return network.then((response) => response || new Response("Recurso indisponível.", { status: 503 }));
  });
}

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);

  if (url.pathname.endsWith("/script.js")) {
    event.respondWith(cacheFirstAppScript(event.request));
    return;
  }
  if (url.pathname.endsWith("/header-brand-fix.js") || url.pathname.endsWith("/aldus-premium-theme.css") || url.pathname.endsWith("/aldus-premium-refinement-v47.css") || url.pathname.endsWith("/aldus-interface-v51.css") || url.pathname.endsWith("/aldus-responsive-v52.css") || url.pathname.endsWith("/aldus-contrast-v53.css") || url.pathname.endsWith("/aldus-contrast-system-v68.css") || url.pathname.endsWith("/aldus-component-contrast-v69.css") || url.pathname.endsWith("/aldus-advisor-layout-v70.css") || url.pathname.endsWith("/aldus-backup-contrast-v71.css")) {
    event.respondWith(staleWhileRevalidate(event.request, event));
    return;
  }
  if (event.request.mode === "navigate" || event.request.destination === "document") {
    const freshNavigation = fetchFreshNavigation(event.request);
    event.waitUntil(freshNavigation.then(() => undefined).catch(() => undefined));
    event.respondWith(networkFirstNavigation(event.request, freshNavigation));
    return;
  }
  if (["script", "style", "worker", "image", "manifest"].includes(event.request.destination)) {
    event.respondWith(staleWhileRevalidate(event.request, event));
  }
});
