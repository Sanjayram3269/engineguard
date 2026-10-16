
from pathlib import Path

import librosa
import numpy as np
import pandas as pd


# --------------------------------------------------
# 1. PATHS AND SETTINGS
# --------------------------------------------------

PROJECT_ROOT = Path(__file__).resolve().parent.parent
AUDIO_DIR = PROJECT_ROOT / "data" / "Audio"
OUTPUT_CSV = PROJECT_ROOT / "audio_csv" / "audio_mfcc_features.csv"

SAMPLE_RATE = 22050
N_MFCC = 13
N_FFT = 2048
HOP_LENGTH = 512

SUPPORTED_EXTENSIONS = {
    ".wav", ".mp3", ".flac",
    ".ogg", ".m4a", ".aac", ".wma"
}


# --------------------------------------------------
# 2. EXTRACT FEATURES FROM ONE RECORDING
# --------------------------------------------------

def extract_features(file_path):

    # Load the recording as mono audio.
    y, sr = librosa.load(
        file_path,
        sr=SAMPLE_RATE,
        mono=True
    )

    if len(y) == 0:
        raise ValueError("Empty audio recording")

    # Calculate 13 MFCC coefficients across time.
    mfcc = librosa.feature.mfcc(
        y=y,
        sr=sr,
        n_mfcc=N_MFCC,
        n_fft=N_FFT,
        hop_length=HOP_LENGTH
    )

    # Summarize each coefficient over time.
    mfcc_mean = np.mean(mfcc, axis=1)
    mfcc_std = np.std(mfcc, axis=1)

    # Create 26 fixed-length numerical features.
    features = {}

    for i in range(N_MFCC):
        features[f"mfcc_{i + 1}_mean"] = float(mfcc_mean[i])
        features[f"mfcc_{i + 1}_std"] = float(mfcc_std[i])

    return features


# --------------------------------------------------
# 3. PROCESS THE COMPLETE DATASET
# --------------------------------------------------

def build_feature_dataset():

    if not AUDIO_DIR.exists():
        raise FileNotFoundError(
            f"Audio dataset folder not found:\n{AUDIO_DIR}"
        )

    records = []
    failed_files = []

    class_folders = sorted(
        folder
        for folder in AUDIO_DIR.iterdir()
        if folder.is_dir()
    )

    for class_folder in class_folders:

        label = class_folder.name

        audio_files = sorted(
            path
            for path in class_folder.rglob("*")
            if path.is_file()
            and path.suffix.lower() in SUPPORTED_EXTENSIONS
        )

        print(f"\nClass: {label}")
        print(f"Files found: {len(audio_files)}")

        for index, file_path in enumerate(audio_files, start=1):

            try:
                features = extract_features(file_path)

                record = {
                    "filename": file_path.name,
                    "label": label,
                    "path": str(file_path.relative_to(PROJECT_ROOT)),
                }

                record.update(features)
                records.append(record)

                print(
                    f"\rProcessed {index}/{len(audio_files)}",
                    end="",
                    flush=True
                )

            except Exception as error:
                failed_files.append({
                    "filename": str(file_path),
                    "error": str(error)
                })

        print()

    if not records:
        raise RuntimeError(
            "No audio features were extracted successfully."
        )

    # Save the extracted features.
    df = pd.DataFrame(records)

    OUTPUT_CSV.parent.mkdir(
        parents=True,
        exist_ok=True
    )

    df.to_csv(OUTPUT_CSV, index=False)

    # --------------------------------------------------
    # 4. PRINT THE RESULTS
    # --------------------------------------------------

    feature_columns = [
        column for column in df.columns
        if column.startswith("mfcc_")
    ]

    print("\n========== FEATURE EXTRACTION SUMMARY ==========")
    print(f"Successful recordings: {len(df)}")
    print(f"Failed recordings: {len(failed_files)}")
    print(f"MFCC features per recording: {len(feature_columns)}")
    print(f"Total CSV columns: {len(df.columns)}")

    print("\nClass distribution:")
    print(df["label"].value_counts().to_string())

    print(f"\nFeature dataset saved to:\n{OUTPUT_CSV}")

    if failed_files:
        print("\nFailed files:")
        for item in failed_files:
            print(f"- {item['filename']}: {item['error']}")

        failed_csv = PROJECT_ROOT / "data" / "audio_failed_files.csv"
        pd.DataFrame(failed_files).to_csv(
            failed_csv,
            index=False
        )
        print(f"\nFailure report saved to:\n{failed_csv}")

    print("\nFirst five rows:")
    print(df.head().to_string(index=False))


# --------------------------------------------------
# 5. ENTRY POINT
# --------------------------------------------------

if __name__ == "__main__":
    build_feature_dataset()
