#!/usr/bin/env python3
"""Total structural validator for Deep Content Director 2.0 JSON."""

from __future__ import annotations

import argparse
import json
import math
import os
import re
import sys
import tempfile
import unicodedata
from pathlib import Path
from typing import Any

try:
    from jsonschema import Draft202012Validator, FormatChecker
    from importlib.metadata import version as package_version
    installed_jsonschema = package_version("jsonschema")
    version_parts = tuple(int(part) for part in installed_jsonschema.split(".")[:2])
    JSONSCHEMA_IMPORT_ERROR = None if version_parts >= (4, 18) else RuntimeError(f"jsonschema {installed_jsonschema} is too old; need >=4.18")
except (ImportError, ValueError) as exc:  # pragma: no cover - exercised by dependency smoke command
    Draft202012Validator = FormatChecker = None
    JSONSCHEMA_IMPORT_ERROR = exc


HERE = Path(__file__).resolve().parent
SCHEMA_PATH = HERE.parent / "references" / "directing-brief.schema.json"
PLACEHOLDER_RE = re.compile(r"\b(?:todo|tbd|placeholder|fill\s+me|none\s+known)\b", re.IGNORECASE)
# Sentinel is authoritative. The exact phrases below cover legacy/bypass regressions
# without treating ordinary imperatives such as "Check one saved tutorial" as drafts.
DRAFT_PHRASE_RE = re.compile(r"^(?:\[\[DRAFT_SLOT\]\].*|Define target person|Choose one primary job before completion|Define click promise|Supply exact artifact and version|Select one change after diagnosis)$", re.IGNORECASE)


def pointer(parts: list[Any]) -> str:
    return "/" + "/".join(str(part).replace("~", "~0").replace("/", "~1") for part in parts) if parts else "/"


def normalize_text(value: str) -> str:
    value = unicodedata.normalize("NFKC", value).casefold()
    return "".join(character for character in value if character.isalnum())


def walk_strings(value: Any, path: tuple[Any, ...] = ()):
    if isinstance(value, str):
        yield path, value
    elif isinstance(value, dict):
        for key, item in value.items():
            yield from walk_strings(item, path + (key,))
    elif isinstance(value, list):
        for index, item in enumerate(value):
            yield from walk_strings(item, path + (index,))


def collect_ids(items: Any, path: str, errors: list[dict]) -> set[str]:
    found: set[str] = set()
    if not isinstance(items, list):
        return found
    for index, item in enumerate(items):
        if not isinstance(item, dict) or not isinstance(item.get("id"), str):
            continue
        item_id = item["id"]
        if item_id in found:
            errors.append({"path": f"{path}/{index}/id", "code": "duplicate_id", "message": f"duplicate id: {item_id}"})
        found.add(item_id)
    return found


def add_bad_refs(values: Any, valid: set[str], path: str, kind: str, errors: list[dict]) -> None:
    if not isinstance(values, list):
        return
    for index, value in enumerate(values):
        if isinstance(value, str) and value not in valid:
            errors.append({"path": f"{path}/{index}", "code": "dangling_ref", "message": f"unknown {kind}: {value}"})


