"""Exercise the real MFCC/Random Forest audio endpoint with a repository MP3."""

from pathlib import Path
import sys

from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from backend.app import app


def test_audio_endpoint() -> None:
    sample = Path(__file__).resolve().parents[1] / "data" / "Audio" / "Normal engine" / "038.mp3"
    assert sample.is_file(), f"Audio sample missing: {sample}"
    client = TestClient(app)
    with sample.open("rb") as stream:
        response = client.post("/predict/audio", files={"file": (sample.name, stream, "audio/mpeg")})

    assert response.status_code == 200, response.text
    body = response.json()
    assert body["prediction"] in {"Normal engine", "Engine Issue", "Non engine issue"}
    assert body["confidence_type"] == "random_forest_class_vote"
    assert body["feature_order_validated"] is True
    assert len(body["actual_features"]) == 26
    assert body["actual_features"] == body["expected_features"]
    assert abs(sum(body["probabilities"].values()) - 1.0) < 0.01
    assert 0 <= body["confidence"] <= 1

    rejected = client.post("/predict/audio", files={"file": ("bad.txt", b"not audio", "text/plain")})
    assert rejected.status_code == 400
    print(f"Audio API passed: {body['prediction']} ({body['confidence']:.1%} vote fraction), 26 MFCC features")


if __name__ == "__main__":
    test_audio_endpoint()
