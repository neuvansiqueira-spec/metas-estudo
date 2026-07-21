import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

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
  "aldus-completed-visibility-v76.css"
];

const jsSources = [
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
  "script.js",
  "question-accuracy-spectrum.js",
  "timer-material-link-fix.js",
  "question-history-pie.js",
  "side-nav-collapse-v91.js"
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
