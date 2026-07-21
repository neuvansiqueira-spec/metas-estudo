const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const script = fs.readFileSync('script.js', 'utf8');

test('Dashboard preenche o conteúdo recolhível da Central de Metas', () => {
  const dashboardStart = script.indexOf('function renderDashboard()');
  const dashboardEnd = script.indexOf('function renderEdital()', dashboardStart);
  const dashboard = script.slice(dashboardStart, dashboardEnd);
  assert.match(dashboard, /renderDashboardGoalsScaleSummary\(\)/);
  assert.match(script, /function renderDashboardGoalsScaleSummary\(\)/);
  assert.match(script, /elements\.dashboardGoalsScaleSummary\.innerHTML/);
});

test('tela completa e Dashboard reutilizam o mesmo resumo sem divergência', () => {
  const centralStart = script.indexOf('function renderCentralGoals()');
  const centralEnd = script.indexOf('const CENTRAL_TIME_CHART_COLORS', centralStart);
  assert.match(script.slice(centralStart, centralEnd), /renderDashboardGoalsScaleSummary\(\)/);
});
