import React from 'react';
import { Waves } from 'lucide-react';
import { AudioEngineData } from '../../types/diagnosis';

interface AudioSignalAnalysisSectionProps {
  audioData: AudioEngineData | null;
  error?: string | null;
}

export const AudioSignalAnalysisSection: React.FC<AudioSignalAnalysisSectionProps> = ({
  audioData,
  error
}) => {
  if (error) {
    return (
      <div className="bg-[#101214] border border-[#292D31] rounded-2xl p-5 space-y-3 font-sans shadow-xl">
        <div className="flex items-center gap-2 border-b border-[#292D31] pb-3">
          <Waves className="w-4 h-4 text-[#D66A32]" />
          <h3 className="text-sm font-bold text-[#F1F2F3] font-mono uppercase tracking-wider">
            5. Audio Signal Analysis
          </h3>
        </div>
        <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/40 text-xs font-mono text-red-200">
          Audio processing failed: {error}
        </div>
      </div>
    );
  }

  if (!audioData || audioData.durationSeconds <= 0) {
    return (
      <div className="bg-[#101214] border border-[#292D31] rounded-2xl p-5 space-y-3 font-sans shadow-xl">
        <div className="flex items-center gap-2 border-b border-[#292D31] pb-3">
          <Waves className="w-4 h-4 text-[#D66A32]" />
          <h3 className="text-sm font-bold text-[#F1F2F3] font-mono uppercase tracking-wider">
            5. Audio Signal Analysis
          </h3>
        </div>
        <div className="p-4 rounded-xl bg-[#171A1D]/60 border border-[#292D31] text-xs font-mono text-[#737A82] text-center">
          Audio analysis unavailable — no recording provided.
        </div>
      </div>
    );
  }

  const audioPoints = audioData.timeSeries || [];
  const audioSpectralPoints = audioData.spectralPoints || [];
  const minAudioFreq = audioSpectralPoints.length > 0 ? audioSpectralPoints[0].freq : 0;
  const maxAudioFreq = audioSpectralPoints.length > 0 ? audioSpectralPoints[audioSpectralPoints.length - 1].freq : (audioData.sampleRate / 2 || 22050);
  const audioSpectrogram = audioData.spectrogram;

  return (
    <div className="bg-[#101214] border border-[#292D31] rounded-2xl p-5 space-y-4 font-sans shadow-xl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#292D31] pb-3">
        <div className="flex items-center gap-2.5">
          <Waves className="w-4 h-4 text-[#D66A32]" />
          <div>
            <h3 className="text-sm font-bold text-[#F1F2F3] font-mono uppercase tracking-wider">
              5. Audio Signal Analysis &amp; Spectral Harmonics
            </h3>
            <p className="text-[10px] text-[#737A82] font-mono mt-0.5">
              Recording: <span className="text-[#F1F2F3] font-semibold">{audioData.fileName || 'acoustic_capture.wav'}</span> •{' '}
              Duration: {audioData.durationSeconds.toFixed(2)}s • Sample Rate: {audioData.sampleRate} Hz
            </p>
          </div>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#171A1D] border border-[#292D31] text-[#A4A9AF]">
          {audioData.channelMode || (audioData.channelCount && audioData.channelCount > 1 ? `${audioData.channelCount} Channels` : 'Mono')}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 4.1 Waveform */}
        <div className="bg-[#171A1D] p-3 rounded-xl border border-[#292D31]">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] font-mono text-[#737A82] uppercase tracking-wider font-semibold">
              4.1 Acoustic Waveform (Time in Seconds vs Amplitude)
            </span>
            <span className="text-[9px] font-mono text-[#D66A32]">
              Peak: {audioData.peakDb.toFixed(1)} dBFS
            </span>
          </div>

          <svg className="w-full h-28" viewBox="0 0 300 80" preserveAspectRatio="none">
            <line x1="0" y1="40" x2="300" y2="40" stroke="#292D31" strokeDasharray="3 3" />
            {(() => {
              if (audioPoints.length < 2) return null;
              const values = audioPoints.map(p => p.a);
              const maxAbs = Math.max(1e-4, ...values.map(Math.abs));
              const path = audioPoints.map((p, i) => {
                const x = (i / (audioPoints.length - 1)) * 300;
                const y = 40 - (p.a / maxAbs) * 35;
                return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
              }).join(' ');
              return <path d={path} fill="none" stroke="#D66A32" strokeWidth="1.5" />;
            })()}
          </svg>

          <div className="flex justify-between text-[9px] font-mono text-[#737A82] border-t border-[#292D31] pt-1">
            <span>0.00 s</span>
            <span>Time</span>
            <span>{audioData.durationSeconds.toFixed(2)} s</span>
          </div>
        </div>

        {/* 4.2 FFT Frequency Spectrum */}
        <div className="bg-[#171A1D] p-3 rounded-xl border border-[#292D31]">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] font-mono text-[#737A82] uppercase tracking-wider font-semibold">
              4.2 FFT Frequency Spectrum (Frequency in Hz vs Magnitude)
            </span>
            <span className="text-[9px] font-mono text-[#D66A32]">
              Peak: {audioData.dominantHarmonicHz.toFixed(1)} Hz
            </span>
          </div>

          <svg className="w-full h-28" viewBox="0 0 300 80" preserveAspectRatio="none">
            <line x1="0" y1="75" x2="300" y2="75" stroke="#292D31" />
            {(() => {
              if (audioSpectralPoints.length < 2) return null;
              const maxMag = Math.max(1e-6, ...audioSpectralPoints.map(p => p.magnitude));
              const range = maxAudioFreq - minAudioFreq || 1;
              const path = audioSpectralPoints.map((p, i) => {
                const x = ((p.freq - minAudioFreq) / range) * 300;
                const y = 75 - (p.magnitude / maxMag) * 70;
                return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
              }).join(' ');
              return <path d={path} fill="none" stroke="#D66A32" strokeWidth="1.5" />;
            })()}
          </svg>

          <div className="flex justify-between text-[9px] font-mono text-[#737A82] border-t border-[#292D31] pt-1">
            <span>{minAudioFreq.toFixed(0)} Hz</span>
            <span>Frequency</span>
            <span>{maxAudioFreq.toFixed(0)} Hz</span>
          </div>
        </div>

        {/* 4.3 STFT Spectrogram */}
        {audioSpectrogram && audioSpectrogram.matrix.length > 0 && (
          <div className="bg-[#171A1D] p-3 rounded-xl border border-[#292D31] md:col-span-2">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[10px] font-mono text-[#737A82] uppercase tracking-wider font-semibold">
                4.3 Short-Time Fourier Transform (STFT) Spectrogram
              </span>
              <span className="text-[9px] font-mono text-[#737A82]">
                Time-Frequency Harmonic Energy Heatmap
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
                      const normalized = audioMaxMag > 0 ? Math.min(1, Math.max(0, mag / audioMaxMag)) : 0;
                      const scaled = Math.pow(normalized, 0.45);
                      const opacity = Math.max(0.04, Math.min(1, scaled));
                      const cellHeight = 100 / Math.max(1, frame.length);

                      return (
                        <rect
                          key={`aud-stft-${frameIdx}-${binIdx}`}
                          x={frameIdx * 8}
                          y={100 - (binIdx + 1) * cellHeight}
                          width="8.2"
                          height={cellHeight + 0.2}
                          fill="#D66A32"
                          opacity={opacity}
                        >
                          <title>
                            {`Time: ${audioSpectrogram.times[frameIdx]}s; Freq: ${audioSpectrogram.frequencies[binIdx]} Hz; Mag: ${mag.toFixed(5)}`}
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
        <div className="bg-[#171A1D] rounded p-2.5 border border-[#292D31]">
          Dominant Harmonic:{' '}
          <strong className="text-[#D66A32] block text-xs mt-0.5">
            {audioData.dominantHarmonicHz.toFixed(1)} Hz
          </strong>
        </div>
        <div className="bg-[#171A1D] rounded p-2.5 border border-[#292D31]">
          Peak Level:{' '}
          <strong className="text-[#F1F2F3] block text-xs mt-0.5">
            {audioData.peakDb.toFixed(1)} dBFS
          </strong>
        </div>
        <div className="bg-[#171A1D] rounded p-2.5 border border-[#292D31]">
          Sampling Rate:{' '}
          <strong className="text-[#F1F2F3] block text-xs mt-0.5">
            {audioData.sampleRate} Hz
          </strong>
        </div>
        <div className="bg-[#171A1D] rounded p-2.5 border border-[#292D31]">
          RMS Level:{' '}
          <strong className="text-[#A4A9AF] block text-xs mt-0.5">
            {audioData.rmsLevel !== undefined ? `${audioData.rmsLevel.toFixed(4)}` : '—'}
          </strong>
        </div>
      </div>
    </div>
  );
};
