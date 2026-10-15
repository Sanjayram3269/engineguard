
from pathlib import Path

import pandas as pd

# Project paths
PROJECT_ROOT = Path(__file__).resolve().parent.parent
DATA_PATH = (
    PROJECT_ROOT
    / "data"
    / "EngineFaultDB-main"
    / "EngineFaultDB_Final.csv"
)

TARGET = "Fault"

EXPECTED_FEATURES = [
    "MAP",
    "TPS",
    "Force",
    "Power",
    "RPM",
    "Consumption L/H",
    "Consumption L/100KM",
    "Speed",
    "CO",
    "HC",
    "CO2",
    "O2",
    "Lambda",
    "AFR",
]

EXPECTED_LABELS = {0, 1, 2, 3}


def load_dataset() -> pd.DataFrame:
    """Load and validate the EngineFaultDB CSV."""

    if not DATA_PATH.exists():
        raise FileNotFoundError(
            f"Dataset not found at: {DATA_PATH}"
        )

    df = pd.read_csv(DATA_PATH)

    required_columns = EXPECTED_FEATURES + [TARGET]

    missing_columns = set(required_columns) - set(df.columns)
    extra_columns = set(df.columns) - set(required_columns)

    if missing_columns:
        raise ValueError(
            f"Missing required columns: {sorted(missing_columns)}"
        )

    if extra_columns:
        raise ValueError(
            f"Unexpected columns found: {sorted(extra_columns)}"
        )

    if df.empty:
        raise ValueError("The dataset is empty.")

    if df.isna().any().any():
        raise ValueError(
            "Missing values detected. Investigate them before training."
        )

    if not df.apply(
        lambda column: pd.api.types.is_numeric_dtype(column)
    ).all():
        raise ValueError("All expected dataset columns must be numeric.")

    if not df[TARGET].isin(EXPECTED_LABELS).all():
        raise ValueError(
            f"Unexpected fault labels: "
            f"{sorted(set(df[TARGET]) - EXPECTED_LABELS)}"
        )

    if not all(
        pd.api.types.is_numeric_dtype(df[column])
        for column in EXPECTED_FEATURES
    ):
        raise ValueError("A model feature is not numeric.")

    if not df[EXPECTED_FEATURES].map(
        lambda value: pd.notna(value) and abs(value) != float("inf")
    ).all().all():
        raise ValueError("Infinite or invalid feature values detected.")

    print(f"Dataset loaded: {df.shape[0]:,} rows")
    print(f"Features: {len(EXPECTED_FEATURES)}")
    print(f"Target: {TARGET}")
    print("\nLabel counts:")
    print(df[TARGET].value_counts().sort_index())

    return df


def get_features_and_target(
    df: pd.DataFrame,
) -> tuple[pd.DataFrame, pd.Series]:
    """Separate model features from the target label."""

    X = df[EXPECTED_FEATURES].copy()
    y = df[TARGET].copy()

    return X, y


if __name__ == "__main__":
    dataset = load_dataset()
    X, y = get_features_and_target(dataset)

    print(f"\nX shape: {X.shape}")
    print(f"y shape: {y.shape}")
    print("\nPreprocessing validation passed.")
