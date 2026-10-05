const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { execFileSync } = require("node:child_process");

// V651 — medido em 05/10/2026 no navegador do usuário: ao abrir o site, a V232
// levava 5,9 s por rodada (881 itens × 1.318 pastas) e a V222 e a V232
// regravavam os mesmos 685 itens uma por cima da outra a cada salvamento.

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const V232 = "20260803-pastas-destino-temas-exatos-v232";
const V237 = "20260804-pastas-destino-classificacao-exata-v237";

function runtimeV232(source, items = [], cacheText = "null") {
  const state = { factoryAgenda: items, factoryItems: items, migrations: {} };
  const context = {
    console: { warn() {}, info() {}, error() {} },
    URLSearchParams, setTimeout: () => 0, clearTimeout, queueMicrotask: () => {},
    state,
    ensureFactoryAgenda: () => state.factoryAgenda,
    localStorage: { getItem: () => cacheText, setItem() {} },
    saveData: () => { context.saved = (context.saved || 0) + 1; }
  };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(source, context);
  return context;
}

// Árvore e itens sintéticos parecidos com os reais: disciplinas numeradas,
// grupos e temas com código, nomes de lei, temas sem pasta correspondente.
function syntheticData() {
  let seed = 651;
  const random = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
  const words = ["INQUERITO", "PRISAO", "TEMPORARIA", "PREVENTIVA", "FLAGRANTE", "PROVAS", "ILICITAS", "COMPETENCIA", "ARQUIVAMENTO", "ACAO", "PENAL", "PUBLICA", "PRIVADA", "RECURSOS", "NULIDADES", "CONCURSO", "PESSOAS", "CRIMES", "HEDIONDOS", "DROGAS", "ATOS", "ADMINISTRATIVOS", "PODER", "CONSTITUINTE", "DIREITOS", "FUNDAMENTAIS"];
  const disciplines = ["02_DIREITO_PROCESSUAL_PENAL", "01_DIREITO_PENAL", "04_DIREITO_CONSTITUCIONAL", "14_DIREITO_ADMINISTRATIVO", "03_LEGISLACAO_PENAL_EXTRAVAGANTE"];
  const rootId = "1fBp2Ibx4_acuP4fvIK26SKkVtLJmEcOJ";
  const folders = [];
  const topics = [];
  disciplines.forEach((name, d) => {
    const disciplineId = `d${d}`;
    folders.push({ id: disciplineId, name, parents: [rootId] });
    for (let g = 1; g <= 6; g += 1) {
      const groupId = `${disciplineId}-g${g}`;
      folders.push({ id: groupId, name: `${d + 1}.${g}_${words[(d * 7 + g) % words.length]}`, parents: [disciplineId] });
      for (let t = 1; t <= 8; t += 1) {
        const title = [0, 1, 2].map(() => words[Math.floor(random() * words.length)]).join("_");
        const topicName = t % 4 === 0 ? `${d + 1}.${g}.${t}_LEI_${8000 + t * 13}_${1990 + t}` : `${d + 1}.${g}.${t}_${title}`;
        folders.push({ id: `${groupId}-t${t}`, name: topicName, parents: [groupId] });
        topics.push({ discipline: name.replace(/^\d+_/, "").replace(/_/g, " "), name: topicName });
      }
    }
  });
  const items = [];
  for (let i = 0; i < 160; i += 1) {
    const topic = topics[Math.floor(random() * topics.length)];
    const variant = i % 5;
    const subject = variant === 0 ? topic.name.replace(/_/g, " ")
      : variant === 1 ? topic.name.replace(/^[\d.]+_/, "").replace(/_/g, " ").toLowerCase()
      : variant === 2 ? `${topic.name.split("_")[0]} assunto qualquer`
      : variant === 3 ? `tema solto ${i} sem pasta`
      : topic.name.replace(/^[\d.]+_/, "").split("_").slice(0, 2).join(" ");
    items.push({ id: `f${i}`, disciplina: i % 11 === 0 ? "Disciplina inexistente" : topic.discipline, tema: subject, subtema: i % 3 === 0 ? "subtema 1" : undefined });
  }
  return { folders, rootId, items };
}

const DESTINATION_FIELDS = ["factoryDestinationFolder", "factoryDestinationFolderCatalogVersion", "factoryDestinationFolderCatalogKey", "factoryDestinationFolderMatchType", "factoryDestinationFolderMatchTitle", "factoryDestinationFolderMatchScore", "factoryDestinationFolderMatchPath", "factoryDestinationFolderMatchId"];
const picked = (item) => Object.fromEntries(DESTINATION_FIELDS.map((key) => [key, item[key]]));

