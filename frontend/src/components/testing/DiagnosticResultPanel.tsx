import React from 'react';
import { AlertTriangle, CheckCircle2, ShieldAlert, Cpu, Crosshair, HelpCircle } from 'lucide-react';
import { DiagnosticResult } from '../../types/diagnosis';
import { COMPONENT_METADATA } from '../../types/engine';

interface DiagnosticResultPanelProps {
  result: DiagnosticResult | null;
  onFocusComponent?: (componentId: string) => void;
}

export const DiagnosticResultPanel: React.FC<DiagnosticResultPanelProps> = ({
  result,
  onFocusComponent
}) => {
  if (!result) {
    return (
      <div className="bg-[#101214] border border-[#292D31] rounded-xl p-6 text-center space-y-3 font-sans">
        <div className="w-10 h-10 rounded-lg bg-[#171A1D] border border-[#292D31] flex items-center justify-center mx-auto text-[#737A82]">
          <Cpu className="w-5 h-5 text-[#A4A9AF]" />
        </div>
        <div>
          <h4 className="text-sm font-semibold text-[#F1F2F3]">Awaiting Analysis</h4>
          <p className="text-xs text-[#737A82] mt-1 max-w-xs mx-auto">
            Select an input modality (Tabular, Audio, or Vibration), configure parameters or load a calibrated preset, then click <strong className="text-[#F1F2F3]">Analyze Engine</strong>.
          </p>
        </div>
      </div>
    );
  }

  const isFault = result.status === 'FAULT';
  const isWarning = result.status === 'WARNING';
  const isNominal = result.status === 'NOMINAL';

  const mappedMeta = result.faultyComponentId ? COMPONENT_METADATA[result.faultyComponentId] : null;

  return (
    <div className="space-y-4 font-sans">
      {/* Primary Diagnosis Header Card */}
      <div className="bg-[#101214] border border-[#292D31] rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-mono uppercase tracking-wider font-semibold border ${
                isFault
                  ? 'bg-[#D66A32]/10 border-[#D66A32]/40 text-[#D66A32]'
                  : isWarning
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              }`}
            >
              {isFault && <ShieldAlert className="w-3.5 h-3.5" />}
              {isWarning && <AlertTriangle className="w-3.5 h-3.5" />}
              {isNominal && <CheckCircle2 className="w-3.5 h-3.5" />}
              {result.status}
            </span>
            <span className="text-[11px] font-mono text-[#737A82] uppercase">
              {result.modality} Analysis
            </span>
            {result.isSimulated ? (
              <span className="text-[10px] font-mono text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded border border-amber-400/20">
                SIMULATED DEMO
              </span>
            ) : (
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded border border-emerald-400/20">
                LIVE ML MODEL
              </span>
            )}
          </div>

          <div className="text-right">
            <span className="text-[10px] font-mono text-[#737A82] uppercase block">
              {result.confidenceLabel || 'Confidence'}
            </span>
            <span className="text-xs font-mono font-bold text-[#F1F2F3]">
              {result.confidencePercent.toFixed(1)}%
            </span>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-bold text-[#F1F2F3] tracking-tight leading-snug">
            {result.faultTitle}
          </h3>
          <p className="text-xs text-[#A4A9AF] mt-1.5 leading-relaxed">
            {result.faultSummary}
          </p>
        </div>

        {/* 3D Component Mapping Attribution Button */}
        {mappedMeta && (
          <div className="pt-2 border-t border-[#292D31] flex items-center justify-between bg-[#171A1D]/60 p-2.5 rounded-lg border border-[#292D31]">
            <div className="min-w-0 pr-2">
              <span className="text-[10px] font-mono text-[#737A82] uppercase block">
                3D Highlighted Assembly
              </span>
              <span className="text-xs font-semibold text-[#F1F2F3] truncate block">
                {mappedMeta.name}
              </span>
            </div>
            {onFocusComponent && (
              <button
                onClick={() => onFocusComponent(mappedMeta.id)}
                className="px-2.5 py-1 rounded bg-[#D66A32] hover:bg-[#D66A32]/90 text-white text-[11px] font-mono flex items-center gap-1 transition shadow-sm flex-shrink-0"
              >
                <Crosshair className="w-3 h-3" /> Inspect 3D
              </button>
            )}
          </div>
        )}
      </div>

      {/* Telemetry Metric Channels Card */}
      <div className="bg-[#101214] border border-[#292D31] rounded-xl p-4 space-y-2.5">
        <span className="text-[11px] font-mono uppercase tracking-wider text-[#A4A9AF] block">
          Key Diagnostic Parameters
        </span>
        <div className="grid grid-cols-2 gap-2">
          {result.metrics.map((m, idx) => (
            <div
              key={idx}
              className="bg-[#171A1D] p-2.5 rounded-lg border border-[#292D31] flex flex-col justify-between"
            >
              <span className="text-[10px] font-mono text-[#737A82] uppercase">
                {m.label}
              </span>
              <div className="flex items-center justify-between mt-1">
                <span className="text-xs font-mono font-medium text-[#F1F2F3]">
                  {m.value}
                </span>
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    m.status === 'critical'
                      ? 'bg-[#D66A32]'
                      : m.status === 'caution'
                      ? 'bg-amber-400'
                      : 'bg-emerald-400'
                  }`}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Mechanical Root Cause Rationale */}
      <div className="bg-[#101214] border border-[#292D31] rounded-xl p-4 space-y-2">
        <span className="text-[11px] font-mono uppercase tracking-wider text-[#A4A9AF] block">
          Subsystem Mechanism
        </span>
        <p className="text-xs text-[#A4A9AF] leading-relaxed">
          {result.mechanicalRationale}
        </p>
      </div>

      {/* Engineering Disclaimer */}
      <div className="p-3 rounded-lg bg-[#171A1D]/40 border border-[#292D31] flex items-start gap-2">
        <HelpCircle className="w-3.5 h-3.5 text-[#737A82] flex-shrink-0 mt-0.5" />
        <p className="text-[10px] text-[#737A82] font-mono leading-relaxed">
          EnginePulse Deterministic Diagnostic Model v2.4 (Physics-Grounded Edge Engine). Results are decision support tools for automotive technicians; follow factory service procedures before tear-down.
        </p>
      </div>
    </div>
  );
};
