/**
 * EngineGuard - Truthful Signal Processing Engine
 *
 * Implements mathematically validated digital signal processing for:
 * 1. Cooley-Tukey Radix-2 Fast Fourier Transform (FFT)
 * 2. Windowed single-sided amplitude spectrum with coherent gain normalization
 * 3. Short-Time Fourier Transform (STFT) spectrogram
 * 4. Vibration CSV parsing, duplicate timestamp merging, jitter detection, and uniform resampling
 * 5. Web Audio multi-channel decoding, stereo downmix, dynamic range and harmonic analysis
 */

import type { AudioEngineData, VibrationEngineData } from '../types/diagnosis';

// ============================================================================
// 1. MATHEMATICAL FFT & SPECTRAL ANALYSIS
// ============================================================================

/**
 * Returns the smallest power of 2 greater than or equal to n.
 */
export function nextPowerOfTwo(n: number): number {
  if (n <= 1) return 1;
  let p = 1;
  while (p < n) p <<= 1;
  return p;
}

/**
 * In-place Cooley-Tukey Radix-2 Decimation-In-Time (DIT) FFT.
 * Requires real and imag arrays to have length equal to a power of 2.
 */
export function cooleyTukeyFFT(real: Float64Array, imag: Float64Array): void {
  const n = real.length;
  if ((n & (n - 1)) !== 0) {
    throw new Error(`FFT size must be a power of 2, received ${n}`);
  }

  // Bit-reversal permutation
  let j = 0;
  for (let i = 0; i < n - 1; i++) {
    if (i < j) {
      const tr = real[i]; real[i] = real[j]; real[j] = tr;
      const ti = imag[i]; imag[i] = imag[j]; imag[j] = ti;
    }
    let k = n >> 1;
    while (k <= j) {
      j -= k;
      k >>= 1;
    }
    j += k;
  }

  // Cooley-Tukey butterfly computations
  for (let len = 2; len <= n; len <<= 1) {
    const half = len >> 1;
    const angle = (-2 * Math.PI) / len;
    const wStepReal = Math.cos(angle);
    const wStepImag = Math.sin(angle);

    for (let i = 0; i < n; i += len) {
      let wReal = 1.0;
      let wImag = 0.0;

      for (let k = 0; k < half; k++) {
        const idx1 = i + k;
        const idx2 = i + k + half;

        const vReal = real[idx2] * wReal - imag[idx2] * wImag;
        const vImag = real[idx2] * wImag + imag[idx2] * wReal;

        real[idx2] = real[idx1] - vReal;
        imag[idx2] = imag[idx1] - vImag;
        real[idx1] = real[idx1] + vReal;
        imag[idx1] = imag[idx1] + vImag;

        const nextWReal = wReal * wStepReal - wImag * wStepImag;
        wImag = wReal * wStepImag + wImag * wStepReal;
        wReal = nextWReal;
      }
    }
  }
}

export interface SingleSidedSpectrumResult {
  spectrum: { freq: number; amp: number }[];
  dominantFrequency: number;
  dominantAmplitude: number;
  deltaF: number;
  nyquistHz: number;
}

/**
 * Computes a single-sided, Hann-windowed amplitude spectrum with coherent gain normalization.
 *
 * Normalization:
 * - Hann window: w[n] = 0.5 - 0.5 * cos(2 * pi * n / (M - 1))
 * - Coherent gain: S1 = sum(w[n])
 * - Single-sided scaling:
 *     DC (k=0): |X[0]| / S1
 *     AC (0 < k < N/2): 2 * |X[k]| / S1
 *     Nyquist (k=N/2): |X[Nyquist]| / S1
 * - Exact frequency resolution: deltaF = sampleRate / Nfft
 */
