
from pathlib import Path
import sys

import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from src.inference import predict_tabular

DATA_PATH = ROOT / "data" / "EngineFaultDB_Final.csv"

df = pd.read_csv(DATA_PATH)
sample = df.drop(columns=["Fault"]).iloc[0].to_dict()

result = predict_tabular(sample)

print("\nPrediction result:")
print(result)

assert result["module"] == "tabular"
assert result["status"] == "success"
assert result["predicted_class"] in {
    "Normal Engine",
    "Rich Mixture",
    "Lean Mixture",
    "Low Voltage",
}
assert 0 <= result["confidence"] <= 1

print("\nREAL MODEL INFERENCE TEST PASSED")
