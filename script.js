const STORAGE_KEY = "metasConcursoData";
const todayISO = () => new Date().toISOString().slice(0, 10);

const state = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {
  subjects: [],
  studies: []
};

const elements = {
  subjectForm: document.querySelector("#subjectForm"),
  subjectName: document.querySelector("#subjectName"),
  subjectGoal: document.querySelector("#subjectGoal"),
  subjectList: document.querySelector("#subjectList"),
  studyForm: document.querySelector("#studyForm"),
  studyDate: document.querySelector("#studyDate"),
  studySubject: document.querySelector("#studySubject"),
  studyTopic: document.querySelector("#studyTopic"),
  studyMinutes: document.querySelector("#studyMinutes"),
  questionsDone: document.querySelector("#questionsDone"),
  correctAnswers: document.querySelector("#correctAnswers"),
  wrongAnswers: document.querySelector("#wrongAnswers"),
  blankAnswers: document.querySelector("#blankAnswers"),
  todayHours: document.querySelector("#todayHours"),
  weekHours: document.querySelector("#weekHours"),
  weeklyGoalStatus: document.querySelector("#weeklyGoalStatus"),
  totalQuestions: document.querySelector("#totalQuestions"),
  accuracyRate: document.querySelector("#accuracyRate"),
  reviewList: document.querySelector("#reviewList"),
  alertList: document.querySelector("#alertList"),
  historyBody: document.querySelector("#historyBody"),
  clearData: document.querySelector("#clearData")
};

elements.studyDate.value = todayISO();

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function formatHours(minutes) {
  const hours = minutes / 60;
  return `${Number.isInteger(hours) ? hours : hours.toFixed(1)}h`;
}

function parseDate(dateString) {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function addDays(dateString, days) {
  const date = parseDate(dateString);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function isSameWeek(dateString) {
  const now = new Date();
  const date = parseDate(dateString);
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(now.getDate() - now.getDay());
  const end = new Date(start);
  end.setDate(start.getDate() + 7);
  return date >= start && date < end;
}

function createId() {
  return globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#039;"
  })[char]);
}

function subjectNameById(id) {
  return state.subjects.find((subject) => subject.id === id)?.name || "Disciplina removida";
}

function renderSubjects() {
  elements.subjectList.innerHTML = "";
  elements.studySubject.innerHTML = "";

  if (!state.subjects.length) {
    elements.studySubject.innerHTML = '<option value="">Cadastre uma disciplina</option>';
    return;
  }

  state.subjects.forEach((subject) => {
    const option = document.createElement("option");
    option.value = subject.id;
    option.textContent = subject.name;
    elements.studySubject.appendChild(option);

    const weeklyMinutes = state.studies
      .filter((study) => study.subjectId === subject.id && isSameWeek(study.date))
      .reduce((sum, study) => sum + study.minutes, 0);

    const li = document.createElement("li");
    li.className = "subject-item";
    li.innerHTML = `
      <div>
        <strong>${escapeHTML(subject.name)}</strong>
        <div class="item-meta">Meta: ${subject.goalHours}h/semana • Atual: ${formatHours(weeklyMinutes)}</div>
      </div>
      <span class="badge">${Math.min(100, Math.round((weeklyMinutes / (subject.goalHours * 60 || 1)) * 100))}%</span>
    `;
    elements.subjectList.appendChild(li);
  });
}

function renderDashboard() {
  const today = todayISO();
  const todayMinutes = state.studies.filter((study) => study.date === today).reduce((sum, study) => sum + study.minutes, 0);
  const weekMinutes = state.studies.filter((study) => isSameWeek(study.date)).reduce((sum, study) => sum + study.minutes, 0);
  const totalQuestions = state.studies.reduce((sum, study) => sum + study.questions, 0);
  const correct = state.studies.reduce((sum, study) => sum + study.correct, 0);

  elements.todayHours.textContent = formatHours(todayMinutes);
  elements.weekHours.textContent = formatHours(weekMinutes);
  elements.weeklyGoalStatus.textContent = `${formatHours(weekMinutes)} registradas`;
  elements.totalQuestions.textContent = totalQuestions;
  elements.accuracyRate.textContent = totalQuestions ? `${Math.round((correct / totalQuestions) * 100)}%` : "0%";
}