def custom_checks(data: Any) -> tuple[list[dict], dict, list[dict]]:
    errors: list[dict] = []
    blockers: list[dict] = []
    summary = {"assetRights": {"status": "not_checked", "clearCount": 0, "blockedCount": 0}, "claims": {"verified": 0, "notVerified": 0, "hypothesis": 0}, "privacy": {"status": "not_checked", "requiredCount": 0, "coveredCount": 0, "blockedCount": 0}, "platform": {"status": "not_checked", "requiredCount": 0, "coveredCount": 0, "blockedCount": 0}}
    if not isinstance(data, dict): return errors, summary, blockers

    # Python's JSON library can construct NaN/Infinity; reject them before schema/math checks.
    def scan_numbers(value: Any, path: str = "") -> None:
        if isinstance(value, float) and not math.isfinite(value):
            errors.append({"path": path or "/", "code": "non_finite_number", "message": "NaN and +/-Infinity are not valid JSON numbers"})
        elif isinstance(value, dict):
            for key, item in value.items(): scan_numbers(item, f"{path}/{key}")
        elif isinstance(value, list):
            for index, item in enumerate(value): scan_numbers(item, f"{path}/{index}")
    scan_numbers(data)

    # Plain builder prompts are registered, visibly tagged and completion-blocking.
    draft_slots = data.get("draftSlots") if isinstance(data.get("draftSlots"), list) else []
    slot_paths = {item.get("path") for item in draft_slots if isinstance(item, dict) and isinstance(item.get("path"), str)}
    if data.get("artifactStatus") == "complete" and draft_slots:
        blockers.append({"code": "draft_slot_unresolved", "subjectRef": "/draftSlots"})
    unresolved_known = {"unknown", "notdecided", "undecided", "definelater", "tobedecided", "notsupplied", "unresolved"}
    def inspect_states(value: Any, path: str = "") -> None:
        if isinstance(value, dict):
            if value.get("status") == "known" and isinstance(value.get("value"), str) and normalize_text(value["value"]) in unresolved_known:
                errors.append({"path": f"{path}/value", "code": "known_value_is_unresolved", "message": "known.value cannot encode an unresolved state"})
            for key, item in value.items(): inspect_states(item, f"{path}/{key}")
        elif isinstance(value, list):
            for index, item in enumerate(value): inspect_states(item, f"{path}/{index}")
        elif isinstance(value, str) and value.startswith("[[DRAFT_SLOT]]"):
            if path not in slot_paths: errors.append({"path": path, "code": "unregistered_draft_slot", "message": "draft sentinel must be registered in draftSlots"})
            if data.get("artifactStatus") == "complete": blockers.append({"code": "draft_slot_unresolved", "subjectRef": path})
    inspect_states(data)

    for path, value in walk_strings(data):
        if PLACEHOLDER_RE.search(value): errors.append({"path": pointer(list(path)), "code": "placeholder", "message": "placeholder text must use a structured unknown or N/A"})
        if data.get("artifactStatus") == "complete" and DRAFT_PHRASE_RE.search(value): blockers.append({"code": "draft_slot_unresolved", "subjectRef": pointer(list(path))})
        if data.get("artifactStatus") == "complete" and value == "Untitled content decision" and pointer(list(path)) in {"/singlePlan/workingTitle", "/singlePlan/packaging/title"}:
            blockers.append({"code": "builder_default_title_unresolved", "subjectRef": pointer(list(path))})

    # Every object id shares one namespace, removing ambiguous safety subjects.
    global_ids: dict[str, str] = {}
    def scan_ids(value: Any, path: str = "") -> None:
        if isinstance(value, dict):
            item_id = value.get("id")
            if isinstance(item_id, str):
                if item_id in global_ids: errors.append({"path": f"{path}/id", "code": "global_duplicate_id", "message": f"id {item_id} already used at {global_ids[item_id]}"})
                else: global_ids[item_id] = f"{path}/id"
            for key, item in value.items(): scan_ids(item, f"{path}/{key}")
        elif isinstance(value, list):
            for index, item in enumerate(value): scan_ids(item, f"{path}/{index}")
    scan_ids(data)

    assets = data.get("assets") if isinstance(data.get("assets"), list) else []
    claims = data.get("claims") if isinstance(data.get("claims"), list) else []
    asset_ids = {item["id"] for item in assets if isinstance(item, dict) and isinstance(item.get("id"), str)}
    claim_ids = {item["id"] for item in claims if isinstance(item, dict) and isinstance(item.get("id"), str)}
    asset_map = {item["id"]: item for item in assets if isinstance(item, dict) and isinstance(item.get("id"), str)}
    blocked_assets = {item_id for item_id, item in asset_map.items() if item.get("rightsStatus") == "blocked"}
    unknown_rights = {item_id for item_id, item in asset_map.items() if isinstance(item.get("rightsStatus"), dict)}
    if assets:
        summary["assetRights"]["status"] = "blocked" if blocked_assets else "unknown" if unknown_rights else "clear"
        summary["assetRights"]["blockedCount"] = len(blocked_assets); summary["assetRights"]["clearCount"] = len(assets) - len(blocked_assets) - len(unknown_rights)
    for item_id in unknown_rights: blockers.append({"code": "asset_rights_unknown", "subjectRef": item_id})
    for item_id in blocked_assets:
        blockers.append({"code": "asset_rights_blocked", "subjectRef": item_id})
        fallback = asset_map[item_id].get("fallbackAssetId")
        if fallback == item_id or fallback not in asset_map: errors.append({"path": f"/assets/{item_id}/fallbackAssetId", "code": "invalid_fallback", "message": "blocked asset must reference another existing asset"})
        elif fallback in blocked_assets: errors.append({"path": f"/assets/{item_id}/fallbackAssetId", "code": "blocked_fallback", "message": "fallback asset is also blocked"})

    plan = data.get("singlePlan") if isinstance(data.get("singlePlan"), dict) else {}
    beat_ids = collect_ids(plan.get("beats"), "/singlePlan/beats", errors); shot_ids = collect_ids(plan.get("shots"), "/singlePlan/shots", errors); panel_ids = collect_ids(plan.get("panels"), "/singlePlan/panels", errors)
    custom_units = plan.get("customCarrierPlan", {}).get("units") if isinstance(plan.get("customCarrierPlan"), dict) else []
    unit_ids = collect_ids(custom_units, "/singlePlan/customCarrierPlan/units", errors)
    candidate_ids = collect_ids(plan.get("candidates"), "/singlePlan/candidates", errors)
    selection = plan.get("selection")
    if isinstance(selection, dict) and isinstance(selection.get("selectedId"), str) and selection["selectedId"] not in candidate_ids: errors.append({"path": "/singlePlan/selection/selectedId", "code": "dangling_ref", "message": "selectedId does not reference a candidate"})
    normalized: dict[str, str] = {}
    for index, candidate in enumerate(plan.get("candidates", []) if isinstance(plan.get("candidates"), list) else []):
        if not isinstance(candidate, dict): continue
        for field in ("name", "promise"):
            value = candidate.get(field)
            if isinstance(value, str):
                key = f"{field}:{normalize_text(value)}"
                if key in normalized: errors.append({"path": f"/singlePlan/candidates/{index}/{field}", "code": "normalized_duplicate", "message": f"candidate {field} duplicates {normalized[key]} after normalization"})
                normalized[key] = f"candidate {index}"
    for index, shot in enumerate(plan.get("shots", []) if isinstance(plan.get("shots"), list) else []):
        if not isinstance(shot, dict): continue
        if isinstance(shot.get("beatId"), str) and shot["beatId"] not in beat_ids: errors.append({"path": f"/singlePlan/shots/{index}/beatId", "code": "dangling_ref", "message": f"unknown beat: {shot['beatId']}"})
        add_bad_refs(shot.get("assetRefs"), asset_ids, f"/singlePlan/shots/{index}/assetRefs", "asset", errors)
    panels = plan.get("panels", []) if isinstance(plan.get("panels"), list) else []
    orders = [item.get("order") for item in panels if isinstance(item, dict) and isinstance(item.get("order"), int)]
    if orders and sorted(orders) != list(range(1, len(orders) + 1)): errors.append({"path": "/singlePlan/panels", "code": "panel_order_not_contiguous", "message": "panel order must be unique and contiguous from 1"})
    for index, panel in enumerate(panels):
        if isinstance(panel, dict): add_bad_refs(panel.get("assetRefs"), asset_ids, f"/singlePlan/panels/{index}/assetRefs", "asset", errors)
    for index, unit in enumerate(custom_units if isinstance(custom_units, list) else []):
        if isinstance(unit, dict): add_bad_refs(unit.get("assetRefs"), asset_ids, f"/singlePlan/customCarrierPlan/units/{index}/assetRefs", "asset", errors)
    add_bad_refs(plan.get("demandEvidence"), claim_ids, "/singlePlan/demandEvidence", "claim", errors)
    evidence_plan = plan.get("evidencePlan")
    if isinstance(evidence_plan, dict) and evidence_plan.get("status") == "applicable": add_bad_refs(evidence_plan.get("claimRefs"), claim_ids, "/singlePlan/evidencePlan/claimRefs", "claim", errors)
    production = plan.get("production")
    if isinstance(production, dict): add_bad_refs(production.get("assetRefs"), asset_ids, "/singlePlan/production/assetRefs", "asset", errors)
    originality = plan.get("originality")
    if isinstance(originality, dict) and "sourceInspirations" in originality:
        sources, changed, exception = originality.get("sourceInspirations"), originality.get("changedDimensions"), originality.get("exceptionReason")
        if isinstance(sources, list) and sources:
            count = len(changed) if isinstance(changed, list) else 0; approved = isinstance(exception, dict) and exception.get("status") == "one_dimension_approved" and bool(str(exception.get("reason", "")).strip())
            if count < 2 and not (count == 1 and approved): errors.append({"path": "/singlePlan/originality", "code": "insufficient_original_change", "message": "reference work needs two changes or an approved one-change exception"})
        elif isinstance(changed, list) and changed: errors.append({"path": "/singlePlan/originality/changedDimensions", "code": "orphan_originality_change", "message": "changedDimensions must be empty without inspirations"})

    fmt = data.get("format")
    used_panel_refs: set[str] = set()
    for index, claim in enumerate(claims):
        if not isinstance(claim, dict): continue
        status = claim.get("verificationStatus")
        if status == "verified": summary["claims"]["verified"] += 1
        elif status == "not_verified": summary["claims"]["notVerified"] += 1
        elif status == "hypothesis": summary["claims"]["hypothesis"] += 1
        add_bad_refs(claim.get("beatRefs"), beat_ids, f"/claims/{index}/beatRefs", "beat", errors); add_bad_refs(claim.get("shotRefs"), shot_ids, f"/claims/{index}/shotRefs", "shot", errors); add_bad_refs(claim.get("panelRefs"), panel_ids, f"/claims/{index}/panelRefs", "panel", errors); add_bad_refs(claim.get("customUnitRefs"), unit_ids, f"/claims/{index}/customUnitRefs", "custom unit", errors); add_bad_refs(claim.get("assetRefs"), asset_ids, f"/claims/{index}/assetRefs", "asset", errors)
        used_panel_refs.update(value for value in claim.get("panelRefs", []) if isinstance(value, str))
        if data.get("artifactStatus") == "complete" and claim.get("id") in (evidence_plan.get("claimRefs", []) if isinstance(evidence_plan, dict) else []):
            refs = claim.get("beatRefs", []) + claim.get("shotRefs", []) if fmt in ("video", "live_clip") else claim.get("panelRefs", []) if fmt in ("carousel", "text_image") else claim.get("customUnitRefs", [])
            if not refs: errors.append({"path": f"/claims/{index}", "code": "claim_without_carrier", "message": "evidence claim must reference a format-specific carrier"})
    if data.get("artifactStatus") == "complete":
        for index, panel in enumerate(panels):
            if isinstance(panel, dict) and panel.get("cognitiveJob") == "prove" and panel.get("id") not in used_panel_refs: errors.append({"path": f"/singlePlan/panels/{index}", "code": "unused_evidence_panel", "message": "proof panel is not referenced by any claim"})

    # Account media refs and quota semantics.
    account = data.get("accountPlan") if isinstance(data.get("accountPlan"), dict) else {}
    audit = account.get("assetAudit")
    if isinstance(audit, dict) and audit.get("status") == "completed":
        for index, item in enumerate(audit.get("mediaAssets", [])):
            if isinstance(item, dict): add_bad_refs([item.get("assetRef")], asset_ids, f"/accountPlan/assetAudit/mediaAssets/{index}/assetRef", "asset", errors)
    portfolio = account.get("contentPortfolio")
    if isinstance(portfolio, list):
        roles = [item.get("role") for item in portfolio if isinstance(item, dict)]
        if len(set(roles)) != len(roles): errors.append({"path": "/accountPlan/contentPortfolio", "code": "duplicate_portfolio_role", "message": "portfolio roles must be unique"})
        shares = [item.get("share") for item in portfolio if isinstance(item, dict) and isinstance(item.get("share"), (int, float)) and not isinstance(item.get("share"), bool)]
        if len(shares) == len(portfolio) and abs(sum(shares) - 1.0) > 1e-9: errors.append({"path": "/accountPlan/contentPortfolio", "code": "portfolio_share_not_one", "message": "quota shares must sum to 1"})
        omissions = account.get("deliberateOmissions") if isinstance(account.get("deliberateOmissions"), list) else []
        omitted_roles = [item.get("role") for item in omissions if isinstance(item, dict)]
        if len(set(omitted_roles)) != len(omitted_roles): errors.append({"path": "/accountPlan/deliberateOmissions", "code": "duplicate_omitted_role", "message": "deliberately omitted roles must be unique"})
        if set(roles) & set(omitted_roles): errors.append({"path": "/accountPlan/deliberateOmissions", "code": "portfolio_role_also_omitted", "message": "a role cannot be both allocated and deliberately omitted"})
        expected_roles = {"reach", "search_save", "follow", "trust", "proof", "conversion", "commercial_carrier", "expression_taste"}
        if data.get("artifactStatus") == "complete" and set(roles) | set(omitted_roles) != expected_roles: errors.append({"path": "/accountPlan", "code": "portfolio_roles_incomplete", "message": "complete account plan must allocate or deliberately omit every portfolio role"})

    # Carrier evidence: nested referents, audio/tool boundary and carrier-scoped absence.
    ledger = data.get("carrierEvidence", {}) if isinstance(data.get("carrierEvidence"), dict) else {}
    referents = ledger.get("referentLedger", []) if isinstance(ledger.get("referentLedger"), list) else []
    referent_ids = collect_ids(referents, "/carrierEvidence/referentLedger", errors)
    for index, item in enumerate(referents):
        if isinstance(item, dict) and isinstance(item.get("parentReferentId"), str) and item["parentReferentId"] not in referent_ids: errors.append({"path": f"/carrierEvidence/referentLedger/{index}/parentReferentId", "code": "dangling_ref", "message": "unknown parent referent"})
    parent_map = {item.get("id"): item.get("parentReferentId") for item in referents if isinstance(item, dict) and isinstance(item.get("id"), str) and isinstance(item.get("parentReferentId"), str)}
    for start in parent_map:
        seen: set[str] = set(); node = start
        while node in parent_map:
            if node in seen:
                errors.append({"path": "/carrierEvidence/referentLedger", "code": "referent_cycle", "message": f"referent parent cycle includes {node}"}); break
            seen.add(node); node = parent_map[node]

    def check_locator(locator: Any, path: str) -> None:
        if not isinstance(locator, dict): return
        if locator.get("kind") == "panel" and locator.get("panelRef") not in panel_ids:
            errors.append({"path": f"{path}/panelRef", "code": "dangling_typed_ref", "message": "unknown panel locator"})
        if locator.get("kind") == "custom_unit" and locator.get("customUnitRef") not in unit_ids:
            errors.append({"path": f"{path}/customUnitRef", "code": "dangling_typed_ref", "message": "unknown custom-unit locator"})
    for index, item in enumerate(referents):
        if isinstance(item, dict): check_locator(item.get("locator"), f"/carrierEvidence/referentLedger/{index}/locator")
    for index, item in enumerate(ledger.get("absenceClaims", []) if isinstance(ledger.get("absenceClaims"), list) else []):
        if isinstance(item, dict): check_locator(item.get("locator"), f"/carrierEvidence/absenceClaims/{index}/locator")
    audio = ledger.get("nonSpeechAudio")
    music_use_assets: set[str] = set()
    if isinstance(audio, dict) and audio.get("status") == "observed":
        for index, item in enumerate(audio.get("entries", [])):
            if not isinstance(item, dict): continue
            asset_ref = item.get("assetRef")
            if isinstance(asset_ref, str):
                add_bad_refs([asset_ref], asset_ids, f"/carrierEvidence/nonSpeechAudio/entries/{index}/assetRef", "asset", errors)
                expected = {"music": {"music", "audio"}, "sound_effect": {"audio"}, "ambience": {"audio"}, "silence": {"audio"}}
                actual = asset_map.get(asset_ref, {}).get("kind")
                if actual is not None and actual not in expected.get(item.get("kind"), set()):
                    errors.append({"path": f"/carrierEvidence/nonSpeechAudio/entries/{index}/assetRef", "code": "audio_asset_kind_mismatch", "message": f"{item.get('kind')} cannot use asset kind {actual}"})
                if item.get("kind") == "music": music_use_assets.add(asset_ref)
            elif item.get("kind") != "silence":
                errors.append({"path": f"/carrierEvidence/nonSpeechAudio/entries/{index}/assetRef", "code": "audio_asset_required", "message": "music, sound effects and ambience require a compatible rights asset"})
            add_bad_refs(item.get("referentRefs"), referent_ids, f"/carrierEvidence/nonSpeechAudio/entries/{index}/referentRefs", "referent", errors)
            check_locator(item.get("locator"), f"/carrierEvidence/nonSpeechAudio/entries/{index}/locator")

    # Mandatory safety coverage and blocking checks.
    safety = data.get("safety") if isinstance(data.get("safety"), dict) else {}
    privacy_required = {item_id for item_id, item in asset_map.items() if item.get("kind") in {"person_likeness", "private_screenshot"}}
    platform_required = {item_id for item_id, item in asset_map.items() if item.get("kind") == "music"} | music_use_assets | {item.get("id") for item in claims if isinstance(item, dict) and item.get("risk") == "high" and isinstance(item.get("id"), str)}
    for group, required, key in (("privacyChecks", privacy_required, "privacy"), ("platformChecks", platform_required, "platform")):
        checks = safety.get(group, []) if isinstance(safety.get(group), list) else []; check_map = {item.get("subjectRef"): item for item in checks if isinstance(item, dict)}
        summary[key]["requiredCount"] = len(required); summary[key]["coveredCount"] = len(required & set(check_map))
        if required: summary[key]["status"] = "clear"
        for subject in required:
            check = check_map.get(subject)
            if not check or check.get("status") != "clear": blockers.append({"code": f"mandatory_{key}_check_not_clear", "subjectRef": subject}); summary[key]["status"] = "blocked" if check and check.get("status") == "blocked" else "unknown"
        for index, check in enumerate(checks):
            if not isinstance(check, dict): continue
            if isinstance(check.get("subjectRef"), str) and check["subjectRef"] not in asset_ids | claim_ids: errors.append({"path": f"/safety/{group}/{index}/subjectRef", "code": "dangling_ref", "message": "safety check must reference asset or claim"})
            if check.get("status") == "blocked": blockers.append({"code": f"{key}_check_blocked", "subjectRef": check.get("subjectRef")}); summary[key]["status"] = "blocked"; summary[key]["blockedCount"] += 1

    # A blocked asset may appear only as a disabled record with a safe fallback.
    for path, value in walk_strings(data):
        if value in blocked_assets and (not path or path[-1] not in {"fallbackAssetId"}):
            # Ignore the asset's own identity and safety subject; execution/evidence refs are blocked.
            path_text = pointer(list(path))
            if not (path_text.startswith("/assets/") and path_text.endswith("/id")) and "/safety/" not in path_text:
                errors.append({"path": path_text, "code": "blocked_asset_referenced", "message": "execution/evidence graph must use the non-blocked fallback"})
    # Time ranges are machine-checkable even when embedded in different carrier ledgers.
    def scan_ranges(value: Any, path: str = "") -> None:
        if isinstance(value, dict):
            if set(("startSeconds", "endSeconds")).issubset(value) and isinstance(value.get("startSeconds"), (int, float)) and isinstance(value.get("endSeconds"), (int, float)) and value["endSeconds"] <= value["startSeconds"]:
                errors.append({"path": path, "code": "invalid_time_range", "message": "endSeconds must exceed startSeconds"})
            for key, item in value.items(): scan_ranges(item, f"{path}/{key}")
        elif isinstance(value, list):
            for index, item in enumerate(value): scan_ranges(item, f"{path}/{index}")
    scan_ranges(data)
    # A completed artifact cannot be obtained by flipping artifactStatus on the unknown scaffold.
    if data.get("artifactStatus") == "complete":
        def unresolved(value: Any, path: str = "") -> None:
            if isinstance(value, dict):
                if value.get("status") == "unknown" and not path.startswith("/unknowns") and not path.startswith("/reviewPlan/remainingUnknowable"):
                    blockers.append({"code": "required_slot_unknown", "subjectRef": path or "/"})
                for key, item in value.items(): unresolved(item, f"{path}/{key}")
            elif isinstance(value, list):
                for index, item in enumerate(value): unresolved(item, f"{path}/{index}")
        unresolved(data)
    return errors, summary, blockers


