(() => {
  "use strict";

  const VERSION = "20260808-duplicate-direct-topic-search-v270";
  const ROOT_ID = "aldusDuplicateDiagnosticsV260";
  const CUSTOM_FILTER = "relations";
  const CUSTOM_CONTAINER_CLASS = "aldus-dup-v266-results";
  const CUSTOM_MODE_CLASS = "aldus-dup-v266-custom-mode";
  const SEARCH_DEBOUNCE_MS = 140;
  const MAX_DIRECT_MATCHES = 30;
  const MAX_PAIR_RESULTS = 90;
  const MAX_RELATION_RESULTS = 120;

  let searchTimer = 0;
  let profileCache = null;
  let relationCache = null;

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

  function queryMatches(text, query) {
    const normalizedQuery = normalize(query);
    if (!normalizedQuery) return true;
    const tokens = normalizedQuery.split(" ").filter(Boolean);
    if (!tokens.length) return true;
    return tokens.every((token) => text.includes(token));
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
    for (const a of codeRows(left)) {
      for (const b of codeRows(right)) {
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
    let hash = 2166136261;
    for (const item of items) {
      const text = [item?.id, item?.discipline, item?.disciplina, item?.topic, item?.subject, item?.subtopic, item?.reference, item?.code, item?.updatedAt].join("|");
      for (let index = 0; index < text.length; index += 1) {
        hash ^= text.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
      }
    }
    return `${items.length}|${hash >>> 0}|${targetState?.duplicateDiagnostics?.lastScanAt || ""}`;
  }

  function getProfileIndex(targetState, diagnosticsApi) {
    const signature = stateSignature(targetState);
    if (profileCache?.state === targetState && profileCache.signature === signature) return profileCache;
    const built = diagnosticsApi.buildProfiles?.(targetState);
    const profiles = Array.isArray(built) ? built : (Array.isArray(built?.profiles) ? built.profiles : []);
    const weights = built?.weights instanceof Map ? built.weights : new Map();
    profileCache = {
      state: targetState,
      signature,
      profiles,
      weights,
      rows: profiles.map((profile) => ({ profile, text: profileSearchText(profile) }))
    };
    relationCache = null;
    return profileCache;
  }

  function classificationLabel(classification) {
    if (classification === "exact") return "Duplicidade exata";
    if (classification === "probable") return "Duplicidade provável";
    if (classification === "overlap") return "Sobreposição informativa";
    if (classification === "related" || classification === "relation") return "Relação informativa";
    return "Caso relacionado";
  }

  function renderProfile(profile) {
    const code = profileCode(profile);
    return `
      <article class="aldus-dup-v266-card" data-v270-topic="${escapeHtml(profile?.id || "")}">
        <header>
          <span class="aldus-dup-v266-badge">Tema localizado no edital</span>
          <strong>${escapeHtml(profileDiscipline(profile))}</strong>
        </header>
        <div class="aldus-dup-v266-pair-grid" style="grid-template-columns:1fr">
          <section>
            <small>${escapeHtml(profileDiscipline(profile))}</small>
            <h4>${escapeHtml([code, profileLabel(profile)].filter(Boolean).join(" — "))}</h4>
          </section>
        </div>
        <p class="aldus-dup-v266-warning">Localizado diretamente entre as metas do edital, independentemente da categoria do diagnóstico.</p>
      </article>`;
  }

  function renderPair(pair) {
    const leftCode = profileCode(pair.left);
    const rightCode = profileCode(pair.right);
    const reasons = (pair.reasons || []).map((reason) => `<li>${escapeHtml(reason)}</li>`).join("");
    return `
      <article class="aldus-dup-v266-card" data-v270-pair="${escapeHtml(pair.key || pairKey(pair.left, pair.right))}">
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
        <p class="aldus-dup-v266-warning">A busca localizou este vínculo a partir do tema encontrado. Para consolidar, use a categoria correspondente do diagnóstico.</p>
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

  function directTopicSearch(targetState, diagnosticsApi, query) {
    const index = getProfileIndex(targetState, diagnosticsApi);
    const normalizedQuery = normalize(query);
    const direct = index.rows
      .filter((row) => queryMatches(row.text, normalizedQuery))
      .sort((a, b) => {
        const aLabel = normalize(profileLabel(a.profile));
        const bLabel = normalize(profileLabel(b.profile));
        const aRank = aLabel === normalizedQuery ? 3 : aLabel.includes(normalizedQuery) ? 2 : 1;
        const bRank = bLabel === normalizedQuery ? 3 : bLabel.includes(normalizedQuery) ? 2 : 1;
        return bRank - aRank || aLabel.localeCompare(bLabel, "pt-BR");
      });

    const selected = direct.slice(0, MAX_DIRECT_MATCHES).map((row) => row.profile);
    const pairs = new Map();
    for (const left of selected) {
      for (const right of index.profiles) {
        if (!right || left.id === right.id) continue;
        const key = pairKey(left, right);
        if (pairs.has(key)) continue;
        let pair = diagnosticsApi.evaluatePair?.(left, right, index.weights) || null;
        const prefix = codePrefixRelation(left, right);
        const semantic = administrativeControlRelation(left, right);
        if (!pair && (prefix || semantic)) {
          pair = {
            key,
            left,
            right,
            classification: "relation",
            confidence: prefix ? 72 : 64,
            reasons: [relationReason(left, right)]
          };
        }
        if (pair) pairs.set(key, pair);
      }
    }

    return {
      direct,
      selected,
      pairs: [...pairs.values()].sort((a, b) => (b.confidence - a.confidence) || profileLabel(a.left).localeCompare(profileLabel(b.left), "pt-BR"))
    };
  }

  function renderSearch(root, query) {
    const list = root.querySelector("[data-dup-list]");
    const diagnosticsApi = globalThis.AldusDuplicateDiagnosticsV260;
    const currentState = stateReference();
    if (!list) return;
    const container = setCustomMode(list, true);
    if (!diagnosticsApi || !currentState) {
      container.innerHTML = customHeading("Busca no edital", "Os dados ainda não terminaram de carregar.", 0);
      return;
    }

    const result = directTopicSearch(currentState, diagnosticsApi, query);
    const directShown = result.selected;
    const pairShown = result.pairs.slice(0, MAX_PAIR_RESULTS);
    const directOverflow = Math.max(0, result.direct.length - directShown.length);
    const pairOverflow = Math.max(0, result.pairs.length - pairShown.length);

    let html = customHeading(
      "Busca no edital",
      `“${query}” — primeiro são localizados os temas; depois são mostrados somente os vínculos desses temas.`,
      result.direct.length
    );

    if (!result.direct.length) {
      html += '<p class="aldus-dup-v266-empty">Nenhum tema do edital corresponde à busca.</p>';
      container.innerHTML = html;
      return;
    }

    html += directShown.map(renderProfile).join("");
    if (directOverflow) html += `<p class="aldus-dup-v266-empty">Há mais ${directOverflow} tema(s) correspondente(s). Refine a pesquisa para reduzir a lista.</p>`;
    html += customHeading("Vínculos do tema localizado", "Duplicidades, sobreposições e relações encontradas apenas para os temas acima.", result.pairs.length);
    html += pairShown.length
      ? pairShown.map(renderPair).join("")
      : '<p class="aldus-dup-v266-empty">O tema existe no edital, mas não possui vínculo diagnóstico com outra meta.</p>';
    if (pairOverflow) html += `<p class="aldus-dup-v266-empty">Exibindo ${pairShown.length} de ${result.pairs.length} vínculos. Refine a pesquisa para ver menos resultados.</p>`;
    container.innerHTML = html;
  }

  function getAllRelations(targetState, diagnosticsApi) {
    const index = getProfileIndex(targetState, diagnosticsApi);
    if (relationCache?.signature === index.signature) return relationCache.rows;
    const rows = new Map();
    for (let i = 0; i < index.profiles.length; i += 1) {
      for (let j = i + 1; j < index.profiles.length; j += 1) {
        const left = index.profiles[i];
        const right = index.profiles[j];
        const prefix = codePrefixRelation(left, right);
        const semantic = administrativeControlRelation(left, right);
        if (!prefix && !semantic) continue;
        const key = pairKey(left, right);
        rows.set(key, {
          key,
          left,
          right,
          classification: "relation",
          confidence: prefix ? 72 : 64,
          reasons: [relationReason(left, right)]
        });
      }
    }
    relationCache = { signature: index.signature, rows: [...rows.values()] };
    return relationCache.rows;
  }

  function renderRelations(root) {
    const list = root.querySelector("[data-dup-list]");
    const diagnosticsApi = globalThis.AldusDuplicateDiagnosticsV260;
    const currentState = stateReference();
    if (!list) return;
    const container = setCustomMode(list, true);
    if (!diagnosticsApi || !currentState) {
      container.innerHTML = customHeading("Relações e sobreposições", "Os dados ainda não terminaram de carregar.", 0);
      return;
    }
    const all = getAllRelations(currentState, diagnosticsApi);
    const shown = all.slice(0, MAX_RELATION_RESULTS);
    container.innerHTML = customHeading("Relações e sobreposições", "Categoria informativa. Use Localizar para encontrar um tema específico sem recalcular todo o diagnóstico.", all.length)
      + (shown.length ? shown.map(renderPair).join("") : '<p class="aldus-dup-v266-empty">Nenhuma relação informativa foi localizada.</p>')
      + (all.length > shown.length ? `<p class="aldus-dup-v266-empty">Exibindo ${shown.length} de ${all.length}. Use Localizar para pesquisar um tema específico.</p>` : "");
  }

  function invalidateCaches() {
    profileCache = null;
    relationCache = null;
  }

  function install(root) {
    if (!root || root.dataset.v270SearchInstalled) return;
    root.dataset.v270SearchInstalled = "true";
    root.classList.add("aldus-dup-v266");

    const filter = root.querySelector("[data-dup-filter]");
    const search = root.querySelector("[data-v261-search]");
    const list = root.querySelector("[data-dup-list]");
    if (!filter || !search || !list) {
      root.dataset.v270SearchInstalled = "";
      window.setTimeout(() => install(root), 100);
      return;
    }

    if (!filter.querySelector(`option[value="${CUSTOM_FILTER}"]`)) {
      const option = document.createElement("option");
      option.value = CUSTOM_FILTER;
      option.textContent = "Relações e sobreposições";
      filter.appendChild(option);
    }

    search.placeholder = "Buscar tema, disciplina ou código no edital";
    search.setAttribute("aria-label", "Buscar diretamente entre os temas do edital");

    root.addEventListener("change", (event) => {
      if (event.target !== filter) return;
      window.clearTimeout(searchTimer);
      search.value = "";
      if (filter.value === CUSTOM_FILTER) {
        event.preventDefault();
        event.stopImmediatePropagation();
        renderRelations(root);
      } else {
        setCustomMode(list, false);
      }
    }, true);

    root.addEventListener("input", (event) => {
      if (event.target !== search) return;
      event.stopImmediatePropagation();
      const query = String(search.value || "").trim();
      window.clearTimeout(searchTimer);
      if (!query) {
        if (filter.value === CUSTOM_FILTER) renderRelations(root);
        else setCustomMode(list, false);
        return;
      }
      const container = setCustomMode(list, true);
      container.innerHTML = customHeading("Busca no edital", "Localizando o tema e seus vínculos…", 0);
      searchTimer = window.setTimeout(() => renderSearch(root, query), SEARCH_DEBOUNCE_MS);
    }, true);

    root.querySelector("[data-dup-run]")?.addEventListener("click", () => {
      invalidateCaches();
      window.clearTimeout(searchTimer);
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

  const API = Object.freeze({ VERSION, normalize, directTopicSearch, invalidateCaches });
  globalThis.__aldusDuplicateRelationsV269 = API;
  globalThis.__aldusDuplicateSearchV270 = API;

  if (typeof document === "undefined") return;
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", waitForRoot, { once: true });
  else waitForRoot();
})();
