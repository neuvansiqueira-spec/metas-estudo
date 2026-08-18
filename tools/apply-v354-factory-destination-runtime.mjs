import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const write = (path, content) => fs.writeFileSync(path, content, "utf8");
const replaceOnce = (source, before, after, label) => {
  if (!source.includes(before)) throw new Error(`V354: marcador ausente: ${label}`);
  return source.replace(before, after);
};

const CLASSIFICATION_VERSION = "20260804-pastas-destino-classificacao-exata-v237";
const RUNTIME_VERSION = "20260818-factory-destination-on-demand-v354";
const HOTFIX = "factory-destination-on-demand-v354";

let factory = read("factory-destination-integrity-v237.js");
factory = replaceOnce(
  factory,
  `  const VERSION = "${CLASSIFICATION_VERSION}";\n`,
  `  const VERSION = "${CLASSIFICATION_VERSION}";\n  const RUNTIME_VERSION = "${RUNTIME_VERSION}";\n`,
  "versão de runtime"
);

const oldTail = `  function wrap(name) { try { const fn = globalThis[name]; if (typeof fn !== "function" || fn.__destinationV237) return; const wrapped = name === "checkCloudForUpdatesAfterAuth" ? async function(...args) { const r = await fn.apply(this, args); await refresh(); return r; } : function(...args) { const r = fn.apply(this, args); queueMicrotask(() => refresh()); return r; }; Object.defineProperty(wrapped, "__destinationV237", { value: true }); Object.defineProperty(wrapped, "__aldusOriginal", { value: fn }); globalThis[name] = wrapped; } catch {} }\n  function install() { wrap("syncFactoryWithActiveEdital"); wrap("checkCloudForUpdatesAfterAuth"); }\n  function showVersion() { if (typeof document === "undefined") return; document.documentElement.dataset.aldusReleaseVersion = VERSION; document.querySelectorAll(".app-version").forEach(e => { e.textContent = \`Versão: \${VERSION}\`; }); }\n\n  const api = Object.freeze({ version: VERSION, rootId: ROOT, resolveDiscipline: discipline, resolveTopic: topic, applyEntry, applyTree, applyCached, refresh, audit: () => globalThis.__factoryDestinationFoldersV237Report || null });\n  Object.defineProperty(globalThis, FLAG, { value: api });\n  Object.defineProperties(globalThis, { __resolveFactoryDestinationDisciplineV237: { value: discipline, configurable: true }, __resolveFactoryDestinationTopicV237: { value: topic, configurable: true }, __applyFactoryDestinationToEntryV237: { value: applyEntry, configurable: true }, __applyFactoryDestinationTreeV237: { value: applyTree, configurable: true }, __refreshFactoryDestinationFoldersV237: { value: refresh, configurable: true } });\n  if (typeof document === "undefined") return;\n  showVersion(); install(); applyCached();\n  setTimeout(() => { install(); applyCached(); }, 1500);\n  setTimeout(() => refresh(), 2300);\n  const timer = setInterval(install, 250); setTimeout(() => clearInterval(timer), 15000);\n  addEventListener("hashchange", () => { if (location.hash === "#fabrica-resumos") { showVersion(); queueMicrotask(() => refresh()); } });\n})();\n`;

