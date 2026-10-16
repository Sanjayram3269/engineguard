import type { TabularEngineData } from '../types/diagnosis';

export interface TelemetryFeatureDef {
  key: keyof TabularEngineData;
  label: string;
  shortName: string;
  unit: string;
  category: 'intake' | 'kinematics' | 'fuel' | 'combustion' | 'emissions';
  categoryLabel: string;
  minObserved: number;
  maxObserved: number;
  step: number;
  decimals: number;
  description: string;
}

export const TELEMETRY_FEATURE_DEFS: TelemetryFeatureDef[] = [
  // 1. Intake & Throttle
  {
    key: 'MAP',
    label: 'Manifold Absolute Pressure',
    shortName: 'MAP',
    unit: 'bar/V',
    category: 'intake',
    categoryLabel: 'Intake & Manifold',
    minObserved: 0.453,
    maxObserved: 4.547,
    step: 0.01,
    decimals: 3,
    description: 'Intake manifold absolute pressure / sensor transducer output'
  },
  {
    key: 'TPS',
    label: 'Throttle Position Sensor',
    shortName: 'TPS',
    unit: 'V',
    category: 'intake',
    categoryLabel: 'Intake & Manifold',
    minObserved: 0.382,
    maxObserved: 4.048,
    step: 0.01,
    decimals: 3,
    description: 'Throttle potentiometer signal indicating butterfly valve angle'
  },
  // 2. Kinematics & Mechanics
  {
    key: 'RPM',
    label: 'Engine Speed',
    shortName: 'RPM',
    unit: 'RPM',
    category: 'kinematics',
    categoryLabel: 'Kinematics & Dynamics',
    minObserved: 1066.452,
    maxObserved: 5013.402,
    step: 10,
    decimals: 1,
    description: 'Crankshaft rotational velocity in revolutions per minute'
  },
  {
    key: 'Speed',
    label: 'Vehicle Speed',
    shortName: 'Speed',
    unit: 'km/h',
    category: 'kinematics',
    categoryLabel: 'Kinematics & Dynamics',
    minObserved: 22.757,
    maxObserved: 107.539,
    step: 0.5,
    decimals: 1,
    description: 'Vehicle linear road velocity or dynamometer drum speed'
  },
  {
    key: 'Force',
    label: 'Tractive / Load Force',
    shortName: 'Force',
    unit: 'N',
    category: 'kinematics',
    categoryLabel: 'Kinematics & Dynamics',
    minObserved: 2.580,
    maxObserved: 1537.118,
    step: 1,
    decimals: 1,
    description: 'Driveline tractive force / dynamometer braking load'
  },
  {
    key: 'Power',
    label: 'Effective Output Power',
    shortName: 'Power',
    unit: 'kW',
    category: 'kinematics',
    categoryLabel: 'Kinematics & Dynamics',
    minObserved: 0.465,
    maxObserved: 33.946,
    step: 0.1,
    decimals: 2,
    description: 'Computed brake power delivered by the internal combustion engine'
  },
  // 3. Fuel Dynamics
  {
    key: 'Consumption L/H',
    label: 'Fuel Flow Rate (Hourly)',
    shortName: 'Cons. L/H',
    unit: 'L/h',
    category: 'fuel',
    categoryLabel: 'Fuel Consumption',
    minObserved: 1.917,
    maxObserved: 14.810,
    step: 0.1,
    decimals: 2,
    description: 'Volumetric fuel consumption rate per operating hour'
  },
  {
    key: 'Consumption L/100KM',
    label: 'Fuel Consumption (Distance)',
    shortName: 'Cons. L/100KM',
    unit: 'L/100km',
    category: 'fuel',
    categoryLabel: 'Fuel Consumption',
    minObserved: 5.187,
    maxObserved: 20.043,
    step: 0.1,
    decimals: 2,
    description: 'Distance-normalized fuel consumption per 100 kilometers'
  },
  // 4. Combustion & Air-Fuel
  {
    key: 'Lambda',
    label: 'Excess Air Ratio (Lambda)',
    shortName: 'Lambda (λ)',
    unit: 'λ',
    category: 'combustion',
    categoryLabel: 'Combustion & Air-Fuel',
    minObserved: 0.695,
    maxObserved: 1.149,
    step: 0.005,
    decimals: 3,
    description: 'Equivalence ratio: λ = 1.0 indicates stoichiometric combustion'
  },
  {
    key: 'AFR',
    label: 'Air-to-Fuel Ratio',
    shortName: 'AFR',
    unit: ':1',
    category: 'combustion',
    categoryLabel: 'Combustion & Air-Fuel',
    minObserved: 10.210,
    maxObserved: 16.893,
    step: 0.05,
    decimals: 2,
    description: 'Actual mass ratio of air to fuel inducted into cylinders'
  },
  // 5. Exhaust Emissions
  {
    key: 'CO',
    label: 'Carbon Monoxide',
    shortName: 'CO',
    unit: '%',
    category: 'emissions',
    categoryLabel: 'Exhaust Emissions',
    minObserved: 0.421,
    maxObserved: 10.132,
    step: 0.05,
    decimals: 2,
    description: 'Exhaust gas carbon monoxide volume percentage'
  },
  {
    key: 'HC',
    label: 'Hydrocarbons',
    shortName: 'HC',
    unit: 'ppm',
    category: 'emissions',
    categoryLabel: 'Exhaust Emissions',
    minObserved: 1.787,
    maxObserved: 975.657,
    step: 5,
    decimals: 1,
    description: 'Unburned hydrocarbons emission concentration in parts-per-million'
  },
  {
    key: 'CO2',
    label: 'Carbon Dioxide',
    shortName: 'CO2',
    unit: '%',
    category: 'emissions',
    categoryLabel: 'Exhaust Emissions',
    minObserved: 8.649,
    maxObserved: 15.129,
    step: 0.05,
    decimals: 2,
    description: 'Exhaust carbon dioxide volume percentage'
  },
  {
    key: 'O2',
    label: 'Exhaust Oxygen',
    shortName: 'O2',
    unit: '%',
    category: 'emissions',
    categoryLabel: 'Exhaust Emissions',
    minObserved: 0.203,
    maxObserved: 1.151,
    step: 0.01,
    decimals: 3,
    description: 'Post-catalyst or manifold residual oxygen percentage'
  }
];

