import React from 'react';
import { Sliders, RotateCcw } from 'lucide-react';
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
            Calibrated Engineering Presets
          </label>
          <span className="text-[10px] text-[#737A82] font-mono">5 Baseline Scenarios</span>
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

      {/* Manual Sensor Parameter Controls */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-mono uppercase tracking-wider text-[#A4A9AF] flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-[#D66A32]" />
            Telemetry Channels
          </span>
          <button
            onClick={() => onSelectPreset(TABULAR_PRESETS[0])}
            className="text-[10px] font-mono text-[#737A82] hover:text-[#F1F2F3] flex items-center gap-1 transition"
          >
            <RotateCcw className="w-3 h-3" /> Reset Nominal
          </button>
        </div>

        {/* 1. Engine RPM */}
        <div className="bg-[#101214] p-3 rounded-lg border border-[#292D31]">
          <div className="flex justify-between items-center mb-1.5 text-xs">
            <span className="text-[#A4A9AF]">Engine Speed (RPM)</span>
            <span className="font-mono text-[#F1F2F3] font-medium">{data.rpm} <span className="text-[#737A82] text-[10px]">RPM</span></span>
          </div>
          <input
            type="range"
            min={650}
            max={7200}
            step={50}
            value={data.rpm}
            onChange={(e) => updateField('rpm', parseFloat(e.target.value))}
            className="w-full h-1.5 bg-[#171A1D] rounded appearance-none cursor-pointer accent-[#D66A32]"
          />
          <div className="flex justify-between text-[10px] text-[#737A82] font-mono mt-1">
            <span>650 Idle</span>
            <span>Nominal: 800 - 3500</span>
            <span>7200 Redline</span>
          </div>
        </div>

        {/* 2. Manifold Absolute Pressure (MAP) */}
        <div className="bg-[#101214] p-3 rounded-lg border border-[#292D31]">
          <div className="flex justify-between items-center mb-1.5 text-xs">
            <span className="text-[#A4A9AF]">Manifold Pressure (MAP)</span>
            <span className="font-mono text-[#F1F2F3] font-medium">{data.mapKpa} <span className="text-[#737A82] text-[10px]">kPa</span></span>
          </div>
          <input
            type="range"
            min={25}
            max={240}
            step={1}
            value={data.mapKpa}
            onChange={(e) => updateField('mapKpa', parseFloat(e.target.value))}
            className="w-full h-1.5 bg-[#171A1D] rounded appearance-none cursor-pointer accent-[#D66A32]"
          />
          <div className="flex justify-between text-[10px] text-[#737A82] font-mono mt-1">
            <span>25 Vacuum</span>
            <span>Nominal: 35 - 100</span>
            <span>240 Boost</span>
          </div>
        </div>

        {/* 3. Coolant Temperature */}
        <div className="bg-[#101214] p-3 rounded-lg border border-[#292D31]">
          <div className="flex justify-between items-center mb-1.5 text-xs">
            <span className="text-[#A4A9AF]">Coolant Jacket Temp</span>
            <span className={`font-mono font-medium ${data.coolantTempC > 105 ? 'text-[#D66A32]' : 'text-[#F1F2F3]'}`}>
              {data.coolantTempC} <span className="text-[#737A82] text-[10px]">°C</span>
            </span>
          </div>
          <input
            type="range"
            min={60}
            max={130}
            step={1}
            value={data.coolantTempC}
            onChange={(e) => updateField('coolantTempC', parseFloat(e.target.value))}
            className="w-full h-1.5 bg-[#171A1D] rounded appearance-none cursor-pointer accent-[#D66A32]"
          />
          <div className="flex justify-between text-[10px] text-[#737A82] font-mono mt-1">
            <span>60 Cold</span>
            <span>Nominal: 85 - 95</span>
            <span>130 Critical</span>
          </div>
        </div>

        {/* 4. Oil Pressure */}
        <div className="bg-[#101214] p-3 rounded-lg border border-[#292D31]">
          <div className="flex justify-between items-center mb-1.5 text-xs">
            <span className="text-[#A4A9AF]">Lubricating Oil Pressure</span>
            <span className={`font-mono font-medium ${data.oilPressurePsi < 25 ? 'text-[#D66A32]' : 'text-[#F1F2F3]'}`}>
              {data.oilPressurePsi.toFixed(1)} <span className="text-[#737A82] text-[10px]">PSI</span>
            </span>
          </div>
          <input
            type="range"
            min={10}
            max={85}
            step={0.5}
            value={data.oilPressurePsi}
            onChange={(e) => updateField('oilPressurePsi', parseFloat(e.target.value))}
            className="w-full h-1.5 bg-[#171A1D] rounded appearance-none cursor-pointer accent-[#D66A32]"
          />
          <div className="flex justify-between text-[10px] text-[#737A82] font-mono mt-1">
            <span>10 Collapse</span>
            <span>Nominal: 35 - 65</span>
            <span>85 High</span>
          </div>
        </div>

        {/* 5. Knock Sensor Transducer */}
        <div className="bg-[#101214] p-3 rounded-lg border border-[#292D31]">
          <div className="flex justify-between items-center mb-1.5 text-xs">
            <span className="text-[#A4A9AF]">Knock Transducer Voltage</span>
            <span className={`font-mono font-medium ${data.knockSensorVolts > 2.0 ? 'text-[#D66A32]' : 'text-[#F1F2F3]'}`}>
              {data.knockSensorVolts.toFixed(2)} <span className="text-[#737A82] text-[10px]">V</span>
            </span>
          </div>
          <input
            type="range"
            min={0.1}
            max={4.8}
            step={0.05}
            value={data.knockSensorVolts}
            onChange={(e) => updateField('knockSensorVolts', parseFloat(e.target.value))}
            className="w-full h-1.5 bg-[#171A1D] rounded appearance-none cursor-pointer accent-[#D66A32]"
          />
          <div className="flex justify-between text-[10px] text-[#737A82] font-mono mt-1">
            <span>0.1 Baseline</span>
            <span>Nominal: &lt; 1.0</span>
            <span>4.8 Detonation</span>
          </div>
        </div>

        {/* 6. Intake Air Temp */}
        <div className="bg-[#101214] p-3 rounded-lg border border-[#292D31]">
          <div className="flex justify-between items-center mb-1.5 text-xs">
            <span className="text-[#A4A9AF]">Intake Air Temp (IAT)</span>
            <span className="font-mono text-[#F1F2F3] font-medium">{data.intakeAirTempC} <span className="text-[#737A82] text-[10px]">°C</span></span>
          </div>
          <input
            type="range"
            min={15}
            max={75}
            step={1}
            value={data.intakeAirTempC}
            onChange={(e) => updateField('intakeAirTempC', parseFloat(e.target.value))}
            className="w-full h-1.5 bg-[#171A1D] rounded appearance-none cursor-pointer accent-[#D66A32]"
          />
          <div className="flex justify-between text-[10px] text-[#737A82] font-mono mt-1">
            <span>15 Ambient</span>
            <span>Nominal: 25 - 45</span>
            <span>75 Heat Soak</span>
          </div>
        </div>
      </div>
    </div>
  );
};
