
from pathlib import Path

import numpy as np
import pandas as pd
from scipy.stats import mannwhitneyu

ROOT = Path(__file__).resolve().parent.parent
DATA_PATH = ROOT / "data" / "EngineFaultDB_Final.csv"
REPORT_DIR = ROOT / "reports"
REPORT_DIR.mkdir(exist_ok=True)

df = pd.read_csv(DATA_PATH).drop_duplicates().reset_index(drop=True)

# Exploratory analysis only; do not use this output to evaluate
# final test performance or choose thresholds from the test set.
lean = df[df["Fault"] == 2]
low_voltage = df[df["Fault"] == 3]

features = [c for c in df.columns if c != "Fault"]
results = []

for feature in features:
    a = lean[feature].dropna().astype(float)
    b = low_voltage[feature].dropna().astype(float)

    mean_a, mean_b = a.mean(), b.mean()
    std_a, std_b = a.std(ddof=1), b.std(ddof=1)

    # Standardized mean difference using pooled standard deviation.
    pooled_var = (
        ((len(a) - 1) * std_a**2 + (len(b) - 1) * std_b**2)
        / (len(a) + len(b) - 2)
    )
    pooled_std = np.sqrt(pooled_var)
    effect_size = (
        (mean_a - mean_b) / pooled_std if pooled_std > 0 else 0.0
    )

    # Non-parametric distribution comparison.
    test = mannwhitneyu(a, b, alternative="two-sided")

    results.append({
        "feature": feature,
        "lean_mean": mean_a,
        "low_voltage_mean": mean_b,
        "lean_median": a.median(),
        "low_voltage_median": b.median(),
        "lean_std": std_a,
        "low_voltage_std": std_b,
        "standardized_mean_difference": effect_size,
        "absolute_effect_size": abs(effect_size),
        "mann_whitney_p_value": test.pvalue,
        "lean_q25": a.quantile(0.25),
        "lean_q75": a.quantile(0.75),
        "low_voltage_q25": b.quantile(0.25),
        "low_voltage_q75": b.quantile(0.75),
    })

result_df = pd.DataFrame(results).sort_values(
    "absolute_effect_size", ascending=False
)

# Correct the multiple-comparison p-values with Benjamini-Hochberg.
p = result_df["mann_whitney_p_value"].to_numpy()
m = len(p)
order = np.argsort(p)
adjusted = np.empty(m)
running_min = 1.0

for rank_index in range(m - 1, -1, -1):
    original_index = order[rank_index]
    rank = rank_index + 1
    running_min = min(running_min, p[original_index] * m / rank)
    adjusted[original_index] = running_min

result_df["adjusted_p_value"] = np.minimum(adjusted, 1.0)

output = REPORT_DIR / "feature_separation_lean_vs_low_voltage.csv"
result_df.to_csv(output, index=False)

print("\nFEATURE SEPARATION: LEAN MIXTURE VS LOW VOLTAGE")
print("Larger absolute effect sizes indicate more separation in feature means.")
print(
    result_df[
        [
            "feature",
            "lean_mean",
            "low_voltage_mean",
            "absolute_effect_size",
            "adjusted_p_value",
        ]
    ].to_string(index=False, float_format=lambda x: f"{x:.5g}")
)

print(f"\nSaved full results to {output}")
print(
    "\nReminder: statistical differences alone do not prove a feature "
    "will improve classification. Correlated features and distribution "
    "overlap matter too."
)
