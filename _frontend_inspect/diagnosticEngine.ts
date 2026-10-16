import {
  TabularEngineData,
  AudioEngineData,
  VibrationEngineData,
  DiagnosticResult,
  PresetScenario,
  ApiDiagnosticResult
} from './diagnosis';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

export const TABULAR_PRESETS: PresetScenario<TabularEngineData>[] = [
  {
    id: 'tab-nominal',
    title: 'Nominal 2.0L Turbo Baseline',
    shortDescription: 'Balanced stoichiometric combustion across all 4 cylinders at cruising speed.',
    expectedFault: 'No Fault Detected (Nominal Envelope)',
    data: {
      rpm: 2450,
      mapKpa: 72,
      coolantTempC: 88,
      oilPressurePsi: 52,
      knockSensorVolts: 0.42,
      intakeAirTempC: 34
    }
  },
  {
    id: 'tab-knock-piston',
    title: 'Cylinder 3 Detonation & Piston Scuff',
    shortDescription: 'High knock acoustic transducer voltage with elevated thermal boundary.',
    expectedFault: 'Piston Ring-Land Fatigue / Pre-Ignition',
    data: {
      rpm: 3850,
      mapKpa: 168,
      coolantTempC: 106,
      oilPressurePsi: 44,
      knockSensorVolts: 3.92,
      intakeAirTempC: 58
    }
  },
  {
    id: 'tab-valve-lash',
    title: 'Valvetrain Clearance & MAP Fluctuations',
    shortDescription: 'Erratic intake manifold depression caused by incomplete intake valve seating.',
    expectedFault: 'Intake Valve Lash Out of Tolerance',
    data: {
      rpm: 1420,
      mapKpa: 114,
      coolantTempC: 89,
      oilPressurePsi: 38,
      knockSensorVolts: 0.95,
      intakeAirTempC: 36
    }
  }
];

export function evaluateTabularData(data: TabularEngineData): DiagnosticResult {
  const timestamp = new Date().toISOString();
  if (data.oilPressurePsi < 20 && data.rpm > 2000) {
    return demoFault('CRANKSHAFT MAIN BEARING OIL-WEDGE COLLAPSE', 'critical', 'crankshaft',
      `Dynamic oil pressure is ${data.oilPressurePsi.toFixed(1)} PSI at ${data.rpm} RPM (nominal threshold >= 40 PSI). Severe risk of hydrodynamic film shearing and crank journal scoring. This is a labelled demo result when the backend tabular API is not connected.`);
  }
  if (data.knockSensorVolts >= 2.5 || (data.knockSensorVolts > 1.8 && data.mapKpa > 130)) {
    return demoFault('CYLINDER DETONATION & PISTON CROWN STRESS', 'critical', 'pistons',
      `Piezoelectric knock sensor reads ${data.knockSensorVolts.toFixed(2)}V (nominal < 1.0V) under ${data.mapKpa} kPa manifold boost. Uncontrolled flame front collision detected. This is a labelled demo result when the backend tabular API is not connected.`);
  }
  if (data.coolantTempC >= 115) {
    return demoFault('CYLINDER HEAD GASKET THERMAL COMPROMISE', 'critical', 'headGasket',
      `Coolant jacket temperature is critically elevated at ${data.coolantTempC}°C. Combustion chamber gas cross-leakage into cooling gallery confirmed. This is a labelled demo result when the backend tabular API is not connected.`);
  }
  if (data.mapKpa > 100 && data.rpm < 2000) {
    return demoWarn('INTAKE VALVETRAIN SEAT LEAKAGE / LASH DRIFT', 'moderate', 'valves',
      `Manifold Absolute Pressure is ${data.mapKpa} kPa at low RPM (${data.rpm} RPM), indicating inadequate intake depression caused by valve sealing delay. This is a labelled demo result when the backend tabular API is not connected.`);
  }
  return demoNominal('SYSTEM NOMINAL — BALANCED THERMODYNAMIC CYCLE', 'All thermodynamic and mechanical telemetry channels fall well within nominal calibration limits across all 4 cylinders. This is a labelled demo result when the backend tabular API is not connected.');
}

export const AUDIO_PRESETS: PresetScenario<AudioEngineData>[] = [
  {
    id: 'aud-nominal',
    title: 'Nominal Inline-4 Idle & Steady Rev',
    shortDescription: 'Uniform combustion cadence with smooth broadband valvetrain hum.',
    expectedFault: 'No Abnormal Acoustic Signatures',
    data: { fileName: 'nominal_i4_2500rpm.wav', durationSeconds: 4.8, sampleRate: 44100, peakDb: -14.2, dominantHarmonicHz: 125, spectralPoints: [] }
  },
  {
    id: 'aud-rod-knock',
    title: 'Connecting Rod Bearing Acoustic Knock',
    shortDescription: 'High-energy transient double-clicks occurring at half-engine crankshaft speed.',
    expectedFault: 'Connecting Rod Big-End Bearing Radial Play',
    data: { fileName: 'rod_knock_severe_transients.wav', durationSeconds: 3.6, sampleRate: 44100, peakDb: -2.8, dominantHarmonicHz: 2380, spectralPoints: [] }
  }
];

