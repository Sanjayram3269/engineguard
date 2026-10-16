
from pathlib import Path

import pandas as pd
from sklearn.metrics import confusion_matrix

ROOT = Path(__file__).resolve().parent.parent
path = ROOT / "reports" / "uncertainty_test_predictions.csv"

df = pd.read_csv(path)

classes = ["Normal", "Rich mixture", "Lean mixture", "Low voltage"]

print("\n" + "=" * 68)
print("ENGINEGUARD | REFERRAL ERROR ANALYSIS")
print("=" * 68)

for column, label in [
    ("confidence_referred", "CONFIDENCE RULE"),
    ("margin_referred", "TOP-TWO MARGIN RULE"),
]:
    print(f"\n{label}:")
    grouped = df.groupby("actual_class")[column].agg(["count", "sum"])
    grouped["referral_rate"] = grouped["sum"] / grouped["count"]
    print(grouped.to_string(float_format=lambda x: f"{x:.3f}"))

print("\n\nCONFIDENCE REFERRAL: ACCEPTED-CASE ACCURACY BY ACTUAL CLASS")
accepted = df[~df["confidence_referred"]]
by_class = accepted.groupby("actual_class").agg(
    accepted_cases=("correct", "size"),
    accuracy=("correct", "mean"),
)
print(by_class.to_string(float_format=lambda x: f"{x:.3f}"))

print("\n\nCONFIDENCE REFERRAL: WHERE ERRORS OCCUR")
errors = df[~df["correct"]]
errors = errors.copy()
errors["confidence_referred"] = errors["confidence_referred"].astype(bool)

error_table = pd.crosstab(
    [errors["actual_class"], errors["predicted_class"]],
    errors["confidence_referred"],
    rownames=["Actual", "Predicted"],
    colnames=["Referred"],
    dropna=False,
)
print(error_table.to_string())

print("\n\nCONFUSION MATRIX: ALL TEST CASES")
print(pd.DataFrame(
    confusion_matrix(
        df["actual_class"],
        df["predicted_class"],
        labels=classes,
    ),
    index=[f"Actual: {c}" for c in classes],
    columns=[f"Pred: {c}" for c in classes],
).to_string())

print("\n\nLOWEST-CONFIDENCE INCORRECT PREDICTIONS")
cols = [
    "actual_class",
    "predicted_class",
    "max_class_vote",
    "top_two_vote_margin",
    "confidence_referred",
    "margin_referred",
]
print(
    errors.sort_values("max_class_vote")[cols]
    .head(20)
    .to_string(index=False)
)

print("\nANALYSIS COMPLETE")
