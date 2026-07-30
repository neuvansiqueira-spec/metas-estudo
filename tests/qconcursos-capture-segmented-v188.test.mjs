import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const source = fs.readFileSync(new URL("../qconcursos-capture-segmented-v188.js", import.meta.url), "utf8");
const sandbox = { globalThis: {}, console };
sandbox.globalThis = sandbox;
vm.runInNewContext(source, sandbox);
const api = sandbox.AldusQconcursosCaptureImport;

test("separa metadados e ignora comentários da comunidade", () => {
  const parsed = api.parseQuestionCardText(`
Q1234567 Direito Penal > Crimes contra a Administração Pública
Ano: 2024 Banca: FGV Órgão: PC-PR Prova: FGV - 2024 - PC-PR - Delegado de Polícia
O funcionário público que se apropria de bem móvel de que tem a posse em razão do cargo pratica:
A) concussão
B) corrupção passiva
C) peculato
D) prevaricação
E) advocacia administrativa
Gabarito comentado Aulas Comentários (12) Estatísticas Cadernos
Ordenando por: Mais curtidos
João 30 de julho de 2026 às 10:00
Gostei (5) Respostas (2) Reportar abuso
`, { index: 0 }, {
    knownTaxonomy: [{ discipline: "Direito Penal", subject: "Crimes contra a Administração Pública" }]
  });
  assert.equal(parsed.referencia, "Q1234567");
  assert.equal(parsed.disciplina, "Direito Penal");
  assert.equal(parsed.assunto, "Crimes contra a Administração Pública");
  assert.equal(parsed.banca, "FGV");
  assert.equal(parsed.ano, "2024");
  assert.equal(parsed.orgao, "PC-PR");
  assert.match(parsed.cargo, /Delegado de Polícia/);
  assert.equal(parsed.alternativas.C, "peculato");
  assert.equal(parsed.comentarioQc, "");
  assert.equal(parsed.ignoredCommunityComments, true);
});

test("preserva comentário oficial sem sinais de comunidade", () => {
  const parsed = api.parseQuestionCardText(`
Q7654321 Direito Processual Penal > Inquérito Policial
Ano: 2023 Banca: CEBRASPE Órgão: PC-PA Cargo: Delegado de Polícia
O inquérito policial é dispensável para o oferecimento da denúncia.
Certo
Errado
Gabarito oficial da banca: Certo
Gabarito comentado Aulas Comentários Estatísticas
A denúncia pode ser oferecida com outros elementos informativos suficientes, razão pela qual o inquérito é dispensável.
`, { index: 0 }, {
    knownTaxonomy: [{ discipline: "Direito Processual Penal", subject: "Inquérito Policial" }]
  });
  assert.equal(parsed.tipo, "ce");
  assert.equal(parsed.officialKey, "C");
  assert.match(parsed.comentarioQc, /outros elementos informativos suficientes/);
  assert.equal(parsed.ignoredCommunityComments, false);
});