export function evaluateAudioData(data: AudioEngineData): DiagnosticResult {
  const timestamp = new Date().toISOString();
  if (data.dominantHarmonicHz > 1800 || data.peakDb > -6.0) {
    return demoFault('CONNECTING ROD BIG-END BEARING IMPACTS (ROD KNOCK)', 'critical', 'connectingRods',
      `Acoustic spectral density exhibits concentrated impulse peaks at ${data.dominantHarmonicHz} Hz with elevated sound pressure level (${data.peakDb.toFixed(1)} dBFS). This is a labelled demo result when the backend audio model is not connected.`);
  }
  if (data.dominantHarmonicHz >= 400 && data.dominantHarmonicHz <= 1200) {
    return demoWarn('OVERHEAD VALVETRAIN MECHANICAL TICKING', 'moderate', 'valves',
      `Spectral energy concentrated at ${data.dominantHarmonicHz} Hz synchronizes with half-engine speed (camshaft rotation). This is a labelled demo result when the backend audio model is not connected.`);
  }
  return demoNominal('NOMINAL ACOUSTIC SPECTRAL SIGNATURE', `Acoustic emission spectrum is clean and distributed without anomalous harmonic spikes or impulse transients. Dominant fundamental frequency is ${data.dominantHarmonicHz} Hz. This is a labelled demo result when the backend audio model is not connected.`);
}

export const VIBRATION_PRESETS: PresetScenario<VibrationEngineData>[] = [
  {
    id: 'vib-nominal',
    title: 'Balanced Tri-Axial Baseline (2500 RPM)',
    shortDescription: 'Uniform primary firing order harmonics with minimal cross-axis excitation.',
    expectedFault: 'No Imbalance Detected (Nominal Vibration)',
    data: { sampleName: 'baseline_engine_mount_triaxial.csv', samplingRateHz: 5000, rmsAccelerationG: 0.68, peakToPeakG: 2.1, crestFactor: 3.08, dominantOrderHz: 83.3, timeSeries: [], fftSpectrum: [] }
  },
  {
    id: 'vib-crank-imbalance',
    title: '1X Rotational Crankshaft Eccentricity / Damper Slip',
    shortDescription: 'Massive first-order harmonic vibration along radial block axis.',
    expectedFault: 'Crankshaft Dynamic Imbalance / Harmonic Damper',
    data: { sampleName: 'crankshaft_radial_imbalance_1x.csv', samplingRateHz: 5000, rmsAccelerationG: 2.45, peakToPeakG: 9.8, crestFactor: 4.0, dominantOrderHz: 41.6, timeSeries: [], fftSpectrum: [] }
  }
];

export function evaluateVibrationData(data: VibrationEngineData): DiagnosticResult {
  const timestamp = new Date().toISOString();
  if (data.dominantOrderHz >= 35 && data.dominantOrderHz <= 60 && data.rmsAccelerationG > 1.5) {
    return demoFault('CRANKSHAFT FIRST-ORDER ROTATIONAL IMBALANCE', 'critical', 'crankshaft',
      `Severe 1X rotational harmonic detected at ${data.dominantOrderHz.toFixed(1)} Hz with RMS vibration acceleration reaching ${data.rmsAccelerationG.toFixed(2)} G (nominal threshold < 1.0 G). This is a labelled demo result when the backend vibration model is not connected.`);
  }
  if (data.dominantOrderHz > 120 || data.rmsAccelerationG > 1.2) {
    return demoFault('PISTON SKIRT TRANSVERSE ROCKING & CYLINDER BORE SLAP', 'critical', 'pistons',
      `High-frequency transverse accelerometer bursts detected at ${data.dominantOrderHz.toFixed(1)} Hz. This is a labelled demo result when the backend vibration model is not connected.`);
  }
  return demoNominal('NOMINAL VIBRATION ENVELOPE', `Tri-axial vibration signature is within nominal assembly tolerance. This is a labelled demo result when the backend vibration model is not connected.`);
}

export async function evaluateTabularDataViaApi(file: File): Promise<DiagnosticResult> {
  const fd = new FormData();
  fd.append('file', file);
  const resp = await fetch(`${API_BASE}/predict/tabular`, {
    method: 'POST',
    body: fd,
  });
  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    throw new Error(`tabular API returned ${resp.status}: ${text}`);
  }
  const body = (await resp.json()) as ApiDiagnosticResult;
  return tabularApiBodyToResult(body);
}

