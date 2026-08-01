(() => {
  "use strict";

  const VERSION = "20260731-variedade-mensagens-cronometro-v211";
  const FIVE_MINUTE_HISTORY_KEY = "metasEstudoTimerFiveMinuteHistoryV211";

  const FIVE_MINUTE_MESSAGES_V211 = Object.freeze([
  "Faltam 5 minutos. Feche este bloco com atenção.",
  "Últimos 5 minutos. Mantenha o foco até o final.",
  "Restam 5 minutos. Conclua o ponto atual com calma.",
  "Mais 5 minutos. Preserve a qualidade do estudo.",
  "Faltam 5 minutos. Evite distrações nesta reta final.",
  "Cinco minutos finais. Termine com firmeza.",
  "Restam 5 minutos. Consolide o que acabou de estudar.",
  "Últimos 5 minutos. Continue presente.",
  "Faltam 5 minutos. Finalize sem acelerar demais.",
  "Mais 5 minutos de concentração total.",
  "Restam 5 minutos. Feche a sessão do jeito certo.",
  "Últimos 5 minutos. Não abandone o ritmo agora.",
  "Faltam 5 minutos. Use-os para concluir bem.",
  "Cinco minutos para transformar esforço em etapa concluída.",
  "Restam 5 minutos. Faça uma última revisão mental.",
  "Últimos 5 minutos. Termine o raciocínio antes de parar.",
  "Faltam 5 minutos. Mantenha precisão até o fim.",
  "Mais 5 minutos. A conclusão já está próxima.",
  "Restam 5 minutos. Proteja este trecho final.",
  "Últimos 5 minutos. Continue com a mesma disciplina.",
  "Faltam 5 minutos. Complete o bloco planejado.",
  "Cinco minutos finais. Atenção ao conteúdo, não ao relógio.",
  "Restam 5 minutos. Finalize com tranquilidade.",
  "Últimos 5 minutos. Feche esta meta com qualidade."
]);

  const EXTRA_MOTIVATIONAL_MESSAGES_V211 = Object.freeze({
  "10": [
    "Presença agora. Resultado depois.",
    "Uma sessão consistente vale mais que uma intenção perfeita.",
    "Concentre-se apenas no próximo trecho.",
    "Seu plano começou a virar execução.",
    "Cada minuto focado reduz a distância até a aprovação.",
    "Você entrou no ritmo. Proteja esse começo.",
    "Faça deste bloco uma prova da sua disciplina.",
    "O movimento já começou; mantenha a direção.",
    "Hoje o avanço depende somente deste momento.",
    "Continue simples: leia, compreenda e prossiga."
  ],
  "25": [
    "O foco está firme. Continue sem acelerar demais.",
    "Você já construiu uma boa base nesta sessão.",
    "Mais um trecho concluído com atenção.",
    "A constância está fazendo o trabalho pesado.",
    "Seu progresso não precisa de pressa, precisa de continuidade.",
    "Você está cumprindo o que planejou.",
    "Mantenha a qualidade do estudo até o fim.",
    "Um bloco de cada vez transforma o edital.",
    "Seu esforço já deixou de ser apenas intenção.",
    "Continue neste ritmo estável e consciente."
  ],
  "40": [
    "Você se aproximou da metade com consistência.",
    "O conteúdo está avançando porque você permaneceu.",
    "Não interrompa o fluxo que já conquistou.",
    "Seu desempenho cresce quando o foco se mantém.",
    "Você já superou a fase de adaptação desta sessão.",
    "Continue aprofundando, sem olhar para o relógio.",
    "O trabalho silencioso está acumulando resultado.",
    "Cada página compreendida fortalece sua preparação.",
    "Seu ritmo está sólido; preserve-o.",
    "A metade está próxima e o foco continua inteiro."
  ],
  "50": [
    "Metade concluída com trabalho real.",
    "Recomece mentalmente a segunda metade com calma.",
    "Você já entregou cinquenta por cento do combinado.",
    "Agora use o embalo para concluir bem.",
    "Metade da sessão virou conhecimento acumulado.",
    "Seu compromisso já venceu metade do percurso.",
    "Respire e mantenha a mesma qualidade.",
    "A segunda metade começa com vantagem: você já está no ritmo.",
    "Continue com atenção, não apenas com velocidade.",
    "Você chegou ao meio porque permaneceu."
  ],
  "65": [
    "A maior parte já foi construída.",
    "Seu foco está vencendo a vontade de interromper.",
    "Agora cada minuto aproxima rapidamente a conclusão.",
    "Continue estável; não há necessidade de apressar.",
    "O trecho final começa a ficar visível.",
    "Você sustentou o esforço até aqui. Preserve-o.",
    "A sessão está madura; finalize com qualidade.",
    "Seu trabalho já ultrapassou dois terços do caminho.",
    "Não negocie com a distração nesta etapa.",
    "O resultado deste bloco está perto de se completar."
  ],
  "75": [
    "Você entrou no último quarto da sessão.",
    "Agora é concluir com a atenção que trouxe até aqui.",
    "Pouco resta diante do que você já realizou.",
    "O fim está próximo; mantenha o método.",
    "Seu esforço já domina esta sessão.",
    "Último quarto: firmeza, clareza e continuidade.",
    "Não antecipe o descanso. Termine o bloco.",
    "Você já acumulou três partes de quatro.",
    "Conserve a qualidade até o último minuto.",
    "A conclusão depende apenas de mais um trecho consistente."
  ],
  "90": [
    "Reta final: finalize sem perder precisão.",
    "Os últimos minutos merecem o mesmo foco dos primeiros.",
    "Conclua o ponto atual com atenção total.",
    "Você está a poucos passos de fechar esta sessão.",
    "Não abandone a qualidade perto da chegada.",
    "Agora é transformar quase concluído em concluído.",
    "Use os minutos finais para consolidar o conteúdo.",
    "Seu compromisso está prestes a ser cumprido.",
    "Termine com calma, firmeza e clareza.",
    "A sessão já está conquistada; falta apenas fechar bem."
  ],
  "100": [
    "Bloco concluído. Registre e reconheça o avanço.",
    "Você cumpriu o tempo planejado com consistência.",
    "Mais conhecimento acumulado para a sua preparação.",
    "Sessão encerrada com compromisso cumprido.",
    "O planejamento ganhou mais uma entrega real.",
    "Você transformou tempo em preparação.",
    "Meta de tempo alcançada. Bom trabalho.",
    "Mais um bloco completo entrou no seu histórico.",
    "Concluído com disciplina do início ao fim.",
    "Seu avanço de hoje já está registrado na prática."
  ]
});

  function uniqueMessagesV211(messages) {
    return [...new Set((Array.isArray(messages) ? messages : []).map((message) => String(message || "").trim()).filter(Boolean))];
  }

  function randomMessageIndexV211(length) {
    if (!Number.isInteger(length) || length <= 1) return 0;
    try {
      if (globalThis.crypto?.getRandomValues) {
        const values = new Uint32Array(1);
        globalThis.crypto.getRandomValues(values);
        return values[0] % length;
      }
    } catch {}
    return Math.floor(Math.random() * length);
  }

  function chooseWithoutRepeatV211(messages, history = []) {
    const source = uniqueMessagesV211(messages);
    if (!source.length) return { phrase: "", history: [] };

    const validHistory = (Array.isArray(history) ? history : []).filter((phrase) => source.includes(phrase));
    const used = new Set(validHistory);
    const lastPhrase = validHistory.at(-1) || "";
    let available = source.filter((phrase) => !used.has(phrase));
    let cycleRestarted = false;

    if (!available.length) {
      cycleRestarted = true;
      available = source.filter((phrase) => phrase !== lastPhrase);
      if (!available.length) available = source;
    }

    const phrase = available[randomMessageIndexV211(available.length)] || available[0] || "";
    return {
      phrase,
      history: cycleRestarted ? [phrase] : [...validHistory, phrase]
    };
  }

  function expandMotivationalMessagesV211() {
    Object.entries(EXTRA_MOTIVATIONAL_MESSAGES_V211).forEach(([milestone, additions]) => {
      const current = Array.isArray(TIMER_MOTIVATIONAL_MESSAGES?.[milestone])
        ? TIMER_MOTIVATIONAL_MESSAGES[milestone]
        : [];
      TIMER_MOTIVATIONAL_MESSAGES[milestone] = uniqueMessagesV211([...current, ...additions]);
    });
  }

  function chooseMotivationalMessageV211(milestone) {
    const messages = Array.isArray(TIMER_MOTIVATIONAL_MESSAGES?.[milestone])
      ? TIMER_MOTIVATIONAL_MESSAGES[milestone]
      : [];
    if (!messages.length) return "";

    const history = readTimerMotivationalHistory();
    const result = chooseWithoutRepeatV211(messages, history[milestone]);
    history[milestone] = result.history;
    writeTimerMotivationalHistory(history);
    return result.phrase;
  }

  function readFiveMinuteHistoryV211() {
    try {
      const parsed = JSON.parse(localStorage.getItem(FIVE_MINUTE_HISTORY_KEY) || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function writeFiveMinuteHistoryV211(history) {
    try {
      localStorage.setItem(FIVE_MINUTE_HISTORY_KEY, JSON.stringify(Array.isArray(history) ? history : []));
    } catch (error) {
      console.warn("Falha ao salvar o histórico dos avisos de 5 minutos", error);
    }
  }

  function chooseFiveMinuteMessageV211() {
    const result = chooseWithoutRepeatV211(FIVE_MINUTE_MESSAGES_V211, readFiveMinuteHistoryV211());
    writeFiveMinuteHistoryV211(result.history);
    return result.phrase;
  }

  expandMotivationalMessagesV211();

  const originalChooseTimerMotivationalMessageV211 = chooseTimerMotivationalMessage;
  chooseTimerMotivationalMessage = function chooseTimerMotivationalMessageWithoutRepeatsV211(milestone) {
    return chooseMotivationalMessageV211(milestone) || originalChooseTimerMotivationalMessageV211(milestone);
  };

  const originalTriggerTimerAlertV211 = triggerTimerAlert;
  triggerTimerAlert = async function triggerTimerAlertWithVarietyV211(type, goal = floatingTimerGoal()) {
    if (type === "five-minutes") {
      floatingTimer.fiveMinuteMessageV211 = chooseFiveMinuteMessageV211();
    }
    return originalTriggerTimerAlertV211(type, goal);
  };

  const originalTimerAlertMessageV211 = timerAlertMessage;
  timerAlertMessage = function timerAlertMessageWithVarietyV211(goal = floatingTimerGoal()) {
    const originalMessage = originalTimerAlertMessageV211(goal);
    if (originalMessage !== "⏳ Faltam 5 minutos") return originalMessage;
    if (!floatingTimer.fiveMinuteMessageV211) {
      floatingTimer.fiveMinuteMessageV211 = chooseFiveMinuteMessageV211();
    }
    return `⏳ ${floatingTimer.fiveMinuteMessageV211}`;
  };

  const originalTimerAlertTitleV211 = timerAlertTitle;
  timerAlertTitle = function timerAlertTitleWithVarietyV211(type) {
    if (type !== "five-minutes") return originalTimerAlertTitleV211(type);
    if (!floatingTimer.fiveMinuteMessageV211) {
      floatingTimer.fiveMinuteMessageV211 = chooseFiveMinuteMessageV211();
    }
    return floatingTimer.fiveMinuteMessageV211;
  };

  globalThis.AldusTimerMessageVarietyV211 = Object.freeze({
    version: VERSION,
    fiveMinuteMessages: FIVE_MINUTE_MESSAGES_V211,
    extraMotivationalMessages: EXTRA_MOTIVATIONAL_MESSAGES_V211,
    chooseWithoutRepeat: chooseWithoutRepeatV211,
    chooseFiveMinuteMessage: chooseFiveMinuteMessageV211,
    chooseMotivationalMessage: chooseMotivationalMessageV211
  });
})();
