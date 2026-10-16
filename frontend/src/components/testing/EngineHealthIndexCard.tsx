import React from 'react';
import { HelpCircle, Activity, Info, Calculator } from 'lucide-react';
import { EngineHealthIndexResult } from '../../lib/engineHealthIndex';

interface EngineHealthIndexCardProps {
  result: EngineHealthIndexResult;
}

export const EngineHealthIndexCard: React.FC<EngineHealthIndexCardProps> = ({ result }) => {
  const getScoreColor = (score: number | null) => {
    if (score === null) return 'text-[#737A82]';
    if (score >= 80) return 'text-emerald-400';
    if (score >= 50) return 'text-amber-400';
    return 'text-red-400';
  };

  const getScoreBadge = (score: number | null) => {
    if (score === null) return { text: 'INSUFFICIENT DATA', bg: 'bg-[#171A1D]', border: 'border-[#292D31]', color: 'text-[#737A82]' };
    if (score === 100) return { text: 'NO FAULTS DETECTED (100/100)', bg: 'bg-emerald-950/60', border: 'border-emerald-500/40', color: 'text-emerald-300' };
    if (score >= 80) return { text: 'LOW FAULT EVIDENCE', bg: 'bg-emerald-950/40', border: 'border-emerald-500/30', color: 'text-emerald-300' };
    if (score >= 50) return { text: 'ELEVATED FAULT RISK', bg: 'bg-amber-950/40', border: 'border-amber-500/40', color: 'text-amber-300' };
    if (score === 0) return { text: 'ALL MODELS DETECTED FAULTS (0/100)', bg: 'bg-red-950/60', border: 'border-red-500/50', color: 'text-red-300' };
    return { text: 'HIGH FAULT EVIDENCE', bg: 'bg-red-950/60', border: 'border-red-500/50', color: 'text-red-300' };
  };

  const badge = getScoreBadge(result.score);
  const details = result.formulaDetails;

  return (
    <div className="bg-[#101214] border border-[#292D31] rounded-2xl p-6 font-sans space-y-5 shadow-2xl relative overflow-hidden">
      {/* Decorative gradient corner */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-[#D66A32]/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#292D31] pb-3">
        <div className="flex items-center gap-2.5">
          <Activity className="w-5 h-5 text-[#D66A32]" />
          <div>
            <h3 className="text-base font-bold text-[#F1F2F3] font-mono uppercase tracking-wider">
              7. Engine Health Index (EHI)
            </h3>
            <span className="text-[10px] text-[#737A82] font-mono">
              Provisional Dynamic Weighting: Tabular W_E = 0.697 • Audio W_A = 0.084 • Vibration W_V = 0.219
            </span>
          </div>
        </div>

        <div className={`px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider border ${badge.bg} ${badge.border} ${badge.color}`}>
          {badge.text}
        </div>
      </div>

      {/* ============================================================ */}
      {/* SECTION 1: OFFICIAL FORMULA SPECIFICATION BOX               */}
      {/* ============================================================ */}
      <div className="bg-[#0C0E10] border border-[#292D31] rounded-xl p-4 sm:p-5 space-y-3 font-mono">
        <div className="flex items-center justify-between text-xs text-[#737A82]">
          <span className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[#D66A32]">
            <Calculator className="w-3.5 h-3.5" />
            EHI Mathematical Specification:
          </span>
          <span className="text-[10px] text-[#A4A9AF]">Specification Formula 1.0</span>
        </div>

        {/* LaTeX Styled Formula Display */}
        <div className="p-4 rounded-xl bg-[#171A1D]/80 border border-[#292D31] text-center overflow-x-auto">
          <div className="inline-flex items-center gap-2 text-sm sm:text-base font-bold text-[#F1F2F3]">
            <span className="text-[#D66A32]">EHI</span>
            <span>=</span>
            <span>100</span>
            <span className="text-lg">×</span>
            <span className="text-xl font-light text-[#737A82]">(</span>
            <span>1</span>
            <span>−</span>
            <div className="inline-flex flex-col items-center mx-1">
              <span className="border-b border-[#737A82] px-2 pb-0.5 text-xs sm:text-sm text-amber-300">
                0.697 · R_E + 0.084 · R_A + 0.219 · R_V
              </span>
              <span className="pt-0.5 text-xs sm:text-sm text-cyan-300">
                0.697 · I_E + 0.084 · I_A + 0.219 · I_V
              </span>
            </div>
            <span className="text-xl font-light text-[#737A82]">)</span>
          </div>
          <p className="text-[10px] text-[#737A82] mt-2 max-w-xl mx-auto leading-relaxed">
            Where <span className="text-cyan-300 font-semibold">I_E, I_A, I_V</span> equal 1 when that model's output is applicable, and 0 otherwise. This denominator allows us to exclude inapplicable outputs, such as audio classified as a non-engine issue.
          </p>
        </div>

        {/* Live Mathematical Substitution Step */}
        {result.isAvailable && details && (
          <div className="p-3.5 rounded-xl bg-[#101214] border border-[#292D31] space-y-2 text-xs">
            <span className="text-[10px] uppercase tracking-wider font-bold text-[#A4A9AF] block">
              Live Formula Substitution with Active Engine Signals:
            </span>
            <div className="bg-[#0C0E10] p-3 rounded-lg border border-[#292D31] font-mono text-[11px] space-y-1.5 overflow-x-auto">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[#A4A9AF]">
                <span>
                  <strong className="text-cyan-300">I_E</strong>={details.I_E} (<strong className="text-amber-300">R_E</strong>={details.R_E !== null ? details.R_E : 'null'})
                </span>
                <span>•</span>
                <span>
                  <strong className="text-cyan-300">I_A</strong>={details.I_A} (<strong className="text-amber-300">R_A</strong>={details.R_A !== null ? details.R_A : 'null'})
                </span>
                <span>•</span>
                <span>
                  <strong className="text-cyan-300">I_V</strong>={details.I_V} (<strong className="text-amber-300">R_V</strong>={details.R_V !== null ? details.R_V : 'null'})
                </span>
              </div>

              <div className="text-[#F1F2F3] pt-1">
                <span>Weighted Risk Numerator: </span>
                <span className="text-amber-300 font-bold">{details.numerator.toFixed(3)}</span>
                <span className="text-[#737A82]"> / Applicable Weight Denominator: </span>
                <span className="text-cyan-300 font-bold">{details.denominator.toFixed(3)}</span>
                <span className="text-[#737A82]"> = Ratio: </span>
                <span className="text-[#F1F2F3] font-bold">{(details.ratio).toFixed(3)}</span>
              </div>

              <div className="pt-1 text-[#D66A32] font-bold text-xs">
                EHI = 100 × (1 − {details.ratio.toFixed(3)}) = {result.scoreFormatted} / 100
              </div>
            </div>

            <p className="text-[11px] text-[#A4A9AF]">
              <strong>Interpretation:</strong> {details.interpretationText}
            </p>
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* SECTION 2: MAIN SCORE GAUGE & BREAKDOWN TABLE                */}
      {/* ============================================================ */}
      {result.isAvailable && result.score !== null ? (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          {/* Big Number Gauge */}
          <div className="md:col-span-5 bg-[#0C0E10] border border-[#292D31] rounded-xl p-5 text-center space-y-1">
            <span className="text-[10px] font-mono text-[#737A82] uppercase tracking-wider block">
              Calculated Health Index
            </span>
            <div className={`text-5xl font-black font-mono tracking-tight ${getScoreColor(result.score)}`}>
              {result.scoreFormatted}
              <span className="text-lg text-[#737A82] font-normal ml-1">/ 100</span>
            </div>
            <p className="text-[10px] text-[#737A82] font-mono pt-1">
              Derived from {result.contributingStreamsCount} applicable stream{result.contributingStreamsCount > 1 ? 's' : ''} (Normalized Weight: {(result.applicableWeightTotal * 100).toFixed(1)}%)
            </p>
          </div>

          {/* Breakdown Table */}
          <div className="md:col-span-7 space-y-2">
            <span className="text-[10px] font-mono text-[#737A82] uppercase tracking-wider block">
              Contributing Stream Risk &amp; Weight Breakdown:
            </span>

            <div className="space-y-1.5 text-xs font-mono">
              {/* Tabular */}
              <div className="flex items-center justify-between p-2 rounded-lg bg-[#171A1D] border border-[#292D31]">
                <div>
                  <span className="font-semibold text-[#F1F2F3] block text-[11px]">Tabular Telemetry (EngineFaultDB)</span>
                  <span className="text-[10px] text-[#737A82]">
                    Class: {result.streams.tabular.mappedClass || 'Not provided'}
                  </span>
                </div>
                <div className="text-right">
                  <span className="font-bold block text-[11px]">
                    {result.streams.tabular.isApplicable ? (
                      <span className={result.streams.tabular.risk === 0 ? 'text-emerald-400' : 'text-red-400'}>
                        Risk R_E = {result.streams.tabular.risk} (I_E = 1)
                      </span>
                    ) : (
                      <span className="text-[#737A82]">I_E = 0 (Excluded)</span>
                    )}
                  </span>
                  <span className="text-[10px] text-[#737A82]">
                    {result.streams.tabular.isApplicable && result.streams.tabular.normalizedWeightPercent
                      ? `Effective Weight: ${result.streams.tabular.normalizedWeightPercent.toFixed(1)}%`
                      : 'Weight: 0.0%'}
                  </span>
                </div>
              </div>

              {/* Audio */}
              <div className="flex items-center justify-between p-2 rounded-lg bg-[#171A1D] border border-[#292D31]">
                <div>
                  <span className="font-semibold text-[#F1F2F3] block text-[11px]">Audio Acoustics</span>
                  <span className="text-[10px] text-[#737A82]">
                    Class: {result.streams.audio.mappedClass || 'Not provided'}
                  </span>
                </div>
                <div className="text-right">
                  <span className="font-bold block text-[11px]">
                    {result.streams.audio.isApplicable ? (
                      <span className={result.streams.audio.risk === 0 ? 'text-emerald-400' : 'text-red-400'}>
                        Risk R_A = {result.streams.audio.risk} (I_A = 1)
                      </span>
                    ) : (
                      <span className="text-amber-400">
                        {result.streams.audio.mappedClass === 'Non-engine issue' ? 'Non-engine issue: I_A = 0 (Excluded)' : 'I_A = 0 (Excluded)'}
                      </span>
                    )}
                  </span>
                  <span className="text-[10px] text-[#737A82]">
                    {result.streams.audio.isApplicable && result.streams.audio.normalizedWeightPercent
                      ? `Effective Weight: ${result.streams.audio.normalizedWeightPercent.toFixed(1)}%`
                      : 'Weight: 0.0%'}
                  </span>
                </div>
              </div>

              {/* Vibration */}
              <div className="flex items-center justify-between p-2 rounded-lg bg-[#171A1D] border border-[#292D31]">
                <div>
                  <span className="font-semibold text-[#F1F2F3] block text-[11px]">Vibration Accelerometry</span>
                  <span className="text-[10px] text-[#737A82]">
                    Class: {result.streams.vibration.mappedClass || 'Not provided'}
                  </span>
                </div>
                <div className="text-right">
                  <span className="font-bold block text-[11px]">
                    {result.streams.vibration.isApplicable ? (
                      <span className={result.streams.vibration.risk === 0 ? 'text-emerald-400' : 'text-red-400'}>
                        Risk R_V = {result.streams.vibration.risk} (I_V = 1)
                      </span>
                    ) : (
                      <span className="text-[#737A82]">I_V = 0 (Excluded)</span>
                    )}
                  </span>
                  <span className="text-[10px] text-[#737A82]">
                    {result.streams.vibration.isApplicable && result.streams.vibration.normalizedWeightPercent
                      ? `Effective Weight: ${result.streams.vibration.normalizedWeightPercent.toFixed(1)}%`
                      : 'Weight: 0.0%'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-5 rounded-xl bg-[#0C0E10] border border-[#292D31] text-center space-y-2">
          <HelpCircle className="w-8 h-8 text-[#737A82] mx-auto" />
          <h4 className="text-sm font-bold text-[#F1F2F3] font-mono">
            Engine Health Index unavailable — insufficient applicable diagnostic data.
          </h4>
          <p className="text-xs text-[#737A82] max-w-md mx-auto leading-relaxed font-mono">
            No valid engine-related predictions were available to calculate an index. Missing streams or Non-engine issues are never substituted with a zero score.
          </p>
        </div>
      )}

      {/* ============================================================ */}
      {/* SECTION 3: SPECIFICATION RISK VALUE DEFINITIONS              */}
      {/* ============================================================ */}
      <div className="p-3.5 rounded-xl bg-[#0C0E10] border border-[#292D31] text-[11px] font-mono space-y-1.5 text-[#737A82]">
        <span className="text-[10px] font-bold uppercase tracking-wider text-[#A4A9AF] block">
          Risk Value Definitions (Specification Part 2 &amp; 6):
        </span>
        <ul className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-[10px]">
          <li className="bg-[#171A1D] p-2 rounded-lg border border-[#292D31]">
            <strong className="text-[#F1F2F3] block">EngineFaultDB (R_E):</strong>
            Class 0 = 0 (no fault); Classes 1, 2, 3 = 1 (binary fault risk)
          </li>
          <li className="bg-[#171A1D] p-2 rounded-lg border border-[#292D31]">
            <strong className="text-[#F1F2F3] block">Audio Acoustics (R_A):</strong>
            Normal engine = 0; Engine issue = 1; Non-engine issue = excluded (I_A = 0)
          </li>
          <li className="bg-[#171A1D] p-2 rounded-lg border border-[#292D31]">
            <strong className="text-[#F1F2F3] block">Vibration Dynamics (R_V):</strong>
            Healthy bearing = 0; Faulty bearing = 1
          </li>
        </ul>
      </div>

      {/* Mandatory Verbatim Interpretation Warning */}
      <div className="p-3.5 rounded-xl bg-[#171A1D]/80 border border-[#292D31] text-[11px] space-y-1.5 font-mono text-[#A4A9AF]">
        <div className="flex items-center gap-1.5 text-[#D66A32] font-bold text-[10px] uppercase">
          <Info className="w-3.5 h-3.5" />
          <span>Index Interpretation Notice (Specification Standard):</span>
        </div>
        <p className="leading-relaxed">
          {result.interpretationWarning}
        </p>
      </div>
    </div>
  );
};
