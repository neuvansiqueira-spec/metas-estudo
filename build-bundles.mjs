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

fs.writeFileSync(path.join(root, "app-version.js"), appVersionSource(packageVersion));
synchronizeIndexVersion();

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
  "script.js",
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
  "analytics-accordion-fix-v148.js",
  "analytics-header-arrow-v149.js",
  "analytics-single-arrow-v150.js",
  "contest-countdown-v151.js",
  "performance-practical-v143.js",
  "analytics-collapsibles-v145.js",
  "daily-collapsibles-closed-v140.js",
  "question-board-result-v141.js",
  "question-scoring-rule-v142.js"
];

function bundle(sources, output) {
  const content = sources
    .map((filename) => {
      const source = fs.readFileSync(path.join(root, filename), "utf8")
        .replace(/[ \t]+$/gm, "")
        .trim();
      return `/* Aldus source: ${filename} */\n${source}`;
    })
    .join("\n\n");
  fs.writeFileSync(path.join(root, output), `${content}\n`);
  fs.copyFileSync(path.join(root, output), path.join(root, "docs", output));
}

bundle(cssSources, "app.bundle.css");
bundle(jsSources, "app.bundle.js");

for (const extension of ["css", "js"]) {
  const source = path.join(root, `app.bundle.${extension}`);
  const versionedName = `app-${releaseSuffix}.${extension}`;
  fs.copyFileSync(source, path.join(root, versionedName));
  fs.copyFileSync(source, path.join(root, "docs", versionedName));
}

const versionedWorkerName = `service-worker-${releaseSuffix}.js`;
fs.copyFileSync(path.join(root, "service-worker.js"), path.join(root, versionedWorkerName));
fs.copyFileSync(path.join(root, "service-worker.js"), path.join(root, "docs", versionedWorkerName));

// Ponte de atualização para clientes ainda registrados no worker V168.
// O conteúdo é o worker independente V169: não há importação nem execução legada.
for (const target of ["service-worker-v168.js", path.join("docs", "service-worker-v168.js")]) {
  fs.copyFileSync(path.join(root, "service-worker.js"), path.join(root, target));
}

for (const filename of [
  "index.html", "app-version.js", "style.css", "script.js", "service-worker.js", "sync-integral-core.js",
  "sync-integral-deletions.js", "sync-integral-state.js", "pcpr-pcma-2026-catalog.js",
  "pcpr-pcma-2026-migration.js", "factory-lei-prompt-v123.js",
  "factory-final-review-v128.js", "factory-visibility-v122.css",
  "analytics-accordion-fix-v148.js", "analytics-header-arrow-v149.js",
  "analytics-single-arrow-v150.js", "contest-countdown-v151.js",
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
  "reinforcement-goal-presentation-v156.js", "contest-countdown-v151.js",
  "performance-practical-v143.js", "analytics-collapsibles-v145.js",
  "calendar-month-visibility-v131.js", "factory-executive-ui-v136.js",
  "question-board-result-v141.js", "question-scoring-rule-v142.js",
  "question-register-simple-v162.js", "factory-simple-v163.js",
  "factory-polish-v164.js", "aldus-desktop-refinement-v178.css"
]) {
  fs.copyFileSync(path.join(root, filename), path.join(root, "docs", filename));
}
