
from pathlib import Path

import joblib
import librosa
import numpy as np
import pandas as pd


# --------------------------------------------------
# 1. PATHS AND SETTINGS
# --------------------------------------------------

ROOT = Path(__file__).resolve().parent.parent

MODEL_PATH = (
    ROOT / "models" / "audio" / "audio_random_forest_tuned.joblib"
)

CSV_PATH = ROOT / "audio_csv" / "audio_mfcc_features.csv"

SAMPLE_RATE = 22050
N_MFCC = 13
N_FFT = 2048
HOP_LENGTH = 512


# --------------------------------------------------
# 2. EXTRACT THE SAME 26 FEATURES
# --------------------------------------------------

def extract_features(audio_path):
    y, sr = librosa.load(
        str(audio_path),
        sr=SAMPLE_RATE,
        mono=True,
    )

    if len(y) == 0:
        raise ValueError("The audio recording is empty.")

    if len(y) < N_FFT:
        raise ValueError(
            "Audio is too short for reliable MFCC extraction. "
            "Please provide a longer recording."
        )

    mfcc = librosa.feature.mfcc(
        y=y,
        sr=sr,
        n_mfcc=N_MFCC,
        n_fft=N_FFT,
        hop_length=HOP_LENGTH,
    )

    mfcc_mean = np.mean(mfcc, axis=1)
    mfcc_std = np.std(mfcc, axis=1)

    features = {}

    for i in range(N_MFCC):
        features[f"mfcc_{i + 1}_mean"] = float(mfcc_mean[i])
        features[f"mfcc_{i + 1}_std"] = float(mfcc_std[i])

    return features


# --------------------------------------------------
# 3. PREDICT A NEW RECORDING
# --------------------------------------------------

def predict_audio(audio_path):
    audio_path = Path(audio_path)

    if not audio_path.is_file():
        raise FileNotFoundError(
            f"Audio file not found: {audio_path}"
        )

    if not MODEL_PATH.is_file():
        raise FileNotFoundError(
            f"Trained model not found: {MODEL_PATH}"
        )

    # Load the saved trained model.
    model = joblib.load(MODEL_PATH)

    # Extract the 26 MFCC features.
    features = extract_features(audio_path)

    # Match the exact feature order used during training.
    if not CSV_PATH.is_file():
        raise FileNotFoundError(
            f"Training feature CSV not found: {CSV_PATH}"
        )

    training_df = pd.read_csv(CSV_PATH)

    feature_columns = [
        col for col in training_df.columns
        if col not in ["filename", "label", "path"]
    ]

    if len(feature_columns) != 26:
        raise ValueError(
            f"Expected 26 training features, found "
            f"{len(feature_columns)}."
        )

    if set(features.keys()) != set(feature_columns):
        raise ValueError(
            "Extracted features do not match training features."
        )

    X_new = pd.DataFrame(
        [[features[col] for col in feature_columns]],
        columns=feature_columns,
    )

    # Predict the audio category.
    prediction = model.predict(X_new)[0]

    print("\n========== ENGINEPULSE AUDIO RESULT ==========")
    print(f"Recording: {audio_path.name}")
    print(f"Predicted category: {prediction}")

    # Display probabilities if the classifier supports them.
    if hasattr(model, "predict_proba"):
        probabilities = model.predict_proba(X_new)[0]

        print("\nClass probabilities:")
        for label, probability in zip(
            model.classes_, probabilities
        ):
            print(f"{label}: {probability * 100:.2f}%")

    return prediction


# --------------------------------------------------
# 4. RUN FROM THE TERMINAL
# --------------------------------------------------

if __name__ == "__main__":
    audio_file = input(
        "Enter the path to an audio recording: "
    ).strip().strip('"')

    try:
        predict_audio(audio_file)

    except Exception as error:
        print(f"\nPrediction failed: {error}")
