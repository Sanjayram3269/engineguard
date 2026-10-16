
from pathlib import Path

import joblib
import pandas as pd
import matplotlib.pyplot as plt

from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import (
    train_test_split,
    GridSearchCV,
    StratifiedKFold,
)
from sklearn.metrics import (
    accuracy_score,
    f1_score,
    classification_report,
    confusion_matrix,
    ConfusionMatrixDisplay,
)
from sklearn.pipeline import Pipeline


# --------------------------------------------------
# 1. PROJECT PATHS
# --------------------------------------------------

ROOT = Path(__file__).resolve().parent.parent

CSV_PATH = ROOT / "audio_csv" / "audio_mfcc_features.csv"

MODEL_DIR = ROOT / "models" / "audio"
OUTPUT_DIR = ROOT / "outputs" / "audio"

MODEL_DIR.mkdir(parents=True, exist_ok=True)
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


# --------------------------------------------------
# 2. LOAD DATA
# --------------------------------------------------

df = pd.read_csv(CSV_PATH)

# Keep only the MFCC feature columns.
# Exclude metadata and the target label.
excluded_columns = ["filename", "label", "path"]

feature_columns = [
    col for col in df.columns
    if col not in excluded_columns
]

X = df[feature_columns].apply(
    pd.to_numeric, errors="raise"
)
y = df["label"]

print("=" * 60)
print("TUNED RANDOM FOREST - ENGINEPULSE")
print("=" * 60)

print(f"Total recordings: {len(df)}")
print(f"Number of features: {len(feature_columns)}")
print(f"Classes: {sorted(y.unique())}")
print("\nClass distribution:")
print(y.value_counts())


# --------------------------------------------------
# 3. TRAIN-TEST SPLIT
# --------------------------------------------------

X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.20,
    random_state=42,
    stratify=y,
)

print(f"\nTraining recordings: {len(X_train)}")
print(f"Held-out test recordings: {len(X_test)}")


# --------------------------------------------------
# 4. RANDOM FOREST PIPELINE
# --------------------------------------------------

pipeline = Pipeline([
    (
        "rf",
        RandomForestClassifier(
            random_state=42,
            n_jobs=1,
        ),
    )
])


# --------------------------------------------------
# 5. HYPERPARAMETER SEARCH
# --------------------------------------------------

param_grid = {
    "rf__n_estimators": [100, 300, 500],
    "rf__max_depth": [None, 10, 20],
    "rf__min_samples_split": [2, 5],
    "rf__min_samples_leaf": [1, 2],
    "rf__max_features": ["sqrt", "log2", 1.0],
    "rf__class_weight": [None, "balanced"],
}

cv = StratifiedKFold(
    n_splits=5,
    shuffle=True,
    random_state=42,
)

grid_search = GridSearchCV(
    estimator=pipeline,
    param_grid=param_grid,
    scoring="f1_macro",
    cv=cv,
    n_jobs=-1,
    verbose=1,
    refit=True,
)

print("\nStarting Random Forest hyperparameter search...")
grid_search.fit(X_train, y_train)

best_model = grid_search.best_estimator_

print("\nBest parameters:")
print(grid_search.best_params_)

print(f"\nBest CV macro F1: {grid_search.best_score_:.4f}")


# --------------------------------------------------
# 6. EVALUATE ON THE HELD-OUT TEST SET
# --------------------------------------------------

y_pred = best_model.predict(X_test)

accuracy = accuracy_score(y_test, y_pred)
macro_f1 = f1_score(
    y_test,
    y_pred,
    average="macro",
)

report = classification_report(
    y_test,
    y_pred,
    zero_division=0,
)

print("\nTest accuracy:", f"{accuracy:.4f}")
print("Test macro F1:", f"{macro_f1:.4f}")
print("\nClassification report:")
print(report)

print("Confusion matrix:")
print(confusion_matrix(y_test, y_pred))


# --------------------------------------------------
# 7. SAVE RANDOM FOREST MODEL
# --------------------------------------------------

model_path = MODEL_DIR / "audio_random_forest_tuned.joblib"

joblib.dump(best_model, model_path)

print(f"\nModel saved to: {model_path}")


# --------------------------------------------------
# 8. SAVE CLASSIFICATION REPORT
# --------------------------------------------------

report_path = OUTPUT_DIR / "random_forest_tuned_report.txt"

with open(report_path, "w", encoding="utf-8") as f:
    f.write("TUNED RANDOM FOREST - ENGINEPULSE\n")
    f.write("=" * 45 + "\n\n")
    f.write(f"Total recordings: {len(df)}\n")
    f.write(f"Number of features: {len(feature_columns)}\n")
    f.write(f"Training recordings: {len(X_train)}\n")
    f.write(f"Test recordings: {len(X_test)}\n")
    f.write(f"Best parameters: {grid_search.best_params_}\n")
    f.write(f"Best CV macro F1: {grid_search.best_score_:.4f}\n")
    f.write(f"Test accuracy: {accuracy:.4f}\n")
    f.write(f"Test macro F1: {macro_f1:.4f}\n\n")
    f.write(report)
    f.write("\nConfusion matrix:\n")
    f.write(str(confusion_matrix(y_test, y_pred)))

print(f"Report saved to: {report_path}")


# --------------------------------------------------
# 9. SAVE CROSS-VALIDATION RESULTS
# --------------------------------------------------

cv_results = pd.DataFrame(grid_search.cv_results_)

cv_results = cv_results.sort_values(
    by="rank_test_score"
)

results_path = OUTPUT_DIR / "random_forest_tuning_results.csv"

cv_results.to_csv(results_path, index=False)

print(f"CV results saved to: {results_path}")


# --------------------------------------------------
# 10. SAVE CONFUSION MATRIX IMAGE
# --------------------------------------------------

labels = best_model.named_steps["rf"].classes_

cm = confusion_matrix(
    y_test,
    y_pred,
    labels=labels,
)

display = ConfusionMatrixDisplay(
    confusion_matrix=cm,
    display_labels=labels,
)

fig, ax = plt.subplots(figsize=(9, 7))

display.plot(
    ax=ax,
    cmap="Blues",
    values_format="d",
    xticks_rotation=25,
)

ax.set_title("Tuned Random Forest - Audio Classification")
fig.tight_layout()

cm_path = OUTPUT_DIR / "random_forest_tuned_confusion_matrix.png"

fig.savefig(cm_path, dpi=200, bbox_inches="tight")
plt.close(fig)

print(f"Confusion matrix saved to: {cm_path}")

print("\nRandom Forest training and evaluation completed.")
