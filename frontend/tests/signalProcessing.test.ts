/**
 * Automated Test Suite for EngineGuard Truthful Signal Processing Engine
 * Executable directly via: node --experimental-strip-types frontend/tests/signalProcessing.test.ts
 */

import assert from 'node:assert';
import {
  cooleyTukeyFFT,
  computeSingleSidedSpectrum,
  computeSTFT,
  parseVibrationCsv,
  analyzeDecodedAudio,
  nextPowerOfTwo,
} from '../src/lib/signalProcessing.ts';

function runTestSuite() {
  console.log('====================================================');
  console.log('EngineGuard DSP Test Suite');
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
  // TEST 1: Next Power of 2 & FFT Algorithm
  // --------------------------------------------------------------------------
  test('Cooley-Tukey FFT & nextPowerOfTwo correctness', () => {
    assert.strictEqual(nextPowerOfTwo(1), 1);
    assert.strictEqual(nextPowerOfTwo(3), 4);
    assert.strictEqual(nextPowerOfTwo(100), 128);
    assert.strictEqual(nextPowerOfTwo(1024), 1024);

    // FFT of impulse [1, 0, 0, 0] should be flat [1, 1, 1, 1]
    const real = new Float64Array([1, 0, 0, 0]);
    const imag = new Float64Array(4);
    cooleyTukeyFFT(real, imag);

    for (let i = 0; i < 4; i++) {
      assert(Math.abs(real[i] - 1.0) < 1e-9, `Impulse real[${i}] should be 1.0`);
      assert(Math.abs(imag[i]) < 1e-9, `Impulse imag[${i}] should be 0`);
    }
  });

  // --------------------------------------------------------------------------
  // TEST 2: Pure Sine Wave Frequency & Amplitude Verification
  // --------------------------------------------------------------------------
  test('Pure Sine Wave (fs=4000 Hz, f0=250 Hz, A=1.0) dominant peak detection', () => {
    const fs = 4000;
    const f0 = 250;
    const A = 1.0;
    const N = 4096;
    const signal = new Float64Array(N);

    for (let n = 0; n < N; n++) {
      signal[n] = A * Math.sin((2 * Math.PI * f0 * n) / fs);
    }

    const result = computeSingleSidedSpectrum(signal, fs, 4096);
    const deltaF = result.deltaF;

    // Tolerance within 1 frequency bin: |dominantFrequency - 250| <= deltaF
    assert(
      Math.abs(result.dominantFrequency - f0) <= deltaF,
      `Dominant frequency ${result.dominantFrequency} Hz should match ${f0} Hz within deltaF ${deltaF} Hz`
    );

    // Hann window coherent gain amplitude tolerance (within 5% of 1.0)
    assert(
      Math.abs(result.dominantAmplitude - A) < 0.05,
      `Measured amplitude ${result.dominantAmplitude} should be within 5% of true amplitude ${A}`
    );
  });

  // --------------------------------------------------------------------------
  // TEST 3: Two-Tone Signal Peak Identification
  // --------------------------------------------------------------------------
  test('Two-Tone Signal (f1=120 Hz @ A1=0.4, f2=500 Hz @ A2=1.5)', () => {
    const fs = 5000;
    const N = 2048;
    const signal = new Float64Array(N);

    for (let n = 0; n < N; n++) {
      signal[n] = 0.4 * Math.sin((2 * Math.PI * 120 * n) / fs) +
                  1.5 * Math.sin((2 * Math.PI * 500 * n) / fs);
    }

    const result = computeSingleSidedSpectrum(signal, fs, 2048);

    // Dominant peak must be 500 Hz because A2=1.5 > A1=0.4
    assert(
      Math.abs(result.dominantFrequency - 500) <= result.deltaF * 1.5,
      `Dominant peak should be ~500 Hz, got ${result.dominantFrequency}`
    );

    // Check that 120 Hz also exists as a local peak
    const binsNear120 = result.spectrum.filter(p => Math.abs(p.freq - 120) <= result.deltaF * 2.5);
    assert(binsNear120.length > 0, 'Bins near 120 Hz must be present in spectrum');
    const peak120 = binsNear120.reduce((max, p) => p.amp > max.amp ? p : max, binsNear120[0]);
    assert(peak120.amp > 0.3, `120 Hz peak amplitude should be ~0.4, got ${peak120.amp}`);
  });

  // --------------------------------------------------------------------------
  // TEST 4: Silence & Zero Signal Edge Cases
  // --------------------------------------------------------------------------
  test('Silence and Zero Signal handling (No NaN or infinite loops)', () => {
    const silence = new Float64Array(512); // All zeros
    const result = computeSingleSidedSpectrum(silence, 44100, 512);

    assert.strictEqual(result.dominantFrequency, 0);
    assert.strictEqual(result.dominantAmplitude, 0);

    const audioResult = analyzeDecodedAudio([silence as unknown as Float32Array], 44100, 0.0116, 'silence.wav');
    assert.strictEqual(audioResult.peakDb, -100);
    assert.strictEqual(audioResult.rmsLevel, 0);
    assert.strictEqual(audioResult.dominantHarmonicHz, 0);
    assert(!Number.isNaN(audioResult.peakDb));
    assert(!Number.isNaN(audioResult.rmsLevel));
  });

  // --------------------------------------------------------------------------
  // TEST 5: Non-standard sample rates (8000 Hz, 16000 Hz, 48000 Hz)
  // --------------------------------------------------------------------------
  test('Frequency resolution and Nyquist across varying sample rates', () => {
    for (const fs of [8000, 16000, 48000]) {
      const signal = new Float64Array(1024);
      const res = computeSingleSidedSpectrum(signal, fs, 1024);
      assert.strictEqual(res.nyquistHz, fs / 2);
      assert.strictEqual(res.deltaF, fs / 1024);
      const maxFreq = res.spectrum[res.spectrum.length - 1].freq;
      assert(Math.abs(maxFreq - fs / 2) < 0.1, `Max frequency should reach Nyquist ${fs/2}`);
    }
  });

  // --------------------------------------------------------------------------
  // TEST 6: STFT Spectrogram Matrix Shape and Finite Values
  // --------------------------------------------------------------------------
  test('STFT Spectrogram generates correct time-frequency matrix', () => {
    const fs = 2000;
    const durationSec = 1.0;
    const N = Math.floor(fs * durationSec);
    const signal = new Float64Array(N);

    // Chirp: frequency ramps from 100 Hz to 600 Hz over 1 second
    for (let n = 0; n < N; n++) {
      const t = n / fs;
      const f = 100 + 500 * t;
      signal[n] = Math.sin(2 * Math.PI * f * t);
    }

    const stft = computeSTFT(signal, fs, { frameSize: 256, hopSize: 64, maxFrames: 32, maxBins: 24 });
    assert(stft.times.length > 0, 'Spectrogram times must not be empty');
    assert(stft.frequencies.length > 0, 'Spectrogram frequencies must not be empty');
    assert.strictEqual(stft.matrix.length, stft.times.length);
    assert.strictEqual(stft.matrix[0].length, stft.frequencies.length);

    // Check bounds
    assert(stft.times[0] >= 0);
    assert(stft.times[stft.times.length - 1] <= durationSec);
    assert(stft.frequencies[stft.frequencies.length - 1] <= fs / 2);
    assert(stft.maxMagnitude > 0, 'Spectrogram max magnitude must be positive');
  });

  // --------------------------------------------------------------------------
  // TEST 7: Vibration CSV Parser with Multi-Channel & Column Exclusion
  // --------------------------------------------------------------------------
  test('Vibration CSV parser excludes kurtosis/rear columns and detects Channels 1-4', () => {
    const csvContent = [
      '"Time","Demand 1","Control 1","Output Drive 1","Channel 1","Channel 2","Channel 3","Channel 4","Channel 1 Kurtosis","Rear Input 1"',
      ...Array.from({ length: 50 }, (_, i) => {
        const t = (i * 0.001).toFixed(4);
        const ch1 = (Math.sin(2 * Math.PI * 100 * (i * 0.001))).toFixed(4);
        const ch2 = (Math.cos(2 * Math.PI * 200 * (i * 0.001)) * 2).toFixed(4);
        return `"${t}","0.12","0.17","0","${ch1}","${ch2}","0.15","0.0001","3.5","0"`;
      })
    ].join('\n');

    const result = parseVibrationCsv(csvContent, 'test_vib.csv');
    assert.strictEqual(result.success, true);
    assert(result.data !== undefined);
    assert.deepStrictEqual(result.data!.availableChannels, ['Channel 1', 'Channel 2', 'Channel 3', 'Channel 4']);
    assert.strictEqual(result.data!.selectedChannel, 'Channel 1');
    assert(Math.abs(result.data!.samplingRateHz - 1000) < 5, 'Sample rate should be ~1000 Hz');

    // Select Channel 2 explicitly
    const resultCh2 = parseVibrationCsv(csvContent, 'test_vib.csv', 'Channel 2');
    assert.strictEqual(resultCh2.success, true);
    assert.strictEqual(resultCh2.data!.selectedChannel, 'Channel 2');
    // Channel 2 amplitude was 2x Channel 1, so RMS should be approximately 2x
    assert(resultCh2.data!.rmsAccelerationG > result.data!.rmsAccelerationG * 1.5);
  });

  // --------------------------------------------------------------------------
  // TEST 8: Vibration CSV Parser Handles Duplicate Timestamps & Jitter Warning
  // --------------------------------------------------------------------------
  test('Vibration CSV duplicate timestamp averaging, unsorted rows & jitter warning', () => {
    // Unsorted rows with duplicates and irregular time steps
    const rows = [
      '"Time","Channel 1"',
      '"0.0040","0.40"',
      '"0.0010","0.10"',
      '"0.0010","0.20"', // Duplicate timestamp: avg should be 0.15
      '"0.0020","0.20"',
      '"0.0030","0.30"',
      '"0.0050","0.50"',
      '"0.0060","0.60"',
      '"0.0070","0.70"',
      '"0.0080","0.80"',
      '"0.0090","0.90"',
      '"0.0100","1.00"',
      '"0.0150","1.50"', // Jump in time (jitter)
      '"0.0160","1.60"',
      '"0.0170","1.70"',
      '"0.0180","1.80"',
      '"0.0190","1.90"',
      '"0.0200","2.00"',
    ];

    const result = parseVibrationCsv(rows.join('\n'), 'jitter.csv');
    assert.strictEqual(result.success, true);
    assert(result.data !== undefined);
    assert(result.data!.qualityWarning !== null, 'Quality warning should be emitted for duplicates and jitter');
    assert(result.data!.qualityWarning!.includes('duplicate'), 'Warning should mention duplicate timestamps');
    // Timestamps in timeSeries should be strictly non-decreasing
    for (let i = 1; i < result.data!.timeSeries.length; i++) {
      assert(result.data!.timeSeries[i].t >= result.data!.timeSeries[i - 1].t, 'Time series must be monotonic');
    }
  });

  // --------------------------------------------------------------------------
  // TEST 9: Malformed CSV File Error Handling
  // --------------------------------------------------------------------------
  test('Malformed CSV handling (missing headers, non-numeric rows, empty lines)', () => {
    // Empty / short file
    const resEmpty = parseVibrationCsv('Time,Channel 1\n0.01,0.5');
    assert.strictEqual(resEmpty.success, false);

    // Missing Time header
    const resNoTime = parseVibrationCsv('A,B,C\n1,2,3\n4,5,6\n'.repeat(10));
    assert.strictEqual(resNoTime.success, false);
    assert(resNoTime.error!.includes('missing "Time" column'));

    // No numeric channels
    const resNoChannels = parseVibrationCsv('Time,Kurtosis,Demand\n'.concat('0.01,1,2\n'.repeat(20)));
    assert.strictEqual(resNoChannels.success, false);
    assert(resNoChannels.error!.includes('No valid accelerometer measurement channels'));
  });

  // --------------------------------------------------------------------------
  // TEST 10: Audio Stereo Downmixing & Dual-Channel Peak Tracking
  // --------------------------------------------------------------------------
  test('Audio stereo downmix (L+R)/2 and global peak tracking across channels', () => {
    const N = 4096;
    const fs = 44100;
    const chL = new Float32Array(N);
    const chR = new Float32Array(N);

    // Left channel: 440 Hz tone with max amplitude 0.5
    for (let n = 0; n < N; n++) {
      chL[n] = 0.5 * Math.sin((2 * Math.PI * 440 * n) / fs);
    }

    // Right channel: silence except single impulsive peak of 0.95 at index 100
    chR[100] = 0.95;

    const audioData = analyzeDecodedAudio([chL, chR], fs, N / fs, 'stereo_test.wav');

    // Global peak must track the 0.95 from right channel
    assert(
      Math.abs(audioData.peakAmplitude! - 0.95) < 1e-4,
      `Peak amplitude should be 0.95, got ${audioData.peakAmplitude}`
    );
    assert.strictEqual(audioData.channelCount, 2);
    assert(audioData.channelMode!.includes('Stereo'));

    // Dominant harmonic should be ~440 Hz from downmix
    assert(
      Math.abs(audioData.dominantHarmonicHz - 440) <= 25,
      `Dominant harmonic should be ~440 Hz, got ${audioData.dominantHarmonicHz} Hz`
    );
  });

  console.log(`\nAll ${passedTests}/${totalTests} tests passed successfully!`);
}

runTestSuite();
