
from pathlib import Path

import joblib
import librosa
import numpy as np

PROJECT_ROOT = Path(__file__).resolve().parents[1]
MODEL_PATH = PROJECT_ROOT / "models" / "audio" / "audio_random_forest_tuned.joblib"

SAMPLE_RATE = 22050
N_MFCC = 13
N_FFT = 2048
HOP_LENGTH = 512



def extract_features(audio_path):
    """Extract MFCC mean/std features using the training CSV column order."""
    import pandas as pd

    audio, sr = librosa.load(audio_path, sr=SAMPLE_RATE, mono=True)

    mfcc = librosa.feature.mfcc(
        y=audio,
        sr=sr,
        n_mfcc=N_MFCC,
        n_fft=N_FFT,
        hop_length=HOP_LENGTH,
    )

    feature_values = {}
    for i in range(N_MFCC):
        feature_values[f"mfcc_{i + 1}_mean"] = float(mfcc[i].mean())
        feature_values[f"mfcc_{i + 1}_std"] = float(mfcc[i].std())

    return pd.DataFrame([feature_values])



def predict_audio(audio_path):
    """Return the model's predicted audio class and probabilities."""
    audio_path = Path(audio_path)

    if not audio_path.is_file():
        raise FileNotFoundError(f"Audio file not found: {audio_path}")

    model = joblib.load(MODEL_PATH)
    features = extract_features(audio_path)

    prediction = model.predict(features)[0]
    result = {
        "audio_file": str(audio_path),
        "prediction": str(prediction),
        "feature_names": list(features.columns),
    }

    if hasattr(model, "predict_proba"):
        probabilities = model.predict_proba(features)[0]
        result["probabilities"] = {
            str(label): round(float(probability), 4)
            for label, probability in zip(model.classes_, probabilities)
        }

    return result


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Classify engine-related audio.")
    parser.add_argument("audio_file", help="Path to an audio recording")
    args = parser.parse_args()

    print(predict_audio(args.audio_file))