def semantic_checklist(data: Any) -> list[dict]:
    mode = data.get("mode") if isinstance(data, dict) else None
    checks = [
        ("S1", "proof_scope_and_fidelity"), ("S2", "promise_alignment"), ("S3", "production_feasibility"),
        ("S4", "originality_and_source_injection"), ("S5", "claim_and_asset_safety"), ("S6", "causal_calibration"),
    ]
    if mode == "account": checks.append(("S7", "portfolio_and_identity_fit"))
    if mode == "series": checks.append(("S7", "episode_future_value_continuity"))
    if mode == "research": checks.append(("S7", "observation_model_generalization"))
    if mode == "review": checks.append(("S7", "execution_vs_direction_separation"))
    return [{"id": item_id, "name": name, "status": "not_machine_verified"} for item_id, name in checks]


def validate(data: Any) -> dict:
    """Return a stable report for every Python/JSON value; never raise."""
    if JSONSCHEMA_IMPORT_ERROR is not None:
        message = f"Missing or incompatible dependency 'jsonschema' ({JSONSCHEMA_IMPORT_ERROR}). Install with: python3 -m pip install 'jsonschema>=4.18'"
        return {"reportVersion": "2.0", "validatedSchemaVersion": None, "structuralReady": False, "completionReady": False, "completionBlocked": True, "semanticReviewRequired": True, "machineConclusion": "dependency_missing", "errorCount": 1, "errors": [{"path": "/", "code": "dependency_missing", "message": message}], "blockingConditions": [{"code": "dependency_missing", "subjectRef": "jsonschema"}], "derivedSafety": {"assetRights": {"status": "unknown", "clearCount": 0, "blockedCount": 0}, "claims": {"verified": 0, "notVerified": 0, "hypothesis": 0}, "privacy": {"status": "unknown", "blockedCount": 0}, "platform": {"status": "unknown", "blockedCount": 0}}, "semanticChecks": semantic_checklist(data)}
    try:
        schema = json.loads(SCHEMA_PATH.read_text(encoding="utf-8"))
        validator = Draft202012Validator(schema, format_checker=FormatChecker())
        schema_errors = [
            {"path": pointer(list(error.absolute_path)), "code": f"schema.{error.validator}", "message": error.message}
            for error in sorted(validator.iter_errors(data), key=lambda item: (list(item.absolute_path), item.message))
        ]
        custom_errors, derived, blockers = custom_checks(data)
        errors = schema_errors + custom_errors
        artifact_status = data.get("artifactStatus") if isinstance(data, dict) else None
        if artifact_status == "draft": blockers.insert(0, {"code": "artifact_is_draft", "subjectRef": "artifactStatus"})
        if errors: blockers.insert(0, {"code": "structural_errors", "subjectRef": "validation.errors"})
        completion_ready = not errors and artifact_status == "complete" and not blockers
        return {
            "reportVersion": "2.0",
            "validatedSchemaVersion": data.get("schemaVersion") if isinstance(data, dict) else None,
            "structuralReady": not errors,
            "completionReady": completion_ready,
            "completionBlocked": not completion_ready,
            "semanticReviewRequired": True,
            "machineConclusion": "completion_candidate_requires_semantic_review" if completion_ready else "structurally_valid_but_completion_blocked" if not errors else "structurally_invalid",
            "errorCount": len(errors),
            "errors": errors,
            "blockingConditions": blockers,
            "derivedSafety": derived,
            "semanticChecks": semantic_checklist(data),
        }
    except BaseException as exc:
        return {
            "reportVersion": "2.0", "validatedSchemaVersion": None, "structuralReady": False,
            "completionReady": False, "completionBlocked": True, "semanticReviewRequired": True, "machineConclusion": "validator_internal_error", "errorCount": 1,
            "errors": [{"path": "/", "code": "validator_internal_error", "message": f"{type(exc).__name__}: {exc}"}],
            "blockingConditions": [{"code": "validator_internal_error", "subjectRef": "validator"}],
            "derivedSafety": {"assetRights": {"status": "unknown", "clearCount": 0, "blockedCount": 0}, "claims": {"verified": 0, "notVerified": 0, "hypothesis": 0}, "privacy": {"status": "unknown", "blockedCount": 0}, "platform": {"status": "unknown", "blockedCount": 0}},
            "semanticChecks": semantic_checklist(data),
        }


