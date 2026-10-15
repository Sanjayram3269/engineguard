
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.metrics import confusion_matrix
from sklearn.model_selection import train_test_split

ROOT = Path(__file__).resolve().parent.parent
DATA_PATH = ROOT / "data" / "EngineFaultDB_Final.csv"
MODEL_PATH = ROOT / "models" / "benchmark_classifier.joblib"
REPORT_DIR = ROOT / "reports"

CLASS_NAMES = {
    0: "Normal",
    1: "Rich mixture",
    2: "Lean mixture",
    3: "Low voltage",
}

REPORT_DIR.mkdir(exist_ok=True)

# Reproduce the benchmark's exact test split.
df = pd.read_csv(DATA_PATH).drop_duplicates().reset_index(drop=True)
X = df.drop(columns=["Fault"])
y = df["Fault"].astype(int)

all_indices = np.arange(len(df))
train_val_idx, test_idx = train_test_split(
    all_indices,
    test_size=0.15,
    random_state=42,
    stratify=y,
)

X_test = X.iloc[test_idx]
y_test = y.iloc[test_idx]

model = joblib.load(MODEL_PATH)
predictions = model.predict(X_test)
probabilities = model.predict_proba(X_test)

# Map each probability column to its actual class label.
model_classes = list(model.named_steps["classifier"].classes_)
probability_columns = {
    label: probabilities[:, i]
    for i, label in enumerate(model_classes)
}

# 1. Confusion matrix with readable labels.
cm = confusion_matrix(y_test, predictions, labels=[0, 1, 2, 3])
cm_df = pd.DataFrame(
    cm,
    index=[f"Actual {i} - {CLASS_NAMES[i]}" for i in range(4)],
    columns=[f"Predicted {i} - {CLASS_NAMES[i]}" for i in range(4)],
)
cm_df.to_csv(REPORT_DIR / "error_analysis_confusion_matrix.csv")

print("\nCONFUSION MATRIX")
print(cm_df.to_string())

# 2. Save all misclassified examples and their probabilities.
errors = X_test.copy()
errors.insert(0, "actual_label", y_test.to_numpy())
errors.insert(1, "actual_class", y_test.map(CLASS_NAMES).to_numpy())
errors.insert(2, "predicted_label", predictions)
errors.insert(
    3,
    "predicted_class",
    [CLASS_NAMES[int(p)] for p in predictions],
)

for label, values in probability_columns.items():
    errors[f"probability_{CLASS_NAMES[label]}"] = values

errors["prediction_confidence"] = probabilities.max(axis=1)
errors["probability_margin"] = (
    np.sort(probabilities, axis=1)[:, -1]
    - np.sort(probabilities, axis=1)[:, -2]
)

misclassified = errors[
    errors["actual_label"] != errors["predicted_label"]
].copy()

misclassified.to_csv(
    REPORT_DIR / "misclassified_test_examples.csv",
    index=False,
)

print(f"\nMisclassified test rows: {len(misclassified):,} / {len(X_test):,}")
print("Saved individual errors to reports/misclassified_test_examples.csv")

# 3. Inspect the two difficult classes.
for actual_label in [2, 3]:
    subset = errors[errors["actual_label"] == actual_label]
    print(f"\nACTUAL CLASS: {CLASS_NAMES[actual_label]}")
    print(f"Rows: {len(subset):,}")
    print(
        subset["predicted_class"]
        .value_counts()
        .to_string()
    )
    print(
        "Mean model confidence:",
        round(float(subset["prediction_confidence"].mean()), 4),
    )
    print(
        "Mean top-two probability margin:",
        round(float(subset["probability_margin"].mean()), 4),
    )

# 4. Compare class-wise feature means and standard deviations.
stats = df.groupby("Fault")[X.columns].agg(["mean", "std"])
stats.columns = [f"{feature}_{stat}" for feature, stat in stats.columns]
stats.index = [CLASS_NAMES[int(i)] for i in stats.index]
stats.to_csv(REPORT_DIR / "class_feature_statistics.csv")

print("\nSaved class feature statistics to reports/class_feature_statistics.csv")
print("ERROR ANALYSIS COMPLETE")
