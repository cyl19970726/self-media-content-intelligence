#!/usr/bin/env python3
"""Golden, draft, mutation, safety, fuzz and package tests for contract 2.0."""
from __future__ import annotations
import copy, importlib.util, json, os, subprocess, sys, tempfile
from pathlib import Path

sys.dont_write_bytecode = True
os.environ["PYTHONDONTWRITEBYTECODE"] = "1"
HERE = Path(__file__).resolve().parent
SKILL_ROOT = HERE.parent

def load(name: str, path: Path):
    spec = importlib.util.spec_from_file_location(name, path); assert spec and spec.loader
    module = importlib.util.module_from_spec(spec); spec.loader.exec_module(module); return module

builder = load("builder", HERE / "build_directing_brief.py")
validator = load("validator", HERE / "validate_directing_output.py")
count = 0

def expect_structural(data, label: str, completion: bool | None = None):
    global count
    report = validator.validate(data)
    assert report["structuralReady"], (label, report["errors"][:6])
    assert report["semanticReviewRequired"] is True and "ready" not in report
    if completion is not None: assert report["completionReady"] is completion, (label, report["blockingConditions"][:8])
    count += 1; return report

def expect_invalid(data, label: str, code: str | None = None):
    global count
    report = validator.validate(data); assert not report["structuralReady"], label
    if code: assert any(code in item["code"] for item in report["errors"]), (label, report["errors"][:8])
    assert report["completionReady"] is False; count += 1; return report

def expect_blocked(data, label: str, code: str | None = None):
    global count
    report = validator.validate(data); assert report["structuralReady"], (label, report["errors"][:8])
    assert report["completionBlocked"] is True and report["completionReady"] is False
    if code: assert any(code in item["code"] for item in report["blockingConditions"]), (label, report["blockingConditions"])
    count += 1; return report

def mutated(base, fn):
    value = copy.deepcopy(base); fn(value); return value

def known(value): return {"status": "known", "value": value}
def na(reason): return {"status": "not_applicable", "reason": reason}

def resolve_common(data):
    data["artifactStatus"] = "complete"; data["decision"] = known("Approve this bounded plan")
    data["accountContext"] = {"identityPromise": known("Evidence-led creator"), "stage": known("Cold start"), "contentRole": known("Test one contract")}
    data["responsibility"] = {"humanDecision": known("Editor Lin"), "aiContribution": known("Draft and structure"), "factVerification": known("Researcher Zhou"), "publishOwner": known("Editor Lin")}
    data["commercialBoundary"] = {"freeScope": known("Public method"), "paidScope": na("No paid scope"), "collaboration": na("No collaborator")}
    data["offerArchitecture"] = na("No offer in this plan")
    data["carrierEvidence"] = {"nonSpeechAudio": na("No audio carrier applies"), "referentLedger": [], "absenceClaims": []}
    data["safety"]["disclosure"] = na("No commercial relationship"); data["unknowns"] = []

def resolve_slots(data):
    """Test-only resolution of every registered builder prompt."""
    for slot in data.get("draftSlots", []):
        parts = [part for part in slot["path"].split("/") if part]
        target = data
        for part in parts[:-1]: target = target[int(part)] if isinstance(target, list) else target[part]
        last = parts[-1]
        if isinstance(target, list): target[int(last)] = "Resolved task-specific value"
        else: target[last] = "Resolved task-specific value"
    data["draftSlots"] = []

def resolve_experiment(exp):
    exp["window"] = known("Seven-day comparison chosen for this task"); exp["minimumEvidence"] = known("Three comparable executions chosen by owner"); exp["stopChangeRule"] = known("Stop after two pre-approved revisions")

