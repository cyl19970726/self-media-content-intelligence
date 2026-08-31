#!/usr/bin/env python3
"""Validate reconstruction artifacts against the canonical JSON Schemas."""

import argparse
import json
from pathlib import Path
import sys

try:
    from jsonschema import Draft202012Validator
except ImportError:
    print("Missing dependency: install Python package jsonschema", file=sys.stderr)
    raise SystemExit(3)


def load(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--probe", type=Path, required=True)
    parser.add_argument("--protocol", type=Path, required=True)
    parser.add_argument("--reconstruction", type=Path, required=True)
    parser.add_argument("--evaluation", type=Path)
    parser.add_argument("--ocr", type=Path)
    parser.add_argument("--skill-dir", type=Path, default=Path(__file__).resolve().parents[1])
    args = parser.parse_args()

    pairs = [
        ("probe", args.probe, args.skill_dir / "schemas" / "probe.schema.json"),
        ("protocol", args.protocol, args.skill_dir / "schemas" / "capture-protocol.schema.json"),
        ("reconstruction", args.reconstruction, args.skill_dir / "schemas" / "reconstruction.schema.json"),
    ]
    if args.evaluation:
        pairs.append(("evaluation", args.evaluation, args.skill_dir / "schemas" / "evaluation.schema.json"))
    if args.ocr:
        pairs.append(("ocr", args.ocr, args.skill_dir / "schemas" / "ocr-evidence.schema.json"))

    failures = []
    for label, artifact_path, schema_path in pairs:
        validator = Draft202012Validator(load(schema_path))
        errors = sorted(validator.iter_errors(load(artifact_path)), key=lambda error: list(error.path))
        for error in errors:
            location = "/".join(map(str, error.path)) or "$"
            failures.append({"artifact": label, "location": location, "message": error.message})

    result = {"pass": not failures, "validated": [label for label, _, _ in pairs], "failures": failures}
    print(json.dumps(result, ensure_ascii=False))
    return 0 if not failures else 2


if __name__ == "__main__":
    raise SystemExit(main())
