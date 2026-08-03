import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const scriptPath = path.join(root, "script.js");
const source = fs.readFileSync(scriptPath, "utf8");
const previous = 'function qbErrorReason(q) { if (qbIsBlankMark(q)) return "branco"; if (qbIsDoubtMark(q)) return "duvida"; if (qbHasKey(q) && q.marcado !== q.gabarito) return "erro"; return ""; }';
const corrected = 'function qbErrorReason(q) { const status = canonical(q?.status || q?.resultado || ""); if (status === "certo" || status === "correto" || status === "acerto") return ""; if (status === "errado" || status === "erro" || status === "incorreto") return "erro"; if (status === "branco" || status.includes("nao respond")) return "branco"; if (status === "duvida") return "duvida"; if (qbIsBlankMark(q)) return "branco"; if (qbIsDoubtMark(q)) return "duvida"; if (qbHasKey(q) && q.marcado !== q.gabarito) return "erro"; return ""; }';

if (source.includes(corrected)) {
  console.log("Classificação explícita do caderno já está corrigida.");
} else if (source.includes(previous)) {
  fs.writeFileSync(scriptPath, source.replace(previous, corrected));
  console.log("Classificação explícita do caderno corrigida para a versão v227.");
} else {
  throw new Error("Não foi possível localizar qbErrorReason para aplicar a correção v227.");
}
