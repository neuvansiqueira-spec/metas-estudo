(() => {
  "use strict";

  const VERSION = "20260725-contagem-concurso-v151";
  const STORAGE_KEY = "aldus.contestCountdown.v151";
  const MAX_ITEMS = 120;

  function cleanText(value, maxLength = 100) {
    return String(value ?? "").replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim().slice(0, maxLength);
  }

  function validDateText(value) {
    const text = String(value || "");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return false;
    const [year, month, day] = text.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
  }

  function validTimeText(value) {
    return value === "" || /^([01]\d|2[0-3]):[0-5]\d$/.test(String(value || ""));
  }

  function targetDate(record) {
    if (!record || !validDateText(record.date) || !validTimeText(record.time || "")) return null;
    const [year, month, day] = record.date.split("-").map(Number);
    const [hour, minute] = (record.time || "23:59").split(":").map(Number);
    const date = new Date(year, month - 1, day, hour, minute, record.time ? 0 : 59, 0);
    return Number.isFinite(date.getTime()) ? date : null;
  }

  function remainingParts(target, now = new Date()) {
    const milliseconds = Math.max(0, target.getTime() - now.getTime());
    const totalSeconds = Math.floor(milliseconds / 1000);
    return {
      milliseconds,
      days: Math.floor(totalSeconds / 86400),
      hours: Math.floor((totalSeconds % 86400) / 3600),
      minutes: Math.floor((totalSeconds % 3600) / 60),
      seconds: totalSeconds % 60
    };
  }

  function normalizeRecord(input) {
    const record = {
      id: cleanText(input?.id, 80),
      contest: cleanText(input?.contest, 80),
      phase: cleanText(input?.phase, 100),
      date: cleanText(input?.date, 10),
      time: cleanText(input?.time, 5),
      kind: input?.kind === "estimated" ? "estimated" : "official",
      pinned: Boolean(input?.pinned),
      createdAt: cleanText(input?.createdAt, 40),
      updatedAt: cleanText(input?.updatedAt, 40)
    };
    if (!record.id || !record.contest || !record.phase || !validDateText(record.date) || !validTimeText(record.time)) return null;
    return record;
  }

  if (typeof window === "undefined" || typeof document === "undefined") {
    if (typeof module !== "undefined") module.exports = { cleanText, validDateText, validTimeText, targetDate, remainingParts, normalizeRecord };
    return;
  }

  if (window.__aldusContestCountdownV151) return;
  window.__aldusContestCountdownV151 = true;

  let state = { items: [], updatedAt: "" };
  let editingId = "";
  let timerId = 0;
  let modal = null;
  let block = null;

  function makeId() {
    if (window.crypto?.randomUUID) return window.crypto.randomUUID();
    return `countdown-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }

  function loadState() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      const items = Array.isArray(parsed?.items) ? parsed.items.map(normalizeRecord).filter(Boolean).slice(0, MAX_ITEMS) : [];
      let pinnedSeen = false;
      for (const item of items) {
        if (item.pinned && !pinnedSeen) pinnedSeen = true;
        else if (item.pinned) item.pinned = false;
      }
      state = { items, updatedAt: cleanText(parsed?.updatedAt, 40) };
    } catch (error) {
      console.warn("[Contagem do concurso] Dados locais inválidos foram ignorados.", error);
      state = { items: [], updatedAt: "" };
    }
  }

  function saveState() {
    state.updatedAt = new Date().toISOString();
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      window.dispatchEvent(new CustomEvent("aldus:contest-countdown-changed", { detail: { version: VERSION } }));
      return true;
    } catch (error) {
      console.error("[Contagem do concurso] Não foi possível salvar.", error);
      showStatus("Não foi possível salvar os prazos neste navegador.", true);
      return false;
    }
  }

  function formatDate(record) {
    const date = targetDate(record);
    if (!date) return "Data inválida";
    const options = { day: "2-digit", month: "2-digit", year: "numeric" };
    const formatted = new Intl.DateTimeFormat("pt-BR", options).format(date);
    return record.time ? `${formatted}, ${record.time}` : `${formatted} · horário não informado`;
  }

  function sortItems(items, now = new Date()) {
    return [...items].sort((a, b) => {
      const aTime = targetDate(a)?.getTime() ?? Number.MAX_SAFE_INTEGER;
      const bTime = targetDate(b)?.getTime() ?? Number.MAX_SAFE_INTEGER;
      const aEnded = aTime < now.getTime();
      const bEnded = bTime < now.getTime();
      if (aEnded !== bEnded) return aEnded ? 1 : -1;
      return aEnded ? bTime - aTime : aTime - bTime;
    });
  }

  function primaryItem(now = new Date()) {
    const valid = state.items.filter((item) => targetDate(item));
    const pinned = valid.find((item) => item.pinned);
    if (pinned) return pinned;
    return sortItems(valid, now).find((item) => targetDate(item).getTime() >= now.getTime()) || sortItems(valid, now)[0] || null;
  }

  function createElement(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function ensureStyles() {
    if (document.getElementById("contestCountdownStylesV151")) return;
    const style = document.createElement("style");
    style.id = "contestCountdownStylesV151";
    style.textContent = `
      #contestCountdownBlockV151 { grid-column: 1 / -1; overflow: hidden; }
      #contestCountdownBlockV151 .contest-countdown-head { display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap; }
      #contestCountdownBlockV151 .contest-countdown-title { display:flex; align-items:center; gap:9px; min-width:0; }
      #contestCountdownBlockV151 .contest-countdown-title span[aria-hidden="true"] { font-size:1.25rem; }
      #contestCountdownBlockV151 .contest-countdown-actions { display:flex; gap:8px; flex-wrap:wrap; }
      #contestCountdownBlockV151 .contest-primary { margin-top:14px; padding:18px; border:1px solid rgba(95,168,216,.48); border-radius:16px; background:linear-gradient(145deg,rgba(11,45,71,.96),rgba(4,24,42,.96)); box-shadow:0 12px 28px rgba(0,7,18,.2); }
      #contestCountdownBlockV151 .contest-primary-top { display:flex; justify-content:space-between; align-items:flex-start; gap:12px; flex-wrap:wrap; }
      #contestCountdownBlockV151 .contest-primary-name { margin:0; font-size:clamp(1rem,2vw,1.35rem); color:#fff; overflow-wrap:anywhere; }
      #contestCountdownBlockV151 .contest-primary-phase { margin:4px 0 0; color:#c9deed; font-weight:700; overflow-wrap:anywhere; }
      #contestCountdownBlockV151 .contest-kind { display:inline-flex; align-items:center; border:1px solid rgba(125,211,252,.4); border-radius:999px; padding:5px 9px; color:#e8f7ff; background:rgba(56,189,248,.12); font-size:.78rem; font-weight:800; }
      #contestCountdownBlockV151 .contest-clock { display:grid; grid-template-columns:repeat(4,minmax(64px,1fr)); gap:8px; margin-top:16px; }
      #contestCountdownBlockV151 .contest-clock-unit { min-width:0; padding:10px 7px; border-radius:12px; background:rgba(1,12,25,.62); text-align:center; border:1px solid rgba(95,168,216,.25); }
      #contestCountdownBlockV151 .contest-clock-unit strong { display:block; color:#fff; font-size:clamp(1.25rem,4vw,2.15rem); line-height:1; font-variant-numeric:tabular-nums; }
      #contestCountdownBlockV151 .contest-clock-unit span { display:block; margin-top:5px; color:#bcd3e3; font-size:.75rem; text-transform:uppercase; letter-spacing:.04em; }
      #contestCountdownBlockV151 .contest-date-line { margin:12px 0 0; color:#d7e9f5; font-size:.9rem; }
      #contestCountdownBlockV151 .contest-empty { margin-top:12px; padding:16px; border:1px dashed rgba(95,168,216,.5); border-radius:14px; text-align:center; }
      #contestCountdownBlockV151 .contest-list { display:grid; gap:8px; margin-top:12px; }
      #contestCountdownBlockV151 .contest-row { display:grid; grid-template-columns:minmax(0,1fr) auto; gap:10px; align-items:center; padding:10px 12px; border-radius:12px; border:1px solid rgba(95,168,216,.22); background:rgba(4,24,42,.55); }
      #contestCountdownBlockV151 .contest-row-main { min-width:0; }
      #contestCountdownBlockV151 .contest-row strong, #contestCountdownBlockV151 .contest-row span { display:block; overflow-wrap:anywhere; }
      #contestCountdownBlockV151 .contest-row span { color:#c4d8e6; font-size:.82rem; margin-top:2px; }
      #contestCountdownBlockV151 .contest-row-time { color:#fff; font-weight:900; white-space:nowrap; font-variant-numeric:tabular-nums; }
      #contestCountdownBlockV151 .contest-ended { opacity:.7; }
      #contestCountdownBlockV151 .contest-more { margin-top:10px; color:#bcd3e3; font-size:.82rem; text-align:right; }
      #contestCountdownModalV151[hidden] { display:none !important; }
      #contestCountdownModalV151 { position:fixed; inset:0; z-index:10020; display:grid; place-items:center; padding:16px; }
      #contestCountdownModalV151 .contest-modal-backdrop { position:absolute; inset:0; background:rgba(0,8,18,.76); }
      #contestCountdownModalV151 .contest-modal-card { position:relative; width:min(760px,100%); max-height:min(88vh,850px); overflow:auto; border-radius:18px; padding:18px; background:#071f34; color:#fff; border:1px solid rgba(95,168,216,.5); box-shadow:0 24px 70px rgba(0,0,0,.42); }
      #contestCountdownModalV151 .contest-modal-heading { display:flex; align-items:flex-start; justify-content:space-between; gap:12px; }
      #contestCountdownModalV151 .contest-modal-heading h3 { margin:0; color:#fff; }
      #contestCountdownModalV151 .contest-close { min-width:42px; min-height:42px; }
      #contestCountdownModalV151 .contest-form { display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-top:16px; }
      #contestCountdownModalV151 .contest-form label { display:grid; gap:6px; color:#dbeaf4; font-weight:700; }
      #contestCountdownModalV151 .contest-form .wide { grid-column:1 / -1; }
      #contestCountdownModalV151 .contest-form input, #contestCountdownModalV151 .contest-form select { width:100%; min-height:44px; box-sizing:border-box; }
      #contestCountdownModalV151 .contest-check { display:flex !important; grid-column:1 / -1; align-items:center; gap:8px; }
      #contestCountdownModalV151 .contest-check input { width:auto; min-height:0; }
      #contestCountdownModalV151 .contest-form-actions, #contestCountdownModalV151 .contest-backup-actions { grid-column:1 / -1; display:flex; flex-wrap:wrap; gap:8px; }
      #contestCountdownModalV151 .contest-manage-list { display:grid; gap:8px; margin-top:18px; }
      #contestCountdownModalV151 .contest-manage-row { display:grid; grid-template-columns:minmax(0,1fr) auto; gap:10px; align-items:center; padding:12px; border:1px solid rgba(95,168,216,.25); border-radius:12px; background:rgba(1,12,25,.45); }
      #contestCountdownModalV151 .contest-manage-row p { margin:3px 0 0; color:#bdd4e4; font-size:.84rem; overflow-wrap:anywhere; }
      #contestCountdownModalV151 .contest-manage-buttons { display:flex; gap:6px; flex-wrap:wrap; justify-content:flex-end; }
      #contestCountdownModalV151 .contest-status { min-height:1.3em; margin:10px 0 0; color:#bfe4ff; }
      #contestCountdownModalV151 .contest-status.error { color:#ffb4b4; }
      #contestCountdownImportV151 { display:none; }
      @media (max-width:620px) {
        #contestCountdownBlockV151 .contest-clock { grid-template-columns:repeat(2,minmax(0,1fr)); }
        #contestCountdownModalV151 .contest-form { grid-template-columns:1fr; }
        #contestCountdownModalV151 .contest-form .wide, #contestCountdownModalV151 .contest-check, #contestCountdownModalV151 .contest-form-actions, #contestCountdownModalV151 .contest-backup-actions { grid-column:1; }
        #contestCountdownModalV151 .contest-manage-row { grid-template-columns:1fr; }
        #contestCountdownModalV151 .contest-manage-buttons { justify-content:flex-start; }
      }
    `;
    document.head.appendChild(style);
  }

  function ensureBlock() {
    if (block?.isConnected) return block;
    const dashboardBlocks = document.querySelector("#view-dashboard .dashboard-blocks");
    if (!dashboardBlocks) return null;

    block = createElement("article", "dashboard-block");
    block.id = "contestCountdownBlockV151";
    block.dataset.version = VERSION;

    const head = createElement("div", "contest-countdown-head");
    const titleWrap = createElement("div", "contest-countdown-title");
    titleWrap.append(createElement("span", "", "⏳"));
    titleWrap.lastChild.setAttribute("aria-hidden", "true");
    titleWrap.append(createElement("div", "dashboard-block-title", "Contagem Regressiva do Concurso"));
    const actions = createElement("div", "contest-countdown-actions");
    const add = createElement("button", "secondary-button", "Adicionar fase");
    add.type = "button";
    add.dataset.countdownAction = "add";
    const manage = createElement("button", "secondary-button", "Gerenciar");
    manage.type = "button";
    manage.dataset.countdownAction = "manage";
    actions.append(add, manage);
    head.append(titleWrap, actions);

    const content = createElement("div", "contest-countdown-content");
    content.setAttribute("aria-live", "polite");
    block.append(head, content);
    dashboardBlocks.prepend(block);
    block.addEventListener("click", onBlockClick);
    return block;
  }

  function ensureModal() {
    if (modal?.isConnected) return modal;
    modal = createElement("div");
    modal.id = "contestCountdownModalV151";
    modal.hidden = true;
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-labelledby", "contestCountdownModalTitleV151");

    const backdrop = createElement("div", "contest-modal-backdrop");
    backdrop.dataset.countdownClose = "true";
    const card = createElement("section", "contest-modal-card");
    const heading = createElement("div", "contest-modal-heading");
    const headingText = createElement("div");
    headingText.append(createElement("p", "eyebrow", "CONCURSO E FASES"));
    const title = createElement("h3", "", "Gerenciar contagem regressiva");
    title.id = "contestCountdownModalTitleV151";
    headingText.append(title);
    const close = createElement("button", "secondary-button contest-close", "×");
    close.type = "button";
    close.setAttribute("aria-label", "Fechar");
    close.dataset.countdownClose = "true";
    heading.append(headingText, close);

    const form = createElement("form", "contest-form");
    form.id = "contestCountdownFormV151";
    form.noValidate = true;

    function field(labelText, input) {
      const label = createElement("label");
      label.append(document.createTextNode(labelText), input);
      return label;
    }

    const contest = document.createElement("input");
    contest.id = "contestCountdownContestV151";
    contest.name = "contest";
    contest.maxLength = 80;
    contest.required = true;
    contest.placeholder = "Ex.: PCPR Delegado";
    const phase = document.createElement("input");
    phase.id = "contestCountdownPhaseV151";
    phase.name = "phase";
    phase.maxLength = 100;
    phase.required = true;
    phase.placeholder = "Ex.: Prova objetiva";
    const date = document.createElement("input");
    date.id = "contestCountdownDateV151";
    date.name = "date";
    date.type = "date";
    date.required = true;
    const time = document.createElement("input");
    time.id = "contestCountdownTimeV151";
    time.name = "time";
    time.type = "time";
    const kind = document.createElement("select");
    kind.id = "contestCountdownKindV151";
    kind.name = "kind";
    const official = document.createElement("option");
    official.value = "official";
    official.textContent = "Data oficial";
    const estimated = document.createElement("option");
    estimated.value = "estimated";
    estimated.textContent = "Data prevista/estimada";
    kind.append(official, estimated);

    const contestLabel = field("Concurso", contest);
    contestLabel.className = "wide";
    const phaseLabel = field("Fase", phase);
    phaseLabel.className = "wide";
    const dateLabel = field("Data", date);
    const timeLabel = field("Horário (opcional)", time);
    const kindLabel = field("Classificação da data", kind);
    kindLabel.className = "wide";
    const pinLabel = createElement("label", "contest-check");
    const pin = document.createElement("input");
    pin.id = "contestCountdownPinnedV151";
    pin.name = "pinned";
    pin.type = "checkbox";
    pinLabel.append(pin, document.createTextNode(" Fixar esta fase como contagem principal"));

    const formActions = createElement("div", "contest-form-actions");
    const cancelEdit = createElement("button", "secondary-button", "Limpar");
    cancelEdit.type = "button";
    cancelEdit.dataset.countdownAction = "reset-form";
    const save = createElement("button", "", "Salvar fase");
    save.type = "submit";
    save.id = "contestCountdownSaveV151";
    formActions.append(cancelEdit, save);

    form.append(contestLabel, phaseLabel, dateLabel, timeLabel, kindLabel, pinLabel, formActions);

    const status = createElement("p", "contest-status");
    status.id = "contestCountdownStatusV151";
    status.setAttribute("aria-live", "polite");

    const backupActions = createElement("div", "contest-backup-actions");
    const exportButton = createElement("button", "secondary-button", "Exportar prazos");
    exportButton.type = "button";
    exportButton.dataset.countdownAction = "export";
    const importButton = createElement("button", "secondary-button", "Importar prazos");
    importButton.type = "button";
    importButton.dataset.countdownAction = "import";
    const importInput = document.createElement("input");
    importInput.id = "contestCountdownImportV151";
    importInput.type = "file";
    importInput.accept = "application/json,.json";
    backupActions.append(exportButton, importButton, importInput);

    const list = createElement("div", "contest-manage-list");
    list.id = "contestCountdownManageListV151";
    card.append(heading, form, status, backupActions, list);
    modal.append(backdrop, card);
    document.body.appendChild(modal);

    modal.addEventListener("click", onModalClick);
    form.addEventListener("submit", onFormSubmit);
    importInput.addEventListener("change", onImportFile);
    return modal;
  }

  function renderBlock() {
    const currentBlock = ensureBlock();
    if (!currentBlock) return;
    const content = currentBlock.querySelector(".contest-countdown-content");
    content.replaceChildren();
    const now = new Date();
    const primary = primaryItem(now);

    if (!primary) {
      const empty = createElement("div", "contest-empty");
      empty.append(createElement("strong", "", "Nenhuma fase cadastrada."));
      empty.append(createElement("p", "item-meta", "Adicione datas oficiais ou previstas para acompanhar o próximo marco do concurso."));
      content.append(empty);
      return;
    }

    const target = targetDate(primary);
    const ended = target.getTime() < now.getTime();
    const primaryCard = createElement("section", "contest-primary");
    if (ended) primaryCard.classList.add("contest-ended");
    const top = createElement("div", "contest-primary-top");
    const names = createElement("div");
    names.append(createElement("h3", "contest-primary-name", primary.contest));
    names.append(createElement("p", "contest-primary-phase", `${primary.phase}${primary.pinned ? " · Fixada" : ""}`));
    const kind = createElement("span", "contest-kind", primary.kind === "estimated" ? "Prevista/estimada" : "Oficial");
    top.append(names, kind);
    primaryCard.append(top);

    const clock = createElement("div", "contest-clock");
    clock.dataset.targetId = primary.id;
    const labels = [["days", "dias"], ["hours", "horas"], ["minutes", "minutos"], ["seconds", "segundos"]];
    for (const [key, label] of labels) {
      const unit = createElement("div", "contest-clock-unit");
      const value = createElement("strong", "", "00");
      value.dataset.countdownUnit = key;
      unit.append(value, createElement("span", "", label));
      clock.append(unit);
    }
    primaryCard.append(clock);
    primaryCard.append(createElement("p", "contest-date-line", ended ? `Fase encerrada em ${formatDate(primary)}.` : `${formatDate(primary)}.`));
    content.append(primaryCard);

    const ordered = sortItems(state.items, now).filter((item) => item.id !== primary.id);
    if (ordered.length) {
      const list = createElement("div", "contest-list");
      for (const item of ordered.slice(0, 4)) {
        const itemTarget = targetDate(item);
        const itemEnded = itemTarget && itemTarget.getTime() < now.getTime();
        const row = createElement("div", `contest-row${itemEnded ? " contest-ended" : ""}`);
        const main = createElement("div", "contest-row-main");
        main.append(createElement("strong", "", `${item.contest} — ${item.phase}`));
        main.append(createElement("span", "", `${formatDate(item)} · ${item.kind === "estimated" ? "Prevista" : "Oficial"}${item.pinned ? " · Fixada" : ""}`));
        const remaining = createElement("div", "contest-row-time", itemEnded ? "Encerrada" : compactRemaining(itemTarget, now));
        row.append(main, remaining);
        list.append(row);
      }
      content.append(list);
      if (ordered.length > 4) content.append(createElement("div", "contest-more", `+ ${ordered.length - 4} fase(s) em Gerenciar`));
    }
    updateClock();
  }

  function compactRemaining(target, now = new Date()) {
    const parts = remainingParts(target, now);
    if (parts.days > 0) return `${parts.days}d ${String(parts.hours).padStart(2, "0")}h`;
    if (parts.hours > 0) return `${parts.hours}h ${String(parts.minutes).padStart(2, "0")}min`;
    return `${parts.minutes}min`;
  }

  function updateClock() {
    const clock = block?.querySelector(".contest-clock");
    if (!clock) return;
    const item = state.items.find((candidate) => candidate.id === clock.dataset.targetId);
    const target = targetDate(item);
    if (!target) return;
    const now = new Date();
    const ended = target.getTime() < now.getTime();
    const parts = remainingParts(target, now);
    const values = ended ? { days: "—", hours: "—", minutes: "—", seconds: "—" } : {
      days: String(parts.days),
      hours: String(parts.hours).padStart(2, "0"),
      minutes: String(parts.minutes).padStart(2, "0"),
      seconds: String(parts.seconds).padStart(2, "0")
    };
    for (const node of clock.querySelectorAll("[data-countdown-unit]")) node.textContent = values[node.dataset.countdownUnit] ?? "00";
    if (ended && !clock.dataset.endedRendered) {
      clock.dataset.endedRendered = "true";
      window.setTimeout(renderBlock, 50);
    }
  }

  function renderManageList() {
    ensureModal();
    const list = modal.querySelector("#contestCountdownManageListV151");
    list.replaceChildren();
    const items = sortItems(state.items);
    if (!items.length) {
      list.append(createElement("p", "notice", "Nenhuma fase cadastrada."));
      return;
    }
    for (const item of items) {
      const row = createElement("div", "contest-manage-row");
      const info = createElement("div");
      info.append(createElement("strong", "", `${item.contest} — ${item.phase}`));
      info.append(createElement("p", "", `${formatDate(item)} · ${item.kind === "estimated" ? "Prevista/estimada" : "Oficial"}${item.pinned ? " · Fixada" : ""}`));
      const buttons = createElement("div", "contest-manage-buttons");
      const pin = createElement("button", "secondary-button", item.pinned ? "Desafixar" : "Fixar");
      pin.type = "button";
      pin.dataset.countdownAction = "toggle-pin";
      pin.dataset.id = item.id;
      const edit = createElement("button", "secondary-button", "Editar");
      edit.type = "button";
      edit.dataset.countdownAction = "edit";
      edit.dataset.id = item.id;
      const remove = createElement("button", "secondary-button", "Excluir");
      remove.type = "button";
      remove.dataset.countdownAction = "delete";
      remove.dataset.id = item.id;
      buttons.append(pin, edit, remove);
      row.append(info, buttons);
      list.append(row);
    }
  }

  function showModal(mode = "manage") {
    ensureModal();
    modal.hidden = false;
    document.documentElement.style.overflow = "hidden";
    if (mode === "add") resetForm();
    renderManageList();
    window.setTimeout(() => modal.querySelector(mode === "add" ? "#contestCountdownContestV151" : ".contest-close")?.focus(), 0);
  }

  function closeModal() {
    if (!modal) return;
    modal.hidden = true;
    document.documentElement.style.overflow = "";
    editingId = "";
    showStatus("");
  }

  function resetForm() {
    ensureModal();
    editingId = "";
    const form = modal.querySelector("#contestCountdownFormV151");
    form.reset();
    modal.querySelector("#contestCountdownKindV151").value = "official";
    modal.querySelector("#contestCountdownSaveV151").textContent = "Salvar fase";
    showStatus("");
  }

  function editItem(id) {
    const item = state.items.find((candidate) => candidate.id === id);
    if (!item) return;
    editingId = item.id;
    ensureModal();
    modal.querySelector("#contestCountdownContestV151").value = item.contest;
    modal.querySelector("#contestCountdownPhaseV151").value = item.phase;
    modal.querySelector("#contestCountdownDateV151").value = item.date;
    modal.querySelector("#contestCountdownTimeV151").value = item.time;
    modal.querySelector("#contestCountdownKindV151").value = item.kind;
    modal.querySelector("#contestCountdownPinnedV151").checked = item.pinned;
    modal.querySelector("#contestCountdownSaveV151").textContent = "Atualizar fase";
    showStatus("Editando fase selecionada.");
    modal.querySelector("#contestCountdownContestV151").focus();
  }

  function showStatus(message, error = false) {
    const status = modal?.querySelector("#contestCountdownStatusV151");
    if (!status) return;
    status.textContent = message;
    status.classList.toggle("error", error);
  }

  function onFormSubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const now = new Date().toISOString();
    const draft = normalizeRecord({
      id: editingId || makeId(),
      contest: data.get("contest"),
      phase: data.get("phase"),
      date: data.get("date"),
      time: data.get("time"),
      kind: data.get("kind"),
      pinned: data.get("pinned") === "on",
      createdAt: editingId ? state.items.find((item) => item.id === editingId)?.createdAt || now : now,
      updatedAt: now
    });
    if (!draft) {
      showStatus("Preencha concurso, fase e uma data válida.", true);
      return;
    }
    if (!editingId && state.items.length >= MAX_ITEMS) {
      showStatus(`Limite de ${MAX_ITEMS} fases atingido.`, true);
      return;
    }
    if (draft.pinned) state.items.forEach((item) => { item.pinned = false; });
    const index = state.items.findIndex((item) => item.id === draft.id);
    if (index >= 0) state.items[index] = draft;
    else state.items.push(draft);
    if (!saveState()) return;
    resetForm();
    renderManageList();
    renderBlock();
    showStatus(index >= 0 ? "Fase atualizada com segurança." : "Fase adicionada com segurança.");
  }

  function togglePin(id) {
    const item = state.items.find((candidate) => candidate.id === id);
    if (!item) return;
    const next = !item.pinned;
    state.items.forEach((candidate) => { candidate.pinned = next ? candidate.id === id : false; });
    item.updatedAt = new Date().toISOString();
    if (saveState()) {
      renderManageList();
      renderBlock();
      showStatus(next ? "Fase fixada como principal." : "Fixação removida; a próxima fase será exibida automaticamente.");
    }
  }

  function deleteItem(id) {
    const item = state.items.find((candidate) => candidate.id === id);
    if (!item) return;
    if (!window.confirm(`Excluir a fase “${item.phase}” do concurso “${item.contest}”?`)) return;
    state.items = state.items.filter((candidate) => candidate.id !== id);
    if (editingId === id) resetForm();
    if (saveState()) {
      renderManageList();
      renderBlock();
      showStatus("Fase excluída.");
    }
  }

  function exportData() {
    const payload = JSON.stringify({ schema: VERSION, exportedAt: new Date().toISOString(), items: state.items }, null, 2);
    const blob = new Blob([payload], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `aldus-contagem-concurso-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    showStatus("Arquivo de prazos exportado.");
  }

  async function onImportFile(event) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    input.value = "";
    if (!file) return;
    if (file.size > 1024 * 1024) {
      showStatus("O arquivo excede o limite de 1 MB.", true);
      return;
    }
    try {
      const parsed = JSON.parse(await file.text());
      const source = Array.isArray(parsed) ? parsed : parsed?.items;
      if (!Array.isArray(source)) throw new Error("Formato incompatível");
      const imported = source.map(normalizeRecord).filter(Boolean).slice(0, MAX_ITEMS);
      if (!imported.length && source.length) throw new Error("Nenhuma fase válida");
      if (!window.confirm(`Substituir os ${state.items.length} prazo(s) atuais por ${imported.length} prazo(s) do arquivo?`)) return;
      let pinnedSeen = false;
      imported.forEach((item) => {
        if (item.pinned && !pinnedSeen) pinnedSeen = true;
        else if (item.pinned) item.pinned = false;
      });
      state.items = imported;
      if (saveState()) {
        resetForm();
        renderManageList();
        renderBlock();
        showStatus("Prazos importados com sucesso.");
      }
    } catch (error) {
      console.warn("[Contagem do concurso] Falha na importação.", error);
      showStatus("Arquivo inválido ou incompatível.", true);
    }
  }

  function onBlockClick(event) {
    const action = event.target.closest("[data-countdown-action]")?.dataset.countdownAction;
    if (action === "add" || action === "manage") showModal(action);
  }

  function onModalClick(event) {
    const close = event.target.closest("[data-countdown-close]");
    if (close) return closeModal();
    const actionNode = event.target.closest("[data-countdown-action]");
    if (!actionNode) return;
    const action = actionNode.dataset.countdownAction;
    const id = actionNode.dataset.id;
    if (action === "reset-form") resetForm();
    else if (action === "edit") editItem(id);
    else if (action === "delete") deleteItem(id);
    else if (action === "toggle-pin") togglePin(id);
    else if (action === "export") exportData();
    else if (action === "import") modal.querySelector("#contestCountdownImportV151")?.click();
  }

  function start() {
    ensureStyles();
    loadState();
    ensureBlock();
    ensureModal();
    renderBlock();

    if (timerId) clearInterval(timerId);
    timerId = window.setInterval(updateClock, 1000);
    window.addEventListener("storage", (event) => {
      if (event.key !== STORAGE_KEY) return;
      loadState();
      renderBlock();
      if (!modal.hidden) renderManageList();
    });
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) {
        loadState();
        renderBlock();
      }
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && modal && !modal.hidden) closeModal();
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})();
