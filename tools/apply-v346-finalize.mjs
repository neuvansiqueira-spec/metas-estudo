import fs from "node:fs";

const integrationSegment = "  function mergeNotebookSnapshot(targetState, entries = []) {\n    targetState.questionErrorNotebook ||= [];\n    const byId = new Map(targetState.questionErrorNotebook.map((entry) => [String(entry?.id || \"\"), entry]));\n    entries.forEach((entry) => {\n      const id = String(entry?.id || \"\");\n      if (!id) return;\n      const existing = byId.get(id);\n      if (!existing) {\n        const copy = JSON.parse(JSON.stringify(entry));\n        targetState.questionErrorNotebook.unshift(copy);\n        byId.set(id, copy);\n        return;\n      }\n      const previousErrors = Number(existing.quantidadeErros) || 0;\n      Object.assign(existing, JSON.parse(JSON.stringify(entry)));\n      existing.quantidadeErros = Math.max(previousErrors, Number(entry.quantidadeErros) || 0);\n    });\n  }\n\n  function applyIntegratedPayloadLocally(targetState, payload, result = {}) {\n    ensureCollections(targetState);\n    ensureBankQuestions(targetState, payload.bankQuestions);\n\n    if (!hasIntegratedSession(targetState, payload.sessionId) && payload.session) {\n      targetState.questionBankSessions.unshift(payload.session);\n    }\n\n    const logIds = new Set(targetState.questionLogs.map((log) => log.id));\n    payload.questionLogs.filter((log) => !logIds.has(log.id)).forEach((log) => targetState.questionLogs.push(log));\n\n    if (payload.mock && !targetState.simulados.some((mock) => mock.id === payload.mock.id)) {\n      targetState.simulados.push(payload.mock);\n    }\n\n    mergeNotebookSnapshot(targetState, result.notebookEntries || []);\n  }\n\n  function persistRepair() {\n    if (typeof saveData !== \"function\") throw new Error(\"O salvamento principal do site não está disponível.\");\n    const saved = saveData({ markLocalChange:true });\n    if (saved === false) throw new Error(\"A aba atual não possui autorização para gravar o estado geral.\");\n    return saved;\n  }\n\n  async function integrateExam(exam) {\n    if (typeof state === \"undefined\" || !state) throw new Error(\"O banco de dados do site ainda não está disponível.\");\n    const payload = buildIntegrationPayload(exam);\n    const concurrency = globalThis.AldusStorageConcurrencyV345;\n\n    if (concurrency?.commitSimulationState) {\n      const result = await concurrency.commitSimulationState(payload);\n      if (!result?.durable) {\n        throw new Error(`O resultado do simulado ainda não foi confirmado no armazenamento (${result?.reason || \"falha desconhecida\"}).`);\n      }\n\n      applyIntegratedPayloadLocally(state, payload, result);\n      renderAfterIntegration({ full: !result.alreadyIntegrated || Number(result.repairedQuestions) > 0 });\n\n      const repairedQuestions = Number(result.repairedQuestions) || 0;\n      const alreadyIntegrated = Boolean(result.alreadyIntegrated);\n      const repaired = alreadyIntegrated && repairedQuestions > 0;\n      const notebookAdded = Array.isArray(result.notebookEntries) ? result.notebookEntries.length : 0;\n      const message = alreadyIntegrated\n        ? (repaired\n            ? `Integração reparada: ${repairedQuestions} questão(ões) ausente(s) foram restauradas no Banco de Questões sem duplicar o resultado.`\n            : \"Este simulado já estava integralmente integrado; nenhum dado foi duplicado.\")\n        : `${repairedQuestions} questão(ões) e o resultado foram integrados ao site.`;\n\n      return {\n        alreadyIntegrated,\n        repaired,\n        sessionId:payload.sessionId,\n        newQuestions:repairedQuestions,\n        sessionsAdded:Number(result.sessionsAdded) || 0,\n        logsAdded:Number(result.logsAdded) || 0,\n        notebookAdded,\n        message\n      };\n    }\n\n    ensureCollections(state);\n    const sessionAlreadyIntegrated = hasIntegratedSession(state, payload.sessionId);\n    const repairedQuestions = ensureBankQuestions(state, payload.bankQuestions);\n\n    if (sessionAlreadyIntegrated) {\n      if (repairedQuestions > 0) {\n        persistRepair();\n        renderAfterIntegration();\n        return {\n          alreadyIntegrated:true,\n          repaired:true,\n          sessionId:payload.sessionId,\n          newQuestions:repairedQuestions,\n          sessionsAdded:0,\n          logsAdded:0,\n          notebookAdded:0,\n          message:`Integração reparada: ${repairedQuestions} questão(ões) ausente(s) foram restauradas no Banco de Questões sem duplicar o resultado.`\n        };\n      }\n      return {\n        alreadyIntegrated:true,\n        repaired:false,\n        sessionId:payload.sessionId,\n        newQuestions:0,\n        sessionsAdded:0,\n        logsAdded:0,\n        notebookAdded:0,\n        message:\"Este simulado já estava integralmente integrado; nenhum dado foi duplicado.\"\n      };\n    }\n\n    state.questionBankSessions.unshift(payload.session);\n    const logIds = new Set(state.questionLogs.map((log) => log.id));\n    const logsToAdd = payload.questionLogs.filter((log) => !logIds.has(log.id));\n    state.questionLogs.push(...logsToAdd);\n    const mockAdded = !state.simulados.some((mock) => mock.id === payload.mock.id);\n    if (mockAdded) state.simulados.push(payload.mock);\n    if (typeof registrarNoCadernoErros === \"function\") {\n      payload.notebook.forEach((entry) => registrarNoCadernoErros(entry.question, entry.mark, entry.reason));\n    }\n\n    persistRepair();\n    renderAfterIntegration({ full:true });\n\n    return {\n      alreadyIntegrated:false,\n      repaired:false,\n      sessionId:payload.sessionId,\n      newQuestions:repairedQuestions,\n      sessionsAdded:1,\n      logsAdded:logsToAdd.length,\n      notebookAdded:payload.notebook.length,\n      message:`${repairedQuestions} questão(ões) e o resultado foram integrados ao site.`\n    };\n  }\n\n";
const repairSegment = "  async function repairStoredExams() {\n    if (typeof state === \"undefined\" || !state || typeof saveData !== \"function\") {\n      return { available:false, checked:0, repairedExams:0, repairedQuestions:0, errors:0 };\n    }\n    const exams = readStoredCompletedExams();\n    let repairedExams = 0;\n    let repairedQuestions = 0;\n    let errors = 0;\n    for (const exam of exams) {\n      try {\n        const result = await integrateExam(exam);\n        if (result?.repaired || (!result?.alreadyIntegrated && Number(result?.newQuestions) > 0)) {\n          repairedExams += 1;\n          repairedQuestions += Number(result.newQuestions) || 0;\n        }\n      } catch (error) {\n        errors += 1;\n        console.warn(`[${VERSION}] Falha ao verificar o simulado ${exam?.id || \"sem-id\"}.`, error);\n      }\n    }\n    const report = { available:true, checked:exams.length, repairedExams, repairedQuestions, errors };\n    if (repairedQuestions > 0) console.info(`[${VERSION}] Reparo automático concluído.`, report);\n    return report;\n  }\n\n  function scheduleStoredRepair() {\n    if (typeof setTimeout !== \"function\") return;\n    const delays = [0, 600, 1800, 4000];\n    delays.forEach((delay) => {\n      setTimeout(() => {\n        Promise.resolve(repairStoredExams())\n          .catch((error) => console.warn(`[${VERSION}] Verificação automática adiada.`, error));\n      }, delay);\n    });\n  }\n\n";
const v346Test = "import test from \"node:test\";\nimport assert from \"node:assert/strict\";\nimport fs from \"node:fs\";\n\nconst read = (file) => fs.readFileSync(file, \"utf8\");\n\ntest(\"V346 mantém bloqueio geral, mas libera cronômetro e simulado por fila protegida\", () => {\n  const guard = read(\"storage-concurrency-v345.js\");\n  assert.match(guard, /20260816-multitab-timer-simulado-v346/);\n  assert.match(guard, /aldus:module-request:v346:/);\n  assert.match(guard, /commitTimerState/);\n  assert.match(guard, /commitSimulationState/);\n  assert.match(guard, /processPendingRequests/);\n  assert.match(guard, /saveDataSingleWriterV345/);\n  assert.doesNotMatch(guard, /O estudo não foi salvo nesta aba porque outra aba/);\n});\n\ntest(\"V346 soma uma sessão nova do cronômetro no escritor sem regressão de meta\", () => {\n  const guard = read(\"storage-concurrency-v345.js\");\n  assert.match(guard, /const studyAdded = !study/);\n  assert.match(guard, /goal\\[field\\] \\+= minutes/);\n  assert.match(guard, /goal\\.actualMinutes = goal\\.studyActualMinutes \\+ goal\\.questionActualMinutes/);\n  assert.match(guard, /mergeGoalNonRegression/);\n});\n\ntest(\"V346 sincroniza o estado antes de uma aba secundária virar gravadora\", () => {\n  const guard = read(\"storage-concurrency-v345.js\");\n  assert.match(guard, /prepareWriterHandoff/);\n  assert.match(guard, /loadStateFromIndexedDB/);\n  assert.match(guard, /replaceStateInPlace/);\n  assert.match(guard, /writerReady/);\n});\n\ntest(\"V346 integra o simulado por commit durável e mantém respostas locais independentes\", () => {\n  const integration = read(\"simulado-integracao-v314.js\");\n  const interactive = read(\"simulado-interativo-v313.js\");\n  assert.match(integration, /commitSimulationState/);\n  assert.match(integration, /await concurrency\\.commitSimulationState/);\n  assert.match(integration, /if \\(!result\\?\\.durable\\)/);\n  assert.match(interactive, /aldusSimuladosInterativosV313/);\n  assert.match(interactive, /localStorage\\.setItem\\(STORAGE_KEY/);\n});\n\ntest(\"V346 usa cache-bust novo sem trocar o bundle canônico V345\", () => {\n  const core = read(\"bootstrap-integrity-loader-v345-core.js\");\n  const worker = read(\"service-worker.js\");\n  assert.match(core, /storage-concurrency-v345\\.js\\?v=20260816-multitab-timer-simulado-v346/);\n  assert.match(core, /simulado-integracao-v314\\.js\\?v=20260816-multitab-timer-simulado-v346/);\n  assert.match(worker, /bootstrap-performance-v342-multitab-v346/);\n  assert.match(worker, /storage-concurrency-v345\\.js\\?v=20260816-multitab-timer-simulado-v346/);\n  assert.match(worker, /app-\\$\\{RELEASE_SUFFIX\\}\\.js/);\n});\n\ntest(\"V346 mantém paridade raiz/docs nos arquivos alterados\", () => {\n  for (const file of [\n    \"storage-concurrency-v345.js\",\n    \"simulado-integracao-v314.js\",\n    \"bootstrap-integrity-loader-v345-core.js\",\n    \"service-worker.js\"\n  ]) {\n    assert.equal(read(file), read(`docs/${file}`), `${file} deve ser idêntico em docs`);\n  }\n});\n";

