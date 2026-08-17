#!/usr/bin/env python3
import argparse
import json
from pathlib import Path

from jsonschema import Draft202012Validator


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--schema", required=True)
    parser.add_argument("--data", required=True)
    args = parser.parse_args()

    schema_path = Path(args.schema).resolve()
    data_path = Path(args.data).resolve()
    schema = json.loads(schema_path.read_text())
    data = json.loads(data_path.read_text())
    validator = Draft202012Validator(schema)
    errors = sorted(validator.iter_errors(data), key=lambda err: list(err.absolute_path))
    if errors:
        for error in errors[:50]:
            location = "/".join(str(part) for part in error.absolute_path) or "<root>"
            print(f"{location}: {error.message}")
        print(json.dumps({"ok": False, "errorCount": len(errors), "schema": str(schema_path), "data": str(data_path)}))
        return 1
    print(json.dumps({"ok": True, "schema": str(schema_path), "data": str(data_path)}))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
