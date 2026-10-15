
from pathlib import Path
import json

import joblib
import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
MODEL_PATH = ROOT / "models" / "benchmark_classifier_compressed.joblib"
METADATA_PATH = ROOT / "models" / "benchmark_metadata.json"

CLASS_NAMES = {
    0: "Normal (no fault)",
    1: "Fault type 1",
    2: "Fault type 2",
    3: "Fault type 3",
}

# Selected on validation data and evaluated on the held-out test set.
REVIEW_THRESHOLD = 0.5675

if not MODEL_PATH.exists():
    raise FileNotFoundError(
        f"Trained model not found: {MODEL_PATH}. "
        "Run the benchmark training workflow first."
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
    """Predict an engine-fault class from 14 numeric sensor features."""

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
            "review_required": None,
            "review_reason": None,
            "confidence_type": "random_forest_class_vote",
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
            "review_required": None,
            "review_reason": None,
            "confidence_type": "random_forest_class_vote",
            "message": "All sensor features must be numeric.",
        }

    if not np.isfinite(row.to_numpy()).all():
        return {
            "module": "tabular",
            "status": "error",
            "predicted_class": None,
            "confidence": None,
            "metrics": {},
            "review_required": None,
            "review_reason": None,
            "confidence_type": "random_forest_class_vote",
            "message": "Sensor features must be finite numbers.",
        }

    try:
        probabilities = model.predict_proba(row)[0]
        classifier = model.named_steps["classifier"]

        # Use the highest-scoring class, aligned to the model's class order.
        best_index = int(np.argmax(probabilities))
        label = int(classifier.classes_[best_index])
        confidence = float(probabilities[best_index])
        review_required = confidence < REVIEW_THRESHOLD

        scores = {
            CLASS_NAMES[int(class_label)]: round(float(score), 4)
            for class_label, score in zip(
                classifier.classes_, probabilities
            )
        }

        if review_required:
            review_reason = (
                "Low model class-vote score; further inspection is "
                "recommended before relying on this prediction."
            )
            message = "Prediction completed; review recommended."
        else:
            review_reason = None
            message = "Prediction completed."

        return {
            "module": "tabular",
            "status": "success",
            "predicted_class": CLASS_NAMES[label],
            "confidence": round(confidence, 4),
            "confidence_type": "random_forest_class_vote",
            "review_required": review_required,
            "review_reason": review_reason,
            "metrics": {
                "test_accuracy": metadata["test_accuracy"],
                "test_macro_f1": metadata["test_macro_f1"],
                "mean_inference_latency_ms":
                    metadata.get("mean_single_row_inference_latency_ms"),
                "class_probabilities": scores,
                "model": metadata["selected_model"],
                "review_threshold": REVIEW_THRESHOLD,
            },
            "message": message,
        }

    except Exception as exc:
        return {
            "module": "tabular",
            "status": "error",
            "predicted_class": None,
            "confidence": None,
            "metrics": {},
            "review_required": None,
            "review_reason": None,
            "confidence_type": "random_forest_class_vote",
            "message": f"Prediction failed: {exc}",
        }
