const STORAGE_KEY = "metasConcursoData";
const SIMULADOS_STORAGE_KEY = "metasEstudoSimulados";
const todayISO = () => new Date().toISOString().slice(0, 10);

const MOTIVATIONAL_MESSAGE_STORAGE_KEY = "metasEstudoMensagemMotivacionalAtual";
const motivationalMessages = [
  "Disciplina vence motivação.",
  "Hoje é dia de ganhar pontos líquidos.",
  "Cada questão corrigida diminui uma dúvida na prova.",
  "Não estude para fechar PDF; estude para acertar questão.",
  "Plantão passa. A aprovação fica.",
  "O edital não se vence em um dia, mas se perde quando você para.",
  "A constância decide antes da prova.",
  "Menos promessa, mais execução.",
  "A meta de hoje protege o resultado de julho.",
  "Quem controla o edital controla a ansiedade.",
  "Cebraspe cobra precisão; treine com critério.",
  "Revise o erro antes que ele vire padrão.",
  "Estudo estratégico começa pelo que mais cai.",
  "A carreira policial exige preparo antes da posse.",
  "Questão errada é mapa de revisão.",
  "O plantão termina; a meta continua registrada.",
  "Faça o básico bem feito todos os dias.",
  "Prova objetiva premia decisão objetiva.",
  "Controle horas, assuntos e desempenho.",
  "Prioridade alta merece execução alta.",
  "A banca testa detalhe; você treina método.",
  "Avance no edital com calma e constância.",
  "Líquido positivo nasce de erro bem corrigido.",
  "Não conte dias; cumpra metas.",
  "A revisão certa economiza pontos na prova.",
  "Carreira policial começa na rotina de hoje.",
  "Seu planejamento reduz improviso na prova.",
  "Marque, corrija, revise e siga.",
  "Assunto fraco precisa de ação, não culpa.",
  "Simulado mostra caminho, não sentença.",
  "A aprovação respeita rotina consistente.",
  "Estude com foco no edital e na banca.",
  "Toda sessão curta pode render avanço real.",
  "Desempenho melhora com registro e ajuste.",
  "Hoje você treina para decidir melhor na prova."
];
const defaultState = { subjects: [], studies: [], edital: { pdf: null }, syllabusItems: [], schedulableSettings: {}, dailyGoals: [], questionLogs: [], simulados: [], settings: { defaultMockGoal: 92 } };
const state = { ...defaultState, ...(JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}) };
state.edital = { ...defaultState.edital, ...(state.edital || {}) };
state.syllabusItems ||= [];
state.schedulableSettings ||= {};
state.dailyGoals ||= [];
state.questionLogs ||= [];
state.simulados ||= JSON.parse(localStorage.getItem(SIMULADOS_STORAGE_KEY) || "[]");
state.settings ||= {};
state.settings.defaultMockGoal ||= 92;
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
  dailyMotivationalMessage: $("#dailyMotivationalMessage"), changeMotivationalMessage: $("#changeMotivationalMessage"),
  subjectForm: $("#subjectForm"), subjectName: $("#subjectName"), subjectGoal: $("#subjectGoal"), subjectList: $("#subjectList"),
  studyForm: $("#studyForm"), studyDate: $("#studyDate"), studySubject: $("#studySubject"), studyTopic: $("#studyTopic"), studyMinutes: $("#studyMinutes"), questionsDone: $("#questionsDone"), correctAnswers: $("#correctAnswers"), wrongAnswers: $("#wrongAnswers"), blankAnswers: $("#blankAnswers"),
  todayHours: $("#todayHours"), weekHours: $("#weekHours"), weeklyGoalStatus: $("#weeklyGoalStatus"), totalQuestions: $("#totalQuestions"), accuracyRate: $("#accuracyRate"), syllabusStudied: $("#syllabusStudied"), syllabusTotal: $("#syllabusTotal"), schedulableTotal: $("#schedulableTotal"), notStartedTotal: $("#notStartedTotal"), undiagnosedTotal: $("#undiagnosedTotal"), weakTotal: $("#weakTotal"), pendingDiscipline: $("#pendingDiscipline"),
  reviewList: $("#reviewList"), alertList: $("#alertList"), historyBody: $("#historyBody"), clearData: $("#clearData"),
  editalForm: $("#editalForm"), contestName: $("#contestName"), agency: $("#agency"), role: $("#role"), board: $("#board"), examDate: $("#examDate"), officialLink: $("#officialLink"), generalNotes: $("#generalNotes"), editalPdf: $("#editalPdf"), pdfInfo: $("#pdfInfo"), removePdf: $("#removePdf"),
  syllabusForm: $("#syllabusForm"), itemDiscipline: $("#itemDiscipline"), itemTopic: $("#itemTopic"), itemSubject: $("#itemSubject"), itemSubtopic: $("#itemSubtopic"), itemReference: $("#itemReference"), itemPriority: $("#itemPriority"), itemWeight: $("#itemWeight"), itemStatus: $("#itemStatus"), itemDomain: $("#itemDomain"), itemNotes: $("#itemNotes"),
  bulkInput: $("#bulkInput"), previewBulk: $("#previewBulk"), saveBulk: $("#saveBulk"), bulkPreview: $("#bulkPreview"), filterSearch: $("#filterSearch"), filterDiscipline: $("#filterDiscipline"), filterPriority: $("#filterPriority"), filterStatus: $("#filterStatus"), filterDomain: $("#filterDomain"), filterSchedulable: $("#filterSchedulable"), filterQuick: $("#filterQuick"), bulkPriority: $("#bulkPriority"), applyBulkPriority: $("#applyBulkPriority"), syllabusCount: $("#syllabusCount"), showMoreSyllabus: $("#showMoreSyllabus"), syllabusList: $("#syllabusList"), schedulableList: $("#schedulableList"), disciplineOptions: $("#disciplineOptions"),
  jsonImportFile: $("#jsonImportFile"), importMessage: $("#importMessage"), importDisciplineTotal: $("#importDisciplineTotal"), importSubjectTotal: $("#importSubjectTotal"), importFilterDiscipline: $("#importFilterDiscipline"), importFilterStatus: $("#importFilterStatus"), importFilterPriority: $("#importFilterPriority"), importFilterDomain: $("#importFilterDomain"), importJsonButton: $("#importJsonButton"), clearImportedSyllabus: $("#clearImportedSyllabus"), importDisciplineList: $("#importDisciplineList"), importPreview: $("#importPreview"),
  generalCebraspeNet: $("#generalCebraspeNet"), todayPendingGoals: $("#todayPendingGoals"), todayDoneGoals: $("#todayDoneGoals"),
  generateDailyGoals: $("#generateDailyGoals"), goalForm: $("#goalForm"), goalDate: $("#goalDate"), goalDiscipline: $("#goalDiscipline"), goalSyllabusItem: $("#goalSyllabusItem"), goalType: $("#goalType"), goalMinutes: $("#goalMinutes"), goalPriority: $("#goalPriority"), goalStatus: $("#goalStatus"), goalNotes: $("#goalNotes"), dailyGoalsList: $("#dailyGoalsList"),
  questionForm: $("#questionForm"), questionEditingId: $("#questionEditingId"), questionLinkedGoalId: $("#questionLinkedGoalId"), questionOrigin: $("#questionOrigin"), questionDate: $("#questionDate"), questionDiscipline: $("#questionDiscipline"), questionSyllabusItem: $("#questionSyllabusItem"), questionBoard: $("#questionBoard"), questionTrainingType: $("#questionTrainingType"), questionTotal: $("#questionTotal"), questionCorrect: $("#questionCorrect"), questionWrong: $("#questionWrong"), questionBlank: $("#questionBlank"), questionNotes: $("#questionNotes"), questionCalculated: $("#questionCalculated"), questionAnalysis: $("#questionAnalysis"),
  questionFilterDiscipline: $("#questionFilterDiscipline"), questionFilterSubject: $("#questionFilterSubject"), questionFilterBoard: $("#questionFilterBoard"), questionHistoryBody: $("#questionHistoryBody"),
  exportBackup: $("#exportBackup"), selectBackupFile: $("#selectBackupFile"), backupFileInput: $("#backupFileInput"), clearAllLocalData: $("#clearAllLocalData"), lastBackupDate: $("#lastBackupDate"), backupStorageKeys: $("#backupStorageKeys"), backupSummary: $("#backupSummary"), backupPreview: $("#backupPreview"),
  mockTotal: $("#mockTotal"), mockLastNet: $("#mockLastNet"), mockBestNet: $("#mockBestNet"), mockAverageNet: $("#mockAverageNet"), mockAboveGoal: $("#mockAboveGoal"), mockProblemDiscipline: $("#mockProblemDiscipline"),
  newMockExam: $("#newMockExam"), mockExamForm: $("#mockExamForm"), mockExamEditingId: $("#mockExamEditingId"), mockName: $("#mockName"), mockDate: $("#mockDate"), mockBoard: $("#mockBoard"), mockInstitution: $("#mockInstitution"), mockNotes: $("#mockNotes"), mockTotalQuestions: $("#mockTotalQuestions"), mockCorrect: $("#mockCorrect"), mockWrong: $("#mockWrong"), mockBlank: $("#mockBlank"), mockGoal: $("#mockGoal"), mockStrategy: $("#mockStrategy"), mockDifficulty: $("#mockDifficulty"), mockCalculated: $("#mockCalculated"), mockDisciplineName: $("#mockDisciplineName"), mockDisciplineTotal: $("#mockDisciplineTotal"), mockDisciplineCorrect: $("#mockDisciplineCorrect"), mockDisciplineWrong: $("#mockDisciplineWrong"), mockDisciplineBlank: $("#mockDisciplineBlank"), mockDisciplineNotes: $("#mockDisciplineNotes"), addMockDiscipline: $("#addMockDiscipline"), clearMockDisciplines: $("#clearMockDisciplines"), mockDisciplineDraft: $("#mockDisciplineDraft"), mockSummary: $("#mockSummary"), mockGeneralResult: $("#mockGeneralResult"), mockDisciplineResults: $("#mockDisciplineResults"), mockDiagnosis: $("#mockDiagnosis"), mockHistory: $("#mockHistory"), mockEvolution: $("#mockEvolution")
};
elements.studyDate.value = todayISO();
elements.goalDate.value = todayISO();
elements.questionDate.value = todayISO();
if (elements.mockDate) elements.mockDate.value = todayISO();