function mustRead(file) {
  if (!fs.existsSync(file)) throw new Error(`Arquivo ausente: ${file}`);
  return fs.readFileSync(file, "utf8");
}
function write(file, content) {
  fs.writeFileSync(file, content);
  console.log(`updated ${file}`);
}
function replaceBetween(text, start, end, replacement, label) {
  const a = text.indexOf(start);
  if (a < 0) throw new Error(`Início não encontrado: ${label}`);
  const b = text.indexOf(end, a);
  if (b < 0) throw new Error(`Fim não encontrado: ${label}`);
  return text.slice(0, a) + replacement + text.slice(b);
}

write("docs/storage-concurrency-v345.js", mustRead("storage-concurrency-v345.js"));

let integration = mustRead("simulado-integracao-v314.js");
integration = replaceBetween(
  integration,
  "  function persistRepair()",
  "  function readStoredCompletedExams()",
  integrationSegment,
  "integração durável do simulado"
);
integration = replaceBetween(
  integration,
  "  function repairStoredExams()",
  "  const api = Object.freeze({",
  repairSegment,
  "reparo assíncrono de simulados"
);
write("simulado-integracao-v314.js", integration);
write("docs/simulado-integracao-v314.js", integration);

for (const file of ["bootstrap-integrity-loader-v345-core.js", "docs/bootstrap-integrity-loader-v345-core.js"]) {
  let text = mustRead(file);
  text = text.replace(
    'storage-concurrency-v345.js?v=20260816-storage-consistency-v345',
    'storage-concurrency-v345.js?v=20260816-multitab-timer-simulado-v346'
  );
  text = text.replace(
    'simulado-integracao-v314.js?v=20260811-simulado-integracao-v314',
    'simulado-integracao-v314.js?v=20260816-multitab-timer-simulado-v346'
  );
  write(file, text);
}

