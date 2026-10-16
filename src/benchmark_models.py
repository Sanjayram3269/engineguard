
from pathlib import Path
import json
import time

import joblib
import numpy as np
import pandas as pd
import xgboost as xgb

from sklearn.ensemble import ExtraTreesClassifier, RandomForestClassifier
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
REPORT_DIR = ROOT / "reports"
MODEL_DIR = ROOT / "models"

REPORT_DIR.mkdir(parents=True, exist_ok=True)
MODEL_DIR.mkdir(parents=True, exist_ok=True)

TARGET = "Fault"
SEED = 42

CLASS_NAMES = {
    0: "Normal (no fault)",
    1: "Fault type 1",
    2: "Fault type 2",
    3: "Fault type 3",
}


# ============================================================
# 2. LOAD AND VALIDATE DATA
# ============================================================

if not DATA_PATH.exists():
    raise FileNotFoundError(f"Dataset not found: {DATA_PATH}")

df = pd.read_csv(DATA_PATH)

if TARGET not in df.columns:
    raise ValueError(f"Target column '{TARGET}' is missing.")

if not all(pd.api.types.is_numeric_dtype(dtype) for dtype in df.dtypes):
    raise ValueError("Expected numeric features and numeric target.")

if df.isna().sum().sum():
    print("Warning: missing values found; the pipeline will impute them.")

duplicate_count = int(df.duplicated().sum())
df = df.drop_duplicates().reset_index(drop=True)

X = df.drop(columns=[TARGET])
y = df[TARGET].astype(int)
feature_names = X.columns.tolist()
labels = sorted(CLASS_NAMES)

if set(y.unique()) != set(labels):
    raise ValueError(f"Unexpected fault labels: {sorted(y.unique())}")

print("=" * 65)
print("ENGINEGUARD | MODEL BENCHMARK")
print("=" * 65)
print(f"Rows after deduplication: {len(df):,}")
print(f"Features: {len(feature_names)}")
print(f"Duplicate rows removed: {duplicate_count}")


# ============================================================
# 3. STRATIFIED TRAIN / VALIDATION / TEST SPLIT
# ============================================================

# First reserve 15% for final testing.
all_indices = np.arange(len(df))

train_val_idx, test_idx = train_test_split(
    all_indices,
    test_size=0.15,
    random_state=SEED,
    stratify=y,
)

# Split the remaining 85% into 70% train and 15% validation
# of the full dataset.
train_idx, val_idx = train_test_split(
    train_val_idx,
    test_size=0.15 / 0.85,
    random_state=SEED,
    stratify=y.iloc[train_val_idx],
)

X_train, y_train = X.iloc[train_idx], y.iloc[train_idx]
X_val, y_val = X.iloc[val_idx], y.iloc[val_idx]
X_test, y_test = X.iloc[test_idx], y.iloc[test_idx]

print("\nSplit sizes:")
print(f"Training:   {len(train_idx):,}")
print(f"Validation: {len(val_idx):,}")
print(f"Final test: {len(test_idx):,}")


# ============================================================
# 4. DEFINE MODELS
# ============================================================

