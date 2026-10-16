
from pathlib import Path
import json

import joblib
import numpy as np
import pandas as pd

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

ROOT = Path(__file__).resolve().parent.parent
DATA_PATH = ROOT / "data" / "EngineFaultDB_Final.csv"
REPORT_DIR = ROOT / "reports"
MODEL_DIR = ROOT / "models"

REPORT_DIR.mkdir(exist_ok=True)
MODEL_DIR.mkdir(exist_ok=True)

SEED = 42
TARGET = "Fault"
LABELS = [0, 1, 2, 3]
CLASS_NAMES = {
    0: "Normal",
    1: "Rich mixture",
    2: "Lean mixture",
    3: "Low voltage",
}

df = pd.read_csv(DATA_PATH).drop_duplicates().reset_index(drop=True)
X = df.drop(columns=[TARGET])
y = df[TARGET].astype(int)

# Reproduce the benchmark split exactly.
indices = np.arange(len(df))
train_val_idx, test_idx = train_test_split(
    indices,
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
X_test, y_test = X.iloc[test_idx], y.iloc[test_idx]

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

# Select features using training data only.
selector = make_model()
selector.fit(X_train, y_train)

importance = pd.Series(
    selector.named_steps["classifier"].feature_importances_,
    index=X.columns,
).sort_values(ascending=False)

features = importance.head(8).index.tolist()
print("Selected top 8 features:")
for feature in features:
    print(f"  - {feature}")

# Refit on train + validation, then evaluate once on held-out test.
X_final = pd.concat([X_train[features], X_val[features]])
y_final = pd.concat([y_train, y_val])

model = make_model()
model.fit(X_final, y_final)

predictions = model.predict(X_test[features])

accuracy = accuracy_score(y_test, predictions)
macro_f1 = f1_score(
    y_test,
    predictions,
    labels=LABELS,
    average="macro",
    zero_division=0,
)

print("\nTOP-8 HELD-OUT TEST RESULTS")
print(f"Accuracy: {accuracy:.4f}")
print(f"Macro F1: {macro_f1:.4f}")
print(classification_report(
    y_test,
    predictions,
    labels=LABELS,
    target_names=[CLASS_NAMES[i] for i in LABELS],
    zero_division=0,
))

report = classification_report(
    y_test,
    predictions,
    labels=LABELS,
    target_names=[CLASS_NAMES[i] for i in LABELS],
    output_dict=True,
    zero_division=0,
)

pd.DataFrame(report).transpose().to_csv(
    REPORT_DIR / "top8_classification_report.csv"
)

cm = confusion_matrix(y_test, predictions, labels=LABELS)
pd.DataFrame(
    cm,
    index=[f"Actual {i} - {CLASS_NAMES[i]}" for i in LABELS],
    columns=[f"Predicted {i} - {CLASS_NAMES[i]}" for i in LABELS],
).to_csv(REPORT_DIR / "top8_confusion_matrix.csv")

# Save separately so the existing inference model remains untouched.
model_path = MODEL_DIR / "top8_classifier_candidate.joblib"
metadata_path = MODEL_DIR / "top8_metadata_candidate.json"

joblib.dump(model, model_path)

metadata = {
    "project": "EngineGuard",
    "selected_model": "Random Forest",
    "feature_selection": "Top 8 feature importances from training split",
    "target_column": TARGET,
    "class_names": {str(k): v for k, v in CLASS_NAMES.items()},
    "feature_names": features,
    "random_state": SEED,
    "split_sizes": {
        "train": len(train_idx),
        "validation": len(val_idx),
        "test": len(test_idx),
    },
    "test_accuracy": float(accuracy),
    "test_macro_f1": float(macro_f1),
    "evaluation_warning": (
        "Stratified random split. Related measurements from the same "
        "experiment may occur across splits; generalization to unseen "
        "engine experiments has not been established."
    ),
}

with open(metadata_path, "w", encoding="utf-8") as file:
    json.dump(metadata, file, indent=2)

print(f"\nSaved candidate model: {model_path}")
print(f"Saved candidate metadata: {metadata_path}")
print("Existing model files were not overwritten.")
