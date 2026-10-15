
from pathlib import Path
import pandas as pd

PROJECT_ROOT = Path(__file__).resolve().parent.parent
DATA_PATH = PROJECT_ROOT / "data" / "EngineFaultDB_Final.csv"

if not DATA_PATH.exists():
    raise FileNotFoundError(f"Dataset not found: {DATA_PATH}")

df = pd.read_csv(DATA_PATH)

print("\n========== DATASET OVERVIEW ==========")
print(f"File: {DATA_PATH.name}")
print(f"Rows: {df.shape[0]:,}")
print(f"Columns: {df.shape[1]}")

print("\n========== COLUMN NAMES ==========")
for column in df.columns:
    print(f"- {column!r}")

print("\n========== DATA TYPES ==========")
print(df.dtypes.to_string())

print("\n========== FIRST 5 ROWS ==========")
print(df.head().to_string())

print("\n========== MISSING VALUES ==========")
print(df.isna().sum().to_string())

print("\n========== DUPLICATES ==========")
print("Exact duplicate rows:", df.duplicated().sum())

print("\n========== NUMERICAL SUMMARY ==========")
print(df.describe().round(3).to_string())

print("\n========== CATEGORICAL COLUMNS ==========")
categorical = df.select_dtypes(
    include=["object", "category", "bool"]
)

if categorical.empty:
    print("No categorical columns detected.")
else:
    print(categorical.nunique(dropna=False).to_string())

print("\n========== POSSIBLE TARGET COLUMNS ==========")
keywords = ("target", "label", "fault", "class", "condition")
candidates = [
    col for col in df.columns
    if any(word in str(col).lower() for word in keywords)
]

if not candidates:
    print("No target-like column names found. Manual inspection required.")
else:
    for col in candidates:
        print(f"\nColumn: {col}")
        print(df[col].value_counts(dropna=False).to_string())

print("\n========== AUDIT COMPLETE ==========")
