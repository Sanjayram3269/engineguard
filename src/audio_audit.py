
from pathlib import Path
import librosa
import pandas as pd

# Project's audio dataset location
PROJECT_ROOT = Path(__file__).resolve().parent.parent
AUDIO_DIR = PROJECT_ROOT / "data" / "Audio"

# Audio formats we will look for
AUDIO_EXTENSIONS = {
    ".wav", ".mp3", ".flac", ".ogg", ".m4a", ".aac", ".wma"
}

def audit_audio_dataset():
    if not AUDIO_DIR.exists():
        print(f"\nERROR: Audio folder not found:\n{AUDIO_DIR}")
        print("\nUpdate AUDIO_DIR to match your actual folder location.")
        return

    records = []

    for class_folder in sorted(AUDIO_DIR.iterdir()):
        if not class_folder.is_dir():
            continue

        files = [
            path for path in class_folder.rglob("*")
            if path.is_file()
            and path.suffix.lower() in AUDIO_EXTENSIONS
        ]

        print(f"\nChecking class: {class_folder.name}")
        print(f"Audio files found: {len(files)}")

        for file_path in files:
            try:
                # Read metadata without loading the whole recording
                info = librosa.get_duration(path=str(file_path))

                records.append({
                    "class": class_folder.name,
                    "filename": file_path.name,
                    "path": str(file_path),
                    "duration_seconds": round(info, 2),
                    "format": file_path.suffix.lower(),
                    "status": "OK",
                })

            except Exception as error:
                records.append({
                    "class": class_folder.name,
                    "filename": file_path.name,
                    "path": str(file_path),
                    "duration_seconds": None,
                    "format": file_path.suffix.lower(),
                    "status": f"ERROR: {error}",
                })

    if not records:
        print("\nNo supported audio files found.")
        return

    df = pd.DataFrame(records)

    output_path = PROJECT_ROOT / "data" / "audio_audit.csv"
    output_path.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(output_path, index=False)

    print("\n========== DATASET SUMMARY ==========")
    print(df.groupby(["class", "status"]).size().to_string())
    print("\nTotal files:", len(df))
    print("Readable files:", (df["status"] == "OK").sum())
    print("Problem files:", (df["status"] != "OK").sum())

    valid_durations = df.loc[
        df["status"] == "OK", "duration_seconds"
    ]

    if not valid_durations.empty:
        print("\nDuration statistics (seconds):")
        print(valid_durations.describe().round(2).to_string())

    print(f"\nFull audit saved to:\n{output_path}")


if __name__ == "__main__":
    audit_audio_dataset()
