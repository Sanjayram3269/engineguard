"""
Automated Test Suite for EngineGuard Tabular API (/predict/tabular)
Tests both JSON manual payload and multipart CSV uploads against the live FastAPI app on http://127.0.0.1:8000
using Python standard library urllib.
"""

import json
import urllib.request
import urllib.error
import sys
from pathlib import Path

BASE_URL = "http://127.0.0.1:8000"

# Verified rows directly from EngineFaultDB_Final.csv
CLASS_0_DATA = {
    "MAP": 3.478, "TPS": 1.899, "Force": 7.43, "Power": 5.232, "RPM": 1168.882,
    "Consumption L/H": 2.901, "Consumption L/100KM": 12.067, "Speed": 25.698,
    "CO": 0.465, "HC": 187.293, "CO2": 14.058, "O2": 1.051, "Lambda": 0.997, "AFR": 14.662
}

CLASS_1_DATA = {
    "MAP": 1.156, "TPS": 0.779, "Force": 81.519, "Power": 0.496, "RPM": 1198.404,
    "Consumption L/H": 2.102, "Consumption L/100KM": 8.468, "Speed": 25.647,
    "CO": 1.9, "HC": 244.333, "CO2": 12.971, "O2": 0.548, "Lambda": 0.993, "AFR": 14.597
}

CLASS_2_DATA = {
    "MAP": 1.594, "TPS": 1.095, "Force": 79.954, "Power": 1.775, "RPM": 3600.052,
    "Consumption L/H": 4.357, "Consumption L/100KM": 5.584, "Speed": 80.151,
    "CO": 0.698, "HC": 155.112, "CO2": 14.24, "O2": 1.062, "Lambda": 1.023, "AFR": 15.035
}

CLASS_3_DATA = {
    "MAP": 1.859, "TPS": 0.932, "Force": 289.272, "Power": 3.147, "RPM": 1819.823,
    "Consumption L/H": 3.262, "Consumption L/100KM": 7.809, "Speed": 39.743,
    "CO": 0.462, "HC": 216.986, "CO2": 12.538, "O2": 0.836, "Lambda": 0.965, "AFR": 14.191
}


def post_json(endpoint: str, payload: dict):
    req = urllib.request.Request(
        f"{BASE_URL}{endpoint}",
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.status, json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as err:
        body = err.read().decode("utf-8")
        try:
            parsed = json.loads(body)
        except Exception:
            parsed = body
        return err.code, parsed


def test_predict_tabular_all_4_classes():
    cases = [
        ("Class 0: Normal", CLASS_0_DATA, "Normal (no fault)"),
        ("Class 1: Fault 1", CLASS_1_DATA, "Fault type 1"),
        ("Class 2: Fault 2", CLASS_2_DATA, "Fault type 2"),
        ("Class 3: Fault 3", CLASS_3_DATA, "Fault type 3"),
    ]

    for label, data, expected_class in cases:
        status, body = post_json("/predict/tabular", {"data": data})
        assert status == 200, f"{label} failed with status {status}: {body}"
        assert body["status"] == "success"
        assert body["module"] == "tabular"
        assert body["predicted_class"] == expected_class, f"{label} expected {expected_class}, got {body['predicted_class']}"
        assert 0.0 <= body["confidence"] <= 1.0
        assert body["confidence_type"] == "random_forest_class_vote"
        assert isinstance(body["review_required"], bool)
        print(f"  [PASS] {label} -> {body['predicted_class']} (vote: {body['confidence']*100:.1f}%)")


def test_missing_feature_rejected():
    bad_data = {k: v for k, v in CLASS_0_DATA.items() if k != "RPM"}
    status, body = post_json("/predict/tabular", {"data": bad_data})
    assert status == 422, f"Expected 422, got {status}: {body}"
    assert "Missing or incorrect telemetry features" in body["detail"]
    print("  [PASS] Missing feature (RPM) rejected with HTTP 422")


def test_non_numeric_feature_rejected():
    bad_data = dict(CLASS_0_DATA)
    bad_data["MAP"] = "not_a_number"
    status, body = post_json("/predict/tabular", {"data": bad_data})
    assert status == 422, f"Expected 422, got {status}: {body}"
    print("  [PASS] Non-numeric feature rejected with HTTP 422")


def test_infinite_and_nan_rejected():
    bad_data_nan = dict(CLASS_0_DATA)
    bad_data_nan["TPS"] = "NaN"
    status, body = post_json("/predict/tabular", {"data": bad_data_nan})
    assert status == 422, f"Expected 422, got {status}: {body}"

    bad_data_inf = dict(CLASS_0_DATA)
    bad_data_inf["Force"] = "Infinity"
    status_inf, body_inf = post_json("/predict/tabular", {"data": bad_data_inf})
    assert status_inf == 422, f"Expected 422, got {status_inf}: {body_inf}"
    print("  [PASS] NaN and Infinity values rejected with HTTP 422")


def test_fault_column_not_required():
    data_with_fault = dict(CLASS_0_DATA)
    data_with_fault["Fault"] = 999
    status, body = post_json("/predict/tabular", {"data": data_with_fault})
    assert status == 200, f"Expected 200, got {status}: {body}"
    assert body["predicted_class"] == "Normal (no fault)"
    print("  [PASS] Extra 'Fault' field safely ignored")


def test_multipart_csv_regression():
    boundary = "----EngineGuardFormBoundary7MA4YWxkTrZu0gW"
    csv_header = ",".join(CLASS_0_DATA.keys())
    csv_row = ",".join(str(v) for v in CLASS_0_DATA.values())
    csv_content = f"{csv_header}\n{csv_row}\n"

    body_parts = [
        f"--{boundary}",
        'Content-Disposition: form-data; name="file"; filename="test.csv"',
        "Content-Type: text/csv",
        "",
        csv_content,
        f"--{boundary}--",
        ""
    ]
    payload = "\r\n".join(body_parts).encode("utf-8")

    req = urllib.request.Request(
        f"{BASE_URL}/predict/tabular",
        data=payload,
        headers={"Content-Type": f"multipart/form-data; boundary={boundary}"}
    )
    with urllib.request.urlopen(req) as resp:
        assert resp.status == 200
        data = json.loads(resp.read().decode("utf-8"))
        assert data["status"] == "success"
        assert data["predicted_class"] == "Normal (no fault)"
        print("  [PASS] Multipart CSV upload regression test passed")


if __name__ == "__main__":
    print("\n====================================================")
    print("EngineGuard Backend Tabular API Test Suite")
    print("====================================================\n")
    test_predict_tabular_all_4_classes()
    test_missing_feature_rejected()
    test_non_numeric_feature_rejected()
    test_infinite_and_nan_rejected()
    test_fault_column_not_required()
    test_multipart_csv_regression()
    print("\nAll backend tabular API tests passed successfully!\n")
