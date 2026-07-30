(() => {
  "use strict";
  const ns = globalThis.__AldusQuestionHistoryReportV198;
  if (!ns?.coreReady || ns.exportReady) return;
  const STATUS_ID = "questionHistoryFilterExportStatusV198";
  const BLANK_MARK = "__blank__";
  const { text, html, xml, canonicalLocal, formatDateLocal, filterDescription, groupRows, summarize, buildCsv } = ns;
  const renderReport = (...args) => ns.renderReport(...args);
  function filenameBase(report) {
    const discipline = report.filters?.discipline ? canonicalLocal(report.filters.discipline).replaceAll(" ", "-").slice(0, 45) : "geral";
    const date = new Date().toISOString().slice(0, 10);
    return `historico-questoes-${discipline}-${date}`;
  }
  function groupTablePrint(rows, field, title) {
    return `<h2>${html(title)}</h2><table><thead><tr><th>${html(title.replace("Por ", ""))}</th><th>Questões</th><th>Certas</th><th>Erradas</th><th>Brancos</th><th>Dúvidas</th><th>Acerto</th><th>Líquido</th></tr></thead><tbody>${groupRows(rows, field).map((entry) => `<tr><td>${html(entry.label)}</td><td>${entry.total}</td><td>${entry.correct}</td><td>${entry.wrong}</td><td>${entry.blank}</td><td>${entry.doubt}</td><td>${entry.accuracy}%</td><td>${entry.net}</td></tr>`).join("") || '<tr><td colspan="8">Sem dados.</td></tr>'}</tbody></table>`;
  }
  function openPdf(report) {
    const printWindow = window.open("", "_blank");
    if (!printWindow) throw new Error("O navegador bloqueou a janela de impressão.");
    const s = report.summary;
    const details = report.rows.map((row) => `<tr><td>${formatDateLocal(row.date)}</td><td>${html(row.code || "-")}</td><td>${html(row.discipline)}</td><td>${html(row.subject)}</td><td>${html(row.board || "-")}</td><td>${html(row.statusLabel)}</td><td>${html(row.marked === BLANK_MARK ? "Em branco" : row.marked || "-")}</td><td>${html(row.answerKey || "-")}</td><td>${row.total}</td><td>${html(row.sourceLabel)}</td><td>${html(row.statement || row.notes || row.explanation || "-")}</td></tr>`).join("");
    printWindow.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Relatório de questões</title><style>@page{size:A4;margin:14mm}*{box-sizing:border-box}body{font:10pt Arial,sans-serif;color:#111827;margin:0}header{border-bottom:3px solid #0b4f85;padding-bottom:9px;margin-bottom:12px}h1{font-size:19pt;margin:0;color:#082b49}h2{font-size:12pt;color:#082b49;margin:16px 0 7px}.meta{color:#526174;margin:5px 0}.cards{display:grid;grid-template-columns:repeat(4,1fr);gap:7px}.card{border:1px solid #ccd8e4;border-radius:8px;padding:7px}.card span{display:block;color:#61758a;font-size:8pt}.card strong{display:block;font-size:14pt;color:#082b49}table{width:100%;border-collapse:collapse;margin:5px 0 14px;page-break-inside:auto}thead{display:table-header-group}tr{page-break-inside:avoid}th,td{border:1px solid #cfd8e3;padding:4px;vertical-align:top;text-align:left;font-size:7.5pt}th{background:#eaf2f8;color:#082b49}.details{table-layout:fixed}.details td:last-child{word-break:break-word}footer{margin-top:12px;color:#667085;font-size:8pt}</style></head><body><header><h1>Aldus Meta — Relatório de Questões</h1><p class="meta">${html(filterDescription(report.filters))}</p><p class="meta">Gerado em ${html(new Date().toLocaleString("pt-BR"))}</p></header><section class="cards">${[["Registros",s.records],["Questões",s.total],["Certas",s.correct],["Erradas",s.wrong],["Brancos",s.blank],["Dúvidas",s.doubt],["Acerto",`${s.accuracy}%`],["Líquido",s.net]].map(([label,value])=>`<div class="card"><span>${label}</span><strong>${value}</strong></div>`).join("")}</section>${groupTablePrint(report.rows,"discipline","Por disciplina")}${groupTablePrint(report.rows,"subject","Por assunto")}${groupTablePrint(report.rows,"board","Por banca")}<h2>Questões e sessões filtradas</h2><table class="details"><thead><tr><th>Data</th><th>Código</th><th>Disciplina</th><th>Assunto</th><th>Banca</th><th>Resultado</th><th>Marcada</th><th>Gabarito</th><th>Total</th><th>Origem</th><th>Enunciado/observação</th></tr></thead><tbody>${details || '<tr><td colspan="11">Nenhum resultado.</td></tr>'}</tbody></table><footer>Relatório gerado localmente. Nenhum dado foi alterado.</footer><script>window.addEventListener('load',()=>setTimeout(()=>window.print(),180));<\/script></body></html>`);
    printWindow.document.close();
  }
  function wrapSvgText(value, maxChars = 38, maxLines = 2) {
    const words = text(value).split(/\s+/).filter(Boolean); const lines = []; let current = "";
    words.forEach((word) => { const next = current ? `${current} ${word}` : word; if (next.length > maxChars && current) { lines.push(current); current = word; } else current = next; });
    if (current) lines.push(current); if (lines.length > maxLines) { lines.length = maxLines; lines[maxLines - 1] = `${lines[maxLines - 1].slice(0, Math.max(1, maxChars - 1))}…`; } return lines;
  }
  function buildReportSvg(report = {}) {
    const width = 1600; const rows = report.rows || []; const summary = report.summary || summarize(rows);
    const groups = [["Disciplina", groupRows(rows,"discipline")],["Assunto",groupRows(rows,"subject")],["Banca",groupRows(rows,"board")]];
    const detailRows = rows.slice(0,18); const height = 1200 + detailRows.length * 52;
    const cardData = [["REGISTROS",summary.records],["QUESTÕES",summary.total],["CERTAS",summary.correct],["ERRADAS",summary.wrong],["BRANCOS",summary.blank],["DÚVIDAS",summary.doubt],["ACERTO",`${summary.accuracy}%`],["LÍQUIDO",summary.net]];
    let out = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="#f4f8fc"/><rect x="50" y="45" width="1500" height="145" rx="26" fill="#082b49"/><text x="90" y="105" fill="#fff" font-family="Arial" font-size="44" font-weight="800">Aldus Meta — Relatório de Questões</text><text x="90" y="150" fill="#d9e8f5" font-family="Arial" font-size="22">${xml(filterDescription(report.filters || {}))}</text>`;
    cardData.forEach(([label,value],index)=>{const x=50+(index%4)*380,y=220+Math.floor(index/4)*120;out+=`<rect x="${x}" y="${y}" width="350" height="92" rx="18" fill="#fff" stroke="#c9d8e8"/><text x="${x+22}" y="${y+32}" fill="#60758a" font-family="Arial" font-size="17" font-weight="700">${label}</text><text x="${x+22}" y="${y+70}" fill="#082b49" font-family="Arial" font-size="34" font-weight="800">${value}</text>`;});
    groups.forEach(([title,data],groupIndex)=>{const x=50+groupIndex*510,y=480;out+=`<text x="${x}" y="${y}" fill="#082b49" font-family="Arial" font-size="25" font-weight="800">Por ${title.toLowerCase()}</text>`;const top=data.slice(0,6),max=Math.max(1,...top.map(e=>e.total));top.forEach((entry,index)=>{const yy=y+38+index*58;const label=wrapSvgText(entry.label,28,1)[0]||"-";out+=`<text x="${x}" y="${yy}" fill="#334e68" font-family="Arial" font-size="16">${xml(label)}</text><rect x="${x}" y="${yy+10}" width="430" height="12" rx="6" fill="#dfe8f0"/><rect x="${x}" y="${yy+10}" width="${Math.max(4,entry.total/max*430)}" height="12" rx="6" fill="#2374b6"/><text x="${x+445}" y="${yy+21}" fill="#082b49" font-family="Arial" font-size="16" font-weight="700">${entry.total}</text>`;});});
    const tableY=900;out+=`<text x="50" y="${tableY}" fill="#082b49" font-family="Arial" font-size="27" font-weight="800">Questões e sessões filtradas</text><rect x="50" y="${tableY+24}" width="1500" height="46" fill="#dcebf6"/><text x="68" y="${tableY+54}" fill="#082b49" font-family="Arial" font-size="16" font-weight="800">DATA</text><text x="190" y="${tableY+54}" fill="#082b49" font-family="Arial" font-size="16" font-weight="800">CÓDIGO</text><text x="390" y="${tableY+54}" fill="#082b49" font-family="Arial" font-size="16" font-weight="800">DISCIPLINA / ASSUNTO</text><text x="930" y="${tableY+54}" fill="#082b49" font-family="Arial" font-size="16" font-weight="800">RESULTADO</text><text x="1120" y="${tableY+54}" fill="#082b49" font-family="Arial" font-size="16" font-weight="800">ORIGEM</text>`;
    detailRows.forEach((row,index)=>{const y=tableY+70+index*52;out+=`<rect x="50" y="${y}" width="1500" height="52" fill="${index%2?'#f7fafc':'#fff'}" stroke="#e1e8ef"/><text x="68" y="${y+31}" fill="#334e68" font-family="Arial" font-size="15">${formatDateLocal(row.date)}</text><text x="190" y="${y+31}" fill="#334e68" font-family="Arial" font-size="15">${xml((row.code||'-').slice(0,18))}</text><text x="390" y="${y+22}" fill="#172033" font-family="Arial" font-size="15" font-weight="700">${xml(wrapSvgText(row.discipline,48,1)[0]||'-')}</text><text x="390" y="${y+42}" fill="#60758a" font-family="Arial" font-size="14">${xml(wrapSvgText(row.subject,58,1)[0]||'-')}</text><text x="930" y="${y+31}" fill="#172033" font-family="Arial" font-size="15" font-weight="700">${xml(row.statusLabel)}</text><text x="1120" y="${y+31}" fill="#334e68" font-family="Arial" font-size="15">${xml(wrapSvgText(row.sourceLabel,34,1)[0]||'-')}</text>`;});
    if(rows.length>detailRows.length)out+=`<text x="50" y="${height-55}" fill="#60758a" font-family="Arial" font-size="18">Imagem resumida: ${detailRows.length} de ${rows.length} registros exibidos. PDF e Excel incluem todos.</text>`;out+=`</svg>`;return out;
  }
  async function localSvgToPng(svg) {
    return new Promise((resolve,reject)=>{const image=new Image();const url=URL.createObjectURL(new Blob([svg],{type:"image/svg+xml;charset=utf-8"}));image.onload=()=>{const canvas=document.createElement("canvas");canvas.width=1600;canvas.height=Math.round(1600*image.height/image.width);const context=canvas.getContext("2d");context.fillStyle="#fff";context.fillRect(0,0,canvas.width,canvas.height);context.drawImage(image,0,0,canvas.width,canvas.height);URL.revokeObjectURL(url);canvas.toBlob((blob)=>blob?resolve(blob):reject(new Error("Não foi possível gerar PNG.")),"image/png");};image.onerror=()=>{URL.revokeObjectURL(url);reject(new Error("Não foi possível renderizar o relatório."));};image.src=url;});
  }
  function downloadBlob(blob, filename) {
    if (typeof downloadGeneratedFile === "function") return downloadGeneratedFile(blob, filename);
    const url=URL.createObjectURL(blob);const link=document.createElement("a");link.href=url;link.download=filename;document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  async function exportReport(format) {
    const report = renderReport();
    const status = document.getElementById(STATUS_ID);
    if (status) status.textContent = `Preparando ${format === "xlsx" ? "Excel" : format.toUpperCase()}…`;
    try {
      const base = filenameBase(report);
      if (format === "pdf") openPdf(report);
      else if (format === "xlsx") {
        const csv = buildCsv(report);
        if (typeof downloadGeneratedExcel === "function") await downloadGeneratedExcel(csv, `${base}.xlsx`, { title: "Relatório de questões", sheetName: "Questões filtradas", generatedAt: report.generatedAt });
        else downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8" }), `${base}.csv`);
      } else if (format === "png") {
        const svg = buildReportSvg(report);
        const blob = typeof svgToPngBlob === "function" ? await svgToPngBlob(svg, { width: 2400 }) : await localSvgToPng(svg);
        downloadBlob(blob, `${base}.png`);
      }
      if (status) status.textContent = `${format === "xlsx" ? "Excel" : format.toUpperCase()} preparado com ${report.summary.total} questão(ões) conforme os filtros.`;
    } catch (error) {
      console.error("[Aldus V198] Falha ao exportar relatório de questões.", error);
      if (status) status.textContent = `Não foi possível gerar o arquivo: ${error.message}`;
    }
  }
  Object.assign(ns, { filenameBase, groupTablePrint, openPdf, wrapSvgText, buildReportSvg, localSvgToPng, downloadBlob, exportReport });
  ns.exportReady = true;
})();
