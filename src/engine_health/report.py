"""Judge-facing report for the prototype Engine Health Index.

Status is defined from the normal TRAINING rows, not from engineering specifications:
  - "Within normal range": score >= 5th percentile of normal training scores.
  - "Outside normal range": score below that percentile.
Reasons for concern use a robust z of 2.0, a statistical convention (about 95% of
normal values fall within +/-2 robust sigma if the normal distribution is roughly
symmetric). It is not an engineering threshold.

The index is not a classifier, so it has no model confidence. Classifier
probabilities are a separate output and are not shown here.
"""

from __future__ import annotations

import json
import os
from typing import Any, Dict, Optional

from .index import Reference, score_one

Z_CONCERN = 2.0
EVAL_PATH = os.path.join("reports", "engine_health_evaluation.json")


def _validation_summary(eval_path: str = EVAL_PATH) -> Dict[str, Any]:
    if not os.path.exists(eval_path):
        return {"status": "Not validated", "note": "Run the evaluate command to measure separation."}
    with open(eval_path, encoding="utf-8") as f:
        ev = json.load(f)
    auc = ev["separation"]["roc_auc_faulty_vs_normal"]
    return {
        "status": "Prototype - not validated against engine health",
        "roc_auc_faulty_vs_normal": auc,
        "note": (
            "AUC 0.5 = no separation of normal vs faulty rows; "
            "1.0 = perfect separation. Validation uses the binary label only."
        ),
    }


def build_report(record: Dict[str, Any], ref: Reference, eval_path: str = EVAL_PATH) -> Dict[str, Any]:
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
        reasons.append("Missing sensors (not assumed healthy): " + ", ".join(cov["missing"]))
    if not reasons:
        reasons.append("No sensor deviates beyond the concern level.")

    confidence = {
        "sensors_available": f"{cov['available']}/{cov['total']}",
        "data_completeness": "Complete" if not cov["missing"] else "Partial - score uses available sensors only",
        "warnings": result["warnings"],
        "validation": _validation_summary(eval_path),
        "model_confidence": "Not applicable - this index is not a classifier. "
                            "Classifier probabilities are a separate output.",
    }

    return {
        "index_name": "Prototype Engine Health Index (0-100)",
        "score": score,
        "status": status,
        "score_direction": "Higher = closer to the normal-training reference",
        "normal_reference_5th_percentile_score": round(ref.score_p05, 2),
        "reasons_for_concern": reasons,
        "sensor_breakdown": result["sensor_contributions"],
        "confidence_information": confidence,
        "label": "PROTOTYPE / ESTIMATED - not validated engine health",
    }


def format_report(rep: Dict[str, Any]) -> str:
    lines = []
    lines.append("=" * 64)
    lines.append(rep["index_name"])
    lines.append("=" * 64)
    score = rep["score"]
    lines.append(f"Health score : {score if score is not None else 'NOT SCORED'}  (0-100)")
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
    v = conf["validation"]
    lines.append(f"  Validation        : {v['status']}")
    if "roc_auc_faulty_vs_normal" in v:
        lines.append(f"  Held-out AUC      : {v['roc_auc_faulty_vs_normal']}  ({v['note']})")
    else:
        lines.append(f"  Note              : {v['note']}")
    lines.append(f"  Model confidence  : {conf['model_confidence']}")
    if conf["warnings"]:
        lines.append("  Warnings          :")
        for w in conf["warnings"]:
            lines.append(f"    - {w}")
    return "\n".join(lines)
