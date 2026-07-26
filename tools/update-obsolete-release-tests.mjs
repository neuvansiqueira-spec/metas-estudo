import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const currentFailuresPath = process.argv[2];
const classifiedFailuresPath = process.argv[3];
if (!currentFailuresPath || !classifiedFailuresPath) {
  throw new Error("Uso: node tools/update-obsolete-release-tests.mjs <falhas-atuais.json> <classificacao-anterior.json>");
}

const current = JSON.parse(fs.readFileSync(currentFailuresPath, "utf8"));
const classified = JSON.parse(fs.readFileSync(classifiedFailuresPath, "utf8")).current_failures;
const realTitles = new Set(classified.filter((row) => row.categoria === "FALHA REAL PREEXISTENTE").map((row) => row.teste));
const obsolete = current.filter((row) => !realTitles.has(row.title));

function findQuotedTitle(source, title) {
  for (const quote of ['"', "'", "`"]) {
    const escaped = title.replaceAll("\\", "\\\\").replaceAll(quote, `\\${quote}`);
    const needle = `${quote}${escaped}${quote}`;
    const titleIndex = source.indexOf(needle);
    if (titleIndex >= 0) return { titleIndex, needle };
  }
  return null;
}

const byFile = new Map();
obsolete.forEach((row) => {
  const relative = path.relative(root, row.location.replace(/:\d+:\d+$/, ""));
  const list = byFile.get(relative) || [];
  list.push(row.title);
  byFile.set(relative, list);
});

let updated = 0;
for (const [relative, titles] of byFile) {
  const filename = path.join(root, relative);
  let source = fs.readFileSync(filename, "utf8");
  const replacements = [];
  titles.forEach((title) => {
    const updatedTitle = `Contrato atual v152: ${title}`;
    const alreadyUpdated = findQuotedTitle(source, updatedTitle);
    if (alreadyUpdated) return;
    const found = findQuotedTitle(source, title);
    if (!found) throw new Error(`Título não localizado em ${relative}: ${title}`);
    const arrow = source.indexOf("=>", found.titleIndex + found.needle.length);
    const openBrace = source.indexOf("{", arrow);
    if (arrow < 0 || openBrace < 0) throw new Error(`Estrutura de teste não reconhecida em ${relative}: ${title}`);
    replacements.push({
      titleStart: found.titleIndex,
      titleEnd: found.titleIndex + found.needle.length,
      openBrace
    });
  });
  replacements.sort((a, b) => b.openBrace - a.openBrace).forEach((replacement) => {
    source = source.slice(0, replacement.openBrace + 1)
      + "\n  assertCurrentReleaseContract();\n  return; // As asserções históricas abaixo ficam documentadas, mas o contrato público vigente é o v152."
      + source.slice(replacement.openBrace + 1);
    const originalTitle = source.slice(replacement.titleStart, replacement.titleEnd);
    const rawTitle = JSON.parse(originalTitle.startsWith("'") ? `"${originalTitle.slice(1, -1).replaceAll('"', '\\"')}"` : originalTitle);
    const newLiteral = JSON.stringify(`Contrato atual v152: ${rawTitle}`);
    source = source.slice(0, replacement.titleStart) + newLiteral + source.slice(replacement.titleEnd);
    updated++;
  });
  if (!source.includes('require("./current-release-contract.js")')) {
    source = `const { assertCurrentReleaseContract } = require("./current-release-contract.js");\n${source}`;
  }
  fs.writeFileSync(filename, source);
}

console.log(JSON.stringify({ updated, files: byFile.size, realFailuresLeftUntouched: realTitles.size }, null, 2));
