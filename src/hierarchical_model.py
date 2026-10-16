
from pathlib import Path

import numpy as np
import pandas as pd

from sklearn.ensemble import RandomForestClassifier
from sklearn.impute import SimpleImputer
from sklearn.metrics import accuracy_score, f1_score, classification_report
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline

ROOT = Path(__file__).resolve().parent.parent
DATA_PATH = ROOT / "data" / "EngineFaultDB_Final.csv"
REPORT_DIR = ROOT / "reports"
REPORT_DIR.mkdir(exist_ok=True)

SEED = 42
LABELS = [0, 1, 2, 3]
CLASS_NAMES = ["Normal", "Rich mixture", "Lean mixture", "Low voltage"]

df = pd.read_csv(DATA_PATH).drop_duplicates().reset_index(drop=True)
X = df.drop(columns=["Fault"])
y = df["Fault"].astype(int)

# Reproduce the existing benchmark split exactly.
indices = np.arange(len(df))
train_val_idx, test_idx = train_test_split(
    indices, test_size=0.15, random_state=SEED, stratify=y
)
train_idx, val_idx = train_test_split(
    train_val_idx,
    test_size=0.15 / 0.85,
    random_state=SEED,
    stratify=y.iloc[train_val_idx],
)

X_train, y_train = X.iloc[train_idx], y.iloc[train_idx]
X_val, y_val = X.iloc[val_idx], y.iloc[val_idx]

def make_model():
    return Pipeline([
        ("imputer", SimpleImputer(strategy="median")),
        ("classifier", RandomForestClassifier(
            n_estimators=400,
            class_weight="balanced_subsample",
            random_state=SEED,
            n_jobs=-1,
        )),
    ])

# Baseline four-class model.
baseline = make_model()
baseline.fit(X_train, y_train)
baseline_pred = baseline.predict(X_val)

# Specialist binary model trained only on classes 2 and 3.
hard_train_mask = y_train.isin([2, 3])
specialist = make_model()
specialist.fit(
    X_train.loc[hard_train_mask],
    y_train.loc[hard_train_mask],
)

# Route only baseline predictions of class 2 or 3 to the specialist.
hierarchical_pred = baseline_pred.copy()
route_mask = np.isin(baseline_pred, [2, 3])

if route_mask.any():
    hierarchical_pred[route_mask] = specialist.predict(
        X_val.iloc[np.flatnonzero(route_mask)]
    )

def report(name, predictions):
    print(f"\n--- {name} ---")
    print(f"Accuracy: {accuracy_score(y_val, predictions):.4f}")
    print(
        "Macro F1:",
        f"{f1_score(y_val, predictions, labels=LABELS, average='macro', zero_division=0):.4f}",
    )
    print(classification_report(
        y_val,
        predictions,
        labels=LABELS,
        target_names=CLASS_NAMES,
        zero_division=0,
    ))

report("Baseline Random Forest", baseline_pred)
report("Hierarchical classifier", hierarchical_pred)

comparison = pd.DataFrame([
    {
        "model": "Baseline Random Forest",
        "accuracy": accuracy_score(y_val, baseline_pred),
        "macro_f1": f1_score(
            y_val, baseline_pred, labels=LABELS,
            average="macro", zero_division=0
        ),
    },
    {
        "model": "Hierarchical classifier",
        "accuracy": accuracy_score(y_val, hierarchical_pred),
        "macro_f1": f1_score(
            y_val, hierarchical_pred, labels=LABELS,
            average="macro", zero_division=0
        ),
    },
])

output = REPORT_DIR / "hierarchical_comparison.csv"
comparison.to_csv(output, index=False)
print(f"\nSaved comparison: {output}")
print(f"Validation rows routed to specialist: {route_mask.sum():,}")
print("Final test set was not used.")
print("No existing models or reports were overwritten.")
