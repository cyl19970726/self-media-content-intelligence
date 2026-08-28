# External Evidence Storage Decision

Status: **target awaiting owner confirmation**

Phase 5 separates Evidence from source control; it does not merely move files to a
different directory inside the repository. All options use the same Manifest,
SHA-256, availability, and restore contract.

## Options

| Option | Best for | Trade-off | Decision |
| --- | --- | --- | --- |
| Local content-addressed store outside the repository | immediate safe migration and one-machine development | not shared across machines unless separately backed up | **recommended first target** |
| S3-compatible object storage (R2/S3/MinIO) | team sharing, durability, CI retrieval | requires bucket, credentials, lifecycle and cost policy | preferred durable/shared target |
| Git LFS | familiar Git pointer workflow | storage quota and clone coupling remain; historical blobs are not removed without rewrite | not the Evidence system |

The recommended first target is an explicit directory outside every checkout,
configured through `SIGNAL_ROOM_EVIDENCE_ROOT`. It provides a reversible landing
zone without cloud credentials. An S3-compatible store can then become the primary
or mirror without changing manifests or product contracts.

No Evidence bytes will be copied to an external target, and no repository copies
will be removed, until the owner confirms the target and its backup expectations.
