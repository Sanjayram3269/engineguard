
from pathlib import Path

import joblib
import librosa
import numpy as np
import pandas as pd

from sklearn.metrics import (
    accuracy_score,
    f1_score,
    classification_report,
    confusion_matrix,
)


# --------------------------------------------------
# 1. PATHS AND SETTINGS
# --------------------------------------------------

ROOT = Path(__file__).resolve().parent.parent

AUDIO_DIR = ROOT / "data" / "Audio"
MODEL_PATH = (
    ROOT / "models" / "audio" / "audio_random_forest_tuned.joblib"
)
FEATURE_CSV = ROOT / "audio_csv" / "audio_mfcc_features.csv"

OUTPUT_DIR = ROOT / "outputs" / "audio"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

SAMPLE_RATE = 22050
N_MFCC = 13
N_FFT = 2048
HOP_LENGTH = 512

SUPPORTED_EXTENSIONS = {
    ".wav", ".mp3", ".flac", ".ogg",
    ".m4a", ".aac", ".wma"
}


# --------------------------------------------------
# 2. EXTRACT TRAINING-COMPATIBLE FEATURES
# --------------------------------------------------

def extract_features(audio_path):
    y, sr = librosa.load(
        str(audio_path),
        sr=SAMPLE_RATE,
        mono=True,
    )

    if len(y) < N_FFT:
        raise ValueError("Recording is empty or too short.")

    mfcc = librosa.feature.mfcc(
        y=y,
        sr=sr,
        n_mfcc=N_MFCC,
        n_fft=N_FFT,
        hop_length=HOP_LENGTH,
    )

    means = np.mean(mfcc, axis=1)
    stds = np.std(mfcc, axis=1)

    features = {}

    for i in range(N_MFCC):
        features[f"mfcc_{i + 1}_mean"] = float(means[i])
        features[f"mfcc_{i + 1}_std"] = float(stds[i])

    return features


# --------------------------------------------------
# 3. MAIN EVALUATION
# --------------------------------------------------

def main():
    if not MODEL_PATH.is_file():
        raise FileNotFoundError(f"Model not found: {MODEL_PATH}")

    if not FEATURE_CSV.is_file():
        raise FileNotFoundError(
            f"Training feature CSV not found: {FEATURE_CSV}"
        )

    model = joblib.load(MODEL_PATH)

    # Match feature order to the training CSV.
    training_df = pd.read_csv(FEATURE_CSV)

    excluded = {"filename", "label", "path"}
    feature_columns = [
        col for col in training_df.columns
        if col not in excluded
    ]

    if len(feature_columns) != 26:
        raise ValueError(
            f"Expected 26 features, found {len(feature_columns)}."
        )

    records = []
    failures = []

    class_folders = sorted(
        folder for folder in AUDIO_DIR.iterdir()
        if folder.is_dir()
    )

    for folder in class_folders:
        actual_label = folder.name

        audio_files = sorted(
            path for path in folder.rglob("*")
            if path.is_file()
            and path.suffix.lower() in SUPPORTED_EXTENSIONS
        )

        print(f"\nProcessing {actual_label}: {len(audio_files)} files")

        for audio_path in audio_files:
            try:
                features = extract_features(audio_path)

                X = pd.DataFrame(
                    [[features[col] for col in feature_columns]],
                    columns=feature_columns,
                )

                predicted_label = model.predict(X)[0]

                row = {
                    "filename": audio_path.name,
                    "path": str(audio_path.relative_to(ROOT)),
                    "actual_label": actual_label,
                    "predicted_label": predicted_label,
                    "correct": actual_label == predicted_label,
                }

                if hasattr(model, "predict_proba"):
                    probabilities = model.predict_proba(X)[0]

                    for label, probability in zip(
                        model.classes_, probabilities
                    ):
                        row[f"prob_{label}"] = float(probability)

                records.append(row)

            except Exception as error:
                failures.append({
                    "path": str(audio_path.relative_to(ROOT)),
                    "error": str(error),
                })

    if not records:
        raise RuntimeError("No recordings could be evaluated.")

    results = pd.DataFrame(records)

    predictions_path = OUTPUT_DIR / "audio_batch_predictions.csv"
    results.to_csv(predictions_path, index=False)

    print("\n========== BATCH EVALUATION ==========")
    print(f"Successfully evaluated: {len(results)}")
    print(f"Failed recordings: {len(failures)}")
    print(f"Prediction CSV: {predictions_path}")

    # This is a valid performance estimate only if the evaluated
    # recordings were not used to train the model.
    accuracy = accuracy_score(
        results["actual_label"],
        results["predicted_label"],
    )
    macro_f1 = f1_score(
        results["actual_label"],
        results["predicted_label"],
        average="macro",
        zero_division=0,
    )

    print(f"\nFolder-wide accuracy: {accuracy:.4f}")
    print(f"Folder-wide macro F1: {macro_f1:.4f}")

    print("\nClassification report:")
    print(classification_report(
        results["actual_label"],
        results["predicted_label"],
        zero_division=0,
    ))

    labels = sorted(
        set(results["actual_label"])
        | set(results["predicted_label"])
    )

    print("Confusion matrix (rows = actual, columns = predicted):")
    print(confusion_matrix(
        results["actual_label"],
        results["predicted_label"],
        labels=labels,
    ))
    print("Class order:", labels)

    if failures:
        failures_path = OUTPUT_DIR / "audio_batch_failures.csv"
        pd.DataFrame(failures).to_csv(
            failures_path, index=False
        )
        print(f"\nFailure details: {failures_path}")


if __name__ == "__main__":
    main()
