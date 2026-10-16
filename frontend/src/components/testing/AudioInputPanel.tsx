import React, { useRef, useState } from 'react';
import { UploadCloud, Square, Music, Volume2 } from 'lucide-react';
import { AudioEngineData, PresetScenario } from '../../types/diagnosis';
import { AUDIO_PRESETS } from '../../lib/diagnosticEngine';
import { analyzeAudioFile } from '../../lib/signalProcessing';

interface AudioInputPanelProps {
  data: AudioEngineData;
  onChange: (data: AudioEngineData) => void;
  onSelectPreset: (preset: PresetScenario<AudioEngineData>) => void;
  activePresetId: string | null;
}

export const AudioInputPanel: React.FC<AudioInputPanelProps> = ({
  data,
  onChange,
  onSelectPreset,
  activePresetId
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const activeSourceRef = useRef<AudioBufferSourceNode | OscillatorNode | null>(null);

  // Stop currently active playback
  const stopPlayback = () => {
    if (activeSourceRef.current) {
      try {
        activeSourceRef.current.stop();
      } catch {}
      activeSourceRef.current = null;
    }
    setIsPlaying(false);
  };

  // Play real decoded audio buffer or synthetic representative profile
  const handleToggleAudio = () => {
    if (isPlaying) {
      stopPlayback();
      return;
    }

    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = audioContextRef.current || new AudioCtx();
      audioContextRef.current = ctx;

      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      if (data.audioBuffer) {
        const source = ctx.createBufferSource();
        source.buffer = data.audioBuffer;
        source.connect(ctx.destination);
        source.onended = () => setIsPlaying(false);
        source.start(0);
        activeSourceRef.current = source;
        setIsPlaying(true);
      } else {
        // Preset audition tone matching calculated dominant harmonic
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        const baseFreq = data.dominantHarmonicHz > 0 ? Math.min(2000, Math.max(50, data.dominantHarmonicHz)) : 125;
        osc.type = data.dominantHarmonicHz > 1500 ? 'sawtooth' : 'triangle';
        osc.frequency.setValueAtTime(baseFreq, ctx.currentTime);

        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start();
        activeSourceRef.current = osc;
        setIsPlaying(true);

        setTimeout(() => {
          if (activeSourceRef.current === osc) {
            try {
              osc.stop();
            } catch {}
            setIsPlaying(false);
          }
        }, Math.min(4000, (data.durationSeconds || 3.5) * 1000));
      }
    } catch (e) {
      console.warn('Audio playback error', e);
      setIsPlaying(false);
    }
  };

  // Handle local audio file upload using shared truthful DSP analyzer
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    stopPlayback();

    try {
      const analyzed = await analyzeAudioFile(file);
      onChange(analyzed);
    } catch (err) {
      console.error('Failed to parse audio file', err);
      alert('Unable to decode audio recording. Please ensure it is a valid audio file (WAV, MP3, OGG, M4A, FLAC).');
    }
  };

  return (
    <div className="space-y-5 font-sans">
      {/* Preset Selector */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-[11px] font-mono uppercase tracking-wider text-[#A4A9AF]">
            Acoustic Test Recordings
          </label>
          <span className="text-[10px] text-[#737A82] font-mono">Calibrated Audio Profiles</span>
        </div>
        <div className="grid grid-cols-1 gap-1.5">
          {AUDIO_PRESETS.map((preset) => {
            const isSelected = activePresetId === preset.id;
            return (
              <button
                key={preset.id}
                onClick={() => {
                  stopPlayback();
                  onSelectPreset(preset);
                }}
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
                      LOADED
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

      {/* Audio File Upload Box */}
      <div>
        <label className="text-[11px] font-mono uppercase tracking-wider text-[#A4A9AF] block mb-2">
          Audio Ingestion (.wav, .mp3, .ogg, .m4a, .flac)
        </label>
        <input
          ref={fileInputRef}
          type="file"
          accept=".wav,.mp3,.ogg,.m4a,.aac,.flac,audio/*"
          className="hidden"
          onChange={handleFileUpload}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-full p-4 rounded-lg bg-[#101214] border border-dashed border-[#292D31] hover:border-[#D66A32]/60 hover:bg-[#171A1D] transition flex flex-col items-center justify-center gap-2 group cursor-pointer"
        >
          <UploadCloud className="w-5 h-5 text-[#737A82] group-hover:text-[#D66A32] transition" />
          <div className="text-center">
            <span className="text-xs text-[#F1F2F3] font-medium block">
              Upload Engine Acoustic Recording
            </span>
            <span className="text-[10px] text-[#737A82] font-mono mt-0.5 block">
              Web Audio API decoded FFT spectrum, STFT & dynamic range
            </span>
          </div>
        </button>
      </div>

      {/* Loaded Audio Profile Card & Player */}
      <div className="bg-[#101214] p-3.5 rounded-lg border border-[#292D31] space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <Music className="w-4 h-4 text-[#D66A32] flex-shrink-0" />
            <div className="min-w-0">
              <span className="text-xs font-semibold text-[#F1F2F3] block truncate">
                {data.fileName}
              </span>
              <span className="text-[10px] font-mono text-[#737A82]">
                {data.sampleRate} Hz • {data.durationSeconds.toFixed(2)}s • {data.channelMode || (data.channelCount && data.channelCount > 1 ? `${data.channelCount} ch` : 'Mono')}
              </span>
            </div>
          </div>
          <button
            onClick={handleToggleAudio}
            className={`px-3 py-1.5 rounded text-xs font-mono flex items-center gap-1.5 transition cursor-pointer ${
              isPlaying
                ? 'bg-[#D66A32] text-white shadow-sm'
                : 'bg-[#171A1D] hover:bg-[#292D31] text-[#F1F2F3] border border-[#292D31]'
            }`}
          >
            {isPlaying ? (
              <>
                <Square className="w-3 h-3 fill-current" /> Stop
              </>
            ) : (
              <>
                <Volume2 className="w-3 h-3" /> Audition
              </>
            )}
          </button>
        </div>

        {/* Acoustic Summary Parameters */}
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#292D31]">
          <div className="bg-[#171A1D] p-2 rounded border border-[#292D31]">
            <span className="text-[10px] font-mono text-[#737A82] uppercase block">Dominant Harmonic</span>
            <span className="text-xs font-mono font-bold text-[#D66A32] mt-0.5 block">
              {data.dominantHarmonicHz.toFixed(1)} Hz
            </span>
          </div>
          <div className="bg-[#171A1D] p-2 rounded border border-[#292D31]">
            <span className="text-[10px] font-mono text-[#737A82] uppercase block">Peak Level</span>
            <span className="text-xs font-mono font-medium text-[#F1F2F3] mt-0.5 block">
              {data.peakDb.toFixed(1)} dBFS
            </span>
          </div>
          {data.rmsLevel !== undefined && (
            <div className="bg-[#171A1D] p-2 rounded border border-[#292D31]">
              <span className="text-[10px] font-mono text-[#737A82] uppercase block">RMS Level</span>
              <span className="text-xs font-mono font-medium text-[#F1F2F3] mt-0.5 block">
                {data.rmsLevel.toFixed(4)}
              </span>
            </div>
          )}
          {data.channelMode && (
            <div className="bg-[#171A1D] p-2 rounded border border-[#292D31]">
              <span className="text-[10px] font-mono text-[#737A82] uppercase block">Channel Mode</span>
              <span className="text-xs font-mono font-medium text-[#A4A9AF] mt-0.5 block truncate">
                {data.channelMode}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
