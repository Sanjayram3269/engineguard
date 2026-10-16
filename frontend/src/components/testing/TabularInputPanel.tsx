import React, { useState, useCallback, useEffect } from 'react';
import { RotateCcw, AlertTriangle, Gauge, Activity, Fuel, Flame, Wind } from 'lucide-react';
import { TabularEngineData } from '../../types/diagnosis';
import {
  TELEMETRY_FEATURE_DEFS,
  TELEMETRY_CATEGORIES,
  VERIFIED_DATASET_EXAMPLES,
  validateTabularInputs,
  tabularDataToFormStrings,
  type TelemetryFeatureDef,
  type ValidationResult
} from '../../lib/tabularValidation';

interface TabularInputPanelProps {
  onSubmit?: (data: TabularEngineData) => void;
  onChange?: (data: TabularEngineData) => void;
  isAnalyzing?: boolean;
  initialData?: TabularEngineData | null;
  hideSubmitButton?: boolean;
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  intake: <Gauge className="w-3 h-3 text-[#D66A32]" />,
  kinematics: <Activity className="w-3 h-3 text-[#D66A32]" />,
  fuel: <Fuel className="w-3 h-3 text-[#D66A32]" />,
  combustion: <Flame className="w-3 h-3 text-[#D66A32]" />,
  emissions: <Wind className="w-3 h-3 text-[#D66A32]" />
};

function SensorField({
  def,
  value,
  error,
  warning,
  onChange
}: {
  def: TelemetryFeatureDef;
  value: string;
  error?: string;
  warning?: string;
  onChange: (key: string, val: string) => void;
}) {
  return (
    <div className="space-y-0.5">
      <div className="flex items-baseline justify-between gap-2">
        <label className="text-[11px] text-[#A4A9AF] truncate" title={def.description}>
          {def.shortName} <span className="text-red-400/70">*</span>
        </label>
        <span className="text-[10px] text-[#737A82] font-mono flex-shrink-0">{def.unit}</span>
      </div>
      <input
        type="text"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(def.key, e.target.value)}
        placeholder={`${def.minObserved} – ${def.maxObserved}`}
        className={`w-full px-2.5 py-1.5 rounded-lg text-[11px] font-mono bg-[#101214] border outline-none transition placeholder:text-[#292D31] text-[#F1F2F3] ${
          error
            ? 'border-red-500/60 focus:border-red-400'
            : warning
            ? 'border-amber-500/40 focus:border-amber-400'
            : 'border-[#292D31] focus:border-[#D66A32]'
        }`}
      />
      {error && (
        <p className="text-[10px] text-red-400 leading-tight pl-0.5">{error}</p>
      )}
      {!error && warning && (
        <p className="text-[10px] text-amber-400 leading-tight pl-0.5">{warning}</p>
      )}
    </div>
  );
}

