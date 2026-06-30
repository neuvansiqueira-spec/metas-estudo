const STORAGE_KEY = "metasConcursoData";
const SIMULADOS_STORAGE_KEY = "metasEstudoSimulados";
const MOTIVATION_STORAGE_KEY = "metasEstudoMensagemDoDia";
const MOTIVATIONAL_PHRASES = [
  "Disciplina vence motivação.",
  "Hoje é dia de ganhar pontos líquidos.",
  "Cada questão corrigida diminui uma dúvida na prova.",
  "Não estude para fechar PDF; estude para acertar questão.",
  "Plantão passa. A aprovação fica.",
  "O edital não se vence em um dia, mas se perde quando você para.",
  "A constância decide antes da prova.",
  "Menos promessa, mais execução.",
  "A meta de hoje protege o resultado da prova.",
  "Quem controla o edital controla a ansiedade.",
  "O líquido Cebraspe melhora no detalhe.",
  "A revisão certa vale mais que uma leitura cansada.",
  "Erro corrigido hoje é ponto preservado na prova.",
  "A aprovação é construída em dias comuns.",
  "Não negocie com a procrastinação.",
  "Pouco bem feito ainda é melhor que muito abandonado.",
  "Sua escala muda; sua meta se adapta.",
  "Dia de plantão pede estratégia, não culpa.",
  "Folga bem usada vira vantagem competitiva.",
  "A banca cobra precisão. Treine precisão.",
  "O edital é grande, mas o controle é diário.",
  "Hoje você não precisa vencer tudo; precisa avançar.",
  "Questão errada sem correção vira erro repetido.",
  "O caderno de erros é mapa de aprovação.",
  "Não conte horas; transforme horas em acertos.",
  "Seu estudo precisa gerar decisão de prova.",
  "Assunto difícil não se evita, se quebra em partes.",
  "A meta semanal organiza a ansiedade.",
  "A prova cobra constância antes de cobrar memória.",
  "O próximo ponto líquido começa agora.",
  "Delegado se forma na rotina que ninguém vê.",
  "Controle o edital antes que ele controle sua semana.",
  "Estudo estratégico é escolher o próximo ponto possível.",
  "Cebraspe pune descuido; sua rotina treina atenção.",
  "A disciplina do pós-plantão também conta."
];
const todayISO = () => new Date().toISOString().slice(0, 10);
const defaultPlanning = { config: { examDate: "", scaleType: "24x72", cycleType: "24x72", scaleReferenceDate: "", scaleReferencePosition: 0, scaleNotes: "", shiftHours: 1, restHours: 5, normalHours: 2.5, minWeeklyHours: 10, idealWeeklyHours: 18, weeklyTopics: 8, safetyDays: 7, disciplinesPerDay: 2, disciplinesPerWeek: 6, disciplinesPerMonth: 10, topicsPerDay: 3, topicsPerWeek: 8, topicsPerMonth: 40 }, availability: {}, weeklyGoals: [], forecasts: {} };
function cloneData(value) { return globalThis.structuredClone ? structuredClone(value) : JSON.parse(JSON.stringify(value)); }
function normalizePlanningState(planning = {}) {
  const incomingConfig = planning.config || {};
  const normalizedConfig = { ...defaultPlanning.config, ...incomingConfig };
  normalizedConfig.disciplinesPerDay = Number(normalizedConfig.disciplinesPerDay) || 2;
  normalizedConfig.disciplinesPerWeek = Number(normalizedConfig.disciplinesPerWeek) || 6;
  normalizedConfig.disciplinesPerMonth = Number(normalizedConfig.disciplinesPerMonth) || 10;
  normalizedConfig.topicsPerDay = Number(normalizedConfig.topicsPerDay) || 3;
  normalizedConfig.topicsPerWeek = Number(normalizedConfig.topicsPerWeek || normalizedConfig.weeklyTopics) || 8;
  normalizedConfig.topicsPerMonth = Number(normalizedConfig.topicsPerMonth) || 40;
  normalizedConfig.cycleType = normalizedConfig.cycleType || normalizedConfig.scaleType || "24x72";
  normalizedConfig.scaleReferenceDate ||= todayISO();
  normalizedConfig.scaleReferencePosition = Number(normalizedConfig.scaleReferencePosition) || 0;
  return {
    ...cloneData(defaultPlanning),
    ...planning,
    config: normalizedConfig,
    availability: { ...(planning.availability || {}) },
    weeklyGoals: Array.isArray(planning.weeklyGoals) ? planning.weeklyGoals : [],
    forecasts: { ...(planning.forecasts || {}) }
  };
}
const defaultState = { subjects: [], studies: [], edital: { pdf: null }, syllabusItems: [], schedulableSettings: {}, dailyGoals: [], questionLogs: [], smartReviews: [], simulados: [], planning: cloneData(defaultPlanning), settings: { defaultMockGoal: 92 }, materials: [], questionBank: [], questionBankSessions: [], disciplineWeights: {}, monthlyGoals: {} };
function readJSONStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch (error) {
    console.error(`[Metas Estudo] Dados corrompidos em ${key}.`, error);
    window.__METAS_STORAGE_ERROR__ = { key, message: error.message };
    return fallback;
  }
}
const state = { ...cloneData(defaultState), ...(readJSONStorage(STORAGE_KEY, {}) || {}) };
state.edital = { ...defaultState.edital, ...(state.edital || {}) };
state.syllabusItems ||= [];
state.schedulableSettings ||= {};
state.dailyGoals ||= [];
state.dailyGoals.forEach((goal) => { goal.date ||= goal.data || todayISO(); goal.data ||= goal.date; goal.discipline ||= goal.disciplina || "Sem disciplina"; goal.subject ||= goal.assunto || "Assunto"; goal.type ||= goal.tipo || "Meta"; goal.minutes = Number(goal.minutes ?? goal.tempo_sugerido_minutos) || 0; goal.actualMinutes = Number(goal.actualMinutes ?? goal.tempo_real_minutos) || 0; goal.status ||= "Pendente"; });
state.questionLogs ||= []; state.questionBank ||= []; state.questionBankSessions ||= [];
state.smartReviews ||= [];
state.simulados ||= readJSONStorage(SIMULADOS_STORAGE_KEY, []);
state.materials ||= [];
state.questionBank ||= [];
state.questionBankSessions ||= [];
state.disciplineWeights ||= {};
state.monthlyGoals ||= {};
state.planning = normalizePlanningState(state.planning);
state.settings ||= {};
state.settings.defaultMockGoal ||= 92;
state.materials ||= [];
state.migrations ||= {};
function mergeCompatibleLocalStorageData() {
  const candidates = ["syllabusItems", "editalVerticalizado", "edital_verticalizado", "assuntosAgendaveis", "metasDoDia", "dailyGoals"];
  candidates.forEach((key) => {
    if (key === STORAGE_KEY) return;
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      const items = Array.isArray(parsed) ? parsed : (parsed?.syllabusItems || parsed?.itens || parsed?.items || parsed?.assuntos);
      if ((key.toLowerCase().includes("meta") || parsed?.dailyGoals) && Array.isArray(items) && !state.dailyGoals.length) state.dailyGoals = items;
      else if (Array.isArray(items) && !state.syllabusItems.length) state.syllabusItems = items.map((item) => ({
        id: item.id || createId(),
        discipline: item.discipline || item.disciplina || "Sem disciplina",
        topic: item.topic || item.topico || item.eixo || "Geral",
        subject: item.subject || item.assunto || item.referencia_edital || "Assunto",
        subtopic: item.subtopic || item.subassunto || item.nivel || "",
        reference: item.reference || item.referencia_edital || "",
        priority: normalizeImportedPriority(item.priority || item.prioridade),
        weight: Number(item.weight ?? item.peso) || 1,
        status: normalizeImportedStatus(item.status),
        domain: normalizeImportedDomain(item.domain || item.dominio),
        notes: item.notes || item.observacoes || "",
        agendavel: item.agendavel,
        tipo_agendamento: item.tipo_agendamento,
        importMeta: item.importMeta || { agendavel: acceptsSchedulableValue(item.agendavel), tipo_agendamento: item.tipo_agendamento || "" }
      }));
    } catch (error) {
      console.warn(`[Metas do dia] Não foi possível ler a chave compatível ${key}.`, error);
    }
  });
}
let bulkDraft = [];
let importDraft = [];
let pendingBackupPayload = null;
let syllabusVisibleCount = 30;
let editingSyllabusId = null;

const $ = (selector) => document.querySelector(selector);
const elements = {
  subjectForm: $("#subjectForm"), subjectName: $("#subjectName"), subjectGoal: $("#subjectGoal"), subjectList: $("#subjectList"),
  studyForm: $("#studyForm"), studyDate: $("#studyDate"), studySubject: $("#studySubject"), studyTopic: $("#studyTopic"), studyMinutes: $("#studyMinutes"), studyPlannedMinutes: $("#studyPlannedMinutes"), studyTopicStatus: $("#studyTopicStatus"), studyDifficultyNotes: $("#studyDifficultyNotes"), questionsDone: $("#questionsDone"), correctAnswers: $("#correctAnswers"), wrongAnswers: $("#wrongAnswers"), blankAnswers: $("#blankAnswers"),
  todayHours: $("#todayHours"), weekHours: $("#weekHours"), weeklyGoalStatus: $("#weeklyGoalStatus"), totalQuestions: $("#totalQuestions"), accuracyRate: $("#accuracyRate"), syllabusStudied: $("#syllabusStudied"), dashboardStudiedTopics: $("#dashboardStudiedTopics"), syllabusTotal: $("#syllabusTotal"), schedulableTotal: $("#schedulableTotal"), notStartedTotal: $("#notStartedTotal"), undiagnosedTotal: $("#undiagnosedTotal"), weakTotal: $("#weakTotal"), pendingDiscipline: $("#pendingDiscipline"), totalStudyTime: $("#totalStudyTime"), averageTimePerTopic: $("#averageTimePerTopic"), dashboardCompletionForecast: $("#dashboardCompletionForecast"), daysUntilExam: $("#daysUntilExam"), planningStatus: $("#planningStatus"), dashboardMinWeeklyHours: $("#dashboardMinWeeklyHours"), dashboardIdealWeeklyHours: $("#dashboardIdealWeeklyHours"), dashboardProblemDiscipline: $("#dashboardProblemDiscipline"), dashboardTodayDisciplines: $("#dashboardTodayDisciplines"), dashboardTodayTopics: $("#dashboardTodayTopics"), dashboardWeekDisciplines: $("#dashboardWeekDisciplines"), dashboardWeekTopics: $("#dashboardWeekTopics"), dailyMotivationText: $("#dailyMotivationText"), changeMotivation: $("#changeMotivation"), dashboardProgressSummary: $("#dashboardProgressSummary"), progressGeneralCards: $("#progressGeneralCards"), progressMainBar: $("#progressMainBar"), progressAlerts: $("#progressAlerts"), progressDisciplines: $("#progressDisciplines"),
  reviewList: $("#reviewList"), centralSmartReview: $("#centralSmartReview"), daySmartReview: $("#daySmartReview"), reviewsDashboard: $("#reviewsDashboard"), dashboardSmartReviewSuggested: $("#dashboardSmartReviewSuggested"), dashboardSmartReviewDone: $("#dashboardSmartReviewDone"), dashboardSmartReviewReason: $("#dashboardSmartReviewReason"), alertList: $("#alertList"), historyBody: $("#historyBody"), clearData: $("#clearData"),
  editalForm: $("#editalForm"), contestName: $("#contestName"), agency: $("#agency"), role: $("#role"), board: $("#board"), examDate: $("#examDate"), officialLink: $("#officialLink"), generalNotes: $("#generalNotes"), editalPdf: $("#editalPdf"), pdfInfo: $("#pdfInfo"), removePdf: $("#removePdf"),
  syllabusForm: $("#syllabusForm"), itemDiscipline: $("#itemDiscipline"), itemTopic: $("#itemTopic"), itemSubject: $("#itemSubject"), itemSubtopic: $("#itemSubtopic"), itemReference: $("#itemReference"), itemPriority: $("#itemPriority"), itemWeight: $("#itemWeight"), itemStatus: $("#itemStatus"), itemDomain: $("#itemDomain"), itemNotes: $("#itemNotes"),
  bulkInput: $("#bulkInput"), previewBulk: $("#previewBulk"), saveBulk: $("#saveBulk"), bulkPreview: $("#bulkPreview"), filterSearch: $("#filterSearch"), filterDiscipline: $("#filterDiscipline"), filterPriority: $("#filterPriority"), filterStatus: $("#filterStatus"), filterDomain: $("#filterDomain"), filterSchedulable: $("#filterSchedulable"), filterQuick: $("#filterQuick"), bulkPriority: $("#bulkPriority"), applyBulkPriority: $("#applyBulkPriority"), syllabusCount: $("#syllabusCount"), showMoreSyllabus: $("#showMoreSyllabus"), syllabusList: $("#syllabusList"), schedulableList: $("#schedulableList"), disciplineOptions: $("#disciplineOptions"),
  jsonImportFile: $("#jsonImportFile"), importMessage: $("#importMessage"), importDisciplineTotal: $("#importDisciplineTotal"), importSubjectTotal: $("#importSubjectTotal"), importFilterDiscipline: $("#importFilterDiscipline"), importFilterStatus: $("#importFilterStatus"), importFilterPriority: $("#importFilterPriority"), importFilterDomain: $("#importFilterDomain"), importJsonButton: $("#importJsonButton"), clearImportedSyllabus: $("#clearImportedSyllabus"), importDisciplineList: $("#importDisciplineList"), importPreview: $("#importPreview"),
  generalCebraspeNet: $("#generalCebraspeNet"), todayPendingGoals: $("#todayPendingGoals"), todayDoneGoals: $("#todayDoneGoals"), dashboardTodayGoal: $("#dashboardTodayGoal"), dashboardTodayGoalDetail: $("#dashboardTodayGoalDetail"), dashboardDailyGoalRate: $("#dashboardDailyGoalRate"), dashboardTodayRemaining: $("#dashboardTodayRemaining"), dashboardNextTodayGoal: $("#dashboardNextTodayGoal"), viewDayPlan: $("#viewDayPlan"),
  selectedGoalDateLabel: $("#selectedGoalDateLabel"), nextDailyGoal: $("#nextDailyGoal"), generateDailyGoals: $("#generateDailyGoals"), goalForm: $("#goalForm"), goalDate: $("#goalDate"), goalDiscipline: $("#goalDiscipline"), goalSyllabusItem: $("#goalSyllabusItem"), goalType: $("#goalType"), goalMinutes: $("#goalMinutes"), goalActualMinutes: $("#goalActualMinutes"), goalStudyStatus: $("#goalStudyStatus"), goalPriority: $("#goalPriority"), goalStatus: $("#goalStatus"), goalNotes: $("#goalNotes"), dailyGoalsSummary: $("#dailyGoalsSummary"), dailyGoalsList: $("#dailyGoalsList"),
  calendarDate: $("#calendarDate"), calendarViewMode: $("#calendarViewMode"), generateWeekGoals: $("#generateWeekGoals"), generateMonthGoals: $("#generateMonthGoals"), disciplineWeightsList: $("#disciplineWeightsList"), goalCalendarStats: $("#goalCalendarStats"), goalCalendarContent: $("#goalCalendarContent"), monthlyTopicGoal: $("#monthlyTopicGoal"), monthlyHourGoal: $("#monthlyHourGoal"), monthlyPlanSummary: $("#monthlyPlanSummary"), todayGoalsTotal: $("#todayGoalsTotal"), weekGoalsTotal: $("#weekGoalsTotal"), weekGoalRate: $("#weekGoalRate"), monthGoalRate: $("#monthGoalRate"), nextGoalLabel: $("#nextGoalLabel"), weekTopDiscipline: $("#weekTopDiscipline"), mostDelayedDiscipline: $("#mostDelayedDiscipline"),
  questionForm: $("#questionForm"), questionEditingId: $("#questionEditingId"), questionLinkedGoalId: $("#questionLinkedGoalId"), questionOrigin: $("#questionOrigin"), questionDate: $("#questionDate"), questionDiscipline: $("#questionDiscipline"), questionSyllabusItem: $("#questionSyllabusItem"), questionBoard: $("#questionBoard"), questionTrainingType: $("#questionTrainingType"), questionTotal: $("#questionTotal"), questionMinutes: $("#questionMinutes"), questionCorrect: $("#questionCorrect"), questionWrong: $("#questionWrong"), questionBlank: $("#questionBlank"), questionNotes: $("#questionNotes"), questionCalculated: $("#questionCalculated"), questionAnalysis: $("#questionAnalysis"),
  questionFilterDiscipline: $("#questionFilterDiscipline"), questionFilterSubject: $("#questionFilterSubject"), questionFilterBoard: $("#questionFilterBoard"), questionHistoryBody: $("#questionHistoryBody"),
  exportBackup: $("#exportBackup"), selectBackupFile: $("#selectBackupFile"), backupFileInput: $("#backupFileInput"), clearAllLocalData: $("#clearAllLocalData"), lastBackupDate: $("#lastBackupDate"), backupStorageKeys: $("#backupStorageKeys"), backupSummary: $("#backupSummary"), backupPreview: $("#backupPreview"),
  mockTotal: $("#mockTotal"), mockLastNet: $("#mockLastNet"), mockBestNet: $("#mockBestNet"), mockAverageNet: $("#mockAverageNet"), mockAboveGoal: $("#mockAboveGoal"), mockProblemDiscipline: $("#mockProblemDiscipline"),
  newMockExam: $("#newMockExam"), mockExamForm: $("#mockExamForm"), mockExamEditingId: $("#mockExamEditingId"), mockName: $("#mockName"), mockDate: $("#mockDate"), mockBoard: $("#mockBoard"), mockInstitution: $("#mockInstitution"), mockNotes: $("#mockNotes"), mockTotalQuestions: $("#mockTotalQuestions"), mockCorrect: $("#mockCorrect"), mockWrong: $("#mockWrong"), mockBlank: $("#mockBlank"), mockGoal: $("#mockGoal"), mockStrategy: $("#mockStrategy"), mockDifficulty: $("#mockDifficulty"), mockCalculated: $("#mockCalculated"), mockDisciplineName: $("#mockDisciplineName"), mockDisciplineTotal: $("#mockDisciplineTotal"), mockDisciplineCorrect: $("#mockDisciplineCorrect"), mockDisciplineWrong: $("#mockDisciplineWrong"), mockDisciplineBlank: $("#mockDisciplineBlank"), mockDisciplineNotes: $("#mockDisciplineNotes"), addMockDiscipline: $("#addMockDiscipline"), clearMockDisciplines: $("#clearMockDisciplines"), mockDisciplineDraft: $("#mockDisciplineDraft"), mockSummary: $("#mockSummary"), mockGeneralResult: $("#mockGeneralResult"), mockDisciplineResults: $("#mockDisciplineResults"), mockDiagnosis: $("#mockDiagnosis"), mockHistory: $("#mockHistory"), mockEvolution: $("#mockEvolution"),
  planningConfigForm: $("#planningConfigForm"), planningExamDate: $("#planningExamDate"), planningScaleType: $("#planningScaleType"), planningScaleNotes: $("#planningScaleNotes"), planningShiftHours: $("#planningShiftHours"), planningRestHours: $("#planningRestHours"), planningNormalHours: $("#planningNormalHours"), planningMinWeeklyHours: $("#planningMinWeeklyHours"), planningIdealWeeklyHours: $("#planningIdealWeeklyHours"), planningWeeklyTopics: $("#planningWeeklyTopics"), planningDisciplinesPerDay: $("#planningDisciplinesPerDay"), planningDisciplinesPerWeek: $("#planningDisciplinesPerWeek"), planningDisciplinesPerMonth: $("#planningDisciplinesPerMonth"), planningTopicsPerDay: $("#planningTopicsPerDay"), planningTopicsPerWeek: $("#planningTopicsPerWeek"), planningTopicsPerMonth: $("#planningTopicsPerMonth"), planningSafetyDays: $("#planningSafetyDays"), planningScaleReferenceDate: $("#planningScaleReferenceDate"), planningScaleReferencePosition: $("#planningScaleReferencePosition"), scale3x6Fields: $("#scale3x6Fields"), centralGoalsCards: $("#centralGoalsCards"), centralScaleSummary: $("#centralScaleSummary"), centralNextDates: $("#centralNextDates"), centralOpenDayPlan: $("#centralOpenDayPlan"), dashboardGoalsScaleSummary: $("#dashboardGoalsScaleSummary"), availabilityCalendar: $("#availabilityCalendar"), completionForecast: $("#completionForecast"), completionAlert: $("#completionAlert"), weeklyGoalsPlan: $("#weeklyGoalsPlan"), weeklyGoalsAlert: $("#weeklyGoalsAlert"), timeHistorySummary: $("#timeHistorySummary"), timeHistoryBody: $("#timeHistoryBody"),
  dashboardQuestionBankTotal: $("#dashboardQuestionBankTotal"), dashboardQuestionBankSessions: $("#dashboardQuestionBankSessions"), dashboardQuestionBankLast: $("#dashboardQuestionBankLast"), dashboardQuestionBankPackages: $("#dashboardQuestionBankPackages"), dashboardQuestionBankLinked: $("#dashboardQuestionBankLinked"), dashboardQuestionBankMissing: $("#dashboardQuestionBankMissing"),
  materialsTotal: $("#materialsTotal"), materialDisciplinesTotal: $("#materialDisciplinesTotal"), materialTopicsTotal: $("#materialTopicsTotal"), materialForm: $("#materialForm"), materialEditingId: $("#materialEditingId"), materialTitle: $("#materialTitle"), materialDate: $("#materialDate"), materialDiscipline: $("#materialDiscipline"), materialSubject: $("#materialSubject"), materialType: $("#materialType"), materialOrigin: $("#materialOrigin"), materialLink: $("#materialLink"), materialTags: $("#materialTags"), materialNotes: $("#materialNotes"), materialDisciplineOptions: $("#materialDisciplineOptions"), materialSubjectOptions: $("#materialSubjectOptions"), materialFilterDiscipline: $("#materialFilterDiscipline"), materialFilterSubject: $("#materialFilterSubject"), materialFilterType: $("#materialFilterType"), materialFilterOrigin: $("#materialFilterOrigin"), materialFilterText: $("#materialFilterText"), materialsList: $("#materialsList"), studyMaterial: $("#studyMaterial"),
  qbSyllabusPackages: $("#qbSyllabusPackages"), qbFile: $("#qbFile"), qbNewTraining: $("#qbNewTraining"), qbRedoBlanks: $("#qbRedoBlanks"), qbExportBank: $("#qbExportBank"), qbExportResults: $("#qbExportResults"), qbClearBank: $("#qbClearBank"), qbMessage: $("#qbMessage"), qbStats: $("#qbStats"), qbDiagnostics: $("#qbDiagnostics"), qbTrainingScope: $("#qbTrainingScope"), qbReviewTypeWrapper: $("#qbReviewTypeWrapper"), qbReviewType: $("#qbReviewType"), qbFilterDiscipline: $("#qbFilterDiscipline"), qbFilterSubject: $("#qbFilterSubject"), qbFilterTheme: $("#qbFilterTheme"), qbFilterBoard: $("#qbFilterBoard"), qbFilterYear: $("#qbFilterYear"), qbFilterSearch: $("#qbFilterSearch"), qbTrainingLimit: $("#qbTrainingLimit"), qbShuffleTraining: $("#qbShuffleTraining"), qbStartTraining: $("#qbStartTraining"), qbPreviewFiltered: $("#qbPreviewFiltered"), qbFilteredPreview: $("#qbFilteredPreview"), qbTrainingPanel: $("#qbTrainingPanel"), qbTrainingCounter: $("#qbTrainingCounter"), qbTrainingProgress: $("#qbTrainingProgress"), qbQuestionCard: $("#qbQuestionCard"), qbResultPanel: $("#qbResultPanel"), qbResultSummary: $("#qbResultSummary"), qbResultDetails: $("#qbResultDetails")
};
elements.studyDate.value = todayISO();
elements.goalDate.value = todayISO();
elements.questionDate.value = todayISO();
if (elements.calendarDate) elements.calendarDate.value = todayISO();
if (elements.mockDate) elements.mockDate.value = todayISO();
if (elements.materialDate) elements.materialDate.value = todayISO();


function pickMotivationalPhrase() {
  const lastPhrase = localStorage.getItem(MOTIVATION_STORAGE_KEY);
  const availablePhrases = MOTIVATIONAL_PHRASES.filter((phrase) => phrase !== lastPhrase);
  const pool = availablePhrases.length ? availablePhrases : MOTIVATIONAL_PHRASES;
  const phrase = pool[Math.floor(Math.random() * pool.length)];
  localStorage.setItem(MOTIVATION_STORAGE_KEY, phrase);
  return phrase;
}
function renderMotivationalPhrase(phrase = pickMotivationalPhrase()) {
  if (elements.dailyMotivationText) elements.dailyMotivationText.textContent = phrase;
}

