import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const docs = path.join(root, "docs");
const currentWorkerPath = path.join(root, "service-worker.js");
const currentSource = fs.readFileSync(currentWorkerPath, "utf8");
const versionMatch = currentSource.match(/const CURRENT_VERSION = "([^"]+)";/);
if (!versionMatch) throw new Error("Versão atual do service worker não encontrada.");

const currentVersion = versionMatch[1];
const currentSuffixMatch = currentVersion.match(/v(\d+)$/);
if (!currentSuffixMatch) throw new Error(`Sufixo de versão inválido: ${currentVersion}`);
const currentNumber = Number(currentSuffixMatch[1]);
const LEGACY_FLOOR = 275;

function workerNumber(filename) {
  const match = filename.match(/^service-worker-v(\d+)\.js$/);
  return match ? Number(match[1]) : null;
}

const candidates = fs.readdirSync(root)
  .map((filename) => ({ filename, number: workerNumber(filename) }))
  .filter(({ number }) => Number.isInteger(number) && number >= LEGACY_FLOOR && number < currentNumber)
  .sort((a, b) => a.number - b.number);

if (!candidates.some(({ number }) => number === 282)) {
  throw new Error("service-worker-v282.js não encontrado para migração.");
}

for (const { filename } of candidates) {
  fs.writeFileSync(path.join(root, filename), currentSource);
  const docsTarget = path.join(docs, filename);
  if (fs.existsSync(docsTarget)) fs.writeFileSync(docsTarget, currentSource);
}

console.log(`Workers legados sincronizados com ${currentVersion}: ${candidates.map(({ filename }) => filename).join(", ")}`);
