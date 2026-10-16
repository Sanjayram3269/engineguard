"""
EngineGuard local inference API.

A minimal FastAPI wrapper around the existing EngineGuard Python inference
functions. It calls the real trained models and feature extractors. It does
not retrain models, fabricate predictions, or relabel rule-based frontend
output as real inference.

Score semantics:
- Telemetry: Random Forest class-vote fraction (not a calibrated probability).
- Vibration: Random Forest max vote fraction (not a calibrated probability).
- Audio: Random Forest class fraction (not a calibrated probability).
"""

from __future__ import annotations

import json
import os
import tempfile
from pathlib import Path
from typing import Any, Dict, List

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

APP_ROOT = Path(__file__).resolve().parent.parent
SRC_ROOT = APP_ROOT / "src"
if str(SRC_ROOT) not in os.sys.path:
    os.sys.path.insert(0, str(SRC_ROOT))

from inference import predict_tabular as telemetry_predict, REVIEW_THRESHOLD as TELEMETRY_REVIEW_THRESHOLD
from vibration_inference import predict_recording as vibration_predict
from audio_inference import predict_audio as audio_predict

_TELE_RAW = (APP_ROOT / "models" / "benchmark_metadata.json").read_text(encoding="utf-8")
_VIB_RAW = (APP_ROOT / "models" / "vibration_metadata.json").read_text(encoding="utf-8")
_AUD_RAW = (APP_ROOT / "models" / "audio_metadata.json").read_text(encoding="utf-8")

TELEMETRY_EXPECTED_FEATURES = sorted(json.loads(_TELE_RAW)["feature_names"])
VIBRATION_EXPECTED_FEATURES = sorted(json.loads(_VIB_RAW)["feature_columns"])
AUDIO_EXPECTED_FEATURES = sorted(json.loads(_AUD_RAW)["feature_schema"]["feature_names"])

_TELE_RAW = _VIB_RAW = _AUD_RAW = None


app = FastAPI(
    title="EngineGuard Inference API",
    description="Local inference endpoints for EngineGuard telemetry, vibration, and audio models.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class TabularInput(BaseModel):
    data: Dict[str, float] = Field(
        ...,
        description="14 numeric sensor features for telemetry inference.",
    )

    def validate_features(self) -> List[str]:
        metadata_path = APP_ROOT / "models" / "benchmark_metadata.json"
        if not metadata_path.is_file():
            raise FileNotFoundError(f"Telemetry metadata missing: {metadata_path}")
        metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
        expected = metadata["feature_names"]
        return [name for name in expected if name not in self.data]


@app.post("/predict/tabular")
async def predict_tabular(body: TabularInput) -> Dict[str, Any]:
    missing = body.validate_features()
    if missing:
        raise HTTPException(
            status_code=422,
            detail=f"Missing or incorrect telemetry features: {missing}",
        )

    result = telemetry_predict(body.data)
    if result.get("status") != "success":
        raise HTTPException(
            status_code=500,
            detail=f"Telemetry inference failed: {result.get('message')}",
        )

    metrics = result.get("metrics", {})
    expected = TELEMETRY_EXPECTED_FEATURES
    actual = sorted(body.data.keys())
    feature_order_ok = expected == actual

    return {
        "module": "tabular",
        "status": "success",
        "predicted_class": result.get("predicted_class"),
        "confidence": result.get("confidence"),
        "confidence_type": result.get("confidence_type"),
        "review_required": result.get("review_required"),
        "review_reason": result.get("review_reason"),
        "expected_features": expected,
        "actual_features": actual,
        "feature_order_validated": feature_order_ok,
        "class_probabilities": metrics.get("class_probabilities", {}),
        "metrics": {
            "model": metrics.get("model"),
            "test_accuracy": metrics.get("test_accuracy"),
            "test_macro_f1": metrics.get("test_macro_f1"),
            "mean_inference_latency_ms": metrics.get("mean_inference_latency_ms"),
            "review_threshold": TELEMETRY_REVIEW_THRESHOLD,
        },
        "message": result.get("message"),
    }


@app.post("/predict/vibration")
async def predict_vibration(file: UploadFile = File(
    ...,
    description="CSV vibration recording",
)):
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(
            status_code=400,
            detail="Vibration endpoint requires a CSV file.",
        )

    with tempfile.NamedTemporaryFile(suffix=".csv", delete=False) as tmp:
        try:
            content = await file.read()
            tmp.write(content)
            tmp_path = tmp.name
        except Exception as exc:
            raise HTTPException(
                status_code=400,
                detail=f"Failed to read uploaded CSV: {exc}",
            )

    try:
        result = vibration_predict(tmp_path)
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Vibration inference failed: {exc}",
        )
    finally:
        try:
            os.unlink(tmp_path)
        except OSError:
            pass

    if result.get("status") != "experimental_decision_support":
        raise HTTPException(
            status_code=500,
            detail="Vibration inference returned an unexpected status.",
        )

    computed_features = result.get("computed_features") or {}
    actual_features = sorted(computed_features.keys())
    expected_features = VIBRATION_EXPECTED_FEATURES
    feature_order_ok = expected_features == actual_features

    return {
        "module": "vibration",
        "status": result.get("status"),
        "recording": result.get("recording"),
        "prediction": result.get("prediction"),
        "confidence": result.get("confidence"),
        "confidence_type": result.get("confidence_type"),
        "review_required": result.get("review_required"),
        "expected_features": expected_features,
        "actual_features": actual_features,
        "feature_order_validated": feature_order_ok,
        "class_probabilities": result.get("class_probabilities", {}),
        "message": "Vibration inference completed. Scores are Random Forest vote fractions, not calibrated probabilities.",
    }


