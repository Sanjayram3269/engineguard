"""Tests for the prototype Engine Health Index. Uses synthetic data only."""

import math

import numpy as np
import pandas as pd
import pytest

from src.engine_health.evaluate import evaluate
from src.engine_health.index import (
    LABEL_COLUMN,
    SENSOR_COLUMNS,
    Reference,
    fit_reference,
    score_one,
    score_readings,
    split_labelled,
)

MEANS = {
    "Engine rpm": 850.0,
    "Lub oil pressure": 3.2,
    "Fuel pressure": 6.0,
    "Coolant pressure": 2.3,
    "lub oil temp": 77.5,
    "Coolant temp": 78.5,
}
SDS = {
    "Engine rpm": 250.0,
    "Lub oil pressure": 1.0,
    "Fuel pressure": 2.5,
    "Coolant pressure": 1.0,
    "lub oil temp": 3.0,
    "Coolant temp": 6.0,
}


def make_data(n_normal=400, n_faulty=400, shift=0.0, seed=0):
    rng = np.random.default_rng(seed)
    rows = []
    for label, n in ((0, n_normal), (1, n_faulty)):
        for _ in range(n):
            row = {c: rng.normal(MEANS[c], SDS[c]) for c in SENSOR_COLUMNS}
            if label == 1:
                row["Fuel pressure"] += shift * SDS["Fuel pressure"]
            row[LABEL_COLUMN] = label
            rows.append(row)
    return pd.DataFrame(rows)


@pytest.fixture
def ref():
    df = make_data()
    train, _ = split_labelled(df)
    return fit_reference(train)


def reference_record(ref: Reference):
    return {c: ref.median[c] for c in SENSOR_COLUMNS}


# ---- fitting and leakage -------------------------------------------------

def test_fit_uses_only_normal_rows():
    df = make_data()
    normal_only = df[df[LABEL_COLUMN] == 0]
    ref_all = fit_reference(df)
    ref_normal = fit_reference(normal_only)
    assert ref_all.median == ref_normal.median
    assert ref_all.n_normal_rows == len(normal_only)


def test_fit_ignores_faulty_rows_for_reference():
    df = make_data()
    faulty_changed = df.copy()
    faulty_changed.loc[faulty_changed[LABEL_COLUMN] == 1, "Coolant temp"] = 500.0
    assert fit_reference(df).median == fit_reference(faulty_changed).median


def test_fit_rejects_missing_column():
    df = make_data().drop(columns=["Fuel pressure"])
    with pytest.raises(ValueError, match="Missing required column"):
        fit_reference(df)


def test_fit_rejects_too_few_normal_rows():
    df = make_data(n_normal=5)
    with pytest.raises(ValueError, match="normal training rows"):
        fit_reference(df)


def test_constant_sensor_is_rejected():
    df = make_data()
    df.loc[df[LABEL_COLUMN] == 0, "lub oil temp"] = 75.0
    with pytest.raises(ValueError, match="zero spread"):
        fit_reference(df)


def test_split_is_deterministic():
    df = make_data()
    a, _ = split_labelled(df)
    b, _ = split_labelled(df)
    assert a.index.tolist() == b.index.tolist()


# ---- single-record scoring -----------------------------------------------

def test_reference_median_record_scores_100(ref):
    result = score_one(reference_record(ref), ref)
    assert result["score"] == 100.0
    assert result["deviation"] == 0.0
    assert result["coverage"]["available"] == 6
    assert result["warnings"] == []


def test_valid_record_structure(ref):
    record = {c: MEANS[c] + SDS[c] for c in SENSOR_COLUMNS}
    result = score_one(record, ref)
    assert set(result) >= {"score", "deviation", "interpretation", "coverage",
                           "sensor_contributions", "warnings"}
    assert set(result["sensor_contributions"]) == set(SENSOR_COLUMNS)
    shares = [c["share_of_deviation_pct"] for c in result["sensor_contributions"].values()]
    assert math.isclose(sum(shares), 100.0, abs_tol=0.5)


def test_larger_deviation_gives_lower_score(ref):
    near = reference_record(ref)
    far = dict(near)
    far["Coolant temp"] = ref.median["Coolant temp"] + 5 * ref.scale["Coolant temp"]
    assert score_one(far, ref)["score"] < score_one(near, ref)["score"]


def test_largest_contributor_is_the_deviating_sensor(ref):
    rec = reference_record(ref)
    rec["Fuel pressure"] = ref.median["Fuel pressure"] + 4 * ref.scale["Fuel pressure"]
    result = score_one(rec, ref)
    top = next(iter(result["sensor_contributions"]))
    assert top == "Fuel pressure"


def test_beyond_reference_range_is_flagged(ref):
    rec = reference_record(ref)
    rec["Coolant temp"] = ref.maximum["Coolant temp"] + 50
    result = score_one(rec, ref)
    assert result["sensor_contributions"]["Coolant temp"]["beyond_reference_range"] is True
    assert any("outside the normal-reference range" in w for w in result["warnings"])
    assert 0 < result["score"] <= 100


