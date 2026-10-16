"""Report for the normal-reference comparison score.

The score compares a reading with typical normal-condition values for six sensors.
It is not a validated measure of engine health.

The fault-risk model is a SEPARATE supervised model. Its held-out AUC is shown on its
own line, and it is not the comparison score.

Status is defined from the normal TRAINING rows, not from engineering specifications:
  - "Within normal range": score >= 5th percentile of normal training scores.
  - "Outside normal range": score below that percentile.
Reasons for concern use a robust z of 2.0, a statistical convention rather than an
engineering threshold.
"""

from __future__ import annotations

import json
import os
from typing import Any, Dict

from .index import Reference, score_one

Z_CONCERN = 2.0
EXPERIMENT_PATH = os.path.join("reports", "experiments", "auc_experiment_report.json")


def _fault_risk_summary(path: str = EXPERIMENT_PATH) -> Dict[str, Any]:
    if not os.path.exists(path):
        return {
            "available": False,
            "note": "Not computed. Run: python -m src.engine_health.experiments --csv data\\engine_data.csv",
        }
    with open(path, encoding="utf-8") as f:
        ex = json.load(f)
    name = ex["selected_candidate"]
    test = ex["test_results"][name]
    return {
        "available": True,
        "model": name,
        "test_auc": test["test_auc"],
        "test_auc_95ci": test["test_auc_95ci"],
        "note": "Separate supervised model that learns the normal/faulty label. "
                "Not the comparison score and not a health measure.",
    }


def build_report(record: Dict[str, Any], ref: Reference, experiment_path: str = EXPERIMENT_PATH) -> Dict[str, Any]:
    if ref.score_p05 != ref.score_p05:  # NaN: reference fitted by an older version
        raise ValueError("Reference lacks score percentiles. Re-run: python -m src.engine_health.cli fit")
    result = score_one(record, ref)
    score = result["score"]
    cov = result["coverage"]

    if score is None:
        status = "NOT SCORED"
    elif score >= ref.score_p05:
        status = "Within normal range"
    else:
        status = "Outside normal range"

    reasons = []
    for name, c in result["sensor_contributions"].items():
        z = c["robust_z"]
        if abs(z) > Z_CONCERN:
            direction = "above" if z > 0 else "below"
            reasons.append(
                f"{name} is {direction} the normal median "
                f"({abs(z):.1f} robust units; value {c['value']})"
            )
        if c["beyond_reference_range"]:
            reasons.append(f"{name} is outside the range seen in normal training data")
    if cov["missing"]:
        reasons.append("Missing sensors (not assumed normal): " + ", ".join(cov["missing"]))
    if not reasons:
        reasons.append("No sensor deviates beyond the concern level.")

    confidence = {
        "sensors_available": f"{cov['available']}/{cov['total']}",
        "data_completeness": "Complete" if not cov["missing"] else "Partial - score uses available sensors only",
        "warnings": result["warnings"],
        "model_confidence": "Not applicable - the comparison score is not a classifier. "
                            "Classifier probabilities are a separate output.",
    }

    return {
        "index_name": "Normal-Reference Comparison Score (0-100)",
        "score": score,
        "status": status,
        "score_direction": "Higher = closer to typical normal-condition values",
        "normal_reference_5th_percentile_score": round(ref.score_p05, 2),
        "reasons_for_concern": reasons,
        "sensor_breakdown": result["sensor_contributions"],
        "confidence_information": confidence,
        "fault_risk_model": _fault_risk_summary(experiment_path),
        "label": "PROTOTYPE - compares readings with normal-condition values; not a validated measure of engine condition",
    }


def format_report(rep: Dict[str, Any]) -> str:
    lines = []
    lines.append("=" * 64)
    lines.append(rep["index_name"])
    lines.append("=" * 64)
    score = rep["score"]
    lines.append(f"Score        : {score if score is not None else 'NOT SCORED'}  (0-100)")
    lines.append(f"Status       : {rep['status']}")
    lines.append(f"Direction    : {rep['score_direction']}")
    lines.append(f"Label        : {rep['label']}")
    lines.append("")
    lines.append("Reasons for concern:")
    for r in rep["reasons_for_concern"]:
        lines.append(f"  - {r}")
    lines.append("")
    lines.append("Sensor breakdown (largest contribution first):")
    if rep["sensor_breakdown"]:
        for name, c in rep["sensor_breakdown"].items():
            flag = "  [outside normal range]" if c["beyond_reference_range"] else ""
            lines.append(
                f"  {name:18s} value={c['value']:<10} robust_z={c['robust_z']:<8} "
                f"share={c['share_of_deviation_pct']}%{flag}"
            )
    else:
        lines.append("  none available")
    lines.append("")
    conf = rep["confidence_information"]
    lines.append("Confidence information:")
    lines.append(f"  Sensors available : {conf['sensors_available']}")
    lines.append(f"  Data completeness : {conf['data_completeness']}")
    lines.append(f"  Model confidence  : {conf['model_confidence']}")
    if conf["warnings"]:
        lines.append("  Warnings          :")
        for w in conf["warnings"]:
            lines.append(f"    - {w}")
    lines.append("")
    fr = rep["fault_risk_model"]
    lines.append("Separate fault-risk model:")
    if fr["available"]:
        lines.append(
            f"  {fr['model']}: held-out AUC {fr['test_auc']:.2f} "
            f"(95% CI {fr['test_auc_95ci'][0]:.2f}-{fr['test_auc_95ci'][1]:.2f})"
        )
        lines.append(f"  {fr['note']}")
    else:
        lines.append(f"  {fr['note']}")
    return "\n".join(lines)
