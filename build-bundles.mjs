import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const packageVersion = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8")).version;
const releaseSuffix = packageVersion.match(/v\d+$/)?.[0] || "current";

function appVersionSource(version) {
  return `(() => {
  "use strict";

  const VERSION = ${JSON.stringify(version)};
  const RELEASE_TEXT = \`Versão: \${VERSION}\`;

  function applyDocumentVersion() {
    if (typeof document === "undefined") return;
    document.documentElement.dataset.aldusReleaseVersion = VERSION;
    document.querySelectorAll(".app-version").forEach((element) => {
      if (element.textContent !== RELEASE_TEXT) element.textContent = RELEASE_TEXT;
    });
  }

  const release = Object.freeze({
    version: VERSION,
    text: RELEASE_TEXT,
    suffix: VERSION.match(/v\\d+$/)?.[0] || "current",
    apply: applyDocumentVersion
  });

  Object.defineProperty(globalThis, "__ALDUS_APP_RELEASE__", {
    value: release,
    configurable: false,
    enumerable: false,
    writable: false
  });

  if (typeof document === "undefined") return;
  applyDocumentVersion();

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", applyDocumentVersion, { once: true });
  }
})();
`;
}

function synchronizeIndexVersion() {
  const indexPath = path.join(root, "index.html");
  const source = fs.readFileSync(indexPath, "utf8");
  const synchronized = source
    .replace(/app-v\d+\.css\?v=[^"]+/g, `app-${releaseSuffix}.css?v=${packageVersion}`)
    .replace(/app-v\d+\.js\?v=[^"]+/g, `app-${releaseSuffix}.js?v=${packageVersion}`)
    .replace(/(<p class="app-version">Versão: )[^<]+(<\/p>)/, `$1${packageVersion}$2`);
  fs.writeFileSync(indexPath, synchronized);
}

function synchronizeServiceWorkerVersion() {
  const workerPath = path.join(root, "service-worker.js");
  const source = fs.readFileSync(workerPath, "utf8");
  const synchronized = source.replace(
    /const CURRENT_VERSION = "[^"]+";/,
    `const CURRENT_VERSION = ${JSON.stringify(packageVersion)};`
  );
  if (synchronized === source && !source.includes(`const CURRENT_VERSION = ${JSON.stringify(packageVersion)};`)) {
    throw new Error("Não foi possível sincronizar a versão do service worker.");
  }
  fs.writeFileSync(workerPath, synchronized);
}

fs.writeFileSync(path.join(root, "app-version.js"), appVersionSource(packageVersion));
synchronizeIndexVersion();
synchronizeServiceWorkerVersion();

const cssSources = [
  "style.css",
  "aldus-premium-theme.css",
  "aldus-premium-refinement-v47.css",
  "aldus-interface-v51.css",
  "aldus-responsive-v52.css",
  "aldus-contrast-v53.css",
  "aldus-visual-v58.css",
  "aldus-planning-v59.css",
  "aldus-planning-history-v60.css",
  "aldus-calendar-v61.css",
  "aldus-calendar-v62.css",
  "aldus-export-brand-v63.css",
  "aldus-export-brand-v64.css",
  "aldus-daily-goals-v66.css",
  "aldus-daily-time-v67.css",
  "aldus-contrast-system-v68.css",
  "aldus-component-contrast-v69.css",
  "aldus-advisor-layout-v70.css",
  "aldus-backup-contrast-v71.css",
  "aldus-navigation-scroll-v73.css",
  "aldus-goal-integrity-v75.css",
  "aldus-completed-visibility-v76.css",
  "aldus-question-register-v180.css",
  "question-bank-pdf-import-v181.css",
  "question-bank-capture-import-v182.css",
  "factory-visibility-v122.css",
  "aldus-desktop-refinement-v178.css"
];

const jsSources = [
  "app-version.js",
  "storage-indexeddb.js",
  "analytics-engine.js",
  "study-advisor.js",
  "advisor-navigation-engine.js",
  "qconcursos-crosswalk.js",
  "sync-integral-core.js",
  "sync-integral-deletions.js",
  "sync-integral-state.js",
  "sync-integral-cloud.js",
  "sync-integral-time-protection.js",
  "pcpr-pcma-2026-catalog.js",
  "pcpr-pcma-2026-migration.js",
  "qconcursos-pdf-import-v181.js",
  "qconcursos-capture-import-v182.js",
  "script.js",
  "factory-destination-catalog-v222.js",
  "factory-destination-folders-v222.js",
  "question-accuracy-spectrum.js",
  "timer-material-link-fix.js",
  "question-history-pie.js",
  "side-nav-collapse-v91.js",
  "factory-plan-day-v159.js",
  "factory-lei-prompt-v123.js",
  "central-goals-real-time-v124.js",
  "timer-first-beep-v160.js",
  "timer-motivation-v161.js",
  "question-register-simple-v162.js",
  "factory-simple-v163.js",
  "factory-polish-v164.js",
  "update-flow-v169.js",
  "timer-safety-v132.js",
  "factory-final-review-v128.js",
  "calendar-month-visibility-v131.js",
  "question-searchable-selects-v135.js",
  "factory-executive-ui-v136.js",
  "daily-study-collapsible-v137.js",
  "daily-smart-review-collapsible-v138.js",
  "collapse-chevron-fix-v139.js",
  "reinforcement-goal-presentation-v156.js",
  "completed-goal-guard-v177.js",
  "daily-delegate-piece-goal-v183.js",
  "analytics-view-controller-v179.js",
  "contest-countdown-v151.js",
  "performance-practical-v143.js",
  "daily-collapsibles-closed-v140.js",
  "question-board-result-v141.js",
  "question-scoring-rule-v142.js",
  "question-bank-training-v223.js",
  "question-bank-filters-v224.js",
  "question-bank-filters-v225.js",
  "question-bank-filter-open-v226.js"
];

function readRuntimeSource(filename) {
  return fs.readFileSync(path.join(root, filename), "utf8")
    .replace(/[ \t]+$/gm, "")
    .trim();
}

function injectBeforeMarker(source, marker, injectedSource, label) {
  if (source.includes(injectedSource.split("\n", 1)[0])) return source;
  const position = source.indexOf(marker);
  if (position < 0) throw new Error(`Marcador ausente para ${label}: ${marker}`);
  return `${source.slice(0, position)}${injectedSource.trim()}\n\n${source.slice(position)}`;
}

function replaceSourceModule(source, possibleMarkers, nextMarker, newMarker, replacementSource) {
  if (source.includes(newMarker)) return source;
  const marker = possibleMarkers.find((candidate) => source.includes(candidate));
  if (!marker) throw new Error(`Módulo-base ausente para ${newMarker}`);
  const start = source.indexOf(marker);
  const end = source.indexOf(nextMarker, start + marker.length);
  if (end < 0) throw new Error(`Limite final ausente para ${newMarker}`);
  return `${source.slice(0, start)}${newMarker}\n${replacementSource.trim()}\n\n${source.slice(end)}`;
}

function appendRuntimeModule(source, filename, marker = `/* Aldus runtime source: ${filename} */`) {
  if (source.includes(marker)) return source;
  return `${source.trim()}\n\n${marker}\n${readRuntimeSource(filename)}\n`;
}

function consolidateApplication(baseSource) {
  const qbEventsMarker = 'elements.qbPdfFile?.addEventListener("change", (event) => qbReadPdfImportFile(event.target.files?.[0]));';
  const captureReader = readRuntimeSource("qconcursos-capture-segmented-v188.js");
  if (!captureReader.includes("alternativas: alternatives")) {
    throw new Error("A correção do campo alternativas não foi incorporada.");
  }

  let source = baseSource;
  source = injectBeforeMarker(
    source,
    "/* Aldus source: question-accuracy-spectrum.js */",
    `/* Aldus runtime source: save-performance-v186.js */\n${readRuntimeSource("save-performance-v186.js")}`,
    "salvamento responsivo"
  );
  source = injectBeforeMarker(
    source,
    "/* Aldus source: daily-delegate-piece-goal-v183.js */",
    `/* Aldus runtime source: daily-piece-audit-prelude-v186.js */\n${readRuntimeSource("daily-piece-audit-prelude-v186.js")}`,
    "preâmbulo da auditoria de Peças"
  );
  source = injectBeforeMarker(
    source,
    "/* Aldus source: analytics-view-controller-v179.js */",
    `/* Aldus runtime source: daily-piece-audit-performance-v186.js */\n${readRuntimeSource("daily-piece-audit-performance-v186.js")}`,
    "auditoria consolidada de Peças"
  );
  source = replaceSourceModule(
    source,
    [
      "/* Aldus source: qconcursos-capture-import-v182.js */",
      "/* Aldus runtime source: qconcursos-capture-complete-v187.js */",
      "/* Aldus runtime source: qconcursos-capture-segmented-v188.js */",
      "/* Aldus runtime source: qconcursos-capture-accuracy-v190.js */"
    ],
    "/* Aldus source: script.js */",
    "/* Aldus runtime source: qconcursos-capture-accuracy-v190.js */",
    `${captureReader}\n\n${readRuntimeSource("qconcursos-capture-accuracy-v190.js")}`
  );

  const orderedBeforeQuestionEvents = [
    {
      marker: "/* Aldus runtime source: qconcursos-capture-bank-v188.js */",
      content: `${readRuntimeSource("qconcursos-capture-bank-v188.js")}\n\n/* Aldus runtime source: qconcursos-capture-reprocess-v188.js */\n${readRuntimeSource("qconcursos-capture-reprocess-v188.js")}\n\n/* Aldus runtime source: qconcursos-capture-ui-strict-v190.js */\n${readRuntimeSource("qconcursos-capture-ui-strict-v190.js")}`
    },
    { marker: "/* Aldus runtime source: question-bank-json-review-v192.js */", content: readRuntimeSource("question-bank-json-review-v192.js") },
    { marker: "/* Aldus runtime source: question-bank-json-contrast-v193.js */", content: readRuntimeSource("question-bank-json-contrast-v193.js") },
    { marker: "/* Aldus runtime source: question-bank-json-priority-v195.js */", content: readRuntimeSource("question-bank-json-priority-v195.js") },
    { marker: "/* Aldus runtime source: question-bank-json-completion-v196.js */", content: readRuntimeSource("question-bank-json-completion-v196.js") },
    {
      marker: "/* Aldus runtime source: question-history-report-core-v198.js */",
      content: `${readRuntimeSource("question-history-report-core-v198.js")}\n\n/* Aldus runtime source: question-history-report-export-v198.js */\n${readRuntimeSource("question-history-report-export-v198.js")}\n\n/* Aldus runtime source: question-history-report-ui-v198.js */\n${readRuntimeSource("question-history-report-ui-v198.js")}`
    },
    { marker: "/* Aldus runtime source: question-bank-json-import-v191.js */", content: readRuntimeSource("question-bank-json-import-v191.js") }
  ];
  for (const { marker, content } of orderedBeforeQuestionEvents) {
    source = injectBeforeMarker(source, qbEventsMarker, `${marker}\n${content}`, marker);
  }

  const appendedModules = [
    ["planning-shift-disciplines-v200.js"],
    ["planning-shift-disciplines-visual-v201.js", "/* Aldus runtime source: planning-shift-disciplines-visual-v203.js */"],
    ["side-nav-hover-collapse-v207.js"],
    ["floating-timer-active-border-v208.js"],
    ["floating-timer-label-contrast-v209.js"],
    ["floating-timer-label-quality-v210.js"],
    ["timer-message-variety-v211.js"],
    ["question-history-charts-v215.js"],
    ["question-history-tone-v216.js"]
  ];
  for (const [filename, marker] of appendedModules) {
    source = appendRuntimeModule(source, filename, marker);
  }

  const publicVersions = [
    "20260730-meta-diaria-peca-delegado-v169",
    "20260730-carregamento-salvamento-rapido-v169",
    "20260730-importacao-completa-captura-v169",
    "20260730-segmentacao-cartoes-qconcursos-v169",
    "20260730-correcao-alternativas-qconcursos-v169",
    "20260730-ocr-conservador-qconcursos-v169",
    "20260730-importacao-json-completa-qconcursos-v169",
    "20260730-revisao-visivel-json-qconcursos-v169",
    "20260730-contraste-revisao-json-qconcursos-v169",
    "20260730-restaura-carregamento-json-v169",
    "20260730-prioridade-revisao-json-v169",
    "20260730-confirmacao-final-json-v169",
    "20260730-estabiliza-rolagem-carregamento-v169",
    "20260730-filtro-relatorio-historico-questoes-v169",
    "20260730-contraste-resultado-liquido-v169",
    "20260731-menu-lateral-hover-v169",
    "20260731-corrige-menu-lateral-hover-v169",
    "20260731-remove-agulha-menu-lateral-v169",
    "20260731-suaviza-titulo-navegacao-v169",
    "20260731-borda-ativa-cronometro-v169",
    "20260731-contraste-titulo-cronometro-v169",
    "20260731-refina-titulo-cronometro-v169",
    "20260731-variedade-mensagens-cronometro-v169",
    "20260731-restaura-carregamento-rapido-v169",
    "20260801-carregamento-compilado-v169",
    "20260802-restaura-graficos-historico-v169",
    "20260802-tons-azulados-historico-v169",
    "20260802-corrige-atualizacao-versao-v217",
    "20260802-recupera-atualizacao-presa-v218"
  ];
  for (const version of publicVersions) source = source.replaceAll(version, packageVersion);

  const requiredMarkers = [
    "/* Aldus runtime source: qconcursos-capture-accuracy-v190.js */",
    "/* Aldus runtime source: question-bank-json-review-v192.js */",
    "/* Aldus runtime source: question-history-report-ui-v198.js */",
    "/* Aldus runtime source: planning-shift-disciplines-v200.js */",
    "/* Aldus runtime source: question-history-charts-v215.js */",
    "/* Aldus runtime source: question-history-tone-v216.js */",
    "/* Aldus source: question-board-result-v141.js */",
    "/* Aldus source: question-bank-training-v223.js */",
    "/* Aldus source: question-bank-filters-v224.js */",
    "/* Aldus source: question-bank-filters-v225.js */",
    "/* Aldus source: question-bank-filter-open-v226.js */"
  ];
  const missing = requiredMarkers.filter((marker) => !source.includes(marker));
  if (missing.length) throw new Error(`Bundle consolidado incompleto: ${missing.join(", ")}`);
  return `${source.trim()}\n`;
}

function consolidateStylesheet(baseSource) {
  let source = baseSource;
  for (const [filename, marker] of [
    ["loading-scrollbar-stability-v197.css", "/* Aldus runtime source: loading-scrollbar-stability-v197.css */"],
    ["question-history-visual-fix-v199.css", "/* Aldus runtime source: question-history-visual-fix-v199.css */"]
  ]) {
    if (!source.includes(marker)) source = `${source.trim()}\n\n${marker}\n${readRuntimeSource(filename)}\n`;
  }
  return source;
}

function bundle(sources, output, transform = (content) => content) {
  const content = sources
    .map((filename) => {
      const source = readRuntimeSource(filename);
      return `/* Aldus source: ${filename} */\n${source}`;
    })
    .join("\n\n");
  fs.writeFileSync(path.join(root, output), transform(`${content}\n`));
  fs.copyFileSync(path.join(root, output), path.join(root, "docs", output));
}

bundle(cssSources, "app.bundle.css", consolidateStylesheet);
bundle(jsSources, "app.bundle.js", consolidateApplication);

const vendorDir = path.join(root, "vendor");
const docsVendorDir = path.join(root, "docs", "vendor");
fs.mkdirSync(vendorDir, { recursive: true });
fs.mkdirSync(docsVendorDir, { recursive: true });
for (const [source, target] of [
  [path.join(root, "node_modules", "pdfjs-dist", "build", "pdf.mjs"), "pdf.mjs"],
  [path.join(root, "node_modules", "pdfjs-dist", "build", "pdf.worker.mjs"), "pdf.worker.mjs"],
  [path.join(root, "node_modules", "pdfjs-dist", "LICENSE"), "pdfjs-LICENSE.txt"]
]) {
  fs.copyFileSync(source, path.join(vendorDir, target));
  fs.copyFileSync(source, path.join(docsVendorDir, target));
}

for (const extension of ["css", "js"]) {
  const source = path.join(root, `app.bundle.${extension}`);
  const versionedName = `app-${releaseSuffix}.${extension}`;
  fs.copyFileSync(source, path.join(root, versionedName));
  fs.copyFileSync(source, path.join(root, "docs", versionedName));
}

const versionedWorkerName = `service-worker-${releaseSuffix}.js`;
fs.copyFileSync(path.join(root, "service-worker.js"), path.join(root, versionedWorkerName));
fs.copyFileSync(path.join(root, "service-worker.js"), path.join(root, "docs", versionedWorkerName));

// Pontes para instalações antigas. Ao detectar a mudança no mesmo URL do worker,
// elas passam a servir o HTML e os bundles da versão atual sem cadeia de runtimes.
for (const legacySuffix of ["v168", "v169"]) {
  for (const target of [`service-worker-${legacySuffix}.js`, path.join("docs", `service-worker-${legacySuffix}.js`)]) {
    fs.copyFileSync(path.join(root, "service-worker.js"), path.join(root, target));
  }
}

for (const filename of [
  "index.html", "app-version.js", "style.css", "script.js", "service-worker.js", "sync-integral-core.js",
  "factory-destination-catalog-v222.js", "factory-destination-folders-v222.js",
  "sync-integral-deletions.js", "sync-integral-state.js", "pcpr-pcma-2026-catalog.js",
  "pcpr-pcma-2026-migration.js", "factory-lei-prompt-v123.js",
  "factory-final-review-v128.js", "factory-visibility-v122.css",
  "analytics-accordion-fix-v148.js", "analytics-header-arrow-v149.js",
  "analytics-single-arrow-v150.js", "contest-countdown-v151.js",
  "analytics-view-controller-v179.js",
  "aldus-meta-branding.js", "daily-goal-methodology-v117.js",
  "daily-goal-replenishment-v116.js", "factory-lei-prompt-v119.js",
  "factory-lei-prompt-v120.js", "factory-lei-prompt-v121.js",
  "factory-lei-prompt-v122.js", "release-version-v144.js",
  "release-version-v145.js", "release-version-v146.js",
  "release-version-v147.js", "central-goals-real-time-v124.js",
  "timer-safety-v132.js", "question-searchable-selects-v135.js",
  "daily-study-collapsible-v137.js", "analytics-single-arrow-v150.js",
  "daily-collapsibles-closed-v140.js", "update-flow-v169.js",
  "daily-smart-review-collapsible-v138.js", "collapse-chevron-fix-v139.js",
  "reinforcement-goal-presentation-v156.js", "completed-goal-guard-v177.js", "daily-delegate-piece-goal-v183.js", "contest-countdown-v151.js",
  "performance-practical-v143.js", "analytics-collapsibles-v145.js",
  "calendar-month-visibility-v131.js", "factory-executive-ui-v136.js",
  "question-board-result-v141.js", "question-scoring-rule-v142.js",
  "question-register-simple-v162.js", "factory-simple-v163.js",
  "factory-polish-v164.js", "aldus-desktop-refinement-v178.css",
  "aldus-question-register-v180.css", "qconcursos-pdf-import-v181.js",
  "question-bank-pdf-import-v181.css", "qconcursos-capture-import-v182.js",
  "qconcursos-capture-segmented-v188.js", "qconcursos-capture-bank-v188.js", "qconcursos-capture-reprocess-v188.js",
  "question-bank-capture-import-v182.css", "question-history-pie.js", "question-history-charts-v215.js",
  "question-history-tone-v216.js", "question-bank-json-review-v192.js", "question-bank-json-import-v191.js", "question-bank-training-v223.js", "question-bank-filters-v224.js", "question-bank-filters-v225.js", "question-bank-filter-open-v226.js"
]) {
  fs.copyFileSync(path.join(root, filename), path.join(root, "docs", filename));
}
