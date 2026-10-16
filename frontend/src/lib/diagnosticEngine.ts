import {
  TabularEngineData,
  AudioEngineData,
  VibrationEngineData,
  DiagnosticResult,
  PresetScenario,
  ApiDiagnosticResult
} from '../types/diagnosis';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

// ==========================================
// 1. CALIBRATED REAL TABULAR PRESETS
// Sourced directly from EngineFaultDB_Final.csv
// ==========================================

export const TABULAR_PRESETS: PresetScenario<TabularEngineData>[] = [
  {
    id: 'tab-nominal',
    title: 'Baseline Normal (No Fault)',
    shortDescription: 'Balanced combustion envelope across all 14 telemetry channels.',
    expectedFault: 'Normal (no fault)',
    data: {
      MAP: 3.478,
      TPS: 1.899,
      Force: 7.43,
      Power: 5.232,
      RPM: 1168.9,
      'Consumption L/H': 2.901,
      'Consumption L/100KM': 12.067,
      Speed: 25.7,
      CO: 0.465,
      HC: 187.3,
      CO2: 14.058,
      O2: 1.051,
      Lambda: 0.997,
      AFR: 14.662
    }
  },
  {
    id: 'tab-fault-1',
    title: 'Fault Scenario 1 (Manifold / Air-Fuel Anomaly)',
    shortDescription: 'Elevated engine force with depressed manifold pressure and high CO emission.',
    expectedFault: 'Fault type 1',
    data: {
      MAP: 1.156,
      TPS: 0.779,
      Force: 81.519,
      Power: 0.496,
      RPM: 1198.4,
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
    id: 'tab-fault-2',
    title: 'Fault Scenario 2 (Cylinder / Piston Stress)',
    shortDescription: 'High cruising RPM with elevated manifold depression and lean oxygen excursion.',
    expectedFault: 'Fault type 2',
    data: {
      MAP: 1.594,
      TPS: 1.095,
      Force: 79.954,
      Power: 1.775,
      RPM: 3600.1,
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
    id: 'tab-fault-3',
    title: 'Fault Scenario 3 (Rotational Load / Crank Strain)',
    shortDescription: 'Elevated reactive force (289 N) with altered stoichiometric combustion ratio.',
    expectedFault: 'Fault type 3',
    data: {
      MAP: 1.859,
      TPS: 0.932,
      Force: 289.272,
      Power: 3.147,
      RPM: 1819.8,
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

// ==========================================
// 2. AUDIO & VIBRATION PRESETS
// ==========================================

export const AUDIO_PRESETS: PresetScenario<AudioEngineData>[] = [
  {
    id: 'aud-nominal',
    title: 'Nominal Engine Acoustic Baseline',
    shortDescription: 'Clean periodic combustion cycle with uniform valvetrain and exhaust harmonics.',
    expectedFault: 'Normal engine',
    data: {
      fileName: '038.mp3',
      durationSeconds: 4.8,
      sampleRate: 44100,
      peakDb: -14.2,
      dominantHarmonicHz: 125,
      spectralPoints: [
        { freq: 125, magnitude: 0.85 },
        { freq: 250, magnitude: 0.45 },
        { freq: 500, magnitude: 0.22 },
        { freq: 1000, magnitude: 0.12 }
      ]
    }
  },
  {
    id: 'aud-issue',
    title: 'Connecting Rod Bearing Acoustic Knock',
    shortDescription: 'High-energy transient impulsive bursts indicating mechanical looseness.',
    expectedFault: 'Engine Issue',
    data: {
      fileName: '001.mp3',
      durationSeconds: 3.6,
      sampleRate: 44100,
      peakDb: -2.8,
      dominantHarmonicHz: 2380,
      spectralPoints: [
        { freq: 125, magnitude: 0.35 },
        { freq: 1200, magnitude: 0.65 },
        { freq: 2380, magnitude: 0.95 },
        { freq: 4800, magnitude: 0.52 }
      ]
    }
  }
];

export const VIBRATION_PRESETS: PresetScenario<VibrationEngineData>[] = [
  {
    id: 'vib-nominal',
    title: 'Balanced Tri-Axial Accelerometer Baseline',
    shortDescription: 'Uniform primary 1X/2X rotational harmonics within hydrodynamic tolerance.',
    expectedFault: 'Healthy (No Bearing Fault)',
    data: {
      sampleName: 'healthy_journal_bearing.csv',
      samplingRateHz: 5000,
      rmsAccelerationG: 0.68,
      peakToPeakG: 2.1,
      crestFactor: 3.08,
      dominantOrderHz: 83.3,
      timeSeries: Array.from({ length: 60 }, (_, i) => ({
        t: i * 0.002,
        a: Math.sin(i * 0.4) * 0.6 + (Math.random() - 0.5) * 0.1
      })),
      fftSpectrum: [
        { freq: 25, amp: 0.15 },
        { freq: 50, amp: 0.55 },
        { freq: 100, amp: 0.20 }
      ]
    }
  },
  {
    id: 'vib-faulty',
    title: 'Journal Bearing Radial Play & Clearance Wear',
    shortDescription: 'Severe harmonic vibration peak indicating journal bearing damage.',
    expectedFault: 'Faulty (Bearing Fault Detected)',
    data: {
      sampleName: '1st at -10 2022Jun04-2239-0005.csv',
      samplingRateHz: 5000,
      rmsAccelerationG: 2.45,
      peakToPeakG: 9.8,
      crestFactor: 4.0,
      dominantOrderHz: 41.6,
      timeSeries: Array.from({ length: 60 }, (_, i) => ({
        t: i * 0.002,
        a: Math.sin(i * 0.25) * 2.2 + Math.sin(i * 0.8) * 1.1 + (Math.random() - 0.5) * 0.4
      })),
      fftSpectrum: [
        { freq: 41.6, amp: 2.4 },
        { freq: 83.2, amp: 1.2 },
        { freq: 166.4, amp: 0.8 }
      ]
    }
  }
];

// ==========================================
// 3. REAL LIVE API CALLERS
// ==========================================

export async function evaluateTabularDataViaApi(input: File | TabularEngineData): Promise<DiagnosticResult> {
  let resp: Response;

  if (input instanceof File) {
    const fd = new FormData();
    fd.append('file', input);
    resp = await fetch(`${API_BASE}/predict/tabular`, {
      method: 'POST',
      body: fd,
    });
  } else {
    resp = await fetch(`${API_BASE}/predict/tabular`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: input }),
    });
  }

  if (!resp.ok) {
    const errText = await resp.text().catch(() => '');
    throw new Error(`Tabular API error (${resp.status}): ${errText}`);
  }

  const body = (await resp.json()) as ApiDiagnosticResult;
  return mapTabularApiResult(body);
}

export async function evaluateAudioDataViaApi(file: File): Promise<DiagnosticResult> {
  const fd = new FormData();
  fd.append('file', file);

  const resp = await fetch(`${API_BASE}/predict/audio`, {
    method: 'POST',
    body: fd,
  });

  if (!resp.ok) {
    const errText = await resp.text().catch(() => '');
    throw new Error(`Audio API error (${resp.status}): ${errText}`);
  }

  const body = (await resp.json()) as ApiDiagnosticResult;
  return mapAudioApiResult(body);
}

export async function evaluateVibrationDataViaApi(file: File): Promise<DiagnosticResult> {
  const fd = new FormData();
  fd.append('file', file);

  const resp = await fetch(`${API_BASE}/predict/vibration`, {
    method: 'POST',
    body: fd,
  });

  if (!resp.ok) {
    const errText = await resp.text().catch(() => '');
    throw new Error(`Vibration API error (${resp.status}): ${errText}`);
  }

  const body = (await resp.json()) as ApiDiagnosticResult;
  return mapVibrationApiResult(body);
}

// ==========================================
// 4. API RESPONSE MAPPERS (REAL ML INFERENCE)
// ==========================================

function mapTabularApiResult(body: ApiDiagnosticResult): DiagnosticResult {
  const predClass = body.predicted_class || body.prediction || 'Unknown';
  const confidence = body.confidence ?? 0;
  const isNominal = predClass === 'Normal (no fault)';
  const confPct = Math.round(confidence * 10000) / 100;

  let faultyComponentId: string | null = null;
  let summary = `Live model classified operating state as: ${predClass}.`;
  let severity: DiagnosticResult['severity'] = isNominal ? 'nominal' : 'critical';

  if (!isNominal) {
    if (predClass === 'Fault type 1') {
      faultyComponentId = 'intakeManifold';
      summary = 'Telemetry indicates anomalous intake depression and exhaust air-fuel stoichiometric shift (Fault type 1).';
    } else if (predClass === 'Fault type 2') {
      faultyComponentId = 'pistons';
      summary = 'Combustion metrics indicate cylinder pre-ignition and piston thermal boundary excursion (Fault type 2).';
    } else if (predClass === 'Fault type 3') {
      faultyComponentId = 'crankshaft';
      summary = 'Rotational load and force metrics indicate hydrodynamic journal bearing stress (Fault type 3).';
    } else {
      faultyComponentId = 'block';
    }
  }

  const classProbEntries = Object.entries(body.class_probabilities || {});
  const metrics: DiagnosticResult['metrics'] = classProbEntries.length > 0
    ? classProbEntries.map(([cls, prob]) => ({
        label: cls,
        value: `${(prob * 100).toFixed(1)}%`,
        status: cls === predClass && !isNominal ? 'critical' : cls === 'Normal (no fault)' ? 'normal' : 'caution'
      }))
    : [
        { label: 'Predicted Class', value: predClass, status: isNominal ? 'normal' : 'critical' },
        { label: 'Vote Fraction', value: `${confPct.toFixed(1)}%`, status: isNominal ? 'normal' : 'caution' }
      ];

  return {
    id: `live-tabular-${Date.now()}`,
    modality: 'tabular',
    timestamp: new Date().toISOString(),
    status: isNominal ? 'NOMINAL' : 'FAULT',
    faultTitle: predClass,
    faultSummary: summary,
    severity,
    confidencePercent: confPct,
    faultyComponentId,
    subsystem: isNominal ? 'Nominal Envelope' : predClass,
    mechanicalRationale: `Random Forest multi-class model evaluated 14 telemetry features. Class vote fraction: ${(confidence * 100).toFixed(1)}%. Review threshold: 56.8%.`,
    findings: [
      `Classification: ${predClass}`,
      `Class-vote confidence: ${confPct.toFixed(1)}%`,
      body.review_required ? 'Inspection advised: confidence near decision threshold' : 'High model consensus'
    ],
    recommendedActions: isNominal
      ? ['Operating parameters nominal. Proceed with standard scheduled maintenance.']
      : [
          `Inspect ${faultyComponentId ? faultyComponentId : 'engine components'} for mechanical fatigue or air/fuel sensor drift.`,
          'Perform physical teardown or bore-scope inspection before high-load operation.'
        ],
    metrics,
    details: {
      summary,
      audio_features: null,
      selected_features: body.actual_features || [],
      top_factors: classProbEntries.map(([cls, prob]) => `${cls}: ${(prob * 100).toFixed(1)}%`),
      fault_probability_classified: confidence.toFixed(4)
    },
    isSimulated: false
  };
}

function mapAudioApiResult(body: ApiDiagnosticResult): DiagnosticResult {
  const pred = body.prediction || 'Unknown';
  const confidence = body.confidence ?? 0;
  const isNominal = pred === 'Normal engine';
  const confPct = Math.round(confidence * 10000) / 100;

  const faultyComponentId = pred === 'Engine Issue' ? 'connectingRods' : null;
  const severity: DiagnosticResult['severity'] = isNominal ? 'nominal' : pred === 'Engine Issue' ? 'critical' : 'moderate';

  const probEntries = Object.entries(body.probabilities || {});
  const metrics: DiagnosticResult['metrics'] = probEntries.length > 0
    ? probEntries.map(([cls, prob]) => ({
        label: cls,
        value: `${(prob * 100).toFixed(1)}%`,
        status: cls === 'Normal engine' ? 'normal' : 'critical'
      }))
    : [{ label: 'Prediction', value: pred, status: isNominal ? 'normal' : 'critical' }];

  return {
    id: `live-audio-${Date.now()}`,
    modality: 'audio',
    timestamp: new Date().toISOString(),
    status: isNominal ? 'NOMINAL' : pred === 'Engine Issue' ? 'FAULT' : 'WARNING',
    faultTitle: pred,
    faultSummary: `Live acoustic classifier identified acoustic signature as: ${pred}.`,
    severity,
    confidencePercent: confPct,
    faultyComponentId,
    subsystem: isNominal ? 'Acoustic Baseline' : 'Valvetrain / Connecting Rods',
    mechanicalRationale: `Spectral feature extraction (MFCCs, spectral roll-off, zero-crossing rate) evaluated by Random Forest audio classifier. Class fraction: ${(confidence * 100).toFixed(1)}%.`,
    findings: [
      `Acoustic Classification: ${pred}`,
      `Model Confidence: ${confPct.toFixed(1)}%`
    ],
    recommendedActions: isNominal
      ? ['Acoustic harmonic energy is uniform. No valvetrain or rod-knock signature detected.']
      : ['Perform stethoscopic audio probe at cylinder block skirt and rod journals.'],
    metrics,
    details: {
      summary: `Acoustic inference completed: ${pred}`,
      audio_features: 'Spectral envelope processed',
      selected_features: body.actual_features || [],
      top_factors: probEntries.map(([cls, p]) => `${cls}: ${(p * 100).toFixed(1)}%`),
      fault_probability_classified: confidence.toFixed(4)
    },
    isSimulated: false
  };
}

function mapVibrationApiResult(body: ApiDiagnosticResult): DiagnosticResult {
  const pred = body.prediction || 'Unknown';
  const confidence = body.confidence ?? 0;
  const isNominal = pred === 'Healthy';
  const confPct = Math.round(confidence * 10000) / 100;

  const faultyComponentId = isNominal ? null : 'crankshaft';
  const severity: DiagnosticResult['severity'] = isNominal ? 'nominal' : 'critical';

  const probEntries = Object.entries(body.class_probabilities || {});
  const metrics: DiagnosticResult['metrics'] = probEntries.length > 0
    ? probEntries.map(([cls, prob]) => ({
        label: cls,
        value: `${(prob * 100).toFixed(1)}%`,
        status: cls === 'Healthy' ? 'normal' : 'critical'
      }))
    : [{ label: 'Vibration Status', value: pred, status: isNominal ? 'normal' : 'critical' }];

  return {
    id: `live-vibration-${Date.now()}`,
    modality: 'vibration',
    timestamp: new Date().toISOString(),
    status: isNominal ? 'NOMINAL' : 'FAULT',
    faultTitle: pred === 'Faulty' ? 'JOURNAL BEARING RADIAL IMBALANCE' : 'HEALTHY VIBRATION SPECTRUM',
    faultSummary: `Live accelerometer model identified tri-axial vibration recording as: ${pred}.`,
    severity,
    confidencePercent: confPct,
    faultyComponentId,
    subsystem: isNominal ? 'Balanced Rotational System' : 'Crankshaft Main Journals',
    mechanicalRationale: `Time-series statistical features extracted from CSV recording and evaluated by trained vibration classifier. Vote fraction: ${(confidence * 100).toFixed(1)}%.`,
    findings: [
      `Vibration Classification: ${pred}`,
      `Model Confidence: ${confPct.toFixed(1)}%`
    ],
    recommendedActions: isNominal
      ? ['Hydrodynamic bearing clearance is within nominal assembly tolerances.']
      : ['Inspect journal bearing shells for babbitt layer degradation, scoring, or excessive radial play.'],
    metrics,
    details: {
      summary: `Vibration inference completed: ${pred}`,
      audio_features: null,
      selected_features: body.actual_features || [],
      top_factors: probEntries.map(([cls, p]) => `${cls}: ${(p * 100).toFixed(1)}%`),
      fault_probability_classified: confidence.toFixed(4)
    },
    isSimulated: false
  };
}

// ==========================================
// 5. RULE-BASED / DEMO EVALUATORS (FALLBACK ONLY)
// Suffixes and labels explicitly marked as Simulated Demo
// ==========================================

export function evaluateTabularData(data: TabularEngineData): DiagnosticResult {
  const timestamp = new Date().toISOString();

  // Simple heuristic checks based on real dataset values
  if (data.Force > 150 && data.CO > 1.0) {
    return {
      id: `sim-tab-${Date.now()}`,
      modality: 'tabular',
      timestamp,
      status: 'FAULT',
      faultTitle: 'FAULT SCENARIO 1 (SIMULATED DEMO)',
      faultSummary: 'High reactive cylinder force with elevated carbon monoxide emissions (Simulated fallback result).',
      severity: 'critical',
      confidencePercent: 91.5,
      faultyComponentId: 'intakeManifold',
      subsystem: 'Intake / Fuel System',
      mechanicalRationale: 'Simulated fallback evaluation: high force coupled with rich exhaust gas indicates incomplete combustion.',
      findings: ['Simulated offline heuristic: High Force (>150N)', 'CO elevated (>1.0%)'],
      recommendedActions: ['Connect live backend API for genuine model inference.'],
      metrics: [
        { label: 'Evaluation Mode', value: 'Simulated Demo', status: 'caution' },
        { label: 'Confidence', value: '91.5%', status: 'caution' }
      ],
      details: {
        summary: 'Simulated Demo Result',
        audio_features: null,
        selected_features: ['Force', 'CO', 'RPM'],
        top_factors: ['High Force', 'CO Emission'],
        fault_probability_classified: '0.9150'
      },
      isSimulated: true
    };
  }

  return {
    id: `sim-tab-nom-${Date.now()}`,
    modality: 'tabular',
    timestamp,
    status: 'NOMINAL',
    faultTitle: 'NOMINAL BASELINE (SIMULATED DEMO)',
    faultSummary: 'Telemetry channels within standard operating envelopes (Simulated fallback result).',
    severity: 'nominal',
    confidencePercent: 95.0,
    faultyComponentId: null,
    subsystem: 'Nominal Envelope',
    mechanicalRationale: 'Simulated fallback evaluation: all 14 parameters match normal baseline ranges.',
    findings: ['Simulated offline heuristic: Nominal parameters'],
    recommendedActions: ['Connect live backend API for genuine model inference.'],
    metrics: [
      { label: 'Evaluation Mode', value: 'Simulated Demo', status: 'normal' },
      { label: 'Confidence', value: '95.0%', status: 'normal' }
    ],
    details: {
      summary: 'Simulated Demo Result',
      audio_features: null,
      selected_features: ['RPM', 'MAP', 'Lambda'],
      top_factors: ['Nominal Envelope'],
      fault_probability_classified: '0.0000'
    },
    isSimulated: true
  };
}

export function evaluateAudioData(data: AudioEngineData): DiagnosticResult {
  const timestamp = new Date().toISOString();
  const isKnock = data.dominantHarmonicHz > 1500 || data.peakDb > -6.0;

  return {
    id: `sim-aud-${Date.now()}`,
    modality: 'audio',
    timestamp,
    status: isKnock ? 'FAULT' : 'NOMINAL',
    faultTitle: isKnock ? 'CONNECTING ROD KNOCK (SIMULATED DEMO)' : 'NOMINAL ACOUSTIC PROFILE (SIMULATED DEMO)',
    faultSummary: isKnock
      ? 'Acoustic spectral density exhibits concentrated impulse peaks (Simulated fallback result).'
      : 'Acoustic emissions distributed normally without transient shocks (Simulated fallback result).',
    severity: isKnock ? 'critical' : 'nominal',
    confidencePercent: isKnock ? 88.0 : 94.0,
    faultyComponentId: isKnock ? 'connectingRods' : null,
    subsystem: isKnock ? 'Valvetrain / Connecting Rods' : 'Acoustic Baseline',
    mechanicalRationale: 'Simulated fallback evaluation when no audio file is uploaded to the backend.',
    findings: ['Offline acoustic heuristic evaluated'],
    recommendedActions: ['Upload a real WAV/MP3 recording to trigger the real model.'],
    metrics: [
      { label: 'Evaluation Mode', value: 'Simulated Demo', status: isKnock ? 'critical' : 'normal' },
      { label: 'Confidence', value: isKnock ? '88.0%' : '94.0%', status: isKnock ? 'caution' : 'normal' }
    ],
    details: {
      summary: 'Simulated Demo Result',
      audio_features: 'Synthetic spectral peaks',
      selected_features: ['Dominant Harmonic', 'Peak dB'],
      top_factors: ['Acoustic Heuristic'],
      fault_probability_classified: isKnock ? '0.8800' : '0.0600'
    },
    isSimulated: true
  };
}

export function evaluateVibrationData(data: VibrationEngineData): DiagnosticResult {
  const timestamp = new Date().toISOString();
  const isFault = data.rmsAccelerationG > 1.2 || data.crestFactor > 3.5;

  return {
    id: `sim-vib-${Date.now()}`,
    modality: 'vibration',
    timestamp,
    status: isFault ? 'FAULT' : 'NOMINAL',
    faultTitle: isFault ? 'JOURNAL BEARING WEAR (SIMULATED DEMO)' : 'NOMINAL VIBRATION SPECTRUM (SIMULATED DEMO)',
    faultSummary: isFault
      ? `Elevated RMS acceleration (${data.rmsAccelerationG.toFixed(2)} G) with high crest factor (Simulated fallback result).`
      : 'Vibration acceleration within nominal limits (Simulated fallback result).',
    severity: isFault ? 'critical' : 'nominal',
    confidencePercent: isFault ? 89.0 : 96.0,
    faultyComponentId: isFault ? 'crankshaft' : null,
    subsystem: isFault ? 'Journal Bearings' : 'Rotational Assembly',
    mechanicalRationale: 'Simulated fallback evaluation when no vibration CSV is uploaded to the backend.',
    findings: ['Offline accelerometer heuristic evaluated'],
    recommendedActions: ['Upload a real vibration CSV to trigger the real model.'],
    metrics: [
      { label: 'Evaluation Mode', value: 'Simulated Demo', status: isFault ? 'critical' : 'normal' },
      { label: 'Confidence', value: isFault ? '89.0%' : '96.0%', status: isFault ? 'caution' : 'normal' }
    ],
    details: {
      summary: 'Simulated Demo Result',
      audio_features: null,
      selected_features: ['RMS Acceleration', 'Crest Factor'],
      top_factors: ['Vibration Heuristic'],
      fault_probability_classified: isFault ? '0.8900' : '0.0400'
    },
    isSimulated: true
  };
}

// ==========================================
// 6. INPUT VALIDATION FUNCTIONS
// ==========================================

export interface ValidationResult {
  isValid: boolean;
  errorMessage?: string;
}

export function validateTabularData(data: TabularEngineData): ValidationResult {
  if (isNaN(data.RPM) || data.RPM < 500 || data.RPM > 8500) {
    return { isValid: false, errorMessage: 'Engine speed must be between 500 and 8,500 RPM.' };
  }
  if (isNaN(data.MAP) || data.MAP <= 0 || data.MAP > 10.0) {
    return { isValid: false, errorMessage: 'Manifold Absolute Pressure (MAP) must be between 0.1 and 10.0 bar/V.' };
  }
  if (isNaN(data.TPS) || data.TPS < 0 || data.TPS > 6.0) {
    return { isValid: false, errorMessage: 'Throttle position (TPS) must be between 0.0 and 6.0 V.' };
  }
  if (isNaN(data.Speed) || data.Speed < 0 || data.Speed > 250) {
    return { isValid: false, errorMessage: 'Vehicle speed must be between 0 and 250 km/h.' };
  }
  if (isNaN(data.AFR) || data.AFR < 8.0 || data.AFR > 22.0) {
    return { isValid: false, errorMessage: 'Air-Fuel Ratio (AFR) must be between 8.0 and 22.0.' };
  }
  return { isValid: true };
}

export function validateAudioData(data: AudioEngineData): ValidationResult {
  if (!data) {
    return { isValid: false, errorMessage: 'No audio data available. Please upload a WAV/MP3 file.' };
  }
  if (data.durationSeconds <= 0 || isNaN(data.durationSeconds)) {
    return { isValid: false, errorMessage: 'Audio duration must be greater than 0 seconds.' };
  }
  return { isValid: true };
}

export function validateVibrationData(data: VibrationEngineData): ValidationResult {
  if (!data) {
    return { isValid: false, errorMessage: 'No vibration data available. Please upload a CSV recording.' };
  }
  if (isNaN(data.rmsAccelerationG) || data.rmsAccelerationG <= 0) {
    return { isValid: false, errorMessage: 'RMS vibration acceleration must be positive non-zero.' };
  }
  return { isValid: true };
}

// ==========================================
// 7. CSV PARSING UTILITIES
// ==========================================

export function parseTabularCsv(content: string): { rowCount: number; data: TabularEngineData } | null {
  const lines = content.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return null;

  const header = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
  const firstDataLine = lines[1].split(',').map(v => parseFloat(v.trim()));

  const map: Record<string, number> = {};
  header.forEach((col, idx) => {
    map[col] = firstDataLine[idx];
  });

  const get = (key: string, fallback: number) => {
    return isNaN(map[key]) ? fallback : map[key];
  };

  return {
    rowCount: lines.length - 1,
    data: {
      RPM: Math.round(get('RPM', 2000)),
      MAP: parseFloat(get('MAP', 1.8).toFixed(3)),
      TPS: parseFloat(get('TPS', 1.2).toFixed(3)),
      Force: parseFloat(get('Force', 120.0).toFixed(2)),
      Power: parseFloat(get('Power', 4.5).toFixed(2)),
      Speed: parseFloat(get('Speed', 45.0).toFixed(1)),
      CO: parseFloat(get('CO', 1.5).toFixed(3)),
      HC: parseFloat(get('HC', 180.0).toFixed(1)),
      CO2: parseFloat(get('CO2', 13.5).toFixed(3)),
      O2: parseFloat(get('O2', 0.8).toFixed(3)),
      Lambda: parseFloat(get('Lambda', 1.0).toFixed(3)),
      AFR: parseFloat(get('AFR', 14.7).toFixed(3)),
      'Consumption L/H': parseFloat(get('Consumption L/H', 4.0).toFixed(3)),
      'Consumption L/100KM': parseFloat(get('Consumption L/100KM', 8.5).toFixed(3))
    }
  };
}

export function parseVibrationCsv(content: string): {
  samplingRateHz: number;
  rmsAccelerationG: number;
  peakToPeakG: number;
  crestFactor: number;
  dominantOrderHz: number;
  timeSeries: { t: number; a: number }[];
  fftSpectrum: { freq: number; amp: number }[];
} | null {
  const lines = content.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 5) return null;

  // Extract acceleration values from CSV
  const values: number[] = [];
  for (let i = 1; i < Math.min(lines.length, 500); i++) {
    const parts = lines[i].split(',');
    const v = parseFloat(parts[parts.length - 1]);
    if (!isNaN(v)) values.push(v);
  }

  if (values.length < 5) return null;

  let sumSq = 0;
  let min = values[0];
  let max = values[0];
  for (const v of values) {
    sumSq += v * v;
    if (v < min) min = v;
    if (v > max) max = v;
  }
  const rms = Math.sqrt(sumSq / values.length);
  const peakToPeak = max - min;
  const crest = rms > 0 ? max / rms : 3.0;

  return {
    samplingRateHz: 5000,
    rmsAccelerationG: parseFloat(rms.toFixed(3)),
    peakToPeakG: parseFloat(peakToPeak.toFixed(2)),
    crestFactor: parseFloat(crest.toFixed(2)),
    dominantOrderHz: 50.0,
    timeSeries: values.slice(0, 80).map((a, i) => ({ t: i * 0.001, a })),
    fftSpectrum: [
      { freq: 25, amp: parseFloat((rms * 0.3).toFixed(2)) },
      { freq: 50, amp: parseFloat((rms * 0.8).toFixed(2)) },
      { freq: 100, amp: parseFloat((rms * 0.4).toFixed(2)) }
    ]
  };
}