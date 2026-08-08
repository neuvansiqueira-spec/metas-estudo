(() => {
  "use strict";

  const VERSION = "20260808-duplicate-control-coverage-v272";
  const ROOT_ID = "aldusDuplicateDiagnosticsV260";
  const CUSTOM_FILTER = "relations";
  const CUSTOM_CONTAINER_CLASS = "aldus-dup-v266-results";
  const CUSTOM_MODE_CLASS = "aldus-dup-v266-custom-mode";
  const SEARCH_DEBOUNCE_MS = 140;
  const MAX_DIRECT_MATCHES = 24;
  const MAX_PAIR_RESULTS = 72;
  const MAX_EMBEDDED_RESULTS = 48;

  let searchTimer = 0;
  let profileCache = null;

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

  function stateReference() {
    try {
      if (typeof state === "object" && state) return state;
    } catch {}
    return globalThis.state || null;
  }

  function numericCode(value) {
    const match = String(value ?? "").match(/(?:^|\b)(\d+(?:\.\d+){0,6})(?=\b|\s|$)/);
    return match?.[1] || "";
  }

  function cleanTitle(value) {
    return String(value ?? "")
      .replace(/^\s*\d+(?:\.\d+){0,6}\s*(?:[-–—:.)]+\s*)?/, "")
      .replace(/^\s*[-–—:.)]+\s*/, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function profileDiscipline(profile) {
    return String(
      profile?.disciplineLabel
      || profile?.item?.discipline
      || profile?.item?.disciplina
      || "Disciplina não informada"
    ).trim();
  }

  function profileCode(profile) {
    const item = profile?.item || {};
    const values = [
      profile?.code,
      item.code,
      item.codigo,
      item.referenceCode,
      item.ref,
      item.reference,
      item.referencia,
      item.topic,
      item.subject,
      item.subtopic,
      item.title,
      item.name
    ];
    for (const value of values) {
      const code = numericCode(value);
      if (code) return code;
    }
    return "";
  }

  function profileTitle(profile) {
    const item = profile?.item || {};
    const values = [
      item.subtopic,
      item.topic,
      item.subject,
      item.title,
      item.name,
      item.assunto,
      item.tema,
      item.reference,
      item.referencia,
      profile?.label
    ];
    for (const value of values) {
      const title = cleanTitle(value);
      if (title && /[a-zA-ZÀ-ÿ]/.test(title)) return title;
    }
    return cleanTitle(profile?.label) || "Tema sem título";
  }

  function disciplineKey(profile) {
    return normalize(profile?.normalizedDiscipline || profileDiscipline(profile));
  }

  function disciplineTokens(profile) {
    const stop = new Set(["direito", "e", "gestao", "publica", "publico", "legislacao", "especial", "especifica"]);
    return disciplineKey(profile).split(" ").filter((token) => token && !stop.has(token));
  }

  function disciplineCompatible(left, right) {
    const a = disciplineKey(left);
    const b = disciplineKey(right);
    if (!a || !b) return false;
    if (a === b) return true;
    if (a.length >= 8 && b.length >= 8 && (a.includes(b) || b.includes(a))) return true;
    const aTokens = new Set(disciplineTokens(left));
    const bTokens = new Set(disciplineTokens(right));
    if (!aTokens.size || !bTokens.size) return false;
    let shared = 0;
    aTokens.forEach((token) => { if (bTokens.has(token)) shared += 1; });
    return shared >= 1 && shared / Math.min(aTokens.size, bTokens.size) >= 0.6;
  }

  function rowAsProfile(row, fallbackDiscipline) {
    return {
      normalizedDiscipline: normalize(row?.discipline || row?.disciplina || fallbackDiscipline || ""),
      disciplineLabel: row?.discipline || row?.disciplina || fallbackDiscipline || ""
    };
  }

  function rowTitle(row) {
    const values = [row?.subtopic, row?.topic, row?.subject, row?.title, row?.name, row?.assunto, row?.tema, row?.reference, row?.referencia];
    for (const value of values) {
      const title = cleanTitle(value);
      if (title && /[a-zA-ZÀ-ÿ]/.test(title)) return title;
    }
    return "";
  }

  function rowCode(row) {
    const values = [row?.code, row?.codigo, row?.referenceCode, row?.ref, row?.reference, row?.referencia, row?.topic, row?.subtopic];
    for (const value of values) {
      const code = numericCode(value);
      if (code) return code;
    }
    return "";
  }

  function coreProfileText(profile) {
    const item = profile?.item || {};
    return normalize([
      profileTitle(profile),
      profile?.label,
      item.topic,
      item.subject,
      item.subtopic,
      item.reference,
      item.assunto,
      item.tema,
      item.notes
    ].filter(Boolean).join(" "));
  }

  function embeddedRows(profile) {
    const item = profile?.item || {};
    const rows = [];
    const add = (row, source) => {
      if (!row || typeof row !== "object") return;
      const title = rowTitle(row);
      const code = rowCode(row);
      const discipline = String(row?.discipline || row?.disciplina || profileDiscipline(profile) || "").trim();
      if (!title && !code) return;
      const key = normalize([source, row?.contestId, row?.contest, code, discipline, title].join("|"));
      if (rows.some((entry) => entry.key === key)) return;
      rows.push({ key, row, source, title, code, discipline });
    };

    (Array.isArray(profile?.coverage) ? profile.coverage : []).forEach((row) => add(row, "Cobertura oficial relacionada"));
    (Array.isArray(item?.officialCoverage) ? item.officialCoverage : []).forEach((row) => add(row, "Cobertura oficial relacionada"));
    (Array.isArray(item?.aliases) ? item.aliases : []).forEach((row) => add(row, "Tema consolidado relacionado"));
    return rows;
  }

  function profileSearchText(profile) {
    const embedded = embeddedRows(profile).map((entry) => [entry.title, entry.code, entry.discipline, entry.row?.reference].filter(Boolean).join(" "));
    return normalize([
      coreProfileText(profile),
      profileDiscipline(profile),
      profileCode(profile),
      profile?.normalizedTopic,
      ...embedded
    ].filter(Boolean).join(" "));
  }

  function queryMatches(text, query) {
    const tokens = normalize(query).split(" ").filter(Boolean);
    return tokens.length > 0 && tokens.every((token) => text.includes(token));
  }

  function controlRole(text) {
    const normalized = normalize(text);
    const hasControl = normalized.includes("controle");
    const broad = hasControl && (
      /controle (da )?administracao publica/.test(normalized)
      || /controle da administracao/.test(normalized)
      || /controle sobre a administracao publica/.test(normalized)
    );
    const specific = hasControl && /\b(interno|externo|judicial|legislativo)\b/.test(normalized);
    return { hasControl, broad, specific };
  }

  function controlTextsRelated(leftText, rightText) {
    const left = controlRole(leftText);
    const right = controlRole(rightText);
    if (!left.hasControl || !right.hasControl) return false;
    return (left.broad && right.specific) || (right.broad && left.specific);
  }

  function codeRows(profile) {
    const rows = [];
    const add = (code, contestId = "") => {
      const normalizedCode = numericCode(code);
      if (!normalizedCode) return;
      const key = `${contestId || ""}|${normalizedCode}`;
      if (!rows.some((row) => row.key === key)) rows.push({ key, code: normalizedCode, contestId: String(contestId || "") });
    };
    add(profileCode(profile));
    embeddedRows(profile).forEach((entry) => add(entry.code || entry.row?.reference, entry.row?.contestId || entry.row?.contest));
    return rows;
  }

  function codePrefixRelation(left, right) {
    if (!disciplineCompatible(left, right)) return "";
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
    return disciplineCompatible(left, right) && controlTextsRelated(coreProfileText(left), coreProfileText(right));
  }

  function pairKey(left, right) {
    return [String(left?.id || ""), String(right?.id || "")].sort().join("::");
  }

  function relationReason(left, right) {
    if (administrativeControlRelation(left, right)) return "Tema amplo de Controle da Administração Pública relacionado à modalidade Controle interno e externo.";
    const prefix = codePrefixRelation(left, right);
    if (prefix) return `Relação de eixo e subitem oficial na mesma disciplina (${prefix}).`;
    return "Relação temática informativa identificada pelo diagnóstico.";
  }

  function embeddedControlRelations(profile) {
    const baseText = coreProfileText(profile);
    const baseTitle = normalize(profileTitle(profile));
    const fallbackDiscipline = profileDiscipline(profile);
    const relations = [];
    for (const entry of embeddedRows(profile)) {
      if (!disciplineCompatible(profile, rowAsProfile(entry.row, fallbackDiscipline))) continue;
      if (!entry.title || normalize(entry.title) === baseTitle) continue;
      const rowText = normalize([entry.title, entry.row?.topic, entry.row?.subtopic, entry.row?.reference].filter(Boolean).join(" "));
      if (!controlTextsRelated(baseText, rowText)) continue;
      relations.push({
        key: `${profile.id || ""}|${entry.key}`,
        profile,
        title: entry.title,
        code: entry.code,
        discipline: entry.discipline || fallbackDiscipline,
        source: entry.source,
        contest: entry.row?.contestName || entry.row?.contest || entry.row?.contestId || "",
        reason: "A redação relacionada está vinculada à mesma meta canônica por cobertura oficial ou histórico de consolidação."
      });
    }
    return relations;
  }

  function stateSignature(targetState) {
    const items = Array.isArray(targetState?.syllabusItems) ? targetState.syllabusItems : [];
    let hash = 2166136261;
    for (const item of items) {
      const text = JSON.stringify([
        item?.id, item?.discipline, item?.disciplina, item?.topic, item?.subject,
        item?.subtopic, item?.reference, item?.code, item?.updatedAt,
        item?.officialCoverage, item?.aliases
      ]);
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
    return profileCache;
  }

  function classificationLabel(classification) {
    if (classification === "exact") return "Duplicidade exata";
    if (classification === "probable") return "Duplicidade provável";
    if (classification === "overlap") return "Sobreposição informativa";
    if (classification === "related" || classification === "relation") return "Relação informativa";
    return "Caso relacionado";
  }

  function displayTitle(profile) {
    return [profileCode(profile), profileTitle(profile)].filter(Boolean).join(" — ") || "Tema sem título";
  }

  function renderProfile(profile) {
    return `
      <article class="aldus-dup-v266-card aldus-dup-v271-card" data-v272-topic="${escapeHtml(profile?.id || "")}">
        <header><span class="aldus-dup-v266-badge">Tema localizado no edital</span><strong>${escapeHtml(profileDiscipline(profile))}</strong></header>
        <div class="aldus-dup-v266-pair-grid aldus-dup-v271-single">
          <section><small>${escapeHtml(profileDiscipline(profile))}</small><h4>${escapeHtml(displayTitle(profile))}</h4></section>
        </div>
        <p class="aldus-dup-v266-warning">Localizado diretamente nas metas, na cobertura oficial ou nos aliases consolidados deste edital.</p>
      </article>`;
  }

  function renderPair(pair) {
    const reasons = (pair.reasons || []).map((reason) => `<li>${escapeHtml(reason)}</li>`).join("");
    return `
      <article class="aldus-dup-v266-card aldus-dup-v271-card" data-v272-pair="${escapeHtml(pair.key || pairKey(pair.left, pair.right))}">
        <header><span class="aldus-dup-v266-badge">${escapeHtml(classificationLabel(pair.classification))}</span><strong>${Math.max(0, Math.min(100, Number(pair.confidence || 0)))}% de confiança</strong></header>
        <div class="aldus-dup-v266-pair-grid">
          <section><small>${escapeHtml(profileDiscipline(pair.left))}</small><h4>${escapeHtml(displayTitle(pair.left))}</h4></section>
          <span aria-hidden="true">↔</span>
          <section><small>${escapeHtml(profileDiscipline(pair.right))}</small><h4>${escapeHtml(displayTitle(pair.right))}</h4></section>
        </div>
        ${reasons ? `<ul class="aldus-dup-v266-reasons">${reasons}</ul>` : ""}
        <p class="aldus-dup-v266-warning">Vínculo entre metas separadas e disciplinarmente compatíveis.</p>
      </article>`;
  }

  function renderEmbedded(relation) {
    const rightTitle = [relation.code, relation.title].filter(Boolean).join(" — ");
    const contest = relation.contest ? ` • ${relation.contest}` : "";
    return `
      <article class="aldus-dup-v266-card aldus-dup-v271-card" data-v272-embedded="${escapeHtml(relation.key)}">
        <header><span class="aldus-dup-v266-badge">${escapeHtml(relation.source)}</span><strong>Mesma meta canônica</strong></header>
        <div class="aldus-dup-v266-pair-grid">
          <section><small>${escapeHtml(profileDiscipline(relation.profile))}</small><h4>${escapeHtml(displayTitle(relation.profile))}</h4></section>
          <span aria-hidden="true">↔</span>
          <section><small>${escapeHtml(`${relation.discipline}${contest}`)}</small><h4>${escapeHtml(rightTitle || relation.title)}</h4></section>
        </div>
        <ul class="aldus-dup-v266-reasons"><li>${escapeHtml(relation.reason)}</li></ul>
        <p class="aldus-dup-v266-warning">Não é uma segunda meta para consolidar: é uma redação oficial/alias já vinculada ao mesmo item.</p>
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
        const aTitle = normalize(profileTitle(a.profile));
        const bTitle = normalize(profileTitle(b.profile));
        const aRank = aTitle === normalizedQuery ? 3 : aTitle.includes(normalizedQuery) ? 2 : 1;
        const bRank = bTitle === normalizedQuery ? 3 : bTitle.includes(normalizedQuery) ? 2 : 1;
        return bRank - aRank || aTitle.localeCompare(bTitle, "pt-BR");
      });

    const selected = direct.slice(0, MAX_DIRECT_MATCHES).map((row) => row.profile);
    const pairs = new Map();
    const embedded = new Map();

    for (const left of selected) {
      embeddedControlRelations(left).forEach((relation) => embedded.set(relation.key, relation));
      for (const right of index.profiles) {
        if (!right || left.id === right.id || !disciplineCompatible(left, right)) continue;
        const key = pairKey(left, right);
        if (pairs.has(key)) continue;
        let pair = diagnosticsApi.evaluatePair?.(left, right, index.weights) || null;
        if (pair && !disciplineCompatible(pair.left, pair.right)) pair = null;
        const prefix = codePrefixRelation(left, right);
        const semantic = administrativeControlRelation(left, right);
        if (!pair && (prefix || semantic)) {
          pair = {
            key,
            left,
            right,
            classification: "relation",
            confidence: semantic ? 78 : 72,
            reasons: [relationReason(left, right)]
          };
        } else if (pair && semantic && !(pair.reasons || []).some((reason) => normalize(reason).includes("controle da administracao"))) {
          pair.reasons = [...(pair.reasons || []), relationReason(left, right)];
          pair.confidence = Math.max(Number(pair.confidence || 0), 78);
        }
        if (pair) pairs.set(key, pair);
      }
    }

    return {
      direct,
      selected,
      pairs: [...pairs.values()].sort((a, b) => (b.confidence - a.confidence) || profileTitle(a.left).localeCompare(profileTitle(b.left), "pt-BR")),
      embedded: [...embedded.values()]
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
    let html = customHeading("Busca no edital", `“${query}” — localização por tema, código, cobertura oficial e aliases.`, result.direct.length);
    if (!result.direct.length) {
      container.innerHTML = html + '<p class="aldus-dup-v266-empty">Nenhum tema, cobertura oficial ou alias corresponde à busca.</p>';
      return;
    }

    html += result.selected.map(renderProfile).join("");
    if (result.direct.length > result.selected.length) html += `<p class="aldus-dup-v266-empty">Há mais ${result.direct.length - result.selected.length} resultado(s). Refine a pesquisa.</p>`;

    const linkCount = result.pairs.length + result.embedded.length;
    html += customHeading("Vínculos do tema localizado", "Metas separadas e redações oficiais já incorporadas são distinguidas abaixo.", linkCount);
    const pairShown = result.pairs.slice(0, MAX_PAIR_RESULTS);
    const embeddedShown = result.embedded.slice(0, MAX_EMBEDDED_RESULTS);
    html += pairShown.map(renderPair).join("");
    html += embeddedShown.map(renderEmbedded).join("");
    if (!linkCount) html += '<p class="aldus-dup-v266-empty">O tema existe, mas não foi encontrada outra meta nem cobertura/alias relacionado dentro da mesma disciplina.</p>';
    if (result.pairs.length > pairShown.length || result.embedded.length > embeddedShown.length) html += '<p class="aldus-dup-v266-empty">Há mais vínculos. Refine a pesquisa para reduzir a lista.</p>';
    container.innerHTML = html;
  }

  function renderRelationsPrompt(root) {
    const list = root.querySelector("[data-dup-list]");
    if (!list) return;
    const container = setCustomMode(list, true);
    container.innerHTML = customHeading(
      "Relações e sobreposições",
      "Digite um tema em Localizar. A busca verifica metas separadas, cobertura oficial e aliases sem cruzar disciplinas diferentes.",
      0
    );
  }

  function install(root) {
    if (!root || root.dataset.v272SearchInstalled) return;
    root.dataset.v272SearchInstalled = "true";
    root.classList.add("aldus-dup-v266", "aldus-dup-v271", "aldus-dup-v272");

    const filter = root.querySelector("[data-dup-filter]");
    const search = root.querySelector("[data-v261-search]");
    const list = root.querySelector("[data-dup-list]");
    if (!filter || !search || !list) {
      root.dataset.v272SearchInstalled = "";
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
    search.setAttribute("aria-label", "Buscar tema, cobertura oficial ou alias no edital");

    root.addEventListener("change", (event) => {
      if (event.target !== filter) return;
      window.clearTimeout(searchTimer);
      search.value = "";
      if (filter.value === CUSTOM_FILTER) {
        event.preventDefault();
        event.stopImmediatePropagation();
        renderRelationsPrompt(root);
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
        if (filter.value === CUSTOM_FILTER) renderRelationsPrompt(root);
        else setCustomMode(list, false);
        return;
      }
      const container = setCustomMode(list, true);
      container.innerHTML = customHeading("Busca no edital", "Localizando o tema e verificando metas, cobertura oficial e aliases…", 0);
      searchTimer = window.setTimeout(() => renderSearch(root, query), SEARCH_DEBOUNCE_MS);
    }, true);

    root.querySelector("[data-dup-run]")?.addEventListener("click", () => {
      profileCache = null;
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

  const API = Object.freeze({
    VERSION,
    normalize,
    numericCode,
    profileCode,
    profileTitle,
    disciplineCompatible,
    controlTextsRelated,
    embeddedControlRelations,
    directTopicSearch
  });
  globalThis.__aldusDuplicateSearchV272 = API;

  if (typeof document === "undefined") return;
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", waitForRoot, { once: true });
  else waitForRoot();
})();
