const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const VERSION = "20260717-logo-aldus-meta-v41";
const rootLogo = fs.readFileSync("icons/aldus-meta-logo.svg", "utf8");
const docsLogo = fs.readFileSync("docs/icons/aldus-meta-logo.svg", "utf8");
const rootBranding = fs.readFileSync("aldus-meta-branding.js", "utf8");
const docsBranding = fs.readFileSync("docs/aldus-meta-branding.js", "utf8");
const rootServiceWorker = fs.readFileSync("service-worker.js", "utf8");
const docsServiceWorker = fs.readFileSync("docs/service-worker.js", "utf8");
const rootManifest = JSON.parse(fs.readFileSync("manifest.json", "utf8"));
const docsManifest = JSON.parse(fs.readFileSync("docs/manifest.json", "utf8"));

 test("logotipo Aldus Meta substitui a identidade anterior", () => {
  assert.match(rootLogo, />Aldus</);
  assert.match(rootLogo, />Meta</);
  assert.doesNotMatch(rootLogo, />NS</);
  assert.match(rootBranding, /\.topbar \.brand/);
  assert.match(rootBranding, /icons\/aldus-meta-logo\.svg/);
  assert.match(rootBranding, /Aldus Meta — Metas de Estudo/);
});

test("manifesto e ícones usam Aldus Meta", () => {
  assert.equal(rootManifest.name, "Aldus Meta — Metas de Estudo");
  assert.equal(rootManifest.short_name, "Aldus Meta");
  assert.deepEqual(rootManifest, docsManifest);
  assert.match(fs.readFileSync("icons/logo-mark.svg", "utf8"), /Símbolo Aldus Meta/);
  assert.match(fs.readFileSync("icons/icon.svg", "utf8"), /Ícone Aldus Meta/);
  assert.match(fs.readFileSync("icons/icon-maskable.svg", "utf8"), /Ícone adaptável Aldus Meta/);
});

test("v41 renova cache e carrega a marca no site e no app", () => {
  assert.match(rootServiceWorker, new RegExp(VERSION));
  assert.match(rootServiceWorker, /startup-v15/);
  assert.match(rootServiceWorker, /aldus-meta-branding\.js/);
  assert.match(rootServiceWorker, /icons\/aldus-meta-logo\.svg/);
  assert.match(rootServiceWorker, /data-aldus-meta-branding="v41"/);
});

test("raiz e docs publicam arquivos idênticos", () => {
  assert.equal(rootLogo, docsLogo);
  assert.equal(rootBranding, docsBranding);
  assert.equal(rootServiceWorker, docsServiceWorker);
  assert.equal(fs.readFileSync("icons/logo-mark.svg", "utf8"), fs.readFileSync("docs/icons/logo-mark.svg", "utf8"));
  assert.equal(fs.readFileSync("icons/icon.svg", "utf8"), fs.readFileSync("docs/icons/icon.svg", "utf8"));
  assert.equal(fs.readFileSync("icons/icon-maskable.svg", "utf8"), fs.readFileSync("docs/icons/icon-maskable.svg", "utf8"));
});
