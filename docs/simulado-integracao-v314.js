(() => {
  "use strict";

  const VERSION = "20260811-simulado-integracao-v314";
  const ADAPTER_NAME = "aldus-simulado-integracao-v314";

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
    groups.forEach((group) => { const current = disciplineGroups.get(group.discipline) || { discipline:group.discipline,total:0,correct:0,wrong:0,blank:0,net:0,notes:"Gerado automaticamente pelo cartão-resposta." }; current.total += group.total; current.correct += group.correct; current.wrong += group.wrong; current.blank += group.blank; current.net += group.score; disciplineGroups.set(group.discipline,current); });
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
    const notebook = sessionItems.filter((item) => item.status !== "certo" || item.revisar).map((item) => ({ question:bankQuestions.find((question) => question.id === item.id), mark:item.marcado === blankMark ? "" : item.marcado, reason:item.status === "errado" ? "erro" : item.status === "branco" ? "branco" : "duvida" }));
    return { sessionId, bankQuestions, session, questionLogs, mock, notebook, groups };
  }

  function hasIntegratedSession(targetState, sessionId) { return Boolean((targetState?.questionBankSessions || []).some((session) => session.id === sessionId)); }

  function integrateExam(exam) {
    if (typeof state === "undefined" || !state) throw new Error("O banco de dados do site ainda não está disponível.");
    const payload = buildIntegrationPayload(exam);
    if (hasIntegratedSession(state,payload.sessionId)) return { alreadyIntegrated:true, sessionId:payload.sessionId, message:"Este simulado já estava integrado; nenhum dado foi duplicado." };
    state.questionBank ||= [];
    state.questionBankSessions ||= [];
    state.questionLogs ||= [];
    state.simulados ||= [];
    state.questionErrorNotebook ||= [];
    const bankMap = new Map(state.questionBank.map((question) => [question.id,question]));
    let newQuestions = 0;
    payload.bankQuestions.forEach((question) => { if (!bankMap.has(question.id)) { bankMap.set(question.id,question); newQuestions += 1; } });
    state.questionBank = [...bankMap.values()];
    state.questionBankSessions.unshift(payload.session);
    const logIds = new Set(state.questionLogs.map((log) => log.id));
    state.questionLogs.push(...payload.questionLogs.filter((log) => !logIds.has(log.id)));
    if (!state.simulados.some((mock) => mock.id === payload.mock.id)) state.simulados.push(payload.mock);
    if (typeof registrarNoCadernoErros === "function") payload.notebook.forEach((entry) => registrarNoCadernoErros(entry.question,entry.mark,entry.reason));
    if (typeof saveData !== "function") throw new Error("O salvamento principal do site não está disponível.");
    saveData({ markLocalChange:true });
    if (typeof renderQuestionBank === "function") renderQuestionBank();
    if (typeof renderSimulados === "function") renderSimulados();
    if (typeof renderQuestionHistory === "function") renderQuestionHistory();
    if (typeof qbRenderErrorNotebook === "function") qbRenderErrorNotebook();
    return { alreadyIntegrated:false, sessionId:payload.sessionId, newQuestions, sessionsAdded:1, logsAdded:payload.questionLogs.length, notebookAdded:payload.notebook.length, message:`${newQuestions} questão(ões) e o resultado foram integrados ao site.` };
  }

  const api = Object.freeze({ version:VERSION, adapterName:ADAPTER_NAME, normalizeBoard, statusFor, scoreValue, groupPerformance, buildIntegrationPayload, hasIntegratedSession, integrateExam });
  globalThis.__ALDUS_SIMULADO_INTEGRACAO_V314__ = api;
  const core = globalThis.__ALDUS_SIMULADO_INTERATIVO_V313__;
  if (core?.registerIntegration) core.registerIntegration(ADAPTER_NAME, integrateExam);
})();