function randomMotivationalMessageIndex(previousIndex = null) {
  if (motivationalMessages.length <= 1) return 0;
  let nextIndex = Math.floor(Math.random() * motivationalMessages.length);
  while (nextIndex === previousIndex) nextIndex = Math.floor(Math.random() * motivationalMessages.length);
  return nextIndex;
}
function showRandomMotivationalMessage() {
  if (!elements.dailyMotivationalMessage) return;
  const previousIndex = Number(localStorage.getItem(MOTIVATIONAL_MESSAGE_STORAGE_KEY));
  const safePreviousIndex = Number.isInteger(previousIndex) ? previousIndex : null;
  const nextIndex = randomMotivationalMessageIndex(safePreviousIndex);
  localStorage.setItem(MOTIVATIONAL_MESSAGE_STORAGE_KEY, String(nextIndex));
  elements.dailyMotivationalMessage.textContent = motivationalMessages[nextIndex];
}
function saveData() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); localStorage.setItem(SIMULADOS_STORAGE_KEY, JSON.stringify(state.simulados || [])); }
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
    revisoes: source.studies?.length ? source.studies.length * 3 : 0,
    historico: source.studies?.length || 0,
    simulados: source.simulados?.length || 0
  };
}
function renderBackupSummary() {
  if (!elements.backupSummary) return;
  const counts = backupCounts();
  const cards = [
    ["Itens do edital verticalizado", counts.verticalizado], ["Assuntos agendáveis", counts.agendaveis], ["Disciplinas", counts.disciplinas],
    ["Metas", counts.metas], ["Lançamentos de questões", counts.questoes], ["Simulados", counts.simulados], ["Revisões previstas", counts.revisoes], ["Registros históricos", counts.historico]
  ];
  elements.lastBackupDate.textContent = state.settings?.lastBackupAt ? new Date(state.settings.lastBackupAt).toLocaleString("pt-BR") : "Nunca exportado";
  elements.backupStorageKeys.textContent = getProjectStorageKeys().length;
  elements.backupSummary.innerHTML = cards.map(([label, value]) => `<article class="stat-card"><span>${label}</span><strong>${value}</strong></article>`).join("");
}
function makeBackupPayload() {
  saveData();
  const keys = getProjectStorageKeys();
  const localStorageData = Object.fromEntries(keys.map((key) => [key, localStorage.getItem(key)]));
  return { app: "metas-estudo", version: 1, exportedAt: new Date().toISOString(), storageKey: STORAGE_KEY, data: structuredClone(state), localStorage: localStorageData };
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
  elements.backupPreview.innerHTML = `<h3>Pré-visualização do backup selecionado</h3><div class="stats-grid compact backup-summary"><article class="stat-card"><span>Data do backup</span><strong>${escapeHTML(backupDate)}</strong></article><article class="stat-card"><span>Disciplinas</span><strong>${counts.disciplinas}</strong></article><article class="stat-card"><span>Assuntos</span><strong>${counts.verticalizado}</strong></article><article class="stat-card"><span>Metas</span><strong>${counts.metas}</strong></article><article class="stat-card"><span>Questões</span><strong>${counts.questoes}</strong></article><article class="stat-card"><span>Simulados</span><strong>${counts.simulados}</strong></article><article class="stat-card"><span>Revisões</span><strong>${counts.revisoes}</strong></article></div><p class="item-meta"><strong>Disciplinas encontradas:</strong> ${disciplines.slice(0, 20).map(escapeHTML).join(", ") || "nenhuma"}${disciplines.length > 20 ? "..." : ""}</p><div class="actions"><button type="button" data-backup-import="replace" class="danger">Substituir dados atuais</button><button type="button" data-backup-import="merge" class="secondary-button">Mesclar com dados atuais</button><button type="button" data-backup-import="cancel">Cancelar</button></div>`;
  return normalized;
}
function replaceState(nextState) { Object.keys(state).forEach((key) => delete state[key]); Object.assign(state, { ...structuredClone(defaultState), ...(nextState || {}) }); state.edital = { ...defaultState.edital, ...(state.edital || {}) }; state.syllabusItems ||= []; state.schedulableSettings ||= {}; state.dailyGoals ||= []; state.questionLogs ||= []; state.simulados ||= []; state.settings ||= {}; state.settings.defaultMockGoal ||= 92; }
function mergeArrays(current = [], incoming = [], keyFn = (item) => item?.id || JSON.stringify(item)) { const seen = new Set(current.map(keyFn)); incoming.forEach((item) => { const key = keyFn(item); if (!seen.has(key)) { current.push(item); seen.add(key); } }); return current; }
function mergeBackupData(data = {}) {
  mergeArrays(state.subjects, data.subjects || [], (item) => canonical(item.name || item.id));
  mergeArrays(state.studies, data.studies || [], (item) => item.id || [item.date, item.subjectId, item.topic, item.minutes].join("|"));
  mergeArrays(state.syllabusItems, data.syllabusItems || [], (item) => item.importKey || importKeyFor(item));
  mergeArrays(state.dailyGoals, data.dailyGoals || [], (item) => item.id || [item.date, item.discipline, item.subject, item.type].join("|"));
  mergeArrays(state.questionLogs, data.questionLogs || [], (item) => item.id || [item.date, item.discipline, item.subject, item.total, item.correct, item.wrong].join("|"));
  mergeArrays(state.simulados, data.simulados || [], (item) => item.id || [item.date, item.name, item.total, item.correct, item.wrong].join("|"));
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
function completedStatus(item) { return ["Estudado", "Dominado"].includes(item.status); }

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
  return state.studies.filter((study) => subjectIds.has(study.subjectId) && (!study.topic || canonical(study.topic).includes(canonical(item.subject)) || canonical(item.subject).includes(canonical(study.topic))));
}
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