export function computeSingleSidedSpectrum(
  signal: Float64Array | number[],
  sampleRate: number,
  maxFftSize = 4096
): SingleSidedSpectrumResult {
  const signalLen = signal.length;
  if (signalLen < 4 || sampleRate <= 0) {
    return {
      spectrum: [],
      dominantFrequency: 0,
      dominantAmplitude: 0,
      deltaF: 0,
      nyquistHz: sampleRate / 2,
    };
  }

  // Use up to maxFftSize for spectrum resolution
  const n = Math.min(signalLen, maxFftSize);
  const nFft = nextPowerOfTwo(n);

  // Take a contiguous segment from the middle if signal is longer than n
  const startOffset = Math.floor((signalLen - n) / 2);

  // Compute mean over analysis segment to isolate DC sensor offset from AC vibrations
  let mean = 0;
  for (let i = 0; i < n; i++) {
    mean += signal[startOffset + i];
  }
  mean /= n;

  const real = new Float64Array(nFft);
  const imag = new Float64Array(nFft);

  // Apply Hann window to centered AC component and accumulate coherent gain
  let coherentGain = 0;
  for (let i = 0; i < n; i++) {
    const w = n > 1 ? 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (n - 1)) : 1.0;
    real[i] = (signal[startOffset + i] - mean) * w;
    coherentGain += w;
  }
  // Zero-padding for i >= n is already 0 in Float64Array

  cooleyTukeyFFT(real, imag);

  if (coherentGain <= 0) coherentGain = 1.0;

  const numBins = Math.floor(nFft / 2);
  const deltaF = sampleRate / nFft;
  const spectrum: { freq: number; amp: number }[] = [];

  let dominantFrequency = 0;
  let dominantAmplitude = 0;

  for (let k = 0; k <= numBins; k++) {
    let amp: number;
    if (k === 0) {
      // Physical DC sensor offset is the absolute mean of the signal
      amp = Math.abs(mean);
    } else {
      const magnitude = Math.hypot(real[k], imag[k]);
      // Nyquist (k=numBins) is single-sided (factor 1); interior AC bins are doubled (factor 2)
      const factor = (k === numBins) ? 1.0 : 2.0;
      amp = (factor * magnitude) / coherentGain;
    }
    const freq = k * deltaF;

    spectrum.push({
      freq: Number(freq.toFixed(2)),
      amp: Number(amp.toFixed(6)),
    });

    // Dominant frequency searches AC bins (k >= 1) to ignore DC sensor bias
    if (k >= 1 && amp > dominantAmplitude) {
      dominantAmplitude = amp;
      dominantFrequency = freq;
    }
  }

  return {
    spectrum,
    dominantFrequency: Number(dominantFrequency.toFixed(2)),
    dominantAmplitude: Number(dominantAmplitude.toFixed(6)),
    deltaF,
    nyquistHz: sampleRate / 2,
  };
}

export interface SpectrogramData {
  times: number[];
  frequencies: number[];
  matrix: number[][]; // matrix[timeIndex][freqIndex]
  maxMagnitude: number;
}

/**
 * Computes a mathematically correct STFT Spectrogram using overlapping Hann-windowed FFTs.
 */
