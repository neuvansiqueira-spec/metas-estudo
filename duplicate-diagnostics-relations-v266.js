(() => {
  "use strict";

  const VERSION = "20260808-duplicate-search-performance-v268";
  const ROOT_ID = "aldusDuplicateDiagnosticsV260";
  const CUSTOM_FILTER = "relations";
  const CUSTOM_CONTAINER_CLASS = "aldus-dup-v266-results";
  const CUSTOM_MODE_CLASS = "aldus-dup-v266-custom-mode";
  const NORMAL_FILTERS = new Set(["exact", "probable", "later"]);
  const SEARCH_DEBOUNCE_MS = 240;
  const MAX_RENDERED_RESULTS = 120;

  const profileTextCache = new WeakMap();
  let searchTimer = 0;
  let searchGeneration = 0;
  let cachedIndex = null;

  function normalize(value) {
    return String(value ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function profileLabel(profile) {
    return String(profile?.label || profile?.item?.subject || profile?.item?.topic || profile?.item?.reference || "Tema sem título").trim();
  }

  function profileDiscipline(profile) {
    return String(profile?.disciplineLabel || profile?.item?.discipline || profile?.item?.disciplina || "Disciplina não informada").trim();
  }

  function profileCode(profile) {
    return String(profile?.code || profile?.item?.subtopic || profile?.item?.code || "").trim();
  }

  function profileSearchText(profile) {
    if (profile && typeof profile === "object" && profileTextCache.has(profile)) return profileTextCache.get(profile);
    const item = profile?.item || {};
    const text = normalize([
      profileLabel(profile),
      profileDiscipline(profile),
      profileCode(profile),
      profile?.normalizedTopic,
      item.topic,
      item.subject,
      item.subtopic,
      item.reference,
      item.notes
    ].filter(Boolean).join(" "));
    if (profile && typeof profile === "object") profileTextCache.set(profile, text);
    return text;
  }

  function codeRows(profile) {
    const rows = [];
    const add = (code, contestId = "") => {
      const normalizedCode = String(code || "").match(/\d+(?:\.\d+){0,6}/)?.[0] || "";
      if (!normalizedCode) return;
      const key = `${contestId || ""}|${normalizedCode}`;
      if (!rows.some((row) => row.key === key)) rows.push({ key, code: normalizedCode, contestId: String(contestId || "") });
    };
    add(profileCode(profile));
    (Array.isArray(profile?.coverage) ? profile.coverage : []).forEach((row) => {
      add(row?.code || row?.reference, row?.contestId);
    });
    return rows;
  }

  function codePrefixRelation(left, right) {
    const leftCodes = codeRows(left);
    const rightCodes = codeRows(right);
    for (const a of leftCodes) {
      for (const b of rightCodes) {
        if (a.contestId && b.contestId && a.contestId !== b.contestId) continue;
        if (a.code === b.code) continue;
        if (a.code.startsWith(`${b.code}.`) || b.code.startsWith(`${a.code}.`)) {
          return `${a.code} ↔ ${b.code}`;
        }
      }
    }
    return "";
  }

  function administrativeControlRelation(left, right) {
    const leftText = profileSearchText(left);
    const rightText = profileSearchText(right);
    const bothAdministrative = /administrativ/.test(leftText) && /administrativ/.test(rightText);
    if (!bothAdministrative || !leftText.includes("controle") || !rightText.includes("controle")) return false;

    const broad = /controle (da )?administracao publica/.test(leftText)
      || /administracao publica/.test(leftText)
      || /controle (da )?administracao publica/.test(rightText)
      || /administracao publica/.test(rightText);
    const specific = /(controle )?(interno|externo|administrativo|judicial|legislativo)/.test(leftText)
      || /(controle )?(interno|externo|administrativo|judicial|legislativo)/.test(rightText);
    return broad && specific;
  }

  function relationReason(left, right) {
    const prefix = codePrefixRelation(left, right);
    if (prefix) return `Relação de eixo e subitem oficial (${prefix}).`;
    if (administrativeControlRelation(left, right)) {
      return "Tema amplo de controle da Administração Pública relacionado a modalidade específica de controle.";
    }
    return "Relação temática informativa identificada pelo diagnóstico.";
  }

  function pairKey(left, right) {
    return [String(left?.id || ""), String(right?.id || "")].sort().join("::");
  }

  function deriveRelations(state, diagnosticsApi, reportOverride = null) {
    if (!state || !diagnosticsApi) return [];
    const report = reportOverride || diagnosticsApi.diagnoseState(state, { includeDecided: true });
    const existing = new Map();
    (report?.pairs || []).forEach((pair) => {
      if (pair?.classification === "overlap" || pair?.classification === "related") {
        existing.set(pair.key || pairKey(pair.left, pair.right), {
          key: pair.key || pairKey(pair.left, pair.right),
          left: pair.left,
          right: pair.right,
          classification: pair.classification,
          confidence: Number(pair.confidence || 0),
          reasons: Array.isArray(pair.reasons) ? pair.reasons : [],
          source: "diagnostic"
        });
      }
    });

    const built = diagnosticsApi.buildProfiles?.(state);
    const profiles = Array.isArray(built) ? built : (Array.isArray(built?.profiles) ? built.profiles : []);
    for (let i = 0; i < profiles.length; i += 1) {
      for (let j = i + 1; j < profiles.length; j += 1) {
        const left = profiles[i];
        const right = profiles[j];
        const key = pairKey(left, right);
        if (existing.has(key)) continue;
        const prefix = codePrefixRelation(left, right);
        const semantic = administrativeControlRelation(left, right);
        if (!prefix && !semantic) continue;
        existing.set(key, {
          key,
          left,
          right,
          classification: "relation",
          confidence: prefix ? 72 : 64,
          reasons: [relationReason(left, right)],
          source: prefix ? "official-hierarchy" : "semantic-family"
        });
      }
    }

    return [...existing.values()].sort((a, b) =>
      (b.confidence - a.confidence)
      || profileLabel(a.left).localeCompare(profileLabel(b.left), "pt-BR")
    );
  }

  function pairSearchText(pair) {
    return normalize([
      profileSearchText(pair?.left),
      profileSearchText(pair?.right),
      pair?.classification,
      ...(pair?.reasons || [])
    ].join(" "));
  }

  function auditSearchText(row) {
    return normalize([
      row?.keeperId,
      row?.removedId,
      row?.after?.keeper?.topic,
      row?.after?.keeper?.subject,
      row?.after?.keeper?.reference,
      row?.before?.removed?.topic,
      row?.before?.removed?.subject,
      row?.before?.removed?.reference
    ].filter(Boolean).join(" "));
  }

  function hashToken(seed, value) {
    let hash = seed >>> 0;
    const text = String(value ?? "");
    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function stateSearchSignature(state) {
    const items = Array.isArray(state?.syllabusItems) ? state.syllabusItems : [];
    const audit = Array.isArray(state?.duplicateDiagnostics?.audit) ? state.duplicateDiagnostics.audit : [];
    let hash = 2166136261;
    for (const item of items) {
      hash = hashToken(hash, [
        item?.id,
        item?.discipline,
        item?.disciplina,
        item?.topic,
        item?.subject,
        item?.subtopic,
        item?.reference,
        item?.code,
        item?.updatedAt
      ].join("|"));
    }
    const lastAudit = audit[audit.length - 1];
    return `${items.length}|${audit.length}|${hash}|${lastAudit?.decidedAt || ""}|${lastAudit?.keeperId || ""}|${lastAudit?.removedId || ""}`;
  }

  function invalidateSearchCache() {
    cachedIndex = null;
    searchGeneration += 1;
  }

  function buildSearchIndex(state, diagnosticsApi, signature) {
    const report = diagnosticsApi.diagnoseState(state, { includeDecided: true });
    const relations = deriveRelations(state, diagnosticsApi, report);
    const pairMap = new Map(relations.map((pair) => [pair.key || pairKey(pair.left, pair.right), pair]));
    (report?.pairs || []).forEach((pair) => pairMap.set(pair.key || pairKey(pair.left, pair.right), pair));

    const pairRows = [...pairMap.values()].map((pair) => ({ pair, text: pairSearchText(pair) }));
    const auditRows = (Array.isArray(state?.duplicateDiagnostics?.audit) ? state.duplicateDiagnostics.audit : [])
      .map((row) => ({ row, text: auditSearchText(row) }));

    return {
      state,
      signature,
      relations,
      pairRows,
      auditRows,
      scannedAt: report?.scannedAt || ""
    };
  }

  function getSearchIndex(state, diagnosticsApi) {
    const signature = stateSearchSignature(state);
    if (cachedIndex && cachedIndex.state === state && cachedIndex.signature === signature) return cachedIndex;
    cachedIndex = buildSearchIndex(state, diagnosticsApi, signature);
    return cachedIndex;
  }

  function globalSearch(state, diagnosticsApi, query) {
    const normalizedQuery = normalize(query);
    if (!normalizedQuery || !state || !diagnosticsApi) return { pairs: [], audit: [] };
    const index = getSearchIndex(state, diagnosticsApi);
    return {
      pairs: index.pairRows.filter((entry) => entry.text.includes(normalizedQuery)).map((entry) => entry.pair),
      audit: index.auditRows.filter((entry) => entry.text.includes(normalizedQuery)).map((entry) => entry.row)
    };
  }

  function classificationLabel(classification) {
    if (classification === "exact") return "Duplicidade exata";
    if (classification === "probable") return "Duplicidade provável";
    if (classification === "overlap") return "Sobreposição informativa";
    if (classification === "related" || classification === "relation") return "Relação informativa";
    return "Caso relacionado";
  }

  function stateReference() {
    try {
      if (typeof state === "object" && state) return state;
    } catch {}
    return globalThis.state || null;
  }

  function renderPair(pair) {
    const leftCode = profileCode(pair.left);
    const rightCode = profileCode(pair.right);
    const reasons = (pair.reasons || []).map((reason) => `<li>${escapeHtml(reason)}</li>`).join("");
    return `
      <article class="aldus-dup-v266-card" data-v266-pair="${escapeHtml(pair.key || pairKey(pair.left, pair.right))}">
        <header>
          <span class="aldus-dup-v266-badge">${escapeHtml(classificationLabel(pair.classification))}</span>
          <strong>${Math.max(0, Math.min(100, Number(pair.confidence || 0)))}% de confiança</strong>
        </header>
        <div class="aldus-dup-v266-pair-grid">
          <section>
            <small>${escapeHtml(profileDiscipline(pair.left))}</small>
            <h4>${escapeHtml([leftCode, profileLabel(pair.left)].filter(Boolean).join(" — "))}</h4>
          </section>
          <span aria-hidden="true">↔</span>
          <section>
            <small>${escapeHtml(profileDiscipline(pair.right))}</small>
            <h4>${escapeHtml([rightCode, profileLabel(pair.right)].filter(Boolean).join(" — "))}</h4>
          </section>
        </div>
        ${reasons ? `<ul class="aldus-dup-v266-reasons">${reasons}</ul>` : ""}
        <p class="aldus-dup-v266-warning">Informativo: esta relação não oferece consolidação automática.</p>
      </article>`;
  }

  function renderAudit(row) {
    const keeper = row?.after?.keeper?.topic || row?.after?.keeper?.subject || row?.keeperId || "Item mantido";
    const removed = row?.before?.removed?.topic || row?.before?.removed?.subject || row?.removedId || "Item consolidado";
    const date = row?.decidedAt ? new Date(row.decidedAt).toLocaleString("pt-BR") : "Data não informada";
    return `
      <article class="aldus-dup-v266-card is-history">
        <header><span class="aldus-dup-v266-badge">Histórico de consolidação</span><strong>${escapeHtml(date)}</strong></header>
        <p><strong>Mantido:</strong> ${escapeHtml(keeper)}</p>
        <p><strong>Consolidado:</strong> ${escapeHtml(removed)}</p>
        <p class="aldus-dup-v266-warning">Registro histórico; o item consolidado não está mais na fila ativa.</p>
      </article>`;
  }

  function ensureCustomContainer(list) {
    let container = list.querySelector(`:scope > .${CUSTOM_CONTAINER_CLASS}`);
    if (!container) {
      container = document.createElement("section");
      container.className = CUSTOM_CONTAINER_CLASS;
      container.hidden = true;
      list.appendChild(container);
    }
    return container;
  }

  function setCustomMode(list, enabled) {
    list.classList.toggle(CUSTOM_MODE_CLASS, Boolean(enabled));
    const container = ensureCustomContainer(list);
    container.hidden = !enabled;
    if (!enabled) container.replaceChildren();
    return container;
  }

  function customHeading(title, detail, count) {
    return `<div class="aldus-dup-v266-heading"><div><strong>${escapeHtml(title)}</strong><span>${escapeHtml(detail)}</span></div><b>${count}</b></div>`;
  }

  function renderLimitedResults(result) {
    const total = result.pairs.length + result.audit.length;
    const pairs = result.pairs.slice(0, MAX_RENDERED_RESULTS);
    const remainingSlots = Math.max(0, MAX_RENDERED_RESULTS - pairs.length);
    const audit = result.audit.slice(0, remainingSlots);
    const shown = pairs.length + audit.length;
    const hidden = Math.max(0, total - shown);
    const note = hidden
      ? `<p class="aldus-dup-v266-empty">Exibindo ${shown} de ${total} resultados para manter a tela responsiva. Refine a busca para ver casos mais específicos.</p>`
      : "";
    return {
      total,
      html: pairs.map(renderPair).join("") + audit.map(renderAudit).join("") + note
    };
  }

  function renderCustom(root, mode, query = "", generation = searchGeneration) {
    const list = root.querySelector("[data-dup-list]");
    const diagnosticsApi = globalThis.AldusDuplicateDiagnosticsV260;
    const currentState = stateReference();
    if (!list || generation !== searchGeneration) return;
    const container = setCustomMode(list, true);

    if (!diagnosticsApi || !currentState) {
      container.innerHTML = customHeading("Diagnóstico indisponível", "Os dados ainda não terminaram de carregar.", 0);
      return;
    }

    if (mode === CUSTOM_FILTER) {
      const index = getSearchIndex(currentState, diagnosticsApi);
      const relations = index.relations;
      const limited = relations.slice(0, MAX_RENDERED_RESULTS);
      const hidden = Math.max(0, relations.length - limited.length);
      container.innerHTML = customHeading(
        "Relações e sobreposições",
        hidden
          ? `Tema-pai, subitem e assuntos relacionados. Exibindo ${limited.length} de ${relations.length}; refine pela busca para reduzir a lista.`
          : "Tema-pai, subitem e assuntos semanticamente próximos. Esta área é somente informativa.",
        relations.length
      ) + (limited.length ? limited.map(renderPair).join("") : "<p class=\"aldus-dup-v266-empty\">Nenhuma relação informativa foi localizada.</p>");
      return;
    }

    const search = root.querySelector("[data-v261-search]");
    if (String(search?.value || "").trim() !== String(query || "").trim()) return;
    const result = globalSearch(currentState, diagnosticsApi, query);
    if (generation !== searchGeneration || String(search?.value || "").trim() !== String(query || "").trim()) return;
    const rendered = renderLimitedResults(result);
    container.innerHTML = customHeading(
      "Busca global",
      `Resultados em duplicidades, relações, sobreposições e histórico para “${query}”.`,
      rendered.total
    ) + (rendered.html || "<p class=\"aldus-dup-v266-empty\">Nenhum caso corresponde à busca em todas as categorias e no histórico.</p>");
  }

  function scheduleGlobalSearch(root, query) {
    window.clearTimeout(searchTimer);
    searchGeneration += 1;
    const generation = searchGeneration;
    const list = root.querySelector("[data-dup-list]");
    if (!list) return;
    const container = setCustomMode(list, true);
    container.innerHTML = customHeading("Busca global", "Aguarde enquanto os resultados são preparados…", 0);
    searchTimer = window.setTimeout(() => renderCustom(root, "search", query, generation), SEARCH_DEBOUNCE_MS);
  }

  function install(root) {
    if (!root || root.dataset.v268RelationsInstalled) return;
    root.dataset.v268RelationsInstalled = "true";
    root.classList.add("aldus-dup-v266");

    const filter = root.querySelector("[data-dup-filter]");
    const search = root.querySelector("[data-v261-search]");
    const list = root.querySelector("[data-dup-list]");
    if (!filter || !search || !list) {
      root.dataset.v268RelationsInstalled = "";
      window.setTimeout(() => install(root), 100);
      return;
    }

    ensureCustomContainer(list);

    if (!filter.querySelector(`option[value="${CUSTOM_FILTER}"]`)) {
      const option = document.createElement("option");
      option.value = CUSTOM_FILTER;
      option.textContent = "Relações e sobreposições";
      filter.appendChild(option);
    }
    search.placeholder = "Busca global: disciplina, tema ou código";
    search.setAttribute("aria-label", "Buscar em todas as categorias e no histórico");

    root.addEventListener("change", (event) => {
      if (event.target !== filter) return;
      window.clearTimeout(searchTimer);
      searchGeneration += 1;
      const value = filter.value;
      search.value = "";
      if (value === CUSTOM_FILTER) {
        event.preventDefault();
        event.stopImmediatePropagation();
        renderCustom(root, CUSTOM_FILTER, "", searchGeneration);
        return;
      }
      setCustomMode(list, false);
      if (!NORMAL_FILTERS.has(value)) filter.value = "probable";
    }, true);

    root.addEventListener("input", (event) => {
      if (event.target !== search) return;
      event.stopImmediatePropagation();
      const query = String(search.value || "").trim();
      if (query) {
        scheduleGlobalSearch(root, query);
      } else if (filter.value === CUSTOM_FILTER) {
        window.clearTimeout(searchTimer);
        searchGeneration += 1;
        renderCustom(root, CUSTOM_FILTER, "", searchGeneration);
      } else {
        window.clearTimeout(searchTimer);
        searchGeneration += 1;
        setCustomMode(list, false);
      }
    }, true);

    const run = root.querySelector("[data-dup-run]");
    run?.addEventListener("click", () => {
      invalidateSearchCache();
      window.clearTimeout(searchTimer);
    });
  }

  function waitForRoot() {
    const root = document.getElementById(ROOT_ID);
    if (root) {
      install(root);
      return;
    }
    const observer = new MutationObserver(() => {
      const candidate = document.getElementById(ROOT_ID);
      if (!candidate) return;
      observer.disconnect();
      install(candidate);
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }

  const API = Object.freeze({
    VERSION,
    normalize,
    codeRows,
    codePrefixRelation,
    administrativeControlRelation,
    deriveRelations,
    globalSearch,
    pairSearchText,
    auditSearchText,
    stateSearchSignature,
    invalidateSearchCache
  });

  if (typeof module !== "undefined" && module.exports) {
    module.exports = API;
    return;
  }

  globalThis.__aldusDuplicateRelationsV266 = API;
  globalThis.__aldusDuplicateRelationsV268 = API;
  if (typeof document === "undefined") return;
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", waitForRoot, { once: true });
  else waitForRoot();
})();
