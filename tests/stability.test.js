const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const html = fs.readFileSync('index.html', 'utf8');
const css = fs.readFileSync('style.css', 'utf8');
const script = fs.readFileSync('script.js', 'utf8');

const screens = [
  { hash: '#dashboard', view: 'view-dashboard', title: 'Dashboard' },
  { hash: '#central-metas', view: 'view-central-metas', title: 'Central de Metas' },
  { hash: '#metas-do-dia', view: 'view-metas-do-dia', title: 'Plano do Dia' },
  { hash: '#historico-questoes', view: 'view-historico-questoes', title: 'Histórico de Questões' },
  { hash: '#historico', view: 'view-historico', title: 'Histórico Geral' },
  { hash: '#revisoes', view: 'view-revisoes', title: 'Revisões' },
  { hash: '#backup', view: 'view-backup', title: 'Backup' }
];

function hasVisibleRouteSupport(hash) {
  const route = hash.slice(1);
  return html.includes(`href="${hash}"`) && html.includes(`data-view-link="${route}"`) && script.includes('data-view-link');
}

test('telas principais possuem rota, seção, título, menu e rodapé com versão', () => {
  assert.match(html, /<nav class="topbar"[^>]*aria-label="Navegação principal"/);
  assert.match(html, /<aside class="side-nav"[^>]*aria-label="Menu de telas"/);
  assert.match(html, /<footer>[\s\S]*class="app-version"[\s\S]*Versão:/);

  for (const screen of screens) {
    assert.ok(hasVisibleRouteSupport(screen.hash), `${screen.hash} deve ter link de navegação`);
    assert.match(html, new RegExp(`<section[^>]+id="${screen.view}"[\\s\\S]*?</section>`), `${screen.view} deve existir`);
    assert.ok(html.includes(`>${screen.title}<`), `${screen.title} deve existir como título principal`);
  }
});

test('arquivos carregados usam a versão de estabilidade', () => {
  assert.match(html, /style\.css\?v=20260621-stability-base/);
  assert.match(html, /script\.js\?v=20260621-stability-base/);
  assert.match(html, /Versão: 20260621-stability-base/);
});

test('não há textos obviamente quebrados em coluna por regras CSS perigosas', () => {
  assert.doesNotMatch(css, /overflow-wrap\s*:\s*anywhere/i);
  assert.doesNotMatch(css, /word-break\s*:\s*break-all/i);
});

test('CSS preserva regras esperadas para dados compactos e tabelas grandes', () => {
  assert.match(css, /white-space\s*:\s*nowrap/i);
  assert.match(css, /overflow-x\s*:\s*auto/i);
});