export const TabularInputPanel: React.FC<TabularInputPanelProps> = ({
  onSubmit,
  onChange,
  isAnalyzing,
  initialData,
  hideSubmitButton,
}) => {
  const [formValues, setFormValues] = useState<Record<string, string>>(() => {
    if (initialData) return tabularDataToFormStrings(initialData);
    const empty: Record<string, string> = {};
    for (const def of TELEMETRY_FEATURE_DEFS) empty[def.key] = '';
    return empty;
  });

  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [activeExampleId, setActiveExampleId] = useState<string | null>(null);

  // Re-populate if initialData changes externally
  useEffect(() => {
    if (initialData) {
      setFormValues(tabularDataToFormStrings(initialData));
      setValidation(null);
    }
  }, [initialData]);

  const handleFieldChange = useCallback((key: string, val: string) => {
    setFormValues(prev => {
      const updated = { ...prev, [key]: val };
      const parsed = validateTabularInputs(updated);
      if (parsed.isValid && parsed.data && onChange) {
        onChange(parsed.data);
      }
      return updated;
    });
    setActiveExampleId(null);
    if (validation) {
      setValidation(prev => {
        if (!prev) return prev;
        const newErrors = { ...prev.fieldErrors };
        delete newErrors[key as keyof TabularEngineData];
        return { ...prev, fieldErrors: newErrors };
      });
    }
  }, [validation, onChange]);

  const handleLoadExample = useCallback((exampleId: string) => {
    const example = VERIFIED_DATASET_EXAMPLES.find(e => e.id === exampleId);
    if (!example) return;
    setFormValues(tabularDataToFormStrings(example.data));
    setActiveExampleId(exampleId);
    setValidation(null);
    if (onChange) {
      onChange(example.data);
    }
  }, [onChange]);

  const handleReset = useCallback(() => {
    const empty: Record<string, string> = {};
    for (const def of TELEMETRY_FEATURE_DEFS) empty[def.key] = '';
    setFormValues(empty);
    setActiveExampleId(null);
    setValidation(null);
  }, []);

  const handleSubmit = useCallback(() => {
    const result = validateTabularInputs(formValues);
    setValidation(result);
    if (result.isValid && result.data && onSubmit) {
      onSubmit(result.data);
    }
  }, [formValues, onSubmit]);

  // Group features by category
  const groupedFeatures = TELEMETRY_CATEGORIES.map(cat => ({
    ...cat,
    features: TELEMETRY_FEATURE_DEFS.filter(d => d.category === cat.id)
  }));

  return (
    <div className="space-y-3">
      {/* Load Example Pills */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono uppercase tracking-wider text-[#737A82]">
            Load Verified Dataset Record
          </span>
          <button
            onClick={handleReset}
            className="text-[10px] font-mono text-[#737A82] hover:text-[#F1F2F3] flex items-center gap-1 transition cursor-pointer"
          >
            <RotateCcw className="w-2.5 h-2.5" /> Clear All
          </button>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {VERIFIED_DATASET_EXAMPLES.map(ex => {
            const isActive = activeExampleId === ex.id;
            return (
              <button
                key={ex.id}
                onClick={() => handleLoadExample(ex.id)}
                className={`text-left px-2.5 py-1.5 rounded-lg border text-[10px] transition cursor-pointer ${
                  isActive
                    ? 'bg-[#171A1D] border-[#D66A32] text-[#F1F2F3]'
                    : 'bg-[#0C0E10] border-[#292D31] text-[#A4A9AF] hover:border-[#737A82]/60 hover:text-[#F1F2F3]'
                }`}
              >
                <span className="font-semibold block truncate">{ex.name}</span>
                <span className="text-[#737A82] font-mono block mt-0.5 truncate">{ex.operatingPoint}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="h-[1px] bg-[#292D31]" />

      {/* Validation Summary Error Banner */}
      {validation && !validation.isValid && validation.summaryError && (
        <div className="p-2.5 rounded-lg bg-red-950/50 border border-red-500/40 text-red-200 text-[11px] flex items-start gap-2">
          <AlertTriangle className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5" />
          <span>{validation.summaryError}</span>
        </div>
      )}

      {/* Sensor Input Groups */}
      <div className="space-y-3">
        {groupedFeatures.map(group => (
          <div key={group.id} className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase text-[#737A82] tracking-wider">
              {CATEGORY_ICONS[group.id]} {group.label}
            </div>
            <div className={`grid gap-2 ${group.features.length <= 2 ? 'grid-cols-2' : 'grid-cols-2'}`}>
              {group.features.map(def => (
                <SensorField
                  key={def.key}
                  def={def}
                  value={formValues[def.key] || ''}
                  error={validation?.fieldErrors[def.key]}
                  warning={validation?.fieldWarnings[def.key]}
                  onChange={handleFieldChange}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Advisory Warning Banner (when valid but out-of-range warnings exist) */}
      {validation && validation.isValid && validation.warningCount > 0 && (
        <div className="p-2.5 rounded-lg bg-amber-950/40 border border-amber-500/30 text-amber-200 text-[11px] flex items-start gap-2">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
          <span>
            {validation.warningCount} value{validation.warningCount > 1 ? 's' : ''} outside observed training range — model predictions may be less reliable.
          </span>
        </div>
      )}

      {/* Submit Button */}
      {!hideSubmitButton && (
        <button
          onClick={handleSubmit}
          disabled={isAnalyzing}
          className={`w-full py-3 px-4 rounded-xl font-mono font-bold text-xs tracking-wider uppercase transition flex items-center justify-center gap-2 cursor-pointer ${
            isAnalyzing
              ? 'bg-[#D66A32]/50 text-white/60 cursor-not-allowed'
              : 'bg-[#D66A32] hover:bg-[#D66A32]/90 text-white shadow-lg shadow-[#D66A32]/20'
          }`}
        >
          {isAnalyzing ? (
            <>
              <div className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
              <span>Processing…</span>
            </>
          ) : (
            <span>Run Diagnostic Inference →</span>
          )}
        </button>
      )}
    </div>
  );
};
