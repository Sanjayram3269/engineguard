from pathlib import Path
import time
import joblib

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "models" / "benchmark_classifier.joblib"
OUTPUT = ROOT / "models" / "benchmark_classifier_compressed.joblib"

print("Loading model...", flush=True)
model = joblib.load(SOURCE)

print("Saving compressed model; this may take a few minutes...", flush=True)
start = time.perf_counter()
joblib.dump(model, OUTPUT, compress=3)

original_size = SOURCE.stat().st_size
compressed_size = OUTPUT.stat().st_size

print(f"Original:   {original_size / 1_000_000:.1f} MB")
print(f"Compressed: {compressed_size / 1_000_000:.1f} MB")
print(f"Time:       {time.perf_counter() - start:.1f} seconds")
print(f"Saved to:   {OUTPUT}")