def atomic_write(path: Path, text: str, force: bool) -> None:
    if path.exists() and not force:
        raise FileExistsError(f"refusing to overwrite existing file: {path}; pass --force to replace it")
    if not path.parent.exists():
        raise FileNotFoundError(f"output parent directory does not exist: {path.parent}")
    fd, temp_name = tempfile.mkstemp(prefix=f".{path.name}.", suffix=".tmp", dir=path.parent)
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as handle:
            handle.write(text); handle.flush(); os.fsync(handle.fileno())
        os.replace(temp_name, path)
    except BaseException:
        try: os.unlink(temp_name)
        except FileNotFoundError: pass
        raise


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("input", help="directing-brief.json")
    parser.add_argument("--output", help="optional report path")
    parser.add_argument("--force", action="store_true", help="replace an existing report atomically")
    parser.add_argument("--require-complete", action="store_true", help="return nonzero unless completionReady is true")
    args = parser.parse_args()
    try:
        def reject_constant(token: str):
            raise ValueError(f"non-standard JSON numeric constant rejected: {token}")
        data = json.loads(Path(args.input).read_text(encoding="utf-8"), parse_constant=reject_constant)
    except (OSError, json.JSONDecodeError, ValueError) as exc:
        report = {"reportVersion": "2.0", "validatedSchemaVersion": None, "structuralReady": False, "completionReady": False, "completionBlocked": True, "semanticReviewRequired": True, "machineConclusion": "input_not_parseable", "errorCount": 1, "errors": [{"path": "/", "code": "input_not_parseable", "message": str(exc)}], "blockingConditions": [{"code": "input_not_parseable", "subjectRef": "input"}], "derivedSafety": {"assetRights": {"status": "unknown", "clearCount": 0, "blockedCount": 0}, "claims": {"verified": 0, "notVerified": 0, "hypothesis": 0}, "privacy": {"status": "unknown", "blockedCount": 0}, "platform": {"status": "unknown", "blockedCount": 0}}, "semanticChecks": semantic_checklist(None)}
    else:
        report = validate(data)
    rendered = json.dumps(report, ensure_ascii=False, indent=2) + "\n"
    if args.output:
        try: atomic_write(Path(args.output), rendered, args.force)
        except OSError as exc:
            sys.stderr.write(f"Unable to write report: {exc}\n"); return 3
    else:
        sys.stdout.write(rendered)
    if report.get("machineConclusion") == "dependency_missing": return 3
    if not report["structuralReady"]: return 2
    if args.require_complete and not report["completionReady"]: return 4
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
