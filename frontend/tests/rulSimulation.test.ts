import assert from 'node:assert/strict';
import {
  generateSyntheticBearingRows, simulateBearingRul, syntheticRowsToCsv, validateRulInput,
  type RulSimulationInput,
} from '../src/lib/rulSimulation.ts';

const base: RulSimulationInput = {
  currentOdometerKm: 85000,
  bearingInstallOdometerKm: 20000,
  currentRms: 1.1,
  healthyRms: 0.68,
  inspectionRms: 2.45,
  assumedMedianLifeKm: 120000,
  dutyProfile: 'normal',
};

assert.equal(validateRulInput(base), null);
assert.match(validateRulInput({ ...base, bearingInstallOdometerKm: 90000 }) || '', /odometer/i);
assert.match(validateRulInput({ ...base, inspectionRms: 0.5 }) || '', /above healthy/i);
assert.match(validateRulInput({ ...base, currentRms: Number.NaN }) || '', /numeric/i);

const result = simulateBearingRul(base);
assert.equal(result.bearingAgeKm, 65000);
assert.equal(result.cohortSize, 600);
assert.equal(result.matchedCount, 100);
assert.ok(result.lowKm <= result.medianKm && result.medianKm <= result.highKm);
assert.equal(result.projectedInspectionOdometerKm, base.currentOdometerKm + result.medianKm);
assert.deepEqual(simulateBearingRul(base), result, 'fixed seed must be reproducible');

const higherVibration = simulateBearingRul({ ...base, currentRms: 1.8 });
assert.ok(higherVibration.medianKm < result.medianKm, 'higher RMS should shorten this demo scenario');
const threshold = simulateBearingRul({ ...base, currentRms: 2.45 });
assert.equal(threshold.medianKm, 0);
assert.equal(threshold.status, 'urgent');

const rows = generateSyntheticBearingRows(base);
assert.equal(rows.length, 7800);
assert.deepEqual(generateSyntheticBearingRows(base), rows, 'training data must be reproducible');
assert.ok(rows.every(row => row.labelSource === 'synthetic' && row.rulToInspectionKm >= 0));
assert.equal(rows[0].bearingAgeKm, 0);
assert.equal(rows[12].rulToInspectionKm, 0);
assert.equal(rows[12].vibrationRms, base.inspectionRms);
assert.equal(syntheticRowsToCsv(rows).trim().split('\n').length, 7801);

console.log('RUL simulation: 17 assertions passed');
