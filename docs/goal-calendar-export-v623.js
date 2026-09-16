/* V623.7 — Calendário de Metas no formato simples pedido por ele em 16/09/2026. Para cada meta do período
   escolhido em "Período do arquivo" (metas de PEÇA ficam de fora): RESUMO (AULA + JURISPRUDÊNCIA) pelo status
   "Aprovado" salvo no módulo RESUMO/AULA da Fábrica, com a data do arquivo do resumo na pasta destino;
   LINK DA PASTA DESTINO; TREINO DE QUESTÕES e JURISPRUDÊNCIA pelo arquivo na pasta destino do Google Drive. */
(() => {
  "use strict";

  const VERSION = "20260916-calendario-simples-v623-7";
  const FLAG = "__ALDUS_GOAL_CALENDAR_EXPORT_V623__";
  if (globalThis[FLAG]) return;

  const COLORS = {
    navy: "#061C33", ink: "#111827", blue: "#1D4ED8", blueSoft: "#E8F0FF", muted: "#475569", line: "#CBD5E1",
    paper: "#F8FAFC", gold: "#B78318", goldSoft: "#FFF7E5", green: "#166534", greenSoft: "#DCFCE7",
    red: "#B91C1C", redSoft: "#FEE2E2", amber: "#9A5B00", amberSoft: "#FEF3C7", white: "#FFFFFF"
  };
  const FOLDER_MIME = "application/vnd.google-apps.folder";
  const DRIVE_READ_SCOPE = "https://www.googleapis.com/auth/drive.readonly";
  const FILE_FIELDS = "id,name,mimeType,createdTime,modifiedTime,webViewLink";
  const BUTTONS = { exportGoalCalendarPdf: "pdf", exportGoalCalendarExcel: "excel", exportGoalCalendarImage: "image" };
  const DONE = "REALIZADO", NOT_DONE = "NÃO REALIZADO", NO_FOLDER = "SEM PASTA DESTINO NA FÁBRICA";
  const HEADERS = { resumo: "RESUMO (AULA + JURISPRUDÊNCIA)", pasta: "LINK DA PASTA DESTINO", treino: "TREINO DE QUESTÕES", juris: "JURISPRUDÊNCIA" };
  const DRIVE_NOTES = {
    on: "Treino e jurisprudência conferidos na pasta destino do Google Drive",
    off: "Google Drive não conectado: treino e jurisprudência NÃO CONFERIDOS",
    denied: "O Google Drive não autorizou a leitura: treino e jurisprudência NÃO CONFERIDOS",
    error: "Falha ao ler o Google Drive: treino e jurisprudência NÃO CONFERIDOS"
  };

  const text = (value) => String(value ?? "").trim();
  const canon = (value) => text(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
  const xmlEsc = (value) => String(value ?? "").replace(/[\u0000-\b\u000b\f\u000e-\u001f]/g, "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const naturalCompare = (a, b) => String(a).localeCompare(String(b), "pt-BR", { numeric: true, sensitivity: "base" });
  const call = (name, ...args) => { try { const fn = globalThis[name]; return typeof fn === "function" ? fn(...args) : undefined; } catch { return undefined; } };
  const dateBR = (value) => { const iso = text(value).slice(0, 10); const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/); return m ? `${m[3]}/${m[2]}/${m[1]}` : text(value); };
  const dateTimeBR = (value) => { const d = new Date(value); return Number.isNaN(d.getTime()) ? text(value) : d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }); };
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
  function modulesOf(item) {
    const normalized = call("normalizeFactoryModules", item?.modules || {}, item);
    return normalized && typeof normalized === "object" ? normalized : (item?.modules || {});
  }
  const destinationOf = (item) => text(item?.factoryDestinationFolder || item?.pastaDestinoWordPdf || item?.destinationFolder || item?.finalFilesFolder);

  function driveIdFrom(url) {
    const value = text(url); let m = value.match(/\/folders\/([\w-]{10,})/); if (m) return { kind:"folder", id:m[1] };
    m = value.match(/\/(?:file|document|spreadsheets|presentation)\/d\/([\w-]{10,})/); if (m) return { kind:"file", id:m[1] };
    m = value.match(/[?&]id=([\w-]{10,})/); return m ? { kind:"file", id:m[1] } : null;
  }
  const IGNORED_FILE = /^~\$|ARQUIVO[_\s-]*INCORRETO|DESCONSIDERAR/i;
  const isWord = (file) => /\.docx?$/i.test(file?.name || "") || /wordprocessingml|msword|google-apps\.document/.test(file?.mimeType || "");
  const isPdf = (file) => /\.pdf$/i.test(file?.name || "") || file?.mimeType === "application/pdf";
  // Treino pronto = o HTML do treino (ou o JSON salvo por ele). Prompts, modelo e exclusões não contam.
  const isTrainingFile = (file) => { const name = file?.name || ""; return /^TREINO[_\s-]/i.test(name) && !/EXCLUS|TRIAGEM|PDF[_\s-]*PARA[_\s-]*HTML|MODELO/i.test(name) && (/\.(html?|json)$/i.test(name) || /text\/html|application\/json/.test(file?.mimeType || "")); };
  const isFolder = (file) => file?.mimeType === FOLDER_MIME;
  // Pelo começo do nome, que é o padrão dos agentes da Fábrica: "MAPA_HIERARQUICO_RESUMO_AULA_LEI_13_709"
  // é RESUMO/AULA, não LEI. Nome fora do padrão (texto de lei, aula-fonte) não conta como resumo pronto.
  const PRODUCT_KINDS = [["jurisprudencia",/^MAPA[_\s-]*MENTAL[_\s-]*JURISPRUD/i],["peca",/^(MAPA[_\s-]*TOPIFICADO[_\s-]*PE[CÇ]A|RESUMO[_\s-]*PE[CÇ]A)/i],["lei",/^RESUMO[_\s-]*TOPIFICADO[_\s-]*LEI/i],["resumoAula",/^(MAPA[_\s-]*HIERARQUICO|RESUMO[_\s-]*AULA)/i],["completo",/^(RESUMO[_\s-]*COMPLETO|FUS[AÃ]O[_\s-]*FINAL|CONSOLIDA)/i]];
  const productKind = (file) => { const name = text(file?.name).replace(/^\d+[\s._-]+/, ""); return PRODUCT_KINDS.find(([,pattern]) => pattern.test(name))?.[0] || ""; };
  function productsIn(files) {
    const usable = files.filter((f) => f && !IGNORED_FILE.test(f.name || "")), resumos = new Map();
    usable.filter((f) => isWord(f) || isPdf(f)).forEach((f) => { const kind = productKind(f); if (!kind) return; const entry = resumos.get(kind) || { kind, word: [], pdf: [] }; (isWord(f) ? entry.word : entry.pdf).push(f); resumos.set(kind, entry); });
    return { resumos, treinos: usable.filter(isTrainingFile) };
  }
  const newest = (files) => files.slice().sort((a,b) => naturalCompare(b.modifiedTime || "", a.modifiedTime || ""))[0] || null;
  function createDriveReader({ get }) {
    const folders = new Map(), metas = new Map();
    const listFolder = (id) => { if (!folders.has(id)) { const q = encodeURIComponent(`'${id}' in parents and trashed=false`); folders.set(id, get(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=${encodeURIComponent(`files(${FILE_FIELDS})`)}&pageSize=300&supportsAllDrives=true&includeItemsFromAllDrives=true`).then((d) => Array.isArray(d?.files) ? d.files : [])); } return folders.get(id); };
    const fileMeta = (id) => { if (!metas.has(id)) metas.set(id, get(`https://www.googleapis.com/drive/v3/files/${id}?fields=${encodeURIComponent(FILE_FIELDS)}&supportsAllDrives=true`)); return metas.get(id); };
    // Um link sem permissão não derruba a conferência toda; só o token recusado (401) derruba.
    const onlyTokenErrors = (fallback) => (e) => { if (e?.status === 401) throw e; return fallback; };
    // Arquivos de um tema: pasta destino + links do Word/PDF de cada módulo. Se a pasta não tem
    // nenhum resumo nem treino, olha um nível abaixo (subpastas dos subitens do tema).
    async function filesOfItem(item) {
      const files = [], seen = new Set();
      const addFolder = async (id) => { if (seen.has(id)) return; seen.add(id); files.push(...await listFolder(id)); };
      const destination = driveIdFrom(destinationOf(item));
      if (destination?.kind === "folder") await addFolder(destination.id);
      for (const module of Object.values(modulesOf(item) || {})) for (const link of [module?.wordLink, module?.pdfLink].map(driveIdFrom).filter(Boolean)) {
        if (link.kind === "folder") await addFolder(link.id); else if (!seen.has(link.id)) { seen.add(link.id); files.push(await fileMeta(link.id).catch(onlyTokenErrors(null))); }
      }
      const found = productsIn(files);
      if (!found.resumos.size && !found.treinos.length) for (const sub of files.filter(isFolder).slice(0, 12)) await addFolder(sub.id);
      return files;
    }
    // Arquivo mais recente de cada tipo nas pastas dos temas ligados à meta.
    async function resolveGoal(links) {
      const files = [];
      for (const { item } of links) files.push(...await filesOfItem(item));
      const found = productsIn([...new Map(files.filter(Boolean).map((f) => [f.id, f])).values()]);
      const pick = (entry) => entry ? newest([...entry.word, ...entry.pdf]) : null;
      return { checked: true, resumoFile: pick(found.resumos.get("resumoAula")), jurisFile: pick(found.resumos.get("jurisprudencia")), treinoFile: newest(found.treinos.filter((f) => /\.html?$/i.test(f.name || ""))) || newest(found.treinos) };
    }
    async function runQueue(tasks, onProgress) {
      const results = new Map(), queue = tasks.slice(); let done=0, fatal=null;
      const worker = async () => { while (queue.length && !fatal) { const [key, task] = queue.shift(); try { results.set(key, await task()); } catch (e) { if (e?.status===401 || e?.status===403) fatal=e; results.set(key,{checked:false,error:String(e?.message||e)}); } done++; onProgress(done,tasks.length); } };
      await Promise.all(Array.from({length:6},worker)); return { results, state:fatal ? "denied" : "on" };
    }
    const resolveGoals = (linksByGoal, onProgress=()=>{}) => runQueue([...linksByGoal].filter(([,links]) => links.length).map(([key, links]) => [key, () => resolveGoal(links)]), onProgress);
    return { resolveGoals, listFolder, fileMeta };
  }

  // Liga a meta ao tema da Fábrica pelo item do edital, como o Plano do Dia: o nome da meta
  // ("Lei de Interceptação Telefônica") nem sempre é o nome do tema ("Lei nº 9.296/1996").
  const disciplineKey = (value) => canon(value).replace(/^direito /, "");
  const disciplinesCompatible = (a, b) => { const x = disciplineKey(a), y = disciplineKey(b); return Boolean(x && y) && (x === y || x.endsWith(` ${y}`) || y.endsWith(` ${x}`)); };
  const goalKey = (goal) => [goal.date, text(goal.syllabusItemId), canon(goal.discipline), canon(goal.subject)].join("|");
  function createGoalLinker(appState) {
    const agenda = factoryAgendaOf(appState), byTheme = new Map(), byId = new Map(), byFolder = new Map();
    const add = (map, key, item) => { if (!key) return; if (!map.has(key)) map.set(key, []); if (!map.get(key).includes(item)) map.get(key).push(item); };
    agenda.forEach((item) => { if (!item || typeof item !== "object") return; add(byTheme, canon(item.tema || item.subject), item); syllabusIdsOf(item).forEach((id) => add(byId, id, item)); const folder = driveIdFrom(destinationOf(item)); if (folder?.kind === "folder") add(byFolder, folder.id, item); });
    const syllabus = new Map((appState?.syllabusItems || []).map((entry) => [String(entry.id), entry]));
    const cache = new Map();
    function links(goal) {
      const key = goalKey(goal); if (cache.has(key)) return cache.get(key);
      const id = text(goal.syllabusItemId), sameId = byId.get(id) || [], subject = canon(goal.subject);
      let result = (byTheme.get(subject) || []).filter((item) => sameId.includes(item) || disciplinesCompatible(item.disciplina || item.discipline, goal.discipline)).map((item) => ({ item, relation: "tema" }));
      if (!result.length && sameId.length === 1) result = [{ item: sameId[0], relation: "item" }];
      if (!result.length && sameId.length > 1) { const main = canon(syllabus.get(id)?.subject); result = sameId.filter((item) => main && canon(item.tema || item.subject) === main).map((item) => ({ item, relation: "item" })); }
      cache.set(key, result); return result;
    }
    return { links, folderIndex: byFolder };
  }

  // Regras dele (16/09/2026): RESUMO vale o que está salvo na Fábrica (módulo RESUMO/AULA "Aprovado", que
  // inclui o prompt RESUMO/AULA + JURISPRUDÊNCIA), com a data de elaboração tirada da pasta destino no Drive
  // (não do campo de conclusão da Fábrica); TREINO DE QUESTÕES e JURISPRUDÊNCIA valem o arquivo na pasta.
  const doneOn = (date) => { const day = dateBR(date); return /^\d{2}\/\d{2}\/\d{4}$/.test(day) ? `${DONE} NO DIA ${day}` : `${DONE} (DATA NÃO REGISTRADA)`; };
  const isPieceGoal = (goal) => canon(goal?.discipline).startsWith("peca");
  function goalRow(goal, report, number) {
    const links = report?.linker ? report.linker.links(goal) : [], items = links.map((link) => link.item);
    const info = report?.goalDrive?.get(goalKey(goal)), checked = report?.driveState === "on" && info?.checked === true;
    const approved = items.some((item) => text(modulesOf(item)?.resumoAula?.status) === "Aprovado");
    const folderUrl = items.map(destinationOf).find(Boolean) || "";
    const uncheckedNote = report?.driveState === "on" ? "falha ao ler a pasta no Drive" : "Google Drive não autorizado";
    const resumo = !approved ? { done: false, text: NOT_DONE }
      : checked ? { done: true, text: info.resumoFile ? doneOn(info.resumoFile.createdTime || info.resumoFile.modifiedTime) : `${DONE} (DATA NÃO ENCONTRADA NA PASTA DO DRIVE)` }
      : { done: true, text: `${DONE} (DATA NÃO CONFERIDA — ${uncheckedNote})` };
    const fileCell = (file) => {
      if (checked) return file ? { done: true, text: doneOn(file.createdTime || file.modifiedTime) } : { done: false, text: NOT_DONE };
      if (!links.length || !folderUrl) return { done: false, text: NOT_DONE };
      return { done: false, warn: true, text: `NÃO CONFERIDO (${uncheckedNote})` };
    };
    return { number, date: goal.date, discipline: text(goal.discipline), theme: text(goal.subject), resumo, folderUrl, treino: fileCell(info?.treinoFile), juris: fileCell(info?.jurisFile) };
  }
  const PERIOD_TITLE = { daily: "Metas do dia", weekly: "Metas da semana", monthly: "Metas do mês" };
  const periodRange = (data) => data.start===data.end ? dateBR(data.start) : `${dateBR(data.start)} a ${dateBR(data.end)}`;
  function buildReport({ periods, referenceDate, scope, scopeLabel, appState = null, linker = null, goalDrive = new Map(), driveState = "off", generatedAt = new Date().toISOString() }) {
    const report = { version: VERSION, generatedAt, referenceDate, scope, scopeLabel, driveState, driveNote: DRIVE_NOTES[driveState] || DRIVE_NOTES.off, linker: linker || (appState ? createGoalLinker(appState) : null), goalDrive };
    report.periods = periods.map(({ label, key, data }) => {
      // Pedido dele: metas de PEÇA não entram no levantamento; a numeração segue sem buracos.
      const days = (data.days || []).map((day) => ({ date: day.date, rows: (day.goals || []).filter((goal) => !isPieceGoal(goal)).map((goal, index) => goalRow(goal, report, index + 1)) })).filter((day) => day.rows.length);
      return { key, title: PERIOD_TITLE[key] || `Metas — ${label}`, range: periodRange(data), multiDay: key !== "daily", days, total: days.reduce((sum, day) => sum + day.rows.length, 0) };
    });
    return report;
  }

  function logoSvg() { const svg=call("generatedBrandLogoSvg"); if (typeof svg==="string"&&svg.includes("<svg")) return svg; return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 440"><rect width="1200" height="440" rx="60" fill="${COLORS.navy}"/></svg>`; }
  function logoMarkSvg(x,y,width) { const mark=call("generatedBrandMarkSvg",x,y,width); if (typeof mark==="string"&&mark.includes("data-generated-brand")) return mark; return `<g data-generated-brand="Aldus Metas Concurso" transform="translate(${x} ${y})"><rect width="${width}" height="${Math.round(width*440/1200)}" rx="16" fill="${COLORS.navy}"/></g>`; }
  const LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 100" role="img" aria-label="Aldus Metas Concurso"><text x="0" y="58" font-family="Arial,Helvetica,sans-serif" font-size="58" font-weight="700" letter-spacing="8" fill="${COLORS.navy}">ALDUS</text><text x="2" y="92" font-family="Arial,Helvetica,sans-serif" font-size="21" font-weight="700" letter-spacing="6" fill="${COLORS.gold}">METAS CONCURSO</text></svg>`;

  // Tudo com o id na frente e !important: o CSS do site (tabelas em maiúsculas, linhas zebradas, cores
  // de parágrafo) vazava para a impressão da V623.5. Sem timbre na margem da página: com "Margens: nenhuma"
  // na janela de impressão, o timbre saía cortado no alto.
  const R = "#goalCalendarPrintableReport.aldus-cal-v623";
  function printCss() { return `
@media screen{${R}{display:none!important}}
@media print{@page{size:A4 landscape;margin:12mm 10mm;@bottom-right{content:"Página " counter(page);font:7pt Arial;color:${COLORS.muted}}}body.calendar-print-mode{min-width:0!important;width:auto!important;margin:0!important;padding:0!important}body.calendar-print-mode ${R}{display:block!important;width:100%!important;max-width:277mm!important;margin:0 auto!important}}
${R},${R} *{box-sizing:border-box!important;font-family:Arial,Helvetica,sans-serif!important;color:${COLORS.ink}!important;text-transform:none!important;letter-spacing:0!important;opacity:1!important;box-shadow:none!important;text-shadow:none!important;border-radius:0!important;background:transparent!important;filter:none!important}
${R}{font-size:9pt!important;line-height:1.3!important;-webkit-print-color-adjust:exact;print-color-adjust:exact}
${R} .acv-head{display:flex!important;align-items:center!important;justify-content:space-between!important;gap:6mm!important;margin:0 0 2.5mm!important;padding:0 0 2mm!important;border-bottom:.5mm solid ${COLORS.navy}!important}
${R} .acv-head svg{display:block!important;width:40mm!important;height:10mm!important}
${R} .acv-title{text-align:right!important}${R} .acv-title strong{display:block!important;font-size:14pt!important;font-weight:700!important;color:${COLORS.navy}!important}${R} .acv-title span{display:block!important;font-size:8.5pt!important;color:${COLORS.muted}!important}
${R} .acv-note{margin:0 0 3mm!important;font-size:8pt!important;color:${COLORS.muted}!important}
${R} h2{margin:3mm 0 1.5mm!important;padding:0!important;font-size:11pt!important;font-weight:700!important;color:${COLORS.navy}!important;break-after:avoid!important}
${R} table{width:100%!important;min-width:0!important;border-collapse:collapse!important;table-layout:fixed!important;margin:0 0 2mm!important;border:0!important}
${R} thead{display:table-header-group!important}
${R} th{padding:1.3mm 1.5mm!important;background:${COLORS.navy}!important;color:#fff!important;font-size:7.5pt!important;font-weight:700!important;text-align:left!important;vertical-align:bottom!important;border:0!important}
${R} td{padding:1.3mm 1.5mm!important;border:0!important;border-bottom:.25mm solid ${COLORS.line}!important;vertical-align:top!important;font-size:8.5pt!important;overflow-wrap:anywhere!important;word-break:normal!important}
${R} tr{break-inside:avoid!important;page-break-inside:avoid!important}
${R} tr.acv-day td{padding-top:2.5mm!important;font-weight:700!important;color:${COLORS.navy}!important;border-bottom:.4mm solid ${COLORS.navy}!important}
${R} td.acv-meta{font-weight:700!important;white-space:nowrap!important}
${R} .acv-ok{color:${COLORS.green}!important;font-weight:700!important}${R} .acv-no{color:${COLORS.red}!important;font-weight:700!important}${R} .acv-warn{color:${COLORS.amber}!important;font-weight:700!important}
${R} a{color:${COLORS.blue}!important;text-decoration:underline!important}`; }
  const statusHtml = (cell) => `<span class="${cell.done ? "acv-ok" : cell.warn ? "acv-warn" : "acv-no"}">${esc(cell.text)}</span>`;
  function rowHtml(row) {
    return `<tr><td class="acv-meta">META ${row.number}</td><td>${esc(row.discipline)}</td><td>${esc(row.theme)}</td><td>${statusHtml(row.resumo)}</td><td>${row.folderUrl ? `<a href="${esc(row.folderUrl)}">abrir pasta</a>` : statusHtml({ text: NO_FOLDER })}</td><td>${statusHtml(row.treino)}</td><td>${statusHtml(row.juris)}</td></tr>`;
  }
  function periodHtml(period) {
    if (!period.total) return `<h2>${esc(period.title)} · ${esc(period.range)}</h2><p class="acv-note">Nenhuma meta neste período.</p>`;
    const body = period.days.map((day) => `${period.multiDay ? `<tr class="acv-day"><td colspan="7">${esc(weekdayOf(day.date))} · ${esc(dateBR(day.date))} · ${day.rows.length} meta(s)</td></tr>` : ""}${day.rows.map(rowHtml).join("")}`).join("");
    return `<h2>${esc(period.title)} · ${esc(period.range)}</h2><table role="presentation"><colgroup><col style="width:7%"><col style="width:15%"><col style="width:24%"><col style="width:15%"><col style="width:9%"><col style="width:15%"><col style="width:15%"></colgroup><thead><tr><th>META</th><th>DISCIPLINA</th><th>TEMA</th><th>${esc(HEADERS.resumo)}</th><th>${esc(HEADERS.pasta)}</th><th>${esc(HEADERS.treino)}</th><th>${esc(HEADERS.juris)}</th></tr></thead><tbody>${body}</tbody></table>`;
  }
  function buildPrintHtml(report) {
    const head = `<div class="acv-head">${LOGO_SVG}<div class="acv-title"><strong>Calendário de metas</strong><span>Período: ${esc(report.scopeLabel)} · Referência ${esc(dateBR(report.referenceDate))} · Gerado em ${esc(dateTimeBR(report.generatedAt))}</span></div></div>`;
    const note = `<p class="acv-note">RESUMO: módulo RESUMO/AULA marcado como “Aprovado” na Fábrica, com a data do arquivo do resumo na pasta destino. TREINO DE QUESTÕES e JURISPRUDÊNCIA: arquivo na pasta destino do Google Drive.${report.driveState === "on" ? "" : ` ${esc(report.driveNote)}.`}</p>`;
    // aria-hidden: o relatório só existe durante a impressão; sem ele o Chrome grava uma estrutura de acessibilidade por célula e o PDF quase triplica.
    return `<article id="goalCalendarPrintableReport" class="aldus-cal-v623" data-version="${VERSION}" aria-hidden="true"><style>${printCss()}</style>${head}${note}${report.periods.map(periodHtml).join("")}</article>`;
  }

  const approxWidth=(v,s)=>String(v).length*s*.55;
  const fit=(v,w,s)=>{const src=String(v??"");if(approxWidth(src,s)<=w)return src;return `${src.slice(0,Math.max(4,Math.floor(w/(s*.55))-1))}…`;};
  const svgText=(x,y,v,{size=16,weight=400,color=COLORS.ink,anchor="start",maxWidth=0}={})=>`<text x="${x}" y="${y}" font-size="${size}" font-weight="${weight}" fill="${color}" text-anchor="${anchor}">${esc(maxWidth?fit(v,maxWidth,size):v)}</text>`;
  function buildSvg(report) {
    const W=1600,M=60,CW=W-M*2,p=[]; let y=0;
    const tone=(cell)=>cell.done?COLORS.green:cell.warn?COLORS.amber:COLORS.red;
    const line=(label,value,color,yy)=>{p.push(svgText(M+28,yy,`${label}:`,{size:15,weight:700,color:COLORS.muted}));p.push(svgText(M+400,yy,value,{size:16,weight:700,color,maxWidth:CW-430}));};
    p.push(logoMarkSvg(M,28,250)); p.push(svgText(W-M,72,"Calendário de metas",{size:34,weight:700,color:COLORS.navy,anchor:"end"})); p.push(svgText(W-M,104,`Período: ${report.scopeLabel} · Referência ${dateBR(report.referenceDate)} · ${dateTimeBR(report.generatedAt)}`,{size:16,color:COLORS.muted,anchor:"end"}));
    p.push(`<rect x="${M}" y="138" width="${CW}" height="4" fill="${COLORS.navy}"/>`); y=174;
    p.push(svgText(M,y,`RESUMO: RESUMO/AULA “Aprovado” na Fábrica, data do arquivo na pasta · TREINO e JURISPRUDÊNCIA: arquivo na pasta destino do Google Drive${report.driveState === "on" ? "" : ` · ${report.driveNote}`}`,{size:14,color:COLORS.muted,maxWidth:CW})); y+=34;
    for(const period of report.periods){
      p.push(`<rect x="${M}" y="${y}" width="${CW}" height="50" fill="${COLORS.blueSoft}"/><rect x="${M}" y="${y}" width="8" height="50" fill="${COLORS.blue}"/>`);
      p.push(svgText(M+24,y+33,`${period.title} · ${period.range}`,{size:22,weight:700,color:COLORS.navy,maxWidth:CW-40})); y+=66;
      if(!period.total){p.push(svgText(M+24,y+10,"Nenhuma meta neste período.",{size:16,color:COLORS.muted}));y+=40;continue;}
      for(const day of period.days){
        if(period.multiDay){p.push(svgText(M,y+20,`${weekdayOf(day.date)} · ${dateBR(day.date)} · ${day.rows.length} meta(s)`,{size:18,weight:700,color:COLORS.navy}));p.push(`<rect x="${M}" y="${y+30}" width="${CW}" height="2" fill="${COLORS.navy}"/>`);y+=46;}
        for(const row of day.rows){
          const h=172;
          p.push(`<rect x="${M}" y="${y}" width="${CW}" height="${h}" fill="#fff" stroke="${COLORS.line}"/>`);
          p.push(svgText(M+28,y+34,`META ${row.number} · ${row.discipline} — ${row.theme}`,{size:19,weight:700,color:COLORS.navy,maxWidth:CW-56}));
          line(HEADERS.resumo,row.resumo.text,tone(row.resumo),y+66);
          line(HEADERS.pasta,row.folderUrl||NO_FOLDER,row.folderUrl?COLORS.blue:COLORS.amber,y+94);
          line(HEADERS.treino,row.treino.text,tone(row.treino),y+122);
          line(HEADERS.juris,row.juris.text,tone(row.juris),y+150);
          y+=h+12;
        }
      }
      y+=10;
    }
    p.push(`<rect x="${M}" y="${y}" width="${CW}" height="2" fill="${COLORS.line}"/>`); p.push(svgText(M,y+30,"Aldus Meta · Metas de Estudo",{size:14,color:COLORS.muted}));
    const H=y+55; return `<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img"><title>Calendário de metas — Aldus Meta</title><style>text{font-family:Arial,Helvetica,sans-serif}</style><rect width="100%" height="100%" fill="#fff"/>${p.join("")}</svg>`;
  }

  function columnName(index){let v=index,n="";while(v>0){const r=(v-1)%26;n=String.fromCharCode(65+r)+n;v=Math.floor((v-1)/26);}return n;}
  const XS={base:0,title:1,subtitle:2,section:3,header:4,cell:5,zebra:6,number:7,done:8,pending:9,missed:10,link:11,kpiLabel:12,kpiValue:13,statement:14,warn:15,numberZebra:16,linkZebra:17,factory:18};
  function stylesXml(){const font=(o)=>`<font>${o.b?"<b/>":""}${o.u?"<u/>":""}<sz val="${o.sz||10}"/><color rgb="FF${(o.color||COLORS.ink).slice(1)}"/><name val="Calibri"/><family val="2"/></font>`;const fonts=[font({}),font({b:1,sz:18,color:COLORS.navy}),font({sz:10,color:COLORS.muted}),font({b:1,sz:12,color:COLORS.navy}),font({b:1,color:"#FFFFFF"}),font({b:1,color:COLORS.green}),font({b:1,color:COLORS.blue}),font({b:1,color:COLORS.red}),font({u:1,color:COLORS.blue}),font({b:1,sz:14,color:COLORS.navy}),font({b:1,color:COLORS.amber})];const fill=(c)=>`<fill><patternFill patternType="solid"><fgColor rgb="FF${c.slice(1)}"/><bgColor indexed="64"/></patternFill></fill>`;const fills=[`<fill><patternFill patternType="none"/></fill>`,`<fill><patternFill patternType="gray125"/></fill>`,fill(COLORS.navy),fill(COLORS.blueSoft),fill(COLORS.paper),fill(COLORS.greenSoft),fill(COLORS.redSoft),fill(COLORS.amberSoft)];const border=`<border><left style="thin"><color rgb="FF${COLORS.line.slice(1)}"/></left><right style="thin"><color rgb="FF${COLORS.line.slice(1)}"/></right><top style="thin"><color rgb="FF${COLORS.line.slice(1)}"/></top><bottom style="thin"><color rgb="FF${COLORS.line.slice(1)}"/></bottom><diagonal/></border>`;const xf=(f,fi,b,a=`<alignment vertical="top" wrapText="1"/>`)=>`<xf numFmtId="0" fontId="${f}" fillId="${fi}" borderId="${b}" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">${a}</xf>`;const c=`<alignment horizontal="center" vertical="center" wrapText="1"/>`,r=`<alignment horizontal="right" vertical="top"/>`,m=`<alignment vertical="center"/>`;const xfs=[xf(0,0,0,m),xf(1,0,0,m),xf(2,0,0,m),xf(3,3,0,m),xf(4,2,1,c),xf(0,0,1),xf(0,4,1),xf(0,0,1,r),xf(5,5,1,c),xf(6,3,1,c),xf(7,6,1,c),xf(8,0,1),xf(2,4,1,c),xf(9,4,1,c),xf(6,0,1),xf(10,7,1),xf(0,4,1,r),xf(8,4,1),xf(5,5,1,c)];return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="${fonts.length}">${fonts.join("")}</fonts><fills count="${fills.length}">${fills.join("")}</fills><borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border>${border}</borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="${xfs.length}">${xfs.join("")}</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;}
  function cellXml(ref,cell){if(cell==null)return"";const{v,s=XS.cell,link}=typeof cell==="object"?cell:{v:cell};if(link){const label=String(v??link),formula=`HYPERLINK("${String(link).replace(/"/g,'""')}","${label.replace(/"/g,'""').slice(0,250)}")`;return `<c r="${ref}" s="${s}" t="str"><f>${xmlEsc(formula)}</f><v>${xmlEsc(label)}</v></c>`;}if(typeof v==="number"&&Number.isFinite(v))return `<c r="${ref}" s="${s}"><v>${v}</v></c>`;return `<c r="${ref}" s="${s}" t="inlineStr"><is><t xml:space="preserve">${xmlEsc(v)}</t></is></c>`;}
  function sheetXml(sheet){const rows=sheet.rows.map((row,i)=>{const n=i+1;if(!row)return `<row r="${n}"/>`;return `<row r="${n}"${row.height?` ht="${row.height}" customHeight="1"`:""}>${row.cells.map((c,j)=>cellXml(`${columnName(j+1)}${n}`,c)).join("")}</row>`;}).join("");const last=columnName(sheet.cols.length),freeze=sheet.freezeRow?`<pane ySplit="${sheet.freezeRow}" topLeftCell="A${sheet.freezeRow+1}" activePane="bottomLeft" state="frozen"/><selection pane="bottomLeft" activeCell="A${sheet.freezeRow+1}" sqref="A${sheet.freezeRow+1}"/>`:"";return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheetPr><pageSetUpPr fitToPage="1"/></sheetPr><dimension ref="A1:${last}${Math.max(1,sheet.rows.length)}"/><sheetViews><sheetView workbookViewId="0" showGridLines="0">${freeze}</sheetView></sheetViews><sheetFormatPr defaultRowHeight="18"/><cols>${sheet.cols.map((w,i)=>`<col min="${i+1}" max="${i+1}" width="${w}" customWidth="1"/>`).join("")}</cols><sheetData>${rows}</sheetData>${sheet.autoFilter?`<autoFilter ref="${sheet.autoFilter}"/>`:""}${sheet.merges?.length?`<mergeCells count="${sheet.merges.length}">${sheet.merges.map((r)=>`<mergeCell ref="${r}"/>`).join("")}</mergeCells>`:""}<pageMargins left="0.3" right="0.3" top="0.5" bottom="0.5" header="0.2" footer="0.2"/><pageSetup paperSize="9" orientation="landscape" fitToWidth="1" fitToHeight="0"/><drawing r:id="rId1"/></worksheet>`;}
  function letterheadRows(title,subtitle,columns,titleColumn=2){const lead=Array.from({length:titleColumn},()=>null),pad=(cells)=>[...cells,...Array.from({length:Math.max(0,columns-cells.length)},()=>null)];return[{height:22,cells:pad([])},{height:28,cells:pad([...lead,{v:title,s:XS.title}])},{height:20,cells:pad([...lead,{v:subtitle,s:XS.subtitle}])},{height:20,cells:pad([])},null];}
  function goalsSheet(report){
    const withDate=report.periods.some((period)=>period.multiDay);
    const headers=[...(withDate?["DATA","DIA"]:[]),"META","DISCIPLINA","TEMA",HEADERS.resumo,HEADERS.pasta,HEADERS.treino,HEADERS.juris];
    const cols=[...(withDate?[12,7]:[]),10,30,48,32,46,30,30];
    const rows=letterheadRows("Calendário de metas",`Período: ${report.scopeLabel} · Referência ${dateBR(report.referenceDate)} · ${dateTimeBR(report.generatedAt)} · ${report.driveNote}`,headers.length,2),merges=[];
    const statusCell=(cell)=>({v:cell.text,s:cell.done?XS.done:cell.warn?XS.warn:XS.missed});
    let headerRow=0;
    for(const period of report.periods){
      const start=rows.length+1;
      rows.push({height:26,cells:[{v:`${period.title.toUpperCase()} — ${period.range}`,s:XS.section},...Array.from({length:headers.length-1},()=>({v:"",s:XS.section}))]});merges.push(`A${start}:${columnName(headers.length)}${start}`);
      rows.push({height:34,cells:headers.map((v)=>({v,s:XS.header}))});if(!headerRow)headerRow=rows.length;
      if(!period.total)rows.push({cells:[{v:"Nenhuma meta neste período.",s:XS.cell}]});
      for(const day of period.days)for(const row of day.rows)rows.push({height:30,cells:[...(withDate?[{v:dateBR(day.date),s:XS.cell},{v:weekdayOf(day.date),s:XS.cell}]:[]),{v:`META ${row.number}`,s:XS.cell},{v:row.discipline,s:XS.cell},{v:row.theme,s:XS.cell},statusCell(row.resumo),row.folderUrl?{v:row.folderUrl,link:row.folderUrl,s:XS.link}:{v:NO_FOLDER,s:XS.warn},statusCell(row.treino),statusCell(row.juris)]});
      rows.push(null);
    }
    return {name:"Metas",cols,rows,merges,freezeRow:headerRow};
  }
  function buildWorkbookFiles(report,logoBytes){const sheets=[goalsSheet(report)],NS="http://schemas.openxmlformats.org",files=[{name:"[Content_Types].xml",data:`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="${NS}/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheets.map((_,i)=>`<Override PartName="/xl/worksheets/sheet${i+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/drawings/drawing${i+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>`).join("")}</Types>`},{name:"_rels/.rels",data:`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="${NS}/package/2006/relationships"><Relationship Id="rId1" Type="${NS}/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`},{name:"xl/workbook.xml",data:`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="${NS}/spreadsheetml/2006/main" xmlns:r="${NS}/officeDocument/2006/relationships"><bookViews><workbookView/></bookViews><sheets>${sheets.map((s,i)=>`<sheet name="${xmlEsc(s.name)}" sheetId="${i+1}" r:id="rId${i+1}"/>`).join("")}</sheets></workbook>`},{name:"xl/_rels/workbook.xml.rels",data:`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="${NS}/package/2006/relationships">${sheets.map((_,i)=>`<Relationship Id="rId${i+1}" Type="${NS}/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i+1}.xml"/>`).join("")}<Relationship Id="rId${sheets.length+1}" Type="${NS}/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`},{name:"xl/styles.xml",data:stylesXml()},{name:"xl/media/logo.png",data:logoBytes}];sheets.forEach((s,i)=>{const n=i+1;files.push({name:`xl/worksheets/sheet${n}.xml`,data:sheetXml(s)},{name:`xl/worksheets/_rels/sheet${n}.xml.rels`,data:`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="${NS}/package/2006/relationships"><Relationship Id="rId1" Type="${NS}/officeDocument/2006/relationships/drawing" Target="../drawings/drawing${n}.xml"/></Relationships>`},{name:`xl/drawings/drawing${n}.xml`,data:`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><xdr:wsDr xmlns:xdr="${NS}/drawingml/2006/spreadsheetDrawing" xmlns:a="${NS}/drawingml/2006/main" xmlns:r="${NS}/officeDocument/2006/relationships"><xdr:oneCellAnchor><xdr:from><xdr:col>0</xdr:col><xdr:colOff>57150</xdr:colOff><xdr:row>0</xdr:row><xdr:rowOff>57150</xdr:rowOff></xdr:from><xdr:ext cx="1600200" cy="586740"/><xdr:pic><xdr:nvPicPr><xdr:cNvPr id="2" name="Timbre Aldus Meta"/><xdr:cNvPicPr><a:picLocks noChangeAspect="1"/></xdr:cNvPicPr></xdr:nvPicPr><xdr:blipFill><a:blip r:embed="rId1"/><a:stretch><a:fillRect/></a:stretch></xdr:blipFill><xdr:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="1600200" cy="586740"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></xdr:spPr></xdr:pic><xdr:clientData/></xdr:oneCellAnchor></xdr:wsDr>`},{name:`xl/drawings/_rels/drawing${n}.xml.rels`,data:`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="${NS}/package/2006/relationships"><Relationship Id="rId1" Type="${NS}/officeDocument/2006/relationships/image" Target="../media/logo.png"/></Relationships>`});});return files;}

  const drive={token:"",expiresAt:0,client:null,pending:null}; const driveReady=()=>Boolean(drive.token&&Date.now()<drive.expiresAt-60000);
  function settleDrive(response){const resolve=drive.pending;drive.pending=null;if(response?.access_token){drive.token=response.access_token;drive.expiresAt=Date.now()+Number(response.expires_in||3600)*1000;resolve?.(true);return;}resolve?.(false);}
  function ensureDriveRead(){if(driveReady())return Promise.resolve(true);let clientId="";try{clientId=typeof GOOGLE_CLIENT_ID!=="undefined"?GOOGLE_CLIENT_ID:"";}catch{}if(!clientId||call("isGoogleClientConfigured")===false)return Promise.resolve(false);const request=()=>new Promise((resolve)=>{const oauth=globalThis.google?.accounts?.oauth2;if(!oauth){resolve(false);return;}drive.pending=resolve;drive.client ||= oauth.initTokenClient({client_id:clientId,scope:DRIVE_READ_SCOPE,include_granted_scopes:true,callback:settleDrive,error_callback:()=>settleDrive(null)});drive.client.requestAccessToken({prompt:""});setTimeout(()=>{if(drive.pending===resolve)settleDrive(null);},180000);});if(globalThis.google?.accounts?.oauth2)return request();return Promise.resolve(call("loadGoogleIdentityServices")).then(request,()=>false);}
  async function driveGet(url,as="json"){const response=await fetch(url,{headers:{Authorization:`Bearer ${drive.token}`}});if(response.status===401||response.status===403){if(response.status===401)drive.token="";const e=new Error(`Google Drive recusou a leitura (${response.status}).`);e.status=response.status;throw e;}if(!response.ok)throw new Error(`Google Drive respondeu ${response.status}.`);return as==="json"?response.json():response.arrayBuffer();}
  function setStatus(message,error=false){if(typeof globalThis.setGoalCalendarExportStatus==="function"){call("setGoalCalendarExportStatus",message,error);return;}const target=document.getElementById("goalCalendarExportStatus");if(!target)return;target.hidden=false;target.textContent=message;target.classList.toggle("error",error);}
  function collectPeriods(referenceDate,scope){const payload=call("buildGoalCalendarExportPayload",referenceDate),selected=call("selectedGoalCalendarPeriods",payload,scope);if(!payload||!Array.isArray(selected))throw new Error("O calendário ainda não está pronto.");return selected.map(([label,key,data])=>({label,key,data}));}
  const exportFilename=(report,ext)=>`calendario-${call("goalCalendarScopeLabel",report.scope)||report.scope}-${report.referenceDate}.${ext}`;
  function saveBlob(blob,filename){if(call("downloadGeneratedFile",blob,filename)!==undefined)return;if(typeof globalThis.downloadGeneratedFile==="function")return;const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);}
  function printReport(report){call("cleanupGoalCalendarPrint");document.getElementById("goalCalendarPrintableReport")?.remove();document.body.insertAdjacentHTML("beforeend",buildPrintHtml(report));document.body.classList.add("calendar-print-mode");const cleanup=()=>{document.body.classList.remove("calendar-print-mode");document.getElementById("goalCalendarPrintableReport")?.remove();};window.addEventListener("afterprint",cleanup,{once:true});setTimeout(()=>window.print(),120);}
  async function logoPngBytes(){const blob=await call("rasterizeSvgToPngBlob",logoSvg(),{width:600,height:220});return new Uint8Array(await blob.arrayBuffer());}
  async function renderPng(svg){const height=Number(svg.match(/viewBox="0 0 1600 (\d+)"/)?.[1])||2000;const scale=height>18000?Math.max(.85,18000/height):1.5;return call("rasterizeSvgToPngBlob",svg,{width:Math.round(1600*scale),height:Math.round(height*scale)});}
  async function prepareReport(){
    const appState=currentState();if(!appState)throw new Error("Os dados ainda estão carregando.");
    const referenceDate=document.getElementById("calendarDate")?.value||todayISO(),scope=document.getElementById("goalCalendarExportScope")?.value||"daily",scopeLabel={daily:"Somente dia",weekly:"Somente semana",monthly:"Somente mês",all:"Dia + semana + mês"}[scope]||scope;
    const periods=collectPeriods(referenceDate,scope),linker=createGoalLinker(appState),goalLinks=new Map();
    periods.forEach(({data})=>(data.days||[]).forEach((day)=>(day.goals||[]).filter((goal)=>!isPieceGoal(goal)).forEach((goal)=>{const key=goalKey(goal);if(!goalLinks.has(key))goalLinks.set(key,linker.links(goal));})));
    let goalDrive=new Map(),driveState="off";
    if([...goalLinks.values()].some((links)=>links.length)){
      setStatus("Solicitando leitura do Google Drive para conferir treino e jurisprudência…");
      if(await ensureDriveRead()){
        try{const outcome=await createDriveReader({get:driveGet}).resolveGoals(goalLinks,(done,total)=>setStatus(`Conferindo as pastas destino no Google Drive: ${done} de ${total}…`));goalDrive=outcome.results;driveState=outcome.state;}
        catch(e){console.warn(`[Aldus ${VERSION}] Drive falhou.`,e);driveState="error";}
      }
    }
    return buildReport({periods,referenceDate,scope,scopeLabel,linker,goalDrive,driveState});
  }
  const ORIGINAL_EXPORTERS={pdf:"exportGoalCalendarPdf",excel:"exportGoalCalendarExcel",image:"exportGoalCalendarImage"}; let running=false;
  async function runExport(kind){if(running)return;running=true;try{const report=await prepareReport(),drivePart=report.driveState==="on"?"com arquivos conferidos no Google Drive":"sem conferência do Google Drive";if(kind==="pdf"){setStatus(`PDF pronto (${drivePart}).`);printReport(report);}else if(kind==="excel"){const zip=globalThis.spreadsheetZipArchive;if(typeof zip!=="function")throw new Error("gerador de planilha indisponível");const archive=zip(buildWorkbookFiles(report,await logoPngBytes()));saveBlob(new Blob([archive],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}),exportFilename(report,"xlsx"));setStatus(`Excel completo gerado (${drivePart}).`);}else{const blob=await renderPng(buildSvg(report));saveBlob(blob,exportFilename(report,"png"));setStatus(`Imagem gerada (${drivePart}).`);}}catch(e){console.error(`[Aldus ${VERSION}] Exportação falhou.`,e);setStatus(`Falha na exportação nova (${e?.message||e}).`,true);try{await call(ORIGINAL_EXPORTERS[kind]);}catch{}}finally{running=false;}}
  function interceptExportClick(event){const button=event.target?.closest?.("#exportGoalCalendarPdf, #exportGoalCalendarExcel, #exportGoalCalendarImage");if(!button)return;event.preventDefault();event.stopImmediatePropagation();runExport(BUTTONS[button.id]);}
  function preloadGoogleWhenCalendarOpens(view){if(view!=="calendario-metas"||call("isGoogleClientConfigured")===false)return;Promise.resolve(call("loadGoogleIdentityServices")).catch(()=>{});}

  const api=Object.freeze({VERSION,DONE,NOT_DONE,NO_FOLDER,HEADERS,DRIVE_NOTES,createGoalLinker,createDriveReader,productKind,isTrainingFile,driveIdFrom,goalRow,buildReport,buildPrintHtml,buildSvg,buildWorkbookFiles,runExport});
  globalThis[FLAG]=api;
  if(typeof module!=="undefined"&&module.exports){module.exports=api;return;}
  if(typeof document==="undefined")return;
  document.addEventListener("click",interceptExportClick,true);
  window.addEventListener("aldus:view-active",(event)=>preloadGoogleWhenCalendarOpens(event?.detail?.view));
  if(String(location.hash||"").replace(/^#/,"")==="calendario-metas")preloadGoogleWhenCalendarOpens("calendario-metas");
})();
