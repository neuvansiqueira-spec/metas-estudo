(() => {
  "use strict";

  const VERSION = "20260811-simulado-interativo-v313";
  const STORAGE_KEY = "aldusSimuladosInterativosV313";
  const SUPPORTED_SCHEMA = "metas-estudo-question-bank-v1";
  const BLANK_MARK = "__blank__";
  const MAX_QUESTIONS = 200;
  const MAX_JSON_BYTES = 5 * 1024 * 1024;
  const integrations = new Map();
  let store = { version: 1, exams: [] };
  let importDraft = null;
  let activeExamId = "";
  let timerHandle = null;
  let timerStartedAt = 0;

  function text(value) { return String(value ?? "").trim(); }
  function canonical(value) { return text(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim(); }
  function escapeHtml(value) { return text(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;"); }
  function createId(prefix = "simulado") { return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`; }
  function hashText(value) { let hash = 2166136261; for (const char of text(value)) { hash ^= char.charCodeAt(0); hash = Math.imul(hash, 16777619); } return (hash >>> 0).toString(36); }
  function formatTime(seconds) { const total = Math.max(0, Math.floor(Number(seconds) || 0)); const h = Math.floor(total / 3600); const m = Math.floor(total % 3600 / 60); const s = total % 60; return h ? `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}` : `${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`; }
  function normalizeBoard(value) { const board = text(value).toUpperCase(); if (board.includes("CEBRASPE") || board.includes("CESPE")) return "CEBRASPE"; if (board.includes("FGV")) return "FGV"; if (board.includes("AOCP")) return "AOCP"; return text(value) || "Não informada"; }
  function normalizeAnswer(value) { if (value === true) return "C"; if (value === false) return "E"; const answer = canonical(value).replace(/[^a-z]/g, ""); if (["c","certo","correto","verdadeiro","v"].includes(answer)) return "C"; if (["e","errado","incorreto","falso","f"].includes(answer)) return "E"; if (/^[abcde]$/.test(answer)) return answer.toUpperCase(); return ""; }
  function normalizeAlternatives(raw) { const source = raw?.alternativas ?? raw?.alternatives ?? raw?.options ?? {}; if (Array.isArray(source)) return source.reduce((result, item, index) => { const key = text(item?.letra || item?.key || item?.id || String.fromCharCode(65 + index)).toUpperCase(); const value = text(item?.texto ?? item?.text ?? item); if (/^[A-E]$/.test(key) && value) result[key] = value; return result; }, {}); if (!source || typeof source !== "object") return {}; return Object.entries(source).reduce((result, [key, value]) => { const normalizedKey = text(key).toUpperCase(); const normalizedValue = text(value?.texto ?? value?.text ?? value); if (/^[A-E]$/.test(normalizedKey) && normalizedValue) result[normalizedKey] = normalizedValue; return result; }, {}); }
  function isMultipleChoice(question) { return Object.keys(question?.alternativas || {}).length >= 2 || canonical(question?.tipo).includes("multipla escolha"); }
  function choiceKeys(question) { return isMultipleChoice(question) ? Object.keys(question.alternativas || {}).filter((key) => /^[A-E]$/.test(key)).sort() : ["C", "E"]; }
  function explanation(raw) { return text(raw.justificativa ?? raw.comentario ?? raw.comentário ?? raw.explanation ?? raw.observacoes ?? raw.notes); }
  function legalBasis(raw) { return text(raw.fundamento ?? raw.fundamentoLegal ?? raw.legalBasis ?? raw.justificativa); }

  function normalizeQuestion(raw, index, metadata = {}) {
    const alternativas = normalizeAlternatives(raw);
    const board = normalizeBoard(raw.banca || raw.board || metadata.banca || metadata.board);
    return {
      sourceId: text(raw.id || raw.codigo || raw.referencia || `questao-${index + 1}`),
      disciplina: text(raw.disciplina || raw.discipline) || "Sem disciplina",
      assunto: text(raw.assunto || raw.subject || raw.topico || raw.topic) || "Sem assunto",
      tema: text(raw.tema || raw.theme || raw.subassunto || raw.subtopic) || "Geral",
      banca: board,
      tipo: text(raw.tipo || raw.type) || (Object.keys(alternativas).length ? "Múltipla escolha" : "Certo/Errado"),
      enunciado: text(raw.enunciado || raw.statement || raw.texto || raw.question),
      alternativas,
      gabarito: normalizeAnswer(raw.gabarito ?? raw.resposta ?? raw.answer ?? raw.correctAnswer),
      comentario: text(raw.comentario ?? raw.comentário ?? raw.comment),
      justificativa: explanation(raw),
      fundamento: legalBasis(raw),
      tags: Array.isArray(raw.tags) ? raw.tags.map(text).filter(Boolean) : [],
      referencia: text(raw.referencia || raw.reference || raw.codigo),
      ano: text(raw.ano || raw.year),
      cargo: text(raw.cargo || raw.role),
      orgao: text(raw.orgao || raw.agency)
    };
  }

  function sourceQuestions(payload) { return Array.isArray(payload) ? payload : payload?.questionBank || payload?.questoes || payload?.questions || payload?.items || []; }

  function parsePayload(payload) {
    if (!payload || typeof payload !== "object") throw new Error("O conteúdo precisa ser um JSON válido de simulado.");
    const rawQuestions = sourceQuestions(payload);
    if (!Array.isArray(rawQuestions) || !rawQuestions.length) throw new Error("Nenhuma questão foi encontrada no JSON.");
    if (rawQuestions.length > MAX_QUESTIONS) throw new Error(`O limite é de ${MAX_QUESTIONS} questões por simulado.`);
    const metadata = payload.metadata || payload.metadados || {};
    const questions = rawQuestions.map((raw, index) => normalizeQuestion(raw || {}, index, metadata));
    const errors = [];
    const warnings = [];
    const sourceIds = new Set();
    questions.forEach((question, index) => {
      const label = `Questão ${index + 1}`;
      if (!question.enunciado) errors.push(`${label}: enunciado ausente.`);
      if (sourceIds.has(question.sourceId)) errors.push(`${label}: identificador duplicado (${question.sourceId}).`);
      sourceIds.add(question.sourceId);
      const keys = choiceKeys(question);
      if (!question.gabarito || !keys.includes(question.gabarito)) errors.push(`${label}: gabarito inválido ou incompatível com as opções.`);
      if (isMultipleChoice(question) && ["FGV","AOCP"].includes(question.banca) && keys.length !== 5) errors.push(`${label}: ${question.banca} exige cinco alternativas de A a E.`);
      if (!question.justificativa && !question.comentario) warnings.push(`${label}: sem justificativa ou comentário.`);
      if (!question.fundamento) warnings.push(`${label}: sem fundamento específico.`);
    });
    const declaredAmount = Number(metadata.quantidade || metadata.total || 0);
    if (declaredAmount && declaredAmount !== questions.length) warnings.push(`A quantidade declarada (${declaredAmount}) difere das ${questions.length} questões encontradas.`);
    const schema = text(payload.schema);
    if (schema && schema !== SUPPORTED_SCHEMA) warnings.push(`Schema informado: ${schema}. O formato será convertido para ${SUPPORTED_SCHEMA}.`);
    if (errors.length) { const error = new Error(`O simulado possui ${errors.length} erro(s) que impedem a importação.`); error.issues = errors; error.warnings = warnings; throw error; }
    const fingerprintSource = JSON.stringify(questions.map((question) => ({ disciplina: question.disciplina, tema: question.tema, enunciado: question.enunciado, alternativas: question.alternativas, gabarito: question.gabarito })));
    const fingerprint = hashText(fingerprintSource);
    const id = `simulado-${fingerprint}`;
    const board = normalizeBoard(metadata.banca || metadata.board || questions[0]?.banca);
    const normalizedQuestions = questions.map((question, index) => ({ ...question, id: `${id}-q${String(index + 1).padStart(3, "0")}` }));
    return {
      exam: {
        id,
        fingerprint,
        schema: SUPPORTED_SCHEMA,
        name: text(metadata.titulo || metadata.title || payload.titulo || payload.title) || `Simulado ${board}`,
        board,
        difficulty: text(metadata.dificuldade || metadata.difficulty) || "Mista",
        scoringRule: text(metadata.regra_pontuacao || metadata.scoringRule),
        importedAt: new Date().toISOString(),
        status: "draft",
        questions: normalizedQuestions,
        answers: {},
        reviewFlags: {},
        currentIndex: 0,
        elapsedSeconds: 0,
        startedAt: "",
        completedAt: "",
        summary: null,
        integratedAt: "",
        integrationReport: null
      },
      warnings
    };
  }

  function questionStatus(question, mark) { if (!mark || mark === BLANK_MARK) return "branco"; return mark === question.gabarito ? "certo" : "errado"; }

  function scoreExam(exam) {
    const summary = { total: exam.questions.length, correct: 0, wrong: 0, blank: 0, review: 0, ceCorrect: 0, ceWrong: 0, score: 0, net: 0, accuracyPct: 0, elapsedSeconds: Math.max(0, Number(exam.elapsedSeconds) || 0) };
    exam.questions.forEach((question) => {
      const mark = exam.answers?.[question.id] || "";
      const status = questionStatus(question, mark);
      if (status === "certo") summary.correct += 1;
      else if (status === "errado") summary.wrong += 1;
      else summary.blank += 1;
      if (exam.reviewFlags?.[question.id]) summary.review += 1;
      const cebraspe = normalizeBoard(question.banca || exam.board) === "CEBRASPE" && !isMultipleChoice(question);
      if (cebraspe && status === "certo") summary.ceCorrect += 1;
      if (cebraspe && status === "errado") summary.ceWrong += 1;
    });
    summary.score = summary.correct - summary.ceWrong;
    summary.net = summary.score;
    summary.accuracyPct = summary.total ? Number((summary.correct / summary.total * 100).toFixed(1)) : 0;
    return summary;
  }

  function readStore() {
    try { const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null"); if (parsed && Array.isArray(parsed.exams)) return { version: 1, exams: parsed.exams }; } catch (_error) {}
    return { version: 1, exams: [] };
  }
  function saveStore() { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(store)); return true; } catch (error) { console.error(`[${VERSION}] Falha ao salvar simulados interativos.`, error); return false; } }
  function examById(id) { return store.exams.find((exam) => exam.id === id); }
  function checkpointTimer(exam, keepRunning = true) { if (!exam || !timerStartedAt) return; exam.elapsedSeconds = Math.max(0, Number(exam.elapsedSeconds) || 0) + Math.max(0, Math.floor((Date.now() - timerStartedAt) / 1000)); timerStartedAt = keepRunning ? Date.now() : 0; saveStore(); }
  function stopTimer(exam) { checkpointTimer(exam, false); if (timerHandle) clearInterval(timerHandle); timerHandle = null; }
  function startTimer(exam) { if (timerHandle) clearInterval(timerHandle); timerStartedAt = Date.now(); timerHandle = setInterval(() => { const node = document.querySelector("[data-interactive-timer]"); if (node) node.textContent = formatTime((exam.elapsedSeconds || 0) + Math.floor((Date.now() - timerStartedAt) / 1000)); }, 1000); }

  function rootNode() { return document.getElementById("aldusInteractiveExamV313"); }
  function statusClass(exam, question, index) { const mark = exam.answers?.[question.id]; return [index === exam.currentIndex ? "current" : "", mark === BLANK_MARK ? "blank" : mark ? "answered" : "unanswered", exam.reviewFlags?.[question.id] ? "review" : ""].filter(Boolean).join(" "); }
  function markedLabel(mark) { return !mark || mark === BLANK_MARK ? "Em branco" : mark; }
  function resultLabel(status) { return ({ certo: "Acerto", errado: "Erro", branco: "Em branco" }[status] || status); }

  function importPanelHtml() {
    const preview = importDraft ? `<div class="interactive-import-preview"><div class="interactive-summary-grid"><article><span>Questões</span><strong>${importDraft.exam.questions.length}</strong></article><article><span>Banca</span><strong>${escapeHtml(importDraft.exam.board)}</strong></article><article><span>Disciplinas</span><strong>${new Set(importDraft.exam.questions.map((question) => question.disciplina)).size}</strong></article><article><span>Avisos</span><strong>${importDraft.warnings.length}</strong></article></div>${importDraft.warnings.length ? `<details><summary>Ver ${importDraft.warnings.length} aviso(s)</summary><ul>${importDraft.warnings.slice(0, 30).map((warning) => `<li>${escapeHtml(warning)}</li>`).join("")}</ul></details>` : '<p class="notice">Estrutura validada sem avisos.</p>'}<div class="interactive-preview-list">${importDraft.exam.questions.slice(0, 5).map((question, index) => `<article><strong>${index + 1}. ${escapeHtml(question.disciplina)} — ${escapeHtml(question.tema)}</strong><p>${escapeHtml(question.enunciado)}</p><small>Gabarito: ${escapeHtml(question.gabarito)} • ${question.justificativa || question.comentario ? "Com explicação" : "Sem explicação"}</small></article>`).join("")}</div><div class="actions"><button type="button" data-interactive-import-confirm>Importar como simulado</button><button type="button" class="secondary-button" data-interactive-import-cancel>Cancelar prévia</button></div></div>` : '<p class="item-meta" data-interactive-import-message>Selecione o arquivo JSON gerado ou cole o conteúdo para revisar antes de importar.</p>';
    return `<details class="interactive-import" ${store.exams.length ? "" : "open"}><summary><span><strong>Importar simulado gerado</strong><small>Validação e revisão antes de entrar no site</small></span></summary><div class="interactive-import-content"><label>Arquivo JSON<input type="file" accept="application/json,.json" data-interactive-file /></label><label>Ou cole o JSON<textarea rows="7" data-interactive-json placeholder="Cole aqui o JSON completo do simulado"></textarea></label><div class="actions"><button type="button" data-interactive-analyze>Analisar JSON</button></div>${preview}</div></details>`;
  }

  function libraryHtml() {
    if (!store.exams.length) return '<div class="interactive-empty">Nenhum simulado interativo importado.</div>';
    return `<div class="interactive-library">${[...store.exams].sort((a,b) => text(b.importedAt).localeCompare(text(a.importedAt))).map((exam) => { const answered = Object.keys(exam.answers || {}).length; const completed = exam.status === "completed"; return `<article><header><div><strong>${escapeHtml(exam.name)}</strong><small>${escapeHtml(exam.board)} • ${exam.questions.length} questões</small></div><span class="badge ${completed ? "success" : exam.status === "in_progress" ? "warn" : "neutral"}">${completed ? "Concluído" : exam.status === "in_progress" ? "Em andamento" : "Não iniciado"}</span></header><p class="item-meta">${completed ? `${exam.summary?.correct || 0} acertos • ${exam.summary?.wrong || 0} erros • ${exam.summary?.blank || 0} brancos • pontuação ${exam.summary?.score ?? 0}` : `${answered}/${exam.questions.length} marcações salvas`}</p><div class="actions"><button type="button" data-interactive-open="${escapeHtml(exam.id)}">${completed ? "Ver resultado" : exam.status === "in_progress" ? "Continuar" : "Iniciar"}</button>${completed && !exam.integratedAt ? `<button type="button" class="secondary-button" data-interactive-integrate="${escapeHtml(exam.id)}">Integrar ao site</button>` : ""}<button type="button" class="danger" data-interactive-delete="${escapeHtml(exam.id)}">Excluir</button></div></article>`; }).join("")}</div>`;
  }

  function examHtml(exam) {
    const question = exam.questions[exam.currentIndex];
    const mark = exam.answers?.[question.id] || "";
    const choices = choiceKeys(question).map((key) => `<button type="button" class="interactive-choice ${mark === key ? "selected" : ""}" data-interactive-answer="${key}"><span>${key}</span><strong>${escapeHtml(isMultipleChoice(question) ? question.alternativas[key] : ({ C:"Certo", E:"Errado" }[key] || key))}</strong></button>`).join("");
    const card = exam.questions.map((item, index) => `<button type="button" class="${statusClass(exam,item,index)}" data-interactive-index="${index}" aria-label="Ir para a questão ${index + 1}">${index + 1}</button>`).join("");
    return `<section class="interactive-run"><header class="interactive-run-header"><div><p class="eyebrow">Simulado em andamento</p><h3>${escapeHtml(exam.name)}</h3><p class="item-meta">${escapeHtml(exam.board)} • ${exam.questions.length} questões • tempo <strong data-interactive-timer>${formatTime(exam.elapsedSeconds)}</strong></p></div><button type="button" class="secondary-button" data-interactive-exit>Salvar e sair</button></header><div class="interactive-answer-card" aria-label="Cartão-resposta"><strong>Cartão-resposta</strong><div>${card}</div><p><span class="legend answered"></span> Respondida <span class="legend blank"></span> Branco <span class="legend review"></span> Revisar</p></div><article class="interactive-question"><div class="item-meta">Questão ${exam.currentIndex + 1} de ${exam.questions.length} • ${escapeHtml(question.disciplina)} • ${escapeHtml(question.tema)}</div><p class="interactive-statement">${escapeHtml(question.enunciado)}</p><div class="interactive-choices">${choices}</div><div class="actions"><button type="button" class="secondary-button ${mark === BLANK_MARK ? "selected" : ""}" data-interactive-answer="${BLANK_MARK}">Deixar em branco</button><button type="button" class="secondary-button ${exam.reviewFlags?.[question.id] ? "selected" : ""}" data-interactive-review>Marcar para revisar</button></div></article><footer class="interactive-run-footer"><button type="button" class="secondary-button" data-interactive-nav="prev" ${exam.currentIndex === 0 ? "disabled" : ""}>Anterior</button><button type="button" class="secondary-button" data-interactive-nav="next" ${exam.currentIndex >= exam.questions.length - 1 ? "disabled" : ""}>Próxima</button><button type="button" data-interactive-finish>Finalizar simulado</button></footer></section>`;
  }

  function resultHtml(exam) {
    const summary = exam.summary || scoreExam(exam);
    return `<section class="interactive-result"><header><div><p class="eyebrow">Resultado do simulado</p><h3>${escapeHtml(exam.name)}</h3></div><span class="badge ${exam.integratedAt ? "success" : "warn"}">${exam.integratedAt ? "Integrado ao site" : "Aguardando integração"}</span></header><div class="interactive-summary-grid"><article><span>Acertos</span><strong>${summary.correct}</strong></article><article><span>Erros</span><strong>${summary.wrong}</strong></article><article><span>Brancos</span><strong>${summary.blank}</strong></article><article><span>% de acerto</span><strong>${summary.accuracyPct}%</strong></article><article><span>Pontuação</span><strong>${summary.score}</strong></article><article><span>Tempo</span><strong>${formatTime(summary.elapsedSeconds)}</strong></article></div>${exam.integrationReport?.message ? `<p class="notice">${escapeHtml(exam.integrationReport.message)}</p>` : ""}<div class="actions"><button type="button" class="secondary-button" data-interactive-exit>Voltar à lista</button>${!exam.integratedAt ? `<button type="button" data-interactive-integrate="${escapeHtml(exam.id)}">Integrar questões e resultado ao site</button>` : ""}</div><div class="interactive-result-list">${exam.questions.map((question,index) => { const mark = exam.answers?.[question.id] || BLANK_MARK; const status = questionStatus(question,mark); return `<details class="${status}"><summary><span>${index + 1}. ${escapeHtml(question.disciplina)} — ${escapeHtml(question.tema)}</span><strong>${resultLabel(status)}</strong></summary><p>${escapeHtml(question.enunciado)}</p><div class="item-meta">Resposta marcada: ${escapeHtml(markedLabel(mark))} • Gabarito: ${escapeHtml(question.gabarito)}</div><p><strong>Justificativa:</strong> ${escapeHtml(question.justificativa || question.comentario || "Não informada")}</p><p><strong>Fundamento:</strong> ${escapeHtml(question.fundamento || "Não informado")}</p></details>`; }).join("")}</div></section>`;
  }

  function render() {
    const root = rootNode(); if (!root) return;
    const active = examById(activeExamId);
    if (active) { root.innerHTML = active.status === "completed" ? resultHtml(active) : examHtml(active); if (active.status !== "completed") startTimer(active); return; }
    if (timerHandle) clearInterval(timerHandle); timerHandle = null; timerStartedAt = 0;
    root.innerHTML = `<header class="interactive-main-header"><div><p class="eyebrow">V313 • V314</p><h3>Simulado interativo</h3><p class="item-meta">Importe o JSON, responda pelo cartão e integre o resultado somente após finalizar.</p></div></header>${importPanelHtml()}<h4>Meus simulados interativos</h4>${libraryHtml()}`;
  }

  function analyzeJson(rawText) {
    try { const source = text(rawText); if (!source) throw new Error("Cole o JSON ou selecione um arquivo antes de analisar."); if (source.length > MAX_JSON_BYTES) throw new Error("O JSON excede o limite de 5 MB."); importDraft = parsePayload(JSON.parse(source)); render(); }
    catch (error) { importDraft = null; const root = rootNode(); render(); const message = root?.querySelector("[data-interactive-import-message]"); if (message) message.innerHTML = `<strong>Não foi possível importar.</strong><br>${escapeHtml(error.message)}${error.issues?.length ? `<ul>${error.issues.slice(0,30).map((issue) => `<li>${escapeHtml(issue)}</li>`).join("")}</ul>` : ""}`; }
  }

  async function runIntegrations(exam) {
    if (!integrations.size) { exam.integrationReport = { success:false, message:"O integrador V314 ainda não foi carregado. O resultado permanece salvo para nova tentativa." }; saveStore(); render(); return; }
    try { const reports = []; for (const [name, adapter] of integrations) reports.push(await adapter(exam)); exam.integratedAt = new Date().toISOString(); exam.integrationReport = { success:true, adapters:[...integrations.keys()], reports, message:"Questões, respostas e resultado integrados ao site sem duplicação." }; saveStore(); render(); }
    catch (error) { exam.integrationReport = { success:false, message:`Integração pendente: ${error.message || error}` }; saveStore(); render(); }
  }

  async function finishExam(exam) {
    checkpointTimer(exam, false);
    const unanswered = exam.questions.filter((question) => !Object.hasOwn(exam.answers || {}, question.id)).length;
    if (!confirm(unanswered ? `Há ${unanswered} questão(ões) sem marcação. Elas serão contabilizadas como brancas. Finalizar?` : "Finalizar o simulado e revelar o gabarito?")) { startTimer(exam); return; }
    exam.questions.forEach((question) => { if (!Object.hasOwn(exam.answers || {}, question.id)) exam.answers[question.id] = BLANK_MARK; });
    exam.status = "completed"; exam.completedAt = new Date().toISOString(); exam.summary = scoreExam(exam); saveStore(); render(); await runIntegrations(exam);
  }

  async function handleClick(event) {
    const button = event.target.closest?.("button"); if (!button) return;
    const analyze = button.closest("[data-interactive-analyze]");
    if (analyze) return analyzeJson(rootNode()?.querySelector("[data-interactive-json]")?.value || "");
    if (button.closest("[data-interactive-import-cancel]")) { importDraft = null; return render(); }
    if (button.closest("[data-interactive-import-confirm]")) {
      if (!importDraft) return;
      const existing = examById(importDraft.exam.id);
      if (existing) { activeExamId = existing.id; importDraft = null; return render(); }
      store.exams.push(importDraft.exam); activeExamId = importDraft.exam.id; importDraft = null; saveStore(); return render();
    }
    const open = button.closest("[data-interactive-open]"); if (open) { const exam = examById(open.dataset.interactiveOpen); if (!exam) return; activeExamId = exam.id; if (exam.status === "draft") { exam.status = "in_progress"; exam.startedAt = new Date().toISOString(); saveStore(); } return render(); }
    const remove = button.closest("[data-interactive-delete]"); if (remove && confirm("Excluir este simulado interativo e suas respostas locais? Os dados já integrados ao site não serão apagados.")) { store.exams = store.exams.filter((exam) => exam.id !== remove.dataset.interactiveDelete); saveStore(); return render(); }
    const integrate = button.closest("[data-interactive-integrate]"); if (integrate) { const exam = examById(integrate.dataset.interactiveIntegrate); if (exam) await runIntegrations(exam); return; }
    const exam = examById(activeExamId); if (!exam) return;
    if (button.closest("[data-interactive-exit]")) { stopTimer(exam); activeExamId = ""; return render(); }
    const index = button.closest("[data-interactive-index]"); if (index) { checkpointTimer(exam); exam.currentIndex = Math.max(0,Math.min(exam.questions.length-1,Number(index.dataset.interactiveIndex)||0)); saveStore(); return render(); }
    const answer = button.closest("[data-interactive-answer]"); if (answer) { checkpointTimer(exam); const question = exam.questions[exam.currentIndex]; exam.answers[question.id] = answer.dataset.interactiveAnswer; saveStore(); if (exam.currentIndex < exam.questions.length - 1) exam.currentIndex += 1; return render(); }
    if (button.closest("[data-interactive-review]")) { checkpointTimer(exam); const question = exam.questions[exam.currentIndex]; exam.reviewFlags[question.id] = !exam.reviewFlags[question.id]; saveStore(); return render(); }
    const nav = button.closest("[data-interactive-nav]"); if (nav) { checkpointTimer(exam); exam.currentIndex += nav.dataset.interactiveNav === "prev" ? -1 : 1; exam.currentIndex = Math.max(0,Math.min(exam.questions.length-1,exam.currentIndex)); saveStore(); return render(); }
    if (button.closest("[data-interactive-finish]")) await finishExam(exam);
  }

  async function handleChange(event) { const input = event.target.closest?.("[data-interactive-file]"); if (!input?.files?.[0]) return; try { if (input.files[0].size > MAX_JSON_BYTES) throw new Error("O arquivo excede o limite de 5 MB."); analyzeJson(await input.files[0].text()); } catch (error) { importDraft = null; render(); const message = rootNode()?.querySelector("[data-interactive-import-message]"); if (message) message.innerHTML = `<strong>Não foi possível importar.</strong><br>${escapeHtml(error.message || error)}`; } finally { input.value = ""; } }

  function mount() {
    if (typeof document === "undefined") return;
    const view = document.getElementById("view-simulados"); if (!view) return;
    if (!rootNode()) { const section = document.createElement("section"); section.id = "aldusInteractiveExamV313"; section.className = "interactive-exam-shell"; const anchor = view.querySelector("#mockSummary") || view.querySelector("#mockExamForm"); view.insertBefore(section, anchor || null); section.addEventListener("click", handleClick); section.addEventListener("change", handleChange); }
    store = readStore(); store.exams.forEach((exam) => { if (exam.status !== "completed") exam.elapsedSeconds = Math.max(0,Number(exam.elapsedSeconds)||0); }); render();
  }

  function registerIntegration(name, adapter) { if (!name || typeof adapter !== "function") throw new Error("Integrador inválido."); integrations.set(String(name), adapter); }
  function getStoreSnapshot() { return JSON.parse(JSON.stringify(store)); }
  function installStylesheet() { if (typeof document === "undefined" || document.getElementById("aldusInteractiveExamStylesV313")) return; const link = document.createElement("link"); link.id = "aldusInteractiveExamStylesV313"; link.rel = "stylesheet"; link.href = "simulado-interativo-v313.css?v=20260811-simulado-interativo-v313"; (document.head || document.documentElement).appendChild(link); }

  const api = Object.freeze({ version:VERSION, storageKey:STORAGE_KEY, schema:SUPPORTED_SCHEMA, blankMark:BLANK_MARK, parsePayload, normalizeAnswer, normalizeAlternatives, isMultipleChoice, choiceKeys, questionStatus, scoreExam, registerIntegration, getStoreSnapshot, mount });
  globalThis.__ALDUS_SIMULADO_INTERATIVO_V313__ = api;
  if (typeof document !== "undefined") { installStylesheet(); if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount, { once:true }); else mount(); document.addEventListener("visibilitychange", () => { const exam = examById(activeExamId); if (exam && document.hidden) checkpointTimer(exam,false); else if (exam && !document.hidden && exam.status === "in_progress") startTimer(exam); }); }
})();