function normalizeImportedStatus(value) { const allowed = ["Não iniciado", "Em andamento", "Estudado", "Revisar", "Dominado", "Ignorado"]; return allowed.find((item) => item.toLowerCase() === String(value || "").trim().toLowerCase()) || "Não iniciado"; }
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
    domain: "Sem diagnóstico",
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
function renderDashboard() {
  const today = todayISO(); const todayMinutes = state.studies.filter((study) => study.date === today).reduce((sum, study) => sum + study.minutes, 0); const weekMinutes = state.studies.filter((study) => isSameWeek(study.date)).reduce((sum, study) => sum + study.minutes, 0); const totalQuestions = state.studies.reduce((sum, study) => sum + study.questions, 0); const correct = state.studies.reduce((sum, study) => sum + study.correct, 0);
  const total = state.syllabusItems.length; const studied = state.syllabusItems.filter(completedStatus).length; const weak = state.syllabusItems.filter(isWeakItem).length; const undiagnosed = state.syllabusItems.filter(isUndiagnosed).length; const notStarted = state.syllabusItems.filter((item) => item.status === "Não iniciado").length;
  const pendingByDiscipline = state.syllabusItems.filter((item) => !completedStatus(item) && item.status !== "Ignorado").reduce((acc, item) => ({ ...acc, [item.discipline]: (acc[item.discipline] || 0) + 1 }), {}); const topPending = Object.entries(pendingByDiscipline).sort((a, b) => b[1] - a[1])[0];
  const questionTotals = getQuestionTotals(); const pendingGoals = state.dailyGoals.filter((goal) => goal.date === today && goal.status === "Pendente").length; const doneGoals = state.dailyGoals.filter((goal) => goal.date === today && goal.status === "Concluída").length;
  elements.todayHours.textContent = formatHours(todayMinutes); elements.weekHours.textContent = formatHours(weekMinutes); elements.weeklyGoalStatus.textContent = `${formatHours(weekMinutes)} registradas`; elements.totalQuestions.textContent = questionTotals.total || totalQuestions; elements.accuracyRate.textContent = questionTotals.total ? `${Math.round(questionTotals.correct / questionTotals.total * 100)}%` : (totalQuestions ? `${Math.round((correct / totalQuestions) * 100)}%` : "0%"); elements.generalCebraspeNet.textContent = questionTotals.net; elements.todayPendingGoals.textContent = pendingGoals; elements.todayDoneGoals.textContent = doneGoals;
  elements.syllabusStudied.textContent = total ? `${Math.round((studied / total) * 100)}%` : "0%"; elements.syllabusTotal.textContent = total; elements.schedulableTotal.textContent = state.syllabusItems.filter((item) => isSchedulable(item.id)).length; elements.notStartedTotal.textContent = notStarted; elements.undiagnosedTotal.textContent = undiagnosed; elements.weakTotal.textContent = weak; elements.pendingDiscipline.textContent = topPending ? `${topPending[0]} (${topPending[1]})` : "-";
  const ms = mockStats(); if (elements.mockTotal) { elements.mockTotal.textContent = ms.count; elements.mockLastNet.textContent = ms.last; elements.mockBestNet.textContent = ms.best; elements.mockAverageNet.textContent = ms.average; elements.mockAboveGoal.textContent = ms.aboveGoal; elements.mockProblemDiscipline.textContent = ms.problemDiscipline; }
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
    card.innerHTML = `<header><div><h3>${escapeHTML(item.discipline)} — ${escapeHTML(item.subject)}</h3><div class="item-meta">${escapeHTML(item.topic)}${item.subtopic ? ` • ${escapeHTML(item.subtopic)}` : ""}</div></div><span class="badge ${item.priority === "Alta" ? "danger" : item.priority === "Baixa" ? "neutral" : "warn"}">${escapeHTML(item.priority)}</span></header><div class="card-meta-grid"><span>Status: ${escapeHTML(item.status)}</span><span>Domínio: ${escapeHTML(item.domain)}</span><span>Diagnóstico: ${undiagnosed ? "Sem diagnóstico" : weak ? "Fraco" : "OK"}</span><span>Agendável: ${isSchedulable(item.id) ? "Sim" : "Não"}</span><span>Peso: ${escapeHTML(item.weight)}</span><span>Ref.: ${escapeHTML(item.reference || "-")}</span></div>${item.notes ? `<p class="item-meta">${escapeHTML(item.notes)}</p>` : ""}<div class="card-actions"><button type="button" data-action="edit" data-id="${item.id}">Editar</button><button type="button" data-action="studied" data-id="${item.id}">Marcar como estudado</button><button type="button" data-action="review" data-id="${item.id}">Marcar como revisar</button><button type="button" data-action="dominated" data-id="${item.id}">Marcar como dominado</button><button type="button" data-action="weak" data-id="${item.id}">Marcar como fraco</button><button type="button" data-action="schedulable" data-id="${item.id}">${setting.availability === "Agendável" ? "Desativar" : "Ativar"} agendável</button></div>`;
    elements.syllabusList.appendChild(card);
  });
}
function renderSchedulable() { elements.schedulableList.innerHTML = ""; state.syllabusItems.forEach((item) => { const setting = settingFor(item.id); const card = document.createElement("article"); card.className = "syllabus-card"; card.innerHTML = `<header><div><h3>${escapeHTML(item.discipline)} — ${escapeHTML(item.subject)}</h3><div class="item-meta">${escapeHTML(item.topic)} • ${escapeHTML(item.status)} • domínio ${escapeHTML(item.domain)}</div></div><span class="badge ${setting.priority ? "danger" : isSchedulable(item.id) ? "success" : "neutral"}">${setting.priority ? "Prioritário" : setting.availability}</span></header><div class="card-actions"><label>Disponibilidade <select data-setting="availability" data-id="${item.id}"><option ${setting.availability === "Agendável" ? "selected" : ""}>Agendável</option><option ${setting.availability === "Não agendável" ? "selected" : ""}>Não agendável</option></select></label><label>Tipo <select data-setting="mode" data-id="${item.id}"><option ${setting.mode === "Revisão apenas" ? "selected" : ""}>Revisão apenas</option><option ${setting.mode === "Questões apenas" ? "selected" : ""}>Questões apenas</option><option ${setting.mode === "Estudo teórico" ? "selected" : ""}>Estudo teórico</option><option ${setting.mode === "Estudo + questões" ? "selected" : ""}>Estudo + questões</option></select></label><label><input type="checkbox" data-setting="priority" data-id="${item.id}" ${setting.priority ? "checked" : ""}> Assunto prioritário</label></div>`; elements.schedulableList.appendChild(card); }); }
function renderReviews() { const today = todayISO(); const reviewWindows = [{ label: "24h", days: 1 }, { label: "7 dias", days: 7 }, { label: "30 dias", days: 30 }]; elements.reviewList.innerHTML = ""; state.studies.forEach((study) => reviewWindows.forEach((window) => { const dueDate = addDays(study.date, window.days); if (dueDate <= today) { const item = document.createElement("div"); item.className = "review-item"; item.innerHTML = `<span class="badge ${dueDate < today ? "danger" : "warn"}">Revisão ${window.label}</span><strong>${escapeHTML(subjectNameById(study.subjectId))} — ${escapeHTML(study.topic)}</strong><div class="item-meta">Estudado em ${study.date} • Revisar em ${dueDate}</div>`; elements.reviewList.appendChild(item); } })); }
function renderAlerts() { elements.alertList.innerHTML = ""; state.subjects.forEach((subject) => { const lastStudy = state.studies.filter((study) => study.subjectId === subject.id).sort((a, b) => b.date.localeCompare(a.date))[0]; const daysWithoutStudy = lastStudy ? Math.floor((parseDate(todayISO()) - parseDate(lastStudy.date)) / 86400000) : Infinity; const weeklyMinutes = state.studies.filter((study) => study.subjectId === subject.id && isSameWeek(study.date)).reduce((sum, study) => sum + study.minutes, 0); if (!lastStudy || daysWithoutStudy >= 7 || weeklyMinutes < subject.goalHours * 30) { const item = document.createElement("div"); item.className = "alert-item"; item.innerHTML = `<span class="badge danger">Atenção</span><strong>${escapeHTML(subject.name)}</strong><div class="item-meta">${lastStudy ? `Último estudo há ${daysWithoutStudy} dia(s).` : "Nunca estudada."} Meta semanal em risco: ${formatHours(weeklyMinutes)} de ${subject.goalHours}h.</div>`; elements.alertList.appendChild(item); } }); }
function renderHistory() { elements.historyBody.innerHTML = ""; [...state.studies].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 20).forEach((study) => { const row = document.createElement("tr"); row.innerHTML = `<td>${study.date}</td><td>${escapeHTML(subjectNameById(study.subjectId))}</td><td>${escapeHTML(study.topic)}</td><td>${study.minutes}</td><td>${study.questions}</td><td>${study.correct}</td><td>${study.wrong}</td><td>${study.blank}</td>`; elements.historyBody.appendChild(row); }); }
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
  return `<p class="item-meta">${summary}</p><table><thead><tr><th>Data</th><th>Simulado</th><th>Líquido</th><th>Meta</th><th>Barra</th></tr></thead><tbody>${stats.mocks.map((m)=>`<tr class="${m.net >= m.goal ? "goal-hit" : ""}"><td>${m.date}</td><td>${escapeHTML(m.name)}</td><td>${m.net}</td><td>${m.goal}</td><td><div class="progress"><span style="width:${Math.max(0, Math.min(100, m.net / maxBase * 100))}%"></span></div></td></tr>`).join("")}</tbody></table>`;
}
function renderMockDraft() { if (!elements.mockDisciplineDraft) return; elements.mockDisciplineDraft.innerHTML = mockDisciplineDraft.length ? `<table><thead><tr><th>Disciplina</th><th>Total</th><th>Acertos</th><th>Erros</th><th>Brancos</th><th>Líquido</th><th>% Acerto</th><th>% Erro</th><th>% Brancos</th><th>Ações</th></tr></thead><tbody>${mockDisciplineDraft.map((d,i)=>`<tr><td>${escapeHTML(d.discipline)}</td><td>${d.total}</td><td>${d.correct}</td><td>${d.wrong}</td><td>${d.blank}</td><td>${d.net}</td><td>${d.accuracyPct}%</td><td>${d.errorPct}%</td><td>${d.blankPct}%</td><td><button type="button" data-remove-mock-discipline="${i}">Remover</button></td></tr>`).join("")}</tbody></table>` : "Nenhuma disciplina lançada."; }
function renderSimulados() {
  if (!elements.mockSummary) return;
  const stats = mockStats();
  elements.mockSummary.innerHTML = [["Simulados",stats.count],["Maior líquido",stats.best],["Menor líquido",stats.worst],["Líquido médio",stats.average],["Último líquido",stats.last],["Acima da meta",stats.aboveGoal]].map(([l,v])=>`<article class="stat-card"><span>${l}</span><strong>${v}</strong></article>`).join("");
  const latest = stats.mocks.at(-1);
  elements.mockGeneralResult.innerHTML = latest ? `Último simulado: <strong>${escapeHTML(latest.name)}</strong> • Líquido <strong>${latest.net}</strong> • Meta <strong>${latest.goal}</strong> • Diferença <strong>${latest.goalDiff}</strong>` : "Nenhum simulado salvo.";
  elements.mockDisciplineResults.innerHTML = latest?.disciplines?.length ? `<table><thead><tr><th>Disciplina</th><th>Total</th><th>Acertos</th><th>Erros</th><th>Brancos</th><th>Líquido</th><th>% Acerto</th><th>% Erro</th><th>% Brancos</th><th>Obs.</th></tr></thead><tbody>${latest.disciplines.map((d)=>`<tr><td>${escapeHTML(d.discipline)}</td><td>${d.total}</td><td>${d.correct}</td><td>${d.wrong}</td><td>${d.blank}</td><td>${d.net}</td><td>${d.accuracyPct}%</td><td>${d.errorPct}%</td><td>${d.blankPct}%</td><td>${escapeHTML(d.notes || "-")}</td></tr>`).join("")}</tbody></table>` : "Nenhum resultado por disciplina no último simulado.";
  elements.mockDiagnosis.innerHTML = renderLatestMockDiagnosis(latest);
  elements.mockHistory.innerHTML = (state.simulados || []).length ? [...state.simulados].sort((a,b)=>b.date.localeCompare(a.date)).map((m)=>`<article class="syllabus-card"><header><div><h3>${escapeHTML(m.name)}</h3><div class="item-meta">${m.date} • ${escapeHTML(m.board)} • ${m.total} questões • ${m.correct} acertos • ${m.wrong} erros • ${m.blank} brancos • líquido ${m.net} • meta ${m.goal} • diferença ${m.goalDiff}</div></div><span class="badge ${m.net >= m.goal ? "success" : "warn"}">${m.net >= m.goal ? "Meta atingida" : "Abaixo da meta"}</span></header><div class="card-actions"><button type="button" data-view-mock="${m.id}">Visualizar detalhes</button><button type="button" data-edit-mock="${m.id}">Editar</button><button type="button" data-duplicate-mock="${m.id}">Duplicar</button><button class="danger" type="button" data-delete-mock="${m.id}">Excluir</button></div></article>`).join("") : "Nenhum simulado cadastrado.";
  const maxBase = Math.max(1, ...stats.mocks.map((m)=>Math.max(m.goal, m.net, 0)));
  elements.mockEvolution.innerHTML = renderMockEvolution(stats, maxBase);
  renderMockCalculated(); renderMockDraft();
}
function resetMockForm() { elements.mockExamForm?.reset(); mockDisciplineDraft = []; if (elements.mockExamEditingId) elements.mockExamEditingId.value = ""; if (elements.mockDate) elements.mockDate.value = todayISO(); if (elements.mockBoard) elements.mockBoard.value = "Cebraspe"; if (elements.mockGoal) elements.mockGoal.value = state.settings.defaultMockGoal || 92; renderMockCalculated(); renderMockDraft(); }
function editMock(id) { const m = state.simulados.find((x)=>x.id===id); if (!m) return; elements.mockExamEditingId.value=m.id; elements.mockName.value=m.name; elements.mockDate.value=m.date; elements.mockBoard.value=m.board; elements.mockInstitution.value=m.institution||""; elements.mockNotes.value=m.notes||""; elements.mockTotalQuestions.value=m.total; elements.mockCorrect.value=m.correct; elements.mockWrong.value=m.wrong; elements.mockBlank.value=m.blank; elements.mockGoal.value=m.goal; elements.mockStrategy.value=m.strategy||""; elements.mockDifficulty.value=m.difficulty||"Média"; mockDisciplineDraft=(m.disciplines||[]).map(normalizeMockDiscipline); renderSimulados(); showView("simulados"); }
function saveMock(event) { event.preventDefault(); const n=currentMockNumbers(); if (!elements.mockName.value.trim()) return alert("Informe o nome do simulado."); if (n.correct + n.wrong + n.blank !== n.total) return alert("Acertos + erros + brancos deve ser igual ao total de questões."); const payload={ id: elements.mockExamEditingId.value || createId(), name: elements.mockName.value, date: elements.mockDate.value, board: elements.mockBoard.value, institution: elements.mockInstitution.value, notes: elements.mockNotes.value, total:n.total, correct:n.correct, wrong:n.wrong, blank:n.blank, goal:Number(elements.mockGoal.value)||92, strategy:elements.mockStrategy.value, difficulty:elements.mockDifficulty.value, disciplines:mockDisciplineDraft }; const mock=prepareMock(payload); const idx=state.simulados.findIndex((m)=>m.id===mock.id); if (idx>=0) state.simulados[idx]=mock; else state.simulados.push(mock); state.settings.defaultMockGoal=mock.goal; resetMockForm(); render(); }
function addMockDiscipline() { const d=normalizeMockDiscipline({ discipline: elements.mockDisciplineName.value, total: elements.mockDisciplineTotal.value, correct: elements.mockDisciplineCorrect.value, wrong: elements.mockDisciplineWrong.value, blank: elements.mockDisciplineBlank.value, notes: elements.mockDisciplineNotes.value }); if (!d.discipline || !d.total) return alert("Informe disciplina e total."); if (d.correct + d.wrong + d.blank !== d.total) return alert("Na disciplina, acertos + erros + brancos deve ser igual ao total."); mockDisciplineDraft.push(d); [elements.mockDisciplineName,elements.mockDisciplineTotal,elements.mockDisciplineNotes].forEach((el)=>el.value=""); elements.mockDisciplineCorrect.value=0; elements.mockDisciplineWrong.value=0; elements.mockDisciplineBlank.value=0; renderMockDraft(); }

