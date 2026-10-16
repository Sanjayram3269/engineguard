export type InputModality = 'tabular' | 'audio' | 'vibration';

export interface TabularEngineData {
  // Real telemetry model feature schema: models/benchmark_metadata.json#feature_names
  RPM: number;
  MAP: number;
  TPS: number;
  Force: number;
  Power: number;
  Speed: number;
  "CO": number;
  HC: number;
  "CO2": number;
  O2: number;
  Lambda: number;
  AFR: number;
  "Consumption L/H": number;
  "Consumption L/100KM": number;
}

export interface AudioEngineData {
  fileName: string;
  durationSeconds: number;
  sampleRate: number;
  peakDb: number;
  dominantHarmonicHz: number;
  spectralPoints: { freq: number; magnitude: number }[];
  audioBuffer?: AudioBuffer | null;
  rmsLevel?: number;
  peakAmplitude?: number;
  channelCount?: number;
  channelMode?: string;
  timeSeries?: { t: number; a: number }[];
  spectrogram?: {
    times: number[];
    frequencies: number[];
    matrix: number[][];
    maxMagnitude?: number;
  };
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
  selectedChannel?: string;
  availableChannels?: string[];
  qualityWarning?: string | null;
  spectrogram?: {
    times: number[];
    frequencies: number[];
    matrix: number[][];
    maxMagnitude?: number;
  };
  rawCsvText?: string;
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
  details?: {
    summary?: string;
    audio_features?: string | null;
    selected_features?: string[];
    top_factors?: string[];
    fault_probability_classified?: string;
  };
  isSimulated?: boolean;
}

export interface PresetScenario<T> {
  id: string;
  title: string;
  shortDescription: string;
  expectedFault: string;
  data: T;
}

export interface ApiDiagnosticResult {
  module?: string;
  status?: string;
  prediction?: string;
  predicted_class?: string;
  confidence?: number;
  confidence_type?: string;
  review_required?: boolean;
  review_reason?: string | null;
  probabilities?: Record<string, number>;
  class_probabilities?: Record<string, number>;
  expected_features?: string[];
  actual_features?: string[];
  metrics?: Record<string, any>;
  message?: string;
}
