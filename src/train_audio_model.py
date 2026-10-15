
from pathlib import Path

import joblib
import matplotlib.pyplot as plt
import pandas as pd

from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.svm import SVC
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    ConfusionMatrixDisplay,
    confusion_matrix,
    f1_score,
)


# --------------------------------------------------
# 1. PATHS
# --------------------------------------------------

PROJECT_ROOT = Path(__file__).resolve().parent.parent

CSV_PATH = (
    PROJECT_ROOT
    / "audio_csv"
    / "audio_mfcc_features.csv"
)

MODEL_DIR = PROJECT_ROOT / "models" / "audio"
OUTPUT_DIR = PROJECT_ROOT / "outputs" / "audio"

MODEL_PATH = MODEL_DIR / "audio_svm_model.joblib"
METRICS_PATH = OUTPUT_DIR / "audio_classification_report.txt"
MATRIX_PATH = OUTPUT_DIR / "audio_confusion_matrix.png"


# --------------------------------------------------
# 2. LOAD THE FEATURE DATASET
# --------------------------------------------------

def load_dataset():

    if not CSV_PATH.exists():
        raise FileNotFoundError(
            f"Feature CSV not found:\n{CSV_PATH}\n"
            "Check that audio_mfcc_features.csv is inside data/audio_csv."
        )

    df = pd.read_csv(CSV_PATH)

    if "label" not in df.columns:
        raise ValueError("The CSV must contain a 'label' column.")

    # Use only the MFCC mean and standard-deviation columns.
    feature_columns = [
        column
        for column in df.columns
        if column.startswith("mfcc_")
    ]

    if len(feature_columns) != 26:
        raise ValueError(
            f"Expected 26 MFCC features, found {len(feature_columns)}."
        )

    X = df[feature_columns].apply(pd.to_numeric, errors="coerce")
    y = df["label"].astype(str)

    # Stop if feature values are missing or invalid.
    if X.isna().any().any():
        raise ValueError(
            "MFCC features contain missing or non-numeric values."
        )

    if not X.map(lambda value: pd.notna(value) and abs(value) != float("inf")).all().all():
        raise ValueError("MFCC features contain infinite values.")

    if y.isna().any() or y.nunique() < 2:
        raise ValueError("The dataset needs at least two valid classes.")

    print("========== DATASET ==========")
    print(f"Recordings: {len(df)}")
    print(f"Features per recording: {len(feature_columns)}")
    print("\nClass counts:")
    print(y.value_counts().to_string())

    return X, y, feature_columns


# --------------------------------------------------
# 3. TRAIN AND EVALUATE
# --------------------------------------------------

def train_model():

    X, y, feature_columns = load_dataset()

    # Stratified split preserves approximate class proportions.
    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=0.20,
        random_state=42,
        stratify=y,
    )

    # Scaling is fitted only on training data through the pipeline.
    model = Pipeline([
        ("scaler", StandardScaler()),
        ("svm", SVC(
            kernel="rbf",
            C=1.0,
            gamma="scale",
            class_weight="balanced",
        )),
    ])

    print("\n========== TRAINING ==========")
    print(f"Training recordings: {len(X_train)}")
    print(f"Testing recordings: {len(X_test)}")

    model.fit(X_train, y_train)

    # Evaluate only on held-out test rows.
    y_pred = model.predict(X_test)

    accuracy = accuracy_score(y_test, y_pred)
    macro_f1 = f1_score(
        y_test,
        y_pred,
        average="macro",
        zero_division=0,
    )

    report = classification_report(
        y_test,
        y_pred,
        zero_division=0,
    )

    print("\n========== RESULTS ==========")
    print(f"Test accuracy: {accuracy:.4f} ({accuracy:.1%})")
    print(f"Macro F1-score: {macro_f1:.4f}")
    print("\nClassification report:")
    print(report)

    # Create output directories.
    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    # Save the complete pipeline, including its fitted scaler.
    joblib.dump(model, MODEL_PATH)

    # Save evaluation results.
    with open(METRICS_PATH, "w", encoding="utf-8") as file:
        file.write("EnginePulse Audio SVM Evaluation\n")
        file.write("================================\n")
        file.write(f"CSV: {CSV_PATH}\n")
        file.write(f"Training rows: {len(X_train)}\n")
        file.write(f"Test rows: {len(X_test)}\n")
        file.write(f"Accuracy: {accuracy:.4f}\n")
        file.write(f"Macro F1-score: {macro_f1:.4f}\n\n")
        file.write(report)

    # Confusion matrix.
    labels = model.named_steps["svm"].classes_
    matrix = confusion_matrix(
        y_test,
        y_pred,
        labels=labels,
    )

    display = ConfusionMatrixDisplay(
        confusion_matrix=matrix,
        display_labels=labels,
    )

    fig, ax = plt.subplots(figsize=(9, 7))
    display.plot(
        ax=ax,
        cmap="Blues",
        values_format="d",
        colorbar=False,
    )
    ax.set_title("EnginePulse Audio Classification — Test Set")
    fig.tight_layout()
    fig.savefig(MATRIX_PATH, dpi=150, bbox_inches="tight")
    plt.show()
    plt.close(fig)

    print("\n========== SAVED FILES ==========")
    print(f"Model: {MODEL_PATH}")
    print(f"Report: {METRICS_PATH}")
    print(f"Confusion matrix: {MATRIX_PATH}")

    print(
        "\nImportant: this is a baseline random-split evaluation. "
        "Related recordings or duplicate audio can inflate results."
    )


if __name__ == "__main__":
    train_model()