export const TELEMETRY_CATEGORIES = [
  { id: 'intake', label: 'Intake & Manifold' },
  { id: 'kinematics', label: 'Kinematics & Dynamics' },
  { id: 'fuel', label: 'Fuel Consumption' },
  { id: 'combustion', label: 'Combustion & Air-Fuel' },
  { id: 'emissions', label: 'Exhaust Emissions' }
] as const;

/**
 * 4 Verified real records directly extracted from EngineFaultDB_Final.csv
 * Confirmed to produce exact target classes in trained Random Forest.
 */
export interface VerifiedDatasetExample {
  id: string;
  name: string;
  targetClass: string;
  classIndex: number;
  description: string;
  operatingPoint: string;
  data: TabularEngineData;
}

export const VERIFIED_DATASET_EXAMPLES: VerifiedDatasetExample[] = [
  {
    id: 'class-0-normal',
    name: 'Normal Operating Baseline',
    targetClass: 'Normal (no fault)',
    classIndex: 0,
    operatingPoint: '1169 RPM • 25.7 km/h • λ 0.997',
    description: 'Nominal stoichiometric combustion at low load with balanced emissions.',
    data: {
      MAP: 3.478,
      TPS: 1.899,
      Force: 7.43,
      Power: 5.232,
      RPM: 1168.882,
      'Consumption L/H': 2.901,
      'Consumption L/100KM': 12.067,
      Speed: 25.698,
      CO: 0.465,
      HC: 187.293,
      CO2: 14.058,
      O2: 1.051,
      Lambda: 0.997,
      AFR: 14.662
    }
  },
  {
    id: 'class-1-fault',
    name: 'Fault Scenario 1',
    targetClass: 'Fault type 1',
    classIndex: 1,
    operatingPoint: '1198 RPM • 81.5 N • CO 1.90%',
    description: 'Manifold depression deficit with elevated CO emissions and altered fuel trim.',
    data: {
      MAP: 1.156,
      TPS: 0.779,
      Force: 81.519,
      Power: 0.496,
      RPM: 1198.404,
      'Consumption L/H': 2.102,
      'Consumption L/100KM': 8.468,
      Speed: 25.647,
      CO: 1.9,
      HC: 244.333,
      CO2: 12.971,
      O2: 0.548,
      Lambda: 0.993,
      AFR: 14.597
    }
  },
  {
    id: 'class-2-fault',
    name: 'Fault Scenario 2',
    targetClass: 'Fault type 2',
    classIndex: 2,
    operatingPoint: '3600 RPM • 80.2 km/h • λ 1.023',
    description: 'High-speed cruise under moderate load with thermal and oxygen boundary shift.',
    data: {
      MAP: 1.594,
      TPS: 1.095,
      Force: 79.954,
      Power: 1.775,
      RPM: 3600.052,
      'Consumption L/H': 4.357,
      'Consumption L/100KM': 5.584,
      Speed: 80.151,
      CO: 0.698,
      HC: 155.112,
      CO2: 14.24,
      O2: 1.062,
      Lambda: 1.023,
      AFR: 15.035
    }
  },
  {
    id: 'class-3-fault',
    name: 'Fault Scenario 3',
    targetClass: 'Fault type 3',
    classIndex: 3,
    operatingPoint: '1820 RPM • 289.3 N • Rich AFR 14.19',
    description: 'Elevated tractive resistance (289 N) with rich air-fuel displacement and high load.',
    data: {
      MAP: 1.859,
      TPS: 0.932,
      Force: 289.272,
      Power: 3.147,
      RPM: 1819.823,
      'Consumption L/H': 3.262,
      'Consumption L/100KM': 7.809,
      Speed: 39.743,
      CO: 0.462,
      HC: 216.986,
      CO2: 12.538,
      O2: 0.836,
      Lambda: 0.965,
      AFR: 14.191
    }
  }
];

