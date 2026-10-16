import React, { useState } from 'react';
import { Table, FileSpreadsheet, Eye, Info } from 'lucide-react';
import { TabularDataSummary } from '../../lib/tabularCsvSummary';

interface TabularDataSummarySectionProps {
  summary: TabularDataSummary | null;
}

export const TabularDataSummarySection: React.FC<TabularDataSummarySectionProps> = ({ summary }) => {
  const [activeTab, setActiveTab] = useState<'stats' | 'preview'>('stats');

  if (!summary || summary.totalRows === 0) {
    return (
      <div className="bg-[#101214] border border-[#292D31] rounded-2xl p-5 space-y-3 font-sans">
        <div className="flex items-center gap-2 border-b border-[#292D31] pb-3">
          <FileSpreadsheet className="w-4 h-4 text-[#D66A32]" />
          <h3 className="text-sm font-bold text-[#F1F2F3] font-mono uppercase tracking-wider">
            4. Tabular Telemetry Data Summary
          </h3>
        </div>
        <div className="p-4 rounded-xl bg-[#171A1D]/60 border border-[#292D31] text-xs font-mono text-[#737A82] text-center">
          Tabular telemetry unavailable — no data provided.
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#101214] border border-[#292D31] rounded-2xl p-5 space-y-4 font-sans shadow-xl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#292D31] pb-3">
        <div className="flex items-center gap-2.5">
          <FileSpreadsheet className="w-4 h-4 text-[#D66A32]" />
          <div>
            <h3 className="text-sm font-bold text-[#F1F2F3] font-mono uppercase tracking-wider">
              4. Tabular Telemetry Data Summary &amp; Statistics
            </h3>
            <p className="text-[10px] text-[#737A82] font-mono mt-0.5">
              Source: <span className="text-[#F1F2F3] font-semibold">{summary.fileName}</span> •{' '}
              {summary.isSingleObservation ? (
                <span className="text-emerald-400">Single Observation Telemetry Record</span>
              ) : (
                <span>Dataset ({summary.totalRows} rows, {summary.totalColumns} columns)</span>
              )}
            </p>
          </div>
        </div>

        {/* View Toggle */}
        {!summary.isSingleObservation && (
          <div className="flex items-center gap-1 bg-[#0C0E10] p-1 rounded-lg border border-[#292D31] text-[10px] font-mono">
            <button
              onClick={() => setActiveTab('stats')}
              className={`px-2.5 py-1 rounded transition cursor-pointer flex items-center gap-1 ${
                activeTab === 'stats'
                  ? 'bg-[#171A1D] text-[#F1F2F3] border border-[#D66A32]/40'
                  : 'text-[#737A82] hover:text-[#A4A9AF]'
              }`}
            >
              <Table className="w-3 h-3 text-[#D66A32]" /> Descriptive Statistics
            </button>
            <button
              onClick={() => setActiveTab('preview')}
              className={`px-2.5 py-1 rounded transition cursor-pointer flex items-center gap-1 ${
                activeTab === 'preview'
                  ? 'bg-[#171A1D] text-[#F1F2F3] border border-[#D66A32]/40'
                  : 'text-[#737A82] hover:text-[#A4A9AF]'
              }`}
            >
              <Eye className="w-3 h-3 text-[#D66A32]" /> Data Preview (5 Rows)
            </button>
          </div>
        )}
      </div>

      {/* Meta Pills */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] font-mono">
        <div className="bg-[#171A1D] p-2.5 rounded-lg border border-[#292D31]">
          <span className="text-[#737A82] block">Total Rows:</span>
          <span className="text-sm font-bold text-[#F1F2F3]">{summary.totalRows}</span>
        </div>
        <div className="bg-[#171A1D] p-2.5 rounded-lg border border-[#292D31]">
          <span className="text-[#737A82] block">Total Channels / Columns:</span>
          <span className="text-sm font-bold text-[#F1F2F3]">{summary.totalColumns}</span>
        </div>
        <div className="bg-[#171A1D] p-2.5 rounded-lg border border-[#292D31]">
          <span className="text-[#737A82] block">Missing Values:</span>
          <span className={`text-sm font-bold ${summary.totalMissingValues > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
            {summary.totalMissingValues}
          </span>
        </div>
        <div className="bg-[#171A1D] p-2.5 rounded-lg border border-[#292D31]">
          <span className="text-[#737A82] block">Input Mode:</span>
          <span className="text-sm font-bold text-[#D66A32] uppercase">
            {summary.sourceType === 'manual' ? 'Manual Entry' : 'CSV Telemetry'}
          </span>
        </div>
      </div>

      {/* Single observation notice */}
      {summary.isSingleObservation && (
        <div className="p-3 rounded-xl bg-[#171A1D]/80 border border-[#292D31] text-[11px] font-mono text-[#A4A9AF] flex items-center gap-2">
          <Info className="w-4 h-4 text-[#D66A32] flex-shrink-0" />
          <span>
            Single observation submitted. The values below represent exact sensor readings at the point of inspection, not multi-sample averages.
          </span>
        </div>
      )}

      {/* Descriptive Statistics Table */}
      {(summary.isSingleObservation || activeTab === 'stats') && (
        <div className="overflow-x-auto custom-scrollbar border border-[#292D31] rounded-xl">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-[#0C0E10] text-[#737A82] text-[10px] uppercase border-b border-[#292D31]">
              <tr>
                <th className="py-2.5 px-3">Sensor Channel</th>
                <th className="py-2.5 px-3">Type</th>
                {summary.isSingleObservation ? (
                  <th className="py-2.5 px-3">Observed Value</th>
                ) : (
                  <>
                    <th className="py-2.5 px-3">Missing</th>
                    <th className="py-2.5 px-3">Mean</th>
                    <th className="py-2.5 px-3">Std Dev</th>
                    <th className="py-2.5 px-3">Min</th>
                    <th className="py-2.5 px-3">Median</th>
                    <th className="py-2.5 px-3">Max</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#292D31] text-[11px]">
              {summary.columns.map((col, idx) => (
                <tr key={idx} className="hover:bg-[#171A1D]/50 transition">
                  <td className="py-2 px-3 font-semibold text-[#F1F2F3]">{col.name}</td>
                  <td className="py-2 px-3 text-[#737A82] text-[10px]">
                    <span className="px-1.5 py-0.5 rounded bg-[#171A1D] border border-[#292D31]">
                      {col.dataType}
                    </span>
                  </td>
                  {summary.isSingleObservation ? (
                    <td className="py-2 px-3 font-bold text-[#D66A32]">
                      {typeof col.mean === 'number' ? col.mean.toFixed(3) : '—'}
                    </td>
                  ) : (
                    <>
                      <td className="py-2 px-3 text-[#A4A9AF]">
                        {col.missingCount > 0 ? (
                          <span className="text-amber-400 font-semibold">{col.missingCount}</span>
                        ) : (
                          '0'
                        )}
                      </td>
                      <td className="py-2 px-3 text-[#F1F2F3]">
                        {col.mean !== undefined ? col.mean.toFixed(3) : '—'}
                      </td>
                      <td className="py-2 px-3 text-[#A4A9AF]">
                        {col.stdDev !== undefined ? col.stdDev.toFixed(3) : '—'}
                      </td>
                      <td className="py-2 px-3 text-[#A4A9AF]">
                        {col.min !== undefined ? col.min.toFixed(3) : '—'}
                      </td>
                      <td className="py-2 px-3 text-[#A4A9AF]">
                        {col.median !== undefined ? col.median.toFixed(3) : '—'}
                      </td>
                      <td className="py-2 px-3 text-[#A4A9AF]">
                        {col.max !== undefined ? col.max.toFixed(3) : '—'}
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Preview Table (First 5 Rows) */}
      {!summary.isSingleObservation && activeTab === 'preview' && (
        <div className="overflow-x-auto custom-scrollbar border border-[#292D31] rounded-xl">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-[#0C0E10] text-[#737A82] text-[10px] uppercase border-b border-[#292D31]">
              <tr>
                <th className="py-2.5 px-3">#</th>
                {summary.headers.map((h, i) => (
                  <th key={i} className="py-2.5 px-3 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#292D31] text-[11px]">
              {summary.previewRows.map((row, rIdx) => (
                <tr key={rIdx} className="hover:bg-[#171A1D]/50 transition">
                  <td className="py-2 px-3 text-[#737A82] text-[10px]">Row {rIdx + 1}</td>
                  {summary.headers.map((h, cIdx) => (
                    <td key={cIdx} className="py-2 px-3 whitespace-nowrap text-[#F1F2F3]">
                      {typeof row[h] === 'number' ? (row[h] as number).toFixed(3) : String(row[h] ?? '—')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
