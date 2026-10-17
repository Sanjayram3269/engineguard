import { jsPDF } from 'jspdf';
import type { UnifiedResultsData } from '../components/testing/UnifiedResultsDashboard';
import type { StreamOutputResult } from '../components/testing/DiagnosticOutputCards';

export interface ReportEntry { label: string; value: string }
export interface ReportSection { title: string; entries: ReportEntry[] }
export interface DiagnosticReport { timestamp: string; sections: ReportSection[] }

const value = (number: number | null | undefined, digits = 3): string =>
  number === null || number === undefined || !Number.isFinite(number) ? 'Unavailable' : number.toFixed(digits);

function streamEntries(name: string, output: StreamOutputResult): ReportSection {
  const entries: ReportEntry[] = [
    { label: 'Status', value: output.status },
    { label: 'Classification', value: output.rawPrediction || 'Unavailable' },
    { label: 'Reported score', value: output.confidence == null ? 'Unavailable' : `${(output.confidence * 100).toFixed(1)}%` },
    { label: 'Inference source', value: output.confidenceType || 'Unavailable' },
  ];
  if (output.summary) entries.push({ label: 'Finding', value: output.summary });
  if (output.error) entries.push({ label: 'Error', value: output.error });
  if (output.reviewRequired) entries.push({ label: 'Review', value: 'Required' });
  for (const [label, item] of Object.entries(output.metadata || {})) {
    if (item !== null && item !== undefined) entries.push({ label, value: String(item) });
  }
  return { title: `${name} classification`, entries };
}

