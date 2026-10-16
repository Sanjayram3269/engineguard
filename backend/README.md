# EngineGuard Local Inference API

This directory contains a minimal FastAPI server that exposes the existing
EngineGuard Python inference functions over HTTP. It is intended as a local
dev-server bridge between the React frontend and the real trained models.

It does **not** retrain models, fabricate predictions, or relabel rule-based
frontend output as real inference.

## Endpoints

- `GET /health` — returns `ok` when all required model and metadata files are present.
- `POST /predict/tabular` — telemetry inference from a JSON feature map or CSV upload.
- `POST /predict/vibration` — vibration inference from an uploaded CSV file.
- `POST /predict/audio` — audio inference from an uploaded audio file.

## Feature contracts

Each endpoint validates the feature set it receives against the repository's
metadata files:

- Tabular: `models/benchmark_metadata.json` → `feature_names` (14 features: MAP, TPS, Force, Power, RPM, Consumption L/H, Consumption L/100KM, Speed, CO, HC, CO2, O2, Lambda, AFR)
- Vibration: `models/vibration_metadata.json` → `feature_columns`
- Audio: `models/audio_metadata.json` → `feature_schema.feature_names`

If the uploaded or posted features do not match what the model was trained on,
the endpoint returns a `422` with the missing/incorrect features.

## Score semantics

The scores returned here are **raw model scores**, not calibrated confidence:

- Telemetry: Random Forest class-vote fraction
- Vibration: Random Forest max vote fraction
- Audio: Random Forest class fraction

Treat them as decision-support scores. Do not present them as calibrated
probabilities.

## CORS

The server allows requests from the local frontend dev servers:

- `http://localhost:5173`
- `http://127.0.0.1:5173`
- `http://localhost:3000`
- `http://127.0.0.1:3000`

## Dependencies

See `requirements.txt`.

## Start

### Backend (FastAPI):
From the repository root:

```powershell
.\.venv\Scripts\python -m uvicorn backend.app:app --host 127.0.0.1 --port 8000
```

### Frontend (React / Vite):
From the repository root:

```powershell
cd frontend
npm run dev
```

The server must be able to import `src/` as a package, and the models must be
present under `models/`.

## Test

```bash
curl -s http://127.0.0.1:8000/health | python -m json.tool
```

Tabular example:

```bash
curl -s -X POST http://127.0.0.1:8000/predict/tabular \
  -H "Content-Type: application/json" \
  -d '{"data":{"RPM":2200,"MAP":78,"TPS":42,"Force":0,"Power":30,"Speed":0,"CO":0.1,"HC":12,"CO2":12,"O2":0.4,"Lambda":1.0,"AFR":14.7,"Fuel":5.2,"Consumption L/H":5.2,"Consumption L/100KM":6.1,"Engine Temp":88,"Intake Air Temp":30,"Engine Load":40,"Coolant Temp":85,"Intake Manifold Pressure":78,"Fuel Rail Pressure":41,"Spark Advance":18,"Battery Voltage":13.9,"EGR Position":11,"Throttle Position":42,"Mass Air Flow":9.1,"Injector Pulse Width":2.6,"Wastegate Position":0,"Timing Advance":18,"Fuel Trim Bank 1":-0.8,"Fuel Trim Bank 2":-0.6}}' \
  | python -m json.tool
```

Vibration example with a real CSV from the repository:

```bash
curl -s -X POST http://127.0.0.1:8000/predict/vibration \
  -F "file=@data/vibration_raw/Engine Journal Bearings Dataset 2/Engine Journal Bearings Dataset 2/Engine Journal Bearings Dataset/Faulty Bearings Dataset/1000 RPM/0% Humidity/-10 deg Celsius/1st at -10 2022Jun04-2239-0005.csv" \
  | python -m json.tool
```

Audio example with a real audio file from the repository:

```bash
curl -s -X POST http://127.0.0.1:8000/predict/audio \
  -F "file=@data/Audio/Engine Issue/001.mp3" \
  | python -m json.tool
```

Invalid-request examples:

```bash
# Wrong feature set should return 422
curl -s -w "\nHTTP %{http_code}\n" -X POST http://127.0.0.1:8000/predict/tabular \
  -H "Content-Type: application/json" \
  -d '{"data":{"rpm":2200}}'

# Missing file should return 422/400
curl -s -w "\nHTTP %{http_code}\n" -X POST http://127.0.0.1:8000/predict/vibration

# Unsupported audio extension should return 400
curl -s -w "\nHTTP %{http_code}\n" -X POST http://127.0.0.1:8000/predict/audio \
  -F "file=@some_notes.txt;filename=notes.txt"
```

## Limitations

- This is a local dev bridge. It is not an online service, not hardened for
  untrusted public traffic, and not a deployment artifact.
- The tabular endpoint rejects feature maps that do not match the telemetry
  model's feature_names. The frontend tabular contract is not the same schema,
  so the frontend tabular upload path must supply the model's expected features.
