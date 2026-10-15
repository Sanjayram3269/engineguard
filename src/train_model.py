
from pathlib import Path
import json
import time

import joblib
import numpy as np
import pandas as pd
import xgboost as xgb

from sklearn.ensemble import RandomForestClassifier
from sklearn.impute import SimpleImputer
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
)
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline


# ============================================================
# 1. CONFIGURATION
# ============================================================

ROOT = Path(__file__).resolve().parent.parent
DATA_PATH = ROOT / "data" / "EngineFaultDB_Final.csv"
MODEL_DIR = ROOT / "models"
REPORT_DIR = ROOT / "reports"

MODEL_DIR.mkdir(parents=True, exist_ok=True)
REPORT_DIR.mkdir(parents=True, exist_ok=True)

TARGET = "Fault"
RANDOM_STATE = 42

CLASS_NAMES = {
    0: "Normal",
    1: "Rich mixture",
    2: "Lean mixture",
    3: "Low voltage",
}

if not DATA_PATH.exists():
    raise FileNotFoundError(f"Dataset not found: {DATA_PATH}")


# ============================================================
# 2. LOAD AND VALIDATE DATA
# ============================================================

print("\n" + "=" * 65)
print("ENGINEGUARD | ENGINE FAULT CLASSIFICATION")
print("=" * 65)

df = pd.read_csv(DATA_PATH)

if TARGET not in df.columns:
    raise ValueError(f"Missing target column: {TARGET}")

if df.empty:
    raise ValueError("Dataset is empty.")

if df.isna().sum().sum() > 0:
    print("Missing values found; the pipeline will impute them.")

if not all(pd.api.types.is_numeric_dtype(dtype)
           for dtype in df.dtypes):
    raise ValueError("All dataset columns must be numeric.")

observed_labels = set(df[TARGET].unique())
expected_labels = set(CLASS_NAMES)

if observed_labels != expected_labels:
    raise ValueError(
        f"Expected labels {expected_labels}, "
        f"but found {observed_labels}"
    )

print(f"Original rows: {len(df):,}")
print(f"Input columns: {len(df.columns) - 1}")

# Remove exact duplicate records in memory only.
# The original CSV remains unchanged.
duplicate_count = int(df.duplicated().sum())
df = df.drop_duplicates().reset_index(drop=True)

print(f"Exact duplicate rows removed for evaluation: {duplicate_count}")
print(f"Rows after deduplication: {len(df):,}")

X = df.drop(columns=[TARGET])
y = df[TARGET].astype(int)

feature_names = X.columns.tolist()
labels = sorted(CLASS_NAMES)

print("\nClass distribution after deduplication:")
for label in labels:
    count = int((y == label).sum())
    print(
        f"  {label} - {CLASS_NAMES[label]}: "
        f"{count:,} ({count / len(y) * 100:.2f}%)"
    )



# ============================================================
# 3. CONTIGUOUS WITHIN-CLASS TRAIN / VALIDATION / TEST SPLIT
# ============================================================

# Preserve original CSV row order. The dataset is grouped into
# consecutive fault-label blocks, so do not randomly shuffle rows.
#
# Each class gets its own contiguous 70/15/15 split. This ensures
# every class appears in every split without interleaving adjacent
# records between training and evaluation.

train_indices = []
val_indices = []
test_indices = []

for label in sorted(CLASS_NAMES):
    class_indices = df.index[df[TARGET] == label].to_numpy()
    n = len(class_indices)

    if n < 10:
        raise ValueError(
            f"Too few records for class {label}: {n}"
        )

    train_end = int(n * 0.70)
    val_end = train_end + int(n * 0.15)

    train_indices.extend(class_indices[:train_end])
    val_indices.extend(class_indices[train_end:val_end])
    test_indices.extend(class_indices[val_end:])

X = df.drop(columns=[TARGET])
y = df[TARGET].astype(int)

X_train, y_train = X.loc[train_indices], y.loc[train_indices]
X_val, y_val = X.loc[val_indices], y.loc[val_indices]
X_test, y_test = X.loc[test_indices], y.loc[test_indices]

feature_names = X.columns.tolist()
labels = sorted(CLASS_NAMES)

print("\nContiguous split sizes:")
print(f"  Training:   {len(X_train):,}")
print(f"  Validation: {len(X_val):,}")
print(f"  Test:       {len(X_test):,}")

print("\nPer-class split counts:")
for label in labels:
    print(
        f"{label} ({CLASS_NAMES[label]}): "
        f"train={(y_train == label).sum():,}, "
        f"validation={(y_val == label).sum():,}, "
        f"test={(y_test == label).sum():,}"
    )



# ============================================================
# 4. DEFINE REAL MODELS
# ============================================================

models = {
    "Random Forest": Pipeline([
        ("imputer", SimpleImputer(strategy="median")),
        ("classifier", RandomForestClassifier(
            n_estimators=400,
            class_weight="balanced_subsample",
            random_state=RANDOM_STATE,
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
            random_state=RANDOM_STATE,
            n_jobs=-1,
        )),
    ]),
}


# ============================================================
# 5. TRAIN AND COMPARE ON VALIDATION DATA
# ============================================================

print("\n" + "=" * 65)
print("MODEL TRAINING AND VALIDATION")
print("=" * 65)

validation_results = []
trained_models = {}

