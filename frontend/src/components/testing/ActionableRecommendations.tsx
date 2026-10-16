import React from 'react';
import { ClipboardList, Wrench, FileSearch } from 'lucide-react';
import { DiagnosticResult } from '../../types/diagnosis';

interface ActionableRecommendationsProps {
  result: DiagnosticResult;
}

export const ActionableRecommendations: React.FC<ActionableRecommendationsProps> = ({ result }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-sans">
      {/* 1. Quantitative Model Findings */}
      <div className="bg-[#101214] border border-[#292D31] rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[#F1F2F3] font-semibold border-b border-[#292D31] pb-2">
          <FileSearch className="w-4 h-4 text-[#D66A32]" />
          <span>1. Model Findings</span>
        </div>
        <ul className="space-y-2 text-xs text-[#A4A9AF]">
          {result.findings.map((f, i) => (
            <li key={i} className="flex items-start gap-2 leading-relaxed">
              <span className="w-1.5 h-1.5 rounded-full bg-[#D66A32] flex-shrink-0 mt-1.5" />
              <span>{f}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* 2. Mechanical Interpretation */}
      <div className="bg-[#101214] border border-[#292D31] rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[#F1F2F3] font-semibold border-b border-[#292D31] pb-2">
          <ClipboardList className="w-4 h-4 text-[#D66A32]" />
          <span>2. Root Mechanism</span>
        </div>
        <div className="space-y-2 text-xs text-[#A4A9AF] leading-relaxed">
          <p className="bg-[#171A1D] p-2.5 rounded-lg border border-[#292D31] text-[#F1F2F3]">
            Subsystem: <strong className="text-[#D66A32]">{result.subsystem}</strong>
          </p>
          <p>
            {result.mechanicalRationale}
          </p>
        </div>
      </div>

      {/* 3. Actionable Next Steps */}
      <div className="bg-[#101214] border border-[#292D31] rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[#F1F2F3] font-semibold border-b border-[#292D31] pb-2">
          <Wrench className="w-4 h-4 text-[#D66A32]" />
          <span>3. Recommended Protocol</span>
        </div>
        <ol className="space-y-2 text-xs text-[#A4A9AF]">
          {result.recommendedActions.map((act, i) => (
            <li key={i} className="flex items-start gap-2 leading-relaxed">
              <span className="font-mono text-[10px] text-[#D66A32] bg-[#D66A32]/10 px-1.5 py-0.5 rounded border border-[#D66A32]/20 flex-shrink-0">
                0{i + 1}
              </span>
              <span>{act}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
};
