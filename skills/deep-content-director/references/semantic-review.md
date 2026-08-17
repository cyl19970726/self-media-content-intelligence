# Independent semantic review artifact

The structural validator cannot approve meaning. A fresh reviewer must create a separate review from the original task, source evidence, production constraints and candidate artifact.

## Independence

- Do not let the authoring agent grade its own output or repair.
- Record candidate, task, evidence and structural-report SHA-256 hashes.
- Ignore candidate self-labels such as `verified`, `clear`, `original` or `feasible` until their basis is checked.
- Preserve failed rounds; a new reviewer writes a new version after repair.

## Required record

```json
{
  "schemaVersion": "1.0",
  "candidateHash": "<sha256>",
  "taskHash": "<sha256>",
  "evidenceHashes": ["<sha256 or explicit no-external-evidence marker>"],
  "structuralReportHash": "<sha256>",
  "reviewer": {
    "id": "fresh reviewer/session identity",
    "independenceStatement": "Did not author or repair the candidate"
  },
  "gates": [
    {
      "id": "G0",
      "passed": true,
      "evidence": ["candidate path/field and source evidence"],
      "failures": []
    }
  ],
  "failedGateIds": [],
  "requiredRevisions": [],
  "judgeScores": [],
  "semanticReady": true,
  "humanApproval": {
    "owner": "named publishing owner",
    "status": "pending",
    "note": "Human approval remains separate from reviewer readiness"
  }
}
```

Include G0–G7 exactly as defined in [evaluation.md](evaluation.md). `semanticReady` is true only when all eight pass. Run JUDGE only after that; scores cannot change gate status. Human approval remains `pending` until the named owner accepts publication risk.

For a repair, cite prior failed gate IDs and show the evidence that changed. Do not overwrite the prior review.
