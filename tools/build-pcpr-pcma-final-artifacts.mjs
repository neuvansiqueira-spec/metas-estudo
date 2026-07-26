import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const root = process.cwd();
const workspace = path.resolve(root, "..");
const sourceBackup = path.join(workspace, "sources", "backup-metas-estudo-2026-07-25-22-44.json");
const outputDir = path.join(workspace, "outputs", "pcpr_pcma_final");
const reviewDir = path.join(workspace, "outputs", "pcpr_pcma_review_v2");
const initialDir = path.join(workspace, "outputs", "pcpr_pcma");
fs.mkdirSync(outputDir, { recursive: true });

const clone = (value) => JSON.parse(JSON.stringify(value));
const sha256 = (value) => crypto.createHash("sha256").update(
  typeof value === "string" || Buffer.isBuffer(value) ? value : JSON.stringify(value)
).digest("hex");

const context = { console };
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root, "pcpr-pcma-2026-catalog.js"), "utf8"), context);
vm.runInContext(fs.readFileSync(path.join(root, "pcpr-pcma-2026-migration.js"), "utf8"), context);

const originalBytes = fs.readFileSync(sourceBackup);
const originalPayload = JSON.parse(originalBytes);
const originalState = originalPayload.data;
const migratedPayload = clone(originalPayload);
const protectedCollections = [
  "subjects", "studies", "dailyGoals", "questionLogs", "smartReviews", "simulados",
  "materials", "questionBank", "questionBankSessions", "questionErrorNotebook",
  "factoryItems", "factoryAgenda", "syncTombstones"
];
const beforeHashes = Object.fromEntries(protectedCollections.map((key) => [key, sha256(originalState[key])]));
const originalIds = originalState.syllabusItems.map((item) => item.id);
const migrationReport = context.applyPcprPcma2026Migration(migratedPayload.data);
migratedPayload.version = 3;
migratedPayload.exportedAt = new Date().toISOString();
migratedPayload.migration = {
  id: "pcpr-pcma-2026-v3",
  sourceBackup: path.basename(sourceBackup),
  sourceBackupSha256: sha256(originalBytes),
  report: migrationReport
};
migratedPayload.localStorage ||= {};
migratedPayload.localStorage.metasConcursoData = JSON.stringify(migratedPayload.data);

const migratedPath = path.join(outputDir, "BACKUP_MIGRADO_PCPR_PCMA_PRODUCAO.json");
fs.writeFileSync(migratedPath, `${JSON.stringify(migratedPayload, null, 2)}\n`);
const restoredPayload = JSON.parse(fs.readFileSync(migratedPath, "utf8"));
const afterState = restoredPayload.data;
const afterIds = afterState.syllabusItems.map((item) => item.id);
const duplicateUuids = afterIds.length - new Set(afterIds).size;
const lostOriginalUuids = originalIds.filter((id) => !new Set(afterIds).has(id));
const afterHashes = Object.fromEntries(protectedCollections.map((key) => [key, sha256(afterState[key])]));
const changedProtectedHashes = protectedCollections.filter((key) => beforeHashes[key] !== afterHashes[key]);
const referencedIds = [
  ...afterState.dailyGoals.map((item) => item.syllabusItemId),
  ...afterState.smartReviews.map((item) => item.syllabusItemId)
].filter(Boolean);
const syllabusIds = new Set(afterIds);
const orphanReferences = referencedIds.filter((id) => !syllabusIds.has(id));
const restoredHistorical = afterState.syllabusItems.filter((item) => item.restoredFromHistoricalReference || item.importMeta?.legacyRestored);

