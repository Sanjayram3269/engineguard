
from pathlib import Path

import librosa
import librosa.display
import matplotlib.pyplot as plt
import numpy as np


# --------------------------------------------------
# 1. PROJECT PATHS
# --------------------------------------------------

PROJECT_ROOT = Path(__file__).resolve().parent.parent
AUDIO_DIR = PROJECT_ROOT / "data" / "Audio"
OUTPUT_DIR = PROJECT_ROOT / "outputs" / "audio"


# --------------------------------------------------
# 2. AUDIO ANALYSIS
# --------------------------------------------------

def analyze_audio(file_path):

    file_path = Path(file_path)

    if not file_path.is_file():
        raise FileNotFoundError(f"Audio file not found: {file_path}")

    # Load audio in mono at a consistent sample rate
    y, sr = librosa.load(file_path, sr=22050, mono=True)

    if len(y) == 0:
        raise ValueError("The audio file is empty.")

    duration = len(y) / sr

    print("\n========== AUDIO INFORMATION ==========")
    print(f"File: {file_path.name}")
    print(f"Class: {file_path.parent.name}")
    print(f"Duration: {duration:.2f} seconds")
    print(f"Sample rate: {sr} Hz")
    print(f"Total samples: {len(y):,}")

    # --------------------------------------------------
    # 3. FFT FREQUENCY SPECTRUM
    # --------------------------------------------------

    window = np.hanning(len(y))
    spectrum = np.abs(np.fft.rfft(y * window))
    frequencies = np.fft.rfftfreq(len(y), d=1 / sr)

    # --------------------------------------------------
    # 4. STFT SPECTROGRAM
    # --------------------------------------------------

    n_fft = 2048
    hop_length = 512

    stft = librosa.stft(
        y,
        n_fft=n_fft,
        hop_length=hop_length
    )

    spectrogram_db = librosa.amplitude_to_db(
        np.abs(stft),
        ref=np.max
    )

    # --------------------------------------------------
    # 5. MFCC FEATURE EXTRACTION
    # --------------------------------------------------

    mfcc = librosa.feature.mfcc(
        y=y,
        sr=sr,
        n_mfcc=13,
        n_fft=n_fft,
        hop_length=hop_length
    )

    mfcc_mean = mfcc.mean(axis=1)

    print(f"MFCC coefficient count: {mfcc.shape[0]}")
    print(f"MFCC time frames: {mfcc.shape[1]}")
    print(f"Mean MFCC values:\n{np.round(mfcc_mean, 3)}")

    # --------------------------------------------------
    # 6. CREATE FOUR SEPARATE PLOTS
    # --------------------------------------------------

    fig, axes = plt.subplots(
        nrows=4,
        ncols=1,
        figsize=(14, 20),
        constrained_layout=True
    )

    fig.suptitle(
        f"EnginePulse Audio Analysis - {file_path.parent.name}",
        fontsize=17,
        fontweight="bold"
    )

    # Plot 1: Waveform
    librosa.display.waveshow(
        y,
        sr=sr,
        ax=axes[0]
    )

    axes[0].set_title(
        "1. Audio Waveform",
        fontsize=13,
        pad=12
    )
    axes[0].set_xlabel("Time (seconds)", labelpad=8)
    axes[0].set_ylabel("Amplitude", labelpad=8)

    # Plot 2: FFT
    axes[1].plot(frequencies, spectrum, linewidth=0.8)

    axes[1].set_title(
        "2. FFT Frequency Spectrum",
        fontsize=13,
        pad=12
    )
    axes[1].set_xlabel("Frequency (Hz)", labelpad=8)
    axes[1].set_ylabel("Magnitude", labelpad=8)
    axes[1].set_xlim(0, sr / 2)

    # Plot 3: STFT spectrogram
    stft_image = librosa.display.specshow(
        spectrogram_db,
        sr=sr,
        hop_length=hop_length,
        x_axis="time",
        y_axis="hz",
        ax=axes[2]
    )

    axes[2].set_title(
        "3. STFT Spectrogram",
        fontsize=13,
        pad=12
    )
    axes[2].set_xlabel("Time (seconds)", labelpad=8)
    axes[2].set_ylabel("Frequency (Hz)", labelpad=8)

    fig.colorbar(
        stft_image,
        ax=axes[2],
        format="%+2.0f dB",
        pad=0.02
    )

    # Plot 4: MFCC heatmap
    mfcc_image = librosa.display.specshow(
        mfcc,
        sr=sr,
        hop_length=hop_length,
        x_axis="time",
        ax=axes[3]
    )

    axes[3].set_title(
        "4. MFCC Features (13 Coefficients)",
        fontsize=13,
        pad=12
    )
    axes[3].set_xlabel("Time (seconds)", labelpad=8)
    axes[3].set_ylabel("MFCC Coefficient", labelpad=8)

    # Display coefficient numbers from 1 to 13
    axes[3].set_yticks(np.arange(13))
    axes[3].set_yticklabels(np.arange(1, 14))

    fig.colorbar(
        mfcc_image,
        ax=axes[3],
        format="%+.0f",
        pad=0.02
    )

    # --------------------------------------------------
    # 7. SAVE OUTPUT
    # --------------------------------------------------

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    output_path = OUTPUT_DIR / f"{file_path.stem}_analysis.png"

    fig.savefig(
        output_path,
        dpi=150,
        bbox_inches="tight"
    )

    print(f"\nAnalysis plot saved to:\n{output_path}")

    plt.show()
    plt.close(fig)

    # Return compact results for later dashboard integration
    return {
        "module": "audio",
        "status": "success",
        "duration_seconds": round(duration, 3),
        "sample_rate": sr,
        "mfcc_mean": mfcc_mean.tolist(),
        "plot_path": str(output_path)
    }


# --------------------------------------------------
# 8. RUN A SAMPLE AUDIO FILE
# --------------------------------------------------

if __name__ == "__main__":

    class_dir = AUDIO_DIR / "Engine Issue"

    supported_extensions = {
        ".wav", ".mp3", ".flac",
        ".ogg", ".m4a", ".aac", ".wma"
    }

    if not class_dir.exists():
        raise FileNotFoundError(
            f"Dataset class folder not found:\n{class_dir}"
        )

    audio_files = sorted(
        path
        for path in class_dir.rglob("*")
        if path.is_file()
        and path.suffix.lower() in supported_extensions
    )

    if not audio_files:
        raise FileNotFoundError(
            f"No supported audio files found in:\n{class_dir}"
        )

    analyze_audio(audio_files[0])
