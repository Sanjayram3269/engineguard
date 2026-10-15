from pathlib import Path

import joblib
import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parent.parent

DATA_PATH = ROOT / "data" / "EngineFaultDB_Final.csv"
ORIGINAL_PATH = ROOT / "models" / "benchmark_classifier.joblib"
COMPRESSED_PATH = ROOT / "models" / "benchmark_classifier_compressed.joblib"
METADATA_PATH = ROOT / "models" / "benchmark_metadata.json"

import json
metadata = json.loads(METADATA_PATH.read_text(encoding="utf-8"))
features = metadata["feature_names"]

print("Loading original model...", flush=True)
original = joblib.load(ORIGINAL_PATH)

print("Loading compressed model...", flush=True)
compressed = joblib.load(COMPRESSED_PATH)

print("Preparing test rows...", flush=True)
df = pd.read_csv(DATA_PATH)
samples = df[features].iloc[:200]

print("Comparing predictions...", flush=True)
original_predictions = original.predict(samples)
compressed_predictions = compressed.predict(samples)

predictions_match = np.array_equal(
    original_predictions, compressed_predictions
)

print("Comparing class probabilities...", flush=True)
original_probabilities = original.predict_proba(samples)
compressed_probabilities = compressed.predict_proba(samples)

probabilities_match = np.allclose(
    original_probabilities,
    compressed_probabilities,
    rtol=1e-7,
    atol=1e-9,
)

print(f"Predictions match: {predictions_match}")
print(f"Probabilities match: {probabilities_match}")

if predictions_match and probabilities_match:
    print("PASS: Compressed model matches the original.")
else:
    raise RuntimeError("FAIL: Model outputs differ; keep the original model.")
