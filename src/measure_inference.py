from pathlib import Path
import json
import time
import warnings

import joblib
import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
DATA_PATH = ROOT / "data" / "EngineFaultDB_Final.csv"
MODEL_PATH = ROOT / "models" / "benchmark_classifier.joblib"
METADATA_PATH = ROOT / "models" / "benchmark_metadata.json"


def main():
    print("Loading metadata...", flush=True)
    metadata = json.loads(METADATA_PATH.read_text(encoding="utf-8"))

    print("Loading model...", flush=True)
    model = joblib.load(MODEL_PATH)

    # Avoid parallel-worker overhead for single-row predictions.
    if hasattr(model, "n_jobs"):
        model.n_jobs = 1

    print("Loading dataset...", flush=True)
    df = pd.read_csv(DATA_PATH)

    features = metadata["feature_names"]
    sample = df[features].iloc[[0]]

    # Suppress repetitive sklearn parallelism warnings during measurement.
    warnings.filterwarnings(
        "ignore",
        message=r".*sklearn\.utils\.parallel\.delayed.*",
        category=UserWarning,
    )

    print("Warming up model...", flush=True)
    for _ in range(3):
        model.predict(sample)

    iterations = 20
    print(f"Measuring {iterations} predictions...", flush=True)

    start = time.perf_counter()
    for _ in range(iterations):
        model.predict(sample)

    latency_ms = (time.perf_counter() - start) * 1000 / iterations

    metadata["mean_single_row_inference_latency_ms"] = float(latency_ms)

    print("Saving metadata...", flush=True)
    METADATA_PATH.write_text(
        json.dumps(metadata, indent=2),
        encoding="utf-8",
    )

    print(f"Model: {metadata.get('selected_model', 'Unknown')}")
    print(f"Mean single-row inference latency: {latency_ms:.3f} ms")
    print(f"Updated: {METADATA_PATH}")


if __name__ == "__main__":
    main()