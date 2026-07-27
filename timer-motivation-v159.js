(() => {
  "use strict";

  const PATCH_VERSION = "20260727-cronometro-motivacao-v159";
  const HISTORY_KEY = "metasEstudoTimerMotivationalHistoryV159";
  const ENABLE_MIGRATION_KEY = "metasEstudoTimerMotivationEnabledV159";
  const DISPLAY_DURATION_MS = 30000;
  const FALLBACK_INTERVAL_MS = 12 * 60 * 1000;

  if (globalThis.__aldusTimerMotivationV159) return;
  globalThis.__aldusTimerMotivationV159 = true;

  const ADDITIONAL_MESSAGES = {
    10: [
      "Começar já foi uma vitória; agora mantenha o passo.",
      "Os primeiros minutos definem o tom da sessão.",
      "Seu foco já está em movimento.",
      "Uma sessão consistente começa com presença.",
      "Você abriu espaço para o que realmente importa.",
      "Deixe o ritmo crescer sem pressa e sem pausa.",
      "Este começo já conta a favor da sua aprovação."
    ],
    25: [
      "Um quarto concluído: o esforço já virou progresso.",
      "Você entrou no ritmo certo; preserve-o.",
      "A constância está fazendo o trabalho silencioso.",
      "Cada bloco bem estudado reduz a incerteza da prova.",
      "Continue presente: o resultado nasce dessa sequência.",
      "Seu planejamento está saindo do papel.",
      "Você já avançou o suficiente para confiar no processo."
    ],
    40: [
      "O foco sustentado está produzindo resultado.",
      "Você se aproximou da metade com consistência.",
      "Mais conhecimento consolidado, menos insegurança.",
      "Continue no assunto atual; profundidade também pontua.",
      "Seu cérebro aprende melhor quando você permanece.",
      "O esforço de agora será lembrado na hora da prova."
    ],
    50: [
      "Metade concluída: reorganize a atenção e siga.",
      "Você venceu a primeira metade com disciplina.",
      "Daqui em diante, cada minuto amplia sua vantagem.",
      "Seu estudo já tem forma, direção e resultado.",
      "Respire fundo e proteja o ritmo conquistado.",
      "Metade da sessão virou investimento real."
    ],
    65: [
      "Você entrou na parte decisiva da sessão.",
      "A disciplina está vencendo a vontade de interromper.",
      "Seu progresso já é maior que o caminho restante.",
      "Continue com qualidade; não acelere o que precisa compreender.",
      "É nesta etapa que a constância se diferencia.",
      "Você está transformando esforço em domínio."
    ],
    75: [
      "Três quartos concluídos: mantenha a precisão.",
      "A reta final começou, mas o foco continua inteiro.",
      "Você construiu um ótimo bloco de estudo.",
      "Não abandone agora o ritmo que levou tempo para formar.",
      "Cada minuto final ajuda a fixar o conteúdo.",
      "O encerramento bem feito fortalece a próxima revisão."
    ],
    90: [
      "Falta pouco: conclua com atenção, não apenas com pressa.",
      "Você chegou à reta final por mérito da sua constância.",
      "Proteja os últimos minutos; eles também valem pontos.",
      "Finalize o raciocínio atual com calma.",
      "Quase concluído: mantenha a qualidade até o fim.",
      "Seu compromisso de hoje está perto de ser cumprido."
    ],
    100: [
      "Sessão concluída: registre o avanço e reconheça o esforço.",
      "Meta cumprida com constância e foco.",
      "Você transformou tempo planejado em estudo realizado.",
      "Mais uma etapa concreta no caminho da aprovação.",
      "Feche a sessão com a certeza de que avançou.",
      "O trabalho de hoje está concluído; o resultado ficou."
    ]
  };

  const addedCount = Object.values(ADDITIONAL_MESSAGES).reduce((sum, list) => sum + list.length, 0);
  if (addedCount !== 50) {
    console.error(`[Cronômetro] Pacote motivacional inválido: ${addedCount} mensagens; esperado: 50.`);
    return;
  }

  function installMessages() {
    if (typeof TIMER_MOTIVATIONAL_MESSAGES !== "object" || !TIMER_MOTIVATIONAL_MESSAGES) return false;
    Object.entries(ADDITIONAL_MESSAGES).forEach(([milestone, additions]) => {
      const current = Array.isArray(TIMER_MOTIVATIONAL_MESSAGES[milestone])
        ? TIMER_MOTIVATIONAL_MESSAGES[milestone]
        : [];
      TIMER_MOTIVATIONAL_MESSAGES[milestone] = [...new Set([...current, ...additions])];
    });
    return true;
  }

  function readHistory() {
    try {
      const parsed = JSON.parse(localStorage.getItem(HISTORY_KEY) || "{}");
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch (error) {
      console.warn("[Cronômetro] Histórico motivacional inválido; um novo será criado.", error);
      return {};
    }
  }

  function writeHistory(history) {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    } catch (error) {
      console.warn("[Cronômetro] Não foi possível salvar o histórico motivacional.", error);
    }
  }

  function shuffled(values) {
    const list = [...values];
    for (let index = list.length - 1; index > 0; index -= 1) {
      const randomIndex = Math.floor(Math.random() * (index + 1));
      [list[index], list[randomIndex]] = [list[randomIndex], list[index]];
    }
    return list;
  }

  function chooseMessageWithoutRepetition(milestone) {
    const messages = typeof TIMER_MOTIVATIONAL_MESSAGES === "object" && Array.isArray(TIMER_MOTIVATIONAL_MESSAGES?.[milestone])
      ? [...new Set(TIMER_MOTIVATIONAL_MESSAGES[milestone].filter(Boolean))]
      : [];
    if (!messages.length) return "";

    const history = readHistory();
    history.bags ||= {};
    history.recent ||= [];

    let bag = Array.isArray(history.bags[milestone])
      ? history.bags[milestone].filter((phrase) => messages.includes(phrase))
      : [];
    if (!bag.length) bag = shuffled(messages);

    let selectedIndex = bag.findIndex((phrase) => !history.recent.includes(phrase));
    if (selectedIndex < 0) selectedIndex = 0;
    const [phrase] = bag.splice(selectedIndex, 1);

    history.bags[milestone] = bag;
    history.recent = [phrase, ...history.recent.filter((item) => item !== phrase)].slice(0, 10);
    writeHistory(history);
    return phrase || "";
  }

  function ensureStyles() {
    if (document.getElementById("aldusTimerMotivationStylesV159")) return;
    const style = document.createElement("style");
    style.id = "aldusTimerMotivationStylesV159";
    style.textContent = `
      #timerMotivationalToast.timer-motivational-toast {
        z-index: 6000 !important;
      }
      .timer-motivational-inline-v159 {
        display: grid;
        gap: 4px;
        margin: 2px 0 8px;
        padding: 11px 13px;
        border: 1px solid rgba(96, 165, 250, .62);
        border-radius: 14px;
        background: linear-gradient(145deg, rgba(10, 45, 73, .98), rgba(6, 30, 51, .98));
        box-shadow: 0 8px 22px rgba(0, 8, 22, .28);
        color: #ffffff;
      }
      .timer-motivational-inline-v159[hidden] { display: none !important; }
      .timer-motivational-inline-v159 strong {
        color: #9fd5ff;
        font-size: .74rem;
        letter-spacing: .08em;
        text-transform: uppercase;
      }
      .timer-motivational-inline-v159 span {
        color: #ffffff;
        font-size: .94rem;
        font-weight: 800;
        line-height: 1.35;
      }
    `;
    document.head.appendChild(style);
  }

  function ensureToast() {
    let toast = document.getElementById("timerMotivationalToast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "timerMotivationalToast";
      toast.className = "timer-motivational-toast";
      toast.setAttribute("aria-live", "polite");
      toast.setAttribute("aria-atomic", "true");
      toast.hidden = true;
      document.body.appendChild(toast);
    }
    return toast;
  }

  function ensureInlineMessage() {
    let inline = document.getElementById("timerMotivationalInlineV159");
    if (inline) return inline;
    const progressText = document.getElementById("timerProgressText");
    if (!progressText) return null;
    inline = document.createElement("div");
    inline.id = "timerMotivationalInlineV159";
    inline.className = "timer-motivational-inline-v159";
    inline.setAttribute("aria-live", "polite");
    inline.setAttribute("aria-atomic", "true");
    inline.hidden = true;
    progressText.insertAdjacentElement("afterend", inline);
    return inline;
  }

  function motivationLabel(milestone) {
    return Number.isFinite(Number(milestone))
      ? `${Number(milestone)}% CONCLUÍDO`
      : String(milestone || "SESSÃO EM ANDAMENTO");
  }

  function presentMotivation(label, phrase) {
    if (!phrase) return;
    ensureStyles();
    const toast = ensureToast();
    const inline = ensureInlineMessage();
    const title = motivationLabel(label);

    [toast, inline].filter(Boolean).forEach((element) => {
      element.replaceChildren();
      const strong = document.createElement("strong");
      const span = document.createElement("span");
      strong.textContent = title;
      span.textContent = phrase;
      element.append(strong, span);
      element.hidden = false;
      element.classList.add("visible");
    });

    clearTimeout(globalThis.__aldusTimerMotivationTimeoutV159);
    globalThis.__aldusTimerMotivationTimeoutV159 = setTimeout(() => {
      [toast, inline].filter(Boolean).forEach((element) => {
        element.classList.remove("visible");
        element.hidden = true;
      });
    }, DISPLAY_DURATION_MS);
  }

  function persistSessionSafely() {
    try {
      if (typeof persistFloatingTimerSession === "function") persistFloatingTimerSession();
    } catch (error) {
      console.warn("[Cronômetro] Não foi possível persistir o estado motivacional.", error);
    }
  }

  function enableMessagesOnce() {
    try {
      if (localStorage.getItem(ENABLE_MIGRATION_KEY)) return;
      if (typeof state === "object" && state?.settings) {
        state.settings.timerPreferences ||= {};
        state.settings.timerPreferences.motivationalMessages = true;
        if (typeof saveData === "function") saveData();
      }
      localStorage.setItem(ENABLE_MIGRATION_KEY, PATCH_VERSION);
    } catch (error) {
      console.warn("[Cronômetro] Não foi possível ativar a preferência motivacional automaticamente.", error);
    }
  }

  if (!installMessages()) {
    console.warn("[Cronômetro] Correção motivacional v159 não aplicada: banco de mensagens indisponível.");
    globalThis.__aldusTimerMotivationV159Status = { version: PATCH_VERSION, applied: false };
    return;
  }

  enableMessagesOnce();
  ensureStyles();
  ensureToast();
  ensureInlineMessage();

  try {
    chooseTimerMotivationalMessage = chooseMessageWithoutRepetition;
  } catch (error) {
    globalThis.chooseTimerMotivationalMessage = chooseMessageWithoutRepetition;
  }

  try {
    showTimerMotivationalToast = function showTimerMotivationalToastV159(
      milestone,
      phrase = chooseMessageWithoutRepetition(milestone)
    ) {
      presentMotivation(milestone, phrase);
    };
  } catch (error) {
    globalThis.showTimerMotivationalToast = (milestone, phrase = chooseMessageWithoutRepetition(milestone)) => {
      presentMotivation(milestone, phrase);
    };
  }

  const improvedProgressCheck = function checkTimerMotivationalProgressV159(
    goal = typeof floatingTimerGoal === "function" ? floatingTimerGoal() : null
  ) {
    const supportedMode = typeof floatingTimer === "object" && ["countdown", "free"].includes(floatingTimer?.mode);
    const messagesEnabled = typeof state !== "object" || state?.settings?.timerPreferences?.motivationalMessages !== false;
    const planned = goal && typeof timerPlannedSeconds === "function" ? timerPlannedSeconds(goal) : 0;
    if (!goal || !supportedMode || !planned || !messagesEnabled) return;

    const elapsed = typeof currentTimerSeconds === "function" ? currentTimerSeconds() : 0;
    const progress = Math.min(100, Math.max(0, elapsed / planned * 100));
    const milestones = typeof TIMER_MOTIVATIONAL_MILESTONES !== "undefined" && Array.isArray(TIMER_MOTIVATIONAL_MILESTONES)
      ? TIMER_MOTIVATIONAL_MILESTONES
      : [10, 25, 40, 50, 65, 75, 90, 100];

    floatingTimer.motivationV159 ||= {
      initialized: false,
      firstCueShown: false,
      lastShownAt: 0,
      lastPaused: Boolean(floatingTimer.paused)
    };
    const runtime = floatingTimer.motivationV159;
    const now = Date.now();
    const shown = Array.isArray(floatingTimer.displayedMotivationalMilestones)
      ? floatingTimer.displayedMotivationalMilestones
      : [];
    const reached = milestones.filter((milestone) => progress >= milestone);
    const pending = reached.filter((milestone) => !shown.includes(milestone));
    const justResumed = runtime.lastPaused === true && floatingTimer.paused === false;
    const active = !floatingTimer.paused && !floatingTimer.completed;
    const restoredSession = !runtime.initialized && progress >= 1;

    runtime.initialized = true;
    runtime.lastPaused = Boolean(floatingTimer.paused);

    if (pending.length) {
      const milestone = pending[pending.length - 1];
      floatingTimer.displayedMotivationalMilestones = [...new Set([...shown, ...reached])];
      presentMotivation(milestone, chooseMessageWithoutRepetition(milestone));
      runtime.firstCueShown = true;
      runtime.lastShownAt = now;
      runtime.lastMilestone = milestone;
      persistSessionSafely();
      return;
    }

    const firstCueDue = active && elapsed >= 30 && !runtime.firstCueShown;
    const resumeCueDue = justResumed && now - Number(runtime.lastShownAt || 0) > 5000;
    const fallbackDue = active && elapsed >= 30 && now - Number(runtime.lastShownAt || 0) >= FALLBACK_INTERVAL_MS;
    const restoredCueDue = restoredSession && now - Number(runtime.lastShownAt || 0) > 5000;
    if (!firstCueDue && !resumeCueDue && !fallbackDue && !restoredCueDue) {
      persistSessionSafely();
      return;
    }

    const nearestMilestone = reached[reached.length - 1] || 10;
    const label = resumeCueDue
      ? "FOCO RETOMADO"
      : restoredCueDue
        ? "SESSÃO EM ANDAMENTO"
        : firstCueDue
          ? "BOM COMEÇO"
          : "CONTINUE FIRME";
    presentMotivation(label, chooseMessageWithoutRepetition(nearestMilestone));
    runtime.firstCueShown = true;
    runtime.lastShownAt = now;
    runtime.lastMilestone = nearestMilestone;
    persistSessionSafely();
  };

  try {
    checkTimerMotivationalProgress = improvedProgressCheck;
  } catch (error) {
    globalThis.checkTimerMotivationalProgress = improvedProgressCheck;
  }

  setTimeout(() => {
    try {
      improvedProgressCheck();
    } catch (error) {
      console.warn("[Cronômetro] Verificação motivacional inicial não pôde ser executada.", error);
    }
  }, 600);

  globalThis.__aldusTimerMotivationV159Status = {
    version: PATCH_VERSION,
    applied: true,
    addedMessages: addedCount,
    repetitionControl: "shuffle-bag",
    inlineFallback: true
  };
})();
