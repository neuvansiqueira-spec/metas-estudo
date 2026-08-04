import fs from "node:fs";

const RELEASE_VERSION = "20260804-simulados-sem-fabrica-cache-unico-v236";
const CACHE_REVISION = "visible-version-hotfix1";

function read(path) {
  return fs.readFileSync(path, "utf8");
}

function write(path, content) {
  fs.writeFileSync(path, content);
}

function patchIntegrityCore() {
  const path = "planning-integrity-v235.js";
  let source = read(path);
  const oldBlock = `  function applyVisibleVersion() {
    document.documentElement.dataset.aldusIntegrityVersion = VERSION;
    document.querySelectorAll(".app-version").forEach((element) => {
      element.textContent = \`Versão: \${VERSION}\`;
    });
  }`;
  const newBlock = `  function applyVisibleVersion() {
    document.documentElement.dataset.aldusIntegrityVersion = VERSION;
    const release = globalThis.__ALDUS_APP_RELEASE__;
    if (release?.apply) {
      release.apply();
      return;
    }
    document.querySelectorAll(".app-version").forEach((element) => {
      element.textContent = \`Versão: \${VERSION}\`;
    });
  }`;

  if (source.includes(oldBlock)) source = source.replace(oldBlock, newBlock);
  else if (!source.includes("const release = globalThis.__ALDUS_APP_RELEASE__;")) {
    throw new Error("Bloco applyVisibleVersion não encontrado no núcleo V235.");
  }
  write(path, source);
}

function patchIntegrityLoader() {
  const path = "planning-integrity-loader-v235.js";
  let source = read(path);
  const oldLine = "    script.src = `planning-integrity-v235.js?v=${encodeURIComponent(VERSION)}`;";
  const newLines = "    const releaseVersion = globalThis.__ALDUS_APP_RELEASE__?.version || VERSION;\n    script.src = `planning-integrity-v235.js?v=${encodeURIComponent(releaseVersion)}`;";

  if (source.includes(oldLine)) source = source.replace(oldLine, newLines);
  else if (!source.includes("const releaseVersion = globalThis.__ALDUS_APP_RELEASE__?.version || VERSION;")) {
    throw new Error("Linha de carregamento do núcleo V235 não encontrada.");
  }
  write(path, source);
}

function patchServiceWorker() {
  const path = "service-worker.js";
  let source = read(path);
  const oldLine = "const CACHE_NAME = `metas-estudo-${CURRENT_VERSION}`;";
  const newLine = `const CACHE_NAME = \`metas-estudo-\${CURRENT_VERSION}-${CACHE_REVISION}\`;`;

  if (source.includes(oldLine)) source = source.replace(oldLine, newLine);
  else if (!source.includes(`-${CACHE_REVISION}\`;`)) {
    throw new Error("Declaração CACHE_NAME não encontrada no service worker.");
  }
  write(path, source);
}

function publishCopies() {
  fs.mkdirSync("docs", { recursive: true });
  fs.copyFileSync("planning-integrity-v235.js", "docs/planning-integrity-v235.js");
  fs.copyFileSync("planning-integrity-loader-v235.js", "docs/planning-integrity-loader-v235.js");

  for (const target of [
    "service-worker-v236.js",
    "service-worker-v168.js",
    "service-worker-v169.js",
    "docs/service-worker.js",
    "docs/service-worker-v236.js",
    "docs/service-worker-v168.js",
    "docs/service-worker-v169.js"
  ]) {
    fs.copyFileSync("service-worker.js", target);
  }
}

function validate() {
  const core = read("planning-integrity-v235.js");
  const loader = read("planning-integrity-loader-v235.js");
  const worker = read("service-worker.js");

  if (!core.includes("const release = globalThis.__ALDUS_APP_RELEASE__;")) {
    throw new Error("O núcleo ainda não prioriza a versão pública do aplicativo.");
  }
  if (!core.includes("release.apply();")) {
    throw new Error("A reaplicação da versão pública não foi instalada.");
  }
  if (!loader.includes("globalThis.__ALDUS_APP_RELEASE__?.version || VERSION")) {
    throw new Error("O loader ainda usa a identificação interna V235 como cache-buster.");
  }
  if (!worker.includes(`metas-estudo-\${CURRENT_VERSION}-${CACHE_REVISION}`)) {
    throw new Error("A revisão de cache da V236 não foi aplicada.");
  }
  if (!worker.includes(RELEASE_VERSION)) {
    throw new Error("O service worker deixou de apontar para a V236.");
  }
}

patchIntegrityCore();
patchIntegrityLoader();
patchServiceWorker();
publishCopies();
validate();
console.log(`Regressão visual V236→V235 corrigida em ${RELEASE_VERSION}.`);