test("V651 a V232 escolhe exatamente as mesmas pastas que antes", () => {
  let original;
  try {
    original = execFileSync("git", ["show", "9a923a6:factory-destination-recursive-v232.js"], { cwd: root, encoding: "utf8" });
  } catch {
    return; // sem histórico git (cópia do site): a comparação não se aplica
  }
  const { folders, rootId, items } = syntheticData();
  const before = runtimeV232(original);
  const after = runtimeV232(read("factory-destination-recursive-v232.js"));
  const tree = before.__buildFactoryDestinationTreeV232(folders, rootId);
  let topics = 0;
  for (const source of items) {
    const a = structuredClone(source);
    const b = structuredClone(source);
    const ra = before.__applyFactoryDestinationToItemV232(a, tree);
    const rb = after.__applyFactoryDestinationToItemV232(b, tree);
    // Duas vezes no mesmo item: a segunda usa a memória.
    after.__applyFactoryDestinationToItemV232(structuredClone(source), tree);
    assert.equal(rb.status, ra.status, source.tema);
    assert.deepEqual(picked(b), picked(a), source.tema);
    if (ra.status === "topic") topics += 1;
  }
  assert.ok(topics > 20, `poucos temas vinculados no teste (${topics})`);
});

test("V651 a V232 não regrava item já classificado pela V237", () => {
  const api = runtimeV232(read("factory-destination-recursive-v232.js"));
  const rootId = api.__FACTORY_DESTINATION_ROOT_V232__;
  const tree = api.__buildFactoryDestinationTreeV232([
    { id: "disciplina-dpp", name: "02_DIREITO_PROCESSUAL_PENAL", parents: [rootId] },
    { id: "tema-arquivamento", name: "2.3.7_ARQUIVAMENTO", parents: ["disciplina-dpp"] }
  ], rootId);
  const classified = { discipline: "DIREITO PROCESSUAL PENAL", subject: "2.3.7 Arquivamento", factoryDestinationFolder: "https://drive.google.com/drive/folders/v237", factoryDestinationFolderCatalogVersion: V237 };
  const unmatched = { discipline: "DIREITO PROCESSUAL PENAL", subject: "2.3.7 Arquivamento", factoryDestinationFolderUnmatchedStamp: "x#y#topic-unmatched" };
  assert.equal(api.__applyFactoryDestinationToItemV232(classified, tree).changed, false);
  assert.equal(classified.factoryDestinationFolder, "https://drive.google.com/drive/folders/v237");
  assert.equal(classified.factoryDestinationFolderCatalogVersion, V237);
  assert.equal(api.__applyFactoryDestinationToItemV232(unmatched, tree).changed, false);
  assert.equal(unmatched.factoryDestinationFolder, undefined);
});

function runtimeV222(items) {
  const folder = (id, title) => ({ id, title, url: `https://drive.google.com/drive/folders/${id}` });
  const catalog = {
    version: "20260803-pastas-destino-fabrica-v222",
    disciplines: [{ key: "constitucional", folder: folder("const", "04_DIREITO_CONSTITUCIONAL"), aliases: ["DIREITO CONSTITUCIONAL"], topics: [folder("const-principios", "04_PRINCIPIOS_FUNDAMENTAIS")] }]
  };
  const state = { factoryAgenda: items, factoryItems: items, migrations: {} };
  const context = vm.createContext({
    console, Date, queueMicrotask, setTimeout: () => 0, clearTimeout, state,
    __FACTORY_DESTINATION_CATALOG_V222__: catalog,
    ensureFactoryAgenda: () => state.factoryAgenda,
    saveData: () => { context.saved = (context.saved || 0) + 1; }
  });
  vm.runInContext(read("factory-destination-folders-v222.js"), context);
  return context;
}

