# EngineGuard

EngineGuard is an experimental automotive condition-monitoring project for
multivariable engine telemetry and vibration-based bearing-condition
classification. Audio analysis is a separate module being prepared for
integration.

The project demonstrates a workflow from signal/measurement data through
feature extraction, machine learning, evaluation, and model inference.
It is a research prototype, not a certified vehicle diagnostic or safety
system.

## Current modules

| Module | Input | Output |
|---|---|---|
| Engine telemetry | 14 numeric engine/exhaust measurements | One of four dataset fault labels |
| Vibration | CSV recording with Channels 1, 2, and 3 | Healthy or Faulty bearing condition |
| Audio | To be integrated | Pending teammate handoff and interface verification |

## 1. Engine telemetry

**Dataset:** EngineFaultDB
Source: https://github.com/leoxthomas/EngineFaultDB
Publication: https://doi.org/10.1109/ACCESS.2023.3331316

The audited CSV contains 55,999 rows and 14 numeric input features. One exact
duplicate was removed during benchmark preparation, leaving 55,998 rows.

The selected baseline is a Random Forest. Three models—Random Forest,
Extra Trees, and XGBoost—were compared, with model selection based on
validation macro F1.

| Metric | Held-out random-split result |
|---|---:|
| Accuracy | 75.42% |
| Macro F1 | 76.23% |
| Test rows | 8,400 |
| Mean single-row inference latency | approximately 76.7 ms |

The split was stratified by row, not by recording or experiment. The dataset
does not provide a verified run/session identifier, so generalization to
unseen experiments or vehicles has not been established.

### Telemetry labels

Class 0 is documented as Normal (no fault). Classes 1–3 are kept as generic
fault types because their exact mapping to named physical faults has not
been verified. Do not interpret these classes as confirmed specific diagnoses.

### Telemetry inference

The inference function is in `src/inference.py`. It loads
`models/benchmark_classifier_compressed.joblib` and
`models/benchmark_metadata.json`.

The model's Random Forest vote scores are not calibrated probabilities.
The review threshold is a decision rule, not a guarantee that accepted
predictions are correct.

## 2. Vibration-based bearing condition

**Dataset:** Engine Journal Bearings Dataset 2, stored locally under
`data/vibration_raw/`. The raw dataset is not included in this repository
by default. Confirm the dataset's original source and redistribution terms
before sharing the recordings.

The current feature table contains 134 recordings: 90 Faulty and 44 Healthy.
Three channels are used to extract 27 time-domain and normalized spectral
features per recording. Frequency features are expressed as normalized bins,
not calibrated frequencies in hertz.

A Random Forest with 300 trees and balanced class weights was fitted to all
134 recordings for inference. Its artifact is
`models/vibration_classifier.joblib`, with its schema and metadata in
`models/vibration_metadata.json`.

Historical evaluation reports from the earlier baseline run:

| Evaluation | Accuracy | Balanced accuracy | Macro F1 |
|---|---:|---:|---:|
| Random recording holdout (34 recordings) | 94.12% | 93.28% | 93.28% |
| Five-fold operating-condition-grouped CV | 91.04% | 90.43% | 89.96% |

These historical metrics are not a fresh evaluation of the final fitted
artifact. Condition groups are defined by RPM, humidity, and temperature;
they do not represent independent physical engines or laboratories.
The dataset is small, and external generalization remains unverified.

### Vibration inference and tests

- Feature extraction: `src/vibration_features.py`
- Model training: `src/train_vibration_model.py`
- Inference: `src/vibration_inference.py`
- Raw-recording smoke test: `src/test_vibration_inference.py`

Run from the repository root:

```powershell
python .\src\test_vibration_inference.py
```

The smoke test checks that raw CSV recordings pass through the feature
extractor and saved model and return valid output. It is not an independent
accuracy evaluation.

To rebuild the vibration artifact after obtaining the local feature table:

```powershell
python .\src\train_vibration_model.py
```

The training script refuses to overwrite existing artifacts. The feature
table `data/vibration_features.csv` is generated locally by the feature
extraction workflow and is not committed by default.

## 3. Environment setup

Python 3.11 was used in the current development environment.

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
```

The telemetry dataset and vibration recordings are local inputs and must be
obtained separately. Model artifacts must match their metadata and feature
schemas.

## 4. Limitations

- These models are experimental decision-support components.
- The telemetry random split does not prove run-independent generalization.
- The vibration dataset has only 134 recordings and no independent-engine
  validation.
- Random Forest vote fractions are not calibrated probabilities.
- A successful smoke test verifies execution, not diagnostic reliability.
- The audio model and any multimodal fusion must be evaluated separately
  before they are represented as validated system capabilities.
- Do not use these outputs as a substitute for qualified mechanical
  inspection or safety-critical decisions.

## 5. Engine audio classification

**Module:** Engine audio classification (three-way classification of engine
recordings).

**Classes:** `Engine Issue`, `Non engine issue`, `Normal engine`.

**Inference entry point:** `src/audio_inference.py`, loading
`models/audio/audio_random_forest_tuned.joblib`.

**Feature schema:** 26 MFCC features (`mfcc_1_mean` / `mfcc_1_std` through
`mfcc_13_mean` / `mfcc_13_std`), extracted with librosa at 22050 Hz mono,
`n_mfcc=13`, `n_fft=2048`, `hop_length=512`.

**Model metadata:** `models/audio_metadata.json`.

**Audio dataset:** recordings under `data/Audio/` in three category folders:
`Engine Issue`, `Non engine issue`, `Normal engine`. The audio dataset is a
separate collected sample and is not the same data or taxonomy as the tabular
EngineFaultDB dataset used by the telemetry classifier.

**Running audio inference from the repository root:**

```powershell
python -m pip install -r requirements.txt
python .\src\audio_inference.py ".\data\Audio\Normal engine\002.mp3"
```

**Audio smoke test:**

```powershell
python -m src.test_audio_inference
```

The smoke test loads the real audio model and predicts on a real recording. It
is not an independent accuracy evaluation.

**Limitations:** audio scores are not calibrated probabilities, the dataset is
small, and this module does not map to specific mechanical faults. Integration
with the telemetry and vibration modules and the React frontend is pending.

## 6. Frontend

A React frontend is provided on the `ui` branch. It is currently rule-based
simulation for demonstration and is not wired to the real inference models.

See the `ui` branch for the frontend source and build instructions.