export function buildDiagnosticReport(data: UnifiedResultsData): DiagnosticReport {
  const sections: ReportSection[] = [];
  const index = data.healthIndex;
  const simulatedInputs = Object.values(data.outputs).filter(output =>
    output.status === 'SUCCESS' && /simulated|fallback/i.test(output.confidenceType || '')).length;

  sections.push(streamEntries('Telemetry', data.outputs.tabular));
  sections.push(streamEntries('Audio', data.outputs.audio));
  sections.push(streamEntries('Vibration', data.outputs.vibration));
  sections.push({ title: 'Engine Health Index', entries: [
    { label: 'Score', value: index.isAvailable ? `${index.scoreFormatted} / 100` : 'Unavailable' },
    { label: 'Applicable streams', value: String(index.contributingStreamsCount) },
    { label: 'Simulated or fallback streams', value: String(simulatedInputs) },
    { label: 'Weighted risk', value: value(index.weightedRiskTotal) },
    { label: 'Applicable weight', value: value(index.applicableWeightTotal) },
    { label: 'Interpretation', value: index.interpretationWarning },
  ] });
  const audio = data.audioData;
  if (audio) sections.push({ title: 'Audio readings', entries: [
    { label: 'Recording', value: audio.fileName },
    { label: 'Duration', value: `${value(audio.durationSeconds, 2)} s` },
    { label: 'Sample rate', value: `${value(audio.sampleRate, 0)} Hz` },
    { label: 'Channels', value: audio.channelMode || String(audio.channelCount || 1) },
    { label: 'Peak level', value: `${value(audio.peakDb, 2)} dBFS` },
    { label: 'Peak amplitude', value: value(audio.peakAmplitude, 5) },
    { label: 'RMS level', value: value(audio.rmsLevel, 5) },
    { label: 'Dominant FFT frequency', value: `${value(audio.dominantHarmonicHz, 2)} Hz` },
    { label: 'FFT display points', value: String(audio.spectralPoints.length) },
    { label: 'STFT frames', value: String(audio.spectrogram?.matrix.length || 0) },
  ] });

  const vibration = data.vibrationData;
  if (vibration) {
    const entries: ReportEntry[] = [
      { label: 'Recording', value: vibration.sampleName },
      { label: 'Selected channel', value: vibration.selectedChannel || 'Channel 1' },
      { label: 'Sample rate', value: `${value(vibration.samplingRateHz, 1)} Hz` },
      { label: 'RMS acceleration', value: `${value(vibration.rmsAccelerationG, 5)} signal units` },
      { label: 'Peak-to-peak', value: `${value(vibration.peakToPeakG, 5)} signal units` },
      { label: 'Crest factor', value: value(vibration.crestFactor, 4) },
      { label: 'Dominant FFT frequency', value: `${value(vibration.dominantOrderHz, 2)} Hz` },
      { label: 'FFT bins', value: String(vibration.fftSpectrum.length) },
      { label: 'STFT frames', value: String(vibration.spectrogram?.matrix.length || 0) },
    ];
    for (const channel of vibration.channelMetrics || []) {
      entries.push({ label: `${channel.name} RMS / peak-to-peak`, value: `${value(channel.rms, 5)} / ${value(channel.peakToPeak, 5)} signal units` });
    }
    sections.push({ title: 'Vibration readings', entries });
  }

  const telemetry = data.tabularSummary;
  if (telemetry) {
    const entries: ReportEntry[] = [
      { label: 'Source', value: telemetry.fileName || telemetry.sourceType },
      { label: 'Rows', value: String(telemetry.totalRows) },
      { label: 'Columns', value: String(telemetry.totalColumns) },
      { label: 'Missing values', value: String(telemetry.totalMissingValues) },
    ];
    for (const column of telemetry.columns) {
      const details = telemetry.isSingleObservation
        ? value(column.mean, 4)
        : column.dataType === 'numeric'
          ? `mean ${value(column.mean, 4)}; median ${value(column.median, 4)}; min ${value(column.min, 4)}; max ${value(column.max, 4)}; SD ${value(column.stdDev, 4)}; missing ${column.missingCount}`
          : `text column; missing ${column.missingCount}`;
      entries.push({ label: column.name, value: details });
    }
    if (telemetry.sourceType === 'csv' && telemetry.totalRows > 1) {
      entries.push({ label: 'CSV scope', value: 'All columns are summarized above; raw CSV rows are not embedded in the PDF.' });
    }
    sections.push({ title: 'Telemetry readings', entries });
  }

  sections.push({ title: 'Report scope', entries: [
    { label: 'Included', value: 'Engine Health Index, three stream classifications and provenance, telemetry readings, audio readings, vibration readings, waveform and FFT plots where available.' },
    { label: 'Excluded', value: 'Synthetic bearing RUL simulation and its odometer assumptions.' },
    { label: 'Limit', value: 'This is an experimental diagnostic report. Model vote fractions are not calibrated failure probabilities; physical inspection is required.' },
  ] });
  return { timestamp: data.timestamp, sections };
}

function ascii(text: string): string {
  return text.replace(/[\u2010-\u2015]/g, '-').replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"').replace(/\u2022/g, '*').replace(/[^\x20-\x7E\n]/g, '');
}

