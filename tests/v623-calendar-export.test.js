/* V623 — Calendário de Metas: timbre, visual novo e registro da Fábrica nos três arquivos. */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const api = require("../goal-calendar-export-v623.js");

const FOLDER_A = "https://drive.google.com/drive/folders/1AAAAAAAAAAAAAAAAAAAAA";
const FOLDER_B = "https://drive.google.com/drive/folders/1BBBBBBBBBBBBBBBBBBBBB";

function sampleState() {
  return {
    activeContestId: "pcpr-2026-delegado",
    contestProfiles: [
      { id: "pcpr-2026-delegado", name: "PCPR 2026 — Delegado de Polícia" },
      { id: "pcma-2026-delegado", name: "PCMA 2026 — Delegado de Polícia Civil" }
    ],
    contestSyllabusMap: [
      { contestId: "pcpr-2026-delegado", syllabusItemId: "item-1", code: "2.1" },
      { contestId: "pcma-2026-delegado", syllabusItemId: "item-1", code: "15" },
      { contestId: "pcma-2026-delegado", syllabusItemId: "item-1", code: "1.4" }
    ],
    syllabusItems: [
      { id: "item-1", discipline: "DIREITO PROCESSUAL PENAL", subject: "Princípios", reference: "2.1 Princípios Fundamentais." },
      { id: "item-2", discipline: "DIREITO PENAL", subject: "Teoria da pena", reference: "4.3 Teoria da pena." }
    ],
    factoryAgenda: [
      {
        id: "f1", disciplina: "DIREITO PROCESSUAL PENAL", tema: "Princípios Fundamentais do Processo Penal",
        editalLink: { itemIds: ["item-1"] }, factoryDestinationFolder: FOLDER_A,
        modules: {
          resumoAula: { status: "Aprovado", wordLink: "", pdfLink: FOLDER_A, dataConclusao: "" },
          lei: { status: "PDF gerado", wordLink: "", pdfLink: "", dataConclusao: "2026-07-10" },
          jurisprudencia: { status: "Não se aplica" },
          peca: { status: "Em produção" },
          completo: { status: "Não iniciado" }
        }
      },
      {
        id: "f2", disciplina: "DIREITO PENAL", tema: "Teoria da Pena", syllabusItemId: "item-2", factoryDestinationFolder: "",
        modules: { resumoAula: { status: "Aprovado" } }
      },
      { id: "f3", disciplina: "DIREITO CIVIL", tema: "Contratos", modules: { resumoAula: { status: "Aguardando revisão" } } }
    ],
    questionTrainingEvents: [
      { id: "r1", kind: "prompt", roundId: "r1", discipline: "DIREITO PROCESSUAL PENAL", theme: "Princípios Fundamentais do Processo Penal", config: { primary: "FGV", count: 10, syllabusItemId: "item-1" }, createdAt: "2026-09-12T10:00:00.000Z" },
      { id: "qimport-1", kind: "import", roundId: "r1", discipline: "DIREITO PROCESSUAL PENAL", theme: "Princípios Fundamentais do Processo Penal", questionIds: ["Q1", "Q2", "Q3"], createdAt: "2026-09-13T11:00:00.000Z" },
      { id: "r2", kind: "prompt", roundId: "r2", discipline: "DIREITO PENAL", theme: "Teoria da Pena", config: { primary: "CEBRASPE", count: 5 }, createdAt: "2026-09-14T10:00:00.000Z" }
    ]
  };
}

function samplePeriods() {
  const goal = (date, status, extra = {}) => ({ date, discipline: "DIREITO PENAL", subject: "Teoria da pena", type: "Estudo novo", plannedMinutes: 60, actualMinutes: status === "Concluída" ? 50 : 0, status, priority: "Alta", ...extra });
  const days = [
    { date: "2026-09-14", dayType: "Plantão", availableHours: 2, goals: [goal("2026-09-14", "Concluída"), goal("2026-09-14", "Pendente", { subject: "Concurso de crimes & erro" })] },
    { date: "2026-09-15", dayType: "Folga", availableHours: 6, goals: [] }
  ];
  const data = (mode, list) => ({ mode, start: list[0].date, end: list.at(-1).date, dates: list.map((day) => day.date), goals: list.flatMap((day) => day.goals), planned: 120, actual: 50, completed: 1, percent: 50, disciplines: { "DIREITO PENAL": 2 }, days: list });
  return [
    { label: "DIA", key: "daily", data: data("daily", days.slice(0, 1)) },
    { label: "SEMANA", key: "weekly", data: data("weekly", days) },
    { label: "MÊS", key: "monthly", data: data("monthly", days) }
  ];
}

