const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { execSync } = require('node:child_process');

const script = fs.readFileSync('script.js', 'utf8');
const docsScript = fs.readFileSync('docs/script.js', 'utf8');
const css = fs.readFileSync('style.css', 'utf8');
const docsCss = fs.readFileSync('docs/style.css', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');
const docsHtml = fs.readFileSync('docs/index.html', 'utf8');
const sw = fs.readFileSync('service-worker.js', 'utf8');
const docsSw = fs.readFileSync('docs/service-worker.js', 'utf8');
const packageJson = require('../package.json');

function factoryCssBlock() {
  return css.slice(css.indexOf('#view-fabrica-resumos'));
}

function constValue(name, source = script) {
  const marker = `const ${name} = `;
  const start = source.indexOf(marker);
  assert.notEqual(start, -1, `${name} deve existir`);
  const valueStart = start + marker.length;
  const quote = source[valueStart];
  assert.ok(['`', '"', "'"].includes(quote), `${name} deve ser string`);
  let i = valueStart + 1;
  while (i < source.length) {
    if (source[i] === quote && source[i - 1] !== '\\') return source.slice(valueStart + 1, i);
    i += 1;
  }
  throw new Error(`Não foi possível ler ${name}`);
}

test('destaque visual do assunto da Fábrica usa classes específicas em resumo, cards e fila', () => {
  for (const className of ['factory-theme-highlight', 'factory-theme-label', 'factory-theme-title', 'factory-theme-discipline', 'factory-theme-recorte']) {
    assert.match(script, new RegExp(className));
    assert.match(css, new RegExp(`\\.${className}`));
  }
  assert.match(script, /function factoryThemeHighlightHTML/);
  assert.match(script, /ASSUNTO EM PRODUÇÃO/);
  assert.match(script, /factorySummary[\s\S]*factoryThemeHighlightHTML\(queue\[0\]\.item/);
  assert.match(script, /factoryThemeHighlightHTML\(item, recorte/);
  assert.match(script, /factoryThemeHighlightHTML\(entry\.item, factoryRecorteHoje\(entry\)\)/);
});

test('CSS da Fábrica corrige quebras sem break-all e impede hifenização do título', () => {
  const block = factoryCssBlock();
  assert.doesNotMatch(block, /word-break\s*:\s*break-all/i);
  assert.match(block, /#view-fabrica-resumos[\s\S]*word-break\s*:\s*normal/i);
  assert.match(block, /#view-fabrica-resumos[\s\S]*white-space\s*:\s*normal/i);
  assert.match(block, /#view-fabrica-resumos[\s\S]*min-width\s*:\s*0/i);
  assert.match(block, /#view-fabrica-resumos[\s\S]*max-width\s*:\s*100%/i);
  assert.match(block, /\.factory-theme-title[\s\S]*font-size\s*:\s*clamp\(/i);
  assert.match(block, /\.factory-theme-title[\s\S]*hyphens\s*:\s*none/i);
  assert.match(block, /overflow-wrap\s*:\s*break-word/i);
});

test('arquivos públicos permanecem sincronizados e cache usa a nova versão', () => {
  assert.equal(script, docsScript, 'script.js e docs/script.js devem estar idênticos');
  assert.equal(css, docsCss, 'style.css e docs/style.css devem estar idênticos');
  assert.equal(html.match(/Versão: ([^<]+)/)?.[1], packageJson.version);
  assert.equal(docsHtml.match(/Versão: ([^<]+)/)?.[1], packageJson.version);
  assert.ok(html.includes(`style.css?v=${packageJson.version}`));
  assert.ok(html.includes(`script.js?v=${packageJson.version}`));
  assert.ok(docsHtml.includes(`style.css?v=${packageJson.version}`));
  assert.ok(docsHtml.includes(`script.js?v=${packageJson.version}`));
  assert.ok(sw.includes(`metas-estudo-${packageJson.version}`));
  assert.ok(docsSw.includes(`metas-estudo-${packageJson.version}`));
});

test('funções da Fábrica seguem presentes após a alteração visual', () => {
  for (const fn of ['renderFactory', 'factoryCurrentStage', 'factoryNextAction', 'factoryTodayQueue', 'factoryActionButtonHTML', 'toggleFactoryDetail']) {
    assert.match(script, new RegExp(`function ${fn}\\(`));
  }
  assert.match(script, /TRIAGEM/);
  assert.match(script, /RESUMO\/AULA/);
  assert.match(script, /LEI/);
  assert.match(script, /JURISPRUDÊNCIA/);
  assert.match(script, /PEÇA/);
  assert.match(script, /COMPLETO|CONSOLIDADO FINAL/);
});

test('prompts internos oficiais não foram alterados em relação ao commit base', { skip: !fs.existsSync('.git') }, () => {
  const baseScript = execSync('git show HEAD^:script.js', { encoding: 'utf8' });
  for (const name of ['FACTORY_RESUMO_AULA_PROMPT_SEGMENT', 'FACTORY_PECA_PROMPT']) {
    assert.equal(constValue(name), constValue(name, baseScript), `${name} não deve mudar`);
  }
});

test('armazenamento, backup e sincronização não receberam alterações de implementação', { skip: !fs.existsSync('.git') }, () => {
  const diff = execSync('git diff HEAD^ -- script.js docs/script.js', { encoding: 'utf8' });
  assert.doesNotMatch(diff, /localStorage|backup|Google Drive|syncWithGoogleDrive|saveBackup|restoreBackup|cronômetro|timer/i);
});
