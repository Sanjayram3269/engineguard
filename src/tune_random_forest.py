
from pathlib import Path
import time

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
TARGET = "Fault"
LABELS = [0, 1, 2, 3]
CLASS_NAMES = ["Normal", "Rich mixture", "Lean mixture", "Low voltage"]

df = pd.read_csv(DATA_PATH).drop_duplicates().reset_index(drop=True)
X = df.drop(columns=[TARGET])
y = df[TARGET].astype(int)

# Reproduce benchmark train/validation/test partitioning.
all_indices = pd.RangeIndex(len(df))
train_val_idx, test_idx = train_test_split(
    all_indices,
    test_size=0.15,
    random_state=SEED,
    stratify=y,
)
train_idx, val_idx = train_test_split(
    train_val_idx,
    test_size=0.15 / 0.85,
    random_state=SEED,
    stratify=y.iloc[train_val_idx],
)

X_train, y_train = X.iloc[train_idx], y.iloc[train_idx]
X_val, y_val = X.iloc[val_idx], y.iloc[val_idx]

# Keep the baseline; test moderate class weighting and
# more conservative trees as separate experiments.
experiments = {
    "Baseline RF": {
        "n_estimators": 400,
        "class_weight": "balanced_subsample",
        "min_samples_leaf": 1,
        "max_features": "sqrt",
    },
    "Weighted difficult classes": {
        "n_estimators": 400,
        "class_weight": {0: 1.0, 1: 1.0, 2: 1.5, 3: 1.5},
        "min_samples_leaf": 1,
        "max_features": "sqrt",
    },
    "Weighted + larger leaves": {
        "n_estimators": 400,
        "class_weight": {0: 1.0, 1: 1.0, 2: 1.5, 3: 1.5},
        "min_samples_leaf": 3,
        "max_features": "sqrt",
    },
}

results = []
fitted_models = {}

for name, params in experiments.items():
    print(f"\nTraining: {name}")
    model = Pipeline([
        ("imputer", SimpleImputer(strategy="median")),
        ("classifier", RandomForestClassifier(
            **params,
            random_state=SEED,
            n_jobs=-1,
        )),
    ])

    start = time.perf_counter()
    model.fit(X_train, y_train)
    elapsed = time.perf_counter() - start

    pred = model.predict(X_val)
    report = classification_report(
        y_val,
        pred,
        labels=LABELS,
        target_names=CLASS_NAMES,
        output_dict=True,
        zero_division=0,
    )

    macro_f1 = f1_score(
        y_val, pred, labels=LABELS,
        average="macro", zero_division=0,
    )
    accuracy = accuracy_score(y_val, pred)

    results.append({
        "model": name,
        "validation_accuracy": accuracy,
        "validation_macro_f1": macro_f1,
        "lean_recall": report["Lean mixture"]["recall"],
        "low_voltage_recall": report["Low voltage"]["recall"],
        "normal_recall": report["Normal"]["recall"],
        "rich_recall": report["Rich mixture"]["recall"],
        "training_seconds": round(elapsed, 3),
    })
    fitted_models[name] = model

    print(f"Validation accuracy: {accuracy:.4f}")
    print(f"Validation macro F1: {macro_f1:.4f}")
    print(f"Lean recall: {report['Lean mixture']['recall']:.4f}")
    print(f"Low-voltage recall: {report['Low voltage']['recall']:.4f}")
    print(classification_report(
        y_val, pred, labels=LABELS,
        target_names=CLASS_NAMES, zero_division=0,
    ))

results_df = pd.DataFrame(results).sort_values(
    "validation_macro_f1", ascending=False
)
output = REPORT_DIR / "rf_tuning_results.csv"
results_df.to_csv(output, index=False)

print("\nVALIDATION COMPARISON")
print(results_df.to_string(index=False))
print(f"\nSaved results to {output}")
print("No final test set was used for model selection.")
print("Existing models and reports were not overwritten.")
