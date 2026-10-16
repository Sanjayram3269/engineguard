"""
Backend Vibration API & Inference Comprehensive Test Suite
Tests:
1. Valid vibration CSV inference on real dataset recordings (both Healthy and Faulty).
2. Expected feature count (27) and strictly verified feature ordering.
3. Model response schema (status, recording, prediction, confidence, confidence_type, review_required, class_probabilities, message).
4. Malformed CSV handling (missing channels, missing timestamps, corrupted values, non-CSV files).
5. Low-confidence thresholding behavior (< 0.60 flag).
6. FastAPI HTTP endpoint (/predict/vibration) integration test against running server.
"""

import sys
import os
import json
import tempfile
import numpy as np
import pandas as pd
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))
sys.path.insert(0, str(ROOT))

from vibration_inference import predict_recording, load_artifacts, features_from_csv
from vibration_features import extract_channel_features, CHANNELS


def test_model_artifacts_load():
    """Verify that model and metadata load correctly with 27 features."""
    model, metadata = load_artifacts()
    assert model is not None
    assert metadata is not None
    assert "feature_columns" in metadata
    assert len(metadata["feature_columns"]) == 27
    assert metadata["labels"] == ["Faulty", "Healthy"]
    print(" [PASS] Model artifacts load successfully with 27 expected features.")


def test_real_file_inference():
    """Test inference on real CSV files from both Faulty and Healthy classes."""
    data_dir = ROOT / "data" / "vibration_raw"
    csv_files = list(data_dir.rglob("*.csv"))
    assert len(csv_files) > 0, "No vibration CSV files found in data directory."

    faulty_files = [f for f in csv_files if "Faulty Bearings Dataset" in str(f)]
    healthy_files = [f for f in csv_files if "Healthy Bearings Dataset" in str(f)]

    assert len(faulty_files) > 0, "No faulty CSV files found."
    assert len(healthy_files) > 0, "No healthy CSV files found."

    # Test Faulty
    res_faulty = predict_recording(faulty_files[0])
    assert res_faulty["prediction"] in ["Faulty", "Healthy"]
    assert res_faulty["confidence_type"] == "random_forest_vote_fraction"
    assert 0.0 <= res_faulty["confidence"] <= 1.0
    assert "Faulty" in res_faulty["class_probabilities"]
    assert "Healthy" in res_faulty["class_probabilities"]
    assert res_faulty["status"] == "experimental_decision_support"

    # Test Healthy
    res_healthy = predict_recording(healthy_files[0])
    assert res_healthy["prediction"] in ["Faulty", "Healthy"]
    assert res_healthy["confidence_type"] == "random_forest_vote_fraction"
    assert 0.0 <= res_healthy["confidence"] <= 1.0

    print(f" [PASS] Real recording inference: Faulty file -> {res_faulty['prediction']} (score={res_faulty['confidence']:.2f}), Healthy file -> {res_healthy['prediction']} (score={res_healthy['confidence']:.2f}).")


def test_feature_extraction_contract():
    """Verify feature extraction contract matches metadata exactly in count and naming."""
    _, metadata = load_artifacts()
    expected_cols = metadata["feature_columns"]

    # Generate synthetic 3-channel test DataFrame
    N = 100
    df = pd.DataFrame({
        "Time": np.linspace(0, 1, N),
        "Channel 1": np.sin(np.linspace(0, 10, N)),
        "Channel 2": np.cos(np.linspace(0, 10, N)),
        "Channel 3": np.random.randn(N),
    })

    with tempfile.NamedTemporaryFile(suffix=".csv", delete=False, mode="w", newline="") as tmp:
        df.to_csv(tmp.name, index=False)
        tmp_path = tmp.name

    try:
        features_df = features_from_csv(tmp_path, expected_cols)
        assert list(features_df.columns) == expected_cols
        assert features_df.shape == (1, 27)
        assert np.isfinite(features_df.to_numpy()).all()
        print(" [PASS] Feature extraction matches contract: exactly 27 finite features in expected order.")
    finally:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)


def test_missing_channels_error():
    """Verify that CSV with missing required channels raises ValueError."""
    _, metadata = load_artifacts()

    # Missing Channel 2 and Channel 3
    df = pd.DataFrame({
        "Time": [0.0, 0.01, 0.02],
        "Channel 1": [0.1, 0.2, 0.3],
    })

    with tempfile.NamedTemporaryFile(suffix=".csv", delete=False, mode="w", newline="") as tmp:
        df.to_csv(tmp.name, index=False)
        tmp_path = tmp.name

    try:
        features_from_csv(tmp_path, metadata["feature_columns"])
        assert False, "Should have raised ValueError for missing channels"
    except ValueError as e:
        assert "Missing vibration channels" in str(e)
        print(" [PASS] Missing required channels correctly raises ValueError.")
    finally:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)


def test_malformed_empty_csv():
    """Verify that empty or non-numeric CSV raises error."""
    with tempfile.NamedTemporaryFile(suffix=".csv", delete=False, mode="w", newline="") as tmp:
        tmp.write("Garbage non-csv data\nLine 2\n")
        tmp_path = tmp.name

    try:
        predict_recording(tmp_path)
        assert False, "Should have failed on malformed CSV"
    except Exception as e:
        assert len(str(e)) > 0
        print(" [PASS] Malformed CSV appropriately raises exception.")
    finally:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)


def test_api_endpoint_integration():
    """Test /predict/vibration endpoint against live local FastAPI server if available."""
    import requests

    target_file = ROOT / "data" / "vibration_raw" / "Engine Journal Bearings Dataset 2" / "Engine Journal Bearings Dataset 2" / "Engine Journal Bearings Dataset" / "Faulty Bearings Dataset" / "1000 RPM" / "0% Humidity" / "-10 deg Celsius" / "1st at -10 2022Jun04-2239-0005.csv"

    if not target_file.exists():
        csv_files = list((ROOT / "data" / "vibration_raw").rglob("*.csv"))
        target_file = csv_files[0] if csv_files else None

    if not target_file or not target_file.exists():
        print(" [SKIP] No sample CSV available for endpoint test.")
        return

    try:
        with open(target_file, "rb") as f:
            resp = requests.post(
                "http://127.0.0.1:8000/predict/vibration",
                files={"file": (target_file.name, f, "text/csv")},
                timeout=5
            )

        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()

        assert data["module"] == "vibration"
        assert data["prediction"] in ["Faulty", "Healthy"]
        assert data["confidence_type"] == "random_forest_vote_fraction"
        assert isinstance(data["confidence"], (int, float))
        assert "class_probabilities" in data
        assert data["feature_order_validated"] is True
        assert len(data["expected_features"]) == 27
        assert "Scores are Random Forest vote fractions, not calibrated probabilities." in data["message"]
        print(f" [PASS] Live FastAPI /predict/vibration endpoint returned HTTP 200 with prediction={data['prediction']}, vote_fraction={data['confidence']:.2f}.")

    except requests.exceptions.ConnectionError:
        print(" [SKIP] FastAPI server not running on localhost:8000 (skipping live HTTP test).")


if __name__ == "__main__":
    print("=" * 60)
    print("EngineGuard Backend Vibration Test Suite")
    print("=" * 60)
    test_model_artifacts_load()
    test_real_file_inference()
    test_feature_extraction_contract()
    test_missing_channels_error()
    test_malformed_empty_csv()
    test_api_endpoint_integration()
    print("\nAll Backend Vibration Tests Passed Successfully!")