test("V651 a V222 não regrava item já gravado pela V232 ou pela V237", () => {
  const fromV232 = { disciplina: "Direito Constitucional", tema: "Princípios fundamentais", factoryDestinationFolder: "https://drive.google.com/drive/folders/sub-v232", factoryDestinationFolderCatalogVersion: V232, factoryDestinationFolderMatchType: "recursive-title-exact" };
  const fromV237 = { disciplina: "Direito Constitucional", tema: "Princípios fundamentais", factoryDestinationFolder: "https://drive.google.com/drive/folders/sub-v237", factoryDestinationFolderCatalogVersion: V237 };
  const unmatchedV237 = { disciplina: "Direito Constitucional", tema: "Princípios fundamentais", factoryDestinationFolderUnmatchedStamp: "x#y#topic-unmatched" };
  const fresh = { disciplina: "Direito Constitucional", tema: "Princípios fundamentais" };
  const context = runtimeV222([fromV232, fromV237, unmatchedV237, fresh]);
  const report = context.__applyFactoryDestinationFoldersV222();
  assert.equal(report.changed, 1, "só o item sem dono recebe a pasta da V222");
  assert.equal(fromV232.factoryDestinationFolder, "https://drive.google.com/drive/folders/sub-v232");
  assert.equal(fromV232.factoryDestinationFolderCatalogVersion, V232);
  assert.equal(fromV237.factoryDestinationFolder, "https://drive.google.com/drive/folders/sub-v237");
  assert.equal(unmatchedV237.factoryDestinationFolder, undefined);
  assert.equal(fresh.factoryDestinationFolder, "https://drive.google.com/drive/folders/const-principios");
});

test("V651 V222 e V232 alternadas param de regravar depois da primeira rodada", () => {
  const { folders, rootId } = syntheticData();
  const items = [{ disciplina: "Direito Constitucional", tema: "Princípios fundamentais" }, { disciplina: "Direito Processual Penal", tema: "2.1.1 qualquer" }];
  const v222 = runtimeV222(items);
  const builder = runtimeV232(read("factory-destination-recursive-v232.js"));
  const tree = builder.__buildFactoryDestinationTreeV232([...folders, { id: "pf", name: "04_PRINCIPIOS_FUNDAMENTAIS", parents: ["d2"] }], rootId);
  const v232 = runtimeV232(read("factory-destination-recursive-v232.js"), items, JSON.stringify({ cachedAt: Date.now(), tree }));
  v222.__applyFactoryDestinationFoldersV222();
  v232.__applyFactoryDestinationTreeV232(tree);
  const second222 = v222.__applyFactoryDestinationFoldersV222();
  const second232 = v232.__applyFactoryDestinationTreeV232(tree);
  assert.equal(second222.changed, 0);
  assert.equal(second232.changed, 0);
});

test("V651 rodada repetida da V232 com a mesma árvore fica muito mais rápida", () => {
  const { folders, rootId, items } = syntheticData();
  const big = Array.from({ length: 6 }, (_, copy) => items.map((item) => ({ ...item, id: `${item.id}-${copy}` }))).flat();
  const builder = runtimeV232(read("factory-destination-recursive-v232.js"));
  const tree = builder.__buildFactoryDestinationTreeV232(folders, rootId);
  const api = runtimeV232(read("factory-destination-recursive-v232.js"), big);
  const firstStart = process.hrtime.bigint();
  api.__applyFactoryDestinationTreeV232(tree);
  const first = Number(process.hrtime.bigint() - firstStart) / 1e6;
  const secondStart = process.hrtime.bigint();
  const report = api.__applyFactoryDestinationTreeV232(tree);
  const second = Number(process.hrtime.bigint() - secondStart) / 1e6;
  assert.equal(report.changed, 0);
  assert.ok(second < Math.max(40, first / 3), `segunda rodada ${second.toFixed(1)} ms; primeira ${first.toFixed(1)} ms`);
});

test("V651 mantém paridade raiz/docs das pastas de destino", () => {
  for (const file of ["factory-destination-recursive-v232.js", "factory-destination-folders-v222.js"]) {
    assert.equal(read(path.join("docs", file)).replace(/\r\n/g, "\n"), read(file).replace(/\r\n/g, "\n"), file);
  }
});

test("V651 a padronização do item da Fábrica guarda os carimbos da pasta de destino", () => {
  const script = read("script.js");
  const start = script.indexOf("function factoryDestinationControlFields(");
  assert.notEqual(start, -1);
  const end = script.indexOf("\nfunction normalizeFactoryItem(", start);
  const context = vm.createContext({});
  vm.runInContext(script.slice(start, end), context);
  const fields = context.factoryDestinationControlFields({
    factoryDestinationFolder: "https://drive.google.com/drive/folders/x",
    factoryDestinationFolderCatalogVersion: V237,
    factoryDestinationFolderTreeFingerprint: "3:a:b",
    factoryDestinationFolderUnmatchedStamp: undefined,
    tema: "Arquivamento"
  });
  assert.deepEqual({ ...fields }, { factoryDestinationFolderCatalogVersion: V237, factoryDestinationFolderTreeFingerprint: "3:a:b" });
  assert.match(script, /\.\.\.factoryDestinationControlFields\(item\),\r?\n\s+createdAt:/);
});