export async function evaluateAudioDataViaApi(file: File): Promise<DiagnosticResult> {
  const fd = new FormData();
  fd.append('file', file);
  const resp = await fetch(`${API_BASE}/predict/audio`, {
    method: 'POST',
    body: fd,
  });
  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    throw new Error(`audio API returned ${resp.status}: ${text}`);
  }
  const body = (await resp.json()) as ApiDiagnosticResult;
  return audioApiBodyToResult(body);
}

export async function evaluateVibrationDataViaApi(file: File): Promise<DiagnosticResult> {
  const fd = new FormData();
  fd.append('file', file);
  const resp = await fetch(`${API_BASE}/predict/vibration`, {
    method: 'POST',
    body: fd,
  });
  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    throw new Error(`vibration API returned ${resp.status}: ${text}`);
  }
  const body = (await resp.json()) as ApiDiagnosticResult;
  return vibrationApiBodyToResult(body);
}

function severityFromApi(prediction: string): DiagnosticResult['severity'] {
  const p = prediction.toLowerCase();
  if (p.includes('fault') || p.includes('issue') || p.includes('error')) return 'high';
  if (p.includes('normal') || p.includes('healthy') || p.includes('non')) return 'low';
  return 'medium';
}

function tabularApiBodyToResult(body: ApiDiagnosticResult): DiagnosticResult {
  return {
    id: 'api-tabular',
    modality: 'tabular',
    timestamp: new Date().toISOString(),
    status: body.prediction.toLowerCase().includes('fault') ? 'FAULT' : 'NOMINAL',
    faultTitle: body.prediction,
    faultSummary: body.prediction,
    severity: severityFromApi(body.prediction),
    confidencePercent: typeof body.confidence === 'number' ? Math.round(body.confidence * 10000) / 100 : 0,
    faultyComponentId: null,
    subsystem: body.prediction,
    mechanicalRationale: body.prediction,
    findings: body.top_factors ?? [],
    recommendedActions: [],
    metrics: (body.top_factors ?? []).map(l => ({ label: l, value: 'api', status: 'caution' })),
    details: {
      summary: body.prediction,
      audio_features: null,
      selected_features: body.top_factors ?? [],
      top_factors: body.top_factors ?? [],
      fault_probability_classified:
        typeof body.confidence === 'number' ? body.confidence.toFixed(4) : 'n/a',
    },
  };
}

function audioApiBodyToResult(body: ApiDiagnosticResult): DiagnosticResult {
  return {
    id: 'api-audio',
    modality: 'audio',
    timestamp: new Date().toISOString(),
    status: body.prediction.toLowerCase().includes('issue') ? 'FAULT' : 'NOMINAL',
    faultTitle: body.prediction,
    faultSummary: body.prediction,
    severity: severityFromApi(body.prediction),
    confidencePercent: typeof body.confidence === 'number' ? Math.round(body.confidence * 10000) / 100 : 0,
    faultyComponentId: null,
    subsystem: body.prediction,
    mechanicalRationale: body.prediction,
    findings: body.top_factors ?? [],
    recommendedActions: [],
    metrics: (body.top_factors ?? []).map(l => ({ label: l, value: 'api', status: 'caution' })),
    details: {
      summary: body.prediction,
      audio_features: null,
      selected_features: body.top_factors ?? [],
      top_factors: body.top_factors ?? [],
      fault_probability_classified:
        (body.class_scores ?? {})[body.prediction] != null
          ? String((body.class_scores![body.prediction] ?? 0).toFixed(4))
          : 'n/a',
    },
  };
}

function vibrationApiBodyToResult(body: ApiDiagnosticResult): DiagnosticResult {
  return {
    id: 'api-vibration',
    modality: 'vibration',
    timestamp: new Date().toISOString(),
    status: body.prediction.toLowerCase().includes('fault') ? 'FAULT' : 'NOMINAL',
    faultTitle: body.prediction,
    faultSummary: body.prediction,
    severity: severityFromApi(body.prediction),
    confidencePercent: typeof body.confidence === 'number' ? Math.round(body.confidence * 10000) / 100 : 0,
    faultyComponentId: null,
    subsystem: body.prediction,
    mechanicalRationale: body.prediction,
    findings: body.top_factors ?? [],
    recommendedActions: [],
    metrics: (body.top_factors ?? []).map(l => ({ label: l, value: 'api', status: 'caution' })),
    details: {
      summary: body.prediction,
      audio_features: null,
      selected_features: body.top_factors ?? [],
      top_factors: body.top_factors ?? [],
      fault_probability_classified:
        typeof body.confidence === 'number' ? body.confidence.toFixed(4) : 'n/a',
    },
  };
}