function render() { migrateIncorrectWeakDomains(); renderSubjects(); renderGoalSelectors(); renderQuestionSelectors(); renderDashboard(); renderEdital(); renderSyllabus(); renderSchedulable(); renderDailyGoals(); renderQuestionHistory(); updateQuestionCalculated(); renderReviews(); renderAlerts(); renderHistory(); renderImportPreview(); renderBackupSummary(); renderSimulados(); saveData(); }
function syllabusFromValues(values) { return { id: createId(), discipline: values[0]?.trim() || "Sem disciplina", topic: values[1]?.trim() || "Geral", subject: values[2]?.trim() || "Assunto", subtopic: values[3]?.trim() || "", reference: values[4]?.trim() || "", priority: values[5]?.trim() || "Média", weight: Number(values[6]) || 1, status: values[7]?.trim() || "Não iniciado", domain: normalizeImportedDomain(values[8]), notes: values[9]?.trim() || "" }; }

elements.subjectForm.addEventListener("submit", (event) => { event.preventDefault(); state.subjects.push({ id: createId(), name: elements.subjectName.value.trim(), goalHours: Number(elements.subjectGoal.value) }); elements.subjectForm.reset(); render(); });
elements.studyForm.addEventListener("submit", (event) => { event.preventDefault(); if (!elements.studySubject.value) return alert("Cadastre uma disciplina antes de registrar o estudo."); const questions = Number(elements.questionsDone.value); const correct = Number(elements.correctAnswers.value); const wrong = Number(elements.wrongAnswers.value); const blank = Number(elements.blankAnswers.value); if (correct + wrong + blank !== questions) return alert("A soma de acertos, erros e brancos deve ser igual ao total de questões feitas."); state.studies.push({ id: createId(), date: elements.studyDate.value, subjectId: elements.studySubject.value, topic: elements.studyTopic.value.trim(), minutes: Number(elements.studyMinutes.value), questions, correct, wrong, blank }); elements.studyForm.reset(); elements.studyDate.value = todayISO();
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
elements.syllabusList.addEventListener("click", (event) => { const button = event.target.closest("button[data-action]"); if (!button) return; const { action, id } = button.dataset; if (action === "edit") editSyllabusItem(id); if (action === "studied") setItemStatus(id, "Estudado"); if (action === "review") setItemStatus(id, "Revisar"); if (action === "dominated") setItemStatus(id, "Dominado"); if (action === "weak") setItemDomain(id, "Fraco", true); if (action === "schedulable") toggleItemSchedulable(id); });
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
function itemScore(item, pendingByDiscipline) { return (item.priority === "Alta" ? 60 : item.priority === "Média" ? 25 : 5) + (item.status === "Não iniciado" ? 45 : 0) + (isUndiagnosed(item) ? 35 : 0) + (isWeakItem(item) ? 40 : 0) + (Number(item.weight) || 1) * 6 + (pendingByDiscipline[item.discipline] || 0); }
function makeGoal(item, date, type) {
  const minutes = type === "Questões" ? 30 : item.priority === "Alta" ? 60 : 45;
  return { id: createId(), date, data: date, discipline: item.discipline, disciplina: item.discipline, syllabusItemId: item.id, subject: item.subject, assunto: item.subject, referencia_edital: item.reference || "", type, tipo: type.toLowerCase(), minutes, tempo_sugerido_minutos: minutes, priority: item.priority, prioridade: item.priority, status: "Pendente", origin: "edital verticalizado", origem: "edital verticalizado", notes: `Gerada automaticamente do edital verticalizado. Status: ${item.status}; domínio: ${item.domain}; peso: ${item.weight}.`, observacoes: `Priorizada por status, domínio, prioridade, peso e pendência da disciplina.` };
}
function pickCandidate(candidates, used, predicate = () => true) { return candidates.find((item) => !used.has(item.id) && predicate(item)); }
function generateDailyGoals() {
  try {
    const date = elements.goalDate.value || todayISO();
    const storageKeys = Object.keys(localStorage).filter((key) => /metas|edital|syllabus|assunto|vertical/i.test(key));
    console.info(`[Metas do dia] Itens do edital encontrados: ${state.syllabusItems.length}`);
    console.info(`[Metas do dia] Dados lidos da chave principal: ${STORAGE_KEY}. Chaves relacionadas existentes: ${storageKeys.join(", ") || "nenhuma"}`);
    if (!state.syllabusItems.length) { showDailyGoalMessage("Não foi possível gerar metas. Verifique se o edital foi importado.", "error"); return; }
    const existingToday = state.dailyGoals.filter((g) => g.date === date);
    if (existingToday.length && !confirm("Já existem metas para hoje. Deseja substituir ou adicionar novas? Clique em OK para adicionar novas ou em Cancelar para manter como está.")) return;
    const existing = new Set(existingToday.map((g) => g.syllabusItemId));
    const pendingByDiscipline = state.syllabusItems.filter((item) => !completedStatus(item) && item.status !== "Ignorado").reduce((acc, item) => (acc[item.discipline] = (acc[item.discipline] || 0) + 1, acc), {});
    const candidates = state.syllabusItems.filter((item) => isSchedulable(item.id) && item.status !== "Ignorado" && !existing.has(item.id)).sort((a,b) => itemScore(b,pendingByDiscipline) - itemScore(a,pendingByDiscipline));
    console.info(`[Metas do dia] Assuntos agendáveis encontrados: ${candidates.length}`);
    if (!candidates.length) { showDailyGoalMessage("Nenhum assunto agendável encontrado. Verifique o edital verticalizado.", "warning"); return; }
    const used = new Set(); const chosen = [];
    const add = (type, predicate) => { const item = pickCandidate(candidates, used, predicate); if (item && chosen.length < 5) { used.add(item.id); chosen.push(makeGoal(item, date, type)); } };
    add("Estudo novo", (item) => item.status === "Não iniciado");
    add("Questões", (item) => goalTypeForItem(item) === "Questões" || !isUndiagnosed(item));
    add("Reforço", (item) => isWeakItem(item));
    if (!chosen.some((goal) => ["Reforço", "Revisão"].includes(goal.type))) add("Revisão", (item) => ["Estudado", "Revisar", "Em andamento"].includes(item.status));
    while (chosen.length < Math.min(4, candidates.length)) {
      const next = pickCandidate(candidates, used);
      if (!next) break;
      used.add(next.id);
      chosen.push(makeGoal(next, date, goalTypeForItem(next)));
    }
    state.dailyGoals.push(...chosen);
    console.info(`[Metas do dia] Metas geradas: ${chosen.length}`);
    render();
    showDailyGoalMessage("Metas do dia geradas com sucesso.", "success");
    showView("metas-do-dia");
  } catch (error) {
    console.error("Não foi possível gerar metas.", error);
    showDailyGoalMessage("Não foi possível gerar metas. Verifique se o edital foi importado.", "error");
  }
}
function renderDailyGoals() { const goals = [...state.dailyGoals].sort((a,b) => b.date.localeCompare(a.date)); elements.dailyGoalsList.innerHTML = goals.length ? goals.map((goal) => `<article class="syllabus-card"><header><div><h3>${escapeHTML(goal.discipline)} — ${escapeHTML(goal.subject)}</h3><div class="item-meta">${goal.date} • ${escapeHTML(goal.type || goal.tipo)} • ${goal.minutes} min • Origem: ${escapeHTML(goal.origin || goal.origem || "-")}</div></div><span class="badge ${goal.status === "Concluída" ? "success" : goal.priority === "Alta" ? "danger" : "warn"}">${escapeHTML(goal.status)}</span></header><div class="card-meta-grid"><span>Prioridade: ${escapeHTML(goal.priority)}</span><span>Referência: ${escapeHTML(goal.referencia_edital || "-")}</span><span>Assunto vinculado: ${escapeHTML(goal.syllabusItemId || "-")}</span><span>Observações: ${escapeHTML(goal.notes || goal.observacoes || "-")}</span></div><div class="card-actions"><button type="button" data-goal-action="Concluída" data-id="${goal.id}">Concluir</button><button type="button" data-goal-action="Adiada" data-id="${goal.id}">Adiar</button><button type="button" data-goal-action="Ignorada" data-id="${goal.id}">Ignorar</button>${["Questões","Reforço","questões","reforço"].includes(goal.type || goal.tipo) ? `<button type="button" data-register-goal="${goal.id}">Registrar questões desta meta</button>` : ""}</div></article>`).join("") : "Nenhuma meta cadastrada."; }
function questionNumbers() { const total = Number(elements.questionTotal.value), correct = Number(elements.questionCorrect.value), wrong = Number(elements.questionWrong.value), blank = Number(elements.questionBlank.value); return { total, correct, wrong, blank, sum: correct + wrong + blank, accuracy: total ? correct / total * 100 : 0, errorPct: total ? wrong / total * 100 : 0, blankPct: total ? blank / total * 100 : 0, net: correct - wrong }; }
function analysisMessage(n) { if (!n.total) return ""; if (n.accuracy >= 80) return "Bom desempenho: percentual de acerto acima de 80%. Em Cebraspe, os erros reduzem diretamente o líquido."; if (n.accuracy < 70) return "Atenção: percentual inferior a 70%. Recomenda-se revisão do assunto. Em Cebraspe, os erros reduzem diretamente o líquido."; return "Assunto ainda sem domínio consolidado. Programe nova revisão."; }
function updateQuestionCalculated() { const n = questionNumbers(); elements.questionCalculated.innerHTML = `Total calculado: <strong>${n.sum || 0}</strong> • Acerto: <strong>${n.accuracy.toFixed(1)}%</strong> • Erro: <strong>${n.errorPct.toFixed(1)}%</strong> • Brancos: <strong>${n.blankPct.toFixed(1)}%</strong> • Líquido Cebraspe: <strong>${n.net || 0}</strong>`; elements.questionAnalysis.textContent = analysisMessage(n); }
function validateQuestionLog(n) { if (!elements.questionDiscipline.value) return "Disciplina vazia."; if (!elements.questionSyllabusItem.value) return "Assunto vazio."; if (!n.total) return "Total de questões vazio."; if ([n.total,n.correct,n.wrong,n.blank].some((v) => Number.isNaN(v) || v < 0)) return "Não use números negativos."; if (n.sum > n.total) return "Acertos + erros + brancos não pode ser maior que total de questões."; return ""; }
function domainFromAccuracy(total, accuracy) { if (!total) return "Sem diagnóstico"; if (accuracy >= 80) return "Forte"; if (accuracy >= 70) return "Médio"; return "Fraco"; }
function recomputeSyllabusQuestionStats(item) { const logs = state.questionLogs.filter((log) => log.syllabusItemId === item.id); const totals = logs.reduce((a,l) => ({ total:a.total+l.total, correct:a.correct+l.correct, wrong:a.wrong+l.wrong, blank:a.blank+l.blank, net:a.net+l.cebraspeNet }), { total:0, correct:0, wrong:0, blank:0, net:0 }); const accuracy = totals.total ? totals.correct / totals.total * 100 : 0; item.questionsTotal = totals.total; item.questionsCorrect = totals.correct; item.questionsWrong = totals.wrong; item.questionsBlank = totals.blank; item.accuracyRate = Math.round(accuracy); item.cebraspeNet = totals.net; item.lastTrainingDate = logs.sort((a,b) => b.date.localeCompare(a.date))[0]?.date || ""; item.domain = domainFromAccuracy(totals.total, accuracy); item.manualWeak = item.domain === "Fraco" ? item.manualWeak : false; }
function saveQuestionLog(event) { event.preventDefault(); const n = questionNumbers(); const error = validateQuestionLog(n); if (error) return alert(error); const item = getSyllabusById(elements.questionSyllabusItem.value); const id = elements.questionEditingId.value || createId(); const log = { id, date: elements.questionDate.value, discipline: elements.questionDiscipline.value, syllabusItemId: item.id, subject: item.subject, board: elements.questionBoard.value, total: n.total, correct: n.correct, wrong: n.wrong, blank: n.blank, accuracyRate: Number(n.accuracy.toFixed(1)), errorRate: Number(n.errorPct.toFixed(1)), blankRate: Number(n.blankPct.toFixed(1)), cebraspeNet: n.net, notes: elements.questionNotes.value.trim(), trainingType: elements.questionTrainingType.value, origin: elements.questionOrigin.value || "avulso", linkedGoalId: elements.questionLinkedGoalId.value || "" }; const idx = state.questionLogs.findIndex((q) => q.id === id); if (idx >= 0) state.questionLogs[idx] = log; else state.questionLogs.push(log); recomputeSyllabusQuestionStats(item); alert(analysisMessage(n)); if (log.linkedGoalId && confirm("Deseja marcar a meta vinculada como concluída?")) { const goal = state.dailyGoals.find((g) => g.id === log.linkedGoalId); if (goal) goal.status = "Concluída"; } elements.questionForm.reset(); elements.questionEditingId.value = ""; elements.questionLinkedGoalId.value = ""; elements.questionOrigin.value = "avulso"; elements.questionDate.value = todayISO(); render(); }
function getQuestionTotals() { return state.questionLogs.reduce((a,l) => ({ total:a.total+l.total, correct:a.correct+l.correct, wrong:a.wrong+l.wrong, blank:a.blank+l.blank, net:a.net+l.cebraspeNet }), { total:0, correct:0, wrong:0, blank:0, net:0 }); }
function renderQuestionHistory() { const filtered = state.questionLogs.filter((log) => (!elements.questionFilterDiscipline.value || log.discipline === elements.questionFilterDiscipline.value) && (!elements.questionFilterSubject.value || log.syllabusItemId === elements.questionFilterSubject.value) && (!elements.questionFilterBoard.value || log.board === elements.questionFilterBoard.value)).sort((a,b) => b.date.localeCompare(a.date)); elements.questionHistoryBody.innerHTML = filtered.map((log) => `<tr><td>${log.date}</td><td>${escapeHTML(log.discipline)}</td><td>${escapeHTML(log.subject)}</td><td>${escapeHTML(log.board)}</td><td>${log.total}</td><td>${log.correct}</td><td>${log.wrong}</td><td>${log.blank}</td><td>${log.accuracyRate}%</td><td>${log.cebraspeNet}</td><td>${escapeHTML(log.origin)}</td><td>${escapeHTML(log.notes || "-")}</td><td><button type="button" data-edit-question="${log.id}">Editar</button><button class="danger" type="button" data-delete-question="${log.id}">Excluir</button></td></tr>`).join(""); }
function fillQuestionFromGoal(goalId) { const goal = state.dailyGoals.find((g) => g.id === goalId); if (!goal) return; elements.questionDate.value = goal.date; elements.questionDiscipline.value = goal.discipline; optionsForItems(elements.questionSyllabusItem, goal.discipline, goal.syllabusItemId); elements.questionSyllabusItem.value = goal.syllabusItemId; elements.questionOrigin.value = "meta do dia"; elements.questionLinkedGoalId.value = goal.id; showView("questoes"); }
function editQuestionLog(id) { const log = state.questionLogs.find((q) => q.id === id); if (!log) return; elements.questionEditingId.value = log.id; elements.questionDate.value = log.date; elements.questionDiscipline.value = log.discipline; optionsForItems(elements.questionSyllabusItem, log.discipline, log.syllabusItemId); elements.questionSyllabusItem.value = log.syllabusItemId; elements.questionBoard.value = log.board; elements.questionTrainingType.value = log.trainingType; elements.questionTotal.value = log.total; elements.questionCorrect.value = log.correct; elements.questionWrong.value = log.wrong; elements.questionBlank.value = log.blank; elements.questionNotes.value = log.notes; elements.questionOrigin.value = log.origin; elements.questionLinkedGoalId.value = log.linkedGoalId; updateQuestionCalculated(); showView("questoes"); }

if (elements.generateDailyGoals) elements.generateDailyGoals.addEventListener("click", generateDailyGoals);
elements.goalDiscipline.addEventListener("change", () => optionsForItems(elements.goalSyllabusItem, elements.goalDiscipline.value));
elements.questionDiscipline.addEventListener("change", () => optionsForItems(elements.questionSyllabusItem, elements.questionDiscipline.value));
elements.goalSyllabusItem.addEventListener("change", () => { const item = getSyllabusById(elements.goalSyllabusItem.value); if (item) { elements.goalDiscipline.value = item.discipline; elements.goalPriority.value = item.priority; elements.goalType.value = goalTypeForItem(item); } });
elements.goalForm.addEventListener("submit", (event) => { event.preventDefault(); const item = getSyllabusById(elements.goalSyllabusItem.value); if (!item) return alert("Selecione um assunto do edital verticalizado."); state.dailyGoals.push({ id: createId(), date: elements.goalDate.value, discipline: elements.goalDiscipline.value, syllabusItemId: item.id, subject: item.subject, type: elements.goalType.value, minutes: Number(elements.goalMinutes.value), priority: elements.goalPriority.value, status: elements.goalStatus.value, notes: elements.goalNotes.value.trim() }); elements.goalForm.reset(); elements.goalDate.value = todayISO(); render(); });
elements.dailyGoalsList.addEventListener("click", (event) => { const button = event.target.closest("button[data-register-goal]"); if (button) fillQuestionFromGoal(button.dataset.registerGoal); const action = event.target.closest("button[data-goal-action]"); if (action) { const goal = state.dailyGoals.find((g) => g.id === action.dataset.id); if (goal) { goal.status = action.dataset.goalAction; render(); } } });
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
elements.mockHistory?.addEventListener("click", (event) => { const view = event.target.closest("button[data-view-mock]"); const edit = event.target.closest("button[data-edit-mock]"); const duplicate = event.target.closest("button[data-duplicate-mock]"); const del = event.target.closest("button[data-delete-mock]"); if (view) { const m = state.simulados.find((x)=>x.id===view.dataset.viewMock); if (m) { state.simulados = state.simulados.filter((x)=>x.id!==m.id).concat(m); render(); } } if (edit) editMock(edit.dataset.editMock); if (duplicate) { const m = state.simulados.find((x)=>x.id===duplicate.dataset.duplicateMock); if (m) { state.simulados.push(prepareMock({ ...structuredClone(m), id:createId(), name:`${m.name} (cópia)` })); render(); } } if (del && confirm("Excluir este simulado?")) { state.simulados = state.simulados.filter((x)=>x.id!==del.dataset.deleteMock); render(); } });

elements.questionHistoryBody.addEventListener("click", (event) => { const edit = event.target.closest("button[data-edit-question]"); const del = event.target.closest("button[data-delete-question]"); if (edit) editQuestionLog(edit.dataset.editQuestion); if (del && confirm("Excluir este lançamento de questões?")) { const log = state.questionLogs.find((q) => q.id === del.dataset.deleteQuestion); state.questionLogs = state.questionLogs.filter((q) => q.id !== del.dataset.deleteQuestion); if (log) { const item = getSyllabusById(log.syllabusItemId); if (item) recomputeSyllabusQuestionStats(item); } render(); } });

elements.changeMotivationalMessage?.addEventListener("click", showRandomMotivationalMessage);
showRandomMotivationalMessage();

mergeCompatibleLocalStorageData();
render();

const viewLinks = [...document.querySelectorAll("[data-view-link]")];
const viewPanels = [...document.querySelectorAll(".app-view")];
const viewAliases = { verticalizado: "edital-verticalizado" };
const viewIds = new Set(viewPanels.map((panel) => panel.dataset.view));
const menuToggle = document.getElementById("menuToggle");
const mainMenu = document.getElementById("mainMenu");

function normalizeViewId(viewId) {
  const normalized = String(viewId || "").replace(/^#/, "") || "dashboard";
  return viewAliases[normalized] || normalized;
}

function hashToView() {
  const view = normalizeViewId(window.location.hash);
  return viewIds.has(view) ? view : "dashboard";
}

function renderView(viewId) {
  const renderers = {
    dashboard: () => { renderDashboard(); renderSubjects(); },
    edital: renderEdital,
    "edital-verticalizado": renderSyllabus,
    "importar-edital": renderImportPreview,
    "assuntos-agendaveis": renderSchedulable,
    "metas-do-dia": () => { renderGoalSelectors(); renderDailyGoals(); },
    questoes: () => { renderQuestionSelectors(); updateQuestionCalculated(); },
    "historico-questoes": () => { renderQuestionSelectors(); renderQuestionHistory(); },
    simulados: renderSimulados,
    revisoes: () => { renderReviews(); renderAlerts(); },
    historico: renderHistory,
    backup: renderBackupSummary,
    "como-usar": () => {}
  };
  renderers[viewId]?.();
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

  if (mainMenu && !options.keepMenuOpen) mainMenu.classList.remove("open");
  if (menuToggle) menuToggle.setAttribute("aria-expanded", mainMenu?.classList.contains("open") ? "true" : "false");
  renderView(target);
  if (!options.skipScroll) document.querySelector(".screen-stage")?.scrollIntoView({ block: "start" });
}

viewLinks.forEach((link) => {
  link.addEventListener("click", (event) => {
    event.preventDefault();
    showView(link.dataset.viewLink);
  });
});

menuToggle?.addEventListener("click", () => {
  mainMenu?.classList.toggle("open");
  menuToggle.setAttribute("aria-expanded", mainMenu?.classList.contains("open") ? "true" : "false");
});

window.addEventListener("hashchange", () => showView(hashToView()));
showView(hashToView(), { skipScroll: true, keepMenuOpen: true });
