
from pathlib import Path

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

# Reproduce the benchmark's training and validation split.
indices = pd.RangeIndex(len(df))
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

# Select top features using training data only.
importance_model = make_model()
importance_model.fit(X_train, y_train)

importance = pd.Series(
    importance_model.named_steps["classifier"].feature_importances_,
    index=X.columns,
).sort_values(ascending=False)

importance.rename_axis("feature").reset_index(name="importance").to_csv(
    REPORT_DIR / "subset_training_feature_importance.csv",
    index=False,
)

top8 = importance.head(8).index.tolist()

# These features are removed to test the effect of redundancy.
# Lambda and AFR are nearly duplicates; RPM and Speed are highly
# correlated; Force overlaps strongly with TPS and MAP.
redundant_features = ["Lambda", "AFR", "Speed", "Force"]
reduced = [c for c in X.columns if c not in redundant_features]

experiments = {
    "All 14 features": X.columns.tolist(),
    "Reduced correlated features": reduced,
    "Top 8 training-importance features": top8,
}

results = []

for name, features in experiments.items():
    model = make_model()
    model.fit(X_train[features], y_train)
    pred = model.predict(X_val[features])

    report = classification_report(
        y_val,
        pred,
        labels=LABELS,
        target_names=CLASS_NAMES,
        output_dict=True,
        zero_division=0,
    )

    row = {
        "experiment": name,
        "feature_count": len(features),
        "features": ", ".join(features),
        "validation_accuracy": accuracy_score(y_val, pred),
        "validation_macro_f1": f1_score(
            y_val, pred, labels=LABELS,
            average="macro", zero_division=0
        ),
        "lean_recall": report["Lean mixture"]["recall"],
        "low_voltage_recall": report["Low voltage"]["recall"],
        "normal_recall": report["Normal"]["recall"],
        "rich_recall": report["Rich mixture"]["recall"],
    }
    results.append(row)

    print(f"\n--- {name} ---")
    print(f"Features: {len(features)}")
    print(f"Accuracy: {row['validation_accuracy']:.4f}")
    print(f"Macro F1: {row['validation_macro_f1']:.4f}")
    print(f"Lean recall: {row['lean_recall']:.4f}")
    print(f"Low-voltage recall: {row['low_voltage_recall']:.4f}")
    print("Feature list:", ", ".join(features))

    print(classification_report(
        y_val, pred, labels=LABELS,
        target_names=CLASS_NAMES, zero_division=0,
    ))

results_df = pd.DataFrame(results).sort_values(
    "validation_macro_f1", ascending=False
)

output = REPORT_DIR / "feature_subset_results.csv"
results_df.to_csv(output, index=False)

print("\nFEATURE SUBSET COMPARISON")
print(results_df[
    [
        "experiment",
        "feature_count",
        "validation_accuracy",
        "validation_macro_f1",
        "lean_recall",
        "low_voltage_recall",
    ]
].to_string(index=False))

print(f"\nSaved results: {output}")
print("Final test set was not used for feature selection or comparison.")
print("Existing models and reports were not overwritten.")
