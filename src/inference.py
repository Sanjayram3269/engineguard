from pathlib import Path
import json

import joblib
import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
MODEL_PATH = ROOT / "models" / "benchmark_classifier_compressed.joblib"
METADATA_PATH = ROOT / "models" / "benchmark_metadata.json"

CLASS_NAMES = {
    0: "Normal Engine",
    1: "Rich Mixture",
    2: "Lean Mixture",
    3: "Low Voltage",
}

if not MODEL_PATH.exists():
    raise FileNotFoundError(
        f"Trained model not found: {MODEL_PATH}. "
        "Run python src/train_model.py first."
    )

if not METADATA_PATH.exists():
    raise FileNotFoundError(
        f"Model metadata not found: {METADATA_PATH}"
    )

model = joblib.load(MODEL_PATH)

with open(METADATA_PATH, encoding="utf-8") as file:
    metadata = json.load(file)

FEATURE_NAMES = metadata["feature_names"]


def predict_tabular(input_data: dict) -> dict:
    """Predict one EngineFaultDB class from 14 numeric sensor features."""

    if not isinstance(input_data, dict):
        raise TypeError("input_data must be a dictionary.")

    missing = [name for name in FEATURE_NAMES if name not in input_data]
    if missing:
        return {
            "module": "tabular",
            "status": "error",
            "predicted_class": None,
            "confidence": None,
            "metrics": {},
            "message": f"Missing required features: {missing}",
        }

    try:
        row = pd.DataFrame(
            [{name: input_data[name] for name in FEATURE_NAMES}],
            columns=FEATURE_NAMES,
        ).astype(float)
    except (TypeError, ValueError):
        return {
            "module": "tabular",
            "status": "error",
            "predicted_class": None,
            "confidence": None,
            "metrics": {},
            "message": "All sensor features must be numeric.",
        }

    if not np.isfinite(row.to_numpy()).all():
        return {
            "module": "tabular",
            "status": "error",
            "predicted_class": None,
            "confidence": None,
            "metrics": {},
            "message": "Sensor features must be finite numbers.",
        }

    try:
        label = int(model.predict(row)[0])
        probabilities = model.predict_proba(row)[0]

        classifier = model.named_steps["classifier"]
        scores = {
            CLASS_NAMES[int(class_label)]: round(float(score), 4)
            for class_label, score in zip(
                classifier.classes_, probabilities
            )
        }

        return {
            "module": "tabular",
            "status": "success",
            "predicted_class": CLASS_NAMES[label],
            "confidence": round(float(max(probabilities)), 4),
            "metrics": {
                "test_accuracy": metadata["test_accuracy"],
                "test_macro_f1": metadata["test_macro_f1"],
                "mean_inference_latency_ms":
                    metadata.get("mean_single_row_inference_latency_ms"),
                "class_probabilities": scores,
                "model": metadata["selected_model"],
            },
            "message": "Prediction completed.",
        }

    except Exception as exc:
        return {
            "module": "tabular",
            "status": "error",
            "predicted_class": None,
            "confidence": None,
            "metrics": {},
            "message": f"Prediction failed: {exc}",
        }