@app.post("/predict/audio")
async def predict_audio(file: UploadFile = File(
    ...,
    description="Audio recording (mp3, wav, flac, ogg, m4a, aac, wma)",
)):
    if not file.filename:
        raise HTTPException(
            status_code=400,
            detail="Audio endpoint requires a file.",
        )

    supported = {".mp3", ".wav", ".flac", ".ogg", ".m4a", ".aac", ".wma"}
    ext = Path(file.filename).suffix.lower()
    if ext not in supported:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported audio extension '{ext}'. Supported: {sorted(supported)}",
        )

    with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as tmp:
        try:
            content = await file.read()
            tmp.write(content)
            tmp_path = tmp.name
        except Exception as exc:
            raise HTTPException(
                status_code=400,
                detail=f"Failed to read uploaded audio: {exc}",
            )

    try:
        result = audio_predict(tmp_path)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Audio inference failed: {exc}",
        )
    finally:
        try:
            os.unlink(tmp_path)
        except OSError:
            pass

    computed_features = result.get("computed_features") or {}
    actual_features = sorted(computed_features.keys())
    expected_features = AUDIO_EXPECTED_FEATURES
    feature_order_ok = expected_features == actual_features

    return {
        "module": "audio",
        "status": "success",
        "audio_file": result.get("audio_file"),
        "prediction": result.get("prediction"),
        "expected_features": expected_features,
        "actual_features": actual_features,
        "feature_order_validated": feature_order_ok,
        "probabilities": result.get("probabilities", {}),
        "message": "Audio inference completed. Probabilities are Random Forest class fractions, not calibrated confidence.",
    }


@app.get("/health")
async def health() -> Dict[str, Any]:
    model_paths = {
        "telemetry_model": APP_ROOT / "models" / "benchmark_classifier_compressed.joblib",
        "telemetry_metadata": APP_ROOT / "models" / "benchmark_metadata.json",
        "vibration_model": APP_ROOT / "models" / "vibration_classifier.joblib",
        "vibration_metadata": APP_ROOT / "models" / "vibration_metadata.json",
        "audio_model": APP_ROOT / "models" / "audio" / "audio_random_forest_tuned.joblib",
        "audio_metadata": APP_ROOT / "models" / "audio_metadata.json",
    }
    present = {name: path.is_file() for name, path in model_paths.items()}
    all_present = all(present.values())
    return {
        "status": "ok" if all_present else "degraded",
        "models_present": present,
    }
