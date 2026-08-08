(() => {
  "use strict";

  const VERSION = "20260808-duplicate-official-map-diagnostic-v273";
  const ROOT_ID = "aldusDuplicateDiagnosticsV260";
  const CUSTOM_CONTAINER_CLASS = "aldus-dup-v266-results";
  const CUSTOM_MODE_CLASS = "aldus-dup-v266-custom-mode";
  const SEARCH_DELAY_MS = 190;
  const MAX_PAIR_RESULTS = 72;
  const MAX_EMBEDDED_RESULTS = 48;
  const MAX_MAPPING_RESULTS = 48;

  let searchTimer = 0;
  let installed = false;

  function normalize(value) {
    const base = globalThis.__aldusDuplicateSearchV272?.normalize;
    if (typeof base === "function") return base(value);
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
    const base = globalThis.__aldusDuplicateSearchV272?.numericCode;
    if (typeof base === "function") return base(value);
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
    const base = globalThis.__aldusDuplicateSearchV272?.profileCode;
    if (typeof base === "function") return base(profile);
    const values = [profile?.code, profile?.item?.code, profile?.item?.reference, profile?.item?.subtopic, profile?.item?.topic];
    for (const value of values) {
      const code = numericCode(value);
      if (code) return code;
    }
    return "";
  }

  function profileTitle(profile) {
    const base = globalThis.__aldusDuplicateSearchV272?.profileTitle;
    if (typeof base === "function") return base(profile);
    const values = [
      profile?.item?.subtopic,
      profile?.item?.topic,
      profile?.item?.subject,
      profile?.item?.title,
      profile?.item?.name,
      profile?.label,
      profile?.item?.reference
    ];
    for (const value of values) {
      const title = cleanTitle(value);
      if (title && /[a-zA-ZÀ-ÿ]/.test(title)) return title;
    }
    return "Tema sem título";
  }

  function displayTitle(profile) {
    return [profileCode(profile), profileTitle(profile)].filter(Boolean).join(" — ") || "Tema sem título";
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

  function rowDiscipline(row, fallback = "") {
    return String(row?.discipline || row?.disciplina || fallback || "").trim();
  }

  function rowAsProfile(row, fallbackDiscipline = "") {
    const discipline = rowDiscipline(row, fallbackDiscipline);
    return {
      normalizedDiscipline: normalize(discipline),
      disciplineLabel: discipline
    };
  }

  function disciplineCompatible(left, right) {
    const base = globalThis.__aldusDuplicateSearchV272?.disciplineCompatible;
    if (typeof base === "function") return base(left, right);
    return normalize(profileDiscipline(left)) === normalize(profileDiscipline(right));
  }

  function controlTextsRelated(leftText, rightText) {
    const base = globalThis.__aldusDuplicateSearchV272?.controlTextsRelated;
    if (typeof base === "function") return base(leftText, rightText);
    const role = (text) => {
      const value = normalize(text);
      return {
        broad: /controle (da )?administracao publica/.test(value),
        specific: value.includes("controle") && /\b(interno|externo|judicial|legislativo)\b/.test(value)
      };
    };
    const left = role(leftText);
    const right = role(rightText);
    return (left.broad && right.specific) || (right.broad && left.specific);
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

  function embeddedEntries(profile) {
    const item = profile?.item || {};
    const rows = [];
    const add = (row, source) => {
      if (!row || typeof row !== "object") return;
      const title = rowTitle(row);
      const code = rowCode(row);
      const discipline = rowDiscipline(row, profileDiscipline(profile));
      if (!title && !code) return;
      const text = normalize([
        title,
        row?.topic,
        row?.subtopic,
        row?.subject,
        row?.reference,
        row?.assunto,
        row?.tema,
        discipline
      ].filter(Boolean).join(" "));
      const key = normalize([source, row?.contestId, row?.contest, row?.syllabusItemId, code, discipline, title].join("|"));
      if (!rows.some((entry) => entry.key === key)) {
        rows.push({ key, row, source, title, code, discipline, text });
      }
    };
    (Array.isArray(profile?.coverage) ? profile.coverage : []).forEach((row) => add(row, "Cobertura oficial"));
    (Array.isArray(item?.officialCoverage) ? item.officialCoverage : []).forEach((row) => add(row, "Cobertura oficial"));
    (Array.isArray(item?.aliases) ? item.aliases : []).forEach((row) => add(row, "Alias consolidado"));
    return rows;
  }

  function controlEntries(profile) {
    return [
      {
        source: "Meta canônica",
        title: profileTitle(profile),
        code: profileCode(profile),
        discipline: profileDiscipline(profile),
        text: coreProfileText(profile),
        row: null
      },
      ...embeddedEntries(profile)
    ].filter((entry) => entry.text && normalize(entry.text).includes("controle"));
  }

  function controlEvidenceBetweenProfiles(left, right) {
    if (!disciplineCompatible(left, right)) return null;
    for (const leftEntry of controlEntries(left)) {
      for (const rightEntry of controlEntries(right)) {
        if (!controlTextsRelated(leftEntry.text, rightEntry.text)) continue;
        return { leftEntry, rightEntry };
      }
    }
    return null;
  }

  function pairKey(left, right) {
    return [String(left?.id || ""), String(right?.id || "")].sort().join("::");
  }

  function tombstoneFor(targetState, itemId) {
    const store = targetState?.syncTombstones?.collections?.syllabusItems;
    if (!store || typeof store !== "object" || !itemId) return null;
    if (store[itemId]) return store[itemId];
    for (const [key, value] of Object.entries(store)) {
      if (String(key) === String(itemId)) return value || { key };
      if (String(value?.key || "") === String(itemId)) return value;
      if (String(value?.itemId || value?.id || "") === String(itemId)) return value;
    }
    return null;
  }

  function mappingRows(targetState) {
    return Array.isArray(targetState?.contestSyllabusMap) ? targetState.contestSyllabusMap : [];
  }

  function mappingText(row) {
    return normalize([
      rowTitle(row),
      rowCode(row),
      row?.discipline,
      row?.disciplina,
      row?.topic,
      row?.subtopic,
      row?.subject,
      row?.reference,
      row?.contestId,
      row?.contest,
      row?.contestName
    ].filter(Boolean).join(" "));
  }

  function buildProfileIndex(targetState, diagnosticsApi) {
    const built = diagnosticsApi.buildProfiles?.(targetState);
    const profiles = Array.isArray(built) ? built : (Array.isArray(built?.profiles) ? built.profiles : []);
    const weights = built?.weights instanceof Map ? built.weights : new Map();
    const byId = new Map(profiles.map((profile) => [String(profile?.id || ""), profile]));
    return { profiles, weights, byId };
  }

  function orphanMappingRelations(targetState, selected, index) {
    const rows = new Map();
    for (const left of selected) {
      const leftText = coreProfileText(left);
      for (const row of mappingRows(targetState)) {
        const ownerId = String(row?.syllabusItemId || "");
        if (!ownerId || ownerId === String(left?.id || "")) continue;
        if (index.byId.has(ownerId)) continue;
        if (!disciplineCompatible(left, rowAsProfile(row, profileDiscipline(left)))) continue;
        const text = mappingText(row);
        if (!controlTextsRelated(leftText, text)) continue;
        const title = rowTitle(row);
        const code = rowCode(row);
        const discipline = rowDiscipline(row, profileDiscipline(left));
        const contest = String(row?.contestName || row?.contest || row?.contestId || "").trim();
        const tombstone = tombstoneFor(targetState, ownerId);
        const key = normalize([left?.id, ownerId, row?.id, contest, code, title].join("|"));
        if (!key || rows.has(key)) continue;
        rows.set(key, {
          key,
          left,
          row,
          ownerId,
          title,
          code,
          discipline,
          contest,
          tombstone,
          status: tombstone ? "Meta excluída" : "Meta canônica ausente"
        });
      }
    }
    return [...rows.values()];
  }

  function directOrphanMappings(targetState, index, query) {
    const normalizedQuery = normalize(query);
    if (!normalizedQuery) return [];
    const tokens = normalizedQuery.split(" ").filter(Boolean);
    const out = [];
    const seen = new Set();
    for (const row of mappingRows(targetState)) {
      const ownerId = String(row?.syllabusItemId || "");
      if (ownerId && index.byId.has(ownerId)) continue;
      const text = mappingText(row);
      if (!tokens.every((token) => text.includes(token))) continue;
      const key = normalize([ownerId, row?.id, row?.contestId, rowCode(row), rowTitle(row)].join("|"));
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.push({
        key,
        row,
        ownerId,
        title: rowTitle(row),
        code: rowCode(row),
        discipline: rowDiscipline(row),
        contest: String(row?.contestName || row?.contest || row?.contestId || "").trim(),
        tombstone: tombstoneFor(targetState, ownerId)
      });
    }
    return out.slice(0, MAX_MAPPING_RESULTS);
  }

  function augmentPairs(basePairs, selected, index) {
    const pairs = new Map((basePairs || []).map((pair) => [pair.key || pairKey(pair.left, pair.right), pair]));
    for (const left of selected) {
      for (const right of index.profiles) {
        if (!right || left.id === right.id || !disciplineCompatible(left, right)) continue;
        const key = pairKey(left, right);
        if (pairs.has(key)) continue;
        const evidence = controlEvidenceBetweenProfiles(left, right);
        if (!evidence) continue;
        const evidenceTitle = evidence.leftEntry.source !== "Meta canônica"
          ? `${evidence.leftEntry.source}: ${evidence.leftEntry.title || evidence.leftEntry.text}`
          : evidence.rightEntry.source !== "Meta canônica"
            ? `${evidence.rightEntry.source}: ${evidence.rightEntry.title || evidence.rightEntry.text}`
            : "";
        const reasons = [
          "Tema amplo de Controle da Administração Pública relacionado à modalidade Controle interno e externo."
        ];
        if (evidenceTitle) reasons.push(`Evidência encontrada em ${evidenceTitle}.`);
        pairs.set(key, {
          key,
          left,
          right,
          classification: "relation",
          confidence: 82,
          reasons
        });
      }
    }
    return [...pairs.values()].sort((a, b) =>
      (Number(b.confidence || 0) - Number(a.confidence || 0))
      || profileTitle(a.left).localeCompare(profileTitle(b.left), "pt-BR")
    );
  }

  function enhancedSearch(targetState, diagnosticsApi, query) {
    const baseApi = globalThis.__aldusDuplicateSearchV272;
    if (!baseApi?.directTopicSearch) return null;
    const base = baseApi.directTopicSearch(targetState, diagnosticsApi, query);
    const index = buildProfileIndex(targetState, diagnosticsApi);
    const pairs = augmentPairs(base.pairs, base.selected || [], index);
    const mapping = orphanMappingRelations(targetState, base.selected || [], index);
    const orphanDirect = directOrphanMappings(targetState, index, query);
    return { ...base, pairs, mapping, orphanDirect, index };
  }

  function classificationLabel(classification) {
    if (classification === "exact") return "Duplicidade exata";
    if (classification === "probable") return "Duplicidade provável";
    if (classification === "overlap") return "Sobreposição informativa";
    if (classification === "related" || classification === "relation") return "Relação informativa";
    return "Caso relacionado";
  }

  function renderProfile(profile) {
    return `
      <article class="aldus-dup-v266-card aldus-dup-v271-card" data-v273-topic="${escapeHtml(profile?.id || "")}">
        <header><span class="aldus-dup-v266-badge">Tema localizado no edital</span><strong>${escapeHtml(profileDiscipline(profile))}</strong></header>
        <div class="aldus-dup-v266-pair-grid aldus-dup-v271-single">
          <section><small>${escapeHtml(profileDiscipline(profile))}</small><h4>${escapeHtml(displayTitle(profile))}</h4></section>
        </div>
        <p class="aldus-dup-v266-warning">Localizado nas metas, cobertura oficial ou aliases deste edital.</p>
      </article>`;
  }

  function renderPair(pair) {
    const reasons = (pair?.reasons || []).map((reason) => `<li>${escapeHtml(reason)}</li>`).join("");
    return `
      <article class="aldus-dup-v266-card aldus-dup-v271-card" data-v273-pair="${escapeHtml(pair?.key || pairKey(pair?.left, pair?.right))}">
        <header><span class="aldus-dup-v266-badge">${escapeHtml(classificationLabel(pair?.classification))}</span><strong>${Math.max(0, Math.min(100, Number(pair?.confidence || 0)))}% de confiança</strong></header>
        <div class="aldus-dup-v266-pair-grid">
          <section><small>${escapeHtml(profileDiscipline(pair?.left))}</small><h4>${escapeHtml(displayTitle(pair?.left))}</h4></section>
          <span aria-hidden="true">↔</span>
          <section><small>${escapeHtml(profileDiscipline(pair?.right))}</small><h4>${escapeHtml(displayTitle(pair?.right))}</h4></section>
        </div>
        ${reasons ? `<ul class="aldus-dup-v266-reasons">${reasons}</ul>` : ""}
        <p class="aldus-dup-v266-warning">Vínculo encontrado entre metas ou pela cobertura oficial de uma meta da mesma disciplina.</p>
      </article>`;
  }

  function renderEmbedded(relation) {
    const rightTitle = [relation?.code, relation?.title].filter(Boolean).join(" — ");
    const contest = relation?.contest ? ` • ${relation.contest}` : "";
    return `
      <article class="aldus-dup-v266-card aldus-dup-v271-card" data-v273-embedded="${escapeHtml(relation?.key || "")}">
        <header><span class="aldus-dup-v266-badge">${escapeHtml(relation?.source || "Cobertura relacionada")}</span><strong>Mesma meta canônica</strong></header>
        <div class="aldus-dup-v266-pair-grid">
          <section><small>${escapeHtml(profileDiscipline(relation?.profile))}</small><h4>${escapeHtml(displayTitle(relation?.profile))}</h4></section>
          <span aria-hidden="true">↔</span>
          <section><small>${escapeHtml(`${relation?.discipline || ""}${contest}`)}</small><h4>${escapeHtml(rightTitle || relation?.title || "Redação relacionada")}</h4></section>
        </div>
        <ul class="aldus-dup-v266-reasons"><li>${escapeHtml(relation?.reason || "Redação relacionada já incorporada à mesma meta.")}</li></ul>
      </article>`;
  }

  function renderMapping(relation) {
    const rightTitle = [relation?.code, relation?.title].filter(Boolean).join(" — ") || "Mapeamento sem título";
    const contest = relation?.contest ? ` • ${relation.contest}` : "";
    const deletedAt = relation?.tombstone?.deletedAt ? ` em ${new Date(relation.tombstone.deletedAt).toLocaleString("pt-BR")}` : "";
    const statusText = relation?.tombstone
      ? `O mapeamento oficial aponta para a meta ${relation.ownerId}, mas existe um registro de exclusão${deletedAt}.`
      : `O mapeamento oficial aponta para ${relation.ownerId || "um item sem identificador"}, porém essa meta não existe atualmente em syllabusItems.`;
    return `
      <article class="aldus-dup-v266-card aldus-dup-v271-card" data-v273-mapping="${escapeHtml(relation?.key || "")}">
        <header><span class="aldus-dup-v266-badge">Mapeamento oficial relacionado</span><strong>${escapeHtml(relation?.status || (relation?.tombstone ? "Meta excluída" : "Meta canônica ausente"))}</strong></header>
        <div class="aldus-dup-v266-pair-grid">
          <section><small>${escapeHtml(profileDiscipline(relation?.left))}</small><h4>${escapeHtml(displayTitle(relation?.left))}</h4></section>
          <span aria-hidden="true">↔</span>
          <section><small>${escapeHtml(`${relation?.discipline || "Disciplina não informada"}${contest}`)}</small><h4>${escapeHtml(rightTitle)}</h4></section>
        </div>
        <ul class="aldus-dup-v266-reasons">
          <li>${escapeHtml(statusText)}</li>
          <li>O diagnóstico não recriou nem removeu nenhuma meta; esta informação é apenas forense.</li>
        </ul>
      </article>`;
  }

  function renderOrphanDirect(mapping) {
    const title = [mapping?.code, mapping?.title].filter(Boolean).join(" — ") || "Mapeamento sem título";
    const contest = mapping?.contest ? ` • ${mapping.contest}` : "";
    const status = mapping?.tombstone ? "Meta excluída" : "Sem meta canônica";
    return `
      <article class="aldus-dup-v266-card aldus-dup-v271-card" data-v273-orphan="${escapeHtml(mapping?.key || "")}">
        <header><span class="aldus-dup-v266-badge">Mapeamento oficial localizado</span><strong>${escapeHtml(status)}</strong></header>
        <div class="aldus-dup-v266-pair-grid aldus-dup-v271-single">
          <section><small>${escapeHtml(`${mapping?.discipline || "Disciplina não informada"}${contest}`)}</small><h4>${escapeHtml(title)}</h4></section>
        </div>
        <p class="aldus-dup-v266-warning">A redação existe no mapeamento oficial, mas não corresponde a uma meta canônica atualmente carregada.</p>
      </article>`;
  }

  function customHeading(title, detail, count) {
    return `<div class="aldus-dup-v266-heading"><div><strong>${escapeHtml(title)}</strong><span>${escapeHtml(detail)}</span></div><b>${Number(count) || 0}</b></div>`;
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

  function setCustomMode(list) {
    list.classList.add(CUSTOM_MODE_CLASS);
    const container = ensureContainer(list);
    container.hidden = false;
    return container;
  }

  function renderEnhanced(root, query) {
    const list = root.querySelector("[data-dup-list]");
    const search = root.querySelector("[data-v261-search]");
    const diagnosticsApi = globalThis.AldusDuplicateDiagnosticsV260;
    const currentState = stateReference();
    const currentQuery = String(search?.value || "").trim();
    if (!list || !currentQuery || currentQuery !== String(query || "").trim()) return;
    const container = setCustomMode(list);
    if (!diagnosticsApi || !currentState || !globalThis.__aldusDuplicateSearchV272?.directTopicSearch) return;

    const result = enhancedSearch(currentState, diagnosticsApi, query);
    if (!result) return;

    const directProfiles = result.selected || [];
    const orphanDirect = result.orphanDirect || [];
    let html = customHeading(
      "Busca no edital",
      `“${query}” — metas, cobertura, aliases e mapeamento oficial completo.`,
      (result.direct?.length || 0) + orphanDirect.length
    );

    if (!directProfiles.length && !orphanDirect.length) {
      container.innerHTML = html + '<p class="aldus-dup-v266-empty">Nenhuma meta nem linha do mapeamento oficial corresponde à busca.</p>';
      return;
    }

    html += directProfiles.map(renderProfile).join("");
    html += orphanDirect.map(renderOrphanDirect).join("");

    const pairShown = (result.pairs || []).slice(0, MAX_PAIR_RESULTS);
    const embeddedShown = (result.embedded || []).slice(0, MAX_EMBEDDED_RESULTS);
    const mappingShown = (result.mapping || []).slice(0, MAX_MAPPING_RESULTS);
    const linkCount = (result.pairs?.length || 0) + (result.embedded?.length || 0) + (result.mapping?.length || 0);

    html += customHeading(
      "Vínculos do tema localizado",
      "Metas separadas, cobertura/aliases e mapeamentos oficiais órfãos são distinguidos abaixo.",
      linkCount
    );
    html += pairShown.map(renderPair).join("");
    html += embeddedShown.map(renderEmbedded).join("");
    html += mappingShown.map(renderMapping).join("");

    if (!linkCount) {
      const totalMappings = mappingRows(currentState).length;
      const broadSameDiscipline = directProfiles.length
        ? mappingRows(currentState).filter((row) => directProfiles.some((profile) =>
            disciplineCompatible(profile, rowAsProfile(row, profileDiscipline(profile)))
            && controlTextsRelated(coreProfileText(profile), mappingText(row))
          )).length
        : 0;
      html += `<p class="aldus-dup-v266-empty">Nenhum vínculo foi encontrado. O mapa oficial possui ${totalMappings} linha(s); ${broadSameDiscipline} delas apresentam relação temática de controle com o resultado atual. Se este contador também estiver em 0, “Controle da Administração Pública” não está no mapeamento oficial atual com redação reconhecível.</p>`;
    }

    container.innerHTML = html;
  }

  function onInputCapture(event) {
    const root = document.getElementById(ROOT_ID);
    if (!root || !root.contains(event.target) || !event.target.matches?.("[data-v261-search]")) return;
    const query = String(event.target.value || "").trim();
    window.clearTimeout(searchTimer);
    if (!query) return;
    searchTimer = window.setTimeout(() => renderEnhanced(root, query), SEARCH_DELAY_MS);
  }

  function install() {
    if (installed || typeof document === "undefined") return;
    installed = true;
    document.addEventListener("input", onInputCapture, true);
    const root = document.getElementById(ROOT_ID);
    const search = root?.querySelector("[data-v261-search]");
    const query = String(search?.value || "").trim();
    if (query) window.setTimeout(() => renderEnhanced(root, query), SEARCH_DELAY_MS + 40);
    globalThis.__aldusDuplicateMapDiagnosticV273 = Object.freeze({
      VERSION,
      enhancedSearch,
      controlEvidenceBetweenProfiles,
      orphanMappingRelations,
      directOrphanMappings
    });
  }

  if (typeof document === "undefined") {
    globalThis.__aldusDuplicateMapDiagnosticV273 = Object.freeze({
      VERSION,
      enhancedSearch,
      controlEvidenceBetweenProfiles,
      orphanMappingRelations,
      directOrphanMappings
    });
    return;
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install, { once: true });
  else install();
})();