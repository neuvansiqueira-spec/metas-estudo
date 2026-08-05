import fs from "node:fs";

const VERSION = "20260805-central-goals-palette-v245";
const LINK_ID = "aldusCentralGoalsPaletteV245";
const LINK_TAG = `  <link id="${LINK_ID}" rel="stylesheet" href="central-goals-palette-v245.css?v=${VERSION}" />`;
const INDEX_FILES = ["index.html", "docs/index.html"];

function applyDirectPaletteLink(filePath) {
  let html = fs.readFileSync(filePath, "utf8");
  const existingLink = new RegExp(`<link\\s+id=["']${LINK_ID}["'][^>]*>`, "i");

  if (existingLink.test(html)) {
    html = html.replace(existingLink, LINK_TAG.trim());
  } else {
    const appStyles = /(^\s*<link\s+id=["']aldusAppBundleStyles["'][^>]*>\s*$)/m;
    if (!appStyles.test(html)) {
      throw new Error(`Não foi possível localizar aldusAppBundleStyles em ${filePath}.`);
    }
    html = html.replace(appStyles, `$1\n${LINK_TAG}`);
  }

  fs.writeFileSync(filePath, html, "utf8");
}

for (const filePath of INDEX_FILES) applyDirectPaletteLink(filePath);

console.log(`[Central de Metas] Link direto da paleta ${VERSION} confirmado em ${INDEX_FILES.join(" e ")}.`);