export interface ValidationResult {
  isValid: boolean;
  data?: TabularEngineData;
  fieldErrors: Partial<Record<keyof TabularEngineData, string>>;
  fieldWarnings: Partial<Record<keyof TabularEngineData, string>>;
  summaryError?: string;
  warningCount: number;
}

/**
 * Validates manual inputs from a string-based dictionary.
 * Ensures:
 * 1. All 14 required channels are present and non-empty.
 * 2. Every value is a finite floating-point number.
 * 3. Does not permit 'Fault' or target column tampering.
 * 4. Flags out-of-observed-range values as advisory warnings without blocking execution.
 */
export function validateTabularInputs(
  rawInputs: Record<string, string | number | undefined | null>
): ValidationResult {
  const fieldErrors: Partial<Record<keyof TabularEngineData, string>> = {};
  const fieldWarnings: Partial<Record<keyof TabularEngineData, string>> = {};
  const parsedData: Partial<TabularEngineData> = {};

  for (const def of TELEMETRY_FEATURE_DEFS) {
    const rawVal = rawInputs[def.key];

    if (rawVal === undefined || rawVal === null || (typeof rawVal === 'string' && rawVal.trim() === '')) {
      fieldErrors[def.key] = `${def.shortName} is required`;
      continue;
    }

    const num = typeof rawVal === 'number' ? rawVal : parseFloat(rawVal);

    if (typeof rawVal === 'string' && !/^-?\d*(\.\d+)?$/.test(rawVal.trim())) {
      fieldErrors[def.key] = 'Must be a valid decimal number';
      continue;
    }

    if (!Number.isFinite(num)) {
      fieldErrors[def.key] = 'Must be a finite numeric value';
      continue;
    }

    // Advisory warning for out-of-observed dataset range
    if (num < def.minObserved || num > def.maxObserved) {
      fieldWarnings[def.key] = `Outside training range (${def.minObserved.toFixed(def.decimals >= 2 ? 2 : 1)} - ${def.maxObserved.toFixed(def.decimals >= 2 ? 2 : 1)} ${def.unit})`;
    }

    parsedData[def.key] = num;
  }

  const errorKeys = Object.keys(fieldErrors);
  const isValid = errorKeys.length === 0;

  let summaryError: string | undefined;
  if (!isValid) {
    if (errorKeys.length === TELEMETRY_FEATURE_DEFS.length) {
      summaryError = 'All 14 sensor channels are required. Please enter numeric values or load a dataset preset.';
    } else {
      summaryError = `Please correct ${errorKeys.length} invalid or missing sensor value${errorKeys.length > 1 ? 's' : ''}.`;
    }
  }

  return {
    isValid,
    data: isValid ? (parsedData as TabularEngineData) : undefined,
    fieldErrors,
    fieldWarnings,
    summaryError,
    warningCount: Object.keys(fieldWarnings).length
  };
}

/**
 * Converts a TabularEngineData object to a string map suitable for form inputs.
 */
export function tabularDataToFormStrings(data: TabularEngineData): Record<string, string> {
  const result: Record<string, string> = {};
  for (const def of TELEMETRY_FEATURE_DEFS) {
    const val = data[def.key];
    result[def.key] = val !== undefined && val !== null ? String(val) : '';
  }
  return result;
}