export function createDiagnosticPdf(data: UnifiedResultsData): jsPDF {
  const report = buildDiagnosticReport(data);
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
  const left = 17;
  const width = 176;
  let y = 22;

  const addHeader = () => {
    pdf.setFillColor(20, 23, 27);
    pdf.rect(0, 0, 210, 15, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    pdf.text('ENGINEGUARD  /  DIAGNOSTIC REPORT', left, 10);
    pdf.setTextColor(35, 38, 42);
    pdf.setFont('helvetica', 'normal');
  };
  const space = (height: number) => {
    if (y + height > 276) { pdf.addPage(); addHeader(); y = 23; }
  };
  const line = (text: string, size = 9) => {
    pdf.setFontSize(size);
    const parts = pdf.splitTextToSize(ascii(text), width) as string[];
    const height = parts.length * (size <= 9 ? 4.6 : 5.5);
    space(height + 2);
    pdf.text(parts, left, y);
    y += height + 1.5;
  };
  const heading = (text: string) => {
    space(12);
    y += 3;
    pdf.setDrawColor(214, 106, 50);
    pdf.setLineWidth(0.5);
    pdf.line(left, y - 2, left + width, y - 2);
    pdf.setTextColor(158, 69, 30);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(12);
    pdf.text(ascii(text), left, y + 3);
    pdf.setTextColor(35, 38, 42);
    pdf.setFont('helvetica', 'normal');
    y += 10;
  };
  const drawPlot = (title: string, points: { x: number; y: number }[], kind: 'wave' | 'spectrum') => {
    const finite = points.filter(point => Number.isFinite(point.x) && Number.isFinite(point.y));
    if (finite.length < 2) return;
    space(48);
    line(title, 9);
    const plotY = y;
    const plotH = 31;
    const minX = finite[0].x;
    const maxX = finite[finite.length - 1].x;
    const maxAbs = Math.max(1e-9, ...finite.map(point => Math.abs(point.y)));
    pdf.setDrawColor(210, 214, 218);
    pdf.rect(left, plotY, width, plotH);
    pdf.setDrawColor(214, 106, 50);
    pdf.setLineWidth(0.25);
    if (kind === 'wave') {
      const step = Math.max(1, Math.ceil(finite.length / 250));
      let previous: { x: number; y: number } | null = null;
      for (let i = 0; i < finite.length; i += step) {
        const point = finite[i];
        const current = {
          x: left + (point.x - minX) / Math.max(maxX - minX, 1e-9) * width,
          y: plotY + plotH / 2 - point.y / maxAbs * (plotH / 2 - 2),
        };
        if (previous) pdf.line(previous.x, previous.y, current.x, current.y);
        previous = current;
      }
    } else {
      const buckets = new Map<number, number>();
      for (const point of finite) {
        const bucket = Math.min(150, Math.floor((point.x - minX) / Math.max(maxX - minX, 1e-9) * 150));
        buckets.set(bucket, Math.max(buckets.get(bucket) || 0, Math.max(0, point.y)));
      }
      for (const [bucket, amplitude] of buckets) {
        const x = left + bucket / 150 * width;
        pdf.line(x, plotY + plotH - 1, x, plotY + plotH - 1 - amplitude / maxAbs * (plotH - 3));
      }
    }
    y += plotH + 2;
    line(`${value(minX, 1)} to ${value(maxX, 1)} ${kind === 'wave' ? 'seconds' : 'Hz'}`, 8);
  };

  addHeader();
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(17);
  pdf.text('Engine diagnostic findings', left, y);
  y += 8;
  pdf.setFont('helvetica', 'normal');
  line(`Analysis time: ${new Date(report.timestamp).toLocaleString()}`);
  line('RUL simulation is intentionally excluded from this report.');

  for (const section of report.sections) {
    heading(section.title);
    for (const entry of section.entries) line(`${entry.label}: ${entry.value}`);
    if (section.title === 'Audio readings' && data.audioData) {
      drawPlot('Audio waveform', (data.audioData.timeSeries || []).map(point => ({ x: point.t, y: point.a })), 'wave');
      drawPlot('Audio FFT magnitude', data.audioData.spectralPoints.map(point => ({ x: point.freq, y: point.magnitude })), 'spectrum');
    }
    if (section.title === 'Vibration readings' && data.vibrationData) {
      drawPlot('Vibration waveform', data.vibrationData.timeSeries.map(point => ({ x: point.t, y: point.a })), 'wave');
      drawPlot('Vibration FFT amplitude', data.vibrationData.fftSpectrum.map(point => ({ x: point.freq, y: point.amp })), 'spectrum');
    }
  }

  const pages = pdf.getNumberOfPages();
  for (let page = 1; page <= pages; page++) {
    pdf.setPage(page);
    pdf.setDrawColor(220, 222, 225);
    pdf.line(left, 284, left + width, 284);
    pdf.setFontSize(8);
    pdf.setTextColor(115, 120, 125);
    pdf.text(`EngineGuard | Page ${page} of ${pages}`, left, 289);
  }
  return pdf;
}

export function downloadDiagnosticPdf(data: UnifiedResultsData): void {
  const stamp = data.timestamp.slice(0, 19).replace(/[:T]/g, '-');
  createDiagnosticPdf(data).save(`engineguard-diagnostic-${stamp}.pdf`);
}
