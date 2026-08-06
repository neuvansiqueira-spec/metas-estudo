(() => {
  "use strict";

  const VERSION = "20260806-duplicate-diagnostics-ui-v261";
  const ROOT_ID = "aldusDuplicateDiagnosticsV260";
  const DEFAULT_FILTER = "probable";
  const DEFAULT_PAGE_SIZE = 6;

  const view = {
    root: null,
    list: null,
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    query: "",
    applying: false,
    scheduled: false,
    initialized: false,
    listObserver: null,
    summaryObserver: null,
    statusObserver: null
  };

  function normalize(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();
  }

  function numberFrom(node) {
    const value = String(node?.textContent || "").replace(/[^0-9-]/g, "");
    return Math.max(0, Number(value) || 0);
  }

  function createElement(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function getSummaryNumbers() {
    const cards = [...(view.root?.querySelectorAll("[data-dup-summary] > div") || [])];
    return {
      items: numberFrom(cards[0]?.querySelector("strong")),
      exact: numberFrom(cards[1]?.querySelector("strong")),
      probable: numberFrom(cards[2]?.querySelector("strong")),
      overlap: numberFrom(cards[3]?.querySelector("strong"))
    };
  }

  function rewriteSummary() {
    const cards = [...(view.root?.querySelectorAll("[data-dup-summary] > div") || [])];
    if (cards.length < 5) return;
    const numbers = getSummaryNumbers();
    const priority = numbers.exact + numbers.probable;

    const overlapLabel = cards[3].querySelector("span");
    if (overlapLabel) overlapLabel.textContent = "Sobreposições informativas";
    cards[3].classList.add("is-informational");
    cards[3].title = "Sobreposições não são duplicidades e não entram na fila principal de decisões.";

    const priorityValue = cards[4].querySelector("strong");
    const priorityLabel = cards[4].querySelector("span");
    if (priorityValue) priorityValue.textContent = String(priority);
    if (priorityLabel) priorityLabel.textContent = "Casos prioritários";
    cards[4].classList.add("is-priority");
    cards[4].title = "Soma de duplicidades exatas e duplicidades prováveis.";
  }

  function rewriteStatus() {
    const status = view.root?.querySelector("[data-dup-status]");
    if (!status || !/diagnóstico concluído/i.test(status.textContent || "")) return;
    const numbers = getSummaryNumbers();
    const priority = numbers.exact + numbers.probable;
    status.textContent = `Diagnóstico concluído: ${numbers.items} metas analisadas. Há ${priority} casos prioritários; as ${numbers.overlap} sobreposições permanecem apenas informativas.`;
  }

  function installGuide() {
    if (view.root.querySelector("[data-v261-guide]")) return;
    const summary = view.root.querySelector("[data-dup-summary]");
    if (!summary) return;
    const guide = createElement("section", "aldus-dup-v261-guide");
    guide.setAttribute("data-v261-guide", "true");
    guide.innerHTML = `
      <div>
        <strong>Fila inteligente de revisão</strong>
        <span>São exibidas somente duplicidades exatas, prováveis e itens separados para analisar depois.</span>
      </div>
      <small>Sobreposições são relações entre temas diferentes. Elas ficam contabilizadas, mas não geram milhares de cartões nem exigem decisão.</small>`;
    summary.before(guide);
  }

  function installToolbarControls() {
    const toolbar = view.root.querySelector(".aldus-dup-toolbar");
    const filter = toolbar?.querySelector("[data-dup-filter]");
    if (!toolbar || !filter) return;

    filter.value = DEFAULT_FILTER;
    filter.dispatchEvent(new Event("change", { bubbles: true }));
    filter.innerHTML = `
      <option value="exact">Duplicidades exatas</option>
      <option value="probable">Duplicidades prováveis</option>
      <option value="later">Analisar depois</option>`;
    filter.value = DEFAULT_FILTER;
    filter.setAttribute("aria-label", "Categoria de candidatos exibida");

    const filterLabel = filter.closest("label");
    if (filterLabel) {
      filterLabel.classList.add("aldus-dup-v261-filter");
      const textNode = [...filterLabel.childNodes].find((node) => node.nodeType === Node.TEXT_NODE);
      if (textNode) textNode.textContent = "Categoria ";
    }

    if (!toolbar.querySelector("[data-v261-search]")) {
      const searchLabel = createElement("label", "aldus-dup-v261-search");
      searchLabel.innerHTML = '<span>Localizar</span><input type="search" data-v261-search placeholder="Disciplina, tema ou código" autocomplete="off">';
      filterLabel?.insertAdjacentElement("afterend", searchLabel);
      searchLabel.querySelector("input")?.addEventListener("input", (event) => {
        view.query = normalize(event.target.value);
        view.page = 1;
        scheduleApply();
      });
    }

    if (!toolbar.querySelector("[data-v261-page-size]")) {
      const sizeLabel = createElement("label", "aldus-dup-v261-page-size");
      sizeLabel.innerHTML = `
        <span>Por página</span>
        <select data-v261-page-size aria-label="Quantidade de casos por página">
          <option value="6">6</option>
          <option value="12">12</option>
          <option value="24">24</option>
        </select>`;
      toolbar.querySelector("[data-v261-search]")?.closest("label")?.insertAdjacentElement("afterend", sizeLabel);
      sizeLabel.querySelector("select")?.addEventListener("change", (event) => {
        view.pageSize = Math.max(1, Number(event.target.value) || DEFAULT_PAGE_SIZE);
        view.page = 1;
        scheduleApply();
      });
    }

    filter.addEventListener("change", () => {
      view.page = 1;
      view.query = "";
      const search = toolbar.querySelector("[data-v261-search]");
      if (search) search.value = "";
      scheduleApply();
    });
  }

  function installPager() {
    if (view.root.querySelector("[data-v261-pager]")) return;
    const list = view.root.querySelector("[data-dup-list]");
    if (!list) return;
    const pager = createElement("nav", "aldus-dup-v261-pager");
    pager.setAttribute("data-v261-pager", "true");
    pager.setAttribute("aria-label", "Paginação dos candidatos");
    pager.innerHTML = `
      <button type="button" data-v261-prev aria-label="Página anterior">← Anterior</button>
      <span data-v261-page-info>Página 1</span>
      <button type="button" data-v261-next aria-label="Próxima página">Próxima →</button>`;
    list.after(pager);
    pager.querySelector("[data-v261-prev]")?.addEventListener("click", () => {
      view.page = Math.max(1, view.page - 1);
      scheduleApply(true);
    });
    pager.querySelector("[data-v261-next]")?.addEventListener("click", () => {
      view.page += 1;
      scheduleApply(true);
    });
  }

  function enhanceCard(card, index) {
    if (!card.dataset.v261Enhanced) {
      card.dataset.v261Enhanced = "true";
      card.classList.add("is-collapsed");
      const toggle = card.querySelector(".aldus-dup-card-toggle");
      if (toggle) {
        toggle.setAttribute("aria-expanded", "false");
        toggle.setAttribute("aria-label", "Abrir detalhes do caso");
        toggle.textContent = "+";
      }

      const topics = [...card.querySelectorAll(".aldus-dup-topic")].map((node) => node.textContent.trim()).filter(Boolean);
      const disciplines = [...card.querySelectorAll(".aldus-dup-item h4")].map((node) => node.textContent.trim()).filter(Boolean);
      const headerMain = card.querySelector(".aldus-dup-pair-header > div");
      if (headerMain && !headerMain.querySelector(".aldus-dup-v261-card-title")) {
        const title = createElement("div", "aldus-dup-v261-card-title");
        title.innerHTML = `
          <strong>${topics[0] || "Item A"}</strong>
          <span aria-hidden="true">↔</span>
          <strong>${topics[1] || "Item B"}</strong>
          <small>${[...new Set(disciplines)].join(" • ")}</small>`;
        headerMain.appendChild(title);
      }
    }
    card.style.setProperty("--aldus-dup-v261-order", String(index + 1));
  }

  function applyView(scrollToList = false) {
    if (view.applying || !view.list) return;
    view.applying = true;
    try {
      rewriteSummary();
      rewriteStatus();
      const cards = [...view.list.querySelectorAll(":scope > .aldus-dup-pair")];
      cards.forEach(enhanceCard);
      const matches = cards.filter((card) => !view.query || normalize(card.textContent).includes(view.query));
      const pages = Math.max(1, Math.ceil(matches.length / view.pageSize));
      view.page = Math.min(Math.max(1, view.page), pages);
      const start = (view.page - 1) * view.pageSize;
      const end = start + view.pageSize;
      const matchSet = new Set(matches.slice(start, end));

      cards.forEach((card) => {
        card.hidden = !matchSet.has(card);
      });

      const pager = view.root.querySelector("[data-v261-pager]");
      const info = pager?.querySelector("[data-v261-page-info]");
      const previous = pager?.querySelector("[data-v261-prev]");
      const next = pager?.querySelector("[data-v261-next]");
      if (pager) pager.hidden = matches.length === 0;
      if (info) info.textContent = matches.length
        ? `Página ${view.page} de ${pages} • ${matches.length} caso${matches.length === 1 ? "" : "s"}`
        : "Nenhum caso localizado";
      if (previous) previous.disabled = view.page <= 1;
      if (next) next.disabled = view.page >= pages;

      const empty = view.list.querySelector(":scope > .aldus-dup-v261-search-empty");
      if (!matches.length && cards.length) {
        if (!empty) {
          const message = createElement("div", "aldus-dup-v261-search-empty");
          message.innerHTML = "<strong>Nenhum caso corresponde à busca.</strong><span>Limpe o campo de pesquisa ou escolha outra categoria.</span>";
          view.list.appendChild(message);
        }
      } else {
        empty?.remove();
      }

      if (scrollToList) view.list.scrollIntoView({ behavior: "smooth", block: "start" });
    } finally {
      view.applying = false;
    }
  }

  function scheduleApply(scrollToList = false) {
    if (view.scheduled) return;
    view.scheduled = true;
    requestAnimationFrame(() => {
      view.scheduled = false;
      applyView(scrollToList);
    });
  }

  function observeRenders() {
    view.list = view.root.querySelector("[data-dup-list]");
    const summary = view.root.querySelector("[data-dup-summary]");
    const status = view.root.querySelector("[data-dup-status]");

    if (view.list) {
      view.listObserver?.disconnect();
      view.listObserver = new MutationObserver(() => scheduleApply());
      view.listObserver.observe(view.list, { childList: true });
    }
    if (summary) {
      view.summaryObserver?.disconnect();
      view.summaryObserver = new MutationObserver(() => scheduleApply());
      view.summaryObserver.observe(summary, { childList: true, subtree: true, characterData: true });
    }
    if (status) {
      view.statusObserver?.disconnect();
      view.statusObserver = new MutationObserver(() => scheduleApply());
      view.statusObserver.observe(status, { childList: true, subtree: true, characterData: true });
    }
  }

  function initialize(root) {
    if (!root || root.dataset.v261Initialized) return;
    root.dataset.v261Initialized = "true";
    root.classList.add("aldus-dup-v261");
    view.root = root;
    view.initialized = true;
    installToolbarControls();
    installGuide();
    installPager();
    observeRenders();
    scheduleApply();
  }

  function waitForRoot() {
    const existing = document.getElementById(ROOT_ID);
    if (existing) return initialize(existing);
    const observer = new MutationObserver(() => {
      const root = document.getElementById(ROOT_ID);
      if (!root) return;
      observer.disconnect();
      initialize(root);
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", waitForRoot, { once: true });
  else waitForRoot();

  globalThis.__aldusDuplicateDiagnosticsUiV261 = Object.freeze({ version: VERSION });
})();
