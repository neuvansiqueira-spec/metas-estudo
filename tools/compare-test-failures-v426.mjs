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

// Quantos testes o arquivo declara ao todo, passando ou falhando. É o que
// distingue a falha que foi CONSERTADA da que sumiu porque alguém apagou o
// teste — as duas somem do conjunto, mas só a segunda encolhe a suíte.
function totalTests(file) {
  const source = fs.readFileSync(file, "utf8");
  let total = 0;
  for (const line of source.split(/\r?\n/)) {
    if (/^\s*(not )?ok\s+\d+\s+-\s+/.test(line)) total += 1;
  }
  return total;
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

const baselineTotal = totalTests(baselinePath);
const headTotal = totalTests(headPath);

// Falha nova continua reprovando: é para isso que este gate existe.
if (added.length) {
  console.error("Falhas novas:");
  for (const name of added) console.error(`+ ${name}`);
  process.exit(1);
}

// Falha que desaparece pode ser duas coisas muito diferentes: um conserto de
// verdade, ou alguém apagando o teste para esconder o vermelho. Reprovar as
// duas, como antes, tornava impossível consertar um teste quebrado sem também
// mexer neste arquivo — foi o que aconteceu em 07/09/2026, quando um teste que
// fixava a data em que fora escrito passou a falhar na virada do dia.
if (removed.length) {
  console.log("Falhas que desapareceram:");
  for (const name of removed) console.log(`- ${name}`);
  if (headTotal < baselineTotal) {
    console.error(
      `Reprovado: a suíte encolheu de ${baselineTotal} para ${headTotal} testes. ` +
      "Falha que some junto com o teste não é conserto."
    );
    process.exit(1);
  }
  console.log(`Aceito: a suíte manteve ${headTotal} testes (baseline: ${baselineTotal}).`);
}

console.log("V426: nenhuma falha nova em relação à baseline.");
