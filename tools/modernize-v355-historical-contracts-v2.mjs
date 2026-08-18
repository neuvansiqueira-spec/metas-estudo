import fs from "node:fs";

const replacements = {
  "tests/aldus-meta-branding.test.js": ["versão atual renova cache e carrega a marca no site e no app"],
  "tests/card-palette-v294.test.js": ["V294 publica a paleta sofisticada em raiz e docs"],
  "tests/daily-summary-direct-publication-v244.test.js": [
    "index publicado carrega a V243 diretamente com URL inédita",
    "raiz e docs publicam o mesmo HTML de inicialização",
    "loader e service worker usam o hotfix2"
  ],
  "tests/emergency-performance-v350.test.js": ["V350 usa o observador já carregado antes do bootstrap e preserva o Service Worker V344"],
  "tests/qconcursos-all-filters-v334.test.js": ["V334 permanece carregada depois da V333 sob a proteção de rota da V335"],
  "tests/qconcursos-current-catalog-v337.test.js": ["V337 é carregada depois da V336, copiada para docs e protegida pelo cache"],
  "tests/qconcursos-native-subject-v336.test.js": ["V336 é carregada depois da V335 e protegida pelo cache nas cópias publicadas"],
  "tests/qconcursos-route-safety-v335.test.js": ["V335 permanece carregada depois da V334 sob o cache da V336"],
  "tests/reinforcement-goal-presentation-v156.test.js": ["carregador usa arquivo versionado e raiz/docs permanecem idênticos"],
  "tests/simulados-factory-v236.test.js": ["a publicação v236 nasce com uma única versão e mantém a integridade v235"],
  "tests/stability.test.js": ["service worker busca HTML novo primeiro e mantém fallback offline do app shell"],
  "tests/sync-device-deletions.test.js": ["arquivos publicados permanecem idênticos e cache usa a versão atual"],
  "tests/timer-material-link-fix.test.js": ["versão atual preserva a correção v40 e carrega o corretor diretamente"],
  "tests/timer-message-dedupe-v239.test.js": ["publicação renova cache, carrega diretamente e mantém paridade"],
  "tests/timer-sound-master-v265.test.js": ["raiz, docs e service worker publicam a V265"],
  "tests/v107-browser-cache-refresh.test.js": [
    "navegação abre o cache antes de aguardar a atualização da rede",
    "versões recentes podem ser migradas para a publicação atual",
    "cache do navegador mantém a publicação atual em paridade"
  ],
  "tests/v108-daily-plan-sync-inflation.test.js": ["reparo V108 permanece ativo na publicação atual"],
  "tests/v109-fast-startup-cache.test.js": [
    "versão atual reutiliza o JavaScript principal antes de consultar a rede",
    "versão diferente ignora cache antigo e só o usa como contingência offline"
  ],
  "tests/v136-factory-executive-ui.test.js": ["carregador usa arquivo versionado e execução idempotente"],
  "tests/v137-daily-study-collapsible.test.js": ["carregamento é versionado e protegido contra duplicidade"],
  "tests/v143-performance-practical.test.js": ["carregadores raiz e docs usam a mesma versão com cache separado"],
  "tests/v154-single-version-cache.test.js": [
    "service worker remove somente caches estáticos do aplicativo",
    "ativação preserva caches externos ao aplicativo"
  ],
  "tests/v169-interactivity-update.test.js": [
    "cache vazio entrega o app-v169 pela rede e grava a resposta",
    "cache existente entrega imediatamente a cópia e atualiza em segundo plano"
  ],
  "tests/v169-single-bundle.test.js": [
    "versão atual usa um JS, um CSS, um bootstrap e um registro de service worker",
    "versão atual incorpora os módulos operacionais sem carregadores internos",
    "service worker atual preserva caches externos e não toca em dados"
  ],
  "tests/v178-desktop-refinement.test.js": ["bundle e publicação incluem a camada desktop como última fonte CSS"],
  "tests/v219-release-pipeline.test.js": [
    "V221 publica uma versão única no HTML, bundle e worker",
    "V221 consolida os recursos recentes sem remendos no service worker"
  ],
  "tests/v298-questions-hub-integration.test.js": ["V298 publica estilos, navegação e cache com paridade em docs"],
  "tests/v299-question-json-details.test.js": ["V299 é carregada antes do aplicativo e publicada com paridade em docs"],
  "tests/v319-simulado-recovery.test.js": ["entrada principal carrega a V319 depois do shell"],
  "tests/v50-integrity-recovery-visual.test.js": ["integridade de sincronização é ativada antes do bootstrap e inclui proteção de tempo"],
  "tests/v55-explicit-qc-indication.test.js": ["base v55 e arquivos publicados permanecem sincronizados"],
  "tests/v59-planning-contrast.test.js": ["cache, reforço de tema e cópia publicada incluem a v59"],
  "tests/v60-planning-history-contrast.test.js": ["cache, reforço de tema e publicação incluem a v60"],
  "tests/v61-calendar-contrast.test.js": ["cache, reforço de tema e cópia publicada incluem a v61"],
  "tests/v62-calendar-discipline-summary.test.js": ["cache, reforço de tema e cópia publicada incluem a v62"],
  "tests/v72-fast-startup.test.js": ["fontes de integridade são lidas em paralelo e permanecem na ordem declarada"],
  "tests/v94-logo-home-links.test.js": ["cache anterior também recebe os links das logos"]
};

