"""Prototype sensor-based Engine Health Index (EHI) for data/engine_data.csv.

Method
------
1. Reference: fitted on NORMAL-labelled TRAINING rows only (Engine Condition == 0).
   Per sensor: the median, and a robust scale = IQR / 1.349 (equal to the standard
   deviation for a normal distribution). If a sensor's IQR is zero, the standard
   deviation is used instead. A sensor with zero spread cannot define a deviation,
   so fitting raises an error.
2. Robust deviation per sensor: z_i = (x_i - median_i) / scale_i.
3. Combined deviation: D = sqrt(mean_i z_i^2), over the sensors that are present.
4. Score = 100 / (1 + D), which lies in (0, 100]. 100 means every sensor sits at the
   reference median. Higher score = closer to the normal reference.

The score never uses the label. The label is used only by evaluate.py, which is kept
separate from construction.

This is a prototype deviation index. It is NOT a validated measure of physical engine
health, remaining useful life, or failure probability.
"""

from __future__ import annotations

import math
from dataclasses import asdict, dataclass, replace
from typing import Any, Dict, List, Optional

import numpy as np
import pandas as pd

SENSOR_COLUMNS: List[str] = [
    "Engine rpm",
    "Lub oil pressure",
    "Fuel pressure",
    "Coolant pressure",
    "lub oil temp",
    "Coolant temp",
]
LABEL_COLUMN = "Engine Condition"
NORMAL_LABEL = 0
IQR_TO_SIGMA = 1.349
MIN_REFERENCE_ROWS = 30
TEST_SIZE = 0.2
SPLIT_RANDOM_STATE = 42


@dataclass(frozen=True)
class Reference:
    """Normal-condition reference fitted on training data only."""

    median: Dict[str, float]
    scale: Dict[str, float]
    minimum: Dict[str, float]
    maximum: Dict[str, float]
    scale_method: Dict[str, str]
    n_normal_rows: int
    score_p05: float = float("nan")
    score_p50: float = float("nan")

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Reference":
        return cls(**data)


def _check_columns(df: pd.DataFrame, require_label: bool = False) -> None:
    required = SENSOR_COLUMNS + ([LABEL_COLUMN] if require_label else [])
    missing = [c for c in required if c not in df.columns]
    if missing:
        raise ValueError(
            f"Missing required column(s): {missing}. Found columns: {list(df.columns)}"
        )


def _clean_numeric(series: pd.Series, name: str) -> pd.Series:
    """Return floats with NaN for missing values. Raise on non-numeric or infinite values.

    Blank strings count as missing. Non-numeric text is never silently turned into
    a healthy-looking value; it raises an error naming the column and rows.
    """
    raw = series.map(lambda v: np.nan if (isinstance(v, str) and v.strip() == "") else v)
    num = pd.to_numeric(raw, errors="coerce")
    bad = raw.notna() & num.isna()
    if bad.any():
        bad_rows = list(series.index[bad.to_numpy()][:5])
        raise ValueError(
            f"Non-numeric value(s) in '{name}' at row(s) {bad_rows} (first 5 shown)"
        )
    if np.isinf(num.to_numpy(dtype=float)).any():
        raise ValueError(f"Infinite value(s) in '{name}' are not allowed")
    return num.astype(float)


def load_labelled_csv(path: str) -> pd.DataFrame:
    df = pd.read_csv(path)
    _check_columns(df, require_label=True)
    if df.empty:
        raise ValueError(f"CSV has no data rows: {path}")
    return df


def split_labelled(df: pd.DataFrame):
    """Stratified 80/20 split. Fixed random_state so every run gives the same split."""
    from sklearn.model_selection import train_test_split

    return train_test_split(
        df,
        test_size=TEST_SIZE,
        stratify=df[LABEL_COLUMN],
        random_state=SPLIT_RANDOM_STATE,
    )