def test_missing_sensor_is_unavailable_not_healthy(ref):
    rec = reference_record(ref)
    rec["Fuel pressure"] = None
    result = score_one(rec, ref)
    assert result["coverage"]["missing"] == ["Fuel pressure"]
    assert result["coverage"]["available"] == 5
    assert "Fuel pressure" not in result["sensor_contributions"]
    assert any("NOT treated as healthy" in w for w in result["warnings"])


def test_missing_key_is_unavailable(ref):
    rec = reference_record(ref)
    del rec["Coolant temp"]
    result = score_one(rec, ref)
    assert "Coolant temp" in result["coverage"]["missing"]


def test_all_missing_gives_no_score(ref):
    result = score_one({c: None for c in SENSOR_COLUMNS}, ref)
    assert result["score"] is None
    assert result["coverage"]["available"] == 0


def test_blank_string_counts_as_missing(ref):
    rec = reference_record(ref)
    rec["Lub oil pressure"] = "   "
    result = score_one(rec, ref)
    assert result["coverage"]["missing"] == ["Lub oil pressure"]


def test_invalid_string_raises(ref):
    rec = reference_record(ref)
    rec["Engine rpm"] = "fast"
    with pytest.raises(ValueError, match="Non-numeric value"):
        score_one(rec, ref)


def test_infinite_value_raises(ref):
    rec = reference_record(ref)
    rec["Engine rpm"] = float("inf")
    with pytest.raises(ValueError, match="Infinite"):
        score_one(rec, ref)


def test_empty_record_raises(ref):
    with pytest.raises(ValueError, match="Empty input"):
        score_one({}, ref)


def test_unknown_sensor_name_raises(ref):
    with pytest.raises(ValueError, match="Unknown sensor"):
        score_one({"Oil level": 3.0}, ref)


def test_deterministic(ref):
    rec = {c: MEANS[c] + 0.5 * SDS[c] for c in SENSOR_COLUMNS}
    assert score_one(rec, ref) == score_one(rec, ref)


# ---- frame scoring --------------------------------------------------------

def test_empty_frame_raises(ref):
    with pytest.raises(ValueError, match="empty input"):
        score_readings(pd.DataFrame(columns=SENSOR_COLUMNS), ref)


def test_frame_missing_column_raises(ref):
    df = make_data(n_normal=10, n_faulty=10).drop(columns=["Coolant temp", LABEL_COLUMN])
    with pytest.raises(ValueError, match="Missing required column"):
        score_readings(df, ref)


def test_scores_are_bounded_and_label_free(ref):
    df = make_data(seed=7)[SENSOR_COLUMNS]
    scores = [r["score"] for r in score_readings(df, ref) if r["score"] is not None]
    assert len(scores) == len(df)
    assert all(0 < s <= 100 for s in scores)


def test_score_ignores_label_column(ref):
    df = make_data(seed=3)
    with_label = score_readings(df, ref)
    without_label = score_readings(df[SENSOR_COLUMNS], ref)
    assert [r["score"] for r in with_label] == [r["score"] for r in without_label]


# ---- evaluation -----------------------------------------------------------

def test_evaluate_separates_shifted_faulty_group():
    report = evaluate(make_data(shift=3.0, seed=1))
    assert report["separation"]["roc_auc_faulty_vs_normal"] > 0.8
    assert report["unscored_test_rows"] == 0


def test_evaluate_reports_no_separation_when_groups_identical():
    report = evaluate(make_data(shift=0.0, seed=2))
    assert 0.4 < report["separation"]["roc_auc_faulty_vs_normal"] < 0.6


def test_evaluate_rejects_non_binary_labels():
    df = make_data()
    df.loc[0, LABEL_COLUMN] = 2
    with pytest.raises(ValueError, match="must be 0 or 1"):
        evaluate(df)


# ---- AUC experiment protocol ---------------------------------------------

def test_experiment_split_is_disjoint_and_selection_uses_validation_only():
    from src.engine_health.experiments import (
        BASELINES, CANDIDATES, run_experiments, three_way_split,
    )

    df = make_data(shift=2.0, seed=11)
    train, val, test = three_way_split(df)
    assert set(train.index).isdisjoint(val.index)
    assert set(train.index).isdisjoint(test.index)
    assert set(val.index).isdisjoint(test.index)
    assert len(train) + len(val) + len(test) == len(df)

    report = run_experiments(df)
    assert report["selected_candidate"] not in BASELINES
    assert report["selected_candidate"] in CANDIDATES
    best_val = max(v for k, v in report["validation_auc_all_candidates"].items()
                   if k not in BASELINES)
    assert report["validation_auc_all_candidates"][report["selected_candidate"]] == best_val
    assert set(report["test_results"]) == BASELINES | {report["selected_candidate"]}