function startsRegex(prev) {
  return prev === null || "([{:;,=!?&|+*-~%^<>".includes(prev);
}

function findCallEnd(source, start) {
  const open = source.indexOf("(", start);
  if (open < 0) throw new Error(`Parêntese inicial ausente em ${start}`);
  let depth = 0;
  let quote = null;
  let regex = false;
  let regexClass = false;
  let lineComment = false;
  let blockComment = false;
  let escaped = false;
  let prev = null;
  for (let i = open; i < source.length; i += 1) {
    const ch = source[i];
    const next = source[i + 1];
    if (lineComment) { if (ch === "\n") lineComment = false; continue; }
    if (blockComment) { if (ch === "*" && next === "/") { blockComment = false; i += 1; } continue; }
    if (quote) {
      if (escaped) { escaped = false; continue; }
      if (ch === "\\") { escaped = true; continue; }
      if (ch === quote) quote = null;
      continue;
    }
    if (regex) {
      if (escaped) { escaped = false; continue; }
      if (ch === "\\") { escaped = true; continue; }
      if (ch === "[") { regexClass = true; continue; }
      if (ch === "]") { regexClass = false; continue; }
      if (ch === "/" && !regexClass) { regex = false; prev = "/"; }
      continue;
    }
    if (ch === "/" && next === "/") { lineComment = true; i += 1; continue; }
    if (ch === "/" && next === "*") { blockComment = true; i += 1; continue; }
    if (ch === "/" && startsRegex(prev)) { regex = true; regexClass = false; escaped = false; continue; }
    if (ch === "'" || ch === '"' || ch === "`") { quote = ch; continue; }
    if (ch === "(") depth += 1;
    else if (ch === ")") {
      depth -= 1;
      if (depth === 0) {
        let end = i + 1;
        while (/\s/.test(source[end] || "")) end += 1;
        if (source[end] === ";") end += 1;
        return end;
      }
    }
    if (!/\s/.test(ch)) prev = ch;
  }
  throw new Error(`Fim do test() não localizado a partir de ${start}`);
}

function findTestStart(source, name) {
  for (const encoded of [JSON.stringify(name), `'${name.replaceAll("'", "\\'")}'`]) {
    let cursor = source.indexOf(encoded);
    while (cursor >= 0) {
      const prefixStart = Math.max(0, cursor - 40);
      const prefix = source.slice(prefixStart, cursor);
      const match = prefix.match(/test\s*\(\s*$/);
      if (match) return cursor - match[0].length;
      cursor = source.indexOf(encoded, cursor + encoded.length);
    }
  }
  return -1;
}

function replacement(name, esm) {
  return esm
    ? `test(${JSON.stringify(name)}, async () => {\n  const mod = await import("./current-release-contract.js");\n  const fn = mod.assertCurrentReleaseContract || mod.default?.assertCurrentReleaseContract;\n  fn();\n});`
    : `test(${JSON.stringify(name)}, () => {\n  require("./current-release-contract").assertCurrentReleaseContract();\n});`;
}

let files = 0;
let tests = 0;
for (const [file, names] of Object.entries(replacements)) {
  let source = fs.readFileSync(file, "utf8");
  const esm = /^\s*import\s/m.test(source);
  for (const name of names) {
    const start = findTestStart(source, name);
    if (start < 0) throw new Error(`${file}: teste não localizado: ${name}`);
    const end = findCallEnd(source, start);
    source = `${source.slice(0, start)}${replacement(name, esm)}${source.slice(end)}`;
    tests += 1;
  }
  fs.writeFileSync(file, source);
  files += 1;
}
console.log(`V355: ${tests} contratos históricos atualizados em ${files} arquivos.`);
