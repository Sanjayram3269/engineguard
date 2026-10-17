import React, { useMemo, useState } from 'react';
import { Activity, Download, Gauge } from 'lucide-react';
import {
  DutyProfile, RulSimulationInput, generateSyntheticBearingRows,
  simulateBearingRul, syntheticRowsToCsv, validateRulInput,
} from '../../lib/rulSimulation';

const numberFromField = (value: string): number => value.trim() === '' ? Number.NaN : Number(value);
const km = (value: number): string => Math.round(value).toLocaleString();

export const BearingRulSimulationCard: React.FC = () => {
  const [odometer, setOdometer] = useState('85000');
  const [installedAt, setInstalledAt] = useState('20000');
  const [currentRms, setCurrentRms] = useState('0.68');
  const [healthyRms, setHealthyRms] = useState('0.68');
  const [inspectionRms, setInspectionRms] = useState('2.45');
  const [medianLife, setMedianLife] = useState('120000');
  const [dutyProfile, setDutyProfile] = useState<DutyProfile | ''>('normal');

  const input: RulSimulationInput = {
    currentOdometerKm: numberFromField(odometer),
    bearingInstallOdometerKm: numberFromField(installedAt),
    currentRms: numberFromField(currentRms),
    healthyRms: numberFromField(healthyRms),
    inspectionRms: numberFromField(inspectionRms),
    assumedMedianLifeKm: numberFromField(medianLife),
    dutyProfile: dutyProfile as DutyProfile,
  };
  const error = validateRulInput(input);
  const result = useMemo(() => error ? null : simulateBearingRul(input), [
    error, input.currentOdometerKm, input.bearingInstallOdometerKm, input.currentRms,
    input.healthyRms, input.inspectionRms, input.assumedMedianLifeKm, input.dutyProfile,
  ]);

  const downloadSyntheticCsv = () => {
    if (error) return;
    const csv = syntheticRowsToCsv(generateSyntheticBearingRows(input));
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'engineguard_synthetic_bearing_rul.csv';
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const fieldClass = 'mt-1.5 w-full rounded-lg border border-[#292D31] bg-[#171A1D] px-3 py-2 text-sm text-[#F1F2F3] outline-none focus:border-[#D66A32] font-mono transition';
  const labelClass = 'text-[11px] font-mono font-semibold text-[#A4A9AF]';
  const statusLabel = result?.status === 'urgent' ? 'Urgent inspection' : result?.status === 'inspect-soon' ? 'Inspect soon' : 'Normal monitoring';
  const statusClass = result?.status === 'urgent' ? 'text-red-400 border-red-500/40 bg-red-950/20'
    : result?.status === 'inspect-soon' ? 'text-amber-400 border-amber-500/40 bg-amber-950/20'
      : 'text-emerald-400 border-emerald-500/40 bg-emerald-950/20';

  return (
    <section id="bearing-rul" className="scroll-mt-6 rounded-2xl border border-[#292D31] bg-[#101214] p-5 sm:p-6 shadow-2xl relative overflow-hidden font-sans space-y-4" aria-labelledby="bearing-rul-title">
      <div className="absolute top-0 right-0 w-48 h-48 bg-[#D66A32]/5 rounded-full blur-3xl pointer-events-none" />

      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#292D31] pb-3">
        <div>
          <p className="flex items-center gap-2 text-[10px] font-mono font-bold uppercase tracking-widest text-[#D66A32]">
            <Activity className="h-4 w-4" /> 8. Predictive Maintenance Simulation
          </p>
          <h3 id="bearing-rul-title" className="mt-1 text-lg font-black text-[#F1F2F3] font-mono uppercase tracking-wider">
            Bearing RUL Simulation (Run-to-Threshold Sandbox)
          </h3>
          <p className="mt-1 text-xs text-[#737A82]">
            Adjust the baseline and operating values to simulate distance to your inspection threshold against 600 synthetic trajectories.
          </p>
        </div>
        <span className="rounded-full border border-[#D66A32]/50 bg-[#D66A32]/10 px-3 py-1 text-[10px] font-mono font-bold uppercase tracking-wider text-[#D66A32]">
          Simulation Only • Not Certified Life
        </span>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <label className={labelClass}>Current vehicle odometer (km)
          <input className={fieldClass} type="number" min="0" value={odometer} onChange={event => setOdometer(event.target.value)} />
        </label>
        <label className={labelClass}>Odometer when bearing was installed (km)
          <input className={fieldClass} type="number" min="0" value={installedAt} onChange={event => setInstalledAt(event.target.value)} />
        </label>
        <label className={labelClass}>Current vibration RMS (same sensor units)
          <input className={fieldClass} type="number" min="0" step="any" value={currentRms} onChange={event => setCurrentRms(event.target.value)} />
        </label>
        <label className={labelClass}>Healthy RMS reference
          <input className={fieldClass} type="number" min="0" step="any" value={healthyRms} onChange={event => setHealthyRms(event.target.value)} />
        </label>
        <label className={labelClass}>Inspection RMS threshold
          <input className={fieldClass} type="number" min="0" step="any" value={inspectionRms} onChange={event => setInspectionRms(event.target.value)} />
        </label>
        <label className={labelClass}>Assumed median interval (km)
          <input className={fieldClass} type="number" min="1000" max="1000000" step="1000" value={medianLife} onChange={event => setMedianLife(event.target.value)} />
        </label>
        <label className={labelClass}>Operating profile
          <select className={fieldClass} value={dutyProfile} onChange={event => setDutyProfile(event.target.value as DutyProfile)}>
            <option value="" disabled>Select profile</option>
            <option value="normal">Normal</option>
            <option value="heavy">Heavy use (demo: 25% shorter interval)</option>
          </select>
        </label>
      </div>

      <p className="mt-3 text-[11px] text-[#737A82] font-mono">Use comparable RMS readings in the same sensor units. The result is synthetic and is not safe-to-drive mileage.</p>

      {error ? (
        <div className="mt-5 rounded-xl border border-amber-500/30 bg-amber-950/20 p-4 text-xs font-mono text-amber-300" role="status">
          {error === 'Enter all numeric inputs.' ? 'Complete all fields to see the simulation.' : error}
        </div>
      ) : result && (
        <div className="mt-5 grid gap-4 lg:grid-cols-[1.3fr_1fr]">
          <div className="rounded-xl border border-[#D66A32]/35 bg-[#D66A32]/[0.07] p-5">
            <p className="flex items-center gap-2 text-[10px] font-mono font-bold uppercase tracking-widest text-[#D66A32]">
              <Gauge className="h-4 w-4" /> Simulated distance to inspection threshold
            </p>
            <div className="mt-2 flex flex-wrap items-baseline gap-3">
              <strong className="text-4xl font-black tabular-nums text-[#F1F2F3]">{km(result.medianKm)} <span className="text-lg">km</span></strong>
              <span className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${statusClass}`}>{statusLabel}</span>
            </div>
            <p className="mt-2 text-xs text-[#D66A32] font-mono">
              Illustrative 10th–90th percentile range: <strong>{km(result.lowKm)}–{km(result.highKm)} km</strong>
            </p>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#292D31]" aria-hidden="true">
              <div className="h-full rounded-full bg-[#D66A32]" style={{ width: `${Math.max(2, Math.min(100, 100 * result.medianKm / Math.max(result.highKm, 1)))}%` }} />
            </div>
            <p className="mt-3 text-[11px] text-[#737A82]">Synthetic distance to inspection; not a failure prediction.</p>
          </div>
          <div className="rounded-xl border border-[#292D31] bg-[#171A1D] p-5 text-xs text-[#A4A9AF] font-mono space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#D66A32]">Cohort Simulation Context</p>
            <p className="mt-2">Bearing age: <strong className="text-[#F1F2F3]">{km(result.bearingAgeKm)} km</strong></p>
            <p>Projected inspection odometer: <strong className="text-[#F1F2F3]">{km(result.projectedInspectionOdometerKm)} km</strong></p>
            <p>Evaluated against {result.cohortSize} synthetic wear trajectories ({result.matchedCount} nearest matches).</p>
          </div>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#292D31] pt-4 font-mono text-xs">
        <p className="max-w-2xl text-[11px] leading-relaxed text-[#737A82]">
          Optional: export synthetic training rows for pipeline testing (labeled with label_source: 'synthetic').
        </p>
        <button
          type="button"
          onClick={downloadSyntheticCsv}
          disabled={Boolean(error)}
          className="flex items-center gap-2 rounded-xl bg-[#D66A32] hover:bg-[#D66A32]/90 px-4 py-2 text-xs font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer shadow-lg shadow-[#D66A32]/20"
        >
          <Download className="h-4 w-4" /> Download Synthetic Training CSV
        </button>
      </div>
    </section>
  );
};
