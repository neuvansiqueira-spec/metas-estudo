const STORAGE_KEY = "metasConcursoData";
const todayISO = () => new Date().toISOString().slice(0, 10);
const defaultState = { subjects: [], studies: [], edital: { pdf: null }, syllabusItems: [], schedulableSettings: {} };
const state = { ...defaultState, ...(JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}) };
state.edital = { ...defaultState.edital, ...(state.edital || {}) };
state.syllabusItems ||= [];
state.schedulableSettings ||= {};
let bulkDraft = [];
let importDraft = [];

const $ = (selector) => document.querySelector(selector);
const elements = {
  subjectForm: $("#subjectForm"), subjectName: $("#subjectName"), subjectGoal: $("#subjectGoal"), subjectList: $("#subjectList"),
  studyForm: $("#studyForm"), studyDate: $("#studyDate"), studySubject: $("#studySubject"), studyTopic: $("#studyTopic"), studyMinutes: $("#studyMinutes"), questionsDone: $("#questionsDone"), correctAnswers: $("#correctAnswers"), wrongAnswers: $("#wrongAnswers"), blankAnswers: $("#blankAnswers"),
  todayHours: $("#todayHours"), weekHours: $("#weekHours"), weeklyGoalStatus: $("#weeklyGoalStatus"), totalQuestions: $("#totalQuestions"), accuracyRate: $("#accuracyRate"), syllabusStudied: $("#syllabusStudied"), syllabusTotal: $("#syllabusTotal"), schedulableTotal: $("#schedulableTotal"), notStartedTotal: $("#notStartedTotal"), weakTotal: $("#weakTotal"), pendingDiscipline: $("#pendingDiscipline"),
  reviewList: $("#reviewList"), alertList: $("#alertList"), historyBody: $("#historyBody"), clearData: $("#clearData"),
  editalForm: $("#editalForm"), contestName: $("#contestName"), agency: $("#agency"), role: $("#role"), board: $("#board"), examDate: $("#examDate"), officialLink: $("#officialLink"), generalNotes: $("#generalNotes"), editalPdf: $("#editalPdf"), pdfInfo: $("#pdfInfo"), removePdf: $("#removePdf"),
  syllabusForm: $("#syllabusForm"), itemDiscipline: $("#itemDiscipline"), itemTopic: $("#itemTopic"), itemSubject: $("#itemSubject"), itemSubtopic: $("#itemSubtopic"), itemReference: $("#itemReference"), itemPriority: $("#itemPriority"), itemWeight: $("#itemWeight"), itemStatus: $("#itemStatus"), itemDomain: $("#itemDomain"), itemNotes: $("#itemNotes"),
  bulkInput: $("#bulkInput"), previewBulk: $("#previewBulk"), saveBulk: $("#saveBulk"), bulkPreview: $("#bulkPreview"), filterDiscipline: $("#filterDiscipline"), filterPriority: $("#filterPriority"), filterStatus: $("#filterStatus"), filterDomain: $("#filterDomain"), filterQuick: $("#filterQuick"), syllabusList: $("#syllabusList"), schedulableList: $("#schedulableList"),
  jsonImportFile: $("#jsonImportFile"), importMessage: $("#importMessage"), importDisciplineTotal: $("#importDisciplineTotal"), importSubjectTotal: $("#importSubjectTotal"), importFilterDiscipline: $("#importFilterDiscipline"), importFilterStatus: $("#importFilterStatus"), importFilterPriority: $("#importFilterPriority"), importFilterDomain: $("#importFilterDomain"), importJsonButton: $("#importJsonButton"), clearImportedSyllabus: $("#clearImportedSyllabus"), importDisciplineList: $("#importDisciplineList"), importPreview: $("#importPreview")
};
elements.studyDate.value = todayISO();

function saveData() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
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
function isSchedulable(id) { return settingFor(id).availability === "Agendável"; }
function completedStatus(item) { return ["Estudado", "Dominado"].includes(item.status); }


