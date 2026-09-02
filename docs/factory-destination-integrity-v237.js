/* Classificação exata das pastas Word/PDF da Fábrica de Resumos — v237. */
(() => {
  "use strict";
  const VERSION = "20260804-pastas-destino-classificacao-exata-v237";
  const RUNTIME_VERSION = "20260818-factory-destination-on-demand-v354";
  const ROOT = "1fBp2Ibx4_acuP4fvIK26SKkVtLJmEcOJ";
  const FLAG = "__ALDUS_FACTORY_DESTINATION_INTEGRITY_V237__";
  const CACHE_KEYS = ["aldusFactoryDestinationTreeV237", "aldusFactoryDestinationTreeV232", "aldusFactoryDestinationTreeV230"];
  const MANAGED = "factoryDestinationFolderCatalogVersion";
  const TREE_FINGERPRINT = "factoryDestinationFolderTreeFingerprint";
  if (globalThis[FLAG]) return;

  const RULES = Object.freeze([
    ["1Y9vWWHJGWgMkXPpVpXDFscnRbUoI2v0O", ["DIREITO PENAL"]],
    ["1H9u60GtGtZDa2f0Q5Et8FhDkYiH2twss", ["DIREITO PROCESSUAL PENAL", "PROCESSO PENAL"]],
    ["1BUnSeaPTKVgjgyrfo48rYQ19AuSgSCpr", ["LEGISLACAO PENAL E LEGISLACAO PROCESSUAL PENAL EXTRAVAGANTE", "LEGISLACAO PENAL E PROCESSUAL PENAL EXTRAVAGANTE"]],
    ["1y3bie8cMpTvJoJAGJRig-gZ1i7r0cT3L", ["DIREITO CONSTITUCIONAL"]],
    ["1u5QOY9Hu0PYTT_Mu41y5LZt8efvsVw-H", ["DIREITO ADMINISTRATIVO E GESTAO PUBLICA", "ADMINISTRATIVO E GESTAO PUBLICA"]],
    ["11rMkYAnmP9XMtieM4dCQ9ii5zn7RheSt", ["LEGISLACAO ESTADUAL E INSTITUCIONAL", "LEGISLACAO INSTITUCIONAL"]],
    ["1BRHTJaRS87crPv5D9fxjQm3QTCEgTzEF", ["DIREITOS HUMANOS"]],
    ["1UXzrreLWhOIAK8LbCFAR0xtw4dpIJUyt", ["CIENCIAS FORENSES", "CIENCIA FORENSE"]],
    ["13l1RBskLyTZlajUtJl0wpDD-9m6ZpOzg", ["DIREITO DIGITAL"]],
    ["1m0B1eno3dw851gvQAWEgSBqi5JjziQa_", ["DIREITO CIVIL"]],
    ["130slEt9D1I0bKydHBtgZKDUy8iBcEakn", ["DIREITO PROCESSUAL CIVIL", "PROCESSO CIVIL"]],
    ["15e8dr4mzXhVhjrXR7PcgCOvHnyKVGr8m", ["DIREITO AGRARIO"]],
    ["1oo_ONgYUjNo86XqHj7wLm-EStbvUXuaR", ["DIREITO AMBIENTAL"]],
    ["1xnzmOhZSQYffoOPgiQejz3d8-Z3vUWdY", ["DIREITO ADMINISTRATIVO"]],
    ["1ohso1lDYGhF_R9UfrTCFypu9LO5lZ3jL", ["MEDICINA LEGAL"]],
    ["1h32SI1Gu8GRUGmScMI5Ag7c98gC6A5xC", ["LEGISLACAO PENAL E PROCESSUAL PENAL ESPECIAL", "LEGISLACAO ESPECIFICA DIREITO PENAL", "LEGISLACAO ESPECIAL DIREITO PENAL"]],
    ["1Q-sx2L667jqez8E8LJ4e4msu1PNN_H_4", ["CRIMINOLOGIA"]],
    ["1lzFW6Z5Ip0m5l5fuUhkw6D8Oi6AWRulO", ["PECA PARA DELEGADO DE POLICIA CIVIL", "PECA PRATICA PARA DELEGADO DE POLICIA CIVIL", "PECA PRATICO PROFISSIONAL"]]
  ]);
  const STOP = new Set("A AO AOS AS COM DA DAS DE DO DOS E EM NA NAS NO NOS O OS PARA POR QUE UM UMA APLICAVEL APLICAVEIS ASPECTO ASPECTOS BRASIL BRASILEIRA BRASILEIRO DIREITO ESTADUAL FEDERAL LEI LEIS N NUMERO".split(" "));
  const BLOCK = /\b(AUDIO|AUDIOS|LEGADO|CLASSIFICAR|PENDENTE|PENDENTES|MATERIAL COMPLEMENTAR|MATERIAIS COMPLEMENTARES|FONTES|PASTA MAE|SELECIONADO|VIAGEM)\b/;
  let applying = false;

  const canon = (v = "") => String(v ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/[º°ª]/g, "").replace(/[^A-Z0-9]+/g, " ").replace(/\s+/g, " ").trim();
  const strip = (v = "") => canon(v).replace(/^(?:ITEM\s+)?\d+(?:\s+\d+){0,5}(?=\s+[A-Z])\s+/, "").trim();
  const code = (v = "") => { const m = String(v ?? "").trim().match(/^(?:ITEM\s*)?(\d+(?:[._-]\d+){0,5})(?=\D|$)/i); return m ? m[1].split(/[._-]+/).map(x => String(Number(x))).join(".") : ""; };
  const bare = (v = "") => /^(?:SUBTEMA(?:S)?(?: DO EDITAL)? )?\d+(?: \d+){0,5}$/.test(canon(v));
  const tokenSet = (v = "") => new Set(strip(v).split(" ").filter(x => x.length > 1 && !STOP.has(x) && !/^\d+$/.test(x)));
  const jac = (a, b) => { const x = tokenSet(a), y = tokenSet(b); if (!x.size || !y.size) return 0; let i = 0; x.forEach(t => { if (y.has(t)) i++; }); return i / (x.size + y.size - i); };
  const sig = (v = "") => { const n = strip(v).split(" ").filter(x => /^\d+$/.test(x)); const years = new Set(n.filter(x => /^(?:18|19|20)\d{2}$/.test(x))); const laws = new Set(n.filter(x => x.length >= 3 && !years.has(x)).map(x => String(Number(x)))); return { years, laws }; };
  const overlap = (a, b) => ({ years: [...a.years].filter(x => b.years.has(x)), laws: [...a.laws].filter(x => b.laws.has(x)) });
  const itemOf = e => e?.item && typeof e.item === "object" ? e.item : e;
  const url = id => `https://drive.google.com/drive/folders/${id}`;
  const unique = a => [...new Set(a.filter(Boolean).map(String))];
  function treeFingerprint(tree) {
    const ids = (tree?.nodes || []).map(node => String(node?.id ?? "")).sort();
    let fnv = 2166136261, djb = 5381;
    ids.forEach(id => {
      for (let index = 0; index <= id.length; index++) {
        const unit = index < id.length ? id.charCodeAt(index) : 0;
        fnv = Math.imul(fnv ^ unit, 16777619);
        djb = Math.imul(djb, 33) ^ unit;
      }
    });
    return `${ids.length}:${(fnv >>> 0).toString(36)}:${(djb >>> 0).toString(36)}`;
  }

  function disciplines(entry = {}) {
    const i = itemOf(entry), g = Array.isArray(entry?.goals) ? entry.goals[0] || {} : entry?.goal || {};
    return unique([i.disciplina, i.discipline, i.materia, i.subjectDiscipline, entry.disciplina, entry.discipline, g.disciplina, g.discipline, i.editalLink?.discipline, i.editalVinculo?.discipline]);
  }
  function evidence(entry = {}) {
    const i = itemOf(entry), g = Array.isArray(entry?.goals) ? entry.goals[0] || {} : entry?.goal || {};
    const primary = unique([i.tema, i.theme, i.assunto, i.subject, i.topico, i.topic, i.reference, i.referencia, i.title, i.titulo, entry.tema, entry.theme, entry.assunto, entry.subject, g.baseSubject, g.subject, g.assunto, i.editalLink?.subject, i.editalLink?.topic, i.editalLink?.groupKey, i.editalVinculo?.subject, i.editalVinculo?.topic]);
    const secondary = unique([i.subtema, i.subtheme, entry.subtema, entry.subtheme, g.subtopic, g.subassunto, ...(i.editalSubtemas || []), ...(i.subtemasEdital || []), ...(entry.subtopics || [])]);
    const out = primary.map(text => ({ text, weight: 1 })).concat(secondary.map(text => ({ text, weight: .72 })));
    primary.forEach(p => secondary.forEach(s => { if (!bare(p) || !bare(s)) out.push({ text: `${p} ${s}`, weight: 1.05 }); }));
    const seen = new Set();
    return out.filter(x => { const k = `${canon(x.text)}|${x.weight}`; if (!x.text.trim() || seen.has(k)) return false; seen.add(k); return true; });
  }

  function discipline(entry, tree) {
    const nodes = new Map((tree?.nodes || []).map(n => [n.id, n]));
    const inputs = disciplines(entry).map(canon);
    for (const input of inputs) for (const [id, aliases] of RULES) if (aliases.some(a => canon(a) === input) && nodes.has(id)) return { node: nodes.get(id), score: 1000, reason: "discipline-exact" };
    const ranked = RULES.map(([id, aliases]) => ({ node: nodes.get(id), score: Math.max(0, ...inputs.flatMap(input => aliases.map(alias => jac(input, alias)))) })).filter(x => x.node).sort((a, b) => b.score - a.score);
    if (!ranked[0] || ranked[0].score < .78 || (ranked[1] && ranked[0].score - ranked[1].score < .18)) return null;
    return { node: ranked[0].node, score: Math.round(ranked[0].score * 100), reason: "discipline-token-exactness" };
  }
  function candidate(node, rootNode) {
    return node && node.id !== rootNode.id && node.pathIds?.includes(rootNode.id) && strip(node.name) && !BLOCK.test(strip(node.name));
  }
  function score(ev, node, rootNode) {
    const input = ev.text, inputBare = bare(input), a = strip(input), b = strip(node.name), path = node.pathNames.slice(rootNode.depth).map(strip).filter(Boolean).join(" ");
    const sa = sig(input), sb = sig(`${node.name} ${path}`), ov = overlap(sa, sb), jt = jac(a, b), jp = jac(a, path);
    let value = 0, reason = "none";
    if (ov.years.length && ov.laws.length) { value = 620 + ov.laws.length * 18 + ov.years.length * 12; reason = "law-number-year"; }
    else if (!inputBare && a && a === b) { value = 470; reason = "title-exact"; }
    else if (!inputBare && a && canon(input) === canon(path)) { value = 450; reason = "path-exact"; }
    else if (!inputBare && a && b && (a.includes(b) || b.includes(a))) { value = 310 + Math.min(a.length, b.length) / Math.max(a.length, b.length) * 80; reason = "title-containment"; }
    else if (!inputBare && a && path && (a.includes(path) || path.includes(a))) { value = 285 + Math.min(a.length, path.length) / Math.max(a.length, path.length) * 65; reason = "path-containment"; }
    else if (!inputBare) { value = Math.max(jt * 280, jp * 250); reason = jp > jt ? "path-tokens" : "title-tokens"; }
    if (sa.years.size && sb.years.size && !ov.years.length) value -= 260;
    if (sa.laws.size && sb.laws.size && !ov.laws.length) value -= 110;
    if (code(input) && code(input) === code(node.name)) { if (inputBare) { value += 18; reason = "bare-code-tiebreak"; } else if (Math.max(jt, jp) >= .16) value += 105; else value += 35; }
    return { score: value * ev.weight, reason, evidence: input };
  }
  function topic(entry, tree, match) {
    if (!match?.node) return null;
    const ev = evidence(entry), nodes = (tree?.nodes || []).filter(n => candidate(n, match.node));
    const ranked = nodes.map(node => { let best = { score: -Infinity, reason: "none", evidence: "" }; ev.forEach(e => { const s = score(e, node, match.node); if (s.score > best.score) best = s; }); return { node, ...best }; }).sort((a, b) => b.score - a.score || a.node.depth - b.node.depth || a.node.name.localeCompare(b.node.name, "pt-BR"));
    if (!ranked[0] || ranked[0].score < 145 || (ranked[1] && ranked[0].score < 500 && ranked[0].score - ranked[1].score < 28)) return null;
    return ranked[0];
  }

  const existing = i => String(i.factoryDestinationFolder || i.pastaDestinoWordPdf || i.destinationFolder || i.finalFilesFolder || i.destinationFolderUrl || i.pastaDestino || i.folderUrl || "").trim();
  const managed = i => Boolean(i[MANAGED] || i.factoryDestinationFolderCatalogKey || i.factoryDestinationFolderMatchType || i.factoryDestinationFolderMatchId);
  function clear(i) { ["factoryDestinationFolder", "factoryDestinationFolderCatalogVersion", "factoryDestinationFolderCatalogKey", "factoryDestinationFolderMatchType", "factoryDestinationFolderMatchTitle", "factoryDestinationFolderMatchScore", "factoryDestinationFolderMatchedAt", "factoryDestinationFolderMatchPath", "factoryDestinationFolderMatchId", "factoryDestinationFolderMatchEvidence", TREE_FINGERPRINT].forEach(k => delete i[k]); }
  function applyEntry(entry, tree, fingerprint) {
    if (!entry || typeof entry !== "object") return { changed: false, status: "invalid" };
    if (disciplines(entry).some(x => canon(x) === "SIMULADOS")) return { changed: false, status: "excluded-simulados" };
    const i = itemOf(entry), currentFingerprint = fingerprint ?? treeFingerprint(tree);
    if (i[MANAGED] === VERSION && i[TREE_FINGERPRINT] === currentFingerprint && String(i.factoryDestinationFolder || "").trim()) return { changed: false, status: "topic" };
    const old = existing(i), d = discipline(entry, tree), t = d && topic(entry, tree, d);
    if (!t?.node?.id) { if (managed(i)) { clear(i); return { changed: true, status: "unsafe-managed-cleared", previousUrl: old }; } return { changed: false, status: d ? "topic-unmatched" : "discipline-unmatched" }; }
    const next = url(t.node.id), path = t.node.pathNames.join(" → ");
    if (old === next && i[MANAGED] === VERSION && i.factoryDestinationFolderMatchPath === path && i[TREE_FINGERPRINT] === currentFingerprint) return { changed: false, status: "topic", url: next, path };
    if (old && old !== next) { i.factoryDestinationFolderPreviousUrl = old; i.factoryDestinationFolderReplacedAt = new Date().toISOString(); i.factoryDestinationFolderReplacementReason = "classificacao-disciplina-tema-exata-v237"; }
    Object.assign(i, { factoryDestinationFolder: next, [MANAGED]: VERSION, [TREE_FINGERPRINT]: currentFingerprint, factoryDestinationFolderCatalogKey: d.node.id, factoryDestinationFolderMatchType: `exact-v237-${t.reason}`, factoryDestinationFolderMatchTitle: t.node.name, factoryDestinationFolderMatchScore: Math.round(t.score), factoryDestinationFolderMatchPath: path, factoryDestinationFolderMatchId: t.node.id, factoryDestinationFolderMatchedAt: new Date().toISOString(), factoryDestinationFolderMatchEvidence: t.evidence });
    return { changed: true, status: "topic", previousUrl: old, url: next, path, reason: t.reason, evidence: t.evidence };
  }

  function cached() { for (const key of CACHE_KEYS) try { const p = JSON.parse(localStorage.getItem(key) || "null"); if (p?.tree?.nodes?.length) return p.tree; } catch {} return null; }
  function stateNow() { try { if (typeof state !== "undefined" && state) return state; } catch {} return globalThis.__FACTORY_DESTINATION_STATE__ || null; }
  function agenda(s) { try { if (typeof ensureFactoryAgenda === "function") return ensureFactoryAgenda(); } catch {} return Array.isArray(s?.factoryAgenda) ? s.factoryAgenda : Array.isArray(s?.factoryItems) ? s.factoryItems : []; }
  function applyTree(tree, options = {}) {
    if (applying) return { applied: false, reason: "already-applying", changed: 0 };
    const s = stateNow(), list = s && agenda(s); if (!s || !tree?.nodes?.length || !Array.isArray(list)) return { applied: false, reason: "not-ready", changed: 0 };
    applying = true;
    try {
      const fingerprint = treeFingerprint(tree);
      const report = { version: VERSION, appliedAt: new Date().toISOString(), total: list.length, changed: 0, matched: 0, corrected: 0, clearedUnsafe: 0, unmatched: 0, excludedSimulados: 0, corrections: [] };
      list.forEach(entry => { const r = applyEntry(entry, tree, fingerprint); if (r.changed) report.changed++; if (r.status === "topic") { report.matched++; if (r.changed) { report.corrected++; report.corrections.push({ discipline: disciplines(entry)[0] || "", topic: itemOf(entry).tema || itemOf(entry).subject || itemOf(entry).assunto || "", previousUrl: r.previousUrl || "", url: r.url, path: r.path, reason: r.reason, evidence: r.evidence }); } } else if (r.status === "unsafe-managed-cleared") report.clearedUnsafe++; else if (r.status === "excluded-simulados") report.excludedSimulados++; else if (/unmatched$/.test(r.status)) report.unmatched++; });
      s.factoryAgenda = list; s.factoryItems = list; s.migrations ||= {}; s.migrations.factoryDestinationFoldersV237 = report; globalThis.__factoryDestinationFoldersV237Report = report;
      if (report.changed && options.save !== false) try { if (typeof saveData === "function") saveData({ markLocalChange: true }); } catch {}
      if (report.changed && options.render !== false) try { if (typeof renderFactory === "function" && location.hash === "#fabrica-resumos") renderFactory(); } catch {}
      return { applied: true, ...report };
    } finally { applying = false; }
  }
  const applyCached = options => { const t = cached(); return t ? applyTree(t, options) : { applied: false, reason: "cache-empty", changed: 0 }; };
  async function refresh(options = {}) { try { if (typeof __refreshFactoryDestinationFoldersV232 === "function") await __refreshFactoryDestinationFoldersV232({ force: true }); } catch {} return applyCached(options); }
  const isFactoryRoute = () => typeof location !== "undefined" && location.hash === "#fabrica-resumos";
  let automaticApplyQueued = false;

  function queueFactoryApply() {
    if (!isFactoryRoute() || automaticApplyQueued) return false;
    automaticApplyQueued = true;
    const run = () => {
      automaticApplyQueued = false;
      if (!isFactoryRoute()) return;
      try { applyCached(); } catch (error) { console.warn(`[${RUNTIME_VERSION}] Falha ao aplicar Pasta destino sob demanda.`, error); }
    };
    if (typeof requestIdleCallback === "function") requestIdleCallback(run, { timeout: 750 });
    else setTimeout(run, 0);
    return true;
  }

  function wrap(name) {
    try {
      const fn = globalThis[name];
      if (typeof fn !== "function" || fn.__destinationV237) return;
      const wrapped = name === "checkCloudForUpdatesAfterAuth"
        ? async function(...args) { const r = await fn.apply(this, args); queueFactoryApply(); return r; }
        : function(...args) { const r = fn.apply(this, args); queueFactoryApply(); return r; };
      Object.defineProperty(wrapped, "__destinationV237", { value: true });
      Object.defineProperty(wrapped, "__aldusOriginal", { value: fn });
      globalThis[name] = wrapped;
    } catch {}
  }
  function install() { wrap("syncFactoryWithActiveEdital"); wrap("checkCloudForUpdatesAfterAuth"); }
  function showVersion() { if (typeof document === "undefined") return; document.documentElement.dataset.aldusReleaseVersion = VERSION; document.querySelectorAll(".app-version").forEach(e => { e.textContent = `Versão: ${VERSION}`; }); }

  const api = Object.freeze({ version: VERSION, runtimeVersion: RUNTIME_VERSION, rootId: ROOT, resolveDiscipline: discipline, resolveTopic: topic, applyEntry, applyTree, applyCached, refresh, queueFactoryApply, audit: () => globalThis.__factoryDestinationFoldersV237Report || null });
  Object.defineProperty(globalThis, FLAG, { value: api });
  Object.defineProperties(globalThis, { __resolveFactoryDestinationDisciplineV237: { value: discipline, configurable: true }, __resolveFactoryDestinationTopicV237: { value: topic, configurable: true }, __applyFactoryDestinationToEntryV237: { value: applyEntry, configurable: true }, __applyFactoryDestinationTreeV237: { value: applyTree, configurable: true }, __refreshFactoryDestinationFoldersV237: { value: refresh, configurable: true } });
  if (typeof document === "undefined") return;

  // V354: no boot normal apenas instala os wrappers leves. A reconciliação O(itens × pastas)
  // fica restrita à área da Fábrica ou a chamadas explícitas da API existente.
  install();
  if (isFactoryRoute()) { showVersion(); queueFactoryApply(); }
  addEventListener("hashchange", () => { if (isFactoryRoute()) { showVersion(); queueFactoryApply(); } });
})();