const copies = [
  [path.join(initialDir, "MAPA_INTEGRAL_PCPR_2026.xlsx"), "MAPA_INTEGRAL_PCPR_2026_FINAL.xlsx"],
  [path.join(reviewDir, "MAPA_INTEGRAL_PCMA_2026_REVISADO.xlsx"), "MAPA_INTEGRAL_PCMA_2026_FINAL.xlsx"],
  [path.join(reviewDir, "COMPARACAO_INTEGRAL_PCPR_PCMA_REVISADA.xlsx"), "COMPARACAO_INTEGRAL_PCPR_PCMA_FINAL.xlsx"],
  [path.join(reviewDir, "MAPA_EDITAL_FUSIONADO_SITE_REVISADO.xlsx"), "MAPA_EDITAL_FUSIONADO_SITE_FINAL.xlsx"],
  [path.join(reviewDir, "ITENS_NOVOS_PCMA_PCPR_REVISADO.xlsx"), "ITENS_NOVOS_PCMA_PCPR_FINAL.xlsx"],
  [path.join(reviewDir, "REFERENCIAS_ORFAS_REVISADAS.xlsx"), "REFERENCIAS_ORFAS_PCPR_PCMA_FINAL.xlsx"],
  [path.join(reviewDir, "PESOS_E_TESTES_REVISADOS.xlsx"), "PESOS_E_TESTES_PCPR_PCMA_FINAL.xlsx"]
];
for (const [source, name] of copies) fs.copyFileSync(source, path.join(outputDir, name));

const integrity = [
  "RELATÓRIO DE INTEGRIDADE — MIGRAÇÃO PCPR/PCMA 2026",
  `Gerado em: ${new Date().toISOString()}`,
  `Backup-fonte: ${path.basename(sourceBackup)}`,
  `SHA-256 backup-fonte: ${sha256(originalBytes)}`,
  `SHA-256 backup migrado: ${sha256(fs.readFileSync(migratedPath))}`,
  "",
  `PCPR oficial: ${context.PCPR_PCMA_2026_CATALOG.officialCounts.pcpr}`,
  `PCMA oficial: ${context.PCPR_PCMA_2026_CATALOG.officialCounts.pcma}`,
  `Mapeamentos oficiais: ${context.PCPR_PCMA_2026_CATALOG.officialCounts.totalMappings}`,
  `Itens antes: ${originalIds.length}`,
  `Itens depois: ${afterIds.length}`,
  `UUIDs originais preservados: ${originalIds.length - lostOriginalUuids.length}`,
  `UUIDs criados: ${afterIds.length - originalIds.length}`,
  `UUIDs duplicados: ${duplicateUuids}`,
  `UUIDs originais perdidos: ${lostOriginalUuids.length}`,
  `Itens históricos restaurados e ocultos: ${restoredHistorical.length}`,
  `Referências órfãs após a migração: ${orphanReferences.length}`,
  `Coleções protegidas com hash alterado: ${changedProtectedHashes.length}`,
  `Restauração JSON: ${JSON.stringify(JSON.parse(restoredPayload.localStorage.metasConcursoData)) === JSON.stringify(afterState) ? "APROVADA" : "REPROVADA"}`,
  "",
  "Hashes protegidos antes/depois:",
  ...protectedCollections.map((key) => `${key}: ${beforeHashes[key]} | ${afterHashes[key]} | ${beforeHashes[key] === afterHashes[key] ? "PRESERVADO" : "ALTERADO"}`),
  "",
  `Resultado: ${duplicateUuids || lostOriginalUuids.length || orphanReferences.length || changedProtectedHashes.length ? "BLOQUEADO" : "APROVADO PARA TESTES DE PUBLICAÇÃO"}`
].join("\n");
fs.writeFileSync(path.join(outputDir, "RELATORIO_INTEGRIDADE_PCPR_PCMA_FINAL.txt"), `${integrity}\n`);

const manifest = [];
for (const name of fs.readdirSync(outputDir).sort()) {
  const target = path.join(outputDir, name);
  if (!fs.statSync(target).isFile()) continue;
  manifest.push(`${sha256(fs.readFileSync(target))}  ${name}`);
}
fs.writeFileSync(path.join(outputDir, "SHA256SUMS.txt"), `${manifest.join("\n")}\n`);

console.log(JSON.stringify({
  outputDir,
  migratedPath,
  itemsBefore: originalIds.length,
  itemsAfter: afterIds.length,
  created: afterIds.length - originalIds.length,
  duplicates: duplicateUuids,
  lost: lostOriginalUuids.length,
  restoredHistorical: restoredHistorical.length,
  orphanReferences: orphanReferences.length,
  changedProtectedHashes
}, null, 2));