def fit_reference(train_df: pd.DataFrame) -> Reference:
    """Fit the normal reference from NORMAL-labelled rows of the training split only."""
    _check_columns(train_df, require_label=True)
    normal = train_df[train_df[LABEL_COLUMN] == NORMAL_LABEL]
    if len(normal) < MIN_REFERENCE_ROWS:
        raise ValueError(
            f"Need at least {MIN_REFERENCE_ROWS} normal training rows to fit the reference; "
            f"found {len(normal)}"
        )

    median: Dict[str, float] = {}
    scale: Dict[str, float] = {}
    minimum: Dict[str, float] = {}
    maximum: Dict[str, float] = {}
    method: Dict[str, str] = {}

    for col in SENSOR_COLUMNS:
        x = _clean_numeric(normal[col], col)
        if x.isna().any():
            raise ValueError(
                f"Normal training rows have missing '{col}' values; clean the data before fitting"
            )
        q1, q3 = float(x.quantile(0.25)), float(x.quantile(0.75))
        robust = (q3 - q1) / IQR_TO_SIGMA
        if robust > 0:
            s, m = robust, "iqr"
        else:
            s, m = float(x.std(ddof=1)), "std"
        if not (math.isfinite(s) and s > 0):
            raise ValueError(
                f"'{col}' has zero spread in the normal training rows; "
                "a constant sensor cannot define a reference deviation"
            )
        median[col] = float(x.median())
        scale[col] = s
        minimum[col] = float(x.min())
        maximum[col] = float(x.max())
        method[col] = m

    ref = Reference(
        median=median,
        scale=scale,
        minimum=minimum,
        maximum=maximum,
        scale_method=method,
        n_normal_rows=int(len(normal)),
    )
    normal_scores = np.array(
        [r["score"] for r in score_readings(normal, ref) if r["score"] is not None],
        dtype=float,
    )
    if normal_scores.size == 0:
        raise ValueError("No normal training rows could be scored")
    p05, p50 = np.percentile(normal_scores, [5, 50])
    return replace(ref, score_p05=float(p05), score_p50=float(p50))


def _score_one_row(values: Dict[str, float], ref: Reference, row_id: Any) -> Dict[str, Any]:
    available: List[str] = []
    missing: List[str] = []
    z: Dict[str, float] = {}
    warnings: List[str] = []
    beyond: Dict[str, bool] = {}

    for col in SENSOR_COLUMNS:
        v = values[col]
        if v is None or (isinstance(v, float) and math.isnan(v)):
            missing.append(col)
            continue
        z[col] = (v - ref.median[col]) / ref.scale[col]
        available.append(col)
        beyond[col] = bool(v < ref.minimum[col] or v > ref.maximum[col])
        if beyond[col]:
            warnings.append(
                f"{col} = {v:.4g} is outside the normal-reference range "
                f"[{ref.minimum[col]:.4g}, {ref.maximum[col]:.4g}]"
            )

    coverage = {
        "available": len(available),
        "total": len(SENSOR_COLUMNS),
        "missing": missing,
    }
    if missing:
        warnings.append(
            "Missing sensor(s) are unavailable and are NOT treated as healthy: "
            + ", ".join(missing)
        )

    if not available:
        return {
            "row_id": row_id,
            "score": None,
            "deviation": None,
            "interpretation": "Not scored: no usable sensor readings.",
            "coverage": coverage,
            "sensor_contributions": {},
            "warnings": warnings,
        }

    squares = {c: z[c] ** 2 for c in available}
    total = sum(squares.values())
    deviation = math.sqrt(total / len(available))
    score = min(100.0, max(0.0, 100.0 / (1.0 + deviation)))

    contributions = {}
    for c in sorted(available, key=lambda c: squares[c], reverse=True):
        share = (100.0 * squares[c] / total) if total > 0 else 0.0
        contributions[c] = {
            "value": round(values[c], 4),
            "robust_z": round(z[c], 3),
            "share_of_deviation_pct": round(share, 1),
            "beyond_reference_range": beyond[c],
        }

    if deviation == 0:
        interpretation = "All available sensors are at the normal-reference median."
    else:
        interpretation = (
            f"Combined deviation {deviation:.2f} robust units from the normal reference. "
            "Higher score = closer to the normal reference; this is a prototype index, "
            "not a validated health measure."
        )

    return {
        "row_id": row_id,
        "score": round(score, 2),
        "deviation": round(deviation, 4),
        "interpretation": interpretation,
        "coverage": coverage,
        "sensor_contributions": contributions,
        "warnings": warnings,
    }


def score_readings(df: pd.DataFrame, ref: Reference) -> List[Dict[str, Any]]:
    """Score every row of a DataFrame. Sensor columns are required; label is not used."""
    if df.empty:
        raise ValueError("No readings supplied (empty input)")
    _check_columns(df)
    cleaned = {c: _clean_numeric(df[c], c).to_numpy() for c in SENSOR_COLUMNS}
    results = []
    for pos, row_id in enumerate(df.index):
        values = {c: float(cleaned[c][pos]) for c in SENSOR_COLUMNS}
        results.append(_score_one_row(values, ref, row_id))
    return results


def score_one(record: Dict[str, Any], ref: Reference) -> Dict[str, Any]:
    """Score a single reading given as {sensor name: value}. Absent or blank = unavailable."""
    if not record:
        raise ValueError("Empty input: supply at least one sensor reading")
    unknown = [k for k in record if k not in SENSOR_COLUMNS]
    if unknown:
        raise ValueError(f"Unknown sensor name(s): {unknown}. Expected: {SENSOR_COLUMNS}")
    df = pd.DataFrame([{c: record.get(c) for c in SENSOR_COLUMNS}])
    return score_readings(df, ref)[0]
