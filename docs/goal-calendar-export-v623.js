/* V623 — Calendário de Metas: PDF, Excel e imagem redesenhados, com timbre do Aldus e o registro da Fábrica. */
(() => {
  "use strict";

  const VERSION = "20260915-calendario-exportacoes-v623";
  const FLAG = "__ALDUS_GOAL_CALENDAR_EXPORT_V623__";
  if (globalThis[FLAG]) return;

  const COLORS = {
    navy: "#061C33", ink: "#0F172A", blue: "#1D4ED8", sky: "#E7EFFD", muted: "#5B6B82", line: "#D6DEEA",
    paper: "#F6F8FC", gold: "#C7972B", green: "#15803D", greenSoft: "#DCFCE7", red: "#B91C1C", redSoft: "#FEE2E2",
    amber: "#B45309", amberSoft: "#FEF3C7"
  };
  const MODULES = [["resumoAula", "RESUMO/AULA"], ["lei", "LEI"], ["jurisprudencia", "JURISPRUDÊNCIA"], ["peca", "PEÇA"], ["completo", "COMPLETO"]];
  const ELABORATED_STATUSES = ["Aprovado", "PDF gerado"];
  const PREJUDICADO = "PREJUDICADO";
  const NO_DATE = "SEM DATA REGISTRADA";
  const DRIVE_READ_SCOPE = "https://www.googleapis.com/auth/drive.readonly";
  const PAGE_CACHE_KEY = "aldusCalendarioPaginasPdfV623";
  const FILE_FIELDS = "id,name,mimeType,createdTime,modifiedTime,webViewLink";
  const BUTTONS = { exportGoalCalendarPdf: "pdf", exportGoalCalendarExcel: "excel", exportGoalCalendarImage: "image" };
  const DRIVE_NOTES = {
    on: "Arquivos e páginas conferidos no Google Drive",
    off: "NÃO CONFERIDO — Google Drive não conectado",
    denied: "NÃO CONFERIDO — o Google Drive não autorizou a leitura",
    error: "NÃO CONFERIDO — falha ao ler o Google Drive"
  };

  // ---------------------------------------------------------------- utilidades
  const text = (value) => String(value ?? "").trim();
  const canon = (value) => text(value).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
  const naturalCompare = (left, right) => String(left).localeCompare(String(right), "pt-BR", { numeric: true, sensitivity: "base" });
  const call = (name, ...args) => {
    try {
      const fn = globalThis[name];
      return typeof fn === "function" ? fn(...args) : undefined;
    } catch {
      return undefined;
    }
  };

  function dateBR(value) {
    const iso = text(value).slice(0, 10);
    const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return match ? `${match[3]}/${match[2]}/${match[1]}` : text(value);
  }

  function dateTimeBR(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return text(value);
    return date.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  }

  function minutesLabel(value) {
    const total = Math.max(0, Math.round(Number(value) || 0));
    if (total < 60) return `${total} min`;
    const hours = Math.floor(total / 60);
    const minutes = total % 60;
    return minutes ? `${hours}h ${minutes}min` : `${hours}h`;
  }

  const WEEKDAYS = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];
  function weekdayOf(iso) {
    const date = new Date(`${text(iso).slice(0, 10)}T12:00:00`);
    return Number.isNaN(date.getTime()) ? "" : WEEKDAYS[date.getDay()];
  }

  function todayISO() {
    const fromApp = call("todayISO");
    if (typeof fromApp === "string" && fromApp) return fromApp;
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  }

  function currentState() {
    try {
      return typeof state !== "undefined" && state && typeof state === "object" ? state : null;
    } catch {
      return null;
    }
  }

  // ------------------------------------------------------- dados da Fábrica
  function factoryAgendaOf(appState) {
    return Array.isArray(appState?.factoryAgenda) && appState.factoryAgenda.length
      ? appState.factoryAgenda
      : (Array.isArray(appState?.factoryItems) ? appState.factoryItems : []);
  }

  function syllabusIdsOf(item = {}) {
    return [...new Set([...(item.editalLink?.itemIds || []), ...(item.syllabusItemIds || []), item.syllabusItemId].filter(Boolean).map(String))];
  }

  function contestShortName(name) {
    return text(name).split(" — ")[0] || text(name);
  }

  function editalInfo(appState, ids = []) {
    const profiles = new Map((appState?.contestProfiles || []).map((profile) => [profile.id, profile]));
    const lookup = globalThis.officialMappingsForItem;
    const mappings = ids.flatMap((id) => (typeof lookup === "function"
      ? (lookup(appState, id) || [])
      : (appState?.contestSyllabusMap || []).filter((mapping) => mapping.syllabusItemId === id)));
    if (mappings.length) {
      const byContest = new Map();
      mappings.forEach((mapping) => {
        if (!byContest.has(mapping.contestId)) byContest.set(mapping.contestId, new Set());
        if (text(mapping.code)) byContest.get(mapping.contestId).add(text(mapping.code));
      });
      const contests = [...byContest.keys()];
      return {
        edital: contests.map((id) => text(profiles.get(id)?.name) || id).join("; "),
        item: contests.map((id) => `${contestShortName(profiles.get(id)?.name || id)}: ${[...byContest.get(id)].sort(naturalCompare).join(", ") || "sem código"}`).join(" · ")
      };
    }
    const syllabus = (appState?.syllabusItems || []).find((entry) => ids.includes(String(entry.id)));
    return {
      edital: text(appState?.edital?.contestName) || text(profiles.get(appState?.activeContestId)?.name) || "EDITAL NÃO VINCULADO",
      item: text(syllabus?.reference) || text(syllabus?.subtopic) || "ITEM NÃO VINCULADO"
    };
  }

  function modulesOf(item) {
    const normalized = call("normalizeFactoryModules", item?.modules || {}, item);
    return normalized && typeof normalized === "object" ? normalized : (item?.modules || {});
  }

  // Todos os resumos já elaborados: módulos Aprovado ou PDF gerado, a mesma
  // regra de conclusão que a Fábrica usa (sem "Não se aplica").
  function elaboratedSummaries(appState) {
    const rows = [];
    for (const item of factoryAgendaOf(appState)) {
      if (!item || typeof item !== "object") continue;
      const modules = modulesOf(item);
      const edital = editalInfo(appState, syllabusIdsOf(item));
      MODULES.forEach(([key, label], order) => {
        const module = modules?.[key];
        if (!module || !ELABORATED_STATUSES.includes(module.status)) return;
        rows.push({
          kind: "resumo",
          id: `resumo|${item.id}|${key}`,
          order,
          moduleKey: key,
          typeLabel: label,
          discipline: text(item.disciplina || item.discipline) || "DISCIPLINA NÃO INFORMADA",
          theme: text(item.tema || item.subject) || "TEMA NÃO INFORMADO",
          edital: edital.edital,
          editalItem: edital.item,
          date: text(module.dataConclusao),
          folderUrl: text(item.factoryDestinationFolder || item.pastaDestinoWordPdf || item.destinationFolder),
          wordLink: text(module.wordLink),
          pdfLink: text(module.pdfLink)
        });
      });
    }
    return rows.sort((left, right) => naturalCompare(left.discipline, right.discipline) || naturalCompare(left.theme, right.theme) || left.order - right.order);
  }

  function findFactoryItem(appState, discipline, theme, syllabusItemId) {
    const agenda = factoryAgendaOf(appState);
    if (syllabusItemId) {
      const byId = agenda.find((item) => syllabusIdsOf(item).includes(String(syllabusItemId)));
      if (byId) return byId;
    }
    const d = canon(discipline);
    const t = canon(theme);
    if (!d || !t) return null;
    return agenda.find((item) => canon(item.disciplina || item.discipline) === d && canon(item.tema || item.subject) === t) || null;
  }

  // Treinos elaborados: rodadas com questões importadas. A rodada só com o
  // prompt gerado ainda não foi feita.
  function trainingRecords(appState) {
    const events = Array.isArray(appState?.questionTrainingEvents) ? appState.questionTrainingEvents : [];
    const prompts = new Map(events.filter((event) => event?.kind === "prompt").map((event) => [event.roundId || event.id, event]));
    const rounds = new Map();
    events.forEach((event) => {
      if (event?.kind !== "import") return;
      const key = event.roundId || event.id;
      if (!rounds.has(key)) rounds.set(key, { key, imports: [], questionIds: new Set() });
      const round = rounds.get(key);
      round.imports.push(event);
      (event.questionIds || []).forEach((id) => round.questionIds.add(id));
    });
    return [...rounds.values()].map((round) => {
      const prompt = prompts.get(round.key);
      const config = prompt?.config || {};
      const first = round.imports[0] || {};
      const discipline = text(first.discipline || prompt?.discipline || config.discipline);
      const theme = text(first.theme || prompt?.theme || config.theme);
      const factoryItem = findFactoryItem(appState, discipline, theme, config.syllabusItemId);
      const ids = [...new Set([text(config.syllabusItemId), ...(factoryItem ? syllabusIdsOf(factoryItem) : [])].filter(Boolean))];
      const edital = editalInfo(appState, ids);
      const count = round.questionIds.size;
      const date = round.imports.map((event) => text(event.createdAt)).filter(Boolean).sort().at(-1) || text(prompt?.createdAt);
      return {
        kind: "treino",
        id: `treino|${round.key}`,
        typeLabel: [text(config.primary), `${count} ${count === 1 ? "QUESTÃO" : "QUESTÕES"}`].filter(Boolean).join(" · "),
        discipline: discipline || "DISCIPLINA NÃO INFORMADA",
        theme: theme || "TREINO MISTO DA DISCIPLINA",
        edital: edital.edital,
        editalItem: edital.item,
        date,
        folderUrl: text(factoryItem?.factoryDestinationFolder || factoryItem?.pastaDestinoWordPdf)
      };
    }).sort((left, right) => naturalCompare(left.discipline, right.discipline) || naturalCompare(left.theme, right.theme) || naturalCompare(left.date, right.date));
  }

  // ------------------------------------------------ arquivos no Google Drive
  function driveIdFrom(url) {
    const value = text(url);
    let match = value.match(/\/folders\/([\w-]{10,})/);
    if (match) return { kind: "folder", id: match[1] };
    match = value.match(/\/(?:file|document|spreadsheets|presentation)\/d\/([\w-]{10,})/);
    if (match) return { kind: "file", id: match[1] };
    match = value.match(/[?&]id=([\w-]{10,})/);
    return match ? { kind: "file", id: match[1] } : null;
  }

  const IGNORED_FILE = /^~\$|ARQUIVO[_\s-]*INCORRETO|DESCONSIDERAR/i;
  // Nomes usados pelos prompts da Fábrica, do mais específico ao mais geral.
  const FILE_KINDS = [
    ["jurisprudencia", /JURISPRUD/i],
    ["peca", /(^|[_\s.-])PE[CÇ]A([_\s.-]|$)/i],
    ["lei", /RESUMO[_\s-]*TOPIFICADO[_\s-]*LEI|(^|[_\s-])LEI[_\s-]/i],
    ["resumoAula", /RESUMO[_\s-]*AULA|MAPA[_\s-]*HIERARQUICO/i],
    ["completo", /COMPLETO|FUS[AÃ]O[_\s-]*FINAL|CONSOLIDA/i]
  ];
  const isWord = (file) => /\.docx?$/i.test(file?.name || "") || /wordprocessingml|msword|google-apps\.document/.test(file?.mimeType || "");
  const isPdf = (file) => /\.pdf$/i.test(file?.name || "") || file?.mimeType === "application/pdf";
  const isTrainingFile = (file) => /^TREINO[_\s-]/i.test(file?.name || "") && !/EXCLUS/i.test(file?.name || "");

  function fileKind(file) {
    const found = FILE_KINDS.find(([, pattern]) => pattern.test(file?.name || ""));
    return found ? found[0] : "";
  }

  function baseName(name) {
    return text(name).replace(/\.[^.]+$/, "").replace(/\s*\(\d+\)\s*$/, "").trim().toUpperCase();
  }

  const newest = (files) => files.slice().sort((left, right) => naturalCompare(right.modifiedTime || "", left.modifiedTime || ""))[0] || null;

  // Escolhe o Word e o PDF do módulo: arquivo apontado pelo próprio módulo,
  // depois os da pasta própria do módulo e, na pasta de destino do tema, os que
  // têm o nome daquele tipo de resumo. O PDF gêmeo (mesmo nome do Word) vence.
  function pickModuleFiles({ explicit = [], moduleFolder = [], shared = [] }, moduleKey) {
    const usable = (files) => files.filter((file) => file && !IGNORED_FILE.test(file.name || "") && (isWord(file) || isPdf(file)));
    const candidates = [...usable(explicit), ...usable(moduleFolder), ...usable(shared).filter((file) => fileKind(file) === moduleKey)];
    const unique = [...new Map(candidates.map((file) => [file.id, file])).values()];
    const explicitIds = new Set(usable(explicit).map((file) => file.id));
    const choose = (test) => {
      const list = unique.filter(test);
      return newest(list.filter((file) => explicitIds.has(file.id))) || newest(list);
    };
    const word = choose(isWord);
    const twin = word ? newest(unique.filter((file) => isPdf(file) && baseName(file.name) === baseName(word.name))) : null;
    const pdf = twin || choose(isPdf);
    return { word, pdf, twin: Boolean(twin) };
  }

  function createDriveReader({ get, countPdfPages }) {
    const folders = new Map();
    const metas = new Map();
    const listFolder = (id) => {
      if (!folders.has(id)) {
        const query = encodeURIComponent(`'${id}' in parents and trashed=false`);
        folders.set(id, get(`https://www.googleapis.com/drive/v3/files?q=${query}&fields=${encodeURIComponent(`files(${FILE_FIELDS})`)}&pageSize=300&supportsAllDrives=true&includeItemsFromAllDrives=true`)
          .then((data) => (Array.isArray(data?.files) ? data.files : [])));
      }
      return folders.get(id);
    };
    const fileMeta = (id) => {
      if (!metas.has(id)) metas.set(id, get(`https://www.googleapis.com/drive/v3/files/${id}?fields=${encodeURIComponent(FILE_FIELDS)}&supportsAllDrives=true`));
      return metas.get(id);
    };

    async function resolveSummary(record) {
      const destination = driveIdFrom(record.folderUrl);
      const groups = { explicit: [], moduleFolder: [], shared: [] };
      for (const link of [record.wordLink, record.pdfLink].map(driveIdFrom).filter(Boolean)) {
        if (link.kind === "file") groups.explicit.push(await fileMeta(link.id));
        else if (destination?.kind === "folder" && link.id === destination.id) groups.shared.push(...await listFolder(link.id));
        else groups.moduleFolder.push(...await listFolder(link.id));
      }
      if (destination?.kind === "folder") groups.shared.push(...await listFolder(destination.id));
      const picked = pickModuleFiles(groups, record.moduleKey);
      let pdfPages = null;
      let pdfError = "";
      if (picked.pdf) {
        try { pdfPages = await countPdfPages(picked.pdf); } catch (error) { pdfError = String(error?.message || error); }
      }
      return { checked: true, ...picked, pdfPages, pdfError };
    }

    async function resolveTraining(record) {
      const destination = driveIdFrom(record.folderUrl);
      const files = destination?.kind === "folder" ? await listFolder(destination.id) : [];
      return { checked: true, trainingFile: newest(files.filter(isTrainingFile)) };
    }

    async function resolve(records, onProgress = () => {}) {
      const results = new Map();
      const queue = records.slice();
      let done = 0;
      let fatal = null;
      const worker = async () => {
        while (queue.length && !fatal) {
          const record = queue.shift();
          try {
            results.set(record.id, record.kind === "treino" ? await resolveTraining(record) : await resolveSummary(record));
          } catch (error) {
            if (error?.status === 401 || error?.status === 403) fatal = error;
            results.set(record.id, { checked: false, error: String(error?.message || error) });
          }
          done += 1;
          onProgress(done, records.length);
        }
      };
      await Promise.all(Array.from({ length: 4 }, worker));
      return { results, state: fatal ? "denied" : "on" };
    }

    return { resolve, listFolder, fileMeta };
  }

  // ------------------------------------------ campos no formato pedido por ele
  function driveNote(driveState) {
    return DRIVE_NOTES[driveState] || DRIVE_NOTES.off;
  }

  function hasNoLinks(record) {
    return !record.folderUrl && !record.wordLink && !record.pdfLink;
  }

  function summaryView(record, info, driveState = "off") {
    const checked = driveState === "on" && info?.checked;
    const unchecked = hasNoLinks(record) ? PREJUDICADO : driveNote(driveState === "on" ? "error" : driveState);
    const fileDate = checked ? (info.pdf?.createdTime || info.word?.createdTime || "") : "";
    const date = record.date ? dateBR(record.date) : fileDate ? `${dateBR(fileDate)} (data do arquivo no Drive)` : NO_DATE;
    let wordPages = unchecked;
    let pdfPages = unchecked;
    if (checked) {
      pdfPages = !info.pdf ? PREJUDICADO : Number.isFinite(info.pdfPages) ? String(info.pdfPages) : "NÃO CONTADO — não foi possível ler o PDF";
      wordPages = !info.word ? PREJUDICADO
        : info.twin && Number.isFinite(info.pdfPages) ? `${info.pdfPages} (conferido pelo PDF do mesmo arquivo)`
          : "NÃO CONTADO — sem PDF do mesmo Word para conferir";
    }
    const tone = (value) => (/^(PREJUDICADO|NÃO )/.test(value) ? "warn" : "");
    return {
      title: `RESUMO - ${record.typeLabel} ELABORADO`,
      fields: [
        { label: "DISCIPLINA", value: record.discipline },
        { label: "TEMA", value: record.theme },
        { label: "EDITAL", value: record.edital },
        { label: "ITEM DO EDITAL", value: record.editalItem },
        { label: "", value: `RESUMO - ${record.typeLabel} ELABORADO`, statement: true },
        { label: "DATA", value: date, tone: date === NO_DATE ? "warn" : "" },
        { label: "LINK DA PASTA DESTINO", value: record.folderUrl || PREJUDICADO, href: record.folderUrl, tone: record.folderUrl ? "" : "warn" },
        { label: "QUANTIDADE DE PÁGINAS DO WORD DO RESUMO", value: wordPages, href: checked ? info.word?.webViewLink : "", tone: tone(wordPages) },
        { label: "QUANTIDADE DE PÁGINAS DO PDF DO RESUMO", value: pdfPages, href: checked ? info.pdf?.webViewLink : "", tone: tone(pdfPages) }
      ]
    };
  }

  function trainingView(record, info, driveState = "off") {
    const checked = driveState === "on" && info?.checked;
    const file = checked
      ? (info.trainingFile ? info.trainingFile.name : PREJUDICADO)
      : (record.folderUrl ? driveNote(driveState === "on" ? "error" : driveState) : PREJUDICADO);
    return {
      title: `TREINO DE QUESTÕES - ${record.typeLabel} ELABORADO`,
      fields: [
        { label: "DISCIPLINA", value: record.discipline },
        { label: "TEMA", value: record.theme },
        { label: "EDITAL", value: record.edital },
        { label: "ITEM DO EDITAL", value: record.editalItem },
        { label: "", value: `TREINO DE QUESTÕES - ${record.typeLabel} ELABORADO`, statement: true },
        { label: "DATA", value: record.date ? dateBR(record.date) : NO_DATE, tone: record.date ? "" : "warn" },
        { label: "LINK DA PASTA DESTINO", value: record.folderUrl || PREJUDICADO, href: record.folderUrl, tone: record.folderUrl ? "" : "warn" },
        { label: "ARQUIVO DO TREINO", value: file, href: checked ? info.trainingFile?.webViewLink : "", tone: /^(PREJUDICADO|NÃO )/.test(file) ? "warn" : "" }
      ]
    };
  }

  // -------------------------------------------------------- modelo do arquivo
  function goalState(goal, today) {
    if (/conclu/i.test(goal.status || "")) return "done";
    return text(goal.date) && goal.date < today ? "missed" : "pending";
  }
  const STATE_LABEL = { done: "Concluída", missed: "Não realizada", pending: "A fazer" };
  const PERIOD_TITLE = { daily: "Calendário do dia", weekly: "Calendário da semana", monthly: "Calendário do mês" };

  function buildReport({ periods, referenceDate, scope, scopeLabel, summaries, trainings, driveInfo = new Map(), driveState = "off", generatedAt = new Date().toISOString(), today = todayISO() }) {
    return {
      version: VERSION,
      generatedAt,
      referenceDate,
      scope,
      scopeLabel,
      today,
      driveState,
      driveNote: driveNote(driveState),
      periods: periods.map(({ label, key, data }) => ({ label, key, title: PERIOD_TITLE[key] || `Calendário — ${label}`, data })),
      summaries: summaries.map((record) => ({ record, view: summaryView(record, driveInfo.get(record.id), driveState) })),
      trainings: trainings.map((record) => ({ record, view: trainingView(record, driveInfo.get(record.id), driveState) }))
    };
  }

  function periodRange(data) {
    return data.start === data.end ? dateBR(data.start) : `${dateBR(data.start)} a ${dateBR(data.end)}`;
  }

  function periodKpis(data) {
    return [
      ["Metas", String(data.goals.length)],
      ["Concluídas", String(data.completed)],
      ["Cumprimento", `${data.percent}%`],
      ["Planejado", minutesLabel(data.planned)],
      ["Realizado", minutesLabel(data.actual)]
    ];
  }

  function disciplineList(data) {
    return Object.entries(data.disciplines || {}).sort(([left], [right]) => naturalCompare(left, right));
  }

  // ------------------------------------------------------------- timbre
  function logoSvg() {
    const svg = call("generatedBrandLogoSvg");
    if (typeof svg === "string" && svg.includes("<svg")) return svg;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 440" data-generated-logo="Aldus Metas Concurso"><rect width="1200" height="440" rx="60" fill="${COLORS.navy}"/></svg>`;
  }

  function logoMarkSvg(x, y, width) {
    const mark = call("generatedBrandMarkSvg", x, y, width);
    if (typeof mark === "string" && mark.includes("data-generated-brand")) return mark;
    return `<g data-generated-brand="Aldus Metas Concurso" transform="translate(${x} ${y})"><rect width="${width}" height="${Math.round(width * 440 / 1200)}" rx="16" fill="${COLORS.navy}"/></g>`;
  }

  // ------------------------------------------------------------------- PDF
  function printCss() {
    return `
      @media screen { #goalCalendarPrintableReport.aldus-cal-v623 { display: none !important; } }
      @media print {
        @page { size: A4 portrait; margin: 9mm 10mm 13mm; @bottom-right { content: "Página " counter(page) " de " counter(pages); font: 7.5pt Arial, Helvetica, sans-serif; color: #5b6b82; } }
        body.calendar-print-mode { min-width: 0 !important; width: auto !important; margin: 0 !important; padding: 0 !important; }
        body.calendar-print-mode #goalCalendarPrintableReport.aldus-cal-v623 { display: block !important; width: 100% !important; min-width: 0 !important; max-width: 190mm !important; margin: 0 auto !important; }
      }
      #goalCalendarPrintableReport.aldus-cal-v623 { color: ${COLORS.ink}; font: 9pt/1.42 Arial, Helvetica, sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .aldus-cal-v623 * { box-sizing: border-box; }
      .aldus-cal-v623 .acv-sheet { width: 100%; border-collapse: collapse; }
      .aldus-cal-v623 .acv-sheet > thead > tr > td, .aldus-cal-v623 .acv-sheet > tbody > tr > td, .aldus-cal-v623 .acv-sheet > tfoot > tr > td { padding: 0; border: 0; background: none; }
      .aldus-cal-v623 .acv-letterhead { display: flex; align-items: center; gap: 4mm; padding: 0 0 2.6mm; margin: 0 0 4mm; border-bottom: .7mm solid ${COLORS.navy}; box-shadow: 0 .8mm 0 ${COLORS.gold}; }
      .aldus-cal-v623 .acv-logo { width: 38mm; flex: 0 0 38mm; line-height: 0; }
      .aldus-cal-v623 .acv-logo svg { display: block; width: 100%; height: auto; }
      .aldus-cal-v623 .acv-doc { margin-left: auto; text-align: right; line-height: 1.3; }
      .aldus-cal-v623 .acv-doc strong { display: block; color: ${COLORS.navy}; font-size: 10.5pt; }
      .aldus-cal-v623 .acv-doc span { color: ${COLORS.muted}; font-size: 7.8pt; }
      .aldus-cal-v623 .acv-cover { margin: 0 0 5mm; padding: 5mm 6mm; border-radius: 3mm; color: #fff; background: linear-gradient(120deg, ${COLORS.navy}, #0B3A7A 62%, ${COLORS.blue}); }
      .aldus-cal-v623 .acv-cover p { margin: 0; font-size: 7.5pt; font-weight: 700; letter-spacing: .18em; color: #C9D8F2; }
      .aldus-cal-v623 .acv-cover h1 { margin: 1.2mm 0 1.6mm; font-size: 19pt; line-height: 1.1; color: #fff; }
      .aldus-cal-v623 .acv-cover div { font-size: 8.5pt; color: #E3ECFB; }
      .aldus-cal-v623 .acv-section { margin: 0 0 6mm; }
      .aldus-cal-v623 .acv-section-title { display: flex; justify-content: space-between; align-items: baseline; gap: 4mm; margin: 0 0 3mm; padding: 2.4mm 3.5mm; border-radius: 2mm; background: ${COLORS.sky}; border-left: 1.6mm solid ${COLORS.blue}; break-after: avoid; }
      .aldus-cal-v623 .acv-section-title h2 { margin: 0; color: ${COLORS.navy}; font-size: 12pt; }
      .aldus-cal-v623 .acv-section-title span { color: ${COLORS.muted}; font-size: 8pt; white-space: nowrap; }
      .aldus-cal-v623 .acv-factory .acv-section-title { background: #FBF4E4; border-left-color: ${COLORS.gold}; }
      .aldus-cal-v623 .acv-kpis { display: grid; grid-template-columns: repeat(5, 1fr); gap: 2.4mm; margin: 0 0 2.4mm; break-inside: avoid; }
      .aldus-cal-v623 .acv-kpi { padding: 2.2mm 3mm; border: .25mm solid ${COLORS.line}; border-radius: 2mm; background: ${COLORS.paper}; }
      .aldus-cal-v623 .acv-kpi span { display: block; color: ${COLORS.muted}; font-size: 7.3pt; text-transform: uppercase; letter-spacing: .06em; }
      .aldus-cal-v623 .acv-kpi strong { display: block; color: ${COLORS.navy}; font-size: 13.5pt; line-height: 1.2; }
      .aldus-cal-v623 .acv-progress { height: 1.8mm; border-radius: 1mm; background: #E4E9F2; overflow: hidden; margin: 0 0 3mm; }
      .aldus-cal-v623 .acv-progress i { display: block; height: 100%; background: linear-gradient(90deg, ${COLORS.blue}, ${COLORS.green}); }
      .aldus-cal-v623 .acv-chips { margin: 0 0 3mm; color: ${COLORS.muted}; font-size: 7.8pt; }
      .aldus-cal-v623 .acv-chips b { display: inline-block; margin: 0 1.2mm 1.2mm 0; padding: .6mm 2mm; border-radius: 3mm; background: #EEF2F8; color: ${COLORS.ink}; font-weight: 600; }
      .aldus-cal-v623 table { min-width: 0 !important; }
      .aldus-cal-v623 table.acv-goals { width: 100%; border-collapse: collapse; font-size: 8.2pt; table-layout: fixed; }
      .aldus-cal-v623 table.acv-goals col.c-subject { width: 47%; } .aldus-cal-v623 table.acv-goals col.c-type { width: 14%; } .aldus-cal-v623 table.acv-goals col.c-time { width: 12%; } .aldus-cal-v623 table.acv-goals col.c-state { width: 15%; }
      .aldus-cal-v623 table.acv-goals th { padding: 1.8mm 2mm; background: ${COLORS.navy}; color: #fff; text-align: left; font-size: 7.4pt; letter-spacing: .04em; }
      .aldus-cal-v623 table.acv-goals td { padding: 1.7mm 2mm; border-bottom: .25mm solid ${COLORS.line}; vertical-align: top; }
      .aldus-cal-v623 table.acv-goals tbody tr:nth-child(even) td { background: ${COLORS.paper}; }
      .aldus-cal-v623 table.acv-goals tr { break-inside: avoid; }
      .aldus-cal-v623 .acv-subject strong { display: block; color: ${COLORS.navy}; }
      .aldus-cal-v623 .acv-pill { display: inline-block; padding: .5mm 2mm; border-radius: 3mm; font-size: 7.2pt; font-weight: 700; white-space: nowrap; }
      .aldus-cal-v623 .acv-pill.done { background: ${COLORS.greenSoft}; color: ${COLORS.green}; }
      .aldus-cal-v623 .acv-pill.missed { background: ${COLORS.redSoft}; color: ${COLORS.red}; }
      .aldus-cal-v623 .acv-pill.pending { background: ${COLORS.sky}; color: ${COLORS.blue}; }
      .aldus-cal-v623 .acv-day { margin: 0 0 2.6mm; border: .25mm solid ${COLORS.line}; border-radius: 2mm; overflow: hidden; break-inside: avoid; }
      .aldus-cal-v623 .acv-day .acv-day-head { display: flex; justify-content: space-between; gap: 3mm; padding: 1.8mm 3mm; background: ${COLORS.paper}; border-bottom: .25mm solid ${COLORS.line}; }
      .aldus-cal-v623 .acv-day .acv-day-head strong { color: ${COLORS.navy}; }
      .aldus-cal-v623 .acv-day .acv-day-head span { color: ${COLORS.muted}; font-size: 7.8pt; }
      .aldus-cal-v623 .acv-day ul { list-style: none; margin: 0; padding: 1.2mm 3mm 1.6mm; }
      .aldus-cal-v623 .acv-day li { display: flex; justify-content: space-between; gap: 3mm; padding: .9mm 0; border-bottom: .2mm dashed #E2E8F0; }
      .aldus-cal-v623 .acv-day li:last-child { border-bottom: 0; }
      .aldus-cal-v623 .acv-empty { padding: 2mm 3mm; color: ${COLORS.muted}; font-style: italic; }
      .aldus-cal-v623 .acv-month { display: grid; grid-template-columns: repeat(7, 1fr); gap: 1.4mm; }
      .aldus-cal-v623 .acv-month .acv-weekday { text-align: center; color: ${COLORS.muted}; font-size: 7pt; font-weight: 700; letter-spacing: .08em; }
      .aldus-cal-v623 .acv-cell { min-height: 17mm; padding: 1.4mm 1.8mm; border: .25mm solid ${COLORS.line}; border-top: 1.2mm solid #CBD5E1; border-radius: 1.6mm; background: #fff; break-inside: avoid; }
      .aldus-cal-v623 .acv-cell.done { border-top-color: ${COLORS.green}; } .aldus-cal-v623 .acv-cell.missed { border-top-color: ${COLORS.red}; } .aldus-cal-v623 .acv-cell.pending { border-top-color: ${COLORS.blue}; }
      .aldus-cal-v623 .acv-cell b { display: block; color: ${COLORS.navy}; font-size: 11pt; }
      .aldus-cal-v623 .acv-cell small { display: block; color: ${COLORS.muted}; font-size: 6.8pt; line-height: 1.25; }
      .aldus-cal-v623 .acv-cell.blank { border: 0; background: none; }
      .aldus-cal-v623 .acv-note { margin: -1mm 0 3mm; color: ${COLORS.muted}; font-size: 7.8pt; }
      .aldus-cal-v623 .acv-record { margin: 0 0 2.6mm; border: .25mm solid ${COLORS.line}; border-left: 1.4mm solid ${COLORS.gold}; border-radius: 2mm; overflow: hidden; break-inside: avoid; }
      .aldus-cal-v623 .acv-record h3 { margin: 0; padding: 1.8mm 3mm; background: #FBF7EE; color: ${COLORS.navy}; font-size: 9.2pt; }
      .aldus-cal-v623 .acv-record dl { display: grid; grid-template-columns: 44mm 1fr; margin: 0; }
      .aldus-cal-v623 .acv-record dt, .aldus-cal-v623 .acv-record dd { margin: 0; padding: 1.1mm 3mm; border-top: .2mm solid #EEF2F7; }
      .aldus-cal-v623 .acv-record dt { color: ${COLORS.muted}; font-size: 7pt; font-weight: 700; letter-spacing: .03em; }
      .aldus-cal-v623 .acv-record dd { font-size: 8.3pt; word-break: break-word; }
      .aldus-cal-v623 .acv-record dd.statement { grid-column: 1 / -1; color: ${COLORS.blue}; font-weight: 700; background: ${COLORS.paper}; }
      .aldus-cal-v623 .acv-record dd.warn { color: ${COLORS.amber}; font-weight: 700; }
      .aldus-cal-v623 .acv-record a { color: ${COLORS.blue}; text-decoration: none; }
      .aldus-cal-v623 .acv-footer { margin-top: 3mm; padding-top: 2mm; border-top: .25mm solid ${COLORS.line}; color: ${COLORS.muted}; font-size: 7.3pt; display: flex; justify-content: space-between; }
    `;
  }

  function letterheadHtml(report) {
    return `<div class="acv-letterhead"><div class="acv-logo">${logoSvg()}</div><div class="acv-doc"><strong>Calendário de metas</strong><span>Referência ${esc(dateBR(report.referenceDate))} · ${esc(report.scopeLabel)}</span></div></div>`;
  }

  function goalsTableHtml(goals, today) {
    if (!goals.length) return `<p class="acv-empty">Nenhuma meta nesta data.</p>`;
    return `<table class="acv-goals"><colgroup><col class="c-subject"><col class="c-type"><col class="c-time"><col class="c-time"><col class="c-state"></colgroup><thead><tr><th>Disciplina e assunto</th><th>Tipo</th><th>Planejado</th><th>Realizado</th><th>Situação</th></tr></thead><tbody>${goals.map((goal) => {
      const status = goalState(goal, today);
      return `<tr><td class="acv-subject"><strong>${esc(goal.discipline)}</strong>${esc(goal.subject)}</td><td>${esc(goal.type)}</td><td>${esc(minutesLabel(goal.plannedMinutes))}</td><td>${esc(minutesLabel(goal.actualMinutes))}</td><td><span class="acv-pill ${status}">${STATE_LABEL[status]}</span></td></tr>`;
    }).join("")}</tbody></table>`;
  }

  function dayState(goals, today) {
    if (!goals.length) return "";
    const states = goals.map((goal) => goalState(goal, today));
    if (states.every((value) => value === "done")) return "done";
    return states.includes("missed") ? "missed" : "pending";
  }

  function weekHtml(data, today) {
    return data.days.map((day) => {
      const completed = day.goals.filter((goal) => goalState(goal, today) === "done").length;
      const planned = day.goals.reduce((sum, goal) => sum + (Number(goal.plannedMinutes) || 0), 0);
      return `<section class="acv-day"><div class="acv-day-head"><strong>${esc(weekdayOf(day.date))} · ${esc(dateBR(day.date))} · ${esc(day.dayType)}</strong><span>${day.goals.length} meta(s) · ${completed} concluída(s) · ${esc(minutesLabel(planned))} planejadas</span></div>${day.goals.length
        ? `<ul>${day.goals.map((goal) => { const status = goalState(goal, today); return `<li><span><strong>${esc(goal.discipline)}</strong> — ${esc(goal.subject)} <small>(${esc(goal.type)} · ${esc(minutesLabel(goal.plannedMinutes))})</small></span><span class="acv-pill ${status}">${STATE_LABEL[status]}</span></li>`; }).join("")}</ul>`
        : `<p class="acv-empty">Sem metas.</p>`}</section>`;
    }).join("");
  }

  function monthHtml(data, today) {
    const first = new Date(`${data.start}T12:00:00`);
    const offset = (first.getDay() + 6) % 7;
    const heads = ["SEG", "TER", "QUA", "QUI", "SEX", "SÁB", "DOM"].map((day) => `<div class="acv-weekday">${day}</div>`).join("");
    const blanks = Array.from({ length: offset }, () => `<div class="acv-cell blank"></div>`).join("");
    const cells = data.days.map((day) => {
      const completed = day.goals.filter((goal) => goalState(goal, today) === "done").length;
      return `<div class="acv-cell ${dayState(day.goals, today)}"><b>${esc(day.date.slice(8, 10))}</b><small>${esc(day.dayType)}</small><small>${day.goals.length ? `${day.goals.length} meta(s) · ${completed} ok` : "sem metas"}</small></div>`;
    }).join("");
    const withGoals = data.days.filter((day) => day.goals.length);
    return `<div class="acv-month">${heads}${blanks}${cells}</div>${withGoals.length ? `<div style="margin-top:3mm">${withGoals.map((day) => `<section class="acv-day"><div class="acv-day-head"><strong>${esc(weekdayOf(day.date))} · ${esc(dateBR(day.date))}</strong><span>${day.goals.length} meta(s)</span></div>${goalsTableHtml(day.goals, today)}</section>`).join("")}</div>` : ""}`;
  }

  function periodHtml(period, report) {
    const { data } = period;
    const percent = Math.max(0, Math.min(100, Number(data.percent) || 0));
    const disciplines = disciplineList(data);
    const body = period.key === "daily" ? goalsTableHtml(data.days[0]?.goals || [], report.today)
      : period.key === "weekly" ? weekHtml(data, report.today) : monthHtml(data, report.today);
    return `<section class="acv-section"><div class="acv-section-title"><h2>${esc(period.title)}</h2><span>${esc(periodRange(data))}</span></div><div class="acv-kpis">${periodKpis(data).map(([label, value]) => `<div class="acv-kpi"><span>${esc(label)}</span><strong>${esc(value)}</strong></div>`).join("")}</div><div class="acv-progress"><i style="width:${percent}%"></i></div>${disciplines.length ? `<div class="acv-chips">${disciplines.map(([name, count]) => `<b>${esc(name)} · ${count}</b>`).join("")}</div>` : ""}${body}</section>`;
  }

  function recordHtml({ view }) {
    return `<article class="acv-record"><dl>${view.fields.map((field) => field.statement
      ? `<dd class="statement">${esc(field.value)}</dd>`
      : `<dt>${esc(field.label)}:</dt><dd class="${field.tone || ""}">${field.href ? `<a href="${esc(field.href)}">${esc(field.value)}</a>` : esc(field.value)}</dd>`).join("")}</dl></article>`;
  }

  function factoryHtml(title, entries, emptyMessage, report) {
    return `<section class="acv-section acv-factory"><div class="acv-section-title"><h2>${esc(title)}</h2><span>${entries.length} registro(s)</span></div><p class="acv-note">${esc(report.driveNote)}.</p>${entries.length ? entries.map(recordHtml).join("") : `<p class="acv-empty">${esc(emptyMessage)}</p>`}</section>`;
  }

  function buildPrintHtml(report) {
    const cover = `<section class="acv-cover"><p>PLANEJAMENTO DE ESTUDOS</p><h1>Calendário de metas</h1><div>Período do arquivo: <strong>${esc(report.scopeLabel)}</strong> · Referência: <strong>${esc(dateBR(report.referenceDate))}</strong> · ${report.summaries.length} resumo(s) e ${report.trainings.length} treino(s) elaborados na Fábrica</div></section>`;
    const content = [
      cover,
      ...report.periods.map((period) => periodHtml(period, report)),
      factoryHtml("Fábrica de Resumos — resumos elaborados", report.summaries, "Nenhum resumo elaborado na Fábrica.", report),
      factoryHtml("Fábrica de Resumos — treinos de questões elaborados", report.trainings, "Nenhum treino de questões elaborado.", report)
    ].join("");
    const footer = `<div class="acv-footer"><span>Aldus Meta · Metas de Estudo</span><span>Gerado em ${esc(dateTimeBR(report.generatedAt))}</span></div>`;
    return `<article id="goalCalendarPrintableReport" class="aldus-cal-v623" data-version="${VERSION}"><style>${printCss()}</style><table class="acv-sheet"><thead><tr><td>${letterheadHtml(report)}</td></tr></thead><tbody><tr><td>${content}</td></tr></tbody><tfoot><tr><td>${footer}</td></tr></tfoot></table></article>`;
  }

  // ----------------------------------------------------------------- imagem
  const approxWidth = (value, size) => String(value).length * size * 0.56;
  function fit(value, maxWidth, size) {
    const source = String(value ?? "");
    if (approxWidth(source, size) <= maxWidth) return source;
    const max = Math.max(4, Math.floor(maxWidth / (size * 0.56)) - 1);
    return `${source.slice(0, max)}…`;
  }
  const svgText = (x, y, value, { size = 16, weight = 400, color = COLORS.ink, anchor = "start", maxWidth = 0 } = {}) =>
    `<text x="${x}" y="${y}" font-size="${size}" font-weight="${weight}" fill="${color}" text-anchor="${anchor}">${esc(maxWidth ? fit(value, maxWidth, size) : value)}</text>`;
  const STATE_COLORS = { done: [COLORS.green, COLORS.greenSoft], missed: [COLORS.red, COLORS.redSoft], pending: [COLORS.blue, COLORS.sky] };

  function buildSvg(report) {
    const W = 1600, M = 64, CW = W - M * 2;
    let y = 0;
    const parts = [];
    // Timbre no canto superior esquerdo.
    parts.push(logoMarkSvg(M, 30, 250));
    parts.push(svgText(W - M, 76, "Calendário de metas", { size: 34, weight: 800, color: COLORS.navy, anchor: "end" }));
    parts.push(svgText(W - M, 106, `Referência ${dateBR(report.referenceDate)} · ${report.scopeLabel} · gerado em ${dateTimeBR(report.generatedAt)}`, { size: 16, color: COLORS.muted, anchor: "end" }));
    parts.push(`<rect x="${M}" y="140" width="${CW}" height="4" fill="${COLORS.navy}"/><rect x="${M}" y="146" width="${CW}" height="3" fill="${COLORS.gold}"/>`);
    y = 186;

    const sectionHeader = (title, right, accent = COLORS.blue, soft = COLORS.sky) => {
      parts.push(`<rect x="${M}" y="${y}" width="${CW}" height="58" rx="14" fill="${soft}"/><rect x="${M}" y="${y}" width="10" height="58" rx="5" fill="${accent}"/>`);
      parts.push(svgText(M + 30, y + 37, title, { size: 24, weight: 800, color: COLORS.navy }));
      if (right) parts.push(svgText(W - M - 24, y + 36, right, { size: 17, color: COLORS.muted, anchor: "end" }));
      y += 76;
    };

    for (const period of report.periods) {
      const { data } = period;
      sectionHeader(period.title, periodRange(data));
      const kpis = periodKpis(data);
      const tileW = (CW - 16 * 4) / 5;
      kpis.forEach(([label, value], index) => {
        const x = M + index * (tileW + 16);
        parts.push(`<rect x="${x}" y="${y}" width="${tileW}" height="92" rx="14" fill="${COLORS.paper}" stroke="${COLORS.line}"/>`);
        parts.push(svgText(x + 20, y + 32, label.toUpperCase(), { size: 14, weight: 700, color: COLORS.muted }));
        parts.push(svgText(x + 20, y + 72, value, { size: 30, weight: 800, color: COLORS.navy }));
      });
      y += 108;
      const percent = Math.max(0, Math.min(100, Number(data.percent) || 0));
      parts.push(`<rect x="${M}" y="${y}" width="${CW}" height="10" rx="5" fill="#E4E9F2"/><rect x="${M}" y="${y}" width="${Math.round(CW * percent / 100)}" height="10" rx="5" fill="${COLORS.green}"/>`);
      y += 30;
      const disciplines = disciplineList(data);
      if (disciplines.length) {
        parts.push(svgText(M, y + 4, `Disciplinas: ${disciplines.map(([name, count]) => `${name} (${count})`).join(" · ")}`, { size: 15, color: COLORS.muted, maxWidth: CW }));
        y += 30;
      }
      if (period.key === "monthly") {
        const firstDay = (new Date(`${data.start}T12:00:00`).getDay() + 6) % 7;
        const cellW = CW / 7, cellH = 112;
        ["SEG", "TER", "QUA", "QUI", "SEX", "SÁB", "DOM"].forEach((name, index) => parts.push(svgText(M + index * cellW + cellW / 2, y + 18, name, { size: 14, weight: 700, color: COLORS.muted, anchor: "middle" })));
        y += 30;
        data.days.forEach((day, index) => {
          const slot = index + firstDay;
          const x = M + (slot % 7) * cellW, cy = y + Math.floor(slot / 7) * (cellH + 10);
          const status = dayState(day.goals, report.today);
          const color = status ? STATE_COLORS[status][0] : "#CBD5E1";
          const completed = day.goals.filter((goal) => goalState(goal, report.today) === "done").length;
          parts.push(`<rect x="${x + 4}" y="${cy}" width="${cellW - 8}" height="${cellH}" rx="12" fill="#fff" stroke="${COLORS.line}"/><rect x="${x + 4}" y="${cy}" width="${cellW - 8}" height="8" rx="4" fill="${color}"/>`);
          parts.push(svgText(x + 20, cy + 40, day.date.slice(8, 10), { size: 26, weight: 800, color: COLORS.navy }));
          parts.push(svgText(x + 20, cy + 64, day.dayType, { size: 13, color: COLORS.muted, maxWidth: cellW - 36 }));
          parts.push(svgText(x + 20, cy + 90, day.goals.length ? `${day.goals.length} meta(s) · ${completed} ok` : "sem metas", { size: 14, weight: 700, color: day.goals.length ? COLORS.ink : COLORS.muted, maxWidth: cellW - 36 }));
        });
        y += Math.ceil((data.days.length + firstDay) / 7) * (cellH + 10) + 20;
      } else {
        for (const day of data.days) {
          if (period.key === "weekly") {
            const completed = day.goals.filter((goal) => goalState(goal, report.today) === "done").length;
            parts.push(`<rect x="${M}" y="${y}" width="${CW}" height="46" rx="10" fill="${COLORS.paper}" stroke="${COLORS.line}"/>`);
            parts.push(svgText(M + 18, y + 30, `${weekdayOf(day.date)} · ${dateBR(day.date)} · ${day.dayType}`, { size: 18, weight: 800, color: COLORS.navy }));
            parts.push(svgText(W - M - 18, y + 30, `${day.goals.length} meta(s) · ${completed} concluída(s)`, { size: 15, color: COLORS.muted, anchor: "end" }));
            y += 54;
          }
          if (!day.goals.length) {
            parts.push(svgText(M + 18, y + 22, period.key === "daily" ? "Nenhuma meta nesta data." : "Sem metas.", { size: 15, color: COLORS.muted }));
            y += 38;
            continue;
          }
          for (const goal of day.goals) {
            const status = goalState(goal, report.today);
            const [strong, soft] = STATE_COLORS[status];
            parts.push(`<rect x="${M}" y="${y}" width="${CW}" height="60" rx="10" fill="#fff" stroke="${COLORS.line}"/><rect x="${M}" y="${y}" width="8" height="60" rx="4" fill="${strong}"/>`);
            parts.push(svgText(M + 24, y + 26, `${goal.discipline} — ${goal.subject}`, { size: 18, weight: 700, color: COLORS.navy, maxWidth: CW - 240 }));
            parts.push(svgText(M + 24, y + 48, `${goal.type} · planejado ${minutesLabel(goal.plannedMinutes)} · realizado ${minutesLabel(goal.actualMinutes)}`, { size: 14, color: COLORS.muted, maxWidth: CW - 240 }));
            parts.push(`<rect x="${W - M - 176}" y="${y + 16}" width="156" height="28" rx="14" fill="${soft}"/>`);
            parts.push(svgText(W - M - 98, y + 35, STATE_LABEL[status], { size: 14, weight: 800, color: strong, anchor: "middle" }));
            y += 68;
          }
          y += 6;
        }
        y += 14;
      }
    }

    const recordBlock = (entry, index) => {
      const fields = entry.view.fields.filter((field) => !field.statement);
      const lineH = 26;
      const height = 50 + fields.length * lineH + 12;
      parts.push(`<rect x="${M}" y="${y}" width="${CW}" height="${height}" rx="12" fill="${index % 2 ? COLORS.paper : "#fff"}" stroke="${COLORS.line}"/><rect x="${M}" y="${y}" width="8" height="${height}" rx="4" fill="${COLORS.gold}"/>`);
      parts.push(svgText(M + 26, y + 34, entry.view.title, { size: 19, weight: 800, color: COLORS.blue, maxWidth: CW - 50 }));
      fields.forEach((field, fieldIndex) => {
        const ly = y + 62 + fieldIndex * lineH;
        const label = `${field.label}:`;
        parts.push(svgText(M + 26, ly, label, { size: 13, weight: 700, color: COLORS.muted }));
        parts.push(svgText(M + 480, ly, field.value, { size: 15, weight: field.tone === "warn" ? 800 : 500, color: field.tone === "warn" ? COLORS.amber : field.href ? COLORS.blue : COLORS.ink, maxWidth: CW - 500 }));
      });
      y += height + 12;
    };

    sectionHeader("Fábrica de Resumos — resumos elaborados", `${report.summaries.length} registro(s)`, COLORS.gold, "#FBF4E4");
    parts.push(svgText(M, y, `${report.driveNote}.`, { size: 15, color: COLORS.muted }));
    y += 24;
    if (report.summaries.length) report.summaries.forEach(recordBlock);
    else { parts.push(svgText(M + 18, y + 20, "Nenhum resumo elaborado na Fábrica.", { size: 15, color: COLORS.muted })); y += 40; }
    y += 10;
    sectionHeader("Fábrica de Resumos — treinos de questões elaborados", `${report.trainings.length} registro(s)`, COLORS.gold, "#FBF4E4");
    if (report.trainings.length) report.trainings.forEach(recordBlock);
    else { parts.push(svgText(M + 18, y + 20, "Nenhum treino de questões elaborado.", { size: 15, color: COLORS.muted })); y += 40; }

    y += 20;
    parts.push(`<rect x="${M}" y="${y}" width="${CW}" height="2" fill="${COLORS.line}"/>`);
    parts.push(svgText(M, y + 30, "Aldus Meta · Metas de Estudo", { size: 15, color: COLORS.muted }));
    parts.push(svgText(W - M, y + 30, `Gerado em ${dateTimeBR(report.generatedAt)}`, { size: 15, color: COLORS.muted, anchor: "end" }));
    const H = y + 60;
    return `<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img"><title>Calendário de metas — Aldus Meta</title><style>text{font-family:Arial,Helvetica,sans-serif}</style><rect width="100%" height="100%" fill="#ffffff"/>${parts.join("")}</svg>`;
  }

  // ------------------------------------------------------------------ Excel
  function columnName(index) {
    let value = index;
    let name = "";
    while (value > 0) {
      const rest = (value - 1) % 26;
      name = String.fromCharCode(65 + rest) + name;
      value = Math.floor((value - 1) / 26);
    }
    return name;
  }
  const xmlEsc = (value) => String(value ?? "").replace(/[ --]/g, "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const XS = { base: 0, title: 1, subtitle: 2, section: 3, header: 4, cell: 5, zebra: 6, number: 7, done: 8, pending: 9, missed: 10, link: 11, kpiLabel: 12, kpiValue: 13, statement: 14, warn: 15, numberZebra: 16, linkZebra: 17 };

  function stylesXml() {
    const font = (options) => `<font>${options.b ? "<b/>" : ""}${options.u ? "<u/>" : ""}<sz val="${options.sz || 10}"/><color rgb="FF${(options.color || COLORS.ink).slice(1)}"/><name val="Calibri"/><family val="2"/></font>`;
    const fonts = [font({}), font({ b: 1, sz: 18, color: COLORS.navy }), font({ sz: 10, color: COLORS.muted }), font({ b: 1, sz: 12, color: COLORS.navy }), font({ b: 1, color: "#FFFFFF" }), font({ b: 1, color: COLORS.green }), font({ b: 1, color: COLORS.blue }), font({ b: 1, color: COLORS.red }), font({ u: 1, color: COLORS.blue }), font({ b: 1, sz: 14, color: COLORS.navy }), font({ b: 1, color: COLORS.amber })];
    const fill = (color) => `<fill><patternFill patternType="solid"><fgColor rgb="FF${color.slice(1)}"/><bgColor indexed="64"/></patternFill></fill>`;
    const fills = [`<fill><patternFill patternType="none"/></fill>`, `<fill><patternFill patternType="gray125"/></fill>`, fill(COLORS.navy), fill(COLORS.sky), fill(COLORS.paper), fill(COLORS.greenSoft), fill(COLORS.redSoft), fill(COLORS.amberSoft)];
    const border = `<border><left style="thin"><color rgb="FF${COLORS.line.slice(1)}"/></left><right style="thin"><color rgb="FF${COLORS.line.slice(1)}"/></right><top style="thin"><color rgb="FF${COLORS.line.slice(1)}"/></top><bottom style="thin"><color rgb="FF${COLORS.line.slice(1)}"/></bottom><diagonal/></border>`;
    const xf = (fontId, fillId, borderId, align = `<alignment vertical="top" wrapText="1"/>`) => `<xf numFmtId="0" fontId="${fontId}" fillId="${fillId}" borderId="${borderId}" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">${align}</xf>`;
    const center = `<alignment horizontal="center" vertical="center" wrapText="1"/>`;
    const right = `<alignment horizontal="right" vertical="top"/>`;
    const middle = `<alignment vertical="center"/>`;
    const xfs = [
      xf(0, 0, 0, middle), xf(1, 0, 0, middle), xf(2, 0, 0, middle), xf(3, 3, 0, middle), xf(4, 2, 1, center),
      xf(0, 0, 1), xf(0, 4, 1), xf(0, 0, 1, right), xf(5, 5, 1, center), xf(6, 3, 1, center), xf(7, 6, 1, center),
      xf(8, 0, 1), xf(2, 4, 1, center), xf(9, 4, 1, center), xf(6, 0, 1), xf(10, 7, 1), xf(0, 4, 1, right), xf(8, 4, 1)
    ];
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="${fonts.length}">${fonts.join("")}</fonts><fills count="${fills.length}">${fills.join("")}</fills><borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border>${border}</borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="${xfs.length}">${xfs.join("")}</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;
  }

  function cellXml(reference, cell) {
    if (cell === null || cell === undefined) return "";
    const { v, s = XS.cell, link } = typeof cell === "object" ? cell : { v: cell };
    if (link) {
      const label = String(v ?? link);
      const formula = `HYPERLINK("${String(link).replace(/"/g, '""')}","${label.replace(/"/g, '""').slice(0, 250)}")`;
      return `<c r="${reference}" s="${s}" t="str"><f>${xmlEsc(formula)}</f><v>${xmlEsc(label)}</v></c>`;
    }
    if (typeof v === "number" && Number.isFinite(v)) return `<c r="${reference}" s="${s}"><v>${v}</v></c>`;
    return `<c r="${reference}" s="${s}" t="inlineStr"><is><t xml:space="preserve">${xmlEsc(v)}</t></is></c>`;
  }

  function sheetXml(sheet) {
    const rows = sheet.rows.map((row, index) => {
      const number = index + 1;
      if (!row) return `<row r="${number}"/>`;
      const cells = row.cells.map((cell, column) => cellXml(`${columnName(column + 1)}${number}`, cell)).join("");
      return `<row r="${number}"${row.height ? ` ht="${row.height}" customHeight="1"` : ""}>${cells}</row>`;
    }).join("");
    const lastColumn = columnName(sheet.cols.length);
    const freeze = sheet.freezeRow
      ? `<pane ySplit="${sheet.freezeRow}" topLeftCell="A${sheet.freezeRow + 1}" activePane="bottomLeft" state="frozen"/><selection pane="bottomLeft" activeCell="A${sheet.freezeRow + 1}" sqref="A${sheet.freezeRow + 1}"/>`
      : "";
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheetPr><pageSetUpPr fitToPage="1"/></sheetPr><dimension ref="A1:${lastColumn}${Math.max(1, sheet.rows.length)}"/><sheetViews><sheetView workbookViewId="0" showGridLines="0">${freeze}</sheetView></sheetViews><sheetFormatPr defaultRowHeight="15"/><cols>${sheet.cols.map((width, index) => `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`).join("")}</cols><sheetData>${rows}</sheetData>${sheet.autoFilter ? `<autoFilter ref="${sheet.autoFilter}"/>` : ""}${sheet.merges?.length ? `<mergeCells count="${sheet.merges.length}">${sheet.merges.map((ref) => `<mergeCell ref="${ref}"/>`).join("")}</mergeCells>` : ""}<pageMargins left="0.4" right="0.4" top="0.5" bottom="0.5" header="0.2" footer="0.2"/><pageSetup paperSize="9" orientation="landscape" fitToWidth="1" fitToHeight="0"/><drawing r:id="rId1"/></worksheet>`;
  }

  function letterheadRows(title, subtitle, columns, titleColumn = 2) {
    const lead = Array.from({ length: titleColumn }, () => null);
    const pad = (cells) => [...cells, ...Array.from({ length: Math.max(0, columns - cells.length) }, () => null)];
    return [
      { height: 20, cells: pad([]) },
      { height: 26, cells: pad([...lead, { v: title, s: XS.title }]) },
      { height: 18, cells: pad([...lead, { v: subtitle, s: XS.subtitle }]) },
      { height: 20, cells: pad([]) },
      null
    ];
  }

  function calendarSheet(report) {
    const columns = 10;
    const rows = letterheadRows("Calendário de metas", `Referência ${dateBR(report.referenceDate)} · ${report.scopeLabel} · gerado em ${dateTimeBR(report.generatedAt)}`, columns, 3);
    const merges = [];
    for (const period of report.periods) {
      const { data } = period;
      const start = rows.length + 1;
      rows.push({ height: 24, cells: [{ v: `${period.title.toUpperCase()} — ${periodRange(data)}`, s: XS.section }, ...Array.from({ length: columns - 1 }, () => ({ v: "", s: XS.section }))] });
      merges.push(`A${start}:${columnName(columns)}${start}`);
      const kpis = periodKpis(data);
      rows.push({ cells: kpis.flatMap(([label]) => [{ v: label, s: XS.kpiLabel }, { v: "", s: XS.kpiLabel }]) });
      rows.push({ height: 24, cells: kpis.flatMap(([, value]) => [{ v: value, s: XS.kpiValue }, { v: "", s: XS.kpiValue }]) });
      const labelRow = rows.length - 1;
      const valueRow = rows.length;
      kpis.forEach((_, index) => {
        merges.push(`${columnName(index * 2 + 1)}${labelRow}:${columnName(index * 2 + 2)}${labelRow}`);
        merges.push(`${columnName(index * 2 + 1)}${valueRow}:${columnName(index * 2 + 2)}${valueRow}`);
      });
      rows.push({ height: 30, cells: ["Data", "Dia", "Tipo do dia", "Disciplina", "Assunto", "Tipo", "Planejado (min)", "Realizado (min)", "Situação", "Prioridade"].map((value) => ({ v: value, s: XS.header })) });
      let zebra = false;
      for (const day of data.days) {
        const goals = day.goals.length ? day.goals : [null];
        for (const goal of goals) {
          const base = zebra ? XS.zebra : XS.cell;
          const number = zebra ? XS.numberZebra : XS.number;
          if (!goal) {
            rows.push({ cells: [{ v: dateBR(day.date), s: base }, { v: weekdayOf(day.date), s: base }, { v: day.dayType, s: base }, { v: "Sem metas", s: base }, { v: "", s: base }, { v: "", s: base }, { v: 0, s: number }, { v: 0, s: number }, { v: "", s: base }, { v: "", s: base }] });
          } else {
            const status = goalState(goal, report.today);
            rows.push({ cells: [{ v: dateBR(day.date), s: base }, { v: weekdayOf(day.date), s: base }, { v: day.dayType, s: base }, { v: goal.discipline, s: base }, { v: goal.subject, s: base }, { v: goal.type, s: base }, { v: Number(goal.plannedMinutes) || 0, s: number }, { v: Number(goal.actualMinutes) || 0, s: number }, { v: STATE_LABEL[status], s: XS[status] }, { v: goal.priority, s: base }] });
          }
        }
        zebra = !zebra;
      }
      rows.push(null);
    }
    return { name: "Calendário", cols: [12, 7, 16, 26, 42, 14, 13, 13, 15, 12], rows, merges, freezeRow: 5 };
  }

  function factorySheet(name, title, entries, headerLabels, report) {
    const columns = headerLabels.length;
    const rows = letterheadRows(title, `${entries.length} registro(s) · ${report.driveNote}`, columns, 1);
    const headerRow = rows.length + 1;
    rows.push({ height: 32, cells: headerLabels.map((value) => ({ v: value, s: XS.header })) });
    entries.forEach(({ view }, index) => {
      const zebra = index % 2 === 1;
      rows.push({ cells: view.fields.map((field) => {
        if (field.statement) return { v: field.value, s: XS.statement };
        if (field.tone === "warn") return { v: field.value, s: XS.warn };
        if (field.href) return { v: field.value, link: field.href, s: zebra ? XS.linkZebra : XS.link };
        return { v: field.value, s: zebra ? XS.zebra : XS.cell };
      }) });
    });
    if (!entries.length) rows.push({ cells: [{ v: "Nenhum registro elaborado.", s: XS.cell }] });
    const last = rows.length;
    return {
      name,
      cols: headerLabels.map((label) => (/LINK/.test(label) ? 46 : /PÁGINAS|ARQUIVO/.test(label) ? 30 : /ELABORADO/.test(label) ? 30 : /EDITAL/.test(label) ? 30 : 26)),
      rows,
      merges: [],
      freezeRow: headerRow,
      autoFilter: entries.length ? `A${headerRow}:${columnName(columns)}${last}` : ""
    };
  }

  function buildWorkbookFiles(report, logoBytes) {
    const sheets = [
      calendarSheet(report),
      factorySheet("Fábrica - resumos", "Fábrica de Resumos — resumos elaborados", report.summaries, ["DISCIPLINA", "TEMA", "EDITAL", "ITEM DO EDITAL", "RESUMO ELABORADO", "DATA", "LINK DA PASTA DESTINO", "PÁGINAS DO WORD DO RESUMO", "PÁGINAS DO PDF DO RESUMO"], report),
      factorySheet("Fábrica - treinos", "Fábrica de Resumos — treinos de questões elaborados", report.trainings, ["DISCIPLINA", "TEMA", "EDITAL", "ITEM DO EDITAL", "TREINO DE QUESTÕES ELABORADO", "DATA", "LINK DA PASTA DESTINO", "ARQUIVO DO TREINO"], report)
    ];
    const NS = "http://schemas.openxmlformats.org";
    const files = [
      { name: "[Content_Types].xml", data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="${NS}/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheets.map((_, index) => `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/drawings/drawing${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>`).join("")}</Types>` },
      { name: "_rels/.rels", data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="${NS}/package/2006/relationships"><Relationship Id="rId1" Type="${NS}/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>` },
      { name: "xl/workbook.xml", data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="${NS}/spreadsheetml/2006/main" xmlns:r="${NS}/officeDocument/2006/relationships"><bookViews><workbookView/></bookViews><sheets>${sheets.map((sheet, index) => `<sheet name="${xmlEsc(sheet.name)}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`).join("")}</sheets>${sheets.some((sheet) => sheet.autoFilter) ? `<definedNames>${sheets.map((sheet, index) => (sheet.autoFilter ? `<definedName name="_xlnm._FilterDatabase" localSheetId="${index}" hidden="1">'${xmlEsc(sheet.name)}'!$${sheet.autoFilter.replace(":", ":$").replace(/([A-Z]+)(\d+)/g, "$1$$$2")}</definedName>` : "")).join("")}</definedNames>` : ""}</workbook>` },
      { name: "xl/_rels/workbook.xml.rels", data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="${NS}/package/2006/relationships">${sheets.map((_, index) => `<Relationship Id="rId${index + 1}" Type="${NS}/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`).join("")}<Relationship Id="rId${sheets.length + 1}" Type="${NS}/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>` },
      { name: "xl/styles.xml", data: stylesXml() },
      { name: "xl/media/logo.png", data: logoBytes }
    ];
    sheets.forEach((sheet, index) => {
      const n = index + 1;
      files.push({ name: `xl/worksheets/sheet${n}.xml`, data: sheetXml(sheet) });
      files.push({ name: `xl/worksheets/_rels/sheet${n}.xml.rels`, data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="${NS}/package/2006/relationships"><Relationship Id="rId1" Type="${NS}/officeDocument/2006/relationships/drawing" Target="../drawings/drawing${n}.xml"/></Relationships>` });
      // Timbre no canto superior esquerdo de cada aba.
      files.push({ name: `xl/drawings/drawing${n}.xml`, data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><xdr:wsDr xmlns:xdr="${NS}/drawingml/2006/spreadsheetDrawing" xmlns:a="${NS}/drawingml/2006/main" xmlns:r="${NS}/officeDocument/2006/relationships"><xdr:oneCellAnchor><xdr:from><xdr:col>0</xdr:col><xdr:colOff>57150</xdr:colOff><xdr:row>0</xdr:row><xdr:rowOff>57150</xdr:rowOff></xdr:from><xdr:ext cx="1600200" cy="586740"/><xdr:pic><xdr:nvPicPr><xdr:cNvPr id="2" name="Timbre Aldus Meta"/><xdr:cNvPicPr><a:picLocks noChangeAspect="1"/></xdr:cNvPicPr></xdr:nvPicPr><xdr:blipFill><a:blip r:embed="rId1"/><a:stretch><a:fillRect/></a:stretch></xdr:blipFill><xdr:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="1600200" cy="586740"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></xdr:spPr></xdr:pic><xdr:clientData/></xdr:oneCellAnchor></xdr:wsDr>` });
      files.push({ name: `xl/drawings/_rels/drawing${n}.xml.rels`, data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="${NS}/package/2006/relationships"><Relationship Id="rId1" Type="${NS}/officeDocument/2006/relationships/image" Target="../media/logo.png"/></Relationships>` });
    });
    return files;
  }

  // ------------------------------------------ leitura no Google Drive (navegador)
  const drive = { token: "", expiresAt: 0, client: null, pending: null };
  const driveReady = () => Boolean(drive.token && Date.now() < drive.expiresAt - 60000);

  function settleDrive(response) {
    const resolve = drive.pending;
    drive.pending = null;
    if (response?.access_token) {
      drive.token = response.access_token;
      drive.expiresAt = Date.now() + Number(response.expires_in || 3600) * 1000;
      resolve?.(true);
      return;
    }
    resolve?.(false);
  }

  // A janela de permissão do Google precisa abrir no clique; por isso nada é
  // aguardado antes de requestAccessToken quando a biblioteca já está carregada.
  function ensureDriveRead() {
    if (driveReady()) return Promise.resolve(true);
    let clientId = "";
    try { clientId = typeof GOOGLE_CLIENT_ID !== "undefined" ? GOOGLE_CLIENT_ID : ""; } catch {}
    if (!clientId || call("isGoogleClientConfigured") === false) return Promise.resolve(false);
    const request = () => new Promise((resolve) => {
      const oauth = globalThis.google?.accounts?.oauth2;
      if (!oauth) { resolve(false); return; }
      drive.pending = resolve;
      drive.client ||= oauth.initTokenClient({ client_id: clientId, scope: DRIVE_READ_SCOPE, include_granted_scopes: true, callback: settleDrive, error_callback: () => settleDrive(null) });
      drive.client.requestAccessToken({ prompt: "" });
      setTimeout(() => { if (drive.pending === resolve) settleDrive(null); }, 180000);
    });
    if (globalThis.google?.accounts?.oauth2) return request();
    const loading = call("loadGoogleIdentityServices");
    return Promise.resolve(loading).then(request, () => false);
  }

  async function driveGet(url, as = "json") {
    const response = await fetch(url, { headers: { Authorization: `Bearer ${drive.token}` } });
    if (response.status === 401 || response.status === 403) {
      if (response.status === 401) drive.token = "";
      const error = new Error(`Google Drive recusou a leitura (${response.status}).`);
      error.status = response.status;
      throw error;
    }
    if (!response.ok) throw new Error(`Google Drive respondeu ${response.status}.`);
    return as === "json" ? response.json() : response.arrayBuffer();
  }

  function readPageCache() {
    try { return JSON.parse(localStorage.getItem(PAGE_CACHE_KEY) || "{}") || {}; } catch { return {}; }
  }

  function writePageCache(cache) {
    try { localStorage.setItem(PAGE_CACHE_KEY, JSON.stringify(cache)); } catch {}
  }

  async function loadPdfLibrary() {
    if (globalThis.__ALDUS_PDFJS__) return globalThis.__ALDUS_PDFJS__;
    const base = document.baseURI;
    const pdfjs = await import(new URL("vendor/pdf.mjs", base).href);
    pdfjs.GlobalWorkerOptions.workerSrc = new URL("vendor/pdf.worker.mjs", base).href;
    globalThis.__ALDUS_PDFJS__ = pdfjs;
    return pdfjs;
  }

  // Páginas do PDF contadas uma vez por versão do arquivo e guardadas neste
  // navegador; exportações seguintes só consultam os metadados.
  async function countPdfPagesInDrive(file) {
    const key = `${file.id}|${file.modifiedTime || ""}`;
    const cache = readPageCache();
    if (Number.isFinite(cache[key])) return cache[key];
    const bytes = await driveGet(`https://www.googleapis.com/drive/v3/files/${file.id}?alt=media&supportsAllDrives=true`, "buffer");
    const pdfjs = await loadPdfLibrary();
    const documentProxy = await pdfjs.getDocument({ data: new Uint8Array(bytes) }).promise;
    const pages = documentProxy.numPages;
    try { await documentProxy.destroy(); } catch {}
    const next = readPageCache();
    next[key] = pages;
    writePageCache(next);
    return pages;
  }

  // --------------------------------------------------------- exportação real
  function setStatus(message, error = false) {
    if (typeof globalThis.setGoalCalendarExportStatus === "function") {
      call("setGoalCalendarExportStatus", message, error);
      return;
    }
    const target = document.getElementById("goalCalendarExportStatus");
    if (!target) return;
    target.hidden = false;
    target.textContent = message;
    target.classList.toggle("error", error);
  }

  function collectPeriods(referenceDate, scope) {
    const payload = call("buildGoalCalendarExportPayload", referenceDate);
    const selected = call("selectedGoalCalendarPeriods", payload, scope);
    if (!payload || !Array.isArray(selected)) throw new Error("O calendário ainda não está pronto.");
    return selected.map(([label, key, data]) => ({ label, key, data }));
  }

  function exportFilename(report, extension) {
    const base = `calendario-${call("goalCalendarScopeLabel", report.scope) || report.scope}-${report.referenceDate}`;
    return `${base}.${extension}`;
  }

  function saveBlob(blob, filename) {
    if (call("downloadGeneratedFile", blob, filename) !== undefined) return;
    if (typeof globalThis.downloadGeneratedFile === "function") return;
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  function printReport(report) {
    call("cleanupGoalCalendarPrint");
    document.getElementById("goalCalendarPrintableReport")?.remove();
    document.body.insertAdjacentHTML("beforeend", buildPrintHtml(report));
    document.body.classList.add("calendar-print-mode");
    const cleanup = () => {
      document.body.classList.remove("calendar-print-mode");
      document.getElementById("goalCalendarPrintableReport")?.remove();
    };
    window.addEventListener("afterprint", cleanup, { once: true });
    setTimeout(() => window.print(), 120);
  }

  async function logoPngBytes() {
    const blob = await call("rasterizeSvgToPngBlob", logoSvg(), { width: 600, height: 220 });
    return new Uint8Array(await blob.arrayBuffer());
  }

  async function renderPng(svg) {
    const height = Number(svg.match(/viewBox="0 0 1600 (\d+)"/)?.[1]) || 2000;
    const scale = Math.min(1.5, 30000 / height);
    return call("rasterizeSvgToPngBlob", svg, { width: Math.round(1600 * scale), height: Math.round(height * scale) });
  }

  async function prepareReport() {
    const appState = currentState();
    if (!appState) throw new Error("Os dados ainda estão carregando.");
    const referenceDate = document.getElementById("calendarDate")?.value || todayISO();
    const scope = document.getElementById("goalCalendarExportScope")?.value || "daily";
    const scopeLabel = { daily: "Somente dia", weekly: "Somente semana", monthly: "Somente mês", all: "Dia + semana + mês" }[scope] || scope;
    const summaries = elaboratedSummaries(appState);
    const trainings = trainingRecords(appState);
    const records = [...summaries, ...trainings];
    let driveInfo = new Map();
    let driveState = "off";
    if (records.length) {
      setStatus("Pedindo ao Google Drive permissão para ler os arquivos da Fábrica…");
      const authorized = await ensureDriveRead();
      if (authorized) {
        try {
          const outcome = await createDriveReader({ get: driveGet, countPdfPages: countPdfPagesInDrive })
            .resolve(records, (done, total) => setStatus(`Conferindo arquivos da Fábrica no Google Drive: ${done} de ${total}…`));
          driveInfo = outcome.results;
          driveState = outcome.state;
        } catch (error) {
          console.warn(`[Aldus ${VERSION}] Leitura do Google Drive falhou.`, error);
          driveState = "error";
        }
      }
    }
    return buildReport({ periods: collectPeriods(referenceDate, scope), referenceDate, scope, scopeLabel, summaries, trainings, driveInfo, driveState });
  }

  const ORIGINAL_EXPORTERS = { pdf: "exportGoalCalendarPdf", excel: "exportGoalCalendarExcel", image: "exportGoalCalendarImage" };
  let running = false;

  async function runExport(kind) {
    if (running) return;
    running = true;
    try {
      const report = await prepareReport();
      const drivePart = report.driveState === "on" ? "com páginas conferidas no Google Drive" : "sem conferir o Google Drive";
      if (kind === "pdf") {
        setStatus(`PDF aberto para salvar (${drivePart}).`);
        printReport(report);
      } else if (kind === "excel") {
        const { spreadsheetZipArchive } = globalThis;
        if (typeof spreadsheetZipArchive !== "function") throw new Error("gerador de planilha indisponível");
        const archive = spreadsheetZipArchive(buildWorkbookFiles(report, await logoPngBytes()));
        saveBlob(new Blob([archive], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), exportFilename(report, "xlsx"));
        setStatus(`Excel gerado com o timbre do Aldus (${drivePart}).`);
      } else {
        const blob = await renderPng(buildSvg(report));
        saveBlob(blob, exportFilename(report, "png"));
        setStatus(`Imagem gerada com o timbre do Aldus (${drivePart}).`);
      }
    } catch (error) {
      console.error(`[Aldus ${VERSION}] Exportação nova falhou; usando a anterior.`, error);
      setStatus(`O arquivo novo falhou (${error?.message || error}); gerando no formato anterior.`, true);
      try { await call(ORIGINAL_EXPORTERS[kind]); } catch {}
    } finally {
      running = false;
    }
  }

  function interceptExportClick(event) {
    const button = event.target?.closest?.("#exportGoalCalendarPdf, #exportGoalCalendarExcel, #exportGoalCalendarImage");
    if (!button) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    runExport(BUTTONS[button.id]);
  }

  // Deixa a biblioteca de login do Google pronta quando o Calendário abre,
  // para a janela de permissão sair direto do clique de exportar.
  function preloadGoogleWhenCalendarOpens(view) {
    if (view !== "calendario-metas") return;
    if (call("isGoogleClientConfigured") === false) return;
    Promise.resolve(call("loadGoogleIdentityServices")).catch(() => {});
  }

  const api = Object.freeze({
    VERSION,
    PREJUDICADO,
    NO_DATE,
    DRIVE_NOTES,
    elaboratedSummaries,
    trainingRecords,
    editalInfo,
    driveIdFrom,
    fileKind,
    pickModuleFiles,
    createDriveReader,
    summaryView,
    trainingView,
    buildReport,
    buildPrintHtml,
    buildSvg,
    buildWorkbookFiles,
    runExport
  });
  globalThis[FLAG] = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
    return;
  }
  if (typeof document === "undefined") return;
  document.addEventListener("click", interceptExportClick, true);
  window.addEventListener("aldus:view-active", (event) => preloadGoogleWhenCalendarOpens(event?.detail?.view));
  if (String(location.hash || "").replace(/^#/, "") === "calendario-metas") preloadGoogleWhenCalendarOpens("calendario-metas");
})();