def main() -> int:
    video = json.loads((HERE / "testdata/golden-single-video.json").read_text())
    carousel = json.loads((HERE / "testdata/golden-single-carousel.json").read_text())
    account_golden = json.loads((HERE / "testdata/golden-account-complete.json").read_text())
    expect_structural(video, "completed single video golden", True)
    expect_structural(carousel, "completed single carousel golden", True)
    expect_structural(account_golden, "completed account golden", True)

    # Every builder route is shape-valid but explicitly impossible to mistake for complete.
    for mode in builder.MODES:
        for fmt in builder.FORMATS:
            draft = builder.scaffold(mode, f"{mode}-{fmt}", fmt)
            report = expect_structural(draft, f"draft {mode}/{fmt}", False)
            assert draft["artifactStatus"] == "draft" and any(item["code"] == "artifact_is_draft" for item in report["blockingConditions"])
            assert draft["assets"] == [] and draft["claims"] == []

    # Reasonable valid inputs: single-image note, cold account, mixed series, research, audio, offer.
    text_image = copy.deepcopy(carousel); text_image["format"] = "text_image"; text_image["singlePlan"]["packaging"]["opening"]["kind"] = "lead_image"
    proof_panel = copy.deepcopy(text_image["singlePlan"]["panels"][1]); proof_panel["order"] = 1
    text_image["singlePlan"]["panels"] = [proof_panel]
    expect_structural(text_image, "one-image text note", True)

    cold = builder.scaffold("account", "cold account", "other"); resolve_common(cold)
    cold["accountPlan"].update({"identitySystem": {"identityWord": known("AI experimenter"), "attitude": known("Verify before claiming"), "repeatableSymbols": [{"kind": "visual", "symbol": "Evidence card"}], "audience": known("Solo AI creators"), "problem": known("No repeatable workflow"), "proof": known("Future owned experiments"), "repeatedValue": known("One tested decision weekly"), "personaBoundary": known("No borrowed status")}, "enterprisePrimaryGoal": na("Personal account"), "assetAudit": {"status": "completed", "domainAssets": [], "mediaAssets": [], "constraints": [{"constraint": "No existing media asset", "impact": "Start with original screen demonstrations"}]}, "contentPortfolio": [{"role": "reach", "share": 1.0, "successSignal": "Qualified profile visit"}], "deliberateOmissions": [{"role": role, "reason": "Deferred during cold-start test"} for role in ["search_save", "follow", "trust", "proof", "conversion", "commercial_carrier", "expression_taste"]], "seriesContracts": [{"name": "Decision Lab", "audience": "Solo AI creators", "repeatableTransformation": "Turn one vague choice into a test", "futureValue": "One tested decision", "cadence": "Weekly", "endRenewRule": "Review after six episodes"}], "commercialBoundaryDecision": known("No commercial carrier in first test")})
    resolve_experiment(cold["accountPlan"]["experiment"])
    resolve_slots(cold)
    expect_structural(cold, "assetless cold account", True)

    mixed = builder.scaffold("series", "mixed series", "other"); resolve_common(mixed); resolve_experiment(mixed["seriesPlan"]["experiment"])
    mixed["seriesPlan"].update({"cadence": known("Weekly"), "episodes": [{"id": "ep_video", "format": "video", "role": "entry", "promise": "Diagnose", "proof": "Screen demo", "nextEpisodeHandoff": "Apply"}, {"id": "ep_carousel", "format": "carousel", "role": "application", "promise": "Apply", "proof": "Annotated panels", "nextEpisodeHandoff": "Review"}]})
    resolve_slots(mixed)
    expect_structural(mixed, "mixed-format series", True)

    research = builder.scaffold("research", "creator research", "other"); resolve_common(research)
    research["researchPlan"].update({"observations": [{"sourceLocator": {"sourceId": "source-1", "locator": "00:00-00:30", "observedAt": "2026-08-16T12:00:00+08:00"}, "o1Observe": "Observed a proof-first opening", "o2Model": {"mechanism": "Proof may reduce uncertainty", "dependencies": ["Proof is relevant"]}, "o3AskBack": ["Would the same work without proof?"], "o4Contrast": "A second source opens with a problem instead", "o5Apply": "Change audience and proof", "o6Review": "Retain only after controlled test"}], "workingModel": known("Proof-first openings are a bounded candidate mechanism"), "applications": [{"id": "app_brief", "deliverableType": "brief", "originalChange": "Use a different audience and owned proof", "executableNextStep": "Produce one single-video brief", "owner": known("Editor Lin")} ]})
    resolve_slots(research)
    expect_structural(research, "O1-O6 research with executable application", True)

    audio = copy.deepcopy(video)
    audio["assets"].append({"id": "asset_music", "kind": "music", "owner": known("Composer Wu"), "rightsStatus": "licensed", "evidenceLocator": "license/music-2026-08.pdf"})
    audio["carrierEvidence"] = {"nonSpeechAudio": {"status": "observed", "entries": [{"id": "audio_intro", "kind": "music", "locator": {"kind": "time_range", "timeRange": {"startSeconds": 0, "endSeconds": 3}}, "assetRef": "asset_music", "referentRefs": ["referent_intro"], "function": known("Marks the opening boundary")}], "assessmentMethod": "Waveform plus full-speed listening", "toolBoundary": "Cannot infer emotional causality from the track"}, "referentLedger": [{"id": "referent_intro", "referent": "The intro music discussed in narration", "locator": {"kind": "time_range", "timeRange": {"startSeconds": 0, "endSeconds": 3}}, "source": known("Licensed master"), "ownership": known("Composer Wu; licensed to account"), "contentScope": "current_content"}], "absenceClaims": []}
    audio["safety"]["platformChecks"].append({"id": "check_music", "subjectRef": "asset_music", "status": "clear", "note": "License and platform use checked"})
    expect_structural(audio, "non-speech audio with tool boundary and referent", True)
    generic_music_audio = copy.deepcopy(audio); generic_music_audio["assets"][1]["kind"] = "audio"; generic_music_audio["safety"]["platformChecks"] = []
    expect_blocked(generic_music_audio, "music use of generic audio still requires platform coverage", "mandatory_platform_check_not_clear")
    generic_music_audio["safety"]["platformChecks"] = [{"id": "check_generic_music", "subjectRef": "asset_music", "status": "clear", "note": "Music license, platform use and disclosure applicability checked"}]
    expect_structural(generic_music_audio, "generic audio used as music with explicit coverage", True)

    offer = copy.deepcopy(video); offer["offerArchitecture"] = {"status": "known", "buyer": "Solo creator", "demand": known("Needs implementation help"), "productOrDeliverable": "Workflow implementation session", "productType": "service", "contentForm": "Evidence-led tutorial", "conversionAction": "Submit a scoped intake", "supportBoundary": "One session and written handoff; no traffic guarantee"}
    expect_structural(offer, "complete offer architecture", True)

    # V2's 14 concrete false-PASS regressions plus carrier and safety graph cases.
    expect_invalid(mutated(video, lambda x: x.update({"decision": known("none known")})), "none-known decision", "placeholder")
    expect_invalid(mutated(carousel, lambda x: x["singlePlan"]["panels"][1].update({"assetRefs": ["missing_asset"]})), "dangling panel asset", "dangling_ref")
    expect_invalid(mutated(carousel, lambda x: x["singlePlan"]["panels"][1].update({"order": 1})), "duplicate panel order", "panel_order_not_contiguous")
    expect_invalid(mutated(carousel, lambda x: x["singlePlan"].update({"beats": video["singlePlan"]["beats"], "shots": video["singlePlan"]["shots"]})), "carousel contaminated by video carriers")
    expect_invalid(mutated(video, lambda x: x["singlePlan"].update({"panels": carousel["singlePlan"]["panels"]})), "video contaminated by panels")
    other = builder.scaffold("single", "other", "other"); other["singlePlan"].pop("customCarrierPlan")
    expect_invalid(other, "other without custom carrier")
    expect_invalid(mutated(carousel, lambda x: x["singlePlan"]["packaging"]["opening"].update({"kind": "first_frame"})), "carousel opening mismatch", "schema.const")
    high = copy.deepcopy(video); high["claims"][0]["risk"] = "high"; high["claims"][0]["officialPrimarySource"] = {"sourceId": "official-v1", "locator": "official.example/rule", "observedAt": "2026-08-16T10:00:00+08:00"}
    expect_blocked(high, "high risk without platform check", "mandatory_platform_check_not_clear")
    blocked_check = copy.deepcopy(high); blocked_check["safety"]["platformChecks"] = [{"id": "check_high", "subjectRef": "claim_steps", "status": "blocked", "note": "Official rule conflicts"}]
    expect_blocked(blocked_check, "blocked safety check", "platform_check_blocked")
    blocked_asset = copy.deepcopy(video); blocked_asset["assets"].append({"id": "asset_fallback", "kind": "screen_recording", "owner": known("Account"), "rightsStatus": "owned"}); blocked_asset["assets"][0].update({"rightsStatus": "blocked", "fallbackAssetId": "asset_fallback"})
    expect_invalid(blocked_asset, "blocked asset still executed", "blocked_asset_referenced")
    expect_invalid(mutated(video, lambda x: x["claims"][0].update({"id": "asset_demo"})), "global id collision", "global_duplicate_id")
    unknown_claim = copy.deepcopy(video); unknown_claim["claims"][0].update({"claimClass": "unknown", "verificationStatus": "verified"}); unknown_claim["claims"][0].pop("sourceLocator", None)
    expect_invalid(unknown_claim, "unknown claim marked verified", "schema.const")
    account_extra = copy.deepcopy(cold); account_extra["reviewPlan"] = builder.scaffold("review", "x", "video")["reviewPlan"]
    expect_invalid(account_extra, "foreign mode plan")
    expect_invalid(mutated(cold, lambda x: x["accountPlan"]["contentPortfolio"][0].update({"share": 0.8})), "portfolio share not one", "portfolio_share_not_one")

    expect_invalid(mutated(carousel, lambda x: x["claims"][0].update({"panelRefs": ["panel_missing"]})), "dangling claim panel", "dangling_ref")
    unused_panel = copy.deepcopy(carousel); unused_panel["singlePlan"]["panels"].append({"id": "panel_unused", "order": 4, "cognitiveJob": "prove", "copy": "Unused proof", "visual": "Unused", "assetRefs": []})
    expect_invalid(unused_panel, "unused evidence panel", "unused_evidence_panel")
    referent_bad = copy.deepcopy(audio); referent_bad["carrierEvidence"]["nonSpeechAudio"]["entries"][0]["referentRefs"] = ["missing_ref"]
    expect_invalid(referent_bad, "dangling audio referent", "dangling_ref")
    nested_bad = copy.deepcopy(audio); nested_bad["carrierEvidence"]["referentLedger"][0]["parentReferentId"] = "missing_parent"
    expect_invalid(nested_bad, "dangling nested referent", "dangling_ref")
    time_bad = copy.deepcopy(audio); time_bad["carrierEvidence"]["nonSpeechAudio"]["entries"][0]["locator"] = {"kind": "time_range", "timeRange": {"startSeconds": 3, "endSeconds": 2}}
    expect_invalid(time_bad, "invalid audio range", "invalid_time_range")
    tool_bad = copy.deepcopy(audio); tool_bad["carrierEvidence"]["nonSpeechAudio"].pop("toolBoundary")
    expect_invalid(tool_bad, "audio missing tool boundary", "schema.oneOf")
    absence_bad = copy.deepcopy(carousel); absence_bad["carrierEvidence"]["absenceClaims"][0].pop("carrier")
    expect_invalid(absence_bad, "absence without carrier scope", "schema.required")
    offer_bad = copy.deepcopy(offer); offer_bad["offerArchitecture"].pop("supportBoundary")
    expect_invalid(offer_bad, "offer without support boundary", "schema.oneOf")
    music_no_check = copy.deepcopy(audio); music_no_check["safety"]["platformChecks"] = []
    expect_blocked(music_no_check, "music requires platform check", "mandatory_platform_check_not_clear")
    likeness = copy.deepcopy(video); likeness["assets"].append({"id": "asset_person", "kind": "person_likeness", "owner": known("Person Q"), "rightsStatus": "consented", "evidenceLocator": "consent/q.pdf"})
    expect_blocked(likeness, "likeness requires privacy check", "mandatory_privacy_check_not_clear")
    private = copy.deepcopy(video); private["assets"].append({"id": "asset_private", "kind": "private_screenshot", "owner": known("Account"), "rightsStatus": "owned"})
    expect_blocked(private, "private screenshot requires privacy check", "mandatory_privacy_check_not_clear")
    flipped = builder.scaffold("single", "draft flip", "video"); flipped["artifactStatus"] = "complete"
    expect_blocked(flipped, "draft cannot complete by status flip", "required_slot_unknown")

    plain_slot = copy.deepcopy(video); plain_slot["singlePlan"]["audience"]["person"] = "Define target person"
    expect_blocked(plain_slot, "plain builder phrase cannot complete", "draft_slot_unresolved")
    natural_cta = copy.deepcopy(video); natural_cta["singlePlan"]["contracts"]["action"] = "Check one saved tutorial with the same three-step list"
    expect_structural(natural_cta, "ordinary English CTA is not a draft slot", True)
    default_titles = copy.deepcopy(video); default_titles["singlePlan"]["workingTitle"] = "Untitled content decision"; default_titles["singlePlan"]["packaging"]["title"] = "Untitled content decision"
    expect_blocked(default_titles, "exact builder default titles cannot complete", "builder_default_title_unresolved")
    natural_untitled = copy.deepcopy(video); natural_untitled["singlePlan"]["workingTitle"] = "Untitled notes from an AI field test"; natural_untitled["singlePlan"]["packaging"]["title"] = "Untitled notes from an AI field test"
    expect_structural(natural_untitled, "ordinary title containing Untitled is allowed", True)
    known_unknown = copy.deepcopy(video); known_unknown["decision"] = known("unknown")
    expect_invalid(known_unknown, "known cannot disguise unknown", "known_value_is_unresolved")
    unresolved_slots = copy.deepcopy(video); unresolved_slots["draftSlots"] = [{"path": "/singlePlan/audience/person", "reason": "Unresolved", "owner": "Editor", "resolution": "Supply audience"}]
    expect_blocked(unresolved_slots, "registered draft slot blocks completion", "draft_slot_unresolved")

    self_cycle = copy.deepcopy(audio); self_cycle["carrierEvidence"]["referentLedger"][0]["parentReferentId"] = "referent_intro"
    expect_invalid(self_cycle, "referent self cycle", "referent_cycle")
    two_cycle = copy.deepcopy(audio); two_cycle["carrierEvidence"]["referentLedger"].append({"id": "referent_parent", "referent": "Parent case", "parentReferentId": "referent_intro", "locator": {"kind": "external", "externalLocator": "case artifact"}, "source": known("Owned case"), "ownership": known("Account"), "contentScope": "analyzed_case"}); two_cycle["carrierEvidence"]["referentLedger"][0]["parentReferentId"] = "referent_parent"
    expect_invalid(two_cycle, "two-node referent cycle", "referent_cycle")
    wrong_audio_kind = copy.deepcopy(audio); wrong_audio_kind["carrierEvidence"]["nonSpeechAudio"]["entries"][0]["assetRef"] = "asset_demo"
    expect_invalid(wrong_audio_kind, "music cannot reference screen recording", "audio_asset_kind_mismatch")
    dangling_panel_locator = copy.deepcopy(carousel); dangling_panel_locator["carrierEvidence"]["referentLedger"][0]["locator"] = {"kind": "panel", "panelRef": "panel_missing"}
    expect_invalid(dangling_panel_locator, "dangling typed panel locator", "dangling_typed_ref")
    silence = copy.deepcopy(audio); silence["carrierEvidence"]["nonSpeechAudio"]["entries"][0].update({"kind": "silence", "assetRef": na("Silence has no rights-bearing source")})
    expect_structural(silence, "silence may use explicit N/A asset", True)

    duplicate_omission = copy.deepcopy(account_golden); duplicate_omission["accountPlan"]["deliberateOmissions"].append(copy.deepcopy(duplicate_omission["accountPlan"]["deliberateOmissions"][0]))
    expect_invalid(duplicate_omission, "duplicate omitted role", "duplicate_omitted_role")

    # Library calls cannot smuggle non-standard JSON floats through numeric gates.
    for label, number in [("nan", float("nan")), ("pos_inf", float("inf")), ("neg_inf", float("-inf"))]:
        expect_invalid(mutated(video, lambda x, n=number: x["singlePlan"]["shots"][0].update({"targetDurationSeconds": n})), f"{label} shot duration", "non_finite_number")
        expect_invalid(mutated(account_golden, lambda x, n=number: x["accountPlan"]["contentPortfolio"][0].update({"share": n})), f"{label} portfolio share", "non_finite_number")
        range_bad = copy.deepcopy(video); range_bad["carrierEvidence"]["absenceClaims"][0]["locator"]["timeRange"]["endSeconds"] = number
        expect_invalid(range_bad, f"{label} carrier range", "non_finite_number")
        experiment_bad = copy.deepcopy(video); experiment_bad["claims"][0].update({"claimClass": "experiment_result", "experimentMetadata": {"variant": "A", "baselineOrControl": "B", "window": "7 days", "denominator": number, "confounds": []}})
        expect_invalid(experiment_bad, f"{label} experiment denominator", "non_finite_number")

    # Total-function fuzz and deep type replacement.
    for index, value in enumerate([None, True, False, 0, 1.5, "text", [], ["bad"], {}, {"shots": ["bad"]}, {"candidates": [{"name": []}]}]):
        expect_invalid(value, f"top fuzz {index}")
    for field, wrong in [("claims", "bad"), ("assets", 7), ("safety", []), ("singlePlan", True), ("carrierEvidence", None), ("responsibility", "owner"), ("offerArchitecture", []), ("unknowns", {}), ("format", 3), ("artifactStatus", False)]:
        expect_invalid(mutated(video, lambda x, f=field, w=wrong: x.update({f: w})), f"field fuzz {field}")

    # CLI overwrite safety; subprocesses explicitly suppress bytecode.
    env = dict(os.environ, PYTHONDONTWRITEBYTECODE="1")
    with tempfile.TemporaryDirectory() as temp:
        brief = Path(temp) / "brief.json"; report = Path(temp) / "report.json"
        build_cmd = [sys.executable, str(HERE / "build_directing_brief.py"), "--output", str(brief)]
        assert subprocess.run(build_cmd, env=env, capture_output=True).returncode == 0
        assert subprocess.run(build_cmd, env=env, capture_output=True).returncode == 3
        assert subprocess.run(build_cmd + ["--force"], env=env, capture_output=True).returncode == 0
        validate_cmd = [sys.executable, str(HERE / "validate_directing_output.py"), str(brief), "--output", str(report)]
        assert subprocess.run(validate_cmd, env=env, capture_output=True).returncode == 0
        assert subprocess.run(validate_cmd, env=env, capture_output=True).returncode == 3
        assert subprocess.run(validate_cmd + ["--force"], env=env, capture_output=True).returncode == 0
        assert subprocess.run(validate_cmd + ["--force", "--require-complete"], env=env, capture_output=True).returncode == 4
        complete_cmd = [sys.executable, str(HERE / "validate_directing_output.py"), str(HERE / "testdata/golden-single-video.json"), "--require-complete"]
        assert subprocess.run(complete_cmd, env=env, capture_output=True).returncode == 0
        nan_input = Path(temp) / "nan.json"; nan_input.write_text('{"value":NaN}', encoding="utf-8")
        nan_run = subprocess.run([sys.executable, str(HERE / "validate_directing_output.py"), str(nan_input)], env=env, capture_output=True, text=True)
        assert nan_run.returncode == 2 and "non-standard JSON numeric constant" in nan_run.stdout
        dependency_run = subprocess.run([sys.executable, "-S", str(HERE / "validate_directing_output.py"), str(HERE / "testdata/golden-single-video.json")], env=env, capture_output=True, text=True)
        assert dependency_run.returncode == 3 and "dependency_missing" in dependency_run.stdout
        global count; count += 10

    cache_files = [path for path in SKILL_ROOT.rglob("*") if path.is_file() and (path.suffix == ".pyc" or "__pycache__" in path.parts)]
    assert not cache_files, f"package manifest contains bytecode caches: {cache_files}"
    count += 1
    assert count >= 100, count
    print(f"{count} validator/builder/package tests passed")
    return 0

if __name__ == "__main__": raise SystemExit(main())
