(() => {
  "use strict";

  const VERSION = "20260812-simulado-integracao-v318-reparo";
  const ADAPTER_NAME = "aldus-simulado-integracao-v314";
  const INTERACTIVE_STORAGE_KEY = "aldusSimuladosInterativosV313";

  function text(value) { return String(value ?? "").trim(); }
  function canonical(value) { return text(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim(); }
  function normalizeBoard(value) { const board = text(value).toUpperCase(); if (board.includes("CEBRASPE") || board.includes("CESPE")) return "CEBRASPE"; if (board.includes("FGV")) return "FGV"; if (board.includes("AOCP")) return "AOCP"; return text(value) || "Não informada"; }
  function statusFor(question, mark, blankMark = "__blank__") { if (!mark || mark === blankMark) return "branco"; return mark === question.gabarito ? "certo" : "errado"; }
  function isMultipleChoice(question) { return Object.keys(question?.alternativas || {}).length >= 2 || canonical(question?.tipo).includes("multipla escolha"); }
  function scoreValue(board, question, status) { if (status === "certo") return 1; if (status === "errado" && normalizeBoard(question.banca || board) === "CEBRASPE" && !isMultipleChoice(question)) return -1; return 0; }
  function percent(value, total) { return total ? Number((Number(value || 0) / total * 100).toFixed(1)) : 0; }
  function localDate(iso) { const raw = text(iso); return raw ? raw.slice(0, 10) : new Date().toISOString().slice(0, 10); }

  function groupPerformance(exam, blankMark) {
    const groups = new Map();
    exam.questions.forEach((question) => {
      const key = [question.disciplina, question.assunto, question.banca || exam.board].join("|");
      const group = groups.get(key) || { discipline:question.disciplina, subject:question.assunto, board:question.banca || exam.board, total:0, correct:0, wrong:0, blank:0, score:0, questions:[] };
      const mark = exam.answers?.[question.id] || blankMark;
      const status = statusFor(question, mark, blankMark);
      group.total += 1;
      if (status === "certo") group.correct += 1;
      else if (status === "errado") group.wrong += 1;
      else group.blank += 1;
      group.score += scoreValue(exam.board, question, status);
      group.questions.push({ question, mark, status });
      groups.set(key, group);
    });
    return [...groups.values()];
  }

  function buildIntegrationPayload(exam, core = globalThis.__ALDUS_SIMULADO_INTERATIVO_V313__) {
    if (!exam?.id || !Array.isArray(exam.questions) || !exam.questions.length) throw new Error("Simulado concluído inválido para integração.");
    const blankMark = core?.blankMark || "__blank__";
    const summary = exam.summary || core?.scoreExam?.(exam);
    if (!summary) throw new Error("O resultado do simulado não pôde ser calculado.");
    const completedAt = exam.completedAt || new Date().toISOString();
    const sessionId = `simulado-interativo:${exam.id}`;
    const groups = groupPerformance(exam, blankMark);
    const bankQuestions = exam.questions.map((question) => ({
      id: question.id,
      disciplina: question.disciplina,
      assunto: question.assunto,
      tema: question.tema,
      banca: question.banca || exam.board,
      ano: question.ano || "",
      orgao: question.orgao || "",
      cargo: question.cargo || "Delegado de Polícia",
      prova: exam.name,
      referencia: question.referencia || question.sourceId || "",
      tipo: question.tipo,
      enunciado: question.enunciado,
      alternativas: question.alternativas || {},
      gabarito: question.gabarito,
      comentario: question.comentario || "",
      justificativa: question.justificativa || question.comentario || "",
      fundamento: question.fundamento || question.justificativa || "",
      observacoes: `Importada do simulado interativo ${exam.name}.`,
      tags: [...new Set([...(question.tags || []), "simulado interativo", normalizeBoard(exam.board)])],
      fonte: "Fábrica de Simulados do Aldus Meta"
    }));
    const sessionItems = exam.questions.map((question) => {
      const mark = exam.answers?.[question.id] || blankMark;
      return {
        id:question.id,
        syllabusItemId:question.syllabusItemId || "",
        disciplina:question.disciplina,
        assunto:question.assunto,
        tema:question.tema,
        banca:question.banca || exam.board,
        ano:question.ano || "",
        referencia:question.referencia || question.sourceId || "",
        tipo:question.tipo,
        marcado:mark,
        gabarito:question.gabarito,
        status:statusFor(question,mark,blankMark),
        justificativa:question.justificativa || question.comentario || "",
        comentario:question.comentario || "",
        fundamento:question.fundamento || question.justificativa || "",
        revisar:Boolean(exam.reviewFlags?.[question.id])
      };
    });
    const session = {
      id:sessionId,
      source:"simulado-interativo",
      examId:exam.id,
      examName:exam.name,
      startedAt:exam.startedAt || "",
      createdAt:completedAt,
      completedAt,
      hasAnyKey:true,
      hasCebraspeNet:sessionItems.some((item) => normalizeBoard(item.banca) === "CEBRASPE" && !isMultipleChoice(item)),
      summary:{ ...summary, doubt:Number(summary.review)||0 },
      items:sessionItems
    };
    const questionLogs = groups.map((group, index) => ({
      id:`${sessionId}:log:${index + 1}`,
      date:localDate(completedAt),
      discipline:group.discipline,
      subject:group.subject,
      syllabusItemId:"",
      board:group.board,
      minutes:0,
      total:group.total,
      correct:group.correct,
      wrong:group.wrong,
      blank:group.blank,
      accuracyRate:percent(group.correct,group.total),
      errorRate:percent(group.wrong,group.total),
      blankRate:percent(group.blank,group.total),
      cebraspeNet:group.score,
      notes:`Resultado integrado do simulado ${exam.name}.`,
      trainingType:"Simulado interativo",
      origin:"simulado_interativo",
      interactiveExamId:exam.id,
      createdAt:completedAt,
      updatedAt:completedAt
    }));
    const disciplineGroups = new Map();
    groups.forEach((group) => {
      const current = disciplineGroups.get(group.discipline) || { discipline:group.discipline,total:0,correct:0,wrong:0,blank:0,net:0,notes:"Gerado automaticamente pelo cartão-resposta." };
      current.total += group.total;
      current.correct += group.correct;
      current.wrong += group.wrong;
      current.blank += group.blank;
      current.net += group.score;
      disciplineGroups.set(group.discipline,current);
    });
    const disciplines = [...disciplineGroups.values()].map((group) => ({ ...group, accuracyPct:percent(group.correct,group.total), errorPct:percent(group.wrong,group.total), blankPct:percent(group.blank,group.total) }));
    const goal = Number(exam.goal) || Math.ceil(summary.total * 0.8);
    const mock = {
      id:`simulado-interativo:${exam.id}:resumo`,
      name:exam.name,
      date:localDate(completedAt),
      board:exam.board,
      institution:"Aldus Meta — Fábrica de Simulados",
      notes:"Resultado calculado pelo cartão-resposta interativo.",
      total:summary.total,
      correct:summary.correct,
      wrong:summary.wrong,
      blank:summary.blank,
      answered:summary.correct + summary.wrong,
      net:summary.score,
      score:summary.score,
      goal,
      accuracyAnswered:percent(summary.correct,summary.correct + summary.wrong),
      accuracyTotal:percent(summary.correct,summary.total),
      blankPct:percent(summary.blank,summary.total),
      goalDiff:summary.score - goal,
      strategy:`Revisar ${summary.wrong} erro(s), ${summary.blank} questão(ões) em branco e ${summary.review || 0} marcada(s) para revisão.`,
      difficulty:exam.difficulty || "Mista",
      disciplines,
      source:"simulado-interativo",
      interactiveExamId:exam.id,
      updatedAt:completedAt
    };
    const notebook = sessionItems
      .filter((item) => item.status !== "certo" || item.revisar)
      .map((item) => ({
        question:bankQuestions.find((question) => question.id === item.id),
        mark:item.marcado === blankMark ? "" : item.marcado,
        reason:item.status === "errado" ? "erro" : item.status === "branco" ? "branco" : "duvida"
      }));
    return { sessionId, bankQuestions, session, questionLogs, mock, notebook, groups };
  }

  function hasIntegratedSession(targetState, sessionId) {
    return Boolean((targetState?.questionBankSessions || []).some((session) => session.id === sessionId));
  }

  function ensureCollections(targetState) {
    targetState.questionBank ||= [];
    targetState.questionBankSessions ||= [];
    targetState.questionLogs ||= [];
    targetState.simulados ||= [];
    targetState.questionErrorNotebook ||= [];
  }

  function ensureBankQuestions(targetState, bankQuestions) {
    const bankMap = new Map((targetState.questionBank || []).map((question) => [question.id, question]));
    let added = 0;
    bankQuestions.forEach((question) => {
      if (!bankMap.has(question.id)) {
        bankMap.set(question.id, question);
        added += 1;
      }
    });
    if (added) targetState.questionBank = [...bankMap.values()];
    return added;
  }

  function renderAfterIntegration({ full = false } = {}) {
    if (typeof renderQuestionBank === "function") renderQuestionBank();
    if (!full) return;
    if (typeof renderSimulados === "function") renderSimulados();
    if (typeof renderQuestionHistory === "function") renderQuestionHistory();
    if (typeof qbRenderErrorNotebook === "function") qbRenderErrorNotebook();
  }

  function persistRepair() {
    if (typeof saveData !== "function") throw new Error("O salvamento principal do site não está disponível.");
    saveData({ markLocalChange:true });
  }

  function integrateExam(exam) {
    if (typeof state === "undefined" || !state) throw new Error("O banco de dados do site ainda não está disponível.");
    const payload = buildIntegrationPayload(exam);
    ensureCollections(state);

    const sessionAlreadyIntegrated = hasIntegratedSession(state, payload.sessionId);
    const repairedQuestions = ensureBankQuestions(state, payload.bankQuestions);

    if (sessionAlreadyIntegrated) {
      if (repairedQuestions > 0) {
        persistRepair();
        renderAfterIntegration();
        return {
          alreadyIntegrated:true,
          repaired:true,
          sessionId:payload.sessionId,
          newQuestions:repairedQuestions,
          sessionsAdded:0,
          logsAdded:0,
          notebookAdded:0,
          message:`Integração reparada: ${repairedQuestions} questão(ões) ausente(s) foram restauradas no Banco de Questões sem duplicar o resultado.`
        };
      }
      return {
        alreadyIntegrated:true,
        repaired:false,
        sessionId:payload.sessionId,
        newQuestions:0,
        sessionsAdded:0,
        logsAdded:0,
        notebookAdded:0,
        message:"Este simulado já estava integralmente integrado; nenhum dado foi duplicado."
      };
    }

    state.questionBankSessions.unshift(payload.session);
    const logIds = new Set(state.questionLogs.map((log) => log.id));
    const logsToAdd = payload.questionLogs.filter((log) => !logIds.has(log.id));
    state.questionLogs.push(...logsToAdd);
    const mockAdded = !state.simulados.some((mock) => mock.id === payload.mock.id);
    if (mockAdded) state.simulados.push(payload.mock);
    if (typeof registrarNoCadernoErros === "function") {
      payload.notebook.forEach((entry) => registrarNoCadernoErros(entry.question, entry.mark, entry.reason));
    }

    persistRepair();
    renderAfterIntegration({ full:true });

    return {
      alreadyIntegrated:false,
      repaired:false,
      sessionId:payload.sessionId,
      newQuestions:repairedQuestions,
      sessionsAdded:1,
      logsAdded:logsToAdd.length,
      notebookAdded:payload.notebook.length,
      message:`${repairedQuestions} questão(ões) e o resultado foram integrados ao site.`
    };
  }

  function readStoredCompletedExams() {
    if (typeof localStorage === "undefined") return [];
    try {
      const parsed = JSON.parse(localStorage.getItem(INTERACTIVE_STORAGE_KEY) || "null");
      if (!parsed || !Array.isArray(parsed.exams)) return [];
      return parsed.exams.filter((exam) => exam?.status === "completed" && Array.isArray(exam.questions) && exam.questions.length);
    } catch (error) {
      console.warn(`[${VERSION}] Não foi possível ler os simulados locais para verificação de integridade.`, error);
      return [];
    }
  }

  function repairStoredExams() {
    if (typeof state === "undefined" || !state || typeof saveData !== "function") {
      return { available:false, checked:0, repairedExams:0, repairedQuestions:0, errors:0 };
    }
    const exams = readStoredCompletedExams();
    let repairedExams = 0;
    let repairedQuestions = 0;
    let errors = 0;
    exams.forEach((exam) => {
      try {
        const result = integrateExam(exam);
        if (result?.repaired || (!result?.alreadyIntegrated && Number(result?.newQuestions) > 0)) {
          repairedExams += 1;
          repairedQuestions += Number(result.newQuestions) || 0;
        }
      } catch (error) {
        errors += 1;
        console.warn(`[${VERSION}] Falha ao verificar o simulado ${exam?.id || "sem-id"}.`, error);
      }
    });
    const report = { available:true, checked:exams.length, repairedExams, repairedQuestions, errors };
    if (repairedQuestions > 0) console.info(`[${VERSION}] Reparo automático concluído.`, report);
    return report;
  }

  function scheduleStoredRepair() {
    if (typeof setTimeout !== "function") return;
    const delays = [0, 600, 1800, 4000];
    delays.forEach((delay) => {
      setTimeout(() => {
        try { repairStoredExams(); }
        catch (error) { console.warn(`[${VERSION}] Verificação automática adiada.`, error); }
      }, delay);
    });
  }

  const api = Object.freeze({
    version:VERSION,
    adapterName:ADAPTER_NAME,
    normalizeBoard,
    statusFor,
    scoreValue,
    groupPerformance,
    buildIntegrationPayload,
    hasIntegratedSession,
    ensureBankQuestions,
    integrateExam,
    repairStoredExams
  });
  globalThis.__ALDUS_SIMULADO_INTEGRACAO_V314__ = api;

  const core = globalThis.__ALDUS_SIMULADO_INTERATIVO_V313__;
  if (core?.registerIntegration) core.registerIntegration(ADAPTER_NAME, integrateExam);
  scheduleStoredRepair();
})();