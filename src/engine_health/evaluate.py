"""Held-out evaluation of the Engine Health Index against the binary label.

The label is used HERE ONLY, after the reference has been fitted on the training split
and the score has been fixed. It does not change the score.

Caveat: the CSV has no recording or engine-ID column, so a random split may place
related operating conditions in both train and test. Results may overstate performance
on unseen engines.
"""

from __future__ import annotations

from typing import Any, Dict

import numpy as np
import pandas as pd

from .index import LABEL_COLUMN, fit_reference, score_readings, split_labelled


def _describe(values: np.ndarray) -> Dict[str, float]:
    if values.size == 0:
        return {"count": 0}
    p5, p25, p50, p75, p95 = np.percentile(values, [5, 25, 50, 75, 95])
    return {
        "count": int(values.size),
        "mean": round(float(values.mean()), 2),
        "std": round(float(values.std(ddof=1)) if values.size > 1 else 0.0, 2),
        "min": round(float(values.min()), 2),
        "p05": round(float(p5), 2),
        "p25": round(float(p25), 2),
        "median": round(float(p50), 2),
        "p75": round(float(p75), 2),
        "p95": round(float(p95), 2),
        "max": round(float(values.max()), 2),
    }


def evaluate(df: pd.DataFrame) -> Dict[str, Any]:
    labels_present = set(pd.unique(df[LABEL_COLUMN]))
    if not labels_present <= {0, 1}:
        raise ValueError(f"Label must be 0 or 1; found {sorted(labels_present)}")

    train, test = split_labelled(df)
    ref = fit_reference(train)  # fitted on training split only

    results = score_readings(test, ref)
    scores = np.array(
        [np.nan if r["score"] is None else r["score"] for r in results], dtype=float
    )
    labels = test[LABEL_COLUMN].to_numpy()
    usable = ~np.isnan(scores)
    n_unscored = int((~usable).sum())

    normal_s = scores[usable & (labels == 0)]
    faulty_s = scores[usable & (labels == 1)]

    from sklearn.metrics import roc_auc_score

    y_faulty = (labels[usable] == 1).astype(int)
    if len(np.unique(y_faulty)) < 2:
        raise ValueError("Test split contains only one class; cannot compute separation")
    # Lower score = larger deviation, so negate the score for "faulty" ranking.
    auc = float(roc_auc_score(y_faulty, -scores[usable]))

    # Overlap: normal 5th-95th percentile band, as a simple descriptive measure.
    lo, hi = np.percentile(normal_s, [5, 95])
    faulty_inside_normal_band = float(np.mean((faulty_s >= lo) & (faulty_s <= hi)))
    normal_outside_normal_band = float(np.mean((normal_s < lo) | (normal_s > hi)))

    return {
        "split": {
            "train_rows": int(len(train)),
            "test_rows": int(len(test)),
            "test_size": 0.2,
            "random_state": 42,
            "stratified": True,
            "reference_normal_rows": ref.n_normal_rows,
        },
        "unscored_test_rows": n_unscored,
        "score_by_label_test": {
            "normal_label_0": _describe(normal_s),
            "faulty_label_1": _describe(faulty_s),
        },
        "separation": {
            "roc_auc_faulty_vs_normal": round(auc, 4),
            "normal_reference_p05_p95": [round(float(lo), 2), round(float(hi), 2)],
            "faulty_within_normal_band_pct": round(100 * faulty_inside_normal_band, 1),
            "normal_outside_normal_band_pct": round(100 * normal_outside_normal_band, 1),
        },
        "caveats": [
            "Score construction does not use the label; the label is used only here.",
            "The label is binary; it is not a ground-truth health or remaining-life target.",
            "Random split with no engine or recording ID: may overstate generalization.",
            "A high AUC means the label separates groups; it does not prove physical health.",
        ],
    }
