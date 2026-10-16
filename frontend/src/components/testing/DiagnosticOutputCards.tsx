import React from 'react';
import { Sliders, Waves, Activity, CheckCircle2, AlertTriangle, XCircle, MinusCircle } from 'lucide-react';
import { mapTabularPrediction, mapAudioPrediction, mapVibrationPrediction } from '../../lib/engineHealthIndex';

export type StreamStatus = 'SUCCESS' | 'NOT_PROVIDED' | 'INVALID' | 'FAILED';

export interface StreamOutputResult {
  status: StreamStatus;
  rawPrediction?: string | null;
  confidence?: number | null;
  confidenceType?: string | null;
  reviewRequired?: boolean | null;
  summary?: string | null;
  error?: string | null;
  metadata?: Record<string, string | number | null | undefined>;
}

interface DiagnosticOutputCardsProps {
  tabular: StreamOutputResult;
  audio: StreamOutputResult;
  vibration: StreamOutputResult;
}

export const DiagnosticOutputCards: React.FC<DiagnosticOutputCardsProps> = ({
  tabular,
  audio,
  vibration,
}) => {
  // 1. Tabular card mapping
  const tabMapped = tabular.status === 'SUCCESS' ? mapTabularPrediction(tabular.rawPrediction) : null;
  const isTabNominal = tabMapped?.risk === 0;

  // 2. Audio card mapping
  const audMapped = audio.status === 'SUCCESS' ? mapAudioPrediction(audio.rawPrediction) : null;
  const isAudNominal = audMapped?.risk === 0;

  // 3. Vibration card mapping
  const vibMapped = vibration.status === 'SUCCESS' ? mapVibrationPrediction(vibration.rawPrediction) : null;
  const isVibNominal = vibMapped?.risk === 0;

  const renderStatusBadge = (status: StreamStatus, isNominal?: boolean) => {
    switch (status) {
      case 'SUCCESS':
        return isNominal ? (
          <span className="flex items-center gap-1 text-[10px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-500/40 px-2 py-0.5 rounded-full">
            <CheckCircle2 className="w-3 h-3" /> Nominal
          </span>
        ) : (
          <span className="flex items-center gap-1 text-[10px] font-mono text-red-400 bg-red-950/60 border border-red-500/40 px-2 py-0.5 rounded-full">
            <AlertTriangle className="w-3 h-3" /> Fault Detected
          </span>
        );
      case 'NOT_PROVIDED':
        return (
          <span className="flex items-center gap-1 text-[10px] font-mono text-[#737A82] bg-[#171A1D] border border-[#292D31] px-2 py-0.5 rounded-full">
            <MinusCircle className="w-3 h-3" /> Not Provided
          </span>
        );
      case 'INVALID':
        return (
          <span className="flex items-center gap-1 text-[10px] font-mono text-amber-400 bg-amber-950/60 border border-amber-500/40 px-2 py-0.5 rounded-full">
            <AlertTriangle className="w-3 h-3" /> Invalid Input
          </span>
        );
      case 'FAILED':
        return (
          <span className="flex items-center gap-1 text-[10px] font-mono text-red-400 bg-red-950/60 border border-red-500/40 px-2 py-0.5 rounded-full">
            <XCircle className="w-3 h-3" /> Failed
          </span>
        );
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-sans">
      {/* ============================================================ */}
      {/* CARD 1: TABULAR MODEL OUTPUT */}
      {/* ============================================================ */}
      <div className="bg-[#101214] border border-[#292D31] rounded-2xl p-5 flex flex-col justify-between shadow-xl relative overflow-hidden">
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b border-[#292D31] pb-2.5">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#171A1D] border border-[#292D31] flex items-center justify-center">
                <Sliders className="w-3.5 h-3.5 text-[#D66A32]" />
              </div>
              <div>
                <span className="text-[10px] font-mono text-[#737A82] uppercase tracking-wider block">Stream 1</span>
                <h4 className="text-xs font-bold text-[#F1F2F3] font-mono uppercase">Tabular Telemetry</h4>
              </div>
            </div>
            {renderStatusBadge(tabular.status, isTabNominal)}
          </div>

          {tabular.status === 'SUCCESS' && tabMapped && (
            <div className="space-y-2.5">
              <div>
                <span className="text-[10px] font-mono text-[#737A82] uppercase block">Mapped Model Prediction:</span>
                <div className="text-base font-black text-[#F1F2F3] tracking-tight mt-0.5">
                  {tabMapped.mappedClass}
                </div>
                <div className="text-[10px] font-mono text-[#A4A9AF] mt-0.5">
                  Raw Output: <span className="text-[#F1F2F3]">{tabular.rawPrediction}</span>
                </div>
              </div>

              {tabular.summary && (
                <p className="text-[11px] text-[#A4A9AF] leading-relaxed line-clamp-2">
                  {tabular.summary}
                </p>
              )}

              {/* Genuine Metrics */}
              <div className="grid grid-cols-2 gap-1.5 pt-1 text-[10px] font-mono">
                <div className="bg-[#171A1D] p-2 rounded-lg border border-[#292D31]">
                  <span className="text-[#737A82] block">Vote Fraction:</span>
                  <span className="text-[#F1F2F3] font-bold">
                    {tabular.confidence !== null && tabular.confidence !== undefined
                      ? `${(tabular.confidence * 100).toFixed(1)}%`
                      : '—'}
                  </span>
                </div>
                <div className="bg-[#171A1D] p-2 rounded-lg border border-[#292D31]">
                  <span className="text-[#737A82] block">Assigned Risk:</span>
                  <span className={`font-bold ${tabMapped.risk === 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    R_E = {tabMapped.risk}
                  </span>
                </div>
              </div>

              {tabular.reviewRequired && (
                <div className="text-[10px] font-mono text-amber-300 bg-amber-950/40 border border-amber-500/30 px-2 py-1 rounded">
                  Near decision threshold (review advised)
                </div>
              )}
            </div>
          )}

          {tabular.status === 'NOT_PROVIDED' && (
            <div className="py-6 text-center space-y-1">
              <span className="text-xs font-mono text-[#737A82] block">Stream Not Provided</span>
              <p className="text-[10px] text-[#41464D] max-w-[220px] mx-auto">
                No telemetry CSV or manual 14-sensor readings supplied for this analysis.
              </p>
            </div>
          )}

          {tabular.status === 'INVALID' && (
            <div className="py-4 space-y-1 text-xs">
              <span className="font-semibold text-amber-400 block font-mono">Input Validation Error</span>
              <p className="text-[11px] text-[#A4A9AF] leading-relaxed">
                {tabular.error || 'One or more required sensor features were invalid or missing.'}
              </p>
            </div>
          )}

          {tabular.status === 'FAILED' && (
            <div className="py-4 space-y-1 text-xs">
              <span className="font-semibold text-red-400 block font-mono">Inference Execution Error</span>
              <p className="text-[11px] text-[#A4A9AF] leading-relaxed font-mono">
                {tabular.error || 'Tabular backend model execution failed.'}
              </p>
            </div>
          )}
        </div>

        <div className="border-t border-[#292D31] pt-2 mt-3 text-[9px] font-mono text-[#737A82] flex justify-between">
          <span>EngineFaultDB Model</span>
          <span>Weight: 0.697</span>
        </div>
      </div>

      {/* ============================================================ */}
      {/* CARD 2: AUDIO MODEL OUTPUT */}
      {/* ============================================================ */}
      <div className="bg-[#101214] border border-[#292D31] rounded-2xl p-5 flex flex-col justify-between shadow-xl relative overflow-hidden">
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b border-[#292D31] pb-2.5">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#171A1D] border border-[#292D31] flex items-center justify-center">
                <Waves className="w-3.5 h-3.5 text-[#D66A32]" />
              </div>
              <div>
                <span className="text-[10px] font-mono text-[#737A82] uppercase tracking-wider block">Stream 2</span>
                <h4 className="text-xs font-bold text-[#F1F2F3] font-mono uppercase">Audio Acoustics</h4>
              </div>
            </div>
            {renderStatusBadge(audio.status, isAudNominal)}
          </div>

          {audio.status === 'SUCCESS' && audMapped && (
            <div className="space-y-2.5">
              <div>
                <span className="text-[10px] font-mono text-[#737A82] uppercase block">Acoustic Classification:</span>
                <div className="text-base font-black text-[#F1F2F3] tracking-tight mt-0.5">
                  {audMapped.mappedClass}
                </div>
                <div className="text-[10px] font-mono text-[#A4A9AF] mt-0.5">
                  Raw Output: <span className="text-[#F1F2F3]">{audio.rawPrediction}</span>
                </div>
              </div>

              {audio.summary && (
                <p className="text-[11px] text-[#A4A9AF] leading-relaxed line-clamp-2">
                  {audio.summary}
                </p>
              )}

              {/* Genuine Metrics */}
              <div className="grid grid-cols-2 gap-1.5 pt-1 text-[10px] font-mono">
                <div className="bg-[#171A1D] p-2 rounded-lg border border-[#292D31]">
                  <span className="text-[#737A82] block">Vote Fraction:</span>
                  <span className="text-[#F1F2F3] font-bold">
                    {audio.confidence !== null && audio.confidence !== undefined
                      ? `${(audio.confidence * 100).toFixed(1)}%`
                      : '—'}
                  </span>
                </div>
                <div className="bg-[#171A1D] p-2 rounded-lg border border-[#292D31]">
                  <span className="text-[#737A82] block">Assigned Risk:</span>
                  <span className={`font-bold ${audMapped.risk === 0 ? 'text-emerald-400' : audMapped.risk === 1 ? 'text-red-400' : 'text-amber-400'}`}>
                    {audMapped.risk !== null ? `R_A = ${audMapped.risk}` : 'Excluded (N/A)'}
                  </span>
                </div>
              </div>

              {audMapped.mappedClass === 'Non-engine issue' && (
                <div className="text-[10px] font-mono text-amber-300 bg-amber-950/40 border border-amber-500/30 px-2 py-1 rounded">
                  Non-engine issue: excluded from Health Index per Part 6.1
                </div>
              )}
            </div>
          )}

          {audio.status === 'NOT_PROVIDED' && (
            <div className="py-6 text-center space-y-1">
              <span className="text-xs font-mono text-[#737A82] block">Stream Not Provided</span>
              <p className="text-[10px] text-[#41464D] max-w-[220px] mx-auto">
                No engine acoustic recording (WAV/MP3) supplied for this analysis.
              </p>
            </div>
          )}

          {audio.status === 'INVALID' && (
            <div className="py-4 space-y-1 text-xs">
              <span className="font-semibold text-amber-400 block font-mono">Input Validation Error</span>
              <p className="text-[11px] text-[#A4A9AF] leading-relaxed">
                {audio.error || 'Audio recording was corrupt, empty, or had zero duration.'}
              </p>
            </div>
          )}

          {audio.status === 'FAILED' && (
            <div className="py-4 space-y-1 text-xs">
              <span className="font-semibold text-red-400 block font-mono">Inference Execution Error</span>
              <p className="text-[11px] text-[#A4A9AF] leading-relaxed font-mono">
                {audio.error || 'Audio inference service execution failed.'}
              </p>
            </div>
          )}
        </div>

        <div className="border-t border-[#292D31] pt-2 mt-3 text-[9px] font-mono text-[#737A82] flex justify-between">
          <span>Acoustic Random Forest</span>
          <span>Weight: 0.084</span>
        </div>
      </div>

      {/* ============================================================ */}
      {/* CARD 3: VIBRATION MODEL OUTPUT */}
      {/* ============================================================ */}
      <div className="bg-[#101214] border border-[#292D31] rounded-2xl p-5 flex flex-col justify-between shadow-xl relative overflow-hidden">
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b border-[#292D31] pb-2.5">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#171A1D] border border-[#292D31] flex items-center justify-center">
                <Activity className="w-3.5 h-3.5 text-[#D66A32]" />
              </div>
              <div>
                <span className="text-[10px] font-mono text-[#737A82] uppercase tracking-wider block">Stream 3</span>
                <h4 className="text-xs font-bold text-[#F1F2F3] font-mono uppercase">Vibration Dynamics</h4>
              </div>
            </div>
            {renderStatusBadge(vibration.status, isVibNominal)}
          </div>

          {vibration.status === 'SUCCESS' && vibMapped && (
            <div className="space-y-2.5">
              <div>
                <span className="text-[10px] font-mono text-[#737A82] uppercase block">Bearing Condition Output:</span>
                <div className="text-base font-black text-[#F1F2F3] tracking-tight mt-0.5">
                  {vibMapped.mappedClass}
                </div>
                <div className="text-[10px] font-mono text-[#A4A9AF] mt-0.5">
                  Raw Output: <span className="text-[#F1F2F3]">{vibration.rawPrediction}</span>
                </div>
              </div>

              {vibration.summary && (
                <p className="text-[11px] text-[#A4A9AF] leading-relaxed line-clamp-2">
                  {vibration.summary}
                </p>
              )}

              {/* Genuine Metrics */}
              <div className="grid grid-cols-2 gap-1.5 pt-1 text-[10px] font-mono">
                <div className="bg-[#171A1D] p-2 rounded-lg border border-[#292D31]">
                  <span className="text-[#737A82] block">Vote Fraction:</span>
                  <span className="text-[#F1F2F3] font-bold">
                    {vibration.confidence !== null && vibration.confidence !== undefined
                      ? `${(vibration.confidence * 100).toFixed(1)}%`
                      : '—'}
                  </span>
                </div>
                <div className="bg-[#171A1D] p-2 rounded-lg border border-[#292D31]">
                  <span className="text-[#737A82] block">Assigned Risk:</span>
                  <span className={`font-bold ${vibMapped.risk === 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    R_V = {vibMapped.risk}
                  </span>
                </div>
              </div>

              <div className="text-[10px] font-mono text-[#737A82]">
                * Binary bearing classifier; not a diagnosis of total engine assembly.
              </div>
            </div>
          )}

          {vibration.status === 'NOT_PROVIDED' && (
            <div className="py-6 text-center space-y-1">
              <span className="text-xs font-mono text-[#737A82] block">Stream Not Provided</span>
              <p className="text-[10px] text-[#41464D] max-w-[220px] mx-auto">
                No accelerometer CSV vibration recording supplied for this analysis.
              </p>
            </div>
          )}

          {vibration.status === 'INVALID' && (
            <div className="py-4 space-y-1 text-xs">
              <span className="font-semibold text-amber-400 block font-mono">Input Validation Error</span>
              <p className="text-[11px] text-[#A4A9AF] leading-relaxed">
                {vibration.error || 'Vibration CSV had missing columns, irregular sampling, or no valid channels.'}
              </p>
            </div>
          )}

          {vibration.status === 'FAILED' && (
            <div className="py-4 space-y-1 text-xs">
              <span className="font-semibold text-red-400 block font-mono">Inference Execution Error</span>
              <p className="text-[11px] text-[#A4A9AF] leading-relaxed font-mono">
                {vibration.error || 'Vibration inference service execution failed.'}
              </p>
            </div>
          )}
        </div>

        <div className="border-t border-[#292D31] pt-2 mt-3 text-[9px] font-mono text-[#737A82] flex justify-between">
          <span>Bearing Classifier</span>
          <span>Weight: 0.219</span>
        </div>
      </div>
    </div>
  );
};
