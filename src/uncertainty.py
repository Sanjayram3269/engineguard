
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


def score_predictions(y_true, predictions, accepted):
    """Measure performance on all rows and on accepted rows."""
    y_true = np.asarray(y_true)
    predictions = np.asarray(predictions)
    accepted = np.asarray(accepted, dtype=bool)

    errors = predictions != y_true
    accepted_count = int(accepted.sum())
    referred_count = int((~accepted).sum())
    total_errors = int(errors.sum())

    accepted_accuracy = (
        float(accuracy_score(y_true[accepted], predictions[accepted]))
        if accepted_count else float("nan")
    )

    return {
        "total_rows": len(y_true),
        "baseline_accuracy_all_rows": float(
            accuracy_score(y_true, predictions)
        ),
        "baseline_macro_f1_all_rows": float(
            f1_score(y_true, predictions, average="macro", zero_division=0)
        ),
        "coverage": float(accepted.mean()),
        "accepted_rows": accepted_count,
        "referred_rows": referred_count,
        "referral_rate": float((~accepted).mean()),
        "accepted_case_accuracy": accepted_accuracy,
        "errors_on_all_rows": total_errors,
        "errors_among_accepted": int((errors & accepted).sum()),
        "error_capture_rate": (
            float((errors & ~accepted).sum() / total_errors)
            if total_errors else 0.0
        ),
    }


def choose_threshold(scores, y_true, predictions, rule):
    """
    Select a threshold using validation data only.

    confidence rule: refer when max class vote < threshold
    margin rule: refer when top-two vote margin <= threshold

    Among thresholds meeting minimum validation coverage, maximize
    accepted-case accuracy; break ties in favor of higher coverage.
    """
    scores = np.asarray(scores, dtype=float)
    y_true = np.asarray(y_true)
    predictions = np.asarray(predictions)

    candidates = np.unique(
        np.quantile(scores, np.linspace(0.0, 1.0, 201))
    )

    choices = []

    for threshold in candidates:
        if rule == "confidence":
            accepted = scores >= threshold
        elif rule == "margin":
            accepted = scores > threshold
        else:
            raise ValueError(f"Unknown rule: {rule}")

        coverage = float(accepted.mean())
        if coverage < MIN_COVERAGE or not accepted.any():
            continue

        accuracy = float(
            accuracy_score(y_true[accepted], predictions[accepted])
        )

        choices.append({
            "rule": rule,
            "threshold": float(threshold),
            "validation_coverage": coverage,
            "validation_accepted_accuracy": accuracy,
        })

    if not choices:
        raise RuntimeError(
            f"No {rule} threshold met minimum coverage {MIN_COVERAGE:.0%}."
        )

    # Validation only: highest accepted accuracy, then highest coverage.
    choices.sort(
        key=lambda row: (
            row["validation_accepted_accuracy"],
            row["validation_coverage"],
        ),
        reverse=True,
    )
    return choices[0], choices


