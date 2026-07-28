const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const source = fs.readFileSync("script.js", "utf8");

function functionSource(name, nextName) {
  const start = source.indexOf(`function ${name}`);
  const end = source.indexOf(`function ${nextName}`, start);
  assert.ok(start >= 0, `${name} não foi encontrada`);
  assert.ok(end > start, `${nextName} deve vir depois de ${name}`);
  return source.slice(start, end);
}

test("o núcleo libera a interface antes da manutenção pesada", () => {
  const bootstrap = functionSource(
    "bootstrapApplication()",
    "handleBootstrapFailure"
  );
  const maintenanceCall = bootstrap.indexOf(
    "runPostInteractiveBootstrapMaintenanceV169"
  );

  assert.ok(maintenanceCall >= 0);
  assert.ok(bootstrap.indexOf("showView(hashToView()") < maintenanceCall);
  assert.ok(bootstrap.indexOf('markStartupMilestoneV169("dataRenderedMs")') < maintenanceCall);
  assert.ok(bootstrap.indexOf("hideBootstrapLoadingState()") < maintenanceCall);
  assert.ok(bootstrap.indexOf("waitForInteractivePaintV169()") < maintenanceCall);
  assert.ok(bootstrap.indexOf('"aldus:core-interactive"') < maintenanceCall);
});

test("reparos e rebalanceamentos não permanecem no trecho crítico do bootstrap", () => {
  const bootstrap = functionSource(
    "bootstrapApplication()",
    "handleBootstrapFailure"
  );
  const criticalEnd = bootstrap.indexOf(
    "runPostInteractiveBootstrapMaintenanceV169"
  );
  const critical = bootstrap.slice(0, criticalEnd);
  const heavyCalls = [
    "repairDailyPlanningInflationV108(state",
    "reconcileDailyGoalsWithPlanning(state",
    "syncAllFactoryMaterials()",
    "repairAutomaticGoalDuplicatesV75(state)",
    "repairCompletedPlanningGoalsV76(state)",
    "rebalanceFuturePlanningGoalsV77(state)",
    "rebalanceCurrentWeekV78(state)",
    "rebalanceCurrentMonthV79(state)",
    "migrateFactoryMaterialsPlanningV80(state)",
    "repairExistingFactoryMaterialLinksV85(state)"
  ];

  for (const call of heavyCalls) {
    assert.doesNotMatch(critical, new RegExp(call.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});

test("a manutenção preserva todas as rotinas e sua ordem histórica", () => {
  const maintenance = functionSource(
    "runPostInteractiveBootstrapMaintenanceV169(recoveredError)",
    "bootstrapApplication"
  );
  const bootstrapSource = functionSource(
    "bootstrapApplication()",
    "handleBootstrapFailure"
  );
  const orderedCalls = [
    "repairDailyPlanningInflationV108(state",
    "reconcileDailyGoalsWithPlanning(state",
    "syncAllFactoryMaterials()",
    "repairAutomaticGoalDuplicatesV75(state)",
    "repairCompletedPlanningGoalsV76(state)",
    "rebalanceFuturePlanningGoalsV77(state)",
    "rebalanceCurrentWeekV78(state)",
    "rebalanceCurrentMonthV79(state)",
    "migrateFactoryMaterialsPlanningV80(state)",
    "repairExistingFactoryMaterialLinksV85(state)"
  ];

  let previous = -1;
  for (const call of orderedCalls) {
    const index = maintenance.indexOf(call);
    assert.ok(index > previous, `${call} deve manter a ordem histórica`);
    previous = index;
  }

  assert.doesNotMatch(
    maintenance,
    /clearProjectLocalStorage|localStorage\.clear|deleteDatabase|tombstone.*delete/i
  );
  assert.match(bootstrapSource, /recoverLegacyTimerMinutesForGoals\(state\)/);
});

test("a conclusão secundária somente é marcada depois da manutenção", () => {
  const bootstrap = functionSource(
    "bootstrapApplication()",
    "handleBootstrapFailure"
  );
  assert.ok(
    bootstrap.indexOf("runPostInteractiveBootstrapMaintenanceV169") <
      bootstrap.indexOf('markStartupMilestoneV169("secondaryInitializationCompleteMs")')
  );
  assert.equal(
    (bootstrap.match(/showView\(hashToView\(\)/g) || []).length,
    1,
    "a rota inicial deve ser ativada uma única vez"
  );
  assert.match(source, /data-aldus-interface-interactive-ms/);
  assert.match(source, /data-aldus-bootstrap-maintenance-ms/);
});
