# Creator Batch Pipeline V2

Status: **Active**
Decision owner: [ADR-0008](../../../adr/0008-capability-partitioned-creator-research-batches.md)

## Outcome

An operator can paste a fixed list of 1–20 Xiaohongshu creator profile URLs, start one durable
batch, and follow all members through the existing full creator-analysis pipeline from one
workbench. Provider, browser, video, and synthesis work advance in separate bounded pools so a
slow creator does not freeze unrelated creators.

This manual-entry path is also the first executable input for the future “discover many → compare →
select” loop. Automatic creator discovery and ranking are intentionally later work; they will create
members through the same batch boundary rather than introduce another research pipeline.

## Delivery state

These labels are independent; an item can be implemented and test-verified while remaining
live-unverified.

| Scope | Implemented | Test-verified | Paid live |
| --- | --- | --- | --- |
| Existing single-creator durable run and video pool | Yes (pre-existing) | Yes (pre-existing) | Historical runs only; not evidence for this batch release |
| Batch control plane and 1–20 manual entry | Yes | Yes; targeted domain/repository/API tests | Live-unverified |
| Five capability-partitioned worker pools (RedFox 4, Ego 1, Portfolio 1, Video 3, Synthesis 2) | Yes | Yes; targeted pool/claim tests | Live-unverified |
| Batch workbench | Yes | Yes; desktop/mobile isolated-runtime browser acceptance | Live-unverified; browser fixture made no RedFox request |
| Failure-isolated member recovery | Partial; local SQLite/run-level recovery exists | Partial; local scheduler/repository tests pass, cross-instance fencing remains | Live-unverified |
| RedFox item-level incremental checkpoint | No; follow-up after first implementation slice | No | Required before expansion beyond 2 |
| Paid rollout: 2 approved creators, then up to 20 | Code-independent release gate | Cannot be replaced by tests | Live-unverified |

“Yes” above is supported by executable code and recorded test output in
[implementation-validation.md](implementation-validation.md); it does not imply browser or paid-live
acceptance.

## Documents

- [Requirements](requirements.md)
- [Design](design.md)
- [Implementation plan](tasks.md)
- [Implementation and live validation](implementation-validation.md)

## Release boundary

The release is not “20 creators were queued.” It is:

1. a batch accepts and preserves 1–20 ordered, validated manual inputs;
2. eligible jobs progress through five independently bounded capability pools;
3. one member can fail or need user action while others complete in the verified local control plane;
4. the workbench makes complete, partial, blocked, and failed members honest and actionable;
5. full repository and isolated-runtime desktop/mobile browser gates pass;
6. two approved creators pass paid-live inspection;
7. RedFox item-level checkpointing is implemented and verified before expansion beyond two;
8. the authorized batch of up to 20 completes or ends honestly partial, with no hidden replays or
   false-ready dossiers.
