
from pathlib import Path
import pandas as pd

# Find the dataset folder relative to this script.
data_folder = Path(__file__).parent
csv_files = list(data_folder.glob("*.csv"))

if not csv_files:
    raise FileNotFoundError(
        f"No CSV file found in: {data_folder}\n"
        "Check that the dataset is inside the data folder."
    )

if len(csv_files) > 1:
    print("Multiple CSV files found:")
    for file in csv_files:
        print(file.name)
    raise RuntimeError("Keep only the intended dataset or select it explicitly.")

csv_path = csv_files[0]
df = pd.read_csv(csv_path)

print("\n========== DATASET AUDIT ==========")
print(f"File: {csv_path.name}")
print(f"Rows: {df.shape[0]:,}")
print(f"Columns: {df.shape[1]:,}")

print("\n========== COLUMN NAMES ==========")
print(df.columns.tolist())

print("\n========== DATA TYPES ==========")
print(df.dtypes)

print("\n========== FIRST 5 ROWS ==========")
print(df.head().to_string())

print("\n========== MISSING VALUES ==========")
print(df.isna().sum())

print("\n========== DUPLICATE ROWS ==========")
print(f"Exact duplicate rows: {df.duplicated().sum():,}")

print("\n========== UNIQUE VALUES ==========")
for column in df.columns:
    print(f"{column}: {df[column].nunique(dropna=False):,}")

print("\n========== POSSIBLE CATEGORICAL / TARGET COLUMNS ==========")
for column in df.columns:
    unique_count = df[column].nunique(dropna=True)
    if df[column].dtype == "object" or unique_count <= 20:
        print(f"\n{column}")
        print(df[column].value_counts(dropna=False).head(20).to_string())

print("\n========== NUMERIC SUMMARY ==========")
print(df.describe().to_string())

print("\n========== END OF INITIAL AUDIT ==========")
