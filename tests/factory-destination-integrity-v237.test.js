import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const source = fs.readFileSync(new URL("../factory-destination-integrity-v237.js", import.meta.url), "utf8");
const ROOT = "1fBp2Ibx4_acuP4fvIK26SKkVtLJmEcOJ";
const DPP = "1H9u60GtGtZDa2f0Q5Et8FhDkYiH2twss";
const EXTRAVAGANTE = "1BUnSeaPTKVgjgyrfo48rYQ19AuSgSCpr";
const ADM_GESTAO = "1u5QOY9Hu0PYTT_Mu41y5LZt8efvsVw-H";
const ADM = "1xnzmOhZSQYffoOPgiQejz3d8-Z3vUWdY";
const ESPECIAL = "1h32SI1Gu8GRUGmScMI5Ag7c98gC6A5xC";

function runtime() {
  const context = { console, queueMicrotask, globalThis: null };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(source, context);
  return context;
}

function tree() {
  return {
    nodes: [
      { id: ROOT, name: "PASTAS_DE_DESTINO", depth: 0, pathIds: [ROOT], pathNames: [] },
      { id: DPP, name: "02_DIREITO_PROCESSUAL_PENAL", depth: 1, pathIds: [ROOT, DPP], pathNames: ["02_DIREITO_PROCESSUAL_PENAL"] },
      { id: EXTRAVAGANTE, name: "03_LEGISLACAO_PENAL_E_LEGISLACAO_PROCESSUAL_PENAL_EXTRAVAGANTE", depth: 1, pathIds: [ROOT, EXTRAVAGANTE], pathNames: ["03_LEGISLACAO_PENAL_E_LEGISLACAO_PROCESSUAL_PENAL_EXTRAVAGANTE"] },
      { id: ADM_GESTAO, name: "05_DIREITO_ADMINISTRATIVO_E_GESTAO_PUBLICA", depth: 1, pathIds: [ROOT, ADM_GESTAO], pathNames: ["05_DIREITO_ADMINISTRATIVO_E_GESTAO_PUBLICA"] },
      { id: ADM, name: "14_DIREITO_ADMINISTRATIVO", depth: 1, pathIds: [ROOT, ADM], pathNames: ["14_DIREITO_ADMINISTRATIVO"] },
      { id: ESPECIAL, name: "16_LEGISLACAO_PENAL_E_PROCESSUAL_PENAL_ESPECIAL", depth: 1, pathIds: [ROOT, ESPECIAL], pathNames: ["16_LEGISLACAO_PENAL_E_PROCESSUAL_PENAL_ESPECIAL"] },
      { id: "lavagem", name: "36_LAVAGEM_DE_DINHEIRO_LEI_N_9_613_1998", depth: 2, pathIds: [ROOT, ESPECIAL, "lavagem"], pathNames: ["16_LEGISLACAO_PENAL_E_PROCESSUAL_PENAL_ESPECIAL", "36_LAVAGEM_DE_DINHEIRO_LEI_N_9_613_1998"] },
      { id: "interceptacao", name: "19_INTERCEPTACAO_TELEFONICA_TELEMATICA_E_AMBIENTAL_LEI_N_9_296_1996", depth: 2, pathIds: [ROOT, ESPECIAL, "interceptacao"], pathNames: ["16_LEGISLACAO_PENAL_E_PROCESSUAL_PENAL_ESPECIAL", "19_INTERCEPTACAO_TELEFONICA_TELEMATICA_E_AMBIENTAL_LEI_N_9_296_1996"] },
      { id: "hediondos", name: "5_CRIMES_HEDIONDOS_LEI_N_8_072_1990_ASPECTOS_PROCESSUAIS_PENAIS", depth: 2, pathIds: [ROOT, ESPECIAL, "hediondos"], pathNames: ["16_LEGISLACAO_PENAL_E_PROCESSUAL_PENAL_ESPECIAL", "5_CRIMES_HEDIONDOS_LEI_N_8_072_1990_ASPECTOS_PROCESSUAIS_PENAIS"] },
      { id: "antiterror", name: "3_13_LEI_ANTITERRORISMO_LEI_N_13_260_2016", depth: 2, pathIds: [ROOT, EXTRAVAGANTE, "antiterror"], pathNames: ["03_LEGISLACAO_PENAL_E_LEGISLACAO_PROCESSUAL_PENAL_EXTRAVAGANTE", "3_13_LEI_ANTITERRORISMO_LEI_N_13_260_2016"] },
      { id: "inquerito", name: "2_3_INQUERITO_POLICIAL", depth: 2, pathIds: [ROOT, DPP, "inquerito"], pathNames: ["02_DIREITO_PROCESSUAL_PENAL", "2_3_INQUERITO_POLICIAL"] },
      { id: "arquivamento", name: "2_3_7_ARQUIVAMENTO", depth: 3, pathIds: [ROOT, DPP, "inquerito", "arquivamento"], pathNames: ["02_DIREITO_PROCESSUAL_PENAL", "2_3_INQUERITO_POLICIAL", "2_3_7_ARQUIVAMENTO"] },
      { id: "regime", name: "1_REGIME_JURIDICO_ADMINISTRATIVO", depth: 2, pathIds: [ROOT, ADM_GESTAO, "regime"], pathNames: ["05_DIREITO_ADMINISTRATIVO_E_GESTAO_PUBLICA", "1_REGIME_JURIDICO_ADMINISTRATIVO"] },
      { id: "atos", name: "2_ATOS_ADMINISTRATIVOS", depth: 2, pathIds: [ROOT, ADM, "atos"], pathNames: ["14_DIREITO_ADMINISTRATIVO", "2_ATOS_ADMINISTRATIVOS"] }
    ]
  };
}

