
from pathlib import Path
import time

import numpy as np
import pandas as pd
import xgboost as xgb

from sklearn.ensemble import ExtraTreesClassifier, RandomForestClassifier
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, f1_score
from sklearn.model_selection import train_test_split
from sklearn.neural_network import MLPClassifier
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

ROOT = Path(__file__).resolve().parent.parent
DATA_PATH = ROOT / "data" / "EngineFaultDB_Final.csv"
REPORT_DIR = ROOT / "reports"
REPORT_DIR.mkdir(parents=True, exist_ok=True)

SEED = 42
TARGET = "Fault"

print("Loading and validating data...", flush=True)
df = pd.read_csv(DATA_PATH).drop_duplicates().reset_index(drop=True)

X = df.drop(columns=[TARGET])
y = df[TARGET].astype(int)
labels = sorted(y.unique())

# Reproduce the exact split from benchmark_models.py.
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
X_test, y_test = X.iloc[test_idx], y.iloc[test_idx]

print(
    f"Rows: train={len(X_train)}, val={len(X_val)}, "
    f"test={len(X_test)}",
    flush=True,
)

# Scaling is fitted on training data only, through each pipeline.
models = {
    "Softmax Regression": Pipeline([
        ("imputer", SimpleImputer(strategy="median")),
        ("scaler", StandardScaler()),
        ("classifier", LogisticRegression(
            solver="lbfgs",
            max_iter=1000,
            random_state=SEED,
        )),
    ]),
    "ANN (MLP)": Pipeline([
        ("imputer", SimpleImputer(strategy="median")),
        ("scaler", StandardScaler()),
        ("classifier", MLPClassifier(
            hidden_layer_sizes=(64, 32),
            activation="relu",
            solver="adam",
            alpha=0.001,
            learning_rate_init=0.001,
            max_iter=100,
            early_stopping=True,
            validation_fraction=0.1,
            n_iter_no_change=10,
            random_state=SEED,
        )),
    ]),
    "Random Forest": Pipeline([
        ("imputer", SimpleImputer(strategy="median")),
        ("classifier", RandomForestClassifier(
            n_estimators=400,
            class_weight="balanced_subsample",
            random_state=SEED,
            n_jobs=-1,
        )),
    ]),
    "Extra Trees": Pipeline([
        ("imputer", SimpleImputer(strategy="median")),
        ("scaler", "passthrough"),
        ("classifier", ExtraTreesClassifier(
            n_estimators=400,
            class_weight="balanced",
            random_state=SEED,
            n_jobs=-1,
        )),
    ]),
    "XGBoost": Pipeline([
        ("imputer", SimpleImputer(strategy="median")),
        ("classifier", xgb.XGBClassifier(
            objective="multi:softprob",
            num_class=len(labels),
            eval_metric="mlogloss",
            n_estimators=400,
            max_depth=6,
            learning_rate=0.05,
            subsample=0.85,
            colsample_bytree=0.85,
            reg_lambda=2.0,
            tree_method="hist",
            random_state=SEED,
            n_jobs=-1,
        )),
    ]),
}

results = []

for name, model in models.items():
    print(f"\nTraining {name}...", flush=True)
    start = time.perf_counter()
    model.fit(X_train, y_train)
    training_seconds = time.perf_counter() - start

    val_pred = model.predict(X_val)
    val_accuracy = accuracy_score(y_val, val_pred)
    val_f1 = f1_score(
        y_val, val_pred, labels=labels,
        average="macro", zero_division=0
    )

    # Record test metrics for reporting only. Do not use them
    # to select the winning model.
    test_pred = model.predict(X_test)
    test_accuracy = accuracy_score(y_test, test_pred)
    test_f1 = f1_score(
        y_test, test_pred, labels=labels,
        average="macro", zero_division=0
    )

    results.append({
        "model": name,
        "validation_accuracy": val_accuracy,
        "validation_macro_f1": val_f1,
        "test_accuracy": test_accuracy,
        "test_macro_f1": test_f1,
        "training_seconds": training_seconds,
    })

    print(
        f"Validation macro F1: {val_f1:.4f} | "
        f"Test macro F1: {test_f1:.4f} | "
        f"Training: {training_seconds:.1f}s",
        flush=True,
    )

report = pd.DataFrame(results).sort_values(
    "validation_macro_f1", ascending=False
)

output = REPORT_DIR / "softmax_ann_model_comparison.csv"
report.to_csv(output, index=False)

print("\nFINAL COMPARISON (ranked by validation macro F1)")
print(report.to_string(index=False, float_format=lambda v: f"{v:.4f}"))
print(f"\nSaved: {output}")
print("\nComparison complete. No production model was changed.")