function sampleReport(options = {}) {
  const appState = sampleState();
  return api.buildReport({
    periods: samplePeriods(), referenceDate: "2026-09-14", scope: "all", scopeLabel: "Dia + semana + mês",
    summaries: api.elaboratedSummaries(appState), trainings: api.trainingRecords(appState),
    generatedAt: "2026-09-15T20:00:00.000Z", today: "2026-09-15", ...options
  });
}

test("V623 lista só os resumos elaborados (Aprovado ou PDF gerado), com edital e item reais", () => {
  const rows = api.elaboratedSummaries(sampleState());
  assert.deepEqual(rows.map((row) => `${row.discipline}|${row.typeLabel}`), [
    "DIREITO PENAL|RESUMO/AULA",
    "DIREITO PROCESSUAL PENAL|RESUMO/AULA",
    "DIREITO PROCESSUAL PENAL|LEI"
  ]);
  const principios = rows.find((row) => row.typeLabel === "RESUMO/AULA" && row.discipline === "DIREITO PROCESSUAL PENAL");
  assert.equal(principios.edital, "PCPR 2026 — Delegado de Polícia; PCMA 2026 — Delegado de Polícia Civil");
  assert.equal(principios.editalItem, "PCPR 2026: 2.1 · PCMA 2026: 1.4, 15");
  assert.equal(principios.folderUrl, FOLDER_A);
  const pena = rows.find((row) => row.discipline === "DIREITO PENAL");
  assert.equal(pena.editalItem, "4.3 Teoria da pena.", "sem mapa do edital, usa a referência do item");
  assert.equal(pena.edital, "PCPR 2026 — Delegado de Polícia");
});

test("V623 treinos elaborados são as rodadas com questões importadas", () => {
  const trainings = api.trainingRecords(sampleState());
  assert.equal(trainings.length, 1, "a rodada só com prompt ainda não foi feita");
  assert.equal(trainings[0].typeLabel, "FGV · 3 QUESTÕES");
  assert.equal(trainings[0].date, "2026-09-13T11:00:00.000Z");
  assert.equal(trainings[0].folderUrl, FOLDER_A);
  assert.equal(trainings[0].editalItem, "PCPR 2026: 2.1 · PCMA 2026: 1.4, 15");
});

