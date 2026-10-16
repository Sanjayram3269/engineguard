import React from 'react';
import { BarChart3, Activity, Waves } from 'lucide-react';
import { InputModality, TabularEngineData, AudioEngineData, VibrationEngineData } from '../../types/diagnosis';

interface DiagnosticChartsProps {
  modality: InputModality;
  tabularData: TabularEngineData;
  audioData: AudioEngineData;
  vibrationData: VibrationEngineData;
}

export const DiagnosticCharts: React.FC<DiagnosticChartsProps> = ({
  modality,
  tabularData,
  audioData,
  vibrationData
}) => {
  return (
    <div className="bg-[#101214] border border-[#292D31] rounded-xl p-5 font-sans space-y-4">
      <div className="flex items-center justify-between border-b border-[#292D31] pb-3">
        <div className="flex items-center gap-2">
          {modality === 'tabular' && <BarChart3 className="w-4 h-4 text-[#D66A32]" />}
          {modality === 'audio' && <Waves className="w-4 h-4 text-[#D66A32]" />}
          {modality === 'vibration' && <Activity className="w-4 h-4 text-[#D66A32]" />}
          <h4 className="text-xs font-mono uppercase tracking-wider text-[#F1F2F3] font-semibold">
            {modality === 'tabular' && 'Thermodynamic & Kinematic Variance vs Calibration Baseline'}
            {modality === 'audio' && 'Acoustic FFT Power Spectral Density (50 Hz – 4 kHz)'}
            {modality === 'vibration' && 'Tri-Axial Dynamic Accelerometer Waveform & Harmonics'}
          </h4>
        </div>
        <span className="text-[10px] font-mono text-[#737A82]">
          Calibrated Signal View (Simulated Chart)
        </span>
      </div>

      {/* 1. TABULAR CHART: Sensor Deviation Relative to Nominal */}
      {modality === 'tabular' && (
        <div className="space-y-3">
          {[
            {
              name: 'Engine Reactive Force',
              unit: 'N',
              current: tabularData.Force,
              min: 0,
              nominalMax: 300,
              max: 1500,
              isHighCritical: tabularData.Force > 350
            },
            {
              name: 'Manifold Pressure (MAP)',
              unit: 'bar/V',
              current: tabularData.MAP,
              min: 0.4,
              nominalMax: 2.5,
              max: 4.6,
              isHighCritical: tabularData.MAP > 3.0
            },
            {
              name: 'Carbon Monoxide (CO)',
              unit: '%',
              current: tabularData.CO,
              min: 0.4,
              nominalMax: 2.2,
              max: 10.0,
              isHighCritical: tabularData.CO > 2.5
            },
            {
              name: 'Air-Fuel Ratio (AFR)',
              unit: '',
              current: tabularData.AFR,
              min: 10.0,
              nominalMax: 15.0,
              max: 17.0,
              isHighCritical: tabularData.AFR < 13.5 || tabularData.AFR > 15.8
            }
          ].map((bar, idx) => {
            const pct = Math.min(100, Math.max(0, ((bar.current - bar.min) / (bar.max - bar.min)) * 100));
            const isAlert = Boolean(bar.isHighCritical);

            return (
              <div key={idx} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-[#A4A9AF] text-[11px] font-medium">{bar.name}</span>
                  <span className={`font-mono text-[11px] font-medium ${isAlert ? 'text-[#D66A32]' : 'text-[#F1F2F3]'}`}>
                    {bar.current.toFixed(1)} {bar.unit}
                  </span>
                </div>
                <div className="relative w-full h-2 bg-[#171A1D] rounded overflow-hidden border border-[#292D31]">
                  {/* Nominal safe zone shading */}
                  <div
                    className="absolute top-0 bottom-0 bg-[#292D31]/50"
                    style={{ left: '20%', width: '45%' }}
                  />
                  {/* Current bar indicator */}
                  <div
                    className={`h-full rounded transition-all duration-300 ${
                      isAlert ? 'bg-[#D66A32]' : 'bg-[#A4A9AF]'
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
          <div className="flex items-center justify-between text-[10px] font-mono text-[#737A82] pt-2 border-t border-[#292D31]">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-1.5 bg-[#292D31] rounded-sm inline-block" /> Nominal Safe Operating Zone
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-1.5 bg-[#D66A32] rounded-sm inline-block" /> Exceeded Threshold
            </span>
          </div>
        </div>
      )}

      {/* 2. AUDIO CHART: FFT Spectrum Line Chart */}
      {modality === 'audio' && (
        <div className="space-y-2">
          <div className="relative w-full h-44 bg-[#171A1D] rounded-lg border border-[#292D31] p-2 flex flex-col justify-end">
            {/* SVG Frequency Plot */}
            <svg className="w-full h-36 overflow-visible" viewBox="0 0 500 120" preserveAspectRatio="none">
              {/* Horizontal Grid lines */}
              <line x1="0" y1="30" x2="500" y2="30" stroke="#292D31" strokeWidth="1" strokeDasharray="3 3" />
              <line x1="0" y1="60" x2="500" y2="60" stroke="#292D31" strokeWidth="1" strokeDasharray="3 3" />
              <line x1="0" y1="90" x2="500" y2="90" stroke="#292D31" strokeWidth="1" strokeDasharray="3 3" />

              {/* Spectral Path */}
              {(() => {
                const pts = audioData.spectralPoints || [];
                if (pts.length === 0) return null;
                const pathStr = pts
                  .map((p, i) => {
                    const x = (i / (pts.length - 1)) * 500;
                    // magnitude from -60 to -5 => y from 115 down to 10
                    const normMag = Math.max(0, Math.min(1, (p.magnitude + 60) / 55));
                    const y = 115 - normMag * 105;
                    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                  })
                  .join(' ');

                return (
                  <>
                    <path
                      d={`${pathStr} L 500 120 L 0 120 Z`}
                      fill="url(#audioGradient)"
                      opacity="0.25"
                    />
                    <path
                      d={pathStr}
                      fill="none"
                      stroke="#D66A32"
                      strokeWidth="1.75"
                    />
                    <defs>
                      <linearGradient id="audioGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#D66A32" />
                        <stop offset="100%" stopColor="#171A1D" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                  </>
                );
              })()}
            </svg>

            {/* X-Axis Freq labels */}
            <div className="flex justify-between text-[9px] font-mono text-[#737A82] pt-1 border-t border-[#292D31]">
              <span>50 Hz</span>
              <span>500 Hz</span>
              <span>1.0 kHz</span>
              <span>2.0 kHz</span>
              <span>3.0 kHz</span>
              <span>4.0 kHz</span>
            </div>
          </div>
          <div className="flex items-center justify-between text-[10px] font-mono text-[#737A82]">
            <span>Dominant Peak: <strong className="text-[#D66A32]">{audioData.dominantHarmonicHz} Hz</strong></span>
            <span>Dynamic Level: <strong className="text-[#F1F2F3]">{audioData.peakDb} dBFS</strong></span>
          </div>
        </div>
      )}

      {/* 3. VIBRATION CHART: Time-Series & FFT Orders */}
      {modality === 'vibration' && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Time-Domain Waveform */}
            <div className="bg-[#171A1D] p-2.5 rounded-lg border border-[#292D31]">
              <span className="text-[10px] font-mono text-[#737A82] uppercase block mb-1">
                Time-Domain Acceleration (G)
              </span>
              <svg className="w-full h-28 overflow-visible" viewBox="0 0 300 80" preserveAspectRatio="none">
                <line x1="0" y1="40" x2="300" y2="40" stroke="#292D31" strokeWidth="1" />
                {(() => {
                  const pts = vibrationData.timeSeries || [];
                  if (pts.length === 0) return null;
                  const pathStr = pts
                    .map((p, i) => {
                      const x = (i / (pts.length - 1)) * 300;
                      // a from -6 to +6 => y from 80 down to 0
                      const y = 40 - (p.a / 6) * 35;
                      return `${i === 0 ? 'M' : 'L'} ${x} ${Math.max(5, Math.min(75, y))}`;
                    })
                    .join(' ');
                  return <path d={pathStr} fill="none" stroke="#D66A32" strokeWidth="1.5" />;
                })()}
              </svg>
              <div className="flex justify-between text-[9px] font-mono text-[#737A82] mt-1 border-t border-[#292D31] pt-0.5">
                <span>0.00 s</span>
                <span>0.10 s</span>
                <span>0.20 s</span>
              </div>
            </div>

            {/* FFT Harmonic Orders */}
            <div className="bg-[#171A1D] p-2.5 rounded-lg border border-[#292D31]">
              <span className="text-[10px] font-mono text-[#737A82] uppercase block mb-1">
                Harmonic Order Spectrum (Hz)
              </span>
              <svg className="w-full h-28 overflow-visible" viewBox="0 0 300 80" preserveAspectRatio="none">
                <line x1="0" y1="75" x2="300" y2="75" stroke="#292D31" strokeWidth="1" />
                {(() => {
                  const pts = vibrationData.fftSpectrum || [];
                  if (pts.length === 0) return null;
                  return pts.map((p, i) => {
                    const x = (i / (pts.length - 1)) * 280 + 10;
                    const h = Math.min(70, p.amp * 13);
                    const y = 75 - h;
                    const isPeak = p.amp > 2.5;
                    return (
                      <rect
                        key={i}
                        x={x}
                        y={y}
                        width="4"
                        height={h}
                        fill={isPeak ? '#D66A32' : '#737A82'}
                        rx="1"
                      />
                    );
                  });
                })()}
              </svg>
              <div className="flex justify-between text-[9px] font-mono text-[#737A82] mt-1 border-t border-[#292D31] pt-0.5">
                <span>10 Hz</span>
                <span>1X (42Hz)</span>
                <span>2X (83Hz)</span>
                <span>350 Hz</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between text-[10px] font-mono text-[#737A82]">
            <span>RMS Acceleration: <strong className="text-[#D66A32]">{vibrationData.rmsAccelerationG.toFixed(2)} G</strong></span>
            <span>Peak-to-Peak: <strong className="text-[#F1F2F3]">{vibrationData.peakToPeakG.toFixed(1)} G</strong></span>
            <span>Crest Factor: <strong className="text-[#F1F2F3]">{vibrationData.crestFactor.toFixed(2)}</strong></span>
          </div>
        </div>
      )}
    </div>
  );
};