models = {
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


# ============================================================
# 5. TRAIN AND SELECT USING VALIDATION MACRO F1
# ============================================================

results = []
trained_models = {}

for name, pipeline in models.items():
    print(f"\nTraining {name}...")
    start = time.perf_counter()

    pipeline.fit(X_train, y_train)
    training_seconds = time.perf_counter() - start

    predictions = pipeline.predict(X_val)

    accuracy = accuracy_score(y_val, predictions)
    macro_f1 = f1_score(
        y_val,
        predictions,
        labels=labels,
        average="macro",
        zero_division=0,
    )

    results.append({
        "model": name,
        "validation_accuracy": float(accuracy),
        "validation_macro_f1": float(macro_f1),
        "training_seconds": round(training_seconds, 3),
    })
    trained_models[name] = pipeline

    print(f"Validation accuracy: {accuracy:.4f}")
    print(f"Validation macro F1: {macro_f1:.4f}")
    print(f"Training time: {training_seconds:.2f} seconds")

results_df = pd.DataFrame(results).sort_values(
    "validation_macro_f1", ascending=False
)

comparison_path = REPORT_DIR / "benchmark_model_comparison.csv"
results_df.to_csv(comparison_path, index=False)

best_name = results_df.iloc[0]["model"]
best_model = trained_models[best_name]

print("\nValidation ranking:")
print(results_df.to_string(index=False))
print(f"\nSelected model: {best_name}")
print("Selection criterion: validation macro F1")


# ============================================================
# 6. REFIT WINNER ON TRAIN + VALIDATION
# ============================================================

X_final_train = pd.concat([X_train, X_val])
y_final_train = pd.concat([y_train, y_val])

best_model.fit(X_final_train, y_final_train)


# ============================================================
# 7. FINAL TEST EVALUATION
# ============================================================

# The final test set is used only after model selection.
test_predictions = best_model.predict(X_test)

test_accuracy = accuracy_score(y_test, test_predictions)
test_macro_f1 = f1_score(
    y_test,
    test_predictions,
    labels=labels,
    average="macro",
    zero_division=0,
)

print("\n" + "=" * 65)
print("FINAL HELD-OUT TEST RESULTS")
print("=" * 65)
print(f"Selected model: {best_name}")
print(f"Test accuracy: {test_accuracy:.4f}")
print(f"Test macro F1: {test_macro_f1:.4f}")

report = classification_report(
    y_test,
    test_predictions,
    labels=labels,
    target_names=[CLASS_NAMES[i] for i in labels],
    output_dict=True,
    zero_division=0,
)

print("\nPer-class results:")
print(classification_report(
    y_test,
    test_predictions,
    labels=labels,
    target_names=[CLASS_NAMES[i] for i in labels],
    zero_division=0,
))

pd.DataFrame(report).transpose().to_csv(
    REPORT_DIR / "benchmark_classification_report.csv"
)

cm = confusion_matrix(y_test, test_predictions, labels=labels)
cm_df = pd.DataFrame(
    cm,
    index=[f"Actual {i} - {CLASS_NAMES[i]}" for i in labels],
    columns=[f"Predicted {i} - {CLASS_NAMES[i]}" for i in labels],
)
cm_df.to_csv(REPORT_DIR / "benchmark_confusion_matrix.csv")


# ============================================================
# 8. FEATURE IMPORTANCE, WHEN SUPPORTED
# ============================================================

classifier = best_model.named_steps["classifier"]

if hasattr(classifier, "feature_importances_"):
    importance_df = pd.DataFrame({
        "feature": feature_names,
        "importance": classifier.feature_importances_,
    }).sort_values("importance", ascending=False)

    importance_df.to_csv(
        REPORT_DIR / "benchmark_feature_importance.csv",
        index=False,
    )

    print("\nTop 10 features:")
    print(importance_df.head(10).to_string(index=False))


# ============================================================
# 9. SAVE SEPARATE MODEL AND METADATA
# ============================================================

model_path = MODEL_DIR / "benchmark_classifier.joblib"
metadata_path = MODEL_DIR / "benchmark_metadata.json"

joblib.dump(best_model, model_path)

metadata = {
    "project": "EngineGuard",
    "selected_model": best_name,
    "target_column": TARGET,
    "class_names": {str(i): CLASS_NAMES[i] for i in labels},
    "feature_names": feature_names,
    "random_state": SEED,
    "duplicate_rows_removed": duplicate_count,
    "split_sizes": {
        "train": len(train_idx),
        "validation": len(val_idx),
        "test": len(test_idx),
    },
    "selection_metric": "validation_macro_f1",
    "validation_results": results,
    "test_accuracy": float(test_accuracy),
    "test_macro_f1": float(test_macro_f1),
    "evaluation_warning": (
        "Stratified random split. If related records from the same "
        "experiment or operating condition appear in multiple splits, "
        "test results may overestimate generalization to unseen runs."
    ),
}

with open(metadata_path, "w", encoding="utf-8") as file:
    json.dump(metadata, file, indent=2)

print(f"\nSaved comparison: {comparison_path}")
print(f"Saved report: {REPORT_DIR / 'benchmark_classification_report.csv'}")
print(f"Saved confusion matrix: {REPORT_DIR / 'benchmark_confusion_matrix.csv'}")
print(f"Saved model: {model_path}")
print(f"Saved metadata: {metadata_path}")
print("\nBENCHMARK COMPLETE")
