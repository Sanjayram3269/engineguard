import React, { useRef } from 'react';
import { Activity, FileSpreadsheet, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { VibrationEngineData, PresetScenario } from '../../types/diagnosis';
import { VIBRATION_PRESETS } from '../../lib/diagnosticEngine';
import { parseVibrationCsv } from '../../lib/signalProcessing';

interface VibrationInputPanelProps {
  data: VibrationEngineData;
  onChange: (data: VibrationEngineData) => void;
  onSelectPreset: (preset: PresetScenario<VibrationEngineData>) => void;
  activePresetId: string | null;
}

export const VibrationInputPanel: React.FC<VibrationInputPanelProps> = ({
  data,
  onChange,
  onSelectPreset,
  activePresetId
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsedResult = parseVibrationCsv(text, file.name);

      if (!parsedResult.success || !parsedResult.data) {
        alert(parsedResult.error || 'Unable to parse vibration CSV file.');
        return;
      }

      onChange(parsedResult.data);
    } catch (err) {
      console.error('Failed to parse CSV', err);
      alert('Error parsing CSV file. Please ensure it is a valid numeric CSV.');
    }
  };

  const handleChannelSelect = (channelName: string) => {
    if (channelName === data.selectedChannel) return;

    // If raw CSV is stored, re-parse with the newly selected channel
    if (data.rawCsvText) {
      const parsed = parseVibrationCsv(data.rawCsvText, data.sampleName, channelName);
      if (parsed.success && parsed.data) {
        onChange(parsed.data);
        return;
      }
    }

    // Otherwise update the selected channel directly
    onChange({
      ...data,
      selectedChannel: channelName,
    });
  };

  return (
    <div className="space-y-5 font-sans">
      {/* Preset Selector */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-[11px] font-mono uppercase tracking-wider text-[#A4A9AF]">
            Calibrated Accelerometer Profiles
          </label>
          <span className="text-[10px] text-[#737A82] font-mono">Reference Benchmarks</span>
        </div>
        <div className="grid grid-cols-1 gap-1.5">
          {VIBRATION_PRESETS.map((preset) => {
            const isSelected = activePresetId === preset.id;
            return (
              <button
                key={preset.id}
                onClick={() => onSelectPreset(preset)}
                className={`text-left p-2.5 rounded-lg border text-xs transition ${
                  isSelected
                    ? 'bg-[#171A1D] border-[#D66A32] text-[#F1F2F3]'
                    : 'bg-[#101214] border-[#292D31] text-[#A4A9AF] hover:border-[#737A82]/50 hover:text-[#F1F2F3]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs tracking-tight">{preset.title}</span>
                  {isSelected && (
                    <span className="text-[10px] font-mono text-[#D66A32] bg-[#D66A32]/10 px-1.5 py-0.5 rounded border border-[#D66A32]/25">
                      ACTIVE
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-[#737A82] mt-1 line-clamp-1">
                  {preset.shortDescription}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      <div className="h-[1px] bg-[#292D31]" />

      {/* CSV File Upload Box */}
      <div>
        <label className="text-[11px] font-mono uppercase tracking-wider text-[#A4A9AF] block mb-2">
          Time-Series Vibration Upload (.csv)
        </label>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv,text/plain"
          className="hidden"
          onChange={handleCsvUpload}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-full p-4 rounded-lg bg-[#101214] border border-dashed border-[#292D31] hover:border-[#D66A32]/60 hover:bg-[#171A1D] transition flex flex-col items-center justify-center gap-2 group"
        >
          <FileSpreadsheet className="w-5 h-5 text-[#737A82] group-hover:text-[#D66A32] transition" />
          <div className="text-center">
            <span className="text-xs text-[#F1F2F3] font-medium block">
              Load Accelerometer Raw CSV
            </span>
            <span className="text-[10px] text-[#737A82] font-mono mt-0.5 block">
              Computes FFT, STFT Spectrogram, RMS & Dominant Frequency
            </span>
          </div>
        </button>
      </div>

      {/* Quality / Sampling Warning Banner */}
      {data.qualityWarning && (
        <div className="p-2.5 rounded-lg bg-amber-950/40 border border-amber-500/40 text-amber-200 text-xs flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="text-[11px] leading-relaxed font-mono">{data.qualityWarning}</p>
        </div>
      )}

      {/* Channel Selection (Channels 1-4) */}
      {data.availableChannels && data.availableChannels.length > 0 && (
        <div className="bg-[#101214] p-3 rounded-lg border border-[#292D31] space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-mono uppercase tracking-wider text-[#A4A9AF]">
              Measured Channel Selector
            </label>
            <span className="text-[10px] font-mono text-[#D66A32] bg-[#D66A32]/10 px-2 py-0.5 rounded border border-[#D66A32]/30">
              Active: {data.selectedChannel || data.availableChannels[0]}
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            {data.availableChannels.map((ch) => {
              const isActive = (data.selectedChannel || data.availableChannels![0]) === ch;
              return (
                <button
                  key={ch}
                  onClick={() => handleChannelSelect(ch)}
                  className={`py-1.5 px-2 rounded text-center text-xs font-mono transition cursor-pointer ${
                    isActive
                      ? 'bg-[#D66A32] text-white font-bold shadow'
                      : 'bg-[#171A1D] border border-[#292D31] text-[#A4A9AF] hover:text-[#F1F2F3] hover:border-[#737A82]'
                  }`}
                >
                  {ch}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Current Vibration Telemetry Summary */}
      <div className="bg-[#101214] p-3.5 rounded-lg border border-[#292D31] space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <Activity className="w-4 h-4 text-[#D66A32] flex-shrink-0" />
            <div className="min-w-0">
              <span className="text-xs font-semibold text-[#F1F2F3] block truncate">
                {data.sampleName}
              </span>
              <span className="text-[10px] font-mono text-[#737A82]">
                {data.samplingRateHz.toFixed(1)} Hz Sampling • {data.selectedChannel || 'Channel 1'}
              </span>
            </div>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#171A1D] border border-[#292D31] text-[#A4A9AF] flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            <span>Verified DSP</span>
          </span>
        </div>

        {/* Vibration Metrics Grid - Truthful Units */}
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#292D31]">
          <div className="bg-[#171A1D] p-2 rounded border border-[#292D31]">
            <span className="text-[10px] font-mono text-[#737A82] uppercase block">RMS Amplitude</span>
            <span className="text-xs font-mono font-bold mt-0.5 block text-[#F1F2F3]">
              {data.rmsAccelerationG.toFixed(4)} <span className="text-[10px] text-[#737A82] font-normal">units</span>
            </span>
          </div>
          <div className="bg-[#171A1D] p-2 rounded border border-[#292D31]">
            <span className="text-[10px] font-mono text-[#737A82] uppercase block">Peak-to-Peak</span>
            <span className="text-xs font-mono font-medium text-[#F1F2F3] mt-0.5 block">
              {data.peakToPeakG.toFixed(4)} <span className="text-[10px] text-[#737A82] font-normal">units</span>
            </span>
          </div>
          <div className="bg-[#171A1D] p-2 rounded border border-[#292D31]">
            <span className="text-[10px] font-mono text-[#737A82] uppercase block">Dominant Frequency</span>
            <span className="text-xs font-mono font-medium text-[#D66A32] mt-0.5 block">
              {data.dominantOrderHz.toFixed(1)} Hz
            </span>
          </div>
          <div className="bg-[#171A1D] p-2 rounded border border-[#292D31]">
            <span className="text-[10px] font-mono text-[#737A82] uppercase block">Crest Factor</span>
            <span className="text-xs font-mono font-medium text-[#F1F2F3] mt-0.5 block">
              {data.crestFactor.toFixed(3)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
