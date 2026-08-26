const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const runtime = fs.readFileSync('factory-subtopic-shading-v388.js', 'utf8');
const docsRuntime = fs.readFileSync('docs/factory-subtopic-shading-v388.js', 'utf8');
const security = fs.readFileSync('security-observability-v318.js', 'utf8');
const docsSecurity = fs.readFileSync('docs/security-observability-v318.js', 'utf8');

test('V388 fixa o sombreamento marrom acinzentado exato sem trocar a cor do texto', () => {
  assert.match(runtime, /#DDD9C3/);
  assert.match(runtime, /w:fill="DDD9C3"/);
  assert.match(runtime, /O #DDD9C3 É COR DE FUNDO, NÃO COR DE FONTE/);
  assert.match(runtime, /SE O PROMPT ORIGINAL DETERMINAR TEXTO PRETO #000000, ESSA REGRA CONTINUA INTEGRALMENTE VÁLIDA/);
});

test('V388 aplica a exceção somente aos blocos internos e preserva os cabeçalhos', () => {
  assert.match(runtime, /1️⃣, 2️⃣, 3️⃣, 4️⃣, 5️⃣/);
  assert.match(runtime, /⚖️ JURISPRUDÊNCIA/);
  assert.match(runtime, /NÃO APLIQUE O SOMBREAMENTO #DDD9C3/);
  assert.match(runtime, /AOS GRANDES EIXOS\/TÍTULOS ♦️/);
  assert.match(runtime, /AOS CABEÇALHOS ▶️📚/);
  assert.match(runtime, /A FAIXA AZUL-CLARA DOS CABEÇALHOS ▶️📚 DEVE SER MANTIDA EXATAMENTE/);
  assert.match(runtime, /NÃO IMPONHA ESTA GRAMÁTICA VISUAL À PEÇA/);
});

test('V388 alcança todos os geradores de resumo e não alcança triagem, peça ou simulado', () => {
  for (const type of [
    'resumoAula',
    'resumoAulaJurisprudencia',
    'lei',
    'leiJurisprudencia',
    'jurisprudencia',
    'consolidacao',
    'padronizacaoFinalSumario'
  ]) {
    assert.match(runtime, new RegExp(`"${type}"`));
  }
  assert.doesNotMatch(runtime, /"triagem"/);
  assert.doesNotMatch(runtime, /"peca"/);
  assert.doesNotMatch(runtime, /"simulado"/);
});

test('V388 preserva integralmente as regras anteriores fora da exceção de sombreamento', () => {
  assert.match(runtime, /SEM SUPRIMIR NENHUMA DAS DEMAIS REGRAS/);
  assert.match(runtime, /EVENTUAL REGRA ANTERIOR DO MESMO PROMPT QUE DETERMINE “FUNDO BRANCO”, PROÍBA “SOMBREAMENTOS”/);
  assert.match(runtime, /CONTINUA VALENDO INTEGRALMENTE FORA DOS SUBTÓPICOS/);
  assert.match(runtime, /NÃO ALTERE NENHUMA OUTRA REGRA DO PROMPT POR CAUSA DESTA EXCEÇÃO/);
});

test('V388 é idempotente e carregada depois das extensões de prompts existentes', () => {
  assert.match(runtime, /if \(raw\.includes\(SHADING_MARKER\)\) return raw/);
  assert.match(security, /function installFactorySubtopicShadingV388\(\)/);
  assert.match(security, /factory-subtopic-shading-v388\.js\?v=20260826-factory-subtopic-shading-v388/);
  const tocCall = security.indexOf('installFactorySummaryTocV382();');
  const shadingCall = security.lastIndexOf('installFactorySubtopicShadingV388();');
  assert.ok(tocCall >= 0 && shadingCall > tocCall, 'V388 deve ser carregada depois do sumário V382');
  assert.equal(runtime, docsRuntime, 'runtime V388 deve permanecer idêntico entre raiz e docs');
  assert.equal(security, docsSecurity, 'security-observability deve permanecer idêntico entre raiz e docs');
});
