#!/usr/bin/env python3
"""Build an explicitly incomplete Deep Content Director 2.0 draft."""
from __future__ import annotations
import argparse, json, os, sys, tempfile
from pathlib import Path

MODES = ("account", "single", "series", "research", "review")
FORMATS = ("video", "carousel", "text_image", "live_clip", "other")
DRAFT_SENTINEL = "[[DRAFT_SLOT]] "
DRAFT_STARTS = ("Define ", "Choose ", "Select ", "Supply ", "State ", "Name ", "Estimate ", "Check ", "Form ", "Record ", "Assess ", "Compare ", "Human must ", "Unresolved ", "No metric ")

def unknown(reason: str, owner: str = "human strategy owner", resolution: str = "Resolve from task evidence before completion") -> dict:
    return {"status": "unknown", "reason": reason, "owner": owner, "resolution": resolution}

def draft_metric() -> dict:
    return {"id": "metric_main", "name": "Unresolved primary metric", "availability": "unknown", "definition": "Define against the primary job", "proxy": "Select a measurable proxy after confirming data access", "limitation": "No metric source or backend availability was supplied"}

def draft_experiment() -> dict:
    return {"primaryVariable": "other", "lockedElements": ["Define locked elements before execution"], "mainMetric": draft_metric(), "guardrailMetrics": [], "window": unknown("No evidence-based review window was supplied"), "minimumEvidence": unknown("No comparable baseline or sample requirement was supplied"), "confounds": [], "stopChangeRule": unknown("No approved stop/change threshold was supplied")}

def common(mode: str, fmt: str, title: str) -> dict:
    return {
        "schemaVersion": "2.0", "artifactStatus": "draft", "draftSlots": [], "mode": mode, "format": fmt,
        "decision": unknown(f"The decision enabled by '{title}' has not been approved"),
        "accountContext": {"identityPromise": unknown("Account promise not supplied"), "stage": unknown("Account baseline not supplied"), "contentRole": unknown("Portfolio role not supplied")},
        "responsibility": {"humanDecision": unknown("Decision owner not named"), "aiContribution": unknown("AI contribution boundary not approved"), "factVerification": unknown("Fact verifier not named"), "publishOwner": unknown("Publisher not named")},
        "commercialBoundary": {"freeScope": unknown("Free scope not supplied"), "paidScope": unknown("Paid scope not supplied"), "collaboration": unknown("Collaboration ownership and data terms not supplied")},
        "offerArchitecture": unknown("Buyer, demand, deliverable, content form, conversion and support boundary not supplied"),
        "carrierEvidence": {"nonSpeechAudio": unknown("Audio has not been inspected with an audio-capable tool"), "referentLedger": [], "absenceClaims": []},
        "assets": [], "claims": [], "safety": {"privacyChecks": [], "platformChecks": [], "disclosure": unknown("Commercial disclosure applicability not checked")},
        "unknowns": [unknown("Shape-only draft: source evidence and human decisions are still required")],
    }

def draft_candidates() -> list[dict]:
    bases = [("candidate_problem", "Problem-led candidate", "Define problem-led payoff"), ("candidate_proof", "Proof-led candidate", "Define demonstrated payoff"), ("candidate_contrast", "Contrast-led candidate", "Define comparison payoff")]
    return [{"id": i, "name": n, "audience": "Define audience", "tension": "Define meaningful tension", "promise": p, "proof": "Name obtainable proof", "accountFit": "Check account fit", "productionCost": "Estimate cost", "followReason": "Define future value", "risk": "Name main risk"} for i, n, p in bases]

