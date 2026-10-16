import React from 'react';
import { BarChart3, Activity, Waves, AlertTriangle } from 'lucide-react';
import {
  InputModality,
  TabularEngineData,
  AudioEngineData,
  VibrationEngineData,
} from '../../types/diagnosis';

interface DiagnosticChartsProps {
  modality: InputModality;
  tabularData: TabularEngineData;
  audioData: AudioEngineData;
  vibrationData: VibrationEngineData;
}

type SignalPoint = { t: number; a: number };
type SpectrumPoint = { freq: number; amp: number };

function getSpectrumPath(
  points: { freq: number; magnitude: number }[],
  width: number,
  height: number
): string {
  if (points.length < 2) return '';

  const minMagnitude = Math.min(...points.map(p => p.magnitude));
  const maxMagnitude = Math.max(...points.map(p => p.magnitude));
  const range = maxMagnitude - minMagnitude || 1;

  return points
    .map((point, index) => {
      const x = (index / (points.length - 1)) * width;
      const normalized = (point.magnitude - minMagnitude) / range;
      const y = height - 5 - normalized * (height - 15);

      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');
}

export const DiagnosticCharts: React.FC<DiagnosticChartsProps> = ({
  modality,
  tabularData,
  audioData,
  vibrationData,
}) => {
  // Vibration data preparation
  const vibrationPoints: SignalPoint[] = vibrationData.timeSeries || [];
  const vibSpectrumPoints: SpectrumPoint[] = vibrationData.fftSpectrum || [];

  const minVibTime = vibrationPoints.length > 0 ? vibrationPoints[0].t : 0;
  const maxVibTime = vibrationPoints.length > 0 ? vibrationPoints[vibrationPoints.length - 1].t : 0;

  const maxVibFrequency = Math.max(
    1,
    ...vibSpectrumPoints.map(point => point.freq)
  );
  const maxVibAmplitude = Math.max(
    1e-6,
    ...vibSpectrumPoints.map(point => point.amp)
  );

  // Spectrogram from vibration data
  const vibSpectrogram = vibrationData.spectrogram;

  // Audio data preparation
  const audioPoints: SignalPoint[] = audioData.timeSeries || [];
  const audioSpectralPoints = audioData.spectralPoints || [];
  const minAudioFreq = audioSpectralPoints.length > 0 ? audioSpectralPoints[0].freq : 0;
  const maxAudioFreq = audioSpectralPoints.length > 0 ? audioSpectralPoints[audioSpectralPoints.length - 1].freq : (audioData.sampleRate / 2 || 22050);
  const audioSpectrogram = audioData.spectrogram;

  return (
    <div className="bg-[#101214] border border-[#292D31] rounded-xl p-5 font-sans space-y-4">
      <div className="flex items-center justify-between border-b border-[#292D31] pb-3">
        <div className="flex items-center gap-2">
          {modality === 'tabular' && (
            <BarChart3 className="w-4 h-4 text-[#D66A32]" />
          )}
          {modality === 'audio' && (
            <Waves className="w-4 h-4 text-[#D66A32]" />
          )}
          {modality === 'vibration' && (
            <Activity className="w-4 h-4 text-[#D66A32]" />
          )}

          <h4 className="text-xs font-mono uppercase tracking-wider text-[#F1F2F3] font-semibold">
            {modality === 'tabular' &&
              'Thermodynamic & Kinematic Variance vs Calibration Baseline'}
            {modality === 'audio' &&
              'Acoustic Waveform, Windowed FFT & Spectrogram'}
            {modality === 'vibration' &&
              `Vibration Waveform, FFT Spectrum & STFT Spectrogram (${vibrationData.selectedChannel || 'Channel 1'})`}
          </h4>
        </div>

        <span className="text-[10px] font-mono text-[#737A82]">
          {modality === 'vibration' && (vibrationData.sampleName || 'Accelerometer CSV')}
          {modality === 'audio' && (audioData.fileName || 'Audio Recording')}
          {modality === 'tabular' && 'Telemetry Dataset'}
        </span>
      </div>

      {/* ============================================================ */}
      {/* 1. TABULAR CHART */}
      {/* ============================================================ */}
      {modality === 'tabular' && (
        <div className="space-y-3">
          {[
            {
              name: 'Engine Reactive Force',
              unit: 'N',
              current: tabularData.Force,
              min: 0,
              max: 1500,
              isAlert: tabularData.Force > 350,
            },
            {
              name: 'Manifold Pressure (MAP)',
              unit: 'bar/V',
              current: tabularData.MAP,
              min: 0.4,
              max: 4.6,
              isAlert: tabularData.MAP > 3.0,
            },
            {
              name: 'Carbon Monoxide (CO)',
              unit: '%',
              current: tabularData.CO,
              min: 0.4,
              max: 10,
              isAlert: tabularData.CO > 2.5,
            },
            {
              name: 'Air-Fuel Ratio (AFR)',
              unit: '',
              current: tabularData.AFR,
              min: 10,
              max: 17,
              isAlert: tabularData.AFR < 13.5 || tabularData.AFR > 15.8,
            },
          ].map(bar => {
            const pct = Math.min(
              100,
              Math.max(0, ((bar.current - bar.min) / (bar.max - bar.min)) * 100)
            );

            return (
              <div key={bar.name} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-[#A4A9AF] text-[11px]">{bar.name}</span>
                  <span
                    className={`font-mono text-[11px] ${
                      bar.isAlert ? 'text-[#D66A32]' : 'text-[#F1F2F3]'
                    }`}
                  >
                    {bar.current.toFixed(2)} {bar.unit}
                  </span>
                </div>

                <div className="relative w-full h-2 bg-[#171A1D] rounded overflow-hidden border border-[#292D31]">
                  <div
                    className="absolute top-0 bottom-0 bg-[#292D31]/50"
                    style={{ left: '20%', width: '45%' }}
                  />
                  <div
                    className={`h-full rounded ${
                      bar.isAlert ? 'bg-[#D66A32]' : 'bg-[#A4A9AF]'
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}

          <div className="flex justify-between text-[10px] font-mono text-[#737A82] pt-2 border-t border-[#292D31]">
            <span>Nominal operating range (shaded band)</span>
            <span>Threshold excursion alert</span>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 2. AUDIO CHARTS: WAVEFORM, FFT & STFT SPECTROGRAM */}
      {/* ============================================================ */}
      {modality === 'audio' && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* A. Audio Time-Domain Waveform */}
            <div className="bg-[#171A1D] p-3 rounded-lg border border-[#292D31]">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] font-mono text-[#737A82] uppercase">
                  1. Acoustic Waveform
                </span>
                <span className="text-[9px] font-mono text-[#737A82]">
                  {audioData.channelMode || 'Downmixed'}
                </span>
              </div>

              <svg
                className="w-full h-28"
                viewBox="0 0 300 80"
                preserveAspectRatio="none"
              >
                {(() => {
                  if (audioPoints.length < 2) {
                    return (
                      <text x="150" y="45" fill="#737A82" fontSize="10" textAnchor="middle" fontFamily="monospace">
                        Acoustic profile loaded
                      </text>
                    );
                  }

                  const values = audioPoints.map(p => p.a);
                  const min = Math.min(...values);
                  const max = Math.max(...values);
                  const range = max - min || 1;
                  const low = min - range * 0.05;
                  const high = max + range * 0.05;

                  const yFor = (value: number) =>
                    75 - ((value - low) / (high - low)) * 65;

                  const zeroY = yFor(0);

                  const path = audioPoints
                    .map((p, idx) => {
                      const x = (idx / (audioPoints.length - 1)) * 300;
                      return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${yFor(p.a).toFixed(1)}`;
                    })
                    .join(' ');

                  return (
                    <>
                      <line
                        x1="0"
                        y1={zeroY}
                        x2="300"
                        y2={zeroY}
                        stroke="#41464D"
                        strokeDasharray="3 3"
                      />
                      <path
                        d={path}
                        fill="none"
                        stroke="#D66A32"
                        strokeWidth="1.2"
                      />
                    </>
                  );
                })()}
              </svg>

              <div className="flex justify-between text-[9px] font-mono text-[#737A82] border-t border-[#292D31] pt-1">
                <span>0.00 s</span>
                <span>{(audioData.durationSeconds / 2).toFixed(2)} s</span>
                <span>{audioData.durationSeconds.toFixed(2)} s</span>
              </div>
            </div>

            {/* B. Audio FFT Spectrum */}
            <div className="bg-[#171A1D] p-3 rounded-lg border border-[#292D31]">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] font-mono text-[#737A82] uppercase">
                  2. Windowed FFT Spectrum
                </span>
                <span className="text-[9px] font-mono text-[#D66A32]">
                  Peak: {audioData.dominantHarmonicHz.toFixed(1)} Hz
                </span>
              </div>

              <svg
                className="w-full h-28"
                viewBox="0 0 300 80"
                preserveAspectRatio="none"
              >
                {[20, 45, 70].map(y => (
                  <line
                    key={y}
                    x1="0"
                    y1={y}
                    x2="300"
                    y2={y}
                    stroke="#292D31"
                    strokeDasharray="2 2"
                  />
                ))}

                {(() => {
                  const points = audioSpectralPoints;
                  const path = getSpectrumPath(points, 300, 75);
                  if (!path) return null;

                  return (
                    <path
                      d={path}
                      fill="none"
                      stroke="#D66A32"
                      strokeWidth="1.5"
                    />
                  );
                })()}
              </svg>

              {/* Dynamic Frequency Axis based on actual sample rate / range */}
              <div className="flex justify-between text-[9px] font-mono text-[#737A82] border-t border-[#292D31] pt-1">
                <span>{minAudioFreq.toFixed(0)} Hz</span>
                <span>{((minAudioFreq + maxAudioFreq) / 2).toFixed(0)} Hz</span>
                <span>{maxAudioFreq.toFixed(0)} Hz</span>
              </div>
            </div>

            {/* C. Audio STFT Spectrogram */}
            {audioSpectrogram && audioSpectrogram.matrix.length > 0 && (
              <div className="bg-[#171A1D] p-3 rounded-lg border border-[#292D31] md:col-span-2">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[10px] font-mono text-[#737A82] uppercase">
                    3. Acoustic STFT Spectrogram
                  </span>
                  <span className="text-[9px] font-mono text-[#737A82]">
                    Time-Frequency Heatmap
                  </span>
                </div>

                {(() => {
                  const audioMaxMag = (audioSpectrogram.maxMagnitude && audioSpectrogram.maxMagnitude > 0)
                    ? audioSpectrogram.maxMagnitude
                    : Math.max(1e-6, ...audioSpectrogram.matrix.flatMap(r => r));

                  return (
                    <svg
                      className="w-full h-32"
                      viewBox={`0 0 ${audioSpectrogram.matrix.length * 8} 100`}
                      preserveAspectRatio="none"
                    >
                      {audioSpectrogram.matrix.map((frame, frameIdx) =>
                        frame.map((mag, binIdx) => {
                          const normalized = audioMaxMag > 0 ? mag / audioMaxMag : 0;
                          const opacity = Math.max(0.05, Math.min(1, normalized));
                          const cellHeight = 100 / Math.max(1, frame.length);

                          return (
                            <rect
                              key={`aud-${frameIdx}-${binIdx}`}
                              x={frameIdx * 8}
                              y={100 - (binIdx + 1) * cellHeight}
                              width="8.2"
                              height={cellHeight + 0.2}
                              fill="#D66A32"
                              opacity={opacity}
                            >
                              <title>
                                {`Time: ${audioSpectrogram.times[frameIdx]}s; Freq: ${audioSpectrogram.frequencies[binIdx]} Hz`}
                              </title>
                            </rect>
                          );
                        })
                      )}
                    </svg>
                  );
                })()}

                <div className="flex justify-between text-[9px] font-mono text-[#737A82] border-t border-[#292D31] pt-1">
                  <span>0.00 s</span>
                  <span>Time</span>
                  <span>{audioData.durationSeconds.toFixed(2)} s</span>
                </div>
              </div>
            )}
          </div>

          {/* Audio Metrics Footer */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] font-mono text-[#737A82]">
            <div className="bg-[#171A1D] rounded p-2 border border-[#292D31]">
              Dominant Harmonic:{' '}
              <strong className="text-[#D66A32] block text-xs mt-0.5">
                {audioData.dominantHarmonicHz.toFixed(1)} Hz
              </strong>
            </div>
            <div className="bg-[#171A1D] rounded p-2 border border-[#292D31]">
              Peak Level:{' '}
              <strong className="text-[#F1F2F3] block text-xs mt-0.5">
                {audioData.peakDb.toFixed(1)} dBFS
              </strong>
            </div>
            <div className="bg-[#171A1D] rounded p-2 border border-[#292D31]">
              Sample Rate:{' '}
              <strong className="text-[#F1F2F3] block text-xs mt-0.5">
                {audioData.sampleRate} Hz
              </strong>
            </div>
            <div className="bg-[#171A1D] rounded p-2 border border-[#292D31]">
              Channels:{' '}
              <strong className="text-[#A4A9AF] block text-xs mt-0.5 truncate">
                {audioData.channelMode || (audioData.channelCount && audioData.channelCount > 1 ? `${audioData.channelCount} ch` : 'Mono')}
              </strong>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 3. VIBRATION: WAVEFORM, FFT AND STFT */}
      {/* ============================================================ */}
      {modality === 'vibration' && (
        <div className="space-y-3">
          {/* Quality Warning if present */}
          {vibrationData.qualityWarning && (
            <div className="p-2.5 rounded-lg bg-amber-950/40 border border-amber-500/40 text-amber-200 text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-[11px] leading-relaxed font-mono">{vibrationData.qualityWarning}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* A. Time-domain waveform */}
            <div className="bg-[#171A1D] p-3 rounded-lg border border-[#292D31]">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] font-mono text-[#737A82] uppercase">
                  1. Time-Domain Waveform
                </span>
                <span className="text-[9px] font-mono text-[#D66A32]">
                  {vibrationData.selectedChannel || 'Channel 1'}
                </span>
              </div>

              <svg
                className="w-full h-28"
                viewBox="0 0 300 80"
                preserveAspectRatio="none"
              >
                {(() => {
                  if (vibrationPoints.length < 2) return null;

                  const values = vibrationPoints.map(point => point.a);
                  const min = Math.min(...values);
                  const max = Math.max(...values);
                  const range = max - min || 1;
                  const low = min - range * 0.05;
                  const high = max + range * 0.05;

                  const yFor = (value: number) =>
                    75 - ((value - low) / (high - low)) * 65;

                  const zeroY =
                    low <= 0 && high >= 0
                      ? yFor(0)
                      : yFor((min + max) / 2);

                  const path = vibrationPoints
                    .map((point, index) => {
                      const x = (index / (vibrationPoints.length - 1)) * 300;
                      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${yFor(point.a).toFixed(1)}`;
                    })
                    .join(' ');

                  return (
                    <>
                      <line
                        x1="0"
                        y1={zeroY}
                        x2="300"
                        y2={zeroY}
                        stroke="#41464D"
                        strokeDasharray="3 3"
                      />
                      <path
                        d={path}
                        fill="none"
                        stroke="#D66A32"
                        strokeWidth="1.5"
                      />
                    </>
                  );
                })()}
              </svg>

              <div className="flex justify-between text-[9px] font-mono text-[#737A82] border-t border-[#292D31] pt-1">
                <span>{minVibTime.toFixed(4)} s</span>
                <span>{((minVibTime + maxVibTime) / 2).toFixed(4)} s</span>
                <span>{maxVibTime.toFixed(4)} s</span>
              </div>
            </div>

            {/* B. Frequency spectrum */}
            <div className="bg-[#171A1D] p-3 rounded-lg border border-[#292D31]">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] font-mono text-[#737A82] uppercase">
                  2. Single-Sided FFT Spectrum
                </span>
                <span className="text-[9px] font-mono text-[#D66A32]">
                  Peak: {vibrationData.dominantOrderHz.toFixed(1)} Hz
                </span>
              </div>

              <svg
                className="w-full h-28"
                viewBox="0 0 300 80"
                preserveAspectRatio="none"
              >
                <line
                  x1="0"
                  y1="75"
                  x2="300"
                  y2="75"
                  stroke="#41464D"
                />

                {vibSpectrumPoints.map((point, index) => {
                  const x = maxVibFrequency > 0
                    ? (point.freq / maxVibFrequency) * 290 + 5
                    : 5;
                  const height = maxVibAmplitude > 0
                    ? (point.amp / maxVibAmplitude) * 68
                    : 0;
                  const width = Math.max(
                    0.5,
                    Math.min(3, 280 / vibSpectrumPoints.length)
                  );

                  return (
                    <rect
                      key={`${point.freq}-${index}`}
                      x={x}
                      y={75 - height}
                      width={width}
                      height={Math.max(0.5, height)}
                      fill="#D66A32"
                    >
                      <title>
                        {`Frequency: ${point.freq.toFixed(2)} Hz; Amplitude: ${point.amp.toFixed(6)} units`}
                      </title>
                    </rect>
                  );
                })}
              </svg>

              <div className="flex justify-between text-[9px] font-mono text-[#737A82] border-t border-[#292D31] pt-1">
                <span>0 Hz</span>
                <span>{(maxVibFrequency / 2).toFixed(1)} Hz</span>
                <span>{maxVibFrequency.toFixed(1)} Hz</span>
              </div>
            </div>

            {/* C. STFT spectrogram */}
            <div className="bg-[#171A1D] p-3 rounded-lg border border-[#292D31] md:col-span-2">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] font-mono text-[#737A82] uppercase">
                  3. STFT Spectrogram
                </span>
                <span className="text-[9px] font-mono text-[#737A82]">
                  Uniformly Resampled Time-Frequency Energy
                </span>
              </div>

              {(() => {
                if (!vibSpectrogram || vibSpectrogram.matrix.length === 0) {
                  return (
                    <div className="h-32 flex items-center justify-center text-xs text-[#737A82] font-mono">
                      Additional samples required to render STFT spectrogram.
                    </div>
                  );
                }

                const vibMaxMag = (vibSpectrogram.maxMagnitude && vibSpectrogram.maxMagnitude > 0)
                  ? vibSpectrogram.maxMagnitude
                  : Math.max(1e-6, ...vibSpectrogram.matrix.flatMap(r => r));

                return (
                  <>
                    <svg
                      className="w-full h-36"
                      viewBox={`0 0 ${vibSpectrogram.matrix.length * 8} 100`}
                      preserveAspectRatio="none"
                    >
                      {vibSpectrogram.matrix.map((frame, frameIndex) =>
                        frame.map((magnitude, binIndex) => {
                          const normalized = vibMaxMag > 0 ? magnitude / vibMaxMag : 0;
                          const opacity = Math.max(0.06, Math.min(1, normalized));
                          const cellHeight = 100 / Math.max(1, frame.length);

                          return (
                            <rect
                              key={`vib-stft-${frameIndex}-${binIndex}`}
                              x={frameIndex * 8}
                              y={100 - (binIndex + 1) * cellHeight}
                              width="8.2"
                              height={cellHeight + 0.2}
                              fill="#D66A32"
                              opacity={opacity}
                            >
                              <title>
                                {`Time: ${vibSpectrogram.times[frameIndex]}s; Freq: ${vibSpectrogram.frequencies[binIndex]} Hz`}
                              </title>
                            </rect>
                          );
                        })
                      )}
                    </svg>

                    <div className="flex justify-between text-[9px] font-mono text-[#737A82] border-t border-[#292D31] pt-1">
                      <span>{minVibTime.toFixed(4)} s</span>
                      <span>Time</span>
                      <span>{maxVibTime.toFixed(4)} s</span>
                    </div>

                    <div className="text-[9px] font-mono text-[#737A82] mt-1">
                      Frequency range: 0 Hz to {(vibrationData.samplingRateHz / 2).toFixed(0)} Hz (Nyquist). Calculated from uniform sampling.
                    </div>
                  </>
                );
              })()}
            </div>
          </div>

          {/* Truthful Vibration Signal metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] font-mono text-[#737A82]">
            <div className="bg-[#171A1D] rounded p-2 border border-[#292D31]">
              RMS Amplitude:{' '}
              <strong className="text-[#D66A32] block text-xs mt-0.5">
                {vibrationData.rmsAccelerationG.toFixed(4)} <span className="text-[10px] text-[#737A82] font-normal">units</span>
              </strong>
            </div>
            <div className="bg-[#171A1D] rounded p-2 border border-[#292D31]">
              Peak-to-Peak:{' '}
              <strong className="text-[#F1F2F3] block text-xs mt-0.5">
                {vibrationData.peakToPeakG.toFixed(4)} <span className="text-[10px] text-[#737A82] font-normal">units</span>
              </strong>
            </div>
            <div className="bg-[#171A1D] rounded p-2 border border-[#292D31]">
              Dominant Frequency:{' '}
              <strong className="text-[#D66A32] block text-xs mt-0.5">
                {vibrationData.dominantOrderHz.toFixed(1)} Hz
              </strong>
            </div>
            <div className="bg-[#171A1D] rounded p-2 border border-[#292D31]">
              Crest Factor:{' '}
              <strong className="text-[#F1F2F3] block text-xs mt-0.5">
                {vibrationData.crestFactor.toFixed(3)}
              </strong>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
