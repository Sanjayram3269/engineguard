/**
 * EngineHealthIndex.ts
 *
 * Truthful, mathematically rigorous implementation of the Engine Health Index (EHI)
 * as defined in Part 6 of the EnginePulse Master Execution Specification.
 *
 * Weights (heuristic prototype):
 * - Tabular:   W_E = 0.697
 * - Audio:     W_A = 0.084
 * - Vibration: W_V = 0.219
 *
 * Formula:
 * EHI = 100 * (1 - (0.697*I_E*R_E + 0.084*I_A*R_A + 0.219*I_V*R_V) / (0.697*I_E + 0.084*I_A + 0.219*I_V))
 */

export const EHI_WEIGHTS = {
  tabular: 0.697,
  audio: 0.084,
  vibration: 0.219,
} as const;

export const EHI_INTERPRETATION_WARNING =
  "This is a provisional model-output-based fault-evidence index, not a scientifically calibrated measurement of physical engine health, probability of failure, or remaining useful life. A score of 100 means the applicable models returned their mapped no-fault predictions; it does not prove the engine is fault-free. A score of 0 means the applicable models returned their mapped fault predictions; it does not mean the engine has zero physical health. The weights are heuristic and require validation against real engine-fault data.";

export interface StreamRiskResult {
  stream: 'tabular' | 'audio' | 'vibration';
  available: boolean;
  rawPrediction?: string | null;
  mappedClass?: string | null;
  risk: number | null; // 0 (no fault), 1 (fault), or null (excluded/unavailable)
  isApplicable: boolean;
  weight: number;
  normalizedWeightPercent?: number;
  exclusionReason?: string | null;
}

export interface FormulaStepDetails {
  I_E: number;
  I_A: number;
  I_V: number;
  R_E: number | null;
  R_A: number | null;
  R_V: number | null;
  numerator: number;
  denominator: number;
  ratio: number;
  substitutionString: string;
  interpretationText: string;
}

export interface EngineHealthIndexResult {
  score: number | null; // 0 to 100 (null if no applicable data)
  scoreFormatted: string; // "100.0", "76.1", or "Unavailable"
  isAvailable: boolean;
  contributingStreamsCount: number;
  applicableWeightTotal: number;
  weightedRiskTotal: number;
  formulaDetails: FormulaStepDetails;
  streams: {
    tabular: StreamRiskResult;
    audio: StreamRiskResult;
    vibration: StreamRiskResult;
  };
  interpretationWarning: string;
}

/**
 * Maps a tabular model prediction string or numeric class to a risk value.
 *
 * Mapping per Part 2.1 & 6.1:
 * Class 0 / "Normal (no fault)" -> "No fault", Risk = 0
 * Class 1 / "Fault type 1"     -> "Rich mixture", Risk = 1
 * Class 2 / "Fault type 2"     -> "Lean mixture", Risk = 1
 * Class 3 / "Fault type 3"     -> "Low voltage", Risk = 1
 */
export function mapTabularPrediction(prediction: string | number | null | undefined): {
  mappedClass: string;
  risk: number | null;
  isApplicable: boolean;
  exclusionReason?: string;
} {
  if (prediction === null || prediction === undefined) {
    return { mappedClass: 'Not provided', risk: null, isApplicable: false, exclusionReason: 'No tabular prediction provided' };
  }

  const pStr = String(prediction).trim().toLowerCase();

  if (pStr === '0' || pStr === 'normal (no fault)' || pStr === 'no fault' || pStr.includes('normal')) {
    return { mappedClass: 'No fault', risk: 0, isApplicable: true };
  }
  if (pStr === '1' || pStr === 'fault type 1' || pStr === 'rich mixture' || pStr.includes('type 1') || pStr.includes('rich')) {
    return { mappedClass: 'Rich mixture', risk: 1, isApplicable: true };
  }
  if (pStr === '2' || pStr === 'fault type 2' || pStr === 'lean mixture' || pStr.includes('type 2') || pStr.includes('lean')) {
    return { mappedClass: 'Lean mixture', risk: 1, isApplicable: true };
  }
  if (pStr === '3' || pStr === 'fault type 3' || pStr === 'low voltage' || pStr.includes('type 3') || pStr.includes('voltage')) {
    return { mappedClass: 'Low voltage', risk: 1, isApplicable: true };
  }

  return {
    mappedClass: String(prediction),
    risk: null,
    isApplicable: false,
    exclusionReason: `Unknown tabular class '${prediction}'`
  };
}

/**
 * Maps an audio model prediction string to a risk value.
 *
 * Mapping per Part 2.2 & 6.1:
 * "Normal engine"     -> Risk = 0
 * "Engine issue"      -> Risk = 1
 * "Non-engine issue"  -> Risk = null (EXCLUDED from calculation)
 */
