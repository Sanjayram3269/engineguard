from pathlib import Path
import json
import sys
import warnings

warnings.filterwarnings("ignore")

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from src.audio_inference import predict_audio, MODEL_PATH

METADATA_PATH = ROOT / "models" / "audio_metadata.json"


def test_model_file_is_present():
    assert MODEL_PATH.is_file(), f"Audio inference model missing: {MODEL_PATH}"


def test_metadata_is_present():
    assert METADATA_PATH.is_file(), f"Audio metadata missing: {METADATA_PATH}"


def test_metadata_matches_inference_entry_point():
    metadata = json.loads(METADATA_PATH.read_text(encoding="utf-8"))
    assert "selected_inference_model" in metadata
    expected_model = ROOT / metadata["selected_inference_model"]
    assert expected_model == MODEL_PATH, (
        f"Metadata points to {expected_model}, but inference uses {MODEL_PATH}"
    )
    assert set(metadata["classes"]) == {"Engine Issue", "Non engine issue", "Normal engine"}
    assert metadata["feature_schema"]["feature_count"] == 26


def test_feature_schema_is_fixed():
    metadata = json.loads(METADATA_PATH.read_text(encoding="utf-8"))
    schema = metadata["feature_schema"]
    expected = [
        "mfcc_1_mean", "mfcc_1_std",
        "mfcc_2_mean", "mfcc_2_std",
        "mfcc_3_mean", "mfcc_3_std",
        "mfcc_4_mean", "mfcc_4_std",
        "mfcc_5_mean", "mfcc_5_std",
        "mfcc_6_mean", "mfcc_6_std",
        "mfcc_7_mean", "mfcc_7_std",
        "mfcc_8_mean", "mfcc_8_std",
        "mfcc_9_mean", "mfcc_9_std",
        "mfcc_10_mean", "mfcc_10_std",
        "mfcc_11_mean", "mfcc_11_std",
        "mfcc_12_mean", "mfcc_12_std",
        "mfcc_13_mean", "mfcc_13_std",
    ]
    assert schema["feature_names"] == expected, "MFCC feature order is not fixed"
    assert schema["extraction"]["sample_rate_hz"] == 22050
    assert schema["extraction"]["n_mfcc"] == 13
    assert schema["extraction"]["n_fft"] == 2048
    assert schema["extraction"]["hop_length"] == 512


def test_prediction_structure_with_real_model_and_file():
    """Smoke test: load the real audio model and predict on a real recording.

    This verifies model loading, feature extraction, and output structure.
    It is not an independent accuracy evaluation.
    """
    metadata = json.loads(METADATA_PATH.read_text(encoding="utf-8"))
    audio_dir = ROOT / "data" / "Audio"
    assert audio_dir.is_dir(), f"Audio dataset missing: {audio_dir}"

    found = None
    for class_folder in sorted(audio_dir.iterdir()):
        if not class_folder.is_dir():
            continue
        for path in sorted(class_folder.iterdir()):
            if path.suffix.lower() in {".mp3", ".wav", ".flac", ".ogg", ".m4a", ".aac", ".wma"}:
                found = path
                break
        if found is not None:
            break

    assert found is not None, "No audio recording found for smoke test"

    result = predict_audio(found)

    assert isinstance(result, dict), "predict_audio must return a dict"
    assert "audio_file" in result, "predict_audio result must include audio_file"
    assert result["audio_file"] == str(found), "audio_file must match input path"
    assert "prediction" in result, "predict_audio result must include prediction"
    assert result["prediction"] in metadata["classes"], (
        f"prediction {result['prediction']} not in known classes"
    )
    assert "probabilities" in result, "predict_audio result must include probabilities"
    assert set(result["probabilities"].keys()) == set(metadata["classes"])
    total = sum(result["probabilities"].values())
    assert abs(total - 1.0) < 1e-6, "probabilities must sum to 1"


if __name__ == "__main__":
    test_model_file_is_present()
    test_metadata_is_present()
    test_metadata_matches_inference_entry_point()
    test_feature_schema_is_fixed()
    test_prediction_structure_with_real_model_and_file()
    print("ALL AUDIO SMOKE TESTS PASSED")