export function computeSTFT(
  signal: Float64Array | number[],
  sampleRate: number,
  options?: {
    frameSize?: number;
    hopSize?: number;
    maxFrames?: number;
    maxBins?: number;
  }
): SpectrogramData {
  const signalLen = signal.length;
  const requestedFrameSize = options?.frameSize || 256;
  const frameSize = Math.min(requestedFrameSize, nextPowerOfTwo(signalLen));

  if (signalLen < 16 || frameSize < 16 || sampleRate <= 0) {
    return { times: [], frequencies: [], matrix: [], maxMagnitude: 0 };
  }

  const nFft = nextPowerOfTwo(frameSize);
  const hopSize = options?.hopSize || Math.floor(frameSize / 2);
  const maxFrames = options?.maxFrames || 64;
  const maxBins = options?.maxBins || 32;

  // Determine all start indices
  const allStarts: number[] = [];
  for (let start = 0; start + frameSize <= signalLen; start += hopSize) {
    allStarts.push(start);
  }

  if (allStarts.length === 0) {
    return { times: [], frequencies: [], matrix: [], maxMagnitude: 0 };
  }

  // Subsample frames evenly if there are more than maxFrames
  const frameStarts = allStarts.length > maxFrames
    ? allStarts.filter((_, i) => i % Math.ceil(allStarts.length / maxFrames) === 0)
    : allStarts;

  // Precompute Hann window
  const window = new Float64Array(frameSize);
  let coherentGain = 0;
  for (let i = 0; i < frameSize; i++) {
    window[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (frameSize - 1));
    coherentGain += window[i];
  }
  if (coherentGain <= 0) coherentGain = 1.0;

  const totalBins = Math.floor(nFft / 2);
  const binStep = Math.max(1, Math.floor(totalBins / maxBins));
  const selectedBinIndices: number[] = [];
  for (let k = 1; k <= totalBins; k += binStep) {
    selectedBinIndices.push(k);
    if (selectedBinIndices.length >= maxBins) break;
  }

  const deltaF = sampleRate / nFft;
  const frequencies = selectedBinIndices.map(k => Number((k * deltaF).toFixed(1)));
  const times: number[] = [];
  const matrix: number[][] = [];
  let maxMagnitude = 0;

  const real = new Float64Array(nFft);
  const imag = new Float64Array(nFft);

  for (const start of frameStarts) {
    real.fill(0);
    imag.fill(0);

    // Compute frame mean to remove local DC bias
    let frameMean = 0;
    for (let i = 0; i < frameSize; i++) {
      frameMean += signal[start + i];
    }
    frameMean /= frameSize;

    for (let i = 0; i < frameSize; i++) {
      real[i] = (signal[start + i] - frameMean) * window[i];
    }

    cooleyTukeyFFT(real, imag);

    const frameRow: number[] = [];
    for (const k of selectedBinIndices) {
      const mag = (2.0 * Math.hypot(real[k], imag[k])) / coherentGain;
      frameRow.push(mag);
      if (mag > maxMagnitude) maxMagnitude = mag;
    }

    const centerTime = (start + frameSize / 2) / sampleRate;
    times.push(Number(centerTime.toFixed(4)));
    matrix.push(frameRow);
  }

  return {
    times,
    frequencies,
    matrix,
    maxMagnitude: Number(maxMagnitude.toFixed(6)),
  };
}

// ============================================================================
// 2. VIBRATION CSV PARSING & RESAMPLING
// ============================================================================

export interface VibrationParseResult {
  success: boolean;
  error?: string;
  data?: VibrationEngineData;
}

/**
 * Parses CSV lines handling quoted cells and escaped quotes.
 */
function parseCsvRow(line: string): string[] {
  const result: string[] = [];
  let value = '';
  let quoted = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (quoted && line[i + 1] === '"') {
        value += '"';
        i++;
      } else {
        quoted = !quoted;
      }
    } else if (ch === ',' && !quoted) {
      result.push(value.trim());
      value = '';
    } else {
      value += ch;
    }
  }
  result.push(value.trim());
  return result;
}

/**
 * Comprehensive Vibration CSV Parser.
 *
 * Requirements satisfied:
 * 1. Parses numeric timestamp and specified/detected accelerometer channel.
 * 2. Strictly excludes kurtosis columns and rear-input columns.
 * 3. Handles duplicate timestamps by arithmetic averaging.
 * 4. Sorts unsorted rows.
 * 5. Robust median dt estimation, non-uniform jitter detection, and linear resampling.
 * 6. Computes actual signal statistics (mean, RMS, peak-to-peak, crest factor).
 * 7. Windowed FFT spectrum with exact frequency resolution and dominant frequency.
 * 8. STFT spectrogram with true time and frequency bounds.
 * 9. Supports selecting Channel 1-4 with detection of available channels.
 * 10. Does not claim acceleration is in "g" unless confirmed (labeled as signal units).
 */
