
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.metrics import accuracy_score, f1_score
from sklearn.model_selection import train_test_split

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data" / "EngineFaultDB_Final.csv"
MODEL_PATH = ROOT / "models" / "benchmark_classifier_compressed.joblib"
OUT = ROOT / "reports" / "deployed_referral_validation.csv"

THRESHOLD = 0.5675
SEED = 42
TARGET = "Fault"

df = pd.read_csv(DATA).drop_duplicates().reset_index(drop=True)
X = df.drop(columns=[TARGET])
y = df[TARGET].astype(int)

indices = np.arange(len(df))
_, test_idx = train_test_split(
    indices,
    test_size=0.15,
    random_state=SEED,
    stratify=y,
)

X_test = X.iloc[test_idx]
y_test = y.iloc[test_idx].to_numpy()

model = joblib.load(MODEL_PATH)
pred = model.predict(X_test)
scores = model.predict_proba(X_test)
confidence = scores.max(axis=1)
accepted = confidence >= THRESHOLD
correct = pred == y_test
errors = ~correct

results = [
    {
        "policy": "No referral",
        "threshold": np.nan,
        "test_accuracy": accuracy_score(y_test, pred),
        "test_macro_f1": f1_score(
            y_test, pred, average="macro", zero_division=0
        ),
        "coverage": 1.0,
        "referral_rate": 0.0,
        "accepted_case_accuracy": accuracy_score(y_test, pred),
        "total_errors": int(errors.sum()),
        "errors_flagged_for_review": 0,
        "error_capture_rate": 0.0,
    },
    {
        "policy": "Fixed confidence threshold",
        "threshold": THRESHOLD,
        "test_accuracy": accuracy_score(y_test, pred),
        "test_macro_f1": f1_score(
            y_test, pred, average="macro", zero_division=0
        ),
        "coverage": float(accepted.mean()),
        "referral_rate": float((~accepted).mean()),
        "accepted_case_accuracy": accuracy_score(
            y_test[accepted], pred[accepted]
        ),
        "total_errors": int(errors.sum()),
        "errors_flagged_for_review": int((errors & ~accepted).sum()),
        "error_capture_rate": (
            float((errors & ~accepted).sum() / errors.sum())
            if errors.any() else 0.0
        ),
    },
]

summary = pd.DataFrame(results)
summary.to_csv(OUT, index=False)

print("DEPLOYED MODEL | HELD-OUT TEST")
print(f"Model: {MODEL_PATH.name}")
print(f"Test rows: {len(y_test)}")
print(f"Threshold: {THRESHOLD}")
print(summary.to_string(index=False))
print(f"\nSaved: {OUT}")