function renderReviews() {
  const today = todayISO();
  const reviewWindows = [
    { label: "24h", days: 1 },
    { label: "7 dias", days: 7 },
    { label: "30 dias", days: 30 }
  ];
  elements.reviewList.innerHTML = "";

  state.studies.forEach((study) => {
    reviewWindows.forEach((window) => {
      const dueDate = addDays(study.date, window.days);
      if (dueDate <= today) {
        const item = document.createElement("div");
        item.className = "review-item";
        item.innerHTML = `
          <span class="badge ${dueDate < today ? "danger" : "warn"}">Revisão ${window.label}</span>
          <strong>${escapeHTML(subjectNameById(study.subjectId))} — ${escapeHTML(study.topic)}</strong>
          <div class="item-meta">Estudado em ${study.date} • Revisar em ${dueDate}</div>
        `;
        elements.reviewList.appendChild(item);
      }
    });
  });
}

function renderAlerts() {
  elements.alertList.innerHTML = "";
  state.subjects.forEach((subject) => {
    const lastStudy = state.studies
      .filter((study) => study.subjectId === subject.id)
      .sort((a, b) => b.date.localeCompare(a.date))[0];
    const daysWithoutStudy = lastStudy ? Math.floor((parseDate(todayISO()) - parseDate(lastStudy.date)) / 86400000) : Infinity;
    const weeklyMinutes = state.studies
      .filter((study) => study.subjectId === subject.id && isSameWeek(study.date))
      .reduce((sum, study) => sum + study.minutes, 0);

    if (!lastStudy || daysWithoutStudy >= 7 || weeklyMinutes < subject.goalHours * 30) {
      const item = document.createElement("div");
      item.className = "alert-item";
      item.innerHTML = `
        <span class="badge danger">Atenção</span>
        <strong>${escapeHTML(subject.name)}</strong>
        <div class="item-meta">${lastStudy ? `Último estudo há ${daysWithoutStudy} dia(s).` : "Nunca estudada."} Meta semanal em risco: ${formatHours(weeklyMinutes)} de ${subject.goalHours}h.</div>
      `;
      elements.alertList.appendChild(item);
    }
  });
}

function renderHistory() {
  elements.historyBody.innerHTML = "";
  [...state.studies]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 20)
    .forEach((study) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${study.date}</td>
        <td>${escapeHTML(subjectNameById(study.subjectId))}</td>
        <td>${escapeHTML(study.topic)}</td>
        <td>${study.minutes}</td>
        <td>${study.questions}</td>
        <td>${study.correct}</td>
        <td>${study.wrong}</td>
        <td>${study.blank}</td>
      `;
      elements.historyBody.appendChild(row);
    });
}

function render() {
  renderSubjects();
  renderDashboard();
  renderReviews();
  renderAlerts();
  renderHistory();
  saveData();
}

elements.subjectForm.addEventListener("submit", (event) => {
  event.preventDefault();
  state.subjects.push({
    id: createId(),
    name: elements.subjectName.value.trim(),
    goalHours: Number(elements.subjectGoal.value)
  });
  elements.subjectForm.reset();
  render();
});

elements.studyForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!elements.studySubject.value) {
    alert("Cadastre uma disciplina antes de registrar o estudo.");
    return;
  }

  const questions = Number(elements.questionsDone.value);
  const correct = Number(elements.correctAnswers.value);
  const wrong = Number(elements.wrongAnswers.value);
  const blank = Number(elements.blankAnswers.value);

  if (correct + wrong + blank !== questions) {
    alert("A soma de acertos, erros e brancos deve ser igual ao total de questões feitas.");
    return;
  }

  state.studies.push({
    id: createId(),
    date: elements.studyDate.value,
    subjectId: elements.studySubject.value,
    topic: elements.studyTopic.value.trim(),
    minutes: Number(elements.studyMinutes.value),
    questions,
    correct,
    wrong,
    blank
  });
  elements.studyForm.reset();
  elements.studyDate.value = todayISO();
  render();
});

elements.clearData.addEventListener("click", () => {
  if (confirm("Tem certeza que deseja apagar todos os dados salvos neste navegador?")) {
    state.subjects = [];
    state.studies = [];
    render();
  }
});

render();