export function parseVibrationCsv(
  csvContent: string,
  fileName = 'vibration_data.csv',
  selectedChannelName?: string
): VibrationParseResult {
  const cleanContent = csvContent.replace(/^\uFEFF/, '').trim();
  const lines = cleanContent.split(/\r?\n/).filter(line => line.trim().length > 0);

  if (lines.length < 17) {
    return {
      success: false,
      error: `Insufficient rows in CSV file (${lines.length} lines found, minimum 17 required).`,
    };
  }

  const rawHeaders = parseCsvRow(lines[0]);
  const headers = rawHeaders.map(h => h.replace(/^\uFEFF/, '').trim());
  const lowerHeaders = headers.map(h => h.toLowerCase());

  // 1. Locate Time column
  const timeIndex = lowerHeaders.findIndex(h =>
    ['time', 'time (s)', 'time [s]', 'timestamp', 'sec', 'seconds'].includes(h)
  );

  if (timeIndex === -1) {
    return {
      success: false,
      error: 'CSV header missing "Time" column. Required for time-series analysis.',
    };
  }

  // 2. Discover available measured channels (strictly exclude kurtosis, rear, demand, control)
  const availableChannels: { name: string; index: number }[] = [];

  for (let i = 0; i < headers.length; i++) {
    if (i === timeIndex) continue;
    const lower = lowerHeaders[i];

    // Exclude unwanted columns explicitly
    if (
      lower.includes('kurtosis') ||
      lower.includes('demand') ||
      lower.includes('control') ||
      lower.includes('output drive') ||
      lower.includes('rear input')
    ) {
      continue;
    }

    // Match Channel 1-4 or accelerometer channel
    if (/^channel\s*[1-4]$/i.test(headers[i]) || /^ch\s*[1-4]$/i.test(headers[i])) {
      availableChannels.push({ name: headers[i], index: i });
    }
  }

  // If no "Channel 1-4" named column, fallback to search for any numeric/sensor column
  if (availableChannels.length === 0) {
    for (let i = 0; i < headers.length; i++) {
      if (i === timeIndex) continue;
      const lower = lowerHeaders[i];
      if (
        !lower.includes('kurtosis') &&
        !lower.includes('demand') &&
        !lower.includes('rear') &&
        (lower.includes('accel') || lower.includes('vib') || lower.includes('signal') || lower.includes('channel'))
      ) {
        availableChannels.push({ name: headers[i], index: i });
      }
    }
  }

  if (availableChannels.length === 0) {
    return {
      success: false,
      error: 'No valid accelerometer measurement channels found (e.g., Channel 1, Channel 2, Channel 3, Channel 4).',
    };
  }

  // 3. Select active channel (prefer non-constant channel if no channel explicitly requested)
  let activeChannel = availableChannels[0];
  if (selectedChannelName) {
    const matched = availableChannels.find(
      c => c.name.toLowerCase() === selectedChannelName.toLowerCase()
    );
    if (matched) activeChannel = matched;
  } else if (availableChannels.length > 1) {
    // If no channel explicitly selected, check if first channel is all zeros/constant
    for (const cand of availableChannels) {
      let nonZeroOrVarying = false;
      let firstVal: number | null = null;
      const testLimit = Math.min(lines.length, 40);
      for (let r = 1; r < testLimit; r++) {
        const row = parseCsvRow(lines[r]);
        if (row.length > cand.index) {
          const val = Number(row[cand.index]);
          if (Number.isFinite(val)) {
            if (firstVal === null) firstVal = val;
            if (Math.abs(val - firstVal) > 1e-6 || Math.abs(val) > 1e-6) {
              nonZeroOrVarying = true;
              break;
            }
          }
        }
      }
      if (nonZeroOrVarying) {
        activeChannel = cand;
        break;
      }
    }
  }

  // 4. Extract numeric samples
  const rawSamples: { t: number; a: number }[] = [];
  let invalidValueCount = 0;

  for (let i = 1; i < lines.length; i++) {
    const row = parseCsvRow(lines[i]);
    if (row.length <= Math.max(timeIndex, activeChannel.index)) continue;

    const t = Number(row[timeIndex]);
    const a = Number(row[activeChannel.index]);

    if (Number.isFinite(t) && Number.isFinite(a)) {
      rawSamples.push({ t, a });
    } else {
      invalidValueCount++;
    }
  }

  if (rawSamples.length < 16) {
    return {
      success: false,
      error: `Too few valid numeric samples extracted (${rawSamples.length} samples, minimum 16 required).`,
    };
  }

  // 5. Sort samples by timestamp ascending
  rawSamples.sort((a, b) => a.t - b.t);

  // 6. Merge duplicate timestamps by averaging acceleration
  const deduplicated: { t: number; a: number }[] = [];
  let duplicateCount = 0;

  for (const sample of rawSamples) {
    const prev = deduplicated[deduplicated.length - 1];
    if (prev && Math.abs(sample.t - prev.t) < 1e-9) {
      // Running average for duplicate timestamp
      const count = (prev as { t: number; a: number; count?: number }).count ?? 1;
      (prev as { t: number; a: number; count?: number }).count = count + 1;
      prev.a += (sample.a - prev.a) / (count + 1);
      duplicateCount++;
    } else {
      deduplicated.push({ t: sample.t, a: sample.a });
    }
  }

  // Clean temporary duplicate count
  for (const s of deduplicated) {
    delete (s as { count?: number }).count;
  }

  if (deduplicated.length < 16) {
    return {
      success: false,
      error: 'Fewer than 16 unique timestamps after duplicate removal.',
    };
  }

  // 7. Robust sampling interval analysis & jitter calculation
  const intervals: number[] = [];
  for (let i = 1; i < deduplicated.length; i++) {
    const dt = deduplicated[i].t - deduplicated[i - 1].t;
    if (dt > 0 && Number.isFinite(dt)) {
      intervals.push(dt);
    }
  }

  if (intervals.length < 10) {
    return {
      success: false,
      error: 'Insufficient positive time intervals between samples.',
    };
  }

  const sortedIntervals = [...intervals].sort((a, b) => a - b);
  const mid = Math.floor(sortedIntervals.length / 2);
  const medianDt = sortedIntervals.length % 2 === 0
    ? (sortedIntervals[mid - 1] + sortedIntervals[mid]) / 2
    : sortedIntervals[mid];

  if (!(medianDt > 0) || !Number.isFinite(medianDt)) {
    return {
      success: false,
      error: 'Unable to calculate a valid median sampling interval.',
    };
  }

  const samplingRateHz = 1 / medianDt;
  const startTime = deduplicated[0].t;
  const endTime = deduplicated[deduplicated.length - 1].t;
  const duration = endTime - startTime;

  if (!(duration > 0)) {
    return {
      success: false,
      error: 'Zero or negative recording duration detected.',
    };
  }

  // Evaluate sampling regularity (jitter check)
  let maxIntervalDeviation = 0;
  for (const dt of intervals) {
    const dev = Math.abs(dt - medianDt) / medianDt;
    if (dev > maxIntervalDeviation) maxIntervalDeviation = dev;
  }

  let qualityWarning: string | null = null;
  if (maxIntervalDeviation > 0.25) {
    qualityWarning = `Non-uniform sampling detected (${(maxIntervalDeviation * 100).toFixed(0)}% max interval variance). Resampled onto uniform grid (fs = ${samplingRateHz.toFixed(1)} Hz). Frequency peaks should be interpreted with caution.`;
  }
  if (duplicateCount > 0) {
    const dupMsg = `Averaged ${duplicateCount} duplicate timestamps.`;
    qualityWarning = qualityWarning ? `${qualityWarning} ${dupMsg}` : dupMsg;
  }
  if (invalidValueCount > 0) {
    const invMsg = `Omitted ${invalidValueCount} non-numeric rows.`;
    qualityWarning = qualityWarning ? `${qualityWarning} ${invMsg}` : invMsg;
  }

  // 8. Resample onto uniform time grid using linear interpolation
  const maxUniformSamples = 100000;
  const targetUniformCount = Math.min(
    maxUniformSamples,
    Math.max(16, Math.floor(duration / medianDt) + 1)
  );

  const uniformSignal = new Float64Array(targetUniformCount);
  let srcIdx = 0;

  for (let i = 0; i < targetUniformCount; i++) {
    const targetT = startTime + i * medianDt;

    while (
      srcIdx < deduplicated.length - 2 &&
      deduplicated[srcIdx + 1].t < targetT
    ) {
      srcIdx++;
    }

    const left = deduplicated[srcIdx];
    const right = deduplicated[Math.min(srcIdx + 1, deduplicated.length - 1)];
    const span = right.t - left.t;

    if (span <= 0) {
      uniformSignal[i] = left.a;
    } else {
      const frac = Math.max(0, Math.min(1, (targetT - left.t) / span));
      uniformSignal[i] = left.a + frac * (right.a - left.a);
    }
  }

  // 9. Signal statistics
  let mean = 0;
  for (let i = 0; i < targetUniformCount; i++) {
    mean += uniformSignal[i];
  }
  mean /= targetUniformCount;

  let sumSqCentered = 0;
  let minVal = Infinity;
  let maxVal = -Infinity;
  let peakCentered = 0;

  for (let i = 0; i < targetUniformCount; i++) {
    const centeredVal = uniformSignal[i] - mean;
    sumSqCentered += centeredVal * centeredVal;
    if (uniformSignal[i] < minVal) minVal = uniformSignal[i];
    if (uniformSignal[i] > maxVal) maxVal = uniformSignal[i];
    const absCentered = Math.abs(centeredVal);
    if (absCentered > peakCentered) peakCentered = absCentered;
  }

  const rms = Math.sqrt(sumSqCentered / targetUniformCount);
  const peakToPeak = maxVal - minVal;
  const crestFactor = rms > 0 ? peakCentered / rms : 0;

  if (peakToPeak < 1e-9) {
    const constMsg = `Selected channel (${activeChannel.name}) has zero variance (constant or all-zero data). Frequency analysis reflects baseline offset.`;
    qualityWarning = qualityWarning ? `${qualityWarning} ${constMsg}` : constMsg;
  }

  // 10. Compute FFT Spectrum
  const spectrumResult = computeSingleSidedSpectrum(uniformSignal, samplingRateHz, 4096);

  // 11. Compute STFT Spectrogram with adaptive time-frequency resolution
  const vibFrameSize = targetUniformCount < 800 ? 128 : targetUniformCount < 1600 ? 256 : 512;
  const vibHopSize = Math.max(16, Math.floor(vibFrameSize / 4));
  const spectrogram = computeSTFT(uniformSignal, samplingRateHz, {
    frameSize: vibFrameSize,
    hopSize: vibHopSize,
    maxFrames: 64,
    maxBins: 32,
  });

  // 12. Downsample time-series for chart rendering while preserving true timestamps
  const displayCount = Math.min(400, targetUniformCount);
  const timeSeries: { t: number; a: number }[] = [];

  for (let i = 0; i < displayCount; i++) {
    const idx = Math.round((i * (targetUniformCount - 1)) / Math.max(1, displayCount - 1));
    timeSeries.push({
      t: Number((startTime + idx * medianDt).toFixed(5)),
      a: Number(uniformSignal[idx].toFixed(6)),
    });
  }

  // 13. Multi-channel metrics for RMS comparison and channel comparison graphs
  const channelMetrics: { name: string; rms: number; peakToPeak: number; timeSeries: { t: number; a: number }[] }[] = [];
  const maxComparePoints = Math.min(250, lines.length - 1);
  const compStep = Math.max(1, Math.floor((lines.length - 1) / maxComparePoints));

  for (const ch of availableChannels) {
    let sumSq = 0;
    let count = 0;
    let minCh = Infinity;
    let maxCh = -Infinity;
    const chSeries: { t: number; a: number }[] = [];

    for (let r = 1; r < lines.length; r++) {
      const row = parseCsvRow(lines[r]);
      if (row.length <= Math.max(timeIndex, ch.index)) continue;
      const tVal = Number(row[timeIndex]);
      const aVal = Number(row[ch.index]);
      if (Number.isFinite(tVal) && Number.isFinite(aVal)) {
        sumSq += aVal * aVal;
        count++;
        if (aVal < minCh) minCh = aVal;
        if (aVal > maxCh) maxCh = aVal;

        if (r % compStep === 0 && chSeries.length < 250) {
          chSeries.push({ t: Number(tVal.toFixed(4)), a: Number(aVal.toFixed(5)) });
        }
      }
    }

    const chRms = count > 0 ? Math.sqrt(sumSq / count) : 0;
    const chP2P = count > 0 && Number.isFinite(minCh) ? maxCh - minCh : 0;

    channelMetrics.push({
      name: ch.name,
      rms: Number(chRms.toFixed(5)),
      peakToPeak: Number(chP2P.toFixed(5)),
      timeSeries: chSeries,
    });
  }

  return {
    success: true,
    data: {
      sampleName: fileName,
      samplingRateHz: Number(samplingRateHz.toFixed(1)),
      rmsAccelerationG: Number(rms.toFixed(5)),
      peakToPeakG: Number(peakToPeak.toFixed(5)),
      crestFactor: Number(crestFactor.toFixed(3)),
      dominantOrderHz: spectrumResult.dominantFrequency,
      timeSeries,
      fftSpectrum: spectrumResult.spectrum,
      selectedChannel: activeChannel.name,
      availableChannels: availableChannels.map(c => c.name),
      channelMetrics,
      qualityWarning,
      spectrogram,
      rawCsvText: csvContent,
    },
  };
}

