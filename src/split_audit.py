
from pathlib import Path

import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.impute import SimpleImputer
from sklearn.metrics import accuracy_score, f1_score, classification_report
from sklearn.pipeline import Pipeline
from sklearn.model_selection import train_test_split

ROOT = Path(__file__).resolve().parent.parent
DATA_PATH = ROOT / "data" / "EngineFaultDB_Final.csv"
REPORT_DIR = ROOT / "reports"
REPORT_DIR.mkdir(exist_ok=True)

TARGET = "Fault"
SEED = 42

df = pd.read_csv(DATA_PATH).drop_duplicates().reset_index(drop=True)
X = df.drop(columns=[TARGET])
y = df[TARGET].astype(int)

def make_model():
    return Pipeline([
        ("imputer", SimpleImputer(strategy="median")),
        ("classifier", RandomForestClassifier(
            n_estimators=300,
            class_weight="balanced_subsample",
            random_state=SEED,
            n_jobs=-1,
        )),
    ])

def evaluate(name, train_idx, test_idx):
    model = make_model()
    model.fit(X.iloc[train_idx], y.iloc[train_idx])
    predictions = model.predict(X.iloc[test_idx])
    actual = y.iloc[test_idx]

    accuracy = accuracy_score(actual, predictions)
    macro_f1 = f1_score(
        actual, predictions, average="macro", zero_division=0
    )

    print(f"\n--- {name} ---")
    print(f"Train rows: {len(train_idx):,}")
    print(f"Test rows:  {len(test_idx):,}")
    print(f"Accuracy:   {accuracy:.4f}")
    print(f"Macro F1:   {macro_f1:.4f}")
    print(classification_report(actual, predictions, zero_division=0))

    return {
        "split": name,
        "accuracy": accuracy,
        "macro_f1": macro_f1,
        "train_rows": len(train_idx),
        "test_rows": len(test_idx),
    }

# A. Preserve the existing ordered-within-class approach.
ordered_train, ordered_test = [], []

for label in sorted(y.unique()):
    indices = df.index[y == label].to_numpy()
    cut = int(len(indices) * 0.85)
    ordered_train.extend(indices[:cut])
    ordered_test.extend(indices[cut:])

# B. Random stratified split: every class is represented in both sets.
all_indices = pd.RangeIndex(len(df))
random_train, random_test = train_test_split(
    all_indices,
    test_size=0.15,
    random_state=SEED,
    stratify=y,
)

results = [
    evaluate("Ordered within each class", ordered_train, ordered_test),
    evaluate("Stratified random", random_train, random_test),
]

output = REPORT_DIR / "split_audit.csv"
pd.DataFrame(results).to_csv(output, index=False)
print(f"\nSplit comparison saved to: {output}")
print("\nAudit complete. Existing model and reports were not overwritten.")