def single_plan(fmt: str, title: str) -> dict:
    plan = {
        "workingTitle": title, "primaryJob": "Choose one primary job before completion", "guardrailJob": unknown("Guardrail job not decided"),
        "audience": {"person": "Define target person", "stage": "Define awareness stage", "situation": "Define use situation", "currentBelief": "Define current belief"},
        "demandEvidence": [], "contentMechanism": {"hypothesis": "Form a falsifiable if/then/because hypothesis", "mechanism": "State the proposed mechanism", "conditions": ["State at least one condition"], "counterexample": "State a counterexample", "failureBoundary": "State what failure would mean"},
        "candidates": draft_candidates(), "selection": {"selectedId": "candidate_proof", "comparison": "Human must compare evidence, fit, cost and risk before completion"},
        "contracts": {"click": "Define click promise", "delivery": "Define delivery promise", "follow": "Define future-value promise", "action": "Define target action", "promiseClosure": "Define how the ending repays the opening"},
        "evidencePlan": unknown("No consequential claim or proof chain has been supplied"),
        "packaging": {"title": title, "cover": "Define cover promise", "opening": {"kind": "first_frame" if fmt == "video" else "live_opening" if fmt == "live_clip" else "first_panel" if fmt == "carousel" else "lead_image" if fmt == "text_image" else "custom", "content": "Define format-appropriate opening"}, "searchIntent": {"route": "hybrid", "query": "Define validated search query"}, "cta": "Define bounded action", "commentCoding": unknown("Comment coding method not supplied")},
        "production": {"people": [], "locations": [], "assetRefs": [], "tools": [], "deadline": unknown("Deadline not supplied"), "owner": unknown("Production owner not named"), "fallback": "Define a rights-cleared fallback"},
        "originality": unknown("Source inspirations and required changes have not been audited"), "experiment": draft_experiment(),
    }
    if fmt in ("video", "live_clip"):
        plan["beats"] = [
            {"id": "beat_open", "cognitiveJob": "orient", "speech": unknown("Opening speech not written"), "visual": "Define opening visual", "onScreenText": unknown("Opening text not written"), "audio": unknown("Non-speech audio not inspected")},
            {"id": "beat_proof", "cognitiveJob": "prove", "speech": unknown("Proof speech not written"), "visual": "Define proof carrier", "onScreenText": unknown("Proof text not written"), "audio": unknown("Non-speech audio not inspected")},
            {"id": "beat_close", "cognitiveJob": "convert", "speech": unknown("Closing speech not written"), "visual": "Define closing visual", "onScreenText": unknown("Closing text not written"), "audio": unknown("Non-speech audio not inspected")},
        ]
        plan["shots"] = [
            {"id": "shot_open", "beatId": "beat_open", "targetDurationSeconds": 1, "content": "Define opening shot", "function": "Orient", "evidenceResponsibility": "Context only until proof is supplied", "assetRefs": [], "transition": unknown("Transition not decided"), "editDecision": "add"},
            {"id": "shot_proof", "beatId": "beat_proof", "targetDurationSeconds": 1, "content": "Define proof shot", "function": "Carry evidence", "evidenceResponsibility": "Must link to a completed claim", "assetRefs": [], "transition": unknown("Transition not decided"), "editDecision": "add"},
            {"id": "shot_close", "beatId": "beat_close", "targetDurationSeconds": 1, "content": "Define closure shot", "function": "Close promise", "evidenceResponsibility": "No outcome prediction", "assetRefs": [], "transition": unknown("Transition not decided"), "editDecision": "add"},
        ]
    elif fmt in ("carousel", "text_image"):
        plan["panels"] = [{"id": "panel_open", "order": 1, "cognitiveJob": "orient", "copy": "Define first-panel promise", "visual": "Define first-panel visual", "assetRefs": []}]
        if fmt == "carousel": plan["panels"].append({"id": "panel_proof", "order": 2, "cognitiveJob": "prove", "copy": "Define proof and boundary", "visual": "Define proof panel", "assetRefs": []})
    else:
        plan["customCarrierPlan"] = {"carrier": "Name the custom carrier", "units": [{"id": "unit_1", "function": "Define cognitive job", "content": "Define carrier content", "assetRefs": []}], "editingLogic": "Define ordering, transition and removal logic"}
    return plan

