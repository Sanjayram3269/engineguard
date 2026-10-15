from pathlib import Path
import sys
import json
import joblib
import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from vibration_features import extract_channel_features, CHANNELS

MODEL_PATH = ROOT / "models" / "vibration_classifier.joblib"
METADATA_PATH = ROOT / "models" / "vibration_metadata.json"

def load_artifacts():
    if not MODEL_PATH.exists() or not METADATA_PATH.exists():
        raise FileNotFoundError("Vibration model or metadata is missing.")
    model = joblib.load(MODEL_PATH)
    metadata = json.loads(METADATA_PATH.read_text(encoding="utf-8"))
    return model, metadata

def features_from_csv(csv_path, feature_columns):
    frame = pd.read_csv(csv_path)
    missing_channels = [c for c in CHANNELS if c not in frame.columns]
    if missing_channels:
        raise ValueError(f"Missing vibration channels: {missing_channels}")

    values = {}
    for channel in CHANNELS:
        extracted = extract_channel_features(frame[channel], channel.replace(" ", "_"))
        values.update(extracted)

    absent = [c for c in feature_columns if c not in values]
    extra = [c for c in values if c not in feature_columns]
    if absent or extra:
        raise ValueError(
            f"Feature schema mismatch. Missing={absent}; unexpected={extra}"
        )

    row = pd.DataFrame([[values[c] for c in feature_columns]],
                       columns=feature_columns)
    if not np.isfinite(row.to_numpy(dtype=float)).all():
        raise ValueError("Extracted features contain non-finite values.")
    return row


def predict_recording(csv_path):
    model, metadata = load_artifacts()

    # Extract features using the saved model's expected feature schema.
    X = features_from_csv(csv_path, metadata["feature_columns"])

    # Use NumPy arrays because the model was trained without feature names.
    X_array = X.to_numpy(dtype=float)

    prediction = str(model.predict(X_array)[0])
    probabilities = model.predict_proba(X_array)[0]

    confidence = float(np.max(probabilities))

    class_probabilities = {
        str(label): float(probability)
        for label, probability in zip(model.classes_, probabilities)
    }

    return {
        "recording": Path(csv_path).name,
        "prediction": prediction,
        "confidence_type": "random_forest_vote_fraction",
        "confidence": confidence,
        "class_probabilities": class_probabilities,
        "review_required": confidence < 0.60,
        "status": "experimental_decision_support",
    }