function normalizeImportedStatus(value) { const allowed = ["Não iniciado", "Em andamento", "Estudado", "Revisar", "Dominado", "Ignorado"]; return allowed.find((item) => item.toLowerCase() === String(value || "").trim().toLowerCase()) || "Não iniciado"; }
function normalizeImportedPriority(value) { const allowed = ["Alta", "Média", "Baixa"]; return allowed.find((item) => item.toLowerCase() === String(value || "").trim().toLowerCase()) || "Média"; }
function normalizeImportedDomain(value) { const allowed = ["Fraco", "Médio", "Forte"]; return allowed.find((item) => item.toLowerCase() === String(value || "").trim().toLowerCase()) || "Médio"; }
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
    domain: normalizeImportedDomain(raw.dominio),
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
  elements.subjectList.innerHTML = ""; elements.studySubject.innerHTML = state.subjects.length ? "" : '<option value="">Cadastre uma disciplina</option>';
  state.subjects.forEach((subject) => {
    const option = document.createElement("option"); option.value = subject.id; option.textContent = subject.name; elements.studySubject.appendChild(option);
    const weeklyMinutes = state.studies.filter((study) => study.subjectId === subject.id && isSameWeek(study.date)).reduce((sum, study) => sum + study.minutes, 0);
    const li = document.createElement("li"); li.className = "subject-item"; li.innerHTML = `<div><strong>${escapeHTML(subject.name)}</strong><div class="item-meta">Meta: ${subject.goalHours}h/semana • Atual: ${formatHours(weeklyMinutes)}</div></div><span class="badge">${Math.min(100, Math.round((weeklyMinutes / (subject.goalHours * 60 || 1)) * 100))}%</span>`; elements.subjectList.appendChild(li);
  });
}
function renderDashboard() {
  const today = todayISO(); const todayMinutes = state.studies.filter((study) => study.date === today).reduce((sum, study) => sum + study.minutes, 0); const weekMinutes = state.studies.filter((study) => isSameWeek(study.date)).reduce((sum, study) => sum + study.minutes, 0); const totalQuestions = state.studies.reduce((sum, study) => sum + study.questions, 0); const correct = state.studies.reduce((sum, study) => sum + study.correct, 0);
  const total = state.syllabusItems.length; const studied = state.syllabusItems.filter(completedStatus).length; const weak = state.syllabusItems.filter((item) => item.domain === "Fraco").length; const notStarted = state.syllabusItems.filter((item) => item.status === "Não iniciado").length;
  const pendingByDiscipline = state.syllabusItems.filter((item) => !completedStatus(item) && item.status !== "Ignorado").reduce((acc, item) => ({ ...acc, [item.discipline]: (acc[item.discipline] || 0) + 1 }), {}); const topPending = Object.entries(pendingByDiscipline).sort((a, b) => b[1] - a[1])[0];
  elements.todayHours.textContent = formatHours(todayMinutes); elements.weekHours.textContent = formatHours(weekMinutes); elements.weeklyGoalStatus.textContent = `${formatHours(weekMinutes)} registradas`; elements.totalQuestions.textContent = totalQuestions; elements.accuracyRate.textContent = totalQuestions ? `${Math.round((correct / totalQuestions) * 100)}%` : "0%";
  elements.syllabusStudied.textContent = total ? `${Math.round((studied / total) * 100)}%` : "0%"; elements.syllabusTotal.textContent = total; elements.schedulableTotal.textContent = state.syllabusItems.filter((item) => isSchedulable(item.id)).length; elements.notStartedTotal.textContent = notStarted; elements.weakTotal.textContent = weak; elements.pendingDiscipline.textContent = topPending ? `${topPending[0]} (${topPending[1]})` : "-";
}
function renderEdital() { ["contestName", "agency", "role", "board", "examDate", "officialLink", "generalNotes"].forEach((key) => { elements[key].value = state.edital[key] || ""; }); elements.pdfInfo.innerHTML = state.edital.pdf ? `<strong>Arquivo:</strong> ${escapeHTML(state.edital.pdf.name)}<br><span class="item-meta">Anexado em ${escapeHTML(state.edital.pdf.attachedAt)}</span>` : ""; }
function getFilteredItems() { return state.syllabusItems.filter((item) => (!elements.filterDiscipline.value || item.discipline === elements.filterDiscipline.value) && (!elements.filterPriority.value || item.priority === elements.filterPriority.value) && (!elements.filterStatus.value || item.status === elements.filterStatus.value) && (!elements.filterDomain.value || item.domain === elements.filterDomain.value) && (!elements.filterQuick.value || (elements.filterQuick.value === "schedulable" && isSchedulable(item.id)) || (elements.filterQuick.value === "notStarted" && item.status === "Não iniciado") || (elements.filterQuick.value === "weak" && item.domain === "Fraco"))); }
function renderFilters() { const current = elements.filterDiscipline.value; const disciplines = [...new Set(state.syllabusItems.map((item) => item.discipline).filter(Boolean))].sort(); elements.filterDiscipline.innerHTML = '<option value="">Todas</option>' + disciplines.map((d) => `<option ${d === current ? "selected" : ""}>${escapeHTML(d)}</option>`).join(""); }
function renderSyllabus() { renderFilters(); elements.syllabusList.innerHTML = ""; getFilteredItems().forEach((item) => { const card = document.createElement("article"); card.className = "syllabus-card"; card.innerHTML = `<header><div><h3>${escapeHTML(item.discipline)} — ${escapeHTML(item.subject)}</h3><div class="item-meta">${escapeHTML(item.topic)}${item.subtopic ? ` • ${escapeHTML(item.subtopic)}` : ""}</div></div><span class="badge ${item.priority === "Alta" ? "danger" : item.priority === "Baixa" ? "neutral" : "warn"}">${escapeHTML(item.priority)}</span></header><div class="card-meta-grid"><span>Status: ${escapeHTML(item.status)}</span><span>Domínio: ${escapeHTML(item.domain)}</span><span>Peso: ${escapeHTML(item.weight)}</span><span>Ref.: ${escapeHTML(item.reference || "-")}</span></div>${item.notes ? `<p class="item-meta">${escapeHTML(item.notes)}</p>` : ""}`; elements.syllabusList.appendChild(card); }); }
function renderSchedulable() { elements.schedulableList.innerHTML = ""; state.syllabusItems.forEach((item) => { const setting = settingFor(item.id); const card = document.createElement("article"); card.className = "syllabus-card"; card.innerHTML = `<header><div><h3>${escapeHTML(item.discipline)} — ${escapeHTML(item.subject)}</h3><div class="item-meta">${escapeHTML(item.topic)} • ${escapeHTML(item.status)} • domínio ${escapeHTML(item.domain)}</div></div><span class="badge ${setting.priority ? "danger" : isSchedulable(item.id) ? "success" : "neutral"}">${setting.priority ? "Prioritário" : setting.availability}</span></header><div class="card-actions"><label>Disponibilidade <select data-setting="availability" data-id="${item.id}"><option ${setting.availability === "Agendável" ? "selected" : ""}>Agendável</option><option ${setting.availability === "Não agendável" ? "selected" : ""}>Não agendável</option></select></label><label>Tipo <select data-setting="mode" data-id="${item.id}"><option ${setting.mode === "Revisão apenas" ? "selected" : ""}>Revisão apenas</option><option ${setting.mode === "Questões apenas" ? "selected" : ""}>Questões apenas</option><option ${setting.mode === "Estudo teórico" ? "selected" : ""}>Estudo teórico</option><option ${setting.mode === "Estudo + questões" ? "selected" : ""}>Estudo + questões</option></select></label><label><input type="checkbox" data-setting="priority" data-id="${item.id}" ${setting.priority ? "checked" : ""}> Assunto prioritário</label></div>`; elements.schedulableList.appendChild(card); }); }
function renderReviews() { const today = todayISO(); const reviewWindows = [{ label: "24h", days: 1 }, { label: "7 dias", days: 7 }, { label: "30 dias", days: 30 }]; elements.reviewList.innerHTML = ""; state.studies.forEach((study) => reviewWindows.forEach((window) => { const dueDate = addDays(study.date, window.days); if (dueDate <= today) { const item = document.createElement("div"); item.className = "review-item"; item.innerHTML = `<span class="badge ${dueDate < today ? "danger" : "warn"}">Revisão ${window.label}</span><strong>${escapeHTML(subjectNameById(study.subjectId))} — ${escapeHTML(study.topic)}</strong><div class="item-meta">Estudado em ${study.date} • Revisar em ${dueDate}</div>`; elements.reviewList.appendChild(item); } })); }
function renderAlerts() { elements.alertList.innerHTML = ""; state.subjects.forEach((subject) => { const lastStudy = state.studies.filter((study) => study.subjectId === subject.id).sort((a, b) => b.date.localeCompare(a.date))[0]; const daysWithoutStudy = lastStudy ? Math.floor((parseDate(todayISO()) - parseDate(lastStudy.date)) / 86400000) : Infinity; const weeklyMinutes = state.studies.filter((study) => study.subjectId === subject.id && isSameWeek(study.date)).reduce((sum, study) => sum + study.minutes, 0); if (!lastStudy || daysWithoutStudy >= 7 || weeklyMinutes < subject.goalHours * 30) { const item = document.createElement("div"); item.className = "alert-item"; item.innerHTML = `<span class="badge danger">Atenção</span><strong>${escapeHTML(subject.name)}</strong><div class="item-meta">${lastStudy ? `Último estudo há ${daysWithoutStudy} dia(s).` : "Nunca estudada."} Meta semanal em risco: ${formatHours(weeklyMinutes)} de ${subject.goalHours}h.</div>`; elements.alertList.appendChild(item); } }); }
function renderHistory() { elements.historyBody.innerHTML = ""; [...state.studies].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 20).forEach((study) => { const row = document.createElement("tr"); row.innerHTML = `<td>${study.date}</td><td>${escapeHTML(subjectNameById(study.subjectId))}</td><td>${escapeHTML(study.topic)}</td><td>${study.minutes}</td><td>${study.questions}</td><td>${study.correct}</td><td>${study.wrong}</td><td>${study.blank}</td>`; elements.historyBody.appendChild(row); }); }
function render() { renderSubjects(); renderDashboard(); renderEdital(); renderSyllabus(); renderSchedulable(); renderReviews(); renderAlerts(); renderHistory(); renderImportPreview(); saveData(); }
function syllabusFromValues(values) { return { id: createId(), discipline: values[0]?.trim() || "Sem disciplina", topic: values[1]?.trim() || "Geral", subject: values[2]?.trim() || "Assunto", subtopic: values[3]?.trim() || "", reference: values[4]?.trim() || "", priority: values[5]?.trim() || "Média", weight: Number(values[6]) || 1, status: values[7]?.trim() || "Não iniciado", domain: values[8]?.trim() || "Médio", notes: values[9]?.trim() || "" }; }