function apply(item) {
  const api = runtime();
  return api.__applyFactoryDestinationToEntryV237(item, tree());
}

test("Lei 9.613/1998 prevalece sobre o subtema numérico 19", () => {
  const item = {
    disciplina: "LEGISLAÇÃO ESPECÍFICA – DIREITO PENAL",
    tema: "Lei nº 9.613/1998",
    subtema: "19",
    factoryDestinationFolder: "https://drive.google.com/drive/folders/interceptacao",
    factoryDestinationFolderCatalogVersion: "v232"
  };
  apply(item);
  assert.equal(item.factoryDestinationFolder, "https://drive.google.com/drive/folders/lavagem");
  assert.equal(item.factoryDestinationFolderPreviousUrl, "https://drive.google.com/drive/folders/interceptacao");
});

test("Lei 8.072/1990 prevalece sobre código divergente do edital", () => {
  const item = { disciplina: "LEGISLAÇÃO ESPECÍFICA – DIREITO PENAL", tema: "Lei nº 8.072/1990", subtema: "17" };
  apply(item);
  assert.equal(item.factoryDestinationFolder, "https://drive.google.com/drive/folders/hediondos");
});

test("legislação extravagante permanece na disciplina correta", () => {
  const item = { disciplina: "LEGISLAÇÃO PENAL E LEGISLAÇÃO PROCESSUAL PENAL EXTRAVAGANTE", tema: "Lei Antiterrorismo (Lei n.º 13.260/2016)" };
  apply(item);
  assert.equal(item.factoryDestinationFolder, "https://drive.google.com/drive/folders/antiterror");
  assert.equal(item.factoryDestinationFolderCatalogKey, EXTRAVAGANTE);
});

test("tema aninhado usa a sub-subpasta exata", () => {
  const item = { disciplina: "DIREITO PROCESSUAL PENAL", tema: "Arquivamento", subtema: "2.3.7" };
  apply(item);
  assert.equal(item.factoryDestinationFolder, "https://drive.google.com/drive/folders/arquivamento");
});

test("não confunde Direito Administrativo com Administração e Gestão Pública", () => {
  const gestao = { disciplina: "DIREITO ADMINISTRATIVO E GESTÃO PÚBLICA", tema: "Regime jurídico-administrativo" };
  const administrativo = { disciplina: "DIREITO ADMINISTRATIVO", tema: "Atos administrativos" };
  apply(gestao);
  apply(administrativo);
  assert.equal(gestao.factoryDestinationFolder, "https://drive.google.com/drive/folders/regime");
  assert.equal(administrativo.factoryDestinationFolder, "https://drive.google.com/drive/folders/atos");
});

test("código isolado não mantém vínculo automático inseguro", () => {
  const item = {
    disciplina: "LEGISLAÇÃO ESPECÍFICA – DIREITO PENAL",
    subtema: "19",
    factoryDestinationFolder: "https://drive.google.com/drive/folders/interceptacao",
    factoryDestinationFolderCatalogVersion: "v232"
  };
  const result = apply(item);
  assert.equal(result.status, "unsafe-managed-cleared");
  assert.equal(item.factoryDestinationFolder, undefined);
});
