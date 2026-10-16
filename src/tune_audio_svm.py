
from pathlib import Path

import joblib
import pandas as pd

from sklearn.model_selection import train_test_split, GridSearchCV, StratifiedKFold
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.svm import SVC
from sklearn.metrics import (
    accuracy_score,
    f1_score,
    classification_report,
    ConfusionMatrixDisplay,
)
import matplotlib.pyplot as plt


# --------------------------------------------------
# PATHS
# --------------------------------------------------

ROOT = Path(__file__).resolve().parent.parent

CSV_PATH = ROOT / "audio_csv" / "audio_mfcc_features.csv"
MODEL_DIR = ROOT / "models" / "audio"
OUTPUT_DIR = ROOT / "outputs" / "audio"


# --------------------------------------------------
# LOAD DATA
# --------------------------------------------------

def main():

    df = pd.read_csv(CSV_PATH)

    feature_columns = [
        col for col in df.columns if col.startswith("mfcc_")
    ]

    X = df[feature_columns].astype(float)
    y = df["label"].astype(str)

    if X.isna().any().any():
        raise ValueError("MFCC features contain missing values.")

    # Keep the same split as the baseline for comparison.
    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=0.20,
        random_state=42,
        stratify=y,
    )

    # --------------------------------------------------
    # GRID SEARCH: TRAINING DATA ONLY
    # --------------------------------------------------

    pipeline = Pipeline([
        ("scaler", StandardScaler()),
        ("svm", SVC(
            kernel="rbf",
            class_weight="balanced",
        )),
    ])

    parameter_grid = {
        "svm__C": [0.1, 1, 10, 100],
        "svm__gamma": ["scale", 0.001, 0.01, 0.1, 1],
    }

    cv = StratifiedKFold(
        n_splits=5,
        shuffle=True,
        random_state=42,
    )

    search = GridSearchCV(
        estimator=pipeline,
        param_grid=parameter_grid,
        scoring="f1_macro",
        cv=cv,
        n_jobs=-1,
        refit=True,
        return_train_score=True,
    )

    print("Tuning SVM on training data...")
    print(f"Training recordings: {len(X_train)}")
    print(f"Held-out test recordings: {len(X_test)}")
    print("Testing 20 parameter combinations with 5-fold CV.")

    search.fit(X_train, y_train)

    best_model = search.best_estimator_

    print("\n========== TUNING RESULTS ==========")
    print("Best parameters:", search.best_params_)
    print(f"Best CV macro F1: {search.best_score_:.4f}")

    # Save all CV results for later analysis.
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    MODEL_DIR.mkdir(parents=True, exist_ok=True)

    cv_results = pd.DataFrame(search.cv_results_)
    cv_results.to_csv(
        OUTPUT_DIR / "svm_tuning_results.csv",
        index=False,
    )

    # --------------------------------------------------
    # EVALUATE SELECTED MODEL ON HELD-OUT TEST SET
    # --------------------------------------------------

    predictions = best_model.predict(X_test)

    accuracy = accuracy_score(y_test, predictions)
    macro_f1 = f1_score(
        y_test,
        predictions,
        average="macro",
        zero_division=0,
    )

    report = classification_report(
        y_test,
        predictions,
        zero_division=0,
    )

    print("\n========== HELD-OUT TEST RESULTS ==========")
    print(f"Test accuracy: {accuracy:.4f}")
    print(f"Test macro F1: {macro_f1:.4f}")
    print("\nClassification report:")
    print(report)

    # Save the selected pipeline.
    model_path = MODEL_DIR / "audio_svm_tuned.joblib"
    joblib.dump(best_model, model_path)

    # Save the final report.
    report_path = OUTPUT_DIR / "tuned_svm_report.txt"

    with open(report_path, "w", encoding="utf-8") as f:
        f.write("EnginePulse Tuned SVM\n")
        f.write("=====================\n")
        f.write(f"Best parameters: {search.best_params_}\n")
        f.write(f"Best CV macro F1: {search.best_score_:.4f}\n")
        f.write(f"Test accuracy: {accuracy:.4f}\n")
        f.write(f"Test macro F1: {macro_f1:.4f}\n\n")
        f.write(report)

    # Save the tuned model's confusion matrix.
    display = ConfusionMatrixDisplay.from_predictions(
        y_test,
        predictions,
        labels=best_model.named_steps["svm"].classes_,
        cmap="Blues",
        values_format="d",
    )

    display.ax_.set_title("EnginePulse — Tuned SVM")
    display.figure_.tight_layout()
    display.figure_.savefig(
        OUTPUT_DIR / "tuned_svm_confusion_matrix.png",
        dpi=150,
        bbox_inches="tight",
    )
    plt.show()
    plt.close(display.figure_)

    print("\nSaved model:", model_path)
    print("Saved report:", report_path)
    print("Saved CV search:", OUTPUT_DIR / "svm_tuning_results.csv")


if __name__ == "__main__":
    main()
