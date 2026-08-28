# External Evidence Storage Decision

Status: **local target confirmed and live on 2026-08-28**

Phase 5 separates Evidence from source control; it does not merely move files to a
different directory inside the repository. All options use the same Manifest,
SHA-256, availability, and restore contract.

## Options

| Option | Best for | Trade-off | Decision |
| --- | --- | --- | --- |
| Local content-addressed store outside the repository | immediate safe migration and one-machine development | not shared across machines unless separately backed up | **recommended first target** |
| S3-compatible object storage (R2/S3/MinIO) | team sharing, durability, CI retrieval | requires bucket, credentials, lifecycle and cost policy | preferred durable/shared target |
| Git LFS | familiar Git pointer workflow | storage quota and clone coupling remain; historical blobs are not removed without rewrite | not the Evidence system |

The confirmed first target is `/Users/hhh0x/self-media-evidence`, configured
through `SIGNAL_ROOM_EVIDENCE_ROOT`. It is an independent content-addressed store
with a hard-linked compatibility view. An S3-compatible store can later become
the primary or mirror without changing manifests or product contracts.

The owner confirmed this target and explicitly declined Git history rewriting.
All 22,622 research Evidence entries were copied and fully verified before the
current-tree copies were removed. The external CAS is the rollback copy.
