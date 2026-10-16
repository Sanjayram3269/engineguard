"""Validation-split experiments: can any approach separate normal and faulty rows better?

This is a SEPARATE analysis. It does not change the Engine Health Index, its reference,
or the existing classifier. Any label-trained candidate here is a normal/faulty
prediction experiment, NOT a measure of engine health.

Protocol (no leakage)
- Stratified split: 60% train / 20% validation / 20% test, random_state=42.
- Every scaler, regression, reference and model is fit on TRAINING rows only.
- Candidates are compared on VALIDATION AUC only.
- The test split is scored ONCE, for the baseline and the selected candidate.
- Test AUC is reported with a bootstrap 95% confidence interval.
"""

from __future__ import annotations

import argparse
import json
import os
from typing import Callable, Dict

import numpy as np
import pandas as pd
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.linear_model import LinearRegression, LogisticRegression
from sklearn.metrics import average_precision_score, roc_auc_score
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler

from .index import LABEL_COLUMN, SENSOR_COLUMNS, fit_reference, load_labelled_csv, score_readings

RPM = "Engine rpm"
OTHERS = [c for c in SENSOR_COLUMNS if c != RPM]
SPLIT_SEED = 42


def three_way_split(df: pd.DataFrame):
    train_val, test = train_test_split(
        df, test_size=0.2, stratify=df[LABEL_COLUMN], random_state=SPLIT_SEED
    )
    train, val = train_test_split(
        train_val, test_size=0.25, stratify=train_val[LABEL_COLUMN], random_state=SPLIT_SEED
    )  # 0.25 x 0.8 = 0.2 of the full data
    return train, val, test


def _y(df: pd.DataFrame) -> np.ndarray:
    return (df[LABEL_COLUMN].to_numpy() == 1).astype(int)


# ---------------------------------------------------------------------------
# Candidates. Each returns a "faultiness" score for `ev` (higher = more faulty),
# fit using `train` only.
# ---------------------------------------------------------------------------

def exp_ehi_deviation(train, ev):
    """Baseline: current Engine Health Index deviation (unsupervised, normal-only reference)."""
    ref = fit_reference(train)
    res = score_readings(ev, ref)
    return np.array([np.nan if r["score"] is None else -r["score"] for r in res], dtype=float)


def exp_rpm_only(train, ev):
    """Baseline: engine RPM alone, direction chosen from TRAINING medians."""
    diff = train.loc[train[LABEL_COLUMN] == 1, RPM].median() - train.loc[train[LABEL_COLUMN] == 0, RPM].median()
    sign = -1.0 if diff < 0 else 1.0
    return sign * ev[RPM].to_numpy(float)


def exp_logistic_raw(train, ev):
    """Supervised: standardized raw sensors + logistic regression."""
    sc = StandardScaler().fit(train[SENSOR_COLUMNS].to_numpy(float))
    clf = LogisticRegression(max_iter=2000).fit(
        sc.transform(train[SENSOR_COLUMNS].to_numpy(float)), _y(train)
    )
    return clf.predict_proba(sc.transform(ev[SENSOR_COLUMNS].to_numpy(float)))[:, 1]


def _rpm_design(rpm: np.ndarray) -> np.ndarray:
    return np.column_stack([rpm, rpm ** 2])


def _fit_rpm_residual_models(normal: pd.DataFrame):
    """For each non-RPM sensor: regress on RPM (quadratic) using NORMAL training rows only."""
    X = _rpm_design(normal[RPM].to_numpy(float))
    models = {}
    for c in OTHERS:
        y = normal[c].to_numpy(float)
        lr = LinearRegression().fit(X, y)
        resid = y - lr.predict(X)
        s = float(resid.std(ddof=1))
        if not s > 0:
            raise ValueError(f"'{c}' has zero residual spread after RPM adjustment")
        models[c] = (lr, s)
    rpm_vals = normal[RPM].to_numpy(float)
    models[RPM] = (float(rpm_vals.mean()), float(rpm_vals.std(ddof=1)))
    return models


def _residual_z(df: pd.DataFrame, models) -> np.ndarray:
    X = _rpm_design(df[RPM].to_numpy(float))
    cols = []
    for c in OTHERS:
        lr, s = models[c]
        cols.append((df[c].to_numpy(float) - lr.predict(X)) / s)
    mean, sd = models[RPM]
    cols.append((df[RPM].to_numpy(float) - mean) / sd)
    return np.column_stack(cols)


def exp_rpm_adjusted_deviation(train, ev):
    """RPM-aware deviation: sensors compared with the normal RPM-expected value (unsupervised)."""
    models = _fit_rpm_residual_models(train[train[LABEL_COLUMN] == 0])
    Z = _residual_z(ev, models)
    return np.sqrt((Z ** 2).mean(axis=1))


def exp_rpm_adjusted_logistic(train, ev):
    """Supervised: RPM-adjusted residual z-scores + logistic regression."""
    models = _fit_rpm_residual_models(train[train[LABEL_COLUMN] == 0])
    Ztr = _residual_z(train, models)
    clf = LogisticRegression(max_iter=2000).fit(Ztr, _y(train))
    return clf.predict_proba(_residual_z(ev, models))[:, 1]


