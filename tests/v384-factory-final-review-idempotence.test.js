const test = require('node:test');
const assert = require('node:assert/strict');

const finalReview = require('../factory-final-review-v384.js');
const compat = require('../factory-final-review-v384-compat.js');

test('guard preserva o marcador V384 e impede novo embrulhamento em eventos posteriores', () => {
  global.defaultFactoryPromptLibrary = { consolidacao: finalReview.prompt };
  global.state = {
    factoryPromptLibrary: { consolidacao: finalReview.prompt },
    factoryPromptLibraryBackups: {},
    migrations: {}
  };
  global.FACTORY_PROMPT_TYPES = [{ key: 'consolidacao', label: 'antigo' }];
  global.factoryPromptBase = () => 'base';
  global.factoryRouterText = () => 'Disciplina: X\nTema: Y';

  const firstFinal = finalReview.install();
  assert.equal(firstFinal.router, true);
  assert.equal(compat.install(), true);

  const guarded = global.factoryRouterText;
  assert.equal(guarded[compat.finalRouterMarker], compat.finalRouterVersion);

  const secondFinal = finalReview.install();
  assert.equal(secondFinal.router, true);
  assert.equal(global.factoryRouterText, guarded, 'V384 não deve embrulhar novamente o guard');

  assert.equal(compat.install(), true);
  assert.equal(global.factoryRouterText, guarded, 'guard também deve permanecer idempotente');

  delete global.defaultFactoryPromptLibrary;
  delete global.state;
  delete global.FACTORY_PROMPT_TYPES;
  delete global.factoryPromptBase;
  delete global.factoryRouterText;
});
