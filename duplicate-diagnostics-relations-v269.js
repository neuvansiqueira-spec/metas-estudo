(() => {
  "use strict";

  const VERSION = "20260808-duplicate-local-search-v269";
  const ROOT_ID = "aldusDuplicateDiagnosticsV260";
  const CUSTOM_FILTER = "relations";
  const CUSTOM_CONTAINER_CLASS = "aldus-dup-v266-results";
  const CUSTOM_MODE_CLASS = "aldus-dup-v266-custom-mode";
  const MAX_RENDERED_RESULTS = 120;
  const SEARCH_DEBOUNCE_MS = 120;

  let cachedRelations = null;
  let cachedState = null;
  let cachedSignature = "";
  let searchTimer = 0;

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
    (Array.isArray(profile?.coverage) ? profile.coverage : []).forEach((row) => add(row?.code || row?.reference, row?.contestId));
    return rows;
  }

  function codePrefixRelation(left, right) {
    const leftCodes = codeRows(left);
    const rightCodes = codeRows(right);
    for (const a of leftCodes) {
      for (const b of rightCodes) {
        if (a.contestId && b.contestId && a.contestId !== b.contestId) continue;
        if (a.code === b.code) continue;
        if (a.code.startsWith(`${b.code}.`) || b.code.startsWith(`${a.code}.`)) return `${a.code} ↔ ${b.code}`;
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

  function pairKey(left, right) {
    return [String(left?.id || ""), String(right?.id || "")].sort().join("::");
  }

  function relationReason(left, right) {
    const prefix = codePrefixRelation(left, right);
    if (prefix) return `Relação de eixo e subitem oficial (${prefix}).`;
    if (administrativeControlRelation(left, right)) {
      return "Tema amplo de controle da Administração Pública relacionado a modalidade específica de controle.";
    }
    return "Relação temática informativa identificada pelo diagnóstico.";
  }

  function stateReference() {
    try {
      if (typeof state === "object" && state) return state;
    } catch {}
    return globalThis.state || null;
  }

  function stateSignature(targetState) {
    const items = Array.isArray(targetState?.syllabusItems) ? targetState.syllabusItems : [];
    const first = items[0];
    const last = items[items.length - 1];
    return [
      items.length,
      first?.id || "",
      first?.updatedAt || "",
      last?.id || "",
      last?.updatedAt || "",
      targetState?.duplicateDiagnostics?.lastScanAt || ""
    ].join("|");
  }

  function deriveRelations(targetState, diagnosticsApi) {
    if (!targetState || !diagnosticsApi) return [];
    const report = diagnosticsApi.diagnoseState(targetState, { includeDecided: true });
    const existing = new Map();

    (report?.pairs || []).forEach((pair) => {
      if (pair?.classification !== "overlap" && pair?.classification !== "related") return;
      existing.set(pair.key || pairKey(pair.left, pair.right), {
        key: pair.key || pairKey(pair.left, pair.right),
        left: pair.left,
        right: pair.right,
        classification: pair.classification,
        confidence: Number(pair.confidence || 0),
        reasons: Array.isArray(pair.reasons) ? pair.reasons : []
      });
    });

    const built = diagnosticsApi.buildProfiles?.(targetState);
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
          reasons: [relationReason(left, right)]
        });
      }
    }

    return [...existing.values()].map((pair) => ({
      ...pair,
      searchText: normalize([
        profileSearchText(pair.left),
        profileSearchText(pair.right),
        pair.classification,
        ...(pair.reasons || [])
      ].join(" "))
    })).sort((a, b) => (b.confidence - a.confidence) || profileLabel(a.left).localeCompare(profileLabel(b.left), "pt-BR"));
  }

  function getRelations(targetState, diagnosticsApi) {
    const signature = stateSignature(targetState);
    if (cachedRelations && cachedState === targetState && cachedSignature === signature) return cachedRelations;
    cachedState = targetState;
    cachedSignature = signature;
    cachedRelations = deriveRelations(targetState, diagnosticsApi);
    return cachedRelations;
  }

  function invalidateRelations() {
    cachedRelations = null;
    cachedState = null;
    cachedSignature = "";
  }

  function classificationLabel(classification) {
    if (classification === "overlap") return "Sobreposição informativa";
    if (classification === "related" || classification === "relation") return "Relação informativa";
    return "Caso relacionado";
  }

  function renderPair(pair) {
    const leftCode = profileCode(pair.left);
    const rightCode = profileCode(pair.right);
    const reasons = (pair.reasons || []).map((reason) => `<li>${escapeHtml(reason)}</li>`).join("");
    return `
      <article class="aldus-dup-v266-card" data-v269-relation="${escapeHtml(pair.key || pairKey(pair.left, pair.right))}">
        <header>
          <span class="aldus-dup-v266-badge">${escapeHtml(classificationLabel(pair.classification))}</span>
          <strong>${Math.max(0, Math.min(100, Number(pair.confidence || 0)))}% de confiança</strong>
        </header>
        <div class="aldus-dup-v266-pair-grid">
          <section><small>${escapeHtml(profileDiscipline(pair.left))}</small><h4>${escapeHtml([leftCode, profileLabel(pair.left)].filter(Boolean).join(" — "))}</h4></section>
          <span aria-hidden="true">↔</span>
          <section><small>${escapeHtml(profileDiscipline(pair.right))}</small><h4>${escapeHtml([rightCode, profileLabel(pair.right)].filter(Boolean).join(" — "))}</h4></section>
        </div>
        ${reasons ? `<ul class="aldus-dup-v266-reasons">${reasons}</ul>` : ""}
        <p class="aldus-dup-v266-warning">Informativo: esta relação não oferece consolidação automática.</p>
      </article>`;
  }

  function customHeading(title, detail, count) {
    return `<div class="aldus-dup-v266-heading"><div><strong>${escapeHtml(title)}</strong><span>${escapeHtml(detail)}</span></div><b>${count}</b></div>`;
  }

  function ensureContainer(list) {
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
    const container = ensureContainer(list);
    container.hidden = !enabled;
    if (!enabled) container.replaceChildren();
    return container;
  }

  function renderRelations(root, query = "") {
    const list = root.querySelector("[data-dup-list]");
    const diagnosticsApi = globalThis.AldusDuplicateDiagnosticsV260;
    const currentState = stateReference();
    if (!list) return;
    const container = setCustomMode(list, true);

    if (!diagnosticsApi || !currentState) {
      container.innerHTML = customHeading("Relações e sobreposições", "Os dados ainda não terminaram de carregar.", 0);
      return;
    }

    if (!cachedRelations || cachedState !== currentState || cachedSignature !== stateSignature(currentState)) {
      container.innerHTML = customHeading("Relações e sobreposições", "Preparando o índice desta categoria…", 0);
    }

    const allRelations = getRelations(currentState, diagnosticsApi);
    const normalizedQuery = normalize(query);
    const matches = normalizedQuery ? allRelations.filter((pair) => pair.searchText.includes(normalizedQuery)) : allRelations;
    const shown = matches.slice(0, MAX_RENDERED_RESULTS);
    const hidden = Math.max(0, matches.length - shown.length);
    const detail = normalizedQuery
      ? `Resultados dentro de Relações e sobreposições para “${query}”.`
      : "Tema-pai, subitem e assuntos semanticamente próximos. Esta área é somente informativa.";
    const limitNote = hidden
      ? `<p class="aldus-dup-v266-empty">Exibindo ${shown.length} de ${matches.length} resultados. Refine o campo Localizar para reduzir a lista.</p>`
      : "";

    container.innerHTML = customHeading("Relações e sobreposições", detail, matches.length)
      + (shown.length ? shown.map(renderPair).join("") + limitNote : "<p class=\"aldus-dup-v266-empty\">Nenhum caso corresponde à busca nesta categoria.</p>");
  }

  function install(root) {
    if (!root || root.dataset.v269RelationsInstalled) return;
    root.dataset.v269RelationsInstalled = "true";
    root.classList.add("aldus-dup-v266");

    const filter = root.querySelector("[data-dup-filter]");
    const search = root.querySelector("[data-v261-search]");
    const list = root.querySelector("[data-dup-list]");
    if (!filter || !search || !list) {
      root.dataset.v269RelationsInstalled = "";
      window.setTimeout(() => install(root), 100);
      return;
    }

    if (!filter.querySelector(`option[value="${CUSTOM_FILTER}"]`)) {
      const option = document.createElement("option");
      option.value = CUSTOM_FILTER;
      option.textContent = "Relações e sobreposições";
      filter.appendChild(option);
    }

    search.placeholder = "Disciplina, tema ou código";
    search.setAttribute("aria-label", "Localizar na categoria selecionada");

    root.addEventListener("change", (event) => {
      if (event.target !== filter) return;
      window.clearTimeout(searchTimer);
      search.value = "";
      if (filter.value !== CUSTOM_FILTER) {
        setCustomMode(list, false);
        return;
      }
      event.preventDefault();
      event.stopImmediatePropagation();
      renderRelations(root);
    }, true);

    root.addEventListener("input", (event) => {
      if (event.target !== search) return;

      // Nos filtros normais, não intercepta o evento: a UI V261 faz a busca local
      // apenas nos cartões da categoria já renderizada, sem recalcular o diagnóstico.
      if (filter.value !== CUSTOM_FILTER) return;

      event.stopImmediatePropagation();
      const query = String(search.value || "").trim();
      window.clearTimeout(searchTimer);
      searchTimer = window.setTimeout(() => renderRelations(root, query), SEARCH_DEBOUNCE_MS);
    }, true);

    root.querySelector("[data-dup-run]")?.addEventListener("click", () => {
      invalidateRelations();
      window.clearTimeout(searchTimer);
      if (filter.value === CUSTOM_FILTER) {
        window.setTimeout(() => renderRelations(root, search.value), 80);
      }
    });
  }

  function waitForRoot() {
    const root = document.getElementById(ROOT_ID);
    if (root) return install(root);
    const observer = new MutationObserver(() => {
      const candidate = document.getElementById(ROOT_ID);
      if (!candidate) return;
      observer.disconnect();
      install(candidate);
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }

  const API = Object.freeze({ VERSION, normalize, deriveRelations, invalidateRelations });
  globalThis.__aldusDuplicateRelationsV269 = API;

  if (typeof document === "undefined") return;
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", waitForRoot, { once: true });
  else waitForRoot();
})();
