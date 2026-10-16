/**
 * Automated Test Suite for Engine Health Index (EHI) Formula
 * Tests all 14 required cases from Part 6.7 + intermediate mixed predictions.
 * Executable directly via: node --experimental-strip-types tests/engineHealthIndex.test.ts
 */

import assert from 'node:assert';
import {
  calculateEngineHealthIndex,
  EHI_WEIGHTS,
  mapTabularPrediction,
  mapAudioPrediction,
  mapVibrationPrediction,
  EHI_INTERPRETATION_WARNING
} from '../src/lib/engineHealthIndex.ts';

function runTestSuite() {
  console.log('====================================================');
  console.log('EngineGuard Engine Health Index (EHI) Test Suite');
  console.log('====================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function test(name: string, fn: () => void) {
    totalTests++;
    try {
      fn();
      console.log(`[PASS] ${name}`);
      passedTests++;
    } catch (err: any) {
      console.error(`[FAIL] ${name}`);
      console.error(err);
      process.exitCode = 1;
    }
  }

  // Case 1: All three models return no-fault predictions: EHI = 100
  test('Case 1: All 3 models return no-fault predictions -> EHI = 100.0', () => {
    const res = calculateEngineHealthIndex({
      tabularPrediction: 'Normal (no fault)',
      audioPrediction: 'Normal engine',
      vibrationPrediction: 'Healthy bearing',
    });
    assert.strictEqual(res.isAvailable, true);
    assert.strictEqual(res.score, 100.0);
    assert.strictEqual(res.scoreFormatted, '100.0');
    assert.strictEqual(res.contributingStreamsCount, 3);
  });

  // Case 2: All three models return fault predictions: EHI = 0
  test('Case 2: All 3 models return fault predictions -> EHI = 0.0', () => {
    const res = calculateEngineHealthIndex({
      tabularPrediction: 'Fault type 1',
      audioPrediction: 'Engine issue',
      vibrationPrediction: 'Faulty bearing',
    });
    assert.strictEqual(res.isAvailable, true);
    assert.strictEqual(res.score, 0.0);
    assert.strictEqual(res.scoreFormatted, '0.0');
    assert.strictEqual(res.contributingStreamsCount, 3);
  });

  // Case 3: Only tabular data, class 0: EHI = 100
  test('Case 3: Only tabular data, class 0 (no fault) -> EHI = 100.0', () => {
    const res = calculateEngineHealthIndex({
      tabularPrediction: '0',
      audioPrediction: null,
      vibrationPrediction: null,
    });
    assert.strictEqual(res.isAvailable, true);
    assert.strictEqual(res.score, 100.0);
    assert.strictEqual(res.scoreFormatted, '100.0');
    assert.strictEqual(res.contributingStreamsCount, 1);
    assert.strictEqual(res.streams.tabular.risk, 0);
  });

  // Case 4: Only tabular data, class 2: EHI = 0
  test('Case 4: Only tabular data, class 2 (Lean mixture) -> EHI = 0.0', () => {
    const res = calculateEngineHealthIndex({
      tabularPrediction: '2',
      audioPrediction: null,
      vibrationPrediction: null,
    });
    assert.strictEqual(res.isAvailable, true);
    assert.strictEqual(res.score, 0.0);
    assert.strictEqual(res.scoreFormatted, '0.0');
    assert.strictEqual(res.streams.tabular.risk, 1);
  });

  // Case 5: Only audio, Normal engine: EHI = 100
  test('Case 5: Only audio, Normal engine -> EHI = 100.0', () => {
    const res = calculateEngineHealthIndex({
      tabularPrediction: null,
      audioPrediction: 'Normal engine',
      vibrationPrediction: null,
    });
    assert.strictEqual(res.isAvailable, true);
    assert.strictEqual(res.score, 100.0);
    assert.strictEqual(res.streams.audio.risk, 0);
  });

  // Case 6: Only audio, Engine issue: EHI = 0
  test('Case 6: Only audio, Engine issue -> EHI = 0.0', () => {
    const res = calculateEngineHealthIndex({
      tabularPrediction: null,
      audioPrediction: 'Engine issue',
      vibrationPrediction: null,
    });
    assert.strictEqual(res.isAvailable, true);
    assert.strictEqual(res.score, 0.0);
    assert.strictEqual(res.streams.audio.risk, 1);
  });

  // Case 7: Only audio, Non-engine issue: EHI unavailable
  test('Case 7: Only audio, Non-engine issue -> EHI unavailable (excluded)', () => {
    const res = calculateEngineHealthIndex({
      tabularPrediction: null,
      audioPrediction: 'Non-engine issue',
      vibrationPrediction: null,
    });
    assert.strictEqual(res.isAvailable, false);
    assert.strictEqual(res.score, null);
    assert.strictEqual(res.scoreFormatted, 'Unavailable');
    assert.strictEqual(res.streams.audio.isApplicable, false);
    assert.strictEqual(res.streams.audio.risk, null);
  });

  // Case 8: Only vibration, Healthy bearing: EHI = 100
  test('Case 8: Only vibration, Healthy bearing -> EHI = 100.0', () => {
    const res = calculateEngineHealthIndex({
      tabularPrediction: null,
      audioPrediction: null,
      vibrationPrediction: 'Healthy bearing',
    });
    assert.strictEqual(res.isAvailable, true);
    assert.strictEqual(res.score, 100.0);
    assert.strictEqual(res.streams.vibration.risk, 0);
  });

  // Case 9: Only vibration, Faulty bearing: EHI = 0
  test('Case 9: Only vibration, Faulty bearing -> EHI = 0.0', () => {
    const res = calculateEngineHealthIndex({
      tabularPrediction: null,
      audioPrediction: null,
      vibrationPrediction: 'Faulty bearing',
    });
    assert.strictEqual(res.isAvailable, true);
    assert.strictEqual(res.score, 0.0);
    assert.strictEqual(res.streams.vibration.risk, 1);
  });

  // Case 10: Missing stream: calculated strictly using remaining applicable streams
  test('Case 10: Tabular (no-fault) + Vibration (faulty), Audio missing -> dynamic denominator', () => {
    const res = calculateEngineHealthIndex({
      tabularPrediction: 'Normal (no fault)',
      audioPrediction: null,
      vibrationPrediction: 'Faulty bearing',
    });
    assert.strictEqual(res.isAvailable, true);
    // Denominator = 0.697 + 0.219 = 0.916
    // Numerator = 0.697*0 + 0.219*1 = 0.219
    // Expected = 100 * (1 - 0.219 / 0.916) = 76.0917...
    const expected = 100.0 * (1.0 - (0.219 / (0.697 + 0.219)));
    assert(Math.abs(res.score! - expected) < 1e-6);
    assert.strictEqual(res.scoreFormatted, expected.toFixed(1));
    assert.strictEqual(res.contributingStreamsCount, 2);
  });

  // Case 11: Stream fails inference: excluded from both numerator and denominator
  test('Case 11: Failed stream excluded from both numerator and denominator', () => {
    // Tabular failed (passed as null/undefined), Audio = Normal engine
    const res = calculateEngineHealthIndex({
      tabularPrediction: undefined,
      audioPrediction: 'Normal engine',
      vibrationPrediction: null,
    });
    assert.strictEqual(res.isAvailable, true);
    assert.strictEqual(res.score, 100.0);
    assert.strictEqual(res.applicableWeightTotal, EHI_WEIGHTS.audio);
  });

  // Case 12: No applicable streams remain: EHI unavailable, not zero
  test('Case 12: No applicable streams -> EHI unavailable, never zero', () => {
    const res = calculateEngineHealthIndex({
      tabularPrediction: null,
      audioPrediction: null,
      vibrationPrediction: null,
    });
    assert.strictEqual(res.isAvailable, false);
    assert.strictEqual(res.score, null);
    assert.notStrictEqual(res.score, 0);
    assert.strictEqual(res.scoreFormatted, 'Unavailable');
  });

  // Case 13: Audio excluded as Non-engine issue while Tabular (no fault) and Vibration (faulty) available
  test('Case 13: Audio Non-engine issue excluded while Tabular (0) and Vibration (1) remain', () => {
    const res = calculateEngineHealthIndex({
      tabularPrediction: 'No fault',
      audioPrediction: 'Non-engine issue',
      vibrationPrediction: 'Faulty bearing',
    });
    assert.strictEqual(res.isAvailable, true);
    assert.strictEqual(res.streams.audio.isApplicable, false);
    assert.strictEqual(res.contributingStreamsCount, 2);
    const expected = 100.0 * (1.0 - (0.219 / (0.697 + 0.219)));
    assert(Math.abs(res.score! - expected) < 1e-6);
  });

  // Case 14: Unknown class label: excluded from index and reported
  test('Case 14: Unknown class label is excluded and reported as not applicable', () => {
    const res = calculateEngineHealthIndex({
      tabularPrediction: 'RandomUnknownClass123',
      audioPrediction: 'Normal engine',
      vibrationPrediction: null,
    });
    assert.strictEqual(res.isAvailable, true);
    assert.strictEqual(res.streams.tabular.isApplicable, false);
    assert(res.streams.tabular.exclusionReason?.includes('Unknown'));
    // Only Audio contributed
    assert.strictEqual(res.score, 100.0);
    assert.strictEqual(res.contributingStreamsCount, 1);
  });

  // Intermediate Mixed Combinations
  test('Mixed Combination 1: Tabular (0) + Audio (1) + Vibration (0) -> EHI = 91.6', () => {
    const res = calculateEngineHealthIndex({
      tabularPrediction: 'Normal (no fault)',
      audioPrediction: 'Engine issue',
      vibrationPrediction: 'Healthy bearing',
    });
    // Numerator = 0.084, Denom = 1.0 -> EHI = 91.6
    assert.strictEqual(res.scoreFormatted, '91.6');
  });

  test('Mixed Combination 2: Tabular (1) + Audio (0) + Vibration (0) -> EHI = 30.3', () => {
    const res = calculateEngineHealthIndex({
      tabularPrediction: 'Fault type 1',
      audioPrediction: 'Normal engine',
      vibrationPrediction: 'Healthy bearing',
    });
    // Numerator = 0.697, Denom = 1.0 -> EHI = 30.3
    assert.strictEqual(res.scoreFormatted, '30.3');
  });

  test('Interpretation warning text is present and exact', () => {
    const res = calculateEngineHealthIndex({ tabularPrediction: '0' });
    assert(res.interpretationWarning.includes('provisional model-output-based fault-evidence index'));
    assert(res.interpretationWarning.includes('scientific'));
  });

  console.log(`\nAll ${passedTests}/${totalTests} Engine Health Index tests passed successfully!\n`);
}

runTestSuite();
