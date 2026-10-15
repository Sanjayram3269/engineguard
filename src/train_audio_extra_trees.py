
from pathlib import Path

import joblib
import pandas as pd

from sklearn.ensemble import ExtraTreesClassifier
from sklearn.metrics import (
    accuracy_score,
    f1_score,
    classification_report,
)
from sklearn.model_selection import (
    train_test_split,
    GridSearchCV,
    StratifiedKFold,
)
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler


# ============================================================
# 1. PROJECT PATHS
# ============================================================

ROOT = Path(__file__).resolve().parent.parent

CSV_PATH = ROOT / "audio_csv" / "audio_mfcc_features.csv"

MODEL_DIR = ROOT / "models" / "audio"
OUTPUT_DIR = ROOT / "outputs" / "audio"


# ============================================================
# 2. MAIN FUNCTION
# ============================================================

def main():

    # Load MFCC dataset
    if not CSV_PATH.exists():
        raise FileNotFoundError(
            f"Feature CSV not found: {CSV_PATH}"
        )

    df = pd.read_csv(CSV_PATH)

    feature_columns = [
        column
        for column in df.columns
        if column.startswith("mfcc_")
    ]

    if not feature_columns:
        raise ValueError(
            "No MFCC feature columns found in the CSV."
        )

    if "label" not in df.columns:
        raise ValueError(
            "The dataset does not contain a 'label' column."
        )

    X = df[feature_columns].astype(float)
    y = df["label"].astype(str)

    if X.isna().any().any():
        raise ValueError(
            "MFCC dataset contains missing values."
        )

    print("=" * 55)
    print("ENGINEPULSE - EXTRA TREES PARAMETER TUNING")
    print("=" * 55)

    print(f"Total recordings: {len(df)}")
    print(f"Number of features: {len(feature_columns)}")
    print(f"Classes: {sorted(y.unique())}")

    print("\nClass distribution:")
    print(y.value_counts())

    # ========================================================
    # 3. TRAIN/TEST SPLIT
    # ========================================================

    # Keep the same split as our previous experiments
    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=0.20,
        random_state=42,
        stratify=y,
    )

    print("\nTraining recordings:", len(X_train))
    print("Held-out test recordings:", len(X_test))

    # ========================================================
    # 4. BUILD THE PIPELINE
    # ========================================================

    pipeline = Pipeline([
        (
            "scaler",
            StandardScaler(),
        ),
        (
            "model",
            ExtraTreesClassifier(
                random_state=42,
                n_jobs=1,
            ),
        ),
    ])

    # ========================================================
    # 5. PARAMETER GRID
    # ========================================================

    param_grid = {
        "model__n_estimators": [300, 500],

        "model__max_depth": [
            None,
            10,
            20,
        ],

        "model__min_samples_split": [
            2,
            5,
        ],

        "model__min_samples_leaf": [
            1,
            2,
            4,
        ],

        "model__max_features": [
            "sqrt",
            0.5,
            1.0,
        ],

        "model__class_weight": [
            None,
            "balanced",
        ],
    }

    # 2 × 3 × 2 × 3 × 3 × 2 = 216 combinations

    cv = StratifiedKFold(
        n_splits=5,
        shuffle=True,
        random_state=42,
    )

    search = GridSearchCV(
        estimator=pipeline,
        param_grid=param_grid,
        scoring="f1_macro",
        cv=cv,
        n_jobs=-1,
        refit=True,
        return_train_score=True,
        verbose=1,
    )

    # ========================================================
    # 6. RUN GRID SEARCH
    # ========================================================

    print("\n========== STARTING GRID SEARCH ==========")
    print("Testing 216 combinations × 5 folds.")
    print("This may take a while on your CPU.")

    search.fit(X_train, y_train)

    print("\n========== BEST CROSS-VALIDATION RESULTS ==========")

    print("Best parameters:")
    print(search.best_params_)

    print(
        f"Best CV macro F1: "
        f"{search.best_score_:.4f}"
    )

    # ========================================================
    # 7. EVALUATE ON HELD-OUT TEST SET
    # ========================================================

    best_model = search.best_estimator_

    predictions = best_model.predict(X_test)

    accuracy = accuracy_score(
        y_test,
        predictions,
    )

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

    print("\nClassification report:\n")
    print(report)

    # ========================================================
    # 8. SAVE MODEL AND RESULTS
    # ========================================================

    MODEL_DIR.mkdir(
        parents=True,
        exist_ok=True,
    )

    OUTPUT_DIR.mkdir(
        parents=True,
        exist_ok=True,
    )

    model_path = (
        MODEL_DIR
        / "audio_extra_trees_tuned.joblib"
    )

    report_path = (
        OUTPUT_DIR
        / "extra_trees_tuned_report.txt"
    )

    results_path = (
        OUTPUT_DIR
        / "extra_trees_tuning_results.csv"
    )

    # Save the model under a new filename
    joblib.dump(
        best_model,
        model_path,
    )

    # Save the classification report
    with open(
        report_path,
        "w",
        encoding="utf-8",
    ) as file:

        file.write(
            "EnginePulse - Tuned Extra Trees\n"
        )

        file.write(
            f"Best parameters: {search.best_params_}\n"
        )

        file.write(
            f"Best CV macro F1: "
            f"{search.best_score_:.4f}\n"
        )

        file.write(
            f"Test accuracy: {accuracy:.4f}\n"
        )

        file.write(
            f"Test macro F1: {macro_f1:.4f}\n\n"
        )

        file.write(report)

    # Save all grid-search results
    results_df = pd.DataFrame(
        search.cv_results_
    )

    results_df = results_df.sort_values(
        "rank_test_score"
    )

    results_df.to_csv(
        results_path,
        index=False,
    )

    # ========================================================
    # 9. DISPLAY TOP FIVE CONFIGURATIONS
    # ========================================================

    print("\n========== TOP 5 CV CONFIGURATIONS ==========")

    top_results = results_df[
        [
            "rank_test_score",
            "mean_test_score",
            "std_test_score",
            "params",
        ]
    ].head(5)

    print(top_results.to_string(index=False))

    # ========================================================
    # 10. FINAL SUMMARY
    # ========================================================

    print("\n========== FILES SAVED ==========")

    print("Model:", model_path)
    print("Report:", report_path)
    print("Grid-search results:", results_path)

    print("\n========== EXPERIMENT COMPLETE ==========")


if __name__ == "__main__":
    main()
