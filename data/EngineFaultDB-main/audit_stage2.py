
from pathlib import Path
import pandas as pd

folder = Path(__file__).parent
csv_path = folder / "EngineFaultDB_Final.csv"

df = pd.read_csv(csv_path)
target = "Fault"

print("=" * 60)
print("STAGE 2: LABEL AND LEAKAGE INVESTIGATION")
print("=" * 60)

# 1. Fault labels
print("\n1. FAULT LABEL COUNTS")
print(df[target].value_counts().sort_index())

# 2. Feature statistics by fault label
print("\n2. FEATURE MEANS BY FAULT LABEL")
print(df.groupby(target).mean(numeric_only=True).round(3).T)

# 3. Check whether each fault label occurs in one continuous block
labels = df[target]
runs = labels.ne(labels.shift()).cumsum()

run_summary = (
    df.assign(_run=runs)
      .groupby("_run")
      .agg(
          first_row=(target, lambda s: s.index[0]),
          last_row=(target, lambda s: s.index[-1]),
          fault=(target, "first"),
          rows=(target, "size")
      )
)

print("\n3. FIRST 20 CONTIGUOUS LABEL RUNS")
print(run_summary.head(20).to_string(index=False))
print(f"\nTotal contiguous label runs: {len(run_summary)}")

# 4. Exact duplicate row locations
duplicate_mask = df.duplicated(keep=False)

print("\n4. DUPLICATE ROW LOCATIONS")
if duplicate_mask.any():
    print(df.loc[duplicate_mask].sort_values(target).to_string())
else:
    print("No duplicate rows found.")

# 5. Check whether individual features have constant values per label
print("\n5. FEATURES CONSTANT WITHIN EACH FAULT CLASS")
for column in df.columns:
    if column == target:
        continue

    counts = df.groupby(target)[column].nunique()

    if (counts == 1).any():
        print(f"{column}: unique values per class = {counts.to_dict()}")

# 6. Correlations with target (screening only, not proof of leakage)
print("\n6. NUMERIC CORRELATIONS WITH FAULT")
correlations = (
    df.corr(numeric_only=True)[target]
      .drop(target)
      .sort_values(key=abs, ascending=False)
)
print(correlations.round(4).to_string())

print("\n" + "=" * 60)
print("STAGE 2 COMPLETE — FINDINGS REQUIRE INTERPRETATION")
print("=" * 60)
