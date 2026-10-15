from pathlib import Path

import numpy as np
import pandas as pd
from scipy.stats import kurtosis, skew

ROOT = Path("data/vibration_raw")
OUTPUT = Path("data/vibration_features.csv")

CHANNELS = ["Channel 1", "Channel 2", "Channel 3"]


def extract_channel_features(values, prefix):
    x = np.asarray(values, dtype=float)
    x = x[np.isfinite(x)]

    if len(x) < 16:
        raise ValueError(f"Too few valid samples for {prefix}: {len(x)}")

    centered = x - np.mean(x)
    rms = float(np.sqrt(np.mean(x ** 2)))
    std = float(np.std(x))
    spectrum = np.abs(np.fft.rfft(centered))
    power = spectrum ** 2

    # Ignore DC when calculating frequency-distribution features.
    if len(power) > 1:
        power[0] = 0.0

    total_power = float(power.sum())
    frequencies = np.fft.rfftfreq(len(centered))

    if total_power > 0:
        dominant_frequency = float(frequencies[np.argmax(power)])
        spectral_centroid = float(np.sum(frequencies * power) / total_power)
        spectral_entropy = float(
            -np.sum(
                (power[power > 0] / total_power)
                * np.log2(power[power > 0] / total_power)
            )
        )
    else:
        dominant_frequency = 0.0
        spectral_centroid = 0.0
        spectral_entropy = 0.0

    return {
        f"{prefix}_mean": float(np.mean(x)),
        f"{prefix}_std": std,
        f"{prefix}_rms": rms,
        f"{prefix}_peak_to_peak": float(np.ptp(x)),
        f"{prefix}_skewness": float(skew(x)) if std > 0 else 0.0,
        f"{prefix}_kurtosis": float(kurtosis(x, fisher=True)) if std > 0 else 0.0,
        f"{prefix}_dominant_frequency_bin": dominant_frequency,
        f"{prefix}_spectral_centroid_bin": spectral_centroid,
        f"{prefix}_spectral_entropy": spectral_entropy,
    }


def main():
    records = []

    for path in sorted(ROOT.rglob("*.csv")):
        lower_path = str(path).lower()

        if "healthy bearings dataset" in lower_path:
            label = "Healthy"
        elif "faulty bearings dataset" in lower_path:
            label = "Faulty"
        else:
            continue

        try:
            frame = pd.read_csv(path)
            missing_channels = [c for c in CHANNELS if c not in frame.columns]
            if missing_channels:
                print(f"Skipping {path.name}: missing {missing_channels}")
                continue

            record = {
                "recording_id": str(path.relative_to(ROOT)),
                "label": label,
                "n_rows": len(frame),
            }

            # Keep operating-condition metadata for later split auditing.
            for key, matcher in [
                ("rpm", lambda s: "rpm" in s.lower()),
                ("humidity", lambda s: "humidity" in s.lower()),
                ("temperature", lambda s: (
                    "celsius" in s.lower() or "deg c" in s.lower()
                )),
            ]:
                record[key] = next(
                    (part for part in path.parts if matcher(part)),
                    "Unknown",
                )

            for channel in CHANNELS:
                values = pd.to_numeric(frame[channel], errors="coerce").to_numpy()
                record.update(extract_channel_features(values, channel.replace(" ", "_")))

            records.append(record)

        except Exception as exc:
            print(f"Skipping {path.name}: {exc}")

    result = pd.DataFrame(records)
    if result.empty:
        raise RuntimeError("No vibration recordings were successfully processed.")

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    result.to_csv(OUTPUT, index=False)

    print(f"Saved: {OUTPUT}")
    print(f"Recordings: {len(result)}")
    print("\nLabel counts:")
    print(result["label"].value_counts().to_string())
    print("\nFeature table shape:", result.shape)
    print("Non-finite numeric feature values:",
          int(result.select_dtypes(include=[np.number])
              .replace([np.inf, -np.inf], np.nan).isna().sum().sum()))
    print("\nFeature extraction complete.")


if __name__ == "__main__":
    main()