for model_name, pipeline in models.items():
    print(f"\nTraining {model_name}...")

    start = time.perf_counter()
    pipeline.fit(X_train, y_train)
    training_seconds = time.perf_counter() - start

    predictions = pipeline.predict(X_val)

    macro_f1 = f1_score(
        y_val, predictions, average="macro", zero_division=0
    )
    accuracy = accuracy_score(y_val, predictions)

    result = {
        "model": model_name,
        "validation_macro_f1": float(macro_f1),
        "validation_accuracy": float(accuracy),
        "training_seconds": round(training_seconds, 3),
    }

    validation_results.append(result)
    trained_models[model_name] = pipeline

    print(f"  Validation macro F1: {macro_f1:.4f}")
    print(f"  Validation accuracy: {accuracy:.4f}")
    print(f"  Training time: {training_seconds:.2f} seconds")

comparison = pd.DataFrame(validation_results).sort_values(
    "validation_macro_f1",
    ascending=False,
)

comparison.to_csv(
    REPORT_DIR / "model_comparison.csv",
    index=False,
)

best_model_name = comparison.iloc[0]["model"]
best_pipeline = trained_models[best_model_name]

print(f"\nSelected using validation macro F1: {best_model_name}")
print(f"Saved {REPORT_DIR / 'model_comparison.csv'}")


# ============================================================
# 6. REFIT WINNER ON TRAINING + VALIDATION
# ============================================================

print("\nRefitting the selected model on training + validation data...")

X_final_train = pd.concat([X_train, X_val], axis=0)
y_final_train = pd.concat([y_train, y_val], axis=0)

best_pipeline.fit(X_final_train, y_final_train)


# ============================================================
# 7. FINAL TEST EVALUATION — USED ONCE
# ============================================================

print("\n" + "=" * 65)
print("FINAL HELD-OUT TEST RESULTS")
print("=" * 65)

test_predictions = best_pipeline.predict(X_test)

test_accuracy = accuracy_score(y_test, test_predictions)
test_macro_f1 = f1_score(
    y_test,
    test_predictions,
    labels=labels,
    average="macro",
    zero_division=0,
)

print(f"Selected model: {best_model_name}")
print(f"Test accuracy:  {test_accuracy:.4f}")
print(f"Test macro F1:  {test_macro_f1:.4f}")

report_dict = classification_report(
    y_test,
    test_predictions,
    labels=labels,
    target_names=[CLASS_NAMES[label] for label in labels],
    output_dict=True,
    zero_division=0,
)

report_df = pd.DataFrame(report_dict).transpose()
report_df.to_csv(REPORT_DIR / "classification_report.csv")

print("\nPer-class evaluation:")
print(classification_report(
    y_test,
    test_predictions,
    labels=labels,
    target_names=[CLASS_NAMES[label] for label in labels],
    zero_division=0,
))

cm = confusion_matrix(y_test, test_predictions, labels=labels)

cm_df = pd.DataFrame(
    cm,
    index=[f"Actual {label} - {CLASS_NAMES[label]}" for label in labels],
    columns=[f"Predicted {label} - {CLASS_NAMES[label]}" for label in labels],
)

cm_df.to_csv(REPORT_DIR / "confusion_matrix.csv")
print(f"Saved {REPORT_DIR / 'confusion_matrix.csv'}")


# ============================================================
# 8. FEATURE IMPORTANCE
# ============================================================

classifier = best_pipeline.named_steps["classifier"]

if hasattr(classifier, "feature_importances_"):
    importance_df = pd.DataFrame({
        "feature": feature_names,
        "importance": classifier.feature_importances_,
    }).sort_values("importance", ascending=False)

    importance_df.to_csv(
        REPORT_DIR / "feature_importance.csv",
        index=False,
    )

    print("\nTop 10 features by model importance:")
    print(importance_df.head(10).to_string(index=False))
    print(f"Saved {REPORT_DIR / 'feature_importance.csv'}")


# ============================================================
# 9. SINGLE-ROW INFERENCE LATENCY
# ============================================================

# Warm up the prediction path before timing.
sample = X_test.iloc[[0]]
best_pipeline.predict(sample)

iterations = 100
start = time.perf_counter()

for _ in range(iterations):
    best_pipeline.predict(sample)

latency_ms = (
    time.perf_counter() - start
) * 1000 / iterations

print(f"\nMean single-row inference latency: {latency_ms:.3f} ms")


# ============================================================
# 10. SAVE MODEL AND METADATA
# ============================================================

model_path = MODEL_DIR / "engineguard_classifier.joblib"
joblib.dump(best_pipeline, model_path)

metadata = {
    "project": "EngineGuard",
    "selected_model": best_model_name,
    "target_column": TARGET,
    "class_names": {
        str(label): CLASS_NAMES[label] for label in labels
    },
    "feature_names": feature_names,
    "random_state": RANDOM_STATE,
    "duplicate_rows_removed_for_training": duplicate_count,
    "original_dataset_rows": int(len(pd.read_csv(DATA_PATH))),
    "rows_after_deduplication": int(len(df)),
    "split_sizes": {
        "train": int(len(X_train)),
        "validation": int(len(X_val)),
        "test": int(len(X_test)),
    },
    "selection_metric": "validation_macro_f1",
    "test_accuracy": float(test_accuracy),
    "test_macro_f1": float(test_macro_f1),
    "mean_single_row_inference_latency_ms": float(latency_ms),
    "warning": (
        "Evaluation uses a stratified random split. If records from "
        "the same experiment or operating condition are correlated, "
        "this may overestimate generalization to unseen experiments."
    ),
}

with open(
    MODEL_DIR / "model_metadata.json",
    "w",
    encoding="utf-8",
) as file:
    json.dump(metadata, file, indent=2)

print(f"\nSaved trained pipeline: {model_path}")
print(f"Saved metadata: {MODEL_DIR / 'model_metadata.json'}")

print("\n" + "=" * 65)
print("TRAINING PIPELINE COMPLETE")
print("=" * 65)