test("V623 reconhece o arquivo certo de cada tipo de resumo pelos nomes da Fábrica", () => {
  const file = (id, name, modifiedTime = "2026-09-01T00:00:00Z") => ({ id, name, modifiedTime, mimeType: name.endsWith(".pdf") ? "application/pdf" : "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
  const folder = [
    file("w1", "MAPA_HIERARQUICO_RESUMO_AULA_DIREITOS_SOCIAIS.docx"),
    file("p1", "MAPA_HIERARQUICO_RESUMO_AULA_DIREITOS_SOCIAIS.pdf"),
    file("p0", "MAPA_HIERARQUICO_RESUMO_AULA_DIREITOS_SOCIAIS_ANTIGO.pdf", "2026-09-05T00:00:00Z"),
    file("lock", "~$PA_HIERARQUICO_RESUMO_AULA_DIREITOS_SOCIAIS.docx"),
    file("bad", "ARQUIVO_INCORRETO_DESCONSIDERAR_MAPA_MENTAL_JURISPRUDENCIAS_DIREITOS_SOCIAIS.docx"),
    file("j1", "MAPA_MENTAL_JURISPRUDENCIAS_LEI_9_613_1998.docx"),
    file("j2", "MAPA_MENTAL_JURISPRUDENCIAS_LEI_9_613_1998.pdf"),
    file("l1", "RESUMO_TOPIFICADO_LEI_9.613_1998_INTEGRAL (1).docx"),
    file("l2", "RESUMO_TOPIFICADO_LEI_9.613_1998_INTEGRAL.pdf"),
    file("k1", "MAPA_TOPIFICADO_PECA_PRISAO_TEMPORARIA (1).docx")
  ];
  const resumo = api.pickModuleFiles({ shared: folder }, "resumoAula");
  assert.equal(resumo.word.id, "w1");
  assert.equal(resumo.pdf.id, "p1", "o PDF gêmeo do Word vence o mais recente");
  assert.equal(resumo.twin, true);
  assert.equal(api.pickModuleFiles({ shared: folder }, "jurisprudencia").word.id, "j1");
  const lei = api.pickModuleFiles({ shared: folder }, "lei");
  assert.equal(lei.word.id, "l1", "o mapa de jurisprudências da lei não é o resumo da lei");
  assert.equal(lei.pdf.id, "l2");
  assert.equal(lei.twin, true, "“(1)” no nome não impede reconhecer o gêmeo");
  assert.equal(api.pickModuleFiles({ shared: folder }, "peca").word.id, "k1");
  assert.equal(api.pickModuleFiles({ shared: folder }, "peca").pdf, null);
  assert.equal(api.pickModuleFiles({ shared: folder }, "completo").word, null);
  const explicit = api.pickModuleFiles({ explicit: [file("x1", "QUALQUER_NOME.pdf", "2026-01-01T00:00:00Z")], shared: folder }, "resumoAula");
  assert.equal(explicit.pdf.id, "p1", "sem Word explícito, o PDF gêmeo do Word ainda vence");
  const onlyExplicit = api.pickModuleFiles({ explicit: [file("x2", "QUALQUER_NOME.docx")], shared: folder }, "resumoAula");
  assert.equal(onlyExplicit.word.id, "x2", "arquivo apontado pelo próprio módulo tem prioridade");
  assert.deepEqual(api.driveIdFrom(FOLDER_A), { kind: "folder", id: "1AAAAAAAAAAAAAAAAAAAAA" });
  assert.deepEqual(api.driveIdFrom("https://drive.google.com/file/d/1CCCCCCCCCCCCCCCCCCCCC/view"), { kind: "file", id: "1CCCCCCCCCCCCCCCCCCCCC" });
});

test("V623 confere arquivos e páginas pelo Google Drive e trata permissão negada", async () => {
  const files = {
    "1AAAAAAAAAAAAAAAAAAAAA": [
      { id: "w1", name: "MAPA_HIERARQUICO_RESUMO_AULA_PRINCIPIOS.docx", createdTime: "2026-08-20T12:00:00Z", modifiedTime: "2026-08-21T12:00:00Z", webViewLink: "https://drive.google.com/file/d/w1/view" },
      { id: "p1", name: "MAPA_HIERARQUICO_RESUMO_AULA_PRINCIPIOS.pdf", createdTime: "2026-08-20T12:05:00Z", modifiedTime: "2026-08-21T12:05:00Z", webViewLink: "https://drive.google.com/file/d/p1/view" },
      { id: "t1", name: "TREINO_DIREITO_PROCESSUAL_PENAL_PRINCIPIOS.txt", modifiedTime: "2026-09-13T11:00:00Z", webViewLink: "https://drive.google.com/file/d/t1/view" },
      { id: "t0", name: "TREINO_DIREITO_PROCESSUAL_PENAL_PRINCIPIOS_EXCLUSOES.json", modifiedTime: "2026-09-14T11:00:00Z" }
    ]
  };
  const calls = [];
  const get = async (url) => {
    calls.push(url);
    const folder = decodeURIComponent(url).match(/'([\w-]+)' in parents/)?.[1];
    return { files: files[folder] || [] };
  };
  const reader = api.createDriveReader({ get, countPdfPages: async (file) => (file.id === "p1" ? 12 : 0) });
  const appState = sampleState();
  const records = [...api.elaboratedSummaries(appState), ...api.trainingRecords(appState)];
  const { results, state } = await reader.resolve(records);
  assert.equal(state, "on");
  assert.equal(calls.length, 1, "a mesma pasta é listada uma vez só");

  const resumo = records.find((record) => record.moduleKey === "resumoAula" && record.discipline === "DIREITO PROCESSUAL PENAL");
  const view = api.summaryView(resumo, results.get(resumo.id), "on");
  const value = (label) => view.fields.find((field) => field.label === label).value;
  assert.equal(value("QUANTIDADE DE PÁGINAS DO PDF DO RESUMO"), "12");
  assert.equal(value("QUANTIDADE DE PÁGINAS DO WORD DO RESUMO"), "12 (conferido pelo PDF do mesmo arquivo)");
  assert.equal(value("DATA"), "20/08/2026 (data do arquivo no Drive)");

  const lei = records.find((record) => record.moduleKey === "lei");
  const leiView = api.summaryView(lei, results.get(lei.id), "on");
  assert.equal(leiView.fields.find((field) => field.label === "QUANTIDADE DE PÁGINAS DO WORD DO RESUMO").value, api.PREJUDICADO);
  assert.equal(leiView.fields.find((field) => field.label === "QUANTIDADE DE PÁGINAS DO PDF DO RESUMO").value, api.PREJUDICADO);
  assert.equal(leiView.fields.find((field) => field.label === "DATA").value, "10/07/2026", "a data registrada na Fábrica vence a do arquivo");

  const treino = records.find((record) => record.kind === "treino");
  const treinoView = api.trainingView(treino, results.get(treino.id), "on");
  assert.equal(treinoView.fields.find((field) => field.label === "ARQUIVO DO TREINO").value, "TREINO_DIREITO_PROCESSUAL_PENAL_PRINCIPIOS.txt");

  const denied = api.createDriveReader({ get: async () => { const error = new Error("403"); error.status = 403; throw error; }, countPdfPages: async () => 1 });
  assert.equal((await denied.resolve(records)).state, "denied");
});

test("V623 sem Google Drive, nada é inventado: NÃO CONFERIDO ou PREJUDICADO", () => {
  const appState = sampleState();
  const [pena, principios] = api.elaboratedSummaries(appState);
  const off = api.summaryView(principios, undefined, "off");
  assert.equal(off.fields.find((field) => field.label === "QUANTIDADE DE PÁGINAS DO PDF DO RESUMO").value, api.DRIVE_NOTES.off);
  assert.equal(off.fields.find((field) => field.label === "DATA").value, api.NO_DATE);
  const noLinks = api.summaryView(pena, undefined, "off");
  assert.equal(noLinks.fields.find((field) => field.label === "QUANTIDADE DE PÁGINAS DO WORD DO RESUMO").value, api.PREJUDICADO, "sem pasta nem link não há arquivo");
  assert.equal(noLinks.fields.find((field) => field.label === "LINK DA PASTA DESTINO").value, api.PREJUDICADO);
  const denied = api.summaryView(principios, undefined, "denied");
  assert.equal(denied.fields.find((field) => field.label === "QUANTIDADE DE PÁGINAS DO PDF DO RESUMO").value, api.DRIVE_NOTES.denied);
});

test("V623 os campos seguem a ordem pedida por ele", () => {
  const report = sampleReport();
  const labels = report.summaries[0].view.fields.map((field) => field.label || field.value.replace(/ - .* ELABORADO$/, " - X ELABORADO"));
  assert.deepEqual(labels, ["DISCIPLINA", "TEMA", "EDITAL", "ITEM DO EDITAL", "RESUMO - X ELABORADO", "DATA", "LINK DA PASTA DESTINO", "QUANTIDADE DE PÁGINAS DO WORD DO RESUMO", "QUANTIDADE DE PÁGINAS DO PDF DO RESUMO"]);
  const trainingLabels = report.trainings[0].view.fields.map((field) => field.label || field.value.replace(/ - .* ELABORADO$/, " - X ELABORADO"));
  assert.deepEqual(trainingLabels, ["DISCIPLINA", "TEMA", "EDITAL", "ITEM DO EDITAL", "TREINO DE QUESTÕES - X ELABORADO", "DATA", "LINK DA PASTA DESTINO", "ARQUIVO DO TREINO"]);
});

test("V623 PDF: timbre no canto superior esquerdo de toda página, calendário e Fábrica", () => {
  const html = api.buildPrintHtml(sampleReport());
  assert.match(html, /<thead><tr><td><div class="acv-letterhead"><div class="acv-logo">/, "o timbre fica no cabeçalho repetido em cada página, com o logo primeiro");
  assert.doesNotMatch(html, /<header\b/, "o modo de impressão do site esconde elementos header");
  assert.doesNotMatch(html, /ALDUS META<\/strong>/, "o logo já traz o nome; o timbre não repete o texto");
  assert.match(html, /counter\(page\)/);
  for (const text of ["Calendário do dia", "Calendário da semana", "Calendário do mês", "RESUMO - RESUMO/AULA ELABORADO", "TREINO DE QUESTÕES - FGV · 3 QUESTÕES ELABORADO", "QUANTIDADE DE PÁGINAS DO WORD DO RESUMO:", "LINK DA PASTA DESTINO:", "ITEM DO EDITAL:"]) {
    assert.ok(html.includes(text), `faltou no PDF: ${text}`);
  }
  assert.ok(html.includes("Concurso de crimes &amp; erro"), "texto do usuário é escapado");
  assert.match(html, /id="goalCalendarPrintableReport"/, "mantém o id que o modo de impressão do site mostra");
});

test("V623 imagem: timbre no canto superior esquerdo e registros da Fábrica", () => {
  const svg = api.buildSvg(sampleReport());
  const brand = svg.match(/data-generated-brand="Aldus Metas Concurso"[^>]*transform="translate\(([\d.]+) ([\d.]+)\)/);
  assert.ok(brand, "o timbre usa a marca do site, que evita um segundo logo à direita");
  assert.ok(Number(brand[1]) < 100 && Number(brand[2]) < 100, "timbre no canto superior esquerdo");
  assert.ok(!svg.includes(">ALDUS META<"), "o logo já traz o nome; o timbre não repete o texto");
  assert.ok(svg.includes("RESUMO - LEI ELABORADO"));
  assert.ok(svg.includes("Concurso de crimes &amp; erro"));
  assert.match(svg, /viewBox="0 0 1600 \d+"/);
});

test("V623 Excel: três abas, timbre em cada uma no canto superior esquerdo e links clicáveis", () => {
  const files = api.buildWorkbookFiles(sampleReport(), new Uint8Array([137, 80, 78, 71]));
  const byName = Object.fromEntries(files.map((file) => [file.name, file.data]));
  const workbook = byName["xl/workbook.xml"];
  assert.match(workbook, /<sheet name="Calendário"/);
  assert.match(workbook, /<sheet name="Fábrica - resumos"/);
  assert.match(workbook, /<sheet name="Fábrica - treinos"/);
  for (const n of [1, 2, 3]) {
    assert.match(byName[`xl/drawings/drawing${n}.xml`], /<xdr:from><xdr:col>0<\/xdr:col><xdr:colOff>\d+<\/xdr:colOff><xdr:row>0<\/xdr:row>/);
    assert.match(byName[`xl/worksheets/sheet${n}.xml`], /<drawing r:id="rId1"\/><\/worksheet>$/);
  }
  const resumos = byName["xl/worksheets/sheet2.xml"];
  assert.match(resumos, /HYPERLINK\(&quot;https:\/\/drive\.google\.com\/drive\/folders\/1AAAAAAAAAAAAAAAAAAAAA&quot;/);
  assert.ok(resumos.includes("RESUMO - RESUMO/AULA ELABORADO"));
  assert.ok(resumos.includes("QUANTIDADE") === false, "o cabeçalho usa rótulos curtos");
  assert.ok(resumos.includes("PÁGINAS DO PDF DO RESUMO"));
  assert.ok(byName["xl/worksheets/sheet1.xml"].includes("Concurso de crimes &amp; erro"));
  assert.match(byName["[Content_Types].xml"], /Extension="png"/);
  for (const [name, data] of Object.entries(byName)) {
    if (typeof data !== "string") continue;
    const opened = (data.match(/<(?!\/|\?|!)[^>]*[^/]>/g) || []).length;
    const closed = (data.match(/<\/[^>]+>/g) || []).length;
    assert.equal(opened, closed, `XML desequilibrado em ${name}`);
  }
});

test("V623 é carregado pelo instalador e espelhado em docs", () => {
  const loader = fs.readFileSync("performance-emergency-v350.js", "utf8");
  assert.ok(loader.includes('script.src = "goal-calendar-export-v623.js?v=20260915-calendario-exportacoes-v623";'));
  assert.match(loader, /\n  installGoalCalendarExportV623\(\);\r?\n  if \(install\(\)\) return;/);
  for (const file of ["goal-calendar-export-v623.js", "performance-emergency-v350.js"]) {
    assert.deepEqual(fs.readFileSync(file), fs.readFileSync(`docs/${file}`), `${file} deve ser idêntico em docs`);
  }
  assert.match(fs.readFileSync("build-bundles.mjs", "utf8"), /"goal-calendar-export-v623\.js"/);
});
