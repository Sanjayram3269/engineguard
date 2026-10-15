from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from vibration_inference import predict_recording

DATA_ROOT = ROOT / "data" / "vibration_raw"

healthy_files = sorted(
    p for p in DATA_ROOT.rglob("*.csv")
    if "Healthy Bearings Dataset" in str(p)
)
faulty_files = sorted(
    p for p in DATA_ROOT.rglob("*.csv")
    if "Faulty Bearings Dataset" in str(p)
)

if not healthy_files or not faulty_files:
    raise FileNotFoundError(
        f"Could not find both classes: healthy={len(healthy_files)}, "
        f"faulty={len(faulty_files)}"
    )

print(f"Found {len(healthy_files)} healthy and {len(faulty_files)} faulty recordings.")

for path, expected in [
    (healthy_files[0], "Healthy"),
    (faulty_files[0], "Faulty"),
]:
    result = predict_recording(path)
    print("\nExpected class (for smoke test only):", expected)
    print("Inference result:", result)

    assert result["prediction"] in {"Healthy", "Faulty"}
    assert 0.0 <= result["confidence"] <= 1.0
    assert result["confidence_type"] == "random_forest_vote_fraction"
    assert result["status"] == "experimental_decision_support"

print("\nVIBRATION RAW-RECORDING INFERENCE TEST PASSED")