// ============================================================================
// 3. AUDIO DECODING & ANALYSIS
// ============================================================================

export interface AudioAnalysisOptions {
  fileName?: string;
}

/**
 * Analyses decoded multi-channel AudioBuffer using truthful DSP.
 *
 * Requirements satisfied:
 * 1. Analyzes real decoded audio samples (never generated/preset frequencies).
 * 2. True duration, sample rate, peak amplitude, RMS level, and peak dBFS.
 * 3. Deliberate stereo handling: mono downmix (L+R)/2 with dual-channel peak tracking.
 * 4. Windowed single-sided FFT spectrum with dominant frequency derived from spectrum.
 * 5. STFT spectrogram with accurate time and frequency axes.
 * 6. Downsampled waveform for time-domain rendering.
 */
export function analyzeDecodedAudio(
  channelBuffers: Float32Array[],
  sampleRate: number,
  durationSeconds: number,
  fileName = 'recording.wav'
): AudioEngineData {
  const numChannels = channelBuffers.length;
  const numSamples = channelBuffers[0]?.length || 0;

  if (numSamples === 0 || sampleRate <= 0) {
    return {
      fileName,
      durationSeconds: 0,
      sampleRate,
      peakDb: -100,
      rmsLevel: 0,
      peakAmplitude: 0,
      channelCount: numChannels,
      channelMode: 'mono',
      dominantHarmonicHz: 0,
      spectralPoints: [],
      timeSeries: [],
    };
  }

  // 1. Multi-channel peak tracking and deliberate mono downmixing
  let globalPeak = 0;
  let sumSq = 0;
  const downmixed = new Float64Array(numSamples);

  for (let i = 0; i < numSamples; i++) {
    let mixedSample = 0;
    for (let c = 0; c < numChannels; c++) {
      const s = channelBuffers[c][i];
      const absS = Math.abs(s);
      if (absS > globalPeak) globalPeak = absS;
      mixedSample += s;
    }
    mixedSample /= numChannels;
    downmixed[i] = mixedSample;
    sumSq += mixedSample * mixedSample;
  }

  const rms = Math.sqrt(sumSq / numSamples);
  const peakDb = globalPeak > 0 ? 20 * Math.log10(globalPeak) : -100;
  const channelMode = numChannels === 1
    ? 'Mono'
    : numChannels === 2
    ? 'Stereo (downmixed L+R)'
    : `${numChannels}-channel (downmixed)`;

  // 2. Windowed FFT Spectrum
  // Use up to 4096 samples from middle of recording
  const spectrumResult = computeSingleSidedSpectrum(downmixed, sampleRate, 4096);

  // Convert spectrum to spectral points for chart display (frequency vs magnitude)
  // Subsample spectrum points if dense so chart stays responsive
  const maxSpectrumPoints = 120;
  const rawSpectrum = spectrumResult.spectrum;
  const step = Math.max(1, Math.floor(rawSpectrum.length / maxSpectrumPoints));
  const spectralPoints: { freq: number; magnitude: number }[] = [];

  for (let i = 0; i < rawSpectrum.length; i += step) {
    const pt = rawSpectrum[i];
    // Convert amplitude to dBFS with floor at -80 dBFS
    const db = pt.amp > 1e-5 ? 20 * Math.log10(pt.amp) : -80;
    spectralPoints.push({
      freq: pt.freq,
      magnitude: Number(Math.max(-80, Math.min(0, db)).toFixed(1)),
    });
  }

  // 3. STFT Spectrogram
  const spectrogram = computeSTFT(downmixed, sampleRate, {
    frameSize: 512,
    hopSize: 256,
    maxFrames: 64,
    maxBins: 32,
  });

  // 4. Time-series waveform subsampling
  const displayCount = Math.min(400, numSamples);
  const timeSeries: { t: number; a: number }[] = [];

  for (let i = 0; i < displayCount; i++) {
    const idx = Math.round((i * (numSamples - 1)) / Math.max(1, displayCount - 1));
    timeSeries.push({
      t: Number((idx / sampleRate).toFixed(4)),
      a: Number(downmixed[idx].toFixed(4)),
    });
  }

  return {
    fileName,
    durationSeconds: Number(durationSeconds.toFixed(2)),
    sampleRate,
    peakDb: Number(peakDb.toFixed(1)),
    rmsLevel: Number(rms.toFixed(5)),
    peakAmplitude: Number(globalPeak.toFixed(5)),
    channelCount: numChannels,
    channelMode,
    dominantHarmonicHz: spectrumResult.dominantFrequency,
    spectralPoints,
    timeSeries,
    spectrogram,
  };
}

/**
 * Browser helper to decode and analyze an audio File or Blob using Web Audio API.
 */
export async function analyzeAudioFile(file: File): Promise<AudioEngineData> {
  const arrayBuffer = await file.arrayBuffer();
  const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new AudioCtx();

  try {
    const decodedBuffer = await ctx.decodeAudioData(arrayBuffer);
    const channelCount = decodedBuffer.numberOfChannels;
    const channelBuffers: Float32Array[] = [];

    for (let c = 0; c < channelCount; c++) {
      channelBuffers.push(decodedBuffer.getChannelData(c));
    }

    const analyzed = analyzeDecodedAudio(
      channelBuffers,
      decodedBuffer.sampleRate,
      decodedBuffer.duration,
      file.name
    );

    // Attach decoded AudioBuffer for seamless in-browser playback
    analyzed.audioBuffer = decodedBuffer;
    return analyzed;
  } finally {
    if (ctx.state !== 'closed') {
      try {
        await ctx.close();
      } catch {}
    }
  }
}
