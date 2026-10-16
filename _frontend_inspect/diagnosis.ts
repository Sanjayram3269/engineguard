export type InputModality = 'tabular' | 'audio' | 'vibration';

export interface TabularEngineData {
  rpm: number;                  // 600 - 7500 RPM
  mapKpa: number;               // 20 - 250 kPa (Manifold Absolute Pressure)
  coolantTempC: number;         // 60 - 130 °C
  oilPressurePsi: number;       // 10 - 90 PSI
  knockSensorVolts: number;     // 0.0 - 5.0 V
  intakeAirTempC: number;       // 10 - 80 °C
}

export interface AudioEngineData {
  fileName: string;
  durationSeconds: number;
  sampleRate: number;
  peakDb: number;
  dominantHarmonicHz: number;
  spectralPoints: { freq: number; magnitude: number }[];
  audioBuffer?: AudioBuffer | null;
}

export interface VibrationEngineData {
  sampleName: string;
  samplingRateHz: number;
  rmsAccelerationG: number;
  peakToPeakG: number;
  crestFactor: number;
  dominantOrderHz: number;
  timeSeries: { t: number; a: number }[];
  fftSpectrum: { freq: number; amp: number }[];
}

export type FaultSeverity = 'nominal' | 'low' | 'moderate' | 'critical';

export interface DiagnosticResult {
  id: string;
  modality: InputModality;
  timestamp: string;
  status: 'NOMINAL' | 'WARNING' | 'FAULT';
  faultTitle: string;
  faultSummary: string;
  severity: FaultSeverity;
  confidencePercent: number;
  faultyComponentId: string | null; // e.g. 'pistons', 'crankshaft', 'valves', 'head_gasket'
  subsystem: string;
  mechanicalRationale: string;
  findings: string[];
  recommendedActions: string[];
  metrics: {
    label: string;
    value: string;
    status: 'normal' | 'caution' | 'critical';
  }[];
  details: {
    summary: string;
    audio_features: string | null;
    selected_features: string[];
    top_factors: string[];
    fault_probability_classified: string;
  };
}

export interface PresetScenario<T> {
  id: string;
  title: string;
  shortDescription: string;
  expectedFault: string;
  data: T;
}

export interface ApiDiagnosticResult {
  prediction: string;
  class_scores?: Record<string, number>;
  confidence?: number;
  top_factors?: string[];
  details?: {
    summary?: string;
    audio_features?: string | null;
    selected_features?: string[];
    top_factors?: string[];
    fault_probability_classified?: string;
  };
}
