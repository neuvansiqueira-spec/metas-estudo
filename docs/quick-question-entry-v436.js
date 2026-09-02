(() => {
  "use strict";

  // V436 — Lançamento rápido de questões no Plano do Dia.
  //
  // Hoje existem três caminhos para registrar resultado de questões, e nenhum
  // é rápido: o formulário questão a questão, a importação de JSON (que exige
  // gerar o JSON fora do site) e a captura por PNG, ainda em piloto.
  //
  // O usuário relatou que isso vira barreira: ao terminar as questões ele tem
  // os números na cabeça, e qualquer fluxo que exija digitar muito faz o
  // registro não acontecer. Resultado que não é lançado não alimenta
  // estatística, progresso nem priorização.
  //
  // Este painel troca o caminho por: um toque no assunto (os assuntos do dia
  // já vêm como botões), dois números, e pronto. Grava um `questionLogs` com
  // a mesma forma que o simulado interativo já usa.
  //
  // O que ele NÃO faz, deliberadamente: inventar questão a questão. Sem link
  // ou enunciado não há como alimentar o caderno de erros, e fabricar
  // identidade de questão seria dado falso.

  const VERSION = "20260902-quick-question-entry-v436";
  const API_KEY = "__ALDUS_QUICK_QUESTION_ENTRY_V436__";
  const PANEL_ID = "aldusQuickQuestionEntryV436";
  const STYLE_ID = "aldusQuickQuestionStyleV436";
  const CHIPS_ID = "aldusQuickQuestionChipsV436";
  const TOTAL_ID = "aldusQuickQuestionTotalV436";
  const CORRECT_ID = "aldusQuickQuestionCorrectV436";
  const BLANK_ID = "aldusQuickQuestionBlankV436";
  const SUBMIT_ID = "aldusQuickQuestionSubmitV436";
  const STATUS_ID = "aldusQuickQuestionStatusV436";
  const ORIGIN = "lancamento_rapido_v436";
  const TRAINING_TYPE = "Lançamento rápido";

  const isObject = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);
  const clean = (value) => String(value ?? "").trim();

  function resolveAppState() {
    try {
      // eslint-disable-next-line no-undef
      if (isObject(state)) return state;
    } catch { /* binding inexistente ou em TDZ */ }
    if (isObject(globalThis.state)) return globalThis.state;
    return null;
  }

  function today() {
    try {
      // eslint-disable-next-line no-undef
      if (typeof todayISO === "function") return todayISO();
    } catch { /* fora do app */ }
    const now = new Date();
    return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  }

  function goalDate(goal) {
    try {
      // eslint-disable-next-line no-undef
      if (typeof goalDateValue === "function") return goalDateValue(goal);
    } catch { /* fora do app */ }
    return clean(goal?.date || goal?.data);
  }

  // Os assuntos do dia viram botões: é o caso comum e evita procurar em lista.
  function todaySubjects(targetState) {
    const goals = Array.isArray(targetState?.dailyGoals) ? targetState.dailyGoals : [];
    const date = today();
    const seen = new Set();
    const out = [];
    for (const goal of goals) {
      if (!isObject(goal) || goalDate(goal) !== date) continue;
      const subject = clean(goal.subject || goal.tema);
      const discipline = clean(goal.discipline || goal.disciplina);
      if (!subject) continue;
      const key = `${discipline}|${subject}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ discipline, subject, syllabusItemId: clean(goal.syllabusItemId) });
    }
    return out;
  }

  // Mesmo cálculo do restante do app: derivadas a partir de total/acertos.
  function buildLog(entry, date) {
    const total = Math.max(0, Math.trunc(Number(entry.total) || 0));
    const correct = Math.max(0, Math.trunc(Number(entry.correct) || 0));
    const blank = Math.max(0, Math.trunc(Number(entry.blank) || 0));
    if (!total) return { error: "total-invalido" };
    if (correct + blank > total) return { error: "acertos-acima-do-total" };
    const wrong = total - correct - blank;
    const pct = (part) => Math.round((part / total) * 1000) / 10;
    return {
      log: {
        id: `${ORIGIN}:${date}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`,
        date,
        discipline: clean(entry.discipline),
        subject: clean(entry.subject),
        syllabusItemId: clean(entry.syllabusItemId),
        board: "",
        minutes: 0,
        total,
        correct,
        wrong,
        blank,
        accuracyRate: pct(correct),
        errorRate: pct(wrong),
        blankRate: pct(blank),
        cebraspeNet: correct - wrong,
        notes: "",
        trainingType: TRAINING_TYPE,
        origin: ORIGIN,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    };
  }

  function record(targetState, entry) {
    if (!isObject(targetState)) return { saved: false, reason: "state-unavailable" };
    const built = buildLog(entry, today());
    if (built.error) return { saved: false, reason: built.error };
    if (!Array.isArray(targetState.questionLogs)) targetState.questionLogs = [];
    targetState.questionLogs.push(built.log);
    return { saved: true, log: built.log };
  }

  function ensureStyle() {
    if (typeof document === "undefined" || document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      #${PANEL_ID} { margin: 16px 0; padding: 14px 16px; border-radius: 12px; border: 1px solid rgba(127,127,127,.28); }
      #${PANEL_ID} .aldus-v436-title { font-weight: 700; margin-bottom: 8px; }
      #${CHIPS_ID} { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 10px; }
      #${CHIPS_ID} button { padding: 6px 10px; border-radius: 999px; border: 1px solid rgba(127,127,127,.4); background: transparent; cursor: pointer; font-size: .84rem; }
      #${CHIPS_ID} button[aria-pressed="true"] { border-width: 2px; font-weight: 700; }
      #${PANEL_ID} .aldus-v436-row { display: flex; flex-wrap: wrap; gap: 10px; align-items: flex-end; }
      #${PANEL_ID} label { display: flex; flex-direction: column; font-size: .8rem; gap: 3px; }
      #${PANEL_ID} input { width: 92px; padding: 6px 8px; }
      #${STATUS_ID} { margin-top: 8px; font-size: .84rem; min-height: 1.2em; }
    `;
    (document.head || document.documentElement).appendChild(style);
  }

  let selected = null;

  function setStatus(text) {
    const node = document.getElementById(STATUS_ID);
    if (node) node.textContent = text;
  }

  function renderChips(targetState) {
    const holder = document.getElementById(CHIPS_ID);
    if (!holder) return;
    while (holder.firstChild) holder.removeChild(holder.firstChild);
    const subjects = todaySubjects(targetState);
    if (!subjects.length) {
      const empty = document.createElement("small");
      empty.textContent = "Sem metas hoje — lance pelo formulário completo em Questões.";
      holder.appendChild(empty);
      return;
    }
    if (selected && !subjects.some((entry) => entry.subject === selected.subject && entry.discipline === selected.discipline)) {
      selected = null;
    }
    for (const entry of subjects) {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.textContent = entry.subject.length > 42 ? `${entry.subject.slice(0, 40)}…` : entry.subject;
      const active = Boolean(selected && selected.subject === entry.subject && selected.discipline === entry.discipline);
      chip.setAttribute("aria-pressed", active ? "true" : "false");
      chip.setAttribute("title", `${entry.discipline} — ${entry.subject}`);
      chip.addEventListener("click", () => {
        selected = entry;
        renderChips(targetState);
        setStatus("");
      });
      holder.appendChild(chip);
    }
  }

  function numberField(id, label, value) {
    const wrapper = document.createElement("label");
    const caption = document.createElement("span");
    caption.textContent = label;
    const input = document.createElement("input");
    input.id = id;
    input.type = "number";
    input.min = "0";
    input.inputMode = "numeric";
    input.value = value;
    wrapper.appendChild(caption);
    wrapper.appendChild(input);
    return wrapper;
  }

  function readNumber(id) {
    const node = document.getElementById(id);
    return node ? Number(node.value) : 0;
  }

  function submit(targetState) {
    if (!selected) { setStatus("Escolha o assunto primeiro."); return; }
    const result = record(targetState, {
      discipline: selected.discipline,
      subject: selected.subject,
      syllabusItemId: selected.syllabusItemId,
      total: readNumber(TOTAL_ID),
      correct: readNumber(CORRECT_ID),
      blank: readNumber(BLANK_ID)
    });
    if (!result.saved) {
      setStatus(result.reason === "acertos-acima-do-total"
        ? "Acertos e brancos somam mais que o total."
        : "Informe quantas questões você fez.");
      return;
    }
    const { total, correct, wrong } = result.log;
    setStatus(`Lançado: ${total} questões, ${correct} certas, ${wrong} erradas.`);
    for (const id of [TOTAL_ID, CORRECT_ID, BLANK_ID]) {
      const node = document.getElementById(id);
      if (node) node.value = "";
    }
    try { if (typeof saveData === "function") saveData({ markLocalChange: true }); }
    catch (error) { console.warn("[Aldus V436] Falha ao persistir o lançamento.", error); }
  }

  function anchorNode() {
    if (typeof document === "undefined") return null;
    return document.getElementById("dailyGoalsList");
  }

  function ensurePanel(targetState) {
    const anchor = anchorNode();
    if (!anchor || !anchor.parentNode) return null;
    const existing = document.getElementById(PANEL_ID);
    if (existing) { renderChips(targetState); return existing; }
    ensureStyle();

    const panel = document.createElement("section");
    panel.id = PANEL_ID;

    const title = document.createElement("div");
    title.className = "aldus-v436-title";
    title.textContent = "Lançar questões";
    panel.appendChild(title);

    const chips = document.createElement("div");
    chips.id = CHIPS_ID;
    panel.appendChild(chips);

    const row = document.createElement("div");
    row.className = "aldus-v436-row";
    row.appendChild(numberField(TOTAL_ID, "Total", ""));
    row.appendChild(numberField(CORRECT_ID, "Acertos", ""));
    row.appendChild(numberField(BLANK_ID, "Em branco", ""));

    const button = document.createElement("button");
    button.id = SUBMIT_ID;
    button.type = "button";
    button.textContent = "Lançar";
    button.addEventListener("click", () => submit(resolveAppState() || targetState));
    row.appendChild(button);
    panel.appendChild(row);

    const status = document.createElement("small");
    status.id = STATUS_ID;
    status.setAttribute("aria-live", "polite");
    panel.appendChild(status);

    anchor.parentNode.insertBefore(panel, anchor.nextSibling || null);
    renderChips(targetState);
    return panel;
  }

  function renderPanel() {
    try {
      const targetState = resolveAppState();
      if (!targetState) return false;
      return Boolean(ensurePanel(targetState));
    } catch {
      return false;
    }
  }

  function installRenderHook() {
    try {
      if (typeof globalThis.render !== "function") return false;
      if (globalThis.render.__aldusQuickQuestionV436 === VERSION) return true;
      const previous = globalThis.render;
      const wrapped = function(...args) {
        const result = previous.apply(this, args);
        renderPanel();
        return result;
      };
      Object.defineProperty(wrapped, "__aldusQuickQuestionV436", { value: VERSION });
      Object.defineProperty(wrapped, "__aldusQuickQuestionOriginal", { value: previous });
      globalThis.render = wrapped;
      return true;
    } catch {
      return false;
    }
  }

  const api = Object.freeze({
    version: VERSION,
    panelId: PANEL_ID,
    origin: ORIGIN,
    trainingType: TRAINING_TYPE,
    todaySubjects,
    buildLog,
    record,
    renderPanel,
    installRenderHook
  });

  globalThis[API_KEY] = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;

  function start() {
    installRenderHook();
    renderPanel();
  }

  if (typeof window !== "undefined") {
    window.addEventListener("aldus:post-bootstrap-maintenance-complete", start, { once: true });
    window.addEventListener("aldus:bootstrap-ready", start, { once: true });
    window.addEventListener("load", start, { once: true });
  }
})();
