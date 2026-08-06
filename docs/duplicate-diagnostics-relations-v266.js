(() => {
  "use strict";

  const VERSION = "20260806-duplicate-relations-global-search-v266";
  const ROOT_ID = "aldusDuplicateDiagnosticsV260";
  const CUSTOM_FILTER = "relations";
  const CUSTOM_CONTAINER_CLASS = "aldus-dup-v266-results";
  const CUSTOM_MODE_CLASS = "aldus-dup-v266-custom-mode";
  const NORMAL_FILTERS = new Set(["exact", "probable", "later"]);

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
    const item = profile?.item || {};
    return normalize([
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

  function deriveRelations(state, diagnosticsApi) {
    if (!state || !diagnosticsApi) return [];
    const report = diagnosticsApi.diagnoseState(state, { includeDecided: true });
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

  function globalSearch(state, diagnosticsApi, query) {
    const normalizedQuery = normalize(query);
    if (!normalizedQuery || !state || !diagnosticsApi) return { pairs: [], audit: [] };
    const report = diagnosticsApi.diagnoseState(state, { includeDecided: true });
    const relationMap = new Map(deriveRelations(state, diagnosticsApi).map((pair) => [pair.key, pair]));
    (report?.pairs || []).forEach((pair) => relationMap.set(pair.key || pairKey(pair.left, pair.right), pair));

    const pairs = [...relationMap.values()].filter((pair) => pairSearchText(pair).includes(normalizedQuery));
    const audit = (Array.isArray(state?.duplicateDiagnostics?.audit) ? state.duplicateDiagnostics.audit : [])
      .filter((row) => auditSearchText(row).includes(normalizedQuery));
    return { pairs, audit };
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
      list.appendChild(container);
    }
    return container;
  }

  function setCustomMode(list, enabled) {
    list.classList.toggle(CUSTOM_MODE_CLASS, Boolean(enabled));
    if (!enabled) list.querySelector(`:scope > .${CUSTOM_CONTAINER_CLASS}`)?.remove();
  }

  function customHeading(title, detail, count) {
    return `<div class="aldus-dup-v266-heading"><div><strong>${escapeHtml(title)}</strong><span>${escapeHtml(detail)}</span></div><b>${count}</b></div>`;
  }

  function renderCustom(root, mode, query = "") {
    const list = root.querySelector("[data-dup-list]");
    const diagnosticsApi = globalThis.AldusDuplicateDiagnosticsV260;
    const currentState = stateReference();
    if (!list) return;
    setCustomMode(list, true);
    const container = ensureCustomContainer(list);

    if (!diagnosticsApi || !currentState) {
      container.innerHTML = customHeading("Diagnóstico indisponível", "Os dados ainda não terminaram de carregar.", 0);
      return;
    }

    if (mode === CUSTOM_FILTER) {
      const relations = deriveRelations(currentState, diagnosticsApi);
      container.innerHTML = customHeading(
        "Relações e sobreposições",
        "Tema-pai, subitem e assuntos semanticamente próximos. Esta área é somente informativa.",
        relations.length
      ) + (relations.length ? relations.map(renderPair).join("") : "<p class=\"aldus-dup-v266-empty\">Nenhuma relação informativa foi localizada.</p>");
      return;
    }

    const result = globalSearch(currentState, diagnosticsApi, query);
    const total = result.pairs.length + result.audit.length;
    container.innerHTML = customHeading(
      "Busca global",
      `Resultados em duplicidades, relações, sobreposições e histórico para “${query}”.`,
      total
    ) + (result.pairs.map(renderPair).join("") + result.audit.map(renderAudit).join("")
      || "<p class=\"aldus-dup-v266-empty\">Nenhum caso corresponde à busca em todas as categorias e no histórico.</p>");
  }

  function install(root) {
    if (!root || root.dataset.v266RelationsInstalled) return;
    root.dataset.v266RelationsInstalled = "true";
    root.classList.add("aldus-dup-v266");

    const filter = root.querySelector("[data-dup-filter]");
    const search = root.querySelector("[data-v261-search]");
    const list = root.querySelector("[data-dup-list]");
    if (!filter || !search || !list) {
      root.dataset.v266RelationsInstalled = "";
      window.setTimeout(() => install(root), 100);
      return;
    }

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
      const value = filter.value;
      search.value = "";
      if (value === CUSTOM_FILTER) {
        event.preventDefault();
        event.stopImmediatePropagation();
        renderCustom(root, CUSTOM_FILTER);
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
        renderCustom(root, "search", query);
      } else if (filter.value === CUSTOM_FILTER) {
        renderCustom(root, CUSTOM_FILTER);
      } else {
        setCustomMode(list, false);
      }
    }, true);

    const run = root.querySelector("[data-dup-run]");
    run?.addEventListener("click", () => {
      window.setTimeout(() => {
        if (filter.value === CUSTOM_FILTER) renderCustom(root, CUSTOM_FILTER);
        else if (String(search.value || "").trim()) renderCustom(root, "search", search.value);
      }, 50);
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
    auditSearchText
  });

  if (typeof module !== "undefined" && module.exports) {
    module.exports = API;
    return;
  }

  globalThis.__aldusDuplicateRelationsV266 = API;
  if (typeof document === "undefined") return;
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", waitForRoot, { once: true });
  else waitForRoot();
})();
