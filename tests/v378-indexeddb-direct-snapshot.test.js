// V378 final contract: runtime unchanged; this commit only refreshes CI against the clean base.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

function sourceBetween(source, start, end) {
  const from = source.indexOf(start);
  const to = source.indexOf(end, from + start.length);
  assert.notEqual(from, -1, `Marcador inicial ausente: ${start}`);
  assert.notEqual(to, -1, `Marcador final ausente: ${end}`);
  return source.slice(from, to);
}

test("V378 elimina clone profundo da fila IndexedDB", () => {
  const script = fs.readFileSync("script.js", "utf8");
  const queue = sourceBetween(script, "async function processIndexedDBStateCopyQueue()", "function persistStateSafely(options = {})");
  assert.doesNotMatch(queue, /cloneData\(state\)/);
  assert.match(queue, /saveStateToIndexedDB\(state, \{ directSnapshot: true \}\)/);
  assert.match(queue, /statesMatchIndexedDBRecord\(null, reloaded, record\.checksum\)/);
  assert.match(queue, /indexedDBStatus\.size = Number\(record\.serializedSize\) \|\| 0/);
});

test("V378 mantém o hot path sem clone e a gravação direta dentro de transação atômica", () => {
  const source = fs.readFileSync("storage-indexeddb.js", "utf8");
  const save = sourceBetween(source, "async function saveStateToIndexedDB(state, options = {})", "function loadStateFromIndexedDB()");
  assert.match(save, /if \(options\.directSnapshot \|\| options\.detachedSnapshot\)/);
  assert.match(save, /return saveIndexedDBStateAtomically\(source, options\)/);
  assert.match(save, /options\.detachedSnapshot/);
  assert.match(save, /structuredClone\(source\)/);
  const atomic = sourceBetween(source, "function saveIndexedDBStateAtomically(source, options = {})", "async function saveStateToIndexedDB(state, options = {})");
  assert.match(atomic, /const serializedState = JSON\.stringify\(resolved\.data\)/);
  assert.match(atomic, /store\.put\(record\)/);
});

test("V378 preserva proteção contra estado vazio", () => {
  const source = fs.readFileSync("storage-indexeddb.js", "utf8");
  assert.match(source, /Proteção ativada: estado vazio não substitui IndexedDB válido/);
  assert.match(source, /validateIndexedDBState\(existing\)/);
  assert.match(source, /indexedDBStateHasUserData\(current\.data\)/);
});

test("V378 mantém raiz e docs sincronizados", () => {
  assert.equal(fs.readFileSync("script.js", "utf8"), fs.readFileSync("docs/script.js", "utf8"));
  assert.equal(fs.readFileSync("storage-indexeddb.js", "utf8"), fs.readFileSync("docs/storage-indexeddb.js", "utf8"));
});

test("bundle V378 incorpora o caminho direto quando gerado", { skip: !fs.existsSync("app-v378.js") }, () => {
  const bundle = fs.readFileSync("app-v378.js", "utf8");
  assert.match(bundle, /20260823-indexeddb-direct-snapshot-v378/);
  assert.match(bundle, /saveStateToIndexedDB\(state, \{ directSnapshot: true \}\)/);
  assert.doesNotMatch(sourceBetween(bundle, "async function processIndexedDBStateCopyQueue()", "function persistStateSafely(options = {})"), /cloneData\(state\)/);
});
