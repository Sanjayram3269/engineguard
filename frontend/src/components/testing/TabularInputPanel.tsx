import React from 'react';
import { Sliders, RotateCcw, Activity, Gauge, Flame } from 'lucide-react';
import { TabularEngineData, PresetScenario } from '../../types/diagnosis';
import { TABULAR_PRESETS } from '../../lib/diagnosticEngine';

interface TabularInputPanelProps {
  data: TabularEngineData;
  onChange: (data: TabularEngineData) => void;
  onSelectPreset: (preset: PresetScenario<TabularEngineData>) => void;
  activePresetId: string | null;
}

export const TabularInputPanel: React.FC<TabularInputPanelProps> = ({
  data,
  onChange,
  onSelectPreset,
  activePresetId
}) => {
  const updateField = (field: keyof TabularEngineData, value: number) => {
    onChange({
      ...data,
      [field]: value
    });
  };

  return (
    <div className="space-y-5 font-sans">
      {/* Preset Scenario Selector */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-[11px] font-mono uppercase tracking-wider text-[#A4A9AF]">
            Calibrated Dataset Presets (EngineFaultDB)
          </label>
          <span className="text-[10px] text-[#737A82] font-mono">4 Real Scenarios</span>
        </div>
        <div className="grid grid-cols-1 gap-1.5">
          {TABULAR_PRESETS.map((preset) => {
            const isSelected = activePresetId === preset.id;
            return (
              <button
                key={preset.id}
                onClick={() => onSelectPreset(preset)}
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
                      ACTIVE
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

      {/* Manual Sensor Parameter Controls (14 Real Model Channels) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-mono uppercase tracking-wider text-[#A4A9AF] flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-[#D66A32]" />
            14 Real Telemetry Channels
          </span>
          <button
            onClick={() => onSelectPreset(TABULAR_PRESETS[0])}
            className="text-[10px] font-mono text-[#737A82] hover:text-[#F1F2F3] flex items-center gap-1 transition"
          >
            <RotateCcw className="w-3 h-3" /> Reset Nominal
          </button>
        </div>

        {/* Section 1: Mechanical & Dynamics */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase text-[#737A82] tracking-wider">
            <Activity className="w-3 h-3 text-[#D66A32]" /> Dynamics & Speed
          </div>

          <div className="grid grid-cols-1 gap-2">
            {/* RPM */}
            <div className="bg-[#101214] p-2.5 rounded-lg border border-[#292D31]">
              <div className="flex justify-between items-center mb-1 text-xs">
                <span className="text-[#A4A9AF]">Engine Speed (RPM)</span>
                <span className="font-mono text-[#F1F2F3] font-medium">{data.RPM} <span className="text-[#737A82] text-[10px]">RPM</span></span>
              </div>
              <input
                type="range"
                min={1000}
                max={5200}
                step={25}
                value={data.RPM}
                onChange={(e) => updateField('RPM', parseFloat(e.target.value))}
                className="w-full h-1.5 bg-[#171A1D] rounded appearance-none cursor-pointer accent-[#D66A32]"
              />
            </div>

            {/* Speed */}
            <div className="bg-[#101214] p-2.5 rounded-lg border border-[#292D31]">
              <div className="flex justify-between items-center mb-1 text-xs">
                <span className="text-[#A4A9AF]">Vehicle Speed</span>
                <span className="font-mono text-[#F1F2F3] font-medium">{data.Speed.toFixed(1)} <span className="text-[#737A82] text-[10px]">km/h</span></span>
              </div>
              <input
                type="range"
                min={20}
                max={110}
                step={0.5}
                value={data.Speed}
                onChange={(e) => updateField('Speed', parseFloat(e.target.value))}
                className="w-full h-1.5 bg-[#171A1D] rounded appearance-none cursor-pointer accent-[#D66A32]"
              />
            </div>

            {/* Force & Power */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-[#101214] p-2.5 rounded-lg border border-[#292D31]">
                <div className="flex justify-between items-center mb-1 text-xs">
                  <span className="text-[#A4A9AF]">Force</span>
                  <span className="font-mono text-[#F1F2F3] font-medium">{data.Force.toFixed(1)} <span className="text-[#737A82] text-[10px]">N</span></span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1500}
                  step={10}
                  value={data.Force}
                  onChange={(e) => updateField('Force', parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-[#171A1D] rounded appearance-none cursor-pointer accent-[#D66A32]"
                />
              </div>

              <div className="bg-[#101214] p-2.5 rounded-lg border border-[#292D31]">
                <div className="flex justify-between items-center mb-1 text-xs">
                  <span className="text-[#A4A9AF]">Power</span>
                  <span className="font-mono text-[#F1F2F3] font-medium">{data.Power.toFixed(1)} <span className="text-[#737A82] text-[10px]">kW</span></span>
                </div>
                <input
                  type="range"
                  min={0.5}
                  max={35}
                  step={0.5}
                  value={data.Power}
                  onChange={(e) => updateField('Power', parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-[#171A1D] rounded appearance-none cursor-pointer accent-[#D66A32]"
                />
              </div>
            </div>

            {/* TPS */}
            <div className="bg-[#101214] p-2.5 rounded-lg border border-[#292D31]">
              <div className="flex justify-between items-center mb-1 text-xs">
                <span className="text-[#A4A9AF]">Throttle Position (TPS)</span>
                <span className="font-mono text-[#F1F2F3] font-medium">{data.TPS.toFixed(2)} <span className="text-[#737A82] text-[10px]">V</span></span>
              </div>
              <input
                type="range"
                min={0.3}
                max={4.2}
                step={0.05}
                value={data.TPS}
                onChange={(e) => updateField('TPS', parseFloat(e.target.value))}
                className="w-full h-1.5 bg-[#171A1D] rounded appearance-none cursor-pointer accent-[#D66A32]"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Manifold & Fuel Flow */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase text-[#737A82] tracking-wider">
            <Gauge className="w-3 h-3 text-[#D66A32]" /> Manifold & Fuel Flow
          </div>

          <div className="grid grid-cols-1 gap-2">
            {/* MAP */}
            <div className="bg-[#101214] p-2.5 rounded-lg border border-[#292D31]">
              <div className="flex justify-between items-center mb-1 text-xs">
                <span className="text-[#A4A9AF]">Manifold Pressure (MAP)</span>
                <span className="font-mono text-[#F1F2F3] font-medium">{data.MAP.toFixed(2)} <span className="text-[#737A82] text-[10px]">bar/V</span></span>
              </div>
              <input
                type="range"
                min={0.4}
                max={4.6}
                step={0.05}
                value={data.MAP}
                onChange={(e) => updateField('MAP', parseFloat(e.target.value))}
                className="w-full h-1.5 bg-[#171A1D] rounded appearance-none cursor-pointer accent-[#D66A32]"
              />
            </div>

            {/* Consumption */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-[#101214] p-2.5 rounded-lg border border-[#292D31]">
                <div className="flex justify-between items-center mb-1 text-xs">
                  <span className="text-[#A4A9AF]">Consumption</span>
                  <span className="font-mono text-[#F1F2F3] font-medium">{data['Consumption L/H'].toFixed(2)} <span className="text-[#737A82] text-[10px]">L/h</span></span>
                </div>
                <input
                  type="range"
                  min={1.5}
                  max={15.0}
                  step={0.1}
                  value={data['Consumption L/H']}
                  onChange={(e) => updateField('Consumption L/H', parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-[#171A1D] rounded appearance-none cursor-pointer accent-[#D66A32]"
                />
              </div>

              <div className="bg-[#101214] p-2.5 rounded-lg border border-[#292D31]">
                <div className="flex justify-between items-center mb-1 text-xs">
                  <span className="text-[#A4A9AF]">Per 100km</span>
                  <span className="font-mono text-[#F1F2F3] font-medium">{data['Consumption L/100KM'].toFixed(1)} <span className="text-[#737A82] text-[10px]">L</span></span>
                </div>
                <input
                  type="range"
                  min={4.0}
                  max={20.0}
                  step={0.1}
                  value={data['Consumption L/100KM']}
                  onChange={(e) => updateField('Consumption L/100KM', parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-[#171A1D] rounded appearance-none cursor-pointer accent-[#D66A32]"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Combustion & Emissions */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase text-[#737A82] tracking-wider">
            <Flame className="w-3 h-3 text-[#D66A32]" /> Combustion & Emissions
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="bg-[#101214] p-2.5 rounded-lg border border-[#292D31]">
              <div className="flex justify-between items-center mb-1 text-xs">
                <span className="text-[#A4A9AF]">Lambda (λ)</span>
                <span className="font-mono text-[#F1F2F3] font-medium">{data.Lambda.toFixed(3)}</span>
              </div>
              <input
                type="range"
                min={0.7}
                max={1.15}
                step={0.005}
                value={data.Lambda}
                onChange={(e) => updateField('Lambda', parseFloat(e.target.value))}
                className="w-full h-1.5 bg-[#171A1D] rounded appearance-none cursor-pointer accent-[#D66A32]"
              />
            </div>

            <div className="bg-[#101214] p-2.5 rounded-lg border border-[#292D31]">
              <div className="flex justify-between items-center mb-1 text-xs">
                <span className="text-[#A4A9AF]">AFR</span>
                <span className="font-mono text-[#F1F2F3] font-medium">{data.AFR.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min={10.2}
                max={16.9}
                step={0.05}
                value={data.AFR}
                onChange={(e) => updateField('AFR', parseFloat(e.target.value))}
                className="w-full h-1.5 bg-[#171A1D] rounded appearance-none cursor-pointer accent-[#D66A32]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="bg-[#101214] p-2.5 rounded-lg border border-[#292D31]">
              <div className="flex justify-between items-center mb-1 text-xs">
                <span className="text-[#A4A9AF]">CO Emission</span>
                <span className="font-mono text-[#F1F2F3] font-medium">{data.CO.toFixed(2)} <span className="text-[#737A82] text-[10px]">%</span></span>
              </div>
              <input
                type="range"
                min={0.4}
                max={10.0}
                step={0.1}
                value={data.CO}
                onChange={(e) => updateField('CO', parseFloat(e.target.value))}
                className="w-full h-1.5 bg-[#171A1D] rounded appearance-none cursor-pointer accent-[#D66A32]"
              />
            </div>

            <div className="bg-[#101214] p-2.5 rounded-lg border border-[#292D31]">
              <div className="flex justify-between items-center mb-1 text-xs">
                <span className="text-[#A4A9AF]">HC Emission</span>
                <span className="font-mono text-[#F1F2F3] font-medium">{Math.round(data.HC)} <span className="text-[#737A82] text-[10px]">ppm</span></span>
              </div>
              <input
                type="range"
                min={5}
                max={950}
                step={5}
                value={data.HC}
                onChange={(e) => updateField('HC', parseFloat(e.target.value))}
                className="w-full h-1.5 bg-[#171A1D] rounded appearance-none cursor-pointer accent-[#D66A32]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="bg-[#101214] p-2.5 rounded-lg border border-[#292D31]">
              <div className="flex justify-between items-center mb-1 text-xs">
                <span className="text-[#A4A9AF]">CO2</span>
                <span className="font-mono text-[#F1F2F3] font-medium">{data.CO2.toFixed(2)} <span className="text-[#737A82] text-[10px]">%</span></span>
              </div>
              <input
                type="range"
                min={8.5}
                max={15.2}
                step={0.1}
                value={data.CO2}
                onChange={(e) => updateField('CO2', parseFloat(e.target.value))}
                className="w-full h-1.5 bg-[#171A1D] rounded appearance-none cursor-pointer accent-[#D66A32]"
              />
            </div>

            <div className="bg-[#101214] p-2.5 rounded-lg border border-[#292D31]">
              <div className="flex justify-between items-center mb-1 text-xs">
                <span className="text-[#A4A9AF]">O2</span>
                <span className="font-mono text-[#F1F2F3] font-medium">{data.O2.toFixed(2)} <span className="text-[#737A82] text-[10px]">%</span></span>
              </div>
              <input
                type="range"
                min={0.2}
                max={1.2}
                step={0.02}
                value={data.O2}
                onChange={(e) => updateField('O2', parseFloat(e.target.value))}
                className="w-full h-1.5 bg-[#171A1D] rounded appearance-none cursor-pointer accent-[#D66A32]"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
