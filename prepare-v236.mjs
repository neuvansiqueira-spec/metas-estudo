import fs from "node:fs";

const VERSION = "20260804-simulados-sem-fabrica-cache-unico-v236";
const LOADER_FILE = "planning-integrity-loader-v235.js";
const CORE_FILE = "planning-integrity-v235.js";
const LOADER_TAG = `<script id="aldusPlanningIntegrityLoaderV235" src="${LOADER_FILE}?v=${VERSION}"></script>`;

function read(path) {
  return fs.readFileSync(path, "utf8");
}

function write(path, content) {
  fs.writeFileSync(path, content);
}

function patchIndex() {
  const path = "index.html";
  let source = read(path);
  source = source.replace(/<script id="aldusPlanningIntegrityLoaderV235"[^>]*><\/script>\s*/g, "");
  if (!source.includes("</body>")) throw new Error("index.html sem fechamento de body");
  source = source.replace("</body>", `  ${LOADER_TAG}\n</body>`);
  write(path, source);
}

function patchServiceWorker() {
  const path = "service-worker.js";
  let source = read(path);

  if (!source.includes("const INTEGRITY_LOADER")) {
    source = source.replace(
      /const HISTORY_LAYOUT_STYLESHEET = `question-history-layout-v223\.css\?v=\$\{HISTORY_LAYOUT_VERSION\}`;\n/,
      (match) => `${match}const INTEGRITY_LOADER = \`${LOADER_FILE}?v=\${CURRENT_VERSION}\`;\nconst INTEGRITY_CORE = \`${CORE_FILE}?v=\${CURRENT_VERSION}\`;\n`
    );
  }

  if (!source.includes("  INTEGRITY_LOADER,")) {
    source = source.replace(
      /(`app-\$\{RELEASE_SUFFIX\}\.js\?v=\$\{CURRENT_VERSION\}`,\n)/,
      `$1  INTEGRITY_LOADER,\n  INTEGRITY_CORE,\n`
    );
  }

  source = source.replace("  const patchedHtml = missingTags.length === 0", "  let patchedHtml = missingTags.length === 0");

  if (!source.includes("aldusPlanningIntegrityLoaderV235")) {
    const marker = "  const headers = new Headers(response.headers);";
    if (!source.includes(marker)) throw new Error("Marcador de cabeçalhos ausente no service worker");
    const injection = `  if (!patchedHtml.includes(\"${LOADER_FILE}\")) {\n    const scriptTag = \`<script id=\"aldusPlanningIntegrityLoaderV235\" src=\"\${INTEGRITY_LOADER}\"></script>\`;\n    patchedHtml = patchedHtml.includes(\"</body>\")\n      ? patchedHtml.replace(\"</body>\", \`  \${scriptTag}\\n</body>\`)\n      : \`\${patchedHtml}\\n\${scriptTag}\`;\n  }\n\n`;
    source = source.replace(marker, `${injection}${marker}`);
  }

  if (!source.includes('headers.set("x-aldus-integrity-version"')) {
    source = source.replace(
      '  headers.set("content-type", "text/html; charset=utf-8");',
      '  headers.set("content-type", "text/html; charset=utf-8");\n  headers.set("x-aldus-integrity-version", CURRENT_VERSION);'
    );
  }

  write(path, source);
}

patchIndex();
patchServiceWorker();
console.log(`Preparação ${VERSION} concluída.`);
