import assert from 'node:assert/strict';
import { buildDiagnosticReport, createDiagnosticPdf } from '../src/lib/diagnosticPdf.ts';
import { calculateEngineHealthIndex } from '../src/lib/engineHealthIndex.ts';
import { summarizeManualTabularData } from '../src/lib/tabularCsvSummary.ts';
import type { UnifiedResultsData } from '../src/components/testing/UnifiedResultsDashboard.tsx';

const input = {
  timestamp: '2026-10-17T08:00:00.000Z',
  outputs: {
    tabular: { status: 'SUCCESS', rawPrediction: 'Normal (no fault)', confidence: 0.93, confidenceType: 'Random Forest vote fraction' },
    audio: { status: 'SUCCESS', rawPrediction: 'Non engine issue', confidence: 0.61, confidenceType: 'Trained audio Random Forest vote fraction' },
    vibration: { status: 'SUCCESS', rawPrediction: 'Healthy', confidence: 0.87, confidenceType: 'Local heuristic fallback' },
  },
  tabularSummary: summarizeManualTabularData({ RPM: 1200, MAP: 3.5 }),
  audioData: {
    fileName: 'test.wav', durationSeconds: 2, sampleRate: 22050, peakDb: -3,
    peakAmplitude: 0.7, rmsLevel: 0.2, channelCount: 1, channelMode: 'Mono',
    dominantHarmonicHz: 250, spectralPoints: [{ freq: 0, magnitude: 0 }, { freq: 250, magnitude: 0.5 }],
    timeSeries: [{ t: 0, a: 0 }, { t: 1, a: 0.3 }],
  },
  vibrationData: {
    sampleName: 'bearing.csv', samplingRateHz: 4000, rmsAccelerationG: 0.68,
    peakToPeakG: 2.1, crestFactor: 3.08, dominantOrderHz: 125,
    timeSeries: [{ t: 0, a: 0 }, { t: 1, a: 0.5 }],
    fftSpectrum: [{ freq: 0, amp: 0 }, { freq: 125, amp: 0.4 }],
    channelMetrics: [{ name: 'Channel 1', rms: 0.68, peakToPeak: 2.1 }],
  },
  healthIndex: calculateEngineHealthIndex({
    tabularPrediction: 'Normal (no fault)', audioPrediction: 'Non engine issue', vibrationPrediction: 'Healthy',
  }),
  rulSimulation: { medianKm: 987654321 },
} as unknown as UnifiedResultsData;

const report = buildDiagnosticReport(input);
assert.deepEqual(report.sections.slice(0, 4).map(section => section.title), [
  'Telemetry classification', 'Audio classification', 'Vibration classification', 'Engine Health Index',
]);
assert.equal(report.sections.at(-2)?.title, 'Telemetry readings');
const text = report.sections.flatMap(section => section.entries.map(entry => `${entry.label}: ${entry.value}`)).join('\n');
assert.match(text, /RPM: 1200/);
assert.match(text, /MAP: 3\.5/);
assert.match(text, /Dominant FFT frequency: 250/);
assert.match(text, /RMS acceleration: 0\.68000/);
assert.match(text, /Trained audio Random Forest vote fraction/);
assert.match(text, /Simulated or fallback streams: 1/);
assert.doesNotMatch(text, /987654321/);
assert.ok(report.sections.find(section => section.title === 'Audio readings'));
assert.ok(report.sections.find(section => section.title === 'Vibration readings'));

const pdf = createDiagnosticPdf(input).output();
assert.ok(pdf.startsWith('%PDF-'), 'export must produce a real PDF document');
assert.ok(pdf.length > 3000, 'report must contain rendered content');
console.log('Diagnostic PDF report tests passed');
