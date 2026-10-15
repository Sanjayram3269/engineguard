
from pathlib import Path
import json
import sys

import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from src.inference import predict_tabular

DATA_PATH = ROOT / "data" / "EngineFaultDB_Final.csv"
METADATA_PATH = ROOT / "models" / "benchmark_metadata.json"

with open(METADATA_PATH, encoding="utf-8") as file:
    metadata = json.load(file)

expected_classes = set(metadata["class_names"].values())

df = pd.read_csv(DATA_PATH)
sample = df.drop(columns=["Fault"]).iloc[0].to_dict()

result = predict_tabular(sample)

print("\nPrediction result:")
print(result)

assert result["module"] == "tabular"
assert result["status"] == "success"
assert result["predicted_class"] in expected_classes
assert 0 <= result["confidence"] <= 1
assert result["confidence_type"] == "random_forest_class_vote"
assert isinstance(result["review_required"], bool)

print("\nREAL MODEL INFERENCE TEST PASSED")