def _gbm_features(df: pd.DataFrame) -> np.ndarray:
    rpm = np.clip(df[RPM].to_numpy(float), 1.0, None)
    base = df[SENSOR_COLUMNS].to_numpy(float)
    ratios = np.column_stack([
        df["Fuel pressure"].to_numpy(float) / rpm,
        df["Lub oil pressure"].to_numpy(float) / rpm,
        df["Coolant pressure"].to_numpy(float) / rpm,
        df["lub oil temp"].to_numpy(float) / rpm,
        df["Coolant temp"].to_numpy(float) / rpm,
    ])
    return np.column_stack([base, ratios])


def exp_gbm_ratios(train, ev):
    """Supervised: gradient-boosted trees on raw sensors plus sensor/RPM ratios."""
    clf = HistGradientBoostingClassifier(
        max_depth=3, learning_rate=0.05, max_iter=300, random_state=42
    ).fit(_gbm_features(train), _y(train))
    return clf.predict_proba(_gbm_features(ev))[:, 1]


CANDIDATES: Dict[str, Callable] = {
    "EHI deviation (current baseline)": exp_ehi_deviation,
    "Engine rpm only (baseline)": exp_rpm_only,
    "Logistic, raw sensors": exp_logistic_raw,
    "RPM-adjusted deviation": exp_rpm_adjusted_deviation,
    "RPM-adjusted logistic": exp_rpm_adjusted_logistic,
    "Gradient boosting + ratios": exp_gbm_ratios,
}
BASELINES = {"EHI deviation (current baseline)", "Engine rpm only (baseline)"}


def _auc(y: np.ndarray, s: np.ndarray) -> float:
    ok = ~np.isnan(s)
    return float(roc_auc_score(y[ok], s[ok]))


def bootstrap_auc_ci(y: np.ndarray, s: np.ndarray, n: int = 1000, seed: int = 42):
    rng = np.random.default_rng(seed)
    ok = ~np.isnan(s)
    y, s = y[ok], s[ok]
    vals = []
    for _ in range(n):
        idx = rng.integers(0, len(y), len(y))
        if len(np.unique(y[idx])) < 2:
            continue
        vals.append(roc_auc_score(y[idx], s[idx]))
    lo, hi = np.percentile(vals, [2.5, 97.5])
    return round(float(lo), 4), round(float(hi), 4)


def run_experiments(df: pd.DataFrame) -> dict:
    train, val, test = three_way_split(df)
    y_val = _y(val)

    val_auc = {}
    val_scores = {}
    for name, fn in CANDIDATES.items():
        s = fn(train, val)
        val_scores[name] = s
        val_auc[name] = round(_auc(y_val, s), 4)

    selectable = {k: v for k, v in val_auc.items() if k not in BASELINES}
    best = max(selectable, key=selectable.get)

    y_test = _y(test)
    test_results = {}
    for name in sorted(BASELINES | {best}):
        s = CANDIDATES[name](train, test)
        test_results[name] = {
            "test_auc": round(_auc(y_test, s), 4),
            "test_auc_95ci": bootstrap_auc_ci(y_test, s),
            "test_average_precision": round(float(average_precision_score(y_test, np.nan_to_num(s))), 4),
        }

    return {
        "protocol": {
            "split": "stratified 60/20/20 train/validation/test",
            "random_state": SPLIT_SEED,
            "rows": {"train": int(len(train)), "validation": int(len(val)), "test": int(len(test))},
            "fit_on": "training rows only",
            "selection_metric": "validation ROC AUC",
            "test_used": "once, for baselines and the selected candidate",
            "test_positive_rate": round(float(y_test.mean()), 4),
        },
        "validation_auc_all_candidates": val_auc,
        "selected_candidate": best,
        "test_results": test_results,
        "limitations": [
            "Random split: no engine or recording ID, so related runs may appear in train and test.",
            "Supervised candidates learn the binary label; their output is NOT engine health.",
            "AUC describes separation of the labelled groups only, not physical condition.",
            "If the improvement is small relative to the bootstrap CI, treat it as no reliable gain.",
        ],
    }


def main(argv=None) -> int:
    p = argparse.ArgumentParser(description="Validation-split AUC experiments (separate from EHI).")
    p.add_argument("--csv", default=os.path.join("data", "engine_data.csv"))
    p.add_argument("--out", default=os.path.join("reports", "experiments", "auc_experiment_report.json"))
    args = p.parse_args(argv)
    report = run_experiments(load_labelled_csv(args.csv))
    os.makedirs(os.path.dirname(args.out) or ".", exist_ok=True)
    with open(args.out, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)
    print("Validation AUC by candidate:")
    for k, v in sorted(report["validation_auc_all_candidates"].items(), key=lambda kv: -kv[1]):
        print(f"  {v:.4f}  {k}")
    print(f"\nSelected on validation: {report['selected_candidate']}")
    print("Test results (touched once):")
    for k, v in report["test_results"].items():
        print(f"  {k}: AUC {v['test_auc']} 95% CI {v['test_auc_95ci']}  AP {v['test_average_precision']}")
    print(f"\nSaved report to {args.out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
