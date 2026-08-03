(() => {
  "use strict";

  if (globalThis.__aldusQuestionBankTrainingV223) return;
  globalThis.__aldusQuestionBankTrainingV223 = true;

  const VERSION = "20260803-corrige-funcionamento-banco-questoes-v228";
  const DRAFT_KEY = "aldusQuestionBankTrainingDraftV223";
  const PREFS_KEY = "aldusQuestionBankTrainingPrefsV223";
  const MAX_DRAFT_AGE_MS = 14 * 24 * 60 * 60 * 1000;
  let autoAdvanceTimer = 0;

  if (
    typeof qbStart !== "function"
    || typeof qbRenderQuestion !== "function"
    || typeof qbFinish !== "function"
    || typeof renderQuestionBank !== "function"
  ) return;

  const originalStart = qbStart;
  const originalFinish = qbFinish;
  const originalRenderQuestionBank = renderQuestionBank;

  const defaultPreferences = Object.freeze({
    feedbackMode: "study",
    autoAdvanceSimulation: true
  });

  function safeParse(raw, fallback = null) {
    try { return JSON.parse(raw); } catch { return fallback; }
  }

  function readPreferences() {
    const stored = safeParse(localStorage.getItem(PREFS_KEY), {});
    return {
      feedbackMode: stored?.feedbackMode === "simulated" ? "simulated" : "study",
      autoAdvanceSimulation: stored?.autoAdvanceSimulation !== false
    };
  }

  function writePreferences(next = {}) {
    const preferences = { ...defaultPreferences, ...readPreferences(), ...next };
    try { localStorage.setItem(PREFS_KEY, JSON.stringify(preferences)); } catch {}
    return preferences;
  }

  function trainingMode(training = questionBankTraining) {
    if (training?.mode === "errorNotebook") return "study";
    return training?.feedbackMode === "simulated" ? "simulated" : "study";
  }

  function trainingAutoAdvance(training = questionBankTraining) {
    return trainingMode(training) === "simulated" && training?.autoAdvanceSimulation !== false;
  }

  function answeredCount(training = questionBankTraining) {
    if (!training) return 0;
    return training.items.reduce((total, question) => total + (training.answers?.[question.id] ? 1 : 0), 0);
  }

  function unansweredCount(training = questionBankTraining) {
    return Math.max(0, Number(training?.items?.length || 0) - answeredCount(training));
  }

  function persistDraft() {
    if (!questionBankTraining?.items?.length) {
      try { localStorage.removeItem(DRAFT_KEY); } catch {}
      updateResumeBar();
      return;
    }

    const payload = {
      version: VERSION,
      savedAt: new Date().toISOString(),
      training: {
        id: questionBankTraining.id,
        createdAt: questionBankTraining.createdAt,
        index: questionBankTraining.index,
        items: questionBankTraining.items,
        answers: questionBankTraining.answers || {},
        cadernoRegistrado: questionBankTraining.cadernoRegistrado || {},
        mode: questionBankTraining.mode || "default",
        feedbackMode: trainingMode(questionBankTraining),
        autoAdvanceSimulation: questionBankTraining.autoAdvanceSimulation !== false
      }
    };

    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(payload)); } catch {}
    updateResumeBar();
  }

  function readDraft() {
    const payload = safeParse(localStorage.getItem(DRAFT_KEY));
    const savedAt = Date.parse(payload?.savedAt || "");
    const expired = !Number.isFinite(savedAt) || Date.now() - savedAt > MAX_DRAFT_AGE_MS;
    if (!payload?.training?.items?.length || expired) {
      try { localStorage.removeItem(DRAFT_KEY); } catch {}
      return null;
    }
    return payload;
  }

  function restoreDraft() {
    const payload = readDraft();
    if (!payload) return false;
    const saved = payload.training;
    const items = (saved.items || []).map((snapshot) => {
      const current = (state.questionBank || []).find((question) => question.id === snapshot.id);
      return current ? { ...snapshot, ...current } : snapshot;
    }).filter(Boolean);
    if (!items.length) return false;

    questionBankTraining = {
      id: saved.id || createId(),
      createdAt: saved.createdAt || new Date().toISOString(),
      index: Math.min(Math.max(0, Number(saved.index) || 0), items.length - 1),
      items,
      answers: saved.answers || {},
      cadernoRegistrado: saved.cadernoRegistrado || {},
      mode: saved.mode || "default",
      feedbackMode: saved.feedbackMode === "simulated" ? "simulated" : "study",
      autoAdvanceSimulation: saved.autoAdvanceSimulation !== false
    };
    return true;
  }

  function discardDraft() {
    clearTimeout(autoAdvanceTimer);
    questionBankTraining = null;
    try { localStorage.removeItem(DRAFT_KEY); } catch {}
    if (elements.qbTrainingPanel) elements.qbTrainingPanel.hidden = true;
    updateResumeBar();
  }

  function ensureConfigurationControls() {
    if (document.getElementById("qbFeedbackModeV223")) return;
    const quantity = elements.qbTrainingLimit?.closest("label");
    if (!quantity) return;

    const modeLabel = document.createElement("label");
    modeLabel.className = "qb-training-mode-v223";
    modeLabel.innerHTML = `Modo do treino
      <select id="qbFeedbackModeV223">
        <option value="study">Estudo — feedback após responder</option>
        <option value="simulated">Simulado — feedback somente no resultado</option>
      </select>`;
    quantity.insertAdjacentElement("afterend", modeLabel);

    const autoLabel = document.createElement("label");
    autoLabel.id = "qbAutoAdvanceLabelV223";
    autoLabel.className = "qb-check qb-auto-advance-v223";
    autoLabel.innerHTML = `<input id="qbAutoAdvanceV223" type="checkbox" /> Avançar automaticamente no modo simulado`;

    const shuffle = elements.qbShuffleTraining?.closest("label");
    (shuffle || modeLabel).insertAdjacentElement("afterend", autoLabel);

    const preferences = readPreferences();
    const mode = document.getElementById("qbFeedbackModeV223");
    const auto = document.getElementById("qbAutoAdvanceV223");
    mode.value = preferences.feedbackMode;
    auto.checked = preferences.autoAdvanceSimulation;

    const syncVisibility = () => {
      autoLabel.hidden = mode.value !== "simulated";
      writePreferences({
        feedbackMode: mode.value,
        autoAdvanceSimulation: auto.checked
      });
    };

    mode.addEventListener("change", syncVisibility);
    auto.addEventListener("change", syncVisibility);
    syncVisibility();
  }

  function selectedPreferences() {
    ensureConfigurationControls();
    const stored = readPreferences();
    return {
      feedbackMode: document.getElementById("qbFeedbackModeV223")?.value === "simulated" ? "simulated" : stored.feedbackMode,
      autoAdvanceSimulation: document.getElementById("qbAutoAdvanceV223")?.checked ?? stored.autoAdvanceSimulation
    };
  }

  function ensureResumeBar() {
    let bar = document.getElementById("qbTrainingResumeV223");
    if (bar) return bar;
    const anchor = elements.qbMessage || elements.qbTrainingPanel;
    if (!anchor?.parentElement) return null;

    bar = document.createElement("section");
    bar.id = "qbTrainingResumeV223";
    bar.className = "qb-training-resume-v223";
    bar.hidden = true;
    bar.setAttribute("aria-live", "polite");
    anchor.insertAdjacentElement("afterend", bar);
    return bar;
  }

  function updateResumeBar() {
    const bar = ensureResumeBar();
    if (!bar) return;
    const draft = readDraft();
    const active = Boolean(questionBankTraining?.items?.length);
    const activeHidden = Boolean(active && elements.qbTrainingPanel?.hidden);
    if (active && !activeHidden) {
      bar.hidden = true;
      bar.innerHTML = "";
      return;
    }
    if (!draft && !activeHidden) {
      bar.hidden = true;
      bar.innerHTML = "";
      return;
    }

    const training = questionBankTraining || draft?.training;
    const total = Number(training?.items?.length || 0);
    const answered = training ? Object.keys(training.answers || {}).filter((id) => training.answers[id]).length : 0;
    const mode = training?.feedbackMode === "simulated" ? "Simulado" : "Estudo";
    bar.hidden = false;
    bar.innerHTML = `<div><strong>Treino salvo</strong><span>${answered}/${total} respondidas • modo ${mode}</span></div><div class="actions"><button type="button" data-qb-resume-v223>Retomar treino</button><button type="button" class="secondary-button" data-qb-discard-v223>Descartar</button></div>`;
  }

  function scrollTrainingIntoView() {
    window.setTimeout(() => elements.qbTrainingPanel?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
  }

  function feedbackMessage(question, selected, reveal, mode) {
    if (!selected) return mode === "simulated"
      ? "Escolha uma resposta. O gabarito e a justificativa serão exibidos somente no resultado final."
      : "Escolha uma resposta para conferir o gabarito e a justificativa.";
    if (mode === "simulated") return "Resposta registrada. O feedback permanece oculto até a finalização do treino.";
    if (!qbHasKey(question)) return "Resposta registrada. Esta questão não possui gabarito cadastrado.";
    if (!reveal) return "Resposta registrada.";
    if (qbIsBlankMark(question, selected)) return `Questão marcada como branco. Gabarito: ${question.gabarito}.`;
    if (qbIsDoubtMark(question, selected)) return `Questão marcada como dúvida. Gabarito: ${question.gabarito}.`;
    return selected === question.gabarito
      ? `Resposta correta. Gabarito: ${question.gabarito}.`
      : `Resposta incorreta. Gabarito: ${question.gabarito}.`;
  }

  function answerButtonClass(question, key, selected, reveal) {
    const classes = ["answer-button", "qb-choice-button"];
    if (selected === key) classes.push("selected");
    if (reveal && key === question.gabarito) classes.push("is-key-v223");
    if (reveal && selected === key && selected !== question.gabarito) classes.push("is-wrong-v223");
    return classes.join(" ");
  }

  function enhancedRenderQuestion() {
    const training = questionBankTraining;
    if (!training?.items?.length || !elements.qbQuestionCard) return;
    training.index = Math.min(Math.max(0, Number(training.index) || 0), training.items.length - 1);

    const question = training.items[training.index];
    if (!question) return;
    const selected = training.answers?.[question.id] || "";
    const mode = trainingMode(training);
    const reveal = mode === "study" && Boolean(selected) && qbHasKey(question);
    const answered = answeredCount(training);
    const unanswered = unansweredCount(training);
    const isNotebook = training.mode === "errorNotebook";
    const progress = training.items.length ? Math.round(answered / training.items.length * 100) : 0;

    elements.qbTrainingCounter.textContent = `${training.index + 1}/${training.items.length}`;
    elements.qbTrainingProgress.style.width = `${progress}%`;
    elements.qbTrainingPanel.dataset.trainingModeV223 = mode;

    const choices = qbChoiceKeys(question).map((key) => {
      const label = qbIsMultipleChoice(question)
        ? (question.alternativas?.[key] || "")
        : ({ C: "Certo", E: "Errado" }[key] || key);
      return `<button class="${answerButtonClass(question, key, selected, reveal)}" data-qb-answer="${key}" type="button" aria-pressed="${selected === key}"><span class="qb-choice-key">${key}</span><span class="qb-choice-text">${escapeHTML(label)}</span></button>`;
    }).join("");

    const explanation = reveal
      ? `<div class="notice qb-feedback-v223"><strong>Justificativa/fundamento:</strong> ${escapeHTML(qbExplanationText(question))}</div>`
      : "";
    const notebookActions = isNotebook && reveal && selected === question.gabarito
      ? `<div class="actions qb-review-actions"><button class="secondary-button" data-qb-review-status="revisado" data-qb-error-id="${escapeHTML(question.id)}" type="button">Marcar como revisada</button><button data-qb-review-status="dominado" data-qb-error-id="${escapeHTML(question.id)}" type="button">Marcar como dominada</button></div>`
      : "";
    const qcMeta = question.qcClassificacao ? `<span>Classificação no PDF: ${escapeHTML(question.qcClassificacao)}</span>` : "";
    const modeLabel = mode === "simulated" ? "Simulado" : (isNotebook ? "Revisão de erros" : "Estudo");

    elements.qbQuestionCard.innerHTML = `
      <div class="qb-training-toolbar-v223">
        <span class="badge neutral">Modo ${modeLabel}</span>
        <span>${answered} respondida(s) • ${unanswered} pendente(s)</span>
        <span class="qb-shortcuts-v223">Atalhos: A–E/C–E, 0 branco, ? dúvida, ←/→</span>
      </div>
      <div class="question-bank-meta"><span>Disciplina: ${escapeHTML(question.disciplina)}</span><span>Assunto: ${escapeHTML(question.assunto)}</span><span>Tipo: ${escapeHTML(question.tipo || "Certo/Errado")}</span><span>Banca: ${escapeHTML(question.banca || "-")}</span><span>Ano: ${escapeHTML(question.ano || "-")}</span>${qcMeta}</div>
      <p class="question-bank-text">${escapeHTML(question.enunciado)}</p>
      <div class="qb-choice-list">${choices}</div>
      <div class="question-bank-actions"><button class="answer-button blank-button ${selected === QB_MARK_BLANK ? "selected" : ""}" data-qb-answer="${QB_MARK_BLANK}" type="button">Branco</button><button class="answer-button doubt-button ${selected === QB_MARK_DOUBT ? "selected" : ""}" data-qb-answer="${QB_MARK_DOUBT}" type="button">Dúvida</button></div>
      <p class="notice qb-neutral-feedback-v223">${escapeHTML(feedbackMessage(question, selected, reveal, mode))}</p>
      ${explanation}${notebookActions}
      <div class="training-footer qb-training-footer-v223">
        <span class="item-meta">Progresso: ${progress}%</span>
        <div class="actions">
          <button class="secondary-button" data-qb-nav="prev" type="button" ${training.index === 0 ? "disabled" : ""}>Anterior</button>
          <button class="secondary-button" data-qb-nav="next" type="button" ${training.index >= training.items.length - 1 ? "disabled" : ""}>Próxima questão</button>
          <button class="secondary-button" data-qb-save-exit-v223 type="button">Salvar e sair</button>
          <button data-qb-finish type="button">Finalizar treino</button>
        </div>
      </div>`;

    persistDraft();
  }

  function registerStudyError(question, answer) {
    if (trainingMode(questionBankTraining) !== "study") return;
    const reason = qbErrorReason({ ...question, marcado: answer });
    if (!reason) return;
    const signature = `${answer}:${reason}`;
    if (questionBankTraining.cadernoRegistrado?.[question.id] === signature) return;
    registrarNoCadernoErros(question, answer, reason);
    questionBankTraining.cadernoRegistrado ||= {};
    questionBankTraining.cadernoRegistrado[question.id] = signature;
  }

  function answerCurrent(answer) {
    if (!questionBankTraining) return;
    const question = questionBankTraining.items[questionBankTraining.index];
    if (!question) return;
    questionBankTraining.answers ||= {};
    questionBankTraining.answers[question.id] = answer;
    registerStudyError(question, answer);
    persistDraft();
    enhancedRenderQuestion();

    clearTimeout(autoAdvanceTimer);
    if (trainingAutoAdvance(questionBankTraining) && questionBankTraining.index < questionBankTraining.items.length - 1) {
      const expectedQuestionId = question.id;
      const expectedIndex = questionBankTraining.index;
      autoAdvanceTimer = window.setTimeout(() => {
        if (!questionBankTraining || questionBankTraining.index !== expectedIndex || questionBankTraining.items[expectedIndex]?.id !== expectedQuestionId) return;
        questionBankTraining.index += 1;
        persistDraft();
        enhancedRenderQuestion();
      }, 220);
    }
  }

  function navigateTraining(direction) {
    if (!questionBankTraining) return;
    clearTimeout(autoAdvanceTimer);
    const next = direction === "prev" ? questionBankTraining.index - 1 : questionBankTraining.index + 1;
    questionBankTraining.index = Math.min(Math.max(0, next), questionBankTraining.items.length - 1);
    persistDraft();
    enhancedRenderQuestion();
  }

  function finishTrainingWithGuard() {
    if (!questionBankTraining) return;
    const pending = unansweredCount(questionBankTraining);
    if (pending && !confirm(`Ainda há ${pending} questão(ões) sem resposta. Finalizar mesmo assim?`)) return;
    clearTimeout(autoAdvanceTimer);
    originalFinish();
    if (!questionBankTraining) {
      try { localStorage.removeItem(DRAFT_KEY); } catch {}
      if (typeof autoSyncAfterSave === "function") autoSyncAfterSave("question-bank-training");
    }
    updateResumeBar();
  }

  function saveAndExitTraining() {
    if (!questionBankTraining) return;
    clearTimeout(autoAdvanceTimer);
    persistDraft();
    if (elements.qbTrainingPanel) elements.qbTrainingPanel.hidden = true;
    if (elements.qbResultPanel) elements.qbResultPanel.hidden = true;
    if (elements.qbMessage) elements.qbMessage.textContent = `Treino salvo: ${answeredCount(questionBankTraining)}/${questionBankTraining.items.length} questão(ões) respondida(s).`;
    updateResumeBar();
  }

  qbRenderQuestion = enhancedRenderQuestion;
  qbFinish = finishTrainingWithGuard;
  qbStart = function enhancedStart(items, options = {}) {
    if (questionBankTraining?.items?.length && !elements.qbTrainingPanel?.hidden) {
      if (!confirm("Há um treino em andamento. Deseja substituí-lo por um novo treino?")) return;
    }
    const preferences = selectedPreferences();
    clearTimeout(autoAdvanceTimer);
    originalStart(items, options);
    if (!questionBankTraining) return;
    questionBankTraining.feedbackMode = options.mode === "errorNotebook" ? "study" : preferences.feedbackMode;
    questionBankTraining.autoAdvanceSimulation = preferences.autoAdvanceSimulation;
    questionBankTraining.cadernoRegistrado ||= {};
    persistDraft();
    enhancedRenderQuestion();
    updateResumeBar();
    scrollTrainingIntoView();
  };

  renderQuestionBank = function enhancedRenderQuestionBank(...args) {
    const result = originalRenderQuestionBank(...args);
    ensureConfigurationControls();
    updateResumeBar();
    return result;
  };

  elements.qbQuestionCard?.addEventListener("click", (event) => {
    if (!questionBankTraining) return;
    const answer = event.target.closest("[data-qb-answer]")?.dataset.qbAnswer;
    const navigation = event.target.closest("[data-qb-nav]")?.dataset.qbNav;
    const finish = event.target.closest("[data-qb-finish]");
    const saveExit = event.target.closest("[data-qb-save-exit-v223]");

    if (!answer && !navigation && !finish && !saveExit) return;
    event.preventDefault();
    event.stopImmediatePropagation();

    if (answer) return answerCurrent(answer);
    if (navigation) return navigateTraining(navigation);
    if (saveExit) return saveAndExitTraining();
    if (finish) return finishTrainingWithGuard();
  }, true);

  document.addEventListener("click", (event) => {
    if (event.target.closest("[data-qb-resume-v223]")) {
      event.preventDefault();
      if (!questionBankTraining && !restoreDraft()) return;
      elements.qbTrainingPanel.hidden = false;
      elements.qbResultPanel.hidden = true;
      enhancedRenderQuestion();
      updateResumeBar();
      scrollTrainingIntoView();
      return;
    }
    if (event.target.closest("[data-qb-discard-v223]")) {
      event.preventDefault();
      if (confirm("Descartar o treino salvo? As respostas ainda não finalizadas serão apagadas.")) discardDraft();
    }
  }, true);

  document.addEventListener("keydown", (event) => {
    if (!questionBankTraining || elements.qbTrainingPanel?.hidden) return;
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.target?.matches?.("input, textarea, select, [contenteditable='true']")) return;

    const question = questionBankTraining.items[questionBankTraining.index];
    if (!question) return;
    const key = String(event.key || "").toUpperCase();
    const allowed = qbChoiceKeys(question);

    if (allowed.includes(key)) {
      event.preventDefault();
      answerCurrent(key);
      return;
    }
    if (event.key === "0") {
      event.preventDefault();
      answerCurrent(QB_MARK_BLANK);
      return;
    }
    if (event.key === "?") {
      event.preventDefault();
      answerCurrent(QB_MARK_DOUBT);
      return;
    }
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      navigateTraining("prev");
      return;
    }
    if (event.key === "ArrowRight" || event.key === "Enter") {
      event.preventDefault();
      navigateTraining("next");
    }
  }, true);

  function ensureStyles() {
    if (document.getElementById("questionBankTrainingStylesV223")) return;
    const style = document.createElement("style");
    style.id = "questionBankTrainingStylesV223";
    style.textContent = `
      .qb-training-mode-v223 select{min-width:250px}
      .qb-auto-advance-v223[hidden]{display:none!important}
      .qb-training-resume-v223{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:14px 16px;margin:14px 0;border:1px solid rgba(56,189,248,.42);border-radius:16px;background:rgba(14,116,144,.10)}
      .qb-training-resume-v223>div:first-child{display:grid;gap:3px}.qb-training-resume-v223 span{font-size:.88rem;opacity:.78}
      .qb-training-toolbar-v223{display:flex;flex-wrap:wrap;align-items:center;gap:10px 14px;margin-bottom:14px;padding:10px 12px;border:1px solid var(--border,#dbe4f0);border-radius:14px;background:rgba(37,99,235,.05);font-size:.9rem}
      .qb-shortcuts-v223{margin-left:auto;opacity:.72;font-size:.82rem}
      .qb-choice-button.is-key-v223{border-color:#16a34a!important;box-shadow:0 0 0 2px rgba(22,163,74,.2);background:rgba(22,163,74,.14)!important}
      .qb-choice-button.is-wrong-v223{border-color:#dc2626!important;box-shadow:0 0 0 2px rgba(220,38,38,.16);background:rgba(220,38,38,.10)!important}
      .qb-training-footer-v223{display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap}
      .qb-feedback-v223{border-left:4px solid #16a34a}.qb-neutral-feedback-v223{min-height:44px}
      #qbTrainingPanel[data-training-mode-v223="simulated"] .qb-neutral-feedback-v223{border-left:4px solid #0284c7}
      html[data-aldus-theme="premium-stable"] .qb-training-resume-v223{background:rgba(8,47,73,.72);border-color:rgba(56,189,248,.45)}
      html[data-aldus-theme="premium-stable"] .qb-training-toolbar-v223{background:rgba(8,47,73,.62);border-color:rgba(125,211,252,.28)}
      @media(max-width:720px){.qb-training-resume-v223{align-items:stretch;flex-direction:column}.qb-training-resume-v223 .actions{width:100%}.qb-training-resume-v223 .actions button{flex:1}.qb-shortcuts-v223{width:100%;margin-left:0}.qb-training-footer-v223 .actions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));width:100%}.qb-training-footer-v223 .actions button{width:100%}}
      @media(max-width:460px){.qb-training-footer-v223 .actions{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  }

  function boot() {
    ensureStyles();
    ensureConfigurationControls();
    updateResumeBar();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();