def main():
    if not DATA_PATH.exists():
        raise FileNotFoundError(f"Dataset not found: {DATA_PATH}")

    df = pd.read_csv(DATA_PATH)

    if TARGET not in df.columns:
        raise ValueError(f"Missing target column: {TARGET}")

    if df.isna().sum().sum():
        print("Warning: missing values found; median imputation will be used.")

    duplicate_count = int(df.duplicated().sum())
    df = df.drop_duplicates().reset_index(drop=True)

    X = df.drop(columns=[TARGET])
    y = df[TARGET].astype(int)

    if set(y.unique()) != set(CLASS_NAMES):
        raise ValueError(f"Unexpected labels: {sorted(y.unique())}")

    all_indices = np.arange(len(df))

    train_val_idx, test_idx = train_test_split(
        all_indices,
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
    print("ENGINEGUARD | UNCERTAINTY & REFERRAL EVALUATION")
    print("=" * 68)
    print(f"Rows after deduplication: {len(df):,}")
    print(f"Exact duplicate rows removed: {duplicate_count}")
    print(
        f"Split sizes: train={len(train_idx):,}, "
        f"validation={len(val_idx):,}, test={len(test_idx):,}"
    )
    print(f"Minimum validation coverage: {MIN_COVERAGE:.0%}")

    model = Pipeline([
        ("imputer", SimpleImputer(strategy="median")),
        ("classifier", RandomForestClassifier(
            n_estimators=400,
            class_weight="balanced_subsample",
            random_state=SEED,
            n_jobs=-1,
        )),
    ])

    print("\nTraining the benchmark Random Forest on training data...")
    model.fit(X_train, y_train)

    # Select referral thresholds only from validation predictions.
    val_scores = model.predict_proba(X_val)
    val_pred = model.predict(X_val)

    val_confidence = val_scores.max(axis=1)
    sorted_val_scores = np.sort(val_scores, axis=1)
    val_margin = sorted_val_scores[:, -1] - sorted_val_scores[:, -2]

    confidence_choice, confidence_trials = choose_threshold(
        val_confidence, y_val, val_pred, "confidence"
    )
    margin_choice, margin_trials = choose_threshold(
        val_margin, y_val, val_pred, "margin"
    )

    print("\nThresholds selected using validation data:")
    for choice in [confidence_choice, margin_choice]:
        print(
            f"{choice['rule']}: threshold={choice['threshold']:.5f}, "
            f"coverage={choice['validation_coverage']:.3f}, "
            f"accepted accuracy="
            f"{choice['validation_accepted_accuracy']:.4f}"
        )

    # Final evaluation: thresholds are now frozen.
    test_scores = model.predict_proba(X_test)
    test_pred = model.predict(X_test)

    test_confidence = test_scores.max(axis=1)
    sorted_test_scores = np.sort(test_scores, axis=1)
    test_margin = sorted_test_scores[:, -1] - sorted_test_scores[:, -2]

    policies = [
        ("No referral baseline", None, np.ones(len(y_test), dtype=bool)),
        (
            "Confidence referral",
            confidence_choice["threshold"],
            test_confidence >= confidence_choice["threshold"],
        ),
        (
            "Top-two margin referral",
            margin_choice["threshold"],
            test_margin > margin_choice["threshold"],
        ),
    ]

    summary_rows = []
    for name, threshold, accepted in policies:
        metrics = score_predictions(y_test, test_pred, accepted)
        summary_rows.append({
            "policy": name,
            "threshold": threshold,
            **metrics,
        })

    summary = pd.DataFrame(summary_rows)
    summary_path = REPORT_DIR / "uncertainty_test_summary.csv"
    summary.to_csv(summary_path, index=False)

    validation_rows = []
    for rule, trials in [
        ("confidence", confidence_trials),
        ("margin", margin_trials),
    ]:
        validation_rows.extend(trials)

    validation_path = REPORT_DIR / "uncertainty_validation_trials.csv"
    pd.DataFrame(validation_rows).to_csv(validation_path, index=False)

    predictions = X_test.reset_index(drop=True).copy()
    predictions["actual_label"] = y_test.reset_index(drop=True)
    predictions["predicted_label"] = test_pred
    predictions["actual_class"] = predictions["actual_label"].map(CLASS_NAMES)
    predictions["predicted_class"] = [
        CLASS_NAMES[int(label)] for label in test_pred
    ]
    predictions["max_class_vote"] = test_confidence
    predictions["top_two_vote_margin"] = test_margin
    predictions["correct"] = test_pred == y_test.to_numpy()
    predictions["confidence_referred"] = (
        test_confidence < confidence_choice["threshold"]
    )
    predictions["margin_referred"] = (
        test_margin <= margin_choice["threshold"]
    )

    predictions_path = REPORT_DIR / "uncertainty_test_predictions.csv"
    predictions.to_csv(predictions_path, index=False)

    metadata = {
        "experiment": "uncertainty_referral",
        "model": "Random Forest",
        "random_state": SEED,
        "duplicate_rows_removed": duplicate_count,
        "split_sizes": {
            "train": len(train_idx),
            "validation": len(val_idx),
            "test": len(test_idx),
        },
        "minimum_validation_coverage": MIN_COVERAGE,
        "score_warning": (
            "Random Forest class-vote proportions are not assumed to be "
            "calibrated probabilities."
        ),
        "evaluation_warning": (
            "Stratified random split; generalization to unseen runs is "
            "not established without suitable run/session identifiers."
        ),
        "selected_thresholds": {
            "confidence": confidence_choice,
            "margin": margin_choice,
        },
    }
    metadata_path = REPORT_DIR / "uncertainty_experiment_metadata.json"
    metadata_path.write_text(json.dumps(metadata, indent=2), encoding="utf-8")

    print("\nHELD-OUT TEST RESULTS")
    print(summary.to_string(index=False))
    print("\nSaved:")
    print(summary_path)
    print(validation_path)
    print(predictions_path)
    print(metadata_path)
    print("\nUNCERTAINTY EVALUATION COMPLETE")


if __name__ == "__main__":
    main()
