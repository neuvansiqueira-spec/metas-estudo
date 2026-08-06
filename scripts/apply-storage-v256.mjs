import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const version = "20260805-indexeddb-quota-guard-v256";
const quotaFile = "storage-quota-guard-v256.js";
const recoveryFile = "recuperacao-v256.html";

function read(relative) {
  return fs.readFileSync(path.join(root, relative), "utf8");
}

function write(relative, content) {
  const target = path.join(root, relative);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content);
}

function patchIndex(relative) {
  let html = read(relative);
  const tag = `<script id="aldusStorageQuotaGuardV256" src="${quotaFile}?v=${version}&hotfix=indexeddb-only1"></script>`;
  if (!html.includes("aldusStorageQuotaGuardV256")) {
    const recoveryMarker = /\s*<script id="aldusStorageRecoveryV254"[^>]*><\/script>/;
    const appMarker = /\s*<script id="aldusAppBundleScript"[^>]*><\/script>/;
    if (recoveryMarker.test(html)) {
      html = html.replace(recoveryMarker, match => `\n  ${tag}${match}`);
    } else if (appMarker.test(html)) {
      html = html.replace(appMarker, match => `\n  ${tag}${match}`);
    } else {
      throw new Error(`Não foi encontrado ponto seguro de injeção em ${relative}.`);
    }
  }
  write(relative, html);
}

write(`docs/${quotaFile}`, read(quotaFile));
write(`docs/${recoveryFile}`, read(recoveryFile));
patchIndex("index.html");
patchIndex("docs/index.html");

for (const relative of ["index.html", "docs/index.html"]) {
  const html = read(relative);
  const quotaPosition = html.indexOf("aldusStorageQuotaGuardV256");
  const appPosition = html.indexOf("aldusAppBundleScript");
  if (quotaPosition < 0 || appPosition < 0 || quotaPosition > appPosition) {
    throw new Error(`A proteção V256 não foi publicada antes do aplicativo em ${relative}.`);
  }
}

for (const relative of [quotaFile, `docs/${quotaFile}`, recoveryFile, `docs/${recoveryFile}`]) {
  if (!fs.existsSync(path.join(root, relative))) throw new Error(`Arquivo obrigatório ausente: ${relative}`);
}

console.log("Publicação V256 aplicada em raiz e docs.");
