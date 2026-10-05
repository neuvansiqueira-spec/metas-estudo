const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

// V652 — 05/10/2026: a faixa "Google Drive: autorização vencida" voltava a cada
// recarga (a autorização só existia na memória da aba; agora fica no
// sessionStorage da aba) e o segundo Reconectar
// da mesma aba nunca terminava (a resposta do Google ia para o primeiro pedido).

const root = path.resolve(__dirname, "..");
const script = fs.readFileSync(path.join(root, "script.js"), "utf8");
const KEY = "aldusGoogleDriveTokenV652";

function tokenBlock() {
  const start = script.indexOf('let googleDriveAccessToken = "";');
  const end = script.indexOf("async function driveFetch(", start);
  assert.ok(start > 0 && end > start, "trecho da autorização não encontrado");
  return script.slice(start, end);
}

function runtime(storage = new Map()) {
  const google = { requests: [], client: null };
  const context = {
    console, Date, Promise, Error, Number, String, Boolean,
    sessionStorage: {
      getItem: (key) => (storage.has(key) ? storage.get(key) : null),
      setItem: (key, value) => storage.set(key, String(value)),
      removeItem: (key) => storage.delete(key)
    },
    navigator: { onLine: true },
    document: { querySelector: () => null },
    GOOGLE_CLIENT_ID: "cliente", GOOGLE_DRIVE_SCOPE: "escopo",
    isGoogleClientConfigured: () => true,
    googleClientConfigMessage: () => ""
  };
  context.window = context;
  context.google = {
    accounts: {
      oauth2: {
        initTokenClient(config) {
          google.client = config;
          return { requestAccessToken: (options) => google.requests.push(options) };
        }
      }
    }
  };
  vm.createContext(context);
  vm.runInContext(`${tokenBlock()}\nglobalThis.__api = { getAccessToken, hasValidGoogleDriveAccessToken, clearGoogleDriveAccessToken, restoreGoogleDriveAccessToken };`, context);
  return { api: context.__api, google, storage };
}

test("V652 o segundo Reconectar na mesma aba termina", async () => {
  const { api, google } = runtime();
  const first = api.getAccessToken({ prompt: "consent" });
  await new Promise((resolve) => setImmediate(resolve));
  google.client.callback({ access_token: "token-1", expires_in: 3600 });
  assert.equal(await first, "token-1");

  api.clearGoogleDriveAccessToken();
  const second = api.getAccessToken({ prompt: "consent" });
  await new Promise((resolve) => setImmediate(resolve));
  google.client.callback({ access_token: "token-2", expires_in: 3600 });
  const result = await Promise.race([second, new Promise((resolve) => setTimeout(() => resolve("preso"), 200))]);
  assert.equal(result, "token-2");
});

test("V652 a autorização vale depois de recarregar, até vencer", async () => {
  const storage = new Map();
  const first = runtime(storage);
  const pending = first.api.getAccessToken();
  await new Promise((resolve) => setImmediate(resolve));
  first.google.client.callback({ access_token: "token-guardado", expires_in: 3600 });
  await pending;
  assert.match(storage.get(KEY), /^\d+\|token-guardado$/);

  const reloaded = runtime(storage);
  assert.equal(reloaded.api.hasValidGoogleDriveAccessToken(), true);
  assert.equal(await reloaded.api.getAccessToken(), "token-guardado");
  assert.equal(reloaded.google.requests.length, 0, "não abre a janela do Google");
});

test("V652 autorização vencida não volta e é apagada", () => {
  const storage = new Map([[KEY, `${Date.now() - 1000}|velho`]]);
  const { api } = runtime(storage);
  assert.equal(api.hasValidGoogleDriveAccessToken(), false);
  assert.equal(storage.has(KEY), false);
});

test("V652 Desconectar apaga a autorização guardada", () => {
  const storage = new Map([[KEY, `${Date.now() + 3600000}|ativo`]]);
  const { api } = runtime(storage);
  assert.equal(api.hasValidGoogleDriveAccessToken(), true);
  api.clearGoogleDriveAccessToken();
  assert.equal(storage.has(KEY), false);
  assert.equal(api.hasValidGoogleDriveAccessToken(), false);
});

test("V652 janela do Google fechada encerra o pedido com erro", async () => {
  const { api, google } = runtime();
  const pending = api.getAccessToken({ prompt: "consent" });
  await new Promise((resolve) => setImmediate(resolve));
  google.client.error_callback({ type: "popup_closed" });
  await assert.rejects(pending, /popup_closed/);
});

test("V652 o token fica só na aba (sessionStorage), nunca no localStorage", () => {
  const block = tokenBlock();
  assert.doesNotMatch(block, /localStorage\??\./);
  assert.match(block, /sessionStorage/);
});