def scaffold(mode: str, title: str, fmt: str = "video") -> dict:
    if mode not in MODES or fmt not in FORMATS: raise ValueError("unsupported mode or format")
    data = common(mode, fmt, title)
    if mode == "single": data["singlePlan"] = single_plan(fmt, title)
    elif mode == "account":
        data["accountPlan"] = {"identitySystem": {"identityWord": unknown("Audience-readable identity word not selected"), "attitude": unknown("Stable attitude not selected"), "repeatableSymbols": unknown("Visual, verbal or behavioral symbols not selected"), "audience": unknown("Durable audience not selected"), "problem": unknown("Durable problem not selected"), "proof": unknown("Owned proof not audited"), "repeatedValue": unknown("Repeated value not selected"), "personaBoundary": unknown("Persona boundary not approved")}, "enterprisePrimaryGoal": unknown("If enterprise, choose brand, conversion, recruiting/relationship, or other"), "assetAudit": unknown("Expertise, access, lived experience, capacity, distribution and constraints not audited"), "contentPortfolio": unknown("Portfolio roles and shares not selected"), "deliberateOmissions": unknown("Deliberate omissions not recorded"), "shareSemantics": "quota_sum_1", "seriesContracts": unknown("Series contracts not selected"), "commercialBoundaryDecision": unknown("Commercial carrier decision not approved"), "experiment": draft_experiment()}
    elif mode == "series":
        data["seriesPlan"] = {"durableAudience": "Define durable audience", "durableProblem": "Define durable problem", "recognizableFormat": "Define recognizable format across mixed episode carriers", "cadence": unknown("Cadence not approved"), "futureValue": "Define future-value contract", "episodes": unknown("Episode roles and formats not selected"), "entryAndCatchUp": "Define entry and catch-up path", "proofAccumulation": "Define proof accumulation", "directoryAndCrossLink": "Define directory and cross-links", "decisionRules": {"renew": "Define renew evidence", "pivot": "Define pivot evidence", "stop": "Define stop evidence"}, "experiment": draft_experiment()}
    elif mode == "research":
        data["researchPlan"] = {"scope": "Define bounded research question", "observations": unknown("No source locator or O1–O6 observation supplied"), "crossSourceContrast": "Define contrast after reconstructing multiple sources", "workingModel": unknown("No evidence-backed model formed"), "applications": unknown("No original executable application approved"), "modelUpdateRule": "Define evidence that retains, narrows or rejects the model"}
    else:
        data["reviewPlan"] = {"reviewTarget": "Supply exact artifact and version", "funnelDiagnosis": [{"layer": "entry", "observation": "Record observation after evidence is supplied", "evidenceRef": "Supply evidence locator", "inferenceBoundary": "Do not infer cause without comparison"}], "executionCompliance": "Compare artifact with approved plan", "directionSupport": "Assess separately after evidence is supplied", "editDecisions": {"keep": [], "compress": [], "remove": [], "add": []}, "primaryChange": "Select one change after diagnosis", "remainingUnknowable": [unknown("Comparable execution or performance evidence not supplied")], "dataNeeds": ["Supply artifact, plan and metric definitions"]}
    attach_draft_slots(data)
    return data

def attach_draft_slots(data: dict) -> None:
    """Tag every plain-text builder prompt; complete artifacts may not retain any tag."""
    slots: list[dict] = []
    excluded_suffixes = ("/workingTitle", "/packaging/title")
    def visit(value, path=""):
        if isinstance(value, dict):
            if value.get("status") == "unknown": return
            for key, item in list(value.items()):
                child = f"{path}/{key}"
                if isinstance(item, str) and item.startswith(DRAFT_STARTS) and not child.endswith(excluded_suffixes):
                    value[key] = DRAFT_SENTINEL + item
                    slots.append({"path": child, "reason": "Builder prompt has not been replaced with task evidence", "owner": "human strategy owner", "resolution": "Replace this exact path before setting artifactStatus=complete"})
                else: visit(item, child)
        elif isinstance(value, list):
            for index, item in enumerate(value):
                child = f"{path}/{index}"
                if isinstance(item, str) and item.startswith(DRAFT_STARTS):
                    value[index] = DRAFT_SENTINEL + item
                    slots.append({"path": child, "reason": "Builder prompt has not been replaced with task evidence", "owner": "human strategy owner", "resolution": "Replace this exact path before setting artifactStatus=complete"})
                else: visit(item, child)
    visit(data)
    data["draftSlots"] = slots

def atomic_write(path: Path, text: str, force: bool) -> None:
    if path.exists() and not force: raise FileExistsError(f"refusing to overwrite existing file: {path}; pass --force to replace it")
    if not path.parent.exists(): raise FileNotFoundError(f"output parent directory does not exist: {path.parent}")
    fd, temp_name = tempfile.mkstemp(prefix=f".{path.name}.", suffix=".tmp", dir=path.parent)
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as handle: handle.write(text); handle.flush(); os.fsync(handle.fileno())
        os.replace(temp_name, path)
    except BaseException:
        try: os.unlink(temp_name)
        except FileNotFoundError: pass
        raise

def main() -> int:
    parser = argparse.ArgumentParser(); parser.add_argument("--mode", choices=MODES, default="single"); parser.add_argument("--format", choices=FORMATS, default="video"); parser.add_argument("--title", default="Untitled content decision"); parser.add_argument("--output"); parser.add_argument("--force", action="store_true")
    args = parser.parse_args(); rendered = json.dumps(scaffold(args.mode, args.title, args.format), ensure_ascii=False, indent=2) + "\n"
    if not args.output: sys.stdout.write(rendered); return 0
    try: atomic_write(Path(args.output), rendered, args.force)
    except OSError as exc: sys.stderr.write(f"Unable to write scaffold: {exc}\n"); return 3
    return 0

if __name__ == "__main__": raise SystemExit(main())
