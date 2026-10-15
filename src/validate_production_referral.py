
from pathlib import Path
import json

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.impute import SimpleImputer
from sklearn.metrics import accuracy_score, f1_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline

ROOT = Path(__file__).resolve().parent.parent
DATA_PATH = ROOT / "data" / "EngineFaultDB_Final.csv"
REPORT_DIR = ROOT / "reports"
REPORT_DIR.mkdir(parents=True, exist_ok=True)

TARGET = "Fault"
SEED = 42
MIN_COVERAGE = 0.70

CLASS_NAMES = {
    0: "Normal",
    1: "Rich mixture",
    2: "Lean mixture",
    3: "Low voltage",
}


def make_model():
    return Pipeline([
        ("imputer", SimpleImputer(strategy="median")),
        ("classifier", RandomForestClassifier(
            n_estimators=400,
            class_weight="balanced_subsample",
            random_state=SEED,
            n_jobs=-1,
        )),
    ])


def choose_confidence_threshold(y_true, predictions, confidence):
    # Threshold selection uses validation data only.
    candidates = np.unique(
        np.quantile(confidence, np.linspace(0.0, 1.0, 201))
    )
    choices = []

    for threshold in candidates:
        accepted = confidence >= threshold
        coverage = float(accepted.mean())

        if coverage < MIN_COVERAGE or not accepted.any():
            continue

        choices.append({
            "threshold": float(threshold),
            "validation_coverage": coverage,
            "validation_accepted_accuracy": float(
                accuracy_score(y_true[accepted], predictions[accepted])
            ),
        })

    if not choices:
        raise RuntimeError("No threshold meets the minimum coverage.")

    return max(
        choices,
        key=lambda row: (
            row["validation_accepted_accuracy"],
            row["validation_coverage"],
        ),
    )


def summarize(y_true, predictions, confidence, threshold, policy):
    accepted = confidence >= threshold
    correct = predictions == np.asarray(y_true)
    errors = ~correct

    return {
        "policy": policy,
        "threshold": float(threshold),
        "test_rows": len(y_true),
        "all_case_accuracy": float(accuracy_score(y_true, predictions)),
        "all_case_macro_f1": float(
            f1_score(y_true, predictions, average="macro", zero_division=0)
        ),
        "coverage": float(accepted.mean()),
        "referral_rate": float((~accepted).mean()),
        "accepted_cases": int(accepted.sum()),
        "referred_cases": int((~accepted).sum()),
        "accepted_case_accuracy": float(
            accuracy_score(np.asarray(y_true)[accepted], predictions[accepted])
        ),
        "total_errors": int(errors.sum()),
        "errors_among_accepted": int((errors & accepted).sum()),
        "errors_flagged_for_review": int((errors & ~accepted).sum()),
        "error_capture_rate": (
            float((errors & ~accepted).sum() / errors.sum())
            if errors.sum() else 0.0
        ),
    }


def main():
    df = pd.read_csv(DATA_PATH)
    duplicate_count = int(df.duplicated().sum())
    df = df.drop_duplicates().reset_index(drop=True)

    X = df.drop(columns=[TARGET])
    y = df[TARGET].astype(int)

    if set(y.unique()) != set(CLASS_NAMES):
        raise ValueError(f"Unexpected target labels: {sorted(y.unique())}")

    indices = np.arange(len(df))

    train_val_idx, test_idx = train_test_split(
        indices,
        test_size=0.15,
        random_state=SEED,
        stratify=y,
    )
    train_idx, val_idx = train_test_split(
        train_val_idx,
        test_size=0.15 / 0.85,
        random_state=SEED,
        stratify=y.iloc[train_val_idx],
    )

    X_train, y_train = X.iloc[train_idx], y.iloc[train_idx]
    X_val, y_val = X.iloc[val_idx], y.iloc[val_idx]
    X_test, y_test = X.iloc[test_idx], y.iloc[test_idx]

    print("=" * 68)
    print("ENGINEGUARD | PRODUCTION-STYLE REFERRAL VALIDATION")
    print("=" * 68)
    print(f"Rows after deduplication: {len(df):,}")
    print(f"Duplicate rows removed: {duplicate_count}")
    print(
        f"Split sizes: train={len(train_idx):,}, "
        f"validation={len(val_idx):,}, test={len(test_idx):,}"
    )

    # First model: training split only, used to choose the threshold.
    selection_model = make_model()
    print("\nTraining selection model...")
    selection_model.fit(X_train, y_train)

    val_pred = selection_model.predict(X_val)
    val_confidence = selection_model.predict_proba(X_val).max(axis=1)

    selected = choose_confidence_threshold(
        y_val.to_numpy(), val_pred, val_confidence
    )
    threshold = selected["threshold"]

    print("\nThreshold selected on validation data:")
    print(json.dumps(selected, indent=2))

    # Production-style model: train + validation, test remains untouched.
    X_train_val = pd.concat([X_train, X_val], axis=0)
    y_train_val = pd.concat([y_train, y_val], axis=0)

    production_model = make_model()
    print("\nRefitting production-style model on train + validation...")
    production_model.fit(X_train_val, y_train_val)

    test_pred = production_model.predict(X_test)
    test_confidence = production_model.predict_proba(X_test).max(axis=1)

    results = [
        summarize(
            y_test.to_numpy(),
            test_pred,
            test_confidence,
            0.0,
            "No referral baseline",
        ),
        summarize(
            y_test.to_numpy(),
            test_pred,
            test_confidence,
            threshold,
            "Validation-selected confidence referral",
        ),
    ]

    # The baseline should accept every case; threshold 0 achieves that
    # for this Random Forest because its maximum class-vote score is > 0.
    summary = pd.DataFrame(results)
    summary_path = REPORT_DIR / "production_referral_validation.csv"
    summary.to_csv(summary_path, index=False)

    test_output = X_test.reset_index(drop=True).copy()
    test_output["actual_label"] = y_test.reset_index(drop=True).to_numpy()
    test_output["predicted_label"] = test_pred
    test_output["actual_class"] = test_output["actual_label"].map(CLASS_NAMES)
    test_output["predicted_class"] = [
        CLASS_NAMES[int(label)] for label in test_pred
    ]
    test_output["max_class_vote"] = test_confidence
    test_output["review_required"] = test_confidence < threshold
    test_output["correct"] = test_pred == y_test.to_numpy()

    predictions_path = REPORT_DIR / "production_referral_test_predictions.csv"
    test_output.to_csv(predictions_path, index=False)

    metadata = {
        "experiment": "production_style_referral_validation",
        "model": "Random Forest",
        "random_state": SEED,
        "duplicate_rows_removed": duplicate_count,
        "threshold_selection": selected,
        "test_is_used_for_threshold_selection": False,
        "training_procedure": "Fit on training + validation; evaluate on held-out test",
        "confidence_warning": (
            "Maximum Random Forest class-vote proportion; not a calibrated "
            "probability of correctness."
        ),
        "split_warning": (
            "Stratified random split; generalization to unseen runs is not "
            "established without run/session identifiers."
        ),
    }
    metadata_path = REPORT_DIR / "production_referral_metadata.json"
    metadata_path.write_text(json.dumps(metadata, indent=2), encoding="utf-8")

    print("\nHELD-OUT TEST RESULTS")
    print(summary.to_string(index=False))
    print("\nSaved:")
    print(summary_path)
    print(predictions_path)
    print(metadata_path)
    print("\nVALIDATION COMPLETE")


if __name__ == "__main__":
    main()