function saveData() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    localStorage.setItem(SIMULADOS_STORAGE_KEY, JSON.stringify(state.simulados || []));
  } catch (error) {
    console.error("[Metas Estudo] Não foi possível salvar no localStorage.", error);
    alert("Não foi possível salvar os dados. Verifique o espaço disponível do navegador e exporte um backup.");
  }
}
function showStorageWarningIfNeeded() {
  if (!window.__METAS_STORAGE_ERROR__) return;
  const warning = document.createElement("div");
  warning.className = "storage-warning notice warning-notice";
  warning.innerHTML = `<strong>Aviso:</strong> encontramos dados corrompidos na chave <code>${escapeHTML(window.__METAS_STORAGE_ERROR__.key)}</code>. Você pode importar um backup, continuar com estado vazio ou limpar apenas a chave corrompida. <button type="button" data-storage-action="backup">Importar backup</button> <button type="button" data-storage-action="clear-corrupt">Limpar chave corrompida</button> <button type="button" data-storage-action="dismiss">Continuar</button>`;
  document.body.prepend(warning);
  warning.addEventListener("click", (event) => {
    const action = event.target.closest("button")?.dataset.storageAction;
    if (!action) return;
    if (action === "backup") showView("backup");
    if (action === "clear-corrupt" && confirm("Limpar apenas a chave corrompida?")) localStorage.removeItem(window.__METAS_STORAGE_ERROR__.key);
    warning.remove();
  });
}
function getProjectStorageKeys() {
  const known = [STORAGE_KEY, SIMULADOS_STORAGE_KEY, "syllabusItems", "editalVerticalizado", "edital_verticalizado", "assuntosAgendaveis", "metasDoDia", "dailyGoals"];
  return Object.keys(localStorage).filter((key) => known.includes(key) || key.toLowerCase().includes("metas") || key.toLowerCase().includes("edital"));
}
function backupCounts(source = state) {
  return {
    edital: source.edital && Object.values(source.edital).some(Boolean) ? 1 : 0,
    verticalizado: source.syllabusItems?.length || 0,
    agendaveis: source.syllabusItems?.filter((item) => {
      const setting = source.schedulableSettings?.[item.id] || {};
      return setting.availability === "Agendável" || acceptsSchedulableValue(item.agendavel) || acceptsSchedulableValue(item.schedulable) || acceptsSchedulableValue(item.importMeta?.agendavel) || Boolean(item.tipo_agendamento || item.importMeta?.tipo_agendamento);
    }).length || 0,
    disciplinas: source.subjects?.length || 0,
    metas: source.dailyGoals?.length || 0,
    questoes: source.questionLogs?.length || 0,
    revisoes: (source.studies?.length ? source.studies.length * 3 : 0) + (source.smartReviews?.length || 0),
    historico: source.studies?.length || 0,
    simulados: source.simulados?.length || 0,
    materiais: source.materials?.length || 0,
    bancoQuestoes: source.questionBank?.length || 0,
    treinosBanco: source.questionBankSessions?.length || 0
  };
}
function renderBackupSummary() {
  if (!elements.backupSummary) return;
  const counts = backupCounts();
  const cards = [
    ["Itens do edital verticalizado", counts.verticalizado], ["Assuntos agendáveis", counts.agendaveis], ["Disciplinas", counts.disciplinas],
    ["Metas", counts.metas], ["Lançamentos de questões", counts.questoes], ["Banco de questões", counts.bancoQuestoes], ["Treinos do banco", counts.treinosBanco], ["Simulados", counts.simulados], ["Materiais", counts.materiais], ["Revisões previstas", counts.revisoes], ["Registros históricos", counts.historico]
  ];
  elements.lastBackupDate.textContent = state.settings?.lastBackupAt ? new Date(state.settings.lastBackupAt).toLocaleString("pt-BR") : "Nunca exportado";
  elements.backupStorageKeys.textContent = getProjectStorageKeys().length;
  elements.backupSummary.innerHTML = cards.map(([label, value]) => `<article class="stat-card"><span>${label}</span><strong>${value}</strong></article>`).join("");
}
function makeBackupPayload() {
  saveData();
  const keys = getProjectStorageKeys();
  const localStorageData = Object.fromEntries(keys.map((key) => [key, localStorage.getItem(key)]));
  return { app: "metas-estudo", version: 2, exportedAt: new Date().toISOString(), storageKey: STORAGE_KEY, data: cloneData(state), progressData: progressMetrics(), forecastSettings: cloneData(state.planning?.config || {}), localStorage: localStorageData };
}
function backupFilename(date = new Date()) {
  const pad = (n) => String(n).padStart(2, "0");
  return `backup-metas-estudo-${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}-${pad(date.getHours())}-${pad(date.getMinutes())}.json`;
}
function exportBackup() {
  const payload = makeBackupPayload();
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob); link.download = backupFilename(); link.click(); URL.revokeObjectURL(link.href);
  state.settings ||= {}; state.settings.lastBackupAt = payload.exportedAt; saveData(); renderBackupSummary();
}
function normalizeBackupPayload(payload) {
  if (payload?.app === "metas-estudo" && payload.data) return payload;
  if (payload?.storageKey === STORAGE_KEY && payload.data) return { app: "metas-estudo", exportedAt: payload.exportedAt, data: payload.data, localStorage: payload.localStorage || {} };
  return { app: "metas-estudo", exportedAt: payload?.exportedAt || "Data não informada", data: payload, localStorage: {} };
}
function renderBackupPreview(payload) {
  const normalized = normalizeBackupPayload(payload); const counts = backupCounts(normalized.data || {});
  const disciplines = [...new Set([...(normalized.data.subjects || []).map((s) => s.name), ...(normalized.data.syllabusItems || []).map((i) => i.discipline)].filter(Boolean))].sort();
  const backupDate = normalized.exportedAt && !Number.isNaN(Date.parse(normalized.exportedAt)) ? new Date(normalized.exportedAt).toLocaleString("pt-BR") : "Não informada";
  elements.backupPreview.innerHTML = `<h3>Pré-visualização do backup selecionado</h3><div class="stats-grid compact backup-summary"><article class="stat-card"><span>Data do backup</span><strong class="stat-value-date">${escapeHTML(backupDate)}</strong></article><article class="stat-card"><span>Disciplinas</span><strong>${counts.disciplinas}</strong></article><article class="stat-card"><span>Assuntos</span><strong>${counts.verticalizado}</strong></article><article class="stat-card"><span>Metas</span><strong>${counts.metas}</strong></article><article class="stat-card"><span>Questões</span><strong>${counts.questoes}</strong></article><article class="stat-card"><span>Banco de questões</span><strong>${counts.bancoQuestoes}</strong></article><article class="stat-card"><span>Treinos do banco</span><strong>${counts.treinosBanco}</strong></article><article class="stat-card"><span>Simulados</span><strong>${counts.simulados}</strong></article><article class="stat-card"><span>Revisões</span><strong>${counts.revisoes}</strong></article></div><p class="item-meta"><strong>Disciplinas encontradas:</strong> ${disciplines.slice(0, 20).map(escapeHTML).join(", ") || "nenhuma"}${disciplines.length > 20 ? "..." : ""}</p><div class="actions"><button type="button" data-backup-import="replace" class="danger">Substituir dados atuais</button><button type="button" data-backup-import="merge" class="secondary-button">Mesclar com dados atuais</button><button type="button" data-backup-import="cancel">Cancelar</button></div>`;
  return normalized;
}
function replaceState(nextState) { Object.keys(state).forEach((key) => delete state[key]); Object.assign(state, { ...cloneData(defaultState), ...(nextState || {}) }); state.edital = { ...defaultState.edital, ...(state.edital || {}) }; state.syllabusItems ||= []; state.schedulableSettings ||= {}; state.dailyGoals ||= []; state.questionLogs ||= []; state.questionBank ||= []; state.questionBankSessions ||= [];
state.smartReviews ||= []; state.simulados ||= []; state.planning = normalizePlanningState(state.planning); state.settings ||= {}; state.settings.defaultMockGoal ||= 92; state.materials ||= []; state.disciplineWeights ||= {}; state.monthlyGoals ||= {}; }
function mergeArrays(current = [], incoming = [], keyFn = (item) => item?.id || JSON.stringify(item)) { const seen = new Set(current.map(keyFn)); incoming.forEach((item) => { const key = keyFn(item); if (!seen.has(key)) { current.push(item); seen.add(key); } }); return current; }
function mergeBackupData(data = {}) {
  mergeArrays(state.subjects, data.subjects || [], (item) => canonical(item.name || item.id));
  mergeArrays(state.studies, data.studies || [], (item) => item.id || [item.date, item.subjectId, item.topic, item.minutes].join("|"));
  mergeArrays(state.syllabusItems, data.syllabusItems || [], (item) => item.importKey || importKeyFor(item));
  mergeArrays(state.dailyGoals, data.dailyGoals || [], (item) => item.id || [item.date, item.discipline, item.subject, item.type].join("|"));
  mergeArrays(state.questionLogs, data.questionLogs || [], (item) => item.id || [item.date, item.discipline, item.subject, item.total, item.correct, item.wrong].join("|"));
  mergeArrays(state.questionBank, data.questionBank || [], (item) => item.id);
  mergeArrays(state.questionBankSessions, data.questionBankSessions || [], (item) => item.id);
  mergeArrays(state.smartReviews, data.smartReviews || data.revisoesInteligentes || [], (item) => item.id || [item.date, item.discipline, item.subject, item.status, item.origin].join("|"));
  mergeArrays(state.simulados, data.simulados || [], (item) => item.id || [item.date, item.name, item.total, item.correct, item.wrong].join("|"));
  mergeArrays(state.materials, data.materials || data.materiais || [], (item) => item.id || [item.title || item.titulo, item.discipline || item.disciplina, item.subject || item.assunto, item.link].join("|"));
  state.disciplineWeights = { ...(data.disciplineWeights || {}), ...state.disciplineWeights };
  state.monthlyGoals = { ...(data.monthlyGoals || {}), ...state.monthlyGoals };
  if (data.planning) state.planning = normalizePlanningState({ ...state.planning, ...data.planning, config: { ...state.planning.config, ...(data.planning.config || {}) }, availability: { ...(data.planning.availability || {}), ...state.planning.availability }, weeklyGoals: data.planning.weeklyGoals || state.planning.weeklyGoals, forecasts: { ...(data.planning.forecasts || {}), ...state.planning.forecasts } });
  state.edital = { ...(data.edital || {}), ...state.edital };
  state.schedulableSettings = { ...(data.schedulableSettings || {}), ...state.schedulableSettings };
  state.settings = { ...(data.settings || {}), ...state.settings };
}
function clearProjectLocalStorage() { getProjectStorageKeys().forEach((key) => localStorage.removeItem(key)); }
function restoreBackup(payload, mode) {
  if (mode === "replace") { clearProjectLocalStorage(); replaceState(payload.data); }
  if (mode === "merge") mergeBackupData(payload.data);
  render(); showView("backup"); elements.backupPreview.innerHTML += `<p class="notice">Backup ${mode === "replace" ? "substituído" : "mesclado"} com sucesso.</p>`;
}
async function handleBackupFile(file) {
  try {
    pendingBackupPayload = renderBackupPreview(JSON.parse(await file.text()));
  } catch (error) { console.error("Erro ao importar backup", error); alert("Não foi possível ler este arquivo JSON de backup."); }
}
function handleBackupImportChoice(action) {
  if (action === "cancel") { pendingBackupPayload = null; elements.backupPreview.innerHTML = ""; return; }
  if (!pendingBackupPayload) return alert("Selecione um arquivo de backup JSON antes de importar.");
  if (action === "replace" && !confirm("Substituir dados atuais? Apenas dados do projeto metas-estudo serão apagados antes da restauração.")) return;
  restoreBackup(pendingBackupPayload, action); pendingBackupPayload = null;
}
function clearAllLocalDataFromBackup() {
  if (!confirm("Tem certeza? Esta ação apagará os dados salvos neste navegador. Faça backup antes de continuar.")) return;
  clearProjectLocalStorage(); replaceState({}); render(); showView("backup");
}
function showDailyGoalMessage(message, type = "info") {
  let box = document.getElementById("dailyGoalsMessage");
  if (!box) {
    box = document.createElement("div");
    box.id = "dailyGoalsMessage";
    box.className = "file-info empty-message";
    box.setAttribute("aria-live", "polite");
    elements.dailyGoalsList.before(box);
  }
  box.textContent = message;
  box.dataset.type = type;
}
function formatHours(minutes) { const hours = minutes / 60; return `${Number.isInteger(hours) ? hours : hours.toFixed(1)}h`; }
function formatDateBR(dateString) {
  if (typeof dateString !== "string") return "-";
  const match = dateString.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return "-";
  const [, year, month, day] = match;
  const parsed = new Date(`${year}-${month}-${day}T00:00:00`);
  if (Number.isNaN(parsed.getTime()) || parsed.getFullYear() !== Number(year) || parsed.getMonth() + 1 !== Number(month) || parsed.getDate() !== Number(day)) return "-";
  return `${day}/${month}/${year}`;
}
function isGoalDone(goal) { return goal.status === "Concluída"; }
function isGoalInProgress(goal) { return !isGoalDone(goal) && !["Pendente", "Adiada", "Reagendada", "Não cumprida", "Ignorada"].includes(goal.status || "Pendente") && Number(goal.actualMinutes || 0) > 0 || (!isGoalDone(goal) && Number(goal.actualMinutes || 0) > 0 && !["Não cumprida", "Ignorada", "Adiada", "Reagendada"].includes(goal.status || "")); }
function goalProgressStats(goals, availability = { hours: 0 }) { const planned = goals.reduce((a,g)=>a+Number(g.minutes||0),0); const done = goals.reduce((a,g)=>a+Number(g.actualMinutes||0),0); const target = planned || Number(availability.hours || 0) * 60; const completed = goals.filter(isGoalDone).length; const pending = goals.filter((g)=>!isGoalDone(g) && !["Não cumprida", "Ignorada"].includes(g.status || "")).length; return { planned, done, target, remaining: Math.max(0, target - done), completed, pending, goalsPct: goals.length ? Math.round(completed / goals.length * 100) : 0, timePct: target ? Math.min(100, Math.round(done / target * 100)) : 0 }; }
function parseDate(dateString) { const [year, month, day] = dateString.split("-").map(Number); return new Date(year, month - 1, day); }
function addDays(dateString, days) { const date = parseDate(dateString); date.setDate(date.getDate() + days); return date.toISOString().slice(0, 10); }
function isSameWeek(dateString) { const now = new Date(); const date = parseDate(dateString); const start = new Date(now); start.setHours(0, 0, 0, 0); start.setDate(now.getDate() - now.getDay()); const end = new Date(start); end.setDate(start.getDate() + 7); return date >= start && date < end; }
function createId() { return globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`; }
function escapeHTML(value) { return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#039;" })[char]); }
function subjectNameById(id) { return state.subjects.find((subject) => subject.id === id)?.name || "Disciplina removida"; }
function settingFor(id) { return state.schedulableSettings[id] ||= { availability: "Não agendável", mode: "Estudo teórico", priority: false }; }
function normalizeText(value) { return String(value ?? "").trim(); }
function importKeyFor(item) { return [item.discipline, item.topic, item.subject, item.subtopic, item.reference].map((value) => normalizeText(value).toLowerCase()).join("|"); }
function acceptsSchedulableValue(value) {
  if (value === 1 || value === true) return true;
  return ["true", "sim", "agendável", "agendavel", "1"].includes(String(value ?? "").trim().toLowerCase());
}
function isSchedulable(id) {
  const item = state.syllabusItems.find((entry) => entry.id === id);
  const setting = settingFor(id);
  return setting.availability === "Agendável"
    || acceptsSchedulableValue(item?.agendavel)
    || acceptsSchedulableValue(item?.schedulable)
    || acceptsSchedulableValue(item?.importMeta?.agendavel)
    || Boolean(item?.tipo_agendamento || item?.importMeta?.tipo_agendamento);
}
function isCompletedStatusValue(status) { return ["Concluído", "Concluido", "Estudado", "Dominado"].includes(String(status || "")); }
function completedStatus(item) { return isCompletedStatusValue(item.status); }
function normalizeProgressStatus(status) { const value = String(status || "").toLowerCase(); if (value.includes("conclu") || value === "estudado" || value === "dominado") return "Concluído"; if (value.includes("andamento") || value.includes("iniciado")) return "Iniciado"; if (value.includes("revis")) return "Revisado"; return "Não iniciado"; }

function canonical(value) { return normalizeText(value).toLowerCase(); }
function getSyllabusDisciplines() { return [...new Set(state.syllabusItems.map((item) => normalizeText(item.discipline)).filter(Boolean))].sort((a, b) => a.localeCompare(b)); }
function getAllDisciplines() { return [...new Set([...state.subjects.map((subject) => normalizeText(subject.name)), ...getSyllabusDisciplines()].filter(Boolean))].sort((a, b) => a.localeCompare(b)); }
function subjectForDiscipline(discipline) { return state.subjects.find((subject) => canonical(subject.name) === canonical(discipline)); }
function ensureSubjectForDiscipline(discipline) {
  const name = normalizeText(discipline) || "Sem disciplina";
  const existing = subjectForDiscipline(name);
  if (existing) return existing;
  const subject = { id: createId(), name, goalHours: 0, importedFromSyllabus: true };
  state.subjects.push(subject);
  return subject;
}
function migrateImportedDisciplines() {
  state.syllabusItems.forEach((item) => {
    item.id ||= createId();
    item.discipline = normalizeText(item.discipline) || "Sem disciplina";
    item.topic = normalizeText(item.topic) || "Geral";
    item.subject = normalizeText(item.subject) || "Assunto";
    item.status = normalizeImportedStatus(item.status);
    item.priority = normalizeImportedPriority(item.priority);
    item.domain = normalizeImportedDomain(item.domain);
    item.importKey ||= importKeyFor(item);
    if (item.imported || item.importMeta?.imported) {
      item.imported = true;
      item.importMeta = { ...(item.importMeta || {}), imported: true };
    }
  });
  getSyllabusDisciplines().forEach(ensureSubjectForDiscipline);
}
function studiesForItem(item) {
  const disciplineSubject = subjectForDiscipline(item.discipline);
  const subjectIds = new Set([disciplineSubject?.id].filter(Boolean));
  return state.studies.filter((study) => (study.syllabusItemId === item.id) || (subjectIds.has(study.subjectId) && (!study.topic || canonical(study.topic).includes(canonical(item.subject)) || canonical(item.subject).includes(canonical(study.topic)))));
}
function goalsForItem(item) { return state.dailyGoals.filter((goal) => goal.syllabusItemId === item.id || (canonical(goal.discipline) === canonical(item.discipline) && canonical(goal.subject) === canonical(item.subject))); }
function minutesForItem(item) { return (Number(item.studyMinutes) || 0) + studiesForItem(item).reduce((s, study) => s + (Number(study.minutes) || 0), 0) + goalsForItem(item).reduce((s, goal) => s + (Number(goal.actualMinutes) || 0), 0) + questionLogsForItem(item).reduce((s, log) => s + (Number(log.minutes) || 0), 0); }
function hasCompletedGoal(item) { return goalsForItem(item).some((goal) => goal.status === "Concluída"); }
function isTopicStudied(item) { return completedStatus(item) || minutesForItem(item) > 0 || hasCompletedGoal(item); }
function isTopicStarted(item) { return minutesForItem(item) > 0 && !completedStatus(item); }
function isTopicReviewed(item) { return normalizeProgressStatus(item.status) === "Revisado" || Boolean(item.reviewed || item.lastReviewedAt); }
function questionLogsForItem(item) { return state.questionLogs.filter((log) => log.syllabusItemId === item.id || (canonical(log.discipline) === canonical(item.discipline) && canonical(log.subject) === canonical(item.subject))); }
function hasDiagnosis(item) {
  if (["Em andamento", "Estudado", "Revisar", "Dominado"].includes(item.status)) return true;
  if (item.reviewed || item.lastReviewedAt) return true;
  return studiesForItem(item).some((study) => study.minutes > 0 || study.questions > 0) || questionLogsForItem(item).some((log) => log.total > 0);
}
function isUndiagnosed(item) { return !hasDiagnosis(item); }
function itemPerformance(item) {
  const studyTotals = studiesForItem(item).reduce((acc, study) => ({ questions: acc.questions + (study.questions || 0), correct: acc.correct + (study.correct || 0), wrong: acc.wrong + (study.wrong || 0), blank: acc.blank + (study.blank || 0) }), { questions: 0, correct: 0, wrong: 0, blank: 0 });
  return questionLogsForItem(item).reduce((acc, log) => ({ questions: acc.questions + (log.total || 0), correct: acc.correct + (log.correct || 0), wrong: acc.wrong + (log.wrong || 0), blank: acc.blank + (log.blank || 0) }), studyTotals);
}
function isWeakItem(item) {
  if (item.manualWeak) return true;
  if (isUndiagnosed(item)) return false;
  const performance = itemPerformance(item);
  const answered = performance.correct + performance.wrong;
  const accuracy = answered ? performance.correct / answered : 1;
  const cebraspeNet = performance.correct - performance.wrong;
  return item.domain === "Fraco" || (answered > 0 && accuracy < 0.7) || (performance.wrong >= 3 && performance.wrong > performance.correct) || (performance.questions >= 5 && cebraspeNet <= 0);
}
function setItemStatus(id, status) { const item = state.syllabusItems.find((entry) => entry.id === id); if (item) { item.status = status; render(); } }
function setItemDomain(id, domain, manualWeak = false) { const item = state.syllabusItems.find((entry) => entry.id === id); if (item) { item.domain = domain; item.manualWeak = manualWeak || item.manualWeak; render(); } }
function toggleItemSchedulable(id) { const setting = settingFor(id); setting.availability = setting.availability === "Agendável" ? "Não agendável" : "Agendável"; render(); }
function editSyllabusItem(id) {
  const item = state.syllabusItems.find((entry) => entry.id === id);
  if (!item) return;
  elements.itemDiscipline.value = item.discipline; elements.itemTopic.value = item.topic; elements.itemSubject.value = item.subject; elements.itemSubtopic.value = item.subtopic || ""; elements.itemReference.value = item.reference || ""; elements.itemPriority.value = item.priority; elements.itemWeight.value = item.weight || 1; elements.itemStatus.value = item.status; elements.itemDomain.value = item.domain; elements.itemNotes.value = item.notes || "";
  editingSyllabusId = id;
  showView("edital-verticalizado");
}


function normalizeImportedStatus(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (["concluído", "concluido"].includes(normalized)) return "Estudado";
  const allowed = ["Não iniciado", "Em andamento", "Estudado", "Revisar", "Dominado", "Ignorado"];
  return allowed.find((item) => item.toLowerCase() === normalized) || "Não iniciado";
}
function normalizeImportedPriority(value) { const allowed = ["Alta", "Média", "Baixa"]; return allowed.find((item) => item.toLowerCase() === String(value || "").trim().toLowerCase()) || "Média"; }
function normalizeImportedDomain(value) { const allowed = ["Sem diagnóstico", "Não avaliado", "Fraco", "Médio", "Forte"]; return allowed.find((item) => item.toLowerCase() === String(value || "").trim().toLowerCase()) || "Sem diagnóstico"; }
function isTruthyImportValue(value) { if (value === undefined || value === null || value === "") return true; return [true, "true", "sim", "s", "1", "agendável", "agendavel", "yes", "y"].includes(typeof value === "string" ? value.trim().toLowerCase() : value); }
function normalizeImportPayload(payload) {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === "object" && Array.isArray(payload.itens)) return payload.itens;
  if (payload && typeof payload === "object" && Array.isArray(payload.items)) return payload.items;
  return null;
}
function resetImportDraft(message = "") {
  importDraft = [];
  elements.importMessage.innerHTML = message;
  renderImportPreview();
}
function showImportError(message, error) {
  console.error(message, error);
  resetImportDraft(message);
}
function normalizeImportedMode(value) {
  const normalized = String(value || "").trim().toLowerCase();
  const allowed = ["Revisão apenas", "Questões apenas", "Estudo teórico", "Estudo + questões"];
  return allowed.find((item) => item.toLowerCase() === normalized) || "Estudo + questões";
}
function importedItemToSyllabus(raw) {
  raw ||= {};
  const id = createId();
  const discipline = String(raw.disciplina || "Sem disciplina").trim() || "Sem disciplina";
  const subject = String(raw.assunto || raw.referencia_edital || "Assunto").trim() || "Assunto";
  const topic = String(raw.eixo || raw.nivel || "Geral").trim() || "Geral";
  const notesParts = [raw.observacoes, raw.fonte ? `Fonte: ${raw.fonte}` : "", raw.concurso ? `Concurso: ${raw.concurso}` : "", raw.banca ? `Banca: ${raw.banca}` : "", raw.cargo ? `Cargo: ${raw.cargo}` : "", raw.parent_referencia ? `Referência pai: ${raw.parent_referencia}` : ""].filter(Boolean);
  return {
    id,
    discipline,
    topic,
    subject,
    subtopic: String(raw.nivel || "").trim(),
    reference: String(raw.referencia_edital || "").trim(),
    priority: normalizeImportedPriority(raw.prioridade),
    weight: Number(raw.peso) || 1,
    status: normalizeImportedStatus(raw.status),
    domain: normalizeImportedDomain(raw.dominio || raw.domain || raw.diagnostico),
    notes: notesParts.join(" • "),
    imported: true,
    importKey: "",
    importMeta: {
      concurso: raw.concurso || "", banca: raw.banca || "", cargo: raw.cargo || "", eixo: raw.eixo || "", parent_referencia: raw.parent_referencia || "", fonte: raw.fonte || "",
      agendavel: isTruthyImportValue(raw.agendavel), tipo_agendamento: normalizeImportedMode(raw.tipo_agendamento), imported: true
    }
  };
}
function prepareImportedItem(raw) { const item = importedItemToSyllabus(raw); item.importKey = importKeyFor(item); return item; }
function getFilteredImportItems() { return importDraft.filter((item) => (!elements.importFilterDiscipline.value || item.discipline === elements.importFilterDiscipline.value) && (!elements.importFilterStatus.value || item.status === elements.importFilterStatus.value) && (!elements.importFilterPriority.value || item.priority === elements.importFilterPriority.value) && (!elements.importFilterDomain.value || item.domain === elements.importFilterDomain.value)); }
function renderImportFilters() {
  [[elements.importFilterDiscipline, importDraft.map((item) => item.discipline), "Todas"], [elements.importFilterStatus, importDraft.map((item) => item.status), "Todos"], [elements.importFilterPriority, importDraft.map((item) => item.priority), "Todas"], [elements.importFilterDomain, importDraft.map((item) => item.domain), "Todos"]].forEach(([select, values, label]) => {
    const current = select.value; const options = [...new Set(values.filter(Boolean))].sort(); select.innerHTML = `<option value="">${label}</option>` + options.map((value) => `<option ${value === current ? "selected" : ""}>${escapeHTML(value)}</option>`).join("");
  });
}
function renderImportPreview() {
  renderImportFilters();
  const filtered = getFilteredImportItems();
  elements.importDisciplineTotal.textContent = new Set(importDraft.map((item) => item.discipline)).size;
  elements.importSubjectTotal.textContent = importDraft.length;
  elements.importJsonButton.disabled = !importDraft.length;
  const disciplines = [...new Set(importDraft.map((item) => item.discipline).filter(Boolean))].sort();
  elements.importDisciplineList.innerHTML = disciplines.length ? `<h3>Disciplinas identificadas</h3><div class="tag-list">${disciplines.map((discipline) => `<span>${escapeHTML(discipline)}</span>`).join("")}</div>` : "";
  const previewItems = filtered.slice(0, 10);
  elements.importPreview.innerHTML = previewItems.length ? `<p class="item-meta">Exemplo dos primeiros itens importados${filtered.length > previewItems.length ? ` (${previewItems.length} de ${filtered.length} filtrados)` : ""}.</p><table><thead><tr><th>Disciplina</th><th>Eixo/Tópico</th><th>Assunto</th><th>Referência</th><th>Status</th><th>Prioridade</th><th>Domínio</th><th>Agendável</th></tr></thead><tbody>${previewItems.map((item) => `<tr><td>${escapeHTML(item.discipline)}</td><td>${escapeHTML(item.topic)}</td><td>${escapeHTML(item.subject)}</td><td>${escapeHTML(item.reference || "-")}</td><td>${escapeHTML(item.status)}</td><td>${escapeHTML(item.priority)}</td><td>${escapeHTML(item.domain)}</td><td>${item.importMeta.agendavel ? "Sim" : "Não"}</td></tr>`).join("")}</tbody></table>` : "";
}

function renderSubjects() {
  migrateImportedDisciplines();
  const disciplines = getAllDisciplines();
  elements.subjectList.innerHTML = "";
  elements.studySubject.innerHTML = disciplines.length ? "" : '<option value="">Cadastre ou importe uma disciplina</option>';
  elements.disciplineOptions.innerHTML = disciplines.map((discipline) => `<option value="${escapeHTML(discipline)}"></option>`).join("");
  disciplines.forEach((discipline) => {
    const subject = ensureSubjectForDiscipline(discipline);
    const option = document.createElement("option"); option.value = subject.id; option.textContent = subject.name; elements.studySubject.appendChild(option);
    const weeklyMinutes = state.studies.filter((study) => study.subjectId === subject.id && isSameWeek(study.date)).reduce((sum, study) => sum + study.minutes, 0);
    const imported = getSyllabusDisciplines().some((name) => canonical(name) === canonical(subject.name));
    const li = document.createElement("li"); li.className = "subject-item"; li.innerHTML = `<div><strong>${escapeHTML(subject.name)}</strong><div class="item-meta">${imported ? "Disciplina do edital importado • " : ""}Meta: ${subject.goalHours}h/semana • Atual: ${formatHours(weeklyMinutes)}</div></div><span class="badge">${Math.min(100, Math.round((weeklyMinutes / (subject.goalHours * 60 || 1)) * 100))}%</span>`; elements.subjectList.appendChild(li);
  });
}

function planningConfig() { return state.planning.config; }
function availabilityDefaults(type) { const c = planningConfig(); return { "plantão": c.shiftHours, "folga": c.restHours, "dia normal": c.normalHours, "indisponível": 0, "estudo leve": Math.max(1, c.normalHours / 2), "estudo forte": Math.max(c.restHours, c.normalHours * 1.5) }[type] ?? c.normalHours; }
const SCALE_3X6_LABELS = ["Trabalho dia 1", "Trabalho dia 2", "Trabalho dia 3", "Folga dia 1", "Folga dia 2", "Folga dia 3", "Folga dia 4", "Folga dia 5", "Folga dia 6"];
function daysDiff(a, b) { return Math.round((parseDate(a) - parseDate(b)) / 86400000); }
function scale3x6Info(date) {
  const c = planningConfig();
  if (c.scaleType !== "3 dias de trabalho / 6 dias de folga" || !c.scaleReferenceDate) return null;
  const pos = ((Number(c.scaleReferencePosition) + daysDiff(date, c.scaleReferenceDate)) % 9 + 9) % 9;
  const work = pos <= 2;
  return { position: pos, label: SCALE_3X6_LABELS[pos], type: work ? "plantão" : "folga", hours: availabilityDefaults(work ? "plantão" : "folga") };
}
function availabilityForDate(date) { const existing = state.planning.availability[date]; if (existing) return existing; const scale = scale3x6Info(date); if (scale) return { type: scale.type, label: scale.label, hours: scale.hours, scalePosition: scale.position }; return { type: "dia normal", label: "Normal", hours: availabilityDefaults("dia normal") }; }
function dayTypeLabel(av) { return av.label || ({"plantão":"Plantão","folga":"Folga","dia normal":"Normal","indisponível":"Indisponível"}[av.type] || av.type || "Normal"); }
function nextDateByType(type) { for (let i=0;i<60;i++){ const d=addDays(todayISO(), i); if (availabilityForDate(d).type===type) return d; } return ""; }
function periodSummary(start, days) { const dates=daysBetween(start, days), goals=goalsBetween(start, addDays(start, days-1)); const planned=goals.reduce((a,g)=>a+Number(g.minutes||0),0); const done=goals.reduce((a,g)=>a+Number(g.actualMinutes||0),0); return { dates, goals, planned, done, pending: goals.filter(g=>!isGoalDone(g)).length, completed: goals.filter(isGoalDone).length, disciplines: new Set(goals.map(g=>g.discipline)).size, percent: planned ? Math.min(100, Math.round(done/planned*100)) : completionRate(goals), subjects: goals.length }; }

function getStudyTimeLogs() {
  const studyLogs = state.studies.map((study) => ({ date: study.date, discipline: subjectNameById(study.subjectId), subject: study.topic, minutes: Number(study.minutes) || 0, plannedMinutes: Number(study.plannedMinutes) || 0, type: "Estudo", status: study.topicStatus || "Iniciado", notes: study.difficultyNotes || "", materialId: study.materialId || "", material: state.materials.find((m)=>m.id===study.materialId)?.title || "" }));
  const goalLogs = state.dailyGoals.filter((goal) => Number(goal.actualMinutes) > 0).map((goal) => ({ date: goal.date, discipline: goal.discipline, subject: goal.subject, minutes: Number(goal.actualMinutes) || 0, plannedMinutes: Number(goal.minutes) || 0, type: goal.type || goal.tipo || "Meta", status: goal.studyStatus || goal.status || "Iniciado", notes: goal.notes || goal.observacoes || "" }));
  const questionLogs = state.questionLogs.filter((log) => Number(log.minutes) > 0).map((log) => ({ date: log.date, discipline: log.discipline, subject: log.subject, minutes: Number(log.minutes) || 0, plannedMinutes: 0, type: log.trainingType || "Questões", status: "Concluído", notes: log.notes || "" }));
  return [...studyLogs, ...goalLogs, ...questionLogs];
}
function planningMetrics() {
  const total = state.syllabusItems.length;
  const completed = state.syllabusItems.filter(isTopicStudied).length;
  const pending = Math.max(0, total - completed);
  const logs = getStudyTimeLogs();
  const totalMinutes = logs.reduce((sum, log) => sum + log.minutes, 0);
  const completedWithTime = Math.max(1, new Set(logs.map((log) => `${canonical(log.discipline)}|${canonical(log.subject)}`)).size || completed || 1);
  const avgMinutes = totalMinutes ? totalMinutes / completedWithTime : 60;
  const remainingMinutes = pending * avgMinutes;
  const weekStudiedDates = [...new Set(logs.map((log) => log.date))].sort();
  const weeks = weekStudiedDates.length ? Math.max(1, Math.ceil((parseDate(weekStudiedDates.at(-1)) - parseDate(weekStudiedDates[0])) / 604800000) + 1) : 1;
  const avgTopicsWeek = completed / weeks;
  let forecastDate = "";
  let cursor = todayISO(); let remainingHours = remainingMinutes / 60;
  for (let i = 0; i < 730 && remainingHours > 0; i++) { const av = availabilityForDate(cursor); remainingHours -= Number(av.hours) || 0; if (remainingHours <= 0) forecastDate = cursor; cursor = addDays(cursor, 1); }
  const exam = planningConfig().examDate || state.edital.examDate || "";
  const diffDays = forecastDate && exam ? Math.ceil((parseDate(exam) - parseDate(forecastDate)) / 86400000) : null;
  const safeDiff = diffDays === null ? null : diffDays - (Number(planningConfig().safetyDays) || 0);
  return { total, completed, pending, percent: total ? Math.round(completed / total * 100) : 0, avgTopicsWeek, avgMinutes, totalEstimatedMinutes: total * avgMinutes, totalMinutes, remainingMinutes, forecastDate, examDate: exam, diffDays, safeDiff };
}
function weekAvailability(start = todayISO()) { let total = 0; const days = []; for (let i=0;i<7;i++){ const date=addDays(start,i); const av=availabilityForDate(date); total += Number(av.hours)||0; days.push({date,...av}); } return { total, days }; }

function planningSituation(metrics) { return metrics.safeDiff === null ? "sem prova" : metrics.safeDiff < 0 ? "atrasado" : metrics.safeDiff <= 7 ? "em dia" : "adiantado"; }
function progressStatusClass(status) { return status === "adiantado" ? "success" : status === "atrasado" ? "danger" : "warn"; }
function progressMetrics() {
  migrateImportedDisciplines();
  const total = state.syllabusItems.length;
  const studiedItems = state.syllabusItems.filter(isTopicStudied);
  const startedItems = state.syllabusItems.filter(isTopicStarted);
  const reviewedItems = state.syllabusItems.filter(isTopicReviewed);
  const pendingItems = state.syllabusItems.filter((item) => !isTopicStudied(item));
  const studied = studiedItems.length;
  const percent = total ? Math.round((studied / total) * 100) : 0;
  const totalMinutes = state.syllabusItems.reduce((sum, item) => sum + minutesForItem(item), 0);
  const avgMinutes = studied ? totalMinutes / studied : 0;
  const plan = planningMetrics();
  const remainingMinutes = pendingItems.length * (avgMinutes || plan.avgMinutes || 60);
  const forecastDate = plan.forecastDate;
  const situation = planningSituation(plan);
  const disciplines = Object.values(state.syllabusItems.reduce((acc, item) => {
    const key = item.discipline || "Sem disciplina";
    acc[key] ||= { discipline: key, total: 0, studied: 0, pending: 0, minutes: 0 };
    acc[key].total += 1;
    acc[key].minutes += minutesForItem(item);
    if (isTopicStudied(item)) acc[key].studied += 1; else acc[key].pending += 1;
    return acc;
  }, {})).map((d) => {
    d.percent = d.total ? Math.round(d.studied / d.total * 100) : 0;
    d.avgMinutes = d.studied ? d.minutes / d.studied : 0;
    d.status = d.percent + 10 < percent ? "atrasada" : d.percent >= percent + 10 ? "adiantada" : "em dia";
    return d;
  }).sort((a,b) => a.percent - b.percent || b.pending - a.pending);
  const slowThreshold = Math.max(180, (plan.avgMinutes || avgMinutes || 0) * 1.5);
  const alerts = [];
  if (!studied && !totalMinutes) alerts.push("Ainda não há dados suficientes para prever o término. Registre estudos ou marque assuntos como concluídos.");
  else if (plan.diffDays !== null && plan.diffDays < 0) alerts.push("No ritmo atual, o edital não será concluído antes da prova.");
  else if (plan.forecastDate) alerts.push("No ritmo atual, o edital será concluído antes da prova.");
  disciplines.filter((d) => d.status === "atrasada").slice(0, 3).forEach((d) => alerts.push(`${d.discipline}: esta disciplina está atrasada em relação ao restante do edital.`));
  if (avgMinutes > slowThreshold) alerts.push("Seu tempo médio por assunto está elevado. Avalie dividir o assunto em blocos menores.");
  return { total, studied, started: startedItems.length, pending: pendingItems.length, reviewed: reviewedItems.length, percent, totalMinutes, avgMinutes, remainingMinutes, forecastDate, examDate: plan.examDate, daysUntilExam: plan.examDate ? Math.ceil((parseDate(plan.examDate) - parseDate(todayISO())) / 86400000) : null, situation, disciplines, alerts };
}
function progressBar(percentValue) { return `<div class="progress"><span style="width:${Math.max(0, Math.min(100, percentValue))}%"></span></div>`; }
function renderProgressPanel() {
  if (!elements.progressGeneralCards) return;
  const m = progressMetrics();
  const cards = [["Total de assuntos", m.total], ["Assuntos estudados", m.studied], ["Assuntos iniciados", m.started], ["Assuntos pendentes", m.pending], ["Assuntos revisados", m.reviewed], ["Percentual geral", `${m.percent}%`], ["Horas totais estudadas", formatHours(m.totalMinutes)], ["Tempo médio por assunto", m.avgMinutes ? formatHours(m.avgMinutes) : "-"], ["Horas estimadas restantes", formatHours(m.remainingMinutes)], ["Previsão de conclusão", formatDateBR(m.forecastDate)], ["Dias restantes até a prova", m.daysUntilExam ?? "-"], ["Situação do planejamento", m.situation]];
  elements.progressGeneralCards.innerHTML = cards.map(([label, value]) => `<article class="stat-card"><span>${label}</span><strong class="stat-value-compact">${escapeHTML(value)}</strong></article>`).join("");
  elements.progressMainBar.innerHTML = `<h3>${m.studied} de ${m.total} assuntos estudados — ${m.percent}%</h3>${progressBar(m.percent)}`;
  elements.progressAlerts.innerHTML = m.alerts.map((alert) => `<div class="alert-item"><span class="badge ${alert.includes("não será") || alert.includes("atrasada") ? "danger" : "warn"}">Alerta</span><div>${escapeHTML(alert)}</div></div>`).join("");
  elements.progressDisciplines.innerHTML = m.disciplines.map((d) => `<article class="syllabus-card"><header><div><h3>${escapeHTML(d.discipline)}</h3><div class="item-meta">${d.studied} de ${d.total} estudados • ${d.pending} pendentes • ${formatHours(d.minutes)} estudadas</div></div><span class="badge ${progressStatusClass(d.status.replace("atrasada", "atrasado").replace("adiantada", "adiantado"))}">${d.status}</span></header>${progressBar(d.percent)}<div class="card-meta-grid"><span>Total: ${d.total}</span><span>Estudados: ${d.studied}</span><span>Pendentes: ${d.pending}</span><span>Concluído: ${d.percent}%</span><span>Horas estudadas: ${formatHours(d.minutes)}</span><span>Tempo médio/assunto: ${d.avgMinutes ? formatHours(d.avgMinutes) : "-"}</span></div></article>`).join("");
}
function renderDashboardProgressSummary() {
  if (!elements.dashboardProgressSummary) return;
  const m = progressMetrics(); const lag = m.disciplines[0];
  elements.dashboardProgressSummary.innerHTML = `<div><strong>${m.percent}%</strong><span>${m.studied}/${m.total} assuntos estudados</span>${progressBar(m.percent)}</div><div class="card-meta-grid"><span>Previsão: ${escapeHTML(formatDateBR(m.forecastDate))}</span><span>Mais atrasada: ${escapeHTML(lag ? `${lag.discipline} (${lag.percent}%)` : "-")}</span><span>Horas restantes: ${formatHours(m.remainingMinutes)}</span><span>Situação: ${escapeHTML(m.situation)}</span></div>`;
}
function updateItemProgress(id, patch = {}) { const item = getSyllabusById(id); if (!item) return; Object.assign(item, patch, { updatedAt: new Date().toISOString() }); }
function findSyllabusItemByStudy(subjectId, topic) { const discipline = subjectNameById(subjectId); return state.syllabusItems.find((item) => canonical(item.discipline) === canonical(discipline) && (canonical(topic).includes(canonical(item.subject)) || canonical(item.subject).includes(canonical(topic)))); }

function renderPlanning() {
  if (!elements.planningConfigForm) return;
  const c = planningConfig();
  elements.planningExamDate.value = c.examDate || state.edital.examDate || ""; elements.planningScaleType.value = c.scaleType; if (elements.planningScaleReferenceDate) elements.planningScaleReferenceDate.value = c.scaleReferenceDate || todayISO(); if (elements.planningScaleReferencePosition) elements.planningScaleReferencePosition.value = String(Number(c.scaleReferencePosition)||0); if (elements.scale3x6Fields) elements.scale3x6Fields.hidden = c.scaleType !== "3 dias de trabalho / 6 dias de folga"; elements.planningScaleNotes.value = c.scaleNotes || ""; elements.planningShiftHours.value = c.shiftHours; elements.planningRestHours.value = c.restHours; elements.planningNormalHours.value = c.normalHours; elements.planningMinWeeklyHours.value = c.minWeeklyHours; elements.planningIdealWeeklyHours.value = c.idealWeeklyHours; elements.planningWeeklyTopics.value = c.weeklyTopics; elements.planningDisciplinesPerDay.value = c.disciplinesPerDay; elements.planningDisciplinesPerWeek.value = c.disciplinesPerWeek; elements.planningDisciplinesPerMonth.value = c.disciplinesPerMonth; elements.planningTopicsPerDay.value = c.topicsPerDay; elements.planningTopicsPerWeek.value = c.topicsPerWeek; elements.planningTopicsPerMonth.value = c.topicsPerMonth; elements.planningSafetyDays.value = c.safetyDays;
  elements.availabilityCalendar.innerHTML = Array.from({length: 21}, (_, i) => { const date = addDays(todayISO(), i); const av = availabilityForDate(date); return `<article class="syllabus-card"><header><div><h3>${formatDateBR(date)}</h3><div class="item-meta">Horas estimadas editáveis para este dia.</div></div></header><div class="card-actions"><label>Tipo <select data-availability-type="${date}">${["plantão","folga","dia normal","indisponível","estudo leve","estudo forte"].map((t)=>`<option ${av.type===t?"selected":""}>${t}</option>`).join("")}</select></label><label>Horas <input data-availability-hours="${date}" type="number" min="0" step="0.5" value="${av.hours}"></label></div></article>`; }).join("");
  const m = planningMetrics(); state.planning.forecasts = { ...m, updatedAt: new Date().toISOString() };
  const cards = [["Total de assuntos",m.total],["Concluídos",m.completed],["Pendentes",m.pending],["Edital estudado",`${m.percent}%`],["Assuntos/semana",m.avgTopicsWeek.toFixed(1)],["Tempo médio/assunto",formatHours(m.avgMinutes)],["Horas estimadas",formatHours(m.totalEstimatedMinutes)],["Horas já estudadas",formatHours(m.totalMinutes)],["Horas restantes",formatHours(m.remainingMinutes)],["Conclusão prevista",formatDateBR(m.forecastDate)],["Diferença para prova",m.diffDays===null?"-":`${m.diffDays} dias`]];
  elements.completionForecast.innerHTML = cards.map(([a,b])=>`<article class="stat-card"><span>${a}</span><strong class="stat-value-compact">${b}</strong></article>`).join("");
  elements.completionAlert.textContent = m.diffDays !== null && m.diffDays < 0 ? "No ritmo atual, o edital não será concluído antes da prova." : "No ritmo atual, o edital será concluído antes da prova.";
  const w = weekAvailability(); const possibleTopics = Math.floor((w.total*60)/(m.avgMinutes||60)); const neededWeeks = m.examDate ? Math.max(1, Math.ceil((parseDate(m.examDate)-parseDate(todayISO()))/604800000)) : 1; const neededTopics = Math.ceil(m.pending/neededWeeks); const suggested = Math.max(0, Math.min(m.pending, Math.max(possibleTopics, neededTopics, Number(c.weeklyTopics)||0)));
  elements.weeklyGoalsPlan.innerHTML = [["Horas disponíveis",`${w.total.toFixed(1)}h`],["Assuntos sugeridos",suggested],["Horas sugeridas/dia",`${(w.total/7).toFixed(1)}h`],["Meta mínima",`${c.minWeeklyHours}h`],["Meta ideal",`${c.idealWeeklyHours}h`]].map(([a,b])=>`<article class="stat-card"><span>${a}</span><strong class="stat-value-compact">${b}</strong></article>`).join("");
  elements.weeklyGoalsAlert.textContent = w.total < c.minWeeklyHours ? "Alerta: semana abaixo da meta mínima; compense nas folgas quando possível." : (m.safeDiff !== null && m.safeDiff < 0 ? "Alerta: planejamento atrasado para a margem de segurança." : "Planejamento em dia ou adiantado para a rotina informada.");
  const logs = getStudyTimeLogs().sort((a,b)=>b.date.localeCompare(a.date)); const byDisc = logs.reduce((a,l)=>(a[l.discipline]=(a[l.discipline]||0)+l.minutes,a),{}); const top = Object.entries(byDisc).sort((a,b)=>b[1]-a[1])[0];
  elements.timeHistorySummary.innerHTML = [["Hoje",formatHours(logs.filter(l=>l.date===todayISO()).reduce((s,l)=>s+l.minutes,0))],["Semana",formatHours(logs.filter(l=>isSameWeek(l.date)).reduce((s,l)=>s+l.minutes,0))],["Edital",formatHours(m.totalMinutes)],["Disciplina mais estudada",top?`${top[0]} (${formatHours(top[1])})`:"-"]].map(([a,b])=>`<article class="stat-card"><span>${a}</span><strong>${escapeHTML(b)}</strong></article>`).join("");
  elements.timeHistoryBody.innerHTML = logs.slice(0,50).map((l)=>`<tr><td>${formatDateBR(l.date)}</td><td>${escapeHTML(l.discipline)}</td><td>${escapeHTML(l.subject)}</td><td>${l.minutes} min</td><td>${escapeHTML(l.type)}</td><td>${escapeHTML(l.status)}</td><td>${escapeHTML(l.material || "-")}</td><td>${escapeHTML(l.notes||"-")}</td></tr>`).join("");
}

function renderDashboard() {
  renderSmartReviewSummary();
  const today = todayISO(); const todayMinutes = state.studies.filter((study) => study.date === today).reduce((sum, study) => sum + study.minutes, 0); const weekMinutes = state.studies.filter((study) => isSameWeek(study.date)).reduce((sum, study) => sum + study.minutes, 0); const totalQuestions = state.studies.reduce((sum, study) => sum + study.questions, 0); const correct = state.studies.reduce((sum, study) => sum + study.correct, 0);
  const total = state.syllabusItems.length; const studied = state.syllabusItems.filter(completedStatus).length; const weak = state.syllabusItems.filter(isWeakItem).length; const undiagnosed = state.syllabusItems.filter(isUndiagnosed).length; const notStarted = state.syllabusItems.filter((item) => item.status === "Não iniciado").length;
  const pendingByDiscipline = state.syllabusItems.filter((item) => !completedStatus(item) && item.status !== "Ignorado").reduce((acc, item) => ({ ...acc, [item.discipline]: (acc[item.discipline] || 0) + 1 }), {}); const topPending = Object.entries(pendingByDiscipline).sort((a, b) => b[1] - a[1])[0];
  const questionTotals = getQuestionTotals(); const pendingGoals = state.dailyGoals.filter((goal) => goal.date === today && goal.status === "Pendente").length; const doneGoals = state.dailyGoals.filter((goal) => goal.date === today && goal.status === "Concluída").length;
  elements.todayHours.textContent = formatHours(todayMinutes); elements.weekHours.textContent = formatHours(weekMinutes); elements.weeklyGoalStatus.textContent = `${formatHours(weekMinutes)} registradas`; elements.totalQuestions.textContent = questionTotals.total || totalQuestions; elements.accuracyRate.textContent = questionTotals.total ? `${Math.round(questionTotals.correct / questionTotals.total * 100)}%` : (totalQuestions ? `${Math.round((correct / totalQuestions) * 100)}%` : "0%"); elements.generalCebraspeNet.textContent = questionTotals.net; elements.todayPendingGoals.textContent = pendingGoals; elements.todayDoneGoals.textContent = doneGoals;
  const progress = progressMetrics(); const plan = planningMetrics(); renderDashboardProgressSummary(); if (elements.totalStudyTime) elements.totalStudyTime.textContent = formatHours(plan.totalMinutes); if (elements.averageTimePerTopic) elements.averageTimePerTopic.textContent = formatHours(plan.avgMinutes); if (elements.dashboardCompletionForecast) elements.dashboardCompletionForecast.textContent = formatDateBR(plan.forecastDate); if (elements.daysUntilExam) elements.daysUntilExam.textContent = plan.examDate ? Math.ceil((parseDate(plan.examDate) - parseDate(todayISO())) / 86400000) : "-"; if (elements.planningStatus) elements.planningStatus.textContent = plan.safeDiff === null ? "sem prova" : plan.safeDiff < 0 ? "atrasado" : plan.safeDiff <= 7 ? "em dia" : "adiantado";
  if (elements.syllabusStudied) elements.syllabusStudied.textContent = `${progress.percent}%`; if (elements.dashboardStudiedTopics) elements.dashboardStudiedTopics.textContent = studied; if (elements.syllabusTotal) elements.syllabusTotal.textContent = total; if (elements.schedulableTotal) elements.schedulableTotal.textContent = state.syllabusItems.filter((item) => isSchedulable(item.id)).length; if (elements.notStartedTotal) elements.notStartedTotal.textContent = notStarted; if (elements.undiagnosedTotal) elements.undiagnosedTotal.textContent = undiagnosed; if (elements.weakTotal) elements.weakTotal.textContent = weak; if (elements.pendingDiscipline) elements.pendingDiscipline.textContent = topPending ? `${topPending[0]} (${topPending[1]})` : "-";
  if (elements.dashboardQuestionBankTotal) elements.dashboardQuestionBankTotal.textContent = state.questionBank?.length || 0;
  if (elements.dashboardQuestionBankSessions) elements.dashboardQuestionBankSessions.textContent = state.questionBankSessions?.length || 0;
  if (elements.dashboardQuestionBankLast) elements.dashboardQuestionBankLast.textContent = state.questionBankSessions?.[0] ? new Date(state.questionBankSessions[0].createdAt).toLocaleString("pt-BR") : "-";
  const qbPackageSummary = qbSyllabusPackageSummary();
  if (elements.dashboardQuestionBankPackages) elements.dashboardQuestionBankPackages.textContent = qbPackageSummary.packages;
  if (elements.dashboardQuestionBankLinked) elements.dashboardQuestionBankLinked.textContent = qbPackageSummary.linked;
  if (elements.dashboardQuestionBankMissing) elements.dashboardQuestionBankMissing.textContent = qbPackageSummary.missing;
  if (elements.dashboardMinWeeklyHours) elements.dashboardMinWeeklyHours.textContent = `${planningConfig().minWeeklyHours || 0}h`; if (elements.dashboardIdealWeeklyHours) elements.dashboardIdealWeeklyHours.textContent = `${planningConfig().idealWeeklyHours || 0}h`; if (elements.dashboardProblemDiscipline) elements.dashboardProblemDiscipline.textContent = problemQuestionDiscipline(); const todayGoals = state.dailyGoals.filter((g)=>g.date===todayISO()); const wsDash = weekStart(todayISO()), weDash = addDays(wsDash,6), weekGoals = goalsBetween(wsDash,weDash); if (elements.dashboardTodayDisciplines) elements.dashboardTodayDisciplines.textContent = new Set(todayGoals.map((g)=>g.discipline)).size; if (elements.dashboardTodayTopics) elements.dashboardTodayTopics.textContent = todayGoals.length; if (elements.dashboardWeekDisciplines) elements.dashboardWeekDisciplines.textContent = new Set(weekGoals.map((g)=>g.discipline)).size; if (elements.dashboardWeekTopics) elements.dashboardWeekTopics.textContent = weekGoals.length;
  if (elements.materialsTotal) { elements.materialsTotal.textContent = state.materials.length; elements.materialDisciplinesTotal.textContent = new Set(state.materials.map((m)=>canonical(m.discipline)).filter(Boolean)).size; elements.materialTopicsTotal.textContent = new Set(state.materials.map((m)=>`${canonical(m.discipline)}|${canonical(m.subject)}`).filter((v)=>v!=="|")).size; }
  const ms = mockStats(); if (elements.mockTotal) elements.mockTotal.textContent = ms.count; if (elements.mockLastNet) elements.mockLastNet.textContent = ms.last; if (elements.mockBestNet) elements.mockBestNet.textContent = ms.best; if (elements.mockAverageNet) elements.mockAverageNet.textContent = ms.average; if (elements.mockAboveGoal) elements.mockAboveGoal.textContent = ms.aboveGoal; if (elements.mockProblemDiscipline) elements.mockProblemDiscipline.textContent = ms.problemDiscipline;
}
function renderEdital() { ["contestName", "agency", "role", "board", "examDate", "officialLink", "generalNotes"].forEach((key) => { elements[key].value = state.edital[key] || ""; }); elements.pdfInfo.innerHTML = state.edital.pdf ? `<strong>Arquivo:</strong> ${escapeHTML(state.edital.pdf.name)}<br><span class="item-meta">Anexado em ${escapeHTML(state.edital.pdf.attachedAt)}</span>` : ""; }
function getFilteredItems() {
  const term = canonical(elements.filterSearch.value);
  return state.syllabusItems.filter((item) => {
    const haystack = [item.discipline, item.topic, item.subject, item.subtopic, item.reference, item.notes].map(canonical).join(" ");
    return (!term || haystack.includes(term))
      && (!elements.filterDiscipline.value || item.discipline === elements.filterDiscipline.value)
      && (!elements.filterPriority.value || item.priority === elements.filterPriority.value)
      && (!elements.filterStatus.value || item.status === elements.filterStatus.value)
      && (!elements.filterDomain.value || item.domain === elements.filterDomain.value)
      && (!elements.filterSchedulable.value || (elements.filterSchedulable.value === "yes" ? isSchedulable(item.id) : !isSchedulable(item.id)))
      && (!elements.filterQuick.value || (elements.filterQuick.value === "schedulable" && isSchedulable(item.id)) || (elements.filterQuick.value === "notStarted" && item.status === "Não iniciado") || (elements.filterQuick.value === "weak" && isWeakItem(item)) || (elements.filterQuick.value === "undiagnosed" && isUndiagnosed(item)));
  });
}
function renderFilters() { const current = elements.filterDiscipline.value; const disciplines = getAllDisciplines(); elements.filterDiscipline.innerHTML = '<option value="">Todas</option>' + disciplines.map((d) => `<option ${d === current ? "selected" : ""}>${escapeHTML(d)}</option>`).join(""); }
function renderSyllabus() {
  renderFilters();
  const filtered = getFilteredItems();
  const visibleItems = filtered.slice(0, syllabusVisibleCount);
  elements.syllabusList.innerHTML = "";
  elements.syllabusCount.textContent = filtered.length ? `Exibindo ${visibleItems.length} de ${filtered.length} assunto(s) filtrado(s).` : "Nenhum assunto encontrado com os filtros atuais.";
  elements.showMoreSyllabus.hidden = visibleItems.length >= filtered.length;
  visibleItems.forEach((item) => {
    const setting = settingFor(item.id);
    const weak = isWeakItem(item);
    const undiagnosed = isUndiagnosed(item);
    const card = document.createElement("article"); card.className = "syllabus-card";
    const linked = materialsForTopic(item.discipline, item.subject, item.id);
    card.innerHTML = `<header><div><h3>${escapeHTML(item.discipline)} — ${escapeHTML(item.subject)}</h3><div class="item-meta">${escapeHTML(item.topic)}${item.subtopic ? ` • ${escapeHTML(item.subtopic)}` : ""}</div></div><span class="badge ${isTopicStudied(item) ? "success" : isTopicStarted(item) ? "warn" : "neutral"}">${escapeHTML(normalizeProgressStatus(item.status))}</span></header><div class="card-meta-grid"><span>Status: ${escapeHTML(item.status)}</span><span>Domínio: ${escapeHTML(item.domain)}</span><span>Diagnóstico: ${undiagnosed ? "Sem diagnóstico" : weak ? "Fraco" : "OK"}</span><span>Tempo no assunto: ${formatHours(minutesForItem(item))}</span><span>Peso: ${escapeHTML(item.weight)}</span><span>Ref.: ${escapeHTML(item.reference || "-")}</span></div>${item.notes ? `<p class="item-meta">${escapeHTML(item.notes)}</p>` : ""}${linkedMaterialsHTML(linked)}<div class="card-actions"><button type="button" data-action="edit" data-id="${item.id}">Editar</button><button type="button" data-action="not-started" data-id="${item.id}">Não iniciado</button><button type="button" data-action="started" data-id="${item.id}">Iniciado</button><button type="button" data-action="studied" data-id="${item.id}">Concluído</button><button type="button" data-action="review" data-id="${item.id}">Revisado</button><button type="button" data-action="weak" data-id="${item.id}">Marcar como fraco</button><button type="button" data-action="schedulable" data-id="${item.id}">${setting.availability === "Agendável" ? "Desativar" : "Ativar"} agendável</button></div><div class="progress-controls"><label>Tempo estudado no assunto (min)<input type="number" min="0" data-progress-field="minutes" data-progress-id="${item.id}" value="${Number(item.studyMinutes) || 0}"></label><label>Observação curta<input type="text" maxlength="140" data-progress-field="notes" data-progress-id="${item.id}" value="${escapeHTML(item.progressNotes || "")}" placeholder="Ex.: revisar exceções"></label></div>`;
    elements.syllabusList.appendChild(card);
  });
}
function renderSchedulable() { elements.schedulableList.innerHTML = ""; state.syllabusItems.forEach((item) => { const setting = settingFor(item.id); const linked = materialsForTopic(item.discipline, item.subject, item.id); const card = document.createElement("article"); card.className = "syllabus-card"; card.innerHTML = `<header><div><h3>${escapeHTML(item.discipline)} — ${escapeHTML(item.subject)}</h3><div class="item-meta">${escapeHTML(item.topic)} • ${escapeHTML(item.status)} • domínio ${escapeHTML(item.domain)}</div></div><span class="badge ${setting.priority ? "danger" : isSchedulable(item.id) ? "success" : "neutral"}">${setting.priority ? "Prioritário" : setting.availability}</span></header><div class="card-actions"><label>Disponibilidade <select data-setting="availability" data-id="${item.id}"><option ${setting.availability === "Agendável" ? "selected" : ""}>Agendável</option><option ${setting.availability === "Não agendável" ? "selected" : ""}>Não agendável</option></select></label><label>Tipo <select data-setting="mode" data-id="${item.id}"><option ${setting.mode === "Revisão apenas" ? "selected" : ""}>Revisão apenas</option><option ${setting.mode === "Questões apenas" ? "selected" : ""}>Questões apenas</option><option ${setting.mode === "Estudo teórico" ? "selected" : ""}>Estudo teórico</option><option ${setting.mode === "Estudo + questões" ? "selected" : ""}>Estudo + questões</option></select></label><label><input type="checkbox" data-setting="priority" data-id="${item.id}" ${setting.priority ? "checked" : ""}> Assunto prioritário</label></div>${linkedMaterialsHTML(linked)}`; elements.schedulableList.appendChild(card); }); }

function lastStudyDateForItem(item) {
  const dates = [
    ...studiesForItem(item).map((study) => study.date),
    ...goalsForItem(item).filter((goal) => isGoalDone(goal) || Number(goal.actualMinutes) > 0).map((goal) => goal.date),
    ...questionLogsForItem(item).filter((log) => Number(log.total) > 0).map((log) => log.date)
  ].filter(Boolean).sort();
  return dates.at(-1) || "";
}
function lastReviewForItem(item, status = "revisado") {
  return state.smartReviews.filter((review) => review.syllabusItemId === item.id && (!status || review.status === status)).sort((a, b) => (b.date || "").localeCompare(a.date || ""))[0];
}
function recentErrorLogForItem(item) {
  return questionLogsForItem(item).filter((log) => Number(log.wrong) > 0).sort((a, b) => (b.date || "").localeCompare(a.date || ""))[0];
}
function smartReviewReason(item) {
  const errorLog = recentErrorLogForItem(item);
  if (errorLog && daysDiff(todayISO(), errorLog.date) <= 14) return { rank: 1, label: "Erro recente em questões" };
  if (isWeakItem(item)) return { rank: 2, label: "Domínio fraco" };
  if (isUndiagnosed(item)) return { rank: 3, label: "Sem diagnóstico" };
  if ((item.priority || "").toLowerCase() === "alta") return { rank: 4, label: "Alta prioridade no edital" };
  const lastStudy = lastStudyDateForItem(item);
  if (lastStudy) {
    const age = daysDiff(todayISO(), lastStudy);
    if ([1, 3, 7, 15, 30].includes(age)) return { rank: 5, label: `Estudado há ${age} dia${age > 1 ? "s" : ""}` };
  }
  if (!lastReviewForItem(item)) return { rank: 6, label: "Nunca revisado" };
  return null;
}
function smartReviewPlan(date = todayISO()) {
  const av = availabilityForDate(date);
  const type = av.type || "dia normal";
  if (type === "indisponível") return { count: 0, minutes: 0, optional: true, label: dayTypeLabel(av) };
  if (type === "plantão") return { count: 1, minutes: 15, label: dayTypeLabel(av) };
  if (type === "folga" || type === "estudo forte") return { count: 3, minutes: 25, label: dayTypeLabel(av) };
  if (type === "estudo leve") return { count: 1, minutes: 20, label: dayTypeLabel(av) };
  return { count: 2, minutes: 20, label: dayTypeLabel(av) };
}
function getSmartReviewSuggestions(date = todayISO()) {
  const plan = smartReviewPlan(date);
  const todaysRecords = state.smartReviews.filter((review) => review.date === date);
  const closed = new Set(todaysRecords.filter((review) => ["revisado", "adiado"].includes(review.status)).map((review) => review.syllabusItemId || `${canonical(review.discipline)}|${canonical(review.subject)}`));
  const existingPending = todaysRecords.filter((review) => review.status === "sugerido");
  const suggestions = existingPending.map((review) => ({ ...review, reason: review.reason || review.origin, minutes: Number(review.minutes) || plan.minutes }));
  const candidates = state.syllabusItems.map((item) => ({ item, reason: smartReviewReason(item), lastStudy: lastStudyDateForItem(item) })).filter(({ item, reason }) => reason && item.status !== "Ignorado" && !closed.has(item.id) && !closed.has(`${canonical(item.discipline)}|${canonical(item.subject)}`) && !suggestions.some((r) => r.syllabusItemId === item.id));
  candidates.sort((a, b) => a.reason.rank - b.reason.rank || (b.lastStudy || "").localeCompare(a.lastStudy || "") || (Number(b.item.weight) || 0) - (Number(a.item.weight) || 0));
  return suggestions.concat(candidates.slice(0, Math.max(0, plan.count - suggestions.length)).map(({ item, reason }) => ({ id: `smart-${date}-${item.id}`, date, discipline: item.discipline, subject: item.subject, syllabusItemId: item.id, origin: reason.label, reason: reason.label, minutes: plan.minutes, status: "sugerido" }))).slice(0, 3);
}
function suggestedMinutesForReview(review) {
  return Number(review.suggestedMinutes ?? review.tempoSugerido ?? review.tempo_sugerido ?? review.minutes) || smartReviewPlan(review.date || todayISO()).minutes || 0;
}
function performedMinutesForReview(review) {
  return Number(review.performedMinutes ?? review.tempoRealizado ?? review.tempo_realizado ?? review.realizedMinutes ?? review.actualMinutes) || 0;
}
function smartReviewCard(review) {
  const suggested = suggestedMinutesForReview(review);
  const performed = performedMinutesForReview(review) || suggested;
  return `<article class="smart-review-card" data-review-card-id="${escapeHTML(review.id)}"><header><div><span class="card-label">Disciplina</span><h4>${escapeHTML(review.discipline)}</h4><span class="card-label">Assunto</span><p>${escapeHTML(review.subject)}</p></div><span class="badge warn no-break">${suggested} min</span></header><div class="review-reason"><strong>Motivo da revisão:</strong> ${escapeHTML(review.reason || review.origin || "Revisão indicada")}</div><div class="review-time-grid"><label>Tempo sugerido (min)<input type="number" min="0" step="5" inputmode="numeric" data-smart-review-time="suggested" data-id="${escapeHTML(review.id)}" value="${suggested}"></label><label>Tempo realizado (min)<input type="number" min="0" step="5" inputmode="numeric" data-smart-review-time="performed" data-id="${escapeHTML(review.id)}" value="${performed}"></label></div><div class="card-actions"><button type="button" data-smart-review-action="done" data-id="${escapeHTML(review.id)}">Marcar como revisado</button><button class="secondary-button" type="button" data-smart-review-action="postpone" data-id="${escapeHTML(review.id)}">Adiar</button></div></article>`;
}
function renderSmartReviewBlock(target, date = todayISO()) {
  if (!target) return;
  const plan = smartReviewPlan(date);
  const suggestions = getSmartReviewSuggestions(date);
  if (!suggestions.length) { target.innerHTML = `<p class="empty-message">${plan.optional ? "Dia indisponível: revisão leve opcional, sem sugestão automática." : "Nenhuma revisão inteligente pendente para hoje."}</p>`; return; }
  target.innerHTML = `<p class="item-meta">${escapeHTML(plan.label)} • até ${suggestions.length} revisão(ões) hoje.</p>` + suggestions.map(smartReviewCard).join("");
}
function renderSmartReviewSummary() {
  const today = todayISO();
  const suggestions = getSmartReviewSuggestions(today);
  const doneToday = state.smartReviews.filter((review) => review.date === today && review.status === "revisado");
  const done = doneToday.length;
  const reasonCounts = suggestions.reduce((acc, review) => (acc[review.reason || review.origin] = (acc[review.reason || review.origin] || 0) + 1, acc), {});
  const mainReason = Object.entries(reasonCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "-";
  if (elements.dashboardSmartReviewSuggested) elements.dashboardSmartReviewSuggested.textContent = suggestions.length;
  if (elements.dashboardSmartReviewDone) elements.dashboardSmartReviewDone.textContent = done;
  if (elements.dashboardSmartReviewReason) elements.dashboardSmartReviewReason.textContent = mainReason;
}
function renderSmartReviewsDashboard() {
  if (!elements.reviewsDashboard) return;
  const today = todayISO();
  const suggested = getSmartReviewSuggestions(today);
  const doneToday = state.smartReviews.filter((review) => review.date === today && review.status === "revisado");
  const todaysTimedReviews = state.smartReviews.filter((review) => review.date === today && ["revisado", "adiado", "sugerido"].includes(review.status));
  const reviewKey = (review) => review.syllabusItemId || `${canonical(review.discipline)}|${canonical(review.subject)}|${review.id}`;
  const timedMap = new Map([...suggested, ...todaysTimedReviews].map((review) => [reviewKey(review), review]));
  const suggestedTotal = [...timedMap.values()].reduce((sum, review) => sum + suggestedMinutesForReview(review), 0);
  const doneTotal = doneToday.reduce((sum, review) => sum + performedMinutesForReview(review), 0);
  const avgDone = doneToday.length ? Math.round(doneTotal / doneToday.length) : 0;
  const done = state.smartReviews.filter((review) => review.status === "revisado").sort((a,b)=>(b.date||"").localeCompare(a.date||""));
  const postponed = state.smartReviews.filter((review) => review.status === "adiado").sort((a,b)=>(b.date||"").localeCompare(a.date||""));
  const history = state.smartReviews.slice().sort((a,b)=>(b.date||"").localeCompare(a.date||""));
  const mini = (items) => items.length ? items.slice(0, 10).map((r)=>`<div class="review-item"><strong>${escapeHTML(r.discipline)} — ${escapeHTML(r.subject)}</strong><div class="item-meta">${formatDateBR(r.date)} • ${escapeHTML(r.status)} • ${escapeHTML(r.reason || r.origin || "-")} • sugerido: ${suggestedMinutesForReview(r)} min${r.status === "revisado" ? ` • realizado: ${performedMinutesForReview(r)} min` : ""}</div></div>`).join("") : '<p class="empty-message">Nenhum registro.</p>';
  elements.reviewsDashboard.innerHTML = `<section><h3>Resumo de tempo hoje</h3><div class="stats-grid compact review-time-summary"><article class="stat-card"><span>Tempo sugerido hoje</span><strong class="no-break">${suggestedTotal} min</strong></article><article class="stat-card"><span>Tempo concluído hoje</span><strong class="no-break">${doneTotal} min</strong></article><article class="stat-card"><span>Média por revisão</span><strong class="no-break">${avgDone} min</strong></article></div></section><section><h3>Sugeridas hoje</h3><div class="smart-review-list">${suggested.length ? suggested.map(smartReviewCard).join("") : '<p class="empty-message">Nenhuma sugestão hoje.</p>'}</div></section><section><h3>Revisões concluídas</h3>${mini(done)}</section><section><h3>Revisões adiadas</h3>${mini(postponed)}</section><section><h3>Histórico de revisões</h3>${mini(history)}</section>`;
}
function cssEscapeValue(value) {
  return globalThis.CSS?.escape ? CSS.escape(value) : String(value).replace(/[^a-zA-Z0-9_-]/g, "\\$&");
}
function upsertSmartReviewTime(id, field, rawValue) {
  const review = getSmartReviewSuggestions(todayISO()).find((item) => item.id === id) || state.smartReviews.find((item) => item.id === id);
  if (!review) return;
  const value = Math.max(0, Number(rawValue) || 0);
  let record = state.smartReviews.find((item) => item.id === id && item.status === "sugerido");
  if (!record) {
    record = { ...review, id, date: todayISO(), origin: review.reason || review.origin, motivo: review.reason || review.origin, status: "sugerido" };
    state.smartReviews.push(record);
  }
  if (field === "suggested") Object.assign(record, { minutes: value, suggestedMinutes: value, tempoSugerido: value, tempo_sugerido: value });
  if (field === "performed") Object.assign(record, { performedMinutes: value, tempoRealizado: value, tempo_realizado: value });
  saveData();
  renderSmartReviewSummary();
  renderSmartReviewsDashboard();
}
function saveSmartReviewAction(id, status) {
  const review = getSmartReviewSuggestions(todayISO()).find((item) => item.id === id) || state.smartReviews.find((item) => item.id === id);
  if (!review) return;
  const suggestedInput = document.querySelector(`[data-smart-review-time="suggested"][data-id="${cssEscapeValue(id)}"]`);
  const performedInput = document.querySelector(`[data-smart-review-time="performed"][data-id="${cssEscapeValue(id)}"]`);
  const suggestedMinutes = Math.max(0, Number(suggestedInput?.value ?? suggestedMinutesForReview(review)) || 0);
  const performedMinutes = Math.max(0, Number(performedInput?.value ?? suggestedMinutes) || 0);
  const payload = { ...review, id: createId(), date: todayISO(), origin: review.reason || review.origin, motivo: review.reason || review.origin, minutes: suggestedMinutes, suggestedMinutes, tempoSugerido: suggestedMinutes, tempo_sugerido: suggestedMinutes, status };
  if (status === "revisado") Object.assign(payload, { performedMinutes, tempoRealizado: performedMinutes, tempo_realizado: performedMinutes });
  state.smartReviews.push(payload);
  if (status === "revisado") { const item = getSyllabusById(review.syllabusItemId); if (item) item.lastReviewedAt = todayISO(); }
  render();
}

function renderReviews() { const today = todayISO(); const reviewWindows = [{ label: "24h", days: 1 }, { label: "7 dias", days: 7 }, { label: "30 dias", days: 30 }]; elements.reviewList.innerHTML = ""; state.studies.forEach((study) => reviewWindows.forEach((window) => { const dueDate = addDays(study.date, window.days); if (dueDate <= today) { const item = document.createElement("div"); item.className = "review-item"; item.innerHTML = `<span class="badge ${dueDate < today ? "danger" : "warn"}">Revisão ${window.label}</span><strong>${escapeHTML(subjectNameById(study.subjectId))} — ${escapeHTML(study.topic)}</strong><div class="item-meta">Estudado em ${formatDateBR(study.date)} • Revisar em ${formatDateBR(dueDate)}</div>`; elements.reviewList.appendChild(item); } })); }
function renderAlerts() { elements.alertList.innerHTML = ""; state.subjects.forEach((subject) => { const lastStudy = state.studies.filter((study) => study.subjectId === subject.id).sort((a, b) => b.date.localeCompare(a.date))[0]; const daysWithoutStudy = lastStudy ? Math.floor((parseDate(todayISO()) - parseDate(lastStudy.date)) / 86400000) : Infinity; const weeklyMinutes = state.studies.filter((study) => study.subjectId === subject.id && isSameWeek(study.date)).reduce((sum, study) => sum + study.minutes, 0); if (!lastStudy || daysWithoutStudy >= 7 || weeklyMinutes < subject.goalHours * 30) { const item = document.createElement("div"); item.className = "alert-item"; item.innerHTML = `<span class="badge danger">Atenção</span><strong>${escapeHTML(subject.name)}</strong><div class="item-meta">${lastStudy ? `Último estudo há ${daysWithoutStudy} dia(s).` : "Nunca estudada."} Meta semanal em risco: ${formatHours(weeklyMinutes)} de ${subject.goalHours}h.</div>`; elements.alertList.appendChild(item); } }); }
function renderHistory() {
  const studies = [...state.studies].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 20);
  elements.historyBody.innerHTML = "";
  if (!studies.length) {
    const row = document.createElement("tr");
    row.innerHTML = `<td colspan="8" class="empty-message">Nenhum registro geral de estudo encontrado.</td>`;
    elements.historyBody.appendChild(row);
    return;
  }
  studies.forEach((study) => {
    const row = document.createElement("tr");
    row.innerHTML = `<td>${formatDateBR(study.date)}</td><td>${escapeHTML(subjectNameById(study.subjectId))}</td><td>${escapeHTML(study.topic)}</td><td>${study.minutes}</td><td>${study.questions}</td><td>${study.correct}</td><td>${study.wrong}</td><td>${study.blank}</td>`;
    elements.historyBody.appendChild(row);
  });
}
function migrateIncorrectWeakDomains() {
  let changed = false;
  state.syllabusItems.forEach((item) => {
    const itemStudies = studiesForItem(item);
    const performance = itemPerformance(item);
    const hasStudies = itemStudies.some((study) => study.minutes > 0);
    const hasQuestions = performance.questions > 0 || performance.correct > 0 || performance.wrong > 0 || performance.blank > 0;
    const hasReview = Boolean(item.reviewed || item.lastReviewedAt);
    if (item.status === "Não iniciado" && !hasStudies && !hasQuestions && !hasReview && item.domain === "Fraco" && !item.manualWeak) {
      item.domain = "Sem diagnóstico";
      changed = true;
    }
  });
  state.migrations.incorrectWeakDomains = true;
  return changed;
}

let mockDisciplineDraft = [];
function percent(value, total) { return total ? Number((value / total * 100).toFixed(1)) : 0; }
function mockNumbersFromValues(total, correct, wrong, blank, goal) {
  const answered = correct + wrong;
  const net = correct - wrong;
  return { total, correct, wrong, blank, goal, answered, net, accuracyAnswered: percent(correct, answered), accuracyTotal: percent(correct, total), blankPct: percent(blank, total), goalDiff: net - goal };
}
function currentMockNumbers() { return mockNumbersFromValues(Number(elements.mockTotalQuestions?.value) || 0, Number(elements.mockCorrect?.value) || 0, Number(elements.mockWrong?.value) || 0, Number(elements.mockBlank?.value) || 0, Number(elements.mockGoal?.value) || 0); }
function normalizeMockDiscipline(entry) {
  const total = Number(entry.total) || 0, correct = Number(entry.correct) || 0, wrong = Number(entry.wrong) || 0, blank = Number(entry.blank) || 0;
  return { id: entry.id || createId(), discipline: normalizeText(entry.discipline) || "Sem disciplina", total, correct, wrong, blank, notes: normalizeText(entry.notes), net: correct - wrong, accuracyPct: percent(correct, total), errorPct: percent(wrong, total), blankPct: percent(blank, total) };
}
function strategicMockAlert(goalDiff) {
  return goalDiff < 0 ? `Você ficou ${Math.abs(goalDiff)} pontos líquidos abaixo da meta.` : "Você atingiu ou superou a meta deste simulado.";
}
function buildMockDiagnosis(mock) {
  const disciplines = (mock.disciplines || []).map(normalizeMockDiscipline);
  const best = [...disciplines].sort((a,b) => b.net - a.net || b.accuracyPct - a.accuracyPct)[0];
  const worst = [...disciplines].sort((a,b) => a.net - b.net || b.errorPct - a.errorPct)[0];
  const mostWrong = [...disciplines].sort((a,b) => b.wrong - a.wrong)[0];
  const mostBlank = [...disciplines].sort((a,b) => b.blank - a.blank)[0];
  return {
    hasDisciplines: disciplines.length > 0,
    best: best?.discipline || "-",
    worst: worst?.discipline || "-",
    mostWrong: mostWrong?.discipline || "-",
    mostBlank: mostBlank?.discipline || "-",
    goalDistance: mock.goalDiff,
    alert: strategicMockAlert(mock.goalDiff)
  };
}
function prepareMock(payload) {
  const n = mockNumbersFromValues(Number(payload.total), Number(payload.correct), Number(payload.wrong), Number(payload.blank), Number(payload.goal));
  const disciplines = (payload.disciplines || []).map(normalizeMockDiscipline);
  const mock = { id: payload.id || createId(), name: normalizeText(payload.name), date: payload.date || todayISO(), board: normalizeText(payload.board) || "Cebraspe", institution: normalizeText(payload.institution), notes: normalizeText(payload.notes), total: n.total, correct: n.correct, wrong: n.wrong, blank: n.blank, goal: n.goal || state.settings.defaultMockGoal || 92, answered: n.answered, net: n.net, accuracyAnswered: n.accuracyAnswered, accuracyTotal: n.accuracyTotal, blankPct: n.blankPct, goalDiff: n.net - (n.goal || state.settings.defaultMockGoal || 92), strategy: normalizeText(payload.strategy), difficulty: payload.difficulty || "Média", disciplines, updatedAt: new Date().toISOString() };
  mock.diagnosis = buildMockDiagnosis(mock);
  return mock;
}
function mockStats() {
  const mocks = [...(state.simulados || [])].sort((a,b) => a.date.localeCompare(b.date));
  const nets = mocks.map((m) => Number(m.net) || 0);
  const problem = mocks.flatMap((m) => m.disciplines || []).reduce((acc,d) => { const k = d.discipline || "Sem disciplina"; acc[k] = (acc[k] || 0) + (Number(d.wrong) || 0) + Math.max(0, -(Number(d.net) || 0)); return acc; }, {});
  return { mocks, count: mocks.length, best: nets.length ? Math.max(...nets) : 0, worst: nets.length ? Math.min(...nets) : 0, average: nets.length ? Math.round(nets.reduce((a,b)=>a+b,0)/nets.length) : 0, last: mocks.at(-1)?.net || 0, first: mocks[0]?.net || 0, aboveGoal: mocks.filter((m) => m.net >= m.goal).length, problemDiscipline: Object.entries(problem).sort((a,b)=>b[1]-a[1])[0]?.[0] || "-" };
}
function renderMockCalculated() { if (!elements.mockCalculated) return; const n = currentMockNumbers(); elements.mockCalculated.innerHTML = `Respondidas: <strong>${n.answered}</strong> • Líquido Cebraspe: <strong>${n.net}</strong> • Acerto/respondidas: <strong>${n.accuracyAnswered}%</strong> • Acerto/total: <strong>${n.accuracyTotal}%</strong> • Brancos: <strong>${n.blankPct}%</strong> • Diferença para meta: <strong>${n.goalDiff}</strong>`; }
function renderLatestMockDiagnosis(mock) {
  if (!mock) return "Salve um simulado para gerar diagnóstico.";
  const diagnosis = mock.diagnosis || buildMockDiagnosis(mock);
  if (!diagnosis.hasDisciplines && !(mock.disciplines || []).length) {
    return `<p><strong>Líquido:</strong> ${mock.net} • <strong>Meta:</strong> ${mock.goal} • <strong>Diferença para a meta:</strong> ${mock.goalDiff}</p><p>Resultado por disciplina ainda não informado. Cadastre o desempenho por disciplina para gerar diagnóstico detalhado.</p><p>${escapeHTML(strategicMockAlert(mock.goalDiff))}</p>`;
  }
  return `<strong>Melhor disciplina:</strong> ${escapeHTML(diagnosis.best)} • <strong>Pior disciplina:</strong> ${escapeHTML(diagnosis.worst)} • <strong>Mais erros:</strong> ${escapeHTML(diagnosis.mostWrong)} • <strong>Mais brancos:</strong> ${escapeHTML(diagnosis.mostBlank)} • <strong>Distância da meta:</strong> ${diagnosis.goalDistance}<br>${escapeHTML(strategicMockAlert(mock.goalDiff))}`;
}
function renderMockEvolution(stats, maxBase) {
  if (!stats.mocks.length) return "Nenhuma evolução disponível.";
  const summary = stats.mocks.length === 1
    ? "Cadastre pelo menos dois simulados para calcular evolução entre o primeiro e o último."
    : `Evolução primeiro → último: <strong>${stats.last - stats.first}</strong>. Maior líquido: <strong>${stats.best}</strong>. Menor líquido: <strong>${stats.worst}</strong>. Líquido médio: <strong>${stats.average}</strong>. Atingiu/superou a meta <strong>${stats.aboveGoal}</strong> vez(es).`;
  return `<p class="item-meta">${summary}</p><table><thead><tr><th>Data</th><th>Simulado</th><th>Líquido</th><th>Meta</th><th>Barra</th></tr></thead><tbody>${stats.mocks.map((m)=>`<tr class="${m.net >= m.goal ? "goal-hit" : ""}"><td>${formatDateBR(m.date)}</td><td>${escapeHTML(m.name)}</td><td>${m.net}</td><td>${m.goal}</td><td><div class="progress"><span style="width:${Math.max(0, Math.min(100, m.net / maxBase * 100))}%"></span></div></td></tr>`).join("")}</tbody></table>`;
}
function renderMockDraft() { if (!elements.mockDisciplineDraft) return; elements.mockDisciplineDraft.innerHTML = mockDisciplineDraft.length ? `<table><thead><tr><th>Disciplina</th><th>Total</th><th>Acertos</th><th>Erros</th><th>Brancos</th><th>Líquido</th><th>% Acerto</th><th>% Erro</th><th>% Brancos</th><th>Ações</th></tr></thead><tbody>${mockDisciplineDraft.map((d,i)=>`<tr><td>${escapeHTML(d.discipline)}</td><td>${d.total}</td><td>${d.correct}</td><td>${d.wrong}</td><td>${d.blank}</td><td>${d.net}</td><td>${d.accuracyPct}%</td><td>${d.errorPct}%</td><td>${d.blankPct}%</td><td><button type="button" data-remove-mock-discipline="${i}">Remover</button></td></tr>`).join("")}</tbody></table>` : "Nenhuma disciplina lançada."; }
function renderSimulados() {
  if (!elements.mockSummary) return;
  const stats = mockStats();
  elements.mockSummary.innerHTML = [["Simulados",stats.count],["Maior líquido",stats.best],["Menor líquido",stats.worst],["Líquido médio",stats.average],["Último líquido",stats.last],["Acima da meta",stats.aboveGoal]].map(([l,v])=>`<article class="stat-card"><span>${l}</span><strong class="stat-value-compact">${v}</strong></article>`).join("");
  const latest = stats.mocks.at(-1);
  elements.mockGeneralResult.innerHTML = latest ? `Último simulado: <strong>${escapeHTML(latest.name)}</strong> • Líquido <strong>${latest.net}</strong> • Meta <strong>${latest.goal}</strong> • Diferença <strong>${latest.goalDiff}</strong>` : "Nenhum simulado salvo.";
  elements.mockDisciplineResults.innerHTML = latest?.disciplines?.length ? `<table><thead><tr><th>Disciplina</th><th>Total</th><th>Acertos</th><th>Erros</th><th>Brancos</th><th>Líquido</th><th>% Acerto</th><th>% Erro</th><th>% Brancos</th><th>Obs.</th></tr></thead><tbody>${latest.disciplines.map((d)=>`<tr><td>${escapeHTML(d.discipline)}</td><td>${d.total}</td><td>${d.correct}</td><td>${d.wrong}</td><td>${d.blank}</td><td>${d.net}</td><td>${d.accuracyPct}%</td><td>${d.errorPct}%</td><td>${d.blankPct}%</td><td>${escapeHTML(d.notes || "-")}</td></tr>`).join("")}</tbody></table>` : "Nenhum resultado por disciplina no último simulado.";
  elements.mockDiagnosis.innerHTML = renderLatestMockDiagnosis(latest);
  elements.mockHistory.innerHTML = (state.simulados || []).length ? [...state.simulados].sort((a,b)=>b.date.localeCompare(a.date)).map((m)=>`<article class="syllabus-card"><header><div><h3>${escapeHTML(m.name)}</h3><div class="item-meta">${formatDateBR(m.date)} • ${escapeHTML(m.board)} • ${m.total} questões • ${m.correct} acertos • ${m.wrong} erros • ${m.blank} brancos • líquido ${m.net} • meta ${m.goal} • diferença ${m.goalDiff}</div></div><span class="badge ${m.net >= m.goal ? "success" : "warn"}">${m.net >= m.goal ? "Meta atingida" : "Abaixo da meta"}</span></header><div class="card-actions"><button type="button" data-view-mock="${m.id}">Visualizar detalhes</button><button type="button" data-edit-mock="${m.id}">Editar</button><button type="button" data-duplicate-mock="${m.id}">Duplicar</button><button class="danger" type="button" data-delete-mock="${m.id}">Excluir</button></div></article>`).join("") : "Nenhum simulado cadastrado.";
  const maxBase = Math.max(1, ...stats.mocks.map((m)=>Math.max(m.goal, m.net, 0)));
  elements.mockEvolution.innerHTML = renderMockEvolution(stats, maxBase);
  renderMockCalculated(); renderMockDraft();
}
function resetMockForm() { elements.mockExamForm?.reset(); mockDisciplineDraft = []; if (elements.mockExamEditingId) elements.mockExamEditingId.value = ""; if (elements.mockDate) elements.mockDate.value = todayISO(); if (elements.mockBoard) elements.mockBoard.value = "Cebraspe"; if (elements.mockGoal) elements.mockGoal.value = state.settings.defaultMockGoal || 92; renderMockCalculated(); renderMockDraft(); }
function editMock(id) { const m = state.simulados.find((x)=>x.id===id); if (!m) return; elements.mockExamEditingId.value=m.id; elements.mockName.value=m.name; elements.mockDate.value=m.date; elements.mockBoard.value=m.board; elements.mockInstitution.value=m.institution||""; elements.mockNotes.value=m.notes||""; elements.mockTotalQuestions.value=m.total; elements.mockCorrect.value=m.correct; elements.mockWrong.value=m.wrong; elements.mockBlank.value=m.blank; elements.mockGoal.value=m.goal; elements.mockStrategy.value=m.strategy||""; elements.mockDifficulty.value=m.difficulty||"Média"; mockDisciplineDraft=(m.disciplines||[]).map(normalizeMockDiscipline); renderSimulados(); showView("simulados"); }
function saveMock(event) { event.preventDefault(); const n=currentMockNumbers(); if (!elements.mockName.value.trim()) return alert("Informe o nome do simulado."); if (n.correct + n.wrong + n.blank !== n.total) return alert("Acertos + erros + brancos deve ser igual ao total de questões."); const payload={ id: elements.mockExamEditingId.value || createId(), name: elements.mockName.value, date: elements.mockDate.value, board: elements.mockBoard.value, institution: elements.mockInstitution.value, notes: elements.mockNotes.value, total:n.total, correct:n.correct, wrong:n.wrong, blank:n.blank, goal:Number(elements.mockGoal.value)||92, strategy:elements.mockStrategy.value, difficulty:elements.mockDifficulty.value, disciplines:mockDisciplineDraft }; const mock=prepareMock(payload); const idx=state.simulados.findIndex((m)=>m.id===mock.id); if (idx>=0) state.simulados[idx]=mock; else state.simulados.push(mock); state.settings.defaultMockGoal=mock.goal; resetMockForm(); render(); }
function addMockDiscipline() { const d=normalizeMockDiscipline({ discipline: elements.mockDisciplineName.value, total: elements.mockDisciplineTotal.value, correct: elements.mockDisciplineCorrect.value, wrong: elements.mockDisciplineWrong.value, blank: elements.mockDisciplineBlank.value, notes: elements.mockDisciplineNotes.value }); if (!d.discipline || !d.total) return alert("Informe disciplina e total."); if (d.correct + d.wrong + d.blank !== d.total) return alert("Na disciplina, acertos + erros + brancos deve ser igual ao total."); mockDisciplineDraft.push(d); [elements.mockDisciplineName,elements.mockDisciplineTotal,elements.mockDisciplineNotes].forEach((el)=>el.value=""); elements.mockDisciplineCorrect.value=0; elements.mockDisciplineWrong.value=0; elements.mockDisciplineBlank.value=0; renderMockDraft(); }


const MATERIAL_TYPES = ["PDF", "Word", "Imagem", "Mapa mental", "Resumo", "Aula", "Questões", "Outro"];
const MATERIAL_ORIGINS = ["Google Drive", "OneDrive", "Link externo", "Arquivo local/referência manual", "Outro"];
function materialTagsArray(value) { return Array.isArray(value) ? value : String(value || "").split(",").map((tag) => tag.trim()).filter(Boolean); }
function materialsForTopic(discipline, subject, syllabusItemId = "") {
  return state.materials.filter((m) => (syllabusItemId && m.syllabusItemId === syllabusItemId) || (canonical(m.discipline) === canonical(discipline) && canonical(m.subject) === canonical(subject)));
}
function materialButtonLabel(material) {
  const type = String(material.type || "material").toLowerCase();
  if (type === "pdf") return "Abrir PDF";
  if (type === "word") return "Abrir Word";
  if (type === "imagem") return "Abrir imagem";
  if (type === "resumo") return "Abrir resumo";
  return "Abrir material";
}
function linkedMaterialsHTML(materials) {
  if (!materials.length) return "";
  return `<div class="linked-materials"><strong>Materiais vinculados</strong><div class="card-actions">${materials.map((m) => `<button type="button" data-open-material="${m.id}" title="${escapeHTML(m.title)}">${escapeHTML(materialButtonLabel(m))}</button>`).join("")}</div></div>`;
}
function isValidHttpUrl(value) { try { const url = new URL(value); return ["http:", "https:"].includes(url.protocol); } catch { return false; } }
function openMaterial(id) { const material = state.materials.find((m) => m.id === id); if (!material) return; if (!isValidHttpUrl(material.link)) return alert("Este material não possui link válido com http/https."); window.open(material.link, "_blank", "noopener"); }
function renderMaterialSelectors() {
  if (!elements.materialForm) return;
  const disciplines = getAllDisciplines();
  elements.materialDisciplineOptions.innerHTML = disciplines.map((d) => `<option value="${escapeHTML(d)}"></option>`).join("");
  const selected = elements.materialDiscipline.value;
  const subjects = state.syllabusItems.filter((i) => !selected || canonical(i.discipline) === canonical(selected)).map((i) => i.subject);
  elements.materialSubjectOptions.innerHTML = [...new Set(subjects.filter(Boolean))].sort().map((a) => `<option value="${escapeHTML(a)}"></option>`).join("");
}
function renderMaterialFilters() {
  if (!elements.materialFilterDiscipline) return;
  const setOptions = (el, label, values) => { const current = el.value; const opts = [...new Set(values.filter(Boolean))].sort((a,b)=>a.localeCompare(b)); el.innerHTML = `<option value="">${label}</option>` + opts.map((v)=>`<option ${v===current?"selected":""}>${escapeHTML(v)}</option>`).join(""); };
  setOptions(elements.materialFilterDiscipline, "Todas", state.materials.map((m)=>m.discipline));
  setOptions(elements.materialFilterSubject, "Todos", state.materials.filter((m)=>!elements.materialFilterDiscipline.value || m.discipline===elements.materialFilterDiscipline.value).map((m)=>m.subject));
  setOptions(elements.materialFilterType, "Todos", MATERIAL_TYPES);
  setOptions(elements.materialFilterOrigin, "Todas", MATERIAL_ORIGINS);
}
function filteredMaterials() {
  const term = canonical(elements.materialFilterText?.value || "");
  return state.materials.filter((m) => (!elements.materialFilterDiscipline.value || m.discipline === elements.materialFilterDiscipline.value) && (!elements.materialFilterSubject.value || m.subject === elements.materialFilterSubject.value) && (!elements.materialFilterType.value || m.type === elements.materialFilterType.value) && (!elements.materialFilterOrigin.value || m.origin === elements.materialFilterOrigin.value) && (!term || [m.title,m.discipline,m.subject,m.type,m.origin,m.link,m.notes,(m.tags||[]).join(" ")].map(canonical).join(" ").includes(term)));
}
function renderMaterials() {
  if (!elements.materialsList) return;
  renderMaterialSelectors(); renderMaterialFilters();
  const list = filteredMaterials().sort((a,b)=>(b.date||"").localeCompare(a.date||""));
  elements.materialsList.innerHTML = list.length ? list.map((m) => `<article class="syllabus-card"><header><div><h3>${escapeHTML(m.title)}</h3><div class="item-meta">${escapeHTML(m.discipline)} • ${escapeHTML(m.subject)} • ${escapeHTML(m.type)} • ${escapeHTML(m.origin)} • ${formatDateBR(m.date)}</div></div><span class="badge neutral">${escapeHTML(m.type)}</span></header><div class="card-meta-grid"><span>Tags: ${escapeHTML(materialTagsArray(m.tags).join(", ") || "-")}</span><span>Link/referência: ${escapeHTML(m.link)}</span><span>Observações: ${escapeHTML(m.notes || "-")}</span><span>Assunto vinculado: ${escapeHTML(m.syllabusItemId || "manual")}</span></div><div class="card-actions"><button type="button" data-open-material="${m.id}">Abrir</button><button type="button" data-edit-material="${m.id}">Editar</button><button class="danger" type="button" data-delete-material="${m.id}">Excluir</button></div></article>`).join("") : "";
}
function updateStudyMaterialOptions() {
  if (!elements.studyMaterial) return;
  const discipline = subjectNameById(elements.studySubject.value);
  const mats = state.materials.filter((m) => canonical(m.discipline) === canonical(discipline) && (!elements.studyTopic.value || canonical(m.subject).includes(canonical(elements.studyTopic.value)) || canonical(elements.studyTopic.value).includes(canonical(m.subject))));
  elements.studyMaterial.innerHTML = '<option value="">Nenhum material vinculado</option>' + mats.map((m)=>`<option value="${m.id}">${escapeHTML(m.type)} — ${escapeHTML(m.title)}</option>`).join("");
}
function editMaterial(id) { const m = state.materials.find((x)=>x.id===id); if (!m) return; elements.materialEditingId.value=m.id; elements.materialTitle.value=m.title; elements.materialDate.value=m.date||todayISO(); elements.materialDiscipline.value=m.discipline; elements.materialSubject.value=m.subject; elements.materialType.value=m.type; elements.materialOrigin.value=m.origin; elements.materialLink.value=m.link; elements.materialTags.value=materialTagsArray(m.tags).join(", "); elements.materialNotes.value=m.notes||""; renderMaterialSelectors(); showView("materiais"); }
function saveMaterial(event) { event.preventDefault(); if (!elements.materialLink.value.trim()) return alert("Informe o link do material."); if (!isValidHttpUrl(elements.materialLink.value.trim())) return alert("O link do material deve começar com http:// ou https://."); const syllabusItem = state.syllabusItems.find((i)=>canonical(i.discipline)===canonical(elements.materialDiscipline.value) && canonical(i.subject)===canonical(elements.materialSubject.value)); const material = { id: elements.materialEditingId.value || createId(), title: elements.materialTitle.value.trim(), discipline: elements.materialDiscipline.value.trim(), subject: elements.materialSubject.value.trim(), syllabusItemId: syllabusItem?.id || "", type: elements.materialType.value, link: elements.materialLink.value.trim(), origin: elements.materialOrigin.value, notes: elements.materialNotes.value.trim(), date: elements.materialDate.value || todayISO(), tags: materialTagsArray(elements.materialTags.value), updatedAt: new Date().toISOString() }; const idx = state.materials.findIndex((m)=>m.id===material.id); if (idx>=0) state.materials[idx]=material; else state.materials.push(material); elements.materialForm.reset(); elements.materialEditingId.value=""; elements.materialDate.value=todayISO(); render(); showView("materiais"); }

let questionBankTraining = null;
function normalizeQuestionBankAnswer(value) { if (value === true) return "C"; if (value === false) return "E"; const raw = canonical(String(value ?? "")).replace(/[^a-z]/g, ""); if (["c","certo","correto","verdadeiro","v"].includes(raw)) return "C"; if (["e","errado","incorreto","falso","f"].includes(raw)) return "E"; return ""; }
function questionBankExplanation(raw = {}) { return String(raw.justificativa ?? raw.fundamento ?? raw.comentario ?? raw.comentário ?? raw.explanation ?? raw.notes ?? raw.observacoes ?? raw.observations ?? "").trim(); }
function normalizeQuestionBankItem(raw = {}, index = 0) { const justificativa = questionBankExplanation(raw); return { id: String(raw.id || raw.codigo || raw.referencia || `qb-${index + 1}-${createId()}`), disciplina: String(raw.disciplina || raw.discipline || "Sem disciplina"), assunto: String(raw.assunto || raw.subject || raw.topico || raw.topic || "Sem assunto"), tema: String(raw.tema || raw.theme || raw.subassunto || raw.subtopic || "Geral"), banca: String(raw.banca || raw.board || ""), ano: raw.ano || raw.year || "", orgao: String(raw.orgao || raw.agency || ""), cargo: String(raw.cargo || raw.role || ""), referencia: String(raw.referencia || raw.reference || raw.codigo || ""), tipo: String(raw.tipo || raw.type || "Certo/Errado"), enunciado: String(raw.enunciado || raw.statement || raw.texto || raw.question || ""), gabarito: normalizeQuestionBankAnswer(raw.gabarito ?? raw.resposta ?? raw.answer ?? raw.correctAnswer), justificativa, fundamento: justificativa, observacoes: String(raw.observacoes || raw.notes || ""), tags: Array.isArray(raw.tags) ? raw.tags : [] }; }
function questionBankFromPayload(payload) { const source = Array.isArray(payload) ? payload : payload?.questionBank || payload?.questoes || payload?.questions || payload?.items || []; return Array.isArray(source) ? source.map(normalizeQuestionBankItem).filter((q) => q.enunciado.trim()) : []; }

function qbSafePartialMatch(a, b) {
  const x = canonical(a).replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
  const y = canonical(b).replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
  if (!x || !y) return false;
  if (x === y) return true;
  const minLen = Math.min(x.length, y.length);
  if (minLen < 4) return false;
  return x.includes(y) || y.includes(x);
}
function qbItemDiscipline(item) { return item.discipline || item.disciplina || "Sem disciplina"; }
function qbItemTexts(item) { return [item.subject, item.assunto, item.topic, item.topico, item.subtopic, item.subassunto].filter(Boolean); }
function qbQuestionTexts(q) { return [q.assunto, q.subject, q.tema, q.theme, q.topico, q.topic, q.subtopic, q.subassunto].filter(Boolean); }
function qbMatchesSyllabusItem(q, item) { return qbSafePartialMatch(q.disciplina || q.discipline, qbItemDiscipline(item)) && qbItemTexts(item).some((itemText) => qbQuestionTexts(q).some((qText) => qbSafePartialMatch(qText, itemText))); }
function qbSyllabusPackageQuestions(items) { return (state.questionBank || []).filter((q) => items.some((item) => qbMatchesSyllabusItem(q, item))); }
function qbLastDisciplinePerformance(discipline) {
  const session = (state.questionBankSessions || []).find((s) => (s.items || []).some((q) => qbSafePartialMatch(q.disciplina, discipline)));
  if (!session) return "Sem treino anterior";
  const rows = (session.items || []).filter((q) => qbSafePartialMatch(q.disciplina, discipline));
  const keyed = rows.filter((q) => qbHasKey(q) || q.gabarito);
  if (!keyed.length) return `${rows.length} questão(ões), sem gabarito`;
  const correct = keyed.filter((q) => q.status === "certo" || (q.marcado && q.marcado === q.gabarito)).length;
  const wrong = keyed.filter((q) => q.status === "errado" || (q.marcado && q.gabarito && q.marcado !== "B" && q.marcado !== q.gabarito)).length;
  return `${correct}/${keyed.length} acertos • líquido ${correct - wrong}`;
}
function qbSyllabusPackages() {
  const grouped = (state.syllabusItems || []).filter((item) => canonical(item.status || item.situacao) !== "ignorado").reduce((acc, item) => { const d = qbItemDiscipline(item); acc[d] ||= []; acc[d].push(item); return acc; }, {});
  return Object.entries(grouped).sort((a,b)=>a[0].localeCompare(b[0],"pt-BR")).map(([discipline, items]) => {
    const questions = qbSyllabusPackageQuestions(items);
    const covered = items.filter((item) => questions.some((q) => qbMatchesSyllabusItem(q, item)));
    const missing = items.filter((item) => !covered.includes(item));
    return { discipline, items, questions, covered, missing, bankThemes: qbUnique(questions.flatMap(q=>[q.assunto,q.tema].filter(Boolean))), last: qbLastDisciplinePerformance(discipline) };
  });
}
function qbPackageByDiscipline(discipline) { return qbSyllabusPackages().find((pkg) => pkg.discipline === discipline); }
function qbQuestionsForPackageMode(pkg, mode) {
  const idsWithTrouble = new Set((state.questionBankSessions || []).flatMap((s) => s.items || []).filter((i) => i.status === "errado" || i.status === "branco" || !i.marcado || i.marcado === "B").map((i) => i.id));
  const trainedIds = new Set((state.questionBankSessions || []).flatMap((s) => s.items || []).filter((i) => i.marcado).map((i) => i.id));
  const weekItems = new Set((state.dailyGoals || []).filter((g) => g.date >= weekStart(todayISO()) && g.date <= addDays(weekStart(todayISO()), 6) && qbSafePartialMatch(g.discipline, pkg.discipline)).map((g) => g.syllabusItemId || canonical(g.subject)));
  const weakItems = new Set(pkg.items.filter((item) => isWeakItem(item) || disciplineQuestionWeakness(pkg.discipline) >= 30 || mockWeakness(pkg.discipline) >= 30).map((item) => item.id));
  if (mode === "unseen") return pkg.questions.filter((q) => !trainedIds.has(q.id));
  if (mode === "weak") return pkg.questions.filter((q) => pkg.items.some((item) => weakItems.has(item.id) && qbMatchesSyllabusItem(q, item)));
  if (mode === "trouble") return pkg.questions.filter((q) => idsWithTrouble.has(q.id));
  if (mode === "week") return pkg.questions.filter((q) => pkg.items.some((item) => (weekItems.has(item.id) || weekItems.has(canonical(item.subject))) && qbMatchesSyllabusItem(q, item)));
  return pkg.questions;
}
function renderQbSyllabusPackages() {
  if (!elements.qbSyllabusPackages) return;
  const packages = qbSyllabusPackages();
  elements.qbSyllabusPackages.innerHTML = packages.length ? packages.map((pkg) => `<article class="question-bank-item"><header><h4>${escapeHTML(pkg.discipline)}</h4><span class="badge">${pkg.questions.length} questão(ões)</span></header><div class="card-meta-grid"><span>Assuntos no edital: ${pkg.items.length}</span><span>Questões encontradas no banco: ${pkg.questions.length}</span><span>Questões com gabarito: ${pkg.questions.filter(qbHasKey).length}</span><span>Assuntos sem nenhuma questão: ${pkg.missing.length}</span><span>Último desempenho: ${escapeHTML(pkg.last)}</span></div><p class="notice ${pkg.missing.length ? "warning-notice" : ""}">Assuntos do edital sem questões cadastradas: ${pkg.missing.length}</p><div class="actions"><button data-qb-package="${escapeHTML(pkg.discipline)}" data-qb-package-mode="full" type="button">Treinar pacote completo</button><button class="secondary-button" data-qb-package="${escapeHTML(pkg.discipline)}" data-qb-package-mode="unseen" type="button">Treinar não estudados</button><button class="secondary-button" data-qb-package="${escapeHTML(pkg.discipline)}" data-qb-package-mode="weak" type="button">Treinar fracos</button><button class="secondary-button" data-qb-package="${escapeHTML(pkg.discipline)}" data-qb-package-mode="trouble" type="button">Treinar erradas/brancas</button><button class="secondary-button" data-qb-package="${escapeHTML(pkg.discipline)}" data-qb-package-mode="week" type="button">Treinar assuntos da semana</button></div><details><summary>Detalhes do pacote</summary><div class="card-meta-grid"><span>Assuntos cobertos: ${escapeHTML(pkg.covered.map((i)=>i.subject || i.assunto).join(", ") || "-")}</span><span>Assuntos sem questões: ${escapeHTML(pkg.missing.map((i)=>i.subject || i.assunto).join(", ") || "-")}</span><span>Temas encontrados no banco: ${escapeHTML(pkg.bankThemes.join(", ") || "-")}</span></div></details></article>`).join("") : "Nenhum pacote disponível. Importe ou cadastre itens no edital verticalizado.";
}
function qbSyllabusPackageSummary() { const packages = qbSyllabusPackages(); const linkedIds = new Set(packages.flatMap((pkg)=>pkg.questions.map((q)=>q.id))); return { packages: packages.length, linked: linkedIds.size, missing: packages.reduce((sum,pkg)=>sum+pkg.missing.length,0) }; }

function qbUnique(values) { return [...new Set(values.filter(Boolean).map(String))].sort((a,b)=>a.localeCompare(b,"pt-BR")); }
function qbFillSelect(select, values, label) { if (!select) return false; const current = select.value; select.innerHTML = `<option value="">${label}</option>` + values.map((v)=>`<option value="${escapeHTML(v)}">${escapeHTML(v)}</option>`).join(""); if (values.includes(current)) { select.value = current; return false; } select.value = ""; return Boolean(current); }
function qbFillSelectWithLabels(select, options, label) { if (!select) return false; const current = select.value; const values = options.map((option) => option.value); select.innerHTML = `<option value="">${label}</option>` + options.map((option)=>`<option value="${escapeHTML(option.value)}">${escapeHTML(option.label)}</option>`).join(""); if (values.includes(current)) { select.value = current; return false; } select.value = ""; return Boolean(current); }
function qbDownload(filename, payload) { const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" }); const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = filename; link.click(); URL.revokeObjectURL(link.href); }
function qbHasKey(q) { return q.gabarito === "C" || q.gabarito === "E"; }
function qbExplanation(q) { return String(q?.justificativa || q?.fundamento || q?.comentario || q?.comentário || q?.explanation || q?.notes || "").trim(); }
function qbExplanationText(q) { return qbExplanation(q) || "Sem justificativa cadastrada"; }
function qbAnswerStatus(q) { if (!q.marcado || q.marcado === "B") return "branco"; if (!qbHasKey(q)) return "sem gabarito"; return q.marcado === q.gabarito ? "certo" : "errado"; }
function qbActiveSyllabusItems() { return (state.syllabusItems || []).filter((item) => canonical(item.status || item.situacao) !== "ignorado"); }
function qbQuestionMatchesAnySyllabusItem(q, items = qbActiveSyllabusItems()) { return items.some((item) => qbMatchesSyllabusItem(q, item)); }
function qbSyllabusItemsForDiscipline(discipline) { return qbActiveSyllabusItems().filter((item) => qbItemDiscipline(item) === discipline); }
function qbQuestionMatchesSyllabusDiscipline(q, discipline) { return !discipline || qbQuestionMatchesAnySyllabusItem(q, qbSyllabusItemsForDiscipline(discipline)); }
function qbSyllabusDisciplineCounts() { return qbSyllabusPackages().reduce((acc, pkg) => (acc[pkg.discipline] = pkg.questions.length, acc), {}); }
function qbIsSyllabusScope() { return (elements.qbTrainingScope?.value || "all") === "syllabus"; }
function qbSelectedZeroDisciplineMessage() { const discipline = elements.qbFilterDiscipline?.value || ""; if (!qbIsSyllabusScope() || !discipline) return ""; return (qbSyllabusDisciplineCounts()[discipline] || 0) === 0 ? `${discipline} está no edital, mas ainda não há questões dessa disciplina no banco.` : ""; }
function qbSetDependentFiltersDisabled(disabled) { [elements.qbFilterSubject, elements.qbFilterTheme].forEach((select) => { if (!select) return; select.disabled = disabled; if (disabled) select.innerHTML = '<option value="">Sem questões disponíveis</option>'; }); }
function qbCanStartTraining() { return !qbSelectedZeroDisciplineMessage() && qbFilteredQuestions().length > 0; }
function qbLimitedList(items, emptyLabel = "nenhum", limit = 8) { if (!items.length) return `<p class="item-meta">${escapeHTML(emptyLabel)}</p>`; const visible = items.slice(0, limit); const hidden = items.length - visible.length; return `<ul>${visible.map((item)=>`<li>${escapeHTML(item)}</li>`).join("")}</ul>${hidden ? `<details><summary>Ver mais ${hidden} item(ns)</summary><ul>${items.slice(limit).map((item)=>`<li>${escapeHTML(item)}</li>`).join("")}</ul></details>` : ""}`; }
function qbWeekSyllabusItems() { const start = weekStart(todayISO()), end = addDays(start, 6); const goals = (state.dailyGoals || []).filter((g) => (g.date || g.data || "") >= start && (g.date || g.data || "") <= end); return qbActiveSyllabusItems().filter((item) => goals.some((g) => g.syllabusItemId === item.id || (qbSafePartialMatch(g.discipline || g.disciplina, qbItemDiscipline(item)) && qbSafePartialMatch(g.subject || g.assunto, item.subject || item.assunto)))); }
function qbWeakSyllabusItems() { return qbActiveSyllabusItems().filter((item) => isWeakItem(item) || disciplineQuestionWeakness(qbItemDiscipline(item)) >= 30 || mockWeakness(qbItemDiscipline(item)) >= 30); }
function qbUnstudiedSyllabusItems() { return qbActiveSyllabusItems().filter((item) => canonical(item.status || item.situacao || "Não iniciado") === "nao iniciado" || (!minutesForItem(item) && !goalsForItem(item).some((g) => Number(g.actualMinutes || g.tempo_real_minutos) > 0))); }
function qbQuestionIdsByReviewStatus(statuses = []) { return new Set((state.questionBankSessions || []).flatMap((s) => s.items || []).filter((i) => statuses.includes(i.status) || (statuses.includes("branco") && (!i.marcado || i.marcado === "B"))).map((i) => i.id)); }
function qbTroubleQuestionIds() { return qbQuestionIdsByReviewStatus(["errado", "branco"]); }
function qbScopeLabel() { const scope = elements.qbTrainingScope?.value || "all"; const review = { wrong:"Erradas", blank:"Brancas", wrong_blank:"Erradas + brancas", weak:"Assuntos fracos", unseen:"Não estudados", week:"Assuntos da semana" }[elements.qbReviewType?.value || "wrong"] || "Erradas"; return scope === "review" ? `Revisão direcionada (${review})` : ({ all:"Banco completo", syllabus:"Edital atual" }[scope] || "Banco completo"); }
function qbReviewSyllabusItems(type) { if (type === "week") return qbWeekSyllabusItems(); if (type === "weak") return qbWeakSyllabusItems(); if (type === "unseen") return qbUnstudiedSyllabusItems(); return qbActiveSyllabusItems(); }
function qbScopedBank() { const scope = elements.qbTrainingScope?.value || "all", bank = state.questionBank || []; if (scope === "all") return bank; if (scope === "syllabus") return bank.filter((q) => qbQuestionMatchesAnySyllabusItem(q, qbActiveSyllabusItems())); const type = elements.qbReviewType?.value || "wrong"; if (type === "wrong") { const ids = qbQuestionIdsByReviewStatus(["errado"]); return bank.filter((q) => ids.has(q.id)); } if (type === "blank") { const ids = qbQuestionIdsByReviewStatus(["branco"]); return bank.filter((q) => ids.has(q.id)); } if (type === "wrong_blank") { const ids = qbTroubleQuestionIds(); return bank.filter((q) => ids.has(q.id)); } return bank.filter((q) => qbQuestionMatchesAnySyllabusItem(q, qbReviewSyllabusItems(type))); }
function qbMissingSyllabusWithoutQuestions() { const scoped = qbScopedBank(); return qbActiveSyllabusItems().filter((item) => !scoped.some((q) => qbMatchesSyllabusItem(q, item))).length; }
function qbFilteredQuestions() { const search = canonical(elements.qbFilterSearch?.value || ""); const discipline = elements.qbFilterDiscipline?.value || ""; return qbScopedBank().filter((q)=> (!discipline || (qbIsSyllabusScope() ? qbQuestionMatchesSyllabusDiscipline(q, discipline) : q.disciplina === discipline)) && (!elements.qbFilterSubject?.value || q.assunto === elements.qbFilterSubject.value) && (!elements.qbFilterTheme?.value || q.tema === elements.qbFilterTheme.value) && (!elements.qbFilterBoard?.value || q.banca === elements.qbFilterBoard.value) && (!elements.qbFilterYear?.value || String(q.ano) === elements.qbFilterYear.value) && (!search || canonical([q.enunciado,q.disciplina,q.assunto,q.tema,q.banca,q.ano,q.referencia,q.orgao,q.cargo].join(" ")).includes(search))); }
function normalizeStoredQuestionBank() { state.questionBank = (state.questionBank || []).map((q, index) => { const normalized = normalizeQuestionBankItem(q, index); return { ...q, ...normalized, id: q.id || normalized.id }; }); }
function qbCascadeBase(fields = {}) { const discipline = fields.discipline ?? elements.qbFilterDiscipline?.value ?? "", subject = fields.subject ?? elements.qbFilterSubject?.value ?? "", theme = fields.theme ?? elements.qbFilterTheme?.value ?? "", board = fields.board ?? elements.qbFilterBoard?.value ?? ""; return qbScopedBank().filter((q) => (!discipline || (qbIsSyllabusScope() ? qbQuestionMatchesSyllabusDiscipline(q, discipline) : q.disciplina === discipline)) && (!subject || q.assunto === subject) && (!theme || q.tema === theme) && (!board || q.banca === board)); }
function qbRenderCascadingFilters() { if (elements.qbReviewTypeWrapper) elements.qbReviewTypeWrapper.hidden = (elements.qbTrainingScope?.value || "all") !== "review"; const bank = qbScopedBank(); if (qbIsSyllabusScope()) { const counts = qbSyllabusDisciplineCounts(); qbFillSelectWithLabels(elements.qbFilterDiscipline, qbUnique(qbActiveSyllabusItems().map(qbItemDiscipline)).map((d)=>({ value:d, label:`${d} (${counts[d] || 0})` })), "Todas"); } else qbFillSelect(elements.qbFilterDiscipline, qbUnique(bank.map(q=>q.disciplina)), "Todas"); const discipline = elements.qbFilterDiscipline?.value || ""; const zeroDiscipline = Boolean(qbSelectedZeroDisciplineMessage()); qbSetDependentFiltersDisabled(false); qbFillSelect(elements.qbFilterSubject, qbUnique(qbCascadeBase({ discipline, subject:"", theme:"", board:"" }).map(q=>q.assunto)), "Todos"); const subject = elements.qbFilterSubject?.value || ""; qbFillSelect(elements.qbFilterTheme, qbUnique(qbCascadeBase({ discipline, subject, theme:"", board:"" }).map(q=>q.tema)), "Todos"); if (zeroDiscipline) qbSetDependentFiltersDisabled(true); const theme = elements.qbFilterTheme?.value || ""; qbFillSelect(elements.qbFilterBoard, qbUnique(qbCascadeBase({ discipline, subject, theme, board:"" }).map(q=>q.banca)), "Todas"); const board = elements.qbFilterBoard?.value || ""; qbFillSelect(elements.qbFilterYear, qbUnique(qbCascadeBase({ discipline, subject, theme, board }).map(q=>q.ano)), "Todos"); if (elements.qbStartTraining) elements.qbStartTraining.disabled = !qbCanStartTraining(); }
function renderQuestionBank() { if (!elements.qbStats) return; normalizeStoredQuestionBank(); const bank = state.questionBank || [], scoped = qbScopedBank(), sessions = state.questionBankSessions || [], last = sessions[0]; qbRenderCascadingFilters(); renderQbSyllabusPackages(); renderQbDiagnostics(); const filteredTotal = qbFilteredQuestions().length; elements.qbStats.innerHTML = [["Questões no banco", bank.length], ["Questões filtradas", filteredTotal], ["Disciplinas disponíveis", qbUnique(scoped.map(q=>q.disciplina)).length], ["Assuntos disponíveis", qbUnique(scoped.map(q=>q.assunto)).length], ["Questões com gabarito", scoped.filter(qbHasKey).length], ["Assuntos do edital sem questões", qbMissingSyllabusWithoutQuestions()], ["Treinos realizados", sessions.length], ["Último treino", last ? new Date(last.createdAt).toLocaleString("pt-BR") : "Nenhum"]].map(([a,b])=>`<article class="stat-card"><span>${a}</span><strong>${escapeHTML(b)}</strong></article>`).join(""); }
function renderQbDiagnostics() { if (!elements.qbDiagnostics) return; const packages = qbSyllabusPackages(); const withQuestions = packages.filter((pkg)=>pkg.questions.length).map((pkg)=>`${pkg.discipline} (${pkg.questions.length})`); const withoutQuestions = packages.filter((pkg)=>!pkg.questions.length).map((pkg)=>pkg.discipline); const missingSubjects = packages.flatMap((pkg)=>pkg.missing.map((item)=>`${pkg.discipline} — ${item.subject || item.assunto || item.topic || "Assunto"}`)); elements.qbDiagnostics.innerHTML = `<article class="question-bank-item qb-diagnostics-card"><header><h4>Diagnóstico do edital no banco</h4><span class="badge neutral">${packages.length} disciplina(s)</span></header><div class="qb-diagnostics-grid"><section><h5>Disciplinas do edital com questões</h5>${qbLimitedList(withQuestions, "nenhuma")}</section><section><h5>Disciplinas do edital sem questões</h5>${qbLimitedList(withoutQuestions, "nenhuma")}</section><section><h5>Assuntos do edital sem questões</h5>${qbLimitedList(missingSubjects, "nenhum")}</section></div></article>`; }
function qbShuffle(list) { const copy=[...list]; for(let i=copy.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [copy[i],copy[j]]=[copy[j],copy[i]];} return copy; }
function qbStart(items = qbFilteredQuestions()) { if (!items.length) return alert(qbSelectedZeroDisciplineMessage() || "Nenhuma questão encontrada com os filtros atuais."); if (elements.qbShuffleTraining?.checked) items = qbShuffle(items); items = items.slice(0, Math.max(1, Number(elements.qbTrainingLimit?.value) || items.length)); questionBankTraining = { id:createId(), createdAt:new Date().toISOString(), index:0, items, answers:{} }; elements.qbTrainingPanel.hidden = false; elements.qbResultPanel.hidden = true; qbRenderQuestion(); }
function qbRenderQuestion() { const t=questionBankTraining, q=t.items[t.index], answered=Object.keys(t.answers).length, selected=t.answers[q.id]||""; elements.qbTrainingCounter.textContent=`${t.index+1}/${t.items.length}`; elements.qbTrainingProgress.style.width=`${Math.round(answered/t.items.length*100)}%`; const msg = qbHasKey(q) ? (selected && selected !== "B" ? (selected===q.gabarito ? "Resposta compatível com o gabarito." : `Gabarito: ${q.gabarito}.`) : "Gabarito disponível para correção automática.") : "Sem gabarito: salvaremos apenas sua marcação."; const explanation = selected && qbHasKey(q) ? `<div class="notice"><strong>Justificativa/fundamento:</strong> ${escapeHTML(qbExplanationText(q))}</div>` : ""; elements.qbQuestionCard.innerHTML = `<div class="question-bank-meta"><span>Disciplina: ${escapeHTML(q.disciplina)}</span><span>Assunto: ${escapeHTML(q.assunto)}</span><span>Tema: ${escapeHTML(q.tema)}</span><span>Banca: ${escapeHTML(q.banca||"-")}</span><span>Ano: ${escapeHTML(q.ano||"-")}</span></div><p class="question-bank-text">${escapeHTML(q.enunciado)}</p><p class="notice">${escapeHTML(msg)}</p>${explanation}<div class="question-bank-actions"><button class="answer-button ${selected==="C"?"selected":""}" data-qb-answer="C" type="button">Certo</button><button class="answer-button ${selected==="E"?"selected":""}" data-qb-answer="E" type="button">Errado</button><button class="answer-button blank-button ${selected==="B"?"selected":""}" data-qb-answer="B" type="button">Branco</button></div><div class="training-footer"><span class="item-meta">Respondidas: ${answered}/${t.items.length}</span><div class="actions"><button class="secondary-button" data-qb-nav="prev" ${t.index===0?"disabled":""}>Anterior</button><button class="secondary-button" data-qb-nav="next" ${t.index>=t.items.length-1?"disabled":""}>Próxima</button><button data-qb-finish type="button">Finalizar treino</button></div></div>`; }
function qbFinish() { const t=questionBankTraining; if(!t) return; const items=t.items.map(q=>({...q, marcado:t.answers[q.id]||""})); const summary=items.reduce((a,q)=>{ if(q.marcado==="B"||!q.marcado)a.blank++; if(qbHasKey(q)&&q.marcado&&q.marcado!=="B"){ q.marcado===q.gabarito ? a.correct++ : a.wrong++; } return a; },{total:items.length,correct:0,wrong:0,blank:0}); summary.net=summary.correct-summary.wrong; summary.accuracyPct=summary.correct+summary.wrong ? Math.round(summary.correct/(summary.correct+summary.wrong)*100) : 0; const session={id:t.id,createdAt:t.createdAt,hasAnyKey:items.some(qbHasKey),summary,items:items.map(q=>({id:q.id,disciplina:q.disciplina,assunto:q.assunto,tema:q.tema,banca:q.banca,ano:q.ano,referencia:q.referencia,marcado:q.marcado,gabarito:q.gabarito||"",status:qbAnswerStatus(q),justificativa:qbExplanationText(q),fundamento:qbExplanationText(q)}))}; state.questionBankSessions.unshift(session); questionBankTraining=null; saveData(); qbRenderResult(session); renderQuestionBank(); elements.qbTrainingPanel.hidden=true; elements.qbResultPanel.hidden=false; }
function qbRenderResult(session) { const s=session.summary; elements.qbResultSummary.innerHTML = [["Total",s.total],["Acertos",session.hasAnyKey?s.correct:"Sem gabarito"],["Erros",session.hasAnyKey?s.wrong:"Sem gabarito"],["Brancos",s.blank],["Líquido Cebraspe",session.hasAnyKey?s.net:"Sem gabarito"],["% de acerto",session.hasAnyKey?`${s.accuracyPct}%`:"Sem gabarito"]].map(([a,b])=>`<article class="stat-card"><span>${a}</span><strong>${escapeHTML(b)}</strong></article>`).join(""); elements.qbResultDetails.innerHTML=session.items.slice(0,50).map((q,i)=>`<article class="question-bank-item"><strong>${i+1}. ${escapeHTML(q.disciplina)} — ${escapeHTML(q.assunto)}</strong><div class="item-meta">Resposta marcada: ${escapeHTML(q.marcado||"-")} • ${q.gabarito?`Gabarito: ${escapeHTML(q.gabarito)}`:"Sem gabarito"} • Resultado: ${escapeHTML(q.status || qbAnswerStatus(q))}</div><p><strong>Justificativa/fundamento:</strong> ${escapeHTML(qbExplanationText(q))}</p></article>`).join(""); }
function qbPreview() { qbRenderCascadingFilters(); const list=qbFilteredQuestions(); const discipline = elements.qbFilterDiscipline?.value || "todas as disciplinas"; const zeroMessage = qbSelectedZeroDisciplineMessage(); if (elements.qbMessage) elements.qbMessage.textContent = zeroMessage || `Escopo: ${qbScopeLabel()} — ${discipline}: ${list.length} questões encontradas.`; if (elements.qbStats) renderQuestionBank(); elements.qbFilteredPreview.innerHTML = list.length ? list.slice(0,20).map((q,i)=>`<article class="question-bank-item"><strong>${i+1}. ${escapeHTML(q.disciplina)} — ${escapeHTML(q.assunto)}</strong><p>${escapeHTML(q.enunciado)}</p><div class="item-meta">${escapeHTML(q.banca||"-")} • ${escapeHTML(q.ano||"-")}</div></article>`).join("") : escapeHTML(zeroMessage || "Nenhuma questão encontrada."); }

function render() { migrateIncorrectWeakDomains(); renderSubjects(); renderGoalSelectors(); renderQuestionSelectors(); renderPlanning(); renderProgressPanel(); renderDashboard(); renderGoalDashboardCards(); renderEdital(); renderSyllabus(); renderSchedulable(); renderDailyGoals(); renderGoalCalendar(); renderCentralGoals(); renderQuestionHistory(); updateQuestionCalculated(); renderMaterials(); updateStudyMaterialOptions(); renderReviews(); renderSmartReviewsDashboard(); renderAlerts(); renderHistory(); renderImportPreview(); renderBackupSummary(); renderQuestionBank(); renderSimulados(); saveData(); }
function syllabusFromValues(values) { return { id: createId(), discipline: values[0]?.trim() || "Sem disciplina", topic: values[1]?.trim() || "Geral", subject: values[2]?.trim() || "Assunto", subtopic: values[3]?.trim() || "", reference: values[4]?.trim() || "", priority: values[5]?.trim() || "Média", weight: Number(values[6]) || 1, status: values[7]?.trim() || "Não iniciado", domain: normalizeImportedDomain(values[8]), notes: values[9]?.trim() || "" }; }

elements.changeMotivation?.addEventListener("click", () => renderMotivationalPhrase());
elements.subjectForm.addEventListener("submit", (event) => { event.preventDefault(); state.subjects.push({ id: createId(), name: elements.subjectName.value.trim(), goalHours: Number(elements.subjectGoal.value) }); elements.subjectForm.reset(); render(); });
elements.studyForm.addEventListener("submit", (event) => { event.preventDefault(); if (!elements.studySubject.value) return alert("Cadastre uma disciplina antes de registrar o estudo."); const questions = Number(elements.questionsDone.value); const correct = Number(elements.correctAnswers.value); const wrong = Number(elements.wrongAnswers.value); const blank = Number(elements.blankAnswers.value); if (correct + wrong + blank !== questions) return alert("A soma de acertos, erros e brancos deve ser igual ao total de questões feitas."); const studyTopic = elements.studyTopic.value.trim(); const linkedItem = findSyllabusItemByStudy(elements.studySubject.value, studyTopic); state.studies.push({ id: createId(), date: elements.studyDate.value, subjectId: elements.studySubject.value, syllabusItemId: linkedItem?.id || "", topic: studyTopic, minutes: Number(elements.studyMinutes.value), plannedMinutes: Number(elements.studyPlannedMinutes?.value) || 0, topicStatus: elements.studyTopicStatus?.value || "Iniciado", difficultyNotes: elements.studyDifficultyNotes?.value.trim() || "", materialId: elements.studyMaterial?.value || "", questions, correct, wrong, blank }); if (linkedItem) updateItemProgress(linkedItem.id, { status: isCompletedStatusValue(elements.studyTopicStatus?.value) ? "Concluído" : (completedStatus(linkedItem) ? linkedItem.status : "Em andamento") }); elements.studyForm.reset(); elements.studyDate.value = todayISO();
elements.goalDate.value = todayISO();
elements.questionDate.value = todayISO(); render(); });
elements.editalForm.addEventListener("submit", (event) => { event.preventDefault(); ["contestName", "agency", "role", "board", "examDate", "officialLink", "generalNotes"].forEach((key) => { state.edital[key] = elements[key].value.trim(); }); render(); });
elements.editalPdf.addEventListener("change", () => { const file = elements.editalPdf.files[0]; if (!file) return; state.edital.pdf = { name: file.name, size: file.size, type: file.type, attachedAt: new Date().toLocaleString("pt-BR") }; render(); });
elements.removePdf.addEventListener("click", () => { state.edital.pdf = null; elements.editalPdf.value = ""; render(); });
elements.syllabusForm.addEventListener("submit", (event) => { event.preventDefault(); const payload = { id: editingSyllabusId || createId(), discipline: elements.itemDiscipline.value.trim(), topic: elements.itemTopic.value.trim(), subject: elements.itemSubject.value.trim(), subtopic: elements.itemSubtopic.value.trim(), reference: elements.itemReference.value.trim(), priority: elements.itemPriority.value, weight: Number(elements.itemWeight.value) || 1, status: elements.itemStatus.value, domain: elements.itemDomain.value, manualWeak: elements.itemDomain.value === "Fraco", notes: elements.itemNotes.value.trim() }; const existingIndex = state.syllabusItems.findIndex((item) => item.id === editingSyllabusId); if (existingIndex >= 0) state.syllabusItems[existingIndex] = { ...state.syllabusItems[existingIndex], ...payload }; else state.syllabusItems.push(payload); editingSyllabusId = null; elements.syllabusForm.reset(); elements.itemPriority.value = "Média"; elements.itemWeight.value = 1; elements.itemStatus.value = "Não iniciado"; elements.itemDomain.value = "Sem diagnóstico"; render(); });
elements.previewBulk.addEventListener("click", () => { bulkDraft = elements.bulkInput.value.split("\n").map((line) => line.trim()).filter(Boolean).map((line) => syllabusFromValues(line.split(";"))); elements.saveBulk.disabled = !bulkDraft.length; elements.bulkPreview.innerHTML = bulkDraft.length ? `<table><thead><tr><th>Disciplina</th><th>Tópico</th><th>Assunto</th><th>Prioridade</th><th>Status</th><th>Domínio</th></tr></thead><tbody>${bulkDraft.map((item) => `<tr><td>${escapeHTML(item.discipline)}</td><td>${escapeHTML(item.topic)}</td><td>${escapeHTML(item.subject)}</td><td>${escapeHTML(item.priority)}</td><td>${escapeHTML(item.status)}</td><td>${escapeHTML(item.domain)}</td></tr>`).join("")}</tbody></table>` : ""; });
elements.saveBulk.addEventListener("click", () => { state.syllabusItems.push(...bulkDraft); bulkDraft = []; elements.bulkInput.value = ""; elements.bulkPreview.innerHTML = ""; elements.saveBulk.disabled = true; render(); });
[elements.filterSearch, elements.filterDiscipline, elements.filterPriority, elements.filterStatus, elements.filterDomain, elements.filterSchedulable, elements.filterQuick].forEach((filter) => filter.addEventListener(filter === elements.filterSearch ? "input" : "change", () => { syllabusVisibleCount = 30; renderSyllabus(); }));
[elements.importFilterDiscipline, elements.importFilterStatus, elements.importFilterPriority, elements.importFilterDomain].forEach((filter) => filter.addEventListener("change", renderImportPreview));
elements.syllabusList.addEventListener("click", (event) => { const button = event.target.closest("button[data-action]"); if (!button) return; const { action, id } = button.dataset; if (action === "edit") editSyllabusItem(id); if (action === "not-started") setItemStatus(id, "Não iniciado"); if (action === "started") setItemStatus(id, "Em andamento"); if (action === "studied") setItemStatus(id, "Concluído"); if (action === "review") { updateItemProgress(id, { status: "Revisar", reviewed: true, lastReviewedAt: todayISO() }); render(); } if (action === "dominated") setItemStatus(id, "Dominado"); if (action === "weak") setItemDomain(id, "Fraco", true); if (action === "schedulable") toggleItemSchedulable(id); });
elements.syllabusList.addEventListener("change", (event) => { const id = event.target.dataset.progressId; if (!id) return; const item = getSyllabusById(id); if (!item) return; if (event.target.dataset.progressField === "minutes") item.studyMinutes = Math.max(0, Number(event.target.value) || 0); if (event.target.dataset.progressField === "notes") item.progressNotes = event.target.value.trim(); render(); });
elements.showMoreSyllabus.addEventListener("click", () => { syllabusVisibleCount += 30; renderSyllabus(); });
elements.applyBulkPriority.addEventListener("click", () => { const filtered = getFilteredItems(); if (!filtered.length) return alert("Nenhum item filtrado para alterar."); filtered.forEach((item) => { item.priority = elements.bulkPriority.value; }); render(); });
elements.schedulableList.addEventListener("change", (event) => { const id = event.target.dataset.id; const key = event.target.dataset.setting; if (!id || !key) return; const setting = settingFor(id); setting[key] = event.target.type === "checkbox" ? event.target.checked : event.target.value; render(); });

elements.jsonImportFile.addEventListener("change", async () => {
  const file = elements.jsonImportFile.files[0];
  resetImportDraft();
  if (!file) return;
  try {
    const text = await file.text();
    let payload;
    try {
      payload = JSON.parse(text);
    } catch (error) {
      showImportError("Arquivo JSON inválido.", error);
      return;
    }
    const rawItems = normalizeImportPayload(payload);
    if (!rawItems) {
      showImportError("Arquivo JSON inválido.", new Error("Formato esperado: array direto ou objeto com propriedade itens."));
      return;
    }
    const validRawItems = rawItems.filter((item) => item && typeof item === "object" && !Array.isArray(item));
    if (!validRawItems.length) {
      showImportError("Nenhum item encontrado no JSON.", new Error("A lista de itens está vazia ou não contém objetos válidos."));
      return;
    }
    importDraft = validRawItems.map(prepareImportedItem);
    elements.importMessage.innerHTML = `Pré-visualização carregada com sucesso. <strong>${escapeHTML(file.name)}</strong> pronto para conferência.`;
    renderImportPreview();
  } catch (error) {
    showImportError("Arquivo JSON inválido.", error);
  }
});
elements.importJsonButton.addEventListener("click", () => {
  if (!importDraft.length) {
    elements.importMessage.innerHTML = "Nenhum item encontrado no JSON.";
    console.error("Importação bloqueada: nenhum arquivo JSON válido foi lido antes do clique.");
    return;
  }
  const existingKeys = new Set(state.syllabusItems.map((item) => item.importKey || importKeyFor(item)));
  const hasDuplicates = importDraft.some((item) => existingKeys.has(item.importKey));
  let itemsToImport = [...importDraft];
  if (hasDuplicates) {
    const replace = confirm("Este edital parece já ter sido importado. Clique em OK para substituir os dados existentes ou em Cancelar para apenas adicionar novos itens.");
    if (replace) {
      const draftKeys = new Set(importDraft.map((item) => item.importKey));
      state.syllabusItems.filter((item) => draftKeys.has(item.importKey || importKeyFor(item))).forEach((item) => delete state.schedulableSettings[item.id]);
      state.syllabusItems = state.syllabusItems.filter((item) => !draftKeys.has(item.importKey || importKeyFor(item)));
    } else {
      itemsToImport = importDraft.filter((item) => !existingKeys.has(item.importKey));
    }
  }
  try {
    state.syllabusItems.push(...itemsToImport);
    itemsToImport.forEach((item) => {
      state.schedulableSettings[item.id] = { availability: item.importMeta.agendavel ? "Agendável" : "Não agendável", mode: item.importMeta.tipo_agendamento || "Estudo + questões", priority: item.priority === "Alta" };
    });
    importDraft = [];
    elements.jsonImportFile.value = "";
    render();
    elements.importMessage.innerHTML = "Edital verticalizado importado com sucesso.";
  } catch (error) {
    console.error("Falha ao importar o edital verticalizado.", error);
    elements.importMessage.innerHTML = `Falha ao importar o edital verticalizado: ${escapeHTML(error.message)}`;
  }
});

elements.clearImportedSyllabus.addEventListener("click", () => {
  const importedItems = state.syllabusItems.filter((item) => item.imported || item.importMeta?.imported);
  if (!importedItems.length) return alert("Não há edital verticalizado importado para limpar.");
  if (!confirm("Tem certeza que deseja apagar apenas os itens importados do edital verticalizado?")) return;
  importedItems.forEach((item) => delete state.schedulableSettings[item.id]);
  state.syllabusItems = state.syllabusItems.filter((item) => !(item.imported || item.importMeta?.imported));
  render();
  elements.importMessage.innerHTML = "Edital verticalizado importado removido.";
});

elements.clearData.addEventListener("click", () => { if (confirm("Tem certeza que deseja apagar todos os dados salvos neste navegador?")) { replaceState({}); render(); } });
elements.exportBackup?.addEventListener("click", exportBackup);
elements.selectBackupFile?.addEventListener("click", () => elements.backupFileInput.click());
elements.backupFileInput?.addEventListener("change", () => { const file = elements.backupFileInput.files[0]; if (file) handleBackupFile(file); elements.backupFileInput.value = ""; });
elements.clearAllLocalData?.addEventListener("click", clearAllLocalDataFromBackup);
elements.backupPreview?.addEventListener("click", (event) => { const button = event.target.closest("button[data-backup-import]"); if (button) handleBackupImportChoice(button.dataset.backupImport); });

function syllabusLabel(item) { return `${item.discipline} — ${item.subject}${item.subtopic ? ` • ${item.subtopic}` : ""}`; }
function getSyllabusById(id) { return state.syllabusItems.find((item) => item.id === id); }
function optionsForDiscipline(select, current = "") { const ds = getAllDisciplines(); select.innerHTML = '<option value="">Selecione</option>' + ds.map((d) => `<option value="${escapeHTML(d)}" ${d === current ? "selected" : ""}>${escapeHTML(d)}</option>`).join(""); }
function optionsForItems(select, discipline, current = "") { const items = state.syllabusItems.filter((item) => !discipline || item.discipline === discipline); select.innerHTML = '<option value="">Selecione</option>' + items.map((item) => `<option value="${item.id}" ${item.id === current ? "selected" : ""}>${escapeHTML(item.subject)}${item.subtopic ? ` • ${escapeHTML(item.subtopic)}` : ""}</option>`).join(""); }
function renderGoalSelectors() { const gd = elements.goalDiscipline.value; const gi = elements.goalSyllabusItem.value; optionsForDiscipline(elements.goalDiscipline, gd); optionsForItems(elements.goalSyllabusItem, elements.goalDiscipline.value || gd, gi); }
function renderQuestionSelectors() { const qd = elements.questionDiscipline.value; const qi = elements.questionSyllabusItem.value; optionsForDiscipline(elements.questionDiscipline, qd); optionsForItems(elements.questionSyllabusItem, elements.questionDiscipline.value || qd, qi); const fd = elements.questionFilterDiscipline.value; optionsForDiscipline(elements.questionFilterDiscipline, fd); elements.questionFilterDiscipline.querySelector('option').textContent = 'Todas'; const fs = elements.questionFilterSubject.value; elements.questionFilterSubject.innerHTML = '<option value="">Todos</option>' + state.syllabusItems.filter((item) => !elements.questionFilterDiscipline.value || item.discipline === elements.questionFilterDiscipline.value).map((item) => `<option value="${item.id}" ${item.id === fs ? "selected" : ""}>${escapeHTML(item.subject)}</option>`).join(''); }
function goalTypeForItem(item) { const mode = item.importMeta?.tipo_agendamento || item.tipo_agendamento || settingFor(item.id).mode; if (isWeakItem(item)) return "Reforço"; if (mode === "Questões apenas") return "Questões"; if (mode === "Revisão apenas" || item.status === "Revisar") return "Revisão"; return item.status === "Não iniciado" ? "Estudo novo" : "Questões"; }
function disciplineWeightValue(discipline) { return Number(state.disciplineWeights?.[discipline] || 3); }
function disciplineQuestionWeakness(discipline) { const logs = state.questionLogs.filter((q) => canonical(q.discipline) === canonical(discipline)); const total = logs.reduce((a,q)=>a+Number(q.total||0),0); const wrong = logs.reduce((a,q)=>a+Number(q.wrong||0),0); return total ? wrong / total * 100 : 0; }
function mockWeakness(discipline) { const rows = (state.simulados||[]).flatMap((m)=>m.disciplines||[]).filter((d)=>canonical(d.name||d.discipline)===canonical(discipline)); const total = rows.reduce((a,d)=>a+Number(d.total||0),0); const wrong = rows.reduce((a,d)=>a+Number(d.wrong||0),0); return total ? wrong / total * 100 : 0; }
function itemScore(item, pendingByDiscipline) { const pending = pendingByDiscipline[item.discipline] || 0; const totalDisc = state.syllabusItems.filter((i)=>i.discipline===item.discipline && i.status!=="Ignorado").length || 1; const atrasada = pending / totalDisc * 40; const reviewDue = item.status === "Revisar" || item.lastReviewedAt && addDays(item.lastReviewedAt, 7) <= todayISO() ? 30 : 0; const examBoost = state.edital.examDate ? Math.max(0, 20 - Math.ceil((parseDate(state.edital.examDate)-new Date())/86400000)/10) : 0; return disciplineWeightValue(item.discipline) * 18 + atrasada + (item.status === "Não iniciado" ? 35 : 0) + (isUndiagnosed(item) ? 18 : 0) + (isWeakItem(item) ? 42 : 0) + disciplineQuestionWeakness(item.discipline) * .7 + mockWeakness(item.discipline) * .4 + (Number(item.weight) || 1) * 5 + reviewDue + examBoost; }
function makeGoal(item, date, type) {
  const dayType = availabilityForDate(date).type;
  const factor = dayType === "plantão" ? 0.6 : dayType === "folga" || dayType === "estudo forte" ? 1.25 : dayType === "indisponível" ? 0.2 : dayType === "estudo leve" ? 0.75 : 1;
  const minutes = Math.max(15, Math.round((type === "Questões" ? 30 : item.priority === "Alta" ? 60 : 45) * factor));
  return { id: createId(), date, data: date, discipline: item.discipline, disciplina: item.discipline, syllabusItemId: item.id, subject: item.subject, assunto: item.subject, referencia_edital: item.reference || "", type, tipo: type.toLowerCase(), minutes, tempo_sugerido_minutos: minutes, priority: item.priority, prioridade: item.priority, status: "Pendente", origin: "edital verticalizado", origem: "edital verticalizado", notes: `Gerada automaticamente do edital verticalizado. Status: ${item.status}; domínio: ${item.domain}; peso: ${item.weight}.`, observacoes: `Priorizada por status, domínio, prioridade, peso e pendência da disciplina.` };
}
function pickCandidate(candidates, used, predicate = () => true, chosen = [], maxGoals = 4, disciplineLimit = Infinity, allowedDisciplines = null) { const counts = chosen.reduce((a,g)=>(a[g.discipline]=(a[g.discipline]||0)+1,a),{}); const usedDisciplines = new Set(chosen.map((g)=>g.discipline)); return candidates.find((item) => !used.has(item.id) && predicate(item) && (!allowedDisciplines || allowedDisciplines.has(item.discipline)) && (usedDisciplines.has(item.discipline) || usedDisciplines.size < disciplineLimit) && ((counts[item.discipline]||0) < Math.ceil(maxGoals/2) || Object.keys(counts).length <= 1)); }
function generateGoalsForDate(date, opts = {}) {
  const dayType = availabilityForDate(date).type;
  if (dayType === "indisponível" && !opts.manual) return [];
  const existing = new Set(state.dailyGoals.filter((g)=>g.date===date).map((g)=>g.syllabusItemId));
  const pendingByDiscipline = state.syllabusItems.filter((item) => !completedStatus(item) && item.status !== "Ignorado").reduce((acc, item) => (acc[item.discipline] = (acc[item.discipline] || 0) + 1, acc), {});
  const candidates = state.syllabusItems.filter((item) => isSchedulable(item.id) && item.status !== "Ignorado" && !existing.has(item.id)).sort((a,b) => itemScore(b,pendingByDiscipline) - itemScore(a,pendingByDiscipline));
  const c = planningConfig();
  const baseMaxGoals = opts.maxGoals || (dayType === "plantão" ? Math.min(2, Number(c.topicsPerDay)||2) : dayType === "folga" || dayType === "estudo forte" ? 6 : dayType === "estudo leve" ? 3 : 4);
  const maxGoals = Math.max(0, Math.min(baseMaxGoals, Number(opts.topicLimit ?? c.topicsPerDay) || 3));
  const disciplineLimit = Math.max(1, Math.min(Number(opts.disciplineLimit ?? c.disciplinesPerDay) || 2, maxGoals || 1));
  const allowedDisciplines = opts.allowedDisciplines ? new Set(opts.allowedDisciplines) : null;
  const minDisc = Math.min(new Set(candidates.filter((i)=>!allowedDisciplines || allowedDisciplines.has(i.discipline)).map((i)=>i.discipline)).size, disciplineLimit, maxGoals >= 4 ? 3 : maxGoals >= 2 ? 2 : 1);
  const buckets = [
    [Math.ceil(maxGoals*.4), (i)=>disciplineWeightValue(i.discipline)>=4],
    [Math.ceil(maxGoals*.3), (i)=>pendingByDiscipline[i.discipline] >= Math.max(...Object.values(pendingByDiscipline),0)*.6],
    [Math.ceil(maxGoals*.2), (i)=>isWeakItem(i) || disciplineQuestionWeakness(i.discipline)>=30 || mockWeakness(i.discipline)>=30],
    [Math.max(1,Math.floor(maxGoals*.1)), (i)=>i.status==="Revisar" || goalTypeForItem(i)==="Revisão"]
  ];
  const used = new Set(), chosen = [];
  const addOne = (pred) => { const item = pickCandidate(candidates, used, pred, chosen, maxGoals, disciplineLimit, allowedDisciplines); if (item && chosen.length < maxGoals) { used.add(item.id); chosen.push(makeGoal(item, date, goalTypeForItem(item))); } };
  buckets.forEach(([n,p]) => { for (let i=0;i<n && chosen.length<maxGoals;i++) addOne(p); });
  while (new Set(chosen.map((g)=>g.discipline)).size < minDisc && chosen.length < maxGoals) addOne((i)=>!chosen.some((g)=>g.discipline===i.discipline));
  while (chosen.length < Math.min(maxGoals, candidates.length)) addOne(()=>true);
  return chosen;
}
function limitGeneratedGoals(goals, { topicLimit = Infinity, disciplineLimit = Infinity } = {}) {
  const usedDisciplines = new Set(), selected = [];
  for (const goal of goals) {
    if (selected.length >= topicLimit) break;
    if (!usedDisciplines.has(goal.discipline) && usedDisciplines.size >= disciplineLimit) continue;
    usedDisciplines.add(goal.discipline);
    selected.push(goal);
  }
  return selected;
}
function generationShortageMessage(goals, requestedTopics, label) {
  if (goals.length >= requestedTopics) return "";
  return ` Aviso: havia apenas ${goals.length} assunto(s) disponível(is) para ${label}; o sistema gerou o máximo possível sem apagar dados antigos.`;
}
function generateDailyGoals() {
  try {
    const date = elements.goalDate.value || todayISO();
    const availability = availabilityForDate(date);
    if (!state.syllabusItems.length) { showDailyGoalMessage("Não foi possível gerar metas. Verifique se o edital foi importado.", "error"); return; }
    const existingToday = state.dailyGoals.filter((g) => g.date === date);
    if (existingToday.length && !confirm("Já existem metas para esta data. Clique em OK para adicionar novas ou em Cancelar para manter como está.")) return;
    const manualUnavailable = availability.type === "indisponível";
    if (manualUnavailable && !confirm("Este dia está marcado como indisponível. Deseja gerar metas mesmo assim?")) {
      showDailyGoalMessage("Geração cancelada: o dia selecionado está indisponível.", "warning");
      return;
    }
    const chosen = generateGoalsForDate(date, { manual: manualUnavailable });
    if (!chosen.length) { showDailyGoalMessage("Nenhuma meta gerada. Verifique assuntos agendáveis, duplicidades ou disponibilidade do dia.", "warning"); return; }
    state.dailyGoals.push(...chosen);
    saveData();
    render();
    const disciplines = new Set(chosen.map((g)=>g.discipline)).size;
    showDailyGoalMessage(`${chosen.length} meta(s) gerada(s) para ${formatDateBR(date)}, com ${disciplines} disciplina(s) diferente(s). Limitação aplicada: ${availability.type} (${availability.hours || 0}h disponíveis), até ${planningConfig().disciplinesPerDay} disciplina(s) e ${planningConfig().topicsPerDay} assunto(s).${generationShortageMessage(chosen, planningConfig().topicsPerDay, "o dia")}`, "success");
    showView("metas-do-dia");
  } catch (error) { console.error("Não foi possível gerar metas.", error); showDailyGoalMessage("Não foi possível gerar metas. Verifique se o edital foi importado.", "error"); }
}
function appendGoalHistory(goal, text) {
  goal.history ||= [];
  goal.history.push({ at: new Date().toISOString(), text });
  goal.notes = [goal.notes || "", text].filter(Boolean).join("\n");
}
function updateGoalDone(goal) {
  const previousStatus = goal.status;
  if (!goal.actualMinutes) {
    const minutes = Number(prompt("Tempo real estudado (min)", goal.minutes || 0));
    if (!Number.isFinite(minutes) || minutes < 0) return alert("Informe um número de minutos válido.");
    goal.actualMinutes = minutes;
  }
  goal.status = "Concluída";
  goal.studyStatus = "Concluído";
  goal.completedAt ||= new Date().toISOString();
  if (previousStatus !== "Concluída") appendGoalHistory(goal, `Concluída em ${new Date().toLocaleString("pt-BR")}.`);
  const item = getSyllabusById(goal.syllabusItemId);
  if (item && previousStatus !== "Concluída") {
    const previous = Number(item.studyMinutes) || 0;
    updateItemProgress(goal.syllabusItemId, { status: "Concluído", studyMinutes: previous + (Number(goal.actualMinutes) || Number(goal.minutes) || 0), lastStudyDate: goal.date });
  }
  saveData();
  showDailyGoalMessage("Meta concluída.", "success");
}
function postponeGoal(goal) {
  const nextDate = prompt("Nova data da meta (AAAA-MM-DD)", goal.date);
  if (!nextDate || Number.isNaN(Date.parse(`${nextDate}T00:00:00`))) return;
  const oldDate = goal.date;
  goal.date = nextDate;
  goal.data = nextDate;
  goal.status = "Reagendada";
  appendGoalHistory(goal, `Reagendada de ${oldDate} para ${nextDate}.`);
  elements.goalDate.value = nextDate;
  saveData();
  showDailyGoalMessage(`Meta adiada para ${formatDateBR(nextDate)}.`, "success");
}
function registerGoalTime(goal) {
  const previousMinutes = Number(goal.actualMinutes) || 0;
  const minutes = Number(prompt("Minutos realizados", previousMinutes || goal.minutes || 0));
  if (!Number.isFinite(minutes) || minutes < 0) return alert("Informe um número de minutos válido.");
  goal.actualMinutes = minutes;
  goal.studyStatus = minutes > 0 ? "Iniciado" : (goal.studyStatus || "Pendente");
  appendGoalHistory(goal, `Tempo registrado: ${minutes} min em ${new Date().toLocaleString("pt-BR")}.`);
  const item = getSyllabusById(goal.syllabusItemId);
  const delta = minutes - previousMinutes;
  if (item && delta > 0) updateItemProgress(goal.syllabusItemId, { status: item.status === "Concluído" ? item.status : "Em andamento", studyMinutes: (Number(item.studyMinutes) || 0) + delta, lastStudyDate: goal.date });
  if (minutes > 0 && goal.status !== "Concluída" && confirm("Deseja concluir esta meta agora?")) updateGoalDone(goal);
  saveData();
  showDailyGoalMessage("Tempo registrado.", "success");
}
function editGoal(goal) {
  elements.goalDate.value=goal.date; elements.goalDiscipline.value=goal.discipline; optionsForItems(elements.goalSyllabusItem, goal.discipline, goal.syllabusItemId); elements.goalSyllabusItem.value=goal.syllabusItemId; elements.goalType.value=goal.type; elements.goalMinutes.value=goal.minutes; elements.goalActualMinutes.value=goal.actualMinutes||0; elements.goalPriority.value=goal.priority; elements.goalStatus.value=goal.status; elements.goalNotes.value=goal.notes||""; showView("metas-do-dia");
}
function weekStart(dateString) { const d=parseDate(dateString); d.setDate(d.getDate()-d.getDay()); return d.toISOString().slice(0,10); }
function daysBetween(start, count) { return Array.from({length:count},(_,i)=>addDays(start,i)); }
function goalsBetween(start,end) { return state.dailyGoals.filter((g)=>g.date>=start && g.date<=end); }
function completionRate(goals) { return goals.length ? Math.round(goals.filter((g)=>g.status==="Concluída").length/goals.length*100) : 0; }
function previewGoals(kind, goals) {
  const dist = goals.reduce((a,g)=>(a[g.discipline]=(a[g.discipline]||0)+1,a),{});
  const days = [...new Set(goals.map((g)=>g.date))];
  const hours = goals.reduce((a,g)=>a+Number(g.minutes||0),0);
  return `${kind}: ${goals.length} metas; ${Object.keys(dist).length} disciplinas; ${days.length} dias usados; ${formatHours(hours)} planejadas; distribuição: ${Object.entries(dist).map(([d,n])=>`${d} (${n})`).join(", ") || "sem metas"}. Confirmar geração?`;
}
function saveGeneratedGoals(kind, made) {
  if (!made.length) return alert("Nenhuma meta nova gerada. Verifique assuntos agendáveis, duplicidades ou disponibilidade.");
  if (!confirm(previewGoals(kind, made))) return;
  state.dailyGoals.push(...made); render(); showView("calendario-metas");
}
function generateWeekGoals() { const c=planningConfig(); const start=weekStart(elements.calendarDate?.value||todayISO()); const made=[]; daysBetween(start,7).forEach((date)=>{ const weekDisciplines=new Set(made.map((g)=>g.discipline)); const remainingTopics=(Number(c.topicsPerWeek)||8)-made.length; if (remainingTopics<=0) return; const remainingNewDisciplines=Math.max(0,(Number(c.disciplinesPerWeek)||6)-weekDisciplines.size); made.push(...generateGoalsForDate(date,{topicLimit:Math.min(Number(c.topicsPerDay)||3,remainingTopics), disciplineLimit:(Number(c.disciplinesPerDay)||2), allowedDisciplines: remainingNewDisciplines>0 ? null : weekDisciplines})); }); const limited=limitGeneratedGoals(made,{topicLimit:Number(c.topicsPerWeek)||8, disciplineLimit:Number(c.disciplinesPerWeek)||6}); if (limited.length < (Number(c.topicsPerWeek)||8)) alert(generationShortageMessage(limited, Number(c.topicsPerWeek)||8, "a semana").trim()); saveGeneratedGoals("Pré-visualização semanal", limited); }
function generateMonthGoals() { const c=planningConfig(); const ref=parseDate(elements.calendarDate?.value||todayISO()); const start=`${ref.getFullYear()}-${String(ref.getMonth()+1).padStart(2,"0")}-01`; const days=new Date(ref.getFullYear(),ref.getMonth()+1,0).getDate(); const made=[]; daysBetween(start,days).forEach((date)=>{ const monthDisciplines=new Set(made.map((g)=>g.discipline)); const remainingTopics=(Number(c.topicsPerMonth)||40)-made.length; if (remainingTopics<=0) return; const remainingNewDisciplines=Math.max(0,(Number(c.disciplinesPerMonth)||10)-monthDisciplines.size); made.push(...generateGoalsForDate(date,{maxGoals: availabilityForDate(date).type==="folga"?5:undefined, topicLimit:Math.min(Number(c.topicsPerDay)||3,remainingTopics), disciplineLimit:(Number(c.disciplinesPerDay)||2), allowedDisciplines: remainingNewDisciplines>0 ? null : monthDisciplines})); }); const limited=limitGeneratedGoals(made,{topicLimit:Number(c.topicsPerMonth)||40, disciplineLimit:Number(c.disciplinesPerMonth)||10}); if (limited.length < (Number(c.topicsPerMonth)||40)) alert(generationShortageMessage(limited, Number(c.topicsPerMonth)||40, "o mês").trim()); saveGeneratedGoals("Pré-visualização mensal", limited); }
function renderDisciplineWeights() { if (!elements.disciplineWeightsList) return; const ds=getAllDisciplines(); elements.disciplineWeightsList.innerHTML = ds.length ? ds.map((d)=>`<label class="weight-row"><span>${escapeHTML(d)}</span><select data-discipline-weight="${escapeHTML(d)}"><option value="1" ${disciplineWeightValue(d)===1?"selected":""}>Baixa (1)</option><option value="3" ${disciplineWeightValue(d)===3?"selected":""}>Média (3)</option><option value="4" ${disciplineWeightValue(d)===4?"selected":""}>Alta (4)</option><option value="5" ${disciplineWeightValue(d)===5?"selected":""}>Muito alta (5)</option></select></label>`).join("") : "Cadastre ou importe disciplinas para configurar pesos."; }
function renderGoalCalendar() { if (!elements.goalCalendarContent) return; renderDisciplineWeights(); const date=elements.calendarDate?.value||todayISO(), mode=elements.calendarViewMode?.value||"daily"; const start=mode==="weekly"?weekStart(date):mode==="monthly"?`${date.slice(0,7)}-01`:date; const end=mode==="daily"?date:mode==="weekly"?addDays(start,6):`${date.slice(0,7)}-${String(new Date(parseDate(date).getFullYear(),parseDate(date).getMonth()+1,0).getDate()).padStart(2,"0")}`; const goals=goalsBetween(start,end); const planned=goals.reduce((a,g)=>a+Number(g.minutes||0),0), done=goals.reduce((a,g)=>a+Number(g.actualMinutes||0),0); const dist=goals.reduce((a,g)=>(a[g.discipline]=(a[g.discipline]||0)+1,a),{}); elements.goalCalendarStats.innerHTML = `<article class="stat-card"><span>Horas planejadas</span><strong>${formatHours(planned)}</strong></article><article class="stat-card"><span>Horas realizadas</span><strong>${formatHours(done)}</strong></article><article class="stat-card"><span>Assuntos planejados</span><strong>${goals.length}</strong></article><article class="stat-card"><span>Assuntos concluídos</span><strong>${goals.filter(g=>g.status==="Concluída").length}</strong></article><article class="stat-card"><span>Cumprimento</span><strong>${completionRate(goals)}%</strong></article><article class="stat-card wide-stat"><span>Distribuição por disciplina</span><strong>${Object.entries(dist).map(([d,n])=>`${escapeHTML(d)} (${n})`).join(", ")||"-"}</strong></article>`;
  if (mode==="daily") { const av=availabilityForDate(date); elements.goalCalendarContent.innerHTML = `<div class="section-heading inline"><div><h3>${formatDateBR(date)} — ${escapeHTML(dayTypeLabel(av))}</h3><p class="item-meta">Horas disponíveis: ${av.hours}h</p></div><button type="button" data-open-day-plan="${date}">Abrir Plano do Dia</button></div>` + (goals.map(goalCalendarCard).join("") || "Nenhuma meta para a data."); }
  if (mode==="weekly") elements.goalCalendarContent.innerHTML = `<div class="calendar-grid week-grid">${daysBetween(start,7).map((d)=>`<article class="clickable-day" data-open-day-plan="${d}" tabindex="0" role="button" aria-label="Abrir Plano do Dia em ${formatDateBR(d)}"><h3>${formatDateBR(d)}</h3><small>${escapeHTML(dayTypeLabel(availabilityForDate(d)))} • ${availabilityForDate(d).hours}h</small>${state.dailyGoals.filter(g=>g.date===d).map(goalCalendarMini).join("")||"<p class='item-meta'>Sem metas</p>"}</article>`).join("")}</div>`;
  if (mode==="monthly") { const days=Number(end.slice(-2)); elements.goalCalendarContent.innerHTML = `<div class="calendar-grid month-grid">${daysBetween(start,days).map((d)=>{const gs=state.dailyGoals.filter(g=>g.date===d), av=availabilityForDate(d); return `<article class="clickable-day ${av.type==='indisponível'?'unavailable':''}" data-open-day-plan="${d}" tabindex="0" role="button" aria-label="Abrir Plano do Dia em ${formatDateBR(d)}"><strong>${d.slice(-2)}</strong><small>${escapeHTML(dayTypeLabel(av))}</small><span>${gs.length} meta(s)</span><span>${gs.filter(g=>g.status==='Concluída').length} concluída(s)</span></article>`}).join("")}</div>`; }
  const key=date.slice(0,7); const mg=state.monthlyGoals[key]||{}; if(elements.monthlyTopicGoal) elements.monthlyTopicGoal.value=mg.topics||""; if(elements.monthlyHourGoal) elements.monthlyHourGoal.value=mg.hours||""; const total=state.syllabusItems.filter(i=>i.status!=="Ignorado").length||1, completed=state.syllabusItems.filter(completedStatus).length; elements.monthlyPlanSummary.innerHTML=`<article class="stat-card"><span>Avanço esperado</span><strong>${Math.round(goals.length/total*100)}%</strong></article><article class="stat-card"><span>Previsão de conclusão</span><strong>${goals.length?Math.ceil((total-completed)/Math.max(1,goals.length))+' mês(es)':'-'}</strong></article>`; }
function goalCalendarMini(g){ return `<p class="goal-pill ${g.status==='Concluída'?'done':g.status==='Adiada'?'warn':''}">${escapeHTML(g.discipline)} — ${escapeHTML(g.subject)}</p>`; }
function goalCalendarCard(goal){ return `<article class="syllabus-card goal-status-${canonical(goal.status)}"><header><div><h3>${escapeHTML(goal.discipline)} — ${escapeHTML(goal.subject)}</h3><div class="item-meta">${escapeHTML(goal.type)} • planejado ${goal.minutes||0} min • realizado ${goal.actualMinutes||0} min • status ${escapeHTML(goal.status)}</div></div></header><div class="card-actions"><button data-calendar-action="done" data-id="${goal.id}">Concluir</button><button data-calendar-action="postpone" data-id="${goal.id}">Adiar</button><button data-calendar-action="edit" data-id="${goal.id}">Editar</button><button data-calendar-action="time" data-id="${goal.id}">Registrar tempo</button><button data-register-goal="${goal.id}">Registrar questões</button></div></article>`; }

function renderCentralGoals() {
  if (!elements.centralGoalsCards && !elements.dashboardGoalsScaleSummary) return;
  const today = todayISO(), av = availabilityForDate(today), ws = weekStart(today), monthStart = `${today.slice(0,7)}-01`, monthDays = new Date(parseDate(today).getFullYear(), parseDate(today).getMonth()+1, 0).getDate();
  const dayGoals = state.dailyGoals.filter(g=>g.date===today), dayStats = goalProgressStats(dayGoals, av), week = periodSummary(ws, 7), month = periodSummary(monthStart, monthDays);
  const dayDisciplines = new Set(dayGoals.map(g=>g.discipline)).size;
  if (elements.centralGoalsCards) elements.centralGoalsCards.innerHTML = `
    <article class="goal-central-card"><h3>Hoje</h3><div class="card-meta-grid"><span>Data: ${formatDateBR(today)}</span><span>Tipo: ${escapeHTML(dayTypeLabel(av))}</span><span>Horas previstas: ${formatHours(dayStats.target || av.hours*60)}</span><span>Disciplinas previstas: ${dayDisciplines}</span><span>Assuntos previstos: ${dayGoals.length}</span><span>Pendentes: ${dayStats.pending}</span><span>Concluídas: ${dayStats.completed}</span></div><button data-central-open-day type="button">Abrir Plano do Dia</button></article>
    <article class="goal-central-card"><h3>Esta semana</h3><div class="card-meta-grid"><span>Semana: ${formatDateBR(ws)} a ${formatDateBR(addDays(ws,6))}</span><span>Horas previstas: ${formatHours(week.planned)}</span><span>Horas já cumpridas: ${formatHours(week.done)}</span><span>Assuntos previstos: ${week.subjects}</span><span>Assuntos concluídos: ${week.completed}</span><span>Disciplinas previstas: ${week.disciplines}</span><span>Percentual: ${week.percent}%</span></div><button data-central-week type="button">Gerar metas da semana</button></article>
    <article class="goal-central-card"><h3>Este mês</h3><div class="card-meta-grid"><span>Mês: ${today.slice(5,7)}/${today.slice(0,4)}</span><span>Horas previstas: ${formatHours(month.planned)}</span><span>Assuntos previstos: ${month.subjects}</span><span>Assuntos concluídos: ${month.completed}</span><span>Disciplinas previstas: ${month.disciplines}</span><span>Percentual: ${month.percent}%</span></div><button data-central-month type="button">Gerar metas do mês</button></article>`;
  if (elements.centralScaleSummary) elements.centralScaleSummary.innerHTML = `<article class="stat-card"><span>Tipo de escala</span><strong>${escapeHTML(planningConfig().scaleType)}</strong></article><article class="stat-card"><span>Ponto hoje</span><strong>${escapeHTML(dayTypeLabel(av))}</strong></article><article class="stat-card"><span>Próximo plantão</span><strong class="stat-value-date">${nextDateByType('plantão') ? formatDateBR(nextDateByType('plantão')) : '-'}</strong></article><article class="stat-card"><span>Próxima folga</span><strong class="stat-value-date">${nextDateByType('folga') ? formatDateBR(nextDateByType('folga')) : '-'}</strong></article>`;
  if (elements.centralNextDates) elements.centralNextDates.innerHTML = daysBetween(today, 10).map(d=>{ const a=availabilityForDate(d), g=state.dailyGoals.filter(x=>x.date===d); return `<tr><td>${formatDateBR(d)}</td><td>${parseDate(d).toLocaleDateString('pt-BR',{weekday:'long'})}</td><td>${escapeHTML(dayTypeLabel(a))}</td><td>${a.hours}h</td><td>${g.length || (a.type==='indisponível'?0:planningConfig().topicsPerDay)}</td></tr>`; }).join('');
  renderSmartReviewBlock(elements.centralSmartReview);
  if (elements.dashboardGoalsScaleSummary) elements.dashboardGoalsScaleSummary.innerHTML = `<article class="stat-card"><span>Hoje</span><strong>${escapeHTML(dayTypeLabel(av))}</strong></article><article class="stat-card"><span>Meta de hoje</span><strong class="stat-value-compact">${formatHours(dayStats.target || av.hours*60)}</strong></article><article class="stat-card"><span>Meta da semana</span><strong class="stat-value-compact">${formatHours(week.planned)}</strong></article><article class="stat-card"><span>Meta do mês</span><strong class="stat-value-compact">${formatHours(month.planned)}</strong></article><article class="stat-card"><span>Próximo plantão</span><strong class="stat-value-date">${nextDateByType('plantão') ? formatDateBR(nextDateByType('plantão')) : '-'}</strong></article><article class="stat-card"><span>Próxima folga</span><strong class="stat-value-date">${nextDateByType('folga') ? formatDateBR(nextDateByType('folga')) : '-'}</strong></article>`;
}

function renderDailyGoals() {
  if (!elements.dailyGoalsList) return;
  renderSmartReviewBlock(elements.daySmartReview, elements.goalDate?.value || todayISO());
  const date = elements.goalDate?.value || todayISO();
  const availability = availabilityForDate(date);
  const dayGoals = state.dailyGoals.filter((g) => g.date === date).sort((a,b) => isGoalDone(a) - isGoalDone(b) || (a.status || "").localeCompare(b.status || "") || a.discipline.localeCompare(b.discipline));
  const otherDates = state.dailyGoals.some((g) => g.date !== date);
  const stats = goalProgressStats(dayGoals, availability);
  if (elements.selectedGoalDateLabel) elements.selectedGoalDateLabel.textContent = formatDateBR(date);
  if (elements.dailyGoalsSummary) {
    elements.dailyGoalsSummary.innerHTML = `
      <article class="stat-card"><span>Data selecionada</span><strong class="stat-value-date">${formatDateBR(date)}</strong></article>
      <article class="stat-card"><span>Tipo do dia</span><strong>${escapeHTML(dayTypeLabel(availability))}</strong></article>
      <article class="stat-card"><span>Meta de horas do dia</span><strong class="stat-value-compact">${stats.target ? formatHours(stats.target) : "-"}</strong></article>
      <article class="stat-card"><span>Tempo já realizado</span><strong class="stat-value-compact">${formatHours(stats.done)}</strong></article>
      <article class="stat-card"><span>Tempo faltante</span><strong class="stat-value-compact">${formatHours(stats.remaining)}</strong></article>
      <article class="stat-card"><span>Percentual cumprido</span><strong class="stat-value-compact">${stats.timePct}%</strong></article>
      <article class="stat-card"><span>Quantidade de disciplinas previstas</span><strong class="stat-value-compact">${new Set(dayGoals.map((g)=>g.discipline)).size}</strong></article>
      <article class="stat-card"><span>Quantidade de assuntos previstos</span><strong class="stat-value-compact">${dayGoals.length}</strong></article>
      <article class="stat-card"><span>Metas concluídas</span><strong class="stat-value-compact">${stats.completed}</strong></article>
      <article class="stat-card"><span>Metas pendentes</span><strong class="stat-value-compact">${stats.pending}</strong></article>
      <article class="stat-card wide-stat"><span>Metas: ${stats.completed} de ${dayGoals.length} concluídas — ${stats.goalsPct}%</span><div class="progress"><span style="width:${stats.goalsPct}%"></span></div></article>
      <article class="stat-card wide-stat"><span>Tempo: ${formatHours(stats.done)} de ${stats.target ? formatHours(stats.target) : "0h"} — ${stats.timePct}%</span><div class="progress"><span style="width:${stats.timePct}%"></span></div></article>`;
  }
  renderNextDailyGoal(dayGoals);
  const notices = [];
  if (availability.type === "indisponível") notices.push(`<p class="notice warning-notice">Dia marcado como indisponível. A geração automática só acontece mediante confirmação.</p>`);
  if (!dayGoals.length && otherDates) notices.push(`<p class="notice">Não há metas nesta data, mas existem metas cadastradas em outros dias. Use o Calendário de Metas ou altere a data.</p>`);
  if (!dayGoals.length) {
    elements.dailyGoalsList.innerHTML = `${notices.join("")}<p class="empty-message">Nenhuma meta cadastrada para esta data.</p><button class="big-action-button" type="button" data-generate-selected-date>Gerar metas para esta data</button>`;
    return;
  }
  const groups = [
    ["Pendentes", dayGoals.filter((g)=>!isGoalDone(g) && !isGoalInProgress(g)), "Nenhuma meta pendente."],
    ["Em andamento", dayGoals.filter(isGoalInProgress), "Nenhuma meta em andamento."],
    ["Concluídas", dayGoals.filter(isGoalDone), "Nenhuma meta concluída."]
  ];
  elements.dailyGoalsList.innerHTML = notices.join("") + groups.map(([title, goals, empty]) => `<section class="goal-status-section"><h3>${title}</h3>${goals.length ? goals.map((goal, index)=>dailyGoalCard(goal, dayGoals.indexOf(goal) + 1)).join("") : `<p class="empty-message">${empty}</p>`}</section>`).join("");
}
function renderNextDailyGoal(dayGoals) {
  if (!elements.nextDailyGoal) return;
  const next = dayGoals.find((g)=>!isGoalDone(g) && !["Não cumprida", "Ignorada", "Adiada", "Reagendada"].includes(g.status || ""));
  if (!next) { elements.nextDailyGoal.innerHTML = `<h3>Próxima meta</h3><p>Todas as metas do dia foram concluídas.</p>`; return; }
  elements.nextDailyGoal.innerHTML = `<h3>Próxima meta</h3><strong>${escapeHTML(next.discipline)}</strong><p>${escapeHTML(next.subject)}</p><div class="item-meta">Tempo planejado: ${Number(next.minutes||0)} min • Prioridade: ${escapeHTML(next.priority || next.prioridade || "-")}</div><div class="card-actions"><button type="button" data-goal-action="Concluída" data-id="${next.id}">Concluir</button><button type="button" data-goal-action="Tempo" data-id="${next.id}">Registrar tempo</button><button type="button" data-register-goal="${next.id}">Registrar questões</button></div>`;
}
function dailyGoalCard(goal, number = 1) {
  const linked = materialsForTopic(goal.discipline, goal.subject, goal.syllabusItemId);
  const firstMaterialButton = linked[0] ? `<button type="button" data-open-material="${linked[0].id}">Abrir material</button>` : "";
  return `<article class="syllabus-card daily-goal-card goal-status-${canonical(goal.status)}">
    <header><div><span class="goal-number">Meta ${number}</span><h3>${escapeHTML(goal.discipline)}</h3><div class="goal-subject">${escapeHTML(goal.subject)}</div><div class="item-meta">${escapeHTML(goal.type || goal.tipo || "Meta")} — ${Number(goal.minutes||0)} min</div></div><span class="badge ${goal.status === "Concluída" ? "success" : goal.priority === "Alta" ? "danger" : "warn"}">Status: ${escapeHTML(goal.status || "Pendente")}</span></header>
    <div class="card-meta-grid">
      <span>Disciplina: ${escapeHTML(goal.discipline)}</span><span>Assunto: ${escapeHTML(goal.subject)}</span><span>Tipo: ${escapeHTML(goal.type || goal.tipo || "-")}</span><span>Prioridade: ${escapeHTML(goal.priority || goal.prioridade || "-")}</span>
      <span>Tempo planejado: ${Number(goal.minutes||0)} min</span><span>Tempo realizado: ${Number(goal.actualMinutes||0)} min</span><span>Status: ${escapeHTML(goal.status || "Pendente")}</span><span>Referência: ${escapeHTML(goal.referencia_edital || getSyllabusById(goal.syllabusItemId)?.reference || "-")}</span>
    </div>${linkedMaterialsHTML(linked)}
    <div class="card-actions"><button type="button" data-goal-action="Concluída" data-id="${goal.id}">Concluir</button><button type="button" data-goal-action="Tempo" data-id="${goal.id}">Registrar tempo</button><button type="button" data-goal-action="Adiada" data-id="${goal.id}">Adiar</button><button type="button" data-goal-action="Não cumprida" data-id="${goal.id}">Não cumprir</button><button type="button" data-register-goal="${goal.id}">Registrar questões</button>${firstMaterialButton}</div>
  </article>`;
}
function questionNumbers() { const total = Number(elements.questionTotal.value), correct = Number(elements.questionCorrect.value), wrong = Number(elements.questionWrong.value), blank = Number(elements.questionBlank.value); return { total, correct, wrong, blank, sum: correct + wrong + blank, accuracy: total ? correct / total * 100 : 0, errorPct: total ? wrong / total * 100 : 0, blankPct: total ? blank / total * 100 : 0, net: correct - wrong }; }
function analysisMessage(n) { if (!n.total) return ""; if (n.accuracy >= 80) return "Bom desempenho: percentual de acerto acima de 80%. Em Cebraspe, os erros reduzem diretamente o líquido."; if (n.accuracy < 70) return "Atenção: percentual inferior a 70%. Recomenda-se revisão do assunto. Em Cebraspe, os erros reduzem diretamente o líquido."; return "Assunto ainda sem domínio consolidado. Programe nova revisão."; }
function updateQuestionCalculated() { const n = questionNumbers(); elements.questionCalculated.innerHTML = `Total calculado: <strong>${n.sum || 0}</strong> • Acerto: <strong>${n.accuracy.toFixed(1)}%</strong> • Erro: <strong>${n.errorPct.toFixed(1)}%</strong> • Brancos: <strong>${n.blankPct.toFixed(1)}%</strong> • Líquido Cebraspe: <strong>${n.net || 0}</strong>`; elements.questionAnalysis.textContent = analysisMessage(n); }
function validateQuestionLog(n) { if (!elements.questionDiscipline.value) return "Disciplina vazia."; if (!elements.questionSyllabusItem.value) return "Assunto vazio."; if (!n.total) return "Total de questões vazio."; if ([n.total,n.correct,n.wrong,n.blank].some((v) => Number.isNaN(v) || v < 0)) return "Não use números negativos."; if (n.sum > n.total) return "Acertos + erros + brancos não pode ser maior que total de questões."; return ""; }
function domainFromAccuracy(total, accuracy) { if (!total) return "Sem diagnóstico"; if (accuracy >= 80) return "Forte"; if (accuracy >= 70) return "Médio"; return "Fraco"; }
function recomputeSyllabusQuestionStats(item) { const logs = state.questionLogs.filter((log) => log.syllabusItemId === item.id); const totals = logs.reduce((a,l) => ({ total:a.total+l.total, correct:a.correct+l.correct, wrong:a.wrong+l.wrong, blank:a.blank+l.blank, net:a.net+l.cebraspeNet }), { total:0, correct:0, wrong:0, blank:0, net:0 }); const accuracy = totals.total ? totals.correct / totals.total * 100 : 0; item.questionsTotal = totals.total; item.questionsCorrect = totals.correct; item.questionsWrong = totals.wrong; item.questionsBlank = totals.blank; item.accuracyRate = Math.round(accuracy); item.cebraspeNet = totals.net; item.lastTrainingDate = logs.sort((a,b) => b.date.localeCompare(a.date))[0]?.date || ""; item.domain = domainFromAccuracy(totals.total, accuracy); item.manualWeak = item.domain === "Fraco" ? item.manualWeak : false; }
function saveQuestionLog(event) { event.preventDefault(); const n = questionNumbers(); const error = validateQuestionLog(n); if (error) return alert(error); const item = getSyllabusById(elements.questionSyllabusItem.value); const id = elements.questionEditingId.value || createId(); const log = { id, date: elements.questionDate.value, discipline: elements.questionDiscipline.value, syllabusItemId: item.id, subject: item.subject, board: elements.questionBoard.value, minutes: Number(elements.questionMinutes?.value) || 0, total: n.total, correct: n.correct, wrong: n.wrong, blank: n.blank, accuracyRate: Number(n.accuracy.toFixed(1)), errorRate: Number(n.errorPct.toFixed(1)), blankRate: Number(n.blankPct.toFixed(1)), cebraspeNet: n.net, notes: elements.questionNotes.value.trim(), trainingType: elements.questionTrainingType.value, origin: elements.questionOrigin.value || "avulso", linkedGoalId: elements.questionLinkedGoalId.value || "" }; const idx = state.questionLogs.findIndex((q) => q.id === id); if (idx >= 0) state.questionLogs[idx] = log; else state.questionLogs.push(log); recomputeSyllabusQuestionStats(item); alert(analysisMessage(n)); if (log.linkedGoalId && confirm("Deseja marcar a meta vinculada como concluída?")) { const goal = state.dailyGoals.find((g) => g.id === log.linkedGoalId); if (goal) updateGoalDone(goal); } elements.questionForm.reset(); elements.questionEditingId.value = ""; elements.questionLinkedGoalId.value = ""; elements.questionOrigin.value = "avulso"; elements.questionDate.value = todayISO(); render(); }
function getQuestionTotals() { return state.questionLogs.reduce((a,l) => ({ total:a.total+l.total, correct:a.correct+l.correct, wrong:a.wrong+l.wrong, blank:a.blank+l.blank, net:a.net+l.cebraspeNet }), { total:0, correct:0, wrong:0, blank:0, net:0 }); }
function problemQuestionDiscipline() { const by = state.questionLogs.reduce((a,l)=>{ const k=l.discipline||"Sem disciplina"; a[k] ||= { total:0, correct:0 }; a[k].total += Number(l.total)||0; a[k].correct += Number(l.correct)||0; return a; }, {}); const worst = Object.entries(by).filter(([,v])=>v.total>0).sort((a,b)=>(a[1].correct/a[1].total)-(b[1].correct/b[1].total))[0]; return worst ? `${worst[0]} (${Math.round(worst[1].correct/worst[1].total*100)}%)` : "-"; }
function renderQuestionHistory() { const filtered = state.questionLogs.filter((log) => (!elements.questionFilterDiscipline.value || log.discipline === elements.questionFilterDiscipline.value) && (!elements.questionFilterSubject.value || log.syllabusItemId === elements.questionFilterSubject.value) && (!elements.questionFilterBoard.value || log.board === elements.questionFilterBoard.value)).sort((a,b) => b.date.localeCompare(a.date)); elements.questionHistoryBody.innerHTML = filtered.map((log) => `<tr><td>${formatDateBR(log.date)}</td><td>${escapeHTML(log.discipline)}</td><td>${escapeHTML(log.subject)}</td><td>${escapeHTML(log.board)}</td><td>${log.total}</td><td>${log.correct}</td><td>${log.wrong}</td><td>${log.blank}</td><td>${log.accuracyRate}%</td><td>${log.cebraspeNet}</td><td>${escapeHTML(log.origin)}</td><td>${escapeHTML(log.notes || "-")}</td><td><button type="button" data-edit-question="${log.id}">Editar</button><button class="danger" type="button" data-delete-question="${log.id}">Excluir</button></td></tr>`).join(""); }
function fillQuestionFromGoal(goalId) { const goal = state.dailyGoals.find((g) => g.id === goalId); if (!goal) return; elements.questionDate.value = goal.date; elements.questionDiscipline.value = goal.discipline; optionsForItems(elements.questionSyllabusItem, goal.discipline, goal.syllabusItemId); elements.questionSyllabusItem.value = goal.syllabusItemId; elements.questionOrigin.value = "meta do dia"; elements.questionLinkedGoalId.value = goal.id; showView("questoes"); }
function editQuestionLog(id) { const log = state.questionLogs.find((q) => q.id === id); if (!log) return; elements.questionEditingId.value = log.id; elements.questionDate.value = log.date; elements.questionDiscipline.value = log.discipline; optionsForItems(elements.questionSyllabusItem, log.discipline, log.syllabusItemId); elements.questionSyllabusItem.value = log.syllabusItemId; elements.questionBoard.value = log.board; elements.questionTrainingType.value = log.trainingType; elements.questionTotal.value = log.total; elements.questionCorrect.value = log.correct; elements.questionWrong.value = log.wrong; elements.questionBlank.value = log.blank; elements.questionNotes.value = log.notes; elements.questionOrigin.value = log.origin; elements.questionLinkedGoalId.value = log.linkedGoalId; updateQuestionCalculated(); showView("questoes"); }


elements.planningConfigForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  const c = planningConfig();
  c.examDate = elements.planningExamDate.value; c.scaleType = elements.planningScaleType.value; c.cycleType = c.scaleType; c.scaleReferenceDate = elements.planningScaleReferenceDate?.value || c.scaleReferenceDate || todayISO(); c.scaleReferencePosition = Number(elements.planningScaleReferencePosition?.value) || 0; c.scaleNotes = elements.planningScaleNotes.value.trim();
  c.shiftHours = Number(elements.planningShiftHours.value) || 0; c.restHours = Number(elements.planningRestHours.value) || 0; c.normalHours = Number(elements.planningNormalHours.value) || 0;
  c.minWeeklyHours = Number(elements.planningMinWeeklyHours.value) || 0; c.idealWeeklyHours = Number(elements.planningIdealWeeklyHours.value) || 0; c.weeklyTopics = Number(elements.planningWeeklyTopics.value) || 0; c.disciplinesPerDay = Number(elements.planningDisciplinesPerDay.value) || 2; c.disciplinesPerWeek = Number(elements.planningDisciplinesPerWeek.value) || 6; c.disciplinesPerMonth = Number(elements.planningDisciplinesPerMonth.value) || 10; c.topicsPerDay = Number(elements.planningTopicsPerDay.value) || 3; c.topicsPerWeek = Number(elements.planningTopicsPerWeek.value) || c.weeklyTopics || 8; c.topicsPerMonth = Number(elements.planningTopicsPerMonth.value) || 40; c.safetyDays = Number(elements.planningSafetyDays.value) || 0;
  if (c.examDate) state.edital.examDate = c.examDate;
  render(); showView("planejamento");
});
elements.availabilityCalendar?.addEventListener("change", (event) => {
  const typeDate = event.target.dataset.availabilityType;
  const hoursDate = event.target.dataset.availabilityHours;
  const date = typeDate || hoursDate;
  if (!date) return;
  const current = availabilityForDate(date);
  if (typeDate) state.planning.availability[date] = { type: event.target.value, hours: availabilityDefaults(event.target.value) };
  if (hoursDate) state.planning.availability[date] = { ...current, hours: Number(event.target.value) || 0 };
  render();
});

if (elements.generateDailyGoals) elements.generateDailyGoals.addEventListener("click", generateDailyGoals);
elements.planningScaleType?.addEventListener("change", () => { if (elements.scale3x6Fields) elements.scale3x6Fields.hidden = elements.planningScaleType.value !== "3 dias de trabalho / 6 dias de folga"; });
elements.centralOpenDayPlan?.addEventListener("click", () => { elements.goalDate.value=todayISO(); renderDailyGoals(); showView("metas-do-dia"); });
elements.centralGoalsCards?.addEventListener("click", (event) => { if (event.target.closest("[data-central-open-day]")) { elements.goalDate.value=todayISO(); renderDailyGoals(); showView("metas-do-dia"); } if (event.target.closest("[data-central-week]")) { if(elements.calendarDate) elements.calendarDate.value=todayISO(); generateWeekGoals(); } if (event.target.closest("[data-central-month]")) { if(elements.calendarDate) elements.calendarDate.value=todayISO(); generateMonthGoals(); } });
elements.goalDate?.addEventListener("change", () => { renderDailyGoals(); renderGoalDashboardCards(); });
elements.generateWeekGoals?.addEventListener("click", generateWeekGoals);
elements.generateMonthGoals?.addEventListener("click", generateMonthGoals);
[elements.calendarDate, elements.calendarViewMode].filter(Boolean).forEach((el)=>el.addEventListener("change", renderGoalCalendar));
elements.disciplineWeightsList?.addEventListener("change", (event)=>{ const d=event.target.dataset.disciplineWeight; if(d){ state.disciplineWeights[d]=Number(event.target.value)||3; render(); }});
[elements.monthlyTopicGoal, elements.monthlyHourGoal].filter(Boolean).forEach((el)=>el.addEventListener("change",()=>{ const key=(elements.calendarDate?.value||todayISO()).slice(0,7); state.monthlyGoals[key]={ topics:Number(elements.monthlyTopicGoal.value)||0, hours:Number(elements.monthlyHourGoal.value)||0 }; render(); }));
elements.goalCalendarContent?.addEventListener("click", (event)=>{ const openPlan=event.target.closest("[data-open-day-plan]"); if(openPlan){ elements.goalDate.value=openPlan.dataset.openDayPlan; renderDailyGoals(); return showView("metas-do-dia"); } const b=event.target.closest("button[data-calendar-action],button[data-register-goal]"); if(!b) return; if(b.dataset.registerGoal) return fillQuestionFromGoal(b.dataset.registerGoal); const goal=state.dailyGoals.find(g=>g.id===b.dataset.id); if(!goal) return; if(b.dataset.calendarAction==="done") updateGoalDone(goal); if(b.dataset.calendarAction==="postpone") postponeGoal(goal); if(b.dataset.calendarAction==="time") registerGoalTime(goal); if(b.dataset.calendarAction==="edit") editGoal(goal); render(); });
elements.goalCalendarContent?.addEventListener("keydown", (event)=>{ if (!["Enter", " "].includes(event.key)) return; const openPlan=event.target.closest("[data-open-day-plan]"); if (!openPlan) return; event.preventDefault(); elements.goalDate.value=openPlan.dataset.openDayPlan; renderDailyGoals(); showView("metas-do-dia"); });
elements.goalDiscipline.addEventListener("change", () => optionsForItems(elements.goalSyllabusItem, elements.goalDiscipline.value));
elements.questionDiscipline.addEventListener("change", () => optionsForItems(elements.questionSyllabusItem, elements.questionDiscipline.value));
elements.goalSyllabusItem.addEventListener("change", () => { const item = getSyllabusById(elements.goalSyllabusItem.value); if (item) { elements.goalDiscipline.value = item.discipline; elements.goalPriority.value = item.priority; elements.goalType.value = goalTypeForItem(item); } });

function handleDailyGoalActionClick(event) {
  const button = event.target.closest("button[data-register-goal]");
  if (button) return fillQuestionFromGoal(button.dataset.registerGoal);
  if (event.target.closest("button[data-generate-selected-date]")) return generateDailyGoals();
  const action = event.target.closest("button[data-goal-action]");
  if (action) {
    const goal = state.dailyGoals.find((g) => g.id === action.dataset.id);
    if (goal) {
      if (action.dataset.goalAction === "Adiada") postponeGoal(goal);
      else if (action.dataset.goalAction === "Tempo") registerGoalTime(goal);
      else if (action.dataset.goalAction === "Concluída") updateGoalDone(goal);
      else { goal.status = action.dataset.goalAction; appendGoalHistory(goal, `Status alterado para ${goal.status}.`); showDailyGoalMessage(`Status alterado para ${goal.status}.`, "success"); saveData(); }
      render();
    }
  }
}
elements.goalForm.addEventListener("submit", (event) => { event.preventDefault(); const item = getSyllabusById(elements.goalSyllabusItem.value); if (!item) return alert("Selecione um assunto do edital verticalizado."); const selectedDate = elements.goalDate.value || todayISO(); state.dailyGoals.push({ id: createId(), date: selectedDate, data: selectedDate, discipline: elements.goalDiscipline.value, disciplina: elements.goalDiscipline.value, syllabusItemId: item.id, subject: item.subject, assunto: item.subject, referencia_edital: item.reference || "", type: elements.goalType.value, tipo: elements.goalType.value.toLowerCase(), minutes: Number(elements.goalMinutes.value), priority: elements.goalPriority.value, prioridade: elements.goalPriority.value, status: elements.goalStatus.value, actualMinutes: Number(elements.goalActualMinutes?.value) || 0, studyStatus: elements.goalStudyStatus?.value || "Iniciado", notes: elements.goalNotes.value.trim() }); elements.goalForm.reset(); elements.goalDate.value = selectedDate; render(); });
elements.dailyGoalsList.addEventListener("click", handleDailyGoalActionClick);
elements.nextDailyGoal?.addEventListener("click", handleDailyGoalActionClick);
document.addEventListener("click", (event) => { const btn = event.target.closest("button[data-smart-review-action]"); if (!btn) return; saveSmartReviewAction(btn.dataset.id, btn.dataset.smartReviewAction === "done" ? "revisado" : "adiado"); });
document.addEventListener("change", (event) => { const input = event.target.closest("input[data-smart-review-time]"); if (!input) return; upsertSmartReviewTime(input.dataset.id, input.dataset.smartReviewTime, input.value); });
elements.viewDayPlan?.addEventListener("click", () => { elements.goalDate.value = todayISO(); renderDailyGoals(); showView("metas-do-dia"); });
elements.dailyGoalsList.addEventListener("change", (event) => { const id = event.target.dataset.goalStatus; if (!id) return; const goal = state.dailyGoals.find((g) => g.id === id); if (goal) { goal.status = event.target.value; render(); } });
[elements.questionTotal, elements.questionCorrect, elements.questionWrong, elements.questionBlank].forEach((input) => input.addEventListener("input", updateQuestionCalculated));
elements.questionForm.addEventListener("submit", saveQuestionLog);
[elements.questionFilterDiscipline, elements.questionFilterSubject, elements.questionFilterBoard].forEach((filter) => filter.addEventListener("change", () => { renderQuestionSelectors(); renderQuestionHistory(); }));
if (elements.newMockExam) elements.newMockExam.addEventListener("click", resetMockForm);
[elements.mockTotalQuestions, elements.mockCorrect, elements.mockWrong, elements.mockBlank, elements.mockGoal].filter(Boolean).forEach((input) => input.addEventListener("input", renderMockCalculated));
elements.addMockDiscipline?.addEventListener("click", addMockDiscipline);
elements.clearMockDisciplines?.addEventListener("click", () => { mockDisciplineDraft = []; renderMockDraft(); });
elements.mockDisciplineDraft?.addEventListener("click", (event) => { const button = event.target.closest("button[data-remove-mock-discipline]"); if (button) { mockDisciplineDraft.splice(Number(button.dataset.removeMockDiscipline), 1); renderMockDraft(); } });
elements.mockExamForm?.addEventListener("submit", saveMock);
elements.mockHistory?.addEventListener("click", (event) => { const view = event.target.closest("button[data-view-mock]"); const edit = event.target.closest("button[data-edit-mock]"); const duplicate = event.target.closest("button[data-duplicate-mock]"); const del = event.target.closest("button[data-delete-mock]"); if (view) { const m = state.simulados.find((x)=>x.id===view.dataset.viewMock); if (m) { state.simulados = state.simulados.filter((x)=>x.id!==m.id).concat(m); render(); } } if (edit) editMock(edit.dataset.editMock); if (duplicate) { const m = state.simulados.find((x)=>x.id===duplicate.dataset.duplicateMock); if (m) { state.simulados.push(prepareMock({ ...cloneData(m), id:createId(), name:`${m.name} (cópia)` })); render(); } } if (del && confirm("Excluir este simulado?")) { state.simulados = state.simulados.filter((x)=>x.id!==del.dataset.deleteMock); render(); } });

elements.questionHistoryBody.addEventListener("click", (event) => { const edit = event.target.closest("button[data-edit-question]"); const del = event.target.closest("button[data-delete-question]"); if (edit) editQuestionLog(edit.dataset.editQuestion); if (del && confirm("Excluir este lançamento de questões?")) { const log = state.questionLogs.find((q) => q.id === del.dataset.deleteQuestion); state.questionLogs = state.questionLogs.filter((q) => q.id !== del.dataset.deleteQuestion); if (log) { const item = getSyllabusById(log.syllabusItemId); if (item) recomputeSyllabusQuestionStats(item); } render(); } });



elements.qbFile?.addEventListener("change", async (event) => { const file=event.target.files?.[0]; if(!file) return; try { const incoming=questionBankFromPayload(JSON.parse(await file.text())); if(!incoming.length) throw new Error("Nenhuma questão válida encontrada no JSON."); const map=new Map((state.questionBank||[]).map(q=>[q.id,q])); incoming.forEach(q=>map.set(q.id,q)); state.questionBank=[...map.values()]; elements.qbMessage.textContent=`${incoming.length} questão(ões) importada(s). Banco atual: ${state.questionBank.length}.`; saveData(); renderQuestionBank(); } catch(error) { elements.qbMessage.textContent=`Erro ao importar: ${error.message}`; } finally { event.target.value=""; } });
elements.qbStartTraining?.addEventListener("click", () => qbStart());
elements.qbNewTraining?.addEventListener("click", () => { elements.qbResultPanel.hidden = true; qbStart(); });
elements.qbRedoBlanks?.addEventListener("click", () => { const last=(state.questionBankSessions||[])[0]; const ids=new Set((last?.items||[]).filter(i=>!i.marcado||i.marcado==="B").map(i=>i.id)); qbStart((state.questionBank||[]).filter(q=>ids.has(q.id))); });
elements.qbPreviewFiltered?.addEventListener("click", qbPreview);
elements.qbSyllabusPackages?.addEventListener("click", (event) => { const button = event.target.closest("button[data-qb-package]"); if (!button) return; const pkg = qbPackageByDiscipline(button.dataset.qbPackage); if (!pkg) return alert("Pacote não encontrado."); qbStart(qbQuestionsForPackageMode(pkg, button.dataset.qbPackageMode)); });
elements.qbQuestionCard?.addEventListener("click", (event) => { if(!questionBankTraining) return; const answer=event.target.closest("[data-qb-answer]")?.dataset.qbAnswer; if(answer){ const q=questionBankTraining.items[questionBankTraining.index]; questionBankTraining.answers[q.id]=answer; if(questionBankTraining.index < questionBankTraining.items.length-1) questionBankTraining.index++; return qbRenderQuestion(); } const nav=event.target.closest("[data-qb-nav]")?.dataset.qbNav; if(nav==="prev"&&questionBankTraining.index>0) questionBankTraining.index--; if(nav==="next"&&questionBankTraining.index<questionBankTraining.items.length-1) questionBankTraining.index++; if(nav) qbRenderQuestion(); if(event.target.closest("[data-qb-finish]")) qbFinish(); });
[elements.qbTrainingScope,elements.qbReviewType,elements.qbFilterDiscipline,elements.qbFilterSubject,elements.qbFilterTheme,elements.qbFilterBoard,elements.qbFilterYear].filter(Boolean).forEach((el)=>el.addEventListener("change", qbPreview));
elements.qbFilterSearch?.addEventListener("input", qbPreview);
elements.qbExportBank?.addEventListener("click", () => qbDownload("metas-estudo-banco-questoes.json", { schema:"metas-estudo-question-bank-v1", questionBank: state.questionBank || [] }));
elements.qbExportResults?.addEventListener("click", () => qbDownload("metas-estudo-resultados-banco-questoes.json", { schema:"metas-estudo-question-bank-sessions-v1", questionBankSessions: state.questionBankSessions || [] }));
elements.qbClearBank?.addEventListener("click", () => { if(!confirm("Apagar banco de questões e treinos locais?")) return; state.questionBank=[]; state.questionBankSessions=[]; saveData(); renderQuestionBank(); elements.qbFilteredPreview.innerHTML=""; elements.qbTrainingPanel.hidden=true; elements.qbResultPanel.hidden=true; elements.qbMessage.textContent="Banco local limpo."; });

if (elements.materialForm) elements.materialForm.addEventListener("submit", saveMaterial);
elements.materialDiscipline?.addEventListener("input", renderMaterialSelectors);
elements.studySubject?.addEventListener("change", updateStudyMaterialOptions);
elements.studyTopic?.addEventListener("input", updateStudyMaterialOptions);
[elements.materialFilterDiscipline, elements.materialFilterSubject, elements.materialFilterType, elements.materialFilterOrigin, elements.materialFilterText].filter(Boolean).forEach((filter) => filter.addEventListener("input", renderMaterials));
[elements.materialFilterDiscipline, elements.materialFilterSubject, elements.materialFilterType, elements.materialFilterOrigin].filter(Boolean).forEach((filter) => filter.addEventListener("change", renderMaterials));
document.addEventListener("click", (event) => { const open = event.target.closest("button[data-open-material]"); const edit = event.target.closest("button[data-edit-material]"); const del = event.target.closest("button[data-delete-material]"); if (open) openMaterial(open.dataset.openMaterial); if (edit) editMaterial(edit.dataset.editMaterial); if (del && confirm("Excluir este material?")) { state.materials = state.materials.filter((m)=>m.id!==del.dataset.deleteMaterial); render(); } });

mergeCompatibleLocalStorageData();
renderMotivationalPhrase();
render();
showStorageWarningIfNeeded();

const viewLinks = [...document.querySelectorAll("[data-view-link]")];
const viewPanels = [...document.querySelectorAll(".app-view")];
const viewAliases = { verticalizado: "edital-verticalizado" };
const viewIds = new Set(viewPanels.map((panel) => panel.dataset.view));
const menuToggle = document.getElementById("menuToggle");
const mainMenu = document.getElementById("mainMenu");
const menuClose = document.getElementById("menuClose");
const menuOverlay = document.getElementById("menuOverlay");

function normalizeViewId(viewId) {
  const normalized = String(viewId || "").replace(/^#/, "") || "dashboard";
  return viewAliases[normalized] || normalized;
}

function hashToView() {
  const view = normalizeViewId(window.location.hash);
  return viewIds.has(view) ? view : "dashboard";
}

function renderGoalDashboardCards() { const today=todayISO(), ws=weekStart(today), we=addDays(ws,6); const tg=state.dailyGoals.filter(g=>g.date===today), wg=goalsBetween(ws,we), mg=state.dailyGoals.filter(g=>g.date.slice(0,7)===today.slice(0,7)); const av=availabilityForDate(today); const stats=goalProgressStats(tg,av); const nextToday=tg.find(g=>!isGoalDone(g) && !["Não cumprida","Ignorada","Adiada","Reagendada"].includes(g.status||"")); const next=state.dailyGoals.filter(g=>g.status!=="Concluída" && g.date>=today).sort((a,b)=>a.date.localeCompare(b.date))[0]; const delayed=Object.entries(state.syllabusItems.filter(i=>!completedStatus(i)&&i.status!=="Ignorado").reduce((a,i)=>(a[i.discipline]=(a[i.discipline]||0)+1,a),{})).sort((a,b)=>b[1]-a[1])[0]; const top=Object.entries(wg.reduce((a,g)=>(a[g.discipline]=(a[g.discipline]||0)+1,a),{})).sort((a,b)=>b[1]-a[1])[0]; if(elements.dashboardTodayGoal) elements.dashboardTodayGoal.textContent=stats.target?formatHours(stats.target):"0h"; if(elements.dashboardTodayGoalDetail) elements.dashboardTodayGoalDetail.textContent=`${tg.length} meta(s) para hoje`; if(elements.dashboardDailyGoalRate) elements.dashboardDailyGoalRate.textContent=stats.goalsPct+"%"; if(elements.dashboardTodayRemaining) elements.dashboardTodayRemaining.textContent=formatHours(stats.remaining); if(elements.dashboardNextTodayGoal) elements.dashboardNextTodayGoal.textContent=nextToday?`${nextToday.discipline}: ${nextToday.subject}`:"Todas concluídas ou sem metas"; if(elements.todayGoalsTotal) elements.todayGoalsTotal.textContent=tg.length; if(elements.todayPendingGoals) elements.todayPendingGoals.textContent=stats.pending; if(elements.todayDoneGoals) elements.todayDoneGoals.textContent=stats.completed; if(elements.weekGoalsTotal) elements.weekGoalsTotal.textContent=wg.length; if(elements.weekGoalRate) elements.weekGoalRate.textContent=completionRate(wg)+"%"; if(elements.monthGoalRate) elements.monthGoalRate.textContent=completionRate(mg)+"%"; if(elements.nextGoalLabel) elements.nextGoalLabel.textContent=next?`${next.date} — ${next.discipline}: ${next.subject}`:"-"; if(elements.weekTopDiscipline) elements.weekTopDiscipline.textContent=top?`${top[0]} (${top[1]})`:"-"; if(elements.mostDelayedDiscipline) elements.mostDelayedDiscipline.textContent=delayed?`${delayed[0]} (${delayed[1]})`:"-"; }
function renderView(viewId) {
  const renderers = {
    dashboard: () => { renderDashboard(); renderSubjects(); },
    edital: renderEdital,
    "edital-verticalizado": renderSyllabus,
    "importar-edital": renderImportPreview,
    materiais: renderMaterials,
    "assuntos-agendaveis": renderSchedulable,
    "central-metas": renderCentralGoals,
    "metas-do-dia": () => { renderGoalSelectors(); renderDailyGoals(); },
    "calendario-metas": renderGoalCalendar,
    questoes: () => { renderQuestionSelectors(); updateQuestionCalculated(); },
    "historico-questoes": () => { renderQuestionSelectors(); renderQuestionHistory(); },
    simulados: renderSimulados,
    "banco-questoes": renderQuestionBank,
    revisoes: () => { renderReviews(); renderSmartReviewsDashboard(); renderAlerts(); },
    historico: renderHistory,
    backup: renderBackupSummary,
    planejamento: renderPlanning,
    progresso: renderProgressPanel,
    "como-usar": () => {}
  };
  renderers[viewId]?.();
}

function setMobileMenuOpen(isOpen) {
  if (!mainMenu) return;
  mainMenu.classList.toggle("open", isOpen);
  document.body.classList.toggle("mobile-menu-open", isOpen);
  menuOverlay?.classList.toggle("open", isOpen);
  if (menuOverlay) menuOverlay.hidden = !isOpen;
  menuToggle?.setAttribute("aria-expanded", isOpen ? "true" : "false");
}

function showView(viewId = hashToView(), options = {}) {
  const target = viewIds.has(normalizeViewId(viewId)) ? normalizeViewId(viewId) : "dashboard";

  viewPanels.forEach((panel) => {
    const active = panel.id === `view-${target}`;
    panel.classList.toggle("active", active);
    panel.toggleAttribute("hidden", !active);
  });

  viewLinks.forEach((link) => {
    const active = normalizeViewId(link.dataset.viewLink) === target;
    link.classList.toggle("active", active);
    if (active) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });

  if (!options.skipHash && window.location.hash !== `#${target}`) {
    history.pushState(null, "", `#${target}`);
  }

  if (!options.keepMenuOpen) setMobileMenuOpen(false);
  else menuToggle?.setAttribute("aria-expanded", mainMenu?.classList.contains("open") ? "true" : "false");
  renderView(target);
  if (!options.skipScroll) document.querySelector(".screen-stage")?.scrollIntoView({ block: "start" });
}

document.addEventListener("click", (event) => {
  const link = event.target.closest("[data-view-link]");
  if (!link) return;
  event.preventDefault();
  showView(link.dataset.viewLink || link.getAttribute("href"));
});

menuToggle?.addEventListener("click", () => setMobileMenuOpen(!mainMenu?.classList.contains("open")));
menuClose?.addEventListener("click", () => setMobileMenuOpen(false));
menuOverlay?.addEventListener("click", () => setMobileMenuOpen(false));
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") setMobileMenuOpen(false);
});

window.addEventListener("hashchange", () => showView(hashToView()));
showView(hashToView(), { skipScroll: true, keepMenuOpen: true });

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;

  window.addEventListener("load", () => {
    navigator.serviceWorker.register("service-worker.js")
      .then(() => console.log("[Metas Estudo] Service worker registrado."))
      .catch((error) => console.log("[Metas Estudo] Falha ao registrar service worker.", error));
  });
}

registerServiceWorker();
