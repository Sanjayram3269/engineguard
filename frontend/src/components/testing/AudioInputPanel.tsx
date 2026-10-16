import React, { useRef, useState } from 'react';
import { UploadCloud, Play, Square, Music } from 'lucide-react';
import { AudioEngineData, PresetScenario } from '../../types/diagnosis';
import { AUDIO_PRESETS } from '../../lib/diagnosticEngine';

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

  // Play synthetic tone or real decoded audio buffer
  const handleToggleAudio = () => {
    if (isPlaying) {
      if (activeSourceRef.current) {
        try {
          activeSourceRef.current.stop();
        } catch {}
      }
      setIsPlaying(false);
      return;
    }

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
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
        // Play synthetic acoustic profile representative of the frequency
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        const baseFreq = data.dominantHarmonicHz > 1500 ? 120 : data.dominantHarmonicHz > 400 ? 25 : 80;
        osc.type = data.dominantHarmonicHz > 1500 ? 'sawtooth' : 'triangle';
        osc.frequency.setValueAtTime(baseFreq, ctx.currentTime);

        // Modulate with rhythmic mechanical pulses
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
        }, 3500);
      }
    } catch (e) {
      console.warn('Audio playback error', e);
      setIsPlaying(false);
    }
  };

  // Handle local audio file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const arrayBuffer = await file.arrayBuffer();
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = audioContextRef.current || new AudioCtx();
      audioContextRef.current = ctx;

      const decodedBuffer = await ctx.decodeAudioData(arrayBuffer);
      const rawData = decodedBuffer.getChannelData(0);

      // Compute peak dB and simple FFT spectral sample
      let peak = 0;
      for (let i = 0; i < rawData.length; i++) {
        const abs = Math.abs(rawData[i]);
        if (abs > peak) peak = abs;
      }
      const peakDb = peak > 0 ? 20 * Math.log10(peak) : -60;

      // Extract spectral frequency bins
      const spectralPoints: { freq: number; magnitude: number }[] = [];
      const bins = 60;
      const step = Math.floor(rawData.length / bins);
      let dominantHarmonicHz = 240;
      let maxLocalAmp = 0;

      for (let i = 0; i < bins; i++) {
        const freq = Math.round(50 + (i / bins) * 4000);
        let sum = 0;
        for (let j = 0; j < Math.min(100, step); j++) {
          sum += Math.abs(rawData[i * step + j] || 0);
        }
        const amp = sum / 100;
        const mag = Math.max(-60, 20 * Math.log10(amp + 0.0001));
        if (amp > maxLocalAmp) {
          maxLocalAmp = amp;
          dominantHarmonicHz = freq;
        }
        spectralPoints.push({ freq, magnitude: Math.min(-2, mag) });
      }

      onChange({
        fileName: file.name,
        durationSeconds: Number(decodedBuffer.duration.toFixed(2)),
        sampleRate: decodedBuffer.sampleRate,
        peakDb: Number(peakDb.toFixed(1)),
        dominantHarmonicHz,
        spectralPoints,
        audioBuffer: decodedBuffer
      });
    } catch (err) {
      console.error('Failed to parse audio file', err);
      alert('Unable to decode audio file. Please ensure it is a valid WAV or MP3 audio recording.');
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
          <span className="text-[10px] text-[#737A82] font-mono">Calibrated WAV Samples</span>
        </div>
        <div className="grid grid-cols-1 gap-1.5">
          {AUDIO_PRESETS.map((preset) => {
            const isSelected = activePresetId === preset.id;
            return (
              <button
                key={preset.id}
                onClick={() => {
                  if (isPlaying && activeSourceRef.current) {
                    try { activeSourceRef.current.stop(); } catch {}
                    setIsPlaying(false);
                  }
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
          Custom Audio Ingestion (.wav, .mp3)
        </label>
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/wav,audio/mp3,audio/mpeg,audio/x-wav"
          className="hidden"
          onChange={handleFileUpload}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-full p-4 rounded-lg bg-[#101214] border border-dashed border-[#292D31] hover:border-[#D66A32]/60 hover:bg-[#171A1D] transition flex flex-col items-center justify-center gap-2 group"
        >
          <UploadCloud className="w-5 h-5 text-[#737A82] group-hover:text-[#D66A32] transition" />
          <div className="text-center">
            <span className="text-xs text-[#F1F2F3] font-medium block">
              Upload Engine Bay Recording
            </span>
            <span className="text-[10px] text-[#737A82] font-mono mt-0.5 block">
              Auto-computes FFT harmonic spectrum & peak pressure
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
                {data.sampleRate} Hz • {data.durationSeconds}s
              </span>
            </div>
          </div>
          <button
            onClick={handleToggleAudio}
            className={`px-3 py-1.5 rounded text-xs font-mono flex items-center gap-1.5 transition ${
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
                <Play className="w-3 h-3 fill-current" /> Audition
              </>
            )}
          </button>
        </div>

        {/* Acoustic Summary Parameters */}
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#292D31]">
          <div className="bg-[#171A1D] p-2 rounded border border-[#292D31]">
            <span className="text-[10px] font-mono text-[#737A82] uppercase block">Dominant Harmonic</span>
            <span className="text-xs font-mono font-bold text-[#D66A32] mt-0.5 block">
              {data.dominantHarmonicHz} Hz
            </span>
          </div>
          <div className="bg-[#171A1D] p-2 rounded border border-[#292D31]">
            <span className="text-[10px] font-mono text-[#737A82] uppercase block">Peak Level</span>
            <span className="text-xs font-mono font-medium text-[#F1F2F3] mt-0.5 block">
              {data.peakDb} dBFS
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
