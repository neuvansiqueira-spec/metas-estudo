import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const VERSION = "20260806-duplicate-diagnostics-v260";
const SCRIPT_TAG = `  <script id="aldusDuplicateDiagnosticsLoaderV260" src="duplicate-diagnostics-loader-v260.js?v=${VERSION}"></script>`;
const MARKER = "<!-- aldus-duplicate-diagnostics-v260 -->";
const targets = ["index.html", path.join("docs", "index.html")];
const payload = Array.from({ length: 5 }, (_, index) => fs.readFileSync(path.join("scripts", `duplicate-diagnostics-v260.js.gz.b64.part${index}`), "utf8")).join("").trim();
const engine = zlib.gunzipSync(Buffer.from(payload, "base64")).toString("utf8");

for (const target of ["duplicate-diagnostics-v260.js", path.join("docs", "duplicate-diagnostics-v260.js")]) {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, engine, "utf8");
}

for (const target of targets) {
  if (!fs.existsSync(target)) throw new Error(`Arquivo obrigatório não encontrado: ${target}`);
  let html = fs.readFileSync(target, "utf8");
  html = html.replace(/\s*<!-- aldus-duplicate-diagnostics-v260 -->\s*<script\s+id=["']aldusDuplicateDiagnosticsLoaderV260["'][^>]*><\/script>/gi, "");
  html = html.replace(/\s*<script\s+id=["']aldusDuplicateDiagnosticsLoaderV260["'][^>]*><\/script>/gi, "");
  const block = `  ${MARKER}\n${SCRIPT_TAG}\n`;
  if (html.includes("</body>")) html = html.replace("</body>", `${block}</body>`);
  else html = `${html.trimEnd()}\n${block}`;
  fs.writeFileSync(target, html, "utf8");
}

for (const target of targets) {
  const html = fs.readFileSync(target, "utf8");
  const occurrences = (html.match(/aldusDuplicateDiagnosticsLoaderV260/g) || []).length;
  if (occurrences !== 1 || !html.includes(`duplicate-diagnostics-loader-v260.js?v=${VERSION}`)) {
    throw new Error(`Publicação inválida em ${target}: ${occurrences} ocorrências do carregador.`);
  }
}

if (!engine.includes("__aldusDuplicateDiagnosticsInstalledV260") || !engine.includes("diagnoseState")) {
  throw new Error("O motor do diagnóstico não foi reconstruído corretamente.");
}

console.log(`duplicate-diagnostics-v260 published in ${targets.join(", ")}`);
