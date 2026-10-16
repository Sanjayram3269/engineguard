/**
 * Automated Test Suite for EngineGuard Tabular Validation Engine
 * Executable directly via: node --experimental-strip-types tests/tabularValidation.test.ts
 */

import assert from 'node:assert';
import {
  TELEMETRY_FEATURE_DEFS,
  VERIFIED_DATASET_EXAMPLES,
  validateTabularInputs,
  tabularDataToFormStrings,
  TELEMETRY_CATEGORIES,
  type ValidationResult
} from '../src/lib/tabularValidation.ts';

function runTestSuite() {
  console.log('====================================================');
  console.log('EngineGuard Tabular Manual Input Test Suite');
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

  // --------------------------------------------------------------------------
  // TEST 1: Schema Definition
  // --------------------------------------------------------------------------
  test('TELEMETRY_FEATURE_DEFS defines exactly 14 features without target column', () => {
    assert.strictEqual(TELEMETRY_FEATURE_DEFS.length, 14);

    const keys = TELEMETRY_FEATURE_DEFS.map(d => d.key);
    const expected = [
      'MAP', 'TPS', 'RPM', 'Speed', 'Force', 'Power',
      'Consumption L/H', 'Consumption L/100KM',
      'Lambda', 'AFR', 'CO', 'HC', 'CO2', 'O2'
    ];
    for (const k of expected) {
      assert(keys.includes(k as any), `Missing feature: ${k}`);
    }
    // Strict non-negotiable: Fault must NOT be in the input feature set
    assert(!keys.includes('Fault' as any), 'Target column Fault must never be an input feature');
  });

  // --------------------------------------------------------------------------
  // TEST 2: Category Grouping & Physical Ranges
  // --------------------------------------------------------------------------
  test('Every feature has a valid category and minObserved < maxObserved', () => {
    const validCatIds = TELEMETRY_CATEGORIES.map(c => c.id);
    for (const def of TELEMETRY_FEATURE_DEFS) {
      assert(validCatIds.includes(def.category), `Invalid category for ${def.key}`);
      assert(def.minObserved < def.maxObserved, `Invalid bounds for ${def.key}: min >= max`);
      assert(def.step > 0, `Step must be positive for ${def.key}`);
    }
  });

  // --------------------------------------------------------------------------
  // TEST 3: Verified Dataset Presets
  // --------------------------------------------------------------------------
  test('Verified dataset examples cover classes 0, 1, 2, 3 with complete 14 features', () => {
    assert.strictEqual(VERIFIED_DATASET_EXAMPLES.length, 4);
    const classes = VERIFIED_DATASET_EXAMPLES.map(e => e.classIndex).sort();
    assert.deepStrictEqual(classes, [0, 1, 2, 3]);

    for (const ex of VERIFIED_DATASET_EXAMPLES) {
      for (const def of TELEMETRY_FEATURE_DEFS) {
        assert(def.key in ex.data, `Example ${ex.id} missing ${def.key}`);
        const val = ex.data[def.key];
        assert(typeof val === 'number' && Number.isFinite(val), `${def.key} in ${ex.id} must be finite number`);
      }
    }
  });

  // --------------------------------------------------------------------------
  // TEST 4: Valid Form Inputs
  // --------------------------------------------------------------------------
  test('validateTabularInputs accepts valid numeric strings for all 14 channels', () => {
    const normalExample = VERIFIED_DATASET_EXAMPLES[0].data;
    const formStrings = tabularDataToFormStrings(normalExample);
    const res = validateTabularInputs(formStrings);

    assert.strictEqual(res.isValid, true);
    assert(res.data !== undefined);
    assert.strictEqual(Object.keys(res.fieldErrors).length, 0);
    assert.strictEqual(res.data.RPM, normalExample.RPM);
    assert.strictEqual(res.data.MAP, normalExample.MAP);
    assert.strictEqual(res.data.TPS, normalExample.TPS);
  });

  // --------------------------------------------------------------------------
  // TEST 5: Empty Fields Rejection (No Silent Zero Coercion)
  // --------------------------------------------------------------------------
  test('Rejects empty fields and does NOT silently coerce empty strings to 0', () => {
    const emptyInputs: Record<string, string> = {};
    for (const def of TELEMETRY_FEATURE_DEFS) emptyInputs[def.key] = '';

    const res = validateTabularInputs(emptyInputs);
    assert.strictEqual(res.isValid, false);
    assert.strictEqual(Object.keys(res.fieldErrors).length, 14);
    assert(res.summaryError?.includes('14 sensor channels'));

    // Partial empty
    const partial = tabularDataToFormStrings(VERIFIED_DATASET_EXAMPLES[0].data);
    partial['RPM'] = '';
    partial['AFR'] = '   ';
    const resPartial = validateTabularInputs(partial);
    assert.strictEqual(resPartial.isValid, false);
    assert.strictEqual(resPartial.data, undefined);
    assert(resPartial.fieldErrors['RPM']?.includes('required'));
    assert(resPartial.fieldErrors['AFR']?.includes('required'));
  });

  // --------------------------------------------------------------------------
  // TEST 6: Non-numeric and Non-finite Rejection
  // --------------------------------------------------------------------------
  test('Rejects non-numeric text, NaN, and Infinity', () => {
    const base = tabularDataToFormStrings(VERIFIED_DATASET_EXAMPLES[1].data);

    // Alpha string
    const textRes = validateTabularInputs({ ...base, MAP: 'invalid_number' });
    assert.strictEqual(textRes.isValid, false);
    assert(textRes.fieldErrors['MAP']?.includes('valid decimal'));

    // Infinity
    const infRes = validateTabularInputs({ ...base, TPS: 'Infinity' });
    assert.strictEqual(infRes.isValid, false);
    assert(textRes.fieldErrors['MAP'] !== undefined);

    // NaN
    const nanRes = validateTabularInputs({ ...base, Force: 'NaN' });
    assert.strictEqual(nanRes.isValid, false);
  });

  // --------------------------------------------------------------------------
  // TEST 7: Advisory Out-of-Range Warnings (Non-blocking)
  // --------------------------------------------------------------------------
  test('Flags values outside dataset observed range as non-blocking advisory warnings', () => {
    const base = tabularDataToFormStrings(VERIFIED_DATASET_EXAMPLES[0].data);
    // RPM max observed is ~5013 RPM; test with 6500 RPM
    const res = validateTabularInputs({ ...base, RPM: '6500' });

    // Must be valid (not blocked)
    assert.strictEqual(res.isValid, true);
    assert(res.data !== undefined);
    assert.strictEqual(res.data.RPM, 6500);

    // Must have advisory warning
    assert(res.fieldWarnings['RPM']?.includes('Outside training range'));
    assert.strictEqual(res.warningCount, 1);
  });

  // --------------------------------------------------------------------------
  // TEST 8: Zero & Negative Values Handling
  // --------------------------------------------------------------------------
  test('Accepts numeric zero and negative numbers properly', () => {
    const base = tabularDataToFormStrings(VERIFIED_DATASET_EXAMPLES[0].data);
    const res = validateTabularInputs({ ...base, Force: '0' });
    assert.strictEqual(res.isValid, true);
    assert.strictEqual(res.data?.Force, 0);

    const resNeg = validateTabularInputs({ ...base, Force: '-10.5' });
    assert.strictEqual(resNeg.isValid, true);
    assert.strictEqual(resNeg.data?.Force, -10.5);
  });

  // --------------------------------------------------------------------------
  // TEST 9: Round-trip Conversion
  // --------------------------------------------------------------------------
  test('tabularDataToFormStrings produces exact reversible strings for all 4 classes', () => {
    for (const ex of VERIFIED_DATASET_EXAMPLES) {
      const strMap = tabularDataToFormStrings(ex.data);
      const parsed = validateTabularInputs(strMap);
      assert.strictEqual(parsed.isValid, true);
      assert(parsed.data !== undefined);

      for (const def of TELEMETRY_FEATURE_DEFS) {
        assert.strictEqual(parsed.data[def.key], ex.data[def.key]);
      }
    }
  });

  console.log(`\nAll ${passedTests}/${totalTests} tabular validation tests passed successfully!\n`);
}

runTestSuite();