export function mapAudioPrediction(prediction: string | null | undefined): {
  mappedClass: string;
  risk: number | null;
  isApplicable: boolean;
  exclusionReason?: string;
} {
  if (!prediction) {
    return { mappedClass: 'Not provided', risk: null, isApplicable: false, exclusionReason: 'No audio prediction provided' };
  }

  const pStr = prediction.trim().toLowerCase();

  if (pStr === 'normal engine' || pStr === 'normal' || pStr.includes('normal')) {
    return { mappedClass: 'Normal engine', risk: 0, isApplicable: true };
  }
  if (pStr === 'engine issue' || pStr === 'engine issue detected' || pStr.includes('issue') && !pStr.includes('non-engine')) {
    return { mappedClass: 'Engine issue', risk: 1, isApplicable: true };
  }
  if (pStr === 'non-engine issue' || pStr.includes('non-engine')) {
    return {
      mappedClass: 'Non-engine issue',
      risk: null,
      isApplicable: false,
      exclusionReason: 'Non-engine issue excluded from Engine Health Index calculation per Part 6.1'
    };
  }

  return {
    mappedClass: prediction,
    risk: null,
    isApplicable: false,
    exclusionReason: `Unknown audio class '${prediction}'`
  };
}

/**
 * Maps a vibration model prediction string to a risk value.
 *
 * Mapping per Part 2.3 & 6.1:
 * "Healthy" / "Healthy bearing" -> Risk = 0
 * "Faulty" / "Faulty bearing"   -> Risk = 1
 */
export function mapVibrationPrediction(prediction: string | null | undefined): {
  mappedClass: string;
  risk: number | null;
  isApplicable: boolean;
  exclusionReason?: string;
} {
  if (!prediction) {
    return { mappedClass: 'Not provided', risk: null, isApplicable: false, exclusionReason: 'No vibration prediction provided' };
  }

  const pStr = prediction.trim().toLowerCase();

  if (pStr === 'healthy bearing' || pStr === 'healthy') {
    return { mappedClass: 'Healthy bearing', risk: 0, isApplicable: true };
  }
  if (pStr === 'faulty bearing' || pStr === 'faulty' || pStr.includes('fault')) {
    return { mappedClass: 'Faulty bearing', risk: 1, isApplicable: true };
  }

  return {
    mappedClass: prediction,
    risk: null,
    isApplicable: false,
    exclusionReason: `Unknown vibration class '${prediction}'`
  };
}

/**
 * Exact implementation of the Engine Health Index (EHI) calculation formula.
 */