elements.subjectForm.addEventListener("submit", (event) => { event.preventDefault(); state.subjects.push({ id: createId(), name: elements.subjectName.value.trim(), goalHours: Number(elements.subjectGoal.value) }); elements.subjectForm.reset(); render(); });
elements.studyForm.addEventListener("submit", (event) => { event.preventDefault(); if (!elements.studySubject.value) return alert("Cadastre uma disciplina antes de registrar o estudo."); const questions = Number(elements.questionsDone.value); const correct = Number(elements.correctAnswers.value); const wrong = Number(elements.wrongAnswers.value); const blank = Number(elements.blankAnswers.value); if (correct + wrong + blank !== questions) return alert("A soma de acertos, erros e brancos deve ser igual ao total de questões feitas."); state.studies.push({ id: createId(), date: elements.studyDate.value, subjectId: elements.studySubject.value, topic: elements.studyTopic.value.trim(), minutes: Number(elements.studyMinutes.value), questions, correct, wrong, blank }); elements.studyForm.reset(); elements.studyDate.value = todayISO(); render(); });
elements.editalForm.addEventListener("submit", (event) => { event.preventDefault(); ["contestName", "agency", "role", "board", "examDate", "officialLink", "generalNotes"].forEach((key) => { state.edital[key] = elements[key].value.trim(); }); render(); });
elements.editalPdf.addEventListener("change", () => { const file = elements.editalPdf.files[0]; if (!file) return; state.edital.pdf = { name: file.name, size: file.size, type: file.type, attachedAt: new Date().toLocaleString("pt-BR") }; render(); });
elements.removePdf.addEventListener("click", () => { state.edital.pdf = null; elements.editalPdf.value = ""; render(); });
elements.syllabusForm.addEventListener("submit", (event) => { event.preventDefault(); state.syllabusItems.push({ id: createId(), discipline: elements.itemDiscipline.value.trim(), topic: elements.itemTopic.value.trim(), subject: elements.itemSubject.value.trim(), subtopic: elements.itemSubtopic.value.trim(), reference: elements.itemReference.value.trim(), priority: elements.itemPriority.value, weight: Number(elements.itemWeight.value) || 1, status: elements.itemStatus.value, domain: elements.itemDomain.value, notes: elements.itemNotes.value.trim() }); elements.syllabusForm.reset(); elements.itemPriority.value = "Média"; elements.itemWeight.value = 1; elements.itemStatus.value = "Não iniciado"; elements.itemDomain.value = "Médio"; render(); });
elements.previewBulk.addEventListener("click", () => { bulkDraft = elements.bulkInput.value.split("\n").map((line) => line.trim()).filter(Boolean).map((line) => syllabusFromValues(line.split(";"))); elements.saveBulk.disabled = !bulkDraft.length; elements.bulkPreview.innerHTML = bulkDraft.length ? `<table><thead><tr><th>Disciplina</th><th>Tópico</th><th>Assunto</th><th>Prioridade</th><th>Status</th><th>Domínio</th></tr></thead><tbody>${bulkDraft.map((item) => `<tr><td>${escapeHTML(item.discipline)}</td><td>${escapeHTML(item.topic)}</td><td>${escapeHTML(item.subject)}</td><td>${escapeHTML(item.priority)}</td><td>${escapeHTML(item.status)}</td><td>${escapeHTML(item.domain)}</td></tr>`).join("")}</tbody></table>` : ""; });
elements.saveBulk.addEventListener("click", () => { state.syllabusItems.push(...bulkDraft); bulkDraft = []; elements.bulkInput.value = ""; elements.bulkPreview.innerHTML = ""; elements.saveBulk.disabled = true; render(); });
[elements.filterDiscipline, elements.filterPriority, elements.filterStatus, elements.filterDomain, elements.filterQuick].forEach((filter) => filter.addEventListener("change", renderSyllabus));
[elements.importFilterDiscipline, elements.importFilterStatus, elements.importFilterPriority, elements.importFilterDomain].forEach((filter) => filter.addEventListener("change", renderImportPreview));
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

elements.clearData.addEventListener("click", () => { if (confirm("Tem certeza que deseja apagar todos os dados salvos neste navegador?")) { state.subjects = []; state.studies = []; state.edital = { pdf: null }; state.syllabusItems = []; state.schedulableSettings = {}; render(); } });

render();
