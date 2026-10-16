# EngineGuard Model Artifacts

This directory stores trained model artifacts for the EngineGuard modules.

## Current model sets

- `benchmark_classifier_compressed.joblib` — tabular engine-fault classifier (telemetry).
- `benchmark_metadata.json` — telemetry classifier metadata and feature contract.
- `vibration_classifier.joblib` — vibration-based bearing-condition classifier.
- `vibration_metadata.json` — vibration classifier metadata and feature contract.
- `audio/` — audio classification models and `audio_metadata.json`.

## Telemetry model

See `benchmark_metadata.json` for the feature contract, class labels, and evaluation
summary. The model is a compressed Random Forest pipeline.

Do not present classes 1-3 as specific fault diagnoses. Their numeric mapping has
not been verified against the source dataset documentation.

## Vibration model

See `vibration_metadata.json`. The classifier predicts a binary bearing-condition
label from tri-axial vibration features. Frequency features are normalized bins,
not calibrated hertz.

Predictions are experimental decision support, not certified diagnostics.

## Audio models

See `audio_metadata.json`. The audio module classifies engine recordings into:

- Engine Issue
- Non engine issue
- Normal engine

The recommended inference artifact is `audio/audio_random_forest_tuned.joblib`.

Audio features are 26 MFCC mean/std values extracted at 22050 Hz mono with
n_mfcc=13, n_fft=2048, hop_length=512.

## Reproducibility

- Telemetry and vibration models are Python/scikit-learn artifacts.
- Audio models depend on librosa for feature extraction.
- Model files are consumed by the corresponding `src/*.py` inference scripts.
- Do not retrain models as part of conflict repair. The existing artifacts are
  preserved as historical baselines.
- Training inputs are not fully included in this repository; some datasets are
  local-only or tracked separately.

## Review notes

- Random Forest scores are not calibrated probabilities.
- The telemetry split does not prove run-independent generalization.
- The vibration dataset is small and has no independent-engine validation.
- The audio dataset is a small collected sample.
