# EngineGuard

EngineGuard is an experimental automotive condition-monitoring project that combines three independent machine-learning workflows in a React dashboard: engine telemetry classification, vibration-based bearing-condition classification, and engine-audio classification.

It demonstrates sensor-data upload, feature extraction, model inference, and diagnostic-result presentation. It is a research prototype—not a certified vehicle diagnostic, safety, or predictive-maintenance system. The three models use separate datasets and are **not a synchronized multimodal sensor-fusion model**.

## Features

- **Tabular telemetry:** classify 14 numeric engine/exhaust measurements into one of four dataset labels.
- **Vibration:** extract 27 time-domain and normalized spectral features from three CSV channels and classify bearing condition as `Faulty` or `Healthy`.
- **Audio:** extract 26 MFCC summary features from an audio recording and classify it as `Engine Issue`, `Non engine issue`, or `Normal engine`.
- **Dashboard:** React/Vite interface for uploading inputs and displaying the corresponding model output.
- **API:** FastAPI endpoints for health checks and the three independent inference workflows.

## Repository layout

- `backend/app.py` — FastAPI application.
- `src/inference.py` — tabular telemetry inference.
- `src/vibration_features.py`, `src/vibration_inference.py` — vibration feature extraction and inference.
- `src/audio_inference.py` — audio feature extraction and inference.
- `models/` — saved model artifacts and metadata.
- `frontend/` — React/Vite dashboard.
- `data/` — dataset documentation and any versioned dataset files. Some local datasets may need to be obtained separately.

## Run locally (Windows PowerShell)

Use two terminals from the repository root.

### 1. Install Python dependencies

Python 3.11 was used during development.

```powershell
python -m venv .venv
.\\.venv\\Scripts\\Activate.ps1
python -m pip install -r requirements.txt
```

If dependency installation fails, check the project requirements and the Python/scikit-learn versions compatible with the saved model artifacts.

### 2. Start the backend

From the repository root:

```powershell
python -m uvicorn backend.app:app --host 127.0.0.1 --port 8000
```

Check health at [http://127.0.0.1:8000/health](http://127.0.0.1:8000/health) and interactive API documentation at [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs).

### 3. Start the frontend

In a second terminal:

```powershell
cd frontend
npm install
npm run dev
```

Open the local URL printed by Vite (usually [http://localhost:5173](http://localhost:5173)). By default, the frontend is intended for local development and calls the local API at `http://127.0.0.1:8000`. A deployed frontend needs a backend URL reachable from the user's browser and appropriate CORS/deployment configuration; localhost is not a public backend address.

## API endpoints

- `GET /health` — reports whether the expected model and metadata files are present.
- `POST /predict/tabular` — accepts tabular telemetry input (JSON or supported CSV upload).
- `POST /predict/vibration` — accepts a vibration CSV recording.
- `POST /predict/audio` — accepts an audio recording.

A successful health response confirms that expected artifacts exist; it does not by itself prove model accuracy or validate a prediction.

## Results and evaluation

### Engine telemetry — EngineFaultDB

Dataset and provenance: [EngineFaultDB repository](https://github.com/leoxthomas/EngineFaultDB), published in IEEE Access (2023), [DOI: 10.1109/ACCESS.2023.3331316](https://doi.org/10.1109/ACCESS.2023.3331316).

- Audited source CSV: 55,999 rows; one exact duplicate was removed for benchmark preparation, leaving 55,998 rows.
- Inputs: 14 numeric features; target: `Fault`.
- Selected model: Random Forest.
- Held-out random-split accuracy: **75.42%**.
- Held-out random-split macro F1: **76.23%**.
- Test split: 8,400 rows; reported mean single-row inference latency: approximately 76.7 ms.

The split was stratified by row, not by experiment/session. The dataset has no verified run/session identifier, so generalization to unseen experiments or vehicles has not been established. Class 0 is documented as `Normal (no fault)`; classes 1–3 remain generic fault types because their mapping to named physical faults has not been verified.

### Vibration — bearing-condition classification

- Feature table described in the project metadata: **134 recordings** — 90 `Faulty`, 44 `Healthy`.
- Input schema: three channels; 27 time-domain and normalized spectral features.
- Model: Random Forest with 300 trees and balanced class weights.
- Historical random-recording holdout results: **94.12% accuracy**, **93.28% balanced accuracy**, **93.28% macro F1** (34 test recordings).
- Historical five-fold operating-condition-grouped cross-validation: **91.04% accuracy**, **90.43% balanced accuracy**, **89.96% macro F1**.

These are historical evaluation results recorded in model metadata, not a fresh independent evaluation of the currently saved artifact. The groups represent operating conditions—not independent physical engines or laboratories. The dataset is small, and external generalization remains unverified. Spectral features are normalized frequency bins, not calibrated frequencies in hertz.

The raw vibration dataset is described as `Engine Journal Bearings Dataset 2` under `data/vibration_raw/`. Its original provenance and redistribution terms should be confirmed before redistributing raw recordings. See `data/README.md` for the dataset notes.

### Audio — engine sound classification

- Dataset recorded in metadata: **297 audio recordings** — 85 `Engine Issue`, 106 `Non engine issue`, and 106 `Normal engine`.
- Selected inference model: `models/audio/audio_random_forest_tuned.joblib`.
- Feature schema: **26 MFCC summary features** (mean and standard deviation for 13 MFCC coefficients), extracted with librosa at 22,050 Hz mono, `n_fft=2048`, `hop_length=512`.
- Historical tuned Random Forest evaluation reported during development: **68.33% test accuracy** and **67.91% macro F1**.

The audio model provides three-way audio classification only; it does not identify a specific mechanical fault. Scores are Random Forest class-vote fractions, not calibrated probabilities. The dataset is a small collected sample, and generalization to unseen engines and recording conditions is not established.

## Model-score interpretation and limitations

- The models are independent; no validated sensor-fusion model, remaining-useful-life estimate, or time-to-failure forecast is implemented.
- Random Forest vote fractions/scores are not calibrated probabilities. A displayed score must not be interpreted as a guarantee that the prediction is correct.
- Dashboard charts explicitly labelled **simulated** are illustrative UI elements, not measured signal spectra or evidence extracted from the uploaded file.
- A successful API call or smoke test verifies execution, not diagnostic reliability.
- The telemetry and vibration labels do not establish a diagnosis of a particular physical fault unless the label mapping is independently verified.
- Dataset licensing and redistribution terms should be confirmed before reusing or redistributing recordings.
- These outputs are experimental decision support only. Do not use them as a substitute for qualified mechanical inspection or for safety-critical decisions.

## Useful checks

```powershell
python .\\src\\test_vibration_inference.py
python -m src.test_audio_inference
```

The scripts are smoke tests of inference execution; they are not independent accuracy evaluations.
