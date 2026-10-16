
from pathlib import Path

import pandas as pd

from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.svm import SVC
from sklearn.metrics import confusion_matrix


PROJECT_ROOT = Path(__file__).resolve().parent.parent

CSV_PATH = PROJECT_ROOT / "audio_csv" / "audio_mfcc_features.csv"
OUTPUT_DIR = PROJECT_ROOT / "outputs" / "audio"


def main():
    df = pd.read_csv(CSV_PATH)

    feature_columns = [
        col for col in df.columns if col.startswith("mfcc_")
    ]

    X = df[feature_columns].astype(float)
    y = df["label"].astype(str)

    # Reproduce the exact split used in the original training script.
    train_idx, test_idx = train_test_split(
        df.index,
        test_size=0.20,
        random_state=42,
        stratify=y,
    )

    X_train, X_test = X.loc[train_idx], X.loc[test_idx]
    y_train, y_test = y.loc[train_idx], y.loc[test_idx]

    model = Pipeline([
        ("scaler", StandardScaler()),
        ("svm", SVC(
            kernel="rbf",
            C=1.0,
            gamma="scale",
            class_weight="balanced",
        )),
    ])

    model.fit(X_train, y_train)
    predictions = model.predict(X_test)

    # Save test predictions alongside the original metadata.
    results = df.loc[test_idx, ["filename", "label", "path"]].copy()
    results["predicted_label"] = predictions
    results["correct"] = (
        results["label"] == results["predicted_label"]
    )

    errors = results.loc[~results["correct"]].copy()

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    all_predictions_path = OUTPUT_DIR / "audio_test_predictions.csv"
    errors_path = OUTPUT_DIR / "audio_misclassified.csv"

    results.to_csv(all_predictions_path, index=False)
    errors.to_csv(errors_path, index=False)

    print("========== ERROR DIAGNOSIS ==========")
    print(f"Test recordings: {len(results)}")
    print(f"Correct: {results['correct'].sum()}")
    print(f"Incorrect: {len(errors)}")

    print("\nMisclassifications by actual class:")
    print(
        errors["label"]
        .value_counts()
        .to_string()
    )

    print("\nActual class -> predicted class:")
    print(
        pd.crosstab(
            errors["label"],
            errors["predicted_label"],
        ).to_string()
    )

    print("\nFirst 25 mistakes:")
    print(
        errors[
            ["filename", "label", "predicted_label", "path"]
        ].head(25).to_string(index=False)
    )

    print(f"\nAll predictions saved to:\n{all_predictions_path}")
    print(f"Misclassified recordings saved to:\n{errors_path}")


if __name__ == "__main__":
    main()