// ---- Live API-based evaluation lookup ----export function lookupDiagnostic(label: string): DiagnosticResult | null {
  if (mockStore.currentResult?.rowLabel === label || demoStore.currentResult?.rowLabel === label) {
    return mockStore.currentResult ?? demoStore.currentResult ?? null;
  }
  const tabPreset = TABULAR_PRESETS.find(p => p.id.startsWith(label.toLowerCase().replace(/[^a-z0-9]/g, '-')));
  if (tabPreset) return evaluateTabularData(tabPreset.data);
  const audPreset = AUDIO_PRESETS.find(p => p.id.startsWith(label.toLowerCase().replace(/[^a-z0-9]/g, '-')));
  if (audPreset) return evaluateAudioData(audPreset.data);
  const vibPreset = VIBRATION_PRESETS.find(p => p.id.startsWith(label.toLowerCase().replace(/[^a-z0-9]/g, '-')));
  if (vibPreset) return evaluateVibrationData(vibPreset.data);
  return null;
}

function demoFault(
  label: string,
  severity: 'critical' | 'moderate',
  category: string,
  summary: string
): DiagnosticResult {
  return {
    id: 'demo-' + label.toLowerCase().replace(/[^a-z0-9]/g, '-'),
    modality: 'tabular',
    timestamp: new Date().toISOString(),
    status: 'FAULT',
    faultTitle: label,
    faultSummary: summary,
    severity,
    confidencePercent: 90,
    faultyComponentId: category,
    subsystem: category,
    mechanicalRationale: summary,
    findings: [label, category],
    recommendedActions: [`Replace/repair ${category} with OEM-specified part during next scheduled service window.`],
    metrics: [
      { label: 'Fault Classification', value: label, status: 'critical' },
      { label: 'Confidence', value: '90.0%', status: 'critical' },
    ],
    metrics: [
      { label: 'Fault Classification', value: label, status: 'critical' },
      { label: 'Confidence', value: '90.0%', status: 'critical' },
    ],
    metrics: [
      { label: 'Fault Classification', value: label, status: 'critical' },
      { label: 'Confidence', value: '90.0%', status: 'critical' },
    ],
    details: {
      summary: summary,
      audio_features: null,
      selected_features: [label, category],
      top_factors: [label, category],
      fault_probability_classified: '0.9000',
    },
  };
}

function demoWarn(
  label: string,
  severity: 'critical' | 'moderate',
  category: string,
  summary: string
): DiagnosticResult {
  return {
    id: 'demo-' + label.toLowerCase().replace(/[^a-z0-9]/g, '-'),
    modality: 'tabular',
    timestamp: new Date().toISOString(),
    status: 'WARNING',
    faultTitle: label,
    faultSummary: summary,
    severity: severity === 'critical' ? 'high' : 'medium',
    confidencePercent: 75,
    faultyComponentId: category,
    subsystem: category,
    mechanicalRationale: summary,
    findings: [label, category],
    recommendedActions: [`Inspect ${category} during next scheduled service window.`],
    metrics: [
      { label: 'Fault Classification', value: label, status: 'caution' },
      { label: 'Confidence', value: '75.0%', status: 'caution' },
    ],
    details: {
      summary: summary,
      audio_features: null,
      selected_features: [label, category],
      top_factors: [label, category],
      fault_probability_classified: '0.7500',
    },
  };
}

function demoNominal(
  label: string,
  summary: string
): DiagnosticResult {
  return {
    id: 'demo-nominal',
    modality: 'tabular',
    timestamp: new Date().toISOString(),
    status: 'NOMINAL',
    faultTitle: label,
    faultSummary: summary,
    severity: 'nominal',
    confidencePercent: 0,
    faultyComponentId: null,
    subsystem: 'system',
    mechanicalRationale: summary,
    findings: ['Nominal operating envelope'],
    recommendedActions: ['No immediate action required; schedule next periodic inspection.'],
    metrics: [
      { label: 'Fault Classification', value: label, status: 'normal' },
      { label: 'Confidence', value: '0.0%', status: 'normal' },
    ],
    details: {
      summary: summary,
      audio_features: null,
      selected_features: ['Nominal operating envelope'],
      top_factors: ['Nominal operating envelope'],
      fault_probability_classified: '0.0000',
    },
  };
}

// ---- Integrations ----

export function formatDiagnostic(d: DiagnosticResult): string {
  return `${d.faultTitle}
Confidence: ${d.confidencePercent.toFixed(1)}% (${d.severity})`;
}


