"""Command-line interface for the normal-reference comparison score.

Examples (run from the repo root):

  python -m src.engine_health.cli fit
  python -m src.engine_health.cli evaluate
  python -m src.engine_health.cli score --csv data/engine_data.csv
  python -m src.engine_health.cli score --engine-rpm 800 --lub-oil-pressure 3.2 ^
      --fuel-pressure 6.0 --coolant-pressure 2.3 --lub-oil-temp 77 --coolant-temp 78
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from typing import Any, Dict, Optional

import pandas as pd

from .evaluate import evaluate
from .index import (
    SENSOR_COLUMNS,
    Reference,
    fit_reference,
    load_labelled_csv,
    score_one,
    score_readings,
    split_labelled,
)

DEFAULT_CSV = os.path.join("data", "engine_data.csv")
DEFAULT_REFERENCE = os.path.join("models", "engine_health_reference.json")
DEFAULT_SCORES = os.path.join("reports", "engine_health_scores.csv")
DEFAULT_EVAL = os.path.join("reports", "engine_health_evaluation.json")

FLAG_TO_SENSOR = {
    "engine_rpm": "Engine rpm",
    "lub_oil_pressure": "Lub oil pressure",
    "fuel_pressure": "Fuel pressure",
    "coolant_pressure": "Coolant pressure",
    "lub_oil_temp": "lub oil temp",
    "coolant_temp": "Coolant temp",
}


def _write_json(path: str, data: Dict[str, Any]) -> None:
    os.makedirs(os.path.dirname(path) or ".", exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)


def _load_reference(path: str) -> Reference:
    if not os.path.exists(path):
        raise SystemExit(f"Reference file not found: {path}. Run: python -m src.engine_health.cli fit")
    with open(path, encoding="utf-8") as f:
        payload = json.load(f)
    return Reference.from_dict(payload.get("reference", payload))


def cmd_fit(args: argparse.Namespace) -> None:
    df = load_labelled_csv(args.csv)
    train, _ = split_labelled(df)
    ref = fit_reference(train)  # normal training rows only
    payload = {
        "method": "per-sensor robust deviation from normal-training median (IQR/1.349 scale)",
        "source_csv": args.csv,
        "split": {"test_size": 0.2, "random_state": 42, "stratified": True},
        "reference": ref.to_dict(),
        "caveat": "Prototype index. Not validated against true engine health.",
    }
    _write_json(args.out, payload)
    print(f"Fitted reference on {ref.n_normal_rows} normal training rows.")
    print(f"Saved reference to {args.out}")


def cmd_evaluate(args: argparse.Namespace) -> None:
    df = load_labelled_csv(args.csv)
    report = evaluate(df)
    _write_json(args.out, report)
    s = report["score_by_label_test"]
    sep = report["separation"]
    print("Held-out test split (label used only for this evaluation):")
    for name in ("normal_label_0", "faulty_label_1"):
        d = s[name]
        print(f"  {name:16s} n={d['count']}  median={d['median']}  p05={d['p05']}  p95={d['p95']}")
    print(f"  Faulty rows inside normal p05-p95 band: {sep['faulty_within_normal_band_pct']}%")
    print(f"  Normal rows outside normal p05-p95 band: {sep['normal_outside_normal_band_pct']}%")
    print(f"Saved full report to {args.out}")


def _print_single(result: Dict[str, Any]) -> None:
    print("Normal-reference comparison score (prototype)")
    print(f"  Score: {result['score'] if result['score'] is not None else 'NOT SCORED'}  (0-100, higher = closer to normal reference)")
    print(f"  Interpretation: {result['interpretation']}")
    cov = result["coverage"]
    print(f"  Coverage: {cov['available']}/{cov['total']} sensors")
    if result["sensor_contributions"]:
        print("  Sensor contributions (largest first):")
        for name, c in result["sensor_contributions"].items():
            flag = "  [beyond reference range]" if c["beyond_reference_range"] else ""
            print(f"    {name:18s} value={c['value']:<10} robust_z={c['robust_z']:<8} share={c['share_of_deviation_pct']}%{flag}")
    if result["warnings"]:
        print("  Warnings:")
        for w in result["warnings"]:
            print(f"    - {w}")
    else:
        print("  Warnings: none")


def cmd_score(args: argparse.Namespace) -> None:
    ref = _load_reference(args.reference)

    if args.csv:
        df = pd.read_csv(args.csv)
        results = score_readings(df, ref)
        rows = []
        for r in results:
            rows.append({
                "row_id": r["row_id"],
                "score": r["score"],
                "deviation": r["deviation"],
                "available_sensors": r["coverage"]["available"],
                "missing_sensors": ";".join(r["coverage"]["missing"]),
                "warnings": " | ".join(r["warnings"]),
            })
        out = pd.DataFrame(rows)
        os.makedirs(os.path.dirname(args.out) or ".", exist_ok=True)
        out.to_csv(args.out, index=False)
        scored = out["score"].dropna()
        print(f"Scored {len(out)} rows ({out['score'].isna().sum()} not scored).")
        if len(scored):
            print(f"  score min={scored.min():.2f}  median={scored.median():.2f}  max={scored.max():.2f}")
        print(f"Saved to {args.out}")
        return

    record: Dict[str, Any] = {}
    for flag, sensor in FLAG_TO_SENSOR.items():
        value = getattr(args, flag)
        if value is not None:
            record[sensor] = value
    if not record:
        raise SystemExit("Provide --csv FILE or at least one sensor flag (see --help).")
    _print_single(score_one(record, ref))


def cmd_report(args: argparse.Namespace) -> None:
    from .report import build_report, format_report

    ref = _load_reference(args.reference)
    record: Dict[str, Any] = {}
    for flag, sensor in FLAG_TO_SENSOR.items():
        value = getattr(args, flag)
        if value is not None:
            record[sensor] = value
    if not record:
        raise SystemExit("Provide at least one sensor flag (see --help).")
    rep = build_report(record, ref)
    print(format_report(rep))
    if args.json_out:
        _write_json(args.json_out, rep)
        print(f"\nSaved report JSON to {args.json_out}")


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(prog="engine_health", description=__doc__,
                                formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = p.add_subparsers(dest="command", required=True)

    f = sub.add_parser("fit", help="Fit the normal reference on training rows only")
    f.add_argument("--csv", default=DEFAULT_CSV)
    f.add_argument("--out", default=DEFAULT_REFERENCE)
    f.set_defaults(func=cmd_fit)

    e = sub.add_parser("evaluate", help="Held-out evaluation against the binary label")
    e.add_argument("--csv", default=DEFAULT_CSV)
    e.add_argument("--out", default=DEFAULT_EVAL)
    e.set_defaults(func=cmd_evaluate)

    s = sub.add_parser("score", help="Score one reading or a whole CSV")
    s.add_argument("--reference", default=DEFAULT_REFERENCE)
    s.add_argument("--csv", default=None, help="Score every row of this CSV")
    s.add_argument("--out", default=DEFAULT_SCORES, help="Output CSV when --csv is used")
    s.add_argument("--engine-rpm", dest="engine_rpm", type=float)
    s.add_argument("--lub-oil-pressure", dest="lub_oil_pressure", type=float)
    s.add_argument("--fuel-pressure", dest="fuel_pressure", type=float)
    s.add_argument("--coolant-pressure", dest="coolant_pressure", type=float)
    s.add_argument("--lub-oil-temp", dest="lub_oil_temp", type=float)
    s.add_argument("--coolant-temp", dest="coolant_temp", type=float)
    s.set_defaults(func=cmd_score)

    r = sub.add_parser("report", help="Report: score, status, reasons, confidence, and separate fault-risk AUC")
    r.add_argument("--reference", default=DEFAULT_REFERENCE)
    r.add_argument("--json-out", dest="json_out", default=None)
    r.add_argument("--engine-rpm", dest="engine_rpm", type=float)
    r.add_argument("--lub-oil-pressure", dest="lub_oil_pressure", type=float)
    r.add_argument("--fuel-pressure", dest="fuel_pressure", type=float)
    r.add_argument("--coolant-pressure", dest="coolant_pressure", type=float)
    r.add_argument("--lub-oil-temp", dest="lub_oil_temp", type=float)
    r.add_argument("--coolant-temp", dest="coolant_temp", type=float)
    r.set_defaults(func=cmd_report)
    return p


def main(argv: Optional[list] = None) -> int:
    args = build_parser().parse_args(argv)
    try:
        args.func(args)
    except ValueError as exc:
        print(f"Error: {exc}", file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
