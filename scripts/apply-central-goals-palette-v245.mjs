import fs from "node:fs";

const VERSION = "20260805-dashboard-central-metas-cores-v246";
const LINK_ID = "aldusCentralGoalsPaletteV246";
const CSS_FILE = "central-goals-palette-v245.css";
const LINK_TAG = `  <link id="${LINK_ID}" rel="stylesheet" href="${CSS_FILE}?v=${VERSION}" />`;
const INDEX_FILES = ["index.html", "docs/index.html"];
const DAILY_FILES = ["daily-summary-time-format-v243.js", "docs/daily-summary-time-format-v243.js"];
const WORKER_FILES = ["service-worker-v236.js", "docs/service-worker-v236.js"];

const INLINE_PALETTE = `
      html[data-aldus-theme="premium-stable"] #dashboardGoalsScaleSummary > .stat-card:nth-child(1) {
        --central-goal-accent: #a78bfa;
        --central-goal-border: #8b5cf6;
        --central-goal-value: #e0d2ff;
        --central-goal-muted: #ddd3f4;
        --central-goal-background: linear-gradient(145deg, #302052 0%, #1a1c38 100%);
      }
      html[data-aldus-theme="premium-stable"] #dashboardGoalsScaleSummary > .stat-card:nth-child(2) {
        --central-goal-accent: #f7d462;
        --central-goal-border: #d8ad2f;
        --central-goal-value: #ffe782;
        --central-goal-muted: #f3e8b6;
        --central-goal-background: linear-gradient(145deg, #4a3a10 0%, #2c260f 100%);
      }
      html[data-aldus-theme="premium-stable"] #dashboardGoalsScaleSummary > .stat-card:nth-child(3) {
        --central-goal-accent: #58b8ff;
        --central-goal-border: #279ddd;
        --central-goal-value: #79cbff;
        --central-goal-muted: #c8e7fb;
        --central-goal-background: linear-gradient(145deg, #0b3d62 0%, #082a44 100%);
      }
      html[data-aldus-theme="premium-stable"] #dashboardGoalsScaleSummary > .stat-card:nth-child(4) {
        --central-goal-accent: #d9e7ef;
        --central-goal-border: #a9c0cd;
        --central-goal-value: #edf7fb;
        --central-goal-muted: #d8e5eb;
        --central-goal-background: linear-gradient(145deg, #334957 0%, #21323d 100%);
      }
      html[data-aldus-theme="premium-stable"] #dashboardGoalsScaleSummary > .stat-card:nth-child(-n+4) {
        border: 1px solid var(--central-goal-border) !important;
        border-left: 7px solid var(--central-goal-accent) !important;
        background: var(--central-goal-background) !important;
        box-shadow: 0 12px 28px rgba(0, 6, 18, .30) !important;
      }
      html[data-aldus-theme="premium-stable"] #dashboardGoalsScaleSummary > .stat-card:nth-child(-n+4) > span {
        color: var(--central-goal-muted) !important;
      }
      html[data-aldus-theme="premium-stable"] #dashboardGoalsScaleSummary > .stat-card:nth-child(-n+4) > strong {
        color: var(--central-goal-value) !important;
        text-shadow: 0 1px 2px rgba(0, 0, 0, .30) !important;
      }
    `;

function applyDirectPaletteLink(filePath) {
  let html = fs.readFileSync(filePath, "utf8");
  html = html.replace(/^\s*<link\s+id=["']aldusCentralGoalsPaletteV(?:245|246)["'][^>]*>\s*$/gim, "");

  const appStyles = /(^\s*<link\s+id=["']aldusAppBundleStyles["'][^>]*>\s*$)/m;
  if (!appStyles.test(html)) {
    throw new Error(`Não foi possível localizar aldusAppBundleStyles em ${filePath}.`);
  }
  html = html.replace(appStyles, `$1\n${LINK_TAG}`);
  html = html.replace(
    /daily-summary-time-format-v243\.js\?v=20260805-daily-summary-hours-minutes-v243&hotfix=[^"']+/g,
    "daily-summary-time-format-v243.js?v=20260805-daily-summary-hours-minutes-v243&hotfix=daily-summary-time-format-hotfix3"
  );
  fs.writeFileSync(filePath, html, "utf8");
}

function patchDailyFallback(filePath) {
  let source = fs.readFileSync(filePath, "utf8");
  source = source
    .replace('const HOTFIX = "daily-summary-time-format-hotfix2";', 'const HOTFIX = "daily-summary-time-format-hotfix3";')
    .replace('const CENTRAL_PALETTE_STYLE_ID = "aldusCentralGoalsPaletteV245";', 'const CENTRAL_PALETTE_STYLE_ID = "aldusCentralGoalsPaletteV246";')
    .replace('const CENTRAL_PALETTE_VERSION = "20260805-central-goals-palette-v245";', `const CENTRAL_PALETTE_VERSION = "${VERSION}";`);

  const blockPattern = /style\.textContent = `[\s\S]*?`;\n    document\.head\.appendChild\(style\);/;
  if (!blockPattern.test(source)) {
    throw new Error(`Bloco de paleta não encontrado em ${filePath}.`);
  }
  source = source.replace(blockPattern, `style.textContent = \`${INLINE_PALETTE}\`;\n    document.head.appendChild(style);`);
  fs.writeFileSync(filePath, source, "utf8");
}

function patchServiceWorker(filePath) {
  let source = fs.readFileSync(filePath, "utf8");
  source = source
    .replace(/const CACHE_NAME = `metas-estudo-\$\{CURRENT_VERSION\}-[^`]+`;/, 'const CACHE_NAME = `metas-estudo-${CURRENT_VERSION}-dashboard-central-metas-cores-v246`;')
    .replace(/const CENTRAL_GOALS_PALETTE_VERSION = "[^"]+";/, `const CENTRAL_GOALS_PALETTE_VERSION = "${VERSION}";`)
    .replace(
      /if \(!html\.includes\("central-goals-palette-v245\.css"\)\) \{\n\s*missingTags\.push\(`<link id="aldusCentralGoalsPaletteV245" rel="stylesheet" href="\$\{CENTRAL_GOALS_PALETTE_STYLESHEET\}" \/>`\);\n\s*\}/,
      `if (!html.includes(CENTRAL_GOALS_PALETTE_VERSION)) {\n    missingTags.push(\`<link id="${LINK_ID}" rel="stylesheet" href="\${CENTRAL_GOALS_PALETTE_STYLESHEET}" />\`);\n  }`
    );
  fs.writeFileSync(filePath, source, "utf8");
}

for (const filePath of INDEX_FILES) applyDirectPaletteLink(filePath);
for (const filePath of DAILY_FILES) patchDailyFallback(filePath);
for (const filePath of WORKER_FILES) patchServiceWorker(filePath);

console.log(`[Central de Metas] Paleta ${VERSION} aplicada ao dashboardGoalsScaleSummary e preparada para publicação.`);
