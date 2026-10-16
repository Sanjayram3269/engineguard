import React from 'react';
import { RotateCcw, ArrowLeft } from 'lucide-react';
import { DiagnosticOutputCards, StreamOutputResult } from './DiagnosticOutputCards';
import { DiagnosticSummarySection } from './DiagnosticSummarySection';
import { TabularDataSummarySection } from './TabularDataSummarySection';
import { AudioSignalAnalysisSection } from './AudioSignalAnalysisSection';
import { VibrationSignalAnalysisSection } from './VibrationSignalAnalysisSection';
import { EngineHealthIndexCard } from './EngineHealthIndexCard';
import { TabularDataSummary } from '../../lib/tabularCsvSummary';
import { AudioEngineData, VibrationEngineData } from '../../types/diagnosis';
import { EngineHealthIndexResult } from '../../lib/engineHealthIndex';

export interface UnifiedResultsData {
  timestamp: string;
  outputs: {
    tabular: StreamOutputResult;
    audio: StreamOutputResult;
    vibration: StreamOutputResult;
  };
  tabularSummary: TabularDataSummary | null;
  audioData: AudioEngineData | null;
  vibrationData: VibrationEngineData | null;
  healthIndex: EngineHealthIndexResult;
  tabularError?: string | null;
  audioError?: string | null;
  vibrationError?: string | null;
}

interface UnifiedResultsDashboardProps {
  data: UnifiedResultsData;
  onEditInputs: () => void;
  onRunAnotherTest: () => void;
  onSelectVibrationChannel?: (channel: string) => void;
}

export const UnifiedResultsDashboard: React.FC<UnifiedResultsDashboardProps> = ({
  data,
  onEditInputs,
  onRunAnotherTest,
  onSelectVibrationChannel,
}) => {
  const analyzedCount = [
    data.outputs.tabular.status === 'SUCCESS',
    data.outputs.audio.status === 'SUCCESS',
    data.outputs.vibration.status === 'SUCCESS',
  ].filter(Boolean).length;

  return (
    <div className="w-full space-y-6 text-[#F1F2F3] font-sans pb-12">
      {/* ============================================================ */}
      {/* 1. RESULTS HEADER */}
      {/* ============================================================ */}
      <div className="bg-[#101214] border border-[#292D31] rounded-2xl p-5 sm:p-6 shadow-2xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-[10px] font-mono text-[#D66A32] font-bold tracking-widest uppercase flex items-center gap-1.5">
            <span>ENGINE DIAGNOSTIC REPORT</span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#D66A32]" />
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-[#F1F2F3] tracking-tight mt-0.5">
            Unified Multi-Stream Engine Diagnostics
          </h2>
          <p className="text-xs text-[#737A82] font-mono mt-1">
            Analysis Timestamp: {new Date(data.timestamp).toLocaleString()} •{' '}
            <span className="text-[#F1F2F3] font-semibold">{analyzedCount} of 3 Streams Evaluated</span>
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 font-mono text-xs">
          <button
            onClick={onEditInputs}
            className="px-3.5 py-2 rounded-xl bg-[#171A1D] hover:bg-[#292D31] border border-[#292D31] text-[#A4A9AF] hover:text-[#F1F2F3] transition flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-[#D66A32]" />
            <span>Edit Inputs</span>
          </button>
          <button
            onClick={onRunAnotherTest}
            className="px-4 py-2 rounded-xl bg-[#D66A32] hover:bg-[#D66A32]/90 text-white font-bold transition flex items-center gap-1.5 shadow-lg shadow-[#D66A32]/20 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Run Another Test</span>
          </button>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 2. THREE DIAGNOSTIC OUTPUT CARDS (Strict Order: Tabular, Audio, Vibration) */}
      {/* ============================================================ */}
      <section className="space-y-2">
        <DiagnosticOutputCards
          tabular={data.outputs.tabular}
          audio={data.outputs.audio}
          vibration={data.outputs.vibration}
        />
      </section>

      {/* ============================================================ */}
      {/* 3. COMBINED DIAGNOSTIC SUMMARY */}
      {/* ============================================================ */}
      <section>
        <DiagnosticSummarySection
          tabular={data.outputs.tabular}
          audio={data.outputs.audio}
          vibration={data.outputs.vibration}
        />
      </section>

      {/* ============================================================ */}
      {/* 4. TABULAR DATA SUMMARY & DESCRIPTIVE STATISTICS */}
      {/* ============================================================ */}
      <section>
        <TabularDataSummarySection
          summary={data.tabularSummary}
        />
      </section>

      {/* ============================================================ */}
      {/* 5. AUDIO SIGNAL ANALYSIS */}
      {/* ============================================================ */}
      <section>
        <AudioSignalAnalysisSection
          audioData={data.audioData}
          error={data.audioError}
        />
      </section>

      {/* ============================================================ */}
      {/* 6. VIBRATION SIGNAL ANALYSIS */}
      {/* ============================================================ */}
      <section>
        <VibrationSignalAnalysisSection
          vibrationData={data.vibrationData}
          error={data.vibrationError}
          onSelectChannel={onSelectVibrationChannel}
        />
      </section>

      {/* ============================================================ */}
      {/* 7. ENGINE HEALTH INDEX (Exact Formula, Weights & Warning) */}
      {/* ============================================================ */}
      <section>
        <EngineHealthIndexCard
          result={data.healthIndex}
        />
      </section>

      {/* Bottom Footer Actions */}
      <div className="flex justify-end gap-2 pt-2 font-mono text-xs">
        <button
          onClick={onEditInputs}
          className="px-4 py-2.5 rounded-xl bg-[#171A1D] hover:bg-[#292D31] border border-[#292D31] text-[#A4A9AF] hover:text-[#F1F2F3] transition cursor-pointer"
        >
          ← Edit Current Inputs
        </button>
        <button
          onClick={onRunAnotherTest}
          className="px-5 py-2.5 rounded-xl bg-[#D66A32] hover:bg-[#D66A32]/90 text-white font-bold transition flex items-center gap-2 cursor-pointer shadow-lg shadow-[#D66A32]/20"
        >
          <RotateCcw className="w-4 h-4" />
          <span>New Diagnostic Run →</span>
        </button>
      </div>
    </div>
  );
};