export function calculateEngineHealthIndex(inputs: {
  tabularPrediction?: string | number | null;
  audioPrediction?: string | null;
  vibrationPrediction?: string | null;
}): EngineHealthIndexResult {
  const tabMap = mapTabularPrediction(inputs.tabularPrediction);
  const audMap = mapAudioPrediction(inputs.audioPrediction);
  const vibMap = mapVibrationPrediction(inputs.vibrationPrediction);

  const tabStream: StreamRiskResult = {
    stream: 'tabular',
    available: inputs.tabularPrediction !== null && inputs.tabularPrediction !== undefined,
    rawPrediction: inputs.tabularPrediction !== null && inputs.tabularPrediction !== undefined ? String(inputs.tabularPrediction) : null,
    mappedClass: tabMap.mappedClass,
    risk: tabMap.risk,
    isApplicable: tabMap.isApplicable,
    weight: EHI_WEIGHTS.tabular,
    exclusionReason: tabMap.exclusionReason
  };

  const audStream: StreamRiskResult = {
    stream: 'audio',
    available: Boolean(inputs.audioPrediction),
    rawPrediction: inputs.audioPrediction || null,
    mappedClass: audMap.mappedClass,
    risk: audMap.risk,
    isApplicable: audMap.isApplicable,
    weight: EHI_WEIGHTS.audio,
    exclusionReason: audMap.exclusionReason
  };

  const vibStream: StreamRiskResult = {
    stream: 'vibration',
    available: Boolean(inputs.vibrationPrediction),
    rawPrediction: inputs.vibrationPrediction || null,
    mappedClass: vibMap.mappedClass,
    risk: vibMap.risk,
    isApplicable: vibMap.isApplicable,
    weight: EHI_WEIGHTS.vibration,
    exclusionReason: vibMap.exclusionReason
  };

  let weightedRisk = 0.0;
  let applicableWeight = 0.0;
  let contributingCount = 0;

  if (tabStream.isApplicable && tabStream.risk !== null) {
    weightedRisk += EHI_WEIGHTS.tabular * tabStream.risk;
    applicableWeight += EHI_WEIGHTS.tabular;
    contributingCount++;
  }

  if (audStream.isApplicable && audStream.risk !== null) {
    weightedRisk += EHI_WEIGHTS.audio * audStream.risk;
    applicableWeight += EHI_WEIGHTS.audio;
    contributingCount++;
  }

  if (vibStream.isApplicable && vibStream.risk !== null) {
    weightedRisk += EHI_WEIGHTS.vibration * vibStream.risk;
    applicableWeight += EHI_WEIGHTS.vibration;
    contributingCount++;
  }

  // Calculate normalized weight percentages for UI display
  if (applicableWeight > 0) {
    if (tabStream.isApplicable) {
      tabStream.normalizedWeightPercent = (EHI_WEIGHTS.tabular / applicableWeight) * 100;
    }
    if (audStream.isApplicable) {
      audStream.normalizedWeightPercent = (EHI_WEIGHTS.audio / applicableWeight) * 100;
    }
    if (vibStream.isApplicable) {
      vibStream.normalizedWeightPercent = (EHI_WEIGHTS.vibration / applicableWeight) * 100;
    }
  }

  let score: number | null = null;
  let scoreFormatted = 'Unavailable';
  const isAvailable = applicableWeight > 0;

  if (isAvailable) {
    // Exact formula: 100 * (1 - weightedRisk / applicableWeight)
    score = 100.0 * (1.0 - (weightedRisk / applicableWeight));
    // Guard against floating point boundary slips (<0 or >100)
    score = Math.max(0.0, Math.min(100.0, score));
    scoreFormatted = score.toFixed(1);
  }

  const I_E = (tabStream.isApplicable && tabStream.risk !== null) ? 1 : 0;
  const I_A = (audStream.isApplicable && audStream.risk !== null) ? 1 : 0;
  const I_V = (vibStream.isApplicable && vibStream.risk !== null) ? 1 : 0;

  const R_E = I_E === 1 ? tabStream.risk : null;
  const R_A = I_A === 1 ? audStream.risk : null;
  const R_V = I_V === 1 ? vibStream.risk : null;

  const numerator = (I_E * EHI_WEIGHTS.tabular * (R_E ?? 0)) +
                    (I_A * EHI_WEIGHTS.audio * (R_A ?? 0)) +
                    (I_V * EHI_WEIGHTS.vibration * (R_V ?? 0));
  const denominator = (I_E * EHI_WEIGHTS.tabular) +
                      (I_A * EHI_WEIGHTS.audio) +
                      (I_V * EHI_WEIGHTS.vibration);
  const ratio = denominator > 0 ? (numerator / denominator) : 0;

  let interpretationText = '';
  if (!isAvailable) {
    interpretationText = 'No applicable models provided data. Denominator is 0, so index is Unavailable (never substituted with zero).';
  } else if (score === 100.0) {
    interpretationText = '100: No applicable model detected a fault (all active R_i = 0).';
  } else if (score === 0.0) {
    interpretationText = '0: All applicable models detected a fault (all active R_i = 1).';
  } else {
    interpretationText = `Between 0 and 100: A weighted combination of fault signals (${scoreFormatted}/100).`;
  }

  const substitutionString = isAvailable
    ? `EHI = 100 × (1 - (${(I_E * EHI_WEIGHTS.tabular * (R_E ?? 0)).toFixed(3)} + ${(I_A * EHI_WEIGHTS.audio * (R_A ?? 0)).toFixed(3)} + ${(I_V * EHI_WEIGHTS.vibration * (R_V ?? 0)).toFixed(3)}) / (${(I_E * EHI_WEIGHTS.tabular).toFixed(3)} + ${(I_A * EHI_WEIGHTS.audio).toFixed(3)} + ${(I_V * EHI_WEIGHTS.vibration).toFixed(3)})) = 100 × (1 - ${(ratio).toFixed(3)}) = ${scoreFormatted}`
    : 'Denominator = 0 (No applicable models) → EHI Unavailable';

  return {
    score,
    scoreFormatted,
    isAvailable,
    contributingStreamsCount: contributingCount,
    applicableWeightTotal: applicableWeight,
    weightedRiskTotal: weightedRisk,
    formulaDetails: {
      I_E,
      I_A,
      I_V,
      R_E,
      R_A,
      R_V,
      numerator,
      denominator,
      ratio,
      substitutionString,
      interpretationText,
    },
    streams: {
      tabular: tabStream,
      audio: audStream,
      vibration: vibStream,
    },
    interpretationWarning: EHI_INTERPRETATION_WARNING,
  };
}
