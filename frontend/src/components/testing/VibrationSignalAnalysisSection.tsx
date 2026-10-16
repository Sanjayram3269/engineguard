import React, { useState } from 'react';
import { Activity, AlertTriangle } from 'lucide-react';
import { VibrationEngineData } from '../../types/diagnosis';

interface VibrationSignalAnalysisSectionProps {
  vibrationData: VibrationEngineData | null;
  error?: string | null;
  onSelectChannel?: (channel: string) => void;
}

const CHANNEL_COLORS: Record<string, string> = {
  'Channel 1': '#D66A32', // Orange
  'Channel 2': '#38BDF8', // Cyan/Sky
  'Channel 3': '#34D399', // Emerald
  'Channel 4': '#A78BFA', // Purple
  'default': '#D66A32'
};

export const VibrationSignalAnalysisSection: React.FC<VibrationSignalAnalysisSectionProps> = ({
  vibrationData,
  error,
  onSelectChannel,
}) => {
  const [activeCompareChannel, setActiveCompareChannel] = useState<string>('ALL');

  if (error) {
    return (
      <div className="bg-[#101214] border border-[#292D31] rounded-2xl p-5 space-y-3 font-sans shadow-xl">
        <div className="flex items-center gap-2 border-b border-[#292D31] pb-3">
          <Activity className="w-4 h-4 text-[#D66A32]" />
          <h3 className="text-sm font-bold text-[#F1F2F3] font-mono uppercase tracking-wider">
            6. Vibration Signal Analysis
          </h3>
        </div>
        <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/40 text-xs font-mono text-red-200">
          Vibration processing failed: {error}
        </div>
      </div>
    );
  }

  if (!vibrationData || vibrationData.samplingRateHz <= 0) {
    return (
      <div className="bg-[#101214] border border-[#292D31] rounded-2xl p-5 space-y-3 font-sans shadow-xl">
        <div className="flex items-center gap-2 border-b border-[#292D31] pb-3">
          <Activity className="w-4 h-4 text-[#D66A32]" />
          <h3 className="text-sm font-bold text-[#F1F2F3] font-mono uppercase tracking-wider">
            6. Vibration Signal Analysis
          </h3>
        </div>
        <div className="p-4 rounded-xl bg-[#171A1D]/60 border border-[#292D31] text-xs font-mono text-[#737A82] text-center">
          Vibration analysis unavailable — no vibration data provided.
        </div>
      </div>
    );
  }

  const vibrationPoints = vibrationData.timeSeries || [];
  const vibSpectrumPoints = vibrationData.fftSpectrum || [];
  const minVibTime = vibrationPoints.length > 0 ? vibrationPoints[0].t : 0;
  const maxVibTime = vibrationPoints.length > 0 ? vibrationPoints[vibrationPoints.length - 1].t : 0;
  const maxVibFrequency = Math.max(1, ...vibSpectrumPoints.map(p => p.freq));
  const maxVibAmplitude = Math.max(1e-6, ...vibSpectrumPoints.map(p => p.amp));
  const vibSpectrogram = vibrationData.spectrogram;
  const channelMetrics = vibrationData.channelMetrics || [];

  return (
    <div className="bg-[#101214] border border-[#292D31] rounded-2xl p-5 space-y-4 font-sans shadow-xl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#292D31] pb-3">
        <div className="flex items-center gap-2.5">
          <Activity className="w-4 h-4 text-[#D66A32]" />
          <div>
            <h3 className="text-sm font-bold text-[#F1F2F3] font-mono uppercase tracking-wider">
              6. Vibration Signal Analysis &amp; Bearing Kinematics
            </h3>
            <p className="text-[10px] text-[#737A82] font-mono mt-0.5">
              Recording: <span className="text-[#F1F2F3] font-semibold">{vibrationData.sampleName || 'vibration_log.csv'}</span> •{' '}
              Selected: <span className="text-[#D66A32] font-bold">{vibrationData.selectedChannel || 'Channel 1'}</span> •{' '}
              Sampling: {vibrationData.samplingRateHz.toFixed(1)} Hz
            </p>
          </div>
        </div>

        {/* Channel Selection Buttons */}
        {vibrationData.availableChannels && vibrationData.availableChannels.length > 1 && onSelectChannel && (
          <div className="flex items-center gap-1 bg-[#0C0E10] p-1 rounded-lg border border-[#292D31] text-[10px] font-mono">
            <span className="text-[#737A82] px-1 hidden sm:inline">Channel:</span>
            {vibrationData.availableChannels.map(ch => {
              const isSelected = (vibrationData.selectedChannel || 'Channel 1') === ch;
              return (
                <button
                  key={ch}
                  onClick={() => onSelectChannel(ch)}
                  className={`px-2 py-0.5 rounded transition cursor-pointer font-bold ${
                    isSelected
                      ? 'bg-[#D66A32] text-white shadow-sm'
                      : 'text-[#737A82] hover:text-[#F1F2F3] hover:bg-[#171A1D]'
                  }`}
                >
                  {ch}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Quality Warning if present */}
      {vibrationData.qualityWarning && (
        <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-500/40 text-amber-200 text-xs flex items-start gap-2 font-mono">
          <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="text-[11px] leading-relaxed">{vibrationData.qualityWarning}</p>
        </div>
      )}

      {/* Primary Graphs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 5.1 Time-Domain Waveform */}
        <div className="bg-[#171A1D] p-3 rounded-xl border border-[#292D31]">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] font-mono text-[#737A82] uppercase tracking-wider font-semibold">
              5.1 Time-Domain Waveform ({vibrationData.selectedChannel || 'Channel 1'})
            </span>
            <span className="text-[9px] font-mono text-[#D66A32]">
              P-P: {vibrationData.peakToPeakG.toFixed(4)} units
            </span>
          </div>

          <svg className="w-full h-28" viewBox="0 0 300 80" preserveAspectRatio="none">
            {(() => {
              if (vibrationPoints.length < 2) return null;
              const values = vibrationPoints.map(p => p.a);
              const min = Math.min(...values);
              const max = Math.max(...values);
              const range = max - min || 1;
              const low = min - range * 0.05;
              const high = max + range * 0.05;
              const yFor = (val: number) => 75 - ((val - low) / (high - low)) * 65;
              const zeroY = low <= 0 && high >= 0 ? yFor(0) : yFor((min + max) / 2);

              const path = vibrationPoints.map((p, i) => {
                const x = (i / (vibrationPoints.length - 1)) * 300;
                return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${yFor(p.a).toFixed(1)}`;
              }).join(' ');

              return (
                <>
                  <line x1="0" y1={zeroY} x2="300" y2={zeroY} stroke="#41464D" strokeDasharray="3 3" />
                  <path d={path} fill="none" stroke="#D66A32" strokeWidth="1.5" />
                </>
              );
            })()}
          </svg>

          <div className="flex justify-between text-[9px] font-mono text-[#737A82] border-t border-[#292D31] pt-1">
            <span>{minVibTime.toFixed(4)} s</span>
            <span>Time</span>
            <span>{maxVibTime.toFixed(4)} s</span>
          </div>
        </div>

        {/* 5.2 FFT Frequency Spectrum */}
        <div className="bg-[#171A1D] p-3 rounded-xl border border-[#292D31]">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] font-mono text-[#737A82] uppercase tracking-wider font-semibold">
              5.2 Single-Sided FFT Spectrum (Frequency vs Amplitude)
            </span>
            <span className="text-[9px] font-mono text-[#D66A32]">
              Peak: {vibrationData.dominantOrderHz.toFixed(1)} Hz
            </span>
          </div>

          <svg className="w-full h-28" viewBox="0 0 300 80" preserveAspectRatio="none">
            <line x1="0" y1="75" x2="300" y2="75" stroke="#41464D" />
            {vibSpectrumPoints.map((point, index) => {
              const x = maxVibFrequency > 0 ? (point.freq / maxVibFrequency) * 290 + 5 : 5;
              const height = maxVibAmplitude > 0 ? (point.amp / maxVibAmplitude) * 68 : 0;
              const width = Math.max(0.5, Math.min(3, 280 / Math.max(1, vibSpectrumPoints.length)));

              return (
                <rect
                  key={`${point.freq}-${index}`}
                  x={x}
                  y={75 - height}
                  width={width}
                  height={Math.max(0.5, height)}
                  fill="#D66A32"
                >
                  <title>{`Freq: ${point.freq.toFixed(1)} Hz; Amp: ${point.amp.toFixed(6)}`}</title>
                </rect>
              );
            })}
          </svg>

          <div className="flex justify-between text-[9px] font-mono text-[#737A82] border-t border-[#292D31] pt-1">
            <span>0 Hz</span>
            <span>Frequency</span>
            <span>{maxVibFrequency.toFixed(0)} Hz</span>
          </div>
        </div>

        {/* 5.3 RMS Amplitude Comparison (Part 5.3) */}
        {channelMetrics.length > 0 && (
          <div className="bg-[#171A1D] p-3 rounded-xl border border-[#292D31]">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[10px] font-mono text-[#737A82] uppercase tracking-wider font-semibold">
                5.3 RMS Amplitude Comparison across Measured Channels
              </span>
              <span className="text-[9px] font-mono text-[#737A82]">
                Acceleration RMS (units)
              </span>
            </div>

            <div className="space-y-2 pt-1">
              {(() => {
                const maxRms = Math.max(1e-4, ...channelMetrics.map(c => c.rms));
                return channelMetrics.map((ch, idx) => {
                  const percent = Math.min(100, (ch.rms / maxRms) * 100);
                  const color = CHANNEL_COLORS[ch.name] || CHANNEL_COLORS.default;
                  const isCurrent = (vibrationData.selectedChannel || 'Channel 1') === ch.name;

                  return (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between text-[11px] font-mono">
                        <span className={`font-semibold ${isCurrent ? 'text-[#F1F2F3]' : 'text-[#A4A9AF]'}`}>
                          {ch.name} {isCurrent && <span className="text-[#D66A32] text-[9px] font-bold">• ACTIVE</span>}
                        </span>
                        <span className="font-bold text-[#F1F2F3]">
                          {ch.rms.toFixed(4)} <span className="text-[#737A82] text-[9px]">units</span>
                        </span>
                      </div>
                      <div className="w-full h-2 bg-[#0C0E10] rounded-full overflow-hidden border border-[#292D31]">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${percent}%`, backgroundColor: color }}
                        />
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        )}

        {/* 5.4 Channel Comparison (Part 5.4) */}
        {channelMetrics.length > 1 && (
          <div className="bg-[#171A1D] p-3 rounded-xl border border-[#292D31]">
            <div className="flex flex-wrap justify-between items-center gap-1 mb-2">
              <span className="text-[10px] font-mono text-[#737A82] uppercase tracking-wider font-semibold">
                5.4 Channel Waveform Comparison (Synchronized)
              </span>
              <div className="flex items-center gap-1 text-[9px] font-mono">
                <button
                  onClick={() => setActiveCompareChannel('ALL')}
                  className={`px-1.5 py-0.5 rounded cursor-pointer ${
                    activeCompareChannel === 'ALL'
                      ? 'bg-[#0C0E10] text-white border border-[#D66A32]'
                      : 'text-[#737A82] hover:text-[#F1F2F3]'
                  }`}
                >
                  All
                </button>
                {channelMetrics.map(c => (
                  <button
                    key={c.name}
                    onClick={() => setActiveCompareChannel(c.name)}
                    className={`px-1.5 py-0.5 rounded cursor-pointer ${
                      activeCompareChannel === c.name
                        ? 'bg-[#0C0E10] text-white border border-[#D66A32]'
                        : 'text-[#737A82] hover:text-[#F1F2F3]'
                    }`}
                  >
                    {c.name.replace('Channel ', 'Ch')}
                  </button>
                ))}
              </div>
            </div>

            <svg className="w-full h-28" viewBox="0 0 300 80" preserveAspectRatio="none">
              <line x1="0" y1="40" x2="300" y2="40" stroke="#292D31" strokeDasharray="3 3" />
              {(() => {
                const allPoints = channelMetrics.flatMap(c => c.timeSeries || []);
                if (allPoints.length < 2) return null;
                const maxVal = Math.max(1e-4, ...allPoints.map(p => Math.abs(p.a)));

                return channelMetrics.map(ch => {
                  if (activeCompareChannel !== 'ALL' && activeCompareChannel !== ch.name) return null;
                  const pts = ch.timeSeries || [];
                  if (pts.length < 2) return null;

                  const color = CHANNEL_COLORS[ch.name] || CHANNEL_COLORS.default;
                  const path = pts.map((p, i) => {
                    const x = (i / (pts.length - 1)) * 300;
                    const y = 40 - (p.a / maxVal) * 35;
                    return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
                  }).join(' ');

                  return (
                    <path
                      key={ch.name}
                      d={path}
                      fill="none"
                      stroke={color}
                      strokeWidth={activeCompareChannel === ch.name ? "1.8" : "1.2"}
                      opacity={activeCompareChannel === 'ALL' ? 0.8 : 1.0}
                    />
                  );
                });
              })()}
            </svg>

            <div className="flex flex-wrap justify-between items-center text-[9px] font-mono text-[#737A82] border-t border-[#292D31] pt-1">
              <span>0.00 s</span>
              <div className="flex gap-2">
                {channelMetrics.map(c => (
                  <span key={c.name} className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: CHANNEL_COLORS[c.name] }} />
                    <span>{c.name}</span>
                  </span>
                ))}
              </div>
              <span>{maxVibTime.toFixed(3)} s</span>
            </div>
          </div>
        )}

        {/* 5.5 STFT Spectrogram (Part 5.5) */}
        {vibSpectrogram && vibSpectrogram.matrix.length > 0 && (
          <div className="bg-[#171A1D] p-3 rounded-xl border border-[#292D31] md:col-span-2">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[10px] font-mono text-[#737A82] uppercase tracking-wider font-semibold">
                5.5 Vibration STFT Spectrogram (Uniformly Resampled Time-Frequency Heatmap)
              </span>
              <span className="text-[9px] font-mono text-[#737A82]">
                Resampled Uniform Grid
              </span>
            </div>

            {(() => {
              const vibMaxMag = (vibSpectrogram.maxMagnitude && vibSpectrogram.maxMagnitude > 0)
                ? vibSpectrogram.maxMagnitude
                : Math.max(1e-6, ...vibSpectrogram.matrix.flatMap(r => r));

              return (
                <svg
                  className="w-full h-32"
                  viewBox={`0 0 ${vibSpectrogram.matrix.length * 8} 100`}
                  preserveAspectRatio="none"
                >
                  {vibSpectrogram.matrix.map((frame, frameIndex) =>
                    frame.map((mag, binIndex) => {
                      const normalized = vibMaxMag > 0 ? Math.min(1, Math.max(0, mag / vibMaxMag)) : 0;
                      const scaled = Math.pow(normalized, 0.4);
                      const opacity = Math.max(0.04, Math.min(1, scaled));
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
                          <title>{`Time: ${vibSpectrogram.times[frameIndex]}s; Freq: ${vibSpectrogram.frequencies[binIndex]} Hz; Mag: ${mag.toFixed(5)} units`}</title>
                        </rect>
                      );
                    })
                  )}
                </svg>
              );
            })()}

            <div className="flex justify-between text-[9px] font-mono text-[#737A82] border-t border-[#292D31] pt-1">
              <span>{minVibTime.toFixed(4)} s</span>
              <span>Time</span>
              <span>{maxVibTime.toFixed(4)} s</span>
            </div>

            <div className="text-[9px] font-mono text-[#737A82] mt-1">
              Frequency range: 0 Hz to {(vibrationData.samplingRateHz / 2).toFixed(0)} Hz (Nyquist limit).
            </div>
          </div>
        )}
      </div>

      {/* Metrics Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] font-mono text-[#737A82]">
        <div className="bg-[#171A1D] rounded p-2.5 border border-[#292D31]">
          RMS Acceleration:{' '}
          <strong className="text-[#D66A32] block text-xs mt-0.5">
            {vibrationData.rmsAccelerationG.toFixed(4)} units
          </strong>
        </div>
        <div className="bg-[#171A1D] rounded p-2.5 border border-[#292D31]">
          Peak-to-Peak:{' '}
          <strong className="text-[#F1F2F3] block text-xs mt-0.5">
            {vibrationData.peakToPeakG.toFixed(4)} units
          </strong>
        </div>
        <div className="bg-[#171A1D] rounded p-2.5 border border-[#292D31]">
          Dominant Frequency:{' '}
          <strong className="text-[#D66A32] block text-xs mt-0.5">
            {vibrationData.dominantOrderHz.toFixed(1)} Hz
          </strong>
        </div>
        <div className="bg-[#171A1D] rounded p-2.5 border border-[#292D31]">
          Crest Factor:{' '}
          <strong className="text-[#F1F2F3] block text-xs mt-0.5">
            {vibrationData.crestFactor.toFixed(3)}
          </strong>
        </div>
      </div>
    </div>
  );
};
