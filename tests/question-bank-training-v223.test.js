import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const source = fs.readFileSync(path.join(root, "question-bank-training-v223.js"), "utf8");

test("treino oferece modos estudo e simulado sem revelar antes da resposta", () => {
  assert.match(source, /Estudo — feedback após responder/);
  assert.match(source, /Simulado — feedback somente no resultado/);
  assert.match(source, /feedbackMode: "study"/);
  assert.match(source, /mode === "simulated".*feedback permanece oculto/s);
});

test("cliques do treino corrigido bloqueiam o manipulador legado", () => {
  assert.match(source, /addEventListener\("click"[\s\S]*stopImmediatePropagation\(\)/);
  assert.match(source, /data-qb-nav="next" type="button"/);
  assert.match(source, /data-qb-save-exit-v223 type="button"/);
  assert.match(source, /data-qb-finish type="button"/);
});

test("treino pode ser salvo, retomado e finalizado com proteção", () => {
  assert.match(source, /aldusQuestionBankTrainingDraftV223/);
  assert.match(source, /Retomar treino/);
  assert.match(source, /Salvar e sair/);
  assert.match(source, /Ainda há \$\{pending\} questão\(ões\) sem resposta/);
});

test("atalhos e feedback imediato preservam o caderno de erros", () => {
  assert.match(source, /registrarNoCadernoErros\(question, answer, reason\)/);
  assert.match(source, /event\.key === "ArrowRight"/);
  assert.match(source, /event\.key === "\?"/);
  assert.match(source, /answerCurrent\(QB_MARK_BLANK\)/);
});

test("avanço automático não pula questões e conclusão sincroniza somente após salvar", () => {
  assert.match(source, /clearTimeout\(autoAdvanceTimer\)/);
  assert.match(source, /expectedQuestionId/);
  assert.match(source, /questionBankTraining\.index !== expectedIndex/);
  assert.match(source, /if \(!questionBankTraining\) \{[\s\S]*localStorage\.removeItem\(DRAFT_KEY\)/);
  assert.match(source, /autoSyncAfterSave\("question-bank-training"\)/);
});