for (const file of ["service-worker.js", "docs/service-worker.js"]) {
  let text = mustRead(file);
  text = text.replace(
    'const STORAGE_CONCURRENCY_V345 = `storage-concurrency-v345.js?v=${CURRENT_VERSION}`;',
    'const STORAGE_CONCURRENCY_V345 = "storage-concurrency-v345.js?v=20260816-multitab-timer-simulado-v346";'
  );
  text = text.replace(
    'const SIMULADO_INTEGRACAO_SCRIPT = "simulado-integracao-v314.js?v=20260812-simulado-integracao-v318-reparo";',
    'const SIMULADO_INTEGRACAO_SCRIPT = "simulado-integracao-v314.js?v=20260816-multitab-timer-simulado-v346";'
  );
  text = text.replace(
    '-qconcursos-filter-v337-bootstrap-performance-v342`;',
    '-qconcursos-filter-v337-bootstrap-performance-v342-multitab-v346`;'
  );
  write(file, text);
}

let v314 = mustRead("tests/v314-simulado-integracao.test.js");
v314 = v314.replace(
  'test("V314 integra uma vez no estado real e não duplica ao tentar novamente", () => {',
  'test("V314 integra uma vez no estado real e não duplica ao tentar novamente", async () => {'
);
v314 = v314.replace(
  '  const first = integration.integrateExam(exam);\n  const second = integration.integrateExam(exam);',
  '  const first = await integration.integrateExam(exam);\n  const second = await integration.integrateExam(exam);'
);
v314 = v314.replace(
  'test("V318 repara questões ausentes quando o resultado já estava integrado", () => {',
  'test("V318 repara questões ausentes quando o resultado já estava integrado", async () => {'
);
v314 = v314.replace(
  '  const repaired = integration.integrateExam(exam);\n  const checkedAgain = integration.integrateExam(exam);',
  '  const repaired = await integration.integrateExam(exam);\n  const checkedAgain = await integration.integrateExam(exam);'
);
write("tests/v314-simulado-integracao.test.js", v314);
write("tests/v346-multitab-modules.test.js", v346Test);

for (const file of [
  "storage-concurrency-v345.js",
  "simulado-integracao-v314.js",
  "bootstrap-integrity-loader-v345-core.js",
  "service-worker.js"
]) {
  const text = mustRead(file);
  if (!text.trim()) throw new Error(`Arquivo vazio após patch: ${file}`);
}

console.log("V346 patch aplicado.");
