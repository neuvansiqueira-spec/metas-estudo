/* V623.4 — Calendário de Metas: PDF paisagem compacto em duas colunas, status explícito e exportações legíveis. */
(() => {
  "use strict";

  const VERSION = "20260915-calendario-exportacoes-v623-4";
  const FLAG = "__ALDUS_GOAL_CALENDAR_EXPORT_V623__";
  if (globalThis[FLAG]) return;

  const COLORS = {
    navy: "#061C33", ink: "#111827", blue: "#1D4ED8", blueSoft: "#E8F0FF", muted: "#475569", line: "#CBD5E1",
    paper: "#F8FAFC", gold: "#B78318", goldSoft: "#FFF7E5", green: "#166534", greenSoft: "#DCFCE7",
    red: "#B91C1C", redSoft: "#FEE2E2", amber: "#9A5B00", amberSoft: "#FEF3C7", white: "#FFFFFF"
  };
  const MODULES = [["resumoAula", "RESUMO/AULA"], ["lei", "LEI"], ["jurisprudencia", "JURISPRUDÊNCIA"], ["peca", "PEÇA"], ["completo", "COMPLETO"]];
  const PRODUCED_STATUSES = new Set(["Aguardando revisão", "Aprovado", "PDF gerado"]);
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

  const text = (value) => String(value ?? "").trim();
  const canon = (value) => text(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
  const xmlEsc = (value) => String(value ?? "").replace(/[\u0000-\b\u000b\f\u000e-\u001f]/g, "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const naturalCompare = (a, b) => String(a).localeCompare(String(b), "pt-BR", { numeric: true, sensitivity: "base" });
  const call = (name, ...args) => { try { const fn = globalThis[name]; return typeof fn === "function" ? fn(...args) : undefined; } catch { return undefined; } };
  const dateBR = (value) => { const iso = text(value).slice(0, 10); const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/); return m ? `${m[3]}/${m[2]}/${m[1]}` : text(value); };
  const dateTimeBR = (value) => { const d = new Date(value); return Number.isNaN(d.getTime()) ? text(value) : d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }); };
  const minutesLabel = (value) => { const n = Math.max(0, Math.round(Number(value) || 0)); if (n < 60) return `${n} min`; const h = Math.floor(n / 60), m = n % 60; return m ? `${h}h ${m}min` : `${h}h`; };
  const WEEKDAYS = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];
  const weekdayOf = (iso) => { const d = new Date(`${text(iso).slice(0, 10)}T12:00:00`); return Number.isNaN(d.getTime()) ? "" : WEEKDAYS[d.getDay()]; };
  const todayISO = () => { const app = call("todayISO"); if (typeof app === "string" && app) return app; const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; };
  const currentState = () => { try { return typeof state !== "undefined" && state && typeof state === "object" ? state : null; } catch { return null; } };

  function factoryAgendaOf(appState) {
    return Array.isArray(appState?.factoryAgenda) && appState.factoryAgenda.length ? appState.factoryAgenda : (Array.isArray(appState?.factoryItems) ? appState.factoryItems : []);
  }
  function syllabusIdsOf(item = {}) {
    return [...new Set([...(item.editalLink?.itemIds || []), ...(item.syllabusItemIds || []), item.syllabusItemId].filter(Boolean).map(String))];
  }
  const contestShortName = (name) => text(name).split(" — ")[0] || text(name);
  function editalInfo(appState, ids = []) {
    const profiles = new Map((appState?.contestProfiles || []).map((p) => [p.id, p]));
    const lookup = globalThis.officialMappingsForItem;
    const mappings = ids.flatMap((id) => typeof lookup === "function" ? (lookup(appState, id) || []) : (appState?.contestSyllabusMap || []).filter((m) => m.syllabusItemId === id));
    if (mappings.length) {
      const byContest = new Map();
      mappings.forEach((m) => { if (!byContest.has(m.contestId)) byContest.set(m.contestId, new Set()); if (text(m.code)) byContest.get(m.contestId).add(text(m.code)); });
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
  function elaboratedSummaries(appState) {
    const rows = [];
    for (const item of factoryAgendaOf(appState)) {
      if (!item || typeof item !== "object") continue;
      const edital = editalInfo(appState, syllabusIdsOf(item));
      const modules = modulesOf(item);
      MODULES.forEach(([key, label], order) => {
        const module = modules?.[key];
        if (!module || !PRODUCED_STATUSES.has(text(module.status))) return;
        rows.push({
          kind: "resumo", id: `resumo|${item.id}|${key}`, order, moduleKey: key, typeLabel: label,
          factoryStatus: text(module.status), discipline: text(item.disciplina || item.discipline) || "DISCIPLINA NÃO INFORMADA",
          theme: text(item.tema || item.subject) || "TEMA NÃO INFORMADO", edital: edital.edital, editalItem: edital.item,
          date: text(module.dataConclusao), folderUrl: text(item.factoryDestinationFolder || item.pastaDestinoWordPdf || item.destinationFolder),
          wordLink: text(module.wordLink), pdfLink: text(module.pdfLink)
        });
      });
    }
    return rows.sort((a,b) => naturalCompare(a.discipline,b.discipline) || naturalCompare(a.theme,b.theme) || a.order-b.order);
  }
  function findFactoryItem(appState, discipline, theme, syllabusItemId) {
    const agenda = factoryAgendaOf(appState);
    if (syllabusItemId) { const byId = agenda.find((item) => syllabusIdsOf(item).includes(String(syllabusItemId))); if (byId) return byId; }
    const d = canon(discipline), t = canon(theme); if (!d || !t) return null;
    return agenda.find((item) => canon(item.disciplina || item.discipline) === d && canon(item.tema || item.subject) === t) || null;
  }
  function trainingRecords(appState) {
    const events = Array.isArray(appState?.questionTrainingEvents) ? appState.questionTrainingEvents : [];
    const prompts = new Map(events.filter((e) => e?.kind === "prompt").map((e) => [e.roundId || e.id, e]));
    const rounds = new Map();
    events.forEach((event) => {
      if (event?.kind !== "import") return;
      const key = event.roundId || event.id;
      if (!rounds.has(key)) rounds.set(key, { key, imports: [], questionIds: new Set() });
      const round = rounds.get(key); round.imports.push(event); (event.questionIds || []).forEach((id) => round.questionIds.add(id));
    });
    return [...rounds.values()].map((round) => {
      const prompt = prompts.get(round.key), config = prompt?.config || {}, first = round.imports[0] || {};
      const discipline = text(first.discipline || prompt?.discipline || config.discipline), theme = text(first.theme || prompt?.theme || config.theme);
      const factoryItem = findFactoryItem(appState, discipline, theme, config.syllabusItemId);
      const ids = [...new Set([text(config.syllabusItemId), ...(factoryItem ? syllabusIdsOf(factoryItem) : [])].filter(Boolean))];
      const edital = editalInfo(appState, ids), count = round.questionIds.size;
      return {
        kind: "treino", id: `treino|${round.key}`, factoryStatus: "Elaborado",
        typeLabel: [text(config.primary), `${count} ${count === 1 ? "QUESTÃO" : "QUESTÕES"}`].filter(Boolean).join(" · "),
        discipline: discipline || "DISCIPLINA NÃO INFORMADA", theme: theme || "TREINO MISTO DA DISCIPLINA", edital: edital.edital, editalItem: edital.item,
        date: round.imports.map((e) => text(e.createdAt)).filter(Boolean).sort().at(-1) || text(prompt?.createdAt),
        folderUrl: text(factoryItem?.factoryDestinationFolder || factoryItem?.pastaDestinoWordPdf)
      };
    }).sort((a,b) => naturalCompare(a.discipline,b.discipline) || naturalCompare(a.theme,b.theme) || naturalCompare(a.date,b.date));
  }

  function driveIdFrom(url) {
    const value = text(url); let m = value.match(/\/folders\/([\w-]{10,})/); if (m) return { kind:"folder", id:m[1] };
    m = value.match(/\/(?:file|document|spreadsheets|presentation)\/d\/([\w-]{10,})/); if (m) return { kind:"file", id:m[1] };
    m = value.match(/[?&]id=([\w-]{10,})/); return m ? { kind:"file", id:m[1] } : null;
  }
  const IGNORED_FILE = /^~\$|ARQUIVO[_\s-]*INCORRETO|DESCONSIDERAR/i;
  const FILE_KINDS = [["jurisprudencia",/JURISPRUD/i],["peca",/(^|[_\s.-])PE[CÇ]A([_\s.-]|$)/i],["lei",/RESUMO[_\s-]*TOPIFICADO[_\s-]*LEI|(^|[_\s-])LEI[_\s-]/i],["resumoAula",/RESUMO[_\s-]*AULA|MAPA[_\s-]*HIERARQUICO/i],["completo",/COMPLETO|FUS[AÃ]O[_\s-]*FINAL|CONSOLIDA/i]];
  const isWord = (file) => /\.docx?$/i.test(file?.name || "") || /wordprocessingml|msword|google-apps\.document/.test(file?.mimeType || "");
  const isPdf = (file) => /\.pdf$/i.test(file?.name || "") || file?.mimeType === "application/pdf";
  const isTrainingFile = (file) => /^TREINO[_\s-]/i.test(file?.name || "") && !/EXCLUS/i.test(file?.name || "");
  const fileKind = (file) => FILE_KINDS.find(([,pattern]) => pattern.test(file?.name || ""))?.[0] || "";
  const baseName = (name) => text(name).replace(/\.[^.]+$/,"").replace(/\s*\(\d+\)\s*$/,"").trim().toUpperCase();
  const newest = (files) => files.slice().sort((a,b) => naturalCompare(b.modifiedTime || "", a.modifiedTime || ""))[0] || null;
  function pickModuleFiles({ explicit=[], moduleFolder=[], shared=[] }, moduleKey) {
    const usable = (files) => files.filter((f) => f && !IGNORED_FILE.test(f.name || "") && (isWord(f) || isPdf(f)));
    const candidates = [...usable(explicit), ...usable(moduleFolder), ...usable(shared).filter((f) => fileKind(f) === moduleKey)];
    const unique = [...new Map(candidates.map((f) => [f.id,f])).values()], explicitIds = new Set(usable(explicit).map((f) => f.id));
    const choose = (test) => { const list = unique.filter(test); return newest(list.filter((f) => explicitIds.has(f.id))) || newest(list); };
    const word = choose(isWord), twin = word ? newest(unique.filter((f) => isPdf(f) && baseName(f.name) === baseName(word.name))) : null, pdf = twin || choose(isPdf);
    return { word, pdf, twin:Boolean(twin) };
  }
  function createDriveReader({ get, countPdfPages }) {
    const folders = new Map(), metas = new Map();
    const listFolder = (id) => { if (!folders.has(id)) { const q = encodeURIComponent(`'${id}' in parents and trashed=false`); folders.set(id, get(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=${encodeURIComponent(`files(${FILE_FIELDS})`)}&pageSize=300&supportsAllDrives=true&includeItemsFromAllDrives=true`).then((d) => Array.isArray(d?.files) ? d.files : [])); } return folders.get(id); };
    const fileMeta = (id) => { if (!metas.has(id)) metas.set(id, get(`https://www.googleapis.com/drive/v3/files/${id}?fields=${encodeURIComponent(FILE_FIELDS)}&supportsAllDrives=true`)); return metas.get(id); };
    async function resolveSummary(record) {
      const destination = driveIdFrom(record.folderUrl), groups = { explicit:[], moduleFolder:[], shared:[] };
      for (const link of [record.wordLink, record.pdfLink].map(driveIdFrom).filter(Boolean)) {
        if (link.kind === "file") groups.explicit.push(await fileMeta(link.id));
        else if (destination?.kind === "folder" && link.id === destination.id) groups.shared.push(...await listFolder(link.id));
        else groups.moduleFolder.push(...await listFolder(link.id));
      }
      if (destination?.kind === "folder") groups.shared.push(...await listFolder(destination.id));
      const picked = pickModuleFiles(groups, record.moduleKey); let pdfPages = null, pdfError = "";
      if (picked.pdf) { try { pdfPages = await countPdfPages(picked.pdf); } catch (e) { pdfError = String(e?.message || e); } }
      return { checked:true, ...picked, pdfPages, pdfError };
    }
    async function resolveTraining(record) { const destination = driveIdFrom(record.folderUrl), files = destination?.kind === "folder" ? await listFolder(destination.id) : []; return { checked:true, trainingFile:newest(files.filter(isTrainingFile)) }; }
    async function resolve(records, onProgress=()=>{}) {
      const results = new Map(), queue = records.slice(); let done=0, fatal=null;
      const worker = async () => { while (queue.length && !fatal) { const record = queue.shift(); try { results.set(record.id, record.kind === "treino" ? await resolveTraining(record) : await resolveSummary(record)); } catch (e) { if (e?.status===401 || e?.status===403) fatal=e; results.set(record.id,{checked:false,error:String(e?.message||e)}); } done++; onProgress(done,records.length); } };
      await Promise.all(Array.from({length:4},worker)); return { results, state:fatal ? "denied" : "on" };
    }
    return { resolve, listFolder, fileMeta };
  }

  const driveNote = (state) => DRIVE_NOTES[state] || DRIVE_NOTES.off;
  const hasNoLinks = (record) => !record.folderUrl && !record.wordLink && !record.pdfLink;
  function summaryView(record, info, driveState="off") {
    const checked = driveState === "on" && info?.checked;
    const unavailable = hasNoLinks(record) ? PREJUDICADO : driveNote(driveState === "on" ? "error" : driveState);
    const fileDate = checked ? (info.pdf?.createdTime || info.word?.createdTime || "") : "";
    const date = record.date ? dateBR(record.date) : fileDate ? `${dateBR(fileDate)} (data do arquivo no Drive)` : NO_DATE;
    let wordPages = unavailable, pdfPages = unavailable;
    if (checked) {
      pdfPages = !info.pdf ? PREJUDICADO : Number.isFinite(info.pdfPages) ? String(info.pdfPages) : "NÃO CONTADO — não foi possível ler o PDF";
      wordPages = !info.word ? PREJUDICADO : info.twin && Number.isFinite(info.pdfPages) ? `${info.pdfPages} (conferido pelo PDF do mesmo arquivo)` : "NÃO CONTADO — sem PDF do mesmo Word para conferir";
    }
    const warn = (v) => /^(PREJUDICADO|NÃO |SEM DATA)/.test(v) ? "warn" : "";
    return {
      title:`RESUMO - ${record.typeLabel} ELABORADO`,
      fields:[
        {label:"DISCIPLINA",value:record.discipline},{label:"TEMA",value:record.theme},{label:"EDITAL",value:record.edital},{label:"ITEM DO EDITAL",value:record.editalItem},
        {label:"",value:`RESUMO - ${record.typeLabel} ELABORADO`,statement:true},{label:"STATUS NA FÁBRICA",value:record.factoryStatus || "Elaborado"},
        {label:"DATA",value:date,tone:warn(date)},{label:"LINK DA PASTA DESTINO",value:record.folderUrl||PREJUDICADO,href:record.folderUrl,tone:record.folderUrl?"":"warn"},
        {label:"ARQUIVO WORD",value:checked ? (info.word?.name || PREJUDICADO) : unavailable,href:checked?info.word?.webViewLink:"",tone:checked&&info.word?"":warn(unavailable)},
        {label:"QUANTIDADE DE PÁGINAS DO WORD DO RESUMO",value:wordPages,href:checked?info.word?.webViewLink:"",tone:warn(wordPages)},
        {label:"ARQUIVO PDF",value:checked ? (info.pdf?.name || PREJUDICADO) : unavailable,href:checked?info.pdf?.webViewLink:"",tone:checked&&info.pdf?"":warn(unavailable)},
        {label:"QUANTIDADE DE PÁGINAS DO PDF DO RESUMO",value:pdfPages,href:checked?info.pdf?.webViewLink:"",tone:warn(pdfPages)}
      ]
    };
  }
  function trainingView(record, info, driveState="off") {
    const checked = driveState === "on" && info?.checked;
    const file = checked ? (info.trainingFile?.name || PREJUDICADO) : (record.folderUrl ? driveNote(driveState === "on" ? "error" : driveState) : PREJUDICADO);
    return {
      title:`TREINO DE QUESTÕES - ${record.typeLabel} ELABORADO`,
      fields:[
        {label:"DISCIPLINA",value:record.discipline},{label:"TEMA",value:record.theme},{label:"EDITAL",value:record.edital},{label:"ITEM DO EDITAL",value:record.editalItem},
        {label:"",value:`TREINO DE QUESTÕES - ${record.typeLabel} ELABORADO`,statement:true},{label:"STATUS NA FÁBRICA",value:record.factoryStatus || "Elaborado"},
        {label:"DATA",value:record.date?dateBR(record.date):NO_DATE,tone:record.date?"":"warn"},{label:"LINK DA PASTA DESTINO",value:record.folderUrl||PREJUDICADO,href:record.folderUrl,tone:record.folderUrl?"":"warn"},
        {label:"ARQUIVO DO TREINO",value:file,href:checked?info.trainingFile?.webViewLink:"",tone:/^(PREJUDICADO|NÃO )/.test(file)?"warn":""}
      ]
    };
  }

  function buildFactoryIndex(summaries, trainings) {
    const map = new Map();
    const add = (record, kind) => { const key = `${canon(record.discipline)}|${canon(record.theme)}`; if (!key.startsWith("|")) { if (!map.has(key)) map.set(key, []); map.get(key).push({kind,record}); } };
    summaries.forEach((r)=>add(r,"resumo")); trainings.forEach((r)=>add(r,"treino")); return map;
  }
  function factoryEvidenceForGoal(goal, report) {
    const exact = report?.factoryIndex?.get(`${canon(goal.discipline)}|${canon(goal.subject)}`) || [];
    if (exact.length) return exact;
    const d = canon(goal.discipline), s = canon(goal.subject); if (!d || !s) return [];
    const matches=[]; for (const [key,items] of report?.factoryIndex || []) { const [kd,ks]=key.split("|"); if (kd===d && (ks===s || ks.includes(s) || s.includes(ks))) matches.push(...items); } return matches;
  }
  function factoryOutcomeForGoal(goal, report) {
    const evidence = factoryEvidenceForGoal(goal, report);
    const summaries = evidence.filter((item) => item.kind === "resumo");
    const trainings = evidence.filter((item) => item.kind === "treino");
    const summaryTypes = [...new Set(summaries.map(({ record }) => record.typeLabel).filter(Boolean))];
    const trainingTypes = [...new Set(trainings.map(({ record }) => record.typeLabel).filter(Boolean))];
    return {
      evidence, summaryDone: summaries.length > 0, trainingDone: trainings.length > 0,
      summaryLabel: summaries.length ? `REALIZADO — ${summaryTypes.join(", ")}` : "NÃO REALIZADO",
      trainingLabel: trainings.length ? `REALIZADO — ${trainingTypes.join(", ")}` : "NÃO REALIZADO"
    };
  }
  function goalState(goal, report) {
    if (/conclu/i.test(goal.status || "")) return "done";
    if (factoryOutcomeForGoal(goal, report).evidence.length) return "factory";
    return text(goal.date) && goal.date < report.today ? "missed" : "pending";
  }
  const STATE_LABEL = { done:"Concluída", factory:"Produto elaborado", missed:"Não realizada", pending:"A fazer" };
  const PERIOD_TITLE = { daily:"Calendário do dia", weekly:"Calendário da semana", monthly:"Calendário do mês" };
  function buildReport({periods,referenceDate,scope,scopeLabel,summaries,trainings,driveInfo=new Map(),driveState="off",generatedAt=new Date().toISOString(),today=todayISO()}) {
    const report={version:VERSION,generatedAt,referenceDate,scope,scopeLabel,today,driveState,driveNote:driveNote(driveState),periods:periods.map(({label,key,data})=>({label,key,title:PERIOD_TITLE[key]||`Calendário — ${label}`,data})),summaries:[],trainings:[]};
    report.summaries=summaries.map((record)=>({record,view:summaryView(record,driveInfo.get(record.id),driveState)}));
    report.trainings=trainings.map((record)=>({record,view:trainingView(record,driveInfo.get(record.id),driveState)}));
    report.factoryIndex=buildFactoryIndex(summaries,trainings); return report;
  }
  const periodRange = (data) => data.start===data.end ? dateBR(data.start) : `${dateBR(data.start)} a ${dateBR(data.end)}`;
  function periodMetrics(data, report) {
    const goals = data.goals || data.days?.flatMap((d)=>d.goals||[]) || [];
    const recognized = goals.filter((g)=>["done","factory"].includes(goalState(g,report))).length;
    return { goals:goals.length, recognized, percent:goals.length?Math.round(recognized*100/goals.length):0, planned:Number(data.planned)||0, actual:Number(data.actual)||0 };
  }
  const disciplineList = (data) => Object.entries(data.disciplines||{}).sort(([a],[b])=>naturalCompare(a,b));

  function logoSvg() { const svg=call("generatedBrandLogoSvg"); if (typeof svg==="string"&&svg.includes("<svg")) return svg; return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 440"><rect width="1200" height="440" rx="60" fill="${COLORS.navy}"/></svg>`; }
  function logoMarkSvg(x,y,width) { const mark=call("generatedBrandMarkSvg",x,y,width); if (typeof mark==="string"&&mark.includes("data-generated-brand")) return mark; return `<g data-generated-brand="Aldus Metas Concurso" transform="translate(${x} ${y})"><rect width="${width}" height="${Math.round(width*440/1200)}" rx="16" fill="${COLORS.navy}"/></g>`; }

  function printCss() { return `
@media screen{#goalCalendarPrintableReport.aldus-cal-v623{display:none!important}}
@media print{@page{size:A4 landscape;margin:22mm 8mm 14mm;@bottom-right{content:"Página " counter(page);font:7.5pt Arial;color:#475569}}body.calendar-print-mode{min-width:0!important;width:auto!important;margin:0!important;padding:0!important}body.calendar-print-mode #goalCalendarPrintableReport.aldus-cal-v623{display:block!important;width:100%!important;max-width:281mm!important;margin:0 auto!important}}
#goalCalendarPrintableReport.aldus-cal-v623{color:${COLORS.ink}!important;font:9pt/1.42 Arial,Helvetica,sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact;opacity:1!important}.aldus-cal-v623 *{box-sizing:border-box;opacity:1!important}.aldus-cal-v623 .acv-sheet{width:100%;border-collapse:collapse}.aldus-cal-v623 .acv-sheet>thead>tr>td,.aldus-cal-v623 .acv-sheet>tbody>tr>td,.aldus-cal-v623 .acv-sheet>tfoot>tr>td{padding:0;border:0;background:none}.aldus-cal-v623 .acv-letterhead{display:flex;align-items:center;gap:4mm;padding:0 0 2.6mm;margin:0 0 4mm;border-bottom:.7mm solid ${COLORS.navy};box-shadow:none}.aldus-cal-v623 .acv-logo{width:38mm;flex:0 0 38mm;line-height:1.05;color:${COLORS.navy}!important}.aldus-cal-v623 .acv-logo strong{display:block;font:800 15pt Arial,Helvetica,sans-serif;letter-spacing:.12em;color:${COLORS.navy}!important}.aldus-cal-v623 .acv-logo span{display:block;margin-top:.6mm;font:700 6.5pt Arial,Helvetica,sans-serif;letter-spacing:.20em;color:${COLORS.gold}!important}.aldus-cal-v623 .acv-doc{margin-left:auto;text-align:right}.aldus-cal-v623 .acv-doc strong{display:block;color:${COLORS.navy}!important;font-size:11pt}.aldus-cal-v623 .acv-doc span{color:${COLORS.muted}!important;font-size:8pt}.aldus-cal-v623 .acv-cover{margin:0 0 5mm;padding:5mm 6mm;border-radius:3mm;color:#fff!important;background:${COLORS.navy}}.aldus-cal-v623 .acv-cover *{color:#fff!important}.aldus-cal-v623 .acv-cover p{margin:0;font-size:7.5pt;font-weight:700;letter-spacing:.18em}.aldus-cal-v623 .acv-cover h1{margin:1.2mm 0 1.6mm;font-size:19pt;line-height:1.1}.aldus-cal-v623 .acv-section{margin:0 0 6mm}.aldus-cal-v623 .acv-section-title{display:flex;justify-content:space-between;align-items:baseline;gap:4mm;margin:0 0 3mm;padding:2.4mm 3.5mm;border-radius:2mm;background:${COLORS.blueSoft};border-left:1.6mm solid ${COLORS.blue};break-after:avoid}.aldus-cal-v623 .acv-section-title h2{margin:0;color:${COLORS.navy}!important;font-size:12pt}.aldus-cal-v623 .acv-section-title span{color:${COLORS.muted}!important;font-size:8pt;white-space:nowrap}.aldus-cal-v623 .acv-factory .acv-section-title{background:${COLORS.goldSoft};border-left-color:${COLORS.gold}}.aldus-cal-v623 .acv-kpis{display:grid;grid-template-columns:repeat(5,1fr);gap:2.4mm;margin:0 0 2.4mm;break-inside:avoid}.aldus-cal-v623 .acv-kpi{padding:2.2mm 3mm;border:.25mm solid ${COLORS.line};border-radius:2mm;background:${COLORS.paper}}.aldus-cal-v623 .acv-kpi span{display:block;color:${COLORS.muted}!important;font-size:7pt;text-transform:uppercase;letter-spacing:.04em}.aldus-cal-v623 .acv-kpi strong{display:block;color:${COLORS.navy}!important;font-size:13pt}.aldus-cal-v623 .acv-progress{height:1.8mm;border-radius:1mm;background:#E2E8F0;overflow:hidden;margin:0 0 3mm}.aldus-cal-v623 .acv-progress i{display:block;height:100%;background:${COLORS.green}}.aldus-cal-v623 .acv-chips{margin:0 0 3mm;color:${COLORS.muted}!important;font-size:7.8pt}.aldus-cal-v623 .acv-chips b{display:inline-block;margin:0 1mm 1mm 0;padding:.6mm 2mm;border-radius:3mm;background:#EEF2F8;color:${COLORS.ink}!important}.aldus-cal-v623 table{min-width:0!important}.aldus-cal-v623 table.acv-goals{width:100%;border-collapse:collapse;font-size:8.3pt;table-layout:fixed}.aldus-cal-v623 table.acv-goals th{padding:1.8mm 2mm;background:${COLORS.navy};color:#fff!important;text-align:left;font-size:7.3pt}.aldus-cal-v623 table.acv-goals td{padding:1.8mm 2mm;border-bottom:.25mm solid ${COLORS.line};vertical-align:top;color:${COLORS.ink}!important;overflow-wrap:anywhere;word-break:break-word;min-width:0}.aldus-cal-v623 table.acv-goals tbody tr:nth-child(even) td{background:${COLORS.paper}}.aldus-cal-v623 table.acv-goals tr{break-inside:auto;page-break-inside:auto}.aldus-cal-v623 .acv-subject strong{display:block;color:${COLORS.navy}!important}.aldus-cal-v623 .acv-pill{display:inline-block;padding:.5mm 2mm;border-radius:3mm;font-size:7pt;font-weight:700;white-space:normal}.aldus-cal-v623 .acv-pill.done,.aldus-cal-v623 .acv-pill.factory{background:${COLORS.greenSoft};color:${COLORS.green}!important}.aldus-cal-v623 .acv-pill.missed{background:${COLORS.redSoft};color:${COLORS.red}!important}.aldus-cal-v623 .acv-pill.pending{background:${COLORS.blueSoft};color:${COLORS.blue}!important}.aldus-cal-v623 .acv-factory-status div{margin:.5mm 0;line-height:1.25}.aldus-cal-v623 .acv-factory-status b{color:#334155!important}.aldus-cal-v623 .acv-factory-ok{color:${COLORS.green}!important;font-weight:800}.aldus-cal-v623 .acv-factory-no{color:#334155!important;font-weight:700}.aldus-cal-v623 .acv-day{margin:0 0 2.6mm;border:.25mm solid ${COLORS.line};border-radius:1mm;overflow:hidden;break-inside:auto;page-break-inside:auto}.aldus-cal-v623 .acv-day-head{display:flex;justify-content:space-between;gap:3mm;padding:1.8mm 3mm;background:${COLORS.paper};border-bottom:.25mm solid ${COLORS.line};color:${COLORS.ink}!important}.aldus-cal-v623 .acv-day-head strong{color:${COLORS.navy}!important}.aldus-cal-v623 .acv-day ul{list-style:none;margin:0;padding:1.2mm 3mm}.aldus-cal-v623 .acv-day li{display:flex;justify-content:space-between;gap:3mm;padding:.9mm 0;border-bottom:.2mm dashed #E2E8F0;color:${COLORS.ink}!important}.aldus-cal-v623 .acv-empty,.aldus-cal-v623 .acv-note{color:${COLORS.muted}!important;font-style:italic}.aldus-cal-v623 .acv-note{margin:-1mm 0 3mm;font-size:7.8pt}.aldus-cal-v623 .acv-record{margin:0 0 2.8mm;border:.25mm solid ${COLORS.line};border-left:1.4mm solid ${COLORS.gold};border-radius:2mm;overflow:hidden;break-inside:avoid;background:#fff}.aldus-cal-v623 .acv-record dl{display:grid;grid-template-columns:55mm minmax(0,1fr);margin:0;min-width:0;max-width:100%;overflow-wrap:anywhere}.aldus-cal-v623 .acv-record dt,.aldus-cal-v623 .acv-record dd{margin:0;padding:1.2mm 3mm;border-top:.2mm solid #E5E7EB;min-width:0;max-width:100%;overflow-wrap:anywhere;word-break:break-word}.aldus-cal-v623 .acv-record dt{color:#334155!important;font-size:7.2pt;font-weight:800;letter-spacing:.02em}.aldus-cal-v623 .acv-record dd{color:${COLORS.ink}!important;font-size:8.6pt;font-weight:500;word-break:break-word}.aldus-cal-v623 .acv-record dd.statement{grid-column:1/-1;color:${COLORS.blue}!important;font-weight:800;background:#F1F5F9}.aldus-cal-v623 .acv-record dd.warn{color:${COLORS.amber}!important;font-weight:800}.aldus-cal-v623 .acv-record a{color:${COLORS.blue}!important;text-decoration:underline;font-weight:600;min-width:0;max-width:100%;overflow-wrap:anywhere;word-break:break-all}.aldus-cal-v623 .acv-footer{margin-top:3mm;padding-top:2mm;border-top:.25mm solid ${COLORS.line};color:${COLORS.muted}!important;font-size:7.3pt;display:flex;justify-content:space-between}.aldus-cal-v623 .acv-cover,.aldus-cal-v623 .acv-section-title,.aldus-cal-v623 .acv-kpi,.aldus-cal-v623 .acv-day,.aldus-cal-v623 .acv-record,.aldus-cal-v623 .acv-pill{box-shadow:none!important;filter:none!important;text-shadow:none!important}.aldus-cal-v623 .acv-cover,.aldus-cal-v623 .acv-section-title,.aldus-cal-v623 .acv-kpi,.aldus-cal-v623 .acv-record{border-radius:1mm!important}.aldus-cal-v623 .acv-page-head{position:fixed;top:-17mm;left:0;right:0;height:14mm;background:#fff;z-index:20}.aldus-cal-v623 .acv-page-head .acv-letterhead{margin:0;padding:0 0 1.8mm}.aldus-cal-v623 .acv-page-foot{position:fixed;left:0;right:0;bottom:-9mm;display:flex;justify-content:space-between;border-top:.25mm solid ${COLORS.line};padding-top:1.5mm;color:${COLORS.muted}!important;font-size:7pt;background:#fff}.aldus-cal-v623 .acv-main{display:block;width:100%;min-width:0}.aldus-cal-v623 .acv-factory-table{width:calc(100% + 5mm);border-collapse:separate;border-spacing:2.5mm 2mm;table-layout:fixed;margin:-2mm -2.5mm 2mm}.aldus-cal-v623 .acv-factory-table>tbody>tr{break-inside:avoid;page-break-inside:avoid}.aldus-cal-v623 .acv-factory-table>tbody>tr>td{width:50%;vertical-align:top;padding:0;background:none;border:0}.aldus-cal-v623 .acv-factory-table .acv-record{margin:0;break-inside:avoid;page-break-inside:avoid}.aldus-cal-v623 .acv-factory-table .acv-record dl{grid-template-columns:34mm minmax(0,1fr)}.aldus-cal-v623 .acv-factory-table .acv-record dt,.aldus-cal-v623 .acv-factory-table .acv-record dd{padding:.75mm 1.4mm;line-height:1.18}.aldus-cal-v623 .acv-factory-table .acv-record dt{font-size:6.1pt}.aldus-cal-v623 .acv-factory-table .acv-record dd{font-size:7.1pt}.aldus-cal-v623 .acv-factory-table .acv-record dd.statement{font-size:7pt;padding:.9mm 1.4mm}.aldus-cal-v623 .acv-factory-table .acv-record a{font-size:6.8pt}`; }
  const letterheadHtml = (r) => `<div class="acv-letterhead"><div class="acv-logo"><strong>ALDUS</strong><span>METAS CONCURSO</span></div><div class="acv-doc"><strong>Calendário de metas</strong><span>Referência ${esc(dateBR(r.referenceDate))} · ${esc(r.scopeLabel)}</span></div></div>`;
  function goalsTableHtml(goals, report) {
    if (!goals.length) return `<p class="acv-empty">Nenhuma meta nesta data.</p>`;
    return `<table class="acv-goals"><colgroup><col style="width:40%"><col style="width:11%"><col style="width:9%"><col style="width:9%"><col style="width:31%"></colgroup><thead><tr><th>Disciplina e assunto</th><th>Tipo</th><th>Planejado</th><th>Realizado</th><th>Situação / Fábrica</th></tr></thead><tbody>${goals.map((g)=>{const state=goalState(g,report),out=factoryOutcomeForGoal(g,report),summaryClass=out.summaryDone?"acv-factory-ok":"acv-factory-no",trainingClass=out.trainingDone?"acv-factory-ok":"acv-factory-no";return `<tr><td class="acv-subject"><strong>${esc(g.discipline)}</strong>${esc(g.subject)}</td><td>${esc(g.type)}</td><td>${esc(minutesLabel(g.plannedMinutes))}</td><td>${esc(minutesLabel(g.actualMinutes))}</td><td class="acv-factory-status"><div><b>Meta:</b> <span class="acv-pill ${state}">${esc(STATE_LABEL[state])}</span></div><div><b>Resumo do tema:</b> <span class="${summaryClass}">${esc(out.summaryLabel)}</span></div><div><b>Treino de questões:</b> <span class="${trainingClass}">${esc(out.trainingLabel)}</span></div></td></tr>`;}).join("")}</tbody></table>`;
  }
  function weekHtml(data, report) { return data.days.map((d)=>`<section class="acv-day"><div class="acv-day-head"><strong>${esc(weekdayOf(d.date))} · ${esc(dateBR(d.date))} · ${esc(d.dayType)}</strong><span>${d.goals.length} meta(s)</span></div>${goalsTableHtml(d.goals,report)}</section>`).join(""); }
  function periodHtml(period, report) {
    const m=periodMetrics(period.data,report), disciplines=disciplineList(period.data), body=period.key==="daily"?goalsTableHtml(period.data.days[0]?.goals||[],report):weekHtml(period.data,report);
    const kpis=[["Metas",m.goals],["Concluídas/produzidas",m.recognized],["Cumprimento",`${m.percent}%`],["Planejado",minutesLabel(m.planned)],["Realizado",minutesLabel(m.actual)]];
    return `<section class="acv-section"><div class="acv-section-title"><h2>${esc(period.title)}</h2><span>${esc(periodRange(period.data))}</span></div><div class="acv-kpis">${kpis.map(([l,v])=>`<div class="acv-kpi"><span>${esc(l)}</span><strong>${esc(v)}</strong></div>`).join("")}</div><div class="acv-progress"><i style="width:${m.percent}%"></i></div>${disciplines.length?`<div class="acv-chips">${disciplines.map(([n,c])=>`<b>${esc(n)} · ${c}</b>`).join("")}</div>`:""}${body}</section>`;
  }
  function recordHtml({view}) { return `<article class="acv-record"><dl>${view.fields.map((f)=>f.statement?`<dd class="statement">${esc(f.value)}</dd>`:`<dt>${esc(f.label)}:</dt><dd class="${f.tone||""}">${f.href?`<a href="${esc(f.href)}">${esc(f.value)}</a>`:esc(f.value)}</dd>`).join("")}</dl></article>`; }
  function factoryHtml(title, entries, empty, report) {
    let body = `<p class="acv-empty">${esc(empty)}</p>`;
    if (entries.length) {
      const rows=[];
      for (let i=0;i<entries.length;i+=2) {
        const left=recordHtml(entries[i]);
        const right=entries[i+1] ? recordHtml(entries[i+1]) : "";
        rows.push(`<tr><td>${left}</td><td>${right}</td></tr>`);
      }
      body=`<table class="acv-factory-table" role="presentation"><tbody>${rows.join("")}</tbody></table>`;
    }
    return `<section class="acv-section acv-factory"><div class="acv-section-title"><h2>${esc(title)}</h2><span>${entries.length} registro(s)</span></div><p class="acv-note">${esc(report.driveNote)}.</p>${body}</section>`;
  }
  function buildPrintHtml(report) {
    const cover=`<section class="acv-cover"><p>PLANEJAMENTO DE ESTUDOS</p><h1>Calendário de metas</h1><div>Período: <strong>${esc(report.scopeLabel)}</strong> · Referência: <strong>${esc(dateBR(report.referenceDate))}</strong> · ${report.summaries.length} resumo(s) e ${report.trainings.length} treino(s) reconhecidos na Fábrica</div></section>`;
    const content=[cover,...report.periods.map((p)=>periodHtml(p,report)),factoryHtml("Fábrica de Resumos — resumos elaborados",report.summaries,"Nenhum resumo elaborado reconhecido.",report),factoryHtml("Fábrica de Resumos — treinos de questões elaborados",report.trainings,"Nenhum treino elaborado reconhecido.",report)].join("");
    return `<article id="goalCalendarPrintableReport" class="aldus-cal-v623" data-version="${VERSION}"><style>${printCss()}</style><div class="acv-page-head">${letterheadHtml(report)}</div><main class="acv-main">${content}</main><div class="acv-page-foot"><span>Aldus Meta · Metas de Estudo</span><span>Gerado em ${esc(dateTimeBR(report.generatedAt))}</span></div></article>`;
  }

  const approxWidth=(v,s)=>String(v).length*s*.55;
  const fit=(v,w,s)=>{const src=String(v??"");if(approxWidth(src,s)<=w)return src;return `${src.slice(0,Math.max(4,Math.floor(w/(s*.55))-1))}…`;};
  const svgText=(x,y,v,{size=16,weight=400,color=COLORS.ink,anchor="start",maxWidth=0}={})=>`<text x="${x}" y="${y}" font-size="${size}" font-weight="${weight}" fill="${color}" text-anchor="${anchor}">${esc(maxWidth?fit(v,maxWidth,size):v)}</text>`;
  const STATE_COLORS={done:[COLORS.green,COLORS.greenSoft],factory:[COLORS.green,COLORS.greenSoft],missed:[COLORS.red,COLORS.redSoft],pending:[COLORS.blue,COLORS.blueSoft]};
  function buildSvg(report) {
    const W=1600,M=60,CW=W-M*2,COL_GAP=20,COL_W=(CW-COL_GAP)/2; let y=0; const p=[];
    p.push(logoMarkSvg(M,28,250)); p.push(svgText(W-M,72,"Calendário de metas",{size:34,weight:800,color:COLORS.navy,anchor:"end"})); p.push(svgText(W-M,104,`Referência ${dateBR(report.referenceDate)} · ${report.scopeLabel} · ${dateTimeBR(report.generatedAt)}`,{size:16,color:COLORS.muted,anchor:"end"})); p.push(`<rect x="${M}" y="138" width="${CW}" height="5" fill="${COLORS.navy}"/><rect x="${M}" y="147" width="${CW}" height="3" fill="${COLORS.gold}"/>`); y=184;
    const section=(title,right,accent=COLORS.blue,soft=COLORS.blueSoft)=>{p.push(`<rect x="${M}" y="${y}" width="${CW}" height="56" rx="12" fill="${soft}"/><rect x="${M}" y="${y}" width="9" height="56" rx="4" fill="${accent}"/>`);p.push(svgText(M+28,y+36,title,{size:24,weight:800,color:COLORS.navy,maxWidth:CW-360}));if(right)p.push(svgText(W-M-20,y+36,right,{size:16,color:COLORS.muted,anchor:"end"}));y+=72;};
    for(const period of report.periods){section(period.title,periodRange(period.data));const m=periodMetrics(period.data,report),tiles=[["Metas",m.goals],["Concl./prod.",m.recognized],["Cumprimento",`${m.percent}%`],["Planejado",minutesLabel(m.planned)],["Realizado",minutesLabel(m.actual)]],tw=(CW-64)/5;tiles.forEach(([l,v],i)=>{const x=M+i*(tw+16);p.push(`<rect x="${x}" y="${y}" width="${tw}" height="84" rx="12" fill="${COLORS.paper}" stroke="${COLORS.line}"/>`);p.push(svgText(x+18,y+30,l.toUpperCase(),{size:13,weight:700,color:COLORS.muted,maxWidth:tw-30}));p.push(svgText(x+18,y+67,v,{size:28,weight:800,color:COLORS.navy,maxWidth:tw-30}));});y+=100;p.push(`<rect x="${M}" y="${y}" width="${CW}" height="9" rx="5" fill="#E2E8F0"/><rect x="${M}" y="${y}" width="${Math.round(CW*m.percent/100)}" height="9" rx="5" fill="${COLORS.green}"/>`);y+=28;for(const day of period.data.days||[]){if(period.key!=="daily"){p.push(`<rect x="${M}" y="${y}" width="${CW}" height="42" rx="9" fill="${COLORS.paper}" stroke="${COLORS.line}"/>`);p.push(svgText(M+18,y+28,`${weekdayOf(day.date)} · ${dateBR(day.date)} · ${day.dayType}`,{size:17,weight:800,color:COLORS.navy}));y+=50;}for(const g of day.goals||[]){const state=goalState(g,report),out=factoryOutcomeForGoal(g,report),[strong,soft]=STATE_COLORS[state],summaryText=`Resumo do tema: ${out.summaryDone?"REALIZADO":"NÃO REALIZADO"}`,trainingText=`Treino de questões: ${out.trainingDone?"REALIZADO":"NÃO REALIZADO"}`;p.push(`<rect x="${M}" y="${y}" width="${CW}" height="90" rx="10" fill="#fff" stroke="${COLORS.line}"/><rect x="${M}" y="${y}" width="8" height="90" rx="4" fill="${strong}"/>`);p.push(svgText(M+24,y+23,`${g.discipline} — ${g.subject}`,{size:17,weight:700,color:COLORS.navy,maxWidth:CW-260}));p.push(svgText(M+24,y+43,`${g.type} · ${minutesLabel(g.plannedMinutes)} planejado · ${minutesLabel(g.actualMinutes)} realizado`,{size:13,color:COLORS.muted,maxWidth:CW-260}));p.push(svgText(M+24,y+64,summaryText,{size:13,weight:800,color:out.summaryDone?COLORS.green:COLORS.muted,maxWidth:CW-270}));p.push(svgText(M+24,y+82,trainingText,{size:13,weight:800,color:out.trainingDone?COLORS.green:COLORS.muted,maxWidth:CW-270}));p.push(`<rect x="${W-M-210}" y="${y+13}" width="190" height="29" rx="15" fill="${soft}"/>`);p.push(svgText(W-M-115,y+33,STATE_LABEL[state],{size:13,weight:800,color:strong,anchor:"middle",maxWidth:175}));y+=98;}if(!(day.goals||[]).length){p.push(svgText(M+18,y+22,"Sem metas.",{size:14,color:COLORS.muted}));y+=34;}}y+=12;}
    const compactEntry=(entry,x,cy,w)=>{const fields=entry.view.fields.filter((f)=>!f.statement);const shown=fields.filter((f)=>["DISCIPLINA","TEMA","EDITAL","ITEM DO EDITAL","STATUS NA FÁBRICA","DATA","LINK DA PASTA DESTINO","QUANTIDADE DE PÁGINAS DO WORD DO RESUMO","QUANTIDADE DE PÁGINAS DO PDF DO RESUMO","ARQUIVO DO TREINO"].includes(f.label));const h=62+shown.length*24;p.push(`<rect x="${x}" y="${cy}" width="${w}" height="${h}" rx="11" fill="#fff" stroke="${COLORS.line}"/><rect x="${x}" y="${cy}" width="7" height="${h}" rx="4" fill="${COLORS.gold}"/>`);p.push(svgText(x+22,cy+30,entry.view.title,{size:16,weight:800,color:COLORS.blue,maxWidth:w-40}));shown.forEach((f,i)=>{const ly=cy+58+i*24;p.push(svgText(x+22,ly,`${f.label}:`,{size:11,weight:800,color:COLORS.muted,maxWidth:205}));p.push(svgText(x+225,ly,f.value,{size:12,weight:f.tone==="warn"?800:500,color:f.tone==="warn"?COLORS.amber:(f.href?COLORS.blue:COLORS.ink),maxWidth:w-245}));});return h;};
    const grid=(title,entries)=>{section(title,`${entries.length} registro(s)`,COLORS.gold,COLORS.goldSoft);p.push(svgText(M,y,`${report.driveNote}.`,{size:14,color:COLORS.muted,maxWidth:CW}));y+=24;if(!entries.length){p.push(svgText(M+18,y+20,"Nenhum registro elaborado.",{size:14,color:COLORS.muted}));y+=40;return;}let leftY=y,rightY=y;entries.forEach((entry,i)=>{const useLeft=leftY<=rightY,x=useLeft?M:M+COL_W+COL_GAP,cy=useLeft?leftY:rightY,h=compactEntry(entry,x,cy,COL_W);if(useLeft)leftY+=h+12;else rightY+=h+12;});y=Math.max(leftY,rightY)+14;};
    grid("Fábrica de Resumos — resumos elaborados",report.summaries);grid("Fábrica de Resumos — treinos elaborados",report.trainings);p.push(`<rect x="${M}" y="${y}" width="${CW}" height="2" fill="${COLORS.line}"/>`);p.push(svgText(M,y+30,"Aldus Meta · Metas de Estudo",{size:14,color:COLORS.muted}));p.push(svgText(W-M,y+30,`Gerado em ${dateTimeBR(report.generatedAt)}`,{size:14,color:COLORS.muted,anchor:"end"}));const H=y+55;return `<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img"><title>Calendário de metas — Aldus Meta</title><style>text{font-family:Arial,Helvetica,sans-serif}</style><rect width="100%" height="100%" fill="#fff"/>${p.join("")}</svg>`;
  }

  function columnName(index){let v=index,n="";while(v>0){const r=(v-1)%26;n=String.fromCharCode(65+r)+n;v=Math.floor((v-1)/26);}return n;}
  const XS={base:0,title:1,subtitle:2,section:3,header:4,cell:5,zebra:6,number:7,done:8,pending:9,missed:10,link:11,kpiLabel:12,kpiValue:13,statement:14,warn:15,numberZebra:16,linkZebra:17,factory:18};
  function stylesXml(){const font=(o)=>`<font>${o.b?"<b/>":""}${o.u?"<u/>":""}<sz val="${o.sz||10}"/><color rgb="FF${(o.color||COLORS.ink).slice(1)}"/><name val="Calibri"/><family val="2"/></font>`;const fonts=[font({}),font({b:1,sz:18,color:COLORS.navy}),font({sz:10,color:COLORS.muted}),font({b:1,sz:12,color:COLORS.navy}),font({b:1,color:"#FFFFFF"}),font({b:1,color:COLORS.green}),font({b:1,color:COLORS.blue}),font({b:1,color:COLORS.red}),font({u:1,color:COLORS.blue}),font({b:1,sz:14,color:COLORS.navy}),font({b:1,color:COLORS.amber})];const fill=(c)=>`<fill><patternFill patternType="solid"><fgColor rgb="FF${c.slice(1)}"/><bgColor indexed="64"/></patternFill></fill>`;const fills=[`<fill><patternFill patternType="none"/></fill>`,`<fill><patternFill patternType="gray125"/></fill>`,fill(COLORS.navy),fill(COLORS.blueSoft),fill(COLORS.paper),fill(COLORS.greenSoft),fill(COLORS.redSoft),fill(COLORS.amberSoft)];const border=`<border><left style="thin"><color rgb="FF${COLORS.line.slice(1)}"/></left><right style="thin"><color rgb="FF${COLORS.line.slice(1)}"/></right><top style="thin"><color rgb="FF${COLORS.line.slice(1)}"/></top><bottom style="thin"><color rgb="FF${COLORS.line.slice(1)}"/></bottom><diagonal/></border>`;const xf=(f,fi,b,a=`<alignment vertical="top" wrapText="1"/>`)=>`<xf numFmtId="0" fontId="${f}" fillId="${fi}" borderId="${b}" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">${a}</xf>`;const c=`<alignment horizontal="center" vertical="center" wrapText="1"/>`,r=`<alignment horizontal="right" vertical="top"/>`,m=`<alignment vertical="center"/>`;const xfs=[xf(0,0,0,m),xf(1,0,0,m),xf(2,0,0,m),xf(3,3,0,m),xf(4,2,1,c),xf(0,0,1),xf(0,4,1),xf(0,0,1,r),xf(5,5,1,c),xf(6,3,1,c),xf(7,6,1,c),xf(8,0,1),xf(2,4,1,c),xf(9,4,1,c),xf(6,0,1),xf(10,7,1),xf(0,4,1,r),xf(8,4,1),xf(5,5,1,c)];return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="${fonts.length}">${fonts.join("")}</fonts><fills count="${fills.length}">${fills.join("")}</fills><borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border>${border}</borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="${xfs.length}">${xfs.join("")}</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;}
  function cellXml(ref,cell){if(cell==null)return"";const{v,s=XS.cell,link}=typeof cell==="object"?cell:{v:cell};if(link){const label=String(v??link),formula=`HYPERLINK("${String(link).replace(/"/g,'""')}","${label.replace(/"/g,'""').slice(0,250)}")`;return `<c r="${ref}" s="${s}" t="str"><f>${xmlEsc(formula)}</f><v>${xmlEsc(label)}</v></c>`;}if(typeof v==="number"&&Number.isFinite(v))return `<c r="${ref}" s="${s}"><v>${v}</v></c>`;return `<c r="${ref}" s="${s}" t="inlineStr"><is><t xml:space="preserve">${xmlEsc(v)}</t></is></c>`;}
  function sheetXml(sheet){const rows=sheet.rows.map((row,i)=>{const n=i+1;if(!row)return `<row r="${n}"/>`;return `<row r="${n}"${row.height?` ht="${row.height}" customHeight="1"`:""}>${row.cells.map((c,j)=>cellXml(`${columnName(j+1)}${n}`,c)).join("")}</row>`;}).join("");const last=columnName(sheet.cols.length),freeze=sheet.freezeRow?`<pane ySplit="${sheet.freezeRow}" topLeftCell="A${sheet.freezeRow+1}" activePane="bottomLeft" state="frozen"/><selection pane="bottomLeft" activeCell="A${sheet.freezeRow+1}" sqref="A${sheet.freezeRow+1}"/>`:"";return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheetPr><pageSetUpPr fitToPage="1"/></sheetPr><dimension ref="A1:${last}${Math.max(1,sheet.rows.length)}"/><sheetViews><sheetView workbookViewId="0" showGridLines="0">${freeze}</sheetView></sheetViews><sheetFormatPr defaultRowHeight="18"/><cols>${sheet.cols.map((w,i)=>`<col min="${i+1}" max="${i+1}" width="${w}" customWidth="1"/>`).join("")}</cols><sheetData>${rows}</sheetData>${sheet.autoFilter?`<autoFilter ref="${sheet.autoFilter}"/>`:""}${sheet.merges?.length?`<mergeCells count="${sheet.merges.length}">${sheet.merges.map((r)=>`<mergeCell ref="${r}"/>`).join("")}</mergeCells>`:""}<pageMargins left="0.3" right="0.3" top="0.5" bottom="0.5" header="0.2" footer="0.2"/><pageSetup paperSize="9" orientation="landscape" fitToWidth="1" fitToHeight="0"/><drawing r:id="rId1"/></worksheet>`;}
  function letterheadRows(title,subtitle,columns,titleColumn=2){const lead=Array.from({length:titleColumn},()=>null),pad=(cells)=>[...cells,...Array.from({length:Math.max(0,columns-cells.length)},()=>null)];return[{height:22,cells:pad([])},{height:28,cells:pad([...lead,{v:title,s:XS.title}])},{height:20,cells:pad([...lead,{v:subtitle,s:XS.subtitle}])},{height:20,cells:pad([])},null];}
  function calendarSheet(report){const cols=12,rows=letterheadRows("Calendário de metas",`Referência ${dateBR(report.referenceDate)} · ${report.scopeLabel} · ${dateTimeBR(report.generatedAt)}`,cols,3),merges=[];for(const period of report.periods){const start=rows.length+1;rows.push({height:26,cells:[{v:`${period.title.toUpperCase()} — ${periodRange(period.data)}`,s:XS.section},...Array.from({length:cols-1},()=>({v:"",s:XS.section}))]});merges.push(`A${start}:${columnName(cols)}${start}`);const m=periodMetrics(period.data,report),k=[["Metas",m.goals],["Concl./produzidas",m.recognized],["Cumprimento",`${m.percent}%`],["Planejado",minutesLabel(m.planned)],["Realizado",minutesLabel(m.actual)]];rows.push({cells:k.flatMap(([l])=>[{v:l,s:XS.kpiLabel},{v:"",s:XS.kpiLabel}]).concat([{v:"",s:XS.kpiLabel},{v:"",s:XS.kpiLabel}])});rows.push({height:24,cells:k.flatMap(([,v])=>[{v:v,s:XS.kpiValue},{v:"",s:XS.kpiValue}]).concat([{v:"",s:XS.kpiValue},{v:"",s:XS.kpiValue}])});rows.push({height:32,cells:["Data","Dia","Tipo do dia","Disciplina","Assunto","Tipo","Planejado (min)","Realizado (min)","Situação","Resumo do tema","Treino de questões","Prioridade"].map((v)=>({v,s:XS.header}))});let zebra=false;for(const day of period.data.days||[]){const goals=day.goals.length?day.goals:[null];for(const g of goals){const base=zebra?XS.zebra:XS.cell,num=zebra?XS.numberZebra:XS.number;if(!g){rows.push({cells:[{v:dateBR(day.date),s:base},{v:weekdayOf(day.date),s:base},{v:day.dayType,s:base},{v:"Sem metas",s:base},...Array.from({length:8},()=>({v:"",s:base}))]});continue;}const state=goalState(g,report),out=factoryOutcomeForGoal(g,report);rows.push({cells:[{v:dateBR(day.date),s:base},{v:weekdayOf(day.date),s:base},{v:day.dayType,s:base},{v:g.discipline,s:base},{v:g.subject,s:base},{v:g.type,s:base},{v:Number(g.plannedMinutes)||0,s:num},{v:Number(g.actualMinutes)||0,s:num},{v:STATE_LABEL[state],s:XS[state]},{v:out.summaryLabel,s:out.summaryDone?XS.factory:base},{v:out.trainingLabel,s:out.trainingDone?XS.factory:base},{v:g.priority,s:base}]});}zebra=!zebra;}rows.push(null);}return{name:"Calendário",cols:[12,7,16,26,40,14,13,13,18,30,30,12],rows,merges,freezeRow:5};}
  function factorySheet(name,title,entries,headers,report){const columns=headers.length,rows=letterheadRows(title,`${entries.length} registro(s) · ${report.driveNote}`,columns,1),headerRow=rows.length+1;rows.push({height:34,cells:headers.map((v)=>({v,s:XS.header}))});entries.forEach(({view},index)=>{const zebra=index%2===1,by=Object.fromEntries(view.fields.filter((f)=>!f.statement).map((f)=>[f.label,f]));rows.push({height:42,cells:headers.map((header)=>{const f=by[header];if(!f)return{v:"",s:zebra?XS.zebra:XS.cell};if(f.tone==="warn")return{v:f.value,s:XS.warn};if(f.href)return{v:f.value,link:f.href,s:zebra?XS.linkZebra:XS.link};return{v:f.value,s:zebra?XS.zebra:XS.cell};})});});if(!entries.length)rows.push({cells:[{v:"Nenhum registro elaborado.",s:XS.cell}]});return{name,cols:headers.map((h)=>/LINK|ARQUIVO/.test(h)?42:/PÁGINAS/.test(h)?28:/TEMA/.test(h)?38:/EDITAL/.test(h)?32:/STATUS|RESUMO|TREINO/.test(h)?26:22),rows,merges:[],freezeRow:headerRow,autoFilter:entries.length?`A${headerRow}:${columnName(columns)}${rows.length}`:""};}
  function buildWorkbookFiles(report,logoBytes){const summaryHeaders=["DISCIPLINA","TEMA","EDITAL","ITEM DO EDITAL","STATUS NA FÁBRICA","DATA","LINK DA PASTA DESTINO","ARQUIVO WORD","QUANTIDADE DE PÁGINAS DO WORD DO RESUMO","ARQUIVO PDF","QUANTIDADE DE PÁGINAS DO PDF DO RESUMO"],trainingHeaders=["DISCIPLINA","TEMA","EDITAL","ITEM DO EDITAL","STATUS NA FÁBRICA","DATA","LINK DA PASTA DESTINO","ARQUIVO DO TREINO"];const sheets=[calendarSheet(report),factorySheet("Fábrica - resumos","Fábrica de Resumos — resumos elaborados",report.summaries,summaryHeaders,report),factorySheet("Fábrica - treinos","Fábrica de Resumos — treinos de questões elaborados",report.trainings,trainingHeaders,report)],NS="http://schemas.openxmlformats.org",files=[{name:"[Content_Types].xml",data:`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="${NS}/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheets.map((_,i)=>`<Override PartName="/xl/worksheets/sheet${i+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/drawings/drawing${i+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>`).join("")}</Types>`},{name:"_rels/.rels",data:`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="${NS}/package/2006/relationships"><Relationship Id="rId1" Type="${NS}/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`},{name:"xl/workbook.xml",data:`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="${NS}/spreadsheetml/2006/main" xmlns:r="${NS}/officeDocument/2006/relationships"><bookViews><workbookView/></bookViews><sheets>${sheets.map((s,i)=>`<sheet name="${xmlEsc(s.name)}" sheetId="${i+1}" r:id="rId${i+1}"/>`).join("")}</sheets></workbook>`},{name:"xl/_rels/workbook.xml.rels",data:`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="${NS}/package/2006/relationships">${sheets.map((_,i)=>`<Relationship Id="rId${i+1}" Type="${NS}/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i+1}.xml"/>`).join("")}<Relationship Id="rId${sheets.length+1}" Type="${NS}/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`},{name:"xl/styles.xml",data:stylesXml()},{name:"xl/media/logo.png",data:logoBytes}];sheets.forEach((s,i)=>{const n=i+1;files.push({name:`xl/worksheets/sheet${n}.xml`,data:sheetXml(s)},{name:`xl/worksheets/_rels/sheet${n}.xml.rels`,data:`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="${NS}/package/2006/relationships"><Relationship Id="rId1" Type="${NS}/officeDocument/2006/relationships/drawing" Target="../drawings/drawing${n}.xml"/></Relationships>`},{name:`xl/drawings/drawing${n}.xml`,data:`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><xdr:wsDr xmlns:xdr="${NS}/drawingml/2006/spreadsheetDrawing" xmlns:a="${NS}/drawingml/2006/main" xmlns:r="${NS}/officeDocument/2006/relationships"><xdr:oneCellAnchor><xdr:from><xdr:col>0</xdr:col><xdr:colOff>57150</xdr:colOff><xdr:row>0</xdr:row><xdr:rowOff>57150</xdr:rowOff></xdr:from><xdr:ext cx="1600200" cy="586740"/><xdr:pic><xdr:nvPicPr><xdr:cNvPr id="2" name="Timbre Aldus Meta"/><xdr:cNvPicPr><a:picLocks noChangeAspect="1"/></xdr:cNvPicPr></xdr:nvPicPr><xdr:blipFill><a:blip r:embed="rId1"/><a:stretch><a:fillRect/></a:stretch></xdr:blipFill><xdr:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="1600200" cy="586740"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></xdr:spPr></xdr:pic><xdr:clientData/></xdr:oneCellAnchor></xdr:wsDr>`},{name:`xl/drawings/_rels/drawing${n}.xml.rels`,data:`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="${NS}/package/2006/relationships"><Relationship Id="rId1" Type="${NS}/officeDocument/2006/relationships/image" Target="../media/logo.png"/></Relationships>`});});return files;}

  const drive={token:"",expiresAt:0,client:null,pending:null}; const driveReady=()=>Boolean(drive.token&&Date.now()<drive.expiresAt-60000);
  function settleDrive(response){const resolve=drive.pending;drive.pending=null;if(response?.access_token){drive.token=response.access_token;drive.expiresAt=Date.now()+Number(response.expires_in||3600)*1000;resolve?.(true);return;}resolve?.(false);}
  function ensureDriveRead(){if(driveReady())return Promise.resolve(true);let clientId="";try{clientId=typeof GOOGLE_CLIENT_ID!=="undefined"?GOOGLE_CLIENT_ID:"";}catch{}if(!clientId||call("isGoogleClientConfigured")===false)return Promise.resolve(false);const request=()=>new Promise((resolve)=>{const oauth=globalThis.google?.accounts?.oauth2;if(!oauth){resolve(false);return;}drive.pending=resolve;drive.client ||= oauth.initTokenClient({client_id:clientId,scope:DRIVE_READ_SCOPE,include_granted_scopes:true,callback:settleDrive,error_callback:()=>settleDrive(null)});drive.client.requestAccessToken({prompt:""});setTimeout(()=>{if(drive.pending===resolve)settleDrive(null);},180000);});if(globalThis.google?.accounts?.oauth2)return request();return Promise.resolve(call("loadGoogleIdentityServices")).then(request,()=>false);}
  async function driveGet(url,as="json"){const response=await fetch(url,{headers:{Authorization:`Bearer ${drive.token}`}});if(response.status===401||response.status===403){if(response.status===401)drive.token="";const e=new Error(`Google Drive recusou a leitura (${response.status}).`);e.status=response.status;throw e;}if(!response.ok)throw new Error(`Google Drive respondeu ${response.status}.`);return as==="json"?response.json():response.arrayBuffer();}
  const readPageCache=()=>{try{return JSON.parse(localStorage.getItem(PAGE_CACHE_KEY)||"{}")||{};}catch{return{};}}; const writePageCache=(c)=>{try{localStorage.setItem(PAGE_CACHE_KEY,JSON.stringify(c));}catch{}};
  async function loadPdfLibrary(){if(globalThis.__ALDUS_PDFJS__)return globalThis.__ALDUS_PDFJS__;const base=document.baseURI,pdfjs=await import(new URL("vendor/pdf.mjs",base).href);pdfjs.GlobalWorkerOptions.workerSrc=new URL("vendor/pdf.worker.mjs",base).href;globalThis.__ALDUS_PDFJS__=pdfjs;return pdfjs;}
  async function countPdfPagesInDrive(file){const key=`${file.id}|${file.modifiedTime||""}`,cache=readPageCache();if(Number.isFinite(cache[key]))return cache[key];const bytes=await driveGet(`https://www.googleapis.com/drive/v3/files/${file.id}?alt=media&supportsAllDrives=true`,"buffer"),pdfjs=await loadPdfLibrary(),doc=await pdfjs.getDocument({data:new Uint8Array(bytes)}).promise,pages=doc.numPages;try{await doc.destroy();}catch{}const next=readPageCache();next[key]=pages;writePageCache(next);return pages;}
  function setStatus(message,error=false){if(typeof globalThis.setGoalCalendarExportStatus==="function"){call("setGoalCalendarExportStatus",message,error);return;}const target=document.getElementById("goalCalendarExportStatus");if(!target)return;target.hidden=false;target.textContent=message;target.classList.toggle("error",error);}
  function collectPeriods(referenceDate,scope){const payload=call("buildGoalCalendarExportPayload",referenceDate),selected=call("selectedGoalCalendarPeriods",payload,scope);if(!payload||!Array.isArray(selected))throw new Error("O calendário ainda não está pronto.");return selected.map(([label,key,data])=>({label,key,data}));}
  const exportFilename=(report,ext)=>`calendario-${call("goalCalendarScopeLabel",report.scope)||report.scope}-${report.referenceDate}.${ext}`;
  function saveBlob(blob,filename){if(call("downloadGeneratedFile",blob,filename)!==undefined)return;if(typeof globalThis.downloadGeneratedFile==="function")return;const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);}
  function printReport(report){call("cleanupGoalCalendarPrint");document.getElementById("goalCalendarPrintableReport")?.remove();document.body.insertAdjacentHTML("beforeend",buildPrintHtml(report));document.body.classList.add("calendar-print-mode");const cleanup=()=>{document.body.classList.remove("calendar-print-mode");document.getElementById("goalCalendarPrintableReport")?.remove();};window.addEventListener("afterprint",cleanup,{once:true});setTimeout(()=>window.print(),120);}
  async function logoPngBytes(){const blob=await call("rasterizeSvgToPngBlob",logoSvg(),{width:600,height:220});return new Uint8Array(await blob.arrayBuffer());}
  async function renderPng(svg){const height=Number(svg.match(/viewBox="0 0 1600 (\d+)"/)?.[1])||2000;const scale=height>18000?Math.max(.85,18000/height):1.5;return call("rasterizeSvgToPngBlob",svg,{width:Math.round(1600*scale),height:Math.round(height*scale)});}
  async function prepareReport(){const appState=currentState();if(!appState)throw new Error("Os dados ainda estão carregando.");const referenceDate=document.getElementById("calendarDate")?.value||todayISO(),scope=document.getElementById("goalCalendarExportScope")?.value||"daily",scopeLabel={daily:"Somente dia",weekly:"Somente semana",monthly:"Somente mês",all:"Dia + semana + mês"}[scope]||scope,summaries=elaboratedSummaries(appState),trainings=trainingRecords(appState),records=[...summaries,...trainings];let driveInfo=new Map(),driveState="off";if(records.length){setStatus("Conferindo a Fábrica e solicitando leitura do Google Drive…");const authorized=await ensureDriveRead();if(authorized){try{const outcome=await createDriveReader({get:driveGet,countPdfPages:countPdfPagesInDrive}).resolve(records,(done,total)=>setStatus(`Conferindo arquivos da Fábrica no Google Drive: ${done} de ${total}…`));driveInfo=outcome.results;driveState=outcome.state;}catch(e){console.warn(`[Aldus ${VERSION}] Drive falhou.`,e);driveState="error";}}}return buildReport({periods:collectPeriods(referenceDate,scope),referenceDate,scope,scopeLabel,summaries,trainings,driveInfo,driveState});}
  const ORIGINAL_EXPORTERS={pdf:"exportGoalCalendarPdf",excel:"exportGoalCalendarExcel",image:"exportGoalCalendarImage"}; let running=false;
  async function runExport(kind){if(running)return;running=true;try{const report=await prepareReport(),drivePart=report.driveState==="on"?"com arquivos conferidos no Google Drive":"sem conferência do Google Drive";if(kind==="pdf"){setStatus(`PDF pronto (${drivePart}).`);printReport(report);}else if(kind==="excel"){const zip=globalThis.spreadsheetZipArchive;if(typeof zip!=="function")throw new Error("gerador de planilha indisponível");const archive=zip(buildWorkbookFiles(report,await logoPngBytes()));saveBlob(new Blob([archive],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}),exportFilename(report,"xlsx"));setStatus(`Excel completo gerado (${drivePart}).`);}else{const blob=await renderPng(buildSvg(report));saveBlob(blob,exportFilename(report,"png"));setStatus(`Imagem legível gerada em duas colunas (${drivePart}).`);}}catch(e){console.error(`[Aldus ${VERSION}] Exportação falhou.`,e);setStatus(`Falha na exportação nova (${e?.message||e}).`,true);try{await call(ORIGINAL_EXPORTERS[kind]);}catch{}}finally{running=false;}}
  function interceptExportClick(event){const button=event.target?.closest?.("#exportGoalCalendarPdf, #exportGoalCalendarExcel, #exportGoalCalendarImage");if(!button)return;event.preventDefault();event.stopImmediatePropagation();runExport(BUTTONS[button.id]);}
  function preloadGoogleWhenCalendarOpens(view){if(view!=="calendario-metas"||call("isGoogleClientConfigured")===false)return;Promise.resolve(call("loadGoogleIdentityServices")).catch(()=>{});}

  const api=Object.freeze({VERSION,PREJUDICADO,NO_DATE,DRIVE_NOTES,PRODUCED_STATUSES,elaboratedSummaries,trainingRecords,editalInfo,driveIdFrom,fileKind,pickModuleFiles,createDriveReader,summaryView,trainingView,factoryOutcomeForGoal,buildReport,buildPrintHtml,buildSvg,buildWorkbookFiles,runExport});
  globalThis[FLAG]=api;
  if(typeof module!=="undefined"&&module.exports){module.exports=api;return;}
  if(typeof document==="undefined")return;
  document.addEventListener("click",interceptExportClick,true);
  window.addEventListener("aldus:view-active",(event)=>preloadGoogleWhenCalendarOpens(event?.detail?.view));
  if(String(location.hash||"").replace(/^#/,"")==="calendario-metas")preloadGoogleWhenCalendarOpens("calendario-metas");
})();