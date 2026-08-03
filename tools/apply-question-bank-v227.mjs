import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const scriptPath = path.join(root, "script.js");
const source = fs.readFileSync(scriptPath, "utf8");
const previous = `function qbErrorReason(item) {
  const marked = qbNormalizedAnswer(item?.marcado || item?.resposta || item?.answer || "");
  const correct = qbNormalizedAnswer(item?.gabarito || item?.correctAnswer || item?.officialKey || "");
  if (!marked || marked === "__blank__") return "branco";
  if (correct && marked === correct) return "";
  return "erro";
}`;
const corrected = `function qbErrorReason(item) {
  const explicitStatus = qbNormalize(item?.status || item?.resultado || item?.result);
  if (["certo", "correto", "acerto"].includes(explicitStatus)) return "";
  if (["errado", "incorreto", "erro"].includes(explicitStatus)) return "erro";
  if (["branco", "nao respondida", "não respondida"].includes(explicitStatus)) return "branco";
  if (["duvida", "dúvida", "revisar"].includes(explicitStatus)) return "duvida";
  const marked = qbNormalizedAnswer(item?.marcado || item?.resposta || item?.answer || "");
  const correct = qbNormalizedAnswer(item?.gabarito || item?.correctAnswer || item?.officialKey || "");
  if (!marked || marked === "__blank__") return "branco";
  if (correct && marked === correct) return "";
  return "erro";
}`;

if (source.includes(corrected)) {
  console.log("Classificação explícita do caderno já está corrigida.");
} else if (source.includes(previous)) {
  fs.writeFileSync(scriptPath, source.replace(previous, corrected));
  console.log("Classificação explícita do caderno corrigida para a versão v227.");
} else {
  throw new Error("Não foi possível localizar qbErrorReason para aplicar a correção v227.");
}
