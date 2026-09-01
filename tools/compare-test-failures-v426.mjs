import fs from "node:fs";

const [, , baselinePath, headPath] = process.argv;
if (!baselinePath || !headPath) {
  console.error("Uso: node tools/compare-test-failures-v426.mjs <baseline.tap> <head.tap>");
  process.exit(2);
}

function normalizeName(raw) {
  let name = String(raw || "").trim().replace(/\\/g, "/");
  name = name.replace(/\s+#\s+.*$/, "").trim();
  const testsIndex = name.lastIndexOf("/tests/");
  if (testsIndex >= 0) name = name.slice(testsIndex + 1);
  name = name.replace(/^.*?(tests\/)/, "$1");
  return name;
}

function failureNames(file) {
  const source = fs.readFileSync(file, "utf8");
  const names = new Set();
  for (const line of source.split(/\r?\n/)) {
    const match = line.match(/^\s*not ok\s+\d+\s+-\s+(.+?)\s*$/);
    if (!match) continue;
    const name = normalizeName(match[1]);
    if (name) names.add(name);
  }
  return [...names].sort((a, b) => a.localeCompare(b, "pt-BR"));
}

const baseline = failureNames(baselinePath);
const head = failureNames(headPath);
const baselineSet = new Set(baseline);
const headSet = new Set(head);
const added = head.filter((name) => !baselineSet.has(name));
const removed = baseline.filter((name) => !headSet.has(name));

console.log(`Baseline: ${baseline.length} falhas nominais.`);
console.log(`Branch: ${head.length} falhas nominais.`);

if (added.length || removed.length) {
  if (added.length) {
    console.error("Falhas novas:");
    for (const name of added) console.error(`+ ${name}`);
  }
  if (removed.length) {
    console.error("Falhas que desapareceram (conjunto deixou de ser idêntico):");
    for (const name of removed) console.error(`- ${name}`);
  }
  process.exit(1);
}

console.log("V426: conjunto nominal de falhas idêntico à baseline.");