const newTail = `  const isFactoryRoute = () => typeof location !== "undefined" && location.hash === "#fabrica-resumos";\n  let automaticApplyQueued = false;\n\n  function queueFactoryApply() {\n    if (!isFactoryRoute() || automaticApplyQueued) return false;\n    automaticApplyQueued = true;\n    const run = () => {\n      automaticApplyQueued = false;\n      if (!isFactoryRoute()) return;\n      try { applyCached(); } catch (error) { console.warn(\`[\${RUNTIME_VERSION}] Falha ao aplicar Pasta destino sob demanda.\`, error); }\n    };\n    if (typeof requestIdleCallback === "function") requestIdleCallback(run, { timeout: 750 });\n    else setTimeout(run, 0);\n    return true;\n  }\n\n  function wrap(name) {\n    try {\n      const fn = globalThis[name];\n      if (typeof fn !== "function" || fn.__destinationV237) return;\n      const wrapped = name === "checkCloudForUpdatesAfterAuth"\n        ? async function(...args) { const r = await fn.apply(this, args); queueFactoryApply(); return r; }\n        : function(...args) { const r = fn.apply(this, args); queueFactoryApply(); return r; };\n      Object.defineProperty(wrapped, "__destinationV237", { value: true });\n      Object.defineProperty(wrapped, "__aldusOriginal", { value: fn });\n      globalThis[name] = wrapped;\n    } catch {}\n  }\n  function install() { wrap("syncFactoryWithActiveEdital"); wrap("checkCloudForUpdatesAfterAuth"); }\n  function showVersion() { if (typeof document === "undefined") return; document.documentElement.dataset.aldusReleaseVersion = VERSION; document.querySelectorAll(".app-version").forEach(e => { e.textContent = \`Versão: \${VERSION}\`; }); }\n\n  const api = Object.freeze({ version: VERSION, runtimeVersion: RUNTIME_VERSION, rootId: ROOT, resolveDiscipline: discipline, resolveTopic: topic, applyEntry, applyTree, applyCached, refresh, queueFactoryApply, audit: () => globalThis.__factoryDestinationFoldersV237Report || null });\n  Object.defineProperty(globalThis, FLAG, { value: api });\n  Object.defineProperties(globalThis, { __resolveFactoryDestinationDisciplineV237: { value: discipline, configurable: true }, __resolveFactoryDestinationTopicV237: { value: topic, configurable: true }, __applyFactoryDestinationToEntryV237: { value: applyEntry, configurable: true }, __applyFactoryDestinationTreeV237: { value: applyTree, configurable: true }, __refreshFactoryDestinationFoldersV237: { value: refresh, configurable: true } });\n  if (typeof document === "undefined") return;\n\n  // V354: no boot normal apenas instala os wrappers leves. A reconciliação O(itens × pastas)\n  // fica restrita à área da Fábrica ou a chamadas explícitas da API existente.\n  install();\n  if (isFactoryRoute()) { showVersion(); queueFactoryApply(); }\n  addEventListener("hashchange", () => { if (isFactoryRoute()) { showVersion(); queueFactoryApply(); } });\n})();\n`;
factory = replaceOnce(factory, oldTail, newTail, "remoção da reconciliação pesada do boot");
write("factory-destination-integrity-v237.js", factory);
write("docs/factory-destination-integrity-v237.js", factory);

let loader = read("planning-integrity-loader-v235.js");
loader = replaceOnce(
  loader,
  '  const FACTORY_DESTINATION_HOTFIX = "discipline-topic-exact1";',
  `  const FACTORY_DESTINATION_HOTFIX = "${HOTFIX}";`,
  "cache bust do loader da Pasta destino"
);
write("planning-integrity-loader-v235.js", loader);
write("docs/planning-integrity-loader-v235.js", loader);

let worker = read("service-worker.js");
worker = replaceOnce(
  worker,
  'const FACTORY_DESTINATION_INTEGRITY = "factory-destination-integrity-v237.js?v=20260804-pastas-destino-classificacao-exata-v237&hotfix=discipline-topic-exact1";',
  `const FACTORY_DESTINATION_INTEGRITY = "factory-destination-integrity-v237.js?v=${CLASSIFICATION_VERSION}&hotfix=${HOTFIX}";`,
  "cache bust do asset V237"
);
worker = replaceOnce(
  worker,
  "-qconcursos-filter-v337-navigation-bootstrap-v353-bootstrap-fast-path-v351`;",
  "-qconcursos-filter-v337-factory-destination-runtime-v354-navigation-bootstrap-v353-bootstrap-fast-path-v351`;",
  "rotação de cache V354"
);
for (const path of ["service-worker.js", "service-worker-v344.js", "docs/service-worker.js", "docs/service-worker-v344.js"]) write(path, worker);

console.log("V354 aplicada: Pasta destino não reconcilia no boot normal; execução pesada ficou sob demanda, com cache novo.");
