from pathlib import Path


def patch_js(path: Path):
    s = path.read_text(encoding='utf-8')
    old = s
    s = s.replace(
        '/* V623.3 — Calendário de Metas: PDF paisagem mais leve, status explícito e exportações legíveis. */',
        '/* V623.4 — Calendário de Metas: PDF paisagem compacto em duas colunas, status explícito e exportações legíveis. */',
    )
    s = s.replace(
        'const VERSION = "20260915-calendario-exportacoes-v623-3";',
        'const VERSION = "20260915-calendario-exportacoes-v623-4";',
    )

    old_print = '@media print{@page{size:A4 landscape;margin:8mm 8mm 12mm;@bottom-right{content:"Página " counter(page);font:7.5pt Arial;color:#475569}}body.calendar-print-mode{min-width:0!important;width:auto!important;margin:0!important;padding:0!important}body.calendar-print-mode #goalCalendarPrintableReport.aldus-cal-v623{display:block!important;width:100%!important;max-width:281mm!important;margin:0 auto!important}}'
    new_print = '@media print{@page{size:A4 landscape;margin:22mm 8mm 14mm;@bottom-right{content:"Página " counter(page);font:7.5pt Arial;color:#475569}}body.calendar-print-mode{min-width:0!important;width:auto!important;margin:0!important;padding:0!important}body.calendar-print-mode #goalCalendarPrintableReport.aldus-cal-v623{display:block!important;width:100%!important;max-width:281mm!important;margin:0 auto!important}}'
    if old_print not in s:
        raise SystemExit(f'{path}: regra @media print V623.3 não encontrada')
    s = s.replace(old_print, new_print, 1)

    css_end = '.aldus-cal-v623 .acv-cover,.aldus-cal-v623 .acv-section-title,.aldus-cal-v623 .acv-kpi,.aldus-cal-v623 .acv-record{border-radius:1mm!important}`; }'
    css_new = '.aldus-cal-v623 .acv-cover,.aldus-cal-v623 .acv-section-title,.aldus-cal-v623 .acv-kpi,.aldus-cal-v623 .acv-record{border-radius:1mm!important}.aldus-cal-v623 .acv-page-head{position:fixed;top:-17mm;left:0;right:0;height:14mm;background:#fff;z-index:20}.aldus-cal-v623 .acv-page-head .acv-letterhead{margin:0;padding:0 0 1.8mm}.aldus-cal-v623 .acv-page-foot{position:fixed;left:0;right:0;bottom:-9mm;display:flex;justify-content:space-between;border-top:.25mm solid ${COLORS.line};padding-top:1.5mm;color:${COLORS.muted}!important;font-size:7pt;background:#fff}.aldus-cal-v623 .acv-main{display:block;width:100%;min-width:0}.aldus-cal-v623 .acv-factory-table{width:calc(100% + 5mm);border-collapse:separate;border-spacing:2.5mm 2mm;table-layout:fixed;margin:-2mm -2.5mm 2mm}.aldus-cal-v623 .acv-factory-table>tbody>tr{break-inside:avoid;page-break-inside:avoid}.aldus-cal-v623 .acv-factory-table>tbody>tr>td{width:50%;vertical-align:top;padding:0;background:none;border:0}.aldus-cal-v623 .acv-factory-table .acv-record{margin:0;break-inside:avoid;page-break-inside:avoid}.aldus-cal-v623 .acv-factory-table .acv-record dl{grid-template-columns:34mm minmax(0,1fr)}.aldus-cal-v623 .acv-factory-table .acv-record dt,.aldus-cal-v623 .acv-factory-table .acv-record dd{padding:.75mm 1.4mm;line-height:1.18}.aldus-cal-v623 .acv-factory-table .acv-record dt{font-size:6.1pt}.aldus-cal-v623 .acv-factory-table .acv-record dd{font-size:7.1pt}.aldus-cal-v623 .acv-factory-table .acv-record dd.statement{font-size:7pt;padding:.9mm 1.4mm}.aldus-cal-v623 .acv-factory-table .acv-record a{font-size:6.8pt}`; }'
    if css_end not in s:
        raise SystemExit(f'{path}: final do CSS V623.3 não encontrado')
    s = s.replace(css_end, css_new, 1)

    start = s.find('  function recordHtml({view})')
    end = s.find('\n\n  const approxWidth', start)
    if start < 0 or end < 0:
        raise SystemExit(f'{path}: bloco de impressão não encontrado')

    replacement = r'''  function recordHtml({view}) { return `<article class="acv-record"><dl>${view.fields.map((f)=>f.statement?`<dd class="statement">${esc(f.value)}</dd>`:`<dt>${esc(f.label)}:</dt><dd class="${f.tone||""}">${f.href?`<a href="${esc(f.href)}">${esc(f.value)}</a>`:esc(f.value)}</dd>`).join("")}</dl></article>`; }
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
  }'''
    s = s[:start] + replacement + s[end:]
    if s == old:
        raise SystemExit(f'{path}: nenhuma alteração aplicada')
    path.write_text(s, encoding='utf-8')


for target in [Path('goal-calendar-export-v623.js'), Path('docs/goal-calendar-export-v623.js')]:
    patch_js(target)

Path('docs/goal-calendar-export-v623.js').write_text(
    Path('goal-calendar-export-v623.js').read_text(encoding='utf-8'), encoding='utf-8'
)

for p in [Path('performance-emergency-v350.js'), Path('docs/performance-emergency-v350.js')]:
    t = p.read_text(encoding='utf-8')
    oldq = 'goal-calendar-export-v623.js?v=20260915-calendario-exportacoes-v623-3'
    newq = 'goal-calendar-export-v623.js?v=20260915-calendario-exportacoes-v623-4'
    if oldq not in t:
        raise SystemExit(f'{p}: cache-bust V623.3 não encontrado')
    p.write_text(t.replace(oldq, newq, 1), encoding='utf-8')


tp = Path('tests/v623-calendar-export.test.js')
t = tp.read_text(encoding='utf-8')
t = t.replace('V623.3', 'V623.4')
t = t.replace('20260915-calendario-exportacoes-v623-3', '20260915-calendario-exportacoes-v623-4')
old_assert = '  assert.match(html,/<thead><tr><td><div class="acv-letterhead"><div class="acv-logo">/);'
new_assert = '  assert.match(html,/class="acv-page-head"/);\n  assert.match(html,/class="acv-factory-table"/);\n  assert.doesNotMatch(html,/class="acv-sheet"/);\n  assert.match(html,/position:fixed/);\n  assert.match(html,/grid-template-columns:34mm minmax\\(0,1fr\\)/);'
if old_assert not in t:
    raise SystemExit('teste PDF: assert do timbre antigo não encontrado')
t = t.replace(old_assert, new_assert, 1)
tp.write_text(t, encoding='utf-8')
