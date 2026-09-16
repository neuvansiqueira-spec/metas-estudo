/* V623.7 — Calendário de Metas no formato simples pedido em 16/09/2026: por meta do período escolhido (sem PEÇA),
   RESUMO (AULA + JURISPRUDÊNCIA) pelo "Aprovado" da Fábrica com a data do arquivo na pasta, LINK DA PASTA DESTINO,
   TREINO DE QUESTÕES e JURISPRUDÊNCIA pelo arquivo na pasta destino do Google Drive. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const api = require('../goal-calendar-export-v623.js');

const WORD = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', FOLDER = 'application/vnd.google-apps.folder';
const driveFolder = (id) => `https://drive.google.com/drive/folders/${id}`;
const canonText = (v) => String(v || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

function state() {
  return {
    syllabusItems: [{ id: 's-dgf', subject: 'Direitos e garantias fundamentais' }, { id: 's-lei', subject: 'Lei de Interceptação Telefônica' }],
    factoryAgenda: [
      { id: 'pri', disciplina: 'DIREITO PROCESSUAL PENAL', tema: 'Princípios Fundamentais do Processo Penal', factoryDestinationFolder: driveFolder('PASTA_PRI_00001'), modules: { resumoAula: { status: 'Aprovado', dataConclusao: '' } } },
      { id: 'col', disciplina: 'DIREITO PROCESSUAL PENAL', tema: 'Colaboração Premiada', factoryDestinationFolder: driveFolder('PASTA_COL_00001'), modules: { resumoAula: { status: 'Aprovado', dataConclusao: '2026-08-17' } } },
      { id: 'peca', disciplina: 'PEÇA PARA DELEGADO DE POLÍCIA CIVIL', tema: 'Relatório Final de Inquérito Policial', factoryDestinationFolder: driveFolder('PASTA_PECA_0001'), modules: { resumoAula: { status: 'Não iniciado' }, peca: { status: 'Aprovado' } } },
      { id: 'apf', disciplina: 'PEÇA PARA DELEGADO DE POLÍCIA CIVIL', tema: 'Auto de Prisão em Flagrante', factoryDestinationFolder: driveFolder('PASTA_APF_00001'), modules: { resumoAula: { status: 'Não se aplica' } } },
      { id: 'eca', disciplina: 'DIREITO PROCESSUAL PENAL', tema: 'Apuração de Atos Infracionais – ECA', factoryDestinationFolder: driveFolder('PASTA_ECA_00001'), modules: { resumoAula: { status: 'Aprovado' } } },
      { id: 'soc', disciplina: 'DIREITO CONSTITUCIONAL', tema: 'Direitos sociais', factoryDestinationFolder: driveFolder('PASTA_SOC_00001'), modules: { resumoAula: { status: 'Não se aplica' } } },
      { id: 'dgf', disciplina: 'DIREITO CONSTITUCIONAL', tema: 'Direitos e garantias fundamentais', syllabusItemId: 's-dgf', factoryDestinationFolder: driveFolder('PASTA_DGF_00001'), modules: { resumoAula: { status: 'Aprovado' } } },
      { id: 'nac', disciplina: 'DIREITO CONSTITUCIONAL', tema: 'Nacionalidade', syllabusItemId: 's-dgf', factoryDestinationFolder: driveFolder('PASTA_NAC_00001'), modules: {} },
      { id: 'lei', disciplina: 'LEGISLAÇÃO ESPECÍFICA – DIREITO PROCESSUAL PENAL', tema: 'Lei nº 9.296/1996', syllabusItemId: 's-lei', factoryDestinationFolder: driveFolder('PASTA_LEI_00001'), modules: { lei: { status: 'Aprovado' } } }
    ]
  };
}
const goal = (discipline, subject, date = '2026-09-17', syllabusItemId = '') => ({ date, syllabusItemId, discipline, subject, type: 'Estudo novo', plannedMinutes: 75, actualMinutes: 0, status: 'Pendente', priority: 'Alta' });
const file = (id, name, mimeType = WORD, createdTime = '2026-09-01T10:00:00Z') => ({ id, name, mimeType, createdTime, modifiedTime: createdTime, webViewLink: `https://drive.google.com/file/d/${id}/view` });
function fakeDrive() {
  const folders = {
    PASTA_PRI_00001: [file('p1', 'MAPA_HIERARQUICO_RESUMO_AULA_PRINCIPIOS.docx', WORD, '2026-09-15T14:15:39Z'), file('p2', 'TREINO_DIREITO PROCESSUAL PENAL_PRINCÍPIOS.json', 'application/json', '2026-09-15T19:26:00Z'), file('p3', 'TREINO_DIREITO PROCESSUAL PENAL_PRINCÍPIOS.html', 'text/html', '2026-09-15T19:23:51Z'), file('p4', 'TREINO_DIREITO PROCESSUAL PENAL_PRINCÍPIOS_01_TRIAGEM_QC.txt', 'text/plain', '2026-09-16T08:00:00Z')],
    PASTA_COL_00001: [file('c1', 'MAPA_MENTAL_JURISPRUDENCIAS_COLABORACAO_PREMIADA.pdf', 'application/pdf', '2026-08-20T09:00:00Z'), file('c2', 'MAPA_HIERARQUICO_RESUMO_AULA_COLABORACAO_PREMIADA.docx', WORD, '2026-08-16T08:00:00Z')],
    PASTA_ECA_00001: [], PASTA_SOC_00001: [],
    PASTA_PECA_0001: [file('r1', 'MAPA_TOPIFICADO_PECA_RELATORIO_FINAL_INQUERITO_POLICIAL.docx')],
    PASTA_APF_00001: [], PASTA_DGF_00001: [file('d1', 'MAPA_HIERARQUICO_RESUMO_AULA_DGF.docx'), file('d2', '8_2_3_NACIONALIDADE', FOLDER)], PASTA_NAC_00001: [],
    PASTA_LEI_00001: [file('l1', 'Lei-n-9-296-de-1996-Interceptacao-Telefonica.pdf', 'application/pdf')]
  };
  return async (url) => {
    const u = decodeURIComponent(url), list = u.match(/'([\w-]+)' in parents/);
    if (list) return { files: folders[list[1]] || [] };
    throw new Error('url inesperada ' + u);
  };
}
async function report({ goals, key = 'daily', driveState = 'on', start = '2026-09-17', end = '2026-09-17' }) {
  const appState = state(), linker = api.createGoalLinker(appState), links = new Map();
  goals.forEach((g) => links.set([g.date, g.syllabusItemId, canonText(g.discipline), canonText(g.subject)].join('|'), linker.links(g)));
  const out = driveState === 'on' ? await api.createDriveReader({ get: fakeDrive() }).resolveGoals(links) : { results: new Map(), state: driveState };
  const dates = [...new Set(goals.map((g) => g.date))];
  const days = [...dates.map((date) => ({ date, dayType: 'Folga', goals: goals.filter((g) => g.date === date) })), { date: '2026-09-19', goals: [] }];
  return api.buildReport({ periods: [{ label: key === 'daily' ? 'DIA' : 'SEMANA', key, data: { start, end, days } }], referenceDate: '2026-09-17', scope: key, scopeLabel: key === 'daily' ? 'Somente dia' : 'Somente semana', linker, goalDrive: out.results, driveState: out.state, generatedAt: '2026-09-16T12:30:00Z' });
}
const rowsOf = (r) => r.periods.flatMap((p) => p.days.flatMap((d) => d.rows));

test('V623.7 RESUMO segue o "Aprovado" do RESUMO/AULA, com a data do arquivo na pasta do Drive', async () => {
  const r = await report({ goals: [goal('DIREITO PROCESSUAL PENAL', 'Princípios Fundamentais do Processo Penal'), goal('DIREITO PROCESSUAL PENAL', 'Colaboração Premiada'), goal('DIREITO PROCESSUAL PENAL', 'Apuração de Atos Infracionais – ECA'), goal('DIREITO CONSTITUCIONAL', 'Direitos sociais'), goal('DIREITO PENAL', 'Tema fora da Fábrica')] });
  const [pri, col, eca, soc, fora] = rowsOf(r);
  assert.equal(pri.resumo.text, 'REALIZADO NO DIA 15/09/2026');
  // A data da Fábrica (17/08) não vale: vale a do arquivo do resumo na pasta (16/08).
  assert.equal(col.resumo.text, 'REALIZADO NO DIA 16/08/2026');
  assert.equal(eca.resumo.text, 'REALIZADO (DATA NÃO ENCONTRADA NA PASTA DO DRIVE)');
  // Só existem REALIZADO e NÃO REALIZADO: "Não se aplica" na Fábrica sai como NÃO REALIZADO.
  assert.equal(soc.resumo.text, 'NÃO REALIZADO');
  assert.equal(fora.resumo.text, 'NÃO REALIZADO');
  assert.equal(fora.folderUrl, '');
});

test('V623.7 metas de PEÇA ficam fora do levantamento, sem buraco na numeração', async () => {
  const r = await report({ key: 'weekly', start: '2026-09-13', end: '2026-09-19', goals: [goal('PEÇA PARA DELEGADO DE POLÍCIA CIVIL', 'Relatório Final de Inquérito Policial', '2026-09-17'), goal('DIREITO PROCESSUAL PENAL', 'Colaboração Premiada', '2026-09-17'), goal('PEÇA PARA DELEGADO DE POLÍCIA CIVIL', 'Auto de Prisão em Flagrante', '2026-09-17'), goal('PEÇA PARA DELEGADO DE POLÍCIA CIVIL', 'Auto de Prisão em Flagrante', '2026-09-18')] });
  assert.deepEqual(r.periods[0].days.map((d) => [d.date, d.rows.map((x) => [x.number, x.theme])]), [['2026-09-17', [[1, 'Colaboração Premiada']]]]);
  const html = api.buildPrintHtml(r);
  assert.ok(!html.includes('PEÇA') && !html.includes('Relatório Final'));
});

test('V623.7 TREINO e JURISPRUDÊNCIA vêm do arquivo na pasta destino, com a data do arquivo', async () => {
  const r = await report({ goals: [goal('DIREITO PROCESSUAL PENAL', 'Princípios Fundamentais do Processo Penal'), goal('DIREITO PROCESSUAL PENAL', 'Colaboração Premiada'), goal('DIREITO PROCESSUAL PENAL', 'Lei de Interceptação Telefônica', '2026-09-17', 's-lei')] });
  const [pri, col, lei] = rowsOf(r);
  assert.equal(pri.treino.text, 'REALIZADO NO DIA 15/09/2026');
  assert.equal(pri.juris.text, 'NÃO REALIZADO');
  assert.equal(col.treino.text, 'NÃO REALIZADO');
  assert.equal(col.juris.text, 'REALIZADO NO DIA 20/08/2026');
  // Texto da lei na pasta não é resumo nem jurisprudência.
  assert.equal(lei.juris.text, 'NÃO REALIZADO');
  assert.equal(lei.folderUrl, driveFolder('PASTA_LEI_00001'));
});

test('V623.7 sem Google Drive não inventa: NÃO CONFERIDO onde há pasta', async () => {
  const r = await report({ goals: [goal('DIREITO PROCESSUAL PENAL', 'Colaboração Premiada'), goal('DIREITO PENAL', 'Tema fora da Fábrica')], driveState: 'off' });
  const [col, fora] = rowsOf(r);
  assert.equal(col.resumo.text, 'REALIZADO (DATA NÃO CONFERIDA — Google Drive não autorizado)');
  assert.equal(col.treino.text, 'NÃO CONFERIDO (Google Drive não autorizado)'); assert.equal(col.treino.warn, true);
  assert.equal(fora.treino.text, 'NÃO REALIZADO');
});

test('V623.7 meta liga ao tema pelo item do edital, sem pegar subtema irmão', () => {
  const linker = api.createGoalLinker(state());
  assert.deepEqual(linker.links(goal('DIREITO PROCESSUAL PENAL', 'Lei de Interceptação Telefônica', '2026-09-17', 's-lei')).map((l) => [l.item.id, l.relation]), [['lei', 'item']]);
  assert.deepEqual(linker.links(goal('CONSTITUCIONAL', 'Nacionalidade', '2026-09-17', 's-dgf')).map((l) => l.item.id), ['nac']);
  assert.deepEqual(linker.links(goal('DIREITO CONSTITUCIONAL', 'Direitos políticos', '2026-09-17', 's-dgf')).map((l) => l.item.id), ['dgf']);
});

test('V623.7 só entram as metas do período; numeração recomeça em cada dia; dias vazios somem', async () => {
  const r = await report({ key: 'weekly', start: '2026-09-13', end: '2026-09-19', goals: [goal('DIREITO PROCESSUAL PENAL', 'Colaboração Premiada', '2026-09-17'), goal('DIREITO PROCESSUAL PENAL', 'Princípios Fundamentais do Processo Penal', '2026-09-17'), goal('DIREITO PROCESSUAL PENAL', 'Colaboração Premiada', '2026-09-18')] });
  assert.equal(r.periods.length, 1);
  assert.deepEqual(r.periods[0].days.map((d) => [d.date, d.rows.map((x) => x.number)]), [['2026-09-17', [1, 2]], ['2026-09-18', [1]]]);
  assert.equal(r.periods[0].total, 3);
  assert.equal('summaries' in r || 'trainings' in r, false);
});

test('V623.7 PDF simples: uma linha por meta, colunas na ordem pedida e protegido do CSS do site', async () => {
  const html = api.buildPrintHtml(await report({ goals: [goal('DIREITO PROCESSUAL PENAL', 'Princípios Fundamentais do Processo Penal'), goal('DIREITO PENAL', 'Tema fora da Fábrica')] }));
  const heads = [...html.matchAll(/<th>([^<]+)<\/th>/g)].map((m) => m[1]);
  assert.deepEqual(heads, ['META', 'DISCIPLINA', 'TEMA', 'RESUMO (AULA + JURISPRUDÊNCIA)', 'LINK DA PASTA DESTINO', 'TREINO DE QUESTÕES', 'JURISPRUDÊNCIA']);
  assert.ok(html.includes('<td class="acv-meta">META 1</td><td>DIREITO PROCESSUAL PENAL</td><td>Princípios Fundamentais do Processo Penal</td>'));
  assert.ok(html.includes(`<a href="${driveFolder('PASTA_PRI_00001')}">abrir pasta</a>`));
  assert.ok(html.includes('SEM PASTA DESTINO NA FÁBRICA'));
  assert.ok(html.includes('>ALDUS</text>') && html.includes('>METAS CONCURSO</text>'));
  assert.match(html, /size:A4 landscape/);
  assert.match(html, /aria-hidden="true"/);
  // O timbre na margem da página saía cortado com "Margens: nenhuma"; position:fixed cobria a tabela.
  assert.doesNotMatch(html, /@top-left|@top-right|position:fixed/);
  assert.match(html, /#goalCalendarPrintableReport\.aldus-cal-v623 th\{[^}]*text-align:left!important/);
  assert.match(html, /#goalCalendarPrintableReport\.aldus-cal-v623,#goalCalendarPrintableReport\.aldus-cal-v623 \*\{[^}]*text-transform:none!important/);
  for (const antigo of ['Produto elaborado', 'PREJUDICADO', 'Cumprimento', 'Fábrica de Resumos —', 'Páginas do Word', 'Resumo pronto?', 'NÃO SE APLICA']) assert.ok(!html.includes(antigo), antigo);
});

test('V623.7 imagem mostra as quatro informações de cada meta', async () => {
  const svg = api.buildSvg(await report({ goals: [goal('DIREITO PROCESSUAL PENAL', 'Princípios Fundamentais do Processo Penal')] }));
  assert.match(svg, /viewBox="0 0 1600 \d+"/);
  for (const t of ['META 1 · DIREITO PROCESSUAL PENAL — Princípios Fundamentais do Processo Penal', 'RESUMO (AULA + JURISPRUDÊNCIA):', 'LINK DA PASTA DESTINO:', 'TREINO DE QUESTÕES:', 'JURISPRUDÊNCIA:', 'REALIZADO NO DIA 15/09/2026']) assert.ok(svg.includes(t), t);
  assert.ok(!svg.includes('Produto elaborado'));
});

test('V623.7 Excel tem uma aba com as colunas pedidas; DATA só em período de vários dias', async () => {
  const byName = (files) => Object.fromEntries(files.map((f) => [f.name, f.data]));
  const dia = byName(api.buildWorkbookFiles(await report({ goals: [goal('DIREITO PROCESSUAL PENAL', 'Colaboração Premiada')] }), new Uint8Array([137, 80, 78, 71])));
  assert.match(dia['xl/workbook.xml'], /<sheets><sheet name="Metas" sheetId="1" r:id="rId1"\/><\/sheets>/);
  assert.equal(dia['xl/worksheets/sheet2.xml'], undefined);
  const sheet = dia['xl/worksheets/sheet1.xml'];
  const order = ['META', 'DISCIPLINA', 'TEMA', 'RESUMO (AULA + JURISPRUDÊNCIA)', 'LINK DA PASTA DESTINO', 'TREINO DE QUESTÕES', 'JURISPRUDÊNCIA'].map((h) => sheet.indexOf(`>${h}</t>`));
  assert.ok(order.every((pos, i) => pos > 0 && (i === 0 || pos > order[i - 1])), JSON.stringify(order));
  assert.ok(!sheet.includes('>DATA</t>'));
  assert.ok(sheet.includes('REALIZADO NO DIA 16/08/2026') && sheet.includes('REALIZADO NO DIA 20/08/2026'));
  assert.ok(sheet.includes(`HYPERLINK(&quot;${driveFolder('PASTA_COL_00001')}&quot;`));
  const semana = byName(api.buildWorkbookFiles(await report({ key: 'weekly', start: '2026-09-13', end: '2026-09-19', goals: [goal('DIREITO PROCESSUAL PENAL', 'Colaboração Premiada')] }), new Uint8Array([137, 80, 78, 71])));
  assert.ok(semana['xl/worksheets/sheet1.xml'].includes('>DATA</t>'));
});

test('V623.7 tipo do arquivo pelo começo do nome; prompts e texto de lei não contam', () => {
  const kind = (name) => api.productKind({ name });
  assert.equal(kind('MAPA_HIERARQUICO_RESUMO_AULA_LEI_13_709_2018.docx'), 'resumoAula');
  assert.equal(kind('MAPA_MENTAL_JURISPRUDENCIAS_ARQUIVAMENTO.docx'), 'jurisprudencia');
  assert.equal(kind('Lei-n-9-296-de-1996-Interceptacao-Telefonica.pdf'), '');
  assert.equal(api.isTrainingFile({ name: 'TREINO_DIREITO PENAL_TEMA.html' }), true);
  assert.equal(api.isTrainingFile({ name: 'TREINO_DIREITO PENAL_TEMA_01_TRIAGEM_QC.txt' }), false);
  assert.equal(api.isTrainingFile({ name: 'TREINO_DIREITO PENAL_TEMA_EXCLUSOES.json' }), false);
});

test('V623.7 continua carregado pela cadeia ativa e espelhado em docs', () => {
  const loader = fs.readFileSync('performance-emergency-v350.js', 'utf8');
  assert.ok(loader.includes('script.src = "goal-calendar-export-v623.js?v=20260916-calendario-simples-v623-7";'));
  assert.deepEqual(fs.readFileSync('goal-calendar-export-v623.js'), fs.readFileSync('docs/goal-calendar-export-v623.js'));
  assert.match(fs.readFileSync('build-bundles.mjs', 'utf8'), /"goal-calendar-export-v623\.js"/);
});
