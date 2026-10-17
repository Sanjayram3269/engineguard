import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { generateSyntheticBearingRows, syntheticRowsToCsv } from '../src/lib/rulSimulation.ts';

const outputDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '../../data');
const input = {
  currentOdometerKm: 85000,
  bearingInstallOdometerKm: 20000,
  currentRms: 1.1,
  healthyRms: 0.68,
  inspectionRms: 2.45,
  assumedMedianLifeKm: 120000,
  dutyProfile: 'normal' as const,
};
const rows = generateSyntheticBearingRows(input);
writeFileSync(resolve(outputDirectory, 'synthetic_bearing_rul_demo.csv'), syntheticRowsToCsv(rows) + '\n');
writeFileSync(resolve(outputDirectory, 'synthetic_bearing_rul_demo.metadata.json'), JSON.stringify({
  description: 'Synthetic bearing wear curves for pipeline demonstration only; no measured run-to-failure mileage.',
  label_source: 'synthetic',
  generated_by: 'frontend/src/lib/rulSimulation.ts',
  virtual_bearings: 600,
  samples_per_bearing: 13,
  random_seed: 20261017,
  assumptions: {
    healthy_rms_demo_preset: input.healthyRms,
    inspection_rms_demo_preset: input.inspectionRms,
    assumed_median_inspection_age_km: input.assumedMedianLifeKm,
    duty_profile: input.dutyProfile,
    virtual_life_lognormal_sigma: 0.38,
    heavy_use_life_multiplier: 0.75,
  },
  warning: 'Do not claim real-world RUL accuracy or safe-to-drive distance from this dataset.',
}, null, 2) + '\n');
console.log(`Wrote ${rows.length} synthetic bearing rows to ${outputDirectory}`);
