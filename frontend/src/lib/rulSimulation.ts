/**
 * Synthetic bearing wear demonstration. All distances and wear curves below are
 * assumptions, not measured vehicle lifetimes or a validated RUL model.
 */
export type DutyProfile = 'normal' | 'heavy';

export interface RulSimulationInput {
  currentOdometerKm: number;
  bearingInstallOdometerKm: number;
  currentRms: number;
  healthyRms: number;
  inspectionRms: number;
  assumedMedianLifeKm: number;
  dutyProfile: DutyProfile;
}

export interface SyntheticBearingRow {
  bearingId: string;
  dutyProfile: DutyProfile;
  bearingAgeKm: number;
  vibrationRms: number;
  inspectionAgeKm: number;
  rulToInspectionKm: number;
  labelSource: 'synthetic';
}

interface VirtualBearing {
  id: string;
  inspectionAgeKm: number;
  startingRms: number;
  wearExponent: number;
}

export interface RulSimulationResult {
  bearingAgeKm: number;
  medianKm: number;
  lowKm: number;
  highKm: number;
  projectedInspectionOdometerKm: number;
  status: 'normal' | 'inspect-soon' | 'urgent';
  cohortSize: number;
  matchedCount: number;
}

const COHORT_SIZE = 600;
const MATCHED_COUNT = 100;

function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 4294967296;
  };
}

function normalSample(random: () => number): number {
  return Math.sqrt(-2 * Math.log(Math.max(random(), 1e-12))) * Math.cos(2 * Math.PI * random());
}

function clamp(value: number, low: number, high: number): number {
  return Math.min(high, Math.max(low, value));
}

export function validateRulInput(input: RulSimulationInput): string | null {
  const values = [input.currentOdometerKm, input.bearingInstallOdometerKm, input.currentRms,
    input.healthyRms, input.inspectionRms, input.assumedMedianLifeKm];
  if (values.some(value => !Number.isFinite(value))) return 'Enter all numeric inputs.';
  if (input.dutyProfile !== 'normal' && input.dutyProfile !== 'heavy') return 'Select an operating profile.';
  if (input.currentOdometerKm < 0 || input.bearingInstallOdometerKm < 0) return 'Odometer readings cannot be negative.';
  if (input.currentOdometerKm < input.bearingInstallOdometerKm) return 'Current odometer must be at least the bearing installation odometer.';
  if (input.currentRms < 0 || input.healthyRms <= 0) return 'Vibration RMS must be nonnegative and healthy RMS must be positive.';
  if (input.inspectionRms <= input.healthyRms) return 'Inspection RMS must be above healthy RMS.';
  if (input.assumedMedianLifeKm < 1000 || input.assumedMedianLifeKm > 1000000) return 'Assumed median interval must be 1,000 to 1,000,000 km.';
  return null;
}

function makeVirtualCohort(input: RulSimulationInput): VirtualBearing[] {
  const random = seededRandom(20261017);
  const dutyMultiplier = input.dutyProfile === 'heavy' ? 0.75 : 1;
  return Array.from({ length: COHORT_SIZE }, (_, index) => ({
    id: `SIM-${String(index + 1).padStart(4, '0')}`,
    inspectionAgeKm: Math.round(input.assumedMedianLifeKm * dutyMultiplier * clamp(Math.exp(0.38 * normalSample(random)), 0.4, 2.2)),
    startingRms: input.healthyRms * clamp(Math.exp(0.07 * normalSample(random)), 0.8, 1.2),
    wearExponent: clamp(1.4 + 0.4 * normalSample(random), 0.7, 2.3),
  }));
}

function virtualRms(bearing: VirtualBearing, ageKm: number, inspectionRms: number): number {
  const progress = clamp(ageKm / bearing.inspectionAgeKm, 0, 1);
  return bearing.startingRms + (inspectionRms - bearing.startingRms) * Math.pow(progress, bearing.wearExponent);
}

function quantile(sorted: number[], fraction: number): number {
  const position = (sorted.length - 1) * fraction;
  const index = Math.floor(position);
  return sorted[index] + (sorted[Math.min(index + 1, sorted.length - 1)] - sorted[index]) * (position - index);
}

export function simulateBearingRul(input: RulSimulationInput): RulSimulationResult {
  const error = validateRulInput(input);
  if (error) throw new Error(error);

  const ageKm = input.currentOdometerKm - input.bearingInstallOdometerKm;
  const cohort = makeVirtualCohort(input);
  if (input.currentRms >= input.inspectionRms) {
    return {
      bearingAgeKm: ageKm, medianKm: 0, lowKm: 0, highKm: 0,
      projectedInspectionOdometerKm: input.currentOdometerKm,
      status: 'urgent', cohortSize: cohort.length, matchedCount: 0,
    };
  }

  // Compare today's observed RMS with each virtual bearing at the same age.
  // The nearest synthetic trajectories form an illustrative conditional cohort.
  const matches = cohort.map(bearing => ({
    error: Math.abs(input.currentRms - virtualRms(bearing, ageKm, input.inspectionRms)),
    remainingKm: Math.max(0, bearing.inspectionAgeKm - ageKm),
  })).sort((a, b) => a.error - b.error).slice(0, MATCHED_COUNT);
  const remaining = matches.map(match => match.remainingKm).sort((a, b) => a - b);
  const lowKm = Math.round(quantile(remaining, 0.1) / 100) * 100;
  const medianKm = Math.round(quantile(remaining, 0.5) / 100) * 100;
  const highKm = Math.round(quantile(remaining, 0.9) / 100) * 100;
  const wearFraction = (input.currentRms - input.healthyRms) / (input.inspectionRms - input.healthyRms);
  const status = medianKm <= 5000 || wearFraction >= 0.9 ? 'urgent'
    : medianKm <= 20000 || wearFraction >= 0.7 ? 'inspect-soon' : 'normal';

  return {
    bearingAgeKm: ageKm, medianKm, lowKm, highKm,
    projectedInspectionOdometerKm: input.currentOdometerKm + medianKm,
    status, cohortSize: cohort.length, matchedCount: matches.length,
  };
}

export function generateSyntheticBearingRows(input: RulSimulationInput, pointsPerBearing = 12): SyntheticBearingRow[] {
  const error = validateRulInput(input);
  if (error) throw new Error(error);
  const cohort = makeVirtualCohort(input);
  const rows: SyntheticBearingRow[] = [];
  for (const bearing of cohort) {
    for (let point = 0; point <= pointsPerBearing; point++) {
      const bearingAgeKm = Math.round(bearing.inspectionAgeKm * point / pointsPerBearing);
      rows.push({
        bearingId: bearing.id,
        dutyProfile: input.dutyProfile,
        bearingAgeKm,
        vibrationRms: Number(virtualRms(bearing, bearingAgeKm, input.inspectionRms).toFixed(5)),
        inspectionAgeKm: bearing.inspectionAgeKm,
        rulToInspectionKm: bearing.inspectionAgeKm - bearingAgeKm,
        labelSource: 'synthetic',
      });
    }
  }
  return rows;
}

export function syntheticRowsToCsv(rows: SyntheticBearingRow[]): string {
  return [
    'bearing_id,duty_profile,bearing_age_km,vibration_rms,inspection_age_km,rul_to_inspection_km,label_source',
    ...rows.map(row => [row.bearingId, row.dutyProfile, row.bearingAgeKm, row.vibrationRms,
      row.inspectionAgeKm, row.rulToInspectionKm, row.labelSource].join(',')),
  ].join('\n');
}
