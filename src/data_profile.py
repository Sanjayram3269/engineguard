
from pathlib import Path

import numpy as np
import pandas as pd


# --------------------------------------------------
# 1. PATHS AND DATA LOADING
# --------------------------------------------------

ROOT = Path(__file__).resolve().parent.parent
DATA_PATH = ROOT / "data" / "EngineFaultDB_Final.csv"
REPORTS = ROOT / "reports"

REPORTS.mkdir(parents=True, exist_ok=True)

if not DATA_PATH.exists():
    raise FileNotFoundError(f"Dataset not found: {DATA_PATH}")

df = pd.read_csv(DATA_PATH)
target = "Fault"

if target not in df.columns:
    raise ValueError(f"Target column '{target}' was not found.")

features = df.drop(columns=[target])


# --------------------------------------------------
# 2. CLASS DISTRIBUTION
# --------------------------------------------------

print("\n=== 1. CLASS DISTRIBUTION ===")

counts = df[target].value_counts().sort_index()

summary = pd.DataFrame({
    "count": counts,
    "percentage": (counts / len(df) * 100).round(2),
})

print(summary.to_string())


# --------------------------------------------------
# 3. EXACT DUPLICATE ROWS
# --------------------------------------------------

print("\n=== 2. DUPLICATE DETAILS ===")

duplicates = df[df.duplicated(keep=False)]

print("Rows involved in exact duplicates:", len(duplicates))

if not duplicates.empty:
    print(duplicates.to_string(index=False))
else:
    print("No exact duplicate rows found.")

print("Total exact duplicate rows beyond the first occurrence:",
      int(df.duplicated().sum()))


# --------------------------------------------------
# 4. ZERO-VARIANCE FEATURES
# --------------------------------------------------

print("\n=== 3. FEATURES WITH ZERO VARIANCE ===")

constant = features.columns[
    features.nunique(dropna=False) <= 1
].tolist()

print(constant if constant else "None")


# --------------------------------------------------
# 5. EXPLORATORY CORRELATION WITH FAULT LABEL
# --------------------------------------------------

print("\n=== 4. CORRELATION WITH FAULT LABEL ===")

# Fault is a categorical class ID, not a continuous measurement.
# These correlations are exploratory, not causal evidence.

corr_with_target = features.corrwith(df[target])

corr_with_target = corr_with_target.reindex(
    corr_with_target.abs().sort_values(ascending=False).index
)

print(corr_with_target.round(3).to_string())
print("Note: Fault-label correlations are exploratory only.")


# --------------------------------------------------
# 6. FEATURE-TO-FEATURE CORRELATIONS
# --------------------------------------------------

print("\n=== 5. FEATURE CORRELATIONS ===")

corr_matrix = features.corr(numeric_only=True)

# Keep only the upper triangle so each pair appears once.
upper_triangle = corr_matrix.where(
    np.triu(
        np.ones(corr_matrix.shape, dtype=bool),
        k=1,
    )
)

pairs = (
    upper_triangle
    .stack()
    .sort_values(key=lambda values: values.abs(), ascending=False)
)

if pairs.empty:
    print("No feature-correlation pairs available.")
else:
    print(pairs.head(15).round(3).to_string())


# --------------------------------------------------
# 7. SAVE AUDIT REPORTS
# --------------------------------------------------

print("\n=== 6. SAVE AUDIT OUTPUTS ===")

summary.to_csv(REPORTS / "class_distribution.csv")
corr_matrix.to_csv(REPORTS / "feature_correlations.csv")
corr_with_target.to_csv(REPORTS / "fault_label_correlations.csv",
                        header=["correlation"])

print("Saved reports/class_distribution.csv")
print("Saved reports/feature_correlations.csv")
print("Saved reports/fault_label_correlations.csv")

print("\n========== DATA PROFILE COMPLETE ==========")
print(f"Dataset rows: {len(df):,}")
print(f"Dataset columns: {len(df.columns)}")
print(f"Input features: {len(features.columns)}")
print(f"Missing values: {int(df.isna().sum().sum())}")
print(f"Exact duplicate rows beyond first occurrence: {int(df.duplicated().sum())}")
