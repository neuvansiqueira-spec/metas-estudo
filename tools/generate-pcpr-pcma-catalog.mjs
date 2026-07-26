import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const workspace = path.resolve(root, "..");
const readJSON = (relative) => JSON.parse(fs.readFileSync(path.join(workspace, relative), "utf8"));
const canonical = (value) => String(value || "")
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/[–—−]/g, "-")
  .replace(/\s+/g, " ")
  .trim()
  .toLowerCase();

function deterministicUuid(value) {
  const bytes = crypto.createHash("sha1").update(`pcpr-pcma-2026:${value}`).digest().subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

const pcpr = readJSON("tmp/analysis/pcpr_map.json");
const pcma = readJSON("tmp/analysis/pcma_map.json");
const siteMap = readJSON("tmp/analysis_v2/site_map_reviewed.json");
const comparison = readJSON("tmp/analysis_v2/comparison_reviewed.json");
const orphans = readJSON("tmp/analysis_v2/orphan_review.json");
const v2Backup = readJSON("outputs/pcpr_pcma_review_v2/BACKUP_MIGRADO_PCPR_PCMA_TESTE_V2.json").data;

const siteBySource = new Map(siteMap.map((row) => [
  `${row.origem}|${canonical(row.disciplina)}|${row.codigo}`,
  row
]));
const comparisonByPcma = new Map(comparison.filter((row) => row.codigo_pcma).map((row) => [
  `${canonical(row.disciplina_unificada)}|${row.codigo_pcma}`,
  row
]));
const pcprByKey = new Map(pcpr.map((row) => [`${canonical(row.disciplina)}|${row.codigo}`, row]));
const canonicalIdByPcpr = new Map();
const newItems = [];

function reviewedSiteResult(source, row) {
  return siteBySource.get(`${source}|${canonical(row.disciplina)}|${row.codigo}`) || {};
}

function candidateCanBeReused(review = {}) {
  return Boolean(
    review.uuid_candidato_revisado
    && !["ITEM REALMENTE AUSENTE", "AUSENTE", "NECESSIDADE DE CORREÇÃO DA ESTRUTURA DO SITE"].includes(review.resultado_revisao_site)
  );
}

function newOfficialItem(row, source, classification) {
  const id = deterministicUuid(`${source}|${row.disciplina}|${row.codigo}|${row.topico}`);
  const category = classification === "A" ? "COMMON" : classification === "B" ? "PCPR_ONLY" : classification === "C" ? "PCMA_BRIDGE" : "PCMA_ONLY";
  return {
    id,
    discipline: row.disciplina,
    topic: `${row.codigo} ${row.topico}`.trim(),
    subject: row.topico,
    subtopic: row.subtopico || row.codigo,
    reference: row.referencia_edital,
    priority: ["A", "B"].includes(classification) ? "Alta" : classification === "C" ? "Média" : "Baixa",
    weight: classification === "A" ? 5 : classification === "B" ? 4 : classification === "C" ? 3 : 2,
    status: "Não iniciado",
    domain: "Sem diagnóstico",
    notes: `Item oficial adicionado pela migração PCPR/PCMA 2026; categoria ${classification}.`,
    imported: true,
    officialCatalogItem: true,
    contestCategory: classification,
    contestScope: category,
    importKey: canonical(`${source}|${row.disciplina}|${row.codigo}|${row.topico}`).replace(/\s+/g, "|"),
    importMeta: {
      concurso: source,
      banca: row.banca,
      cargo: row.cargo,
      grupo: row.grupo,
      fase: row.fase,
      fonte: "Edital oficial PCPR/PCMA 2026",
      agendavel: classification !== "D",
      tipo_agendamento: "Estudo + questões",
      imported: true
    }
  };
}

for (const row of pcpr) {
  const review = reviewedSiteResult("PCPR 2026", row);
  const id = candidateCanBeReused(review)
    ? review.uuid_candidato_revisado
    : newOfficialItem(row, "PCPR 2026", "B").id;
  canonicalIdByPcpr.set(`${canonical(row.disciplina)}|${row.codigo}`, id);
  if (!candidateCanBeReused(review)) newItems.push(newOfficialItem(row, "PCPR 2026", "B"));
}

function pcprCodesForComparison(match = {}) {
  const values = match.codigos_pcpr_revisados || match.codigo_pcpr || "";
  return String(values).split(";").map((value) => value.trim()).filter(Boolean);
}

function pcprIdForPcmaMatch(row, match = {}) {
  for (const code of pcprCodesForComparison(match)) {
    const direct = canonicalIdByPcpr.get(`${canonical(row.disciplina)}|${code}`);
    if (direct) return direct;
    const sameCode = [...canonicalIdByPcpr.entries()].find(([key]) => key.endsWith(`|${code}`));
    if (sameCode) return sameCode[1];
  }
  return "";
}

const pcmaCanonicalIds = new Map();
for (const row of pcma) {
  const review = reviewedSiteResult("PCMA 2026", row);
  const match = comparisonByPcma.get(`${canonical(row.disciplina)}|${row.codigo}`) || {};
  const classification = ["A", "C", "D"].includes(match.classificacao) ? match.classificacao : "D";
  let id = candidateCanBeReused(review) ? review.uuid_candidato_revisado : "";
  if (!id && classification === "A") id = pcprIdForPcmaMatch(row, match);
  if (!id) {
    const item = newOfficialItem(row, "PCMA 2026", classification);
    id = item.id;
    newItems.push(item);
  }
  pcmaCanonicalIds.set(`${canonical(row.disciplina)}|${row.codigo}`, id);
}

const aPcprKeys = new Set();
comparison.filter((row) => row.classificacao === "A").forEach((row) => {
  pcprCodesForComparison(row).forEach((code) => {
    const exact = pcprByKey.get(`${canonical(row.disciplina_unificada)}|${code}`);
    if (exact) aPcprKeys.add(`${canonical(exact.disciplina)}|${exact.codigo}`);
    else [...pcprByKey.keys()].filter((key) => key.endsWith(`|${code}`)).forEach((key) => aPcprKeys.add(key));
  });
});

const mappings = [];
for (const row of pcpr) {
  const key = `${canonical(row.disciplina)}|${row.codigo}`;
  const classification = aPcprKeys.has(key) ? "A" : "B";
  const review = reviewedSiteResult("PCPR 2026", row);
  mappings.push({
    id: `pcpr-2026:${canonical(row.disciplina)}:${row.codigo}`,
    contestId: "pcpr-2026-delegado",
    syllabusItemId: canonicalIdByPcpr.get(key),
    code: row.codigo,
    discipline: row.disciplina,
    topic: row.topico,
    subtopic: row.subtopico,
    reference: row.referencia_edital,
    legislation: row.legislacao,
    phase: row.fase,
    questionWeight: row.questoes_peso,
    classification,
    correspondence: review.resultado_revisao_site || review.correspondencia_site || "NOVA",
    source: "Edital oficial PCPR 2026",
    schedulableBeforePcpr: true,
    schedulableAfterPcpr: classification === "A",
    legalReview: review.fundamento_revisao_site || ""
  });
}
for (const row of pcma) {
  const match = comparisonByPcma.get(`${canonical(row.disciplina)}|${row.codigo}`) || {};
  const classification = ["A", "C", "D"].includes(match.classificacao) ? match.classificacao : "D";
  const review = reviewedSiteResult("PCMA 2026", row);
  mappings.push({
    id: `pcma-2026:${canonical(row.disciplina)}:${row.codigo}`,
    contestId: "pcma-2026-delegado",
    syllabusItemId: pcmaCanonicalIds.get(`${canonical(row.disciplina)}|${row.codigo}`),
    code: row.codigo,
    discipline: row.disciplina,
    topic: row.topico,
    subtopic: row.subtopico,
    reference: row.referencia_edital,
    legislation: row.legislacao,
    phase: row.fase,
    questionWeight: row.questoes_peso,
    classification,
    correspondence: review.resultado_revisao_site || review.correspondencia_site || "NOVA",
    source: "Edital oficial PCMA 2026",
    schedulableBeforePcpr: classification === "A" || classification === "C",
    schedulableAfterPcpr: true,
    legalReview: match.fundamento || review.fundamento_revisao_site || ""
  });
}

const orphanIds = new Set(orphans.map((row) => row.uuid_orfao));
const historicalItems = v2Backup.syllabusItems
  .filter((item) => orphanIds.has(item.id))
  .map((item) => ({
    ...item,
    legacyOnly: true,
    hiddenFromCatalog: true,
    schedulable: false,
    agendavel: false,
    status: item.status || "Não iniciado",
    importMeta: { ...(item.importMeta || {}), legacyRestored: true, agendavel: false }
  }));

const contestProfiles = [
  {
    id: "pcpr-2026-delegado",
    name: "PCPR 2026 — Delegado de Polícia",
    agency: "Polícia Civil do Paraná",
    role: "Delegado de Polícia",
    board: "FGV",
    examDate: "2026-10-11",
    syllabusCount: pcpr.length,
    source: "Edital oficial nº 01/2026"
  },
  {
    id: "pcma-2026-delegado",
    name: "PCMA 2026 — Delegado de Polícia Civil",
    agency: "Polícia Civil do Maranhão",
    role: "Delegado de Polícia Civil — 3ª Classe",
    board: "Cebraspe",
    examDate: "2026-11-01",
    syllabusCount: pcma.length,
    source: "Edital oficial PCMA 2026"
  }
];

const contestPlanningProfiles = {
  pcpr: {
    id: "pcpr",
    label: "Somente PCPR",
    contestIds: ["pcpr-2026-delegado"],
    examDate: "2026-10-11",
    categories: { A: 80, B: 20, C: 0, D: 0, PIECE: 5 },
    disciplineWeights: {
      "DIREITO PENAL": 20,
      "DIREITO PROCESSUAL PENAL": 20,
      "LEGISLAÇÃO PENAL E PROCESSUAL PENAL EXTRAVAGANTE": 20,
      "DIREITO CONSTITUCIONAL": 10,
      "DIREITO ADMINISTRATIVO E GESTÃO PÚBLICA": 10,
      "LEGISLAÇÃO ESTADUAL E INSTITUCIONAL": 10,
      "DIREITOS HUMANOS": 5,
      "CIÊNCIAS FORENSES": 5
    }
  },
  pcma: {
    id: "pcma",
    label: "Somente PCMA",
    contestIds: ["pcma-2026-delegado"],
    examDate: "2026-11-01",
    categories: { A: 40, B: 0, C: 20, D: 40, PIECE: 0 },
    disciplineWeights: {
      "DIREITO DIGITAL": 6,
      "DIREITO CIVIL": 5,
      "DIREITO PROCESSUAL CIVIL": 3,
      "DIREITO AGRÁRIO": 3,
      "DIREITO AMBIENTAL": 3,
      "DIREITO ADMINISTRATIVO": 9,
      "DIREITO CONSTITUCIONAL": 8,
      "MEDICINA LEGAL": 9,
      "DIREITOS HUMANOS": 6,
      "DIREITO PENAL": 15,
      "DIREITO PROCESSUAL PENAL": 13,
      "LEGISLAÇÃO PENAL E PROCESSUAL PENAL ESPECIAL": 12,
      "CRIMINOLOGIA": 8
    }
  },
  joint: {
    id: "joint",
    label: "PCPR + PCMA",
    contestIds: ["pcpr-2026-delegado", "pcma-2026-delegado"],
    examDate: "2026-10-11",
    switchDate: "2026-10-12",
    nextExamDate: "2026-11-01",
    categories: { A: 65, B: 20, C: 10, D: 0, PIECE: 5 },
    postSwitchCategories: { A: 40, B: 0, C: 20, D: 40, PIECE: 0 },
    disciplineWeights: {
      "DIREITO PENAL": 20,
      "DIREITO PROCESSUAL PENAL": 20,
      "LEGISLAÇÃO PENAL E PROCESSUAL PENAL EXTRAVAGANTE": 20,
      "DIREITO CONSTITUCIONAL": 10,
      "DIREITO ADMINISTRATIVO E GESTÃO PÚBLICA": 10,
      "LEGISLAÇÃO ESTADUAL E INSTITUCIONAL": 10,
      "DIREITOS HUMANOS": 5,
      "CIÊNCIAS FORENSES": 5
    }
  }
};

const catalog = {
  version: "pcpr-pcma-2026-v3",
  generatedAt: "2026-07-26T00:00:00.000Z",
  officialCounts: { pcpr: pcpr.length, pcma: pcma.length, totalMappings: mappings.length },
  contestProfiles,
  contestPlanningProfiles,
  newItems: [...new Map(newItems.map((item) => [item.id, item])).values()],
  historicalItems,
  mappings
};

const js = `globalThis.PCPR_PCMA_2026_CATALOG = ${JSON.stringify(catalog, null, 2)};\n`;
fs.writeFileSync(path.join(root, "pcpr-pcma-2026-catalog.js"), js);
fs.copyFileSync(path.join(root, "pcpr-pcma-2026-catalog.js"), path.join(root, "docs", "pcpr-pcma-2026-catalog.js"));

const report = {
  version: catalog.version,
  officialCounts: catalog.officialCounts,
  newCanonicalItems: catalog.newItems.length,
  restoredHistoricalItems: catalog.historicalItems.length,
  uniqueMappedSyllabusItems: new Set(catalog.mappings.map((row) => row.syllabusItemId)).size,
  duplicateNewUuids: catalog.newItems.length - new Set(catalog.newItems.map((item) => item.id)).size,
  unmappedOfficialRows: catalog.mappings.filter((row) => !row.syllabusItemId).length
};
fs.writeFileSync(path.join(workspace, "tmp", "analysis_v3_catalog_report.json"), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
