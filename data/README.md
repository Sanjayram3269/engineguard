# EngineFaultDB Dataset Card

## Purpose
EngineGuard uses EngineFaultDB for tabular automotive engine fault classification.

## Provenance
- Dataset: EngineFaultDB
- Original publication: Vergara et al., "EngineFaultDB: A Novel Dataset for Automotive Engine Fault Classification and Baseline Results," IEEE Access, 2023.
- Paper: https://doi.org/10.1109/ACCESS.2023.3331316
- Official repository: https://github.com/leoxthomas/EngineFaultDB
- Engine context: C14NE spark-ignition engine studied under controlled laboratory conditions.

## Local Dataset
- File: `EngineFaultDB_Final.csv`
- Original rows: 55,999
- Target column: `Fault`
- Numeric input features: 14
- Missing values: none found in the audit
- Exact duplicate rows: 1 removed during model preparation
- Rows after deduplication: 55,998

## Feature Contract
The model expects these 14 numeric inputs in this order:

1. `MAP`
2. `TPS`
3. `Force`
4. `Power`
5. `RPM`
6. `Consumption L/H`
7. `Consumption L/100KM`
8. `Speed`
9. `CO`
10. `HC`
11. `CO2`
12. `O2`
13. `Lambda`
14. `AFR`

Use the dataset's original measurement units and feature definitions. Do not substitute values with different units.

## Target Labels

The published paper identifies class 0 as no fault and classes 1-3 as
fault types 1-3. It discusses rich-mixture, lean-mixture, and low-voltage
fault scenarios, but the numeric mapping of those three scenarios has not
been verified from the source text examined for this project.

| Fault value | Source-supported name |
|---:|---|
| 0 | Normal (no fault) |
| 1 | Fault type 1 |
| 2 | Fault type 2 |
| 3 | Fault type 3 |

Do not present classes 1-3 as specific fault diagnoses until their numeric
mapping is verified against the source's fault-condition table or dataset
documentation.

## Class Counts
Counts in the original CSV:

| Fault | Rows |
|---:|---:|
| 0 | 16,000 |
| 1 | 10,998 |
| 2 | 15,000 |
| 3 | 14,001 |

## Ordering and Split Limitations
The CSV is ordered in four contiguous blocks by target label. This means row order must not be mistaken for randomized sampling.

A diagnostic comparison found that the median absolute difference between
adjacent rows was lower than for randomly shuffled rows across all 14 numeric
features. For example, the median RPM difference was 41.1195 in the original
order versus 756.3830 after shuffling. This indicates strong local feature
continuity, but does not establish that adjacent rows belong to the same
recording or experiment. Recording-level dependence and leakage therefore
remain unresolved.


The current benchmark removes one exact duplicate and uses a stratified random split:
- Train: 39,198 rows
- Validation: 8,400 rows
- Test: 8,400 rows
- Random state: 42

The CSV does not contain an identified recording, session, or experiment-run column. Therefore, independence between train, validation, and test records cannot be verified from this file alone. Related operating conditions may occur in multiple splits, so test performance may overestimate generalization to unseen runs or vehicles.

Do not describe the current test results as validation on unseen engines, vehicles, or experimental runs.

## Current Reference Benchmark
- Selected model: Random Forest
- Test accuracy: 0.7542
- Test macro F1: 0.7623
- Mean single-row inference latency: approximately 76.7 ms

These scores apply to the current random-split benchmark, not a verified group-held-out evaluation. Random Forest vote scores are not calibrated probabilities.

## Separate Vibration Dataset
The project also plans a separate vibration module using the Case Western Reserve University (CWRU) Bearing Data Center dataset:
https://engineering.case.edu/bearingdatacenter/download-data-file

CWRU is a laboratory rotating-machinery bearing benchmark, not the same dataset or fault taxonomy as EngineFaultDB. Keep its labels and evaluation separate unless a validated mapping is established.

## Audit Notes
- No missing values were found in the audited CSV.
- One exact duplicate was removed during model preparation.
- Feature range checks and physical plausibility checks should be treated as a separate validation task.
- Do not interpret a successful inference call as proof that an arbitrary input is a physically valid engine measurement.
