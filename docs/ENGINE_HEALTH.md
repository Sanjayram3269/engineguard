# Engine Health Index (EHI) and sensor-based fault-risk experiment

This document covers two separate components built on `data/engine_data.csv`.
Neither replaces the existing EngineFaultDB classifier, and neither is a validated measure of engine health.

## 1. Engine Health Index (prototype, 0–100)

**What it is:** a deviation score. It measures how far a reading sits from the typical normal-condition values across six sensors. It is **not** a validated engine health measurement, remaining-life estimate, or failure probability.

**Method**

1. Reference: from normal-labelled training rows only (`Engine Condition == 0`, 80% split, random_state=42). Per sensor, the median and a robust scale (IQR / 1.349).
2. Robust deviation per sensor: `z = (x - median) / scale`.
3. Combined deviation: `D = sqrt(mean z²)` over the available sensors.
4. Score: `100 / (1 + D)`. 100 = every sensor at the normal median. Higher = closer to the normal reference.

The score never uses the label.

**Status and reasons (report command)**

- Status: "Within normal range" if the score is at least the 5th percentile of normal training scores; otherwise "Outside normal range". This cut-off comes from the normal training data, not from engineering specifications.
- Reasons for concern: sensors more than 2 robust units from the normal median (a statistical convention, not an engineering threshold), and sensors outside the normal training range.

**Limitations**

- Direction is ignored: a sensor high and a sensor low count the same.
- It cannot say which sensor is faulty, only which sensors are unusual.
- Operating conditions (RPM) change normal values, so deviation can reflect operating mix rather than damage.
- Missing sensors shrink the average, so scores with fewer sensors aren't directly comparable.

**Validation status:** held-out ROC AUC for normal vs faulty rows = **0.506** (95% CI 0.485–0.526). This is chance level, so the index does not separate the labelled groups.

## 2. Sensor-based fault-risk experiment (separate from EHI)

**Question:** can any approach separate normal from faulty rows better than the EHI?

**Protocol**

- Stratified split 60% train / 20% validation / 20% test, random_state=42.
- All scalers, regressions, references, and models are fit on training rows only.
- Candidates are compared on validation AUC only.
- The test split is scored once, for the baselines and the selected candidate.
- Test AUC is reported with a bootstrap 95% confidence interval.

**Candidates and validation AUC**

| Candidate | Validation AUC |
|---|---:|
| Gradient boosting + sensor/RPM ratios | **0.704** (selected) |
| RPM-adjusted logistic | 0.690 |
| Logistic, raw sensors | 0.690 |
| Engine rpm only (baseline) | 0.672 |
| RPM-adjusted deviation | 0.523 |
| EHI deviation (current baseline) | 0.505 |

**Held-out test results (touched once)**

| Model | Test AUC | 95% CI | Average precision |
|---|---:|---|---:|
| EHI deviation (baseline) | 0.506 | 0.485–0.526 | 0.621 |
| Engine rpm only (baseline) | 0.669 | 0.653–0.686 | 0.781 |
| **Gradient boosting + ratios (selected)** | **0.698** | **0.683–0.714** | **0.799** |

Average precision baseline (random ranking) equals the faulty share of the test set, about 0.63.

**What changed, and why**

- The EHI scores deviation in both directions and treats all six sensors equally. Five of the six carry almost no deviation signal on their own.
- Engine RPM is the strongest single signal. Lower RPM goes with faulty rows.
- Within each RPM band, fuel pressure is consistently higher in faulty rows, lub oil temperature is consistently lower, and lub oil pressure is consistently higher. This pattern holds across the RPM octiles of the training data.
- Ablation on validation: gradient boosting without RPM reaches 0.613, and logistic regression on the five non-RPM sensors reaches 0.600. So the non-RPM sensors carry real signal, mostly through interactions, but RPM adds about 0.09 AUC on top.

**Why the improvement is credible, and its limits**

- Chosen on validation data; the test split was scored once, with confidence intervals.
- The gain over the RPM-only baseline is small: about 0.03 AUC, and the two confidence intervals barely overlap. It should not be described as a large improvement.
- The gain over the EHI is large (0.51 to 0.70), but the EHI is an unsupervised deviation score that was never designed to separate labels.
- The split is random. The file's row order is not label-blocked (9,107 label runs, close to random), so leakage from row order is unlikely. Related operating conditions can still appear in both train and test, because there are no engine or recording IDs. Test performance may overstate performance on unseen engines.
- This model learns the binary label. Its output is a normal/faulty risk ranking, **not** engine health.

## 3. What is needed for a validated engine health measure

- Engine or recording IDs, so splits can keep each engine's data together.
- Time history per engine, to show degradation.
- Ground-truth health labels from inspection, measurement (for example, compression or wear measurements), or run-to-failure records, plus remaining useful life where available.
- Operating context (load, ambient temperature, engine hours) so wear can be separated from normal operating variation.

## 4. Running the experiment

```powershell
python -m src.engine_health.experiments --csv data\engine_data.csv
```

This writes `reports\experiments\auc_experiment_report.json`.

## 5. Notes on the existing project

- The existing EngineFaultDB classifier (`src\train_model.py`) and its artifacts are unchanged. It reads `data\EngineFaultDB_Final.csv`, which is not in the checkout.
- `train_model.py` imports `xgboost`, which is not listed in `requirements.txt`. Add it if you need to run that script.
- The top-level README still describes EngineFaultDB only. It should point to this document for the engine health work.
