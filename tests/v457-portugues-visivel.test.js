const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

// Os módulos que eu escrevi. O texto que ele lê na tela precisa estar em
// português correto — foi ele quem apontou: "não esquece do português".
const MEUS = [
  'timer-overtime-v450.js',
  'daily-plan-question-import-v451.js',
  'daily-plan-pending-panel-v429.js',
  'timer-study-real-date-v454.js',
  'daily-plan-legibility-v455.js',
  'daily-plan-preview-v462.js',
  'indexeddb-concurrent-write-v447.js',
  'delta-full-plan-v448.js'
];

// Palavras que, em português, só existem com acento. Se aparecerem sem, é erro.
const SEM_ACENTO = [
  'nao', 'voce', 'cronometro', 'pagina', 'importacao', 'Fabrica', 'valido',
  'cartao', 'ate ', 'ultima', 'concluido', 'concluida', 'alem', 'questoes',
  'revisao', 'tambem', 'proprio', 'sao ', 'secao', 'secoes', 'ja ', 'apos',
  'nivel', 'codigo', 'usuario', 'conteudo', 'possivel', 'minimo', 'historico',
  'pendencias', 'disciplina s', 'analise', 'periodo', 'numero', 'ultimo'
];

// Só o que o usuário lê. Comentários de código ficam de fora de propósito:
// são para quem mantém, não para ele.
const LINHA_VISIVEL = /(textContent|innerHTML|placeholder|showDailyGoalMessage|erro:\s*["`]|alert\()/;

function trechosVisiveis(fonte) {
  const achados = [];
  fonte.split('\n').forEach((linha, i) => {
    if (!LINHA_VISIVEL.test(linha)) return;
    for (const m of linha.matchAll(/["`']([^"`']{10,})["`']/g)) achados.push({ linha: i + 1, texto: m[1] });
  });
  return achados;
}

for (const arquivo of MEUS) {
  test(`português correto no que aparece na tela: ${arquivo}`, () => {
    const fonte = read(arquivo);
    const problemas = [];
    for (const { linha, texto } of trechosVisiveis(fonte)) {
      for (const palavra of SEM_ACENTO) {
        const re = new RegExp(`\b${palavra.trim()}\b`, 'i');
        if (re.test(texto)) problemas.push(`linha ${linha}: "${texto.slice(0, 70)}" — falta acento em "${palavra.trim()}"`);
      }
    }
    assert.deepEqual(problemas, [], `\n${problemas.join('\n')}`);
  });
}

test('a correção do V457 está aplicada', () => {
  const timer = read('timer-overtime-v450.js');
  assert.match(timer, /Tempo previsto concluído às/);
  assert.match(timer, /O cronômetro parou em/);
  const importar = read('daily-plan-question-import-v451.js');
  assert.match(importar, /Não encontrei a importação da Fábrica/);
  assert.match(importar, /Isso não é um JSON válido/);
});
