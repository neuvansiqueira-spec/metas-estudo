const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const html = fs.readFileSync('index.html', 'utf8');
const script = fs.readFileSync('script.js', 'utf8');


test('Aplicar incidências lê textarea, atualiza somente edital existente e renderiza relatório', () => {
  assert.match(html, /id="incidenceTableInput"/);
  assert.match(html, /id="applyIncidenceTableButton"[^>]*type="button"/);
  assert.match(script, /function applyIncidenceTable\(rawText\)/);
  assert.match(script, /if \(!state\.syllabusItems\.length\) \{/);
  assert.match(script, /Não há edital verticalizado importado\. Importe o edital antes de aplicar incidências\./);
  assert.match(script, /existingSyllabusDisciplinesForIncoming\(disciplinaRaw\)/);
  assert.doesNotMatch(script, /existingDisciplinesForIncoming\(disciplinaRaw\)/);
  assert.match(script, /item\.weight = normalizeSubjectIncidence\(valor\)/);
  assert.match(script, /item\.priority = normalizeImportedPriority\(prioridadeRaw\)/);
  assert.match(script, /Incidências aplicadas: \$\{report\.assuntosAtualizados\.length\} assuntos atualizados; \$\{report\.disciplinasAtualizadas\.length\} disciplinas atualizadas; \$\{notFound\.length\} não encontrados\./);
  assert.match(script, /const report = applyIncidenceTable\(elements\.incidenceTableInput\.value\);[\s\S]*saveData\(\);[\s\S]*render\(\);[\s\S]*renderIncidenceReport\(report\);/);
  assert.match(script, /elements\.applyIncidenceTableButton\?\.addEventListener\("click", handleApplyIncidenceTable\)/);
  assert.match(script, /const allowed = \["Altíssima", "Muito alta", "Alta", "Média", "Baixa", "Baixíssima"\]/);
  assert.match(script, /itemSubjectKey === subjectKey \|\| itemSubjectKey\.includes\(subjectKey\) \|\| subjectKey\.includes\(itemSubjectKey\)/);
});


test('Aplicar incidências atualiza assuntos por correspondência parcial e mantém prioridades máximas', () => {
  const logicStart = script.indexOf('function normalizeText(value)');
  const logicEnd = script.indexOf('function normalizeImportedDomain(value)');
  assert.notEqual(logicStart, -1);
  assert.notEqual(logicEnd, -1);
  const state = {
    disciplineWeights: {},
    syllabusItems: [
      { discipline: 'Direito Processual Penal', subject: '2.1 Princípios Fundamentais do Processo Penal', weight: 1, priority: 'Média' },
      { discipline: 'Direito Processual Penal', subject: '2.2 Inquérito Policial', weight: 1, priority: 'Média' },
      { discipline: 'Direito Penal', subject: '1.1 Teoria Geral do Crime', weight: 1, priority: 'Média' },
    ],
  };
  const makeLogic = new Function('state', `${script.slice(logicStart, logicEnd)}; return { applyIncidenceTable, renderIncidenceReport, normalizeImportedPriority };`);
  const { applyIncidenceTable, normalizeImportedPriority } = makeLogic(state);

  const report = applyIncidenceTable(`TIPO;DISCIPLINA;ASSUNTO;VALOR;PRIORIDADE
ASSUNTO;Direito Processual Penal;Princípios Fundamentais do Processo Penal;4;Alta
ASSUNTO;Direito Processual Penal;Inquérito Policial;5;Muito alta
ASSUNTO;Direito Penal;Teoria Geral do Crime;5;Altíssima`);

  assert.equal(report.assuntosAtualizados.length, 3);
  assert.equal(report.assuntosNaoEncontrados.length, 0);
  assert.equal(state.syllabusItems[0].weight, 4);
  assert.equal(state.syllabusItems[1].weight, 5);
  assert.equal(state.syllabusItems[2].weight, 5);
  assert.equal(state.syllabusItems[1].priority, 'Muito alta');
  assert.equal(state.syllabusItems[2].priority, 'Altíssima');
  assert.equal(normalizeImportedPriority('Baixíssima'), 'Baixíssima');
});

test('Calendário de Metas usa incidências novas e duração mínima/máxima de metas', () => {
  assert.match(script, /\{ value: 18, label: "Altíssima" \}/);
  assert.match(script, /\{ value: 14, label: "Peças" \}/);
  assert.match(script, /\{ value: 12, label: "Muito alta" \}/);
  assert.match(script, /\{ value: 7, label: "Alta" \}/);
  assert.match(script, /\{ value: 3, label: "Média" \}/);
  assert.match(script, /\["direito penal"\], weight: 18/);
  assert.match(script, /\["peça para delegado de polícia civil", "peca para delegado de policia civil"\], weight: 14/);
  assert.match(script, /\["direito constitucional"\], weight: 12/);
  assert.match(script, /\["direito administrativo"\], weight: 7/);
  assert.match(script, /state\.disciplineWeights\[d\]=normalizeDisciplineWeight\(event\.target\.value, d\)/);
  assert.match(script, /"Estudo novo": 60, "Questões": 45, "Revisão": 30, "Reforço": 45/);
  assert.match(script, /Math\.max\(30, Math\.round\(baseMinutes \* factor\)\)/);
  assert.match(script, /dayType === "folga" \|\| dayType === "estudo forte" \? 90 : Infinity/);
});

test('Plano do Dia separa tempo de estudo e questões sem concluir automaticamente', () => {
  assert.match(script, /function normalizeGoalTimeFields\(goal\)/);
  assert.match(script, /goal\.studyActualMinutes = hasStudyActual \? Number\(goal\.studyActualMinutes\) \|\| 0 : legacyActual/);
  assert.match(script, /goal\.questionActualMinutes = hasQuestionActual \? Number\(goal\.questionActualMinutes\) \|\| 0 : 0/);
  assert.match(script, /goal\.actualMinutes = goal\.studyActualMinutes \+ goal\.questionActualMinutes/);
  assert.match(script, /Registrar estudo/);
  assert.match(script, /Tempo de questões/);
  assert.match(script, /Estudo realizado: \$\{Number\(goal\.studyActualMinutes\|\|0\)\} min/);
  assert.match(script, /Questões realizadas: \$\{Number\(goal\.questionActualMinutes\|\|0\)\} min/);
  assert.match(script, /Total realizado: \$\{Number\(goal\.actualMinutes\|\|0\)\} min/);
  assert.match(script, /registerGoalTime\(goal, "study"\)/);
  assert.match(script, /registerGoalTime\(goal, "questions"\)/);
  assert.doesNotMatch(script, /Deseja concluir esta meta agora/);
});

test('Prompt completo do módulo Lei exige recorte expresso e não autoriza lei ampla sem confirmação', () => {
  assert.match(script, /RECORTE: trabalhe somente os artigos e temas expressamente indicados\. Se o recorte não estiver cadastrado ou estiver impreciso, interrompa a geração e solicite confirmação\. Somente trabalhe a lei integralmente quando houver autorização expressa do usuário\./);
  assert.doesNotMatch(script, new RegExp(["Se não houver", "trabalhe a lei amplamente"].join(", ")));
});
