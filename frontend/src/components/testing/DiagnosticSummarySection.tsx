import React from 'react';
import { FileText, AlertTriangle, Split } from 'lucide-react';
import { StreamOutputResult } from './DiagnosticOutputCards';
import { mapTabularPrediction, mapAudioPrediction, mapVibrationPrediction } from '../../lib/engineHealthIndex';

interface DiagnosticSummarySectionProps {
  tabular: StreamOutputResult;
  audio: StreamOutputResult;
  vibration: StreamOutputResult;
}

export const DiagnosticSummarySection: React.FC<DiagnosticSummarySectionProps> = ({
  tabular,
  audio,
  vibration,
}) => {
  const tabMapped = tabular.status === 'SUCCESS' ? mapTabularPrediction(tabular.rawPrediction) : null;
  const audMapped = audio.status === 'SUCCESS' ? mapAudioPrediction(audio.rawPrediction) : null;
  const vibMapped = vibration.status === 'SUCCESS' ? mapVibrationPrediction(vibration.rawPrediction) : null;

  const analyzedStreams: string[] = [];
  const notProvidedStreams: string[] = [];
  const failedStreams: string[] = [];
  const invalidStreams: string[] = [];

  if (tabular.status === 'SUCCESS') analyzedStreams.push('Tabular Telemetry');
  else if (tabular.status === 'NOT_PROVIDED') notProvidedStreams.push('Tabular Telemetry');
  else if (tabular.status === 'INVALID') invalidStreams.push('Tabular Telemetry');
  else if (tabular.status === 'FAILED') failedStreams.push('Tabular Telemetry');

  if (audio.status === 'SUCCESS') analyzedStreams.push('Audio Acoustic Recording');
  else if (audio.status === 'NOT_PROVIDED') notProvidedStreams.push('Audio Acoustics');
  else if (audio.status === 'INVALID') invalidStreams.push('Audio Acoustics');
  else if (audio.status === 'FAILED') failedStreams.push('Audio Acoustics');

  if (vibration.status === 'SUCCESS') analyzedStreams.push('Vibration Accelerometer');
  else if (vibration.status === 'NOT_PROVIDED') notProvidedStreams.push('Vibration Accelerometer');
  else if (vibration.status === 'INVALID') invalidStreams.push('Vibration Accelerometer');
  else if (vibration.status === 'FAILED') failedStreams.push('Vibration Accelerometer');

  // Check for model disagreement/conflicts among successful streams
  const riskStatuses: { stream: string; risk: number | null; label: string }[] = [];
  if (tabMapped && tabMapped.risk !== null) {
    riskStatuses.push({ stream: 'Tabular Telemetry', risk: tabMapped.risk, label: tabMapped.mappedClass });
  }
  if (audMapped && audMapped.risk !== null) {
    riskStatuses.push({ stream: 'Audio Acoustics', risk: audMapped.risk, label: audMapped.mappedClass });
  }
  if (vibMapped && vibMapped.risk !== null) {
    riskStatuses.push({ stream: 'Vibration Dynamics', risk: vibMapped.risk, label: vibMapped.mappedClass });
  }

  const hasFault = riskStatuses.some(s => s.risk === 1);
  const hasNominal = riskStatuses.some(s => s.risk === 0);
  const isConflicting = hasFault && hasNominal;

  return (
    <div className="bg-[#101214] border border-[#292D31] rounded-2xl p-5 space-y-4 font-sans shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#292D31] pb-3">
        <div className="flex items-center gap-2.5">
          <FileText className="w-4 h-4 text-[#D66A32]" />
          <div>
            <h3 className="text-sm font-bold text-[#F1F2F3] font-mono uppercase tracking-wider">
              3. Combined Diagnostic Summary &amp; Model Consensus
            </h3>
            <span className="text-[10px] text-[#737A82] font-mono">
              Synthesized across {analyzedStreams.length} analyzed stream{analyzedStreams.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {isConflicting && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-950/60 border border-amber-500/40 text-[10px] font-mono text-amber-300 font-bold">
            <Split className="w-3.5 h-3.5 text-amber-400" />
            Cross-Stream Divergence Noted
          </div>
        )}
      </div>

      {/* Stream Inventory Status */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-[10px] font-mono">
        <div className="bg-[#171A1D] p-2.5 rounded-lg border border-[#292D31]">
          <span className="text-[#737A82] block">Analyzed Streams:</span>
          <span className="text-emerald-400 font-bold">
            {analyzedStreams.length > 0 ? analyzedStreams.join(', ') : 'None'}
          </span>
        </div>
        <div className="bg-[#171A1D] p-2.5 rounded-lg border border-[#292D31]">
          <span className="text-[#737A82] block">Not Provided:</span>
          <span className="text-[#A4A9AF]">
            {notProvidedStreams.length > 0 ? notProvidedStreams.join(', ') : 'None'}
          </span>
        </div>
        <div className="bg-[#171A1D] p-2.5 rounded-lg border border-[#292D31]">
          <span className="text-[#737A82] block">Invalid Inputs:</span>
          <span className={invalidStreams.length > 0 ? 'text-amber-400 font-bold' : 'text-[#737A82]'}>
            {invalidStreams.length > 0 ? invalidStreams.join(', ') : 'None'}
          </span>
        </div>
        <div className="bg-[#171A1D] p-2.5 rounded-lg border border-[#292D31]">
          <span className="text-[#737A82] block">Failed Inferences:</span>
          <span className={failedStreams.length > 0 ? 'text-red-400 font-bold' : 'text-[#737A82]'}>
            {failedStreams.length > 0 ? failedStreams.join(', ') : 'None'}
          </span>
        </div>
      </div>

      {/* Individual Model Findings */}
      <div className="space-y-2 pt-1 font-mono text-xs">
        <span className="text-[10px] font-mono text-[#737A82] uppercase tracking-wider block font-semibold">
          Model Findings:
        </span>

        {/* Tabular finding */}
        {tabMapped && (
          <div className="p-3 rounded-xl bg-[#171A1D]/60 border border-[#292D31] flex items-start gap-2.5">
            <span className="text-[#D66A32] font-bold mt-0.5">•</span>
            <div className="space-y-0.5 min-w-0">
              <span className="font-bold text-[#F1F2F3] block">
                Tabular Telemetry: {tabMapped.mappedClass} (Risk R_E = {tabMapped.risk})
              </span>
              <p className="text-[11px] text-[#A4A9AF] leading-relaxed">
                {tabular.summary || `Evaluated 14 telemetry features. Predicted state: ${tabMapped.mappedClass}.`}
              </p>
            </div>
          </div>
        )}

        {/* Audio finding */}
        {audMapped && (
          <div className="p-3 rounded-xl bg-[#171A1D]/60 border border-[#292D31] flex items-start gap-2.5">
            <span className="text-[#D66A32] font-bold mt-0.5">•</span>
            <div className="space-y-0.5 min-w-0">
              <span className="font-bold text-[#F1F2F3] block">
                Audio Acoustics: {audMapped.mappedClass} {audMapped.risk !== null ? `(Risk R_A = ${audMapped.risk})` : '(Excluded from EHI)'}
              </span>
              <p className="text-[11px] text-[#A4A9AF] leading-relaxed">
                {audio.summary || `Acoustic frequency spectrum and transients evaluated. Classified as ${audMapped.mappedClass}.`}
              </p>
            </div>
          </div>
        )}

        {/* Vibration finding */}
        {vibMapped && (
          <div className="p-3 rounded-xl bg-[#171A1D]/60 border border-[#292D31] flex items-start gap-2.5">
            <span className="text-[#D66A32] font-bold mt-0.5">•</span>
            <div className="space-y-0.5 min-w-0">
              <span className="font-bold text-[#F1F2F3] block">
                Vibration Dynamics: {vibMapped.mappedClass} (Risk R_V = {vibMapped.risk})
              </span>
              <p className="text-[11px] text-[#A4A9AF] leading-relaxed">
                {vibration.summary || `Accelerometer spectral energy evaluated. Bearing condition: ${vibMapped.mappedClass}.`}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Cross-Stream Divergence Analysis if streams disagree */}
      {isConflicting && (
        <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-500/40 text-[11px] space-y-1 font-mono text-amber-200">
          <div className="flex items-center gap-1.5 text-amber-400 font-bold uppercase text-[10px]">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Cross-Stream Disagreement Caveat:</span>
          </div>
          <p className="leading-relaxed">
            The available diagnostic streams present divergent evidence: some models indicate nominal operation while others flag an anomaly. Each model monitors a distinct subsystem (thermodynamic combustion telemetry vs acoustic shock transients vs journal bearing rotational vibration). Physical bore-scope inspection or secondary sensor verification is strongly recommended before high-load operation.
          </p>
        </div>
      )}

      {/* Scope Safeguards Disclaimer */}
      <div className="p-3 rounded-xl bg-[#0C0E10] border border-[#292D31] text-[10px] text-[#737A82] space-y-1 font-mono">
        <p>
          • <strong>Subsystem Isolation:</strong> A bearing condition classification evaluates hydrodynamic journal shells and is not a diagnosis of total engine health. Similarly, a nominal acoustic profile does not rule out localized sensor drift or bearing play.
        </p>
        <p>
          • <strong>No Unsupported Claims:</strong> This system reports genuine model classifications and does not make unvalidated Remaining Useful Life (RUL) or time-to-failure assertions.
        </p>
      </div>
    </div>
  );
};
